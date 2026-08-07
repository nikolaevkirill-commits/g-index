"""Post-freeze correctness adapter for the reproducible v15.1 Engine.

The production dashboard currently reads a static v18.5 score file, while the
v18.5/v17 source modules are absent from the repository.  This adapter therefore
patches the latest reproducible Engine source without touching deploy scores.
It is a candidate for sealed retest, not a production promotion.
"""

from __future__ import annotations

from typing import Iterable

import forecast_engine_v15_1_frozen as _base
from engine_correctness import (
    bolt_rescue_decision,
    parse_tag_tokens,
    positive_tag_strength,
)

# Keep immutable references before installing the correctness adapter.
_ORIGINAL_COMPUTE_INTERACTIONS = _base.compute_interactions

_TOKEN_TO_ENUM_NAME: dict[str, str] = {
    "heart": "HEART",
    "plane": "PLANE",
    "plus": "PLUS",
    "diamond": "DIAMOND",
    "star": "STAR",
    "advert": "ADVERT",
    "study": "STUDY",
    "hand": "HAND",
    "scissors": "SCISSORS",
    "goal": "GOAL",
    "navaratri": "NAVARATRI",
    "maha_shiv": "MAHA_SHIV",
    "new_clothes": "NEW_CLOTHES",
    "luck": "LUCK",
    "new_year": "NEW_YEAR",
    "retro": "RETRO",
    "retro_end": "RETRO_END",
    "ganesh": "GANESH",
    "bolt": "BOLT",
    "trident": "TRIDENT",
    "med": "MED",
    "ekadashi": "EKADASHI",
    "amavasya": "AMAVASYA",
    "purnima": "PURNIMA",
    "surya": "SURYA",
    "eclipse": "ECLIPSE",
}
_ENUM_TO_TOKEN = {
    getattr(_base.T, enum_name): token
    for token, enum_name in _TOKEN_TO_ENUM_NAME.items()
    if hasattr(_base.T, enum_name)
}


def parse_tags(value: object) -> set[_base.T]:
    """Resolve aliases through the canonical table, then map to v15.1 enums."""

    tokens = parse_tag_tokens(value)
    return {
        getattr(_base.T, enum_name)
        for token, enum_name in _TOKEN_TO_ENUM_NAME.items()
        if token in tokens and hasattr(_base.T, enum_name)
    }


def _enum_tokens(tags: Iterable[_base.T]) -> frozenset[str]:
    return frozenset(
        _ENUM_TO_TOKEN[tag]
        for tag in tags
        if tag in _ENUM_TO_TOKEN
    )


def compute_interactions(tags: set[_base.T], kp: float) -> float:
    """Replace heart-only bolt rescue with aggregate positive-strength rescue."""

    delta = float(_ORIGINAL_COMPUTE_INTERACTIONS(tags, kp))
    token_names = _enum_tokens(tags)

    # Remove the legacy special case: BOLT+HEART += 1.5.
    if "bolt" in token_names and "heart" in token_names:
        delta -= 1.5

    # Add the fixed, general rescue.  This neutralizes only BOLT's base weight;
    # all structural pair penalties returned above remain intact.
    delta += bolt_rescue_decision(token_names).rescue
    return round(delta, 10)


def correctness_debug(value: object, kp: float) -> dict[str, object]:
    """Expose deterministic parser and bolt-policy state for audit/UI tests."""

    tags = parse_tags(value)
    token_names = _enum_tokens(tags)
    bolt = bolt_rescue_decision(token_names)
    return {
        "parsed_tokens": sorted(token_names),
        "positive_strength": positive_tag_strength(token_names),
        "bolt": bolt.to_dict(),
        "interaction_delta": compute_interactions(tags, kp),
    }


# Install only when this candidate module is explicitly imported.
_base.parse_tags = parse_tags
_base.compute_interactions = compute_interactions

score_day = _base.score_day
format_day = _base.format_day
T = _base.T
TAG_WEIGHTS = _base.TAG_WEIGHTS

# Preserve the complete public v15.1 API for existing consumers.
for _public_name in dir(_base):
    if not _public_name.startswith("_"):
        globals().setdefault(_public_name, getattr(_base, _public_name))

__all__ = sorted({
    *(_public_name for _public_name in dir(_base) if not _public_name.startswith("_")),
    "parse_tags",
    "compute_interactions",
    "correctness_debug",
    "score_day",
    "format_day",
    "T",
    "TAG_WEIGHTS",
})
