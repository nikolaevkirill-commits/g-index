#!/usr/bin/env python3
"""Fail-closed, source-bound gate. Logs are private; never package them unchecked."""
import argparse, hashlib, importlib.metadata, json, os, pathlib, platform, shutil, signal, subprocess, sys, time, uuid

PROTECTED = ('consumer_cloud/forecast.json','consumer_cloud/final_score_decisions.json','INDEPENDENT_FORECAST_FEED_v1.json')
SCHEMA = 'fp575-bound-gate-v2'
def canonical(x): return json.dumps(x, sort_keys=True, separators=(',',':'), ensure_ascii=True).encode()
def digest(b): return hashlib.sha256(b).hexdigest()
def read(p): return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
def write_new(p, obj):
    with pathlib.Path(p).open('x',encoding='utf-8') as f:
        json.dump(obj,f,indent=2,ensure_ascii=True); f.write('\n'); f.flush(); os.fsync(f.fileno())
def cmd(root, *args):
    return subprocess.check_output(args,cwd=root,stderr=subprocess.PIPE).decode().strip()
def snapshot(root, generated=()):
    # HEAD and index must be the same real tree; worktree must be clean, including deletions.
    head=cmd(root,'git','rev-parse','HEAD'); tree=cmd(root,'git','rev-parse','HEAD^{tree}')
    index=cmd(root,'git','write-tree')
    if tree!=index: raise ValueError('index differs from HEAD')
    subprocess.run(['git','diff','--quiet','--'],cwd=root,check=True)
    files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')[:-1]
    hashes={}
    for name in files:
        p=root/name
        if p.is_symlink() or not p.is_file(): raise ValueError('unsupported/missing tracked input: '+name)
        hashes[name]=digest(p.read_bytes())
    for p in PROTECTED:
        if p not in hashes: raise ValueError('protected input not tracked: '+p)
    # Untracked runtime inputs must not enter tests through disk/server/module lookup.
    untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=root)
    unexpected=[p for p in untracked.decode().split('\0') if p and not any(p==g or p.startswith(g.rstrip('/')+'/') for g in generated)]
    if unexpected: raise ValueError('unexpected untracked files present; use a clean dedicated checkout')
    return {'head':head,'tree':tree,'index_tree':index,'files':hashes,'protected':{p:hashes[p] for p in PROTECTED}}
def environment(root):
    def version(args):
        try: return cmd(root,*args)
        except (OSError,subprocess.CalledProcessError): return '[unavailable]'
    node=version(['node','--version'])
    pw=version(['node','-e',"(async()=>{const fs=require('fs'),crypto=require('crypto'),p=require('playwright');const s=await p.chromium.launchServer();try{const f=s.process().spawnfile;const b=await p.chromium.connect(s.wsEndpoint());console.log(JSON.stringify({version:require('playwright/package.json').version,browser_version:b.version(),executable_sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}));await b.close();}finally{await s.close()}})().catch(e=>{console.error(e.message);process.exit(1)})"])
    return {'python':sys.version,'python_packages':sorted([d.metadata.get('Name',''),d.version] for d in importlib.metadata.distributions()),'python_executable_sha256':digest(pathlib.Path(sys.executable).read_bytes()),'git':version(['git','--version']),'node':node,'playwright':pw,'platform':platform.platform(),'machine':platform.machine(),'environment_sha256':digest(canonical({k:v for k,v in os.environ.items() if k in ('PATH','NODE_PATH','NODE_OPTIONS','TZ','LANG','LC_ALL','PYTHONPATH','PYTHONUTF8','PYTHONHASHSEED','PLAYWRIGHT_BROWSERS_PATH','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH','CI','HOME','USERPROFILE') or k.startswith('NR_')}))}
def commands(doc):
    rows=doc.get('checks')
    if not isinstance(rows,list) or not rows: raise ValueError('empty command list')
    out=[]
    for n,row in enumerate(rows,1):
        argv=row.get('argv'); timeout=row.get('timeout',1200)
        if not isinstance(argv,list) or not argv or not all(isinstance(s,str) and s for s in argv): raise ValueError('checks require explicit argv arrays (no shell parsing)')
        if not isinstance(timeout,(int,float)) or timeout<=0: raise ValueError('invalid timeout')
        if row.get('index',n)!=n: raise ValueError('indices must be contiguous and ordered')
        out.append({'index':n,'argv':argv,'timeout':timeout})
    if doc.get('expected_count')!=len(out): raise ValueError('expected_count differs from command count')
    return out

