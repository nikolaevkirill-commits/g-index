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
if __name__=='__main__':unittest.main()
