import unittest
from datetime import datetime, timezone

from ingest_v19_2_shadow_expert_pdf import (
    first_post_freeze_materialization,
    valid_verified_pdf,
)


def row(score=1, verified=True, pdf='PDF53.pdf', page=1, digest='sha256:abc123'):
    return {
        'expert_eng': score,
        'verified': verified,
        'source_pdf': pdf,
        'source_page': page,
        'snippet_hash': digest,
    }


class ShadowExpertIntakeTests(unittest.TestCase):
    def setUp(self):
        self.t1 = datetime(2026, 8, 7, 13, 0, tzinfo=timezone.utc)
        self.t2 = datetime(2026, 8, 8, 9, 0, tzinfo=timezone.utc)

    def test_preexisting_identical_evidence_is_rejected(self):
        target = row()
        got = first_post_freeze_materialization(
            target, target,
            [('after1', self.t1, target), ('after2', self.t2, target)],
        )
        self.assertIsNone(got)

    def test_new_verified_evidence_accepts_first_exact_postfreeze_commit(self):
        target = row(score=2, digest='sha256:new')
        old = row(score=1, digest='sha256:old')
        got = first_post_freeze_materialization(
            target, old,
            [
                ('wrong', self.t1, old),
                ('first-new', self.t2, target),
            ],
        )
        self.assertEqual(got, ('first-new', self.t2))

    def test_unverified_or_pending_evidence_is_rejected(self):
        self.assertFalse(valid_verified_pdf(row(verified=False)))
        self.assertFalse(valid_verified_pdf(row(digest='pending_pdf53')))
        self.assertIsNone(first_post_freeze_materialization(
            row(verified=False), None, [('x', self.t1, row(verified=False))]
        ))

    def test_changed_score_requires_exact_new_evidence_tuple(self):
        target = row(score=-2, digest='sha256:new-score')
        old = row(score=2, digest='sha256:old-score')
        got = first_post_freeze_materialization(
            target, old,
            [('old-again', self.t1, old), ('new-score', self.t2, target)],
        )
        self.assertEqual(got, ('new-score', self.t2))


if __name__ == '__main__':
    unittest.main()
