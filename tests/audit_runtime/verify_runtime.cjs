const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/index.html?channel=play');await page.waitForFunction(()=>typeof window.fp463CanonicalForDate==='function');
 const result=await page.evaluate(async()=>{
  const checks=[];const check=(ok,name)=>{if(!ok)throw new Error(name);checks.push(name)};
  const now=Date.now();const set=v=>{lastWWV=v};
  const good={kNow:1,ts:now-3.1*3600000};
  for(const v of [null,{kNow:null},{kNow:1,_cached:true},{kNow:2,_synthetic:true},{kNow:1},{kNow:1,ts:now-9*3600000}]){set(v);check(!currentKpAuthority().usable,'unusable '+JSON.stringify(v));}
  set(good);check(currentKpAuthority().usable,'fresh observed');
  set({kNow:6.67,ts:now-60000,_provisional:true});check(currentKpAuthority().usable&&currentKpAuthority().provisional,'provisional explicitly labelled');
  set({kNow:6,ts:now-31*60000,_provisional:true});check(!currentKpAuthority().usable,'provisional expiry');
  const original=getEngineScore;getEngineScore=()=>({eng:1});
  window.__uiState={...(window.__uiState||{}),gNow:1,kpNow:1};window.__referenceSourceState={stale:false};
  const ds=todayKyivStr(),date=new Date(ds+'T12:00:00Z');
  set(good);const calm=fp463CanonicalForDate({ds,G:1,_calendarOffset:0});check(calm.presentation.available,'calm decision available');
  set({...good,kNow:6.67});const storm=fp463CanonicalForDate({ds,G:1,_calendarOffset:0});check(storm.signal?.dynamicGuard==='kp_storm','storm guard');
  for(const flag of ['_cached','_synthetic']){set({kNow:1,[flag]:true});check(!fp463CanonicalForDate({ds,G:1,_calendarOffset:0}).presentation.available,'canonical rejects '+flag);check(!resolveDaySignal_v88825(date,1,1,{isToday:true}).decisionAvailable,'legacy rejects '+flag);}
  set(good);getEngineScore=()=>({eng:null});check(!resolveDaySignal_v88825(date,1,1,{isToday:false}).decisionAvailable,'null is missing reference');
  getEngineScore=()=>({eng:1});window.__referenceSourceState={stale:true};check(!resolveDaySignal_v88825(date,1,1,{isToday:false}).decisionAvailable,'stale engine unavailable');
  getEngineScore=()=>({eng:1,_expertOverrideVerified:true});check(resolveDaySignal_v88825(date,1,1,{isToday:false}).decisionAvailable,'independent verified PDF survives stale engine');
  window.__referenceSourceState={stale:false};
  const before=fp463CanonicalForDate({ds,G:1,_calendarOffset:0});window.dispatchEvent(new CustomEvent('engine-data-stale',{detail:{url:'chrono_panel.json'}}));
  check(!window.__nrOfflineFallback,'unrelated stale event does not latch transport');check(fp463CanonicalForDate({ds,G:1,_calendarOffset:0}).presentation.available,'decision survives unrelated data fallback');
  const key='nr_canonical_snapshot_fp463_v1',snap=JSON.parse(localStorage.getItem(key));check(!!fp463LoadCanonicalSnapshot(ds),'fresh qualified snapshot');
  localStorage.setItem(key,JSON.stringify({...snap,resolved_at:new Date(now-8*3600000).toISOString()}));check(!fp463LoadCanonicalSnapshot(ds),'reject 8-hour snapshot');
  localStorage.setItem(key,JSON.stringify({...snap,expires_at:new Date(now-1).toISOString()}));check(!fp463LoadCanonicalSnapshot(ds),'reject expired Kp snapshot');
  localStorage.setItem(key,JSON.stringify({...snap,schema:'fp463-canonical-snapshot-v1'}));check(!fp463LoadCanonicalSnapshot(ds),'reject old unqualified snapshot');
  getEngineScore=original;
  _futureKp={test:{kp:4,kp_synthetic:false}};check(window.__nrFutureKp.kp.test.kp===4,'shared Kp store');_futureKp=null;check(!window.__nrFutureKp.kp.test,'invalidation affects canonical immediately');
  const fetchOriginal=window.fetch;let releaseOld,calls=0;
  window.fetch=async()=>{calls++;if(calls===1)return new Promise(r=>releaseOld=r);return {ok:true,json:async()=>({kp:{test:{kp:6}},generated:'new'})};};
  invalidateFutureKp();const pending=loadFutureKp();invalidateFutureKp();await loadFutureKp();releaseOld({ok:true,json:async()=>({kp:{test:{kp:1}},generated:'old'})});await pending;
  check(window.__nrFutureKp.kp.test.kp===6,'old in-flight response cannot overwrite refreshed forecast');window.fetch=fetchOriginal;
  const h={schema:'gindex_system_health_v1',status:'PASS',hard_failures:[],generated_at:new Date().toISOString(),checks:{manifest_age_hours:0,last_completed_live_context_ok:false}};
  set(good);check(nrDataStatusLabel(h,'LIVE',false).state==='warning','failed completed context is visible');
  set({kNow:1,_synthetic:true});h.status='WARN';check(nrDataStatusLabel(h,'LIVE',false).state==='unavailable','WARN cannot conceal missing Kp');
  _renderFreshnessState();check(!document.getElementById('freshnessBadge').textContent.includes('LIVE'),'outage never displays LIVE');
  renderCompetitiveCover();
  return {checks,calm:calm.decisionScore,storm:storm.decisionScore};
 });
 fs.writeFileSync(path.join(__dirname,'RUNTIME_RESULTS.json'),JSON.stringify(result,null,2));console.log('PASS',result.checks.length,'runtime checks');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'outage_mobile.png'),fullPage:false});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
