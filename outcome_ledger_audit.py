"""Build an honest outcome ledger without mixing expert labels with reality."""
from __future__ import annotations

import csv
import io
import json
import math
import re
from datetime import date, datetime, time, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs"
TRACKER = OUT / "AUTO_PROSPECTIVE_TRACKER_v1.json"
CHRONO_SOURCES = (
    ("chrono_v1.csv", ROOT / "chrono_v1.csv", 1),
    ("chrono_v20_telemetry.csv", ROOT / "chrono_v20_telemetry.csv", 2),
)
STATUS = OUT / "OUTCOME_LEDGER_STATUS_v1.json"
LEDGER = OUT / "REAL_OUTCOME_LEDGER_v1.jsonl"
KYIV = ZoneInfo("Europe/Kyiv")


def target_day_start_utc(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=KYIV).astimezone(timezone.utc)


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8-sig"))


def number(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def sign(value):
    return -1 if value < 0 else (1 if value > 0 else 0)


def read_csv(path: Path):
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8-sig").splitlines(keepends=True)
    # Remove only pre-header comments physically. Within records, quoted newlines
    # and lines beginning '#' are user text, not ignorable file comments.
    while lines and (not lines[0].strip() or lines[0].lstrip().startswith("#")):
        lines.pop(0)
    if not lines:
        return []
    reader = csv.DictReader(io.StringIO("".join(lines)), strict=True)
    fields = reader.fieldnames or []
    if "date" not in fields or len(fields) != len(set(fields)):
        raise ValueError("invalid_or_duplicate_chrono_header")
    rows = []
    for row in reader:
        # CSV has already assembled a full logical record, so this cannot remove
        # a physical '#' line from inside a quoted notes/event_summary value.
        if str(row.get("date") or "").lstrip().startswith("#"):
            continue
        if not any(str(v or "").strip() for v in row.values()):
            continue
        if None in row or any(v is None for v in row.values()):
            raise ValueError("ragged_chrono_row")
        rows.append(row)
    return rows


def actual_from(row):
    for key in ("actual_score", "score_7", "mean"):
        value = number(row.get(key))
        if value is not None:
            return value, key
    return None, None


def verified_provenance(row):
    digest = str(row.get("outcome_intake_sha256") or "").strip().lower()
    return (
        str(row.get("actual_source") or "").strip() == "validated_outcome_intake_v1"
        and str(row.get("provenance_verified") or "").strip() == "1"
        and re.fullmatch(r"[0-9a-f]{64}", digest) is not None
    )


def prediction_is_prior(day: str, prediction: dict):
    """The frozen prediction must exist before the forecast day's Kyiv boundary."""
    raw = prediction.get("created_at")
    if not raw:
        return False, "missing_prediction_timestamp"
    try:
        created = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        boundary = target_day_start_utc(day)
        return created < boundary, None if created < boundary else "prediction_not_prior_to_day"
    except (TypeError, ValueError):
        return False, "invalid_prediction_timestamp"


def load_real_rows():
    """Merge sources by date; completed v20 rows outrank legacy chrono rows."""
    merged = {}
    source_counts = {}
    for source_name, path, priority in CHRONO_SOURCES:
        rows = read_csv(path)
        source_counts[source_name] = len(rows)
        for row in rows:
            day = (row.get("date") or "").strip()
            if not day:
                continue
            actual, actual_field = actual_from(row)
            provenance_ok = source_name == "chrono_v20_telemetry.csv" and verified_provenance(row)
            if actual is not None and not provenance_ok:
                actual = None
                actual_field = None
            candidate = {
                **row,
                "_source": source_name,
                "_priority": priority,
                "_actual": actual,
                "_actual_field": actual_field,
                "_provenance_verified": provenance_ok,
            }
            old = merged.get(day)
            candidate_rank = (actual is not None, priority)
            old_rank = ((old or {}).get("_actual") is not None, (old or {}).get("_priority", 0))
            if old is None or candidate_rank > old_rank:
                merged[day] = candidate
    return merged, source_counts


def main():
    tracker = load_json(TRACKER, {})
    decisions = tracker.get("decisions", {})
    real_rows, source_counts = load_real_rows()

    expert_pairs = []
    for item in decisions.values():
        pred = number((item.get("prediction") or {}).get("score"))
        label = number((item.get("outcome") or {}).get("score"))
        if pred is not None and label is not None:
            expert_pairs.append((pred, label))

    records = []
    for day, row in sorted(real_rows.items()):
        prediction = (decisions.get(day, {}).get("prediction") or {})
        pred = number(prediction.get("score"))
        actual = row.get("_actual")
        prior, temporal_reason = prediction_is_prior(day, prediction) if pred is not None else (False, "missing_prediction")
        complete = pred is not None and actual is not None and prior
        record = {
            "date": day,
            "prediction_score": pred,
            "prediction_created_at": prediction.get("created_at"),
            "prediction_was_prior": prior,
            "actual_score": actual,
            "actual_source": row.get("_source"),
            "actual_field": row.get("_actual_field"),
            "provenance_verified": bool(row.get("_provenance_verified")),
            "outcome_intake_sha256": row.get("outcome_intake_sha256") if row.get("_provenance_verified") else None,
            "outcome_type": "real_user_outcome",
            "forecast_seen": row.get("forecast_seen") or None,
            "domain": row.get("domain") or None,
            "exposure": row.get("exposure") or None,
            "quality": row.get("quality") or row.get("confidence_actual") or None,
            "event_summary": row.get("event_summary") or None,
            "notes": row.get("notes") or None,
            "complete_pair": complete,
            "exclusion_reason": None if complete else (
                temporal_reason if pred is not None and actual is not None else
                "missing_prediction" if pred is None else "missing_actual"
            ),
            "metrics": ({
                "strict_sign": sign(pred) == sign(actual),
                "absolute_error": round(abs(pred - actual), 4),
            } if complete else None),
        }
        records.append(record)

    paired = [r for r in records if r["complete_pair"]]
    today = datetime.now(timezone.utc).astimezone(KYIV).date().isoformat()
    elapsed_frozen = []
    for day, item in sorted(decisions.items()):
        prediction = item.get("prediction") or {}
        pred = number(prediction.get("score"))
        prior, _ = prediction_is_prior(day, prediction) if pred is not None else (False, "missing_prediction")
        if pred is not None and prior and day < today:
            elapsed_frozen.append(day)
    paired_dates = {r["date"] for r in paired}
    awaiting_dates = [day for day in elapsed_frozen if day not in paired_dates]
    expert_n, real_n = len(expert_pairs), len(paired)
    status = {
        "schema": "outcome_ledger_status_v2",
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "calendar_timezone": "Europe/Kyiv",
        "temporal_policy": "prediction must precede target-day 00:00 Europe/Kyiv; elapsed dates use Europe/Kyiv",
        "definitions": {
            "expert_pdf_label": "agreement/reproduction target; not a real-world outcome",
            "real_user_outcome": "independent Chrono/Telegram result; eligible only when prediction was frozen first",
        },
        "expert_reproduction": {
            "n": expert_n,
            "strict_sign": round(sum(sign(a) == sign(b) for a, b in expert_pairs) / expert_n, 6) if expert_n else None,
            "claim": "expert agreement only",
        },
        "real_outcomes": {
            "source_rows": source_counts,
            "unique_dates": len(real_rows),
            "chrono_rows_total": sum(source_counts.values()),
            "paired_with_frozen_prediction": real_n,
            "paired_with_prior_frozen_prediction": real_n,
            "elapsed_frozen_predictions": len(elapsed_frozen),
            "awaiting_independent_outcomes": len(awaiting_dates),
            "awaiting_dates": awaiting_dates,
            "required_for_formal_test": 30,
            "required_for_promotion_gate": 100,
            "formal_test_ready": real_n >= 30,
            "promotion_gate_passed": real_n >= 100,
            "strict_sign": round(sum(r["metrics"]["strict_sign"] for r in paired) / real_n, 6) if real_n else None,
            "mae": round(sum(r["metrics"]["absolute_error"] for r in paired) / real_n, 6) if real_n else None,
        },
        "guardrails": [
            "Never pool expert_pdf_label with real_user_outcome.",
            "Never claim predictive accuracy from expert-PDF agreement.",
            "Only validated_outcome_intake_v1 rows with a SHA-256 provenance token are promotion evidence.",
            "A prediction timestamp must precede the forecast day.",
            "Prefer completed chrono_v20 telemetry over legacy duplicates.",
            "Panchanga is already part of G_day raw and is not a second vote.",
        ],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    LEDGER.write_text(
        "".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in records),
        encoding="utf-8",
    )
    print(
        f"[ok] outcome separation: expert labels n={expert_n}; "
        f"real paired outcomes n={real_n}/{len(real_rows)} unique dates"
    )
    print(f"[ok] sources: {source_counts}")
    print(f"[ok] wrote {STATUS.name} and {LEDGER.name}")


if __name__ == "__main__":
    main()

