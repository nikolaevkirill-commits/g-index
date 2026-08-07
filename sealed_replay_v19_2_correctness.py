#!/usr/bin/env python3
"""No-tuning correctness replay on top of reconstructed v19.2.

Baseline: v19.2-reconstructed from sealed_replay_v19_2_reconstructed.py.
Candidate: same fixed precedence, but v19 overlay tag decisions use the shared
canonical alias parser and a frozen v17-weight aggregate bolt rescue.

This replay cannot measure full raw-Engine alias impact because frozen
engine_scores.json already contains precomputed v18.5 raw scores. Alias parity
is therefore tested deterministically elsewhere; this replay measures only
changes reachable in the v19 overlay plus the bolt correctness rule.
"""
from __future__ import annotations

import json
from pathlib import Path

from engine_correctness import parse_tag_tokens, normalize_tag_text
from sealed_replay_v19_2_reconstructed import (
    ROOT, first_existing, clip, cls3, load_support, enrich_tag,
    reconstructed as baseline_reconstructed,
    metrics,
)

# Frozen v17 positive weights relevant to the shared canonical token contract.
# Source: recovered forecast_engine_v17_0.py. No GT/PDF fitting.
V17_POSITIVE_WEIGHTS = {
    "heart": 2.5,
    "plane": 1.0,
    "plus": 1.0,
    "diamond": 1.5,
    "star": 2.5,
    "advert": 1.2,
    "study": 0.5,
    "hand": 0.8,
    "scissors": 0.5,
    "goal": 0.5,
    "navaratri": 1.5,
    "maha_shiv": 0.8,
    "new_clothes": 0.3,
    "luck": 0.3,
    "new_year": 0.2,
}
V17_HEART_EQUIVALENT = 2.5
V17_BOLT_GENERIC_PENALTY = 2.0

# Explicit structural contexts in recovered v17/v19.1 stay authoritative.
BOLT_STRUCTURAL_BLOCKERS = {
    "trident", "amavasya", "purnima", "ekadashi", "eclipse", "surya",
    "retro_end", "ganesh", "navaratri", "med",
}


def positive_strength(tokens) -> float:
    return round(sum(V17_POSITIVE_WEIGHTS.get(t, 0.0) for t in set(tokens)), 10)


def corrected_v19_1(raw: int, tag: str, kp: float, tithi_n, nak_n,
                     tithi_prior, nak_prior) -> int:
    """Preserve v19.1 order while resolving tags via the shared alias contract."""
    tokens = set(parse_tag_tokens(tag))

    if raw == 0:
        prior = None
        if nak_n is not None and int(nak_n) in nak_prior:
            prior = nak_prior[int(nak_n)]
        elif tithi_n is not None and int(tithi_n) in tithi_prior:
            prior = tithi_prior[int(tithi_n)]
        if prior is not None:
            return clip(prior)

    if raw != -3:
        blocking = {
            "heart", "plane", "plus", "diamond", "star", "navaratri",
            "advert", "study", "hand", "new_clothes", "goal", "scissors",
            "ganesh", "bolt", "amavasya", "ekadashi", "purnima", "eclipse",
        }
        if raw == 0 and "med" in tokens and kp < 5 and not (tokens & blocking):
            return 1
        return clip(raw)

    if ("bolt" in tokens and kp <= 2.0
            and not ({"amavasya", "purnima", "ekadashi", "ganesh", "retro", "eclipse"} & tokens)):
        if "plane" in tokens or ({"plus", "scissors"} <= tokens):
            return 2
    return clip(raw)


def corrected_v18_8(raw: int, tag: str, kp: float, cal_tithi, cal_symbols) -> int:
    """Preserve v18.8 math; replace emoji-only P2 detection by canonical plane token."""
    patched = int(raw)
    syms = list(cal_symbols or [])
    tokens = set(parse_tag_tokens(tag))
    normalized = normalize_tag_text(tag)

    if "plane" in tokens:
        if "подорожі" in normalized:
            patched = max(patched, 2)
        else:
            patched += 1

    try:
        ti = int(cal_tithi) if cal_tithi is not None else None
    except (TypeError, ValueError):
        ti = None
    if ti in (10, 25) and "bolt" not in syms and "amavasya" not in syms:
        patched += 1

    if not str(tag or "").strip() and "saturn_retro" in syms and kp >= 4:
        patched = -3
    if (not str(tag or "").strip() and int(raw) == 2
            and not ("saturn_retro" in syms and kp >= 4)):
        patched = 1
    return clip(patched)


def corrected_reconstructed(raw: int, tag: str, kp: float, cal_tithi, cal_nakshatra,
                            cal_symbols, tithi_prior, nak_prior):
    v191 = corrected_v19_1(raw, tag, kp, cal_tithi, cal_nakshatra, tithi_prior, nak_prior)
    if v191 != raw:
        score = clip(v191)
        source = "v19.1_specific"
    else:
        score = corrected_v18_8(raw, tag, kp, cal_tithi, cal_symbols)
        source = "v18.8_generic_or_raw"

    tokens = set(parse_tag_tokens(tag))
    strength = positive_strength(tokens)
    structural = sorted(tokens & BOLT_STRUCTURAL_BLOCKERS)
    rescued = False

    # Frozen before replay metrics: neutralize only the generic v17 bolt penalty.
    # Do not alter already non-negative / mild (-1) explicit outcomes.
    if ("bolt" in tokens and score <= -2
            and strength >= V17_HEART_EQUIVALENT
            and not structural):
        score = clip(score + int(V17_BOLT_GENERIC_PENALTY))
        rescued = True

    return score, source, {
        "tokens": sorted(tokens),
        "positive_strength": strength,
        "bolt_rescued": rescued,
        "structural_blockers": structural,
    }


