'use strict';
// B7 regression: production pwaReload() during continuous same-origin subresource fetches.
// --multi adds a second active tab; the former single-tab gate stalled in 5/5 local reproductions.
// Production sw.js bytes are used for both versions (only CACHE_VERSION differs); no CDP ServiceWorker domain.
// Usage: node verify_b7_activation_race.cjs [runs=10] [entry=classic.html] [--multi]
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),runs=+process.argv[2]||10,entry=process.argv[3]||'classic.html';
const multi=process.argv.includes('--multi');
const html=fs.readFileSync(path.join(root,entry),'utf8').replace(/\r\n/g,'\n');const a=html.indexOf('function pwaReload() {');assert(a>=0,'pwaReload not found');
const pwaReload=html.slice(a,html.indexOf('\n}',a)+2);const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');let phase='old';
const page=`<!doctype html><meta charset=utf-8><script src="sw_update_coordination_v1.js"></script><div id="pwaUpdateBar"><span></span><button>u</button></div><script>
var _swReg=null;window.NRLocale={language:'uk'};${pwaReload}
window.ready=(async()=>{_swReg=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(x=>navigator.serviceWorker.addEventListener('controllerchange',x,{once:true}));return true})();
window.changed=null;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(window.t0)window.changed=Date.now()-window.t0});
window.storm=()=>setInterval(()=>{fetch('consumer_cloud/final_score_decisions.json',{cache:'no-store'}).then(r=>r.text()).catch(()=>{})},4);
</script>`;
const types={'.js':'application/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.txt':'text/plain'};
// FP569d: precache progress during the update. Under CPU load the 4 ms fetch storm of the second tab starves the
// 195-file install (measured 72–105/195 files after 60 s, completion at 64 s); that is slow install, not lost activation.
const progress={shell:0,storm:0,t0:0};
const srv=http.createServer((q,s)=>{if(phase==='new'){if(q.url.includes('final_score_decisions'))progress.storm++;else progress.shell++;}const name=decodeURIComponent(new URL(q.url,'http://x').pathname).slice(1)||'classic.html';
 if(name==='race.html'){s.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return s.end(page)}
 if(name==='sw.js'){s.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return s.end(phase==='old'?sw:sw.replace(/const CACHE_VERSION = '[^']+'/,"const CACHE_VERSION = 'b7-race-new'"))}
 const f=path.resolve(root,name);if(!f.startsWith(root+path.sep)){s.writeHead(403);return s.end()}
 fs.readFile(f,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':types[path.extname(name)]||'application/octet-stream','cache-control':'no-store'});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const results=[],installMs=[],deferred=[];
 for(let i=0;i<runs;i++){phase='old';const b=await chromium.launch();try{const c=await b.newContext();const p=await c.newPage();
  await p.goto('http://127.0.0.1:'+srv.address().port+'/race.html');await p.evaluate(()=>Promise.race([window.ready,new Promise((_,j)=>setTimeout(()=>j(Error('ready timeout')),20000))]));
  if(multi){const other=await c.newPage();await other.goto('http://127.0.0.1:'+srv.address().port+'/race.html');await other.evaluate(()=>window.ready);await other.evaluate(()=>window.storm());}
  phase='new';Object.assign(progress,{shell:0,storm:0,t0:Date.now()});await p.evaluate(async()=>{await _swReg.update()});
  // The first page may be hidden after opening the second tab. Its animation frames can stop
  // while the service worker continues to install and send controllerchange events.
  try{await p.waitForFunction(()=>!!_swReg.waiting,null,{polling:100,timeout:+(process.env.B7_INSTALL_TIMEOUT_MS||180000)});installMs.push(Date.now()-progress.t0);}
  catch(error){
   const state=await p.evaluate(()=>({visibility:document.visibilityState,installing:_swReg.installing?.state,waiting:_swReg.waiting?.state,active:_swReg.active?.state}));
   console.error('B7 INSTALL_NOT_FINISHED (not an activation failure) — waiting worker not observed',JSON.stringify({...state,precache_requests:progress.shell,storm_requests:progress.storm,elapsed_ms:Date.now()-progress.t0}));
   throw error;
  }
  await p.waitForTimeout(1000);
  // FP569d: record whether pwaReload actually sent SKIP_WAITING. Under CPU load NRUpdateCoordinator.prepare()
  // can return false (peer reads not drained in 2 s); then no activation is requested and the bar offers a retry.
  await p.evaluate(()=>{window.sent=[];const pm=ServiceWorker.prototype.postMessage;ServiceWorker.prototype.postMessage=function(m,...r){if(m&&m.type==='SKIP_WAITING')window.sent.push(Date.now()-window.t0);return pm.call(this,m,...r)};window.storm();window.t0=Date.now();pwaReload();});
  const ok=await p.waitForFunction(()=>window.changed!==null,null,{polling:100,timeout:+(process.env.B7_ACTIVATE_TIMEOUT_MS||8000)}).then(()=>true,()=>false);
  if(!ok)console.error('B7 ACTIVATION_NOT_CONFIRMED',JSON.stringify(await p.evaluate(()=>({visibility:document.visibilityState,installing:_swReg.installing?.state||null,waiting:_swReg.waiting?.state||null,active:_swReg.active?.state||null,controller:!!navigator.serviceWorker.controller}))));
  const sent=(await p.evaluate(()=>window.sent)).length>0;
  if(!ok&&!sent){await p.waitForTimeout(Math.max(0,10500-(+(process.env.B7_ACTIVATE_TIMEOUT_MS||8000))));
   const retry=await p.evaluate(()=>!_swReg.waiting||(document.querySelector('#pwaUpdateBar span')?.textContent||'').includes('ще раз'));
   deferred.push({run:i,retry_offered:retry});results.push('deferred');}
  else results.push(ok?await p.evaluate(()=>window.changed):null);}finally{await b.close()}}
 srv.close();const stuck=results.filter(x=>x===null).length,deferredCount=results.filter(x=>x==='deferred').length;
 console.log(JSON.stringify({entry,multi,runs,stuck,deferred:deferredCount,activation_ms:results,install_ms:installMs}));
 assert(deferred.every(d=>d.retry_offered),'B7: deferred update must offer a retry: '+JSON.stringify(deferred));
 assert.equal(stuck,0,'B7: activation lost after SKIP_WAITING during subresource fetches ('+stuck+'/'+runs+')');
 assert.equal(deferredCount,+(process.env.B7_ALLOW_DEFERRED||0)?deferredCount:0,'B7: coordinator deferred activation in '+deferredCount+'/'+runs+' runs (no SKIP_WAITING sent; retry offered). Set B7_ALLOW_DEFERRED=1 for loaded stress runs.');
 console.log('PASS B7 activation race: '+(runs-deferredCount)+'/'+runs+' activated with background fetches'+(deferredCount?', '+deferredCount+' deferred by the coordinator with a retry offered':'')+', production pwaReload and sw.js');
})().catch(e=>{console.error(e.message);process.exit(1)});
