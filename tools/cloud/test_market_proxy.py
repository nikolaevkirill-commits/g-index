"""Market proxy: valid shapes, unfinished day dropped, history kept, fail-closed per source, score weight 0."""
import json,pathlib,sys,unittest
from datetime import datetime,timezone
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import market_proxy as mp
NOW=datetime(2026,11,3,12,0,tzinfo=timezone.utc)
D=lambda s:int(datetime.fromisoformat(s+'T00:00:00+00:00').timestamp())
VIX='DATE,VIXCLS\n2026-10-30,16.91\n2026-11-02,.\n2026-11-03,18.00\n'
CB=json.dumps([[D('2026-11-03'),70000,72000,71000,71500,10],[D('2026-11-02'),69000,71000,70000,70500,12],[D('2026-11-01'),68000,70500,69000,70000,9]])
KR=json.dumps({'error':[],'result':{'XXBTZUSD':[[D('2026-11-01'),'69000','70500','68000','70000','0','1',1],[D('2026-11-03'),'71000','72000','70000','71500','0','1',1]],'last':1}})
class MarketProxy(unittest.TestCase):
    def fetcher(self,over=None):
        over=over or {}
        def f(u):
            for key,val in (('fred',VIX),('coinbase',CB),('kraken',KR)):
                if key in u:
                    v=over.get(key,val)
                    if isinstance(v,Exception):raise v
                    return v
            raise AssertionError(u)
        return f
    def test_valid(self):
        d=mp.build(self.fetcher(),None,NOW);mp.check(d)
        self.assertEqual(d['score_adjustment'],0)
        self.assertEqual(d['days']['2026-10-30']['vix_close'],16.91)
        self.assertNotIn('2026-11-03',d['days'])            # unfinished day dropped
        self.assertNotIn('vix_close',d['days'].get('2026-11-02',{}))  # FRED '.' is not a value
        self.assertEqual(d['days']['2026-11-01']['btc_range_pct'],round(2500/69000*100,3))
        self.assertEqual(d['sources']['btc']['provider'],'coinbase')
    def test_kraken_fallback(self):
        d=mp.build(self.fetcher({'coinbase':OSError('blocked')}),None,NOW);mp.check(d)
        self.assertEqual(d['sources']['btc']['provider'],'kraken');self.assertIn('2026-11-01',d['days'])
    def test_history_kept_when_sources_fail(self):
        prev={'days':{'2026-09-01':{'vix_close':15.0,'src':{'vix':'fred'}}}}
        def boom(u):raise OSError('blocked')
        d=mp.build(boom,prev,NOW);mp.check(d)
        self.assertEqual(d['days']['2026-09-01']['vix_close'],15.0)
        self.assertEqual(d['sources']['vix']['status'],'unavailable');self.assertEqual(d['sources']['btc']['status'],'unavailable')
    def test_malformed_fails_closed(self):
        d=mp.build(self.fetcher({'fred':'oops','coinbase':'{"a":1}','kraken':'{"error":["x"]}'}),None,NOW);mp.check(d)
        self.assertEqual(d['days'],{})
    def test_inconsistent_candle_rejected(self):
        bad=json.dumps([[D('2026-11-01'),70000,69000,69500,69800,1]])  # high < low
        d=mp.build(self.fetcher({'coinbase':bad,'kraken':OSError('x')}),None,NOW)
        self.assertEqual(d['sources']['btc']['status'],'unavailable')
    def test_check_rejects_today(self):
        d=mp.build(self.fetcher(),None,NOW);d['days']['2026-11-03']={}
        with self.assertRaises(ValueError):mp.check(d)
if __name__=='__main__':unittest.main(verbosity=1)
