'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),http=require('http');
const {chromium}=require('playwright'),{resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..'),html=require('../../tools/read_runtime_source.cjs')(require('path').resolve(__dirname,'../..'));
const code=html.slice(html.indexOf('function withTimeout('),html.indexOf('// v88.8.35-fp56-P8: lightweight JSON sniff'));
const blocked=['https://www.sidc.be/SILSO/DATA/SN_d_tot_V2.0.csv','https://sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv','https://www.gi.alaska.edu/monitors/aurora-forecast'];
function decoded(s){for(let i=0;i<3;i++){try{const n=decodeURIComponent(s);if(n===s)break;s=n;}catch{break;}}return s;}
const forbidden=u=>/(?:https?:)?\/\/(?:www\.)?(?:sidc\.be|gi\.alaska\.edu)\.?[:/?#]/i.test(decoded(u));
const calls=[],c={window:{GINDEX_PLAY_CHANNEL:true},NOAA_WORKER_URL:'https://worker.test/?url=',fetch:async u=>{calls.push(u);return {ok:true,text:async()=> 'payload'};},AbortController,DOMException,Promise,setTimeout,clearTimeout,console};
vm.createContext(c);vm.runInContext(code,c);
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://local').pathname;const p=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{
 for(const u of blocked){for(const target of [u,u.toUpperCase(),'https://worker.test/?url='+encodeURIComponent(u),'https://proxy.test/?q='+encodeURIComponent(encodeURIComponent(u))])await assert.rejects(c.fetchTextWithCORS(target),/PLAY_SOURCE_POLICY/);}
 assert.deepEqual(calls,[],'blocked before any direct or proxy fetch');
 assert.equal(await c.fetchTextWithCORS('SILSO_REFRESH_STATUS_v1.json',undefined,{directOnly:true}),'payload');assert.equal(calls.at(-1),'SILSO_REFRESH_STATUS_v1.json');
 for(const u of ['https://services.swpc.noaa.gov/test','https://kp.gfz.de/test']){assert.equal(await c.fetchTextWithCORS(u),'payload');}
 c.window.GINDEX_PLAY_CHANNEL=false;for(const u of blocked)assert.equal(await c.fetchTextWithCORS(u),'payload');
 assert.equal(calls.filter(forbidden).length,3,'web fallbacks remain functional');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Europe/Kyiv'});
 const page=await context.newPage(),requests=[],errors=[];let snapshot=true;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 const feed=fs.readFileSync(path.join(__dirname,'fixtures/consumer_feed_20261002.json'),'utf8'),at=Date.parse(JSON.parse(feed).days['2026-10-02'].channels.source_formula.generated_at)+1000;
 await page.clock.install({time:new Date(at)});
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());
  if(!u.href.startsWith(base))return r.fulfill({status:503,body:'source unavailable'});
  if(u.pathname==='/SILSO_REFRESH_STATUS_v1.json')return r.fulfill({status:snapshot?200:503,contentType:'application/json',body:JSON.stringify({status:'PASS',generated_at_utc:new Date(at).toISOString(),latest_observation:{sn:123,date:'2026-10-01',provisional:true}})});
  if(u.pathname==='/future_kp.json')return r.fulfill({status:503,body:'unavailable'});
  if(u.pathname==='/INDEPENDENT_FORECAST_FEED_v1.json')return r.fulfill({contentType:'application/json',body:feed});
  return r.continue();
 });
 await page.goto(base+'/?channel=play');await page.waitForFunction(()=>typeof runDataRefresh==='function'&&window.NRConsumerOverview);
 await page.evaluate(()=>runDataRefresh('privacy-test-valid-snapshot'));
 assert.equal(await page.evaluate(()=>window._lastWolfSn?.sn),123);
 assert((await page.locator('#nowSn').textContent()).includes('123'));
 const same=await page.evaluate(()=>fetchWolfSnResilient());assert.equal(same._delivery,'local_snapshot');
 snapshot=false;await page.evaluate(()=>runDataRefresh('privacy-test-outage'));
 assert.equal(await page.evaluate(()=>window._lastWolfSn),null);
 assert.equal(await page.locator('#nowSn').textContent(),'Sn: дані недоступні');
 assert.equal(await page.evaluate(()=>document.getElementById('btnRefresh').disabled),false);
 assert.deepEqual(requests.filter(forbidden),[],'Play boot and refresh outage send no SILSO/UAF requests');
 for(const u of blocked){const error=await page.evaluate(async u=>{try{await fetchTextWithCORS(u);return null;}catch(e){return e.message;}},u);assert(error.includes('PLAY_SOURCE_POLICY'));}
 assert.deepEqual(requests.filter(forbidden),[]);
 await page.evaluate(()=>fp469LoadConsumerForecast());
 assert.equal(await page.locator('[data-overview="today"] .nr-o-score').textContent(),'+3');
 assert.equal(await page.locator('[data-overview="today"] .nr-calendar-context').getAttribute('data-context-state'),'upcoming');
 assert.deepEqual(errors,[]);
 await page.goto(base+'/privacy.html?channel=play');assert((await page.locator('body').textContent()).includes('не виконує прямих або проксійованих запитів'));
 await page.screenshot({path:path.join(__dirname,'play_privacy_mobile.png'),fullPage:true});
 const result={status:'PASS',checks:['direct/encoded/uppercase provider denial before fetch','same-origin snapshot preserved','NOAA/GFZ permitted','web fallback preserved','real browser boot and two full refreshes','local snapshot failure no third-party request','stale Sn label cleared','refresh remains usable','model score and Venus context unchanged','privacy page updated'],forbidden_requests:[],page_errors:errors};
 fs.writeFileSync(path.join(__dirname,'PLAY_SOURCE_PRIVACY_RESULTS.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
