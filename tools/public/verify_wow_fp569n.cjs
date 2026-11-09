'use strict';
// FP569n guard (Claude, 09.11.2026): «Вечір під небом» (computed go/wait for tonight), «Поділитися днем» image card,
// «Довідник» glossary with search, and P12 — no festival research tool on Today in the main design.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});s.end(b)})});
const NOW=new Date('2026-11-09T08:51:00Z'),evidence=process.env.FP569N_EVIDENCE;
if(evidence)fs.mkdirSync(evidence,{recursive:true});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let n=0;
try{for(const lang of ['uk','en']){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv',acceptDownloads:true});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(l=>{
  // Desktop download test: a host share sheet is not deterministic in Chromium automation.
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
  localStorage.setItem('gidx_onboard_done_v2','1');if(l==='en')localStorage.setItem('nr_locale_v1','en');
 },lang);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:NOW});
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-share-card] button')&&window.SRSkyEvening,null,{timeout:60000});await p.waitForTimeout(800);
 // P12
 assert.equal(await p.locator('#nrRoute-today [data-festival-route]').count(),0,'no festival tool on Today');n++;
 if(evidence&&lang==='uk')await p.locator('#nrRoute-today .nr-o-hero').screenshot({path:path.join(evidence,'today-390.png')});
 // Share card: a real 1080×1350 PNG
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.locator('#nrRoute-today [data-share-card] button').click()]);
 const file=await dl.path(),png=fs.readFileSync(file);
 assert.equal(png.slice(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1350);assert.match(dl.suggestedFilename(),/^skyrhythm-2026-11-09\.png$/);n+=4;
 if(evidence&&lang==='uk')await dl.saveAs(path.join(evidence,'share-card.png'));
 // Tonight: dusk equals an independent astronomy-engine computation; bright Moon? (new Moon → «good»); Saturn is up.
 await p.evaluate(()=>location.hash='panch');await p.waitForSelector('#nrRoute-panch [data-sky-evening]',{timeout:20000});
 const ev=await p.evaluate(()=>{const el=document.querySelector('#nrRoute-panch [data-sky-evening]'),A=Astronomy,obs=new A.Observer(50.454,30.524,0);
  const d=A.SearchAltitude('Sun',obs,-1,new Date('2026-11-09T10:00:00Z'),1.2,-12).date;
  const tf=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  return {verdict:el.dataset.verdict,text:el.innerText,dusk:tf,next:el.nextElementSibling?.matches('[data-sky-live]')}});
 assert.equal(ev.verdict,'good','new Moon: Moon does not wash out the stars');assert.ok(ev.text.includes(ev.dusk),'dusk time '+ev.dusk+' shown');assert.match(ev.text,lang==='uk'?/Сатурн/:/Saturn/);assert.match(ev.text,lang==='uk'?/Хмарність/:/clouds/);assert.equal(ev.next,true,'card sits right above the live sky');n+=5;
 if(evidence&&lang==='uk')await p.locator('[data-sky-evening]').screenshot({path:path.join(evidence,'evening-390.png')});
 // Global date boundaries: different UTC days may represent the same local evening.
 if(lang==='uk'){
  const zones=await p.evaluate(()=>{
   const compute=(s,l)=>SRSkyEvening.compute(Date.parse(s),l);
   const tokyo={lat:35.6762,lon:139.6503,zone:'Asia/Tokyo'};
   const ny={lat:40.7128,lon:-74.006,zone:'America/New_York'};
   const pole={lat:85,lon:17,zone:'Europe/Oslo'};
   return {
    tokyo:['2026-11-08T15:30:00Z','2026-11-09T08:00:00Z'].map(s=>compute(s,tokyo).dusk.toISOString()),
    ny:['2026-11-09T05:30:00Z','2026-11-10T03:59:00Z'].map(s=>compute(s,ny).dusk.toISOString()),
    summer:compute('2026-06-21T12:00:00Z',pole),
    winter:compute('2026-12-21T12:00:00Z',pole)
   };
  });
  assert.equal(zones.tokyo[0],zones.tokyo[1]);assert.match(zones.tokyo[0],/^2026-11-09T0[89]:/);
  assert.equal(zones.ny[0],zones.ny[1]);assert.ok(zones.summer.noDark);
  assert.equal(zones.winter.dusk,null);assert.ok(zones.winter.look);n+=6;
 }
 // Glossary with search
 await p.evaluate(()=>location.hash='more');await p.waitForSelector('#nrRoute-more [data-glossary]',{timeout:20000});
 const g0=await p.evaluate(()=>document.querySelectorAll('#nrRoute-more [data-glossary] details').length);assert.ok(g0>=15,'glossary terms '+g0);n++;
 await p.fill('#nrRoute-more [data-glossary-search]','kp');await p.waitForTimeout(200);
 const g1=await p.evaluate(()=>[...document.querySelectorAll('#nrRoute-more [data-glossary] details')].filter(d=>!d.hidden).map(d=>d.querySelector('summary span').textContent));
 assert.ok(g1.length>=1&&g1.length<g0&&g1.some(x=>/Kp/.test(x)),'search filters: '+g1.join('|'));n++;
 if(evidence&&lang==='uk')await p.locator('[data-glossary]').screenshot({path:path.join(evidence,'glossary-390.png')});
 // Journal stats: with 6 local answers the card shows the counts and the rate (yes + ½ partly).
 await p.evaluate(()=>{const a={};['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'].forEach((d,i)=>a[d]={v:['yes','yes','partial','no','yes','partial'][i],score:1,at:new Date().toISOString()});localStorage.setItem('nrDayMatch_v1',JSON.stringify(a));window.SRJournalStats.render()});
 const js=await p.evaluate(()=>document.querySelector('#nrRoute-more [data-journal-stats]')?.innerText||'');
 assert.match(js,/67%/,'rate (3 + 2×½)/6 = 67%');n++;
 if(lang==='en'){const cyr=await p.evaluate(()=>/[А-Яа-яІіЇїЄєҐґ]/.test(document.querySelector('#nrRoute-more [data-glossary]').innerText));assert.equal(cyr,false,'English glossary has no Cyrillic');n++;}
 if(lang==='uk'){
  const native=await p.evaluate(async()=>{
   let captured=null;
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{captured=data;}});
   const status=await SRShareCard.share('2026-11-09',document.querySelector('[data-share-card] button'));
   return {status,title:captured.title,file:captured.files[0].name,type:captured.files[0].type,keys:Object.keys(captured).sort()};
  });
  assert.deepEqual(native,{status:'shared',title:'SkyRhythm · 2026-11-09',file:'skyrhythm-2026-11-09.png',type:'image/png',keys:['files','title']});n++;
 }
 assert.deepEqual(errs,[]);n++;await c.close();
}
 console.log('PASS wow FP569n:',n,'checks');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;srv.close()});
