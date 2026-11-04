"""Market-volatility proxy for validating the sky layer (score weight 0).

Two independent daily series, accumulated day by day in consumer_cloud/market_proxy.json:
  - VIX close (CBOE via FRED VIXCLS; US trading days only);
  - BTC-USD daily range (high-low)/open and absolute log return (Coinbase, Kraken fallback; every UTC day).
Only closed days are stored; today's unfinished candle is dropped. Every source is parsed
fail-closed and independently: a bad shape keeps the stored history and records an error string,
never a guessed value. Nothing here enters the score; owner rule: a weight may be considered only
after a check on >=100 days.
"""
from datetime import datetime, timedelta, timezone
import csv, io, json, math, re
from html.parser import HTMLParser

FRED = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS&cosd={start}&coed={end}'
FRED_TABLE = 'https://fred.stlouisfed.org/data/VIXCLS'
COINBASE = 'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start={start}&end={end}'
KRAKEN = 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440&since={since}'
KEEP_DAYS = 1200
LOOKBACK_DAYS = 120


def _iso(t):
    return t.isoformat().replace('+00:00', 'Z')


def _day(ts):
    return datetime.fromtimestamp(int(ts), timezone.utc).date().isoformat()


def parse_vix(raw, now):
    rows = list(csv.reader(io.StringIO(raw)))
    if len(rows) < 2 or len(rows[0]) != 2 or rows[0][1].strip().upper() != 'VIXCLS':
        raise ValueError('vix: header DATE,VIXCLS expected')
    out, today = {}, now.date().isoformat()
    for r in rows[1:]:
        if len(r) != 2:
            raise ValueError('vix: row shape')
        d, v = r[0].strip(), r[1].strip()
        datetime.strptime(d, '%Y-%m-%d')
        if v in ('.', ''):
            continue  # FRED marks holidays / missing closes with '.'
        x = float(v)
        if not (1 <= x <= 200):
            raise ValueError('vix: value out of range')
        if d < today:
            if d in out: raise ValueError('vix: duplicate date')
            out[d] = {'vix_close': round(x, 2)}
    if not out:
        raise ValueError('vix: no closed days')
    return out


def parse_fred_table(raw, now):
    # FRED's official table uses 1000 HTML rows plus #date|value in extra-rows.
    # Validate the series and declared range; a partial HTML response must not pass.
    class Table(HTMLParser):
        def __init__(self):
            super().__init__(); self.rows=[]; self.row=None; self.cell=None; self.extra=[]; self.in_extra=False
        def handle_starttag(self, tag, attrs):
            if tag == 'tr': self.row=[]
            if tag in ('th','td') and self.row is not None: self.cell=[]
            if tag == 'div' and dict(attrs).get('id') == 'extra-rows': self.in_extra=True
        def handle_data(self, value):
            if self.cell is not None: self.cell.append(value)
            if self.in_extra: self.extra.append(value)
        def handle_endtag(self, tag):
            if tag in ('th','td') and self.cell is not None:
                self.row.append(''.join(self.cell).strip()); self.cell=None
            if tag == 'tr' and self.row is not None:
                self.rows.append(self.row); self.row=None
            if tag == 'div': self.in_extra=False
    t=Table(); t.feed(raw); t.close()
    if ['Series ID','VIXCLS'] not in t.rows or ['DATE','VALUE'] not in t.rows:
        raise ValueError('fred table: VIXCLS metadata/header missing')
    ranges=[x[1] for x in t.rows if len(x)==2 and x[0]=='Date Range']
    if len(ranges)!=1 or not re.fullmatch(r'\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}',ranges[0]):
        raise ValueError('fred table: declared range missing')
    rows=[x for x in t.rows if x and re.fullmatch(r'\d{4}-\d{2}-\d{2}',x[0])]
    for line in ''.join(t.extra).splitlines():
        line=line.strip()
        if not line: continue
        match=re.fullmatch(r'#(\d{4}-\d{2}-\d{2})\|\s*([0-9.]+)',line)
        if not match: raise ValueError('fred table: malformed extra row')
        rows.append(list(match.groups()))
    if not rows or rows[-1][0] != ranges[0].split(' to ')[1]:
        raise ValueError('fred table: truncated observations')
    buf=io.StringIO(); writer=csv.writer(buf); writer.writerow(['DATE','VIXCLS']); writer.writerows(rows)
    parsed=parse_vix(buf.getvalue(),now)
    start=(now-timedelta(days=LOOKBACK_DAYS)).date().isoformat()
    result={d:v for d,v in parsed.items() if d>=start}
    if not result: raise ValueError('fred table: no recent closed observations')
    return result


