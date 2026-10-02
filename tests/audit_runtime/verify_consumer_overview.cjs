const fs=require('fs'),path=require('path'),assert=require('assert/strict'),http=require('http'),vm=require('vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),api=require('../../consumer_authority_v1.js');
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/consumer_feed_20261002.json')));
const rows=feed.days;const now=Date.parse(rows['2026-10-02'].channels.source_formula.generated_at)+1000;
const checks=[];
for(const date of ['2026-10-02','2026-10-11','2026-10-20','2026-10-22','2026-10-23','2026-10-25','2026-10-26']){
 const r=api.resolve(rows[date],date,now),c=rows[date]?.channels.source_formula;
 assert.equal(r.score,c?.available===true?c.value:null);checks.push({date,score:r.score,state:r.state});
}
const row=rows['2026-10-02'],stamp=Date.parse(row.channels.source_formula.generated_at);
assert.equal(api.resolve(row,row.date,stamp+8*3600000).available,true);
assert.equal(api.resolve(row,row.date,stamp+8*3600000+1).state,'stale');
assert.equal(api.resolve(row,row.date,stamp-1).state,'invalid');
assert.equal(api.resolve(row,row.date,now,true).state,'offline');
for(const bad of [null,'3',false,4,1.5]){const x=structuredClone(row);x.channels.source_formula.value=bad;assert.equal(api.resolve(x,row.date,now).score,null);}
const text=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1]);}
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file.endsWith(path.sep))file+='index.html';if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(file===path.join(root,'INDEPENDENT_FORECAST_FEED_v1.json'))file=path.join(__dirname,'fixtures/consumer_feed_20261002.json');fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{})});try{
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Kyiv',serviceWorkers:'allow'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date(now)});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/?channel=play');
 await page.waitForFunction(()=>typeof window.fp463RenderIndependentForecasts==='function');
 await page.evaluate(()=>window.fp469LoadConsumerForecast());
 await page.waitForTimeout(1000); console.log(JSON.stringify(await page.evaluate(()=>({score:document.getElementById('nrCoverDecisionScore')?.textContent,panel:window.__independentPanelState,render:window.__lastProductRender,summary:document.getElementById('nrOwnForecastToday')?.textContent}))),errors); await page.waitForFunction(()=>document.getElementById('nrCoverDecisionScore')?.textContent==='+3',{},{timeout:5000});
 const browserRows=await page.evaluate(dates=>dates.map(ds=>{const r=fp469ConsumerForDate({ds});return{date:ds,score:r.consumer.score,state:r.consumer.state,title:r.presentation.title}}),checks.map(x=>x.date));
 for(let i=0;i<checks.length;i++)assert.equal(browserRows[i].score,checks[i].score);
 assert.equal(await page.locator('#nrCoverScore').textContent(),'+3');
 const overview=page.locator('[data-overview="today"]');
 await overview.waitFor();assert.equal(await overview.locator('.nr-o-score').textContent(),'+3');
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});assert(await overview.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  const small=await overview.locator('button').evaluateAll(bs=>bs.filter(b=>b.getBoundingClientRect().width<44||b.getBoundingClientRect().height<44).length);assert.equal(small,0);
 }
 await page.setViewportSize({width:390,height:900});
 await overview.locator('.nr-o-calendar summary').click();const day=overview.locator('.nr-o-days [data-day="2026-10-11"]');await day.focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.day),'2026-10-11');
 assert.equal(await overview.locator('select').inputValue(),'2026-10-11');
 assert.equal(await overview.locator('.nr-o-score').textContent(),'+3');
 assert((await overview.locator('.nr-o-reference p').textContent()).includes('джерело: 0'));
 await overview.locator('select').selectOption('2026-10-25');assert.equal(await overview.locator('.nr-o-score').textContent(),'—');
 await overview.locator('select').selectOption('2026-10-02');
 await page.emulateMedia({colorScheme:'dark'});const dark=await overview.evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.emulateMedia({colorScheme:'light'});assert.notEqual(await overview.evaluate(el=>getComputedStyle(el).backgroundColor),dark);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'overview-integrated.png'),fullPage:false});
 await page.evaluate(()=>fp434Go('calendar',false));const calendar=page.locator('[data-overview="calendar"]');await calendar.locator('select').selectOption('2026-10-20');assert.equal(await calendar.locator('.nr-o-score').textContent(),'+3');
 await page.evaluate(()=>fp434Go('forecast',false));await page.locator('[data-overview="forecast"] select').selectOption('2026-10-22');assert.equal(await page.locator('[data-overview="forecast"] .nr-o-score').textContent(),'0');
 await page.evaluate(()=>fp434Go('today',false));
 await page.evaluate(()=>navigator.serviceWorker.register('./sw.js'));await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.evaluate(()=>fp469LoadConsumerForecast());
 await page.context().setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
 try{await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-o-state')?.textContent.includes('Офлайн'),{},{timeout:15000});}catch(e){console.log('OFFLINE_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({online:navigator.onLine,now:new Date().toISOString(),url:location.href,state:document.querySelector('[data-overview="today"] .nr-o-state')?.textContent,consumer:window.fp469ConsumerForDate?.({ds:'2026-10-02'})?.consumer,loader:typeof window.fp469LoadConsumerForecast,body:document.body.innerText.slice(0,350)}))),errors);throw e;}
 assert.equal(await page.locator('[data-overview="today"] .nr-o-score').textContent(),'+3');
 await page.context().setOffline(false);await page.evaluate(()=>fp469LoadConsumerForecast());
 await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-o-state')?.textContent.includes('Дані актуальні'));
 await page.clock.setFixedTime(new Date(stamp+8*3600000+1));await page.evaluate(()=>NRConsumerOverview.update());
 assert.equal(await page.locator('[data-overview="today"] .nr-o-score').textContent(),'—');assert((await page.locator('[data-overview="today"] .nr-o-state').textContent()).includes('застаріли'));
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'CHECK.json'),JSON.stringify({status:'PASS',scope:'Local candidate with real service worker, fixed snapshot time; not live or Android acceptance',overviewChecks:['4 widths','44px targets','keyboard focus','conflict and missing','dark mode','calendar and forecast consistency','warm offline reload','online recovery','stale 8h boundary'],checks,browserRows,errors},null,2));console.log('PASS consumer contract, boundary values, syntax, browser hero and seven dates');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
