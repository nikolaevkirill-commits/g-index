'use strict';
// Day verdict guard: on classic.html and index.html the Today card starts with a verdict sentence placed above
// the score; its tone follows the sign of the final score (resolveFinal), "good for" items come only from the
// source calendar marks, the score is unchanged, and English shows no Ukrainian text.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));const now=new Date(Date.parse(feed.generated_at)+3600e3);
const TONES={uk:{pos:'Сприятливий день.',zero:'Рівний день.',neg:'Напружений день.',none:'Оцінки на цей день немає.'},en:{pos:'A favourable day.',zero:'A steady day.',neg:'A tense day.',none:'No score for this day.'}};
const GOOD_UK=['Навчання й нові знання','Подорожі','Планування й постановка цілей','Стрижка й особистий догляд','Новий одяг','Реклама й комунікація'];
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let checks=0;
try{for(const entry of ['classic.html','index.html'])for(const lang of ['uk','en']){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(now);
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-verdict] .nr-dv-tone'),null,{timeout:60000});
 const dates=await p.evaluate(()=>[...document.querySelector('#nrRoute-today [data-overview="today"] select').options].map(o=>o.value).slice(0,10));
 for(const ds of dates){
  const r=await p.evaluate(async ds=>{const sel=document.querySelector('#nrRoute-today [data-overview="today"] select');sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
   const box=document.querySelector('#nrRoute-today [data-day-verdict]'),score=document.querySelector('#nrRoute-today .nr-o-hero .nr-o-score');const c=fp469ConsumerForDate({ds}).consumer;
   return {tone:box.querySelector('.nr-dv-tone').textContent,good:box.querySelector('.nr-dv-good')?.textContent||'',text:box.innerText+' '+(document.querySelector('#nrRoute-today [data-day-why]')?.innerText||''),
    above:box.getBoundingClientRect().bottom<=score.getBoundingClientRect().top+1,available:c.available,score:c.score,shown:score.textContent.trim()}},ds);
  const want=TONES[lang][!r.available?'none':r.score>0?'pos':r.score<0?'neg':'zero'];
  assert.equal(r.tone,want,entry+' '+lang+' '+ds+' tone');assert.ok(r.above,entry+' '+ds+' verdict must be above the score');
  if(lang==='uk'&&r.good){const items=r.good.replace(/^Підходить:\s*/,'').split(' · ');for(const i of items)assert.ok(GOOD_UK.includes(i.trim()),'unknown good-for item '+i)}
  if(lang==='en')assert.equal(/[А-Яа-яІіЇїЄєҐґ]/.test(r.text),false,entry+' '+ds+' Ukrainian text in English verdict: '+r.text.slice(0,120));
  checks++;}
 const noaa=await p.evaluate(ds=>{
  const read=window.fp469ConsumerForDate,result=read({ds});
  const cases=[['stale','NOAA_3day_slots',5.33],['offline','NOAA_3day_slots',5.33],['fresh','NOAA_27day_outlook',5.33],['fresh','NOAA_3day_slots',5.33],['fresh','unknown',5.33],['fresh','NOAA_3day_slots',12]];
  try{return cases.map(([state,kp_source,kp])=>{
   window.fp469ConsumerForDate=()=>({...result,consumer:{...result.consumer,formula:{state}},feed:{channels:{source_formula:{available:true,kp_source,kp_input:{kp}}}}});
   const verdict=NRDayVerdict.build(ds);
   return {storm:verdict.care.some(x=>x.includes('NOAA')),kp:verdict.why.find(([k])=>k.includes('NOAA'))?.[1]};
  });}finally{window.fp469ConsumerForDate=read;}
 },dates[0]);
 assert.deepEqual(noaa.map(r=>r.storm),[false,false,false,true,false,false]);
 assert.match(noaa[2].kp,/27/);
 assert.match(noaa[3].kp,/5[.,]33/);
 // Contrast the resolver's formula with a raw row that still contains a numeric value.
 // A real zero is meaningful; an absent, stale or cached formula is not shown as current.
 const explanation=await p.evaluate(ds=>{
  const read=window.fp469ConsumerForDate,result=read({ds});
  const panel=document.querySelector('#nrRoute-today [data-day-why]');
  const cases=[
   {state:'fresh',available:true,score:-2},
   {state:'fresh',available:true,score:0},
   {state:'fresh',available:true,score:2},
   {state:'fresh',available:true,score:null},
   {state:'fresh',available:true,score:'0'},
   {state:'fresh',available:false,score:-3},
   {state:'missing',available:false,score:null},
   {state:'stale',available:false,score:null,lastScore:-3},
   {state:'offline',available:true,score:-3},
   {state:'invalid',available:false,score:null}
  ];
  try{return cases.map(formula=>{
   window.fp469ConsumerForDate=()=>({...result,consumer:{available:true,authority:'expert_pdf',score:3,formula},
    feed:{channels:{source_formula:{available:true,value:-3}}}});
   NRDayVerdict.render();
   const rows=[...panel.querySelectorAll('li')];
   return {score:rows[0].querySelector('strong').textContent,
    conflict:rows.find(row=>/^(Розбіжність джерел|Sources disagree)$/.test(row.querySelector('span').textContent))?.querySelector('strong').textContent??null};
  });}finally{window.fp469ConsumerForDate=read;NRDayVerdict.render();}
 },dates[0]);
 assert.deepEqual(explanation.map(r=>r.score),Array(10).fill('+3'));
 assert.match(explanation[0].conflict,/−2.*\+3/);
 assert.match(explanation[1].conflict,/0.*\+3/);
 assert.deepEqual(explanation.slice(2).map(r=>r.conflict),Array(8).fill(null));
 const scoreTile=await p.evaluate(()=>{
  const tile=document.querySelector('[data-p0-signals]>button:last-child');
  return {score:tile.querySelector('strong').textContent,source:tile.querySelector('small')?.textContent,accessible:tile.getAttribute('aria-label')};
 });
 assert.doesNotMatch(scoreTile.score,/ · /);
 assert.ok(scoreTile.source&&scoreTile.accessible.includes(scoreTile.source));
 const weather=await p.evaluate(()=>{
  const route=document.querySelector('#nrRoute-today [data-overview=today]'),target=route.querySelector('.nr-o-spaceweather');
  const details=target.closest('details');details.open=false;route.querySelector('[data-weather-brief]').click();
  return {open:details.open,focused:document.activeElement===target};
 });
 assert.deepEqual(weather,{open:true,focused:true});
 assert.equal(errs.length,0,errs.join('|'));await c.close();}}
finally{await b.close();srv.close()}
console.log('PASS day verdict: '+checks+' date checks (2 entries × uk/en): verdict above score, tone = sign of final score, good-for only from calendar marks');})().catch(e=>{console.error(e.message);process.exit(1)});
