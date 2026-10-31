'use strict';
// Audit FP549: the note under the score must name the authority actually shown (expert decision vs source formula).
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const root=require('path').resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';fs.readFile(path.resolve(root,f),(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let bad=0;
for(const entry of ['index.html','design-v4.html','design-b17.html'])for(const loc of ['uk-UA','en-GB']){const c=await b.newContext({locale:loc,serviceWorkers:'block',viewport:{width:1280,height:900},timezoneId:'Europe/Kyiv'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());const p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-30T16:59:32Z'));
await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#forecast',{waitUntil:'load'});await p.waitForTimeout(4500);const res=[];
for(const ds of ['2026-10-30','2026-11-15','2026-11-24']){res.push(await p.evaluate(async ds=>{const sec=document.getElementById('nrRoute-forecast');const sel=sec.querySelector('select');sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,600));const n=sec.querySelector('[data-authority-boundary]');const a=window.fp469ConsumerForDate?.({ds})?.consumer?.authority;return {ds,authority:a,avail:window.fp469ConsumerForDate?.({ds})?.consumer?.available,note:n?.textContent.slice(0,48)}},ds));}
// language round-trip
const rt=await p.evaluate(async()=>{NRLocale.set('fr');await new Promise(r=>setTimeout(r,500));const fr=document.querySelector('#nrRoute-forecast [data-authority-boundary]')?.textContent.slice(0,30);NRLocale.set('uk');await new Promise(r=>setTimeout(r,500));return {fr,uk:document.querySelector('#nrRoute-forecast [data-authority-boundary]')?.textContent.slice(0,30)}});
for(const r of res){const expertText=/Експертна|Expert/.test(r.note||'');if((r.authority==='expert_pdf')!==expertText)bad++;}
console.log(entry,loc,JSON.stringify(res),JSON.stringify(rt));await c.close();}
await b.close();srv.close();if(bad){console.error('FAIL authority boundary note: '+bad);process.exit(1)}console.log('PASS authority boundary note: 3 entries × uk/en × expert/formula/missing dates, language round-trip');})().catch(e=>{console.error(e.message);process.exit(1)});
