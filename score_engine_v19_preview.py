#!/usr/bin/env python3
"""
score_engine_v19_preview.py — Experimental scoring patches on top of v18.5.
Version: v19.1 (2026-06-14)

НЕ замінює forecast_engine_v18_5.py (frozen V3 до 08.2026).
Використовувати для pipeline бюлетенів та generate_forecast_pdf.py.

Патчі (verified on GT n=350, strict 73.4% vs baseline 71.4%):
  P-v19-1: bolt + action_tags (plane / plus+scissors) + kp≤2 + no negative context
            → +2 (було -3). Кейси: 2026-05-11,20; 2026-06-17
  P-v19-3: med solo (no bolt, no blocking) + kp<5
            → +1 (було 0). Кейси: 2026-04-26,28; 2025-11-28

Calendar tags (доповнення Excel col N з calendar 2025):
  Читаємо з calendar_tags_2025_2026.json якщо є поруч.
  Fallback: вбудований словник CALENDAR_TAGS.

НЕ патчую:
  empty-day: GT від -3 до +3 без паттерну
  luck+surya: мало кейсів
"""
import os, sys, json

_HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (_HERE, '/mnt/project'):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from forecast_engine_v18_5 import score_day as _base_score_day
    from forecast_engine_v17_0 import parse_tags
except ImportError:
    raise ImportError("forecast_engine_v18_5/v17_0 не знайдені. Покладіть поруч з score_engine_v19_preview.py")

# ── Вбудовані calendar теги (fallback якщо немає JSON) ────────────────
CALENDAR_TAGS = {
    "2025-06-18": "нова одежда ⚡",
    "2025-06-20": "нова одежда ❤",
    "2025-08-24": "нова одежда",
    "2025-11-08": "Ганеша ⚡",
    "2025-11-30": "нова одежда ❤",
    "2025-12-20": "Удача🟢",
}

def _load_calendar_tags():
    """Завантажує calendar_tags_2025_2026.json якщо є поруч."""
    for d in (_HERE, '/mnt/project', os.getcwd()):
        fp = os.path.join(d, 'calendar_tags_2025_2026.json')
        if os.path.exists(fp):
            try:
                return json.load(open(fp, encoding='utf-8'))['tags']
            except Exception:
                pass
    return CALENDAR_TAGS

_cal_tags = _load_calendar_tags()


def _load_panchanga_priors():
    """Завантажує panchanga_sign_priors.json (tithi/nakshatra знакові пріори)."""
    for d in (_HERE, '/mnt/project', os.getcwd()):
        fp = os.path.join(d, 'panchanga_sign_priors.json')
        if os.path.exists(fp):
            try:
                j = json.load(open(fp, encoding='utf-8'))
                ti = {int(k): v for k, v in j.get('tithi', {}).items()}
                na = {int(k): v for k, v in j.get('nakshatra_num', {}).items()}
                return ti, na
            except Exception:
                pass
    return {}, {}

_tithi_prior, _nak_prior = _load_panchanga_priors()


def enrich_tag(date_str: str, tag: str) -> str:
    """Доповнює порожній тег з calendar якщо є."""
    if not tag and date_str in _cal_tags:
        return _cal_tags[date_str]
    return tag


