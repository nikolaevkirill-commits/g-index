#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8',errors='ignore')
lines=text.splitlines()

def block(start_pat,end_pat,max_lines=160):
    start=next((i for i,l in enumerate(lines) if re.search(start_pat,l)),None)
    if start is None: return []
    end=min(len(lines),start+max_lines)
    for j in range(start+1,end):
        if re.search(end_pat,lines[j]):
            end=j+1; break
    return [(i+1,lines[i]) for i in range(start,end)]

for name,sp,ep in [
    ('loadExpertOverrides',r'async function loadExpertOverrides\s*\(',r'^\s*}\s*$'),
    ('getEngineScore',r'function getEngineScore\s*\(',r'^\s*}\s*$'),
]:
    print('===',name,'===')
    b=block(sp,ep)
    for n,l in b: print(f'{n}: {l[:700]}')

ov=json.loads(Path('expert_overrides_v3.json').read_text(encoding='utf-8'))
rows=ov.get('overrides',[])
print('=== OVERRIDE COUNTS ===')
print('total',len(rows))
print('verified_true',sum(r.get('verified') is True for r in rows))
print('verified_false',sum(r.get('verified') is False for r in rows))
print('verified_missing',sum('verified' not in r for r in rows))
print('pending_hash',sum('pending' in str(r.get('snippet_hash','')).lower() for r in rows))
print('invalid_hash_shape',sum(not re.fullmatch(r'sha256:[0-9a-fA-F]{16,64}',str(r.get('snippet_hash',''))) for r in rows))
