"""Refresh only the consumer source calculation; never promote a model or send alerts."""
from pathlib import Path
from datetime import datetime, timezone
from http.client import HTTPException, IncompleteRead
import argparse, copy, hashlib, json, os, sys
from tempfile import TemporaryDirectory
from time import sleep
from public_feed import public_feed
from kp_source_guard import reject_downgrade, suppress_downgrades
from urllib.request import Request, urlopen

def encode(doc):return json.dumps(doc,ensure_ascii=False,indent=2,allow_nan=False).encode('utf-8')
def write(path,doc):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(encode(doc))
def prepare(root):
    mapping=json.loads((root/'source_paths.json').read_text())
    for name,original in mapping.items():
        p=root/name;doc=json.loads(p.read_text('utf-8-sig'));source=root/original
        if hashlib.sha256(source.read_bytes()).hexdigest()!=doc['source_sha256']:raise ValueError('Original changed')
        doc['source']=str(source.resolve());write(p,doc)
    sys.path.insert(0,str(root));sys.path.insert(0,str(root/'source_formula_candidate_20261001'))

TRANSPORT_HEADERS = ('Content-Length', 'Content-Type', 'Content-Encoding', 'Transfer-Encoding', 'Date',
                     'Last-Modified', 'ETag', 'Age', 'Cache-Control', 'Via', 'X-Cache', 'Server')
LAST_RESPONSE = {}
REJECTED_DIR_ENV = 'NR_NOAA_REJECTED_DIR'


def validate_slots(raw):
    """Shallow, whole-body check before the private protocol: one JSON list of distinct timestamped slots."""
    rows = json.loads(raw.decode('utf-8-sig'))
    if not isinstance(rows, list) or not rows or any(
        not isinstance(row, dict) or not isinstance(row.get('time_tag'), str)
        for row in rows
    ):
        raise ValueError('Expected a non-empty NOAA slot list with timestamp strings')
    slots = set()
    for row in rows:
        tag = row['time_tag']
        stamp = datetime.fromisoformat(tag.replace('Z', '+00:00'))
        stamp = stamp.replace(tzinfo=stamp.tzinfo or timezone.utc).astimezone(timezone.utc)
        if stamp in slots:
            raise ValueError('Duplicate NOAA slot ' + tag + ' (' + stamp.isoformat() + ')')
        slots.add(stamp)


def keep_rejected(raw, digest, record):
    """Keep a rejected body outside the publication tree, only when the runner asks for it."""
    target = os.environ.get(REJECTED_DIR_ENV)
    if not target or raw is None:
        return None
    folder = Path(target)
    folder.mkdir(parents=True, exist_ok=True)
    name = 'attempt%d-%s' % (record['attempt'], digest)
    (folder / (name + '.body')).write_bytes(raw)
    (folder / (name + '.json')).write_text(json.dumps(record, indent=1), encoding='utf-8')
    return str(folder / (name + '.body'))


def diagnostic(raw, error):
    """Bytes around a JSON decode error, enough to tell a second document from truncation."""
    if raw is None:
        return None
    bom_size = 3 if raw.startswith(b'\xef\xbb\xbf') else 0
    if isinstance(error, json.JSONDecodeError):
        position = bom_size + len(error.doc[:error.pos].encode('utf-8'))
    elif isinstance(error, UnicodeDecodeError):
        position = bom_size + error.start
    else:
        return None
    start, end = max(0, position - 48), min(len(raw), position + 48)
    return {'error_offset': position, 'excerpt_offset': start, 'excerpt_hex': raw[start:end].hex(),
            'tail_hex': raw[-16:].hex()}


