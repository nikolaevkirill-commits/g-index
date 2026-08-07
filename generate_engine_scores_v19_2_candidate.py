#!/usr/bin/env python3
"""Generate a branch-only corrected v19.2 Engine-core score artifact.

This never writes production engine_scores.json.

Pipeline:
  stored source tag/Kp/tithi -> pre-score canonical alias adapter -> recovered
  byte-identical v18.5 raw -> reconstructed v19.2 precedence -> frozen v17-based
  bolt correctness.

Expert/PDF overrides are intentionally NOT folded into `eng`. They are audited
separately as the production hierarchy above Engine core.
"""
from __future__ import annotations

import json
from collections import Counter
from copy import deepcopy
from pathlib import Path

import forecast_engine_v18_5_correctness as raw_engine
from sealed_replay_v19_2_correctness import corrected_reconstructed
from sealed_replay_v19_2_reconstructed import load_support, enrich_tag

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "engine_scores.json"
if not SOURCE.exists():
    SOURCE = ROOT / "deploy" / "engine_scores.json"
OUT = ROOT / "engine_scores_v19_2_candidate.json"
REPORT = ROOT / "ENGINE_V19_2_CANDIDATE_IMPACT.json"


def main() -> int:
    source_doc = json.loads(SOURCE.read_text(encoding="utf-8"))
    source_scores = source_doc.get("scores", {})
    tithi_prior, nak_prior, calendar_tags = load_support()

    out_scores = {}
    changed = []
    delta_counts = Counter()
    source_counts = Counter()
    embedded_override_rows = []

    for ds, snap in sorted(source_scores.items()):
        if not isinstance(snap, dict) or "eng" not in snap or "kp" not in snap:
            continue
        try:
            frozen_eng = int(snap["eng"])
            kp = float(snap["kp"])
        except (TypeError, ValueError):
            continue

        original_tag = snap.get("tag") or ""
        raw = int(raw_engine.score_day(original_tag, kp, tithi=snap.get("cal_tithi")))
        overlay_tag = enrich_tag(ds, original_tag, calendar_tags)
        candidate, source, debug = corrected_reconstructed(
            raw,
            overlay_tag,
            kp,
            snap.get("cal_tithi"),
            snap.get("cal_nakshatra"),
            snap.get("cal_symbols", []),
            tithi_prior,
            nak_prior,
        )
        candidate = int(candidate)
        entry = deepcopy(snap)
        entry["eng"] = candidate
        entry["_candidate"] = {
            "schema": "v19.2-reconstructed-correctness-v1",
            "historical_v19_2_source_recovered": False,
            "frozen_eng": frozen_eng,
            "raw_v18_5_corrected": raw,
            "overlay_source": source,
            "overlay_tag": overlay_tag,
            "canonical_tokens": debug["tokens"],
            "positive_strength": debug["positive_strength"],
            "bolt_rescued": debug["bolt_rescued"],
            "structural_blockers": debug["structural_blockers"],
        }
        if "fixed_2026_04_29" in snap:
            entry["_candidate"]["legacy_embedded_override"] = snap["fixed_2026_04_29"]
            embedded_override_rows.append(ds)

        out_scores[ds] = entry
        source_counts[source] += 1
        delta = candidate - frozen_eng
        delta_counts[delta] += 1
        if candidate != frozen_eng:
            changed.append({
                "date": ds,
                "frozen_eng": frozen_eng,
                "raw_v18_5_corrected": raw,
                "candidate_eng": candidate,
                "delta": delta,
                "tag": original_tag,
                "overlay_tag": overlay_tag,
                "overlay_source": source,
                "bolt_rescued": debug["bolt_rescued"],
                "legacy_embedded_override": snap.get("fixed_2026_04_29"),
            })

    out_doc = {
        "_meta": {
            "schema": "engine_scores_v19_2_reconstructed_correctness_candidate_v1",
            "created_for": "branch-only correctness/release audit",
            "production": False,
            "historical_v19_2_source_recovered": False,
            "source": str(SOURCE.relative_to(ROOT)),
            "pipeline": "canonical aliases -> recovered v18.5 -> reconstructed v19.2 precedence -> bolt correctness",
            "expert_overrides_folded_into_eng": False,
            "warning": "DO NOT replace production engine_scores.json without hierarchy impact review and new freeze decision",
        },
        "scores": out_scores,
    }
    OUT.write_text(json.dumps(out_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {
        "schema": "engine_v19_2_candidate_impact_v1",
        "source_rows": len(source_scores),
        "candidate_rows": len(out_scores),
        "changed_vs_frozen_rows": len(changed),
        "unchanged_vs_frozen_rows": len(out_scores) - len(changed),
        "delta_counts": {str(k): v for k, v in sorted(delta_counts.items())},
        "overlay_source_counts": dict(source_counts),
        "embedded_legacy_override_rows": embedded_override_rows,
        "changed_rows": changed,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 CANDIDATE GENERATION ===")
    print(f"rows={len(out_scores)}")
    print(f"changed_vs_frozen_rows={len(changed)}")
    print("delta_counts=" + json.dumps(report["delta_counts"], sort_keys=True))
    print("overlay_source_counts=" + json.dumps(report["overlay_source_counts"], sort_keys=True))
    print("embedded_legacy_override_rows=" + json.dumps(embedded_override_rows))
    for row in changed[:120]:
        print(json.dumps(row, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
