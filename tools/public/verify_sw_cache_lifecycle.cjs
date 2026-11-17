'use strict';
// Worker cache lifecycle: successive publications while an update waits, a rollback to
// a worker without the active-version record, and a same-version republication.
const assert=require('node:assert/strict'),{readFile}=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
const scope='/g-index/';let worker,corrupt=false;
const server=http.createServer(async(req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://l').pathname.slice(scope.length));
 if(name==='probe.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<title>p</title>');
 try{const body=name==='sw.js'?worker:corrupt&&name==='core_runtime_v1.js.gz'?Buffer.from('corrupt'):await readFile(path.resolve(root,name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404).end();}});
const ver=(src,v)=>src.replace(/const CACHE_VERSION = '[^']+';/,`const CACHE_VERSION = '${v}';`);
const shells=p=>p.evaluate(async()=>(await caches.keys()).filter(n=>n.startsWith('gindex-shell-')).map(n=>n.slice(13)));
const update=p=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();
 const s=new Promise(res=>{r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(['installed','redundant'].includes(w.state))res(w.state)})},{once:true})});
 await r.update();return Promise.race([s,new Promise(res=>setTimeout(()=>res('timeout'),90000))]);});
const activate=p=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const w=r.waiting;
 const done=new Promise(res=>w.addEventListener('statechange',()=>{if(w.state==='activated'||w.state==='redundant')res(w.state)}));w.postMessage({type:'SKIP_WAITING'});return done;});
async function fresh(b,base,src){const c=await b.newContext();const p=await c.newPage();worker=src;await p.goto(base+'probe.html');
 await p.evaluate(()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:90000});return {c,p};}
async function offlineOk(c,base){await c.setOffline(true);const p=await c.newPage();const r=await p.goto(base+'classic.html?channel=play#today',{waitUntil:'domcontentloaded'}).catch(e=>null);
 const ok=!!r&&await p.waitForFunction(()=>typeof computePanchanga==='function'&&window.SRSkyTime,null,{timeout:30000}).then(()=>true,()=>false);await c.setOffline(false);await p.close();return ok;}
(async()=>{const cur=await readFile(path.join(root,'sw.js'),'utf8');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+scope;const b=await chromium.launch();
 try{
  // 1. Successive publications while an update waits.
  let {c,p}=await fresh(b,base,ver(cur,'s-v1'));const seen=[await shells(p)];
  for(const v of ['s-v2','s-v3','s-v4']){worker=ver(cur,v);assert.equal(await update(p),'installed');seen.push(await shells(p));}
  console.log('1 successive:',JSON.stringify(seen));
  assert.deepEqual(seen.at(-1).sort(),['s-v1','s-v4']);
  assert.equal(await offlineOk(c,base),true,'active worker offline while v4 waits');
  assert.equal(await activate(p),'activated');assert.deepEqual(await shells(p),['s-v4']);
  assert.equal(await p.evaluate(async()=>(await (await caches.open('skyrhythm-sw-state')).match('./active')).text()),'s-v4');
  console.log('1 after activation: shells',JSON.stringify(await shells(p)),'record s-v4');
  // 2. Rollback to a worker without the record, then a new publication.
  const markerWrite="await (await caches.open(STATE_CACHE)).put('./active', new Response(CACHE_VERSION));";
  const legacy=cur.replace("await clearActiveMarker();",'').replace(markerWrite,'');
  assert.notEqual(legacy,cur);
  {worker=ver(legacy,'s-old');assert.equal(await update(p),'installed');assert.equal(await activate(p),'activated');
   worker=ver(cur,'s-v5');assert.equal(await update(p),'installed');const s=await shells(p);console.log('2 rollback then publish:',JSON.stringify(s));
   assert.deepEqual(s.sort(),['s-old','s-v5']);assert.equal(await offlineOk(c,base),true,'rolled-back worker offline');}
  await c.close();
  // 3. Same CACHE_VERSION republished with a broken archive: refused before writing,
  // so the active worker keeps its files and still starts offline.
  ({c,p}=await fresh(b,base,ver(cur,'same')));corrupt=true;worker=ver(cur,'same')+'\n// republish';
  assert.equal(await update(p),'redundant');corrupt=false;
  assert.deepEqual(await shells(p),['same']);assert.equal(await offlineOk(c,base),true,'same-version refusal');
  await c.close();
  // 4. Save-Data skips decorative previews but keeps the required shell.
  const svgCount=async src=>{const r=await fresh(b,base,src);
   const n=await r.p.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith('gindex-shell-'));
    return (await (await caches.open(names[0])).keys()).filter(q=>/\/preview-(v4|b17)\/.*\.svg/.test(q.url)).length;});
   const ok=await offlineOk(r.c,base);await r.c.close();return {n,ok};};
  const normal=await svgCount(ver(cur,'sd-off'));
  const saving=await svgCount("Object.defineProperty(self.navigator,'connection',{value:{saveData:true}});\n"+ver(cur,'sd-on'));
  console.log('4 save-data previews:',normal.n,'->',saving.n);
  assert(normal.n>0);assert.equal(saving.n,0);assert.equal(saving.ok,true,'Save-Data shell offline');
  // 5. An update that does not fit leaves a diagnostic in the page.
  {const c=await b.newContext();const p=await c.newPage();const cdp=await c.newCDPSession(p);
   await cdp.send('Storage.overrideQuotaForOrigin',{origin:new URL(base).origin,quotaSize:12e6});
   worker=ver(cur,'q-1');await p.goto(base+'classic.html?channel=play#today',{waitUntil:'load'});
   await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:90000});
   await p.reload({waitUntil:'load'});await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
   worker=ver(cur,'q-2');assert.equal(await update(p),'redundant');
   await p.waitForFunction(()=>JSON.stringify(window.NRDiagnostics.snapshot()).includes('sw.update_low_storage'),null,{timeout:10000});
   console.log('5 low storage: update redundant, diagnostic recorded');await c.close();}
  // 6. Failure to record bookkeeping must not block activation or offline use.
  const markerBlocked=cur.replace(markerWrite,"throw new DOMException('Full marker storage','QuotaExceededError');");
  assert.notEqual(markerBlocked,cur);
  ({c,p}=await fresh(b,base,ver(cur,'meta-1')));
  worker=ver(markerBlocked,'meta-2');
  assert.equal(await update(p),'installed');
  assert.equal(await activate(p),'activated');
  assert.deepEqual(await shells(p),['meta-2']);
  assert.equal(await offlineOk(c,base),true);
  console.log('6 unavailable active-version marker: new shell still activates and works offline');
  await c.close();
  console.log('PASS worker cache lifecycle: successive publications keep 2 shells, rollback record ignored, same-version republication refused, Save-Data previews skipped, low-storage diagnostic');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
