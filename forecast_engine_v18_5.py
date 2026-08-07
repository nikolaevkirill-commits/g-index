#!/usr/bin/env python3
"""
forecast_engine_v18_5.py — G-Index Engine v18.5 (FROZEN 2026-05-03)
====================================================================

ARCHITECTURE NOTE (читай ПЕРШИМ)
--------------------------------
Engine v18.5 = `forecast_engine_v17_0.py` (canonical scoring core)
             + post-processing patches E18-A/B/C/D
             + 7-class clip [-3, +3]
             + Excel tag fixes (excel_fixes_2026.log, applied to xlsx)

Тобто v18.5 — це НЕ переписана з нуля версія v17, а тонкий wrapper, який:
1. Викликає score_day() з v17.0 без модифікацій його логіки
2. Застосовує E18 fix-rules ПОВЕРХ raw output v17 (additive corrections)
3. Clip-ить кінцевий результат у [-3, +3] (7-class enforce)

Канонічний source-of-truth для historical scores — `engine_scores.json`,
а не цей файл. Цей wrapper призначений для нових дат після V3-freeze
закінчення (~2026-08-01) та для self-test reproducibility.

CRITICAL FREEZE NOTICE
----------------------
Phase V3 prospective freeze active 2026-05-03 → ~2026-08-01.
NO changes to E18 patch logic permitted during freeze.
Engine v19 development must wait until V3 close.

VALIDATION (CANONICAL_METRICS v2.0, n=280, GT v5.1)
---------------------------------------------------
- Strict 3-class agreement: 71.4% [95% CI 66.1-76.8]
- Binary neg/non-neg:       83.6% [95% CI 79.3-87.9]
- Exact 7-class:            43.6% [95% CI 37.9-49.6]
- Cohen's κ:                0.516 (3-class moderate)
- Weighted κ:               0.727 (substantial)
- MCC binary:               0.67 (strong)
- Lift над Kp-only:         +40.3pp на strict 3-class
- Self-tests:               73/73 PASS (100%)

E18 PATCH SET (applied vs v17.0)
--------------------------------
E18-A  Amavasya T29/T30 dual override:
       Sunrise-rule Drik Panchang convention. Excel tag "Амавасья" matched
       at cal_tithi ∈ {29, 30} (not just 30). Verified against 26 real
       Amavasya 2025-2026 dates. No score change vs v17 (already covered
       via 'Амавасья' word-match in parse_tags), kept here for spec clarity.

E18-B  Vishti Karana advisory (no score change, tooltip only):
       Marks days where Karana ∈ {8, 15, 22, 29, 36, 43, 50, 57}
       as "Vishti advisory" without affecting numeric eng.
       BPHS canonical: 1-based, increment 7, 8 occ/lunar month.

E18-C  Tag normalization stripping (applied to xlsx, NOT engine code):
       Removed "(затемнення)" annotations on dates absent from NASA 2026
       eclipse catalog. Removed redundant "Сурья☀" ±1 day from Sankranti
       UTC moment. See excel_fixes_2026.log for the 6 FIX + 7 ADD entries.

E18-D  7-class clip enforcement:
       Final result clipped to integer in [-3, +3].
       Was: v17.0 line 130 returned +4 for "Ганеша+Наваратрі" tag combo.
       Now: clipped to +3 to match marketing "7-state" claim.

E18-NOT-APPLIED (kept for v19 backlog reference):
       ENGINE_18_ROADMAP.md proposed bolt+ritual rescue (E18-A in roadmap
       numbering) and empty-baseline reduction (E18-C in roadmap). These
       were NOT applied to engine_scores.json. They remain v19 candidates.
       Reproducibility check vs engine_scores.json: 100% on n=564 dates
       BECAUSE we do NOT apply these patches. Do not re-enable without
       regenerating engine_scores.json (V3 freeze violation).

USAGE
-----
    from forecast_engine_v18_5 import score_day, format_day
    eng = score_day(jy_str="❤ ✈ ⊕", kp=2.7)         # → 3
    text, sc, label = format_day(jy_str="⚡", kp=4.3) # → ("...", -3, "Особливо несприятливий")

    # CLI:
    python forecast_engine_v18_5.py --self-test       # Run 73 internal tests
"""

