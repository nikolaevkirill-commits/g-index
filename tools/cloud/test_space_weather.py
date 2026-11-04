"""Space-weather parsing: valid shapes, malformed input fails closed per source, score weight 0."""
import json,pathlib,sys,unittest
from datetime import datetime,timezone
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import space_weather as sw
NOW=datetime(2026,11,2,12,0,tzinfo=timezone.utc)
FLARES=json.dumps([{'begin_time':'2026-11-01T03:10:00Z','max_time':'2026-11-01T03:21:00Z','end_time':'2026-11-01T03:40:00Z','max_class':'M1.4','satellite':18},
                   {'begin_time':'2026-11-02T08:00:00Z','max_time':'2026-11-02T08:09:00Z','max_class':'C3.2'},{'max_time':'2026-11-02T09:00:00Z','max_class':None}])
PLASMA=json.dumps([['time_tag','density','speed','temperature'],['2026-11-02 11:50:00.000','4.1','412.5','90000'],['2026-11-02 11:51:00.000',None,None,None]])
MAG=json.dumps([['time_tag','bx_gsm','by_gsm','bz_gsm','lon_gsm','lat_gsm','bt'],['2026-11-02 11:51:00.000','1','2','-6.4','0','0','8.2']])
ENLIL=json.dumps([{'modelCompletionTime':'2026-11-01T10:00Z','estimatedShockArrivalTime':'2026-11-03T14:00Z','impactList':[{'location':'Earth','arrivalTime':'2026-11-03T14:00Z','isGlancingBlow':False}]},
                  {'modelCompletionTime':'2026-10-31T10:00Z','estimatedShockArrivalTime':None,'impactList':[{'location':'Mars','arrivalTime':'2026-11-04T00:00Z'}]}])
class SpaceWeather(unittest.TestCase):
    def fetcher(self,over=None):
        data={sw.FLARES:FLARES,sw.PLASMA:PLASMA,sw.MAG:MAG};over=over or {}
        def f(u):
            if u.startswith('https://ccmc.gsfc.nasa.gov/DONKI-API/get/'):return over.get('enlil',ENLIL)
            return over.get(u,data[u])
        return f
    def test_valid(self):
        d=sw.build(self.fetcher(),NOW);sw.check(d)
        self.assertEqual(d['flares']['strongest']['class'],'M1.4');self.assertEqual(d['flares']['count_7d'],2);self.assertEqual(d['flares']['radio_blackout_scale'],'R1-R2')
        self.assertEqual(d['wind']['plasma']['speed_km_s'],412);self.assertEqual(d['wind']['mag']['bz_nt'],-6.4);self.assertFalse(d['wind']['stale'])
        self.assertEqual([a['arrival_utc'] for a in d['cme']['earth_arrivals']],['2026-11-03T14:00:00Z'])
        self.assertEqual(d['score_adjustment'],0)
    def test_malformed_fails_closed_per_source(self):
        d=sw.build(self.fetcher({sw.FLARES:'{"oops":1}',sw.PLASMA:'[["time","x"]]','enlil':'not json'}),NOW);sw.check(d)
        self.assertIsNone(d['flares']);self.assertIsNone(d['wind']);self.assertIsNone(d['cme'])
        for k in ('flares','wind','cme'):self.assertEqual(d['sources'][k]['status'],'unavailable')
    def test_network_error(self):
        def boom(u):raise OSError('blocked')
        d=sw.build(boom,NOW);sw.check(d);self.assertTrue(all(v['status']=='unavailable' for v in d['sources'].values()))
    def test_future_and_old_flares_ignored(self):
        f=json.dumps([{'max_time':'2026-11-05T00:00:00Z','max_class':'X9.0'},{'max_time':'2026-10-01T00:00:00Z','max_class':'X2.0'}])
        d=sw.build(self.fetcher({sw.FLARES:f}),NOW);self.assertEqual(d['flares']['count_7d'],0);self.assertIsNone(d['flares']['strongest'])
if __name__=='__main__':unittest.main(verbosity=1)
