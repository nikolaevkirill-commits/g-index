#!/usr/bin/env python3
"""Pair immutable Tanita shadow forecasts with independent real outcomes.

This script never edits the prospective snapshot ledger and never uses
Excel/PDF/expert labels as outcomes. It creates a separate, reproducible
evaluation ledger after a calendar day has fully elapsed.
"""
from __future__ import annotations

from datetime import date, datetime, time, timezone
from collections import Counter
from outcome_score_contract import discrete_score
from pathlib import Path
import json
import math
import re
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CONTROL = ROOT / "outputs" / "data_control"
SNAPSHOTS = CONTROL / "TANITA_PROSPECTIVE_SNAPSHOTS_v1.jsonl"
OUTCOMES = ROOT / "outputs" / "REAL_OUTCOME_LEDGER_v1.jsonl"
if not OUTCOMES.exists():
    OUTCOMES = ROOT / "REAL_OUTCOME_LEDGER_v1.jsonl"
PAIRS = CONTROL / "TANITA_REAL_OUTCOME_PAIRS_v1.jsonl"
STATUS = CONTROL / "TANITA_REAL_OUTCOME_PAIR_STATUS_v1.json"
KYIV = ZoneInfo("Europe/Kyiv")


def target_day_start_utc(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=KYIV).astimezone(timezone.utc)


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line_no, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name} line {line_no}: invalid JSON: {exc.msg}") from exc
        if not isinstance(row, dict):
            raise ValueError(f"{path.name} line {line_no}: object required")
        rows.append(row)
    return rows


def numeric(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def sign(value: float) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def metrics(prediction: float, actual: float) -> dict:
    error = prediction - actual
    return {
        "error": round(error, 6),
        "absolute_error": round(abs(error), 6),
        "exact": abs(error) < 1e-9,
        "within_1": abs(error) <= 1.0,
        "sign_match": sign(prediction) == sign(actual),
    }


def aggregate(rows: list[dict], key: str) -> dict:
    valid = [row[key] for row in rows if isinstance(row.get(key), dict)]
    count = len(valid)
    if not count:
        return {"n": 0, "exact_rate": None, "within_1_rate": None, "sign_rate": None, "mae": None}
    return {
        "n": count,
        "exact_rate": round(sum(item["exact"] for item in valid) / count, 6),
        "within_1_rate": round(sum(item["within_1"] for item in valid) / count, 6),
        "sign_rate": round(sum(item["sign_match"] for item in valid) / count, 6),
        "mae": round(sum(item["absolute_error"] for item in valid) / count, 6),
    }


now = datetime.now(timezone.utc).replace(microsecond=0)
today = now.astimezone(KYIV).date().isoformat()
hard_failures: list[str] = []

try:
    snapshots = read_jsonl(SNAPSHOTS)
    outcomes = read_jsonl(OUTCOMES)
except ValueError as exc:
    snapshots, outcomes = [], []
    hard_failures.append(str(exc))

rejected: list[dict] = []
def reject(channel, target, reason):
    hard_failures.append(f"{channel}: {reason}: {target}")
    rejected.append({"channel":channel,"date":target,"reason":reason})

def valid_date(target):
    try:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", target)) and date.fromisoformat(target).isoformat() == target
    except (ValueError, TypeError):
        return False

snapshot_counts = Counter(str(row.get("target_date") or "") for row in snapshots)
snapshot_by_date: dict[str, dict] = {}
for row in snapshots:
    target = str(row.get("target_date") or "")
    if not valid_date(target):
        reject("snapshot",target,"invalid target date"); continue
    if snapshot_counts[target] != 1:
        reject("snapshot",target,"duplicate date quarantined"); continue
    try:
        frozen = datetime.fromisoformat(str(row.get("frozen_at") or "").replace("Z", "+00:00"))
        if frozen.tzinfo is None:
            raise ValueError("explicit frozen_at timezone required")
        if frozen.astimezone(timezone.utc) >= target_day_start_utc(target):
            raise ValueError("snapshot was not frozen before target day")
    except ValueError as exc:
        reject("snapshot",target,str(exc)); continue
    invalid = False
    for channel in ("tanita_shadow", "final_prediction_reference"):
        value = row.get(channel)
        if value is not None and not isinstance(value, dict):
            invalid = True
        elif value and value.get("score") is not None and discrete_score(value.get("score")) is None:
            invalid = True
    if invalid:
        reject("snapshot",target,"invalid discrete prediction"); continue
    snapshot_by_date[target] = row

# Quarantine the entire date, not whichever duplicate happened to arrive last.
outcome_counts = Counter(str(row.get("date") or "") for row in outcomes if row.get("outcome_type") == "real_user_outcome")
outcome_by_date: dict[str, dict] = {}
for row in outcomes:
    if row.get("outcome_type") != "real_user_outcome":
        continue
    target = str(row.get("date") or "")
    if not valid_date(target):
        reject("outcome",target,"invalid target date"); continue
    if outcome_counts[target] != 1:
        reject("outcome",target,"duplicate date quarantined"); continue
    raw = row.get("actual_score")
    if raw is None or (isinstance(raw,str) and not raw.strip()):
        continue  # Explicit placeholders remain awaiting independent intake.
    if discrete_score(raw) is None:
        reject("outcome",target,"invalid discrete actual score"); continue
    digest = str(row.get("outcome_intake_sha256") or "").strip().lower()
    if row.get("provenance_verified") is not True or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
        reject("outcome",target,"unverified provenance"); continue
    source = str(row.get("actual_source") or "").lower()
    if not source or any(token in source for token in ("pdf", "excel", "expert", "override")):
        reject("outcome",target,"forbidden or missing source"); continue
    outcome_by_date[target] = row

pairs: list[dict] = []
awaiting: list[str] = []
for target, snapshot in sorted(snapshot_by_date.items()):
    if target >= today:
        continue
    outcome = outcome_by_date.get(target)
    actual = discrete_score(outcome.get("actual_score")) if outcome else None
    if actual is None:
        awaiting.append(target)
        continue
    tanita = discrete_score((snapshot.get("tanita_shadow") or {}).get("score"))
    baseline = discrete_score((snapshot.get("final_prediction_reference") or {}).get("score"))
    if tanita is None and baseline is None:
        awaiting.append(target)
        continue
    pairs.append({
        "schema": "tanita_real_outcome_pair_v1",
        "date": target,
        "snapshot_frozen_at": snapshot.get("frozen_at"),
        "outcome_type": "real_user_outcome",
        "actual_score": actual,
        "actual_source": outcome.get("actual_source"),
        "quality": outcome.get("quality"),
        "tanita_shadow_score": tanita,
        "baseline_frozen_score": baseline,
        "tanita_metrics": metrics(tanita, actual) if tanita is not None else None,
        "baseline_metrics": metrics(baseline, actual) if baseline is not None else None,
        "score_effect": 0,
        "production_change": False,
    })

PAIRS.parent.mkdir(parents=True, exist_ok=True)
PAIRS.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in pairs), encoding="utf-8")

