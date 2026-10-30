'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
// The timeout must never masquerade as a successful activation. Test both entry files.
for(const entry of ['index.html','design-v4.html'])for(const language of ['uk','en','es','fr']){
  const html=fs.readFileSync(path.join(root,entry),'utf8').replace(/\r\n/g,'\n'),start=html.indexOf('function pwaReload() {');assert(start>=0);
  const source=html.slice(start,html.indexOf('\n}',start)+2);let reloads=0,messages=0,timer;
  const label={textContent:''},button={disabled:false};
  const context={_swReg:{waiting:{postMessage(data){assert.equal(data.type,'SKIP_WAITING');messages++;}}},document:{getElementById(){return {querySelector(s){return s==='span'?label:button}}}},setTimeout(fn,ms){assert.equal(ms,4000);timer=fn;}};
  context.window={NRLocale:{language},location:{reload(){reloads++;}}};require('vm').createContext(context);require('vm').runInContext(source,context);
  context.pwaReload();assert.equal(messages,1);assert.equal(button.disabled,true);timer();assert.equal(reloads,0,'waiting activation must not force reload');assert.equal(button.disabled,false);assert(label.textContent.length>20);
  context.pwaReload();context._swReg.waiting=null;timer();assert.equal(reloads,0,'controllerchange owns successful reload');context.pwaReload();assert.equal(reloads,1,'explicit manual reload with no waiting worker remains available');
}
console.log('PASS update timeout guard: both entries, four languages; no premature reload');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'skyrhythm-css-upgrade-'));
let phase='old';
const restart=process.argv.find(a=>a.startsWith('--restart='))?.split('=')[1];
const trigger=process.argv.includes('--button')?'button':'message';
// FP545 (T1): the release gate must exercise the production worker byte-for-byte. Worker
// instrumentation (--trace) and the CDP ServiceWorker domain (--cdp, implied by --restart)
// are diagnostic-only: in FP543 they changed the outcome of the same runtime (3/8 → 12/12).
const trace=process.argv.includes('--trace');
// Server-side evidence does not modify either worker or enable CDP ServiceWorker.
const serverLog=process.argv.includes('--server-log'),requests=[];
const cdpEnabled=trace||process.argv.includes('--cdp')||!!restart;
const expectedVersion=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE_VERSION = '([^']+)'/)[1];
// Observe pending fetch lifetimes without changing the historical worker fixture on disk.
const traceWorker = `self.addEventListener('message',event=>{if(event.data?.type==='TEST_UPGRADE_VERSION')event.ports[0]?.postMessage({version:CACHE_VERSION});});
self.__upgradePending=new Map();self.__upgradeSequence=0;self.__upgradeEvents=[];
self.addEventListener('message',e=>self.__upgradeEvents.push({type:e.data?.type,at:Date.now()}));
const __upgradeAdd=self.addEventListener.bind(self);
self.addEventListener=function(type,listener,...rest){
 if(type!=='fetch')return __upgradeAdd(type,listener,...rest);
 return __upgradeAdd(type,event=>{const respond=event.respondWith.bind(event);
 const wait=event.waitUntil.bind(event);event.waitUntil=promise=>{const id=++self.__upgradeSequence;self.__upgradePending.set(id,{kind:'waitUntil',url:event.request.url,started:Date.now()});return wait(Promise.resolve(promise).finally(()=>self.__upgradePending.delete(id)));};
 event.respondWith=promise=>{const id=++self.__upgradeSequence;self.__upgradePending.set(id,{url:event.request.url,started:Date.now()});
 return respond(Promise.resolve(promise).then(value=>{self.__upgradePending.delete(id);return value},error=>{self.__upgradePending.delete(id);throw error}));};
 return listener(event);},...rest);
};\n`;

