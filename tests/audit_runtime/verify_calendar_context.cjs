'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),http=require('http');
const {chromium}=require('playwright');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const api=require('../../calendar_context_v1.js'),root=path.resolve(__dirname,'../..');
const source=require('../../tools/read_runtime_source.cjs')(require('path').resolve(__dirname,'../..'));
const block=source.slice(source.indexOf('const RETRO_COVERAGE'),source.indexOf('// Планети: реальні орбітальні періоди'));
const box={window:{}};vm.runInNewContext(block+';window.ephemeris={coverage:RETRO_COVERAGE,periods:RETRO_PERIODS};',box);
const ephemeris=JSON.parse(JSON.stringify(box.window.ephemeris));
const start=Date.parse('2026-10-03T07:15:53Z'),end=Date.parse('2026-11-14T00:27:27Z');
assert.equal(api.context(ephemeris,'2026-10-02',start-86400000).state,'upcoming');
assert.equal(api.context(ephemeris,'2026-09-18',start).state,'none');
assert.equal(api.context(ephemeris,'2026-09-19',start).state,'upcoming');
for(const [ds,at,current] of [['2026-10-03',start-1,'before'],['2026-10-03',start,'active'],['2026-11-14',end-1,'active'],['2026-11-14',end,'after']]){
 const c=api.context(ephemeris,ds,at);assert.equal(c.current,current);assert.equal(c.scoreAdjustment,0);
}
assert.equal(api.context(ephemeris,'2026-10-25',start).state,'period');
assert.equal(api.context(ephemeris,'2026-11-15',end+86400000).state,'none');
for(const ds of ['2026-02-30','x',null,'2028-01-01','2024-01-01','2024-12-01'])assert.equal(api.context(ephemeris,ds,start).state,'unknown');
assert.equal(api.context(null,'2026-10-03',start).state,'unknown');
const damaged=structuredClone(ephemeris);damaged.periods.Venus[0]=['bad','bad'];assert.equal(api.context(damaged,'2026-10-03',start).state,'unknown');
const html=api.markup(ephemeris,'2026-10-03','love',start);
assert(html.includes('10:15')&&html.includes('02:27'),'Kyiv summer/winter offsets');
assert(html.includes('межі')&&html.includes('не додає бала'));
assert(api.markup(ephemeris,'2026-10-03','money',start).includes('умови повернення'));
assert(api.markup(ephemeris,'2026-10-03','business',start).includes('відповідальність'));
for(const category of ['sport','health','unknown','__proto__'])assert.equal(api.markup(ephemeris,'2026-10-03',category,start),'');
assert.equal(api.markup(ephemeris,'2026-11-15','general',end+86400000),'');
for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
const feed=fs.readFileSync(path.join(__dirname,'fixtures/consumer_feed_20261002.json'));
const at=Date.parse(JSON.parse(feed).days['2026-10-02'].channels.source_formula.generated_at)+1000;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const b=file.endsWith('INDEPENDENT_FORECAST_FEED_v1.json')?feed:fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/json');res.end(b);}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',serviceWorkers:'allow'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date(at)});
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/?channel=play');await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-calendar-context'));
 await page.evaluate(()=>fp469LoadConsumerForecast());
 const overview=page.locator('[data-overview="today"]'),context=overview.locator('.nr-calendar-context');
 assert.equal(await context.getAttribute('data-context-state'),'upcoming');
 await overview.locator('select').selectOption('2026-10-03');
 assert.equal(await context.getAttribute('data-context-date'),'2026-10-03');
 assert((await context.textContent()).includes('Цього дня починається'));
 const score=await overview.locator('.nr-o-score').textContent();
 // The existing fixed fixture precedes Kp v2; preserve its +1, not today's live -1.
 assert.equal(JSON.parse(feed).days['2026-10-03'].channels.source_formula.value,1);
 assert.equal(score,'+1');
 await context.locator('summary').focus();await page.keyboard.press('Enter');assert(await context.locator('details').getAttribute('open')!==null);
 await page.evaluate(()=>NRConsumerOverview.update());assert(await context.locator('details').getAttribute('open')!==null);assert.equal(await overview.locator('.nr-o-score').textContent(),score);
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert(await context.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:1000});await context.screenshot({path:path.join(__dirname,'calendar_context_mobile.png')});
 for(const id of ['love','money','business','health','sport']){
  await page.evaluate(id=>{fp434Go('categories',false);fp434UnlockCategory(id);},id);
  assert.equal(await page.locator('#nrCategoryDetail .nr-calendar-context').count(),['love','money','business'].includes(id)?1:0);
 }
 await page.evaluate(()=>{fp434UnlockCategory('love');});
 await page.locator('#nrCategoryDetail .nr-calendar-context summary').click();
 await page.locator('#nrCategoryDetail').screenshot({path:path.join(__dirname,'calendar_context_category.png')});
 await page.clock.setFixedTime(new Date(start-1));await page.evaluate(()=>NRConsumerOverview.update());
 assert.equal(await page.locator('#nrCategoryDetail').isVisible(),false,'old daily selection expires');
 await page.evaluate(()=>{fp434Go('today',false);NRConsumerOverview.update();});
 assert((await context.textContent()).includes('ще не почався'));
 await page.clock.setFixedTime(new Date(start));await page.evaluate(()=>NRConsumerOverview.update());assert((await context.textContent()).includes('Зараз період триває'));
 await page.clock.setFixedTime(new Date(end));await page.evaluate(()=>NRConsumerOverview.update());assert((await context.textContent()).includes('уже завершився'));
 await page.clock.setFixedTime(new Date('2027-01-03T12:00:00Z'));await page.evaluate(()=>NRConsumerOverview.update());assert.equal(await context.getAttribute('data-context-state'),'unknown');
 await page.clock.setFixedTime(new Date(at));await page.evaluate(()=>NRConsumerOverview.update());
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.context().setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-calendar-context'));
 assert.equal(await context.getAttribute('data-context-state'),'upcoming');
 await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-o-state')?.textContent.includes('Офлайн'));
 await page.context().setOffline(false);await page.evaluate(()=>fp469LoadConsumerForecast());
 await page.waitForFunction(()=>document.querySelector('[data-overview="today"] .nr-o-state')?.textContent.includes('Дані актуальні'));
 assert.deepEqual(errors,[]);
 const result={status:'PASS',scope:'Local candidate; fixed fixture clock, real service worker',checks:['station boundaries','Kyiv DST','14-day upcoming','none/unknown/invalid','category mapping','no score change','all inline script syntax','device timezone independence','date selection','keyboard and disclosure persistence','320/390/768/1280 layout','day rollover','offline reload and recovery'],errors};
 fs.writeFileSync(path.join(__dirname,'CALENDAR_CONTEXT_RESULTS.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
