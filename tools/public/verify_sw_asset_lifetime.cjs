'use strict';
// Real worker bytes, isolated origin, no CDP or worker instrumentation.
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),assert=require('assert/strict');
const {chromium}=require('playwright');
const os=require('os');const evidence=fs.mkdtempSync(path.join(os.tmpdir(),'skyrhythm-sw-lifetime-'));
const root=path.resolve(process.env.SW_ROOT||path.join(__dirname,'../..'));
const mode=process.argv[2]||'svgheaders',expectBounded=process.argv.includes('--bounded');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');let phase='old',held=null,holding=false,heldStarted=0;
const target=mode==='jsonbody'?'lifetime.json':mode==='artbody'?'dayline_art/ashwini-engraving.webp?lifetime=1':'lifetime.svg';
const requests=[];
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://x').pathname).slice(1)||'index.html';const request={url:req.url,at:Date.now()};requests.push(request);res.on('finish',()=>{request.status=res.statusCode;request.finished=Date.now()});
 if(name==='probe.html'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end('<!doctype html><title>Isolated SW lifecycle</title><input id="draft" value="preserve"><script>window.changed=0;navigator.serviceWorker.addEventListener("controllerchange",()=>window.changed++);</script>')}
 if(name==='sw.js'){res.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return res.end(phase==='old'?sw:sw.replace(/const CACHE_VERSION = '[^']+'/g,"const CACHE_VERSION = 'lifetime-probe-new'"))}
 if(req.url.slice(1)===target&&holding){held=res;heldStarted=Date.now();if(mode!=='svgheaders'){res.writeHead(200,{'content-type':mode==='jsonbody'?'application/json':'image/webp'});res.write(mode==='jsonbody'?'{':'RIFF')}return}
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}const ext=path.extname(file);res.writeHead(200,{'cache-control':'no-store','content-type':({'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/octet-stream'});res.end(b)});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});const result={mode,expectBounded,worker_sha256:crypto.createHash('sha256').update(sw).digest('hex'),worker_instrumented:false};
 try{const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto('http://127.0.0.1:'+server.address().port+'/probe.html');
 await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('initial activation timeout')),20000))])});await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const state=()=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {waiting:r.waiting?.state,installing:r.installing?.state,active:r.active?.state,controller:navigator.serviceWorker.controller?.state,caches:await caches.keys(),changed:window.changed}});
 result.initial=await state();phase='new';await p.evaluate(async()=>{window.registration=await navigator.serviceWorker.getRegistration();await window.registration.update()});await p.waitForFunction(()=>!!window.registration.waiting,null,{timeout:60000});result.waiting=await state();
 holding=true;await p.evaluate(target=>{window.readState='pending';window.readTask=fetch(target).then(r=>r.arrayBuffer()).then(b=>{window.readState='fulfilled'},e=>{window.readState='rejected'})},target);
 const deadline=Date.now()+5000;while(!held&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));assert(held,'held request reached server');
 result.beforeMessage=await state();await p.evaluate(async()=>{window.changed=0;const r=await navigator.serviceWorker.getRegistration();if(!r.waiting)throw Error('waiting worker disappeared');r.waiting.postMessage({type:'SKIP_WAITING'})});
 result.activated_before_release=await p.waitForFunction(()=>window.changed>0,null,{timeout:expectBounded?22000:5000}).then(()=>true,()=>false);
 result.elapsed_before_release_ms=Date.now()-heldStarted;result.registration=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {waiting:r.waiting?.state||null,active:r.active?.state,read:window.readState}});
 if(!held.destroyed){if(mode==='svgheaders')held.writeHead(200,{'content-type':'image/svg+xml'});held.end(mode==='jsonbody'?'}':'released')}
 result.activated_after_release=await p.waitForFunction(()=>window.changed>0,null,{timeout:10000}).then(()=>true,()=>false);
 await p.waitForFunction(()=>window.registration.active?.state==='activated'&&!window.registration.waiting,null,{timeout:10000});result.finalState=await state();
 assert.deepEqual(result.finalState.caches.filter(x=>x.startsWith('gindex-shell-')),['gindex-shell-lifetime-probe-new']);
 result.draft=await p.locator('#draft').inputValue();assert.equal(result.draft,'preserve');assert(result.activated_after_release,'activation must complete');
 if(expectBounded)assert(result.activated_before_release,'network lifetime must be bounded without server release');
 else assert(!result.activated_before_release,'unbounded scenario must reproduce before release');
 result.status='PASS';
 }catch(e){result.status='FAIL';result.error=String(e);process.exitCode=1}
 finally{if(held&&!held.destroyed)held.end();await browser.close();server.closeAllConnections();server.close();result.requests=requests;fs.writeFileSync(path.join(evidence,`SW_LIFETIME_${mode}_${expectBounded?'bounded':'baseline'}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,evidence,requests:result.requests.length}));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
