"""Correctness adapter for the recovered frozen v18.5 Engine.

The recovered forecast_engine_v17_0.py / forecast_engine_v18_5.py files remain
byte-identical. This adapter fixes input interpretation *before* raw scoring by
appending a legacy canonical marker only when the recovered v17 parser does not
already recognize that token.

This idempotency rule is critical for structured legacy strings such as
``Ме_ретро_end``: appending a generic ``Ретро_end`` changes v17's cleanup path
and therefore can change an already-canonical score. Existing recognized input
must pass through unchanged.

No score weights, thresholds, E18 rules or date-specific logic are changed.
"""
from __future__ import annotations

from typing import Any

import forecast_engine_v18_5 as _base
from engine_correctness import parse_tag_tokens

# Canonical renderings already understood by the recovered v17 parser.
# They are appended only when the shared alias parser sees a token that the
# recovered v17 parser missed in the original source text.
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
    """Add only semantics that shared aliases reveal but legacy v17 missed."""
    original = "" if value is None else str(value).strip()
    if not original:
        return original

    shared_tokens = parse_tag_tokens(original)
    if not shared_tokens:
        return original

    legacy = _base.parse_tags(original)
    markers: list[str] = []
    for token, marker in V17_CANONICAL_RENDER.items():
        if token not in shared_tokens:
            continue
        # Contract token names intentionally match recovered v17 parse_tags keys.
        # If v17 already sees the token, preserve the byte-level source semantics.
        if bool(legacy.get(token, False)):
            continue
        markers.append(marker)

    if not markers:
        return original

    # Original text is retained so unsupported legacy vocabulary (e.g. Dipavali)
    # and planet-specific constructs remain available to the recovered engine.
    return f"{original} {' '.join(markers)}".strip()


def score_day(jy_str, kp, sn=0, dst=None, f107=None, lunar_phase_deg=None,
              tithi=None, return_advisory=False):
    """Call byte-identical v18.5 after minimal canonical input normalization."""
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
