#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
rows=json.loads(Path('expert_overrides_v3.json').read_text(encoding='utf-8')).get('overrides',[])
out=[]
for r in rows:
    hash_ok=bool(re.fullmatch(r'sha256:[0-9a-fA-F]{16,64}',str(r.get('snippet_hash',''))))
    source_sha_ok=bool(re.fullmatch(r'[0-9a-fA-F]{64}',str(r.get('source_sha256',''))))
    pdf_reading_ok=(r.get('verified_by_pdf_reading') is True and ((isinstance(r.get('snippet'),str) and len(r['snippet'])>0) or source_sha_ok))
    source_pdf_ok=isinstance(r.get('source_pdf'),str) and len(r['source_pdf'])>0
    effective=(r.get('verified') is True and source_pdf_ok and (hash_ok or pdf_reading_ok))
    out.append((r.get('date'),hash_ok,pdf_reading_ok,effective,r.get('snippet_hash'),r.get('source_pdf')))
print('total',len(out))
print('hash_ok',sum(x[1] for x in out))
print('pdf_reading_ok',sum(x[2] for x in out))
print('effective_verified',sum(x[3] for x in out))
print('hash_only',sum(x[1] and not x[2] for x in out))
print('manual_only',sum(x[2] and not x[1] for x in out))
print('both',sum(x[1] and x[2] for x in out))
failed=[x for x in out if not x[3]]
print('failed_count',len(failed))
for x in failed[:50]: print('FAILED',x)
