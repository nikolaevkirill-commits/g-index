#!/usr/bin/env python3
"""Export historical records for inspection ONLY; never overwrite production inputs."""
import argparse, hashlib, json, pathlib, subprocess
CUTOFF='2026-11-19'
FILES=('consumer_cloud/forecast.json','consumer_cloud/final_score_decisions.json','INDEPENDENT_FORECAST_FEED_v1.json')
def sha(b): return hashlib.sha256(b).hexdigest()
def emit(p,obj):
    with p.open('x',encoding='utf-8') as f: json.dump(obj,f,sort_keys=True,indent=2,ensure_ascii=True); f.write('\n')
def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('repo',type=pathlib.Path);a.add_argument('out',type=pathlib.Path);a.add_argument('--source-commit',required=True);a.add_argument('--source-manifest',type=pathlib.Path,required=True);v=a.parse_args()
    expected=json.loads(v.source_manifest.read_text(encoding='utf-8-sig')); out=v.out.resolve();root=v.repo.resolve()
    if root==out or root in out.parents: raise ValueError('output must be outside checkout')
    if subprocess.check_output(['git','rev-parse',v.source_commit+'^{commit}'],cwd=root).decode().strip()!=v.source_commit: raise ValueError('full exact commit required')
    blobs={}
    for p in FILES:
        raw=subprocess.check_output(['git','show',v.source_commit+':'+p],cwd=root)
        if sha(raw)!=expected[p]: raise ValueError('source SHA256 mismatch: '+p)
        blobs[p]=json.loads(raw)
    if out.exists(): raise ValueError('output already exists; historical exports are immutable')
    out.mkdir(parents=True); rows=[]
    for name,data in blobs.items():
        if name.endswith('final_score_decisions.json'):
            obj={'schema':data['schema']}
            for key in ('decisions','scoped_decisions'):
                obj[key]=[r for r in data.get(key,[]) if '2026-11-01'<=r.get('date','')<CUTOFF]
        else:
            obj={'schema':data['schema'],'days':{k:r for k,r in data['days'].items() if '2026-11-01'<=k<CUTOFF}}
        target=name.replace('/','__');emit(out/target,obj)
        rows.append({'path':target,'sha256':sha((out/target).read_bytes()),'dates':sorted(obj.get('days',{})) if 'days' in obj else sorted({r['date'] for k in ('decisions','scoped_decisions') for r in obj[k]})})
    emit(out/'HISTORICAL_MANIFEST.json',{'schema':'fp575-historical-inspection-v1','source_commit':v.source_commit,'source_sha256':expected,'exclusive_cutoff':CUTOFF,'coverage':'Inspection only; schema intentionally removes delivery metadata. Not a gate input replacement. Original #43/#47 require records through 22 November. No 105/105 claim.','files':rows})
    print('Historical export created; no record values printed.')
if __name__=='__main__': main()
