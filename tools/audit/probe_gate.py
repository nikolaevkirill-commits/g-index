"""Self-contained negative probes; synthetic inputs only, no production data."""
import json,pathlib,subprocess,sys,tempfile,hashlib
RUNNER=pathlib.Path(__file__).with_name('run_gate.py')
def run(*args):
 p=subprocess.run([sys.executable,str(RUNNER),*map(str,args)],capture_output=True,text=True); return p.returncode

def git(root,*args): return subprocess.run(['git','-C',str(root),*args],check=True,capture_output=True)
def case(base,name,argv,timeout=5):
 root=base/name;root.mkdir();git(root,'init','-q');git(root,'config','user.name','gate-probe');git(root,'config','user.email','probe@example.invalid')
 for f in ('consumer_cloud/forecast.json','consumer_cloud/final_score_decisions.json','INDEPENDENT_FORECAST_FEED_v1.json'):
  p=root/f;p.parent.mkdir(exist_ok=True);p.write_text('{}')
 git(root,'add','.');git(root,'commit','-qm','synthetic probe')
 contract=base/(name+'-commands.json');contract.write_text(json.dumps({'expected_count':1,'checks':[{'argv':argv,'timeout':timeout}]}))
 sealed=base/(name+'-bound.json');out=base/(name+'-evidence');assert run(root,out,contract,'--seal','--sealed-output',sealed)==0
 return root,out,sealed

def main():
 passed=[]
 with tempfile.TemporaryDirectory(prefix='fp575-harness-probes-') as tmp:
  base=pathlib.Path(tmp)
  root,out,bound=case(base,'pass',['{python}','-c','pass']);assert run(root,out,bound)==0
  original=list(out.glob('attempt-*.json'));assert len(original)==1
  saved={p.name:p.read_bytes() for p in out.iterdir()}
  assert run(root,out,bound,'--resume')==0;assert list(out.glob('attempt-*.json'))==original
  assert all((out/n).read_bytes()==v for n,v in saved.items());passed.append('PASS resume reuses only identical binding; prior bytes unchanged')
  p=root/'consumer_cloud/forecast.json';p.write_text('{"changed":true}');assert run(root,out,bound,'--resume')!=0;passed.append('changed protected input rejects old PASS')
  git(root,'add','.');assert run(root,out,bound,'--resume')!=0;passed.append('changed index rejects old PASS')
  git(root,'commit','-qm','changed synthetic input');assert run(root,out,bound,'--resume')!=0;passed.append('changed HEAD/tree rejects old PASS')
  root,out,bound=case(base,'fail',['{python}','-c','raise SystemExit(9)']);assert run(root,out,bound)==1
  one={p.name:p.read_bytes() for p in out.iterdir()};assert run(root,out,bound,'--resume')==1;assert len(list(out.glob('attempt-*.json')))==2
  assert all((out/n).read_bytes()==v for n,v in one.items());passed.append('intentional FAIL returns 1; resume retries FAIL and preserves attempts')
  root,out,bound=case(base,'timeout',['{python}','-c','import time;time.sleep(10)'],.1);assert run(root,out,bound)==1
  r=json.loads(next(out.glob('attempt-*.json')).read_text());assert r['status']=='TIMEOUT' and r['exit']==124;passed.append('timeout returns nonzero with immutable TIMEOUT attempt')
  root,out,bound=case(base,'mutation',['{python}','-c',"from pathlib import Path;Path('consumer_cloud/forecast.json').write_text('changed')"]);assert run(root,out,bound)==1
  assert json.loads(next(out.glob('attempt-*.json')).read_text())['status']=='SOURCE_CHANGED';passed.append('command mutation records SOURCE_CHANGED and fails')
  root,out,bound=case(base,'commands',['{python}','-c','pass']);assert run(root,out,bound)==0
  d=json.loads(bound.read_text());d['checks'][0]['argv']=['{python}','-c','raise SystemExit(9)'];bound.write_text(json.dumps(d));assert run(root,out,bound,'--resume')!=0;passed.append('changed command/manifest rejects prior PASS')
  root,out,bound=case(base,'incomplete',['{python}','-c','pass']);d=json.loads(bound.read_text());d['expected_count']=2;bound.write_text(json.dumps(d));assert run(root,out,bound)!=0;passed.append('incomplete command list fails closed')
  root,out,bound=case(base,'corrupt',['{python}','-c','pass']);assert run(root,out,bound)==0;next(out.glob('attempt-*.log')).write_text('tampered');assert run(root,out,bound,'--resume')!=0;passed.append('modified prior log rejects prior PASS')
 print(json.dumps({'status':'PASS','probes':passed},indent=2))
if __name__=='__main__': main()
