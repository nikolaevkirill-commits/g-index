#!/usr/bin/env python3
"""Freeze the exposed v19.2 operational cohort prospectively.

This is a one-way audit artifact, not production scoring. It freezes all 29 rows
that would actually change after runtime hierarchy from 2026-08-07 onward.
Future expert/PDF labels and real outcomes may be attached later for evaluation,
but must never mutate the frozen model/rule/tag/baseline/candidate fields.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ATTR = ROOT / "ENGINE_V19_2_EXPOSED_RULE_ATTRIBUTION.json"
HIER = ROOT / "ENGINE_V19_2_PRODUCTION_HIERARCHY_IMPACT.json"
CAND = ROOT / "engine_scores_v19_2_candidate.json"
OUT = ROOT / "V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json"
STATUS = ROOT / "V19_2_PROSPECTIVE_SHADOW_STATUS_v1.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    attr = load(ATTR)
    hier = load(HIER)
    cand = load(CAND)
    rows = attr.get("rows", [])

    if len(rows) != 29:
        raise RuntimeError(f"Expected exactly 29 exposed operational rows, got {len(rows)}")
    if sum(bool(r.get("effective_sign_flip")) for r in rows) != 12:
        raise RuntimeError("Expected exactly 12 exposed operational sign flips")
    if hier.get("counts", {}).get("exposed_operational_rows") != 29:
        raise RuntimeError("Hierarchy report no longer matches frozen cohort")
    if cand.get("_meta", {}).get("production") is not False:
        raise RuntimeError("Candidate artifact must remain production=false")
    if cand.get("_meta", {}).get("historical_v19_2_source_recovered") is not False:
        raise RuntimeError("Historical v19.2 source provenance changed unexpectedly")

    frozen_rows = []
    for r in rows:
        frozen_rows.append({
            "date": r["date"],
            "production_baseline": int(r["effective_old"]),
            "v19_2_candidate": int(r["effective_new"]),
            "delta": int(r["effective_new"]) - int(r["effective_old"]),
            "sign_flip": bool(r["effective_sign_flip"]),
            "rule": r["rule"],
            "rule_family": r["family"],
            "tag": r.get("tag", ""),
            "overlay_tag": r.get("overlay_tag", ""),
            "raw_v18_5_corrected": int(r["raw_v18_5_corrected"]),
            "calendar_enriched": bool(r.get("calendar_enriched")),
            "future_expert_label": None,
            "future_expert_label_observed_at": None,
            "future_real_outcome": None,
            "future_real_outcome_observed_at": None,
            "evaluation_status": "pending",
        })

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    freeze = {
        "schema": "v19_2_prospective_shadow_freeze_v1",
        "frozen_at_utc": now,
        "effective_start_date": "2026-08-07",
        "production_changed": False,
        "historical_v19_2_source_recovered": False,
        "candidate_status": "reconstructed_shadow_only",
        "promotion_allowed": False,
        "direct_promotion_gate": "HOLD",
        "hold_reasons": [
            "29 effective runtime changes are all prospective dates from 2026-08-07 onward",
            "12/29 are sign flips",
            "4 sign flips come from broad v18.8 plane/Dashami rules",
            "5 sign flips come from v19.1 Panchanga priors",
            "historical v19.2 consolidation source is unrecovered",
        ],
        "evaluation_contract": {
            "no_retuning_after_freeze": True,
            "future_expert_pdf_labels": "evaluate separately as prospective expert-label agreement; never call real-outcome accuracy",
            "future_real_outcomes": "evaluate separately; never substitute PDF agreement",
            "missing_labels": "remain pending; do not impute",
            "promotion": "manual release decision only after prospective evidence; no automatic promotion",
        },
        "provenance": {
            "candidate_sha256": sha256(CAND),
            "hierarchy_impact_sha256": sha256(HIER),
            "rule_attribution_sha256": sha256(ATTR),
            "alias_contract_version": "1.0.2",
        },
        "counts": {
            "rows": len(frozen_rows),
            "sign_flips": sum(r["sign_flip"] for r in frozen_rows),
        },
        "rows": frozen_rows,
    }
    OUT.write_text(json.dumps(freeze, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    status = {
        "schema": "v19_2_prospective_shadow_status_v1",
        "generated_at_utc": now,
        "freeze_file": OUT.name,
        "production_formula_changed": False,
        "promotion_allowed": False,
        "state": "FROZEN_PROSPECTIVE_SHADOW",
        "effective_start_date": "2026-08-07",
        "cohort_rows": len(frozen_rows),
        "sign_flips": sum(r["sign_flip"] for r in frozen_rows),
        "expert_labels_observed": 0,
        "real_outcomes_observed": 0,
        "reason": "Direct promotion held; future-only exposed cohort frozen before outcomes/labels are attached.",
    }
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 PROSPECTIVE SHADOW FREEZE ===")
    print(f"rows={len(frozen_rows)}")
    print(f"sign_flips={status['sign_flips']}")
    print("production_changed=false")
    print("promotion_allowed=false")
    print("state=FROZEN_PROSPECTIVE_SHADOW")
    print(f"freeze={OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
