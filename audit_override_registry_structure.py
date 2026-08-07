#!/usr/bin/env python3
from __future__ import annotations
import json
from collections import Counter,defaultdict
from datetime import date,datetime
from pathlib import Path
p=Path('expert_overrides_v3.json')
d=json.loads(p.read_text(encoding='utf-8'))
rows=d.get('overrides',[])
by=defaultdict(list)
for i,r in enumerate(rows): by[str(r.get('date'))].append((i,r))
dates=sorted(k for k in by if len(k)==10 and k[4]=='-' and k[7]=='-')
updated=str(d.get('updated_at',''))[:10]
print('version',d.get('version'))
print('metadata_window',d.get('window'))
print('updated_at',d.get('updated_at'))
print('rows',len(rows))
print('unique_dates',len(by))
print('duplicate_dates',sum(len(v)>1 for v in by.values()))
print('duplicate_extra_rows',sum(max(0,len(v)-1) for v in by.values()))
print('min_date',dates[0] if dates else None)
print('max_date',dates[-1] if dates else None)
print('dates_after_updated_at',sum(k>updated for k in dates) if updated else None)
print('rows_after_updated_at',sum(str(r.get('date',''))>updated for r in rows) if updated else None)
print('future_vs_2026_08_07_unique',sum(k>'2026-08-07' for k in dates))
print('future_vs_2026_08_07_rows',sum(str(r.get('date',''))>'2026-08-07' for r in rows))
print('source_pdf_top',Counter(str(r.get('source_pdf','')) for r in rows).most_common(20))
print('category_top',Counter(str(r.get('category','')) for r in rows).most_common(20))
print('applied_in_top',Counter(str(r.get('applied_in','')) for r in rows).most_common(20))
print('date_multiplicity_top',sorted(((k,len(v)) for k,v in by.items()),key=lambda x:(-x[1],x[0]))[:30])
for k,v in sorted(by.items()):
    if len(v)>1:
        vals=[(i,r.get('expert_eng'),r.get('verified'),r.get('source_pdf'),r.get('snippet_hash')) for i,r in v]
        if len(set(x[1] for x in vals))>1:
            print('CONFLICT_DUP',k,vals)
