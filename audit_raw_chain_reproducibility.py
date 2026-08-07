#!/usr/bin/env python3
"""Audit whether frozen engine_scores snapshots can be regenerated faithfully.

Methodological rule: a row is eligible for raw alias-effect comparison only if
byte-identical recovered v18.5, fed with every relevant input preserved in that
snapshot, reproduces frozen `eng` exactly. Non-reproduced rows are classified as
provenance-incomplete and excluded from alias-effect claims.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import forecast_engine_v18_5 as frozen_engine
import forecast_engine_v18_5_correctness as fixed_engine
from engine_correctness import parse_tag_tokens

ROOT = Path(__file__).resolve().parent


def first_existing(*names: str) -> Path:
    for name in names:
        p = ROOT / name
        if p.exists():
            return p
    raise FileNotFoundError(names)


def numeric_kwargs(snap: dict) -> dict:
    """Use only optional numeric inputs actually preserved by the snapshot."""
    out = {}
    aliases = {
        "sn": ("sn", "sunspot", "sunspot_number"),
        "dst": ("dst", "dst_nt"),
        "f107": ("f107", "f10_7", "f10.7"),
        "lunar_phase_deg": ("lunar_phase_deg", "phase_deg", "lunar_deg"),
        "tithi": ("tithi", "cal_tithi"),
    }
    for target, keys in aliases.items():
        for key in keys:
            if key in snap and snap[key] is not None:
                out[target] = snap[key]
                break
    return out


def main() -> int:
    scores_path = first_existing("engine_scores.json", "deploy/engine_scores.json")
    doc = json.loads(scores_path.read_text(encoding="utf-8"))
    scores = doc.get("scores", {})

    rows = []
    key_counts = Counter()
    optional_presence = Counter()
    for ds, snap in sorted(scores.items()):
        if not isinstance(snap, dict) or "eng" not in snap or "kp" not in snap:
            continue
        try:
            frozen = int(snap["eng"])
            kp = float(snap["kp"])
        except (TypeError, ValueError):
            continue
        tag = snap.get("tag") or ""
        kwargs = numeric_kwargs(snap)
        for key in snap:
            key_counts[key] += 1
        for key in kwargs:
            optional_presence[key] += 1

        legacy = frozen_engine.score_day(tag, kp, **kwargs)
        corrected = fixed_engine.score_day(tag, kp, **kwargs)
        tokens = sorted(parse_tag_tokens(tag))
        rows.append({
            "date": ds,
            "tag": tag,
            "kp": kp,
            "frozen": frozen,
            "legacy_regenerated": legacy,
            "corrected_regenerated": corrected,
            "legacy_reproduced": legacy == frozen,
            "alias_changed": corrected != legacy,
            "n_tags": len(tokens),
            "tokens": tokens,
            "optional_inputs_used": sorted(kwargs),
        })

    reproducible = [r for r in rows if r["legacy_reproduced"]]
    incomplete = [r for r in rows if not r["legacy_reproduced"]]
    alias_changed_all = [r for r in rows if r["alias_changed"]]
    alias_changed_repro = [r for r in reproducible if r["alias_changed"]]

    mismatch_delta = Counter(r["legacy_regenerated"] - r["frozen"] for r in incomplete)
    report = {
        "schema": "raw_chain_reproducibility_audit_v1",
        "source": str(scores_path.relative_to(ROOT)),
        "policy": {
            "tuning": False,
            "eligibility": "legacy regenerated v18.5 must exactly equal frozen eng",
            "nonreproduced_rows": "provenance-incomplete; excluded from alias-effect claims",
        },
        "counts": {
            "scorable_rows": len(rows),
            "legacy_reproduced_rows": len(reproducible),
            "provenance_incomplete_rows": len(incomplete),
            "alias_changed_all_rows": len(alias_changed_all),
            "alias_changed_reproducible_rows": len(alias_changed_repro),
        },
        "snapshot_key_presence": dict(key_counts.most_common()),
        "optional_engine_input_presence": dict(optional_presence),
        "legacy_mismatch_delta_counts": {str(k): v for k, v in sorted(mismatch_delta.items())},
        "alias_changed_reproducible_rows": alias_changed_repro,
        "sample_provenance_incomplete_rows": incomplete[:100],
    }

    out = ROOT / "ENGINE_RAW_CHAIN_REPRODUCIBILITY.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== RAW CHAIN REPRODUCIBILITY ===")
    for k, v in report["counts"].items():
        print(f"{k}={v}")
    print("optional_engine_input_presence=" + json.dumps(dict(optional_presence), ensure_ascii=False, sort_keys=True))
    print("legacy_mismatch_delta_counts=" + json.dumps(report["legacy_mismatch_delta_counts"], sort_keys=True))
    print("snapshot_keys=" + ",".join(sorted(key_counts)))
    if alias_changed_repro:
        print("=== ALIAS-CHANGED REPRODUCIBLE ROWS ===")
        for r in alias_changed_repro[:100]:
            print(f"{r['date']} frozen={r['frozen']} corrected={r['corrected_regenerated']} tag={r['tag']!r} tokens={r['tokens']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
