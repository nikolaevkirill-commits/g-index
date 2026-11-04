'use strict';
// ARCH-1 guard (audit FP549): three entry pages carry forked display code. For every date of the real
// feed + real expert registry, the score shown on Today (date select) and on the calendar day button must
// equal NRConsumerAuthority.resolveFinal, identically on classic.html, index.html and design-b17.html.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));
const now=new Date(Date.parse(feed.generated_at)+3600e3);
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const norm=s=>{const m=String(s||'').replace(/−/g,'-').match(/(^|[^\d])([+-]?[0-3])(?!\d)|—/);return !m?'?':m[0]==='—'?'—':String(Number(m[2]))};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();const table={};let checks=0;
try{for(const entry of ['classic.html','index.html','design-b17.html']){
 const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width:1280,height:900},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage();await p.clock.setFixedTime(now);await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('[data-overview="today"] select')?.options.length>5&&window.NRConsumerAuthority,null,{timeout:60000});await p.waitForTimeout(2500);
 const dates=await p.evaluate(()=>[...document.querySelector('[data-overview="today"] select').options].map(o=>o.value));
 const out={};
 for(const ds of dates){
  const r=await p.evaluate(async ds=>{const sel=document.querySelector('[data-overview="today"] select');sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));
   const ref=window.fp469ConsumerForDate?fp469ConsumerForDate({ds}).consumer:null;return {today:document.querySelector('[data-overview="today"] .nr-o-score')?.textContent||'',ref:ref?(ref.available?String(ref.score):'—'):'?'}},ds);
  out[ds]={today:norm(r.today),ref:r.ref};}
 await p.evaluate(()=>{location.hash='calendar'});await p.waitForTimeout(1800);
 const cal=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#nrRoute-calendar button[data-day]')].map(b=>[b.dataset.day,b.textContent])));
 for(const ds of dates){if(cal[ds]!==undefined){const m=cal[ds].replace(/−/g,'-').match(/·\s*([+-]?[0-3]|—)/);out[ds].calendar=m?(m[1]==='—'?'—':String(Number(m[1]))):'?';}}
 table[entry]=out;await c.close();}}
finally{await b.close();srv.close();}
const dates=Object.keys(table['classic.html']);const bad=[];
for(const ds of dates){const ref=table['classic.html'][ds].ref;
 for(const e of Object.keys(table)){const o=table[e][ds];if(!o){bad.push(e+' '+ds+' missing');continue}checks++;
  if(o.ref!==ref)bad.push(e+' '+ds+' resolveFinal '+o.ref+' vs index '+ref);
  if(o.today!==ref)bad.push(e+' '+ds+' Today shows '+o.today+' expected '+ref);
  if(o.calendar!==undefined&&o.calendar!==ref)bad.push(e+' '+ds+' calendar shows '+o.calendar+' expected '+ref);}}
console.log(JSON.stringify({at:now.toISOString(),dates:dates.length,checks,sample:Object.fromEntries(dates.slice(0,4).map(d=>[d,Object.fromEntries(Object.entries(table).map(([e,v])=>[e,v[d]]))]))}));
if(bad.length){console.error(bad.slice(0,20).join('\n'));}
assert.equal(bad.length,0,'entry score mismatch');console.log('PASS entry score equivalence: '+dates.length+' dates × 3 entries; Today and calendar equal resolveFinal');})().catch(e=>{console.error(e.message);process.exit(1)});
