"""AST-1 (audit FP549): two sunrise conventions are in use on purpose and must stay explicit.

- expert_astronomy.detect_bolt_rikta (exploratory, zero weight) samples daylight between the refracted solar
  disc CENTRE rise and set. This reproduces the external audit's 0.30 rule; changing it changes its records.
- Calendar code (calendar_components, skyrhythm_rnd_extras, parana_scenario, pradosh_overlap) uses the
  Swiss Ephemeris default: refracted UPPER LIMB.

The guard pins both, measures the gap, and fails if either side changes silently. Choosing one convention
is an owner decision (it would change bolt fractions and cloud-model hashes); it is not made here.
"""
import ast,pathlib,unittest,sys
from datetime import datetime,time
from zoneinfo import ZoneInfo
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import swisseph as swe
import expert_astronomy as ea

HERE=pathlib.Path(__file__).resolve().parent

def rise_flag_sets(path):
    """Flags passed to every swe.rise_trans call in a file, as source text."""
    out=[]
    for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
        if isinstance(node,ast.Call) and getattr(node.func,'attr','')=='rise_trans':
            out.append(ast.unparse(node.args[2]))
    return out

class SunriseConventions(unittest.TestCase):
    def test_bolt_uses_disc_centre_and_says_so(self):
        flags=rise_flag_sets(HERE/'expert_astronomy.py')
        self.assertEqual(len(flags),2)
        self.assertTrue(all('BIT_DISC_CENTER' in f for f in flags),flags)
        r=ea.detect_bolt_rikta('2026-11-01')
        self.assertIn('disc centre',r['convention'])
        self.assertEqual(r['score_adjustment'],0)
        self.assertIsNone(r['physical_uncertainty_ms'])

    def test_calendar_code_uses_upper_limb(self):
        for name in ('skyrhythm_rnd_extras.py','parana_scenario.py','pradosh_overlap.py'):
            flags=rise_flag_sets(HERE/name)
            self.assertTrue(flags,name)
            self.assertFalse(any('BIT_DISC_CENTER' in f for f in flags),(name,flags))
        self.assertIn("'sunrise_convention':'upper_limb_standard_refraction_swe'",(HERE/'calendar_components.py').read_text(encoding='utf-8'))

    def test_gap_is_about_two_minutes_in_kyiv(self):
        tz=ZoneInfo('Europe/Kyiv');geo=(30.52,50.45,0)
        u=datetime.combine(datetime(2026,11,1).date(),time(),tzinfo=tz).astimezone(ZoneInfo('UTC'))
        j=swe.julday(u.year,u.month,u.day,u.hour+u.minute/60)
        centre=swe.rise_trans(j,swe.SUN,swe.CALC_RISE|swe.BIT_DISC_CENTER,geo,0,0,swe.FLG_MOSEPH)[1][0]
        limb=swe.rise_trans(j,swe.SUN,swe.CALC_RISE,geo,0,0,swe.FLG_MOSEPH)[1][0]
        gap_s=(centre-limb)*86400
        self.assertGreater(gap_s,30);self.assertLess(gap_s,300)

if __name__=='__main__':unittest.main(verbosity=2)
