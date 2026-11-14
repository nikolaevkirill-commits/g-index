'use strict';
// FP572 browser gate: the day line (worker), the Panchanga adapter and the personal page give the same
// millisecond for one lunar event, and a personal page cached before FP572 (no <script> for the shared
// source) still works with the new scripts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..','..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
const TAG='<script src="lunar_core_v1.js?v=fp572"></script>';
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://local'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{
  if(!error&&url.pathname==='/personal_dayline.html'&&url.searchParams.has('cached_before_fp572')){
   const html=data.toString('utf8');assert.ok(html.includes(TAG),'personal page must load the shared lunar source');data=Buffer.from(html.replace(TAG,''));
  }
  response.writeHead(error?404:200,{'content-type':types[path.extname(file)]||'application/octet-stream'});response.end(error?'':data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/',browser=await chromium.launch();let checks=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'uk-UA',serviceWorkers:'block',timezoneId:'Europe/Kyiv'});
  await context.addInitScript(()=>{sessionStorage.setItem('nrs_launch','1');});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  const personalEvents=async query=>{
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'personal_dayline.html'+query,{waitUntil:'load'});
   const result=await page.evaluate(()=>{
    const model=PersonalDayline.build({date:'2026-11-13',place:{lat:50.454,lon:30.524,zone:'Europe/Kyiv'},birth:null});
    return {source:model.lunarSource,nakshatra:model.series.events.filter(e=>e.from.nak!==e.to.nak).map(e=>e.at),tithi:model.tithis.events.map(e=>e.at),
     scripts:[...document.scripts].filter(s=>/lunar_core_v1/.test(s.src)).length};
   });
   assert.deepEqual(errors,[],'personal page errors '+query);await page.close();return result;
  };
  const current=await personalEvents(''),cached=await personalEvents('?cached_before_fp572=1');
  assert.equal(current.source,'lunar_core_v1');assert.equal(current.scripts,1);
  assert.equal(cached.scripts,1,'the model must request the shared source for a page cached before FP572');
  assert.deepEqual(cached,current);checks+=4;

  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-13T09:40:00Z'));
  await page.goto(base+'index.html?channel=play#today',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-overview="today"] .nr-o-score',{state:'visible',timeout:30000});
  await page.waitForSelector('[data-dl-next-time]',{state:'attached',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('[data-dl-next-time]')?.textContent.trim().length>0,null,{timeout:30000});
  await page.evaluate(()=>{const details=document.querySelector('[data-dl-period-list]').closest('details');details.open=true;details.dispatchEvent(new Event('toggle'));});
  await page.waitForSelector('.sr-dl-period-change',{state:'attached',timeout:30000});
  const main=await page.evaluate(()=>{
   const at=kind=>[...document.querySelectorAll('.sr-dl-period-change')].filter(e=>e.dataset.kind===kind).map(e=>Date.parse(e.dataset.eventAt));
   const civil=SkyRhythmCivil.dayIntervals('2026-11-13','Europe/Kyiv'),sunrise=SkyRhythmCivil.atSunrise('2026-11-13',50.454,30.524,'Europe/Kyiv');
   return {nakshatra:at('nakshatra'),tithi:at('tithi'),civil:civil.segments.slice(0,-1).map(s=>+s.end),civilSource:civil.source,sunriseSource:sunrise.source,
    next:document.querySelector('[data-dl-next-time]').textContent,label:document.querySelector('[data-dl-next-label]').textContent,lunar:SkyRhythmLunar.available()};
  });
  assert.equal(main.lunar,true);assert.equal(main.civilSource,'lunar_core_v1');assert.equal(main.sunriseSource,'lunar_core_v1');
  assert.deepEqual(main.nakshatra,current.nakshatra,'day line and personal line must give the same nakshatra instant');
  assert.deepEqual(main.tithi,current.tithi,'day line and personal line must give the same tithi instant');
  assert.deepEqual(main.civil,current.tithi,'Panchanga and personal line must give the same tithi instant');
  // Swiss Ephemeris DE431 for the same events: 11:47:25.050Z and 15:13:01.901Z.
  assert.ok(Math.abs(main.nakshatra[0]-Date.parse('2026-11-13T11:47:25.050Z'))<=7000);assert.ok(Math.abs(main.tithi[0]-Date.parse('2026-11-13T15:13:01.901Z'))<=9000);
  assert.match(main.next,/13:47/);checks+=9;
  // This instant is after the new boundary and before the legacy Meeus one.
  // Exercise the actual bridge and check that its use does not contaminate
  // the legacy computePanchanga cache at the same timestamp.
  const bridge=await page.evaluate(()=>{
   const instant=new Date('2026-11-13T15:13:06Z');
   const civil=window.SkyRhythmCivil;
   const lunar=window.SkyRhythmLunar.at(+instant);
   const before=window.computePanchanga(instant);
   try {
    window.SkyRhythmCivil={...civil,atSunrise:()=>({status:'available',sunrise:instant,tithi:lunar.tithi,source:'lunar_core_v1'})};
    const output=window.SkyRhythmPanchanga.resolve({});
    return {status:output.status,tithi:output.components.tithi.num,name:output.components.tithi.name,
      nakshatra:output.components.nakshatra.num,yoga:output.components.yoga.num,karana:output.components.karana?.nameEn,
      lunar,legacyBefore:before.tithi.num,legacyCacheStable:window.computePanchanga(instant)===before};
   }finally{window.SkyRhythmCivil=civil;}
  });
  assert.equal(bridge.status,'available');assert.equal(bridge.tithi,bridge.lunar.tithi);assert.ok(bridge.name);
  assert.equal(bridge.nakshatra,bridge.lunar.nakshatra);assert.equal(bridge.yoga,bridge.lunar.yoga);
  assert.equal(bridge.karana,bridge.lunar.karana);assert.equal(bridge.legacyCacheStable,true);
  assert.notEqual(bridge.legacyBefore,bridge.tithi);checks+=8;
  assert.deepEqual(errors,[],'index errors');
  console.log(JSON.stringify({status:'PASS',checks,nakshatra:new Date(main.nakshatra[0]).toISOString(),tithi:new Date(main.tithi[0]).toISOString(),next:main.next+' '+main.label,
   scope:'Chromium emulation, service worker blocked; one event has one instant on three screens'}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
