#!/usr/bin/env python3
"""Read-only audit of support-file resolution for recovered v19.1 copies."""
from __future__ import annotations

import difflib
import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_module(name: str, path: Path, cwd: Path):
    old = Path.cwd()
    old_path = list(sys.path)
    try:
        os.chdir(cwd)
        sys.path.insert(0, str(path.parent))
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.chdir(old)
        sys.path[:] = old_path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    root_path = ROOT / 'score_engine_v19_preview.py'
    deploy_path = ROOT / 'deploy' / 'score_engine_v19_preview.py'
    if not root_path.exists() or not deploy_path.exists():
        raise SystemExit('both v19.1 copies are required')

    root_text = root_path.read_text(encoding='utf-8')
    deploy_text = deploy_path.read_text(encoding='utf-8')
    root_norm = root_text.replace('\r\n', '\n')
    deploy_norm = deploy_text.replace('\r\n', '\n')
    diff = list(difflib.unified_diff(
        root_norm.splitlines(), deploy_norm.splitlines(),
        fromfile='root/score_engine_v19_preview.py',
        tofile='deploy/score_engine_v19_preview.py',
        lineterm='',
    ))

    root_mod = load_module('v191_root_audit', root_path, ROOT)
    deploy_mod = load_module('v191_deploy_audit', deploy_path, deploy_path.parent)

    row = {
        'date': '2025-11-28',
        'tag': 'Sa_retro_end лікування💊',
        'kp': 4.0,
        'tithi': 8,
        'nakshatra': 24,
    }
    root_score = root_mod.score_day_v19(
        row['tag'], row['kp'], date_str=row['date'],
        tithi_n=row['tithi'], nakshatra_n=row['nakshatra'],
    )
    deploy_score = deploy_mod.score_day_v19(
        row['tag'], row['kp'], date_str=row['date'],
        tithi_n=row['tithi'], nakshatra_n=row['nakshatra'],
    )

    report = {
        'schema': 'v19_1_support_path_parity_audit_v2',
        'read_only': True,
        'production_changed': False,
        'source_comparison': {
            'root_sha256': sha256(root_path),
            'deploy_sha256': sha256(deploy_path),
            'normalized_text_equal': root_norm == deploy_norm,
            'unified_diff_lines': len(diff),
            'diff_preview': diff[:80],
        },
        'root': {
            'module': str(root_path.name),
            'support_calendar_exists_next_to_module': (ROOT / 'calendar_tags_2025_2026.json').exists(),
            'support_priors_exists_next_to_module': (ROOT / 'panchanga_sign_priors.json').exists(),
            'calendar_entries_loaded': len(getattr(root_mod, '_cal_tags', {})),
            'tithi_priors_loaded': len(getattr(root_mod, '_tithi_prior', {})),
            'nak_priors_loaded': len(getattr(root_mod, '_nak_prior', {})),
            'sensitive_case_score': root_score,
        },
        'deploy': {
            'module': 'deploy/score_engine_v19_preview.py',
            'support_calendar_exists_next_to_module': (ROOT / 'deploy' / 'calendar_tags_2025_2026.json').exists(),
            'support_priors_exists_next_to_module': (ROOT / 'deploy' / 'panchanga_sign_priors.json').exists(),
            'calendar_entries_loaded': len(getattr(deploy_mod, '_cal_tags', {})),
            'tithi_priors_loaded': len(getattr(deploy_mod, '_tithi_prior', {})),
            'nak_priors_loaded': len(getattr(deploy_mod, '_nak_prior', {})),
            'sensitive_case_score': deploy_score,
        },
        'sensitive_case': row,
        'path_dependent_behavior': root_score != deploy_score,
        'native_self_test_gap': '11/11 native cases do not exercise a negative Panchanga prior that conflicts with med solo',
        'decision': 'DO_NOT_COPY_SUPPORT_FILES_OR_CHANGE_FROZEN_CANDIDATE; fix test/provenance labeling only',
    }

    out = ROOT / 'ENGINE_V19_1_SUPPORT_PATH_PARITY_AUDIT.json'
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

    if report['deploy']['tithi_priors_loaded'] == 0:
        raise SystemExit('deploy v19.1 failed to load its support priors')
    if report['root']['tithi_priors_loaded'] != 0:
        raise SystemExit('root support semantics unexpectedly changed; provenance audit must be updated')
    if not report['path_dependent_behavior']:
        raise SystemExit('expected path-sensitive case no longer differs; audit needs review')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
