import importlib.util,json,os
from pathlib import Path
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
folder=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('bot',folder.parent.parent/'tools/kp_alert_bot.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
text=(folder/'noaa_3day_0030.txt').read_text(encoding='utf-8')
now=datetime(2026,9,15,5,46,tzinfo=timezone.utc)
checks=[]
class FixedDate(datetime):
 @classmethod
 def now(cls,tz=None):return now
class Response:
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def read(self):return text.encode()
def run(obs,forecast,fail_text=False):
 saved=[]
 def fetch(url):
  result=obs if url==m.FACT_URL else forecast
  if isinstance(result,Exception):raise result
  return result
 with patch.object(m,'datetime',FixedDate),patch.object(m,'fetch_json',side_effect=fetch),patch.object(m.urllib.request,'urlopen',side_effect=OSError() if fail_text else lambda *a,**k:Response()),patch.object(m,'save_json',side_effect=lambda p,v:saved.append(v)),patch.object(m,'log'),patch.object(m,'load_state',return_value={'sent_events':{}}),patch.object(m,'send_telegram',side_effect=AssertionError('No sends in test')),patch.dict(os.environ,{'GINDEX_ALERT_DRY_RUN':'1'}):
  code=m.main()
 return code,saved[0] if saved else None
for label,obs,fc in [('empty',[],[]),('http',[],OSError()),('observed_http',OSError(),[]),('dict',[],{'error':'no data'}),('malformed',[],[['header'],['bad','nan']])]:
 code,s=run(obs,fc);assert code==0 and s['peak']['kp']==4.67 and s['peak']['level']==1,label
 assert s['forecast_coverage']['status']=='complete' and s['forecast_coverage']['forecast_slots']==5
 assert s['slots'][0]['time_utc']=='2026-09-15T03:00:00+00:00'
 checks.append(label+'_fallback_active_bin')
code,s=run([],[],True);assert code==1 and s is None;checks.append('all_missing_preserves_snapshot')
code,s=run([{'time_tag':'2026-09-15T03:00Z','kp':2}],[],True);assert code==0 and s['forecast_coverage']['status']=='missing';checks.append('observed_only_explicit_missing')
code,s=run([],[{'time_tag':'2026-09-15T09:00Z','kp':2}],True);assert s['forecast_coverage']['status']=='partial' and s['forecast_coverage']['forecast_slots']==1;checks.append('one_slot_partial')
code,s=run([],[{'time_tag':'2026-09-15T09:00Z','kp':5}]);assert s['forecast_coverage']['status']=='complete' and next(x for x in s['slots'] if '09:00:' in x['time_utc'])['source']=='forecast';checks.append('partial_text_fills_without_overwriting_json')
valid=[{'time_tag':f'2026-09-15T{h:02d}:00Z','kp':2} for h in [3,6,9,12,15]]
code,s=run([],valid,True);assert s['forecast_coverage']['status']=='complete' and 'fallback' not in s;checks.append('complete_json_no_text')
for label,bad,date in [('stale',text,now+timedelta(days=3)),('future',text,now-timedelta(days=2)),('missing_issue',text.replace(':Issued:',':Unknown:'),now),('missing_row','\n'.join(l for l in text.splitlines() if not l.startswith('09-12UT')),now),('nan',text.replace('3.33','nan',1),now),('duplicate',text.replace('09-12UT','06-09UT'),now)]:
 try:m.parse_text_forecast(bad,date)
 except ValueError:checks.append('reject_'+label)
 else:raise AssertionError(label)
for stamp,header,date in [('2024 Feb 29 0030','Feb 29       Mar 01       Mar 02',datetime(2024,2,29,5,tzinfo=timezone.utc)),('2026 Dec 31 0030','Dec 31       Jan 01       Jan 02',datetime(2026,12,31,5,tzinfo=timezone.utc))]:
 fixture=text.replace('2026 Sep 15 0030',stamp).replace('Sep 15       Sep 16       Sep 17',header)
 rows,_=m.parse_text_forecast(fixture,date);assert len(rows)==24;checks.append('synthetic_calendar_edge_'+stamp)
actual=(folder/'noaa_3day_actual.txt').read_text(encoding='utf-8');rows,issued=m.parse_text_forecast(actual,datetime(2026,9,15,18,tzinfo=timezone.utc));assert issued.hour==12 and rows[0]['time_utc'].date()==issued.date();checks.append('real_official_noon_bulletin')
assert m.parse_rows({'error':'x'},'forecast')==[];checks.append('dict_parser_safe')
(folder/'BOT_RESULTS.json').write_text(json.dumps({'status':'PASS','checks':checks,'thresholds':[m.THRESHOLD_WARNING,m.THRESHOLD_STORM],'lookahead_hours':m.LOOKAHEAD_HOURS},indent=2),encoding='utf-8');print('PASS',len(checks),'bot cases')
