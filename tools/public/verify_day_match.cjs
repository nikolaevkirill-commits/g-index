'use strict';
// «Сьогодні збіглось?» guard: the quiet evening row appears only for today after 18:00 Kyiv, never in the
// daytime or on another selected date; one tap stores {answer, final score at that moment} on this device only,
// the row collapses to one saved line, the score itself is unchanged, and English shows no Ukrainian text.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(new Date(feed.generated_at));
const at=(hh)=>{for(let h=-4;h<=4;h++){const d=new Date(day+'T'+String(hh).padStart(2,'0')+':30:00Z');d.setUTCHours(d.getUTCHours()-h);
 const k=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d);const g=t=>k.find(x=>x.type===t).value;
 if(g('year')+'-'+g('month')+'-'+g('day')===day&&+g('hour')===hh)return d}throw new Error('no instant')};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let checks=0;
try{for(const entry of ['index.html','classic.html'])for(const lang of ['uk','en']){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(()=>{navigator.serviceWorker.register=async()=>undefined;});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const base='http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today';
 // daytime: no row
 await p.clock.setFixedTime(at(12));await p.goto(base,{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-verdict] .nr-dv-tone'),null,{timeout:60000});await p.waitForTimeout(500);
 assert.equal(await p.locator('#nrRoute-today [data-day-match]').count(),0,entry+' '+lang+' row must not show at 12:30');checks++;
 // evening: row for today only
 await p.clock.setFixedTime(at(19));await p.reload({waitUntil:'load'});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-match] button[data-match]'),null,{timeout:60000});
 const before=await p.evaluate(ds=>({score:document.querySelector('#nrRoute-today .nr-o-hero .nr-o-score').textContent.trim(),btn:[...document.querySelectorAll('#nrRoute-today [data-day-match] button')].map(x=>{const r=x.getBoundingClientRect();return [x.textContent,r.width,r.height]}),text:document.querySelector('#nrRoute-today [data-day-match]').innerText,final:fp469ConsumerForDate({ds}).consumer}),day);
 assert.equal(before.btn.length,3);for(const [,w,h] of before.btn)assert.ok(w>=44&&h>=44,'tap target '+w+'x'+h);
 if(lang==='en')assert.equal(/[А-Яа-яІіЇїЄєҐґ]/.test(before.text),false,'Ukrainian in English row: '+before.text);
 const other=await p.evaluate(async ds=>{const sel=document.querySelector('#nrRoute-today [data-overview="today"] select');const o=[...sel.options].map(x=>x.value).find(v=>v!==ds);if(!o)return null;sel.value=o;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,400));
  const n=document.querySelectorAll('#nrRoute-today [data-day-match]').length;sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,400));return n},day);
 if(other!==null)assert.equal(other,0,entry+' row must not show on another date');checks++;
 await p.click('#nrRoute-today [data-day-match] button[data-match="partial"]');await p.waitForSelector('#nrRoute-today [data-day-match].is-saved');
 const after=await p.evaluate(()=>({stored:window.NRDayVerdict.matches(),score:document.querySelector('#nrRoute-today .nr-o-hero .nr-o-score').textContent.trim(),line:document.querySelector('#nrRoute-today [data-day-match]').innerText}));
 const rec=after.stored[day];assert.ok(rec,'answer stored for '+day);assert.equal(rec.v,'partial');
 assert.equal(rec.score,Number.isFinite(before.final.score)?before.final.score:null,'stored score = resolveFinal at answer time');assert.equal(after.score,before.score,'score unchanged');
 assert.match(after.line,lang==='uk'?/Записано: Частково/:/Saved: Partly/);checks++;
 await p.reload({waitUntil:'load'});await p.waitForSelector('#nrRoute-today [data-day-match].is-saved',{timeout:60000});checks++;
 assert.equal(errs.length,0,errs.join('|'));await c.close();}}
finally{await b.close();srv.close()}
console.log('PASS day match: '+checks+' checks (2 entries × uk/en): evening-only, today-only, one tap stored with the final score on device, score unchanged');})().catch(e=>{console.error(e.message);process.exit(1)});
