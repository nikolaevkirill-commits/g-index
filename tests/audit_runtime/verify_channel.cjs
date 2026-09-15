const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';
 if(!/^[\w.-]+$/.test(name)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':'text/html');res.end(fs.readFileSync(path.join(root,name)));}catch(_){res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 const results=[];
 try{
  for(const storageDenied of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'});
   // No live feeds or unrelated product scripts: test actual channel module and legal pages.
   await context.route('**/*',route=>{
    if(!route.request().url().startsWith(base))return route.abort();
    if(new URL(route.request().url()).pathname==='/index.html'){
     const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
     assert(html.indexOf('src="play_channel.js"')<html.indexOf('// fp388:'));
     return route.fulfill({contentType:'text/html',body:'<html><head><script src="play_channel.js"></script></head><body>'+['privacy','terms','account-deletion'].map(n=>`<a href="${n}.html">${n}</a>`).join('')+'</body></html>'});
    }
    return route.continue();
   });
   if(storageDenied)await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new Error('denied')}}));
   const page=await context.newPage();
   for(const doc of ['privacy','terms','account-deletion']){
    await page.goto(base+'index.html?channel=play');
    const href=await page.locator(`a:has-text("${doc}")`).getAttribute('href');
    assert(new URL(href).searchParams.get('channel')==='play');
    // Open copied link in an independent context: no session storage inheritance.
    const other=await browser.newContext({serviceWorkers:'block'});
    const legal=await other.newPage();await legal.goto(href);
    assert.equal(await legal.evaluate(()=>window.GINDEX_PLAY_CHANNEL),true);
    const back=await legal.locator('a[href*="index.html"]').getAttribute('href');
    assert.equal(new URL(back).searchParams.get('channel'),'play');
    await other.close();
    await page.goto(href);await Promise.all([page.waitForURL('**/index.html?channel=play',{waitUntil:'load'}),page.locator('a[href*="index.html"]').click()]);
    assert.equal(await page.evaluate(()=>window.GINDEX_PLAY_CHANNEL),true);
    results.push({doc,storageDenied,returnAndIndependentTab:'PASS'});
   }
   if(!storageDenied){await page.goto(base+'index.html');assert.equal(await page.evaluate(()=>window.GINDEX_PLAY_CHANNEL),true);}
   await context.close();
  }
  const fresh=await browser.newContext({serviceWorkers:'block'});const web=await fresh.newPage();
  await web.goto(base+'privacy.html');assert.equal(await web.evaluate(()=>window.GINDEX_PLAY_CHANNEL),false);await fresh.close();
  fs.writeFileSync(path.join(__dirname,'CHANNEL_RESULTS.json'),JSON.stringify({results,cleanWeb:'PASS',scope:'Actual module/legal pages, isolated shell; no phone network claim'},null,2));
  console.log('PASS channel: 6 return/new-tab cases, denied storage, session persistence, clean web');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
