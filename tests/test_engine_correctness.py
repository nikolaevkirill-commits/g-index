from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from engine_correctness import (  # noqa: E402
    BOLT_BASE_PENALTY,
    HEART_EQUIVALENT_STRENGTH,
    assert_token_contract,
    bolt_rescue_decision,
    load_alias_spec,
    normalize_tag_text,
    parse_tag_tokens,
    parse_tags_dict,
    positive_tag_strength,
)


class AliasParityTests(unittest.TestCase):
    CASES = (
        ("Серце", "❤", "heart"),
        ("Книги", "📚", "study"),
        ("Сукня", "👗", "new_clothes"),
        ("Таблетка", "💊", "med"),
        ("Хрест", "⊕", "plus"),
        ("Гучномовець", "📢", "advert"),
        ("Зелена печатка", "🟢", "luck"),
        ("Мішень", "🎯", "goal"),
        ("Вінаяка", "Ганеша", "ganesh"),
        ("Шприц", "💉", "med"),
    )

    def test_verbal_and_symbol_aliases_are_identical(self) -> None:
        for verbal, symbolic, token in self.CASES:
            with self.subTest(verbal=verbal, symbolic=symbolic):
                self.assertEqual(parse_tag_tokens(verbal), frozenset({token}))
                self.assertEqual(parse_tag_tokens(symbolic), frozenset({token}))

    def test_case_unicode_and_whitespace_normalization(self) -> None:
        self.assertEqual(
            parse_tag_tokens("  СЕРЦЕ   +   книги  "),
            frozenset({"heart", "study"}),
        )
        self.assertEqual(normalize_tag_text("  СЕРЦЕ\nКниги "), "серце книги")

    def test_duplicate_aliases_do_not_duplicate_tokens(self) -> None:
        self.assertEqual(
            parse_tag_tokens("Таблетка 💊 Шприц 💉"),
            frozenset({"med"}),
        )

    def test_boolean_view_uses_same_parser(self) -> None:
        parsed = parse_tags_dict("Серце, Книги, Мішень")
        self.assertTrue(parsed["heart"])
        self.assertTrue(parsed["study"])
        self.assertTrue(parsed["goal"])
        self.assertFalse(parsed["bolt"])

    def test_legacy_exclusions_are_preserved(self) -> None:
        self.assertEqual(parse_tag_tokens("День порожні руки"), frozenset({"bolt"}))
        self.assertEqual(parse_tag_tokens("Ме_retro_end"), frozenset({"retro_end"}))

    def test_alias_spec_is_valid_json_and_loadable(self) -> None:
        path = ROOT / "engine_tag_aliases_v1.json"
        with path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        self.assertEqual(raw["_meta"]["version"], "1.0.2")
        self.assertIn("heart", load_alias_spec()["tokens"])

    def test_contract_rejects_silent_token_drift(self) -> None:
        with self.assertRaisesRegex(ValueError, "aliases_without_engine"):
            assert_token_contract({"heart"})


class BoltRescueTests(unittest.TestCase):
    def test_heart_and_bolt_rescues_by_same_general_formula(self) -> None:
        decision = bolt_rescue_decision({"heart", "bolt"})
        self.assertTrue(decision.rescued)
        self.assertEqual(decision.positive_strength, HEART_EQUIVALENT_STRENGTH)
        self.assertEqual(decision.rescue, abs(BOLT_BASE_PENALTY))

    def test_strong_multi_tag_positive_combination_rescues_without_heart(self) -> None:
        tokens = {"plane", "plus", "scissors", "bolt"}
        self.assertEqual(positive_tag_strength(tokens), 2.7)
        self.assertTrue(bolt_rescue_decision(tokens).rescued)

    def test_weak_positive_combination_does_not_rescue(self) -> None:
        decision = bolt_rescue_decision({"plane", "study", "bolt"})
        self.assertFalse(decision.rescued)
        self.assertEqual(decision.rescue, 0.0)

    def test_negative_or_structural_bolt_context_does_not_rescue(self) -> None:
        for tokens in ({"bolt", "retro"}, {"bolt", "med"}, {"bolt"}):
            with self.subTest(tokens=tokens):
                decision = bolt_rescue_decision(tokens)
                self.assertFalse(decision.rescued)
                self.assertEqual(decision.rescue, 0.0)

    def test_positive_tags_without_bolt_never_trigger_rescue(self) -> None:
        decision = bolt_rescue_decision({"heart", "star"})
        self.assertFalse(decision.rescued)
        self.assertEqual(decision.rescue, 0.0)


class V151AdapterIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import forecast_engine_v15_1 as engine
        cls.engine = engine

    def test_canonical_entry_point_uses_alias_parser(self) -> None:
        for verbal, symbolic, _token in AliasParityTests.CASES:
            with self.subTest(verbal=verbal, symbolic=symbolic):
                self.assertEqual(self.engine.parse_tags(verbal), self.engine.parse_tags(symbolic))
                self.assertEqual(self.engine.score_day(verbal, 2.0), self.engine.score_day(symbolic, 2.0))

    def test_every_alias_contract_token_reaches_engine(self) -> None:
        spec = load_alias_spec()
        for token, config in spec["tokens"].items():
            first_alias = config["aliases"][0]
            with self.subTest(token=token, alias=first_alias):
                debug = self.engine.correctness_debug(first_alias, 2.0)
                self.assertIn(token, debug["parsed_tokens"])

    def test_canonical_entry_point_uses_general_bolt_rescue(self) -> None:
        strong = self.engine.correctness_debug("✈ ⊕ ✂ ⚡", 2.0)
        heart = self.engine.correctness_debug("❤ ⚡", 2.0)
        negative = self.engine.correctness_debug("⚡ лікування💊", 2.0)

        self.assertTrue(strong["bolt"]["rescued"])
        self.assertEqual(strong["positive_strength"], 2.7)
        self.assertTrue(heart["bolt"]["rescued"])
        self.assertFalse(negative["bolt"]["rescued"])
        self.assertEqual(negative["interaction_delta"], -1.0)


if __name__ == "__main__":
    unittest.main()
