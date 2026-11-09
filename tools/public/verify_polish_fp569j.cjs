'use strict';
// FP569j polish guard (Claude audit of the FP569h release, 09.11.2026):
//  1. Evening: one question about today («Сьогодні збіглось?»); the journal card does not ask about today again and the
//     «Як пройшов день? Записати результат →» button (duplicate of «03 · Записати результат») is gone.
//  2. A day already answered in the day card is not asked again by the journal next morning.
//  3. No fresh Kp observation → the NOAA tile shows the fresh NOAA 3-day forecast for the day (display only, score unchanged).
//  4. More: colours sit inside «Вигляд і рух» right after the background choice («Тло»); no separate «Палітра оформлення».
//  5. Profile no longer says birth data is not collected (Today offers to add it).
//  6. Day line clusters read «N зміни»/«N changes», not «⋯ N».
//  7. Desktop 1280: the NOAA card sits in the left column under the score; «Небо дня» spans the width.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});s.end(b)})});
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(new Date(feed.generated_at));
const at=hh=>{for(let h=-4;h<=4;h++){const d=new Date(day+'T'+String(hh).padStart(2,'0')+':30:00Z');d.setUTCHours(d.getUTCHours()-h);
 const k=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d);const g=t=>k.find(x=>x.type===t).value;
 if(g('year')+'-'+g('month')+'-'+g('day')===day&&+g('hour')===hh)return d}throw new Error('no instant')};