const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  if(serverLog){const record={url:req.url,phase,started:Date.now()};requests.push(record);res.on('finish',()=>{record.finished=Date.now();record.status=res.statusCode;});res.on('close',()=>{record.closed=Date.now();record.completed=res.writableFinished;});}
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    let bytes=fs.readFileSync(file);
    if(phase==='old'&&name==='sw.js')bytes=fs.readFileSync(path.join(__dirname,'fixtures/sw_fp532.js'));
    if(trace&&name==='sw.js')bytes=Buffer.concat([Buffer.from(traceWorker),bytes]);
    if(phase==='old'&&['index.html','day_summary.html'].includes(name))bytes=Buffer.from(bytes.toString().replace(/<style data-inline-source="([^"]+)"[^>]*>[\s\S]*?<\/style>/g,'<link rel="stylesheet" href="$1">'));
    if(phase==='old'&&name.endsWith('.css'))bytes=Buffer.concat([bytes,Buffer.from('\n:root{--css-upgrade-probe:old-cache}\n')]);
    res.writeHead(200,{'content-type':types[path.extname(name)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch(e){res.writeHead(404).end();}
});
async function checkPage(page,name,count){
  if(page.url()===base+name)await page.reload();else await page.goto(base+name);
  await page.waitForFunction(()=>document.querySelectorAll('style[data-inline-source]').length>0).catch(async e=>{fs.writeFileSync(path.join(out,'failed.html'),await page.content());throw e;});
  assert.equal(await page.locator('link[rel=stylesheet]').count(),0);
  assert.equal(await page.locator('style[data-inline-source]').count(),count);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--css-upgrade-probe').trim()),'');
  for(const item of await page.locator('style[data-inline-source]').evaluateAll(nodes=>nodes.map(n=>({source:n.dataset.inlineSource,text:n.textContent})))){
    assert.equal(item.text,'\n'+fs.readFileSync(path.join(root,item.source),'utf8').replace(/\r\n/g,'\n')+'\n');
  }
}
// Without instrumentation the active version is read from the worker's own cache names
// (gindex-shell-<CACHE_VERSION>); activation deletes every other gindex-* cache.
async function cacheVersions(page){
  return page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('gindex-shell-')).map(k=>k.slice('gindex-shell-'.length)).sort());
}
async function activeVersion(page){
  if(!trace){const versions=await cacheVersions(page);return versions.length===1?versions[0]:'ambiguous:'+versions.join(',');}
  return page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const timer=setTimeout(()=>{channel.port1.close();reject(new Error('Active worker version reply timed out'));},5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data.version);};
      registration.active.postMessage({type:'TEST_UPGRADE_VERSION'},[channel.port2]);
    });
  });
}
async function bounded(promise,ms=5000){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Diagnostic probe timed out')),ms);})]);}
  finally{clearTimeout(timer);}
}
let base;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true});
  const lifecycle=[];
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'}),page=await ctx.newPage();
    let cdp=null;
    if(cdpEnabled){cdp=await ctx.newCDPSession(page);cdp.on('ServiceWorker.workerVersionUpdated',e=>lifecycle.push({at:Date.now(),...e}));await cdp.send('ServiceWorker.enable');}
    await page.goto(base+'index.html?channel=play#today');
    await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--css-upgrade-probe').trim()),'old-cache');
    const oldVersion=await activeVersion(page);
    assert.notEqual(oldVersion,expectedVersion,'fixture must exercise a different worker version');
    phase='new';
    await checkPage(page,'index.html?channel=play#today',6);
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting,null,{timeout:60000});
    const journal=await ctx.newPage();await checkPage(journal,'day_summary.html',1);
    await ctx.setOffline(true);
    await checkPage(page,'index.html?channel=play#today',6);await checkPage(journal,'day_summary.html',1);
    // Waiting worker does not force a reload or discard a draft.
    await journal.locator('#note').fill('unsaved upgrade fixture');
    assert.equal(await journal.locator('#note').inputValue(),'unsaved upgrade fixture');
    await journal.screenshot({path:path.join(out,'offline_waiting_journal.png'),fullPage:true});
    await ctx.setOffline(false);
    if(restart){
      const versions=new Map();for(const event of lifecycle)for(const version of event.versions)versions.set(version.versionId,version);
      const target=[...versions.values()].find(v=>v.status===(restart==='old'?'activated':'installed'));
      assert(target,'worker selected for restart must exist');
      await cdp.send('ServiceWorker.stopWorker',{versionId:target.versionId});
    }
    try {
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),trigger==='button'?page.locator('#pwaUpdateBar button').click():page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();r.waiting.postMessage({type:'SKIP_WAITING'});})]);
    } catch(error) {
      const diagnostics={trigger,restart,lifecycle,registration:await bounded(page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {waiting:r.waiting?.state,active:r.active?.state,reloading:window._swReloading}})).catch(e=>({error:String(e)})),workers:[]};
      for(const worker of ctx.serviceWorkers())try{diagnostics.workers.push(await bounded(worker.evaluate(()=>({version:typeof CACHE_VERSION==='undefined'?null:CACHE_VERSION,pending:[...(self.__upgradePending||[])],events:self.__upgradeEvents,now:Date.now()}))))}catch(e){diagnostics.workers.push({error:String(e)})}
      fs.writeFileSync(path.join(out,'FAILURE.json'),JSON.stringify(diagnostics,null,2));console.error('CSS_UPGRADE_DIAGNOSTICS',JSON.stringify(diagnostics));throw error;
    }
    await page.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration()).waiting);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.waitForFunction(async()=>(await caches.keys()).filter(k=>k.startsWith('gindex-shell-')).length===1,null,{timeout:15000});
    const activatedVersion=await activeVersion(page);
    assert.equal(activatedVersion,expectedVersion,'new worker must actually activate');
    await ctx.setOffline(true);await checkPage(page,'index.html?channel=play#today',6);await checkPage(journal,'day_summary.html',1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,'offline_updated_today.png'),fullPage:true});
    fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify({trigger,trace,cdp:cdpEnabled,restart:restart||null,oldVersion,activatedVersion,old_css_probe_reproduced:true,new_html_ignores_old_css:true,waiting_worker_offline:true,updated_worker_offline:true,inline_blocks:7,source_css_exact:true},null,2));
    console.log('PASS CSS upgrade ('+trigger+(trace?', trace':'')+(cdpEnabled?', cdp':'')+'): old cached styles reproduced; exact new styles online, waiting/offline and activated/offline. Evidence: '+out);
  }finally{fs.writeFileSync(path.join(out,'LIFECYCLE.json'),JSON.stringify(lifecycle,null,2));if(serverLog)fs.writeFileSync(path.join(out,'SERVER_REQUESTS.json'),JSON.stringify({worker_modified:trace,cdp:cdpEnabled,requests},null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
