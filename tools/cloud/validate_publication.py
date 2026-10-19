"""Fail closed before granting cloud data a Git commit; no arbitrary artifact paths."""
from pathlib import Path
from datetime import datetime,timezone,timedelta
import hashlib,json,re,subprocess
from kp_source_guard import reject_downgrade

def validate_paths(root):
    root=Path(root)
    registry='consumer_cloud/final_score_decisions.json'
    expected=subprocess.check_output(['git','show','HEAD:'+registry],cwd=root,text=True,encoding='utf-8')
    actual=root/registry
    if actual.is_symlink() or not actual.is_file() or actual.read_text('utf-8')!=expected:
        raise ValueError('Cloud artifact must not change expert decisions')
    allowed=r'consumer_cloud/(forecast\.json|noaa/27-day-outlook\.txt|noaa/receipts/cloud\.json|noaa/bodies/[a-f0-9]{64}\.json)'
    for p in (root/'consumer_cloud').rglob('*'):
        if p.is_symlink():raise ValueError('Symlink in publication')
        rel=p.relative_to(root).as_posix()
        if p.is_file() and rel!=registry and not re.fullmatch(allowed,rel):raise ValueError('Unexpected publication path')

def validate(root):
    root=Path(root)
    validate_paths(root)
    feed=json.loads((root/'consumer_cloud/forecast.json').read_text('utf-8'))
    # Compare against publisher checkout, not only the earlier calculation checkout.
    previous=json.loads(subprocess.check_output(['git','show','HEAD:consumer_cloud/forecast.json'],cwd=root,text=True,encoding='utf-8'))
    reject_downgrade(previous,feed,datetime.now(timezone.utc))
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
        if own.get('kp_source_requirement')=='NOAA_3day_slots':
            if own.get('available') is not False or own.get('value') is not None or own.get('raw') is not None or own.get('factors')!=[] or row.get('forecast_result',{}).get('score') is not None:
                raise ValueError('Withheld Kp date exposes a score')
            if own.get('status')!='missing_kp' or own.get('availability_reason')!='short_range_coverage_lost':raise ValueError('Unmarked Kp suppression')
        if own.get('validation')!='unvalidated_source_formula' or own.get('expert_override_used') is not False:raise ValueError('Invalid promotion claim')
    return True

if __name__=='__main__':
    validate(Path.cwd())
    for line in subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines():
        if not line[3:].startswith('consumer_cloud/'):raise ValueError('Unrelated working change')
    print('PASS isolated cloud publication')
