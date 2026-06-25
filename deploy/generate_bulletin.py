#!/usr/bin/env python3
"""
PROGNOZ / G-Index — Автоматичний генератор аналітичного бюлетеня
Формат відповідає system prompt: факт/інтерпретація/рекомендація
"""
import json
from datetime import date, timedelta

# --- CONFIG ---
SCORES_FILE = 'engine_scores.json'
OVERRIDES_FILE = 'expert_overrides_v3.json'
HORIZON_DAYS = 14  # змінити за потребою

SCORE_LABELS = {
    3: "Особливо сприятливий",
    2: "Сприятливий",
    1: "Помірно сприятливий",
    0: "Нейтральний",
   -1: "Помірно несприятливий",
   -2: "Несприятливий",
   -3: "Особливо несприятливий",
}

CONF_ORDER = {"HIGH": 0, "MED": 1, "WEAK": 2, "LOW": 3, None: 4}

def load_data():
    eng_raw = json.load(open(SCORES_FILE))
    scores = eng_raw['scores']  # dict keyed by date str
    ov_raw = json.load(open(OVERRIDES_FILE))
    overrides_list = ov_raw['overrides']
    overrides = {e['date']: e for e in overrides_list}
    return scores, overrides

def resolve(date_str, scores, overrides):
    """Priority: PDF override > engine > cal_score"""
    s = scores.get(date_str, {})
    ov = overrides.get(date_str)
    
    pdf_score = None
    pdf_label = None
    pdf_source = None
    if ov and ov.get('verified'):
        pdf_score = ov['expert_eng']
        pdf_label = ov.get('pdf_label', '')
        pdf_source = ov.get('source_pdf', ov.get('source', ''))
    
    eng = s.get('eng')
    cal = s.get('cal_score', 0)
    kp = s.get('kp', 2.0)
    kp_synthetic = s.get('kp_synthetic', True)
    tithi = s.get('cal_tithi')
    nak = s.get('cal_nakshatra')
    yoga = s.get('cal_yoga')
    syms = s.get('cal_symbols', [])
    
    # Final score
    if pdf_score is not None:
        final = pdf_score
        source = f"PDF ({pdf_source or 'GT'})"
    elif eng is not None:
        final = eng
        source = "engine"
    elif cal:
        final = cal
        source = "cal_score"
    else:
        final = None
        source = "немає даних"
    
    # Conflict detection
    conflict = None
    if pdf_score is not None and eng is not None:
        if (pdf_score > 0) != (eng > 0) and not (pdf_score == 0 or eng == 0):
            conflict = f"PDF={pdf_score:+d} ↔ engine={eng:+d} КРИТИЧНИЙ"
        elif pdf_score != eng:
            conflict = f"PDF={pdf_score:+d} ↔ engine={eng:+d}"
    
    return {
        'date': date_str,
        'final': final,
        'source': source,
        'pdf_score': pdf_score,
        'pdf_label': pdf_label,
        'eng': eng,
        'cal': cal,
        'kp': kp,
        'kp_synthetic': kp_synthetic,
        'tithi': tithi,
        'nak': nak,
        'yoga': yoga,
        'syms': syms,
        'conflict': conflict,
    }

def score_label(s):
    if s is None: return "N/A"
    return SCORE_LABELS.get(s, str(s))

def day_line(r, today_str):
    d = r['date']
    marker = " ◀ СЬОГОДНІ" if d == today_str else ""
    final = r['final']
    label = score_label(final)
    
    # Score line
    score_str = f"{final:+d}" if final is not None else "?"
    kp_flag = f"Kp={r['kp']} {'[SYNTHETIC]' if r['kp_synthetic'] else '[REAL]'}"
    syms_str = ', '.join(r['syms']) if r['syms'] else '—'
    
    lines = [f"\n**{d}{marker}** | {score_str} {label} | Джерело: {r['source']}"]
    lines.append(f"  Panchanga: T{r['tithi']} N{r['nak']} Y{r['yoga']} · {kp_flag} · Символи: {syms_str}")
    
    if r['conflict']:
        lines.append(f"  ⚠ КОНФЛІКТ: {r['conflict']}")
    
    # Recommendation
    if final is not None:
        if final >= 3:
            lines.append(f"  → Активно. Справи, рішення, логістика.")
        elif final == 2:
            lines.append(f"  → Помірно активно. Сприятливий фон.")
        elif final == 1:
            lines.append(f"  → Нейтрально-позитивно. Обережно.")
        elif final == 0:
            lines.append(f"  → Нейтраль. Без різких кроків.")
        elif final == -1:
            lines.append(f"  → Обережно. Уникати нових старт-рішень.")
        elif final == -2:
            lines.append(f"  → Пасивно. Рутина, лікування.")
        elif final <= -3:
            lines.append(f"  → Мінімум активності. Жодних важливих рішень.")
    else:
        lines.append(f"  → Даних недостатньо.")
    
    if r['pdf_label'] and r['pdf_score'] is not None:
        lines.append(f"  PDF: «{r['pdf_label'][:80]}»")
    
    return '\n'.join(lines)

