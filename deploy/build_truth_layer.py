#!/usr/bin/env python3
"""
build_truth_layer.py — єдиний truth pipeline для G-Index / PROGNOZ
Запускати ПЕРЕД кожним deploy.

Логіка:
  1. Читає engine_scores.json (frozen, не чіпати)
  2. Читає expert_overrides_v3.json (PDF annotations)
  3. Порівнює engine vs pdf per day
  4. Генерує truth_layer.json — єдине джерело для дашборду
  5. Генерує conflicts_report.md — для аудиту
  6. БЛОКУЄ deploy якщо є critical_conflict без verified_by_pdf_reading

ПРАВИЛА (архітектура):
  engine  = primary forecast (frozen, не замінювати)
  pdf     = зовнішній еталон (тільки annotation)
  final   = engine, ЯКЩО override не має verified_by_pdf_reading=True
  manual  = НІКОЛИ не production без verified_by_pdf_reading=True

Запуск:
  python build_truth_layer.py              # повний pipeline
  python build_truth_layer.py --audit      # тільки звіт, без збереження
  python build_truth_layer.py --force      # ігнорувати блокування (НЕ рекомендовано)
"""

import json, sys, os
from datetime import date, timedelta

# --- CONFIG ---
SCORES_FILE    = 'engine_scores.json'
OVERRIDES_FILE = 'expert_overrides_v3.json'
OUTPUT_TRUTH   = 'truth_layer.json'
OUTPUT_REPORT  = 'conflicts_report.md'
HORIZON_DAYS   = 30  # скільки днів вперед включати

SCORE_LABELS = {
    3:'Особливо сприятливий', 2:'Сприятливий', 1:'Помірно сприятливий',
    0:'Нейтральний', -1:'Помірно несприятливий', -2:'Несприятливий',
    -3:'Особливо несприятливий',
}

def load_data():
    scores = json.load(open(SCORES_FILE, encoding='utf-8'))['scores']
    ov_data = json.load(open(OVERRIDES_FILE, encoding='utf-8'))
    overrides = {e['date']: e for e in ov_data['overrides']}
    return scores, overrides

def resolve_day(date_str, scores, overrides):
    s = scores.get(date_str, {})
    ov = overrides.get(date_str)

    engine_score = s.get('eng')
    kp           = s.get('kp', 2.0)
    kp_synthetic = s.get('kp_synthetic', True)
    tag          = s.get('tag', '')

    pdf_score    = None
    pdf_label    = None
    pdf_source   = None
    verified     = False
    verified_by_pdf_reading = False

    if ov:
        pdf_score   = ov.get('expert_eng')
        pdf_label   = ov.get('pdf_label', '')
        pdf_source  = ov.get('source_pdf', ov.get('source', ''))
        verified    = ov.get('verified', False) is True

        # КЛЮЧОВЕ ПРАВИЛО: override застосовується ТІЛЬКИ якщо є verified_by_pdf_reading
        # АБО verified=True + source_pdf + snippet_hash (стара схема верифікації)
        import re
        hash_ok = bool(re.match(
            r'^sha256:[0-9a-f]{16,64}$',
            str(ov.get('snippet_hash', '')), re.I
        ))
        verified_by_pdf_reading = (
            ov.get('verified_by_pdf_reading', False) is True
            or (verified and bool(pdf_source) and hash_ok)
        )

    # Конфлікт — знаки різні
    conflict = None
    conflict_level = 'none'
    if engine_score is not None and pdf_score is not None:
        sign_match = (engine_score > 0) == (pdf_score > 0) or engine_score == 0 or pdf_score == 0
        delta = abs(engine_score - pdf_score)
        if not sign_match:
            conflict_level = 'critical'
            conflict = f"engine={engine_score:+d} vs pdf={pdf_score:+d} — ЗНАКИ РІЗНІ"
        elif delta >= 2:
            conflict_level = 'warning'
            conflict = f"engine={engine_score:+d} vs pdf={pdf_score:+d} — delta={delta}"

    # FINAL: engine wins unless verified override
    if verified_by_pdf_reading and pdf_score is not None:
        final = pdf_score
        source = 'pdf_verified'
    elif engine_score is not None:
        final = engine_score
        source = 'engine'
    else:
        final = 0
        source = 'fallback_zero'

    # Статус
    if conflict_level == 'critical' and not verified_by_pdf_reading:
        status = 'conflict_unverified_BLOCK'
    elif conflict_level == 'critical' and verified_by_pdf_reading:
        status = 'conflict_verified_override'
    elif conflict_level == 'warning':
        status = 'conflict_warning'
    elif pdf_score is not None and verified_by_pdf_reading:
        status = 'verified_override'
    elif pdf_score is not None and not verified_by_pdf_reading:
        status = 'pdf_annotation_only'
    else:
        status = 'engine_only'

    return {
        'date': date_str,
        'engine': engine_score,
        'pdf': pdf_score,
        'final': final,
        'source': source,
        'status': status,
        'conflict': conflict,
        'conflict_level': conflict_level,
        'verified_by_pdf_reading': verified_by_pdf_reading,
        'pdf_label': pdf_label,
        'pdf_source': pdf_source,
        'kp': kp,
        'kp_synthetic': kp_synthetic,
        'tag': tag,
        'label': SCORE_LABELS.get(final, str(final)),
    }

