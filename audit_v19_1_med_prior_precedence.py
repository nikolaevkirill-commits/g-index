#!/usr/bin/env python3
"""Read-only audit of the v19.1 med-vs-Panchanga precedence contradiction.

Recovered source says in a comment that med override has priority over Panchanga,
but executes P-v19-5 prior first and returns before _patch_med(). This script
quantifies rows where those two interpretations differ. It does NOT alter the
frozen v19.2 candidate, prospective cohort, production scores, rules, or labels.
"""
from __future__ import annotations

import json
from pathlib import Path

from forecast_engine_v17_0 import parse_tags

ROOT = Path(__file__).resolve().parent
SCORES = ROOT / 'engine_scores.json'
if not SCORES.exists():
    SCORES = ROOT / 'deploy' / 'engine_scores.json'
PRIORS = ROOT / 'deploy' / 'panchanga_sign_priors.json'
if not PRIORS.exists():
    PRIORS = ROOT / 'panchanga_sign_priors.json'
CAL = ROOT / 'deploy' / 'calendar_tags_2025_2026.json'
if not CAL.exists():
    CAL = ROOT / 'calendar_tags_2025_2026.json'
FREEZE = ROOT / 'V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json'
OUT = ROOT / 'ENGINE_V19_1_MED_PRIOR_PRECEDENCE_AUDIT.json'

BLOCKING = [
    'heart','plane','plus','diamond','star','navaratri','dipavali',
    'advert','study','hand','new_clothes','goal','scissors','ganesh',
    'bolt','amavasya','ekadashi','purnima','eclipse',
]


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def enrich(ds: str, tag: str, cal: dict) -> str:
    return str(cal.get(ds, tag)) if not tag and ds in cal else str(tag or '')


def prior_for(snap: dict, ti: dict[int, int], na: dict[int, int]):
    n = snap.get('cal_nakshatra')
    t = snap.get('cal_tithi')
    try:
        if n is not None and int(n) in na:
            return int(na[int(n)]), 'nakshatra'
    except (TypeError, ValueError):
        pass
    try:
        if t is not None and int(t) in ti:
            return int(ti[int(t)]), 'tithi'
    except (TypeError, ValueError):
        pass
    return None, None


def med_solo_qualifies(tag: str, kp: float) -> bool:
    t = parse_tags(tag)
    return bool(t.get('med') and kp < 5 and not any(t.get(k) for k in BLOCKING))


def main() -> int:
    scores = load_json(SCORES, {}).get('scores', {})
    pri = load_json(PRIORS, {})
    ti = {int(k): int(v) for k, v in pri.get('tithi', {}).items()}
    na = {int(k): int(v) for k, v in pri.get('nakshatra_num', {}).items()}
    cal = load_json(CAL, {}).get('tags', {})
    freeze = load_json(FREEZE, {})
    frozen_rows = {r['date']: r for r in freeze.get('rows', [])}

    conflicts = []
    med_neutral_rows = []
    for ds, snap in sorted(scores.items()):
        if not isinstance(snap, dict):
            continue
        try:
            base = int(snap.get('eng'))
            kp = float(snap.get('kp'))
        except (TypeError, ValueError):
            continue
        if base != 0:
            continue
        tag = enrich(ds, snap.get('tag') or '', cal)
        if not med_solo_qualifies(tag, kp):
            continue
        prior, prior_kind = prior_for(snap, ti, na)
        row = {
            'date': ds,
            'tag': tag,
            'kp': kp,
            'raw_v18_5': base,
            'cal_tithi': snap.get('cal_tithi'),
            'cal_nakshatra': snap.get('cal_nakshatra'),
            'prior': prior,
            'prior_kind': prior_kind,
            'source_order_result': prior if prior is not None else 1,
            'documented_med_first_result': 1,
            'differs': prior is not None and prior != 1,
            'in_frozen_29': ds in frozen_rows,
            'frozen_rule': frozen_rows.get(ds, {}).get('rule'),
            'frozen_candidate': frozen_rows.get(ds, {}).get('v19_2_candidate'),
        }
        med_neutral_rows.append(row)
        if row['differs']:
            conflicts.append(row)

    frozen_conflicts = [r for r in conflicts if r['in_frozen_29']]
    report = {
        'schema': 'v19_1_med_prior_precedence_audit_v1',
        'read_only': True,
        'production_changed': False,
        'frozen_candidate_changed': False,
        'issue': {
            'documented_intent': 'P-v19-3 med override has priority over Panchanga',
            'recovered_execution_order': 'P-v19-5 prior returns first; med patch runs only if no prior returned',
        },
        'counts': {
            'scorable_snapshots': len(scores),
            'base0_med_solo_rows': len(med_neutral_rows),
            'rows_with_any_prior': sum(r['prior'] is not None for r in med_neutral_rows),
            'rows_where_source_order_differs_from_documented_med_first': len(conflicts),
            'conflicts_in_frozen_29_cohort': len(frozen_conflicts),
        },
        'conflict_rows': conflicts,
        'frozen_conflict_rows': frozen_conflicts,
        'all_base0_med_solo_rows': med_neutral_rows,
        'decision': 'AUDIT_ONLY_DO_NOT_RETUNE_FROZEN_V19_2',
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print('=== V19.1 MED vs PRIOR PRECEDENCE AUDIT ===')
    for k, v in report['counts'].items():
        print(f'{k}={v}')
    for r in conflicts:
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    print('decision=AUDIT_ONLY_DO_NOT_RETUNE_FROZEN_V19_2')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
