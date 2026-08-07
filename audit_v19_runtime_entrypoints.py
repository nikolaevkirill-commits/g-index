#!/usr/bin/env python3
"""Read-only audit of actual v19 runtime entrypoints and default input completeness."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent
DEPLOY=ROOT/'deploy'

TEXT_EXT={'.py','.yml','.yaml','.md','.bat','.ps1','.js','.html','.json','.txt'}
NEEDLES=['run_forecast.py','generate_forecast_pdf.py','score_engine_v19_preview']


def scan_refs():
    hits={n:[] for n in NEEDLES}
    skip={'audit_v19_runtime_entrypoints.py'}
    for p in ROOT.rglob('*'):
        if not p.is_file() or '.git' in p.parts or p.name in skip: continue
        if p.suffix.lower() not in TEXT_EXT: continue
        try: text=p.read_text(encoding='utf-8',errors='ignore')
        except Exception: continue
        for n in NEEDLES:
            if n in text:
                for i,line in enumerate(text.splitlines(),1):
                    if n in line:
                        hits[n].append({'path':p.relative_to(ROOT).as_posix(),'line':i,'text':line.strip()[:300]})
    return hits


def exists(name): return (DEPLOY/name).exists()


def main():
    refs=scan_refs()
    default_inputs={
      'deploy_future_kp':exists('future_kp.json'),
      'deploy_expert_overrides':exists('expert_overrides_v3.json'),
      'deploy_excel_fixed':exists('prognoz_2025_2026_4_FIXED.xlsx'),
      'deploy_excel_plain':exists('prognoz_2025_2026_4.xlsx'),
      'deploy_annual':exists('annual_2026_27.json'),
      'root_annual':(ROOT/'annual_2026_27.json').exists(),
      'deploy_priors':exists('panchanga_sign_priors.json'),
      'deploy_calendar_tags':exists('calendar_tags_2025_2026.json'),
    }

    cmd=['python',str(DEPLOY/'run_forecast.py'),'--from','2026-08-07','--days','1','--no-fetch']
    p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)
    cli={'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr}

    produced=[]
    for ext in ('csv','md','json'):
        f=DEPLOY/f'forecast_2026-08-07_2026-08-07.{ext}'
        if f.exists():
            produced.append(f.relative_to(ROOT).as_posix())
    parsed=None
    jf=DEPLOY/'forecast_2026-08-07_2026-08-07.json'
    if jf.exists():
        try: parsed=json.loads(jf.read_text(encoding='utf-8'))
        except Exception: pass

    report={
      'schema':'v19_runtime_entrypoint_audit_v1',
      'read_only':True,
      'production_changed':False,
      'references':refs,
      'default_input_presence':default_inputs,
      'default_cli_probe':{
        'command':' '.join(cmd),
        'returncode':p.returncode,
        'stdout':p.stdout,
        'stderr':p.stderr,
        'produced_ephemeral_files':produced,
        'parsed_day': (parsed or {}).get('days',[None])[0] if parsed and parsed.get('days') else None,
      },
      'interpretation':{
        'default_run_forecast_has_excel_tags': default_inputs['deploy_excel_fixed'] or default_inputs['deploy_excel_plain'],
        'default_run_forecast_has_annual_panchanga': default_inputs['deploy_annual'],
        'support_priors_exist_but_need_tithi_nak_inputs': default_inputs['deploy_priors'],
      },
    }
    out=ROOT/'ENGINE_V19_RUNTIME_ENTRYPOINT_AUDIT.json'
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['default_input_presence'],ensure_ascii=False,indent=2))
    print('--- CLI ---')
    print(p.stdout)
    print(p.stderr)
    print('--- references ---')
    for k,v in refs.items(): print(k,len(v),v[:20])
    return 0

if __name__=='__main__': raise SystemExit(main())
