import unittest

from sealed_replay_v19_2_correctness import (
    corrected_v19_1,
    corrected_v18_8,
    corrected_reconstructed,
)


class V192CorrectnessTests(unittest.TestCase):
    def setUp(self):
        self.tithi_prior = {}
        self.nak_prior = {}

    def test_verbal_plane_alias_reaches_v19_action_rescue(self):
        got = corrected_v19_1(
            -3, "⚡ Подорожі Хрест", 2.0, None, None,
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, 2)

    def test_verbal_plane_alias_reaches_v18_8_p2(self):
        got = corrected_v18_8(0, "Подорожі", 3.0, None, [])
        self.assertEqual(got, 2)

    def test_aggregate_nonheart_bolt_rescue(self):
        # plus 1.0 + diamond 1.5 = heart-equivalent 2.5
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ Хрест Ромб", 3.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, -1)
        self.assertTrue(dbg["bolt_rescued"])
        self.assertEqual(dbg["positive_strength"], 2.5)

    def test_weak_positive_bolt_not_rescued(self):
        # plus 1.0 + study 0.5 < 2.5
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ Хрест Книги", 3.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, -3)
        self.assertFalse(dbg["bolt_rescued"])

    def test_structural_ekadashi_blocks_rescue(self):
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ Хрест Ромб Екадаші", 3.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, -3)
        self.assertFalse(dbg["bolt_rescued"])
        self.assertIn("ekadashi", dbg["structural_blockers"])

    def test_structural_ganesh_blocks_rescue(self):
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ Хрест Ромб Вінаяка", 3.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, -3)
        self.assertFalse(dbg["bolt_rescued"])
        self.assertIn("ganesh", dbg["structural_blockers"])

    def test_heart_verbal_alias_recovers_generic_bolt_collapse(self):
        # Legacy raw can be -3 when the verbal alias was not parsed.
        # The fixed contract sees Серце as heart=2.5 and neutralizes only +2.
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ Серце", 3.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, -1)
        self.assertTrue(dbg["bolt_rescued"])

    def test_existing_explicit_v19_rescue_wins_unchanged(self):
        got, _, dbg = corrected_reconstructed(
            -3, "⚡ ✈ ⊕", 2.0, None, None, [],
            self.tithi_prior, self.nak_prior,
        )
        self.assertEqual(got, 2)
        self.assertFalse(dbg["bolt_rescued"])


if __name__ == "__main__":
    unittest.main()