def _btc_row(o, h, l, c):
    o, h, l, c = (float(x) for x in (o, h, l, c))
    if not all(math.isfinite(v) for v in (o,h,l,c)) or min(o, h, l, c) <= 0 or h < l or not (l <= o <= h and l <= c <= h):
        raise ValueError('btc: inconsistent candle')
    return {'btc_range_pct': round((h - l) / o * 100, 3), 'btc_abs_logret_pct': round(abs(math.log(c / o)) * 100, 3), 'btc_close': round(c, 2)}


def parse_coinbase(raw, now):
    data = json.loads(raw)
    if not isinstance(data, list) or not data:
        raise ValueError('coinbase: non-empty list expected')
    out, today = {}, now.date().isoformat()
    for r in data:
        if not isinstance(r, list) or len(r) < 6:
            raise ValueError('coinbase: row shape [time, low, high, open, close, volume]')
        d = _day(r[0])
        if d < today:
            if d in out: raise ValueError('btc: duplicate date')
            out[d] = _btc_row(r[3], r[2], r[1], r[4])
    if not out:
        raise ValueError('coinbase: no closed days')
    return out


def parse_kraken(raw, now):
    data = json.loads(raw)
    if not isinstance(data, dict) or data.get('error') or not isinstance(data.get('result'), dict):
        raise ValueError('kraken: result object expected')
    series = [v for k, v in data['result'].items() if k != 'last']
    if len(series) != 1 or not isinstance(series[0], list):
        raise ValueError('kraken: one OHLC series expected')
    out, today = {}, now.date().isoformat()
    for r in series[0]:
        if not isinstance(r, list) or len(r) < 5:
            raise ValueError('kraken: row shape [time, open, high, low, close, ...]')
        d = _day(r[0])
        if d < today:
            if d in out: raise ValueError('btc: duplicate date')
            out[d] = _btc_row(r[1], r[2], r[3], r[4])
    if not out:
        raise ValueError('kraken: no closed days')
    return out


