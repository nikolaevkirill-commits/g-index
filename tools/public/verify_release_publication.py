"""Event-driven release verification: exact runtime bytes, no forecast rewriting."""
from pathlib import Path
from urllib.request import Request,urlopen
import hashlib,json,os,time,concurrent.futures,subprocess
ROOT=Path(__file__).resolve().parents[2]
CORE=['index.html','design-v4.html','sw.js','consumer_authority_v1.js','consumer_cloud/final_score_decisions.json','notification_runtime_v1.js','consumer_overview_v1.js','preview-v4/consumer_overview_v1.js','product_shell_v1.js','preview-v4/product_shell_v1.js']
# v130 audit: verify every offline shell asset of the released sw.js (140), not only the 10 core files above;
# otherwise a stale/mixed journal, privacy or calendar module would pass the release check unnoticed.
def shell_assets():
 import re
 sw=subprocess.check_output(['git','-C',str(ROOT),'show','HEAD:sw.js']).decode('utf-8')
 block=re.search(r'const SHELL_ASSETS = \[(.*?)\];',sw,re.S)
 if not block:raise SystemExit('FAIL: SHELL_ASSETS not found in sw.js')
 return [x.split('?',1)[0] for x in re.findall(r"'\./([^']+)'",block.group(1)) if x and not x.endswith('/')]
FILES=list(dict.fromkeys(CORE+shell_assets()))
BASE=os.environ.get('PUBLIC_BASE_URL','https://nikolaevkirill-commits.github.io/g-index/')
def check(n):
 expected=hashlib.sha256(subprocess.check_output(['git','-C',str(ROOT),'show','HEAD:'+n])).hexdigest()
 try:
  with urlopen(Request(BASE+n+'?release_sha='+expected,headers={'Cache-Control':'no-cache'}),timeout=20) as r:actual=hashlib.sha256(r.read()).hexdigest()
  return {'path':n,'expected':expected,'actual':actual,'ok':expected==actual}
 except Exception as e:return {'path':n,'ok':False,'error':str(e)}
def verify(timeout=180):
 deadline=time.monotonic()+timeout
 while True:
  with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,FILES))
  ok=all(x['ok'] for x in rows)
  Path('release-publication.json').write_text(json.dumps({'status':'PASS' if ok else 'FAIL','files':rows},indent=2))
  if ok:return True
  if time.monotonic()>=deadline:return False
  time.sleep(15)
if __name__=='__main__':
 if not verify():raise SystemExit('FAIL: published release is missing or mixed; see release-publication.json')
 print('PASS published runtime and decisions: '+str(len(FILES))+' exact hashes')
