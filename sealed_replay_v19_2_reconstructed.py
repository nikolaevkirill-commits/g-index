#!/usr/bin/env python3
"""Sealed no-tuning replay for the reconstructed v19.2 candidate.

This script deliberately works from frozen `engine_scores.json` snapshots instead
of re-running v18.5. Each snapshot already contains the canonical v18.5 `eng`,
tag, Kp and astronomical context. That removes implementation drift while the
byte-identical recovered v17/v18.5 sources are being committed separately.

The v19.2 precedence policy was fixed before these metrics were run:
  * evaluate preserved v19.1 specific rules from raw v18.5;
  * if a v19.1 rule changes raw, v19.1 wins;
  * otherwise apply preserved generic v18.8 read-time patches;
  * clip to [-3,+3].

This is a reconstructed candidate, NOT recovered historical v19.2 source.
"""
from __future__ import annotations

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


def clip(v: int) -> int:
    return max(-3, min(3, int(v)))


def cls3(v: int) -> int:
    return -1 if v < 0 else (1 if v > 0 else 0)


def parse_v17(s: str) -> dict:
    s = s or ""
    sl = s.lower()
    return {
        "heart": "❤" in s,
        "plane": "✈" in s or "подорож" in sl,
        "plus": "⊕" in s,
        "bolt": "⚡" in s or "порожні руки" in sl,
        "med": "💊" in s or "лікування" in sl,
        "study": "📚" in s or "навчання" in sl,
        "diamond": "💎" in s or ("ромб" in sl and "екадаші" not in sl),
        "luck": "🟢" in s or "удача" in sl,
        "advert": "📢" in s or "реклама" in sl,
        "hand": "🖐" in s or ("рука" in sl and "порожні" not in sl),
        "star": "⭐" in s or "акшая" in sl,
        "navaratri": "наваратрі" in sl,
        "dipavali": any(x in sl for x in ("діпавалі", "дівалі", "diwali", "deepavali", "діпаваліі")),
        "maha_shiv": "маха ш" in sl or "шиваратрі" in sl,
        "ekadashi": "екадаші" in sl,
        "amavasya": "амавасья" in sl or "🌑" in s,
        "purnima": "повний місяць" in sl or "повня" in sl or "🌕" in s,
        "eclipse": "затемнення" in sl,
        "retro_end": "ретро_end" in sl or "retro_end" in sl,
        "retro": ("ретро" in sl or "retro" in sl) and "end" not in sl,
        "ganesh": "ганеш" in sl,
        "new_clothes": "нова одежда" in sl,
        "goal": "🎯" in s or "ціль" in sl,
        "scissors": "✂" in s or "стрижка" in sl,
    }


def load_support():
    pri_path = first_existing("deploy/panchanga_sign_priors.json", "panchanga_sign_priors.json")
    cal_path = first_existing("deploy/calendar_tags_2025_2026.json", "calendar_tags_2025_2026.json")
    pri = json.loads(pri_path.read_text(encoding="utf-8"))
    cal = json.loads(cal_path.read_text(encoding="utf-8"))
    tithi = {int(k): int(v) for k, v in pri.get("tithi", {}).items()}
    nak = {int(k): int(v) for k, v in pri.get("nakshatra_num", {}).items()}
    return tithi, nak, cal.get("tags", {})


def enrich_tag(ds: str, tag: str, calendar_tags: dict) -> str:
    tag = tag or ""
    if not tag and ds in calendar_tags:
        return str(calendar_tags[ds])
    return tag


def v19_1_specific(raw: int, tag: str, kp: float, tithi_n, nak_n, tithi_prior, nak_prior) -> int:
    """Preserved v19.1 execution order applied to frozen v18.5 raw."""
    if raw == 0:
        prior = None
        if nak_n is not None and int(nak_n) in nak_prior:
            prior = nak_prior[int(nak_n)]
        elif tithi_n is not None and int(tithi_n) in tithi_prior:
            prior = tithi_prior[int(tithi_n)]
        if prior is not None:
            return clip(prior)

    t = parse_v17(tag)

    # P-v19-3 med solo. Preserved source executes this when base != -3.
    if raw != -3:
        blocking = [
            "heart", "plane", "plus", "diamond", "star", "navaratri", "dipavali",
            "advert", "study", "hand", "new_clothes", "goal", "scissors", "ganesh",
            "bolt", "amavasya", "ekadashi", "purnima", "eclipse",
        ]
        if raw == 0 and t["med"] and kp < 5 and not any(t.get(k) for k in blocking):
            return 1
        return clip(raw)

    # P-v19-1 explicit bolt/action rescue from raw == -3.
    if (t["bolt"] and kp <= 2.0
            and not t["amavasya"] and not t["purnima"]
            and not t["ekadashi"] and not t["ganesh"]
            and not t["retro"] and not t["eclipse"]):
        if t["plane"] or (t["plus"] and t["scissors"]):
            return 2
    return clip(raw)


