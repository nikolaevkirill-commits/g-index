'use strict';
// FP542 browser contract: registry row validation (B1/R1), conflicts, clock tolerance (B2),
// invalid-state text (B3), registry status note and first-screen score drivers (D2).
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
// Deterministic synthetic scenarios built from the fixed contract fixture; never refresh it from a live feed.
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/score_regression.json')));
const prototype=structuredClone(Object.values(feed.days).find(d=>d.channels.source_formula.available));
feed.days={};
for(const ds of ['2026-10-29','2026-10-30']){
 const row=structuredClone(prototype);row.date=ds;
 Object.assign(row.channels.source_formula,{available:true,value:-3,raw:-3,expert_override_used:false,
 generated_at:'2026-10-29T09:00:00Z',noaa_issued_at:'2026-10-29T09:00:00Z',noaa_retrieved_at:'2026-10-29T09:00:00Z',
 kp_source:'NOAA_3day_slots',factors:[{factor:'Rikta',value:-3}]});feed.days[ds]=row;
}
const real=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/final_score_decisions.json')));
const types={'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((q,r)=>{const n=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html',f=path.resolve(root,n);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(e?'':b)})});
// Synthetic generation time defines the clock; the underlying fixed fixture is unchanged.
const generated=Date.parse(Object.values(feed.days).find(d=>d.channels.source_formula.available).channels.source_formula.generated_at);
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(generated));
const bad={date:'2099-12-31',score:4,source_sha256:'a'.repeat(64),source_page:1,decision_id:'bad'};
async function open(b,port,{time,decisions,abortDecisions}){
 const c=await b.newContext({serviceWorkers:'block',timezoneId:'Europe/Kyiv',locale:'uk-UA',viewport:{width:390,height:844}});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.route('**/consumer_cloud/forecast.json*',r=>r.fulfill({json:feed}));
 await c.route('**/consumer_cloud/final_score_decisions.json*',r=>abortDecisions?r.abort():r.fulfill({json:decisions}));
 const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.setFixedTime(new Date(time));
 await p.goto('http://127.0.0.1:'+port+'/index.html?channel=play#today');
 await p.waitForFunction(()=>window.fp469LoadConsumerForecast&&window.fp434Go,null,{timeout:30000});
 await p.evaluate(()=>{window.__d=false;fp469LoadConsumerForecast().finally(()=>window.__d=true)});await p.waitForFunction(()=>window.__d===true);
 await p.evaluate(()=>fp434Go('today',false));await p.waitForTimeout(500);
 return {c,p,errors};
}
const score=(p,route)=>p.evaluate(r=>document.querySelector('[data-overview="'+r+'"] .nr-o-score')?.innerText.trim(),route);
const text=(p,sel)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\s+/g,' ')||'',sel);
const scoreFor=async(p,ds)=>{const r=await p.evaluate(ds=>{const x=window.fp469ConsumerForDate({ds});return {score:x.consumer.score,state:x.consumer.state}},ds);return r};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;const b=await chromium.launch({...(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{})});let n=0;const ok=m=>{n++;console.log('PASS',m)};
 try{
  const noon=Date.parse(day+'T10:00:00Z');
  const expertDays=real.decisions.map(x=>x.date).filter(d=>d>day&&feed.days[d]?.channels.source_formula.available&&feed.days[d].channels.source_formula.value!==real.decisions.find(x=>x.date===d).score);
  assert(expertDays.length>0,'fixture needs one future date where expert and formula differ');
  const target=expertDays[0],expertScore=real.decisions.find(x=>x.date===target).score;
  // B1: one malformed row
  let s=await open(b,port,{time:noon,decisions:{...real,decisions:[...real.decisions,bad]}});
  assert.deepEqual(await scoreFor(s.p,target),{score:expertScore,state:'expert'});
  assert.match(await text(s.p,'[data-overview="today"] [data-registry]'),/відхилено/);ok('malformed row keeps expert '+target+' and shows registry note');
  assert.deepEqual(s.errors,[]);await s.c.close();
  // B1: conflicting duplicate
  s=await open(b,port,{time:noon,decisions:{...real,decisions:[...real.decisions,{...real.decisions.find(x=>x.date===target),score:expertScore===3?2:3}]}});
  assert.deepEqual(await scoreFor(s.p,target),{score:null,state:'expert_conflict'});ok('conflicting duplicate withholds '+target+' (no formula fallback)');await s.c.close();
  // B1: first-load delivery failure
  s=await open(b,port,{time:noon,abortDecisions:true});
  assert.match(await text(s.p,'[data-overview="today"] [data-registry]'),/недоступний/);ok('first-load registry failure is visible');await s.c.close();
  // B2/B3: clock tolerance
  s=await open(b,port,{time:generated-299000,decisions:{...real,decisions:[]}});
  assert.notEqual(await score(s.p,'today'),'—');ok('device 4:59 behind still shows the score');await s.c.close();
  s=await open(b,port,{time:generated-301000,decisions:{...real,decisions:[]}});
  assert.equal(await score(s.p,'today'),'—');assert.match(await text(s.p,'[data-overview="today"] [data-p0-feed-state]'),/Годинник пристрою/);ok('device 5:01 behind fails closed with a clock message');await s.c.close();
  // D2: drivers on the first screen for a negative formula day
  const neg=Object.values(feed.days).find(d=>d.date>=day&&d.channels.source_formula.available&&d.channels.source_formula.value<0&&d.channels.source_formula.factors.some(f=>f.factor!=='Kp'&&f.value<0));
  if(neg&&neg.date===day){s=await open(b,port,{time:noon,decisions:{...real,decisions:[]}});
   const sentence=await text(s.p,'[data-overview="today"] [data-p0-sentence]');assert.match(sentence,/Знижують оцінку:/);
   const top=neg.channels.source_formula.factors.filter(f=>f.value<0&&(f.factor!=='Kp'||f.value<=-1)).sort((a,b)=>a.value-b.value)[0];assert(sentence.includes(top.factor==='Kp'?'Геомагнітна складова':top.factor));
   ok('negative day names its strongest lowering factor on the first screen');await s.c.close();}
  else console.log('SKIP D2 sentence: snapshot day is not negative with a calendar minus');
  // A valid expert verdict must not make stale formula drivers look current.
  s=await open(b,port,{time:generated+9*3600000,decisions:real});
  assert.equal((await scoreFor(s.p,day)).state,'expert');
  assert.doesNotMatch(await text(s.p,'[data-overview="today"] [data-p0-sentence]'),/знижують оцінку|Знижують оцінку|Найбільші внески/);
  ok('stale formula drivers are not used to explain the current expert verdict');await s.c.close();
  console.log('PASS FP542 authority browser contract: '+n+' cases');
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
