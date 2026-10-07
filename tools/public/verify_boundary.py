from pathlib import Path
import json,re,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[2]
def verify(root=ROOT):
    policy=json.loads((root/'PUBLIC_ASSET_ALLOWLIST.json').read_text('utf-8'))
    tracked=subprocess.check_output(['git','-C',str(root),'ls-files'],text=True).splitlines()
    allowed=set(policy['files']);dynamic=r'consumer_cloud/noaa/bodies/[a-f0-9]{64}\.json'
    bad=[n for n in tracked if n not in allowed and not re.fullmatch(dynamic,n)]
    if bad:raise ValueError('Files outside public allowlist: '+str(bad))
    for n in tracked:
        if Path(n).suffix in ('.csv','.jsonl','.pdf','.xlsx'):raise ValueError('Research data type published: '+n)
    for name in ['INDEPENDENT_FORECAST_FEED_v1.json','consumer_cloud/forecast.json']:
        doc=json.loads((root/name).read_text('utf-8-sig'))
        if doc['schema']!='independent_forecast_feed_v1':raise ValueError('Unknown schema')
        for date,row in doc['days'].items():
            if row['date']!=date or set(row['channels'])!={'source_formula'}:raise ValueError('Research channel in public feed')
            if set(row)-{'date','channels','forecast_result','consumer_authority'}:raise ValueError('Unexpected public row metadata')
    if (root/'tools/cloud/sources.enc').read_bytes()[:4]!=b'NRB1':raise ValueError('Unencrypted source bundle')
    health=(root/'SYSTEM_HEALTH_STATUS_v1.json').read_text('utf-8')
    if re.search(r'[CD]:[/\\]|Users[/\\]',health):raise ValueError('Local paths in public health')
    sw=(root/'sw.js').read_text('utf-8');assets=re.findall(r"'\./([^']+)'",re.search(r'const SHELL_ASSETS = \[(.*?)\];',sw,re.S).group(1))
    for n in assets:
        if not (root/n).is_file():raise ValueError('Offline shell missing '+n)
    for n,digest in policy['frozen_sha256'].items():
        if hashlib.sha256((root/n).read_bytes()).hexdigest()!=digest:raise ValueError('Frozen public registration changed')
    print('PASS public allowlist, source-only feeds, encrypted originals, shell and frozen registration')
if __name__=='__main__':verify()
