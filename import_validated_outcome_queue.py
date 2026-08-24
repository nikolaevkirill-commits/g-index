#!/usr/bin/env python3
"""Fail-closed import of reviewed independent outcomes into Chrono telemetry."""
from __future__ import annotations
import csv, hashlib, json, math, os
from datetime import date, datetime, time, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CONTROL = ROOT / "outputs" / "data_control"
QUEUE = CONTROL / "OUTCOME_INTAKE_QUEUE_v1.csv"
TELEMETRY = ROOT / "chrono_v20_telemetry.csv"
STATUS = CONTROL / "OUTCOME_INTAKE_IMPORT_STATUS_v1.json"
FORBIDDEN = ("pdf", "excel", "expert", "override", "g-index", "gindex")
CLASSES = {"AVOID", "CAUTION", "NORMAL", "FAVORABLE", "BEST_WINDOW"}
DOMAINS = {"work", "health", "travel", "finance", "communication", "other"}
CONFIDENCE = {"LOW", "MED", "HIGH"}
EDITABLE = ("forecast_seen", "actual_score", "actual_class", "domain", "event_summary", "confidence_actual", "notes")
PROVENANCE_FIELDS = ("actual_source", "outcome_intake_sha256", "outcome_imported_at_utc", "provenance_verified")
KYIV = ZoneInfo("Europe/Kyiv")

def target_day_start_utc(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=KYIV).astimezone(timezone.utc)

def score_class(score):
    if score <= -2: return "AVOID"
    if score < 0: return "CAUTION"
    if score == 0: return "NORMAL"
    if score < 2: return "FAVORABLE"
    return "BEST_WINDOW"

def bucket(label):
    label = label.upper()
    if label in {"AVOID", "CAUTION"}: return "BAD"
    if label in {"FAVORABLE", "BEST_WINDOW"}: return "GOOD"
    return "MID"

def numeric(value):
    try:
        result = float(str(value).strip())
        return result if math.isfinite(result) else None
    except (TypeError, ValueError): return None

def prior_prediction(day, created):
    try:
        stamp = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        if stamp.tzinfo is None: stamp = stamp.replace(tzinfo=timezone.utc)
        return stamp.astimezone(timezone.utc) < target_day_start_utc(day)
    except (TypeError, ValueError): return False

def validate(row, today):
    errors = []
    day = (row.get("date") or "").strip()
    try:
        if date.fromisoformat(day) >= today: errors.append("outcome_date_is_not_completed")
    except ValueError: errors.append("invalid_date")
    if not prior_prediction(day, row.get("prediction_created_at", "")): errors.append("prediction_not_prior")
    if str(row.get("forecast_seen", "")).strip() not in {"0", "1"}: errors.append("forecast_seen_must_be_0_or_1")
    actual = numeric(row.get("actual_score"))
    if actual is None or actual < -3 or actual > 3 or not float(actual).is_integer(): errors.append("actual_score_must_be_integer_-3_to_3")
    label = str(row.get("actual_class", "")).strip().upper()
    if label not in CLASSES: errors.append("actual_class_invalid")
    elif actual is not None and label != score_class(actual): errors.append("actual_class_score_mismatch")
    if str(row.get("domain", "")).strip().lower() not in DOMAINS: errors.append("domain_invalid")
    if str(row.get("confidence_actual", "")).strip().upper() not in CONFIDENCE: errors.append("confidence_actual_invalid")
    summary = str(row.get("event_summary", "")).strip()
    if len(summary) < 8: errors.append("independent_event_summary_required")
    evidence = " ".join(str(row.get(f, "")) for f in ("event_summary", "notes")).lower()
    if any(token in evidence for token in FORBIDDEN): errors.append("expert_or_training_source_reference_forbidden")
    return errors

def read_telemetry(path):
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    comments = [line for line in lines if line.startswith("#")]
    data = [line for line in lines if line and not line.startswith("#")]
    reader = csv.DictReader(data)
    return comments, list(reader), list(reader.fieldnames or [])

def write_telemetry(path, comments, rows, fields):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as handle:
        for line in comments: handle.write(line + "\n")
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader(); writer.writerows(rows)
        handle.flush(); os.fsync(handle.fileno())
    tmp.replace(path)

def intake_hash(row):
    payload = {key: str(row.get(key, "")).strip() for key in ("date", "prediction_score", "prediction_created_at", *EDITABLE)}
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def main():
    now = datetime.now(timezone.utc); CONTROL.mkdir(parents=True, exist_ok=True)
    submitted = []
    if QUEUE.exists():
        with QUEUE.open(newline="", encoding="utf-8-sig") as handle:
            submitted = [row for row in csv.DictReader(handle) if any(str(row.get(f, "")).strip() for f in EDITABLE)]
    comments, telemetry, fields = read_telemetry(TELEMETRY)
    for field in PROVENANCE_FIELDS:
        if field not in fields: fields.append(field)
    by_date = {str(row.get("date", "")).strip(): row for row in telemetry}
    imported, rejected, changed = [], [], False
    for row in submitted:
        day = str(row.get("date", "")).strip(); errors = validate(row, now.astimezone(KYIV).date()); target = by_date.get(day)
        if target is None: errors.append("no_frozen_telemetry_row_for_date")
        if target is not None and str(target.get("actual_score", "")).strip(): errors.append("outcome_already_present")
        if errors:
            rejected.append({"date": day, "errors": sorted(set(errors))}); continue
        actual = int(float(str(row["actual_score"]).strip())); label = str(row["actual_class"]).strip().upper()
        target.update({"forecast_seen": str(row["forecast_seen"]).strip(), "actual_score": str(actual), "actual_class": label, "domain": str(row["domain"]).strip().lower(), "event_summary": str(row["event_summary"]).strip(), "confidence_actual": str(row["confidence_actual"]).strip().upper(), "delayed_flag": target.get("delayed_flag", "") or "0", "notes": str(row.get("notes", "")).strip(), "actual_source":"validated_outcome_intake_v1", "outcome_intake_sha256":intake_hash(row), "outcome_imported_at_utc":now.replace(microsecond=0).isoformat(), "provenance_verified":"1"})
        pred_bucket, actual_bucket = bucket(str(target.get("v20_class", ""))), bucket(label)
        target["match"] = "-1" if "MID" in {pred_bucket, actual_bucket} else ("1" if pred_bucket == actual_bucket else "0")
        imported.append(day); changed = True
    if changed: write_telemetry(TELEMETRY, comments, telemetry, fields)
    status = {"schema":"outcome_intake_import_status_v1", "generated_at":now.replace(microsecond=0).isoformat(), "submitted_rows":len(submitted), "imported_rows":len(imported), "imported_dates":imported, "rejected_rows":len(rejected), "issues":rejected, "automatic_import":True, "calendar_timezone":"Europe/Kyiv", "temporal_policy":"prediction must precede target-day 00:00 Europe/Kyiv; outcome date must be completed in Europe/Kyiv", "score_effect":"real_outcome_metrics_only", "production_forecast_change":False, "rule":"Only reviewed independent outcomes update an already frozen row; expert/PDF/Excel labels are forbidden."}
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(status, ensure_ascii=False)); return 0 if not rejected else 1

if __name__ == "__main__": raise SystemExit(main())

