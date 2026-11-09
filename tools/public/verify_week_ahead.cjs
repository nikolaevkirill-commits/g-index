'use strict';
// FP569 week-ahead guard (index.html): «Тиждень» strip on Today, «Події тижня» on Forecast, explicit end of Today.
// Scores shown = fp469ConsumerForDate (resolveFinal) for every day; events = SRCalendarAuthority (Drik, Kyiv) + Moon
// quarters; the strip sits after the day line in the order module and does not churn the DOM; date bar is the first
// desktop row; no horizontal overflow; no JS errors; uk/en.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));const now=new Date(Date.parse(feed.generated_at)+3600e3);
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let checks=0;
try{for(const [lang,width] of [['uk',390],['uk',320],['en',390],['uk',1280]]){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width,height:width>1000?900:844},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(l=>{localStorage.setItem('gidx_onboard_done_v2','1');},lang);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(now);
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.evaluate(async()=>{await fp469LoadConsumerForecast();});
 await p.waitForFunction(()=>document.querySelectorAll('#nrRoute-today [data-week-strip] li').length===7,null,{timeout:60000});
 await p.waitForTimeout(800);
 const today=await p.evaluate(async()=>{
  const o=document.querySelector('#nrRoute-today .nr-overview');let n=0;const mo=new MutationObserver(m=>n+=m.length);mo.observe(o,{childList:true});
  await new Promise(r=>setTimeout(r,1200));mo.disconnect();
  const kids=[...o.children];const strip=o.querySelector(':scope > [data-week-strip]');
  const days=[...strip.querySelectorAll('li')].map(li=>{const ds=li.dataset.weekDay,c=fp469ConsumerForDate({ds}).consumer;
   return {ds,tone:li.dataset.scoreTone,expectTone:SkyScore.scoreClass(c?.available?c.score:null),text:li.querySelector('.sr-wk-s').textContent,expectText:SkyScore.formatScore(c?.available?c.score:null),ev:!!li.querySelector('.sr-wk-ev').textContent,expectEv:SRCalendarAuthority.resolve(ds).events.length>0}});
  const route=document.querySelector('#nrRoute-today');
  return {churn:n,afterDayline:kids.indexOf(strip)===kids.indexOf(o.querySelector(':scope > .sr-dayline'))+1,days,first:days[0].ds,kyiv:NRCivilTime.dayKey(Date.now(),'Europe/Kyiv'),
   current:strip.querySelector('[aria-current=date]')?.closest('li')?.dataset.weekDay,end:route.lastElementChild?.matches('[data-today-end]'),
   overflow:document.documentElement.scrollWidth>innerWidth,bar:o.querySelector(':scope > .nr-dc-bar')?.getBoundingClientRect().top,hero:o.querySelector(':scope > .nr-o-hero')?.getBoundingClientRect().top,
   line:o.querySelector(':scope > .sr-dayline')?.getBoundingClientRect().top,sky:o.querySelector('[data-sky-now]')?.getBoundingClientRect().top,
   title:strip.querySelector('h2').textContent}});
 assert.equal(today.churn,0,'week strip must not fight the Today order module');checks++;
 assert(today.afterDayline,'strip follows the day line');checks++;
 assert.equal(today.first,today.kyiv,'strip starts on Kyiv today');assert.equal(today.current,today.kyiv);checks++;
 for(const d of today.days){assert.equal(d.tone,d.expectTone,d.ds);assert.ok(d.text.endsWith(d.expectText),d.ds+' '+d.text);assert.equal(d.ev,d.expectEv,d.ds);checks+=3;}
 assert(today.end,'explicit end of Today is last');checks++;
 assert(today.line<today.sky,'the solar timeline must precede the detailed sky card');checks++;
 assert.equal(today.overflow,false,'no horizontal overflow on Today '+width);checks++;
 if(width>=1024){assert(today.bar<today.hero,'desktop date bar is the first row');checks++;}
 assert.equal(today.title,lang==='en'?'Week · scores by Kyiv date':'Тиждень · оцінки за Києвом');checks++;
 await p.evaluate(()=>fp434Go('forecast',false));
 await p.waitForFunction(()=>document.querySelector('#nrRoute-forecast [data-week-events]'),null,{timeout:30000});
 const fc=await p.evaluate(()=>{const tools=document.querySelector('#nrRoute-forecast .nr-o-route-tools');const ev=tools.querySelector(':scope > [data-week-events]');
  const rows=[...ev.querySelectorAll('[data-week-event]')].map(li=>({ds:li.dataset.weekEvent,drik:li.querySelectorAll('.is-drik').length,expect:SRCalendarAuthority.resolve(li.dataset.weekEvent).events.length,moons:[...li.querySelectorAll('[data-moon-quarter]')].map(x=>+x.dataset.moonQuarter)}));
  return {afterList:ev.previousElementSibling?.matches('.nr-o-horizon-list'),rows,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert(fc.afterList,'events follow the day list');checks++;
 assert.equal(await p.locator('#nrRoute-forecast [data-scene=forecast]').count(),0,'no line between discrete daily scores');checks++;
 for(const r of fc.rows){assert.equal(r.drik,r.expect,r.ds);checks++;}
 // Week 07–13.11.2026: Drik Kyiv lists 07, 08, 09, 13; New Moon 2026-11-09 ~07:02 UTC.
 if(today.kyiv==='2026-11-07'){assert.deepEqual(fc.rows.map(r=>r.ds),['2026-11-07','2026-11-08','2026-11-09','2026-11-13']);assert.deepEqual(fc.rows.find(r=>r.ds==='2026-11-09').moons,[0]);checks+=2;}
 assert.equal(fc.overflow,false,'no horizontal overflow on Forecast '+width);checks++;
 // A date on the strip selects that date while preserving each chosen horizon.
 const forecast=p.locator('#nrRoute-forecast [data-overview="forecast"]');
 const dateControl=forecast.locator('select').first();
 for(const [i,count] of [1,7,27].entries()){
  await forecast.locator('[data-p0-forecast-tabs] button').nth(i).click();
  await p.evaluate(()=>fp434Go('today',false));
  const target=p.locator('[data-week-day]').nth(i+2);
  const date=await target.getAttribute('data-week-day');
  await target.locator('button').click();
  assert(await p.locator('#nrRoute-forecast').evaluate(el=>el.classList.contains('active')));
  assert.equal(await dateControl.inputValue(),date);
  await p.waitForFunction(()=>document.activeElement?.id==='nrOverviewHeading-forecast');
  assert.equal(await forecast.locator('.nr-o-horizon-list [data-day]:visible').count(),count);
  const fitsPageScroll=await forecast.locator('.nr-o-horizon-list').evaluate(el=>el.scrollHeight<=el.clientHeight+2 && el.scrollWidth<=el.clientWidth+2);
  assert(fitsPageScroll,'all '+count+' forecast dates fit the page scroll');
  assert.equal(await forecast.locator('.sr-forecast-graph svg').count(),count===7?1:0);
  checks+=6;
 }
 assert.deepEqual(errs,[],'no page errors');checks++;
 await c.close();}
 console.log('PASS week ahead: '+checks+' checks (index.html, uk/en, 320/390/1280)');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exit(1)});
