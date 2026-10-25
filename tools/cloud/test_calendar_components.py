from datetime import datetime
import unittest
from unittest.mock import patch
import calendar_components as c

class Components(unittest.TestCase):
    def test_dst_partition(self):
        for day,hours in [('2026-03-29',23),('2026-10-25',25),('2027-01-01',24)]:
            x=c.civil_tithis(day,'Europe/Kyiv')
            self.assertAlmostEqual(x['civil_day_seconds'],hours*3600,places=2)
            self.assertAlmostEqual(sum(i['duration_seconds'] for i in x['tithis']),hours*3600,places=2)
            for a,b in zip(x['tithis'],x['tithis'][1:]):self.assertEqual(a['overlap_end_local'],b['overlap_start_local'])
    def test_phase_and_ritual_day_are_distinct(self):
        before=c.civil_tithis('2026-10-25','Europe/Kyiv')
        after=c.civil_tithis('2026-10-26','Europe/Kyiv')
        self.assertTrue(any(i['tithi']==15 for i in before['tithis']))
        self.assertFalse(any(e['kind']=='full_moon' for e in before['phase_events']))
        self.assertEqual([e['kind'] for e in after['phase_events']],['full_moon'])
    def test_source_and_missing_contract(self):
        x=c.calculate('2027-01-01',None)
        self.assertEqual(set(x['symbols']),set(c.SYMBOLS))
        self.assertTrue(all(s['selected'] is None for s in x['symbols'].values()))
        self.assertFalse(x['normative_selection_confirmed'])
        y=c.calculate('2026-10-25',['full_moon','heart'])
        self.assertEqual({k for k,v in y['symbols'].items() if v['selected']},{'full_moon','heart'})
    def test_year_boundary_and_polar_unavailability(self):
        x=c.calculate('2026-12-31',[])
        self.assertEqual(x['date'],'2026-12-31')
        with patch.dict(c.base.LOCATIONS,{'Polar':(0,89,'UTC')}):
            p=c.calculate('2027-06-21',None,city='Polar')
            self.assertIsNone(p['sunrise_tithi']);self.assertFalse(p['parana']['available'])
            self.assertFalse(p['pradosh']['available'])
    def test_bad_source_rejected(self):
        for icons in (['fake'],['bolt','bolt']):
            with self.assertRaises(ValueError):c.calculate('2027-01-01',icons)
        with self.assertRaises(ValueError):c.calculate('2027-02-30',[])

if __name__=='__main__':unittest.main()
