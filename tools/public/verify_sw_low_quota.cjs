'use strict';
// R4: an update under a real, verified low storage quota must fail without touching the active
// shell cache, its offline start, or the user's saved local state (localStorage + IndexedDB).
// The quota is checked through CDP Storage.getUsageAndQuota: the override must be active and
// within 5% of the requested size, otherwise the test fails instead of reporting a false PASS.
const assert=require('node:assert/strict'),{readFile,writeFile}=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
const scope='/g-index/';let worker;
const server=http.createServer(async(req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://l').pathname.slice(scope.length));
 if(name==='probe.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<title>p</title>');
 try{const body=name==='sw.js'?worker:await readFile(path.resolve(root,name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404).end();}});
const ver=(src,v)=>src.replace(/const CACHE_VERSION = '[^']+';/,`const CACHE_VERSION = '${v}';`);
// Compare the complete URL -> content map, not only aggregate sizes/counts.
const bodies=p=>p.evaluate(async()=>{const o={};for(const n of (await caches.keys()).sort()){if(!n.startsWith('gindex-shell-'))continue;const c=await caches.open(n),entries=[];for(const r of await c.keys()){const response=await c.match(r),body=await response.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');entries.push({url:r.url,bytes:body.byteLength,sha256:digest});}entries.sort((a,b)=>a.url.localeCompare(b.url));o[n]={bytes:entries.reduce((s,e)=>s+e.bytes,0),entries};}return o;});
const activeCache=(snapshot,name)=>{assert.ok(Object.hasOwn(snapshot,name),'active shell cache must exist: '+name);assert.ok(snapshot[name].entries.length>0,'active shell cache must contain responses');return snapshot[name];};
const mutateByte=p=>p.evaluate(async()=>{const c=await caches.open('gindex-shell-q-v1');for(const r of await c.keys()){const response=await c.match(r),bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length)continue;bytes[0]^=1;await c.put(r,new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers}));return {url:r.url,bytes:bytes.length};}throw new Error('mutation requires a nonempty cached response');});
const saved=p=>p.evaluate(()=>new Promise(res=>{const ls=localStorage.getItem('r4-saved-scenario');const q=indexedDB.open('r4-audit',1);q.onupgradeneeded=()=>q.result.createObjectStore('s');q.onsuccess=()=>{const g=q.result.transaction('s').objectStore('s').get('scenario');g.onsuccess=()=>{q.result.close();res({ls,idb:g.result??null});};};}));
const out=process.argv[2]||'';
(async()=>{const cur=await readFile(path.join(root,'sw.js'),'utf8');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+scope,origin=new URL(base).origin;const b=await chromium.launch();const report={browser:b.version()};
 try{
  const c=await b.newContext(),p=await c.newPage();worker=ver(cur,'q-v1');await p.goto(base+'probe.html');
  await p.evaluate(()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));
  await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:90000});
  await p.evaluate(()=>new Promise(res=>{localStorage.setItem('r4-saved-scenario','kyiv|2026-11-18|sky');const q=indexedDB.open('r4-audit',1);q.onupgradeneeded=()=>q.result.createObjectStore('s');q.onsuccess=()=>{const t=q.result.transaction('s','readwrite');t.objectStore('s').put({city:'barcelona',date:'2026-11-10'},'scenario');t.oncomplete=()=>{q.result.close();res();};};}));
  report.before={caches:await bodies(p),saved:await saved(p)};
  const v1='gindex-shell-q-v1';activeCache(report.before.caches,v1);
  const cdp=await c.newCDPSession(p);
  const u0=await cdp.send('Storage.getUsageAndQuota',{origin});
  report.requestedQuota=Math.ceil(u0.usage+512*1024);
  await cdp.send('Storage.overrideQuotaForOrigin',{origin,quotaSize:report.requestedQuota});
  const u1=await cdp.send('Storage.getUsageAndQuota',{origin});
  report.cdpQuota={quota:u1.quota,usage:u1.usage,overrideActive:u1.overrideActive};
  report.pageEstimate=await p.evaluate(()=>navigator.storage.estimate().then(e=>({quota:e.quota,usage:e.usage})));
  assert.equal(u1.overrideActive,true,'quota override must be active');
  report.quotaDeviation=Math.abs(u1.quota-report.requestedQuota)/report.requestedQuota;
  assert.ok(report.quotaDeviation<=0.05,'observed quota must be within 5% of the requested quota');
  worker=ver(cur,'q-v2');
  report.update=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();
   const s=new Promise(res=>{r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(['installed','redundant'].includes(w.state))res(w.state)})},{once:true})});
   await r.update();return Promise.race([s,new Promise(res=>setTimeout(()=>res('timeout'),90000))]);});
  if(process.env.SW_LOW_QUOTA_MUTATION==='byte')report.mutation=await mutateByte(p);
  report.after={caches:await bodies(p),saved:await saved(p),active:await p.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).active?.state??null)};
  assert.equal(report.update,'redundant','an update that cannot fit the quota must become redundant');
  const before=activeCache(report.before.caches,v1),after=activeCache(report.after.caches,v1);
  if(report.mutation){assert.equal(after.bytes,before.bytes,'negative probe must preserve total byte size');assert.deepEqual(after.entries.map(e=>e.url),before.entries.map(e=>e.url),'negative probe must preserve URLs');}
  assert.deepEqual(after,before,'active shell cache URLs and SHA256 bodies must be unchanged');
  assert.equal(report.after.active,'activated');
  assert.deepEqual(report.after.saved,report.before.saved,'saved local scenarios must survive the failed update');
  await c.setOffline(true);const q=await c.newPage();
  const r=await q.goto(base+'classic.html?channel=play#today',{waitUntil:'domcontentloaded'}).catch(()=>null);
  report.offlineStart=!!r&&await q.waitForFunction(()=>typeof computePanchanga==='function'&&window.SRSkyTime,null,{timeout:30000}).then(()=>true,()=>false);
  assert.equal(report.offlineStart,true,'offline start from the active cache');
  report.passed=true;console.log(JSON.stringify(report));console.log('PASS low quota: verified override, failed update, active cache and saved state intact');
 }catch(e){report.passed=false;report.error=String(e&&e.message||e);console.log(JSON.stringify(report));console.error('FAIL low quota: '+report.error);process.exitCode=1;}
 finally{if(out)await writeFile(out,JSON.stringify(report,null,1));await b.close();server.close();}})();