def generate_bulletin(start_date=None, days=HORIZON_DAYS):
    scores, overrides = load_data()
    today = date.today()
    start = start_date or today
    
    resolved = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        resolved.append(resolve(d, scores, overrides))
    
    today_str = today.isoformat()
    
    # --- Stats ---
    with_data = [r for r in resolved if r['final'] is not None]
    conflicts = [r for r in resolved if r['conflict']]
    critical_conflicts = [r for r in resolved if r['conflict'] and 'КРИТИЧНИЙ' in r['conflict']]
    
    pos_days = sorted([r for r in with_data if r['final'] >= 2], key=lambda x: -x['final'])
    neg_days = sorted([r for r in with_data if r['final'] <= -2], key=lambda x: x['final'])
    
    synthetic_count = sum(1 for r in resolved if r['kp_synthetic'])
    
    # Horizon summary
    all_finals = [r['final'] for r in with_data]
    avg = sum(all_finals)/len(all_finals) if all_finals else 0
    trend = "помірно позитивний" if avg > 0.5 else ("помірно негативний" if avg < -0.5 else "нейтральний")
    
    out = []
    out.append(f"# АНАЛІТИЧНИЙ БЮЛЕТЕНЬ G-Index / PROGNOZ")
    out.append(f"**Горизонт:** {start.isoformat()} – {(start+timedelta(days=days-1)).isoformat()}")
    out.append(f"**Складено:** {today_str} | Engine: v18.5 frozen | GT: v6.3")
    out.append(f"**Kp:** {synthetic_count}/{days} днів SYNTHETIC (flat 2.0) — реальний Kp невідомий")
    out.append(f"**Точність моделі:** binary/sign ~70% (prospective holdout), exact ~34-43% (tuning-inflated)")
    
    out.append(f"\n## 1. ВИСНОВОК ТИЖНЯ")
    out.append(f"Загальний тон: **{trend}** (середній score={avg:.2f}, n={len(with_data)}).")
    out.append(f"Конфліктів engine↔PDF: **{len(conflicts)}** ({len(critical_conflicts)} критичних — знак інвертований).")
    if synthetic_count == days:
        out.append("⚠ Весь горизонт: Kp synthetic. Геомагнітна компонента ненадійна.")
    
    out.append(f"\n## 2. НАЙСИЛЬНІШІ ДНІ (≥+2)")
    if pos_days:
        for r in pos_days[:4]:
            s = r['syms'] and ', '.join(r['syms'][:2]) or '—'
            out.append(f"- **{r['date']}** {r['final']:+d} | {r['source']} | {s}")
    else:
        out.append("- немає днів з score ≥+2")
    
    out.append(f"\n## 3. НАЙСЛАБШІ ДНІ (≤-2)")
    if neg_days:
        for r in neg_days[:4]:
            s = r['syms'] and ', '.join(r['syms'][:2]) or '—'
            out.append(f"- **{r['date']}** {r['final']:+d} | {r['source']} | {s}")
    else:
        out.append("- немає днів з score ≤-2")
    
    out.append(f"\n## 4. ДЕНЬ ЗА ДНЕМ")
    for r in resolved:
        out.append(day_line(r, today_str))
    
    out.append(f"\n## 5. РИЗИКИ МОДЕЛІ")
    out.append(f"1. Kp synthetic ({synthetic_count}/{days}) — без реальних геомагнітних даних.")
    out.append(f"2. {len(critical_conflicts)} критичних конфлікти (engine frozen, PDF GT не імпортовано в engine).")
    out.append(f"3. Prospective 3-class 56% < target 70% — V3 freeze active.")
    out.append(f"4. Exact metric ненадійний (holdout: +0pp lift, tuning survivor bias).")
    if any('mercury_retro' in r['syms'] for r in resolved):
        out.append(f"5. Mercury retrograde в горизонті — не верифікований предиктор (контекст).")
    if any('purnima' in r['syms'] or 'amavasya' in r['syms'] for r in resolved):
        out.append(f"6. Повня/Амавасья в горизонті — підвищена волатильність за GT-патерном.")
    
    out.append(f"\n## 6. ПРАКТИЧНА РЕКОМЕНДАЦІЯ")
    out.append("Пріоритет джерел: **PDF GT (verified) > engine frozen > cal_score**.")
    out.append("При конфлікті engine↔PDF — довіряти PDF. Engine заморожений, GT оновлено 20.06.")
    out.append("При Kp synthetic — сигнал залежить виключно від Panchanga (~53% днів з тегами).")
    out.append("*Не є підставою для критичних рішень. Модель у проспективній валідації (V3 freeze).*")
    
    return '\n'.join(out)

if __name__ == '__main__':
    print(generate_bulletin())

def check_label_conflicts(overrides_file=OVERRIDES_FILE):
    """Виявити записи де pdf_label суперечить expert_eng"""
    ov_raw = json.load(open(overrides_file))
    overrides = ov_raw['overrides']
    issues = []
    for e in overrides:
        label = e.get('pdf_label', '')
        eng = e.get('expert_eng')
        if eng is None: continue
        if 'особливо несприятли' in label.lower() and eng > 0:
            issues.append((e['date'], eng, label[:50]))
        elif 'особливо сприятли' in label.lower() and 'не' not in label.lower()[:20] and eng < 0:
            issues.append((e['date'], eng, label[:50]))
    return issues

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'check':
        issues = check_label_conflicts()
        print(f"\n=== КОНФЛІКТИ label vs expert_eng ({len(issues)}) ===")
        for d, s, l in issues:
            print(f"  {d}: eng={s:+d} | label: {l}")
    else:
        print(generate_bulletin())
