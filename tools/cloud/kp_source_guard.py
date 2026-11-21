"""Reject silent short-range -> outlook regressions; never refresh old data."""
from datetime import datetime
from zoneinfo import ZoneInfo
import copy
import math


# Only calendar factors with a topic in the day verdict. Never export weights or Kp.
CALENDAR_MARKS = ('Книги', 'сприятливий для подорожей', '1 місячний день', 'Мішень', 'сприятливий для стрижки', 'Сукня', 'Гучномовець', 'День порожні руки, несприятливий', 'Тричі  трикутник')


def calendar_projection(day, own, candidate):
    factors = own.get('factors')
    if ('expert_model' in own or candidate.get('executor') != 'github-actions-source-only-v1'
            or candidate.get('source_integrity', {}).get('status') != 'PASS'
            or candidate['days'][day].get('date') != day or own.get('available') is not True
            or not own.get('generated_at') or own['generated_at'] != candidate.get('generated_at')
            or not isinstance(factors, list) or not factors):
        return None
    for f in factors:
        if (not isinstance(f, dict) or not isinstance(f.get('factor'), str)
                or type(f.get('value')) not in (int, float) or not math.isfinite(f['value'])):
            return None
    names = {f['factor'] for f in factors}
    if 'Kp' not in names:
        return None
    return {'date': day, 'source': 'source_formula_calendar_factors',
            'marks': [mark for mark in CALENDAR_MARKS if mark in names]}


def valid_calendar_projection(day, record):
    if (not isinstance(record, dict) or set(record) != {'date', 'source', 'marks'}
            or record['date'] != day or record['source'] != 'source_formula_calendar_factors'
            or not isinstance(record['marks'], list)):
        return False
    return record['marks'] == [mark for mark in CALENDAR_MARKS if mark in record['marks']]



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
        calendar = calendar_projection(day, own, candidate)
        own.pop('calendar_marks', None)
        if calendar is not None:
            own['calendar_marks'] = calendar
        own.update(available=False, value=None, raw=None, factors=[], status='missing_kp',
                   kp_input=None, kp_source=None, kp_daily_max=None, kp_timezone=None,
                   noaa_issued_at=None, noaa_retrieved_at=None,
                   kp_source_requirement='NOAA_3day_slots',
                   availability_reason='short_range_coverage_lost')
        row['source_formula_result'] = {'score':None, 'authority':'source_formula_unvalidated', 'expert_override_used':False}
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
