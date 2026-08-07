#!/usr/bin/env python3
"""Classify branch-only v19.2 core changes through the actual runtime hierarchy.

Runtime hierarchy (index.html fp196):
  verified expert override > expert_calc_scores.json > Engine core.

No GT/PDF tuning is performed. This is release-impact classification only.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TODAY = date(2026, 8, 7)


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def sign(v: int) -> int:
    return 1 if v > 0 else -1 if v < 0 else 0


def main() -> int:
    frozen = load("engine_scores.json").get("scores", {})
    cand = load("engine_scores_v19_2_candidate.json").get("scores", {})

    ovdoc = load("deploy/expert_overrides_v3.json")
    overrides = {
        row["date"]: row
        for row in ovdoc.get("overrides", [])
        if isinstance(row, dict)
        and row.get("date")
        and row.get("verified") is True
        and isinstance(row.get("expert_eng"), (int, float))
    }

    calc_path = ROOT / "expert_calc_scores.json"
    calcdoc = json.loads(calc_path.read_text(encoding="utf-8")) if calc_path.exists() else {}
    calc_scores = calcdoc.get("scores", {}) if isinstance(calcdoc, dict) else {}
    expert_calc = {
        ds: row
        for ds, row in calc_scores.items()
        if isinstance(row, dict) and isinstance(row.get("score"), (int, float))
    }

    changed = []
    classes = Counter()
    operational_classes = Counter()

    for ds in sorted(set(frozen) & set(cand)):
        f, c = frozen[ds], cand[ds]
        if not isinstance(f, dict) or not isinstance(c, dict):
            continue
        try:
            old = int(f["eng"])
            new = int(c["eng"])
        except (KeyError, TypeError, ValueError):
            continue
        if old == new:
            continue

        verified = overrides.get(ds)
        calc = expert_calc.get(ds)

        if verified is not None:
            cls = "masked_verified_override"
            effective_old = effective_new = int(verified["expert_eng"])
        elif calc is not None:
            cls = "masked_expert_calc"
            effective_old = effective_new = int(calc["score"])
        else:
            cls = "exposed_engine_core"
            effective_old, effective_new = old, new

        operational = date.fromisoformat(ds) >= TODAY
        classes[cls] += 1
        if operational:
            operational_classes[cls] += 1

        changed.append({
            "date": ds,
            "operational_from_2026_08_07": operational,
            "class": cls,
            "frozen_eng": old,
            "candidate_eng": new,
            "core_delta": new - old,
            "effective_old": effective_old,
            "effective_new": effective_new,
            "effective_changed": effective_old != effective_new,
            "effective_sign_flip": sign(effective_old) != sign(effective_new),
            "verified_override": None if verified is None else {
                "expert_eng": verified.get("expert_eng"),
                "source_pdf": verified.get("source_pdf"),
                "verified": True,
            },
            "expert_calc": None if calc is None else {
                "score": calc.get("score"),
                "raw_sum": calc.get("raw_sum"),
                "kp_her": calc.get("kp_her"),
            },
            "tag": f.get("tag", ""),
        })

    exposed = [r for r in changed if r["class"] == "exposed_engine_core"]
    exposed_operational = [r for r in exposed if r["operational_from_2026_08_07"]]
    exposed_sign_flips = [r for r in exposed if r["effective_sign_flip"]]
    exposed_operational_sign_flips = [r for r in exposed_operational if r["effective_sign_flip"]]

    report = {
        "schema": "engine_v19_2_production_hierarchy_impact_v2",
        "as_of": TODAY.isoformat(),
        "policy": {
            "hierarchy": "verified expert override > expert_calc_scores.json > engine core",
            "expert_calc_source": "expert_calc_scores.json" if calc_path.exists() else None,
            "expert_calc_version": calcdoc.get("version") if isinstance(calcdoc, dict) else None,
            "operational_window": ">= 2026-08-07",
            "tuning": False,
        },
        "counts": {
            "candidate_core_changed_rows": len(changed),
            "classes": dict(classes),
            "operational_classes": dict(operational_classes),
            "verified_override_rows_total": len(overrides),
            "expert_calc_rows_total": len(expert_calc),
            "exposed_engine_core_rows": len(exposed),
            "exposed_operational_rows": len(exposed_operational),
            "exposed_sign_flip_rows": len(exposed_sign_flips),
            "exposed_operational_sign_flip_rows": len(exposed_operational_sign_flips),
        },
        "changed_rows": changed,
        "exposed_operational_rows": exposed_operational,
        "exposed_operational_sign_flips": exposed_operational_sign_flips,
    }

    (ROOT / "ENGINE_V19_2_PRODUCTION_HIERARCHY_IMPACT.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("=== PRODUCTION HIERARCHY IMPACT v2 ===")
    for k, v in report["counts"].items():
        print(f"{k}={json.dumps(v, ensure_ascii=False, sort_keys=True)}")
    print("=== EXPOSED OPERATIONAL ROWS ===")
    for r in exposed_operational:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    print("=== EXPOSED OPERATIONAL SIGN FLIPS ===")
    for r in exposed_operational_sign_flips:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
