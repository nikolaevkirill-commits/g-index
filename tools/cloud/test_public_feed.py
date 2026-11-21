import unittest
from public_feed import public_feed
from kp_source_guard import suppress_downgrades, valid_calendar_projection
from datetime import datetime,timezone
import copy, json
from pathlib import Path
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

 def test_withheld_calendar_uses_only_same_day_replayed_topics(self):
  previous=json.loads((Path(__file__).resolve().parents[1]/'public/fixtures/fresh_20261019.json').read_text(encoding='utf-8'))
  day='2026-10-19'
  candidate=copy.deepcopy(previous)
  own=candidate['days'][day]['channels']['source_formula']
  own['kp_input']['source']=own['kp_source']='NOAA_27day_outlook'
  now=datetime.fromisoformat(candidate['generated_at'])
  def project():
   return suppress_downgrades(previous,candidate,now)['days'][day]['channels']['source_formula']
  withheld=project()
  record=withheld['calendar_marks']
  self.assertEqual(record,{'date':day,'source':'source_formula_calendar_factors','marks':['День порожні руки, несприятливий']})
  self.assertTrue(valid_calendar_projection(day,record))
  self.assertEqual((withheld['value'],withheld['raw'],withheld['kp_input'],withheld['factors']),(None,None,None,[]))
  self.assertFalse(valid_calendar_projection('2026-10-20',record))
  for invalid in (dict(record,raw=0),dict(record,marks=['Kp']),dict(record,marks=record['marks']*2)):
   self.assertFalse(valid_calendar_projection(day,invalid))
  own['factors']=[{'factor':'Kp','value':0}]
  self.assertEqual(project()['calendar_marks']['marks'],[])
  own['factors']=[]
  self.assertNotIn('calendar_marks',project())
  own['calendar_marks']=record
  self.assertNotIn('calendar_marks',project())
  own['factors']=previous['days'][day]['channels']['source_formula']['factors']
  candidate['source_integrity']['status']='missing'
  self.assertNotIn('calendar_marks',project())

if __name__=='__main__':unittest.main()
