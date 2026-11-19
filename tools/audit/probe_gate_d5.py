"""Focused D2/D5 negative controls. Uses disposable Git repos, never the application."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

RUNNER = Path(__file__).with_name('run_gate.py')
PROTECTED = ('consumer_cloud/forecast.json', 'consumer_cloud/final_score_decisions.json',
             'INDEPENDENT_FORECAST_FEED_v1.json')


def require(condition, detail):
    if not condition:
        raise RuntimeError(detail)


def main():
    checks = []
    with tempfile.TemporaryDirectory(prefix='fp575-runner-d5-') as folder:
        base = Path(folder)

        def call(*args, env=None):
            return subprocess.run([sys.executable,'-B', str(RUNNER), *map(str,args)],
                                  env=env,capture_output=True,text=True,timeout=120)

        def expected(code, *args, env=None, message=None):
            result = call(*args,env=env)
            require(result.returncode == code, f"wanted {code}, got {result.returncode}: {result.stderr}")
            require(message is None or message in result.stderr, result.stderr)
            return result

        def case(name, script, *, generated=None, screenshots=False, timeout=20):
            root, out = base/name, base/(name+'-evidence')
            root.mkdir()
            for filename in PROTECTED:
                f = root/filename
                f.parent.mkdir(exist_ok=True)
                f.write_text('{}')
            (root/'.gitignore').write_text('private.input\nnode_modules/\n')
            for args in [('init','-q'),('config','user.name','probe'),('config','user.email','probe@example.invalid'),
                         ('add','.'),('commit','-qm','synthetic fixture')]:
                subprocess.run(['git','-C',str(root),*args],check=True,capture_output=True)
            contract = base/(name+'.contract')
            contract.write_text(json.dumps({'expected_count':1,'coverage':'claimed full gate',
                'checks':[{'argv':['{python}','-c',script],'timeout':timeout}],
                'generated_outputs':generated or [],'artifact_env':['SCREENSHOT_DIR'] if screenshots else []}))
            bound = base/(name+'.sealed')
            expected(0,root,out,contract,'--seal','--sealed-output',bound)
            return root,out,bound

        root,out,bound=case('screenshot', "import os,pathlib; p=pathlib.Path(os.environ['SCREENSHOT_DIR']); "
                           "pathlib.Path(p/'placeholder.txt').write_text('synthetic')",screenshots=True)
        expected(0,root,out,bound,env={**os.environ,'SCREENSHOT_DIR':str(root)})
        require(list(out.glob('screenshots/*/placeholder.txt')) and not (root/'placeholder.txt').exists(),
                'artifact did not land outside checkout')
        summary=json.loads(next(out.glob('summary-*.json')).read_text())
        require(summary['suite_passed'] and not summary['complete'] and summary['scope']=='diagnostic_only',
                'small passing contract cannot claim full coverage')
        checks += ['external screenshot directory overrides caller path', 'one-command success is diagnostic only']

        root,out,bound=case('ignored','pass')
        (root/'private.input').write_text('synthetic')
        expected(2,root,out,bound,message='ignored files')
        checks.append('ignored checkout input refused')

        root,out,bound=case('env','pass')
        expected(0,root,out,bound)
        previous=next(out.glob('attempt-*.json'))
        before=previous.read_bytes()
        expected(0,root,out,bound,'--resume')
        require(len(list(out.glob('attempt-*.json')))==1 and previous.read_bytes()==before,
                'resume rewrote prior attempt')
        expected(2,root,out,bound,'--resume',env={**os.environ,'SKY_MUTATION':'synthetic'},
                 message='resume binding changed')
        checks += ['identical resume reuses immutable attempt', 'test override invalidates resume']

        root,out,bound=case('attempt','raise SystemExit(9)')
        expected(1,root,out,bound)
        attempt=next(out.glob('attempt-*.json'))
        row=json.loads(attempt.read_text())
        row.update(status='PASS',exit=0)
        attempt.write_text(json.dumps(row))
        expected(2,root,out,bound,'--resume',message='authentication failed')
        checks.append('edited attempt status rejected even with intact log')

        root,out,bound=case('generated',"from pathlib import Path; Path('report').write_text('first')",
                            generated=['report'])
        (root/'report').write_text('preexisting')
        expected(2,root,out,bound,message='absent generated output')
        (root/'report').unlink()
        # A refusal after lock acquisition leaves an empty directory.
        expected(0,root,out,bound)
        (root/'report').write_text('changed')
        expected(2,root,out,bound,'--resume',message='generated state differs')
        checks += ['preseeded generated output refused', 'generated drift invalidates resume']

        for kind in ('success','timeout'):
            marker=base/(kind+'.child-survived')
            child=f"import time;from pathlib import Path;time.sleep(3);Path({str(marker)!r}).write_text('alive')"
            options="start_new_session=True" if os.name!='nt' else "creationflags=subprocess.DETACHED_PROCESS"
            script=(f"import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',{child!r}],{options});"
                    + ("time.sleep(15)" if kind=='timeout' else "time.sleep(.1)"))
            root,out,bound=case('child-'+kind,script,timeout=1.5 if kind=='timeout' else 20)
            expected(1 if kind=='timeout' else 0,root,out,bound)
            time.sleep(3.1)
            require(not marker.exists(), f'{kind} left a child running')
            row=json.loads(next(out.glob('attempt-*.json')).read_text())
            require(row['status']==('TIMEOUT' if kind=='timeout' else 'PASS'), 'unexpected attempt status')
            checks.append(f'detached child drained after {kind}')

    print(json.dumps({'status':'PASS','platform':sys.platform,'checks':checks},indent=2))


if __name__=='__main__':
    main()
