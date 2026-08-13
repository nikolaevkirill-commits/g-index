import fs from 'node:fs';
import path from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).map(item=>{const i=item.indexOf('=');return i<0?[item.replace(/^--/,''),true]:[item.slice(2,i),item.slice(i+1)]}));
const fail=message=>{console.error(message);process.exit(1)};
const input=args.input||path.resolve('panchanga_shadow_feed_v1.json');
const output=args.output||path.resolve('product/app/jyotish-snapshot.json');
const date=args.date||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(!fs.existsSync(input))fail(`missing Panchanga feed: ${input}`);
const feed=JSON.parse(fs.readFileSync(input,'utf8'));
const day=feed.days?.[date];
if(!day)fail(`Panchanga feed has no date ${date}`);
if(day.timezone!=='Europe/Kyiv'||day.canonical_score_effect!==0||day.status!=='shadow')fail('unsafe Panchanga day contract');
for(const key of ['tithi','nakshatra','yoga','karana'])if(!Array.isArray(day.components?.[key]?.segments)||!day.components[key].segments.length)fail(`missing ${key} segments`);
const snapshot={
  schema:'neborythm_jyotish_snapshot_v1',
  generated_at:new Date().toISOString(),
  source_generated_at:feed.generated_at,
  date,
  timezone:day.timezone,
  method_version:feed.method_version,
  source_id:'panchanga_shadow_feed_v1.json',
  source_role:'TRADITIONAL_SHADOW',
  score_effect:0,
  status:'CALCULATED_CONTEXT',
  components:Object.fromEntries(['tithi','nakshatra','yoga','karana'].map(key=>[key,{segments:day.components[key].segments.map(segment=>({value:segment.value,start_utc:segment.start_utc,end_utc:segment.end_utc}))}])),
  unavailable:{vara:'derived locally from civil date',chandra_rashi:'requires verified sidereal longitude adapter',nakshatra_pada:'requires verified sidereal longitude adapter',local_windows:'requires verified sunrise/sunset adapter',personal_chart:'requires explicit birth data, ephemeris licensing and 100-chart validation'},
  research:{canonical_score_effect:0,panchanga_second_vote:false}
};
fs.writeFileSync(output,`${JSON.stringify(snapshot,null,2)}\n`,'utf8');
console.log(JSON.stringify({status:'GENERATED',output,date,score_effect:0}));
