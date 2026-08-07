#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def main():
    scores=json.loads((ROOT/'engine_scores.json').read_text(encoding='utf-8'))['scores']
    annual=json.loads((ROOT/'annual_2026_27.json').read_text(encoding='utf-8'))
    amap={r['date']:r for r in annual.get('days',[]) if r.get('date')}
    common=sorted(set(scores)&set(amap))
    rows=[]
    for ds in common:
        s=scores[ds]; a=amap[ds]
        st=s.get('cal_tithi'); at=a.get('tithi_n')
        sn=s.get('cal_nakshatra'); an=a.get('nakshatra')
        # Snapshot cal_nakshatra is numeric; annual is text, compare tithi directly and preserve nak for later mapping.
        if st!=at:
            rows.append({'date':ds,'snapshot_tithi':st,'annual_tithi':at,'snapshot_nakshatra':sn,'annual_nakshatra':an})
    report={
      'schema':'panchanga_context_source_parity_v1',
      'read_only':True,'production_changed':False,
      'common_dates':len(common),
      'tithi_mismatch_count':len(rows),
      'tithi_match_count':len(common)-len(rows),
      'tithi_match_rate':(len(common)-len(rows))/len(common) if common else None,
      'mismatches':rows,
      'decision':'DO_NOT_SWITCH_PIPELINES_TO_ANNUAL UNTIL SOURCE CONTRACT IS RESOLVED'
    }
    (ROOT/'PANCHANGA_CONTEXT_SOURCE_PARITY_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ('common_dates','tithi_mismatch_count','tithi_match_count','tithi_match_rate')},indent=2))
    for r in rows[:100]: print(r)
    return 0
if __name__=='__main__': raise SystemExit(main())
