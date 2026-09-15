const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/index.html?channel=play');await page.waitForFunction(()=>typeof window.fp463CanonicalForDate==='function');
 const result=await page.evaluate(()=>{
 const checks=[];const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name)};
 for(const pair of [['999','999'],['12junk','30'],['','30'],['90','181']]){lsSet('last_geo_lat',pair[0]);lsSet('last_geo_lon',pair[1]);initCachedGeolocation();check(_userLat===50.45&&_userLon===30.52,'reject cached '+JSON.stringify(pair));}
 lsSet('last_geo_lat','0');lsSet('last_geo_lon','0');initCachedGeolocation();check(_userLat===0&&_userLon===0&&_geoSource==='saved','zero coordinates valid and labelled');
 lsSet('last_geo_lat','999');lsSet('last_geo_lon','999');
 Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok,fail){fail({code:1})}}});initGeolocation();check(_userLat===50.45,'denied location rejects invalid cache');
 let renders=0;const old=renderPanchanga;renderPanchanga=()=>renders++;_lastPanchCtx={_geoKey:'old'};_sunRiseSetCache.set('old',{});
 Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok){ok({coords:{latitude:40.7,longitude:-74}})}}});initGeolocation();check(renders===1&&_lastPanchCtx===null&&_sunRiseSetCache.size===0,'location change invalidates and rerenders');renderPanchanga=old;
 const render=_renderFreshnessState;_renderFreshnessState=()=>{};const now=Date.now();
 for(const bad of [now+86400000,0,-1,NaN,'2026-09-15']){updateDataFreshness('audit',bad);check(!_dataFetchTimestamps.audit,'reject timestamp '+String(bad));}
 updateDataFreshness('audit',now-1000);updateDataFreshness('audit',now-2000);check(_dataFetchTimestamps.audit===now-1000,'freshness cannot regress');_renderFreshnessState=render;
 window.__nrSWResourceStates.clear();const event=(type,order,url='/audit.json')=>({type,requestOrder:order,url,fetchedAt:now});
 check(acceptSWDataMessage(event('SW_FRESH_DATA',now)),'fresh accepted');
 check(!acceptSWDataMessage(event('SW_STALE_DATA',now-1)),'late stale rejected');
 check(!acceptSWDataMessage(event('SW_STALE_DATA',now)),'equal order cannot downgrade fresh');
 check(acceptSWDataMessage(event('SW_STALE_DATA',now+1)),'new outage accepted');
 check(acceptSWDataMessage(event('SW_FRESH_DATA',now+2)),'recovery accepted');
 check(!acceptSWDataMessage(event('SW_STALE_DATA',now+1,'/audit.json?fresh=1')),'fresh query shares ordering');
 check(!acceptSWDataMessage(event('SW_FRESH_DATA',now,'https://example.org/a.json')),'cross origin message ignored');
 check(!acceptSWDataMessage({type:'SW_FRESH_DATA',fetchedAt:now}),'missing URL rejected');
 check(!acceptSWDataMessage({...event('SW_FRESH_DATA',now+3),fetchedAt:now+86400000}),'future delivery timestamp rejected');
 return {checks};
 });fs.writeFileSync(path.join(__dirname,'FOLLOWUP_RESULTS.json'),JSON.stringify(result,null,2));console.log('PASS',result.checks.length,'followup browser checks');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
