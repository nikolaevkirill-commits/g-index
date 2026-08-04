#!/usr/bin/env python3
"""Build a read-only objective context sidecar for the outcome intake queue.

This file deliberately does not infer actual outcomes, edit the intake queue, or
affect production scoring.  It only links dated environmental evidence to each
frozen prediction so a later human review has reproducible context.
"""

from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, time, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs" / "data_control"
QUEUE = OUT / "OUTCOME_INTAKE_QUEUE_v1.csv"
OMNI = ROOT / "outputs" / "OMNI2_DAILY_2025_2026.json"
AIA = ROOT / "AIA_VERNADSKY_DAILY_v1.json"
BGS_ARCHIVE = ROOT / "outputs" / "bgs_archive"
SPACE_ARCHIVE = ROOT / "outputs" / "space_weather_archive"
CONTEXT_OUT = OUT / "OUTCOME_OBJECTIVE_CONTEXT_v1.json"
STATUS_OUT = OUT / "OUTCOME_OBJECTIVE_CONTEXT_STATUS_v1.json"
KYIV = ZoneInfo("Europe/Kyiv")

OMNI_FIELDS = (
    "hours", "kp_mean", "kp_max", "ap_mean", "ap_max", "dst_mean",
    "dst_min", "ae_mean", "ae_max", "bz_gsm_mean", "bz_gsm_min",
    "bz_gsm_frac_negative", "speed_mean", "speed_max", "pressure_mean",
    "pressure_max", "f107_mean", "sunspot_mean",
)
AIA_FIELDS = (
    "n", "coverage", "x_robust_range", "y_robust_range", "z_robust_range",
    "f_robust_range", "h_robust_range", "dh1m_median_abs", "dh1m_q99_abs",
)
SPACE_FIELDS = {
    "magnetic": (
        "latest_time", "samples_6h", "bz_latest_nt", "bt_latest_nt",
        "bz_min_6h_nt", "bz_mean_6h_nt", "southward_fraction_6h",
        "strong_south_fraction_6h", "longest_bz_le_minus5_minutes",
    ),
    "solar_wind": (
        "latest_time", "samples_6h", "speed_latest_km_s",
        "speed_mean_6h_km_s", "speed_max_6h_km_s", "density_latest_cm3",
        "density_mean_6h_cm3", "dynamic_pressure_latest_npa",
        "dynamic_pressure_mean_6h_npa", "dynamic_pressure_max_6h_npa",
        "fast_wind_fraction_6h",
    ),
    "protons": (
        "latest_time", "latest_ge10mev_pfu", "max_24h_ge10mev_pfu",
        "s1_threshold_exceeded",
    ),
    "enlil": (
        "window_start", "window_end", "peak_speed_km_s", "peak_speed_time",
        "density_at_peak_cm3", "peak_cloud", "peak_cloud_time",
        "cme_cloud_threshold", "cme_cloud_start", "cme_cloud_end",
    ),
    "solar_probabilities": (
        "issued_date", "c_class_1_day_pct", "m_class_1_day_pct",
        "x_class_1_day_pct", "proton_10mev_1_day_pct",
        "polar_cap_absorption",
    ),
}


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return default


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def pick(data: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {}
    return {field: data[field] for field in fields if data.get(field) is not None}


def timing_class(fetched: datetime | None, day_start: datetime, day_end: datetime) -> str:
    if fetched is None:
        return "unknown"
    if fetched < day_start:
        return "before_target_day"
    if fetched < day_end:
        return "during_target_day"
    return "after_target_day"


def archive_base(path: Path, payload: dict[str, Any], day_start: datetime, day_end: datetime) -> dict[str, Any]:
    fetched = parse_dt(payload.get("fetched_at"))
    return {
        "file": path.name,
        "file_sha256": sha256_file(path),
        "fetched_at": fetched.isoformat() if fetched else payload.get("fetched_at"),
        "timing": timing_class(fetched, day_start, day_end),
        "ok": bool(payload.get("ok", False)),
        "declared_score_effect": payload.get("score_effect", 0),
    }


def bgs_items(date_text: str, day_start: datetime, day_end: datetime) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not BGS_ARCHIVE.exists():
        return items
    for path in sorted(BGS_ARCHIVE.glob(f"{date_text}_*.json")):
        payload = load_json(path, {})
        if not isinstance(payload, dict):
            continue
        item = archive_base(path, payload, day_start, day_end)
        item.update({
            "issued": payload.get("issued"),
            "periods": payload.get("periods", []),
            "flags": payload.get("flags", {}),
            "response_sha256": payload.get("response_sha256"),
            "role": payload.get("role"),
        })
        items.append(item)
    return items


def space_items(date_text: str, day_start: datetime, day_end: datetime) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not SPACE_ARCHIVE.exists():
        return items
    for path in sorted(SPACE_ARCHIVE.glob(f"{date_text}_*.json")):
        payload = load_json(path, {})
        if not isinstance(payload, dict):
            continue
        item = archive_base(path, payload, day_start, day_end)
        sources = payload.get("sources", {}) if isinstance(payload.get("sources"), dict) else {}
        item.update({
            "snapshot_sha256": payload.get("snapshot_sha256"),
            "role": payload.get("role"),
            "source_integrity": {
                name: {"sha256": value.get("sha256"), "ok": value.get("ok")}
                for name, value in sources.items() if isinstance(value, dict)
            },
            "alerts": {
                "recent_72h_count": (payload.get("alerts") or {}).get("recent_72h_count"),
                "items": [
                    {
                        "issued_at": alert.get("issued_at"),
                        "product_id": alert.get("product_id"),
                        "levels": alert.get("levels", []),
                    }
                    for alert in ((payload.get("alerts") or {}).get("items") or [])
                    if isinstance(alert, dict)
                ],
            },
        })
        for section, fields in SPACE_FIELDS.items():
            item[section] = pick(payload.get(section), fields)
        items.append(item)
    return items


def main() -> int:
    generated_at = datetime.now(timezone.utc).isoformat()
    hard_failures: list[str] = []
    warnings: list[str] = []
    if not QUEUE.exists():
        hard_failures.append(f"missing queue: {QUEUE}")
        queue_rows: list[dict[str, str]] = []
    else:
        with QUEUE.open("r", encoding="utf-8-sig", newline="") as handle:
            queue_rows = list(csv.DictReader(handle))

    omni_doc = load_json(OMNI, {})
    aia_doc = load_json(AIA, {})
    omni_days = omni_doc.get("days", {}) if isinstance(omni_doc, dict) else {}
    aia_days = aia_doc.get("data", {}) if isinstance(aia_doc, dict) else {}
    rows: list[dict[str, Any]] = []
    omni_metric_dates = 0
    aia_dates = 0
    bgs_count = 0
    space_count = 0

    for row in queue_rows:
        date_text = (row.get("date") or "").strip()
        try:
            target_date = datetime.strptime(date_text, "%Y-%m-%d").date()
        except ValueError:
            hard_failures.append(f"invalid queue date: {date_text!r}")
            continue
        local_start = datetime.combine(target_date, time.min, tzinfo=KYIV)
        local_end = datetime.combine(target_date, time.max, tzinfo=KYIV)
        day_start = local_start.astimezone(timezone.utc)
        day_end = local_end.astimezone(timezone.utc)
        omni = pick(omni_days.get(date_text), OMNI_FIELDS)
        omni_metric_count = sum(
            value is not None for key, value in omni.items() if key != "hours"
        )
        if omni_metric_count:
            omni_metric_dates += 1
        aia = pick(aia_days.get(date_text), AIA_FIELDS)
        if aia:
            aia_dates += 1
        bgs = bgs_items(date_text, day_start, day_end)
        space = space_items(date_text, day_start, day_end)
        bgs_count += len(bgs)
        space_count += len(space)
        rows.append({
            "date": date_text,
            "prediction": {
                "score": row.get("prediction_score"),
                "created_at": row.get("prediction_created_at"),
                "model": row.get("prediction_model"),
                "frozen": True,
            },
            "target_window": {
                "timezone": "Europe/Kyiv",
                "start_utc": day_start.isoformat(),
                "end_utc": day_end.isoformat(),
            },
            "objective_context": {
                "omni2_daily": {
                    "source_schema": omni_doc.get("schema") if isinstance(omni_doc, dict) else None,
                    "metrics": omni,
                    "metrics_available_excluding_hours": omni_metric_count,
                    "role": "retrospective_objective_context",
                },
                "aia_vernadsky": {
                    "source_schema": aia_doc.get("schema") if isinstance(aia_doc, dict) else None,
                    "metrics": aia,
                    "role": "retrospective_objective_context",
                },
                "bgs_archives": bgs,
                "space_weather_archives": space,
            },
            "actual_score": None,
            "is_independent_user_outcome": False,
            "can_close_outcome_queue": False,
            "production_score_effect": 0,
            "promotion_allowed": False,
            "warning": (
                "Objective environmental context is not a real-world outcome and "
                "must not be used to fill actual_score or validate forecast accuracy."
            ),
        })

    dates_with_any = sum(
        bool(item["objective_context"]["omni2_daily"]["metrics"]
             or item["objective_context"]["aia_vernadsky"]["metrics"]
             or item["objective_context"]["bgs_archives"]
             or item["objective_context"]["space_weather_archives"])
        for item in rows
    )
    if rows and dates_with_any < len(rows):
        warnings.append(f"objective context absent for {len(rows) - dates_with_any} queue dates")
    if rows and omni_metric_dates < len(rows):
        warnings.append(
            f"OMNI2 has measured fields for {omni_metric_dates}/{len(rows)} dates; "
            "hours-only rows are not treated as measurements"
        )

    document = {
        "schema": "outcome_objective_context_v1",
        "generated_at": generated_at,
        "timezone": "Europe/Kyiv",
        "separation_policy": {
            "frozen_prediction": "read_only",
            "objective_environmental_context": "read_only_sidecar",
            "independent_real_world_outcome": "manual_or_independent_source_required",
            "expert_pdf_excel_as_outcome": "forbidden",
        },
        "production_score_effect": 0,
        "rows": rows,
    }
    status = {
        "schema": "outcome_objective_context_status_v1",
        "generated_at": generated_at,
        "queue_rows": len(queue_rows),
        "context_rows": len(rows),
        "dates_with_any_objective_context": dates_with_any,
        "dates_with_omni_metrics": omni_metric_dates,
        "dates_with_aia": aia_dates,
        "bgs_archive_files": bgs_count,
        "space_weather_archive_files": space_count,
        "actual_scores_written": 0,
        "queue_rows_closed": 0,
        "production_score_effect": 0,
        "promotion_allowed": False,
        "hard_failures": hard_failures,
        "warnings": warnings,
        "ok": not hard_failures,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    CONTEXT_OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    STATUS_OUT.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, ensure_ascii=False))
    return 0 if not hard_failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