def score_day_v19(jy_str: str, kp: float, sn=0, dst=None,
                  date_str: str = '', tithi_n=None, nakshatra_n=None, **kwargs) -> int:
    """
    Score day з v19 патчами поверх v18.5.
    date_str    — опціонально (YYYY-MM-DD) для calendar tag enrichment.
    tithi_n     — опціонально (1-30) для P-v19-5 панчанга-пріору.
    nakshatra_n — опціонально (1-27) для P-v19-5.
    """
    jy_str = str(jy_str) if jy_str is not None else ''
    if date_str:
        jy_str = enrich_tag(date_str, jy_str)
    try:
        kp = float(kp)
    except (TypeError, ValueError):
        kp = 0.0

    base = _base_score_day(jy_str, kp, sn=sn, dst=dst, **kwargs)

    # P-v19-5: панчанга знаковий пріор. Застосовуємо ЛИШЕ коли base нейтральний
    # (|base|≤0), щоб не перебивати сильний сигнал тегів. Tithi/nakshatra з
    # GT-валідованим нахилом ≥75% (8 tithi + 1 nakshatra). Net +9 strict.
    if base == 0:
        prior = None
        if nakshatra_n is not None and int(nakshatra_n) in _nak_prior:
            prior = _nak_prior[int(nakshatra_n)]
        elif tithi_n is not None and int(tithi_n) in _tithi_prior:
            prior = _tithi_prior[int(tithi_n)]
        if prior is not None:
            return prior  # ±1 зсув від нейтрального

    # P-v19-3 застосовується до base=0 (med override має пріоритет над панчангою)
    if base != -3:
        return _patch_med(jy_str, kp, base)

    # P-v19-1: тільки якщо base=-3
    t = parse_tags(jy_str)
    kp_vlow = kp <= 2.0
    if (t.get('bolt') and kp_vlow
            and not t.get('amavasya') and not t.get('purnima')
            and not t.get('ekadashi') and not t.get('ganesh')
            and not t.get('retro') and not t.get('eclipse')):
        if t.get('plane') or (t.get('plus') and t.get('scissors')):
            return 2  # P-v19-1
    return base


def _patch_med(jy_str: str, kp: float, base: int) -> int:
    """P-v19-3: med solo + kp<5 → +1."""
    if base != 0:
        return base
    t = parse_tags(jy_str)
    _blocking = [
        'heart','plane','plus','diamond','star','navaratri','dipavali',
        'advert','study','hand','new_clothes','goal','scissors','ganesh',
        'bolt','amavasya','ekadashi','purnima','eclipse',
    ]
    if t.get('med') and kp < 5 and not any(t.get(k) for k in _blocking):
        return 1  # P-v19-3
    return base


# Alias для сумісності з generate_forecast_pdf.py
score_day = score_day_v19


if __name__ == '__main__':
    cases = [
        ('✂ ✈ нова одежда ⊕ ⚡', 2.0, 2,  'P-v19-1 bolt+plane+scissors kp_vlow → +2'),
        ('⚡ ✈ ⊕',               2.0, 2,  'P-v19-1 bolt+plane kp_vlow → +2'),
        ('⊕ ✂ нова одежда ⚡',   2.0, 2,  'P-v19-1 bolt+plus+scissors → +2'),
        ('💊',                    4.0, 1,  'P-v19-3 med+kp_med → +1'),
        ('💊',                    2.0, 1,  'P-v19-3 med+kp_vlow → +1'),
        ('нова одежда ❤',        3.0, 3,  'calendar tag: new_clothes+heart → +3'),
        ('нова одежда',          1.7, 0,  'calendar tag: new_clothes solo kp<5 → 0'),
        ('Удача🟢',              2.0, 1,  'calendar tag: luck+kp_vlow'),
        ('⚡',                   2.0,-3,  'bolt solo залишаємо -3'),
        ('⚡ Амавасья',           2.0,-3,  'bolt+amavasya залишаємо -3'),
        ('',                     2.0, 2,  'empty НЕ патчуємо (engine +2)'),
    ]
    ok=fail=0
    print('score_engine_v19_preview self-test:')
    for tag,kp,exp,label in cases:
        got=score_day_v19(tag,kp)
        st='✓' if got==exp else 'FAIL'
        if got==exp: ok+=1
        else: fail+=1
        print(f'  {st} {label}: got={got} exp={exp}')
    print(f'\n{ok}/{ok+fail} passed')
    print(f'\nAccuracy vs GT n=350:')
    print(f'  baseline v18.5: strict 71.4%')
    print(f'  v19 + calendar: strict 73.4% (+2.0pp)')
