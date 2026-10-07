"""Refresh only the consumer source calculation; never promote a model or send alerts."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, copy, hashlib, json, sys
from public_feed import public_feed
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

def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'NeboRhythm-cloud-source/1'}),timeout=35) as r:
        raw=r.read(1_000_001)
    if len(raw)>1_000_000:raise ValueError('Oversized source')
    return raw

def calculate(root):
    from kp_input_protocol import URL,load
    from refresh_forecast import refresh
    from source_calculation_verifier import verify
    # Preserve exact NOAA bytes and retrieval time; no timestamp-only refresh.
    raw=fetch(URL);retrieved=datetime.now(timezone.utc).isoformat();digest=hashlib.sha256(raw).hexdigest()
    archive=root/'outputs/kp_raw_archive';body='bodies/'+digest+'.json';receipt='receipts/cloud.json'
    (archive/'bodies').mkdir(parents=True,exist_ok=True);(archive/body).write_bytes(raw)
    write(archive/receipt,{'url':URL,'retrieved_at':retrieved,'body':body,'sha256':digest})
    write(root/'future_kp.json',{'source_receipts':{URL:{'receipt':receipt,'sha256':digest}}})
    context,error=load(root,datetime.now(timezone.utc))
    if context is None:raise ValueError('Rejected fresh NOAA slots: '+str(error))
    doc=refresh(root)
    proof=verify(root,doc)
    if doc['source_error'] or not doc['calculated_days']:raise ValueError('No verified calculation')
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
          'threshold_policy':own.get('threshold_policy'),'independence':'shared_source_formula_not_independent_validation'}
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
    write(site/'consumer_cloud/forecast.json',feed)
    # Public receipts contain physical NOAA data only, never workbook/PDF contents.
    dest=site/'consumer_cloud/noaa';dest.mkdir(parents=True,exist_ok=True)
    for p in (root/'outputs/kp_raw_archive').rglob('*.json'):
        q=dest/p.relative_to(root/'outputs/kp_raw_archive');q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(p.read_bytes())
    outlook=root/'outputs/source_formula_forecast/noaa_latest.txt'
    if outlook.exists():(dest/'27-day-outlook.txt').write_bytes(outlook.read_bytes())
    print(json.dumps({'status':'PASS','generated_at':doc['generated_at'],'replayed_days':proof['replayed_days'],'calculated_days':doc['calculated_days']}))

if __name__=='__main__':main()
