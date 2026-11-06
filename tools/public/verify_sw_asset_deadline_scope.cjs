'use strict';
// FP568: the uncached-asset deadline must apply only while an update is pending.
// (a) no update pending: slow but healthy network (TTFB 3 s; ~32 KB/s body for ~15.5 s) still loads;
// (b) a request started BEFORE the update was found is bounded once the update appears (activation without server release).
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(process.env.SW_ROOT||path.join(__dirname,'../..')),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const mime={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const SVG='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"/>';
let phase='old';const held=new Map(),timers=new Set();
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://x');let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';
 if(p==='/probe.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><script>window.changed=0;navigator.serviceWorker.addEventListener("controllerchange",()=>window.changed++)</script>')}
 if(p==='/sw.js'){res.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return res.end(phase==='old'?sw:sw.replace(/const CACHE_VERSION = '[^']+'/,"const CACHE_VERSION = 'deadline-scope-new'"))}
 if(p==='/slow_ttfb.svg'){const t=setTimeout(()=>{res.writeHead(200,{'content-type':'image/svg+xml'});res.end(SVG)},3000);timers.add(t);res.once('close',()=>{clearTimeout(t);timers.delete(t)});return}
 if(p==='/slow_body.svg'){res.writeHead(200,{'content-type':'image/svg+xml'});res.write('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><!--');let n=0;const t=setInterval(()=>{if(n++>=30){clearInterval(t);res.end('--></svg>');return}res.write('x'.repeat(16384))},500);timers.add(t);res.once('close',()=>{clearInterval(t);timers.delete(t)});return}
 if(p==='/held.svg'||p==='/held_body.svg'){held.set(p,res);if(p==='/held_body.svg'){res.writeHead(200,{'content-type':'image/svg+xml'});res.write('<svg xmlns="http://www.w3.org/2000/svg"><!--')}return}
 const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(),out={worker_sha256:crypto.createHash('sha256').update(sw).digest('hex'),worker_instrumented:false};
 try{const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto('http://127.0.0.1:'+server.address().port+'/probe.html');
  await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready});await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const img=src=>p.evaluate(src=>new Promise(r=>{const i=new Image();const t=setTimeout(()=>r(false),30000);const done=ok=>{clearTimeout(t);r(ok)};i.onload=()=>done(i.naturalWidth===40);i.onerror=()=>done(false);i.src=src}),src);
  out.no_update_slow_ttfb_loads=await img('slow_ttfb.svg');out.no_update_slow_body_loads=await img('slow_body.svg');
  assert(out.no_update_slow_ttfb_loads,'no update pending: 3 s TTFB asset must load');assert(out.no_update_slow_body_loads,'no update pending: slow healthy body must load');
  await p.evaluate(()=>{window.heldImages=['held.svg','held_body.svg'].map(src=>{const i=new Image();i.src=src;return i})});const d=Date.now()+5000;while(held.size<2&&Date.now()<d)await new Promise(r=>setTimeout(r,20));assert.equal(held.size,2,'preexisting header and body requests reached server');
  // Let the body headers reach the active worker before discovering the update.
  await p.waitForTimeout(250);
  const updateStarted=Date.now();
  phase='new';await p.evaluate(async()=>{window.reg=await navigator.serviceWorker.getRegistration();await window.reg.update()});await p.waitForFunction(()=>!!window.reg.waiting,null,{timeout:60000});
  await p.evaluate(()=>{window.changed=0;window.reg.waiting.postMessage({type:'SKIP_WAITING'})});
  out.preexisting_request_bounded=await p.waitForFunction(()=>window.changed>0,null,{timeout:22000}).then(()=>true,()=>false);
  assert(out.preexisting_request_bounded,'request started before the update must not hold activation');
  out.preexisting_header_and_body=true;out.update_elapsed_ms=Date.now()-updateStarted;
  out.status='PASS';
 }catch(e){out.status='FAIL';out.error=String(e);process.exitCode=1}
 finally{for(const t of timers)clearInterval(t);for(const res of held.values())if(!res.destroyed)res.end();await browser.close();server.closeAllConnections();server.close();console.log(JSON.stringify(out))}
})().catch(e=>{console.error(e);process.exitCode=1});
