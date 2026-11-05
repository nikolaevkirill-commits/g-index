'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),actual=require('../../consumer_cloud/final_score_decisions.json');
// Fixed synthetic delivery tests authority, not astronomical predictions. Never rewrite fixtures.
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/score_regression.json'))),proto=structuredClone(Object.values(feed.days).find(d=>d.channels.source_formula.available));feed.days={};
for(let day=9;day<=22;day++){const ds='2026-11-'+String(day).padStart(2,'0'),r=structuredClone(proto);r.date=ds;Object.assign(r.channels.source_formula,{available:true,value:1,raw:1,expert_override_used:false,generated_at:'2026-11-09T09:00:00Z',noaa_retrieved_at:'2026-11-09T09:00:00Z',noaa_issued_at:'2026-11-09T09:00:00Z',kp_source:'NOAA_3day_slots',factors:[{factor:'Kp',value:1}]});r.source_formula_result={...r.source_formula_result,score:1};feed.days[ds]=r;}
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((q,s)=>{const f=path.resolve(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html');if(!f.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(f,(e,b)=>{s.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(e?'':b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch();let checks=0;
try{for(const entry of ['index.html','classic.html']){
 const c=await b.newContext({serviceWorkers:'block',locale:'uk-UA',timezoneId:'Europe/Kyiv',viewport:{width:390,height:844},reducedMotion:'reduce'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await c.route('**/consumer_cloud/forecast.json*',r=>r.fulfill({json:feed}));await c.route('**/consumer_cloud/final_score_decisions.json*',r=>r.fulfill({json:actual}));
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-09T10:00:00Z'));
 await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#today');await p.waitForFunction(()=>window.fp469LoadConsumerForecast&&window.NRConsumerOverview);await p.evaluate(()=>fp469LoadConsumerForecast());
 for(const route of ['today','forecast','calendar']){
  await p.evaluate(r=>fp434Go(r,false),route);
  for(const ds of Object.keys(feed.days)){
   await p.evaluate(({route,ds})=>{const sel=document.querySelector('[data-overview="'+route+'"] select');sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));},{route,ds});
   const expected=actual.decisions.find(d=>d.date===ds),score=expected?expected.score:1;
   await p.waitForFunction(({route,score})=>{const text=document.querySelector('[data-overview="'+route+'"] .nr-o-score')?.textContent.trim().replace('−','-').replace('+','');return text===String(score)},{route,score});
   const a=await p.evaluate(ds=>{const r=fp469ConsumerForDate({ds}).consumer;return {authority:r.authority,score:r.score,expert:r.expert}},ds);
   assert.equal(a.authority,expected?'expert_pdf':'source_formula');assert.equal(a.score,score);
   const note=p.locator('[data-overview="'+route+'"] [data-scoped-opinion]');
   if(!expected&&!await note.isVisible())console.error('SCOPE_VISIBILITY',entry,route,ds,await note.evaluate(el=>{const a=[];for(let n=el;n;n=n.parentElement)a.push([n.tagName,n.className,n.hidden,getComputedStyle(n).display]);return {html:el.outerHTML,ancestors:a}}));
   if(expected){assert(!await note.count()||await note.isHidden());assert.equal(a.expert.source_sha256,expected.source_sha256);}else{assert(await note.isVisible());assert.match(await note.innerText(),/лише для нових справ/);assert.match(await note.innerText(),/не загальна оцінка дня/);assert.equal(await note.getAttribute('data-source-sha'),actual.scoped_decisions[0].source_sha256);}
   if(!expected)assert(await note.evaluate(el=>!!el.closest('.nr-o-hero')),'Scoped advice must stay beside the general score, outside collapsed details');
   checks++;
  }
 }
 for(const lang of ['en','es','fr','uk']){
  await p.evaluate(()=>fp434Go('profile',false));await p.locator('#nrSettingsLanguage').selectOption(lang);await p.evaluate(()=>fp434Go('today',false));
  await p.evaluate(()=>{const sel=document.querySelector('[data-overview="today"] select');sel.value='2026-11-15';sel.dispatchEvent(new Event('change',{bubbles:true}));});
  const note=p.locator('[data-overview="today"] [data-scoped-opinion]');await note.waitFor({state:'visible'});
  const text=await note.innerText();assert.match(text,({uk:/лише для нових справ/,en:/new starts only/,es:/solo para nuevos proyectos/,fr:/uniquement pour les nouveaux projets/})[lang]);if(lang!=='uk')assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(text));
 }
 assert.deepEqual(errors,[]);await c.close();
}}finally{await b.close();server.close()}
console.log('PASS '+checks+' selected-date/route checks, 2 entries, 4 scoped-note languages; scoped negative opinion leaves synthetic +1 general score unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
