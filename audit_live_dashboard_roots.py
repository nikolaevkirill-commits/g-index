#!/usr/bin/env python3
from __future__ import annotations
import re, json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
TARGETS=[ROOT/'index.html', ROOT/'deploy'/'index.html']
PATTERNS={
 'overrides': re.compile(r"[^'\"\s>]*expert_overrides_v3\.json"),
 'engine_scores': re.compile(r"[^'\"\s>]*engine_scores\.json"),
 'manifest': re.compile(r"[^'\"\s>]*manifest\.json"),
 'service_worker': re.compile(r"[^'\"\s>]*sw\.js"),
 'v19_preview': re.compile(r"v19(?:[_\. -]?(?:preview|1|2))?",re.I),
}
VER_PATTERNS=[
 re.compile(r'CACHE[_A-Z]*\s*=\s*["\']([^"\']+)',re.I),
 re.compile(r'v\d+(?:[._-]\d+){1,4}(?:[-\w]+)?',re.I),
]

def main():
 out=[]
 for p in TARGETS:
  text=p.read_text(encoding='utf-8',errors='ignore')
  rec={'path':str(p.relative_to(ROOT)),'size':p.stat().st_size}
  for k,pat in PATTERNS.items(): rec[k]=sorted(set(m.group(0) for m in pat.finditer(text)))[:50]
  versions=[]
  for pat in VER_PATTERNS:
   versions += [m.group(1) if m.lastindex else m.group(0) for m in pat.finditer(text)]
  rec['version_markers']=sorted(set(versions))[:100]
  out.append(rec)
 print(json.dumps({'schema':'live_dashboard_roots_audit_v1','roots':out},ensure_ascii=False,indent=2))
 return 0
if __name__=='__main__': raise SystemExit(main())
