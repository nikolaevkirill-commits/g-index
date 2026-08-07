import importlib.util
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / 'deploy'


def load_deploy_v19():
    old_cwd = Path.cwd()
    old_path = list(sys.path)
    try:
        os.chdir(DEPLOY)
        sys.path.insert(0, str(DEPLOY))
        path = DEPLOY / 'score_engine_v19_preview.py'
        spec = importlib.util.spec_from_file_location('deploy_v19_support_test', path)
        mod = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.chdir(old_cwd)
        sys.path[:] = old_path


class DeployV19SupportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_deploy_v19()

    def test_support_files_are_loaded(self):
        self.assertEqual(len(self.mod._tithi_prior), 8)
        self.assertEqual(len(self.mod._nak_prior), 2)
        self.assertGreaterEqual(len(self.mod._cal_tags), 10)

    def test_negative_tithi_prior_is_exercised(self):
        # This case exposes the gap in the native 11/11 self-test: with deploy
        # support files tithi 8 returns -1 before the med-solo branch.
        got = self.mod.score_day_v19(
            'Sa_retro_end лікування💊',
            4.0,
            date_str='2025-11-28',
            tithi_n=8,
            nakshatra_n=24,
        )
        self.assertEqual(got, -1)

    def test_positive_tithi_prior_is_exercised(self):
        got = self.mod.score_day_v19(
            '💊',
            2.0,
            date_str='2026-06-26',
            tithi_n=12,
            nakshatra_n=16,
        )
        self.assertEqual(got, 1)


if __name__ == '__main__':
    unittest.main()
