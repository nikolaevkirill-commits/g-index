import unittest, json, copy
from datetime import datetime,timezone
import market_proxy as m, space_weather as w, sky_refresh as sky
class Guards(unittest.TestCase):
 def test_nonfinite_candle(self):
  for v in (float('nan'),float('inf')):
   with self.assertRaises(ValueError):m._btc_row(v,v,v,v)
 def test_duplicate_vix(self):
  with self.assertRaises(ValueError):m.parse_vix('DATE,VIXCLS\n2026-10-30,12\n2026-10-30,14',datetime(2026,11,4,tzinfo=timezone.utc))
 def test_rtsw_inactive(self):
  with self.assertRaises(ValueError):w._rtsw_table(json.dumps([{'active':False,'overall_quality':0}]),True)
 def test_rtsw_order(self):
  rows=[{'time_tag':t,'active':True,'overall_quality':0,'proton_speed':400,'proton_density':2} for t in ['2026-11-04T06:00:00','2026-11-04T05:00:00']]
  self.assertEqual(json.loads(w._rtsw_table(json.dumps(rows),True))[-1][0],'2026-11-04T06:00:00')
 def test_sky_duplicate(self):
  from pathlib import Path
  d=json.loads((Path(__file__).parents[2]/'consumer_cloud/sky.json').read_text(encoding='utf-8'));d['daily'][1]=copy.deepcopy(d['daily'][0])
  with self.assertRaises(ValueError):sky.check(d)
 def test_enlil_earth_flag(self):
  now=datetime(2026,11,4,tzinfo=timezone.utc)
  rows=[{'estimatedShockArrivalTime':'2026-11-05T05:00Z','isEarthGB':True,'modelCompletionTime':'2026-11-01T21:43Z'}]
  self.assertIs(w.parse_enlil(json.dumps(rows),now)['earth_arrivals'][0]['glancing'],True)
  rows[0]['isEarthGB']='false'
  self.assertIsNone(w.parse_enlil(json.dumps(rows),now)['earth_arrivals'][0]['glancing'])
 def test_source_requests(self):
  seen=[]
  def fetch(url):
   seen.append(url)
   if 'fred' in url:return 'DATE,VIXCLS\n2026-11-02,21.15\n'
   raise OSError('fixture unavailable')
  now=datetime(2026,11,4,tzinfo=timezone.utc)
  d=m.build(fetch,None,now)
  self.assertIn('coed=2026-11-03',seen[0])
  self.assertEqual(d['sources']['vix']['latest_observation_date'],'2026-11-02')
  self.assertEqual(d['score_adjustment'],0)
  w.build(fetch,now)
  self.assertTrue(any(u.startswith('https://ccmc.gsfc.nasa.gov/DONKI-API/get/') for u in seen))
 def test_fred_official_table(self):
  now=datetime(2026,11,4,tzinfo=timezone.utc)
  html='<table><tr><th>Series ID</th><td>VIXCLS</td></tr><tr><th>Date Range</th><td>2026-10-30 to 2026-11-02</td></tr><tr><th>DATE</th><th>VALUE</th></tr><tr><th>2026-10-30</th><td>19.42</td></tr></table><div id="extra-rows">#2026-11-02|21.15</div>'
  self.assertEqual(m.parse_fred_table(html,now)['2026-11-02']['vix_close'],21.15)
  for bad in (html.replace('VIXCLS','OTHER'),html.split('<div')[0],html.replace('21.15','nan'),html.replace('#2026-11-02|21.15','#2026-10-30|20\n#2026-11-02|21.15')):
   with self.assertRaises(ValueError):m.parse_fred_table(bad,now)
  def fetch(url):
   if url==m.FRED_TABLE:return html
   raise TimeoutError('fixture CSV timeout')
  d=m.build(fetch,None,now)
  self.assertEqual(d['sources']['vix']['status'],'ok')
  self.assertEqual(d['sources']['vix']['url'],m.FRED_TABLE)
  self.assertTrue(d['sources']['vix']['fallback_errors'])
  self.assertEqual(d['days']['2026-11-02']['src']['vix'],'fred')
  self.assertEqual(d['score_adjustment'],0)
 def test_market_transport_limits(self):
  from unittest.mock import patch
  from types import SimpleNamespace
  with patch('market_proxy.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout=b'DATE,VIXCLS\n',stderr=b'')) as run:
   self.assertEqual(m.fetch_http('https://fred.stlouisfed.org/example'),'DATE,VIXCLS\n')
   args=run.call_args.args[0]
   self.assertEqual(args[1],'--disable');self.assertIn('--fail',args);self.assertIn('--max-filesize',args)
   self.assertEqual(run.call_args.kwargs['timeout'],40)
 def test_market_transport_rejects_error_and_oversize(self):
  from unittest.mock import patch
  from types import SimpleNamespace
  for result,error in [(SimpleNamespace(returncode=22,stdout=b'not csv',stderr=b'HTTP 403'),OSError),(SimpleNamespace(returncode=0,stdout=b'x'*5000001,stderr=b''),ValueError)]:
   with patch('market_proxy.subprocess.run',return_value=result):
    with self.assertRaises(error):m.fetch_http('https://fred.stlouisfed.org/example')
if __name__=='__main__':unittest.main()
