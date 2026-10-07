"""Public projection: preserve the source calculation; never export research channels."""
import copy
def public_feed(feed):
    if feed.get('schema')!='independent_forecast_feed_v1':raise ValueError('Unknown feed schema')
    result={k:copy.deepcopy(feed[k]) for k in ('schema','generated_at','executor','source_integrity','source_formula_error','code_hashes','source_hashes','noaa_transport','noaa_fetch_error') if k in feed}
    result['days']={}
    for day,row in feed['days'].items():
        if row.get('date')!=day:raise ValueError('Conflicting date')
        own=row.get('channels',{}).get('source_formula')
        if own is None:continue
        result['days'][day]={'date':day,'channels':{'source_formula':copy.deepcopy(own)},
            'forecast_result':copy.deepcopy(row.get('forecast_result',{})),
            'consumer_authority':{'channel':'source_formula','fallback':None,'version':'consumer-authority-v1'}}
    if not result['days']:raise ValueError('No source rows')
    return result
