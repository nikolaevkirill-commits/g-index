#!/usr/bin/env python3
"""Sealed replay for post-freeze Engine correctness candidate.

No tuning is performed.  The script compares the unchanged historical v15.1
implementation with the correctness candidate on the same frozen input rows and
the same verified PDF ground truth.  It reports Exact 7-class, ±1, strict
3-class/sign, and the same metrics by canonical parsed-tag-count bucket.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent


def first_existing(*paths: str) -> Path:
    for p in paths:
        q = ROOT / p
        if q.exists():
            return q
    raise FileNotFoundError(paths)


def load_isolated_frozen():
    path = ROOT / "forecast_engine_v15_1_frozen.py"
    spec = importlib.util.spec_from_file_location("forecast_engine_v15_1_replay_frozen", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load frozen v15.1")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def cls3(v: int) -> int:
    return -1 if v < 0 else (1 if v > 0 else 0)


def metrics(rows: Iterable[dict], key: str) -> dict:
    rows = list(rows)
    n = len(rows)
    if not n:
        return {"n": 0, "exact": None, "within1": None, "strict3": None}
    return {
        "n": n,
        "exact": sum(r[key] == r["gt"] for r in rows) / n,
        "within1": sum(abs(r[key] - r["gt"]) <= 1 for r in rows) / n,
        "strict3": sum(cls3(r[key]) == cls3(r["gt"]) for r in rows) / n,
    }


def pct(x):
    return "—" if x is None else f"{100*x:.1f}%"


def main() -> int:
    frozen = load_isolated_frozen()
    import forecast_engine_v15_1 as candidate

    scores_path = first_existing("engine_scores.json", "deploy/engine_scores.json")
    gt_path = first_existing("deploy/pdf48_ground_truth_v6.json", "pdf48_ground_truth_v6.json")
    scores_doc = json.loads(scores_path.read_text(encoding="utf-8"))
    gt_doc = json.loads(gt_path.read_text(encoding="utf-8"))
    scores = scores_doc.get("scores", {})
    gt = gt_doc.get("data", {})

    rows = []
    for ds in sorted(set(scores) & set(gt)):
        snap = scores[ds]
        if not isinstance(snap, dict) or not isinstance(gt[ds], dict):
            continue
        if "tag" not in snap or "kp" not in snap or "score" not in gt[ds]:
            continue
        tag = snap.get("tag") or ""
        kp = snap.get("kp")
        sn = snap.get("sn", 0) or 0
        try:
            base_pred = int(frozen.score_day(tag, kp, sn=sn))
            cand_pred = int(candidate.score_day(tag, kp, sn=sn))
            gt_score = int(gt[ds]["score"])
        except Exception as exc:
            print(f"SKIP {ds}: {exc}")
            continue

        debug = candidate.correctness_debug(tag, float(kp))
        tokens = list(debug["parsed_tokens"])
        try:
            base_tokens = sorted(t.name for t in frozen.parse_tags(tag))
        except Exception:
            base_tokens = []
        rows.append({
            "date": ds,
            "tag": tag,
            "kp": kp,
            "gt": gt_score,
            "baseline": base_pred,
            "candidate": cand_pred,
            "n_tags": len(tokens),
            "tokens": tokens,
            "base_tokens": base_tokens,
            "alias_changed": sorted(x.lower() for x in base_tokens) != sorted(tokens),
            "bolt_rescued": bool(debug["bolt"]["rescued"]),
        })

    if not rows:
        raise RuntimeError("sealed replay has zero comparable rows")

    buckets = {
        "n_tags=0": [r for r in rows if r["n_tags"] == 0],
        "n_tags=1": [r for r in rows if r["n_tags"] == 1],
        "n_tags=2+": [r for r in rows if r["n_tags"] >= 2],
    }
    result = {
        "schema": "engine_correctness_sealed_replay_v1",
        "policy": {
            "tuning": False,
            "inputs": str(scores_path.relative_to(ROOT)),
            "ground_truth": str(gt_path.relative_to(ROOT)),
            "baseline": "forecast_engine_v15_1_frozen.py",
            "candidate": "forecast_engine_v15_1.py correctness adapter",
            "bucket_definition": "canonical parsed tag count: 0 / 1 / 2+",
        },
        "overall": {
            "baseline": metrics(rows, "baseline"),
            "candidate": metrics(rows, "candidate"),
        },
        "by_tag_count": {
            name: {
                "baseline": metrics(rs, "baseline"),
                "candidate": metrics(rs, "candidate"),
            }
            for name, rs in buckets.items()
        },
        "diagnostics": {
            "comparable_rows": len(rows),
            "prediction_changed_rows": sum(r["baseline"] != r["candidate"] for r in rows),
            "alias_changed_rows": sum(r["alias_changed"] for r in rows),
            "bolt_rescue_rows": sum(r["bolt_rescued"] for r in rows),
        },
        "changed_rows": [r for r in rows if r["baseline"] != r["candidate"]],
    }

    out = ROOT / "ENGINE_CORRECTNESS_SEALED_REPLAY.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== SEALED REPLAY ===")
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
    print(f"report={out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
