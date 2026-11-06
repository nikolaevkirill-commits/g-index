'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
// The timeout must never masquerade as a successful activation. Test all three entry files.
for(const entry of ['classic.html','index.html','design-b17.html'])for(const language of ['uk','en','es','fr']){
  const html=fs.readFileSync(path.join(root,entry),'utf8').replace(/\r\n/g,'\n'),start=html.indexOf('function pwaReload() {');assert(start>=0);
  const source=html.slice(start,html.indexOf('\n}',start)+2);let reloads=0,messages=0,timer;
  const label={textContent:''},button={disabled:false};
  const context={_swReg:{waiting:{postMessage(data){assert.equal(data.type,'SKIP_WAITING');messages++;}}},document:{getElementById(){return {querySelector(s){return s==='span'?label:button}}}},setTimeout(fn,ms){assert.equal(ms,4000);timer=fn;}};
  context.window={NRLocale:{language},location:{reload(){reloads++;}}};require('vm').createContext(context);require('vm').runInContext(source,context);
  context.pwaReload();assert.equal(messages,1);assert.equal(button.disabled,true);timer();assert.equal(reloads,0,'waiting activation must not force reload');assert.equal(button.disabled,false);assert(label.textContent.length>20);
  context.pwaReload();context._swReg.waiting=null;timer();assert.equal(reloads,0,'controllerchange owns successful reload');context.pwaReload();assert.equal(reloads,1,'explicit manual reload with no waiting worker remains available');
}
console.log('PASS update timeout guard: three entries, four languages; no premature reload');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'skyrhythm-css-upgrade-'));
let phase='old';
const restart=process.argv.find(a=>a.startsWith('--restart='))?.split('=')[1];
const trigger=process.argv.includes('--button')?'button':'message';
// FP545 (T1): the release gate must exercise the production worker byte-for-byte. Worker
// instrumentation (--trace) and the CDP ServiceWorker domain (--cdp, implied by --restart)
// are diagnostic-only: in FP543 they changed the outcome of the same runtime (3/8 в†’ 12/12).
const trace=process.argv.includes('--trace');
// Server-side evidence does not modify either worker or enable CDP ServiceWorker.
const serverLog=process.argv.includes('--server-log'),requests=[];
const cdpEnabled=trace||process.argv.includes('--cdp')||!!restart;
const expectedVersion=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE_VERSION = '([^']+)'/)[1];
// Observe pending fetch lifetimes without changing the historical worker fixture on disk.
const traceWorker = `self.addEventListener('message',event=>{if(event.data?.type==='TEST_UPGRADE_VERSION')event.ports[0]?.postMessage({version:CACHE_VERSION});});
self.__upgradePending=new Map();self.__upgradeSequence=0;self.__upgradeEvents=[];
self.__upgradeSkipWaiting=[];
const __skipWaiting=self.skipWaiting.bind(self);
self.skipWaiting=function(){
 const record={called:Date.now(),waiting:self.registration.waiting?.state,active:self.registration.active?.state,pending:[...self.__upgradePending.values()]};self.__upgradeSkipWaiting.push(record);
 try{const promise=__skipWaiting();Promise.resolve(promise).then(()=>{record.resolved=Date.now();record.waitingAfter=self.registration.waiting?.state;record.activeAfter=self.registration.active?.state;},error=>{record.rejected=Date.now();record.error=String(error);});return promise;}
 catch(error){record.threw=String(error);throw error;}
};
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
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).replace(/^\//,'')||'classic.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    let bytes=fs.readFileSync(file);
    if(phase==='old'&&name==='sw.js')bytes=fs.readFileSync(path.join(__dirname,'fixtures/sw_fp532.js'));
    if(trace&&name==='sw.js')bytes=Buffer.concat([Buffer.from(traceWorker),bytes]);
    if(phase==='old'&&['classic.html','day_summary.html'].includes(name))bytes=Buffer.from(bytes.toString().replace(/<style data-inline-source="([^"]+)"[^>]*>[\s\S]*?<\/style>/g,'<link rel="stylesheet" href="$1">'));
    if(phase==='old'&&name.endsWith('.css'))bytes=Buffer.concat([bytes,Buffer.from('\n:root{--css-upgrade-probe:old-cache}\n')]);
    res.writeHead(200,{'content-type':types[path.extname(name)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch(e){res.writeHead(404).end();}
});
// Number of inlined CSS blocks in the current classic.html (kept in step with sync_inline_styles.py).
const INDEX_STYLES=(fs.readFileSync(path.join(root,'classic.html'),'utf8').match(/<style data-inline-source="/g)||[]).length;
async function checkPage(page,name,count){
  if(page.url()===base+name)await page.reload();else await page.goto(base+name);
  await page.waitForFunction(()=>document.querySelectorAll('style[data-inline-source]').length>0).catch(async e=>{fs.writeFileSync(path.join(out,'failed.html'),await page.content());throw e;});
  assert.equal(await page.locator('link[rel=stylesheet]').count(),0);
  assert.equal(await page.locator('style[data-inline-source]').count(),count);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--css-upgrade-probe').trim()),'');
  for(const item of await page.locator('style[data-inline-source]').evaluateAll(nodes=>nodes.map(n=>({source:n.dataset.inlineSource,text:n.textContent})))){
    let css=fs.readFileSync(path.join(root,item.source),'utf8').replace(/\r\n/g,'\n');
    css=css.replace(/url\((["']?)([^()"']+)\1\)/g,(all,q,v)=>/^(data:|https?:|\/|#)/.test(v)?all:'url('+q+path.posix.normalize(path.posix.join(path.posix.dirname(item.source),v))+q+')');
    assert.equal(item.text,'\n'+css+'\n');
  }
}
// Without instrumentation the active version is read from the worker's own cache names
// (gindex-shell-<CACHE_VERSION>); activation deletes every other gindex-* cache.
async function cacheVersions(page){
  return page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('gindex-shell-')).map(k=>k.slice('gindex-shell-'.length)).sort());
}
// waitForFunction treats an async predicate's Promise as truthy in the pinned
// Playwright runtime. Poll the live registration synchronously instead.
async function waitForWaiting(page,expected,timeout=30000){
  await page.evaluate(async()=>{window.__cssUpgradeRegistration=await navigator.serviceWorker.getRegistration();if(!window.__cssUpgradeRegistration)throw Error('Expected existing service worker registration')});
  await page.waitForFunction(expected=>!!window.__cssUpgradeRegistration?.waiting===expected,expected,{timeout});
}
async function waitForSingleCache(page){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){if((await cacheVersions(page)).length===1)return;await new Promise(r=>setTimeout(r,100));}
  throw new Error('Timed out waiting for one activated shell cache');
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
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',locale:'en-GB'}),page=await ctx.newPage();
    let cdp=null;
    if(cdpEnabled){cdp=await ctx.newCDPSession(page);cdp.on('ServiceWorker.workerVersionUpdated',e=>lifecycle.push({at:Date.now(),...e}));await cdp.send('ServiceWorker.enable');}
    await page.goto(base+'classic.html?channel=play#today');
    await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--css-upgrade-probe').trim()),'old-cache');
    const oldVersion=await activeVersion(page);
    assert.notEqual(oldVersion,expectedVersion,'fixture must exercise a different worker version');
    phase='new';
    await checkPage(page,'classic.html?channel=play#today',INDEX_STYLES);
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await waitForWaiting(page,true,60000);
    const main=await ctx.newPage();await checkPage(main,'index.html?channel=play#today',18);
    const journal=await ctx.newPage();await checkPage(journal,'day_summary.html',1);await checkPage(main,'index.html?channel=play#today',18);
    await ctx.setOffline(true);
    await checkPage(page,'classic.html?channel=play#today',INDEX_STYLES);await checkPage(journal,'day_summary.html',1);await checkPage(main,'index.html?channel=play#today',18);
    // Waiting worker does not force a reload or discard a draft.
    await journal.locator('#note').fill('unsaved upgrade fixture');
    assert.equal(await journal.locator('#note').inputValue(),'unsaved upgrade fixture');
    await journal.screenshot({path:path.join(out,'offline_waiting_journal.png'),fullPage:true});
    await ctx.setOffline(false);
    await main.evaluate(()=>{window.__updateCanary='unsaved main tab'});
    let otherNavigations=0,journalNavigations=0;
    main.on('framenavigated',frame=>{if(frame===main.mainFrame())otherNavigations++});
    journal.on('framenavigated',frame=>{if(frame===journal.mainFrame())journalNavigations++});
    if(restart){
      const versions=new Map();for(const event of lifecycle)for(const version of event.versions)versions.set(version.versionId,version);
      const target=[...versions.values()].find(v=>v.status===(restart==='old'?'activated':'installed'));
      assert(target,'worker selected for restart must exist');
      await cdp.send('ServiceWorker.stopWorker',{versionId:target.versionId});
    }
    try {
      if(trigger==='button')await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#pwaUpdateBar button').click()]);
      else{
        // A worker activation from elsewhere must not itself reload this page.
        let navigations=0;const observe=frame=>{if(frame===page.mainFrame())navigations++};page.on('framenavigated',observe);
        await page.evaluate(async()=>{if(!await NRUpdateCoordinator.prepare())throw Error('Update preparation busy');const r=await navigator.serviceWorker.getRegistration();r.waiting.postMessage({type:'SKIP_WAITING'});});
        await waitForWaiting(page,false);
        assert.equal(navigations,0,'worker activation without a local user request must not reload');page.off('framenavigated',observe);
        await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.locator('#pwaUpdateBar button').click()]);
      }
    } catch(error) {
      const diagnostics={trigger,restart,lifecycle,registration:await bounded(page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {waiting:r.waiting?.state,active:r.active?.state,reloading:window._swReloading}})).catch(e=>({error:String(e)})),workers:[]};
      for(const worker of ctx.serviceWorkers())try{diagnostics.workers.push(await bounded(worker.evaluate(()=>({version:typeof CACHE_VERSION==='undefined'?null:CACHE_VERSION,pending:[...(self.__upgradePending||[])],events:self.__upgradeEvents,skipWaiting:self.__upgradeSkipWaiting,now:Date.now()}))))}catch(e){diagnostics.workers.push({error:String(e)})}
      fs.writeFileSync(path.join(out,'FAILURE.json'),JSON.stringify(diagnostics,null,2));console.error('CSS_UPGRADE_DIAGNOSTICS',JSON.stringify(diagnostics));throw error;
    }
    await waitForWaiting(page,false);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await waitForSingleCache(page);
    const activatedVersion=await activeVersion(page);
    if(trace){const workers=[];for(const worker of ctx.serviceWorkers())try{workers.push(await bounded(worker.evaluate(()=>({version:typeof CACHE_VERSION==='undefined'?null:CACHE_VERSION,pending:[...(self.__upgradePending||[])],skipWaiting:self.__upgradeSkipWaiting}))))}catch(e){workers.push({error:String(e)})}fs.writeFileSync(path.join(out,'SKIP_WAITING_TRACE.json'),JSON.stringify(workers,null,2));}
    assert.equal(activatedVersion,expectedVersion,'new worker must actually activate');
    assert.equal(otherNavigations,0,'updating one tab must preserve the other app tab');
    assert.equal(journalNavigations,0,'updating one tab must preserve the journal');
    assert.equal(await main.evaluate(()=>window.__updateCanary),'unsaved main tab');
    assert.equal(await journal.locator('#note').inputValue(),'unsaved upgrade fixture');
    const preservedTabs={otherNavigations,journalNavigations,unsaved_state_preserved:true};
    await ctx.setOffline(true);await checkPage(page,'classic.html?channel=play#today',INDEX_STYLES);await checkPage(journal,'day_summary.html',1);await checkPage(main,'index.html?channel=play#today',18);
    await page.waitForFunction(()=>[...document.querySelectorAll('#nrRuntimeState,#swStaleBar')].every(el=>!/[А-Яа-яІіЇїЄєҐґ]/u.test(el.textContent)));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,'offline_updated_today.png'),fullPage:true});
    fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify({...preservedTabs,trigger,trace,cdp:cdpEnabled,restart:restart||null,oldVersion,activatedVersion,old_css_probe_reproduced:true,new_html_ignores_old_css:true,waiting_worker_offline:true,updated_worker_offline:true,inline_blocks:27,source_css_exact:true},null,2));
    console.log('PASS CSS upgrade ('+trigger+(trace?', trace':'')+(cdpEnabled?', cdp':'')+'): old cached styles reproduced; exact new styles online, waiting/offline and activated/offline. Evidence: '+out);
  }finally{fs.writeFileSync(path.join(out,'LIFECYCLE.json'),JSON.stringify(lifecycle,null,2));if(serverLog)fs.writeFileSync(path.join(out,'SERVER_REQUESTS.json'),JSON.stringify({worker_modified:trace,cdp:cdpEnabled,requests},null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
