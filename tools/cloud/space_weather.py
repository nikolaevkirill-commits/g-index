"""Space-weather context for the sky layer (score weight 0): solar flares, solar wind, CME arrival.

Kp already enters the score; flares, wind and CMEs are shown as causes and early signs only.
Every source is parsed fail-closed and independently: an unexpected shape gives `null` with an
error string for that source, never a guessed value, and never stops the forecast publication.
Formats follow the public SWPC/DONKI products as documented; the first cloud runs confirm them.
"""
from datetime import datetime, timedelta, timezone
import json, re

FLARES = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json'
PLASMA = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json'
MAG = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'
ENLIL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/WSAEnlilSimulations?startDate={start}&endDate={end}'
CLASS = re.compile(r'^([ABCMX])(\d+(?:\.\d+)?)$')
ORDER = {'A': 1e-8, 'B': 1e-7, 'C': 1e-6, 'M': 1e-5, 'X': 1e-4}


def _time(value):
    if not isinstance(value, str):
        raise ValueError('time not a string')
    v = value.strip().replace(' ', 'T')
    if v.endswith('Z'):
        v = v[:-1] + '+00:00'
    t = datetime.fromisoformat(v)
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return t.astimezone(timezone.utc)


def _iso(t):
    return t.isoformat().replace('+00:00', 'Z')


def parse_flares(raw, now):
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError('flares: list expected')
    out = []
    for row in data:
        if not isinstance(row, dict):
            raise ValueError('flares: object rows expected')
        m = CLASS.match(str(row.get('max_class') or '').strip())
        if not m:
            continue  # rows without a classified peak are not flares yet
        t = _time(row.get('max_time'))
        if t > now + timedelta(minutes=10) or t < now - timedelta(days=8):
            continue
        out.append({'class': m.group(0), 'peak_utc': _iso(t), 'flux': ORDER[m.group(1)] * float(m.group(2))})
    out.sort(key=lambda x: (-x['flux'], x['peak_utc']))
    strongest = out[0] if out else None
    return {'count_7d': len(out), 'strongest': strongest, 'recent': sorted(out, key=lambda x: x['peak_utc'])[-5:],
            'radio_blackout_scale': (None if not strongest else 'R3+' if strongest['flux'] >= 1e-4 else 'R1-R2' if strongest['flux'] >= 1e-5 else 'R0')}


def _table(raw, needed):
    data = json.loads(raw)
    if not isinstance(data, list) or len(data) < 2 or not isinstance(data[0], list):
        raise ValueError('table: header row expected')
    head = [str(x) for x in data[0]]
    for n in needed:
        if n not in head:
            raise ValueError('table: missing column ' + n)
    idx = {n: head.index(n) for n in needed}
    rows = []
    for r in data[1:]:
        if not isinstance(r, list) or len(r) != len(head):
            raise ValueError('table: row shape')
        rows.append(r)
    return rows, idx


