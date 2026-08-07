"""Correctness adapter for the recovered frozen v18.5 Engine.

The recovered forecast_engine_v17_0.py / forecast_engine_v18_5.py files remain
byte-identical. This adapter fixes input interpretation *before* raw scoring by
appending the legacy canonical spellings/symbols for tokens recognized by the
shared engine_tag_aliases_v1.json contract.

No score weights, thresholds, E18 rules or date-specific logic are changed.
"""
from __future__ import annotations

from typing import Any

import forecast_engine_v18_5 as _base
from engine_correctness import parse_tag_tokens

# Canonical renderings already understood by the recovered v17 parser.
# Unknown/original text is preserved verbatim and these markers are appended.
V17_CANONICAL_RENDER: dict[str, str] = {
    "heart": "❤",
    "plane": "✈",
    "plus": "⊕",
    "diamond": "💎",
    "star": "⭐",
    "advert": "📢",
    "study": "📚",
    "hand": "Рука🖐",
    "scissors": "✂",
    "goal": "🎯",
    "navaratri": "Наваратрі",
    "maha_shiv": "Маха Ш",
    "new_clothes": "Нова одежда",
    "luck": "🟢",
    "new_year": "Нов.Рік",
    "retro_end": "Ретро_end",
    "retro": "Ретро",
    "ganesh": "Ганеша",
    "bolt": "⚡",
    "trident": "Трезубець",
    "med": "💊",
    "ekadashi": "Екадаші",
    "amavasya": "Амавасья",
    "purnima": "Повний місяць",
    "surya": "Сурья",
    "eclipse": "затемнення",
}


def canonicalize_tag_text_for_v17(value: Any) -> str:
    """Preserve source text and append canonical legacy markers once per token."""
    original = "" if value is None else str(value).strip()
    tokens = parse_tag_tokens(original)
    markers = [V17_CANONICAL_RENDER[t] for t in V17_CANONICAL_RENDER if t in tokens]
    if not markers:
        return original
    # Duplicated semantics are harmless because v17 parse_tags is boolean. Keeping
    # original text preserves unsupported legacy vocabulary such as Dipavali.
    suffix = " ".join(markers)
    return f"{original} {suffix}".strip()


def score_day(jy_str, kp, sn=0, dst=None, f107=None, lunar_phase_deg=None,
              tithi=None, return_advisory=False):
    """Call byte-identical v18.5 after canonical input normalization."""
    canonical = canonicalize_tag_text_for_v17(jy_str)
    return _base.score_day(
        canonical,
        kp,
        sn=sn,
        dst=dst,
        f107=f107,
        lunar_phase_deg=lunar_phase_deg,
        tithi=tithi,
        return_advisory=return_advisory,
    )


def format_day(jy_str, kp, **kwargs):
    """Return v18.5 text/score/label using the same canonicalized input."""
    canonical = canonicalize_tag_text_for_v17(jy_str)
    return _base.format_day(canonical, kp, **kwargs)


# Deliberate re-exports for callers that inspect the recovered Engine contract.
WEIGHTS = _base.WEIGHTS
label = _base.label
is_vishti_karana = _base.is_vishti_karana

__all__ = [
    "V17_CANONICAL_RENDER",
    "canonicalize_tag_text_for_v17",
    "score_day",
    "format_day",
    "WEIGHTS",
    "label",
    "is_vishti_karana",
]
