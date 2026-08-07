#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

CONFLICT_DATES = [
'2025-04-25','2025-09-02','2025-10-07','2026-01-12','2026-01-19','2026-01-21','2026-01-22','2026-01-24','2026-01-25','2026-03-30','2026-05-16','2026-06-03','2026-06-04'
]
ROOT=Path(__file__).resolve().parent

def load(path): return json.loads(path.read_text(encoding='utf-8'))
root_ov=load(ROOT/'expert_overrides_v3.json')
deploy_ov=load(ROOT/'deploy'/'expert_overrides_v3.json')
gt=load(ROOT/'deploy'/'pdf48_ground_truth_v6.json').get('data',{})

def index(doc): return {r.get('date'):r for r in doc.get('overrides',[]) if r.get('date')}
R=index(root_ov); D=index(deploy_ov)
keys=['date','expert_eng','verified','verified_by_pdf_reading','source_pdf','source_page','snippet_hash','source_sha256','snippet','source','applied_in','category','note','notes']
print('root_meta', {k:root_ov.get(k) for k in ('version','updated_at','window','source')})
print('deploy_meta', {k:deploy_ov.get(k) for k in ('version','updated_at','window','source')})
for ds in CONFLICT_DATES:
    print('\n===',ds,'===')
    for label,row in [('ROOT',R.get(ds)),('DEPLOY',D.get(ds))]:
        if row is None:
            print(label,'MISSING')
        else:
            print(label,{k:row.get(k) for k in keys if k in row})
    print('GT',gt.get(ds))