def v18_8_generic(raw: int, tag: str, kp: float, cal_tithi, cal_symbols) -> int:
    """Exact preserved July dashboard v18.8 read-time patch semantics."""
    patched = int(raw)
    syms = list(cal_symbols or [])

    if "✈" in tag:
        if "Подорожі" in tag:
            patched = max(patched, 2)
        else:
            patched += 1

    try:
        ti = int(cal_tithi) if cal_tithi is not None else None
    except (TypeError, ValueError):
        ti = None
    if ti in (10, 25) and "bolt" not in syms and "amavasya" not in syms:
        patched += 1

    if not tag.strip() and "saturn_retro" in syms and kp >= 4:
        patched = -3

    if not tag.strip() and int(raw) == 2 and not ("saturn_retro" in syms and kp >= 4):
        patched = 1

    return clip(patched)


def reconstructed(raw: int, tag: str, kp: float, cal_tithi, cal_nakshatra,
                  cal_symbols, tithi_prior, nak_prior) -> tuple[int, str]:
    v191 = v19_1_specific(raw, tag, kp, cal_tithi, cal_nakshatra, tithi_prior, nak_prior)
    if v191 != raw:
        return clip(v191), "v19.1_specific"
    return v18_8_generic(raw, tag, kp, cal_tithi, cal_symbols), "v18.8_generic_or_raw"


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
    from engine_correctness import parse_tag_tokens

    scores_path = first_existing("engine_scores.json", "deploy/engine_scores.json")
    gt_path = first_existing("deploy/pdf48_ground_truth_v6.json", "pdf48_ground_truth_v6.json")
    scores_doc = json.loads(scores_path.read_text(encoding="utf-8"))
    gt_doc = json.loads(gt_path.read_text(encoding="utf-8"))
    scores = scores_doc.get("scores", {})
    gt = gt_doc.get("data", {})
    tithi_prior, nak_prior, calendar_tags = load_support()

    rows = []
    for ds in sorted(set(scores) & set(gt)):
        snap = scores[ds]
        truth = gt[ds]
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
        cand, source = reconstructed(
            raw, tag, kp,
            snap.get("cal_tithi"), snap.get("cal_nakshatra"), snap.get("cal_symbols", []),
            tithi_prior, nak_prior,
        )
        tokens = parse_tag_tokens(tag)
        rows.append({
            "date": ds,
            "tag": tag,
            "original_tag": original_tag,
            "kp": kp,
            "gt": gt_score,
            "baseline": raw,
            "candidate": cand,
            "source": source,
            "n_tags": len(tokens),
            "tokens": tokens,
        })

    if not rows:
        raise RuntimeError("reconstructed v19.2 replay has zero comparable rows")

    buckets = {
        "n_tags=0": [r for r in rows if r["n_tags"] == 0],
        "n_tags=1": [r for r in rows if r["n_tags"] == 1],
        "n_tags=2+": [r for r in rows if r["n_tags"] >= 2],
    }
    changed = [r for r in rows if r["baseline"] != r["candidate"]]
    result = {
        "schema": "engine_v19_2_reconstructed_sealed_replay_v1",
        "policy": {
            "tuning": False,
            "historical_source_recovered": False,
            "baseline": "frozen engine_scores.json eng (v18.5 canonical)",
            "candidate": "v19.2-reconstructed: v19.1-specific precedence else v18.8-generic",
            "precedence_fixed_before_metrics": True,
            "inputs": str(scores_path.relative_to(ROOT)),
            "ground_truth": str(gt_path.relative_to(ROOT)),
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
            "v19_1_specific_rows": sum(r["source"] == "v19.1_specific" for r in rows),
            "calendar_enriched_rows": sum(r["tag"] != r["original_tag"] for r in rows),
        },
        "changed_rows": changed,
    }

    out = ROOT / "ENGINE_V19_2_RECONSTRUCTED_SEALED_REPLAY.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== V19.2 RECONSTRUCTED SEALED REPLAY ===")
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
