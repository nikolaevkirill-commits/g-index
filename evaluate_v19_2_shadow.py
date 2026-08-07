#!/usr/bin/env python3
"""Evaluate frozen v19.2 shadow observations without model tuning or promotion.

Expert/PDF labels and real outcomes are evaluated as separate evidence streams.
The evaluator is descriptive only: it never changes the freeze, candidate,
production files, thresholds, rules, or promotion state.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREEZE = ROOT / "V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json"
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


def enrich(obs: dict, cohort: dict[str, dict]) -> dict:
    frozen = cohort[obs["date"]]
    return {
        **obs,
        "baseline": frozen["production_baseline"],
        "candidate": frozen["v19_2_candidate"],
        "rule": frozen["rule"],
        "family": frozen.get("family"),
        "frozen_sign_flip": frozen.get("sign_flip", False),
    }


def summarize_stream(rows: list[dict]) -> dict:
    by_rule: dict[str, list[dict]] = defaultdict(list)
    by_family: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_rule[r.get("rule") or "unknown"].append(r)
        by_family[r.get("family") or "unknown"].append(r)
    sign_flip_rows = [r for r in rows if r.get("frozen_sign_flip")]
    return {
        "observed_rows": len(rows),
        "baseline": metrics(rows, "baseline"),
        "candidate": metrics(rows, "candidate"),
        "frozen_sign_flip_subset": {
            "baseline": metrics(sign_flip_rows, "baseline"),
            "candidate": metrics(sign_flip_rows, "candidate"),
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
    cohort = {r["date"]: r for r in freeze.get("rows", [])}
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
        streams[obs["kind"]].append(enrich(obs, cohort))

    paired_dates = sorted(
        set(r["date"] for r in streams["expert_pdf"])
        & set(r["date"] for r in streams["real_outcome"])
    )
    report = {
        "schema": "v19_2_prospective_shadow_evaluation_v1",
        "state": "FROZEN_PROSPECTIVE_SHADOW",
        "production_formula_changed": False,
        "promotion_allowed": False,
        "policy": {
            "descriptive_only": True,
            "tuning": False,
            "expert_pdf_is_not_real_outcome": True,
            "streams_never_pooled": True,
            "automatic_promotion": False,
        },
        "cohort_rows": len(cohort),
        "frozen_sign_flip_rows": sum(bool(r.get("sign_flip")) for r in cohort.values()),
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
    for kind in ("expert_pdf", "real_outcome"):
        s = report["streams"][kind]
        print(f"{kind}: observed_rows={s['observed_rows']}")
        print(f"  baseline={s['baseline']}")
        print(f"  candidate={s['candidate']}")
    print("promotion_allowed=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
