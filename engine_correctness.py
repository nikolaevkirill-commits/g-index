"""Post-freeze Engine correctness helpers.

This module intentionally contains no GT/PDF labels, fitted coefficients or
case-by-case dates.  It provides two deterministic contracts:

1. one canonical alias table for parsing expert verbal labels and emoji;
2. an aggregate-strength rescue for the bolt penalty.

Bolt rescue formula
-------------------
P = Σ max(0, w_t), for all parsed tokens t except ``bolt``.
If ``bolt`` is present and P >= w_heart, rescue = |w_bolt|, else rescue = 0.

The rescue only neutralizes the generic bolt base penalty.  Structural
negative interactions (for example bolt+med or bolt+navaratri) remain in the
calling Engine and are not erased here.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from functools import lru_cache
import json
from pathlib import Path
import re
from typing import Iterable, Mapping, MutableMapping
import unicodedata

ALIAS_SPEC_PATH = Path(__file__).with_name("engine_tag_aliases_v1.json")

# Frozen pre-rescue positive weights from the reproducible v15.1 Engine.
# Non-positive/structural tokens are omitted because max(0, weight) = 0.
DEFAULT_POSITIVE_WEIGHTS: dict[str, float] = {
    "heart": 2.5,
    "plane": 1.0,
    "plus": 1.2,
    "diamond": 1.5,
    "star": 2.5,
    "advert": 1.2,
    "study": 0.3,
    "hand": 0.8,
    "scissors": 0.5,
    "goal": 0.5,
    "navaratri": 1.5,
    "maha_shiv": 0.8,
    "new_clothes": 1.5,
    "luck": 0.3,
    "new_year": 0.2,
}

HEART_EQUIVALENT_STRENGTH = DEFAULT_POSITIVE_WEIGHTS["heart"]
BOLT_BASE_PENALTY = -2.2


@dataclass(frozen=True)
class BoltRescueDecision:
    """Auditable result of the fixed bolt rescue policy."""

    bolt_present: bool
    positive_strength: float
    threshold: float
    rescue: float
    rescued: bool

    def to_dict(self) -> dict[str, float | bool]:
        return asdict(self)


def normalize_tag_text(value: object) -> str:
    """Normalize without deleting semantic symbols or punctuation."""

    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKC", text).casefold()
    return re.sub(r"\s+", " ", text).strip()


@lru_cache(maxsize=4)
def load_alias_spec(path: str | Path = ALIAS_SPEC_PATH) -> Mapping[str, object]:
    """Load and minimally validate the canonical alias specification."""

    resolved = Path(path)
    with resolved.open("r", encoding="utf-8") as handle:
        spec = json.load(handle)

    tokens = spec.get("tokens")
    if not isinstance(tokens, MutableMapping) or not tokens:
        raise ValueError(f"Alias spec {resolved} has no non-empty 'tokens' map")

    for token, config in tokens.items():
        if not isinstance(token, str) or not token:
            raise ValueError(f"Invalid token key in {resolved}: {token!r}")
        if not isinstance(config, MutableMapping):
            raise ValueError(f"Token {token!r} must map to an object")
        aliases = config.get("aliases")
        if not isinstance(aliases, list) or not aliases:
            raise ValueError(f"Token {token!r} has no aliases")
        if any(not isinstance(alias, str) or not normalize_tag_text(alias) for alias in aliases):
            raise ValueError(f"Token {token!r} contains an invalid alias")

    return spec


def assert_token_contract(
    supported_tokens: Iterable[str],
    *,
    spec: Mapping[str, object] | None = None,
) -> None:
    """Fail fast when Engine and alias-contract token sets diverge.

    Silent token dropping is forbidden: every alias token must reach Engine,
    and every Engine token must have aliases for validator/UI parity.
    """

    active_spec = load_alias_spec() if spec is None else spec
    token_map = active_spec.get("tokens")
    if not isinstance(token_map, Mapping):
        raise ValueError("Alias spec 'tokens' must be a mapping")

    alias_tokens = {str(token) for token in token_map}
    engine_tokens = {str(token) for token in supported_tokens}
    aliases_without_engine = sorted(alias_tokens - engine_tokens)
    engine_without_aliases = sorted(engine_tokens - alias_tokens)
    if aliases_without_engine or engine_without_aliases:
        raise ValueError(
            "Engine/alias token contract mismatch: "
            f"aliases_without_engine={aliases_without_engine}; "
            f"engine_without_aliases={engine_without_aliases}"
        )


def parse_tag_tokens(
    value: object,
    *,
    spec: Mapping[str, object] | None = None,
) -> frozenset[str]:
    """Return canonical token names for verbal labels and emoji/symbols.

    Matching is deterministic normalized-substring matching.  Exclusions are
    evaluated per token before aliases, preserving legacy guards such as
    ``порожні руки`` not implying ``hand`` and ``retro_end`` not implying
    ``retro``.
    """

    normalized = normalize_tag_text(value)
    if not normalized:
        return frozenset()

    active_spec = load_alias_spec() if spec is None else spec
    token_map = active_spec["tokens"]
    if not isinstance(token_map, Mapping):
        raise ValueError("Alias spec 'tokens' must be a mapping")

    parsed: set[str] = set()
    for token, raw_config in token_map.items():
        if not isinstance(raw_config, Mapping):
            raise ValueError(f"Token {token!r} must map to an object")

        excludes = tuple(
            normalize_tag_text(item)
            for item in raw_config.get("exclude_if_any", [])
            if normalize_tag_text(item)
        )
        if excludes and any(item in normalized for item in excludes):
            continue

        aliases = tuple(
            normalize_tag_text(item)
            for item in raw_config.get("aliases", [])
            if normalize_tag_text(item)
        )
        if any(alias in normalized for alias in aliases):
            parsed.add(str(token))

    return frozenset(parsed)


def parse_tags_dict(
    value: object,
    *,
    spec: Mapping[str, object] | None = None,
) -> dict[str, bool]:
    """Boolean parser view for UI/validator adapters."""

    active_spec = load_alias_spec() if spec is None else spec
    token_map = active_spec["tokens"]
    if not isinstance(token_map, Mapping):
        raise ValueError("Alias spec 'tokens' must be a mapping")
    parsed = parse_tag_tokens(value, spec=active_spec)
    return {str(token): str(token) in parsed for token in token_map}


def positive_tag_strength(
    tokens: Iterable[str],
    *,
    weights: Mapping[str, float] = DEFAULT_POSITIVE_WEIGHTS,
) -> float:
    """Aggregate only positive token evidence, excluding bolt itself."""

    unique = {str(token) for token in tokens}
    strength = sum(
        max(0.0, float(weights.get(token, 0.0)))
        for token in unique
        if token != "bolt"
    )
    return round(strength, 10)


def bolt_rescue_decision(
    tokens: Iterable[str],
    *,
    weights: Mapping[str, float] = DEFAULT_POSITIVE_WEIGHTS,
    threshold: float = HEART_EQUIVALENT_STRENGTH,
    bolt_penalty: float = BOLT_BASE_PENALTY,
) -> BoltRescueDecision:
    """Apply the frozen aggregate-strength bolt rescue policy."""

    unique = {str(token) for token in tokens}
    bolt_present = "bolt" in unique
    strength = positive_tag_strength(unique, weights=weights)
    rescued = bool(bolt_present and strength >= float(threshold))
    rescue = abs(float(bolt_penalty)) if rescued else 0.0
    return BoltRescueDecision(
        bolt_present=bolt_present,
        positive_strength=strength,
        threshold=float(threshold),
        rescue=round(rescue, 10),
        rescued=rescued,
    )
