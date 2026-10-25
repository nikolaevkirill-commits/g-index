"""Opt-in publisher comparison, never an observance selector or production rule."""
import math
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
import skyrhythm_rnd_extras as b

def select_window(rise,sunset,dv_start,dv_end):
    if not all(math.isfinite(x) for x in (rise,sunset,dv_start,dv_end)) or not rise < sunset or not dv_start < dv_end: raise ValueError('Invalid intervals')
    fifth=(sunset-rise)/5
    hari=dv_start+(dv_end-dv_start)/4
    if dv_end<=rise:
        return rise,rise+fifth,'DVADASHI_ENDED_BEFORE_SUNRISE'
    start=max(rise,hari)
    end=min(rise+fifth,dv_end)
    if start<end:return start,end,'PRATAHKAL'
    start=max(rise+3*fifth,hari)
    end=min(rise+4*fifth,dv_end)
    if start<end:return start,end,'APARAHNA_COMPARISON'
    return None,None,'NO_WINDOW_UNDER_THIS_CONVENTION'

def calculate(day,city,convention='smarta_drik'):
    if convention not in ('smarta_drik','vaishnava_kshaya'): raise ValueError('Unknown Parana convention')
    geo,tz=b._loc(city)
    zero=b._jd_utc(datetime(day.year,day.month,day.day,tzinfo=ZoneInfo(tz)))
    stop=b._jd_utc(datetime(day.year,day.month,day.day,tzinfo=ZoneInfo(tz))+timedelta(days=1))
    meta=dict(b.META,feature='parana_publisher_comparison',date=str(day),city=city,
              observance_date_selected=True, normative_selection_confirmed=False,
              day_rule_applied=True, full_vaishnava_rules_implemented=False,
              convention='pratah_or_aparahna_v1',day_convention=convention)
    rise=b.swe.rise_trans(zero,b.swe.SUN,b.swe.CALC_RISE,geo,0,0,b.FL)
    if rise[0]!=0 or not zero<=rise[1][0]<stop:return dict(meta,available=False,reason='NO_LOCAL_SUNRISE')
    rise=rise[1][0]
    sunset=b.swe.rise_trans(rise,b.swe.SUN,b.swe.CALC_SET,geo,0,0,b.FL)
    if sunset[0]!=0 or not rise<sunset[1][0]<stop:return dict(meta,available=False,reason='NO_LOCAL_SUNSET')
    sunset=sunset[1][0]
    ok,why=b.parana_day_rule(day,city,convention)
    if not ok:return dict(meta,available=False,reason=why)
    t,ds,de=b.tithi_span(rise)
    if t not in (12,27):
        # Only immediately preceding Dvadashi qualifies for the sunrise exception.
        if t not in (13,28):return dict(meta,available=False,reason='NO_ADJACENT_DVADASHI')
        pt,ds,de=b.tithi_span(ds-1e-7)
        if pt not in (12,27) or not de<=rise:return dict(meta,available=False,reason='NO_ADJACENT_DVADASHI')
    a,z,reason=select_window(rise,sunset,ds,de)
    if a is None:return dict(meta,available=False,reason=reason)
    return dict(meta,available=True,reason=reason,start=b._dt(a,tz).isoformat(),end=b._dt(z,tz).isoformat(),
                dvadashi_start=b._dt(ds,tz).isoformat(),dvadashi_end=b._dt(de,tz).isoformat())
