#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
MAN=ROOT/'data_manifest.json'
MAP={
 'expert_overrides':'expert_overrides_v3.json',
 'expert_calc':'expert_calc_scores.json',
 'future_kp':'future_kp.json',
 'engine_scores':'engine_scores.json',
}
ALGS=('md5','sha1','sha256')

def digest(data:bytes,alg:str)->str:
 return getattr(hashlib,alg)(data).hexdigest().upper()

def main():
 m=json.loads(MAN.read_text(encoding='utf-8'))
 out=[]
 for field,name in MAP.items():
  p=ROOT/name
  rec={'field':field,'file':name,'manifest':m.get(field),'exists':p.exists()}
  if p.exists():
   data=p.read_bytes()
   rec['size']=len(data)
   for alg in ALGS:
    h=digest(data,alg)
    rec[alg]=h
    rec[alg+'_12']=h[:12]
    rec[alg+'_matches_manifest']=m.get(field) in {h,h[:12]}
  out.append(rec)
 print(json.dumps({'schema':'manifest_fingerprint_audit_v1','rows':out},ensure_ascii=False,indent=2))
 return 0
if __name__=='__main__': raise SystemExit(main())