def fetch(url):
    headers = {
        'User-Agent': 'NeboRhythm-cloud-source/1',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
    }
    with urlopen(Request(url, headers=headers), timeout=35) as response:
        LAST_RESPONSE.clear()
        LAST_RESPONSE.update({'status': getattr(response, 'status', None), 'headers': {
            name: response.headers.get(name) for name in TRANSPORT_HEADERS if response.headers.get(name) is not None}})
        raw = response.read(1_000_001)
        declared = response.headers.get('Content-Length')
        if declared and declared.isdecimal() and not response.headers.get('Transfer-Encoding'):
            expected = int(declared)
            if len(raw) < expected and len(raw) <= 1_000_000:
                raise IncompleteRead(raw, expected - len(raw))
    if len(raw) > 1_000_000:
        raise ValueError('Oversized source')
    return raw


def archive_slots(root, url, raw, retrieved_at, digest):
    archive = root / 'outputs/kp_raw_archive'
    body = 'bodies/' + digest + '.json'
    receipt = 'receipts/cloud.json'
    (archive / 'bodies').mkdir(parents=True, exist_ok=True)
    (archive / body).write_bytes(raw)
    write(archive / receipt, {
        'url': url, 'retrieved_at': retrieved_at, 'body': body, 'sha256': digest,
    })
    write(root / 'future_kp.json', {'source_receipts': {
        url: {'receipt': receipt, 'sha256': digest},
    }})


def refresh_short_range(root, url, load_slots, fetcher=fetch):
    last = None
    with TemporaryDirectory(prefix='skyrhythm-noaa-') as directory:
        staging = Path(directory)
        for attempt in range(1, 4):
            raw = None
            digest = None
            detail = None
            stage = 'transport'
            LAST_RESPONSE.clear()
            try:
                raw = fetcher(url)
                retrieved = datetime.now(timezone.utc)
                digest = hashlib.sha256(raw).hexdigest()
                # Reject a partial or concatenated response as a whole. The private
                # protocol still verifies slot values, times, provenance and classes.
                stage = 'shape'
                validate_slots(raw)
            except (OSError, HTTPException, ValueError) as error:
                if isinstance(error, IncompleteRead):
                    raw = error.partial
                    digest = hashlib.sha256(raw).hexdigest()
                last = type(error).__name__ + ': ' + str(error)
                detail = diagnostic(raw, error)
            else:
                stamp = retrieved.isoformat()
                stage = 'protocol'
                archive_slots(staging, url, raw, stamp, digest)
                try:
                    context, error = load_slots(staging, retrieved)
                except (KeyError, IndexError, TypeError, ValueError) as failure:
                    # A protocol exception counts as a rejected attempt; it never publishes.
                    context, error = None, type(failure).__name__ + ': ' + str(failure)
                if context is not None:
                    archive_slots(root, url, raw, stamp, digest)
                    if attempt > 1:
                        print(json.dumps({'source': 'NOAA_3day_slots', 'attempt': attempt, 'status': 'accepted',
                                          'bytes': len(raw), 'sha256': digest}), file=sys.stderr)
                    return
                last = str(error)
            record = {'source': 'NOAA_3day_slots', 'attempt': attempt, 'status': 'rejected', 'stage': stage,
                      'bytes': len(raw) if raw is not None else None, 'sha256': digest, 'reason': last,
                      'at': datetime.now(timezone.utc).isoformat()}
            if LAST_RESPONSE:
                record['transport'] = dict(LAST_RESPONSE)
            if detail:
                record['decode'] = detail
            try:
                kept = keep_rejected(raw, digest, record)
            except OSError as failure:
                kept = None
                record['keep_error'] = type(failure).__name__ + ': ' + str(failure)
            if kept:
                record['kept'] = kept
            print(json.dumps(record), file=sys.stderr)
            if attempt < 3:
                sleep(attempt)
    raise ValueError('Rejected fresh NOAA slots after 3 attempts: ' + last)


def calculate(root):
    from kp_input_protocol import URL, load
    from refresh_forecast import refresh
    from source_calculation_verifier import verify
    refresh_short_range(root, URL, load)
    doc=refresh(root)
    proof=verify(root,doc)
    if doc['source_error']:raise ValueError('No verified source calculation')
    from expert_model import apply, verify as verify_expert
    weights=json.loads((root/'source_formula_candidate_20261001/workbook_weights.json').read_text('utf-8-sig'))['tag_weights']
    doc=apply(doc,weights)
    proof['expert_model']=verify_expert(doc)
    return doc,proof

