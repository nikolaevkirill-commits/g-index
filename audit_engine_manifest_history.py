#!/usr/bin/env python3
from __future__ import annotations
import hashlib,subprocess,json
TARGET='B8CCEBDC4E67'
PATH='engine_scores.json'

def sh(*args):
 return subprocess.check_output(['git',*args],text=True,stderr=subprocess.DEVNULL).strip()

def main():
 commits=sh('rev-list','--all','--',PATH).splitlines()
 hits=[]; seen={}
 for c in commits:
  try: blob=sh('rev-parse',f'{c}:{PATH}')
  except Exception: continue
  if blob in seen:
   md=seen[blob]
  else:
   data=subprocess.check_output(['git','cat-file','blob',blob])
   md=hashlib.md5(data).hexdigest().upper()[:12]; seen[blob]=md
  if md==TARGET:
   hits.append({'commit':c,'blob':blob,'md5_12':md,'date':sh('show','-s','--format=%cI',c),'subject':sh('show','-s','--format=%s',c)})
 current=subprocess.check_output(['git','show',f'HEAD:{PATH}'])
 print(json.dumps({'target_manifest':TARGET,'current_md5_12':hashlib.md5(current).hexdigest().upper()[:12],'matching_history':hits[:20],'unique_blobs_scanned':len(seen)},ensure_ascii=False,indent=2))
 return 0
if __name__=='__main__': raise SystemExit(main())
