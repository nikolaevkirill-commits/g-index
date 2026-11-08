'use strict';
// Sky layer guard: design-v4 Forecast shows the 27-day transit scene from consumer_cloud/sky.json, in every UI
// language without Ukrainian leftovers, with 0 running animations under reduced motion, an explicit state when
// sky.json is missing, and no change to the day score shown on the page.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
let hideSky=false,weatherOverride=null;
// Space-weather fixture in the documented space_weather_v1 shape (the live file is written by the cloud run).
const WEATHER_DOC=({schema:'space_weather_v1',generated_at:'2026-11-02T08:00:00Z',score_adjustment:0,sources:{flares:{status:'ok'},wind:{status:'ok'},cme:{status:'unavailable'}},
 flares:{count_7d:2,strongest:{class:'M1.4',peak_utc:'2026-11-01T03:21:00Z',flux:1.4e-5},recent:[],radio_blackout_scale:'R1-R2'},wind:{plasma:{time_utc:'2026-11-02T07:50:00Z',speed_km_s:412,density_cm3:4.1},mag:{time_utc:'2026-11-02T07:51:00Z',bz_nt:-6.4,bt_nt:8.2},age_minutes:10,stale:false},cme:null});
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';if(hideSky&&f==='consumer_cloud/sky.json'){s.writeHead(404);return s.end()}if(f==='consumer_cloud/space_weather.json'){s.writeHead(200,{'content-type':'application/json'});return s.end(JSON.stringify(weatherOverride||{...WEATHER_DOC,generated_at:day+'T09:30:00Z'}))}const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const sky=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/sky.json'),'utf8'));const day=sky.daily[Math.min(11,sky.daily.length-1)].date;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();const res=[];
try{for(const [locale,rm] of [['uk-UA','no-preference'],['en-GB','no-preference'],['es-ES','no-preference'],['fr-FR','no-preference'],['uk-UA','reduce'],['uk-UA','missing']]){
 hideSky=rm==='missing';
 const c=await b.newContext({locale,serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv',reducedMotion:rm==='reduce'?'reduce':'no-preference'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(new Date(day+'T10:00:00Z'));
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#panch',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>['ready','missing'].includes(window.NRSkyScene?.state()),null,{timeout:60000});
 // Data readiness precedes deferred DOM mounting. CI 42181172460 reached this state
 // before [data-sky] existed; wait for the UI, then keep all content/animation assertions.
 await p.locator('[data-sky]').waitFor({state:'visible',timeout:60000});
 const score0=await p.evaluate(()=>document.querySelector('[data-overview="today"] .nr-o-score')?.textContent||'');
 await p.evaluate(()=>{document.querySelector('[data-sky]').scrollIntoView();document.querySelectorAll('[data-sky] details').forEach(d=>d.open=true)});await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{const s=document.querySelector('[data-sky]');return {state:NRSkyScene.state(),planets:s.querySelectorAll('.nr-sky-planet').length,events:s.querySelectorAll('.nr-sky-ev').length,days:s.querySelectorAll('[data-sky-day]').length,
  cyr:/[А-Яа-яІіЇїЄєҐґ]/.test(s.innerText),text:s.innerText.slice(0,400),anims:document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.target?.closest?.('[data-sky]')).length,overflow:document.documentElement.scrollWidth>innerWidth}});
 const score1=await p.evaluate(()=>document.querySelector('[data-overview="today"] .nr-o-score')?.textContent||'');
 res.push({locale,rm,...r,errs:errs.length,scoreSame:score0===score1});
 if(rm!=='missing'){const sw=await p.evaluate(()=>document.querySelector('[data-sky] .nr-sky-sw')?.innerText||'');assert.match(sw,/M1\.4/,'flare shown');assert.match(sw,/412/,'solar wind shown');assert.match(sw,/немає даних|no data|sin datos|pas de données/,'missing CME stated');}
 if(rm==='missing'){assert.equal(r.state,'missing');assert.equal(r.planets,0);assert.match(r.text,/^Небо · 27 днів/);assert.match(r.text,/недоступні/)}
 else{assert.equal(r.state,'ready');assert.equal(r.planets,9);assert.equal(r.days,27);assert.ok(r.events>0,'no readings')}
 if(!locale.startsWith('uk'))assert.equal(r.cyr,false,locale+' shows Ukrainian text');
 if(rm==='reduce')assert.equal(r.anims,0,'animations under reduced motion');
 if(rm==='no-preference')assert.ok(r.anims>0,'no animations for active events');
 assert.equal(r.overflow,false);assert.equal(errs.length,0,errs.join('|'));assert.equal(score0,score1);
 if(rm!=='missing'){await p.evaluate(()=>{location.hash='today'});await p.waitForTimeout(1500);
  const td=await p.evaluate(()=>{const ov=document.querySelector('#nrRoute-today [data-overview="today"]');const kids=[...ov.children].map(e=>e.matches('.nr-o-hero')?'hero':e.matches('[data-p0-signals]')?'signals':e.matches('[data-sky-now]')?'sky':e.matches('.sr-dayline')?'dayline':e.matches('.nr-o-weather-brief')?'noaa':e.matches('[data-day-you]')?'personal':e.matches('[data-p0-details]')?'details':null).filter(Boolean);
   const c=document.querySelector('[data-sky-now]');return {order:kids.join('>'),cyr:/[А-Яа-яІіЇїЄєҐґ]/.test(c?.innerText||''),wheel:!c?.querySelector('svg.is-mini')&&(c?.querySelectorAll('.nr-sky-planets li').length||0)>=7,items:c?.querySelectorAll('li').length||0}});
  assert.equal(td.order,'hero>dayline>signals>noaa>sky>personal>details','Today order '+td.order);assert.ok(td.wheel&&td.items>0,'Sky now card: readable planet list instead of the mini wheel (owner, 07.11)');
  if(!locale.startsWith('uk'))assert.equal(td.cyr,false,locale+' Sky now shows Ukrainian');res.at(-1).today=td.order}
 await c.close();}
 hideSky=false;
 const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date(day+'T10:00:00Z'));
 const model={arrival_utc:day+'T11:00:00Z',model_run_utc:day+'T08:00:00Z',glancing:true};
 let referenceScore;
 for(const mode of ['future','elapsed','unknown','empty','stale','future-feed']){
  weatherOverride={...WEATHER_DOC,generated_at:day+'T09:30:00Z',cme:{earth_arrivals:[model]}};
  if(mode==='elapsed')weatherOverride.cme={earth_arrivals:[{...model,arrival_utc:day+'T09:00:00Z'}]};
  if(mode==='unknown')weatherOverride.cme={earth_arrivals:[{arrival_utc:null,model_run_utc:null,glancing:'false'}]};
  if(mode==='empty')weatherOverride.cme={earth_arrivals:[]};
  if(mode==='stale')weatherOverride.generated_at=day+'T07:00:00Z';
  if(mode==='future-feed')weatherOverride.generated_at=day+'T11:00:00Z';
  await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play&weather_case='+mode+'#panch',{waitUntil:'load',timeout:120000});
  await p.waitForFunction(()=>window.NRSkyScene?.state()==='ready',null,{timeout:60000});
  await p.locator('[data-sky] .nr-sky-sw').waitFor({state:'visible',timeout:60000});
  const card=p.locator('.nr-sky-sw'),help=card.locator('.nr-sky-weather-help');
  // Chromium may restore the details state on a same-URL navigation. Exercise the
  // actual toggle, then leave the explanation open rather than assuming it is closed.
  const wasOpen=await help.evaluate(e=>e.open);await card.locator('summary').click();
  await p.waitForFunction(before=>document.querySelector('.nr-sky-weather-help').open!==before,wasOpen);
  if(wasOpen)await card.locator('summary').click();
  await card.locator('.nr-sky-weather-help p').first().waitFor({state:'visible',timeout:5000});
  const text=await card.innerText();assert.match(text,/Час і сила бурі можуть змінитися/);assert.match(text,/не точний розклад бур/);assert.doesNotMatch(text,/1970|undefined|Invalid Date|NaN/);
  if(mode==='future'){assert.match(text,/≈/);assert.match(text,/Розрахунок моделі:/);assert.match(text,/дотичний удар/);assert.doesNotMatch(text,/Оціночний час минув/);
   if(process.env.SKY_EVIDENCE_DIR){fs.mkdirSync(process.env.SKY_EVIDENCE_DIR,{recursive:true});for(const width of [390,1280]){await p.setViewportSize({width,height:900});await card.screenshot({path:path.join(process.env.SKY_EVIDENCE_DIR,'weather-'+width+'.png')});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}await p.setViewportSize({width:390,height:844});}}
  if(mode==='elapsed')assert.match(text,/Оціночний час минув; фактичне прибуття не підтверджено/);
  if(mode==='unknown'){assert.match(text,/Розрахунок моделі: немає даних/);assert.doesNotMatch(text,/дотичний удар/);}
  if(mode==='empty')assert.match(text,/у завантажених розрахунках NASA прибуттів не знайдено/);
  if(mode==='stale'||mode==='future-feed'){assert.match(text,/дані застарілі/);assert.doesNotMatch(await card.locator('dl').innerText(),/412|≈/);}
  const score=await p.locator('[data-overview="today"] .nr-o-score').textContent();if(referenceScore===undefined)referenceScore=score;else assert.equal(score,referenceScore,'weather must not change score');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  res.push({weather:mode,scoreUnchanged:true});
 }
 // Give the view identical Kp values with different provenance. Only short-range NOAA can label a possible storm.
 const weatherLabels=await p.evaluate(()=>{
  const original=window.fp469ConsumerForDate,ds=NRSkyScene.selected();
  const label=source=>{
   window.fp469ConsumerForDate=()=>({consumer:{state:'fresh'},feed:{channels:{source_formula:{kp_daily_max:7,kp_source:source}}}});
   NRSkyScene.select(ds);
   return document.querySelector('[data-sky] .nr-sky-date').textContent;
  };
  try{
   return {short:label('NOAA_3day_slots'),outlook:label('NOAA_27day_outlook'),unknown:label('unverified'),aurora:!!document.querySelector('.nr-sky-aurora,.nrs-aurora,.sr-aurora-light')};
  }finally{window.fp469ConsumerForDate=original;}
 });
 assert.match(weatherLabels.short,/G3/);
 const controlsBeforeWheel=await p.evaluate(()=>document.querySelector('.nr-sky-controls').nextElementSibling?.matches('.nr-sky-stage'));
 assert(controlsBeforeWheel,'27-day playback must be reachable above the wheel');
 assert.match(weatherLabels.outlook,/27-денний орієнтир/);
 assert.doesNotMatch(weatherLabels.outlook,/G3/);
 assert.doesNotMatch(weatherLabels.unknown,/Kp/);
 assert.equal(weatherLabels.aurora,false);
 res.push({weather:'provenance',...weatherLabels});
 assert.deepEqual(errors,[]);await c.close();}
finally{await b.close();srv.close()}
console.log(JSON.stringify(res));console.log('PASS sky scene: 4 languages, reduced motion, missing data, score unchanged; Today order and Sky now card');})().catch(e=>{console.error(e.message);process.exit(1)});
