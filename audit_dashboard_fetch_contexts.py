#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parent
for rel in ('index.html','deploy/index.html'):
    p=ROOT/rel; lines=p.read_text(encoding='utf-8',errors='ignore').splitlines()
    print(f'=== {rel} ===')
    for needle in ('engine_scores.json','expert_overrides_v3.json','manifest.json','serviceWorker.register'):
        print(f'-- {needle} --')
        hits=[i for i,l in enumerate(lines) if needle in l]
        for i in hits:
            lo=max(0,i-4); hi=min(len(lines),i+5)
            print(f'context L{i+1}:')
            for j in range(lo,hi): print(f'{j+1}: {lines[j][:500]}')
