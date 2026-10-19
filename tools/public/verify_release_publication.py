"""Event-driven release verification: exact runtime bytes, no forecast rewriting."""
from pathlib import Path
from urllib.request import Request,urlopen
import hashlib,json,os,time,concurrent.futures,subprocess
ROOT=Path(__file__).resolve().parents[2]
FILES=['index.html','design-v4.html','sw.js','consumer_authority_v1.js','consumer_cloud/final_score_decisions.json','notification_runtime_v1.js','consumer_overview_v1.js','preview-v4/consumer_overview_v1.js','product_shell_v1.js','preview-v4/product_shell_v1.js']
BASE=os.environ.get('PUBLIC_BASE_URL','https://nikolaevkirill-commits.github.io/g-index/')
def check(n):
 expected=hashlib.sha256(subprocess.check_output(['git','-C',str(ROOT),'show','HEAD:'+n])).hexdigest()
 try:
  with urlopen(Request(BASE+n+'?release_sha='+expected,headers={'Cache-Control':'no-cache'}),timeout=20) as r:actual=hashlib.sha256(r.read()).hexdigest()
  return {'path':n,'expected':expected,'actual':actual,'ok':expected==actual}
 except Exception as e:return {'path':n,'ok':False,'error':str(e)}
deadline=time.monotonic()+180
while True:
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,FILES))
 ok=all(x['ok'] for x in rows)
 Path('release-publication.json').write_text(json.dumps({'status':'PASS' if ok else 'FAIL','files':rows},indent=2))
 if ok:print('PASS published runtime and decisions: '+str(len(rows))+' exact hashes');break
 if time.monotonic()>=deadline:raise SystemExit('FAIL: published release is missing or mixed; see release-publication.json')
 time.sleep(15)
