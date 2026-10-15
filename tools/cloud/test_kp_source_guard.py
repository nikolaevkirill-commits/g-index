import copy
import unittest
from datetime import datetime
from kp_source_guard import reject_downgrade, suppress_downgrades

def feed(day, source, available=True):
    return {'generated_at':'2026-10-09T21:00:00Z','days':{day:{'channels':{'source_formula':{
        'available':available,'kp_input':{'source':source}}}}}}

class GuardTests(unittest.TestCase):
    def test_projection_persists_and_recovers(self):
        now=datetime.fromisoformat('2026-10-10T00:02:00+00:00')
        old=feed('2026-10-10','NOAA_3day_slots')
        fallback=feed('2026-10-10','NOAA_27day_outlook')
        for _ in range(3):
            old=suppress_downgrades(old,fallback,now)
            own=old['days']['2026-10-10']['channels']['source_formula']
            self.assertIsNone(own['value']);self.assertFalse(own['available'])
            self.assertEqual(own['kp_source_requirement'],'NOAA_3day_slots')
            self.assertTrue(reject_downgrade(old,old,now))
        recovered=suppress_downgrades(old,feed('2026-10-10','NOAA_3day_slots'),now)
        self.assertTrue(recovered['days']['2026-10-10']['channels']['source_formula']['available'])
        self.assertEqual(recovered['availability_projection']['withheld_dates'],[])

    def test_rollover_and_no_mutation(self):
        old=feed('2026-10-10','NOAA_3day_slots');new=feed('2026-10-10','NOAA_27day_outlook')
        before=copy.deepcopy((old,new))
        with self.assertRaisesRegex(ValueError,'downgrade blocked'):
            reject_downgrade(old,new,datetime.fromisoformat('2026-10-10T00:02:00+00:00'))
        self.assertEqual((old,new),before)

    def test_dst_local_day(self):
        for now in ['2026-10-24T21:30:00+00:00','2026-10-25T21:30:00+00:00']:
            with self.subTest(now=now),self.assertRaises(ValueError):
                reject_downgrade(feed('2026-10-25','NOAA_3day_slots'),feed('2026-10-25','NOAA_27day_outlook'),datetime.fromisoformat(now))

    def test_expired_date_can_leave_horizon(self):
        self.assertTrue(reject_downgrade(feed('2026-10-25','NOAA_3day_slots'),feed('2026-10-25','NOAA_27day_outlook'),datetime.fromisoformat('2026-10-25T22:01:00+00:00')))

    def test_normal_updates_and_explicit_missing(self):
        for src,available in [('NOAA_3day_slots',True),('NOAA_27day_outlook',False)]:
            self.assertTrue(reject_downgrade(feed('2026-10-10','NOAA_3day_slots'),feed('2026-10-10',src,available),datetime.fromisoformat('2026-10-10T00:02:00+00:00')))
        self.assertTrue(reject_downgrade(feed('2026-10-20','NOAA_27day_outlook'),feed('2026-10-20','NOAA_27day_outlook'),datetime.fromisoformat('2026-10-10T00:02:00+00:00')))

    def test_stale_old_feed_does_not_get_refreshed(self):
        old=feed('2026-10-10','NOAA_3day_slots')
        with self.assertRaises(ValueError):
            reject_downgrade(old,feed('2026-10-10','NOAA_27day_outlook'),datetime.fromisoformat('2026-10-10T20:00:00+00:00'))
        self.assertEqual(old['generated_at'],'2026-10-09T21:00:00Z')

if __name__=='__main__':unittest.main()
