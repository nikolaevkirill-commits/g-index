"""Research intervals only. No observance-date selection or production authority."""
import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import skyrhythm_rnd_extras as base


def intersect(a, b, c, d):
    if not all(math.isfinite(x) for x in (a, b, c, d)) or a >= b or c >= d:
        raise ValueError('Finite, increasing intervals required')
    start, end = max(a, c), min(b, d)
    return (start, end) if start < end else None


def calculate(day, city='Nesebar', variant='night_fifth'):
    if variant not in ('night_fifth', 'legend_pm45'):
        raise ValueError('Unknown convention')
    geo, tz = base._loc(city)
    # V10 (Д2): «вечір дати» = захід у [12:00 дати; 12:00 наступної дати) місцевого часу,
    # щоб захід після опівночі біля полярного дня не губився.
    jd0 = base._jd_utc(datetime(day.year, day.month, day.day, 12, tzinfo=ZoneInfo(tz)))
    stop = base._jd_utc(datetime(day.year, day.month, day.day, 12, tzinfo=ZoneInfo(tz)) + timedelta(days=1))
    result = base.swe.rise_trans(jd0, base.swe.SUN, base.swe.CALC_SET, geo, 0, 0, base.FL)
    meta = dict(base.META, feature='pradosh_trayodashi_overlap', date=str(day), city=city,
                variant=variant, observance_date_selected=False, interval_convention='[start,end)',
                evening_date_convention='local_noon_to_next_noon', evening_date_convention_status='EXPLICIT_RESEARCH_CHOICE')
    if result[0] != 0 or not jd0 <= result[1][0] < stop:
        return dict(meta, available=False, base_window_available=False, overlap_available=False, reason='NO_LOCAL_SUNSET', base_window=None, overlaps=[])
    sunset = result[1][0]
    rise = base.swe.rise_trans(sunset, base.swe.SUN, base.swe.CALC_RISE, geo, 0, 0, base.FL)
    if rise[0] != 0 or not sunset < rise[1][0] < sunset + 2:
        return dict(meta, available=False, base_window_available=False, overlap_available=False, reason='NO_NEXT_SUNRISE', base_window=None, overlaps=[])
    a, b = ((sunset, sunset + (rise[1][0] - sunset)/5) if variant == 'night_fifth'
            else (sunset-45/1440, sunset+45/1440))
    # Sub-hour sampling locates every tithi intersecting this short evening window.
    # Root solver supplies the actual boundaries; sample times are not boundaries.
    segments = {}
    steps = max(2, math.ceil((b-a)*48))
    samples = [a, b] + [a+(b-a)*(i+0.5)/steps for i in range(steps)]
    for instant in samples:
        t, start, end = base.tithi_span(instant)
        if t in (13, 28):
            hit = intersect(a, b, start, end)
            if hit:
                segments[t] = hit
    def interval(x, y):
        return {'start_utc':base._dt(x,'UTC').isoformat(), 'end_utc':base._dt(y,'UTC').isoformat(),
                'start_local':base._dt(x,tz).isoformat(), 'end_local':base._dt(y,tz).isoformat()}
    return dict(meta, available=True, base_window_available=True, overlap_available=bool(segments),
                base_window=interval(a,b),
                overlaps=[dict(interval(x,y),tithi=t) for t,(x,y) in sorted(segments.items())],
                reason=None if segments else 'NO_TRAYODASHI_OVERLAP')