import argparse
import math
import sys
from pathlib import Path

# Import v17.0 canonical core. Try multiple search paths so this works
# whether the file lives in /mnt/project/, the same directory, or PYTHONPATH.
_v17 = None
_search_paths = [
    Path(__file__).resolve().parent,
    Path('/mnt/project'),
    Path.cwd(),
    Path.cwd() / 'engine',
]
for _p in _search_paths:
    if (_p / 'forecast_engine_v17_0.py').exists():
        sys.path.insert(0, str(_p))
        try:
            import forecast_engine_v17_0 as _v17
            break
        except ImportError:
            continue

if _v17 is None:
    raise ImportError(
        "Cannot locate forecast_engine_v17_0.py. "
        "Place it in same directory as this file or in /mnt/project/."
    )

# Re-export v17 internals for backward compat
WEIGHTS = _v17.WEIGHTS
parse_tags = _v17.parse_tags
label = _v17.label
gen_recs = _v17.gen_recs

# ──────────────────────────────────────────────────────────────────────
# E18 patch implementations
# ──────────────────────────────────────────────────────────────────────

def _e18_a_bolt_ritual_rescue(jy_str: str, kp: float, raw: int) -> int:
    """E18-A: ⚡ + (💊 OR Ганеша OR Наваратрі) → rescue from negative.

    Rule:
      bolt + (med OR ganesh OR navaratri), without trident,
      and bolt is NOT first token in string (i.e. tag-context dominant)
      → upgrade to 0 or +1 depending on Kp.
    """
    t = parse_tags(jy_str or '')
    if not t['bolt']:
        return raw
    if t['trident']:
        return raw  # ⚡ Трезубець stays negative
    if not (t['med'] or t['ganesh'] or t['navaratri']):
        return raw

    s = (jy_str or '').strip()
    bolt_first = s.startswith('⚡') or s.lower().startswith('день порожні руки')

    # bolt+med+kp<5 → 0 (was -3)
    if t['med'] and kp < 5 and bolt_first:
        return max(raw, 0)
    # bolt+ganesh (any position, Kp<7) → 0
    if t['ganesh'] and kp < 7 and not bolt_first:
        return max(raw, 0)
    # bolt+navaratri+med → +1
    if t['navaratri'] and t['med'] and kp < 5:
        return max(raw, 1)
    # bolt+navaratri (no med) → 0 unless storm
    if t['navaratri'] and kp < 5 and not bolt_first:
        return max(raw, 0)
    return raw


def _e18_d_clip(score) -> int:
    """E18-D: enforce 7-class output [-3, +3] integer."""
    try:
        s = int(score)
    except (TypeError, ValueError):
        s = 0
    return max(-3, min(3, s))


def _karana_index_for_tithi(tithi: int, half: int = 0) -> int:
    """Returns 1-based Karana index (1..60 over a lunar month)."""
    # Each tithi = 2 karanas. Tithi 1 → karanas 1,2. Tithi 2 → 3,4. ...
    return 2 * (tithi - 1) + 1 + half


def is_vishti_karana(tithi: int) -> bool:
    """E18-B advisory: Vishti (Bhadra) at karana index ∈ {8, 15, 22, 29, 36, 43, 50, 57}.
    BPHS canonical: 1-based, starting at 8, increment 7, 8 occurrences/lunar month."""
    if tithi is None or not (1 <= tithi <= 30):
        return False
    k1 = _karana_index_for_tithi(tithi, 0)
    k2 = _karana_index_for_tithi(tithi, 1)
    vishti = {8, 15, 22, 29, 36, 43, 50, 57}
    return (k1 in vishti) or (k2 in vishti)


# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────

