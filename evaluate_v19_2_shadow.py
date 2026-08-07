#!/usr/bin/env python3
"""Evaluate frozen v19.2 shadow observations without model tuning or promotion.

Expert/PDF labels and real outcomes are evaluated as separate evidence streams.
The original frozen cohort remains immutable. A pre-observation context-validity
amendment quarantines three Panchanga-input-invalid sign-flip rows from the
confirmatory promotion endpoint while retaining them descriptively.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREEZE = ROOT / "V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json"
AMENDMENT = ROOT / "V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json"
LEDGER = ROOT / "V19_2_PROSPECTIVE_SHADOW_OBSERVATIONS_v1.json"
OUT = ROOT / "V19_2_PROSPECTIVE_SHADOW_EVALUATION_v1.json"


def sign(v: int) -> int:
    return 1 if v > 0 else -1 if v < 0 else 0


def metrics(rows: list[dict], pred_key: str) -> dict:
    n = len(rows)
    if not n:
        return {"n": 0, "exact": None, "within1": None, "sign": None}
    return {
        "n": n,
        "exact": sum(r[pred_key] == r["value"] for r in rows) / n,
        "within1": sum(abs(r[pred_key] - r["value"]) <= 1 for r in rows) / n,
        "sign": sum(sign(r[pred_key]) == sign(r["value"]) for r in rows) / n,
    }


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def validate_observation(obs: dict, cohort: dict[str, dict]) -> None:
    ds = obs.get("date")
    if ds not in cohort:
        raise ValueError(f"observation outside frozen cohort: {ds}")
    if obs.get("kind") not in {"expert_pdf", "real_outcome"}:
        raise ValueError(f"invalid observation kind: {obs.get('kind')}")
    v = obs.get("value")
    if not isinstance(v, int) or not -3 <= v <= 3:
        raise ValueError(f"invalid observation value for {ds}: {v}")
    frozen = cohort[ds]
    if obs.get("frozen_production_baseline") != frozen.get("production_baseline"):
        raise ValueError(f"baseline mutation detected for {ds}")
    if obs.get("frozen_v19_2_candidate") != frozen.get("v19_2_candidate"):
        raise ValueError(f"candidate mutation detected for {ds}")
    if obs.get("frozen_rule") != frozen.get("rule"):
        raise ValueError(f"rule mutation detected for {ds}")


def enrich(obs: dict, cohort: dict[str, dict], context_valid: set[str], quarantined: set[str]) -> dict:
    frozen = cohort[obs["date"]]
    return {
        **obs,
        "baseline": frozen["production_baseline"],
        "candidate": frozen["v19_2_candidate"],
        "rule": frozen["rule"],
        "family": frozen.get("rule_family"),
        "frozen_sign_flip": frozen.get("sign_flip", False),
        "context_valid_confirmatory_sign_flip": obs["date"] in context_valid,
        "context_invalid_quarantined": obs["date"] in quarantined,
    }


def summarize_stream(rows: list[dict]) -> dict:
    by_rule: dict[str, list[dict]] = defaultdict(list)
    by_family: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_rule[r.get("rule") or "unknown"].append(r)
        by_family[r.get("family") or "unknown"].append(r)
    original_sign_flip_rows = [r for r in rows if r.get("frozen_sign_flip")]
    context_valid_sign_rows = [r for r in rows if r.get("context_valid_confirmatory_sign_flip")]
    quarantined_rows = [r for r in rows if r.get("context_invalid_quarantined")]
    return {
        "observed_rows": len(rows),
        "baseline": metrics(rows, "baseline"),
        "candidate": metrics(rows, "candidate"),
        "frozen_sign_flip_subset_descriptive": {
            "baseline": metrics(original_sign_flip_rows, "baseline"),
            "candidate": metrics(original_sign_flip_rows, "candidate"),
            "dates": [r["date"] for r in original_sign_flip_rows],
        },
        "context_valid_sign_flip_subset_confirmatory": {
            "baseline": metrics(context_valid_sign_rows, "baseline"),
            "candidate": metrics(context_valid_sign_rows, "candidate"),
            "dates": [r["date"] for r in context_valid_sign_rows],
        },
        "context_invalid_quarantined_descriptive": {
            "baseline": metrics(quarantined_rows, "baseline"),
            "candidate": metrics(quarantined_rows, "candidate"),
            "dates": [r["date"] for r in quarantined_rows],
        },
        "by_family": {
            k: {"baseline": metrics(v, "baseline"), "candidate": metrics(v, "candidate")}
            for k, v in sorted(by_family.items())
        },
        "by_rule": {
            k: {"baseline": metrics(v, "baseline"), "candidate": metrics(v, "candidate")}
            for k, v in sorted(by_rule.items())
        },
        "dates": [r["date"] for r in rows],
    }


def main() -> int:
    freeze = load_json(FREEZE, None)
    if not freeze:
        raise RuntimeError("freeze file missing")
    amendment = load_json(AMENDMENT, None)
    if not amendment:
        raise RuntimeError("context-validity amendment missing")
    cohort = {r["date"]: r for r in freeze.get("rows", [])}

    original_sign_dates = [r["date"] for r in freeze.get("rows", []) if r.get("sign_flip")]
    if original_sign_dates != amendment.get("original_frozen_sign_flip_dates"):
        raise RuntimeError("amendment/original frozen sign cohort mismatch")
    context_valid = set(amendment.get("confirmatory_context_valid_sign_flip_dates", []))
    quarantined = set(amendment.get("quarantined_context_invalid_dates", {}).keys())
    if context_valid & quarantined:
        raise RuntimeError("context-valid and quarantined sets overlap")
    if context_valid | quarantined != set(original_sign_dates):
        raise RuntimeError("amendment does not partition original sign-flip cohort")

    ledger = load_json(LEDGER, {"observations": []})
    observations = ledger.get("observations", [])

    seen = set()
    streams = {"expert_pdf": [], "real_outcome": []}
    for obs in observations:
        validate_observation(obs, cohort)
        key = (obs["date"], obs["kind"])
        if key in seen:
            raise ValueError(f"duplicate observation: {key}")
        seen.add(key)
        streams[obs["kind"]].append(enrich(obs, cohort, context_valid, quarantined))

    paired_dates = sorted(
        set(r["date"] for r in streams["expert_pdf"])
        & set(r["date"] for r in streams["real_outcome"])
    )
    report = {
        "schema": "v19_2_prospective_shadow_evaluation_v2_context_validity",
        "state": "FROZEN_PROSPECTIVE_SHADOW",
        "production_formula_changed": False,
        "promotion_allowed": False,
        "policy": {
            "descriptive_only": True,
            "tuning": False,
            "expert_pdf_is_not_real_outcome": True,
            "streams_never_pooled": True,
            "automatic_promotion": False,
            "original_frozen_12_retained_descriptively": True,
            "confirmatory_sign_endpoint_uses_context_valid_9": True,
            "quarantined_rows_never_count_toward_confirmatory_promotion": True,
            "amendment_created_before_first_observation": True,
        },
        "cohort_rows": len(cohort),
        "frozen_sign_flip_rows": len(original_sign_dates),
        "confirmatory_context_valid_sign_flip_rows": len(context_valid),
        "quarantined_context_invalid_sign_flip_rows": len(quarantined),
        "context_validity_amendment": AMENDMENT.name,
        "streams": {
            "expert_pdf": summarize_stream(streams["expert_pdf"]),
            "real_outcome": summarize_stream(streams["real_outcome"]),
        },
        "paired_expert_and_real_dates": paired_dates,
        "observation_kind_counts": dict(Counter(r.get("kind") for r in observations)),
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 PROSPECTIVE SHADOW EVALUATION ===")
    print(f"cohort_rows={report['cohort_rows']}")
    print(f"frozen_sign_flip_rows={report['frozen_sign_flip_rows']}")
    print(f"confirmatory_context_valid_sign_flip_rows={report['confirmatory_context_valid_sign_flip_rows']}")
    print(f"quarantined_context_invalid_sign_flip_rows={report['quarantined_context_invalid_sign_flip_rows']}")
    for kind in ("expert_pdf", "real_outcome"):
        s = report["streams"][kind]
        print(f"{kind}: observed_rows={s['observed_rows']}")
        print(f"  baseline={s['baseline']}")
        print(f"  candidate={s['candidate']}")
        print(f"  confirmatory_sign={s['context_valid_sign_flip_subset_confirmatory']}")
    print("promotion_allowed=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
