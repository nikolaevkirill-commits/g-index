"""Self-contained negative probes; synthetic inputs only, no production data."""
import json,pathlib,subprocess,sys,tempfile
RUNNER=pathlib.Path(__file__).with_name('run_gate.py')

def require(condition, message):
    if not condition:
        raise SystemExit(message)


def run(*args):
 p=subprocess.run([sys.executable,str(RUNNER),*map(str,args)],capture_output=True,text=True); return p.returncode

def git(root,*args): return subprocess.run(['git','-C',str(root),*args],check=True,capture_output=True)
def case(base,name,argv,timeout=5):
 root=base/name;root.mkdir();git(root,'init','-q');git(root,'config','user.name','gate-probe');git(root,'config','user.email','probe@example.invalid')
 for f in ('consumer_cloud/forecast.json','consumer_cloud/final_score_decisions.json','INDEPENDENT_FORECAST_FEED_v1.json'):
  p=root/f;p.parent.mkdir(exist_ok=True);p.write_text('{}')
 git(root,'add','.');git(root,'commit','-qm','synthetic probe')
 contract=base/(name+'-commands.json');contract.write_text(json.dumps({'expected_count':1,'checks':[{'argv':argv,'timeout':timeout}]}))
 sealed=base/(name+'-bound.json');out=base/(name+'-evidence');require(run(root,out,contract,'--seal','--sealed-output',sealed)==0, "Gate probe failed: run(root,out,contract,'--seal','--sealed-output',sealed)==0")
 return root,out,sealed

def main():
 passed=[]
 with tempfile.TemporaryDirectory(prefix='fp575-harness-probes-') as tmp:
  base=pathlib.Path(tmp)
  root,out,bound=case(base,'pass',['{python}','-c','pass']);require(run(root,out,bound)==0, 'Gate probe failed: run(root,out,bound)==0')
  original=list(out.glob('attempt-*.json'));require(len(original)==1, 'Gate probe failed: len(original)==1')
  saved={p.name:p.read_bytes() for p in out.iterdir()}
  require(run(root,out,bound,'--resume')==0, "Gate probe failed: run(root,out,bound,'--resume')==0");require(list(out.glob('attempt-*.json'))==original, "Gate probe failed: list(out.glob('attempt-*.json'))==original")
  require(all((out/n).read_bytes()==v for n,v in saved.items()), 'Gate probe failed: all((out/n).read_bytes()==v for n,v in saved.items())');passed.append('PASS resume reuses only identical binding; prior bytes unchanged')
  p=root/'consumer_cloud/forecast.json';p.write_text('{"changed":true}');require(run(root,out,bound,'--resume')!=0, "Gate probe failed: run(root,out,bound,'--resume')!=0");passed.append('changed protected input rejects old PASS')
  git(root,'add','.');require(run(root,out,bound,'--resume')!=0, "Gate probe failed: run(root,out,bound,'--resume')!=0");passed.append('changed index rejects old PASS')
  git(root,'commit','-qm','changed synthetic input');require(run(root,out,bound,'--resume')!=0, "Gate probe failed: run(root,out,bound,'--resume')!=0");passed.append('changed HEAD/tree rejects old PASS')
  root,out,bound=case(base,'fail',['{python}','-c','raise SystemExit(9)']);require(run(root,out,bound)==1, 'Gate probe failed: run(root,out,bound)==1')
  one={p.name:p.read_bytes() for p in out.iterdir()};require(run(root,out,bound,'--resume')==1, "Gate probe failed: run(root,out,bound,'--resume')==1");require(len(list(out.glob('attempt-*.json')))==2, "Gate probe failed: len(list(out.glob('attempt-*.json')))==2")
  require(all((out/n).read_bytes()==v for n,v in one.items()), 'Gate probe failed: all((out/n).read_bytes()==v for n,v in one.items())');passed.append('intentional FAIL returns 1; resume retries FAIL and preserves attempts')
  root,out,bound=case(base,'timeout',['{python}','-c','import time;time.sleep(10)'],.1);require(run(root,out,bound)==1, 'Gate probe failed: run(root,out,bound)==1')
  r=json.loads(next(out.glob('attempt-*.json')).read_text());require(r['status']=='TIMEOUT' and r['exit']==124, "Gate probe failed: r['status']=='TIMEOUT' and r['exit']==124");passed.append('timeout returns nonzero with immutable TIMEOUT attempt')
  root,out,bound=case(base,'mutation',['{python}','-c',"from pathlib import Path;Path('consumer_cloud/forecast.json').write_text('changed')"]);require(run(root,out,bound)==1, 'Gate probe failed: run(root,out,bound)==1')
  require(json.loads(next(out.glob('attempt-*.json')).read_text())['status']=='SOURCE_CHANGED', "Gate probe failed: json.loads(next(out.glob('attempt-*.json')).read_text())['status']=='SOURCE_CHANGED'");passed.append('command mutation records SOURCE_CHANGED and fails')
  root,out,bound=case(base,'commands',['{python}','-c','pass']);require(run(root,out,bound)==0, 'Gate probe failed: run(root,out,bound)==0')
  d=json.loads(bound.read_text());d['checks'][0]['argv']=['{python}','-c','raise SystemExit(9)'];bound.write_text(json.dumps(d));require(run(root,out,bound,'--resume')!=0, "Gate probe failed: run(root,out,bound,'--resume')!=0");passed.append('changed command/manifest rejects prior PASS')
  root,out,bound=case(base,'incomplete',['{python}','-c','pass']);d=json.loads(bound.read_text());d['expected_count']=2;bound.write_text(json.dumps(d));require(run(root,out,bound)!=0, 'Gate probe failed: run(root,out,bound)!=0');passed.append('incomplete command list fails closed')
  root,out,bound=case(base,'corrupt',['{python}','-c','pass']);require(run(root,out,bound)==0, 'Gate probe failed: run(root,out,bound)==0');next(out.glob('attempt-*.log')).write_text('tampered');require(run(root,out,bound,'--resume')!=0, "Gate probe failed: run(root,out,bound,'--resume')!=0");passed.append('modified prior log rejects prior PASS')
 print(json.dumps({'status':'PASS','probes':passed},indent=2))
if __name__=='__main__': main()
