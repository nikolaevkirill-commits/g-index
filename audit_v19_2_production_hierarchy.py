#!/usr/bin/env python3
"""Classify branch-only v19.2 core changes through the production hierarchy.

Hierarchy audited here:
  verified expert override > expert_calc (if stored in snapshot) > Engine core.

The script does not assume expert_calc exists. It inventories candidate/frozen
snapshot keys and reports any expert_calc-like fields separately. Verified
expert overrides are read from deploy/expert_overrides_v3.json.
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


def main() -> int:
    frozen = load("engine_scores.json").get("scores", {})
    cand = load("engine_scores_v19_2_candidate.json").get("scores", {})
    ovdoc = load("deploy/expert_overrides_v3.json")
    overrides = {
        row["date"]: row
        for row in ovdoc.get("overrides", [])
        if isinstance(row, dict) and row.get("date") and row.get("verified") is True
    }

    all_keys = Counter()
    expertish_keys = Counter()
    for snap in frozen.values():
        if not isinstance(snap, dict):
            continue
        for k in snap:
            all_keys[k] += 1
            if "expert" in k.lower() or "calc" in k.lower() or "override" in k.lower():
                expertish_keys[k] += 1

    changed = []
    classes = Counter()
    operational_classes = Counter()
    for ds in sorted(set(frozen) & set(cand)):
        f, c = frozen[ds], cand[ds]
        if not isinstance(f, dict) or not isinstance(c, dict):
            continue
        try:
            old = int(f["eng"]); new = int(c["eng"])
        except (KeyError, TypeError, ValueError):
            continue
        if old == new:
            continue

        verified = overrides.get(ds)
        # Only use a stored expert_calc field if it is actually present in data.
        expert_calc_key = next((k for k in f if k.lower() in {"expert_calc", "expertcalc", "calc_expert"}), None)
        expert_calc = f.get(expert_calc_key) if expert_calc_key else None

        if verified is not None:
            cls = "masked_verified_override"
            effective_old = int(verified["expert_eng"])
            effective_new = int(verified["expert_eng"])
        elif expert_calc is not None:
            cls = "masked_snapshot_expert_calc"
            effective_old = int(expert_calc)
            effective_new = int(expert_calc)
        else:
            cls = "exposed_engine_core"
            effective_old = old
            effective_new = new

        d = date.fromisoformat(ds)
        operational = d >= TODAY
        classes[cls] += 1
        if operational:
            operational_classes[cls] += 1
        changed.append({
            "date": ds,
            "operational_from_2026_08_07": operational,
            "class": cls,
            "frozen_eng": old,
            "candidate_eng": new,
            "core_delta": new-old,
            "effective_old": effective_old,
            "effective_new": effective_new,
            "effective_changed": effective_old != effective_new,
            "verified_override": None if verified is None else {
                "expert_eng": verified.get("expert_eng"),
                "source_pdf": verified.get("source_pdf"),
                "verified": verified.get("verified"),
            },
            "snapshot_expert_calc_key": expert_calc_key,
            "snapshot_expert_calc": expert_calc,
            "tag": f.get("tag", ""),
        })

    exposed = [r for r in changed if r["class"] == "exposed_engine_core"]
    exposed_operational = [r for r in exposed if r["operational_from_2026_08_07"]]
    sign_flips = [r for r in exposed if (r["frozen_eng"] > 0) != (r["candidate_eng"] > 0) or (r["frozen_eng"] < 0) != (r["candidate_eng"] < 0)]
    sign_flips_operational = [r for r in sign_flips if r["operational_from_2026_08_07"]]

    report = {
        "schema": "engine_v19_2_production_hierarchy_impact_v1",
        "as_of": TODAY.isoformat(),
        "policy": {
            "hierarchy": "verified expert override > stored expert_calc if present > engine core",
            "expert_calc_assumption": "none; only counted when a snapshot field explicitly exists",
            "operational_window": ">= 2026-08-07",
        },
        "counts": {
            "candidate_core_changed_rows": len(changed),
            "classes": dict(classes),
            "operational_classes": dict(operational_classes),
            "exposed_engine_core_rows": len(exposed),
            "exposed_operational_rows": len(exposed_operational),
            "exposed_sign_flip_rows": len(sign_flips),
            "exposed_operational_sign_flip_rows": len(sign_flips_operational),
            "verified_override_rows_total": len(overrides),
        },
        "snapshot_expertish_key_presence": dict(expertish_keys),
        "all_snapshot_keys": sorted(all_keys),
        "changed_rows": changed,
        "exposed_operational_rows": exposed_operational,
        "exposed_operational_sign_flips": sign_flips_operational,
    }
    (ROOT / "ENGINE_V19_2_PRODUCTION_HIERARCHY_IMPACT.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("=== PRODUCTION HIERARCHY IMPACT ===")
    for k,v in report["counts"].items(): print(f"{k}={json.dumps(v, ensure_ascii=False, sort_keys=True)}")
    print("snapshot_expertish_key_presence=" + json.dumps(dict(expertish_keys), sort_keys=True))
    print("=== EXPOSED OPERATIONAL ROWS ===")
    for r in exposed_operational:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    print("=== EXPOSED OPERATIONAL SIGN FLIPS ===")
    for r in sign_flips_operational:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
