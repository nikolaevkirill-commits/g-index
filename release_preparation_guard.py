"""Validate an exact, recently prepared recovery payload; never report job PASS.

Old operational failures remain in SYSTEM_HEALTH_STATUS unchanged. They can be
superseded for one publication attempt only by all required preparation results
bound to every staged file. This is local evidence integrity, not a signature
against an editor possessing the same repository permissions.
"""
import hashlib
import re
from datetime import datetime, timezone

RECEIPT = 'RELEASE_PREPARATION_v1.json'
STEPS = ('daily_chain', 'live_context_refresh', 'kp_alert', 'final_manifest',
         'health_manifest_rehash', 'original_exact_package_guard')
HISTORICAL = {'no_successful_pipeline_completion'} | {
    f'scheduled_task_failed:{job}:{code}'
    for job in ('PROGNOZ_daily_chain','PROGNOZ_live_context_refresh','PROGNOZ_kp_alert')
    for code in (1,73)
}

def stamp(value):
    if not isinstance(value,str): raise ValueError('timestamp_missing')
    result=datetime.fromisoformat(value.replace('Z','+00:00'))
    if result.tzinfo is None: raise ValueError('timestamp_without_timezone')
    return result

def digest(value):
    return isinstance(value,str) and re.fullmatch('[a-f0-9]{64}',value) is not None

def validate_preparation(receipt, health, paths, read_bytes, *, now=None):
    """Caller must supply exact Git-index paths/bytes, not mixed worktree data."""
    now=now or datetime.now(timezone.utc)
    if not isinstance(receipt,dict) or receipt.get('schema')!='gindex_release_preparation_v1':
        raise ValueError('preparation_schema_invalid')
    if receipt.get('state')!='PREPARED' or receipt.get('full_job_success') is not False or receipt.get('publication_verified') is not False:
        raise ValueError('preparation_is_not_completed_release')
    if not re.fullmatch('[a-f0-9]{32}',str(receipt.get('cohort_id',''))): raise ValueError('cohort_identity_invalid')
    started=stamp(receipt.get('started_at')); finished=stamp(receipt.get('prepared_at'))
    # Two hours is the existing shortest required job cadence (Kp), not a model threshold.
    if not started<=finished<=now or (now-finished).total_seconds()>7200:
        raise ValueError('preparation_stale_future_or_reversed')
    failures=health.get('hard_failures')
    if not isinstance(failures,list) or not failures or any(type(x) is not str or x not in HISTORICAL for x in failures):
        raise ValueError('current_or_unknown_health_failure')
    if health.get('status')!='FAIL' or receipt.get('historical_health_failures')!=failures:
        raise ValueError('historical_failures_must_remain_explicit')
    health_time=stamp(health.get('generated_at'))
    if not started<=health_time<=finished: raise ValueError('health_not_from_current_preparation')
    if receipt.get('source_unchanged') is not True or receipt.get('protected_unchanged') is not True:
        raise ValueError('preparation_integrity_failed')
    steps=receipt.get('steps')
    if not isinstance(steps,list) or [s.get('name') for s in steps if isinstance(s,dict)]!=list(STEPS):
        raise ValueError('preparation_steps_missing_duplicate_or_reordered')
    previous=started
    for step in steps:
        a=stamp(step.get('started_at')); b=stamp(step.get('finished_at'))
        if not previous<=a<=b<=finished: raise ValueError('step_time_invalid')
        if type(step.get('exit_code')) is not int or step['exit_code']!=0:
            raise ValueError('preparation_step_failed')
        if not all(digest(step.get(k)) for k in ('result_sha256','stdout_sha256','stderr_sha256')):
            raise ValueError('step_evidence_missing')
        previous=b
    sources=receipt.get('producer_source_sha256')
    if not isinstance(sources,dict) or not sources or not all(isinstance(k,str) and digest(v) for k,v in sources.items()):
        raise ValueError('producer_source_identity_missing')
    payload=receipt.get('payload_sha256')
    exact=set(paths)-{RECEIPT}
    if not isinstance(payload,dict) or set(payload)!=exact:
        raise ValueError('payload_inventory_mismatch')
    if not {'index.html','sw.js','data_manifest.json','SYSTEM_HEALTH_STATUS_v1.json','engine_scores.json'}<=exact:
        raise ValueError('required_payload_missing')
    for name,expected in payload.items():
        if not isinstance(name,str) or name.startswith('/') or '\\' in name or ':' in name or '..' in name.split('/'):
            raise ValueError('payload_path_invalid')
        if not digest(expected) or hashlib.sha256(read_bytes(name)).hexdigest()!=expected:
            raise ValueError('payload_changed:'+name)
    return {'state':'READY_FOR_GUARDED_PUBLISH','full_job_success':False,
            'publication_verified':False,'historical_health_failures':failures,
            'cohort_id':receipt['cohort_id']}
