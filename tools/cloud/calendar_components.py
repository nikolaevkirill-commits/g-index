"""Calendar calculations with explicit separation from normative symbol selection.

No arbitrary festival selection, missing-factor zeros, or additional weights.
Civil intervals are half open. Sunrise convention is explicitly recorded.
"""
from datetime import date,datetime,time,timedelta
from zoneinfo import ZoneInfo
import math
from expert_astronomy import _jd,_tithi,_tithi_boundaries,_from_jd
import skyrhythm_rnd_extras as base
import pradosh_overlap,parana_scenario

SYMBOLS=('bolt','books','diwali','dress','ekadashi','first_lunar_day','full_moon',
    'hand','heart','masik_shivaratri','medical_cross','megaphone','navaratri',
    'new_moon','pill','pitru_paksha','plane','pradosh','sankashti','scissors',
    'solah_somvar','sun_transition_filled','sun_transition_outline','syringe',
    'target','triangle','vijaya_dashami','vinayaka_chaturthi')

def civil_tithis(day,zone):
    d=date.fromisoformat(day);tz=ZoneInfo(zone)
    start=datetime.combine(d,time(),tzinfo=tz);end=datetime.combine(d+timedelta(days=1),time(),tzinfo=tz)
    a,b=_jd(start),_jd(end)
    # Padded root search supplies the full endpoints of each intersecting tithi.
    roots=_tithi_boundaries(a-1.6,b+1.6)
    pieces=[];events=[]
    for x,y in zip(roots,roots[1:]):
        if y<=a or x>=b:continue
        t=_tithi((x+y)/2)
        pieces.append({'tithi':t,'start_local':_from_jd(x,tz).isoformat(),
            'end_local':_from_jd(y,tz).isoformat(),
            'overlap_start_local':_from_jd(max(a,x),tz).isoformat(),
            'overlap_end_local':_from_jd(min(b,y),tz).isoformat(),
            'duration_seconds':(min(b,y)-max(a,x))*86400})
    for x in roots:
        if a<=x<b:
            after=_tithi(x+1e-6)
            if after in (1,16):events.append({'kind':'new_moon' if after==1 else 'full_moon',
                'at_local':_from_jd(x,tz).isoformat(),
                'definition':'geocentric_elongation_0' if after==1 else 'geocentric_elongation_180'})
    if not pieces or not math.isclose(sum(p['duration_seconds'] for p in pieces),(b-a)*86400,abs_tol=.01):
        raise ValueError('Incomplete tithi partition')
    return {'date':day,'zone':zone,'civil_day_seconds':(b-a)*86400,'interval_convention':'[start,end)',
        'tithis':pieces,'phase_events':events,'physical_uncertainty_ms':None}

def calculate(day,observed_icons,*,city='Kyiv'):
    if observed_icons is not None and (not isinstance(observed_icons,list) or any(x not in SYMBOLS for x in observed_icons) or len(set(observed_icons))!=len(observed_icons)):
        raise ValueError('Unknown or duplicate source symbol')
    if city not in base.LOCATIONS:raise ValueError('Unsupported explicit city')
    d=date.fromisoformat(day);zone=base.LOCATIONS[city][2]
    lunar=civil_tithis(day,zone)
    rise=base._rise_on(d,city)
    sunrise_tithi=None if rise is None else base.tithi_at(rise)
    ek,reason=base.parana_day_rule(d+timedelta(days=1),city,'smarta_drik')
    ek=None if reason=='NO_LOCAL_SUNRISE' else ek
    pr=pradosh_overlap.calculate(d,city,'night_fifth')
    pa=parana_scenario.calculate(d,city,'smarta_drik')
    candidates={
        'first_lunar_day':{'tithi1_overlap':any(p['tithi']==1 for p in lunar['tithis']),'sunrise_tithi1':None if rise is None else sunrise_tithi==1},
        'full_moon':{'phase_event_in_civil_day':any(e['kind']=='full_moon' for e in lunar['phase_events']),'tithi15_overlap':any(p['tithi']==15 for p in lunar['tithis'])},
        'new_moon':{'phase_event_in_civil_day':any(e['kind']=='new_moon' for e in lunar['phase_events']),'tithi30_overlap':any(p['tithi']==30 for p in lunar['tithis'])},
        'ekadashi':{'smarta_drik_partial':ek,'reason':reason,'full_vaishnava_rules_implemented':False},
        'pradosh':{'night_fifth_trayodashi_overlap':pr.get('overlap_available') if pr.get('available') else None}}
    states={}
    for symbol in SYMBOLS:
        observed=None if observed_icons is None else symbol in observed_icons
        rule='RITUAL_DATE_RULE_UNCONFIRMED' if symbol in ('diwali','masik_shivaratri','navaratri','pitru_paksha','sankashti','solah_somvar','vijaya_dashami','vinayaka_chaturthi') else 'AUTHOR_SELECTION_RULE_UNSPECIFIED'
        if symbol in ('sun_transition_filled','sun_transition_outline'):rule='AUTHOR_DEGREE_WINDOW_UNRESOLVED'
        if symbol in candidates:rule='CANDIDATE_CALCULATED_SELECTION_UNCONFIRMED'
        if symbol=='bolt':rule='SEE_RIKTA_MODEL'
        states[symbol]={'observed':observed,'selected':observed,
            'status':'SOURCE_OBSERVED' if observed is not None else rule,
            'candidate':candidates.get(symbol),'automatic_score_authorized':False}
    return {'version':'calendar-components-v1','date':day,'city':city,'zone':zone,
        'location_status':'SCENARIO_NOT_CONFIRMED_AUTHOR_LOCATION','lunar':lunar,
        'sunrise_tithi':sunrise_tithi,'sunrise_convention':'upper_limb_standard_refraction_swe',
        'parana':pa,'pradosh':pr,'symbols':states,
        'missing_selection_rules':[s for s in SYMBOLS if observed_icons is None and s!='bolt'],
        'score_adjustment':0,'normative_selection_confirmed':False}