tanita_summary = aggregate(pairs, "tanita_metrics")
baseline_summary = aggregate(pairs, "baseline_metrics")
diagnostic_metrics = {"tanita_shadow":tanita_summary,"baseline_frozen":baseline_summary}
if hard_failures:
    tanita_summary = aggregate([], "tanita_metrics")
    baseline_summary = aggregate([], "baseline_metrics")
review_pairs = sum(row["tanita_metrics"] is not None and row["baseline_metrics"] is not None for row in pairs)
status = {
    "schema": "tanita_real_outcome_pair_status_v1",
    "generated_at": now.isoformat(),
    "calendar_timezone": "Europe/Kyiv",
    "temporal_policy": "snapshot must precede target-day 00:00 Europe/Kyiv; elapsed dates use Europe/Kyiv",
    "snapshot_records": len(snapshots),
    "elapsed_snapshot_dates": sum(target < today for target in snapshot_by_date),
    "paired_independent_outcomes": len(pairs),
    "awaiting_independent_outcomes": len(awaiting),
    "awaiting_dates": awaiting,
    "tanita_shadow": tanita_summary,
    "baseline_frozen": baseline_summary,
    "promotion_gate": {
        "minimum_pairs_for_review": 30,
        "minimum_pairs_for_promotion": 100,
        "eligible_for_review": review_pairs >= 30 and not hard_failures,
        "eligible_for_promotion": review_pairs >= 100 and not hard_failures,
        "matched_channel_pairs": review_pairs,
    },
    "hard_failures": hard_failures,
    "rejected_records": rejected,
    "diagnostic_metrics_only": diagnostic_metrics if hard_failures else None,
    "result": "PASS" if not hard_failures else "FAIL",
    "score_effect": 0,
    "production_change": False,
    "privacy": "Detailed pairs remain local; only aggregate status is deployable.",
}
STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(status, ensure_ascii=False))
raise SystemExit(0 if not hard_failures else 1)