def build_feed(doc,legacy,proof):
    rows={}
    for own in doc['rows']:
        ds=own['date'];row=copy.deepcopy(legacy.get('days',{}).get(ds,{'date':ds,'channels':{}}))
        kp=own.get('kp_input') or {}
        channel={'value':own.get('forecast_score'),'available':own.get('forecast_score') is not None,
          'status':own['status'],'generated_at':doc['generated_at'],'noaa_issued_at':kp.get('issued_at',doc.get('noaa_issued_at')),
          'kp_source':kp.get('source'),'kp_input':kp,'noaa_retrieved_at':kp.get('retrieved_at'),
          'kp_daily_max':kp.get('kp'),'score_effect':0,'validation':'unvalidated_source_formula','expert_override_used':False,
          'factors':own.get('contributions',[]),'raw':own.get('raw_sum'),'kp_timezone':kp.get('timezone'),
          'threshold_policy':own.get('threshold_policy'),'independence':'shared_source_formula_not_independent_validation',
          'model_version':'expert-factor-model-v2','expert_model':own['expert_model']}
        row.setdefault('channels',{})['source_formula']=channel
        row['forecast_result']={'score':own.get('forecast_score'),'authority':'source_formula_unvalidated','expert_override_used':False}
        values=[v['value'] for k,v in row['channels'].items() if k in ('expert_pdf','frozen_engine','tanita_image','source_formula') and v.get('available') and v.get('value') is not None]
        row.update(comparable_channel_count=len(values),spread=max(values)-min(values) if len(values)>1 else None,
          material_disagreement=len(values)>1 and max(values)-min(values)>=2,
          consumer_authority={'channel':'source_formula','fallback':None,'version':'consumer-authority-v1'})
        rows[ds]=row
    return {'schema':'independent_forecast_feed_v1','generated_at':doc['generated_at'],'executor':'github-actions-source-only-v1',
      'legacy_context_generated_at':legacy.get('generated_at'),'source_formula_error':None,'days':rows,
      'source_integrity':proof,'code_hashes':doc['code_hashes'],'source_hashes':doc['source_hashes'],
      'noaa_transport':doc['transport'],'noaa_fetch_error':doc['fetch_error'],
      'scope':'Consumer calculation only. Other channels retain their original timestamps. No prospective ledger update or promotion.'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--private',type=Path,required=True);ap.add_argument('--site',type=Path,required=True);a=ap.parse_args()
    root=a.private.resolve();site=a.site.resolve();prepare(root);doc,proof=calculate(root)
    legacy=json.loads((site/'INDEPENDENT_FORECAST_FEED_v1.json').read_text('utf-8-sig'))
    feed=public_feed(build_feed(doc,legacy,proof))
    previous_path=site/'consumer_cloud/forecast.json'
    if previous_path.exists():
        previous=json.loads(previous_path.read_text('utf-8-sig'))
        feed=suppress_downgrades(previous,feed,datetime.now(timezone.utc))
        reject_downgrade(previous,feed,datetime.now(timezone.utc))
    write(site/'consumer_cloud/forecast.json',feed)
    # Public receipts contain physical NOAA data only, never workbook/PDF contents.
    dest=site/'consumer_cloud/noaa';dest.mkdir(parents=True,exist_ok=True)
    for p in (root/'outputs/kp_raw_archive').rglob('*.json'):
        q=dest/p.relative_to(root/'outputs/kp_raw_archive');q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(p.read_bytes())
    outlook=root/'outputs/source_formula_forecast/noaa_latest.txt'
    if outlook.exists():(dest/'27-day-outlook.txt').write_bytes(outlook.read_bytes())
    print(json.dumps({'status':'PASS','generated_at':doc['generated_at'],'replayed_days':proof['replayed_days'],'calculated_days':doc['calculated_days']}))

if __name__=='__main__':main()
