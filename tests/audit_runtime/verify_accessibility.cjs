const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/index.html?channel=play');await page.waitForFunction(()=>typeof window.fp463CanonicalForDate==='function');

 const results=[];
 await page.setViewportSize({width:320,height:740});
 for(const route of ['today','concept','plan','forecast','calendar','more','profile','match','panch','categories','reports','expert']){
 console.log('Checking route',route);await page.evaluate(r=>fp434Go(r,true),route); await page.waitForFunction(()=>document.activeElement===document.querySelector('.nr-route.active h1'));
 const snapshot=await page.locator('.nr-route.active').ariaSnapshot();
 const facts=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,focus:document.activeElement?.outerHTML.slice(0,200)}));
 const unnamed=snapshot.split('\n').filter(l=>/^\s*- (button|link|textbox|combobox|checkbox|slider|spinbutton)(:|\s*\[|\s*$)/.test(l));
 assert.equal(facts.overflow,0,route+' horizontal overflow');assert.equal(unnamed.length,0,route+' unnamed accessible control');results.push({route,...facts,unnamed});
 }
 await page.evaluate(()=>fp434Go('today',true));await page.waitForFunction(()=>document.activeElement===document.querySelector('.nr-route.active h1'));await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
 const skip=await page.evaluate(()=>({id:document.activeElement?.id,tag:document.activeElement?.tagName}));
 assert.equal(skip.id,'mainContent','skip link moves keyboard focus');fs.writeFileSync(path.join(__dirname,'ACCESSIBILITY_RESULTS.json'),JSON.stringify({results,skip},null,2));console.log('PASS 12 route focus/AX/reflow checks and skip link');
 await page.screenshot({path:path.join(__dirname,'accessibility_mobile320.png'),fullPage:false});
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
