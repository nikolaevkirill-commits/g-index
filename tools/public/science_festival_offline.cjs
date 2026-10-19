const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const mime={'.js':'application/javascript','.css':'text/css','.json':'application/json','.html':'text/html; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,s)=>{const f=path.join(root,decodeURI(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]));fs.readFile(f,(e,b)=>{s.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(e?'':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch({headless:true});let report=[];try{
 for(const entry of ['index.html','design-v4.html']){
  const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();await p.goto(base+'/'+entry+'?channel=play#today');
  await p.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('SW_READY_TIMEOUT')),20000))]);});await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller&&SRFestivalEvidence&&document.querySelector('[data-festival-route="today"]'));
  const assets=['festival_decision_engine_v1.js','festival_evidence_v1.js','festival_astronomy_adapter_v1.js','festival_decision_view_v1.js','festival_decision_v1.css'];
  const cached=await p.evaluate(async assets=>{const keys=await caches.keys();return Promise.all(assets.map(async a=>{for(const k of keys){if(await (await caches.open(k)).match(new URL(a,location.href).href))return a;}return null;}));},assets);assert.deepEqual(cached,assets);
  await c.setOffline(true);await p.reload();await p.waitForFunction(()=>window.SRFestivalEvidence&&document.querySelector('[data-festival-route="today"]'));
  const box=p.locator('[data-festival-route="today"]');await box.evaluate(el=>el.open=true);await box.locator('[data-cases]').selectOption('delhi-2028-05');
  const result=await box.evaluate(el=>el._decision.result);assert.ok(result.flags.includes('CONFLICTING_RULES'));assert.ok(result.flags.includes('BOUNDARY_SENSITIVE'));assert.deepEqual(result.decisions.map(x=>x.selected_date),['2028-05-12','2028-05-11',null]);
  const live=await p.evaluate(()=>SRFestivalAstronomy.build({date:'2028-10-29',lat:50.45,lon:30.52,zone:'Europe/Kyiv'}));assert.equal(live.astronomy.engine,'Astronomy Engine 2.1.19');
  report.push({entry,offline:true,cached,selected:result.decisions.map(x=>x.selected_date),liveEngine:live.astronomy.engine});await c.close();
 }
 fs.writeFileSync(path.join(out,'OFFLINE.json'),JSON.stringify({status:'PASS',report},null,2));console.log('PASS offline both entries: 5 assets, archived decisions and live astronomy');
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