def execute(argv,root,timeout,log):
    argv=[sys.executable if s=='{python}' else s for s in argv]
    kwargs={'start_new_session':True} if os.name!='nt' else {'creationflags':subprocess.CREATE_NEW_PROCESS_GROUP}
    started=time.monotonic()
    with log.open('xb') as f:
        try:
            p=subprocess.Popen(argv,cwd=root,stdout=f,stderr=subprocess.STDOUT,**kwargs)
            try: code=p.wait(timeout=timeout); status='PASS' if code==0 else 'FAIL'
            except subprocess.TimeoutExpired:
                if os.name=='nt': subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                else: os.killpg(p.pid,signal.SIGKILL)
                p.wait(); code=124; status='TIMEOUT'
        except OSError as e: f.write(str(e).encode()); code=127; status='FAIL'
    return {'exit':code,'status':status,'seconds':round(time.monotonic()-started,3),'log_sha256':digest(log.read_bytes())}
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('repo',type=pathlib.Path); ap.add_argument('out',type=pathlib.Path); ap.add_argument('manifest',type=pathlib.Path)
    ap.add_argument('--seal',action='store_true',help='create a bound manifest at --sealed-output from a reviewed command contract')
    ap.add_argument('--sealed-output',type=pathlib.Path); ap.add_argument('--resume',action='store_true')
    a=ap.parse_args(); root=a.repo.resolve(); out=a.out.resolve(); manifest=read(a.manifest)
    if out==root or root in out.parents: raise ValueError('evidence must be outside checkout')
    checks=commands(manifest); generated=manifest.get('generated_outputs',[])
    if not isinstance(generated,list) or not all(isinstance(g,str) and g and not g.startswith(('/', '.')) and '..' not in pathlib.PurePosixPath(g).parts for g in generated): raise ValueError('invalid generated output paths')
    source=snapshot(root,generated)
    if a.seal:
        if not a.sealed_output: raise ValueError('--sealed-output required')
        write_new(a.sealed_output,{'schema':SCHEMA,'source':source,'checks':checks,'expected_count':len(checks),'coverage':manifest.get('coverage','UNVERIFIED'),'generated_outputs':generated,'requires_browser':manifest.get('requires_browser',False)})
        print('SEALED',len(checks),'commands; no commands executed'); return 0
    if manifest.get('schema')!=SCHEMA or manifest.get('source')!=source: raise ValueError('manifest/source mismatch; no prior PASS may be reused')
    identity={'source':source,'checks':checks,'environment':environment(root),'runner_sha256':digest(pathlib.Path(__file__).read_bytes()),'manifest_sha256':digest(a.manifest.read_bytes())}
    if manifest.get('requires_browser') and (identity['environment']['playwright']=='[unavailable]' or identity['environment']['node']=='[unavailable]'): raise ValueError('required Playwright/actual headless executable fingerprint unavailable')
    key=digest(canonical(identity)); out.mkdir(parents=True,exist_ok=True)
    lock=out/'ACTIVE.lock'
    # Exclusive ownership. Never automatically delete a stale lock; inspect interrupted run first.
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY); os.write(fd,str(os.getpid()).encode()); os.close(fd)
    try:
        binding=out/'binding.json'
        if binding.exists():
            if not a.resume: raise ValueError('existing evidence requires --resume or a new output directory')
            if read(binding)!=identity: raise ValueError('resume binding changed (tree/inputs/environment/runner/commands)')
        else:
            if a.resume: raise ValueError('no existing binding to resume')
            if any(p.name!='ACTIVE.lock' for p in out.iterdir()): raise ValueError('nonempty unbound evidence directory')
            write_new(binding,identity)
        previous={}
        for p in sorted(out.glob('attempt-*.json')):
            row=read(p); n=row['index']
            if row['binding']!=key or n<1 or n>len(checks) or row['argv']!=checks[n-1]['argv']: raise ValueError('invalid prior attempt')
            log=out/row['log']
            if log.parent!=out or digest(log.read_bytes())!=row['log_sha256']: raise ValueError('prior log changed/missing')
            if row.get('attempt_id')!=p.stem: raise ValueError('prior attempt identity changed')
            previous[n]=row
        results=[]
        for check in checks:
            n=check['index']; old=previous.get(n)
            if old and old['status']=='PASS' and old['exit']==0: results.append(old); continue
            # Revalidate before each command: tests cannot silently mutate source for later tests.
            if snapshot(root,generated)!=source: raise ValueError('source changed during gate')
            aid='attempt-'+str(time.time_ns())+'-'+uuid.uuid4().hex
            log=out/(aid+'.log')
            row={**check,'binding':key,'attempt_id':aid,'log':log.name,**execute(check['argv'],root,check['timeout'],log)}
            try:
                if snapshot(root,generated)!=source: row['status']='SOURCE_CHANGED'; row['exit']=125
            except Exception as e:
                row['status']='SOURCE_CHANGED'; row['exit']=125; row['source_error']=str(e)
            write_new(out/(aid+'.json'),row); results.append(row)
            print(str(n)+'/'+str(len(checks)),row['status'],flush=True)
            if row['status']=='SOURCE_CHANGED': break
        complete=len(results)==len(checks) and all(r['status']=='PASS' and r['exit']==0 for r in results)
        write_new(out/('summary-'+str(time.time_ns())+'.json'),{'binding':key,'expected_count':len(checks),'observed_count':len(results),'complete':complete,'rows':results})
        return 0 if complete else 1
    except Exception as e:
        write_new(out/('refusal-'+str(time.time_ns())+'.json'),{'binding':key,'status':'REFUSED','error':str(e)})
        raise
    finally: lock.unlink()
if __name__=='__main__':
    try: sys.exit(main())
    except Exception as e:
        try:
            if len(sys.argv)>2:
                evidence=pathlib.Path(sys.argv[2]).resolve(); repo=pathlib.Path(sys.argv[1]).resolve()
                if evidence!=repo and repo not in evidence.parents:
                    evidence.mkdir(parents=True,exist_ok=True)
                    write_new(evidence/('preflight-refusal-'+str(time.time_ns())+'.json'),{'status':'REFUSED','error':str(e)})
        except Exception: pass
        print('GATE REFUSED:',str(e),file=sys.stderr); sys.exit(2)
