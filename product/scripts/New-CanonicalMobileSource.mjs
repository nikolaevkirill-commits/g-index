import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{const [k,...r]=v.replace(/^--/,'').split('=');return [k,r.join('=')]}));
const root=resolve(args.root||'.');
const output=resolve(args.output||'product/contracts/hero-state.json');
const at=new Date(args.at||Date.now());
const fail=m=>{throw new Error(`canonical mobile source rejected: ${m}`)};
const load=async name=>JSON.parse(await readFile(resolve(root,name),'utf8'));
const feed=await load('AUTO_FORECAST_FEED_v1.json');
const weather=await load('SPACE_WEATHER_CONTEXT_v1.json');
if(feed.schema!=='auto_forecast_feed_v1')fail('forecast schema');
if(weather.schema!=='space_weather_context_v1'||weather.score_effect!==0)fail('space-weather schema/role');
if(!Number.isFinite(at.getTime()))fail('evaluation time');
const generated=new Date(Math.max(Date.parse(feed.generated_at),Date.parse(weather.fetched_at)));
if(!Number.isFinite(generated.getTime()))fail('source timestamp');
const ageMinutes=Math.max(0,Math.floor((at-generated)/60000));
const freshness=ageMinutes<=15?'LIVE':ageMinutes<=360?'DELAYED':ageMinutes<=720?'LAST_GOOD':'STALE';
const scoreState=s=>s>=1?'ACT':s<=-2?'HOLD':s===-1?'CAUTION':'UNKNOWN';
const records=Object.values(feed.days||feed.dates||feed.records||{}).filter(x=>x&&x.date&&x.final_decision);
records.sort((a,b)=>a.date.localeCompare(b.date));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
const operational=args['operational-state'];
if(operational&&!['ACT','CAUTION','HOLD','UNKNOWN'].includes(operational))fail('operational state');
const todayRecord=records.find(x=>x.date===today)||null;
const timeline=records.filter(x=>x.date>=today).slice(0,27).map(x=>({
  at:`${x.date}T09:00:00.000Z`,
  state:scoreState(Number(x.final_decision.score)),
  label:`DAILY_REFERENCE · ${x.final_decision.authority} · score ${Number(x.final_decision.score)>=0?'+':''}${x.final_decision.score}`
}));
const sky=[];
const addSky=(kind,label,value,role,sourceId,observedAt)=>sky.push({kind,label,value:String(value),role,source_id:sourceId,observed_at:observedAt||null,score_effect:0});
if(Number.isFinite(weather.magnetic?.bz_latest_nt))addSky('IMF_BZ','IMF Bz',`${weather.magnetic.bz_latest_nt} nT`,'OBSERVED','NOAA_RTSW',weather.magnetic.latest_time);
if(Number.isFinite(weather.solar_wind?.speed_latest_km_s))addSky('SOLAR_WIND','Solar wind',`${weather.solar_wind.speed_latest_km_s} km/s`,'OBSERVED','NOAA_RTSW',weather.solar_wind.latest_time);
if(Number.isFinite(weather.dst?.latest_nt))addSky('DST','Dst',`${weather.dst.latest_nt} nT`,'OBSERVED','KYOTO_DST',weather.dst.latest_time);
if(Number.isFinite(weather.protons?.latest_ge10mev_pfu))addSky('PROTONS','Protons ≥10 MeV',`${weather.protons.latest_ge10mev_pfu} pfu`,'OBSERVED','GOES',weather.protons.latest_time);
const validUntil=new Date(generated.getTime()+12*3600000);
const source={
  schema:'neborytm_hero_state_v1',
  decision:operational||'UNKNOWN',
  decision_score:null,
  reason_code:operational?'CANONICAL_OPERATIONAL_EXPORT':'OPERATIONAL_EXPORT_UNAVAILABLE',
  reason_text:operational?'Exported by the canonical dashboard resolver.':'Daily references are available, but the current operational resolver export is unavailable.',
  data_state:freshness==='LIVE'?'OBSERVED':'DELAYED',freshness,
  source_id:`PRODUCTION_CANONICAL:${feed.schema}:${weather.snapshot_sha256||'NO_HASH'}`,
  observed_at:weather.fetched_at,generated_at:generated.toISOString(),valid_until:validUntil.toISOString(),age_minutes:ageMinutes,
  confidence:operational?(todayRecord?.final_decision?.confidence_tier||'UNKNOWN'):'UNKNOWN',next_change_at:timeline[1]?.at||null,
  reference_score:todayRecord?Number(todayRecord.final_decision.score):null,
  timeline,sky,context_27d:[],research:{tanita_score_effect:0,v19_2_score_effect:0}
};
await writeFile(output,`${JSON.stringify(source,null,2)}\n`,'utf8');
console.log(`WROTE ${output} decision=${source.decision} freshness=${freshness} timeline=${timeline.length} sky=${sky.length}`);
