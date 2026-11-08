'use strict';
// FP569d review guard (index.html): (1) verdict and score open Today on 320×694 and 390×844, the Sun clock follows
// the overview card and names sunrise, noon and sunset with the times Astronomy gives; (2) a 27-day outlook day never
// gets the short-term storm marker or wording, while a 3-day forecast day with Kp ≥ 5 keeps it; (3) next Drik event
// countdown and per-day .ics export.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));const now=new Date(Date.parse(feed.generated_at)+3600e3);
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let n=0;
try{for(const [w,h] of [[320,694],[390,844]]){
 const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width:w,height:h},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('gidx_onboard_done_v2','1'));
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(now);
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.evaluate(async()=>{await fp469LoadConsumerForecast();});
 await p.locator('[data-sky-clock] .sr-time-label').first().waitFor({timeout:30000});
 // The day verdict mounts into the overview card asynchronously; measure once it is there.
 await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
 const r=await p.evaluate(()=>{const nav=document.getElementById('mobileNav').getBoundingClientRect().top,card=document.querySelector('[data-sky-clock]');
  const loc={lat:50.454,lon:30.524},obs=new Astronomy.Observer(loc.lat,loc.lon,0),s=SRSkyTime.snapshot(),fmt=d=>SRSkyTime.timeText(+d,s.zone);
  const rise=Astronomy.SearchRiseSet('Sun',obs,+1,new Date(s.start),1).date,set=Astronomy.SearchRiseSet('Sun',obs,-1,new Date(s.start),1).date,noon=Astronomy.SearchHourAngle('Sun',obs,0,new Date(s.start)).time.date;
  return {verdict:document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone').getBoundingClientRect().bottom<=nav,score:document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict').getBoundingClientRect().bottom<=nav,
   afterHero:card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution'),labels:[...card.querySelectorAll('.sr-time-label')].map(e=>e.textContent),expect:[fmt(rise),fmt(set),fmt(noon)]}});
 assert(r.verdict&&r.score,'verdict and score on the first viewport '+w);assert(r.afterHero,'Sun clock follows the overview card');n+=2;
 assert.equal(r.labels.length,3);r.expect.forEach((t,i)=>assert(r.labels[i].endsWith(t),r.labels[i]+' vs '+t));n+=4;
 // (3) Next verified Drik event with a day countdown; per-day .ics export of verified events (RFC 5545 line ≤ 75 octets).
 const nx=await p.evaluate(()=>{const today=NRCivilTime.dayKey(Date.now(),'Europe/Kyiv');let exp=null;
  for(let i=1;i<=45&&!exp;i++){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const ds=d.toISOString().slice(0,10);if(SRCalendarAuthority.resolve(ds,'Europe/Kyiv').events?.length)exp=ds}
  return {shown:document.querySelector('[data-week-next]')?.dataset.weekNext||'',exp:exp||''}});
 assert.equal(nx.shown,nx.exp,'next event = first verified Drik date after today');n++;
 if(w===390){await p.evaluate(()=>fp434Go('forecast',false));await p.locator('[data-week-events]').waitFor();
  const ics=await p.evaluate(()=>[...document.querySelectorAll('[data-week-ics]')].map(b=>{const ds=b.dataset.weekIcs,txt=SRWeekAhead.icsFor(ds);
   return {ds,start:/DTSTART;VALUE=DATE:(\d{8})/.exec(txt)?.[1],lines:txt.split('\r\n').every(l=>new TextEncoder().encode(l).length<=75),events:SRCalendarAuthority.resolve(ds,'Europe/Kyiv').events.length}}));
  assert(ics.length>0,'ics buttons present');for(const x of ics){assert.equal(x.start,x.ds.replace(/-/g,''));assert(x.lines);assert(x.events>0);n+=3;}
  const button=p.locator('[data-week-ics]').first();
  await p.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
   Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('test rejection','NotAllowedError')},configurable:true});
  });
  const [fallback]=await Promise.all([p.waitForEvent('download',{timeout:10000}),button.click()]);
  assert.equal(fallback.suggestedFilename(),'SkyRhythm-'+await button.getAttribute('data-week-ics')+'.ics');
  assert((await button.locator('..').locator('[data-week-ics-status]').textContent()).trim());
  let downloads=0;p.on('download',()=>downloads++);
  await p.evaluate(()=>Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('test cancellation','AbortError')},configurable:true}));
  await button.click();
  await p.waitForFunction(()=>!document.querySelector('[data-week-ics]').disabled);
  assert.equal(downloads,0,'cancelling share must not download');
  n+=3;}
 if(w===390){await p.evaluate(()=>fp434Go('panch',false));await p.locator('.nr-sky-day').first().waitFor();
  const d=await p.evaluate(()=>[...document.querySelectorAll('.nr-sky-day')].map(x=>{const r=fp469ConsumerForDate({ds:x.dataset.skyDay}),ch=r?.feed?.channels?.source_formula;return {ds:x.dataset.skyDay,cls:x.className,src:ch?.kp_source,kp:ch?.kp_daily_max??ch?.kp_input?.kp,state:(r?.consumer?.formula||r?.consumer)?.state}}));
  const outlookHigh=d.filter(x=>x.state==='fresh'&&x.src==='NOAA_27day_outlook'&&x.kp>=5),fcHigh=d.filter(x=>x.state==='fresh'&&x.src==='NOAA_3day_slots'&&x.kp>=5);
  for(const x of d.filter(x=>x.src==='NOAA_27day_outlook')){assert(!/\bis-g\d\b|\bis-active\b/.test(x.cls),'outlook day with storm/active class '+x.ds+' '+x.cls);n++;}
  for(const x of outlookHigh){assert(/is-outlook-g\d/.test(x.cls),x.ds+' '+x.cls);n++;
   await p.locator(`.nr-sky-day[data-sky-day="${x.ds}"]`).click();await p.waitForTimeout(200);
   const line=await p.locator('.nr-sky-date').textContent(),centre=await p.locator('.nr-sky-kp-src').getAttribute('data-kp-src');
   assert(!/бурі/.test(line)&&/орієнтир/.test(line),line);assert.equal(centre,'outlook');n+=2;}
  for(const x of fcHigh){assert(/\bis-g\d\b/.test(x.cls),x.ds+' '+x.cls);n++;}
  console.log('outlook Kp≥5 days: '+outlookHigh.length+', 3-day Kp≥5 days: '+fcHigh.length);}
 assert.deepEqual(errs,[]);n++;await c.close();}
 console.log('PASS FP569d review guard: '+n+' checks');}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
