#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
DEPLOY=ROOT/'deploy'
RUNTIME_EXT={'.json','.py','.js','.html'}
IGNORE_PREFIX={'.github'}

def sha(p:Path)->str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    rows=[]
    if not DEPLOY.exists():
        raise RuntimeError('deploy dir missing')
    root_files={p.name:p for p in ROOT.iterdir() if p.is_file() and p.suffix.lower() in RUNTIME_EXT}
    deploy_files={p.name:p for p in DEPLOY.iterdir() if p.is_file() and p.suffix.lower() in RUNTIME_EXT}
    for name in sorted(set(root_files)&set(deploy_files)):
        a,b=root_files[name],deploy_files[name]
        sa,sb=sha(a),sha(b)
        rows.append({
            'name':name,'root_path':str(a.relative_to(ROOT)),'deploy_path':str(b.relative_to(ROOT)),
            'root_sha256':sa,'deploy_sha256':sb,'same_bytes':sa==sb,
            'root_size':a.stat().st_size,'deploy_size':b.stat().st_size,
        })
    report={
        'schema':'duplicate_runtime_sources_audit_v1',
        'duplicate_basenames':len(rows),
        'divergent':sum(not r['same_bytes'] for r in rows),
        'identical':sum(r['same_bytes'] for r in rows),
        'rows':rows,
    }
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0

if __name__=='__main__': raise SystemExit(main())