def _num(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and abs(x) < 1e7 else None


def _rtsw_table(raw, plasma):
    data = json.loads(raw)
    if not isinstance(data, list): raise ValueError('RTSW list expected')
    if data and isinstance(data[0], list): return raw  # archived legacy fixture
    fields = ['time_tag','density','speed'] if plasma else ['time_tag','bz_gsm','bt']
    keys = ['time_tag','proton_density','proton_speed'] if plasma else fields
    rows = []
    for r in data:
        if not isinstance(r,dict): raise ValueError('RTSW row expected')
        if r.get('active') is not True or r.get('overall_quality') != 0: continue
        rows.append([r.get(k) for k in keys])
    rows.sort(key=lambda r: _time(r[0]))
    if not rows: raise ValueError('No active quality-0 RTSW samples')
    return json.dumps([fields]+rows)


def parse_wind(plasma_raw, mag_raw, now):
    plasma_raw = _rtsw_table(plasma_raw, True)
    mag_raw = _rtsw_table(mag_raw, False)
    rows, i = _table(plasma_raw, ['time_tag', 'density', 'speed'])
    plasma = None
    for r in reversed(rows):
        t, sp, de = _time(r[i['time_tag']]), _num(r[i['speed']]), _num(r[i['density']])
        if sp is not None and 150 <= sp <= 3000 and t <= now + timedelta(minutes=10):
            plasma = {'time_utc': _iso(t), 'speed_km_s': round(sp), 'density_cm3': None if de is None or de < 0 else round(de, 1)}
            break
    rows, j = _table(mag_raw, ['time_tag', 'bz_gsm', 'bt'])
    mag = None
    for r in reversed(rows):
        t, bz, bt = _time(r[j['time_tag']]), _num(r[j['bz_gsm']]), _num(r[j['bt']])
        if bz is not None and bt is not None and abs(bz) <= 200 and 0 <= bt <= 200 and t <= now + timedelta(minutes=10):
            mag = {'time_utc': _iso(t), 'bz_nt': round(bz, 1), 'bt_nt': round(bt, 1)}
            break
    if plasma is None and mag is None:
        raise ValueError('wind: no valid rows')
    age = None
    stamps = [_time(x['time_utc']) for x in (plasma, mag) if x]
    if stamps:
        age = round((now - min(stamps)).total_seconds() / 60)
    return {'plasma': plasma, 'mag': mag, 'age_minutes': age, 'stale': age is None or age > 180}


def parse_enlil(raw, now):
    data = json.loads(raw)
    if data in (None, ''):
        data = []
    if not isinstance(data, list):
        raise ValueError('enlil: list expected')
    arrivals = []
    for sim in data:
        if not isinstance(sim, dict):
            raise ValueError('enlil: object rows expected')
        t = sim.get('estimatedShockArrivalTime')
        glancing = None
        if not t:
            for hit in sim.get('impactList') or []:
                if isinstance(hit, dict) and str(hit.get('location', '')).lower() == 'earth' and hit.get('arrivalTime'):
                    t, glancing = hit['arrivalTime'], bool(hit.get('isGlancingBlow'))
                    break
        if not t:
            continue
        at = _time(t)
        if now - timedelta(days=1) <= at <= now + timedelta(days=7):
            arrivals.append({'arrival_utc': _iso(at), 'glancing': glancing, 'model_run_utc': sim.get('modelCompletionTime')})
    arrivals.sort(key=lambda x: x['arrival_utc'])
    dedup = []
    for a in arrivals:
        if not dedup or abs((_time(a['arrival_utc']) - _time(dedup[-1]['arrival_utc'])).total_seconds()) > 6 * 3600:
            dedup.append(a)
    return {'earth_arrivals': dedup}


def build(fetch, now=None):
    now = now or datetime.now(timezone.utc)
    doc = {'schema': 'space_weather_v1', 'generated_at': _iso(now), 'score_adjustment': 0,
           'role': 'context_and_early_signs; Kp already enters the score', 'sources': {}}
    def take(key, fn, *urls):
        try:
            raws = [fetch(u) for u in urls]
            doc[key] = fn(*raws, now)
            doc['sources'][key] = {'status': 'ok', 'urls': list(urls)}
        except Exception as e:  # fail closed per source
            doc[key] = None
            doc['sources'][key] = {'status': 'unavailable', 'urls': list(urls), 'error': type(e).__name__ + ': ' + str(e)[:160]}
    take('flares', parse_flares, FLARES)
    take('wind', parse_wind, PLASMA, MAG)
    start, end = (now - timedelta(days=4)).date().isoformat(), now.date().isoformat()
    take('cme', parse_enlil, ENLIL.format(start=start, end=end))
    return doc


def check(doc):
    if doc.get('schema') != 'space_weather_v1' or doc.get('score_adjustment') != 0:
        raise ValueError('Invalid space-weather document')
    for k in ('flares', 'wind', 'cme'):
        if k not in doc or doc['sources'].get(k, {}).get('status') not in ('ok', 'unavailable'):
            raise ValueError('Space-weather source state missing: ' + k)
    return True


if __name__ == '__main__':
    import argparse, pathlib, sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from urllib.request import Request, urlopen

    def fetch(url):
        with urlopen(Request(url, headers={'User-Agent': 'SkyRhythm-cloud-source/1'}), timeout=35) as r:
            raw = r.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('Oversized source')
        return raw.decode('utf-8')
    ap = argparse.ArgumentParser(); ap.add_argument('--site', type=pathlib.Path, required=True); a = ap.parse_args()
    doc = build(fetch); check(doc)
    out = a.site.resolve() / 'consumer_cloud/space_weather.json'
    try:
        out.with_suffix('.json.pending').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':'), allow_nan=False), 'utf-8')
        out.with_suffix('.json.pending').replace(out)
    finally:
        out.with_suffix('.json.pending').unlink(missing_ok=True)
    print(json.dumps({'status': 'PASS', **{k: v['status'] for k, v in doc['sources'].items()}}))
