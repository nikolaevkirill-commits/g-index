import csv
import hashlib
import json
import math
import os
import statistics
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(
    os.environ.get(
        "GINDEX_ROOT", r"D:\ПРОГНОЗ\прогноз по ексель\deploy\13"
    )
)
OUT = Path(
    os.environ.get(
        "GINDEX_PHASE2_OUT",
        str(ROOT / "outputs" / "data_control" / "phase2"),
    )
)
OUT.mkdir(parents=True, exist_ok=True)


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8-sig"))


def sha(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()


def write_json(name, value):
    (OUT / name).write_text(
        json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def write_csv(name, rows):
    if not rows:
        return
    keys = list(rows[0])
    with (OUT / name).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def daterange(start, end):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def cls(value):
    if value is None:
        return None
    return 1 if value > 0 else (-1 if value < 0 else 0)


lineage = [
    {
        "index": "Kp observed/forecast",
        "symbol": "Kp",
        "source": "NOAA SWPC / GFZ; observed, 3-day and 27-day are distinct products",
        "normalization": "Use timestamped Kp; expert Excel uses daily/predicted Kp input",
        "component": "Expert and dashboard raw geomagnetic term = 2-Kp",
        "weight_or_threshold": "Linear 2-Kp; engine safety remains separately thresholded",
        "feeds": "Expert AB; G_now/G_day raw",
        "independence": "Ap is same geomagnetic family and must not be counted as an independent vote",
        "production_status": "active",
        "risk": "Never mix observed Kp, 3-day forecast and 27-day outlook without provenance",
    },
    {
        "index": "Lunar phase",
        "symbol": "Lᵢ",
        "source": "Meeus/local astronomy; expert Excel Moon column",
        "normalization": "Dashboard: Amavasya -3; Purnima 0 at Kp<5 (storm interaction). Expert Excel: full moon -3, new moon -2",
        "component": "Lunar term",
        "weight_or_threshold": "Dashboard and Expert use different lunar rules; do not merge the values",
        "feeds": "ΣAᵢ and expert AB",
        "independence": "Related to tithi; avoid treating phase and tithi-derived labels as independent evidence",
        "production_status": "dashboard active; expert formula verified",
        "risk": "Local-day and sunrise boundary must be recorded",
    },
    {
        "index": "Eclipse",
        "symbol": "Mᵢ",
        "source": "Astronomical eclipse calendar / expert Excel",
        "normalization": "Window -1; eclipse -4; adjacent day -3",
        "component": "Eclipse term",
        "weight_or_threshold": "-4..0",
        "feeds": "ΣAᵢ and expert AB",
        "independence": "Do not duplicate with calendar icon/tag for the same eclipse",
        "production_status": "active/formula verified",
        "risk": "Window definition and timezone must remain explicit",
    },
    {
        "index": "Taanita pictograms/tags",
        "symbol": "eᵢ",
        "source": "Expert workbook daily tags + scanned Taanita calendars",
        "normalization": "Canonical tag dictionary; up to six weighted tags in expert workbook",
        "component": "Σ(weight_tag)",
        "weight_or_threshold": "Master dictionary contains weights -4..+5",
        "feeds": "ΣAᵢ and expert AB",
        "independence": "Some icons encode lunar/calendar events already present in Lᵢ/Mᵢ/Pᵢ",
        "production_status": "historical formula verified; image decoder shadow only",
        "risk": "Unverified image detections have score_effect=0",
    },
    {
        "index": "Panchanga",
        "symbol": "Pᵢ",
        "source": "Meeus/Lahiri computation: tithi, nakshatra, yoga, karana, vara",
        "normalization": "Lookup tables and local-time transitions",
        "component": "Panchanga contribution inside ΣAᵢ",
        "weight_or_threshold": "Current dashboard contribution is included once in G_day raw",
        "feeds": "ΣAᵢ → G_day raw",
        "independence": "NOT a second green vote; presentation must say already included",
        "production_status": "active as component/context",
        "risk": "Transitions near day boundary require minute-level timeline",
    },
    {
        "index": "Dst",
        "symbol": "Dᵢ",
        "source": "NOAA/SWPC Kyoto Dst fallback",
        "normalization": "Today only; Dst freshness required",
        "component": "Geomagnetic storm context",
        "weight_or_threshold": "Dashboard: Dst<=-50 -> -1; Dst<=-100 -> -2",
        "feeds": "ΣAᵢ / G_day raw",
        "independence": "Correlated with Kp but measures a different geomagnetic response",
        "production_status": "active when fresh",
        "risk": "Delayed/fallback state must not be displayed as live",
    },
    {
        "index": "Sunspot number",
        "symbol": "Snᵢ",
        "source": "SILSO/ROB EISN",
        "normalization": "SILSO value; >150 -> -0.2, >200 -> -0.4 in dashboard raw",
        "component": "Dashboard legacy R&D penalty",
        "weight_or_threshold": "Existing audits found no stable incremental signal",
        "feeds": "Dashboard G raw only; not Engine/PDF",
        "independence": "Correlated with F10.7 and solar cycle",
        "production_status": "active advisory legacy; no independent predictive evidence",
        "risk": "Do not add alongside F10.7 as independent points without ablation",
    },
    {
        "index": "AIA Vernadsky lagged disturbance",
        "symbol": "AIA_lag1/2",
        "source": "INTERMAGNET HAPI aia/best-avail/PT1M/xyzf",
        "normalization": "Complete UTC day only; q05-q95 robust ranges and 1-minute absolute changes; lags 1-2 days",
        "component": "Independent-station geomagnetic R&D context",
        "weight_or_threshold": "Rejected time-split gate; score_effect=0",
        "feeds": "Audit/space-weather advisory only",
        "independence": "Tested incrementally against frozen Engine; overlaps Kp/Dst and did not improve 2026 exact",
        "production_status": "shadow rejected; automated observation retained",
        "risk": "High-latitude local signal, missing days and provisional data; never use same-day complete values for forecasts",
    },
    {
        "index": "Calendar/editorial score",
        "symbol": "Cᵢ / cal_score",
        "source": "Taanita calendar symbols and astronomical calendar",
        "normalization": "Symbol mapping plus calendar rules",
        "component": "Shadow/advisory layer",
        "weight_or_threshold": "score_effect=0 until time-split/prospective validation",
        "feeds": "Explanations and flags; not canonical G",
        "independence": "Overlaps Pᵢ, Lᵢ, Mᵢ and Taanita tags",
        "production_status": "shadow",
        "risk": "Highest double-counting risk",
    },
    {
        "index": "Expert raw sum",
        "symbol": "AB",
        "source": "Expert workbook formula AGGREGATE(9,6,T:AA,K)",
        "normalization": "(2-Kp)+Moon+Eclipse+sum(tag weights)",
        "component": "Raw expert index",
        "weight_or_threshold": "Bucket: ≥3:+3, ≥2:+2, ≥1:+1, ≥0:0, ≥-1:-1, ≥-2:-2, else -3",
        "feeds": "Expert formula score",
        "independence": "Deterministic sum; not independent ground truth from its own tags",
        "production_status": "495/495 reconstructed",
        "risk": "Do not call reproduction accuracy an external forecast accuracy",
    },
    {
        "index": "G_day raw",
        "symbol": "G_day",
        "source": "Dashboard runtime inputs",
        "normalization": "G_raw = 2-Kp + Li + Mi + ei + Pi + Di, with provenance; Sn is context-only",
        "component": "Autonomous raw day signal",
        "weight_or_threshold": "Continuous/raw value then decision buckets",
        "feeds": "Charts, autonomous forecast, diagnostics",
        "independence": "Already contains Pᵢ; calendar summary is explanatory only",
        "production_status": "active",
        "risk": "Keep separate from final PDF override",
    },
    {
        "index": "Expert PDF override",
        "symbol": "PDF score",
        "source": "Latest overlapping expert bulletin by issue/window",
        "normalization": "Text classification to -3..+3 with revision-aware precedence",
        "component": "Verified expert decision",
        "weight_or_threshold": "Overrides decision layer, never rewrites raw G_day",
        "feeds": "Final displayed expert decision and benchmarking",
        "independence": "Not independent of expert workbook/calendar methodology",
        "production_status": "active when verified",
        "risk": "Revisions must not be median-merged",
    },
]
write_json(
    "INDEX_LINEAGE_CANONICAL_v2.json",
    {
        "schema": "gindex_lineage_v2",
        "generated": "2026-07-26",
        "invariants": [
            "Panchanga P_i is already included in G_day raw and is never a second vote.",
            "Observed, forecast, delayed, synthetic and fallback values remain distinguishable.",
            "Raw G_day is never overwritten by an expert PDF decision.",
            "Unverified calendar/Taanita factors have score_effect=0.",
        ],
        "rows": lineage,
    },
)
write_csv("INDEX_LINEAGE_CANONICAL_v2.csv", lineage)

panch = load("outputs/PANCHANGA_TIMELINE_v2_2024_2026.json")["days"]
icons_rel = (
    "outputs/data_control/phase2/tanita_calendar_icons_v0_4.json"
    if (ROOT / "outputs/data_control/phase2/tanita_calendar_icons_v0_4.json").exists()
    else "outputs/tanita_calendar_icons_v0_3.json"
)
icons_file = load(icons_rel)
icons = icons_file["data"]
calibration = icons_file["calibration"]
excel = {row["date"]: row for row in load("excel_canonical.json")["days"]}
engine = load("engine_scores.json").get("scores", {})
expert_inputs = load("tarita_daily_inputs.json")
weekly_payload = load("outputs/weekly_pdf_gt_v3.json")
weekly = weekly_payload.get("data", weekly_payload.get("days", {}))

calendar_rows = []
for day in daterange(date(2025, 1, 1), date(2026, 12, 31)):
    ds = day.isoformat()
    pd = panch.get(ds, {})
    comps = pd.get("components", {})
    icon_entry = icons.get(ds, {})
    icon_names = icon_entry.get("icons", [])
    confidences = []
    enabled = []
    for name in icon_names:
        cfg = calibration.get(name, {})
        conf = cfg.get("test", {}).get("precision", cfg.get("precision"))
        if isinstance(conf, (int, float)):
            confidences.append(conf)
        if cfg.get("status") in ("active", "crossmonth_validated_shadow"):
            enabled.append(name)
    x = excel.get(ds, {})
    e = engine.get(ds, {})
    ti = expert_inputs.get(ds, {})
    gt = weekly.get(ds, {})
    row = {
        "date": ds,
        "weekday": day.weekday() + 1,
        "local_day_start_utc": pd.get("start_utc"),
        "local_day_end_utc": pd.get("end_utc"),
        "tithi_first": comps.get("tithi", {}).get("first"),
        "tithi_last": comps.get("tithi", {}).get("last"),
        "tithi_changes": comps.get("tithi", {}).get("changes"),
        "nakshatra_first": comps.get("nakshatra", {}).get("first"),
        "nakshatra_last": comps.get("nakshatra", {}).get("last"),
        "nakshatra_changes": comps.get("nakshatra", {}).get("changes"),
        "yoga_first": comps.get("yoga", {}).get("first"),
        "yoga_last": comps.get("yoga", {}).get("last"),
        "yoga_changes": comps.get("yoga", {}).get("changes"),
        "karana_first": comps.get("karana", {}).get("first"),
        "karana_last": comps.get("karana", {}).get("last"),
        "karana_changes": comps.get("karana", {}).get("changes"),
        "tanita_icons": "|".join(icon_names),
        "tanita_icons_enabled": "|".join(enabled),
        "tanita_icon_min_precision": min(confidences) if confidences else None,
        "tanita_source": icon_entry.get("source"),
        "tanita_page": icon_entry.get("page"),
        "excel_kp": x.get("kp"),
        "excel_jyotish_raw": x.get("jyotish_raw"),
        "excel_tags": "|".join(str(v) for v in x.get("tags", [])),
        "expert_kp": ti.get("kp"),
        "expert_kp_penalty": ti.get("kpen"),
        "expert_moon": ti.get("moon"),
        "expert_eclipse": ti.get("ecl"),
        "expert_tags": "|".join(ti.get("tags", [])),
        "expert_raw_AB": ti.get("AB"),
        "expert_formula_score": ti.get("score"),
        "engine_raw": e.get("eng"),
        "engine_cal_score": e.get("cal_score"),
        "engine_cal_symbols": "|".join(e.get("cal_symbols", [])),
        "pdf_score": gt.get("score"),
        "pdf_source": gt.get("source"),
        "calendar_score_effect": 0,
        "quality_flags": "|".join(
            [
                flag
                for flag, condition in [
                    ("missing_panchanga", not pd),
                    ("no_tanita_detection", not icon_names),
                    ("tanita_unverified", bool(icon_names) and len(enabled) != len(icon_names)),
                    ("panchanga_transition", any(comps.get(k, {}).get("changes", 0) for k in comps)),
                    ("expert_formula_available", bool(ti)),
                    ("pdf_available", bool(gt)),
                ]
                if condition
            ]
        ),
    }
    calendar_rows.append(row)

write_csv("CALENDAR_TANITA_UNIFIED_2025_2026_v1.csv", calendar_rows)
write_json(
    "CALENDAR_TANITA_UNIFIED_2025_2026_v1.json",
    {
        "schema": "calendar_tanita_unified_v1",
        "generated": "2026-07-26",
        "timezone": "Europe/Kyiv local civil day; UTC boundaries preserved",
        "score_effect": 0,
        "source_hashes": {
            "panchanga": sha("outputs/PANCHANGA_TIMELINE_v2_2024_2026.json"),
            "tanita_icons": sha(icons_rel),
            "excel": sha("excel_canonical.json"),
            "engine": sha("engine_scores.json"),
            "expert_inputs": sha("tarita_daily_inputs.json"),
            "pdf_gt": sha("outputs/weekly_pdf_gt_v3.json"),
        },
        "rows": calendar_rows,
    },
)

icon_rows = []
usage = Counter()
enabled_usage = Counter()
for entry in icons.values():
    for name in entry.get("icons", []):
        usage[name] += 1
        if calibration.get(name, {}).get("status") in ("active", "crossmonth_validated_shadow"):
            enabled_usage[name] += 1
for name in sorted(set(calibration) | set(usage)):
    cfg = calibration.get(name, {})
    icon_rows.append(
        {
            "icon": name,
            "enabled": cfg.get("status") in ("active", "crossmonth_validated_shadow"),
            "precision": cfg.get("test", {}).get("precision", cfg.get("precision")),
            "threshold": cfg.get("threshold"),
            "template_count": cfg.get("templates") or cfg.get("template_count"),
            "detected_days": usage[name],
            "enabled_detected_days": enabled_usage[name],
            "manual_status": cfg.get("status") or "requires cross-month QA",
            "meaning": cfg.get("meaning") or "",
            "score_effect": 0,
            "reason": "shadow until cross-month validation and prospective gate",
        }
    )
write_csv("TANITA_ICON_REGISTRY_v1.csv", icon_rows)
write_json(
    "TANITA_ICON_REGISTRY_v1.json",
    {
        "schema": "tanita_icon_registry_v1",
        "generated": "2026-07-26",
        "rows": icon_rows,
    },
)

# Exploratory pair interactions against revision-aware expert PDF.
# Candidate is selected only on 2025, then evaluated once on 2026.
records = []
for ds, ti in expert_inputs.items():
    if ds not in weekly:
        continue
    tags = sorted(set(ti.get("tags", [])))
    records.append(
        {
            "date": ds,
            "year": int(ds[:4]),
            "base": int(ti["score"]),
            "target": int(weekly[ds]["score"]),
            "tags": tags,
        }
    )

train = [r for r in records if r["year"] == 2025]
test = [r for r in records if r["year"] == 2026]
pair_train = defaultdict(list)
pair_test = defaultdict(list)
for row in records:
    tags = row["tags"]
    target = pair_train if row["year"] == 2025 else pair_test
    for i in range(len(tags)):
        for j in range(i + 1, len(tags)):
            target[(tags[i], tags[j])].append(row)


def metrics(rows, adjustment=0):
    if not rows:
        return {"n": 0, "exact": None, "within1": None, "mae": None}
    pred = [max(-3, min(3, r["base"] + adjustment)) for r in rows]
    return {
        "n": len(rows),
        "exact": sum(p == r["target"] for p, r in zip(pred, rows)) / len(rows),
        "within1": sum(abs(p - r["target"]) <= 1 for p, r in zip(pred, rows)) / len(rows),
        "mae": sum(abs(p - r["target"]) for p, r in zip(pred, rows)) / len(rows),
    }


candidates = []
for pair, rows in pair_train.items():
    test_rows = pair_test.get(pair, [])
    if len(rows) < 8 or len(test_rows) < 4:
        continue
    residuals = [r["target"] - r["base"] for r in rows]
    adj = max(-1, min(1, round(statistics.median(residuals))))
    base_train = metrics(rows, 0)
    adjusted_train = metrics(rows, adj)
    candidates.append(
        {
            "pair": " + ".join(pair),
            "adjustment": adj,
            "train_n": len(rows),
            "train_exact_base": base_train["exact"],
            "train_exact_adjusted": adjusted_train["exact"],
            "train_mae_base": base_train["mae"],
            "train_mae_adjusted": adjusted_train["mae"],
            "test_n": len(test_rows),
        }
    )
candidates.sort(
    key=lambda x: (
        x["train_exact_adjusted"] - x["train_exact_base"],
        x["train_mae_base"] - x["train_mae_adjusted"],
        x["train_n"],
    ),
    reverse=True,
)

selected = next(
    (
        item
        for item in candidates
        if item["adjustment"] != 0
        and item["train_exact_adjusted"] > item["train_exact_base"]
        and item["train_mae_adjusted"] <= item["train_mae_base"]
    ),
    None,
)
if selected:
    pair = tuple(selected["pair"].split(" + "))
    test_rows = pair_test[pair]
    selected["test_exact_base"] = metrics(test_rows, 0)["exact"]
    selected["test_exact_adjusted"] = metrics(test_rows, selected["adjustment"])["exact"]
    selected["test_within1_base"] = metrics(test_rows, 0)["within1"]
    selected["test_within1_adjusted"] = metrics(test_rows, selected["adjustment"])["within1"]
    selected["test_mae_base"] = metrics(test_rows, 0)["mae"]
    selected["test_mae_adjusted"] = metrics(test_rows, selected["adjustment"])["mae"]
    selected["promote"] = (
        selected["test_exact_adjusted"] > selected["test_exact_base"]
        and selected["test_mae_adjusted"] <= selected["test_mae_base"]
        and selected["test_n"] >= 10
    )

interaction_report = {
    "schema": "nonlinear_interaction_audit_v2",
    "generated": "2026-07-26",
    "target": "revision-aware weekly expert PDF score",
    "baseline": "reconstructed expert formula score",
    "split": {"train": "2025", "test_once": "2026"},
    "common_dates": len(records),
    "train_dates": len(train),
    "test_dates": len(test),
    "candidate_filter": "pair support train>=8 and test>=4; adjustment median residual clipped to ±1",
    "multiple_testing_warning": True,
    "selected": selected,
    "promotion_policy": "No production change unless test support>=10, exact improves, MAE does not worsen, and prospective confirmation passes.",
    "canonical_score_effect": 0,
    "candidates": candidates[:100],
}
write_json("NONLINEAR_INTERACTION_AUDIT_v2.json", interaction_report)
write_csv("NONLINEAR_INTERACTION_CANDIDATES_v2.csv", candidates[:100])

coverage = {
    "calendar_days": len(calendar_rows),
    "panchanga_days": sum("missing_panchanga" not in r["quality_flags"] for r in calendar_rows),
    "tanita_days_any_icon": sum(bool(r["tanita_icons"]) for r in calendar_rows),
    "tanita_days_all_enabled": sum(
        bool(r["tanita_icons"])
        and r["tanita_icons"] == r["tanita_icons_enabled"]
        for r in calendar_rows
    ),
    "expert_formula_days": sum(r["expert_formula_score"] is not None for r in calendar_rows),
    "pdf_days": sum(r["pdf_score"] is not None for r in calendar_rows),
    "engine_days": sum(r["engine_raw"] is not None for r in calendar_rows),
    "icons_total_types": len(icon_rows),
    "icons_enabled_types": sum(bool(r["enabled"]) for r in icon_rows),
}
write_json("PHASE2_COVERAGE_SUMMARY_v1.json", coverage)

selected_text = "No eligible pair"
if selected:
    selected_text = (
        f"{selected['pair']}, adjustment {selected['adjustment']:+d}; "
        f"test n={selected['test_n']}, exact "
        f"{selected['test_exact_base']:.1%}→{selected['test_exact_adjusted']:.1%}; "
        f"promote={selected['promote']}"
    )
report = f"""# Phase 2 data audit — 2026-07-26

## Result

- Canonical index lineage: {len(lineage)} rows.
- Unified calendar: {coverage['calendar_days']} dates (2025–2026).
- Panchanga minute-boundary coverage: {coverage['panchanga_days']} dates.
- Taanita image detections: {coverage['tanita_days_any_icon']} dates; all detected icons enabled on {coverage['tanita_days_all_enabled']} dates.
- Expert reconstructed formula: {coverage['expert_formula_days']} dates.
- Revision-aware PDF labels: {coverage['pdf_days']} dates.
- Engine values: {coverage['engine_days']} dates.

## Non-negotiable invariants

1. Panchanga Pᵢ is already inside G_day raw. It is not a second independent vote.
2. Calendar/Taanita image factors remain `score_effect=0` until time-split and prospective validation.
3. Expert formula reproduction is not independent forecast accuracy because tags and output share the same authoring process.
4. Raw G_day and PDF override remain separate values.

## Interaction screen

Selected exploratory pair: {selected_text}

Even a positive holdout result is not auto-promoted: pair search has a multiple-testing risk and needs prospective confirmation.

## Safe integration decision

No scoring weight was changed. The safe output of this phase is the auditable lineage, unified daily table, icon registry, and interaction candidate registry. Confirmed context rules may be displayed in the dashboard, but cannot add a second score.
"""
(OUT / "PHASE2_DATA_AUDIT_2026-07-26.md").write_text(report, encoding="utf-8")
print(json.dumps({"coverage": coverage, "selected": selected}, ensure_ascii=False, indent=2))
