"""Exploratory zero-weight features. Not imported by production.

Fixed 0.30 was supplied by an external audit, not re-fitted here.
The 15-minute sample-count rule reproduces that audit; it is not an exact
integration of daylight duration. Kyiv is an explicit scenario assumption.
"""
from datetime import datetime,date,time,timedelta,timezone
from zoneinfo import ZoneInfo
import math
import swisseph as swe

RIKTA=frozenset((4,9,14,19,24,29))
FLAGS=swe.FLG_MOSEPH|swe.FLG_SIDEREAL

def _lon(j,p):
 swe.set_sid_mode(swe.SIDM_LAHIRI)
 r=swe.calc_ut(j,p,FLAGS)
 if len(r)>2 and r[2]:raise RuntimeError(r[2])
 if not r[1]&swe.FLG_MOSEPH:raise RuntimeError('Unexpected ephemeris')
 return r[0][0]

def _jd(t):
 if t.tzinfo is None:raise ValueError('Timezone-aware instant required')
 u=t.astimezone(timezone.utc)
 return swe.julday(u.year,u.month,u.day,u.hour+u.minute/60+(u.second+u.microsecond/1e6)/3600)

def _tithi(j):return int((_lon(j,swe.MOON)-_lon(j,swe.SUN))%360/12)+1
def _signed(x):return (x+180)%360-180

def detect_bolt_rikta(day,*,latitude=50.45,longitude=30.52,zone='Europe/Kyiv',threshold=.30,step_minutes=15):
 d=date.fromisoformat(day);tz=ZoneInfo(zone)
 if not all(math.isfinite(v) for v in (latitude,longitude,threshold,step_minutes)):raise ValueError('Finite parameters required')
 if not(-90<latitude<90 and -180<=longitude<=180 and 0<=threshold<=1 and 0<step_minutes<=60):raise ValueError('Invalid parameters')
 start=datetime.combine(d,time(),tzinfo=tz);j=_jd(start);geo=(longitude,latitude,0)
 base={'date':day,'zone':zone,'latitude':latitude,'longitude':longitude,'score_adjustment':0,'physical_uncertainty_ms':None,'status':'EXPLORATORY_NOT_VALIDATED','convention':'Lahiri/Moshier; refracted solar disc centre, default atmosphere; sample-count fraction','threshold':threshold,'step_minutes':step_minutes}
 rise=swe.rise_trans(j,swe.SUN,swe.CALC_RISE|swe.BIT_DISC_CENTER,geo,0,0,swe.FLG_MOSEPH)
 if rise[0]!=0:return dict(base,available=False,reason='NO_SUNRISE',bolt=None)
 sr=rise[1][0];setting=swe.rise_trans(sr,swe.SUN,swe.CALC_SET|swe.BIT_DISC_CENTER,geo,0,0,swe.FLG_MOSEPH)
 if setting[0]!=0:return dict(base,available=False,reason='NO_SUNSET',bolt=None)
 ss=setting[1][0]
 if not 0<ss-sr<1:return dict(base,available=False,reason='NONSTANDARD_DAYLIGHT',bolt=None)
 samples=[];weighted=0.;x=sr;step=step_minutes/1440
 while x<=ss:
  hit=_tithi(x) in RIKTA;samples.append(hit)
  if hit:weighted+=max(0,min(x+step,ss)-x)
  x+=step
 fraction=sum(samples)/len(samples)
 return dict(base,available=True,bolt=fraction>=threshold,sample_fraction=fraction,duration_fraction_approx=weighted/(ss-sr),samples=len(samples),sunrise_jd=sr,sunset_jd=ss)

