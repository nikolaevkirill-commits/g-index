import unittest
from public_feed import public_feed
from kp_source_guard import suppress_downgrades
from datetime import datetime,timezone
class PublicContract(unittest.TestCase):
 def test_formula_result_is_not_final_score(self):
  own={'available':True,'value':-2}
  raw={'schema':'independent_forecast_feed_v1','days':{'2026-10-19':{'date':'2026-10-19','channels':{'source_formula':own},'forecast_result':{'score':0}}}}
  out=public_feed(raw)['days']['2026-10-19']
  self.assertNotIn('forecast_result',out)
  self.assertEqual(out['source_formula_result']['score'],-2)
  self.assertEqual(raw['days']['2026-10-19']['forecast_result']['score'],0)
  own['available']=False
  self.assertIsNone(public_feed(raw)['days']['2026-10-19']['source_formula_result']['score'])
if __name__=='__main__':unittest.main()
