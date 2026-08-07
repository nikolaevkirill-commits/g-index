#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
from collections import defaultdict

ROOT=Path(__file__).resolve().parent
FREEZE=ROOT/'V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json'
AMEND=ROOT/'V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json'
LEDGER=ROOT/'V19_2_PROSPECTIVE_SHADOW_OBSERVATIONS_v1.json'
OUT=ROOT/'V19_2_PROSPECTIVE_SHADOW_EVALUATION_v2.json'

def load(p, default=None):
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else default

def sign(v): return 1 if v>0 else -1 if v<0 else 0

def metric(rows,key):
    n=len(rows)
    if not n: return {'n':0,'exact':None,'within1':None,'sign':None}
    return {
        'n':n,
        'exact':sum(r[key]==r['value'] for r in rows)/n,
        'within1':sum(abs(r[key]-r['value'])<=1 for r in rows)/n,
        'sign':sum(sign(r[key])==sign(r['value']) for r in rows)/n,
    }

def paired(rows):
    wins=losses=ties=0
    for r in rows:
        b=sign(r['baseline'])==sign(r['value'])
        c=sign(r['candidate'])==sign(r['value'])
        if c and not b: wins+=1
        elif b and not c: losses+=1
        else: ties+=1
    return {'candidate_wins':wins,'candidate_losses':losses,'ties':ties,'n':len(rows)}

def enrich(obs,cohort):
    f=cohort[obs['date']]
    return {**obs,'baseline':f['production_baseline'],'candidate':f['v19_2_candidate'],'rule':f['rule'],'frozen_sign_flip':bool(f.get('sign_flip'))}

def summarize(rows,valid_dates,quarantine):
    original=[r for r in rows if r['frozen_sign_flip']]
    valid=[r for r in original if r['date'] in valid_dates]
    quarantined=[r for r in original if r['date'] in quarantine]
    return {
        'observed_rows':len(rows),
        'all_observed':{'baseline':metric(rows,'baseline'),'candidate':metric(rows,'candidate')},
        'original_frozen_12_descriptive':{
            'baseline':metric(original,'baseline'),'candidate':metric(original,'candidate'),'paired_sign':paired(original),
        },
        'confirmatory_context_valid_9':{
            'baseline':metric(valid,'baseline'),'candidate':metric(valid,'candidate'),'paired_sign':paired(valid),
        },
        'quarantined_context_invalid_3_descriptive':{
            'baseline':metric(quarantined,'baseline'),'candidate':metric(quarantined,'candidate'),'paired_sign':paired(quarantined),
        },
        'coverage':{
            'all':f"{len(rows)}/29",'original_sign':f"{len(original)}/12",'confirmatory_sign':f"{len(valid)}/9",'quarantine':f"{len(quarantined)}/3",
        },
    }

def main():
    freeze=load(FREEZE); amend=load(AMEND); ledger=load(LEDGER,{'observations':[]})
    cohort={r['date']:r for r in freeze['rows']}
    valid_dates=set(amend['confirmatory_context_valid_sign_flip_dates'])
    quarantine=set(amend['quarantined_context_invalid_dates'])
    streams={'expert_pdf':[],'real_outcome':[]}
    seen=set()
    for o in ledger.get('observations',[]):
        ds=o.get('date'); kind=o.get('kind')
        if ds not in cohort: raise ValueError(f'outside frozen cohort: {ds}')
        if kind not in streams: raise ValueError(f'invalid kind: {kind}')
        key=(ds,kind)
        if key in seen: raise ValueError(f'duplicate observation: {key}')
        seen.add(key)
        if o.get('frozen_production_baseline')!=cohort[ds]['production_baseline']: raise ValueError(f'baseline mutation {ds}')
        if o.get('frozen_v19_2_candidate')!=cohort[ds]['v19_2_candidate']: raise ValueError(f'candidate mutation {ds}')
        streams[kind].append(enrich(o,cohort))
    report={
        'schema':'v19_2_prospective_shadow_evaluation_v2',
        'state':'FROZEN_PROSPECTIVE_SHADOW',
        'production_formula_changed':False,
        'promotion_allowed':False,
        'context_amendment':'V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json',
        'cohort_rows':29,
        'original_frozen_sign_flip_rows':12,
        'confirmatory_context_valid_sign_flip_rows':9,
        'quarantined_context_invalid_sign_flip_rows':3,
        'policy':{'streams_never_pooled':True,'quarantine_outcome_independent':True,'no_retuning':True,'automatic_promotion':False},
        'streams':{k:summarize(v,valid_dates,quarantine) for k,v in streams.items()},
    }
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('cohort_rows','original_frozen_sign_flip_rows','confirmatory_context_valid_sign_flip_rows','quarantined_context_invalid_sign_flip_rows')},indent=2))
    for k,s in report['streams'].items(): print(k,s['coverage'])
    return 0

if __name__=='__main__': raise SystemExit(main())
