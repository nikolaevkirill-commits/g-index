#!/usr/bin/env python3
"""Generate a non-destructive queue for independent real-world outcome entry."""
from __future__ import annotations
from datetime import date, datetime, time, timezone
from pathlib import Path
import csv
import json
import math
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs"
CONTROL = OUT / "data_control"
TRACKER = OUT / "AUTO_PROSPECTIVE_TRACKER_v1.json"
REAL_LEDGER = OUT / "REAL_OUTCOME_LEDGER_v1.jsonl"
QUEUE = CONTROL / "OUTCOME_INTAKE_QUEUE_v1.csv"
STATUS = CONTROL / "OUTCOME_INTAKE_QUEUE_STATUS_v1.json"
KYIV = ZoneInfo("Europe/Kyiv")


def target_day_start_utc(day: str) -> datetime:
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=KYIV).astimezone(timezone.utc)


def load(path, default):
    return json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else default


def number(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError):
        return None


def was_prior(day, prediction):
    raw = prediction.get("created_at")
    if not raw:
        return False
    try:
        when = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        return when.astimezone(timezone.utc) < target_day_start_utc(day)
    except (TypeError, ValueError):
        return False


now = datetime.now(timezone.utc).replace(microsecond=0)
today = now.astimezone(KYIV).date().isoformat()
tracker = load(TRACKER, {})
paired_dates = set()
if REAL_LEDGER.exists():
    for line in REAL_LEDGER.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("complete_pair"):
            paired_dates.add(row.get("date"))

rows = []
for day, item in sorted((tracker.get("decisions") or {}).items()):
    prediction = item.get("prediction") or {}
    score = number(prediction.get("score"))
    if day >= today or score is None or not was_prior(day, prediction) or day in paired_dates:
        continue
    rows.append({
        "date": day,
        "prediction_score": int(score) if score.is_integer() else score,
        "prediction_created_at": prediction.get("created_at", ""),
        "prediction_model": prediction.get("model", ""),
        "forecast_seen": "",
        "actual_score": "",
        "actual_class": "",
        "domain": "",
        "event_summary": "",
        "confidence_actual": "",
        "notes": "",
        "instruction": "Enter independent after-day outcome only; do not use PDF/Excel/expert verdict.",
    })

# Preserve any manually entered independent observations when the daily queue refreshes.
# The generator must never erase user evidence before it passes a separate review.
existing_by_date = {}
if QUEUE.exists():
    try:
        with QUEUE.open(newline="", encoding="utf-8-sig") as handle:
            for prior in csv.DictReader(handle):
                day = (prior.get("date") or "").strip()
                if day:
                    existing_by_date[day] = prior
    except (OSError, csv.Error):
        # A malformed editable queue must not block the safety pipeline; validator reports it.
        existing_by_date = {}

editable_fields = ("forecast_seen", "actual_score", "actual_class", "domain", "event_summary", "confidence_actual", "notes")
for row in rows:
    prior = existing_by_date.get(row["date"], {})
    for field in editable_fields:
        value = str(prior.get(field, "")).strip()
        if value:
            row[field] = value

CONTROL.mkdir(parents=True, exist_ok=True)
fields = list(rows[0]) if rows else ["date", "prediction_score", "prediction_created_at", "prediction_model", "forecast_seen", "actual_score", "actual_class", "domain", "event_summary", "confidence_actual", "notes", "instruction"]
with QUEUE.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
status = {
    "schema": "outcome_intake_queue_status_v1",
    "generated_at": now.isoformat(),
    "queue": str(QUEUE.relative_to(ROOT)).replace("\\", "/"),
    "pending_independent_outcomes": len(rows),
    "dates": [row["date"] for row in rows],
    "automatic_fill": False,
    "calendar_timezone": "Europe/Kyiv",
    "completion_policy": "target date must be earlier than the current Europe/Kyiv date",
    "score_effect": 0,
    "production_change": False,
    "rule": "Queue is an intake aid. Only independently observed after-day results may be copied into Chrono telemetry.",
}
STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(status, ensure_ascii=False))
