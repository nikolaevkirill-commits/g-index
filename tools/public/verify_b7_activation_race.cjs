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
const srv=http.createServer((q,s)=>{const name=decodeURIComponent(new URL(q.url,'http://x').pathname).slice(1)||'classic.html';
 if(name==='race.html'){s.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return s.end(page)}
 if(name==='sw.js'){s.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return s.end(phase==='old'?sw:sw.replace(/const CACHE_VERSION = '[^']+'/,"const CACHE_VERSION = 'b7-race-new'"))}
 const f=path.resolve(root,name);if(!f.startsWith(root+path.sep)){s.writeHead(403);return s.end()}
 fs.readFile(f,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':types[path.extname(name)]||'application/octet-stream','cache-control':'no-store'});s.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const results=[];
 for(let i=0;i<runs;i++){phase='old';const b=await chromium.launch();try{const c=await b.newContext();const p=await c.newPage();
  await p.goto('http://127.0.0.1:'+srv.address().port+'/race.html');await p.evaluate(()=>Promise.race([window.ready,new Promise((_,j)=>setTimeout(()=>j(Error('ready timeout')),20000))]));
  if(multi){const other=await c.newPage();await other.goto('http://127.0.0.1:'+srv.address().port+'/race.html');await other.evaluate(()=>window.ready);await other.evaluate(()=>window.storm());}
  phase='new';await p.evaluate(async()=>{await _swReg.update()});await p.waitForFunction(()=>!!_swReg.waiting,null,{timeout:60000});await p.waitForTimeout(1000);
  await p.evaluate(()=>{window.storm();window.t0=Date.now();pwaReload();});
  const ok=await p.waitForFunction(()=>window.changed!==null,null,{timeout:8000}).then(()=>true,()=>false);
  results.push(ok?await p.evaluate(()=>window.changed):null);}finally{await b.close()}}
 srv.close();const stuck=results.filter(x=>x===null).length;
 console.log(JSON.stringify({entry,multi,runs,stuck,activation_ms:results}));
 assert.equal(stuck,0,'B7: activation lost after SKIP_WAITING during subresource fetches ('+stuck+'/'+runs+')');
 console.log('PASS B7 activation race: '+runs+'/'+runs+' activated with background fetches, production pwaReload and sw.js');
})().catch(e=>{console.error(e.message);process.exit(1)});