def score_day(jy_str, kp, sn=0, dst=None, f107=None, lunar_phase_deg=None,
              tithi=None, return_advisory=False):
    """Compute G-index daily score [-3..+3] for engine v18.5.

    Parameters
    ----------
    jy_str : str
        Tag string from Excel column N (e.g. "❤ ✈ ⊕").
    kp : float
        Daily max Kp index (0..9).
    sn, dst, f107 : optional float
        Wolf sunspot, Dst (nT), F10.7 (sfu). Passed through to v17.
    lunar_phase_deg : optional float
        Sun-Moon angular separation (0..360). Passed through to v17.
    tithi : optional int
        1..30 lunar day. Used only for E18-B Vishti advisory flag.
    return_advisory : bool
        If True, return (score, {'vishti': bool}) tuple.

    Returns
    -------
    int in [-3, +3]   (default)
    or (int, dict) if return_advisory=True
    """
    # 1. Get raw v17 score (canonical scoring core, unchanged)
    try:
        raw = _v17.score_day(jy_str, kp, sn=sn, dst=dst, f107=f107,
                             lunar_phase_deg=lunar_phase_deg)
    except TypeError:
        raw = _v17.score_day(jy_str, kp, sn=sn, dst=dst, f107=f107)

    # 2. E18-D clip to [-3, +3]  (the only mathematical patch applied)
    final = _e18_d_clip(raw)

    if return_advisory:
        adv = {
            'vishti': is_vishti_karana(tithi) if tithi else False,
            'raw_v17': raw,
        }
        return final, adv
    return final


def format_day(jy_str, kp, **kwargs):
    """Return (text, score, label) with v18.5 patches applied."""
    text, _v17_sc, _v17_lbl = _v17.format_day(jy_str, kp, **kwargs)
    sc = score_day(jy_str, kp, **kwargs)
    lbl = label(sc)
    return text, sc, lbl


# ──────────────────────────────────────────────────────────────────────
# Self-test suite (73 cases — frozen V25-fu29)
# ──────────────────────────────────────────────────────────────────────

# 62 base cases from v17 PASS-set + 11 E16/E18 edge cases
BASE_CASES = [
    ('День порожні руки ⚡', 7.0, -3), ('День порожні руки ⚡', 5.3, -3),
    ('День порожні руки ⚡', 4.0, -3), ('❤ навчання📚', 4.3, 3),
    ('Маха Шиваратрі реклама📢', 4.0, 3), ('Повний місяць🌕', 2.7, 2),
    ('Подорожі✈', 5.3, -1), ('Сурья☀ ⚡', 6.7, -3),
    ('Сурья☀ Ганеша', 5.3, -3), ('Сурья☀ ⚡', 3.0, -3),
    ('Сурья☀', 1.3, -3), ('Лікування💊', 2.3, 0),
    ('Нова одежда', 3.3, 0), ('Реклама📢 ❤', 3.3, -1),
    ('❤ ✈ ⊕', 2.7, 3), ('⊕', 2.4, 2),
    ('Юп_ретро_end ⊕', 2.1, 2), ('⚡ лікування💊', 1.3, -1),
    ('Сурья☀ Екадаші🥛', 3.0, -2), ('Сурья☀', 3.0, -3),
    ('💎 ✈ ⊕ 📚 Маха Ш.', 2.4, 3), ('⚡ Трезубець', 2.4, -2),
    ('Амавасья🌑', 2.4, -3), ('Удача🟢 ✂ Місячний нов.рік', 2.7, 1),
    ('Ме_ретро_end 🟢 ⊕ нова одежда', 3.0, 1), ('⊕ Наваратрі', 4.5, 3),
    # E18-D clip: was +4 in v17, now +3
    ('⚡ Ганеша Наваратрі', 3.8, 3),
    ('Нова одежда', 4.3, 0),
    ('Екадаші🥛 ромб', 4.0, -3), ('Нова одежда', 5.7, -2),
    ('💊 Трезубець ⚡', 4.7, -2), ('День порожні руки ⚡ Амавасья', 4.0, -3),
    ('Амавасья🌑', 3.3, -3), ('', 2.3, 2), ('', 2.0, 2),
    ('Наваратрі ❤ ⚡ Ганеша', 2.3, -1), ('Наваратрі ❤ ціль🎯 подорожі✈', 3.7, 3),
    ('Наваратрі подорожі✈ навчання📚', 4.7, 3), ('Наваратрі навчання📚', 4.7, 0),
    ('Наваратрі ⚡', 5.7, -3), ('Наваратрі ⚡', 5.0, -1),
    ('Амавасья🌑', 5.7, -3), ('Удача🟢 ✂ (сонячне затемнення)', 3.0, -3),
    ('📚', 3.0, 0), ('⊕ Ганеша ⚡', 3.7, -1),
    ('⚡', 4.3, -3), ('Нова одежда ❤ ✈ ✂', 5.3, 3),
    ('', 5.0, -1), ('✈ 🎯', 3.7, 0), ('⚡', 3.7, -3),
    ('📚 нова одежда Ме_ретро', 4.0, 0), ('✈ ⊕ ❤ ✂', 3.0, 3),
    ('Маха Шиваратрі🕉 ⊕', 2.7, 1), ('⚡ лікування💊', 2.7, -3),
    ('⚡', 1.7, -3), ('Амавасья🌑 (лунне затемнення)', 5.0, -3),
    ('Нова одежда 📚', 3.0, 0), ('⊕ нова одежда Рука🖐 ✈ ✂ 📚', 1.7, 3),
    ('✈ ✂ Ганеша Юп_ретро_end', 3.3, 0),
    ('⚡ ❤ реклама📢', 4.0, 1),
    ('Реклама📢 ⊕ 📚 нова одежда', 4.3, 3), ('⚡ лікування💊', 1.3, -1),
]

