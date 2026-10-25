import copy, unittest
from expert_model import apply,verify,TAG

def row(day,bolt,score):
    icons=None if bolt is None else ['bolt'] if bolt else []
    f=[{'factor':'Kp','value':0}]+([{'factor':TAG,'value':-3}] if bolt else [])
    r={'date':day,'contributions':f,'forecast_score':score,'raw_sum':score,'threshold_policy':'symmetric_intervals_candidate'}
    if icons is not None:r['observed_icons']=icons
    return r

class Model(unittest.TestCase):
    def test_source_priority_and_no_double_weight(self):
        d={'rows':[row('2026-10-29',True,-3),row('2026-08-17',True,-3),row('2026-10-25',False,0)]}
        original=copy.deepcopy(d);a=apply(d,{TAG:-3});self.assertEqual(d,original)
        self.assertEqual(verify(a)['status'],'PASS')
        self.assertEqual([r['forecast_score'] for r in a['rows']],[-3,-3,0])
        self.assertTrue(a['rows'][1]['expert_model']['source_model_conflict'])
    def test_missing_factors_not_promoted(self):
        a=apply({'rows':[row('2027-01-01',None,None)]},{TAG:-3})
        self.assertIsNone(a['rows'][0]['forecast_score']);self.assertEqual(verify(a)['status'],'PASS')
        self.assertEqual(len(a['rows'][0]['expert_model']['missing']),27)
        self.assertIn('ekadashi',a['rows'][0]['expert_model']['missing'])
    def test_tampering_rejected(self):
        a=apply({'rows':[row('2026-10-29',True,-3)]},{TAG:-3})
        a['rows'][0]['contributions'].append({'factor':TAG,'value':-3})
        with self.assertRaises(ValueError):verify(a)
        with self.assertRaises(ValueError):apply({'rows':[]},{TAG:-2})
    def test_fractions_thresholds_and_calendar_edges(self):
        for day in ['2026-03-29','2026-10-25','2026-12-31','2027-01-01']:
            r=apply({'rows':[row(day,None,None)]},{TAG:-3})['rows'][0]
            m=r['expert_model'];self.assertEqual(m['computed_bolt'],m['sample_fraction']>=0.30)
            self.assertIsNone(m['physical_uncertainty_ms'])
            for i in m['intervals']:self.assertLess(i['start_local'],i['end_local'])
    def test_fractional_raw_and_saturation(self):
        r=row('2026-10-29',True,-3);r['contributions'][0]['value']=-0.67;r['raw_sum']=-3.67
        a=apply({'rows':[r]},{TAG:-3});self.assertEqual(verify(a)['status'],'PASS')

if __name__=='__main__':unittest.main()
