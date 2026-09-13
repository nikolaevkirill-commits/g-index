"""Read the executable full job body, validating the installed wrapper and hash."""
import argparse,base64,hashlib,json,pathlib

NAMES={'daily_chain':'daily_chain.bat','live_context_refresh':'refresh_live_context_fp377.cmd','kp_alert':'kp_alert.bat'}
PYTHON=r'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
def read_job_source(root,job):
    root=pathlib.Path(root).resolve(strict=True)
    name=NAMES[job];text=(root/name).read_text(encoding='utf-8-sig')
    config=root/'pipeline_runtime_v2/legacy_jobs.json'
    if not config.exists():
        if 'run_legacy_job.py' in text:raise ValueError('Wrapper has no verified runtime configuration')
        return text
    expected=('@echo off\nchcp 65001 >nul\n'
              f'"{PYTHON}" -B "{root}\\pipeline_runtime_v2\\run_legacy_job.py" --root "{root}" --job {job}\n'
              'exit /b %errorlevel%\n')
    if text!=expected:raise ValueError('Canonical wrapper differs from verified invocation')
    entry=json.loads(config.read_text(encoding='utf-8'))[job]
    body_name=entry['body']
    if pathlib.Path(body_name).name!=body_name or ':' in body_name or body_name in ('.','..'):
        raise ValueError('Unsafe legacy body path')
    body=root/body_name
    if body.is_symlink():raise ValueError('Symlink legacy body is not accepted')
    data=body.read_bytes()
    if hashlib.sha256(data).hexdigest()!=entry['sha256']:raise ValueError('Legacy body SHA mismatch')
    return data.decode('utf-8-sig')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--job',required=True,choices=NAMES)
    p.add_argument('--base64',action='store_true');a=p.parse_args()
    text=read_job_source(a.root,a.job)
    print(base64.b64encode(text.encode()).decode('ascii') if a.base64 else text)
