'use strict';
// Audit FP549: detects content painted outside a clipped/limited box onto following content
// (text over text, controls over controls). Reflow tests only covered horizontal overflow.
// Usage: node verify_no_overlap.cjs
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':f.endsWith('.png')?'image/png':f.endsWith('.woff2')?'font/woff2':f.endsWith('.woff')?'font/woff':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();const issues=[];let cases=0;
try{for(const entry of ['classic.html','index.html'])for(const width of [390,768,1280]){
 const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width,height:900},timezoneId:'Europe/Kyiv',reducedMotion:'reduce'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-30T17:00:00Z'));await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});await p.waitForTimeout(3500);
 for(const route of ['today','panch','forecast','calendar','more']){await p.evaluate(r=>{location.hash=r},route);await p.waitForTimeout(1500);cases++;
  const found=await p.evaluate(()=>{const out=[];
   const vis=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1&&e.checkVisibility({contentVisibilityAuto:true,opacityProperty:true,visibilityProperty:true})&&!e.closest('[hidden],[aria-hidden=true]')&&!(e.closest('details:not([open])')&&!e.matches('details:not([open]) > summary'))};
   // 1) boxes whose painted descendants exceed a limited height while overflow is visible
   for(const e of document.querySelectorAll('main *')){const s=getComputedStyle(e);if(s.overflowY!=='visible'||s.maxHeight==='none'||!vis(e))continue;
    const r=e.getBoundingClientRect();let bottom=r.bottom;for(const k of e.children){if(vis(k))bottom=Math.max(bottom,k.getBoundingClientRect().bottom)}
    if(bottom>r.bottom+4)out.push('overflowing box '+e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0]+' max-height '+s.maxHeight+' content +'+Math.round(bottom-r.bottom)+'px');}
   // 2) interactive or heading elements overlapping each other (different, non-nested)
   const els=[...document.querySelectorAll('main button,main a[href],main summary,main h2,main h3,main select,main input')].filter(vis).filter(e=>getComputedStyle(e).position!=='fixed'&&getComputedStyle(e).position!=='sticky'&&!e.closest('[style*="position: fixed"]'));
   // Painted area = own box clipped by every ancestor that clips (overflow other than visible).
   const clip=e=>{const r=e.getBoundingClientRect();let L=r.left,T=r.top,Rr=r.right,B=r.bottom;for(let n=e.parentElement;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.overflowX!=='visible'||s.overflowY!=='visible'){const c=n.getBoundingClientRect();if(s.overflowX!=='visible'){L=Math.max(L,c.left);Rr=Math.min(Rr,c.right)}if(s.overflowY!=='visible'){T=Math.max(T,c.top);B=Math.min(B,c.bottom)}}}return {left:L,top:T,right:Rr,bottom:B}};
   const R=els.map(clip);
   for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){if(els[i].contains(els[j])||els[j].contains(els[i]))continue;const a=R[i],b=R[j];const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>6&&h>6)out.push('overlap '+els[i].tagName+':'+(els[i].textContent||'').trim().slice(0,24)+' × '+els[j].tagName+':'+(els[j].textContent||'').trim().slice(0,24)+' ('+Math.round(w)+'x'+Math.round(h)+')');if(out.length>12)break;}
   return out.slice(0,12);});
  for(const f of found)issues.push(entry+' '+width+' #'+route+' '+f);}
 await c.close();}}
finally{await b.close();srv.close();}
console.log(JSON.stringify({cases,issues:issues.length,sample:issues.slice(0,15)},null,1));
assert.equal(issues.length,0,'overlapping content');console.log('PASS no overlap: '+cases+' cases (2 entries × 3 widths × 5 routes)');})().catch(e=>{console.error(e.message);process.exit(1)});
