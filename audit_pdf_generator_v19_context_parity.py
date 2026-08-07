#!/usr/bin/env python3
"""Read-only parity audit: generate_forecast_pdf scoring vs deploy run_forecast v19 semantics."""
from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEPLOY = ROOT / 'deploy'


def load_module(name: str, path: Path, cwd: Path):
    old = Path.cwd(); old_path = list(sys.path)
    try:
        os.chdir(cwd)
        sys.path.insert(0, str(path.parent))
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.chdir(old); sys.path[:] = old_path


def main() -> int:
    eng = load_module('deploy_v19_pdf_parity', DEPLOY/'score_engine_v19_preview.py', DEPLOY)
    pdfgen = load_module('pdfgen_parity', DEPLOY/'generate_forecast_pdf.py', DEPLOY)

    scores_path = ROOT/'engine_scores.json'
    if not scores_path.exists(): scores_path = DEPLOY/'engine_scores.json'
    scores = json.loads(scores_path.read_text(encoding='utf-8'))['scores']
    freeze = json.loads((ROOT/'V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json').read_text(encoding='utf-8'))
    frozen29 = {r['date'] for r in freeze['rows']}

    rows=[]
    for ds,s in sorted(scores.items()):
        if not isinstance(s,dict): continue
        try: kp=float(s.get('kp',2.0))
        except (TypeError,ValueError): kp=2.0
        tag=s.get('tag') or ''
        ti=s.get('cal_tithi'); na=s.get('cal_nakshatra')

        # Current PDF generator semantics: only tag + kp.
        pdf_score = pdfgen.compute_eng_for_day(tag,kp,eng)
        # Operational v19 semantics used by run_forecast: date/tithi/nak passed.
        run_score = eng.score_day_v19(tag,kp,date_str=ds,tithi_n=ti,nakshatra_n=na)
        if pdf_score != run_score:
            rows.append({
                'date':ds,'tag':tag,'kp':kp,'cal_tithi':ti,'cal_nakshatra':na,
                'pdf_generator_score':pdf_score,'run_forecast_v19_score':run_score,
                'delta':run_score-pdf_score,'in_frozen_29':ds in frozen29,
                'empty_tag':not bool(tag.strip()),
            })

    future=[r for r in rows if r['in_frozen_29']]
    sign=lambda x:-1 if x<0 else (1 if x>0 else 0)
    report={
      'schema':'pdf_generator_v19_context_parity_audit_v1',
      'read_only':True,
      'production_changed':False,
      'finding': 'generate_forecast_pdf passes only tag+kp; run_forecast passes date_str+tithi_n+nakshatra_n',
      'counts':{
        'snapshots':len(scores),
        'score_mismatches':len(rows),
        'sign_mismatches':sum(sign(r['pdf_generator_score'])!=sign(r['run_forecast_v19_score']) for r in rows),
        'mismatches_in_frozen_29':len(future),
        'sign_mismatches_in_frozen_29':sum(sign(r['pdf_generator_score'])!=sign(r['run_forecast_v19_score']) for r in future),
        'empty_tag_mismatches':sum(r['empty_tag'] for r in rows),
      },
      'frozen_29_mismatches':future,
      'all_mismatches':rows,
      'decision':'PIPELINE_CORRECTNESS_BUG; DO_NOT_MUTATE_FROZEN_V19_2; FIX PDF GENERATOR SEPARATELY',
    }
    out=ROOT/'ENGINE_PDF_GENERATOR_V19_CONTEXT_PARITY_AUDIT.json'
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['counts'],ensure_ascii=False,indent=2))
    for r in future: print(r)
    if not rows:
        raise SystemExit('expected context mismatch not observed; audit assumptions changed')
    return 0

if __name__=='__main__': raise SystemExit(main())
