#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def main():
    freeze=json.loads((ROOT/'V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json').read_text(encoding='utf-8'))
    amend=json.loads((ROOT/'V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json').read_text(encoding='utf-8'))
    sign_dates=[r['date'] for r in freeze['rows'] if r.get('sign_flip')]
    q=set(amend['quarantined_context_invalid_dates'])
    confirm=amend['confirmatory_context_valid_sign_flip_dates']
    assert sign_dates==amend['original_frozen_sign_flip_dates'], (sign_dates,amend['original_frozen_sign_flip_dates'])
    assert q=={'2026-08-27','2026-08-30','2026-10-23'}
    assert confirm==[d for d in sign_dates if d not in q]
    assert amend['counts']=={'original_sign_flips':12,'quarantined_context_invalid':3,'confirmatory_context_valid':9}
    assert amend['created_before_first_prospective_observation'] is True
    obs=ROOT/'V19_2_PROSPECTIVE_SHADOW_OBSERVATIONS_v1.json'
    if obs.exists():
        doc=json.loads(obs.read_text(encoding='utf-8'))
        assert len(doc.get('observations',[]))==0, 'amendment validation assumes n=0 at creation'
    print('context validity amendment PASS')
    print('sign_dates=',sign_dates)
    print('confirmatory=',confirm)
    return 0
if __name__=='__main__': raise SystemExit(main())