def gandanta_states_utc(instant):
 if isinstance(instant,str):instant=datetime.fromisoformat(instant.replace('Z','+00:00'))
 j=_jd(instant);lon=_lon(j,swe.MOON);boundary=round(lon/120)*120%360;distance=_signed(lon-boundary)
 out={'instant':instant.isoformat(),'boundary_deg':boundary,'distance_deg':distance,'moon_pada':abs(distance)<=10/3,'nakshatra_90min':False,'minutes_from_crossing':None,'score_adjustment':0,'physical_uncertainty_ms':None,'status':'EXPLORATORY_NOT_VALIDATED','convention':'Lahiri/Moshier, geocentric; independent time-width and angular-width features'}
 if abs(distance)>25:return out
 lo=j-3;hi=j+3
 def f(t):return _signed(_lon(t,swe.MOON)-boundary)
 if not f(lo)<0<f(hi):return dict(out,nakshatra_90min=None,status='CROSSING_NOT_BRACKETED')
 for _ in range(45):
  mid=(lo+hi)/2
  if f(mid)<0:lo=mid
  else:hi=mid
 minutes=(j-(lo+hi)/2)*1440
 return dict(out,nakshatra_90min=abs(minutes)<=90,minutes_from_crossing=minutes)

def _elong(j):return (_lon(j,swe.MOON)-_lon(j,swe.SUN))%360

def _tithi_boundaries(j0,j1,step=1/96):
 """Roots of tithi transitions in [j0,j1): Moon-Sun elongation crossing a multiple of 12 deg (ayanamsa-independent)."""
 if not math.isfinite(step) or step<=0:raise ValueError("Positive finite step required")
 if j1<=j0:return []
 f=lambda x:(_elong(x)+6)%12-6
 out=[];a=j0;fa=f(a)
 # Angular tolerance handles roundoff at a previously bisected Julian-date root.
 # Numerical convention only; not a physical uncertainty bound.
 if abs(fa)<=1e-8:
  out.append(a);fa=0.0
 while a<j1:
  b=min(a+step,j1);fb=f(b)
  if fa<0<=fb:
   lo,hi=a,b
   for _ in range(50):
    mid=(lo+hi)/2
    if f(mid)<0:lo=mid
    else:hi=mid
   if hi<j1 and (not out or hi>out[-1]):out.append(hi)
  a,fa=b,fb
 return out

def _from_jd(j,tz):
 y,m,d,h=swe.revjul(j)
 return (datetime(y,m,d,tzinfo=timezone.utc)+timedelta(hours=h)).astimezone(tz)

def rikta_intervals(day,*,zone='Europe/Kyiv'):
 """Numerically computed Rikta tithi intervals overlapping the local civil day [00:00, next 00:00).
 Returns local ISO times truncated to seconds and separate minute display fields.
 Comparisons with printed clocks require an explicitly assumed source timezone."""
 d=date.fromisoformat(day);tz=ZoneInfo(zone)
 start=datetime.combine(d,time(),tzinfo=tz);end=datetime.combine(d+timedelta(days=1),time(),tzinfo=tz)
 j0=_jd(start);j1=_jd(end)
 # extend search by ~1.2 tithi to find the edges of intervals that overlap the day
 bounds=_tithi_boundaries(j0-1.3,j1+1.3)
 segs=[]
 edges=[j0-1.3]+bounds+[j1+1.3]
 for a,b in zip(edges,edges[1:]):
  t=_tithi((a+b)/2)
  if t in RIKTA and b>j0 and a<j1:
   segs.append((a,b,t))
 out=[]
 for a,b,t in segs:
  sa=_from_jd(a,tz);sb=_from_jd(b,tz)
  out.append({'tithi':t,'start_local':sa.isoformat(timespec='seconds'),'end_local':sb.isoformat(timespec='seconds'),
   'start_in_day':j0<=a<j1,'end_in_day':j0<b<=j1,
   'start_hhmm':sa.strftime('%H:%M') if j0<=a<j1 else None,'end_hhmm':sb.strftime('%H:%M') if j0<b<=j1 else None,
   'minutes_in_day':round((min(b,j1)-max(a,j0))*1440,1)})
 return {'date':day,'zone':zone,'intervals':out,'rikta_minutes_in_day':round(sum(x['minutes_in_day'] for x in out),1),
  'score_adjustment':0,'physical_uncertainty_ms':None,'status':'EXPLORATORY_NOT_VALIDATED',
  'convention':'Tithi edges from Moon-Sun elongation (ayanamsa-independent), Moshier; local civil day; minute display rounded down'}
