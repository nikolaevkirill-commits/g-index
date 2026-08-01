#!/usr/bin/env python3
"""Validate manually entered independent outcomes before fail-closed automatic import."""
from __future__ import annotations

import csv
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTROL = ROOT / "outputs" / "data_control"
QUEUE = CONTROL / "OUTCOME_INTAKE_QUEUE_v1.csv"
STATUS = CONTROL / "OUTCOME_INTAKE_VALIDATION_v1.json"
EDITABLE = ("forecast_seen", "actual_score", "actual_class", "domain", "event_summary", "confidence_actual", "notes")
FORBIDDEN = ("pdf", "excel", "expert", "override", "g-index", "gindex")


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
        return stamp < datetime.combine(date.fromisoformat(day), datetime.min.time(), tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return False


now = datetime.now(timezone.utc)
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
                if parsed_day >= now.date():
                    errors.append("outcome_date_is_not_completed")
            except ValueError:
                errors.append("invalid_date")
            if not prior_prediction(day, row.get("prediction_created_at")):
                errors.append("prediction_not_prior")
            actual = numeric(row.get("actual_score"))
            if actual is None or actual < -3 or actual > 3:
                errors.append("actual_score_must_be_numeric_-3_to_3")
            if not str(row.get("actual_class", "")).strip():
                errors.append("actual_class_required")
            if not str(row.get("domain", "")).strip():
                errors.append("domain_required")
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
    "score_effect": 0,
    "production_change": False,
    "rule": "Eligible reviewed rows are passed to the fail-closed importer; expert/PDF/Excel labels remain forbidden.",
}
CONTROL.mkdir(parents=True, exist_ok=True)
STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(status, ensure_ascii=False))
