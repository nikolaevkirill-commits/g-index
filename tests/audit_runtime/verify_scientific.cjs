const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const {chromium}=require('playwright');
const assert=require('assert/strict'); const {resolveBrowserOptions}=require('./browser_options.cjs'); const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(f===root)f=path.join(root,'index.html');if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':'application/json');res.end(fs.readFileSync(f))}catch(e){res.writeHead(404).end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...resolveBrowserOptions()});try{
 const page=await browser.newPage({serviceWorkers:'block',timezoneId:'Europe/Kyiv'}),base='http://127.0.0.1:'+server.address().port;
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/?channel=play',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof computeAi==='function'&&window.Astronomy);
 const result=await page.evaluate(()=>{
  const rows=[],angles=[],perf=[],locations=[['Kyiv',50.45,30.52],['NewYork',40.71,-74.01],['Sydney',-33.87,151.21],['Quito',-0.18,-78.47],['Tokyo',35.68,139.69],['Tromso',69.65,18.96]];
  const distance=(a,b)=>Math.abs(((a-b+540)%360)-180);
  for(let day=0;day<365;day++){
   const d=new Date(Date.UTC(2026,0,1+day,12)),ref=Astronomy.MoonPhase(d),actual=moonPhaseAngle(d);angles.push({date:d.toISOString(),errorDeg:distance(actual,ref),tithiMatch:Math.floor(actual/12)===Math.floor(ref/12)});
  }
  for(const [name,lat,lon] of locations)for(let month=0;month<12;month++){
   const d=new Date(Date.UTC(2026,month,21)),pair=sunRiseSetUTC_Meeus(d,lat,lon),start=new Date(d.getTime()-lon/15*3600000),obs=new Astronomy.Observer(lat,lon,0);
   for(const [kind,dir] of [['sunrise',1],['sunset',-1]]){const ref=Astronomy.SearchRiseSet('Sun',obs,dir,start,1),v=pair[kind];rows.push({name,date:d.toISOString().slice(0,10),kind,actual:Number.isFinite(v.getTime())?v.toISOString():null,reference:ref?ref.date.toISOString():null,errorMinutes:ref&&Number.isFinite(v.getTime())?Math.abs(v-ref.date)/60000:null});}
  }
  const savedEngine=getEngineScore;getEngineScore=()=>({eng:2,_expertOverrideVerified:true});
  _userLat=69.65;_userLon=18.96;
  const polarDate=new Date('2026-06-21T12:00:00Z'),polarPanch=computePanchanga(polarDate),polarAi=computeAi(polarDate,2);
  const polar={hora:calcHora(polarDate),rahu:polarPanch.rahu,Pi:polarAi.Pi,pTip:polarAi.pTip,decisionAvailable:resolveDaySignal_v88825(polarDate,2,2,{}).decisionAvailable};
  _userLat=35.68;_userLon=139.69;
  const eastern=computePanchanga(new Date('2026-06-21T12:00:00Z')).rahu;
  _userLat=50.45;_userLon=30.52;
  const ordinaryDecision=resolveDaySignal_v88825(polarDate,2,2,{}).decisionAvailable;getEngineScore=savedEngine;
  const dates=Array.from({length:27},(_,i)=>new Date(Date.UTC(2026,8,22+i,12)));
  for(let run=0;run<9;run++){_computeAiCache.clear();window.__panchMemo={};let t=performance.now();for(const d of dates)computeAi(d,2);const cold=performance.now()-t;t=performance.now();for(const d of dates)computeAi(d,2);perf.push({cold27Ms:cold,warm27Ms:performance.now()-t});}
  return {solar:rows,lunar:angles,performance:perf,polar,eastern,ordinaryDecision};
 });
 result.indexSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex');
 result.summary={solarCases:result.solar.length,missingMismatch:result.solar.filter(x=>(x.actual===null)!==(x.reference===null)),maxSolarErrorMin:Math.max(...result.solar.map(x=>x.errorMinutes||0)),lunarCases:result.lunar.length,maxPhaseErrorDeg:Math.max(...result.lunar.map(x=>x.errorDeg)),tithiMismatches:result.lunar.filter(x=>!x.tithiMatch),performance:result.performance};
 assert.equal(result.summary.missingMismatch.length,0,'polar no-event matches independent reference');
assert.ok(result.summary.maxSolarErrorMin<1,'sunrise/set error under one minute on declared grid');
assert.ok(result.summary.maxPhaseErrorDeg<0.05,'phase error under declared 0.05 degree tolerance');
assert.ok(result.summary.tithiMismatches.every(x=>x.errorDeg<0.05),'category discrepancy only within angular tolerance');
 assert.equal(result.polar.hora.unavailable,true);assert.equal(result.polar.rahu.start,'—');assert.equal(result.polar.Pi,0);assert.match(result.polar.pTip,/недоступний/);assert.equal(result.polar.decisionAvailable,false);assert.equal(result.ordinaryDecision,true);
for(const window of [result.eastern,result.eastern.yamagandam,result.eastern.gulika])for(const k of ['start','end'])assert.match(window[k],/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/,'UTC clock wraps across midnight');
 fs.writeFileSync(path.join(__dirname,'SCIENTIFIC_RESULTS.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary,null,2));
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});