def build(dry_run=False, force=False):
    print("=== build_truth_layer.py ===")
    scores, overrides = load_data()

    today = date.today()
    start = today - timedelta(days=7)  # 7 днів назад для контексту
    days_range = [(start + timedelta(days=i)).isoformat()
                  for i in range(HORIZON_DAYS + 7)]

    results = []
    blocks = []
    warnings = []
    conflicts_critical = []

    for d in days_range:
        r = resolve_day(d, scores, overrides)
        results.append(r)
        if r['conflict_level'] == 'critical':
            conflicts_critical.append(r)
            if not r['verified_by_pdf_reading']:
                blocks.append(r)
        elif r['conflict_level'] == 'warning':
            warnings.append(r)

    # --- ЗВІТ ---
    report = []
    report.append(f"# conflicts_report.md")
    report.append(f"Згенеровано: {date.today()}")
    report.append(f"Горизонт: {days_range[0]} – {days_range[-1]}")
    report.append(f"\n## Підсумок")
    report.append(f"- Критичних конфліктів (знак різний): {len(conflicts_critical)}")
    report.append(f"- З них блокуючих (unverified): {len(blocks)}")
    report.append(f"- Попереджень (delta≥2): {len(warnings)}")
    report.append(f"- Статус deploy: {'🔴 ЗАБЛОКОВАНО' if blocks and not force else '🟢 ДОЗВОЛЕНО'}")

    if blocks:
        report.append(f"\n## 🔴 БЛОКУЮЧІ КОНФЛІКТИ (deploy заблоковано)")
        for r in blocks:
            report.append(f"- **{r['date']}**: {r['conflict']}")
            report.append(f"  pdf_source: {r['pdf_source']} | pdf_label: {(r['pdf_label'] or '')[:60]}")
            report.append(f"  → ДІЯ: перевір PDF і встанови verified_by_pdf_reading=true")

    if warnings:
        report.append(f"\n## ⚠ ПОПЕРЕДЖЕННЯ (delta≥2, знак збігається)")
        for r in warnings:
            report.append(f"- {r['date']}: {r['conflict']}")

    report.append(f"\n## Всі дні (від {days_range[0]})")
    report.append("| Дата | Engine | PDF | Final | Source | Status |")
    report.append("|---|---|---|---|---|---|")
    for r in results:
        e = f"{r['engine']:+d}" if r['engine'] is not None else "—"
        p = f"{r['pdf']:+d}" if r['pdf'] is not None else "—"
        f_ = f"{r['final']:+d}" if r['final'] is not None else "—"
        flag = "🔴" if r['conflict_level']=='critical' else ("⚠" if r['conflict_level']=='warning' else "")
        report.append(f"| {r['date']} | {e} | {p} | {f_} | {r['source']} | {flag}{r['status']} |")

    report_text = '\n'.join(report)

    # --- ВИВІД ---
    print(f"Критичних конфліктів: {len(conflicts_critical)}")
    print(f"Блокуючих: {len(blocks)}")
    print(f"Попереджень: {len(warnings)}")

    if blocks and not force:
        print(f"\n🔴 DEPLOY ЗАБЛОКОВАНО — {len(blocks)} unverified critical conflicts:")
        for r in blocks:
            print(f"  {r['date']}: {r['conflict']}")
        print("\nВиправ і запусти знову, або --force щоб ігнорувати (НЕ рекомендовано)")

    if dry_run:
        print("\n[DRY RUN] Файли не збережені.")
        print("\n--- conflicts_report.md preview ---")
        print('\n'.join(report_text.split('\n')[:40]))
        return bool(blocks) and not force

    # --- ЗБЕРЕЖЕННЯ ---
    truth = {
        'generated': str(date.today()),
        'engine_source': SCORES_FILE,
        'overrides_source': OVERRIDES_FILE,
        'deploy_blocked': bool(blocks) and not force,
        'critical_conflicts': len(conflicts_critical),
        'blocks': len(blocks),
        'days': results,
    }

    with open(OUTPUT_TRUTH, 'w', encoding='utf-8') as f:
        json.dump(truth, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Збережено: {OUTPUT_TRUTH}")

    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(report_text)
    print(f"✅ Збережено: {OUTPUT_REPORT}")

    if blocks and not force:
        print("\n⛔ DEPLOY ЗАБЛОКОВАНО. Не пушити до виправлення.")
        return True  # blocked

    print("\n🟢 Deploy дозволено.")
    return False  # not blocked

if __name__ == '__main__':
    dry_run = '--audit' in sys.argv
    force   = '--force' in sys.argv
    blocked = build(dry_run=dry_run, force=force)
    sys.exit(1 if blocked else 0)
