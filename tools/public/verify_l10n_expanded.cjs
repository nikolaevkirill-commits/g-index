'use strict';
// L10N-2 guard (audit FP549): in English, every route of all three entry pages, with every <details> expanded,
// must show no Cyrillic text outside [translate=no]/[lang=uk]. The earlier check skipped closed <details>,
// which hid the untranslated forecast journal. Two fixed clocks cover different panchanga/journal states.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();const found=new Map();let pages=0;
try{for(const entry of ['classic.html','index.html','design-b17.html'])for(const when of ['2026-10-30T17:00:00Z','2026-11-01T08:00:00Z']){
 const c=await b.newContext({locale:'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());const p=await c.newPage();await p.clock.setFixedTime(new Date(when));
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});await p.waitForTimeout(3500);
 const routes=await p.evaluate(()=>[...new Set([...document.querySelectorAll('[id^="nrRoute-"]')].map(e=>e.id.slice(8)))]);
 for(const r of routes){await p.evaluate(r=>{location.hash=r},r);await p.waitForTimeout(1200);await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await p.waitForTimeout(600);pages++;
  const vis=await p.evaluate(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let x;while(x=w.nextNode()){const e=x.parentElement;const v=x.nodeValue.trim();if(!e||!/[А-Яа-яІіЇїЄєҐґ]/.test(v)||e.closest('script,style,[translate=no],[lang=uk]'))continue;if(!e.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;out.push(v.slice(0,120))}return out});
  for(const v of vis)if(!found.has(v))found.set(v,entry+'#'+r+' @'+when);}
 await p.evaluate(()=>{
  window.__nrConsumerGeneratedAt=null;
  document.getElementById('dataTimestamp').textContent='дані від (synthetic)';
 });
 await c.setOffline(true);
 await p.waitForFunction(()=>document.getElementById('offlineBanner').style.display!=='none');
 const offline=await p.locator('#offlineBanner').textContent();
 assert.match(offline,/Offline · data from\s+an unknown time\s+· Showing cached data/);
 assert.doesNotMatch(offline,/synthetic|[А-Яа-яІіЇїЄєҐґ]/);
 await c.close();}}
finally{await b.close();srv.close();}
for(const [k,v] of found)console.error('  '+v+' :: '+k);
assert.equal(found.size,0,'visible untranslated text in English UI');console.log('PASS expanded L10N: '+pages+' route views (3 entries × 2 clocks), all <details> open, 0 visible Cyrillic strings in English');})().catch(e=>{console.error(e.message);process.exit(1)});
