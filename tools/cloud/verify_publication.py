"""A successful push is not proof of publication: compare deployed feed bytes."""
from pathlib import Path
from urllib.request import Request,urlopen
import hashlib,json,time,os,re

nonce=os.environ.get('WATCHDOG_NONCE','')
if nonce and not re.fullmatch(r'cf-[0-9]{13}-[0-9a-f-]{36}',nonce):
    raise ValueError('Invalid watchdog correlation identifier')

expected=Path('consumer_cloud/forecast.json').read_bytes()
digest=hashlib.sha256(expected).hexdigest()
deadline=time.monotonic()+240
last=None
while True:
    try:
        req=Request(os.environ.get('PUBLIC_BASE_URL','https://nikolaevkirill-commits.github.io/g-index/')+'consumer_cloud/forecast.json?sha='+digest,
                    headers={'Cache-Control':'no-cache','User-Agent':'NeboRhythm-publication-verifier/1'})
        with urlopen(req,timeout=20) as response:raw=response.read()
        if hashlib.sha256(raw).hexdigest()==digest:
            result={'status':'PASS','publication_verified':True,'sha256':digest,'generated_at':json.loads(raw)['generated_at']}
            if nonce:
                result['watchdog_correlation']={'nonce':nonce,'run_id':os.environ.get('GITHUB_RUN_ID'),
                  'event':os.environ.get('GITHUB_EVENT_NAME'),'automatic_verified':False}
            Path('cloud-publication.json').write_text(json.dumps(result,indent=2))
            print(json.dumps(result));break
        last='Published bytes differ'
    except Exception as exc:last=type(exc).__name__
    if time.monotonic()>=deadline:raise RuntimeError('Publication unverified: '+last)
    time.sleep(10)
