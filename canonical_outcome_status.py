"""Read the builder-owned outcome status, never its older publication mirror."""
import hashlib,json

RELATIVE='outputs/OUTCOME_LEDGER_STATUS_v1.json'

def read_outcome_status(root):
    raw=(root/RELATIVE).read_bytes()
    data=json.loads(raw.decode('utf-8-sig'))
    if not isinstance(data,dict) or data.get('schema')!='outcome_ledger_status_v2':
        raise ValueError('canonical_outcome_status_schema_invalid')
    real=data.get('real_outcomes')
    if not isinstance(real,dict):raise ValueError('canonical_outcome_metrics_missing')
    for field in ('paired_with_frozen_prediction','paired_with_prior_frozen_prediction'):
        if type(real.get(field)) is not int or real[field]<0:
            raise ValueError('canonical_outcome_count_invalid:'+field)
    if real['paired_with_frozen_prediction']!=real['paired_with_prior_frozen_prediction']:
        raise ValueError('canonical_outcome_count_alias_conflict')
    return data,{'path':RELATIVE,'sha256':hashlib.sha256(raw).hexdigest(),
                 'generated_at_utc':data.get('generated_at_utc'),
                 'freshness':'not_asserted_by_this_reader'}
