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
if __name__=='__main__':unittest.main()
