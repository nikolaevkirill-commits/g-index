"""Fail closed before granting cloud data a Git commit; no arbitrary artifact paths."""
from pathlib import Path
from datetime import datetime,timezone,timedelta
import hashlib,json,re,subprocess

def validate(root):
    root=Path(root)
    allowed=r'consumer_cloud/(forecast\.json|noaa/27-day-outlook\.txt|noaa/receipts/cloud\.json|noaa/bodies/[a-f0-9]{64}\.json)'
    for p in (root/'consumer_cloud').rglob('*'):
        if p.is_symlink():raise ValueError('Symlink in publication')
        if p.is_file() and not re.fullmatch(allowed,p.relative_to(root).as_posix()):raise ValueError('Unexpected publication path')
    feed=json.loads((root/'consumer_cloud/forecast.json').read_text('utf-8'))
    proof=feed.get('source_integrity',{})
    if feed.get('executor')!='github-actions-source-only-v1' or proof.get('status')!='PASS' or proof.get('replayed_days')!=27:raise ValueError('Missing replay proof')
    stamp=datetime.fromisoformat(feed['generated_at'])
    if stamp.tzinfo is None or not timedelta(0)<=datetime.now(timezone.utc)-stamp<=timedelta(hours=1):raise ValueError('Publication calculation is stale/future')
    if len(feed['days'])!=27:raise ValueError('Invalid horizon')
    receipt=json.loads((root/'consumer_cloud/noaa/receipts/cloud.json').read_text())
    if receipt['url']!='https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json':raise ValueError('Wrong NOAA source')
    if not re.fullmatch(r'bodies/[a-f0-9]{64}\.json',receipt['body']):raise ValueError('Unsafe receipt body')
    raw=(root/'consumer_cloud/noaa'/receipt['body']).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=receipt['sha256']:raise ValueError('NOAA raw bytes changed')
    for day,row in feed['days'].items():
        own=row['channels']['source_formula']
        if row['date']!=day or own.get('generated_at')!=feed['generated_at']:raise ValueError('Inconsistent calculation time/date')
        if own.get('available') and (type(own.get('value')) is not int or not -3<=own['value']<=3):raise ValueError('Invalid score')
        if own.get('validation')!='unvalidated_source_formula' or own.get('expert_override_used') is not False:raise ValueError('Invalid promotion claim')
    return True

if __name__=='__main__':
    validate(Path.cwd())
    for line in subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines():
        if not line[3:].startswith('consumer_cloud/'):raise ValueError('Unrelated working change')
    print('PASS isolated cloud publication')
