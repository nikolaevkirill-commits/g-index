#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def sign(x): return -1 if x<0 else (1 if x>0 else 0)

def main():
    freeze=json.loads((ROOT/'V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json').read_text(encoding='utf-8'))
    annual=json.loads((ROOT/'annual_2026_27.json').read_text(encoding='utf-8'))
    pri=json.loads((ROOT/'deploy/panchanga_sign_priors.json').read_text(encoding='utf-8'))
    scores=json.loads((ROOT/'engine_scores.json').read_text(encoding='utf-8'))['scores']
    amap={r['date']:r for r in annual.get('days',[]) if r.get('date')}
    nakmap=pri.get('nakshatra_text_to_num',{})
    tprior={int(k):int(v) for k,v in pri.get('tithi',{}).items()}
    nprior={int(k):int(v) for k,v in pri.get('nakshatra_num',{}).items()}

    rows=[]
    for r in freeze['rows']:
        rule=r.get('rule','')
        if 'P-v19-5' not in rule and 'P3_dashami' not in rule:
            continue
        ds=r['date']; a=amap.get(ds,{}); s=scores.get(ds,{})
        at=a.get('tithi_n'); an=nakmap.get(a.get('nakshatra'))
        st=s.get('cal_tithi'); sn=s.get('cal_nakshatra')
        cf=r['v19_2_candidate']; cf_rule='unchanged'
        if 'P-v19-5' in rule:
            prior=None; src=None
            if an in nprior:
                prior=nprior[an]; src=f'annual_nak{an}'
            elif at in tprior:
                prior=tprior[at]; src=f'annual_tithi{at}'
            if prior is None:
                cf=r['raw_v18_5_corrected']; cf_rule='no_prior_under_annual'
            else:
                cf=prior; cf_rule=src
        elif 'P3_dashami' in rule:
            annual_p3=at in (10,25)
            # Reconstruct only whether P3 remains eligible. Other parts of a combined rule stay frozen.
            if not annual_p3:
                if rule=='v18.8_P3_dashami_plus1':
                    cf=r['raw_v18_5_corrected']
                elif rule.startswith('v18.8_P2_plane_plus1+v18.8_P3_dashami_plus1'):
                    cf=min(3,r['raw_v18_5_corrected']+1)
                elif rule.startswith('v18.8_P3_dashami_plus1+v18.8_P1d_empty_plus2_to_plus1'):
                    # P1d acts on raw +2 -> +1 even without P3.
                    cf=1 if r['raw_v18_5_corrected']==2 else r['raw_v18_5_corrected']
                cf_rule='P3_not_eligible_under_annual'
            else:
                cf_rule='P3_still_eligible_under_annual'
        rows.append({
          'date':ds,'frozen_rule':rule,
          'snapshot_tithi':st,'snapshot_nakshatra':sn,
          'annual_tithi':at,'annual_nakshatra_text':a.get('nakshatra'),'annual_nakshatra_num':an,
          'frozen_candidate':r['v19_2_candidate'],'canonical_context_counterfactual':cf,
          'candidate_changed':cf!=r['v19_2_candidate'],
          'sign_changed_vs_frozen':sign(cf)!=sign(r['v19_2_candidate']),
          'counterfactual_rule':cf_rule,
        })
    changed=[x for x in rows if x['candidate_changed']]
    report={
      'schema':'v19_2_canonical_panchanga_counterfactual_v1',
      'read_only':True,'production_changed':False,'freeze_mutated':False,
      'canonical_contract':'annual_2026_27 noon UTC / dashboard PRIMARY; frozen engine_scores cal_* is informational fallback',
      'counts':{
        'context_dependent_frozen_rows':len(rows),
        'counterfactual_score_changes':len(changed),
        'counterfactual_sign_changes':sum(x['sign_changed_vs_frozen'] for x in changed),
        'prior_rows':sum('P-v19-5' in x['frozen_rule'] for x in rows),
        'p3_rows':sum('P3_dashami' in x['frozen_rule'] for x in rows),
      },
      'rows':rows,
      'decision':'KEEP ORIGINAL FREEZE IMMUTABLE; MARK CONTEXT-INVALID ROWS AND AMEND PROSPECTIVE INTERPRETATION BEFORE N>0'
    }
    (ROOT/'ENGINE_V19_2_CANONICAL_PANCHANGA_COUNTERFACTUAL.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['counts'],indent=2))
    for x in rows: print(x)
    return 0
if __name__=='__main__': raise SystemExit(main())
