#!/usr/bin/env python3
"""Build one honest scorecard from the existing G-Index audit artifacts.

This report deliberately keeps three targets separate:
expert-PDF agreement, historical Engine holdout, and real-world outcomes.
It does not alter any production score or coefficient.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "outputs" / "data_control"


def read_json(relative: str) -> dict:
    path = ROOT / relative
    if not path.exists():
        return {"_missing": relative}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def rate(value) -> str:
    if value is None:
        return "—"
    return f"{value * 100:.2f}%"


def main() -> None:
    holdout = read_json("holdout_v2_report.json")
    auto = read_json("AUTO_PROSPECTIVE_STATUS_v1.json")
    outcomes = read_json("OUTCOME_LEDGER_STATUS_v1.json")
    tanita = read_json("TANITA_2Y_PROMOTION_GATE_v1.json")
    tanita_outcomes = read_json("outputs/data_control/TANITA_REAL_OUTCOME_PAIR_STATUS_v1.json")
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    h = holdout.get("metrics", {}).get("holdout", {})
    a = auto.get("all_scored", {})
    r = outcomes.get("real_outcomes", {})
    g = tanita.get("gates", {})

    summary = {
        "schema": "gindex_unified_scorecard_v1",
        "generated_at_utc": now,
        "rule": "Do not pool these metrics: they have different targets and evidence.",
        "expert_pdf_agreement": {
            "target": "frozen expert PDF label; agreement/reproduction only",
            "n": a.get("exact", {}).get("n"),
            "exact": a.get("exact", {}).get("rate"),
            "within_1": a.get("within1", {}).get("rate"),
            "strict_sign": a.get("strict_sign", {}).get("rate"),
        },
        "historical_engine_holdout": {
            "target": "expert/PDF labels on chronological holdout; not real-world outcome",
            "n": h.get("n"),
            "exact": h.get("exact_match_pct", 0) / 100 if h else None,
            "within_1": h.get("directional_match_pct", 0) / 100 if h else None,
            "strict_sign": h.get("sign_match_strict_pct", 0) / 100 if h else None,
            "mae": h.get("mae"),
        },
        "real_world_outcomes": {
            "target": "independent Chrono/Telegram result paired with a frozen prior prediction",
            "available_unique_dates": r.get("unique_dates"),
            "paired_with_frozen_prediction": r.get("paired_with_frozen_prediction"),
            "required_for_formal_test": r.get("required_for_formal_test"),
            "required_for_promotion_gate": r.get("required_for_promotion_gate"),
            "formal_test_ready": r.get("formal_test_ready"),
        },
        "tanita_promotion": {
            "production_score_effect": tanita.get("score_effect"),
            "allowed": tanita.get("promotion", {}).get("allowed"),
            "blockers": tanita.get("blocking_reasons", []),
            "chronological_holdout_gain": g.get("tanita_improves_chronological_holdout"),
        },
        "tanita_real_world_outcomes": {
            "target": "independent real outcome paired by date with an immutable Tanita snapshot",
            "snapshot_records": tanita_outcomes.get("snapshot_records", 0),
            "elapsed_snapshot_dates": tanita_outcomes.get("elapsed_snapshot_dates", 0),
            "paired_independent_outcomes": tanita_outcomes.get("paired_independent_outcomes", 0),
            "awaiting_independent_outcomes": tanita_outcomes.get("awaiting_independent_outcomes", 0),
            "tanita_shadow": tanita_outcomes.get("tanita_shadow", {}),
            "baseline_frozen": tanita_outcomes.get("baseline_frozen", {}),
            "promotion_gate": tanita_outcomes.get("promotion_gate", {}),
            "score_effect": 0,
        },
        "next_action": "Freeze a daily snapshot before the day starts and pair it with one independently defined outcome; do not change weights before the pre-registered gate passes.",
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "UNIFIED_SCORECARD_v1.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        "# Єдиний scorecard G-Index",
        "",
        f"Згенеровано: `{now}`.",
        "",
        "Це не один відсоток: нижче три різні цілі, які не можна змішувати.",
        "",
        "| Що перевіряємо | N | Exact | ±1 / directional | Знак | Статус |",
        "|---|---:|---:|---:|---:|---|",
        f"| Відтворення frozen PDF | {summary['expert_pdf_agreement']['n'] or '—'} | {rate(summary['expert_pdf_agreement']['exact'])} | {rate(summary['expert_pdf_agreement']['within_1'])} | {rate(summary['expert_pdf_agreement']['strict_sign'])} | не є фактичним прогнозом |",
        f"| Chronological Engine holdout | {summary['historical_engine_holdout']['n'] or '—'} | {rate(summary['historical_engine_holdout']['exact'])} | {rate(summary['historical_engine_holdout']['within_1'])} | {rate(summary['historical_engine_holdout']['strict_sign'])} | історична перевірка проти expert/PDF |",
        f"| Реальний outcome | {summary['real_world_outcomes']['paired_with_frozen_prediction'] or 0} | — | — | — | ще немає зв'язаних frozen-прогнозів |",
        "",
        "## Висновок",
        "",
        "- Таніта не має підтвердженого приросту на хронологічному holdout; `score_effect = 0` лишається правильним.",
        "- Космічні safety-сигнали та BGS/ENLIL лишаються advisory: вони не підміняють денний вердикт.",
        "- Перший дозволений шлях до справжнього покращення — prospective snapshots + незалежні outcomes, а не підбір ваг за минулими PDF.",
        "",
        "## Автоматичний gate",
        "",
        f"Потрібно {summary['real_world_outcomes']['required_for_formal_test']} пар із frozen-прогнозом для формального тесту та {summary['real_world_outcomes']['required_for_promotion_gate']} для promotion. Зараз пар: {summary['real_world_outcomes']['paired_with_frozen_prediction'] or 0}.",
        "",
        "Жодна нова ознака не переходить у production, доки не має наперед зареєстрованого правила та незалежного позитивного результату.",
    ]
    t = summary["tanita_real_world_outcomes"]
    lines.extend([
        "",
        "## Tanita vs independent outcomes",
        "",
        f"- Frozen snapshots: {t['snapshot_records']}.",
        f"- Fully elapsed dates: {t['elapsed_snapshot_dates']}.",
        f"- Paired independent outcomes: {t['paired_independent_outcomes']}.",
        f"- Awaiting independent outcomes: {t['awaiting_independent_outcomes']}.",
        "- Production score effect: 0 until the pre-registered promotion gate passes.",
    ])
    (OUT_DIR / "UNIFIED_SCORECARD_v1.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("UNIFIED SCORECARD OK")


if __name__ == "__main__":
    main()
