#!/usr/bin/env python3
"""
score_engine_v19_preview.py — Experimental scoring patches on top of v18.5.

НЕ замінює forecast_engine_v18_5.py (frozen V3 до 08.2026).
Використовувати тільки для pipeline бюлетенів та порівняння.

Патчі (2 штуки, verified on GT n=350):
  P-v19-1: bolt + action_tags (plane/plus+scissors) + kp≤2 + no amavasya/purnima
            → +2 (було -3). GT: 2026-05-11 ⚡✈⊕→2, 2026-05-20 ⊕✂⚡→3, 2026-06-17 ✂✈⊕⚡→3
  P-v19-3: med solo (no bolt) + kp<5 + no blocking tags
            → +1 (було 0). GT: 2026-04-26 💊→1, 2026-04-28 ▲💊→2
НЕ патчую:
  empty-day: GT від -3 до +3 без паттерну → будь-який патч рандомний
  luck+surya: потрібен більший аудит (кейсів мало)
"""
import sys
import os

# Завантажуємо базовий engine
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

try:
    from forecast_engine_v18_5 import score_day as _base_score_day
    from forecast_engine_v17_0 import parse_tags
except ImportError:
    # fallback: шукаємо у /mnt/project
    sys.path.insert(0, '/mnt/project')
    from forecast_engine_v18_5 import score_day as _base_score_day
    from forecast_engine_v17_0 import parse_tags


def score_day_v19(jy_str: str, kp: float, sn=0, dst=None, **kwargs) -> int:
    """
    Score day with v19 preview patches on top of v18.5.

    Parameters: same as forecast_engine_v18_5.score_day
    Returns: int in [-3, +3]
    """
    jy_str = str(jy_str) if jy_str is not None else ''
    try:
        kp = float(kp)
    except (TypeError, ValueError):
        kp = 0.0

    # Базовий результат v18.5
    base = _base_score_day(jy_str, kp, sn=sn, dst=dst, **kwargs)

    # Якщо base вже позитивний або нейтральний — не патчуємо
    # Патчуємо тільки випадки де base = -3

    if base != -3:
        return _apply_p_v19_3(jy_str, kp, base)

    t = parse_tags(jy_str)
    kp_vlow = kp <= 2.0

    # ── P-v19-1: bolt + action_tags + kp≤2 ──────────────────────────
    # GT аудит: ⚡ + (✈ або (⊕+✂)) + Kp≤2 → GT зазвичай +2..+3
    # Виключення: amavasya, purnima, нова одежда solo (2025-08-27 GT=-3)
    # Умова: потрібен і ✈ або (⊕ і ✂) — одного ⊕ недостатньо
    if (t.get('bolt') and kp_vlow
            and not t.get('amavasya') and not t.get('purnima')
            and not t.get('ekadashi') and not t.get('ganesh')
            and not t.get('retro') and not t.get('eclipse')):
        _has_plane   = t.get('plane')
        _has_plus_sc = t.get('plus') and t.get('scissors')
        if _has_plane or _has_plus_sc:
            return 2  # P-v19-1: bolt + action + тихе небо → сприятливий

    return base


def _apply_p_v19_3(jy_str: str, kp: float, base: int) -> int:
    """P-v19-3: med solo + kp<5 → +1 замість 0."""
    if base != 0:
        return base
    t = parse_tags(jy_str)
    kp_below_storm = kp < 5
    _blocking = [
        'heart', 'plane', 'plus', 'diamond', 'star',
        'navaratri', 'dipavali', 'advert', 'study',
        'hand', 'new_clothes', 'goal', 'scissors',
        'ganesh', 'bolt', 'amavasya', 'ekadashi',
        'purnima', 'eclipse',
    ]
    if (t.get('med') and kp_below_storm
            and not any(t.get(k) for k in _blocking)):
        return 1  # P-v19-3: лікувальний день, тихе Kp → помірно сприятливий
    return base


# Alias для сумісності з pipeline
score_day = score_day_v19


if __name__ == '__main__':
    # Швидкий self-test
    cases = [
        ('✂ ✈ нова одежда ⊕ ⚡', 2.0,  2,  '17.06 P-v19-1 очікую +2'),
        ('⚡ ✈ ⊕',               2.0,  2,  '11.05 P-v19-1 очікую +2'),
        ('⊕ ✂ нова одежда ⚡',   2.0,  2,  '20.05 P-v19-1 очікую +2'),
        ('💊',                    4.0,  1,  '26.06 P-v19-3 очікую +1'),
        ('💊',                    2.0,  1,  'med+kp_vlow очікую +1'),
        ('⚡',                    2.0, -3,  'bolt solo+kp_vlow залишаємо -3'),
        ('⚡',                    5.0, -3,  'bolt solo+storm залишаємо -3'),
        ('⚡ Амавасья',           2.0, -3,  'bolt+amavasya залишаємо -3'),
        ('',                      2.0,  2,  'empty+kp_vlow НЕ патчуємо (залишаємо +2)'),
    ]
    ok = fail = 0
    print('P-v19 self-test:')
    for tag, kp, expected, label in cases:
        got = score_day_v19(tag, kp)
        status = '✓' if got == expected else 'FAIL'
        if got == expected:
            ok += 1
        else:
            fail += 1
        print(f'  {status} {label}: got={got} expected={expected}')
    print(f'\n{ok}/{ok+fail} passed')
