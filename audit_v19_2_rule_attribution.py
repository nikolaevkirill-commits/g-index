#!/usr/bin/env python3
"""Attribute each exposed operational v19.2 change to an exact rule.

No scoring changes, no tuning. This is a pure forensic release audit.
Also detects the preserved v19.1 implementation/spec conflict where Panchanga
prior returns before P-v19-3 medical logic despite the source comment claiming
medical override precedence.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from sealed_replay_v19_2_reconstructed import (
    load_support, enrich_tag, parse_v17, clip,
)

ROOT = Path(__file__).resolve().parent


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def classify(raw: int, tag: str, kp: float, cal_tithi, cal_nak, cal_symbols,
             tithi_prior, nak_prior, original_tag: str) -> dict:
    t = parse_v17(tag)
    syms = list(cal_symbols or [])
    info = {
        "rule": "raw_no_change",
        "family": "raw",
        "calendar_enriched": tag != (original_tag or ""),
        "prior_kind": None,
        "prior_value": None,
        "med_would_qualify_without_prior": False,
        "implementation_spec_conflict": False,
    }

    # Exact preserved v19.1 execution order: prior first.
    if raw == 0:
        prior = None
        kind = None
        try:
            nak_i = int(cal_nak) if cal_nak is not None else None
        except (TypeError, ValueError):
            nak_i = None
        try:
            ti_i = int(cal_tithi) if cal_tithi is not None else None
        except (TypeError, ValueError):
            ti_i = None
        if nak_i is not None and nak_i in nak_prior:
            prior, kind = nak_prior[nak_i], "nakshatra"
        elif ti_i is not None and ti_i in tithi_prior:
            prior, kind = tithi_prior[ti_i], "tithi"

        blocking = [
            "heart", "plane", "plus", "diamond", "star", "navaratri", "dipavali",
            "advert", "study", "hand", "new_clothes", "goal", "scissors", "ganesh",
            "bolt", "amavasya", "ekadashi", "purnima", "eclipse",
        ]
        med_qualifies = bool(t["med"] and kp < 5 and not any(t.get(k) for k in blocking))
        info["med_would_qualify_without_prior"] = med_qualifies

        if prior is not None:
            info.update({
                "rule": f"v19.1_P-v19-5_{kind}_prior",
                "family": "v19.1_specific",
                "prior_kind": kind,
                "prior_value": int(prior),
                "implementation_spec_conflict": med_qualifies,
            })
            return info

        if med_qualifies:
            info.update({"rule": "v19.1_P-v19-3_med_solo", "family": "v19.1_specific"})
            return info

    if raw == -3:
        if (t["bolt"] and kp <= 2.0
                and not t["amavasya"] and not t["purnima"]
                and not t["ekadashi"] and not t["ganesh"]
                and not t["retro"] and not t["eclipse"]
                and (t["plane"] or (t["plus"] and t["scissors"]))):
            info.update({"rule": "v19.1_P-v19-1_bolt_action_rescue", "family": "v19.1_specific"})
            return info

    # Only reached if v19.1 did not change raw: exact v18.8 order.
    patched = int(raw)
    applied = []
    if "✈" in tag:
        if "Подорожі" in tag:
            new = max(patched, 2)
            if new != patched:
                applied.append("v18.8_P2_travel_floor_plus2")
            patched = new
        else:
            patched += 1
            applied.append("v18.8_P2_plane_plus1")

    try:
        ti = int(cal_tithi) if cal_tithi is not None else None
    except (TypeError, ValueError):
        ti = None
    if ti in (10, 25) and "bolt" not in syms and "amavasya" not in syms:
        patched += 1
        applied.append("v18.8_P3_dashami_plus1")

    if not tag.strip() and "saturn_retro" in syms and kp >= 4:
        patched = -3
        applied.append("v18.8_P4_empty_saturnretro_kp_ge4_to_minus3")

    if not tag.strip() and int(raw) == 2 and not ("saturn_retro" in syms and kp >= 4):
        patched = 1
        applied.append("v18.8_P1d_empty_plus2_to_plus1")

    if applied:
        info.update({"rule": "+".join(applied), "family": "v18.8_generic"})
    return info


def main() -> int:
    frozen = load("engine_scores.json").get("scores", {})
    cand = load("engine_scores_v19_2_candidate.json").get("scores", {})
    impact = load("ENGINE_V19_2_PRODUCTION_HIERARCHY_IMPACT.json")
    exposed = impact.get("exposed_operational_rows", [])
    tithi_prior, nak_prior, calendar_tags = load_support()

    rows = []
    rules = Counter()
    sign_rules = Counter()
    conflicts = []

    for base_row in exposed:
        ds = base_row["date"]
        snap = frozen[ds]
        centry = cand[ds]
        meta = centry.get("_candidate", {})
        raw = int(meta.get("raw_v18_5_corrected", snap["eng"]))
        original_tag = snap.get("tag") or ""
        overlay_tag = enrich_tag(ds, original_tag, calendar_tags)
        attr = classify(
            raw, overlay_tag, float(snap["kp"]), snap.get("cal_tithi"),
            snap.get("cal_nakshatra"), snap.get("cal_symbols", []),
            tithi_prior, nak_prior, original_tag,
        )
        row = dict(base_row)
        row.update(attr)
        row["raw_v18_5_corrected"] = raw
        row["overlay_tag"] = overlay_tag
        rows.append(row)
        rules[attr["rule"]] += 1
        if row.get("effective_sign_flip"):
            sign_rules[attr["rule"]] += 1
        if attr["implementation_spec_conflict"]:
            conflicts.append(row)

    report = {
        "schema": "engine_v19_2_exposed_rule_attribution_v1",
        "policy": {"tuning": False, "scope": "29 exposed operational rows only"},
        "counts": {
            "rows": len(rows),
            "sign_flips": sum(bool(r.get("effective_sign_flip")) for r in rows),
            "rule_counts": dict(rules),
            "sign_flip_rule_counts": dict(sign_rules),
            "v19_1_prior_vs_med_conflict_rows": len(conflicts),
        },
        "implementation_spec_conflict": {
            "description": "Preserved v19.1 source returns P-v19-5 prior before P-v19-3 med, while source comment states med should have precedence over Panchanga.",
            "rows": conflicts,
        },
        "rows": rows,
    }
    out = ROOT / "ENGINE_V19_2_EXPOSED_RULE_ATTRIBUTION.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 EXPOSED RULE ATTRIBUTION ===")
    print("rows=" + str(len(rows)))
    print("sign_flips=" + str(report["counts"]["sign_flips"]))
    print("rule_counts=" + json.dumps(dict(rules), ensure_ascii=False, sort_keys=True))
    print("sign_flip_rule_counts=" + json.dumps(dict(sign_rules), ensure_ascii=False, sort_keys=True))
    print("v19_1_prior_vs_med_conflict_rows=" + str(len(conflicts)))
    print("=== ROWS ===")
    for r in rows:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    if conflicts:
        print("=== V19.1 PRIOR-vs-MED IMPLEMENTATION/SPEC CONFLICT ===")
        for r in conflicts:
            print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
