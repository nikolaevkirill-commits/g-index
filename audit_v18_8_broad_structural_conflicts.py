#!/usr/bin/env python3
"""Read-only semantic risk audit for exposed v18.8 P2/P3 sign flips.

The frozen shadow is immutable. This script only asks whether broad generic
+1 rules are flipping sign in rows that simultaneously contain structural
negative contexts recognized elsewhere in the recovered Engine lineage.
"""
from __future__ import annotations

import json
from pathlib import Path

from engine_correctness import parse_tag_tokens

ROOT = Path(__file__).resolve().parent
ATTR = ROOT / 'ENGINE_V19_2_EXPOSED_RULE_ATTRIBUTION.json'
SCORES = ROOT / 'engine_scores.json'
if not SCORES.exists():
    SCORES = ROOT / 'deploy' / 'engine_scores.json'
OUT = ROOT / 'ENGINE_V18_8_BROAD_STRUCTURAL_RISK_AUDIT.json'

# Structural contexts that recovered v17/v19.1 treats specially rather than as
# ordinary additive positive/negative tags. This is an audit taxonomy only.
STRUCTURAL_TOKENS = {
    'bolt','ganesh','ekadashi','amavasya','purnima','eclipse','trident',
    'surya','retro','retro_end','navaratri','med',
}
STRUCTURAL_CAL_SYMBOLS = {
    'bolt','amavasya','purnima','eclipse','saturn_retro','mercury_retro',
    'jupiter_retro','venus_retro','mars_retro','surya','ganesh','ekadashi',
}


def sign(v: int) -> int:
    return 1 if v > 0 else -1 if v < 0 else 0


def main() -> int:
    attr = json.loads(ATTR.read_text(encoding='utf-8'))
    scores = json.loads(SCORES.read_text(encoding='utf-8')).get('scores', {})

    broad = []
    for row in attr.get('rows', []):
        rule = str(row.get('rule') or '')
        if not row.get('effective_sign_flip'):
            continue
        if 'v18.8_P2_' not in rule and 'v18.8_P3_' not in rule:
            continue
        ds = row['date']
        snap = scores.get(ds, {}) if isinstance(scores.get(ds, {}), dict) else {}
        tag = str(row.get('overlay_tag') or row.get('tag') or '')
        tokens = set(parse_tag_tokens(tag))
        cal_symbols = set(snap.get('cal_symbols') or [])
        token_hits = sorted(tokens & STRUCTURAL_TOKENS)
        cal_hits = sorted(cal_symbols & STRUCTURAL_CAL_SYMBOLS)
        broad.append({
            'date': ds,
            'rule': rule,
            'old': row.get('effective_old'),
            'new': row.get('effective_new'),
            'tag': tag,
            'cal_tithi': snap.get('cal_tithi'),
            'cal_nakshatra': snap.get('cal_nakshatra'),
            'tokens': sorted(tokens),
            'cal_symbols': sorted(cal_symbols),
            'structural_token_hits': token_hits,
            'structural_cal_hits': cal_hits,
            'has_structural_context': bool(token_hits or cal_hits),
        })

    risky = [r for r in broad if r['has_structural_context']]
    report = {
        'schema': 'v18_8_broad_structural_risk_audit_v1',
        'read_only': True,
        'production_changed': False,
        'frozen_candidate_changed': False,
        'taxonomy_note': 'Structural hit is a review flag, not proof the candidate score is wrong.',
        'counts': {
            'broad_p2_p3_sign_flip_rows': len(broad),
            'rows_with_structural_context': len(risky),
            'rows_without_structural_context': len(broad) - len(risky),
        },
        'rows': broad,
        'structural_review_rows': risky,
        'decision': 'AUDIT_ONLY_DO_NOT_RETUNE_FROZEN_V19_2',
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('=== V18.8 BROAD STRUCTURAL RISK AUDIT ===')
    for k,v in report['counts'].items():
        print(f'{k}={v}')
    for r in broad:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    print('decision=AUDIT_ONLY_DO_NOT_RETUNE_FROZEN_V19_2')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