def build(fetch, previous=None, now=None):
    now = now or datetime.now(timezone.utc)
    prev_days = (previous or {}).get('days') if isinstance(previous, dict) else None
    days = {d: dict(v) for d, v in (prev_days or {}).items() if isinstance(v, dict)}
    doc = {'schema': 'market_proxy_v1', 'generated_at': _iso(now), 'score_adjustment': 0,
           'role': 'validation proxy only; never enters the score', 'sources': {}}
    start = (now - timedelta(days=LOOKBACK_DAYS)).date()

    def merge(rows, src):
        for d, v in rows.items():
            days.setdefault(d, {}).update(v)
            days[d].setdefault('src', {})
            for k in v:
                days[d]['src'][k.split('_')[0]] = src

    vix_errors = []
    for url, parser in ((FRED.format(start=start.isoformat(), end=(now-timedelta(days=1)).date().isoformat()), parse_vix), (FRED_TABLE, parse_fred_table)):
        try:
            rows = parser(fetch(url), now)
            merge(rows, 'fred')
            doc['sources']['vix'] = {'status': 'ok', 'url': url, 'days': len(rows), 'latest_observation_date': max(rows)}
            if vix_errors: doc['sources']['vix']['fallback_errors'] = vix_errors
            break
        except Exception as e:
            vix_errors.append(type(e).__name__ + ': ' + str(e)[:160])
    else:
        doc['sources']['vix'] = {'status': 'unavailable', 'error': ' | '.join(vix_errors)}

    errors = []
    for name, url, fn in (
            ('coinbase', COINBASE.format(start=start.isoformat(), end=now.date().isoformat()), parse_coinbase),
            ('kraken', KRAKEN.format(since=int(datetime(start.year, start.month, start.day, tzinfo=timezone.utc).timestamp())), parse_kraken)):
        try:
            rows = fn(fetch(url), now)
            merge(rows, name)
            doc['sources']['btc'] = {'status': 'ok', 'provider': name, 'url': url, 'days': len(rows)}
            break
        except Exception as e:
            errors.append(name + ': ' + type(e).__name__ + ': ' + str(e)[:120])
    else:
        doc['sources']['btc'] = {'status': 'unavailable', 'error': ' | '.join(errors)}

    keep = sorted(days)[-KEEP_DAYS:]
    doc['days'] = {d: days[d] for d in keep}
    doc['coverage'] = {'first': keep[0] if keep else None, 'last': keep[-1] if keep else None,
                       'vix_days': sum('vix_close' in doc['days'][d] for d in keep),
                       'btc_days': sum('btc_range_pct' in doc['days'][d] for d in keep)}
    return doc


def check(doc):
    if doc.get('schema') != 'market_proxy_v1' or doc.get('score_adjustment') != 0:
        raise ValueError('Invalid market-proxy document')
    for k in ('vix', 'btc'):
        if doc.get('sources', {}).get(k, {}).get('status') not in ('ok', 'unavailable'):
            raise ValueError('Market-proxy source state missing: ' + k)
    days = doc.get('days')
    if not isinstance(days, dict) or len(days) > KEEP_DAYS:
        raise ValueError('Market-proxy days invalid')
    stamp = datetime.fromisoformat(doc['generated_at'].replace('Z','+00:00'))
    if stamp.tzinfo is None: raise ValueError('Missing timestamp timezone')
    today = stamp.astimezone(timezone.utc).date().isoformat()
    for d, v in days.items():
        datetime.strptime(d, '%Y-%m-%d')
        if today and d >= today:
            raise ValueError('Market-proxy stores an unfinished day: ' + d)
        if not isinstance(v, dict):
            raise ValueError('Market-proxy day not an object')
        for key, x in v.items():
            if key == 'src': continue
            if key not in ('vix_close','btc_range_pct','btc_abs_logret_pct','btc_close') or type(x) not in (int,float) or not math.isfinite(x) or x < 0:
                raise ValueError('Invalid market value')
    return True


if __name__ == '__main__':
    import argparse, pathlib
    from urllib.request import Request, urlopen

    def fetch(url):
        with urlopen(Request(url, headers={'User-Agent': 'SkyRhythm-cloud-source/1'}), timeout=35) as r:
            raw = r.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('Oversized source')
        return raw.decode('utf-8')
    ap = argparse.ArgumentParser(); ap.add_argument('--site', type=pathlib.Path, required=True); a = ap.parse_args()
    out = a.site.resolve() / 'consumer_cloud/market_proxy.json'
    try:
        previous = json.loads(out.read_text('utf-8')) if out.exists() else None
    except (OSError, ValueError):
        previous = None
    doc = build(fetch, previous); check(doc)
    try:
        out.with_suffix('.json.pending').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':'), allow_nan=False), 'utf-8')
        out.with_suffix('.json.pending').replace(out)
    finally:
        out.with_suffix('.json.pending').unlink(missing_ok=True)
    print(json.dumps({'status': 'PASS', **{k: v['status'] for k, v in doc['sources'].items()}, **doc['coverage']}))
