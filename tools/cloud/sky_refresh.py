"""Write consumer_cloud/sky.json: 27-day transit events with SkyRhythm readings (score weight 0)."""
from pathlib import Path
from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo
import argparse, json, sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import transit_meaning


def build(start=None, now=None):
    import transit_events  # needs pyswisseph; check() does not
    now = now or datetime.now(timezone.utc)
    start = start or now.astimezone(ZoneInfo('Europe/Kyiv')).date().isoformat()
    doc = transit_meaning.annotate(transit_events.compute(start, 27, now))
    check(doc)
    return doc


def check(doc):
    import math
    if doc.get('schema') != 'sky_transits_v1' or len(doc.get('daily', [])) != 27:
        raise ValueError('Invalid sky document')
    w = doc['window']
    start = date.fromisoformat(w['start'])
    if w.get('days') != 27 or w.get('zone') != 'Europe/Kyiv':
        raise ValueError('Invalid window')
    generated = datetime.fromisoformat(doc['generated_at'].replace('Z', '+00:00'))
    if generated.tzinfo is None:
        raise ValueError('Missing generation timezone')
    if doc['convention'].get('score_adjustment') != 0:
        raise ValueError('Transits must not change the score')
    expected = [(start + timedelta(days=i)).isoformat() for i in range(27)]
    if [r['date'] for r in doc['daily']] != expected:
        raise ValueError('Dates must be consecutive and unique')
    for row in doc['daily']:
        if set(row['grahas']) != {'Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'}:
            raise ValueError('Missing planet')
        for g in row['grahas'].values():
            lon = g['lon']
            if not isinstance(lon, (float,int)) or not math.isfinite(lon) or not 0 <= lon < 360:
                raise ValueError('Invalid longitude')
            if not math.isfinite(g['speed']) or not 0 <= g['sign'] < 12:
                raise ValueError('Invalid position')
    for item in doc['events'] + doc['intervals']:
        for key in ('at','start','end','exact'):
            if key in item:
                st = item[key]
                utc = datetime.fromisoformat(st['utc'].replace('Z','+00:00'))
                if utc.tzinfo is None or utc.astimezone(ZoneInfo('Europe/Kyiv')).date().isoformat() != st['kyiv_date']:
                    raise ValueError('Inconsistent event time')
        if 'start' in item and item['start']['utc'] >= item['end']['utc']:
            raise ValueError('Invalid interval')
        r = item.get('reading')
        if r and (r.get('score_adjustment') != 0 or not all(r['text'].get(l) for l in transit_meaning.LANGS)):
            raise ValueError('Invalid reading')
    return True


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--site', type=Path, required=True); ap.add_argument('--start')
    a = ap.parse_args()
    doc = build(a.start)
    out = a.site.resolve() / 'consumer_cloud/sky.json'
    try:
        out.with_suffix('.json.pending').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':'), allow_nan=False), 'utf-8')
        out.with_suffix('.json.pending').replace(out)
    finally:
        out.with_suffix('.json.pending').unlink(missing_ok=True)
    print(json.dumps({'status': 'PASS', 'start': doc['window']['start'], 'events': len(doc['events']), 'intervals': len(doc['intervals']), 'bytes': out.stat().st_size}))
