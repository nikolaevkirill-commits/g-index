"""Active expert-factor adapter. Observed calendar > inferred Rikta.

Recalculates the formula with the selected bolt exactly once. Other factors,
Kp and bucketing stay unchanged. Missing calendar factors block a full score.
"""
import copy, hashlib, math
from pathlib import Path
from expert_astronomy import detect_bolt_rikta, rikta_intervals

VERSION='expert-factor-model-v2'
TAG='День порожні руки, несприятливий'
ZONE='Europe/Kyiv'

def bucket(raw):
    return max(-3,min(3,math.trunc(raw)))

def apply(doc, weights):
    if weights.get(TAG)!=-3:
        raise ValueError('Source bolt weight changed; review required')
    out=copy.deepcopy(doc)
    for row in out['rows']:
        day=row['date']
        feature=detect_bolt_rikta(day,latitude=50.45,longitude=30.52,zone=ZONE)
        intervals=rikta_intervals(day,zone=ZONE)
        observed=row.get('observed_icons')
        if observed is not None and (not isinstance(observed,list) or len(observed)!=len(set(observed))):
            raise ValueError('Invalid observed symbols')
        source_bolt=None if observed is None else 'bolt' in observed
        selected=source_bolt if source_bolt is not None else feature['bolt']
        previous=row.get('forecast_score')
        complete=observed is not None and previous is not None
        model={'version':VERSION,'date':day,'zone':ZONE,'latitude':50.45,'longitude':30.52,
            'location_basis':'MODEL_KYIV_SCENARIO_NOT_CONFIRMED_AUTHOR_LOCATION',
            'observed_bolt':source_bolt,'computed_bolt':feature['bolt'],'selected_bolt':selected,
            'selected_origin':'observed_calendar' if observed is not None else 'computed_rikta',
            'sample_fraction':feature.get('sample_fraction'),'threshold':0.30,'step_minutes':15,
            'symbol':'bolt' if selected else None,'source_model_conflict':source_bolt is not None and feature['bolt'] is not None and source_bolt!=feature['bolt'],
            'intervals':intervals['intervals'],'interval_basis':'COMPUTED_NOT_AUTHOR_PRINTED_CLOCKS',
            'factor_weight':weights[TAG],'selected_contribution':None if selected is None else weights[TAG]*int(selected),
            'scope':'new_starts','applied_to_score':complete,'full_calendar_available':observed is not None,
            'missing':[] if observed is not None else ['OTHER_CALENDAR_FACTORS'],
            'physical_uncertainty_ms':None,'validation':'LABEL_REPRODUCTION_NOT_OUTCOME_VALIDATION'}
        if complete:
            factors=row.get('contributions',[])
            if sum(f.get('factor')==TAG for f in factors)>1:raise ValueError('Duplicate bolt')
            revised=[f for f in factors if f.get('factor')!=TAG]
            if selected:revised.append({'factor':TAG,'value':weights[TAG]})
            if any(type(f.get('value')) not in (int,float) or not math.isfinite(f['value']) for f in revised):raise ValueError('Invalid factor')
            raw=math.fsum(f['value'] for f in revised)
            if row.get('threshold_policy')!='symmetric_intervals_candidate':raise ValueError('Unknown score threshold policy')
            score=bucket(raw)
            # Observed source fidelity is mandatory, not a fitted prediction.
            if score!=previous or raw!=row.get('raw_sum'):raise ValueError('Observed source replay changed')
            row.update(contributions=revised,raw_sum=raw,forecast_score=score)
        row['expert_model']=model
    out.setdefault('code_hashes',{}).update({n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest() for n in ('expert_model.py','expert_astronomy.py')})
    return out

def verify(doc):
    """Independent arithmetic and contract checks, after the source replay."""
    for row in doc['rows']:
        m=row['expert_model'];score=row.get('forecast_score')
        if m['date']!=row['date'] or m['version']!=VERSION:raise ValueError('Model identity mismatch')
        if m['physical_uncertainty_ms'] is not None:raise ValueError('Unsupported certainty')
        if m['observed_bolt'] is not None and m['selected_bolt']!=m['observed_bolt']:raise ValueError('Source priority lost')
        if m['applied_to_score']:
            fs=row['contributions'];bolt=[f['value'] for f in fs if f['factor']==TAG]
            if bolt!=([-3] if m['selected_bolt'] else []):raise ValueError('Bolt not applied exactly once')
            raw=sum(f['value'] for f in fs)
            if not math.isclose(raw,row['raw_sum'],abs_tol=1e-12) or score!=max(-3,min(3,int(raw))):raise ValueError('Arithmetic mismatch')
        elif score is not None:raise ValueError('Incomplete score promoted')
    return {'status':'PASS','version':VERSION,'replayed_days':len(doc['rows'])}
