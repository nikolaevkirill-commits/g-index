"""Transit engine guard: known 2026 events, conventions, zero score weight, determinism."""
import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import transit_events as te

class Transits(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.d=te.compute('2026-11-01')
    def find(self,kind,bodies):
        return [x for x in self.d['events']+self.d['intervals'] if x['type']==kind and x['bodies']==bodies]
    def test_jupiter_enters_leo_31_oct(self):
        d=te.compute('2026-10-25',days=10)
        ev=[e for e in d['events'] if e['type']=='sign_ingress' and e['bodies']==['Jupiter']]
        self.assertEqual(len(ev),1);self.assertEqual(ev[0]['to'],4);self.assertEqual(ev[0]['at']['kyiv_date'],'2026-10-31')
    def test_jupiter_ketu_exact_12_nov_in_gandanta(self):
        c=self.find('conjunction',['Jupiter','Ketu'])[0]
        self.assertEqual(c['exact']['kyiv_date'],'2026-11-12');self.assertLess(c['min_orb_deg'],0.1)
        self.assertEqual(c['exact_sign'],4);self.assertLess(c['exact_deg_in_sign'],10/3)
        self.assertTrue(self.find('gandanta',['Jupiter']))
    def test_mars_jupiter_exact_16_nov(self):
        c=self.find('conjunction',['Mars','Jupiter'])[0];self.assertEqual(c['exact']['kyiv_date'],'2026-11-16')
    def test_mercury_and_venus_station_direct(self):
        self.assertEqual(self.find('station',['Mercury'])[0]['at']['kyiv_date'],'2026-11-13')
        self.assertEqual(self.find('station',['Venus'])[0]['at']['kyiv_date'],'2026-11-14')
    def test_saturn_retrograde_in_pisces(self):
        r=self.find('retrograde',['Saturn'])[0];self.assertTrue(r['started_before_window'])
        self.assertEqual(self.d['daily'][0]['grahas']['Saturn']['sign'],11)
    def test_sun_enters_scorpio(self):
        self.assertEqual(self.find('sign_ingress',['Sun'])[0]['at']['kyiv_date'],'2026-11-16')
    def test_zero_weight_and_conventions(self):
        c=self.d['convention'];self.assertEqual(c['score_adjustment'],0);self.assertEqual(c['node'],'true_node')
        self.assertEqual(len(self.d['daily']),27)
    def test_ketu_opposite_rahu(self):
        g=self.d['daily'][5]['grahas'];self.assertAlmostEqual((g['Rahu']['lon']-g['Ketu']['lon'])%360,180,places=2)
    def test_deterministic(self):
        a=te.compute('2026-11-01');a.pop('generated_at');b=dict(self.d);b.pop('generated_at');self.assertEqual(a,b)
    def test_transit_gandanta_marked_modern(self):
        import transit_meaning as tm
        d=tm.annotate(te.compute('2026-11-01'));g=[x for x in d['intervals'] if x['type']=='gandanta' and x['bodies']==['Jupiter']][0]
        self.assertEqual(g['reading']['convention'],'modern_transit_gandanta_not_classical');self.assertEqual(g['reading']['intensity'],1)
        self.assertNotIn('claim',g['reading']);self.assertIn('сучасна конвенція',g['reading']['label']['uk'])
if __name__=='__main__':unittest.main(verbosity=1)