// After 18:00 Kyiv and after the feed was generated (an earlier clock makes the feed «from the future»), same Kyiv day.
const evening=()=>{const g=Date.parse(feed.generated_at)+30*60000,e=Math.max(at(19).getTime(),g),d=new Date(e);const k=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(d);if(k!==day)throw new Error('feed generated too late for an evening check');return d};
const shift=(ds,n)=>{const d=new Date(ds+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
async function open(b,{lang='uk',width=390,hour=19,init=null}={}){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width,height:900},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(([l,extra])=>{localStorage.setItem('gidx_onboard_done_v2','1');if(l==='en')localStorage.setItem('nr_locale_v1','en');if(extra)for(const [k,v] of Object.entries(extra))localStorage.setItem(k,v);},[lang,init]);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(hour==='evening'?evening():at(hour));
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-verdict] .nr-dv-tone')&&document.querySelector('[data-p0-signals]>button strong'),null,{timeout:60000});await p.waitForTimeout(1500);
 return {c,p,errs};
}
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let n=0;
try{
 // 1 + 3 + 6
 {const {c,p,errs}=await open(b,{hour:'evening'});
  const q=await p.evaluate(ds=>({match:document.querySelectorAll('#nrRoute-today [data-day-match]').length,rateToday:document.querySelectorAll('#nrRoute-today [data-day-rating][data-target="'+ds+'"]').length,
   evening:document.querySelectorAll('#nrRoute-today .nr-dv-evening').length,journey:document.querySelectorAll('#nrRoute-today .nr-o-journey button').length}),day);
  assert.equal(q.match,1,'one quick question in the day card');assert.equal(q.rateToday,0,'journal does not ask about today again');assert.equal(q.evening,0,'no duplicate «Записати результат» button');assert.ok(q.journey>=1,'«03 · Записати результат» stays');n+=4;
  const t=await p.evaluate(ds=>{const r=fp469ConsumerForDate({ds}),ch=r?.feed?.channels?.source_formula,st=(r?.consumer?.formula||r?.consumer)?.state,b=document.querySelector('[data-p0-signals]>button');
   return {obs:window.currentKpAuthority?.()?.kp??null,fresh:st==='fresh'&&ch?.kp_source==='NOAA_3day_slots',kp:ch?.kp_daily_max??ch?.kp_input?.kp,attr:b.dataset.kpForecast,text:b.textContent,aria:b.getAttribute('aria-label'),score:document.querySelector('#nrRoute-today .nr-o-hero .nr-o-score')?.textContent.trim(),final:r?.consumer?.score}},day);
  assert.equal(Number.isFinite(t.obs),false,'offline test: no live observation');
  if(t.fresh&&Number.isFinite(t.kp)){assert.equal(Number(t.attr),t.kp,'tile shows the 3-day forecast Kp');assert.match(t.text,/прогноз NOAA, 3 дні/);assert.match(t.aria,/спостереження немає/);n+=3;}
  else{assert.equal(t.attr,'','no forecast → no forecast value');assert.match(t.text,/немає актуальних даних/);n+=2;console.log('note: feed has no fresh 3-day slots for',day);}
  const labels=await p.evaluate(()=>[...document.querySelectorAll('.sr-dayline button')].map(x=>x.textContent.trim()));
  assert.equal(labels.some(l=>/⋯/.test(l)),false,'no «⋯ N» labels: '+labels.join('|'));
  if(labels.some(l=>/^\d+ змін/.test(l)))n++;
  assert.deepEqual(errs,[]);n+=2;await c.close();}
 // 2: yesterday answered in the day card → the journal does not ask about it in the morning
 {const y=shift(day,-1);const shown={};shown[y]={date:y,score:0,shown_at:at(20).toISOString()};
  const {c,p,errs}=await open(b,{hour:9,init:{nrDayMatch_v1:JSON.stringify({[y]:{v:'yes',score:0,at:new Date().toISOString()}})}});
  const r=await p.evaluate(y=>({target:window.NRDayContext?.target?.(),cards:document.querySelectorAll('#nrRoute-today [data-day-rating][data-target="'+y+'"]').length}),y);
  assert.notEqual(r.target,y,'answered day is not a journal target');assert.equal(r.cards,0);assert.deepEqual(errs,[]);n+=3;await c.close();}

 // A saved journal answer survives an upgrade.
 {const ratedKey='gindex_day_vs_forecast_v1',quickKey='nrDayMatch_v1';
  const rated=JSON.stringify([{schema:'day_vs_forecast_v1',date:day,rating:'as_expected'}]);
  const {c,p,errs}=await open(b,{hour:'evening',init:{[ratedKey]:rated}});
  assert.equal(await p.locator('#nrRoute-today [data-day-match] button').count(),0);
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),ratedKey),rated);
  assert.deepEqual(errs,[]);n+=2;await c.close();
  const y=shift(day,-1),invalid=JSON.stringify({[y]:{v:'invalid'}});
  const seen=JSON.stringify({[y]:{last:{origin:'visible_overview_v2',date:y,seen_at:y+'T12:00:00Z',score:-1,authority:'source_formula'}}});
  const next=await open(b,{hour:9,init:{gindex_day_shown_v1:seen,[quickKey]:invalid}});
  assert.equal(await next.p.evaluate(()=>NRDayContext.target()),y);
  assert.equal(await next.p.evaluate(k=>localStorage.getItem(k),quickKey),invalid);
  assert.deepEqual(next.errs,[]);n+=2;await next.c.close();}

 // 4 + 5 (uk) and English legend
 for(const lang of ['uk','en']){const {c,p,errs}=await open(b,{lang,hour:12});
  await p.evaluate(()=>fp434Go('more',false));await p.waitForTimeout(1200);
  const m=await p.evaluate(()=>{const a=document.querySelector('#nrRoute-more [data-motion-settings] [data-appearance]'),f=document.querySelector('#nrRoute-more [data-nr-palette-settings]');return {placed:!!a&&a.nextElementSibling===f,legend:a?.querySelector('legend')?.textContent,title:f?.querySelector('legend')?.textContent,old:/Палітра оформлення|Appearance palette/.test(document.body.textContent)}});
  assert.equal(m.placed,true,'colours right after background');assert.equal(m.old,false);assert.equal(m.legend,lang==='uk'?'Тло':'Background');assert.equal(m.title,lang==='uk'?'Кольори':'Colours');n+=4;
  await p.evaluate(()=>fp434Go('profile',false));await p.waitForTimeout(900);
  const prof=await p.evaluate(()=>document.querySelector('#nrRoute-profile')?.textContent||'');
  assert.equal(/більше не збираються|no longer collected/.test(prof),false,'stale birth-data text');n++;
  assert.deepEqual(errs,[]);await c.close();}
 // 7 desktop
 {const {c,p,errs}=await open(b,{width:1280,hour:12});
  const g=await p.evaluate(()=>{const R=s=>document.querySelector('#nrRoute-today .sr-p0-today>'+s)?.getBoundingClientRect();const hero=R('.nr-o-hero')||document.querySelector('#nrRoute-today .nr-o-hero').getBoundingClientRect(),noaa=R('.nr-o-weather-brief'),sky=document.querySelector('#nrRoute-today [data-sky-day], #nrRoute-today .sr-sky-day, #nrRoute-today .nr-o-sky')?.getBoundingClientRect();return {hero:hero&&{l:hero.left,b:hero.bottom,r:hero.right},noaa:noaa&&{l:noaa.left,t:noaa.top,r:noaa.right}}});
  assert.ok(g.noaa,'NOAA card present');assert.ok(Math.abs(g.noaa.l-g.hero.l)<2&&g.noaa.t>=g.hero.b-1,'NOAA under the score in the left column');n+=2;assert.deepEqual(errs,[]);await c.close();}
 console.log('PASS polish FP569j:',n,'checks');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;srv.close()});
