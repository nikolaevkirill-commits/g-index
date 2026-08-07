import unittest

import forecast_engine_v18_5 as frozen
import forecast_engine_v18_5_correctness as fixed


class V185CorrectnessAdapterTests(unittest.TestCase):
    # Primary-workbook verbal aliases and their recovered-v17 canonical forms.
    CASES = [
        ("Серце", "❤", 3.0),
        ("Книги", "📚", 3.0),
        ("Сукня", "Нова одежда", 3.0),
        ("Таблетка", "💊", 2.3),
        ("Шприц", "💊", 2.3),
        ("Хрест", "⊕", 2.4),
        ("Гучномовець", "📢", 3.0),
        ("Зелена печатка", "🟢", 2.7),
        ("Мішень", "🎯", 3.0),
        ("Вінаяка", "Ганеша", 3.0),
    ]

    def test_primary_verbal_aliases_match_canonical_scores(self):
        for verbal, canonical, kp in self.CASES:
            with self.subTest(verbal=verbal):
                self.assertEqual(
                    fixed.score_day(verbal, kp),
                    frozen.score_day(canonical, kp),
                )

    def test_primary_aliases_reach_v17_parser(self):
        for verbal, canonical, _ in self.CASES:
            with self.subTest(verbal=verbal):
                normalized = fixed.canonicalize_tag_text_for_v17(verbal)
                expected = frozen.parse_tags(canonical)
                actual = frozen.parse_tags(normalized)
                for token, is_present in expected.items():
                    if is_present:
                        self.assertTrue(actual[token], f"{verbal} lost token {token}")

    def test_unknown_legacy_text_is_preserved(self):
        source = "Dipavali custom-note XYZ"
        self.assertEqual(fixed.canonicalize_tag_text_for_v17(source), source)

    def test_existing_canonical_score_behavior_is_unchanged(self):
        cases = [
            ("❤ ✈ ⊕", 2.7),
            ("⚡", 4.3),
            ("Амавасья🌑", 3.3),
            ("Екадаші🥛 ромб", 4.0),
            ("Наваратрі ❤ ⚡ Ганеша", 2.3),
            ("", 2.0),
        ]
        for tag, kp in cases:
            with self.subTest(tag=tag, kp=kp):
                self.assertEqual(fixed.score_day(tag, kp), frozen.score_day(tag, kp))

    def test_retro_end_exclusion_survives_adapter(self):
        normalized = fixed.canonicalize_tag_text_for_v17("Ме_ретро_end Хрест")
        parsed = frozen.parse_tags(normalized)
        self.assertTrue(parsed["retro_end"])
        self.assertFalse(parsed["retro"])
        self.assertTrue(parsed["plus"])

    def test_empty_input_is_unchanged(self):
        self.assertEqual(fixed.canonicalize_tag_text_for_v17(""), "")
        self.assertEqual(fixed.score_day("", 2.0), frozen.score_day("", 2.0))


if __name__ == "__main__":
    unittest.main()