def pct(x):
    return "—" if x is None else f"{100*x:.1f}%"


def main() -> int:
    scores_path = first_existing("engine_scores.json", "deploy/engine_scores.json")
    gt_path = first_existing("deploy/pdf48_ground_truth_v6.json", "pdf48_ground_truth_v6.json")
    scores = json.loads(scores_path.read_text(encoding="utf-8")).get("scores", {})
    gt = json.loads(gt_path.read_text(encoding="utf-8")).get("data", {})
    tithi_prior, nak_prior, calendar_tags = load_support()

    rows = []
    for ds in sorted(set(scores) & set(gt)):
        snap, truth = scores[ds], gt[ds]
        if not isinstance(snap, dict) or not isinstance(truth, dict):
            continue
        if "eng" not in snap or "kp" not in snap or "score" not in truth:
            continue
        try:
            raw = int(snap["eng"])
            kp = float(snap["kp"])
            gt_score = int(truth["score"])
        except (TypeError, ValueError):
            continue

        original_tag = snap.get("tag") or ""
        tag = enrich_tag(ds, original_tag, calendar_tags)
        baseline, _ = baseline_reconstructed(
            raw, tag, kp, snap.get("cal_tithi"), snap.get("cal_nakshatra"),
            snap.get("cal_symbols", []), tithi_prior, nak_prior,
        )
        candidate, source, dbg = corrected_reconstructed(
            raw, tag, kp, snap.get("cal_tithi"), snap.get("cal_nakshatra"),
            snap.get("cal_symbols", []), tithi_prior, nak_prior,
        )
        rows.append({
            "date": ds,
            "tag": tag,
            "original_tag": original_tag,
            "kp": kp,
            "gt": gt_score,
            "baseline": baseline,
            "candidate": candidate,
            "source": source,
            "n_tags": len(dbg["tokens"]),
            **dbg,
        })

    if not rows:
        raise RuntimeError("v19.2 correctness replay has zero comparable rows")

    buckets = {
        "n_tags=0": [r for r in rows if r["n_tags"] == 0],
        "n_tags=1": [r for r in rows if r["n_tags"] == 1],
        "n_tags=2+": [r for r in rows if r["n_tags"] >= 2],
    }
    changed = [r for r in rows if r["baseline"] != r["candidate"]]
    result = {
        "schema": "engine_v19_2_correctness_sealed_replay_v1",
        "policy": {
            "tuning": False,
            "historical_source_recovered": False,
            "precedence_fixed_before_metrics": True,
            "correctness_policy_fixed_before_metrics": True,
            "bolt_threshold": V17_HEART_EQUIVALENT,
            "bolt_rescue": V17_BOLT_GENERIC_PENALTY,
            "bolt_structural_blockers": sorted(BOLT_STRUCTURAL_BLOCKERS),
            "alias_contract": "engine_tag_aliases_v1.json",
            "alias_raw_engine_limitation": "frozen raw v18.5 cannot be recomputed in this snapshot replay",
        },
        "overall": {
            "baseline": metrics(rows, "baseline"),
            "candidate": metrics(rows, "candidate"),
        },
        "by_tag_count": {
            name: {"baseline": metrics(rs, "baseline"), "candidate": metrics(rs, "candidate")}
            for name, rs in buckets.items()
        },
        "diagnostics": {
            "comparable_rows": len(rows),
            "prediction_changed_rows": len(changed),
            "bolt_rescue_rows": sum(r["bolt_rescued"] for r in rows),
            "calendar_enriched_rows": sum(r["tag"] != r["original_tag"] for r in rows),
            "changed_rows_with_bolt_rescue": sum(r["bolt_rescued"] and r["baseline"] != r["candidate"] for r in rows),
        },
        "changed_rows": changed,
    }

    out = ROOT / "ENGINE_V19_2_CORRECTNESS_SEALED_REPLAY.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 CORRECTNESS SEALED REPLAY ===")
    for variant in ("baseline", "candidate"):
        m = result["overall"][variant]
        print(f"{variant:9s} n={m['n']} exact={pct(m['exact'])} ±1={pct(m['within1'])} strict3={pct(m['strict3'])}")
    print("=== BY TAG COUNT ===")
    for name, pair in result["by_tag_count"].items():
        b, c = pair["baseline"], pair["candidate"]
        print(f"{name}: n={b['n']} | base {pct(b['exact'])}/{pct(b['within1'])}/{pct(b['strict3'])} | cand {pct(c['exact'])}/{pct(c['within1'])}/{pct(c['strict3'])}")
    print("=== DIAGNOSTICS ===")
    for k, v in result["diagnostics"].items():
        print(f"{k}={v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
