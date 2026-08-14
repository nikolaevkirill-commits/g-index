#!/usr/bin/env python3
"""Validate manually entered independent outcomes before fail-closed automatic import."""
from __future__ import annotations

import csv
import json
import math
from datetime import date, datetime, time, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CONTROL = ROOT / "outputs" / "data_control"
QUEUE = CONTROL / "OUTCOME_INTAKE_QUEUE_v1.csv"
STATUS = CONTROL / "OUTCOME_INTAKE_VALIDATION_v1.json"
EDITABLE = ("forecast_seen", "actual_score", "actual_class", "domain", "event_summary", "confidence_actual", "notes")
FORBIDDEN = ("pdf", "excel", "expert", "override", "g-index", "gindex")
CLASSES = {"AVOID", "CAUTION", "NORMAL", "FAVORABLE", "BEST_WINDOW"}
DOMAINS = {"work", "health", "travel", "finance", "communication", "other"}
CONFIDENCE = {"LOW", "MED", "HIGH"}
KYIV = ZoneInfo("Europe/Kyiv")


def target_day_start_utc(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=KYIV).astimezone(timezone.utc)


def numeric(value):
    try:
        result = float(str(value).strip())
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def prior_prediction(day, created):
    try:
        stamp = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)
        return stamp.astimezone(timezone.utc) < target_day_start_utc(day)
    except (TypeError, ValueError):
        return False


def score_class(value: int) -> str:
    if value <= -2:
        return "AVOID"
    if value == -1:
        return "CAUTION"
    if value == 0:
        return "NORMAL"
    if value == 1:
        return "FAVORABLE"
    return "BEST_WINDOW"


now = datetime.now(timezone.utc)
today_kyiv = now.astimezone(KYIV).date()
records, issues = [], []
if QUEUE.exists():
    with QUEUE.open(newline="", encoding="utf-8-sig") as handle:
        for row_no, row in enumerate(csv.DictReader(handle), start=2):
            submitted = any(str(row.get(field, "")).strip() for field in EDITABLE)
            if not submitted:
                continue
            errors = []
            day = (row.get("date") or "").strip()
            try:
                parsed_day = date.fromisoformat(day)
                if parsed_day >= today_kyiv:
                    errors.append("outcome_date_is_not_completed")
            except ValueError:
                errors.append("invalid_date")
            if not prior_prediction(day, row.get("prediction_created_at")):
                errors.append("prediction_not_prior")
            if str(row.get("forecast_seen", "")).strip() not in {"0", "1"}:
                errors.append("forecast_seen_must_be_0_or_1")
            actual = numeric(row.get("actual_score"))
            if actual is None or actual < -3 or actual > 3 or not float(actual).is_integer():
                errors.append("actual_score_must_be_integer_-3_to_3")
            label = str(row.get("actual_class", "")).strip().upper()
            if label not in CLASSES:
                errors.append("actual_class_invalid")
            elif actual is not None and float(actual).is_integer() and label != score_class(int(actual)):
                errors.append("actual_class_score_mismatch")
            if str(row.get("domain", "")).strip().lower() not in DOMAINS:
                errors.append("domain_invalid")
            if str(row.get("confidence_actual", "")).strip().upper() not in CONFIDENCE:
                errors.append("confidence_actual_invalid")
            summary = str(row.get("event_summary", "")).strip()
            if len(summary) < 8:
                errors.append("independent_event_summary_required")
            evidence = " ".join(str(row.get(field, "")) for field in ("event_summary", "notes")).lower()
            if any(token in evidence for token in FORBIDDEN):
                errors.append("expert_or_training_source_reference_forbidden")
            record = {"row": row_no, "date": day, "eligible_for_manual_review": not errors, "errors": errors}
            records.append(record)
            if errors:
                issues.append(record)

status = {
    "schema": "outcome_intake_validation_v1",
    "generated_at": now.replace(microsecond=0).isoformat(),
    "queue": str(QUEUE.relative_to(ROOT)).replace("\\", "/"),
    "submitted_rows": len(records),
    "eligible_for_manual_review": sum(record["eligible_for_manual_review"] for record in records),
    "rejected_rows": len(issues),
    "issues": issues,
    "automatic_import_next_step": True,
    "calendar_timezone": "Europe/Kyiv",
    "temporal_policy": "prediction must precede target-day 00:00 Europe/Kyiv; outcome date must be completed in Europe/Kyiv",
    "score_effect": 0,
    "production_change": False,
    "rule": "Eligible reviewed rows are passed to the fail-closed importer; expert/PDF/Excel labels remain forbidden.",
}
CONTROL.mkdir(parents=True, exist_ok=True)
STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(status, ensure_ascii=False))
raise SystemExit(0 if not issues else 1)
