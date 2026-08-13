import fs from 'node:fs';
import path from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(item=>{const i=item.indexOf('=');return i<0?[item.replace(/^--/,''),true]:[item.slice(2,i),item.slice(i+1)]}));
const input=args.input||path.resolve('panchanga_shadow_feed_v1.json');
const output=args.output||path.resolve('product/app/jyotish-calendar.json');
const feed=JSON.parse(fs.readFileSync(input,'utf8'));
const dates={};
for(const [date,day] of Object.entries(feed.days||{})){
  if(day.timezone!=='Europe/Kyiv'||day.canonical_score_effect!==0||day.status!=='shadow')continue;
  const components={};let valid=true;
  for(const key of ['tithi','nakshatra','yoga','karana']){const segments=day.components?.[key]?.segments;if(!Array.isArray(segments)||!segments.length){valid=false;break}components[key]=segments.map(({value,start_utc,end_utc})=>({value,start_utc,end_utc}));}
  if(valid)dates[date]={components};
}
if(!Object.keys(dates).length)throw new Error('no safe Jyotish dates');
const calendar={schema:'neborythm_jyotish_calendar_v1',generated_at:new Date().toISOString(),source_generated_at:feed.generated_at,timezone:'Europe/Kyiv',method_version:feed.method_version,source_id:'panchanga_shadow_feed_v1.json',source_role:'TRADITIONAL_SHADOW',score_effect:0,research:{canonical_score_effect:0,panchanga_second_vote:false},dates};
fs.writeFileSync(output,`${JSON.stringify(calendar)}\n`,'utf8');
console.log(JSON.stringify({status:'GENERATED',output,dates:Object.keys(dates).length,score_effect:0}));
