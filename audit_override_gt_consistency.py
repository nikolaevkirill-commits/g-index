#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ov=json.loads(Path('expert_overrides_v3.json').read_text(encoding='utf-8')).get('overrides',[])
gt_path=Path('pdf48_ground_truth_v6.json')
if not gt_path.exists():
    gt_path=Path('deploy/pdf48_ground_truth_v6.json')
gt=json.loads(gt_path.read_text(encoding='utf-8')).get('data',{})
by={r['date']:r for r in ov if r.get('date')}
common=sorted(set(by)&set(gt))
conf=[]
for ds in common:
    o=by[ds]
    g=gt[ds]
    ovv=o.get('expert_eng')
    gtv=g.get('score') if isinstance(g,dict) else g
    if ovv!=gtv: conf.append((ds,ovv,gtv,o.get('source_pdf'),o.get('source_page')))
print('gt_path',gt_path)
print('override_rows',len(ov))
print('gt_rows',len(gt))
print('common',len(common))
print('conflicts',len(conf))
for x in conf[:100]: print('CONFLICT',x)
print('override_only',len(set(by)-set(gt)))
print('gt_only',len(set(gt)-set(by)))
