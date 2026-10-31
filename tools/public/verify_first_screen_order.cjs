'use strict';
// DES-10 (audit FP549): the order of blocks under the Today hero must not depend on async render timing.
// Usage: node verify_first_screen_order.cjs [loads=6]
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),loads=+process.argv[2]||6;
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();const report={};
try{for(const entry of ['index.html','design-v4.html']){const seen=new Set();
 for(let i=0;i<loads;i++){const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width:390,height:844},reducedMotion:'reduce'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());const p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-30T17:00:00Z'));
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});await p.waitForTimeout(3500);
  seen.add(await p.evaluate(()=>{const hero=document.querySelector('#nrRoute-today .nr-o-hero');const out=[];let n=hero;while((n=n.nextElementSibling)&&out.length<4){if(n.checkVisibility())out.push(n.tagName.toLowerCase()+'.'+String(n.className).split(' ')[0])}return out.join(' > ')}));await c.close();}
 report[entry]=[...seen];assert.equal(seen.size,1,entry+': first-screen order varies between loads: '+JSON.stringify([...seen]));}}
finally{await b.close();srv.close();}
console.log(JSON.stringify(report));console.log('PASS first-screen order: deterministic across '+loads+' loads × 2 entries');})().catch(e=>{console.error(e.message);process.exit(1)});