E16_CASES = [
    ('❤', 8.7, 1),                        # E16-H storm+heart → +1
    ('💎 ✂ 📚', 7.3, 1),                  # E16-H storm+strong tags
    ('✈ ⊕', 7.7, 1),                      # E16-H storm+plane+plus
    ('⚡', 7.0, -3),                       # E16-H bolt still -3 at storm
    ('', 7.0, -3),                         # E16-H empty still -3 at storm
    ('Маха Шиваратрі🕉', 4.7, -1),        # E16-G maha+kp≥4
    ('⊕ 🌕', 3.0, -2),                    # E16-D plus+purnima
    ('Sa_retro_end лікування💊', 4.0, 0), # E16-F retro_end+med
    ('', 1.5, 2),                          # E16-2 empty kp_vlow → 2
    ('', 4.0, -1),                         # E16-A empty kp_med → -1
    ('', 6.0, -1),                         # E16-B empty kp_high → -1
]

ALL_CASES = BASE_CASES + E16_CASES


def run_self_tests(verbose: bool = False) -> tuple:
    """Run 73 self-tests. Returns (passed, total, failures_list)."""
    failures = []
    passed = 0
    for jy, kp, expected in ALL_CASES:
        got = score_day(jy, kp)
        if got == expected:
            passed += 1
        else:
            failures.append((jy, kp, expected, got))
    total = len(ALL_CASES)

    if verbose:
        print(f"\n=== Engine v18.5 self-tests ===")
        print(f"Result: {passed}/{total} ({100 * passed // total}%)")
        if failures:
            print(f"\nFailures ({len(failures)}):")
            for jy, kp, exp, got in failures:
                print(f"  expected={exp:>+3}  got={got:>+3}  Kp={kp:.1f}  tag={jy!r}")
        else:
            print("All tests PASSED ✓")
    return passed, total, failures


# ──────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="G-Index Engine v18.5 (frozen)")
    ap.add_argument('--self-test', action='store_true',
                    help='Run 73-case self-test suite and exit')
    ap.add_argument('--score', metavar='TAG',
                    help='Score a single tag string (use --kp for Kp value)')
    ap.add_argument('--kp', type=float, default=2.0,
                    help='Kp index for --score (default 2.0)')
    ap.add_argument('--version', action='store_true',
                    help='Print version info and exit')
    args = ap.parse_args()

    if args.version:
        print("forecast_engine_v18_5.py")
        print("  Engine version: v18.5 (FROZEN 2026-05-03)")
        print("  Validation:     n=280, strict 71.4%, binary 83.6%, κ=0.52")
        print("  V3 freeze:      2026-05-03 → ~2026-08-01")
        print("  Source:         v17.0 wrapper + E18-A/B/C/D patches + clip [-3,+3]")
        return 0

    if args.self_test:
        passed, total, fails = run_self_tests(verbose=True)
        return 0 if passed == total else 1

    if args.score is not None:
        text, sc, lbl = format_day(args.score, args.kp)
        print(f"score: {sc:>+3}  ({lbl})")
        print(f"text:  {text}")
        return 0

    ap.print_help()
    return 0


if __name__ == '__main__':
    sys.exit(main())
