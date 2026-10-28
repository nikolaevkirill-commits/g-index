'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'skyrhythm-css-upgrade-'));
let phase='old';
const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    let bytes=fs.readFileSync(file);
    if(phase==='old'&&name==='sw.js')bytes=fs.readFileSync(path.join(__dirname,'fixtures/sw_fp532.js'));
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
let base;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'}),page=await ctx.newPage();
    await page.goto(base+'index.html?channel=play#today');
    await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--css-upgrade-probe').trim()),'old-cache');
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
    await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();r.waiting.postMessage({type:'SKIP_WAITING'});})]);
    await page.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration()).waiting);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await ctx.setOffline(true);await checkPage(page,'index.html?channel=play#today',6);await checkPage(journal,'day_summary.html',1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,'offline_updated_today.png'),fullPage:true});
    fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify({old_css_probe_reproduced:true,new_html_ignores_old_css:true,waiting_worker_offline:true,updated_worker_offline:true,inline_blocks:7,source_css_exact:true},null,2));
    console.log('PASS CSS upgrade: old cached styles reproduced; exact new styles online, waiting/offline and activated/offline. Evidence: '+out);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
