"""Reject silent short-range -> outlook regressions; never refresh old data."""
from datetime import datetime
from zoneinfo import ZoneInfo
import copy


def requires_slots(own):
    return own.get('kp_source_requirement') == 'NOAA_3day_slots' or (
        own.get('available') and (own.get('kp_input') or {}).get('source', own.get('kp_source')) == 'NOAA_3day_slots')


def suppress_downgrades(previous, candidate, now):
    """Availability projection, not recalculation or reuse of expired scores."""
    if now.tzinfo is None:
        raise ValueError('Timezone required')
    result = copy.deepcopy(candidate)
    today = now.astimezone(ZoneInfo('Europe/Kyiv')).date().isoformat()
    withheld = []
    for day, row in result.get('days', {}).items():
        old = previous.get('days', {}).get(day, {}).get('channels', {}).get('source_formula', {})
        own = row.get('channels', {}).get('source_formula', {})
        source = (own.get('kp_input') or {}).get('source', own.get('kp_source'))
        if day < today or not requires_slots(old) or source == 'NOAA_3day_slots':
            continue
        own.update(available=False, value=None, raw=None, factors=[], status='missing_kp',
                   kp_input=None, kp_source=None, kp_daily_max=None, kp_timezone=None,
                   noaa_issued_at=None, noaa_retrieved_at=None,
                   kp_source_requirement='NOAA_3day_slots',
                   availability_reason='short_range_coverage_lost')
        row['forecast_result'] = {'score':None, 'authority':'source_formula_unvalidated', 'expert_override_used':False}
        withheld.append(day)
    result['availability_projection'] = {'policy':'no_short_range_downgrade_v1', 'withheld_dates':withheld,
        'scope':'Source replay precedes availability suppression; no replacement score is introduced'}
    return result


def reject_downgrade(previous, candidate, now):
    if now.tzinfo is None:
        raise ValueError('Timezone required')
    today = now.astimezone(ZoneInfo('Europe/Kyiv')).date().isoformat()
    regressions = []
    for day, old_row in previous.get('days', {}).items():
        if day < today:
            continue
        old = old_row.get('channels', {}).get('source_formula', {})
        new = candidate.get('days', {}).get(day, {}).get('channels', {}).get('source_formula', {})
        old_source = (old.get('kp_input') or {}).get('source', old.get('kp_source'))
        new_source = (new.get('kp_input') or {}).get('source', new.get('kp_source'))
        if requires_slots(old) and new.get('available') and new_source == 'NOAA_27day_outlook':
            regressions.append(day)
    if regressions:
        raise ValueError('Kp source downgrade blocked for ' + ', '.join(regressions) +
                         '; published feed retains its original timestamps and expires normally')
    return True
