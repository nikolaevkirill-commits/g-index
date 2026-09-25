const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');const assert=require('assert/strict');const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(f===root)f=path.join(root,'index.html');if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':'application/json');res.end(fs.readFileSync(f))}catch(e){res.writeHead(404).end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...resolveBrowserOptions()});try{const page=await browser.newPage({serviceWorkers:'block',timezoneId:'Europe/Kyiv'});const base='http://127.0.0.1:'+server.address().port;await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/?channel=play',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof window.fp463CanonicalForDate==='function');
const results=await page.evaluate(()=>{
 const out={};const date=new Date('2026-10-02T12:00:00Z'),ds=fmtDate(date);_computeAiCache.clear();
 const saved=eventIndex.get(ds);eventIndex.set(ds,[]);const before=computeAi(date,2);eventIndex.set(ds,[{name:'audit fixture',weight:2,source:'ICS'}]);const cached=computeAi(date,2),fresh=_computeAiRaw(date,2);
 out.event_refresh={before:before.ei,cached:cached.ei,fresh:fresh.ei,pass:cached.ei===fresh.ei};if(saved)eventIndex.set(ds,saved);else eventIndex.delete(ds);
 const savedE=eclipsesByYear.get(2026);eclipsesByYear.set(2026,new Map());_computeAiCache.clear();const eb=computeAi(date,2);eclipsesByYear.set(2026,new Map([[ds,'total_solar']]));const ec=computeAi(date,2),ef=_computeAiRaw(date,2);out.eclipse_refresh={before:eb.Mi,cached:ec.Mi,fresh:ef.Mi,pass:ec.Mi===ef.Mi};eclipsesByYear.set(2026,savedE);_computeAiCache.clear();
 const today=todayKyivStr();out.missing_calendar= [null,'',false,0].map(G=>{const row=window.fp463BuildCalendarFrame([{ds:today,G}],today,1)[0];return{input:G,missing:row._missing,hasRaw:row._hasRaw}});
 const originalEngine=getEngineScore;getEngineScore=()=>({eng:1});window.__referenceSourceState={stale:false};const next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const nextDs=next.toISOString().slice(0,10);_futureKp={...(typeof _futureKp==='object'?_futureKp:{}),[nextDs]:{kp:null,kp_synthetic:false,source:'NOAA_fixture'}};const c=window.fp463CanonicalForDate({ds:nextDs,G:1,_calendarOffset:1});out.null_future_kp={official:c.official,kp:c.kp,decisionAvailable:c.presentation.available};getEngineScore=originalEngine;
 out.kp_out_of_range=[-1,0,9,10].map(k=>({kp:k,term:kpDayTerm(k),Li:_computeAiRaw(date,k).Li}));
 const oldDst=window._lastDst;const d=new Date(today+'T12:00:00Z');window._lastDst={dst:-110,time:'2000-01-01T00:00:00Z'};out.stale_dst={Di:_computeAiRaw(d,2).Di,tip:_computeAiRaw(d,2).diTip};window._lastDst=oldDst;
 out.sum_grid={cases:0,nonfinite:0,maxDisplayedComponentRoundingDelta:0};
 for(const year of [2025,2026])for(let day=0;day<365;day+=7)for(const k of [0,2,4,5,7,9]){const d=new Date(Date.UTC(year,0,1+day,12));const a=_computeAiRaw(d,k);const componentSum=a.Li+a.Mi+a.ei+a.Pi+a.Di;out.sum_grid.cases++;if(!Number.isFinite(a.Ai))out.sum_grid.nonfinite++;else out.sum_grid.maxDisplayedComponentRoundingDelta=Math.max(out.sum_grid.maxDisplayedComponentRoundingDelta,Math.abs(a.Ai-componentSum));}
 const y26=eclipsesByYear.get(2026),y27=eclipsesByYear.get(2027);eclipsesByYear.set(2026,new Map([['2026-06-01','total_solar']]));eclipsesByYear.set(2027,new Map([['2027-01-01','total_solar']]));out.eclipse_year_boundary={dec31:computeMiFromEclipses(new Date('2026-12-31T12:00:00Z')).Mi,jan1:computeMiFromEclipses(new Date('2027-01-01T12:00:00Z')).Mi,expectedDec31FromWindow:-3};eclipsesByYear.set(2026,y26);if(y27)eclipsesByYear.set(2027,y27);else eclipsesByYear.delete(2027);
 const oldLat=_userLat,oldLon=_userLon;_userLat=50.45;_userLon=30.52;window.__panchMemo={};const pa=computePanchanga(date);_userLat=40.71;_userLon=-74.01;const pc=computePanchanga(date);window.__panchMemo={};const pf=computePanchanga(date);out.location_panchanga_cache={before:pa.rahu,cached:pc.rahu,fresh:pf.rahu,pass:JSON.stringify(pc.rahu)===JSON.stringify(pf.rahu)};_userLat=oldLat;_userLon=oldLon;window.__panchMemo={};
 const nightDate=new Date('2026-09-22T00:00:00Z'),solar=calcSunTimes(nightDate),prev=new Date(nightDate.getTime()-86400000);const hour=0,slotNight=Math.floor((hour+24-solar.ssH)/(solar.nightLen/12));const expected=HORA_ORDER[(HORA_DAY_LORD[localWeekday(prev)]+12+slotNight)%7];out.hora_before_sunrise={actual:calcHora(nightDate).planet,expectedPreviousDayLord:expected,sunriseUTC:solar.srH,pass:calcHora(nightDate).planet===expected};
 out.hora_grid={slots:0,helper_cases:0,timeline_renders:0,failures:[]};
 for(const ds of ['2026-03-28','2026-03-29','2026-09-22','2026-10-25']){
   const d=new Date(ds+'T12:00:00Z'),all=calcAllHoras(d),midnight=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
   renderHoraTimeline(d,2,0);out.hora_grid.timeline_renders++;
   for(let i=0;i<all.slots.length;i++){
     const slot=all.slots[i],middle=new Date(midnight+(slot.startH+slot.endH)*1800000),h=calcHora(middle);out.hora_grid.slots++;
     const helper=_getCurrentHoraForAi(middle);out.hora_grid.helper_cases++;
     if(!helper||helper.planet!==slot.planet||helper.pcl!==HORA_SCORE_MAP[slot.planet]||!helper.sym||!HORA_COLORS[slot.planet])out.hora_grid.failures.push({ds,i,reason:"Hora helper/score/color mismatch"});
     if(h.planet!==slot.planet||h.endMs<=middle.getTime()||Math.abs(h.endMs-(midnight+slot.endH*3600000))>1)out.hora_grid.failures.push({ds,i,slot,h});
     if(i&&Math.abs(slot.startH-all.slots[i-1].endH)>1e-8)out.hora_grid.failures.push({ds,i,reason:'gap'});
   }
 }
 const snapshots=_engineScores,overrides=_expertOverrides,calc=_expertCalc;
 _expertOverrides={};_expertCalc={};out.frozen_read_gate=[];
 for(const kp of [null,'',false,-1,10,0,2]){_engineScores={[ds]:{eng:2,kp}};out.frozen_read_gate.push({kp,available:!!getEngineScore(date)})}
 _engineScores={[ds]:{eng:2,kp:2,_frozenInputKp:null}};out.frozen_invalid_not_repaired_by_display= getEngineScore(date)===null;
 _expertOverrides={[ds]:{expert_eng:1,verified:true,source_pdf:'fixture.pdf',verified_by_pdf_reading:true,source_sha256:'a'.repeat(64)}};_engineScores={[ds]:{eng:2,kp:null}};
 out.verified_pdf_independent=getEngineScore(date)?.eng===1;
 _engineScores=snapshots;_expertOverrides=overrides;_expertCalc=calc;
 const savedEntry=getEngineScore,savedWWV=lastWWV,savedUi=window.__uiState,savedDst=window._lastDst;
 getEngineScore=()=>({eng:1,_expertOverrideVerified:true});lastWWV={kNow:1,ts:Date.now()-60000};window.__uiState={gNow:1};
 out.dst_lifecycle=[];
 for(const sample of [{dst:-110,time:new Date(Date.now()-60000).toISOString()},{dst:-110,time:'2000-01-01T00:00:00Z'},{dst:-110,time:new Date().toISOString(),_cached:true},{dst:-110}]){
   window._lastDst=sample;const a=computeAi(d,2),sig=resolveDaySignal_v88825(d,1,1,{isToday:true});out.dst_lifecycle.push({fresh:_dstProvenanceCheck().ok,Di:a.Di,available:sig.decisionAvailable,policy:sig.actionPolicy});
 }
 getEngineScore=savedEntry;lastWWV=savedWWV;window.__uiState=savedUi;window._lastDst=savedDst;
 return out;
});
assert.equal(results.event_refresh.pass,true,'ICS update invalidates Ai cache');
assert.equal(results.eclipse_refresh.pass,true,'eclipse update invalidates Ai cache');
for(const r of results.missing_calendar){assert.equal(r.missing,r.input!==0,'missing raw stays missing');assert.equal(r.hasRaw,r.input===0,'real zero retained');}
assert.equal(results.null_future_kp.official,false,'null Kp not official');
assert.equal(results.null_future_kp.decisionAvailable,false,'missing future Kp blocks action');
assert.equal(results.stale_dst.Di,0,'stale Dst not scored');
assert.equal(results.sum_grid.nonfinite,0);assert.ok(results.sum_grid.maxDisplayedComponentRoundingDelta<0.051);
assert.equal(results.eclipse_year_boundary.dec31,-3);
assert.equal(results.location_panchanga_cache.pass,true);
assert.equal(results.hora_before_sunrise.pass,true);
assert.equal(results.sum_grid.cases,636);assert.equal(results.hora_grid.helper_cases,96);assert.equal(results.hora_grid.timeline_renders,4);assert.equal(results.hora_grid.slots,96);assert.deepEqual(results.hora_grid.failures,[]);
for(const r of results.kp_out_of_range)assert.equal(Number.isFinite(r.term),r.kp>=0&&r.kp<=9);
for(const r of results.frozen_read_gate)assert.equal(r.available,r.kp===0||r.kp===2);
assert.equal(results.verified_pdf_independent,true);
assert.equal(results.frozen_invalid_not_repaired_by_display,true);
for(const r of results.dst_lifecycle){assert.equal(r.Di,r.fresh?-2:0);assert.equal(r.available,r.fresh);if(!r.fresh)assert.equal(r.policy,'dst_unavailable');}
fs.writeFileSync(__dirname+'/FORMULA_SYNC_RESULTS.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
