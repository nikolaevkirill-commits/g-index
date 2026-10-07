"""Projection applied only to exported copies, never canonical research files."""
import json,re
from public_feed import public_feed
MANIFEST_KEYS={'version','future_kp','meeus_core','panchanga_shadow','system_health','space_weather_ctx','kp_hourly_alert','bgs_space_weather','silso_refresh_status','aia_vernadsky_daily','source_routing_audit','outcome_intake_form'}
def project(name,raw):
    if name in ('INDEPENDENT_FORECAST_FEED_v1.json','consumer_cloud/forecast.json'):
        return json.dumps(public_feed(json.loads(raw)),ensure_ascii=False,indent=2).encode('utf-8')
    if name=='data_manifest.json':
        d=json.loads(raw);return json.dumps({k:v for k,v in d.items() if k in MANIFEST_KEYS},ensure_ascii=False).encode('utf-8')
    if name=='SYSTEM_HEALTH_STATUS_v1.json':
        def clean(value):
            if isinstance(value,dict):return {k:clean(v) for k,v in value.items() if k not in ('action','command','stdout','stderr','traceback')}
            if isinstance(value,list):return [clean(x) for x in value]
            if isinstance(value,str) and re.search(r'[CD]:[/\\]|Users[/\\]',value):return '[local path omitted]'
            return value
        return json.dumps(clean(json.loads(raw)),ensure_ascii=False,indent=2).encode('utf-8')
    return raw
