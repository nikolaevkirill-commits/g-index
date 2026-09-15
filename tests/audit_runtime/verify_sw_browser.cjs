const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');let offline=false,revision=1;
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname;
 if(name==='/audit-probe.json'){res.writeHead(offline?503:200,{'Content-Type':'application/json'}).end(JSON.stringify({revision}));return;}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{
 const page=await browser.newPage({serviceWorkers:'allow'});
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/index.html?channel=play');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.waitForFunction(()=>typeof acceptSWDataMessage==='function');
 const fetchProbe=()=>page.evaluate(async()=>{const r=await fetch('/audit-probe.json');return {delivery:r.headers.get('x-gindex-delivery'),body:await r.json()}});
 assert.deepEqual(await fetchProbe(),{delivery:'network',body:{revision:1}});
 offline=true;assert.deepEqual(await fetchProbe(),{delivery:'cached',body:{revision:1}});
 await page.waitForFunction(()=>window.__nrSWResourceStates.get(location.origin+'/audit-probe.json')?.type==='SW_STALE_DATA');
 await page.waitForFunction(()=>document.getElementById('nrRuntimeState')?.classList.contains('is-visible'));
 offline=false;revision=2;assert.deepEqual(await fetchProbe(),{delivery:'network',body:{revision:2}});
 await page.waitForFunction(()=>window.__nrSWResourceStates.get(location.origin+'/audit-probe.json')?.type==='SW_FRESH_DATA');
 await page.waitForFunction(()=>!document.getElementById('nrRuntimeState')?.classList.contains('is-visible'));
 // Replaying a delayed old message through the actual two listeners must not reopen the banner.
 await page.evaluate(()=>{const state=window.__nrSWResourceStates.get(location.origin+'/audit-probe.json');navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'SW_STALE_DATA',url:location.origin+'/audit-probe.json',requestOrder:state.order-1,fetchedAt:Date.now()}}))});
 assert.equal(await page.locator('#nrRuntimeState').evaluate(el=>el.classList.contains('is-visible')),false);
 const result={checks:['actual SW network response','actual SW cached response','outage banner visible','network recovery updates body','recovery banner hidden','late message rejected by actual listeners']};
 fs.writeFileSync(path.join(__dirname,'SW_BROWSER_RESULTS.json'),JSON.stringify(result,null,2));console.log('PASS',result.checks.length,'actual service worker browser checks');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
