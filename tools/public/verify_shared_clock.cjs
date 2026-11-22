'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const type={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 if(req.url==='/__clock_resume_away'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>History control</title>');return;}
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const b=await fs.readFile(f);res.writeHead(200,{'Content-Type':type[path.extname(f)]||'application/octet-stream'}).end(b);}
 catch{res.writeHead(404).end();}
});
// The same stale feed can retry while the viewport is changing. Placement
// alone does not tell us that the current feed has finished rendering.
async function settledTodayFeed(page, compact, expectedState){
 const handle=await page.waitForFunction(({compact,expectedState})=>{
  const root=document.querySelector('#nrRoute-today [data-overview]');
  const status=root?.querySelector('[data-p0-feed-state]');
  const source=root?.querySelector('[data-today-source]')?.textContent;
  const date=root?.querySelector('select')?.value;
  const load=window.__srConsumerLoadState;
  if(!status||!source?.trim()||!date||!['ready','error'].includes(load))return false;
  const placed=compact?status.previousElementSibling?.hasAttribute('data-sky-clock'):status.parentElement?.matches('.nr-o-hero');
  if(!placed)return false;
  const consumer=window.fp469ConsumerForDate?.({ds:date})?.consumer;
  if(!consumer||!window.SRP0Layout?.dataState)return false;
  const state=window.SRP0Layout.dataState(consumer,load,navigator.onLine);
  // Require the rendered UI and resolver to agree in the same observation.
  if(status.dataset.state!==state||(expectedState&&state!==expectedState))return false;
  return {date,state,source};
 },{compact,expectedState},{polling:50,timeout:30000});
 try{return await handle.jsonValue();}
 finally{await handle.dispose();}
}

async function firstScreenCities(browser,base) {
 const cities=[
  {cityId:'kyiv',name:'Київ',lat:50.454,lon:30.524,zone:'Europe/Kyiv',time:'05:49'},
  {cityId:'barcelona',name:'Барселона',lat:41.3874,lon:2.1686,zone:'Europe/Madrid',time:'04:49'}
 ];
 const otherPlaces=[
  {cityId:'izium',name:'Ізюм',lat:49.206971,lon:37.276791,zone:'Europe/Kyiv'},
  {cityId:'perpignan',name:'Перпіньян',lat:42.69764,lon:2.89541,zone:'Europe/Paris'},
  {cityId:'ny',name:'Нью-Йорк',lat:40.7128,lon:-74.006,zone:'America/New_York'},
  {cityId:'delhi',name:'Делі',lat:28.6139,lon:77.209,zone:'Asia/Kolkata'},
  {cityId:'tromso',name:'Тромсе',lat:69.6492,lon:18.9553,zone:'Europe/Oslo'},
  {name:'Мої координати',lat:48.8566,lon:2.3522,zone:'Europe/Paris'}
 ];
 const instant='2026-11-09T22:30:00Z';
 const nextAt='2026-11-10T03:49:30.640Z';
 const statuses=['fresh','partial','stale','missing'];
 const coverage={fresh:['2026-11-09','2026-11-10','2026-11-11'],partial:['2026-11-09'],stale:[],missing:[]};
 const statusText={fresh:/свіжі.*UTC/,partial:/частковий.*1\/3.*UTC/,stale:/застарілі.*Період невідомий/,missing:/немає даних.*Період невідомий/};
 const fixture=JSON.parse(await fs.readFile(path.join(root,'tools/public/fixtures/score_regression.json'),'utf8'));
 const noScore={...fixture,days:{}};
 const output=process.env.VERIFY_CLOCK_EVIDENCE_DIR;
 if(output)await fs.mkdir(output,{recursive:true});
 const jobs=[
  ...cities.flatMap(city=>[
   ...[100,200].flatMap(scale=>statuses.map(state=>({city,scale,state,workerAvailable:true}))),
   ...statuses.map(state=>({city,scale:100,state,workerAvailable:true,wide:true})),
   ...['fresh','partial'].map(state=>({city,scale:200,state,workerAvailable:true,wide:true})),
   {city,scale:200,state:'fresh',workerAvailable:false}
  ]),
  ...otherPlaces.map(city=>({city,scale:200,state:'fresh',workerAvailable:true,geometryOnly:true})),
  ...cities.flatMap(city=>['en','es','fr'].flatMap(lang=>[100,200].map(scale=>({
   city,lang,scale,state:'partial',workerAvailable:true,geometryOnly:true
  })))),
  {city:cities[1],scale:100,state:'partial',workerAvailable:true,geometryOnly:true,
   viewportOverride:{width:384,height:694}}
 ];

 async function visit({city,scale,state,workerAvailable,wide=false,geometryOnly=false,lang='uk',viewportOverride}) {
  const viewport=viewportOverride||(wide?{width:390,height:844}:{width:320,height:741});
  const location=city.cityId||'coordinates';
  const label=[location,lang,viewport.width+'×'+viewport.height,scale+'%',state,workerAvailable?'available':'unavailable'].join(' ');
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,locale:lang,
   timezoneId:city.zone,serviceWorkers:'block',reducedMotion:'reduce'});
  try {
   await context.addInitScript(({place,lang})=>{
    sessionStorage.setItem('nrs_launch','1');
    localStorage.setItem('gindex_locale_v1',lang);
    localStorage.setItem('gidx_onboard_done_v2','1');
    localStorage.setItem('srPrivacyNoticeDismissed','1');
    localStorage.setItem('gindex_local_context_v1',JSON.stringify({...place,saved_at:'2026-11-08T09:00:00Z'}));
   },{lang,place:{cityId:city.cityId,lat:city.lat,lon:city.lon,zone:city.zone}});
   let calls=0;
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='services.swpc.noaa.gov'&&url.pathname==='/products/noaa-scales.json'){
     calls++;
     if(state==='missing')return route.fulfill({status:503,body:''});
     const scales={'0':{DateStamp:'2026-11-09',TimeStamp:state==='stale'?'12:00:00':'22:05:00',
      G:{Scale:'0'},R:{Scale:'0'},S:{Scale:'0'}}};
     const dates=state==='partial'?coverage.partial:coverage.fresh;
     dates.forEach((date,i)=>scales[i+1]={DateStamp:date,G:{Scale:'0'},R:{MinorProb:'0',MajorProb:'0'},S:{Prob:'0'}});
     return route.fulfill({json:scales});
    }
    if(url.origin!==base)return route.abort();
    if(!workerAvailable&&url.pathname==='/dayline_worker_v1.js')return route.fulfill({status:503,body:''});
    if(/^\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json$/.test(url.pathname))return route.fulfill({json:noScore});
    if(url.pathname==='/consumer_cloud/final_score_decisions.json')return route.fulfill({json:{schema:'consumer-final-decisions-v1',decisions:[]}});
    return route.continue();
   });
   const page=await context.newPage();
   await page.clock.setFixedTime(new Date(instant));
   await page.goto(base+'/index.html?channel=play#today',{waitUntil:'commit',timeout:60000});
   await page.addStyleTag({content:'html{-webkit-text-size-adjust:'+scale+'%!important;text-size-adjust:'+scale+'%!important}'});
   await page.waitForFunction(({state,workerAvailable})=>{
    const root=document.querySelector('#nrRoute-today [data-overview=today]');
    const event=root?.querySelector('[data-p0-next-sky]');
    return root?.querySelector('[data-p0-noaa]')?.dataset.state===state&&
     (workerAvailable?Boolean(event?.dataset.at):event?.disabled&&event.textContent.includes('Подія недоступна'));
   },{state,workerAvailable},{polling:200,timeout:45000});
   await page.evaluate(()=>document.fonts.ready);
   const observed=await page.evaluate(()=>{
    const root=document.querySelector('#nrRoute-today [data-overview=today]');
    const nav=document.querySelector('#mobileNav').getBoundingClientRect(),fold=Math.min(innerHeight,nav.top);
    const box=selector=>{
     const e=root.querySelector(selector),r=e.getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,
      inViewport:e.checkVisibility()&&r.top>=0&&r.bottom<=fold&&r.left>=0&&r.right<=innerWidth};
    };
    const event=root.querySelector('[data-p0-next-sky]'),noaa=root.querySelector('[data-p0-noaa]');
    const why=root.querySelector('[data-day-why] > summary'),provenance=noaa.parentElement;
    const whyRect=why.getBoundingClientRect(),provenanceRect=provenance.getBoundingClientRect();
    const whySourceOverlap=why.checkVisibility()&&
     Math.min(whyRect.right,provenanceRect.right)-Math.max(whyRect.left,provenanceRect.left)>1&&
     Math.min(whyRect.bottom,provenanceRect.bottom)-Math.max(whyRect.top,provenanceRect.top)>1;
    const children=[...event.children].filter(el=>el.checkVisibility()).map(el=>el.getBoundingClientRect());
    const overlap=children.some((a,i)=>children.slice(i+1).some(b=>
     Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2));
    function wordsWithin(elements){
     const issues=[];
     for(const element of elements){
      if(!element?.checkVisibility())continue;
      const bounds=element.getBoundingClientRect(),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      for(let node=walker.nextNode();node;node=walker.nextNode()){
       if(!node.parentElement.checkVisibility())continue;
       for(const word of node.textContent.matchAll(/[\p{L}\p{M}’']+/gu)){
        const range=document.createRange();
        range.setStart(node,word.index);
        range.setEnd(node,word.index+word[0].length);
        const parts=[...range.getClientRects()].filter(part=>part.width>0);
        if(new Set(parts.map(part=>Math.round(part.top))).size>1||
            parts.some(part=>part.left<bounds.left-1||part.right>bounds.right+1))issues.push(word[0]);
       }
      }
     }
     return issues;
    }
    const navButtons=[...document.querySelectorAll('#mobileNav button')];
    const splitNavLabels=wordsWithin(navButtons.flatMap(button=>[...button.querySelectorAll('[data-nav-full],[data-nav-compact]')]));
    const brokenWords=wordsWithin([
     root.querySelector('[data-p0-source]'),noaa,event,why,
     root.querySelector('[data-today-forecast]'),root.querySelector('[data-day-context] .nr-dc-head strong')
    ]);
    const navLabels=navButtons.map(button=>({
     id:button.id,
     name:[...button.querySelectorAll('[data-nav-full],[data-nav-compact]')].find(n=>n.checkVisibility())?.textContent.trim()
    }));
    const header=document.querySelector('body > header').getBoundingClientRect();
    const phase=root.closest('body').querySelector('header .wow-header-moon')?.getBoundingClientRect();
    const mastheadClear=header.bottom<=root.getBoundingClientRect().top+1&&(!phase||phase.bottom<=header.bottom+1&&phase.right<=innerWidth+1);
    const dayTitle=root.querySelector('[data-day-context] .nr-dc-head strong');
    return {fold,scrollY,mastheadClear,mastheadBottom:header.bottom,splitNavLabels,brokenWords,navLabels,whySourceOverlap,
     dayTitle:dayTitle?.textContent.trim(),dayBasis:dayTitle?.dataset.dayBasis||null,
     cityPresets:window.SRSkyTime.cityPresets().map(place=>place.cityId),textScale:getComputedStyle(document.documentElement).textSizeAdjust,
     source:box('[data-p0-source]'),noaa:box('[data-p0-noaa]'),plot:box('.sr-time-sun svg'),
     event:box('[data-p0-next-sky]'),noaaText:noaa.innerText.replace(/\s+/g,' '),
     dates:noaa.dataset.days,localTime:event.querySelector('time').textContent,at:event.dataset.at||null,
     city:event.querySelector('strong').textContent,day:root.querySelector('select').value,overlap,disabled:event.disabled};
   });
   const graphMargin=observed.fold-observed.plot.bottom;
   console.log('FIRST SCREEN '+label+' graph margin='+graphMargin.toFixed(2)+' px');
   assert(calls>0&&observed.scrollY===0&&observed.textScale===scale+'%',label+' should open with actual text autosizing and a NOAA request');
   assert.equal(observed.dates,coverage[state].join(','),label+' NOAA coverage');
   if(lang==='uk'){
    assert.match(observed.noaaText,statusText[state],label+' weather status');
    assert.equal(observed.city,city.name,label+' place');
   }else{
    assert.match(observed.noaaText,/NOAA.*UTC/,label+' localized weather period');
    assert(observed.city,label+' localized place');
   }
   assert.equal(observed.day,'2026-11-10',label+' Kyiv day remains selected');
   if(city.zone!=='Europe/Kyiv'){
    assert.equal(observed.dayBasis,'kyiv',label+' calendar basis');
    const prefix={uk:'За Києвом',en:'Kyiv time',es:'Hora de Kyiv',fr:'Heure de Kyiv'}[lang];
    assert(observed.dayTitle.startsWith(prefix+' · '),label+' city sees the explicitly labeled Kyiv date');
   }
   assert(observed.event.inViewport&&observed.plot.inViewport&&graphMargin>=16,label+' event and full chart must leave a 16 px graph margin');
   assert(!observed.overlap&&observed.event.height>=44&&observed.event.width>=44,label+' unobstructed event button');
   assert(observed.source.inViewport&&observed.noaa.inViewport,label+' source and NOAA fit');
   assert(!observed.whySourceOverlap,label+' explanation must not overlap over the source and NOAA');
   assert(Math.abs(observed.source.right-observed.noaa.left)<=16,label+' NOAA adjacent to authority');
   assert.deepEqual(observed.brokenWords,[],label+' first-screen buttons and date must preserve whole words');
   assert.equal(observed.navLabels.length,5,label+' five bottom navigation actions');
   for(const {id,name} of observed.navLabels){
    assert(name,label+' visible navigation label');
    assert.equal(await page.getByRole('button',{name}).and(page.locator('#'+id)).count(),1,
     label+' accessible name must contain its visible label for '+id);
   }
   if(scale===200){
    assert(observed.mastheadClear,label+' enlarged masthead does not cover the date or phase');
    assert.deepEqual(observed.splitNavLabels,[],label+' enlarged navigation labels must not wrap within a word');
   }
   if(output&&workerAvailable&&!geometryOnly&&state==='fresh'&&!wide){
    await page.screenshot({path:path.join(output,location+' first screen '+scale+'.png'),
     animations:'disabled',timeout:60000,
     mask:[page.locator('#nrRoute-today.active :is(.nr-o-score,[data-score-tone]):visible')],maskColor:'#102038'});
   }
   const result={...observed,graphMargin,city:location,zone:city.zone,lang,scale,viewport,state,workerAvailable,geometryOnly,
    browser:browser.version(),platform:process.platform,activations:0,sourceFocused:false};
   if(lang==='uk'&&workerAvailable&&!geometryOnly&&state==='fresh'){
    await page.locator('#nrRoute-today [data-p0-source]').tap();
    await page.waitForFunction(()=>{
     const source=document.querySelector('#nrRoute-today [data-score-source]');
     return source===document.activeElement&&source?.closest('details')?.open;
    });
    await page.evaluate(()=>NRConsumerOverview.update());
    await page.waitForTimeout(700);
    const source=await page.locator('#nrRoute-today [data-score-source]').evaluate(el=>{
     const rect=el.getBoundingClientRect(),nav=document.querySelector('#mobileNav').getBoundingClientRect();
     return {focused:el===document.activeElement,opened:el.closest('details').open,
      firstLineVisible:rect.top>=0&&rect.top+Math.min(24,rect.height)<=Math.min(innerHeight,nav.top)};
    });
    assert(source.focused&&source.opened&&source.firstLineVisible,label+' source must stay focused and visible after opening details');
    result.sourceFocused=true;
    // Measure the independent Sky action from a fresh opening.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(at=>document.querySelector('#nrRoute-today.active [data-p0-next-sky]')?.dataset.at===at,
      nextAt,{polling:200,timeout:45000});
   }
   if(!workerAvailable){
    assert(observed.disabled&&!observed.at,label+' missing event has no action');
    return result;
   }
   if(geometryOnly){
    assert(!observed.disabled&&observed.at,label+' next event available for this location');
    return result;
   }
   assert(!observed.disabled&&observed.at===nextAt&&observed.localTime.includes(city.time),label+' next event instant and local time');
   if(city.cityId==='barcelona')assert.match(observed.localTime,/10 лист/,label+' next local date');
   await page.locator('#nrRoute-today [data-p0-next-sky]').tap();
   const sky=page.locator('#nrRoute-panch.active .nr-sl[data-state=ready][data-clock-mode=selected]');
   await sky.waitFor({timeout:45000}).catch(async error=>{
    const state=await page.evaluate(()=>{
     const route=document.querySelector('#nrRoute-panch'),chart=route?.querySelector('.nr-sl');
     return {skyRouteActive:route?.classList.contains('active'),state:chart?.dataset.state,mode:chart?.dataset.clockMode};
    });
    console.error('FIRST SCREEN sky readiness '+JSON.stringify(state));
    throw error;
   });
   await page.waitForFunction(()=>document.activeElement?.id==='nrSkyLiveHeading');
   assert.equal(await sky.getAttribute('data-time'),nextAt,label+' chart instant after one activation');
   const actual=await page.evaluate(()=>{const s=SRSkyTime.snapshot();return [new Date(s.at).toISOString(),s.zone,s.loc.cityId];});
   assert.deepEqual(actual,[nextAt,city.zone,city.cityId],label+' selected sky moment and city');
   return {...result,activations:1,skyAt:actual[0]};
  }catch(error){
   console.error('FIRST SCREEN failed: '+label);
   throw error;
  }finally{await context.close();}
 }
 const rows=[];
 for(let i=0;i<jobs.length;i+=2)rows.push(...await Promise.all(jobs.slice(i,i+2).map(visit)));
 const allCityIds=[...cities,...otherPlaces].flatMap(place=>place.cityId?[place.cityId]:[]);
 assert.deepEqual([...rows[0].cityPresets].sort(),allCityIds.sort(),'First screen graph margin probes cover every preset city');
 if(output)await fs.writeFile(path.join(output,'First screen cities.json'),JSON.stringify(rows,null,2)+'\n');
 assert.equal(rows.filter(row=>row.sourceFocused).length,8,'Source focus checked at both widths and scales in both cities');
 console.log('PASS first screen: 28 handoffs, 2 unavailable controls, 6 extra places, 12 localized layouts, Samsung viewport and 8 source focus checks');
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 const start=new Date('2026-11-07T15:29:00Z');
 try{
  const pinnedOnly=process.argv.includes('--pinned-dates-only');
  const pinnedDates=[];
  const pinStart=new Date('2026-10-19T20:55:00Z'),pinMidnight=Date.parse('2026-10-20T21:00:00Z');
  async function pinnedMidnight(page,entry,weekDay,priorAutomaticDay){
   const index=entry==='index.html',route=index?'forecast':'today',day=index?weekDay:'2026-10-16';
   if(index){
    const week=page.locator('#nrRoute-today [data-week-strip]');
    const button=week.locator('[data-week-day="'+day+'"] button[data-week-go]');
    await button.scrollIntoViewIfNeeded();assert(await button.isVisible()&&await button.isEnabled(),'historical replay offers the chosen day as an actionable week button');
    await button.click();
   }
   const active=page.locator('#nrRoute-'+route+'.active [data-overview="'+route+'"]');
   const heading=active.locator(index?'[data-forecast-verdict] h2':'.nr-dc-head strong');
   await heading.waitFor({state:'visible'});
   await page.waitForFunction(({route,day})=>{
    const root=document.querySelector('#nrRoute-'+route+'.active [data-overview]');
    return root?.querySelector('select')?.value===day&&root.querySelector('[data-day-context]')?.dataset.selectedDate===day;
   },{route,day});
   const retained=await page.evaluateHandle(()=>document),stages=[];
   try{
    for(const [stage,offsetMs] of [['before',-1],['at',0],['after',1]]){
     if(stage==='before')await page.clock.pauseAt(new Date(pinMidnight-1));else await page.clock.runFor(1);
     const state=await retained.evaluate((doc,{day,route,boundary,offsetMs})=>{
      const root=document.querySelector('#nrRoute-'+route+'.active [data-overview="'+route+'"]');
      const bar=root?.querySelector('[data-day-context]'),heading=route==='forecast'?root?.querySelector('[data-forecast-verdict] h2'):bar?.querySelector('.nr-dc-head strong');
      const expectedLabel=new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
      const currentKyivDay=window.NRCivilTime.dayKey(Date.now(),'Europe/Kyiv');
      return {sameDocument:doc===document,timeMatches:Date.now()===boundary+offsetMs,kyivDayMatches:currentKyivDay===(offsetMs<0?'2026-10-20':'2026-10-21'),
       routeActive:!!root,selectedDayMatches:root?.querySelector('select')?.value===day,contextDayMatches:bar?.dataset.selectedDate===day,
       contextVisible:!!heading?.checkVisibility(),contextLabelMatches:!!heading?.textContent.includes(expectedLabel),
       relativeContextMatches:route==='forecast'?heading?.id==='srForecastDay':bar?.dataset.state==='other'&&!!heading?.textContent.includes('не сьогодні')};
     },{day,route,boundary:pinMidnight,offsetMs});
     const failed=Object.keys(state).filter(key=>state[key]!==true);
     if(failed.length)console.error('Pinned date '+entry+' '+day+' '+stage+' '+failed.join(', '));
     assert.equal(failed.length,0,'chosen calendar date and visible route context survive Kyiv midnight');
     stages.push({stage,offsetMs,...state});
    }
   }finally{await retained.dispose();}
   return {entry,route,day,priorAutomaticDay,selection:index?'week-button':'dlDate',boundaryAt:new Date(pinMidnight).toISOString(),stages};
  }
  async function freshPinnedRoute(entry,weekDay='2026-10-22'){
   const ctx=await browser.newContext({locale:'uk-UA',timezoneId:'America/Los_Angeles',serviceWorkers:'block',reducedMotion:'reduce'});
   try{
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
    await ctx.addInitScript(()=>{localStorage.setItem('nr_locale_v1','uk');localStorage.setItem('gidx_onboard_done_v2','1');localStorage.setItem('srPrivacyNoticeDismissed','1');});
    const page=await ctx.newPage();await page.clock.install({time:pinStart});
    await page.goto(base+'/'+entry+'#today',{waitUntil:'domcontentloaded'});
    const automatic=page.locator('#nrRoute-forecast [data-overview] select');
    await automatic.waitFor({state:'attached'});await page.clock.pauseAt(new Date(pinMidnight-86400000-1));
    const before=await automatic.inputValue();await page.clock.runFor(1);
    const at=await automatic.inputValue();
    assert(before==='2026-10-19'&&at==='2026-10-20','untouched forecast follows the first Kyiv midnight before manual selection');
    await page.clock.resume();
    return await pinnedMidnight(page,entry,weekDay,{route:'forecast',before,at});
   }finally{await ctx.close();}
  }
  async function savePins(){
   assert.equal(pinnedDates.length,3);
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
    const dir=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'pinned-dates-matrix.json'),JSON.stringify(pinnedDates,null,2));
   }
   console.log('PASS 3 explicitly selected dates across Kyiv midnight in public forecast and Classic Today');
  }
  if(pinnedOnly){
   pinnedDates.push(await freshPinnedRoute('index.html','2026-10-20'));
   for(const entry of ['index.html','classic.html?dlDate=2026-10-16'])pinnedDates.push(await freshPinnedRoute(entry));
   await savePins();return;
  }
  const firstScreenOnly=process.argv.includes('--first-screen-only');
  const reasonsOnly=process.argv.includes('--reasons-only');
  const heightBandOnly=process.argv.includes('--height-band-only');
  const scoredOnly=process.argv.includes('--scored-only');
  const dataScope=process.env.VERIFY_CLOCK_SCOPE==='data';
  const wideOnly=process.argv.includes('--wide-only');
  const nativeOnly=process.argv.includes('--native-ttl-only');
  const edgeSmoke=process.argv.includes('--calendar-edge-smoke');
  const nativeSmoke=process.argv.includes('--native-ttl-smoke');
  const noaaOnly=process.argv.includes('--noaa-loss-only');
  const freshOnly=dataScope||process.argv.includes('--fresh-only');
  const layoutOnly=edgeSmoke||nativeOnly||nativeSmoke||wideOnly||noaaOnly||freshOnly||reasonsOnly||heightBandOnly||scoredOnly||process.argv.includes('--layout-only');
  if(firstScreenOnly||!layoutOnly)await firstScreenCities(browser,base);
  if(firstScreenOnly)return;
  for(const [entry,width,height] of layoutOnly?[]:[['index.html',390,844],['classic.html',390,844],['index.html',1280,900]]){
   const ctx=await browser.newContext({viewport:{width,height},locale:'uk-UA',timezoneId:'Europe/Kyiv',serviceWorkers:'block',reducedMotion:'no-preference'});
   await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
   await ctx.addInitScript(()=>{
    localStorage.setItem('gidx_onboard_done_v2','1');
    localStorage.setItem('srPrivacyNoticeDismissed','1');
    localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.4501,lon:30.5234,zone:'Europe/Kyiv',label:'Київ',saved_at:new Date().toISOString()}));
   });
   const p=await ctx.newPage(), errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.clock.setFixedTime(start);
   await p.goto(base+'/'+entry+'?channel=play#today',{waitUntil:'domcontentloaded'});
   const today=p.locator('[data-sky-clock]'), sun=today.locator('[data-time-sun]');
   await sun.waitFor();
   await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone'),null,{timeout:30000});
   const visible=await sun.evaluate(el=>{
    const r=el.getBoundingClientRect(),nav=document.getElementById('mobileNav');
    const limit=nav?.checkVisibility()?nav.getBoundingClientRect().top:innerHeight,card=el.closest('[data-sky-clock]'),tone=document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone');
    // FP569d: the day verdict opens Today; the Sun clock is the next block after the overview card.
    return {top:r.top,bottom:r.bottom,limit,verdictAboveFold:!!tone&&tone.getBoundingClientRect().bottom<=limit,afterHero:!!card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution')};
   });
   assert(visible.verdictAboveFold&&visible.afterHero,JSON.stringify(visible));
   const summary=p.locator('[data-sun-first-screen]');
   await summary.waitFor();
   assert.equal(await summary.getAttribute('data-state'),'below');
   assert.match(await summary.innerText(),/Сонце під горизонтом.*Київ.*17:29/);

   assert.equal(await p.evaluate(()=>Boolean(window.NRMoonGL)),false);
   const input=(host,value)=>host.locator('.sr-time-controls input').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await input(today,475);
   const reference=await sun.evaluate(el=>({at:el.dataset.at,alt:+el.dataset.alt,transform:el.style.transform}));
   assert(reference.alt>0);
   assert.equal(await summary.getAttribute('data-state'),'above');
   assert.match(await summary.innerText(),/Сонце над горизонтом.*Київ/);
   assert(await summary.evaluate(el=>{
    const nav=document.getElementById('mobileNav');
    const bottom=nav?.checkVisibility()?nav.getBoundingClientRect().top:innerHeight;
    const box=el.getBoundingClientRect();
    return box.top>=0&&box.bottom<=bottom&&el.scrollWidth<=el.clientWidth;
   }),'local Sun summary remains on the first screen');

   await today.locator('[data-time-open]').click({noWaitAfter:true});
   const sky=p.locator('[data-sky-live]');
   await sky.waitFor();
   if(entry==='index.html'){
    const evening=p.locator('#nrRoute-panch [data-sky-evening]');
    await evening.waitFor();
    assert.equal(await evening.evaluate(el=>el.previousElementSibling?.hasAttribute('data-sky-live')),true,'the selected-time sky opens before the evening card');
   }
   const savedAt=await sky.getAttribute('data-time');
   assert.equal(savedAt,reference.at);
   assert.equal(+(await sky.locator('.nr-sl-body[data-body=Sun]').getAttribute('data-alt')),reference.alt);
   const canvas=sky.locator('canvas.nr-sl-moon-gl');
   await canvas.waitFor();
   await canvas.evaluate(el=>window.__clockCanvas=el);
   const stamp=()=>sky.evaluate(el=>{
    const s=NRSkyLive.snapshot(), c=el.querySelector('canvas'), g=[...el.querySelectorAll('.nr-sl-body')];
    const sun=el.querySelector('.nr-sl-suncard'),map=el.querySelector('.nr-sl-sky'),guide=el.querySelector('.nr-sl-summary');
    return {at:s.time.toISOString(),phase:s.phaseAngle,limb:s.limb,canvasPhase:+c.dataset.phaseAngle,canvasLimb:+c.dataset.limb,
     frameTimes:[el.dataset.time,sun.dataset.at,c.dataset.at,map.dataset.at,el.querySelector('.sr-time-controls time').dateTime],
     sunAlt:+sun.dataset.sunAlt,sunMapAlt:+map.querySelector('[data-body=Sun]').dataset.alt,
     guideFirst:guide.nextElementSibling?.classList.contains('sr-time-controls'),
     listed:[...guide.querySelectorAll('[data-look-body]')].map(x=>x.dataset.lookBody).sort(),
     expected:Object.keys(s.hz).filter(body=>s.hz[body].altitude>0).sort(),
     sameCanvas:c===window.__clockCanvas,values:g.map(x=>[x.dataset.body,+x.dataset.alt,+x.dataset.az,x.style.transform])};
   });
   const a=await stamp();
   await input(sky,880);
   const b=await stamp();
   for(const r of [a,b]){
    assert(r.sameCanvas);assert(Math.abs(r.phase-r.canvasPhase)<.0001);assert(Math.abs(r.limb-r.canvasLimb)<.0001);
    assert.equal(r.values.length,7);
    assert.ok(r.frameTimes.every(t=>t===r.at),'Sun, Moon, map and visible clock use the same instant');
    assert.equal(r.sunAlt,r.sunMapAlt);
    assert.ok(r.guideFirst);
    assert.deepEqual(r.listed,r.expected);
   }
   assert.notEqual(a.at,b.at);assert.notEqual(a.limb,b.limb);
   for(const [i,g] of a.values.entries())assert.notDeepEqual(g.slice(1),b.values[i].slice(1));
   const fixture=JSON.parse(await fs.readFile(path.join(root,'consumer_cloud/sky.json'),'utf8'));
   const timed=fixture.intervals.find(x=>x.exact&&x.reading?.intensity>=1)?.exact||
    fixture.events.find(x=>x.at&&x.reading?.intensity>=1)?.at;
   assert(timed,'fixture has a timed event');
   await p.waitForFunction(()=>window.NRSkyScene?.state()==='ready');
   await p.locator('.nr-sky-expand > summary').click();
   await p.evaluate(day=>{
    NRSkyScene.select(day);
    const more=document.querySelector('.nr-sky-more');
    if(more)more.open=true;
   },timed.kyiv_date);
   const eventLink=p.locator('[data-sky-event-at]:visible').first();
   await eventLink.waitFor();
   const eventAt=await eventLink.getAttribute('data-sky-event-at');
   await eventLink.click();
   const instant=new Date(eventAt).toISOString();
   assert.equal(await sky.getAttribute('data-time'),instant);
   assert(await p.locator('#nrSkyLiveHeading').evaluate(el=>document.activeElement===el));
   await p.evaluate(()=>fp434Go('today',false));
   assert.equal(await sun.getAttribute('data-at'),instant);
   await today.locator('[data-time-now]').click();
   assert.equal(await sun.getAttribute('data-at'),start.toISOString());
   const play=today.locator('[data-time-play]');
   await play.click();
   await p.waitForFunction(()=>+document.querySelector('[data-sky-clock] input').value>=40);
   const moving=await sun.getAttribute('data-at');
   await play.click();
   const paused=await sun.getAttribute('data-at');
   await p.waitForTimeout(160);
   assert.equal(await sun.getAttribute('data-at'),paused);
   assert.notEqual(moving,start.toISOString());
   await play.click();
   await p.emulateMedia({reducedMotion:'reduce'});
   await p.waitForFunction(()=>document.querySelector('[data-sky-clock] [data-time-play]').disabled);
   assert.equal(await today.locator('.sr-time-controls').getAttribute('data-mode'),'selected');
   await input(today,500);
   assert.notEqual(await sun.getAttribute('data-at'),paused);
   await today.locator('[data-time-now]').click();
   const lengths=[];
   for(const date of ['2026-03-29','2026-10-25']){
    await p.clock.setFixedTime(new Date(date+'T10:00:00Z'));
    lengths.push(await p.evaluate(()=>{const s=SRSkyTime.snapshot();return (s.end-s.start)/3600000;}));
   }
   assert.deepEqual(lengths,[23,25]);
   const clockRange=today.locator('.sr-time-controls input');
   await input(today,141);
   const first=await clockRange.getAttribute('aria-valuetext');
   await input(today,181);
   const second=await clockRange.getAttribute('aria-valuetext');
   assert.equal(first.split(' · ')[0],second.split(' · ')[0],'local wall time repeats');
   assert.notEqual(first.split(' · ')[1],second.split(' · ')[1],'UTC offsets disambiguate the repeated hour');
   assert.deepEqual(errors,[]);
   results.push({entry,width,visible,reference,a,b,lengths,errors});
   await ctx.close();
  }
  const layouts=[];
  // Fresh contexts at the four F3 corners and the intermediate sizes reported by the auditor.
  const bandSizes=[
   [320,741,true],[320,770,true],[320,800,true],[320,801,false],
   [321,741,true],[321,800,true],[330,770,true],[340,760,true],[359,790,true],
   [360,741,true],[360,780,true],[375,741,true],[375,770,true],[375,800,true],
   [375,801,true],[376,741,true],[376,800,true],[390,844,true],
   // Common portrait phones up to 430x932 now use the compact Today layout.
   [393,852,true],[412,915,true],[414,896,true],[430,741,true],[430,932,true],
   // Just outside the compact band the regular layout must still reach the chart by scrolling.
   [431,932,false],[430,933,false],
  ];
  const sizes=[[320,694,true],[361,700,true],[375,700,true],[360,640,false],[320,568,false],[375,667,false],[376,700,false],...bandSizes];
  const scoredSizes=bandSizes.filter(([w,h])=>
   (w>=321&&w<=430&&h>=741&&h<=932)||(w===431&&h===932)||(w===430&&h===933));
  const cases=['uk','en','es','fr'].flatMap(lang=>['scored-history','shipped-feed','synthetic-history','missing-no-advice'].flatMap(inputState=>
   (inputState==='scored-history'?scoredSizes:inputState==='missing-no-advice'?[[321,741,true]]:sizes).map(([width,height,mustFit])=>({lang,inputState,width,height,mustFit}))));
  const selectedCases=freshOnly?[]:reasonsOnly?cases.filter(({width,height,lang,inputState})=>
   width===320&&height===694&&((lang==='uk'&&inputState==='shipped-feed')||(lang==='en'&&inputState==='synthetic-history'))):scoredOnly?cases.filter(row=>row.inputState==='scored-history'):heightBandOnly?cases.filter(row=>row.height>=741):cases;
  let noaaLossFeed,nativeLossFeed,noaaLossRegistry;
  async function coldLayout({lang,inputState,width,height,mustFit,checkExpiry=false,browserDriver=browser}){
  const compact=width>430||height<=932;
  const c=await browserDriver.newContext({viewport:{width,height},locale:lang,timezoneId:'Europe/Kyiv',serviceWorkers:'block'});
  try{
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await c.addInitScript(language=>{
   localStorage.setItem('nr_locale_v1',language);
   localStorage.setItem('gidx_onboard_done_v2','1');
   localStorage.setItem('srPrivacyNoticeDismissed','1');
  },lang);
  let holdFeed=null;
  if(inputState==='synthetic-history'){
   // Public historical fixture only: cloned days are synthetic, never forecasts.
   // Reproduce the archival make_feed.py scenario without overwriting tracked feeds.
   const fixture=JSON.parse(await fs.readFile(path.join(root,'tools/public/fixtures/score_regression.json'),'utf8'));
   const original=structuredClone(fixture),keys=Object.keys(original.days).sort();let index=0;
   const sky=JSON.parse(await fs.readFile(path.join(root,'consumer_cloud/sky.json'),'utf8'));
   const end=new Date(Math.max(...sky.daily.map(x=>Date.parse(x.date)))+30*86400000);
   for(let cursor=new Date(keys[0]);cursor<=end;cursor=new Date(+cursor+86400000)){
    const day=cursor.toISOString().slice(0,10);if(fixture.days[day])continue;
    const source=keys[index++%keys.length],delta=+cursor-Date.parse(source);
    fixture.days[day]=JSON.parse(JSON.stringify(original.days[source]).replace(/\d{4}-\d{2}-\d{2}/g,date=>new Date(Date.parse(date)+delta).toISOString().slice(0,10)));
   }
   fixture.harness_note='synthetic cloned public historical fixture; not a forecast';
   const body=JSON.stringify(fixture);
   await c.route(/\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json(?:\?.*)?$/,async r=>{
    if(holdFeed)await holdFeed;
    await r.fulfill({contentType:'application/json',body});
   });
   const decisions=await fs.readFile(path.join(root,'tools/public/fixtures/decisions_regression.json'),'utf8');
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>r.fulfill({contentType:'application/json',body:decisions}));
  }
  const syntheticStorm=inputState==='synthetic-storm';
  const fresh=inputState==='fresh-history'||syntheticStorm;
  const nativeLoss=inputState.startsWith('native-loss-');
  const noaaExpert=['noaa-loss-expert','native-loss-expert'].includes(inputState),noaaMissing=['noaa-loss-unavailable','native-loss-unavailable'].includes(inputState);
  let withheldBody=nativeLoss?nativeLossFeed:noaaLossFeed;
  if(checkExpiry&&checkExpiry!=='midnight'){
   // Isolate expiry from the independent Kyiv midnight transition. Both actual source
   // timestamps are moved together; marks, the decision and the selected day are unchanged.
   const timed=JSON.parse(withheldBody),issued='2026-10-19T09:11:05.189Z';
   timed.generated_at=issued;timed.days['2026-10-19'].channels.source_formula.generated_at=issued;
   withheldBody=JSON.stringify(timed);
  }
  const noaaLoss=noaaExpert||noaaMissing;
  const scored=inputState==='scored-history'||fresh||noaaExpert;
  if(inputState==='missing-no-advice'){
   // The shipped registry may contain an expert override without a formula row.
   // Replay the archived registry with no entry on 7 November to cover actual absence.
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>
    r.fulfill({contentType:'application/json',path:path.join(root,'tools/public/fixtures/decisions_regression.json')}));
  }
  if(noaaLoss){
   await c.route(/\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json(?:\?.*)?$/,r=>
    r.fulfill({contentType:'application/json',body:withheldBody}));
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>
    r.fulfill({json:noaaExpert?noaaLossRegistry.withExpert:checkExpiry==='midnight'?noaaLossRegistry.withoutEitherDay:noaaLossRegistry.withoutExpert}));
  }else if(scored){
   // Replay both archived responses unchanged through the normal same-origin loaders.
   // The registry decision and the calendar factor refer to the same historical day.
   const fixture=name=>path.join(root,'tools/public/fixtures',name);
   const feedFixture=fixture(fresh?'fresh_20261019.json':'score_regression.json');
   let synthetic;
   if(syntheticStorm){
    // Reuse the canonical #53 short-range Kp7/G3 stimulus, never a measured storm.
    synthetic=JSON.parse(await fs.readFile(feedFixture,'utf8'));
    synthetic.days['2026-10-19'].channels.source_formula.kp_input.kp=7;
   }
   await c.route(/\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json(?:\?.*)?$/,r=>
    r.fulfill(synthetic?{json:synthetic}:{contentType:'application/json',path:feedFixture}));
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>
    r.fulfill({contentType:'application/json',path:fixture('decisions_regression.json')}));
  }
  const instant=(scored||noaaLoss)?new Date('2026-10-19T15:29:00Z'):start;
  const day=instant.toISOString().slice(0,10);
  const p=await c.newPage();
  // Cold Chromium startup can be slow on the audit host. Assertions still require a settled response.
  if(noaaLoss)p.setDefaultTimeout(60000);
  if(checkExpiry)await p.clock.install({time:instant});
  else await p.clock.setFixedTime(instant);
  const deliveredLoss=noaaLoss?p.waitForResponse(r=>r.url()===base+'/consumer_cloud/forecast.json'):null;
   await p.goto(base+'/index.html?channel=play#today',{waitUntil:'commit'});
  if(deliveredLoss){
   const response=await deliveredLoss;
   assert.equal(response.status(),200);
   assert((await response.body()).equals(Buffer.from(withheldBody)),'the browser received the exact withheld feed');
  }
  const compactSun=p.locator('[data-sky-clock] [data-time-sun]');
  await compactSun.waitFor();
  await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
  // FP569d (owner decision 01.11): verdict and score open Today; the Sun clock follows the overview card.
  await p.evaluate(()=>document.fonts.ready);
  // Wait for the asynchronously mounted share action before measuring the fold.
  await p.locator('#nrRoute-today [data-share-card] button').first().waitFor({state:'attached'});
  assert.equal(await p.evaluate(()=>window.NRLocale.language),lang);
  const status=p.locator('#nrRoute-today [data-p0-feed-state]');
  const initialFeed=await settledTodayFeed(p,compact,noaaLoss?'missing':fresh?'fresh':inputState==='synthetic-history'?'stale':undefined);
  const advice=p.locator('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)');
  const actual=await advice.allTextContents();
  assert.equal(initialFeed.date,day,'selected date belongs to this fixture');
  const expected=await p.evaluate(ds=>window.NRDayVerdict.summary(ds).lines.map(line=>line.label+' '+line.text),day);
  const normalize=text=>text.trim().replace(/\s+/g,' ');
  assert.deepEqual(actual.map(normalize),expected.map(normalize),'full advice matches the selected day');
  if(scored||noaaLoss||inputState==='synthetic-history'){
   const historical={uk:'За календарем краще відкласти: нові починання',en:'The calendar advises postponing: new beginnings',
    es:'El calendario aconseja posponer: nuevos comienzos',fr:'Le calendrier conseille de reporter : nouveaux commencements'};
   assert.ok(actual.map(normalize).includes(historical[lang]),'complete known historical advice');
  }
  if(inputState==='synthetic-history'){
   assert.equal(initialFeed.state,'stale');
   assert(await status.isVisible(),'stale status is retained below Sun');
  }
   const readGeometry=()=>compactSun.evaluate((el,{lang,day})=>{
    const mobileNav=document.getElementById('mobileNav');
    const nav=mobileNav?.checkVisibility()?Math.min(innerHeight,mobileNav.getBoundingClientRect().top):innerHeight;
    const card=el.closest('[data-sky-clock]'),hero=document.querySelector('#nrRoute-today .nr-o-hero');
    const unclipped=node=>{
     if(!node?.textContent.trim()||!node.checkVisibility({opacityProperty:true,visibilityProperty:true}))return false;
     const box=node.getBoundingClientRect(),range=document.createRange();
     range.selectNodeContents(node);
     return box.width>0&&box.height>0&&box.left>=0&&box.right<=innerWidth&&
      // The score ring's decorative pseudo-elements extend past its box.
      // Check the whole numeral with the text range independently of its visual halo.
      (node===score||(node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1))&&
      [...range.getClientRects()].every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1);
    };
    const children=[...hero.querySelectorAll('[data-day-verdict] p:not(.nr-dv-tone)')];
    const source=hero.querySelector('[data-today-source]');
    const score=hero.querySelector('.nr-o-score'),tone=hero.querySelector('.nr-dv-tone');
    const result=window.fp469ConsumerForDate({ds:day}).consumer;
    const within=node=>unclipped(node)&&node.getBoundingClientRect().top>=0&&node.getBoundingClientRect().bottom<=nav;
    const expertLabels={uk:'Експертне рішення',en:'Expert decision',es:'Decisión experta',fr:'Décision experte'};
    const sourceMatchesExpert=result.authority==='expert_pdf'&&source?.textContent.trim().startsWith(expertLabels[lang]);
    const chip=hero.querySelector('[data-p0-authority]');
    const sourceMatchesAuthority=result.available===true&&(result.authority==='expert_pdf'?sourceMatchesExpert:
     chip?.dataset.p0Authority==='formula'&&source?.textContent.trim().length>0);
    const plot=el.closest('svg').getBoundingClientRect();
    return {nav,scrollY:window.scrollY,pageWidth:document.documentElement.scrollWidth,plotBottom:plot.bottom,plotTop:plot.top,plotLeft:plot.left,plotRight:plot.right,
     compactCss:getComputedStyle(hero).getPropertyValue('--nr-today-compact').trim()==='1',
     compactJs:hero.parentElement.querySelector('[data-p0-feed-state]')?.dataset.placement==='after-hero',
     sunTop:card.getBoundingClientRect().top,heroBottom:hero.getBoundingClientRect().bottom,
     afterHero:card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution'),
     verdictBottom:hero.querySelector('.nr-dv-tone').getBoundingClientRect().bottom,
     scoreBottom:hero.querySelector('.nr-o-verdict').getBoundingClientRect().bottom,
     adviceLineCount:children.length,adviceVisible:children.length>0&&children.every(within),
     scoreMissingUI:score.dataset.ring==='missing'&&!/[0-9]/.test(score.textContent),
     scoreAvailable:result.available===true,scoreVisible:result.available===true&&within(score),
     scoreMatchesResolver:result.available===true&&score.textContent.trim()===window.SkyScore.formatScore(result.score),
     toneVisible:within(tone),sourceMatchesAuthority,sourceMatchesExpert,sourceVisible:within(source),
     sourceBottom:source.getBoundingClientRect().bottom};
   },{lang,day});
   if(fresh){
    await p.locator('#nrRoute-today [data-space-scene=today][data-tone='+(syntheticStorm?'storm':'watch')+']').waitFor();
    await p.locator('#nrRoute-today [data-weather-summary]').waitFor();
   }
   const geometry=await readGeometry();
   const fits=g=>g.plotTop>=0&&g.plotBottom<=g.nav&&g.plotLeft>=0&&g.plotRight<=width;
   const fit=fits(geometry);
   const hasAdvice=scored||noaaLoss||inputState==='synthetic-history';
   assert.equal(geometry.adviceLineCount,actual.length);
   assert.equal(geometry.adviceLineCount>0,hasAdvice,'expected presence of real advice');
   assert.equal(geometry.adviceVisible,hasAdvice,'each expected advice line is visible');
   if(inputState!=='shipped-feed')assert.equal(geometry.scoreAvailable,scored,'expected score availability');
   assert.equal(geometry.scoreMatchesResolver,geometry.scoreAvailable,'rendered score follows resolved availability');
   assert.equal(geometry.scoreVisible,geometry.scoreAvailable,'resolved score visible on first screen');
   assert.equal(geometry.scoreMissingUI,!geometry.scoreAvailable,'unavailable score has its explicit missing rendering');
   if(geometry.scoreAvailable)assert(geometry.sourceMatchesAuthority,'source identifies the resolved authority');
   if(scored){
    assert(geometry.scoreMatchesResolver&&geometry.sourceMatchesExpert&&geometry.scoreVisible&&geometry.toneVisible,
     'visible score, source and tone from the registered historical decision');
   }
   assert.equal(geometry.scrollY,0,'cold load starts at top');
   assert(geometry.pageWidth<=width,'no horizontal page overflow');
   let scroll=null;
   if(!fit){
    scroll=await compactSun.evaluate(el=>{
     const plot=el.closest('svg');
     plot.scrollIntoView({block:'center',behavior:'instant'});
     const r=plot.getBoundingClientRect();
     const mobileNav=document.getElementById('mobileNav');
    const nav=mobileNav?.checkVisibility()?Math.min(innerHeight,mobileNav.getBoundingClientRect().top):innerHeight;
     const full=r.top>=0&&r.bottom<=nav&&r.left>=0&&r.right<=innerWidth;
     return {full,top:r.top,bottom:r.bottom};
    });
    await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   }
  const row={lang,inputState,date:day,feedState:initialFeed.state,width,height,mustFit,compact,...geometry,fit,scroll};
  console.log('LAYOUT '+JSON.stringify(row));
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&inputState==='synthetic-history'&&
    ((width===375&&height===700&&['es','fr'].includes(lang))||([320,321,375].includes(width)&&((height===741&&lang==='es')||(height===800&&lang==='fr'))))){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await p.screenshot({path:path.join(out,lang+'-'+width+'x'+height+'.png'),mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
  }
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&scored&&!fresh&&!noaaLoss&&
    ((width===321&&height===741&&lang==='es')||(width===375&&height===800&&lang==='fr'))){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await p.screenshot({path:path.join(out,'scored-'+lang+'-'+width+'x'+height+'.png'),
    mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
  }
  if(fresh){
   const warning=p.locator('#nrRoute-today [data-weather-summary]');
   const full=p.locator('#nrRoute-today [data-space-scene=today]');
   const alert=await warning.evaluate(button=>{
    const card=document.querySelector('#nrRoute-today [data-space-scene=today]');
    const rect=button.getBoundingClientRect(),mobileNav=document.getElementById('mobileNav');
    const nav=mobileNav?.checkVisibility()?Math.min(innerHeight,mobileNav.getBoundingClientRect().top):innerHeight;
    const range=document.createRange();range.selectNodeContents(button);
    const visible=button.checkVisibility()&&rect.top>=0&&rect.bottom<=nav&&
     [...range.getClientRects()].every(r=>r.left>=rect.left-1&&r.right<=rect.right+1&&r.top>=rect.top-1&&r.bottom<=rect.bottom+1);
    return {visible,touchHeight:rect.height,mentionsG3:button.textContent.includes('G3'),sameText:!!button.textContent.trim()&&button.textContent===card.querySelector('.sr-space-forecast').textContent,
     tone:button.dataset.tone,matchesTone:button.dataset.tone===card.dataset.tone,afterSun:card.previousElementSibling?.matches('[data-p0-feed-state]')};
   });
   assert(alert.touchHeight>=44&&alert.tone===(syntheticStorm?'storm':'watch')&&(!syntheticStorm||alert.mentionsG3),'complete and accessible warning for the actual severity');
   assert(geometry.afterHero&&fit,'fresh historical score, advice and full solar plot together');
   assert(alert.visible&&alert.sameText&&alert.matchesTone&&alert.afterSun&&['watch','storm'].includes(alert.tone),
    'visible complete alert and matching severity before the full weather card');
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&width===321){
    const dir=path.join(process.env.VERIFY_CLOCK_EVIDENCE_DIR,syntheticStorm?'storm-shots':'fresh-shots');await fs.mkdir(dir,{recursive:true});
    await p.screenshot({path:path.join(dir,(syntheticStorm?'storm-':'fresh-')+lang+'-321x741.png'),mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
   }
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&lang==='uk'&&!syntheticStorm&&[[440,780],[768,1024],[1280,800]].some(([w,h])=>w===width&&h===height)){
    const out=path.join(process.env.VERIFY_CLOCK_EVIDENCE_DIR,'wide-shots');await fs.mkdir(out,{recursive:true});
    await p.screenshot({path:path.join(out,'uk-'+width+'x'+height+'.png'),mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
   }
   await warning.focus();await p.keyboard.press('Enter');
   assert(await full.locator('h3').evaluate(el=>el===document.activeElement),'keyboard opens the complete weather alert');
   return {...row,weatherAlert:alert,keyboardOpensWeather:true};
  }
  if(noaaLoss){
   const copy={
    uk:['Недостатньо даних','Оцінки на цей день немає.'],
    en:['Insufficient data','No score for this day.'],
    es:['Datos insuficientes','No hay puntuación para este día.'],
    fr:['Données insuffisantes','Pas de score pour ce jour.'],
   }[lang];
   const [expertButton,missingButton,calendarLabel,calendarReason]={
    uk:['Джерело: експертна оцінка','Оцінка недоступна','Календар джерела','нові починання'],
    en:['Source: expert assessment','Score unavailable','Source calendar','new beginnings'],
    es:['Fuente: valoración experta','Puntuación no disponible','Calendario de la fuente','nuevos comienzos'],
    fr:['Source : évaluation experte','Note indisponible','Calendrier de la source','nouveaux commencements'],
   }[lang];
   const projection=await p.waitForFunction(({day,expert,expected,copy})=>{
    const route=document.querySelector('#nrRoute-today'),hero=route?.querySelector('.nr-o-hero');
    const registry=window.NRConsumerAuthority?.registryStatus(),decision=window.NRConsumerAuthority?.expertFor(day);
    if(window.__srConsumerLoadState!=='ready'||!['ok','partial'].includes(registry?.status)||
       route?.querySelector('[data-overview] select')?.value!==day||
       route?.querySelector('[data-p0-feed-state]')?.dataset.state!=='missing')return false;
    const result=window.fp469ConsumerForDate({ds:day}),tone=hero.querySelector('.nr-dv-tone');
    return {
     registeredCalendarMarkMatches:window.NRConsumerAuthority.calendarMarksFor(result.feed,day)?.includes('День порожні руки, несприятливий')===true,
     withheldDayLoaded:window.__nrFormulaFeedStamp>0&&!result.feed?.channels?.source_formula,
     authorityMatches:result.consumer.authority===(expert?'expert_pdf':'source_formula')&&
      (expert?decision?.score===expected:!decision)&&result.consumer.score===expected,
     missingCopyMatches:expert||tone.textContent.trim()===copy[1],
     missingSourceMatches:expert||hero.querySelector('[data-today-source]').textContent.trim()===copy[0],
     noWeatherWarning:!route.querySelector('[data-weather-summary]')&&
      !route.querySelector('[data-space-scene=today]:is([data-tone=watch],[data-tone=storm])'),
    };
   },{day,expert:noaaExpert,expected:noaaExpert?noaaLossRegistry.decision.score:null,copy},{polling:50,timeout:30000}).catch(async error=>{
    const readiness=await p.evaluate(day=>({
     load:window.__srConsumerLoadState,registry:window.NRConsumerAuthority.registryStatus().status,
     dateMatches:document.querySelector('#nrRoute-today [data-overview] select')?.value===day,
     feed:document.querySelector('#nrRoute-today [data-p0-feed-state]')?.dataset.state,
    }),day);
    console.error('NOAA loss readiness '+JSON.stringify({lang,inputState,width,height,...readiness}));
    throw error;
   });
   let checked;
   try{checked=await projection.jsonValue();}finally{await projection.dispose();}
   const failed=Object.keys(checked).filter(label=>!checked[label]);
   if(failed.length)console.error('NOAA loss '+lang+' '+inputState+': '+failed.join(', '));
   assert.equal(failed.length,0,'NOAA loss UI matches the withheld source and selected authority');
   assert(geometry.sourceVisible&&geometry.toneVisible&&fit,'NOAA loss source, verdict and complete chart on first screen');
   const hero=p.locator('#nrRoute-today .nr-o-hero');
   const chip=hero.locator('[data-p0-authority]');
   const label=noaaExpert?expertButton:missingButton;
   const buttonTextMatches=await chip.count()===1&&(await chip.innerText()).trim()===label;
   assert(buttonTextMatches,'NOAA loss visible authority button text matches the selected source');
   const buttonAccessibleNameMatches=await chip.and(hero.getByRole('button',{name:label,exact:true})).count()===1;
   assert(buttonAccessibleNameMatches,'NOAA loss authority button has the matching accessible name');
   const buttonAuthorityMatches=await chip.getAttribute('data-p0-authority')===(noaaExpert?'expert':'none');
   assert(buttonAuthorityMatches,'NOAA loss authority button identifies the selected source');
   const buttonInViewport=await chip.evaluate(el=>{
    const r=el.getBoundingClientRect(),nav=document.querySelector('#mobileNav');
    const bottom=nav?.checkVisibility()?Math.min(innerHeight,nav.getBoundingClientRect().top):innerHeight;
    return el.checkVisibility()&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=bottom;
   });
   assert(buttonInViewport,'NOAA loss authority button is visible on opening');
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&lang==='uk'&&width===321){
    const dir=path.join(process.env.VERIFY_CLOCK_EVIDENCE_DIR,'noaa-loss-shots');await fs.mkdir(dir,{recursive:true});
    await p.screenshot({path:path.join(dir,inputState+'-321x741.png'),mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
   }
   const why=hero.locator('[data-day-why]');
   const whySummary=why.locator('summary');
   await whySummary.focus();await p.keyboard.press('Enter');
   const reason=why.locator('li').filter({has:p.getByText(calendarLabel,{exact:true})}).locator('strong');
   const calendarReasonMatches=await reason.count()===1&&await reason.isVisible()&&(await reason.textContent()).includes(calendarReason);
   assert(calendarReasonMatches,'NOAA loss explains the verified calendar caution for this day');
   await whySummary.focus();await p.keyboard.press('Enter');
   const details=p.locator('#nrRoute-today details').filter({has:p.locator('[data-score-source]')});
   const closedBefore=await details.count()===1&&!await details.evaluate(el=>el.open);
   await chip.focus();await p.keyboard.press('Enter');
   const buttonOpensSource=closedBefore&&await details.evaluate(el=>el.open)&&await details.locator('[data-score-source]').isVisible();
   assert(buttonOpensSource,'NOAA loss authority button opens the source details by keyboard');
   if(nativeLoss){
    const nativeMarks=await p.evaluate(day=>window.NRConsumerAuthority.calendarMarksFor(window.fp469ConsumerForDate({ds:day}).feed,day),day);
    assert.deepEqual(nativeMarks,['сприятливий для подорожей','сприятливий для стрижки','День порожні руки, несприятливий']);
    const good=hero.locator('[data-day-verdict] .nr-dv-good');
    const expectedTopics=await p.evaluate(()=>['Подорожі','Стрижка й особистий догляд'].map(t=>window.NRLocale.text(t)));
    const topics=(await good.textContent()).trim();
    assert(expectedTopics.every(t=>topics.includes(t)),'native selected travel and haircut topics reach the visible verdict');
    checked.nativeMarksMatch=true;checked.nativeTopicsMatch=true;checked.fixture='historical-replay-of-28-native-observations';
   }
   let expiry,bfcache;
   if(checkExpiry){
    await whySummary.focus();await p.keyboard.press('Enter');
    const retained=await p.evaluateHandle(ds=>({doc:document,row:window.fp469ConsumerForDate({ds}).feed}),day);
    const form=nativeLoss?'native':'projected',mode=checkExpiry;
    const issuedAt=JSON.parse(withheldBody).generated_at;
    // 20 October 2026 starts at 21:00 UTC on the previous day in Europe/Kyiv.
    const midnight=Date.parse('2026-10-19T21:00:00Z');
    const boundary=mode==='midnight'?midnight:Date.parse(issuedAt)+8*3600000;
    const wanted=nativeLoss?['сприятливий для подорожей','сприятливий для стрижки','День порожні руки, несприятливий']:['День порожні руки, несприятливий'];
    const unavailable={uk:'Дані календаря недоступні',en:'Calendar data unavailable',es:'Datos del calendario no disponibles',fr:'Données du calendrier indisponibles'}[lang];
    const priorForecast={};
    const sample=async(stage,offsetMs)=>{
     const nextDay=mode==='midnight'&&offsetMs>=0;
     const selected=nextDay?'2026-10-20':day,live=mode==='midnight'?!nextDay:offsetMs<=0;
     const observed=await retained.evaluate(({doc,row},a)=>{
      const {ds,selected,live,mustRetain,expert,deadline,offsetMs,calendarLabel,calendarReason,unavailable,missingText,wanted}=a;
      const root=document.querySelector('#nrRoute-today .nr-o-hero'),model=window.fp469ConsumerForDate({ds:selected});
      const why=root.querySelector('[data-day-why]'),tone=root.querySelector('.nr-dv-tone');
      const calendar=[...why.querySelectorAll('li')].find(x=>x.querySelector('span')?.textContent===calendarLabel)?.querySelector('strong');
      const advice=[...root.querySelectorAll('[data-day-verdict] p:not(.nr-dv-tone)')];
      const score=root.querySelector('.nr-o-score'),chip=root.querySelector('[data-p0-authority]');
      const decision=window.NRConsumerAuthority.expertFor(selected);
      const marksMatch=(marks,known)=>known?JSON.stringify(marks)===JSON.stringify(wanted):marks===null;
      // A consumer refresh can replace the retained record with an unregistered
      // empty feed. In either case the current model must expose no usable marks.
      const selectedMarksMatch=marks=>live?marksMatch(marks,true):
       marks==null&&window.NRConsumerAuthority.calendarMarksFor(model.feed,selected)===null;
      return {timeMatches:Date.now()===deadline+offsetMs,sameDocument:document===doc,
       selectedDayMatches:document.querySelector('#nrRoute-today [data-overview] select')?.value===selected,
       calendarReaderMatches:marksMatch(window.NRConsumerAuthority.calendarMarksFor(row,selected),live),
       retainedPropertyMatches:marksMatch(row.calendar_marks,mustRetain||live),currentPropertyMatches:selectedMarksMatch(model.feed?.calendar_marks),
       noFormulaContribution:!model.feed?.channels?.source_formula,authorityMatches:expert?model.consumer.authority==='expert_pdf'&&!!decision&&model.consumer.score===decision.score:
        !decision&&model.consumer.available===false&&model.consumer.score===null,
       scorePresentationMatches:expert?score.textContent.trim()===window.SkyScore.formatScore(decision?.score)&&chip?.dataset.p0Authority==='expert':
        score.dataset.ring==='missing'&&!/\d/.test(score.textContent)&&tone.textContent===missingText&&chip?.dataset.p0Authority==='none',
       calendarAdviceMatches:live?advice.some(x=>x.textContent.includes(calendarReason)):advice.length===0,
       explanationMatches:!!calendar&&(live?calendar.textContent.includes(calendarReason):calendar.textContent===unavailable)};
     },{ds:day,selected,live,mustRetain:mode==='midnight',expert:noaaExpert,deadline:boundary,offsetMs,calendarLabel,calendarReason,unavailable,missingText:copy[1],wanted});
     if(mode!=='midnight')observed.explanationMatches=observed.explanationMatches&&await why.evaluate(x=>x.open&&x.querySelector('strong')?.checkVisibility());
     if(mode==='midnight'&&lang==='uk'&&nativeLoss){
      const automaticForecastDay=await p.locator('#nrRoute-forecast [data-overview] select').inputValue();
      priorForecast[stage]=automaticForecastDay;
      assert.equal(automaticForecastDay,selected,'untouched forecast follows the first Kyiv midnight before manual selection');
     }
     const failed=Object.keys(observed).filter(k=>observed[k]!==true);
     if(failed.length)console.error('Calendar '+(mode==='ttl'?'expiry':mode)+' '+inputState+' '+stage+' '+failed.join(', '));
     assert.equal(failed.length,0,'calendar expiry updates the already-open page at the source deadline');
     return {inputState,form,lang,width,height,mode,stage,offsetMs,selectedDay:selected,issuedAt,boundaryAt:new Date(boundary).toISOString(),...observed};
    };
    expiry=[];
    try{
     if(mode==='ttl'||mode==='midnight'){
      for(const [stage,offsetMs] of [['before',-1],['at',0],['after',1]]){
       if(stage==='before')await p.clock.pauseAt(new Date(boundary-1));
       else await p.clock.runFor(1);
       expiry.push(await sample(stage,offsetMs));
      }
     }else if(mode==='visibility-resume'||mode==='pageshow-persisted'){
      // Simulated sleep skips scheduled timers. Frame processing after wake stays far
      // short of the remaining monotonic minute before the original expiry callback.
      await p.clock.pauseAt(new Date(boundary-60000));
      // Drain already-queued rendering from the preceding keyboard checks while the
      // calendar is still valid. The next deadline timer remains almost a minute away.
      await p.clock.runFor(1000);
      await p.clock.setSystemTime(new Date(boundary+1));
      const stale=()=>p.locator('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)').allTextContents();
      const beforeEventStale=(await stale()).some(x=>x.includes(calendarReason));
      assert(beforeEventStale,'sleep simulation preserves the stale DOM before its lifecycle event');
      const resumed=await p.evaluate(mode=>{
       if(mode==='visibility-resume'){
        if(document.hidden)return false;
        document.dispatchEvent(new Event('visibilitychange'));
       }else window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
       return true;
      },mode);
      assert(resumed,'resume event reaches the active document');
      await p.clock.runFor(32);
      expiry.push({...await sample('resumed',33),beforeEventStale,eventOffsetMs:1,eventSimulation:true});
     }else if(mode==='bfcache'){
      // Real navigation with Chromium's BFCache enabled. isTrusted and the window-held
      // document reference exclude a synthetic pageshow and a reload on the return trip.
      await p.clock.pauseAt(new Date(boundary-8000));
      await p.clock.resume();
      await p.evaluate(()=>{
       window.__clockCache={doc:document,leftAt:Date.now()};
       for(const kind of ['freeze','resume'])document.addEventListener(kind,e=>{window.__clockCache[kind]={trusted:e.isTrusted,at:Date.now()};},{once:true,capture:true});
       window.addEventListener('pageshow',e=>Object.assign(window.__clockCache,{persisted:e.persisted,trusted:e.isTrusted}),{once:true});
      });
      const session=await c.newCDPSession(p);await session.send('Page.enable');
      session.on('Page.backForwardCacheNotUsed',e=>console.error('BFCache CDP reasons '+JSON.stringify(e.notRestoredExplanations.map(x=>x.reason))));
      await p.goto(base+'/__clock_resume_away',{waitUntil:'domcontentloaded'});
      await new Promise(resolve=>setTimeout(resolve,8500));
      await p.goBack({waitUntil:'commit'});
      const diagnostic=await p.evaluate(()=>performance.getEntriesByType('navigation')[0]?.notRestoredReasons?.toJSON());
      if(diagnostic)console.error('BFCache reasons '+JSON.stringify(diagnostic.reasons?.map(r=>r.reason)));
      await p.waitForFunction(()=>window.__clockCache?.persisted===true,null,{timeout:8000});
      const state=await p.evaluate(boundary=>({persisted:window.__clockCache?.persisted===true,trusted:window.__clockCache?.trusted===true,
       sameDocument:window.__clockCache?.doc===document,historyFreezeTrusted:window.__clockCache?.freeze?.trusted===true,historyResumeTrusted:window.__clockCache?.resume?.trusted===true,
       freezeBeforeExpiry:window.__clockCache?.freeze?.at<boundary,resumeAfterExpiry:window.__clockCache?.resume?.at>boundary,
       freezeOffsetMs:window.__clockCache?.freeze?.at-boundary,resumeOffsetMs:window.__clockCache?.resume?.at-boundary,leftBeforeExpiry:window.__clockCache?.leftAt<boundary,
       returnedAfterExpiry:Date.now()>boundary}),boundary);
      assert(state.persisted&&state.trusted&&state.sameDocument&&state.historyFreezeTrusted&&state.historyResumeTrusted,'real Chromium history traversal restores the exact document from BFCache');
      assert(state.leftBeforeExpiry&&state.freezeBeforeExpiry&&state.resumeAfterExpiry&&state.returnedAfterExpiry,'wall clock crossed source expiry during the real history traversal');
      await p.waitForFunction(()=>!document.querySelector('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)')&&
       document.querySelector('#nrRoute-today [data-day-why]')?.textContent.includes('Дані календаря недоступні'),null,{timeout:4000});
      bfcache={...state,calendarRemoved:true,clock:'running Playwright wall clock',mode:'real-browser-history',lang,width,height,inputState,form};
     }
    }finally{await retained.dispose();}
    // This existing historical tab just crossed into 20 October. Select an offered
    // day and follow it across the next midnight without adding another index startup.
    if(mode==='midnight'&&lang==='uk'&&nativeLoss){
     await p.clock.resume();pinnedDates.push(await pinnedMidnight(p,'index.html',noaaExpert?'2026-10-20':'2026-10-22',{route:'forecast',before:priorForecast.before,at:priorForecast.at}));
    }
   }
   return {...row,...checked,...(expiry?{expiry}:{}),...(bfcache?{bfcache}:{}),calendarReasonMatches,buttonTextMatches,buttonAccessibleNameMatches,buttonAuthorityMatches,
    buttonInViewport,buttonOpensSource,sourceMatchesAuthority:noaaExpert?geometry.sourceMatchesExpert:checked.missingSourceMatches,responseMatches:true};
  }
  if(scored||inputState==='missing-no-advice')return row;
  if([320,375].includes(width)&&height===741){
   // Cold launches cover each anchor. The same loaded page then exercises
   // every integer height so the space between anchors is actually measured.
   const heights=[{height,...geometry,fit}];
   for(let h=742;h<=800;h++){
    await p.setViewportSize({width,height:h});
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const g=await readGeometry();
    heights.push({height:h,...g,fit:fits(g)});
   }
   for(const item of heights){
    if(!(item.fit&&item.scrollY===0&&item.pageWidth<=width&&item.compactCss&&item.compactJs&&item.adviceVisible===hasAdvice&&item.sourceVisible&&
         item.afterHero&&item.verdictBottom<=item.nav&&item.scoreBottom<=item.nav)){
     console.error('HEIGHT_BAND '+JSON.stringify({lang,inputState,width,...item}));
     assert.fail('height-band layout must fit at every integer viewport');
    }
   }
   row.heightSweep=heights;
  }
  if(width===321&&height===741){
   // 741 is the shortest target height. Measure every integer width here,
   // independently from the cold starts and height sweeps.
   const widths=[];
   for(let w=321;w<=375;w++){
    if(w!==321){
     await p.setViewportSize({width:w,height});
     await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    const g=await readGeometry();
    const full=g.scrollY===0&&g.pageWidth<=w&&g.plotTop>=0&&g.plotBottom<=g.nav&&g.plotLeft>=0&&g.plotRight<=w;
    assert(full&&g.compactCss&&g.compactJs&&g.adviceVisible===hasAdvice&&g.sourceVisible&&
     g.afterHero&&g.verdictBottom<=g.nav&&g.scoreBottom<=g.nav,'width-band geometry');
    widths.push({width:w,...g,fit:full});
   }
   row.widthSweep=widths;
  }
  if([320,375].includes(width)&&height===800){
   const explanation=p.locator('#nrRoute-today [data-day-why]');
   const summary=explanation.locator('summary');
   const {date}=await settledTodayFeed(p,true);
   await summary.focus();
   await p.keyboard.press('Enter');
   await explanation.locator('ul').waitFor({state:'visible',timeout:5000});
   async function assertFocused(phase){
    const state=await summary.evaluate(el=>({focused:el===document.activeElement,open:el.parentElement.open,
     activeTag:document.activeElement?.tagName}));
    if(!state.focused||!state.open)console.error('HEIGHT_FOCUS '+JSON.stringify({lang,inputState,width,height,phase,...state}));
    assert(state.focused&&state.open,'keyboard focus and open reasons persist');
   }
   await assertFocused('before-resize');
   // Cross the compact height boundary (932 -> 933) and return.
   await p.setViewportSize({width,height:933});
   const outside=await settledTodayFeed(p,false);
   assert.equal(outside.date,date,'height boundary preserves selected date');
   await assertFocused('outside-compact');
   await p.setViewportSize({width,height});
   assert.equal((await settledTodayFeed(p,true)).date,date,'returning to compact preserves selected date');
   await assertFocused('back-in-compact');
   await p.keyboard.press('Enter');
   await explanation.locator('ul').waitFor({state:'hidden',timeout:5000});
   row.heightBoundaryFocus=true;
  }
  // Keep the original resize regression on the 320×694 cases, separately
  // from all cold geometry observations.
  if(width!==320||height!==694)return row;
   await p.goto(base+'/index.html?channel=play&resize-regression=1#panch',{waitUntil:'domcontentloaded'});
  await p.locator('[data-sky-live] [data-sky-example]').waitFor();
  assert.ok(await p.locator('[data-sky-live] .nr-sl-body').count()>=7);
  await p.evaluate(()=>fp434Go('today',false));
  const beforeResize=await settledTodayFeed(p,true);
  await p.setViewportSize({width:430,height:933});
  const wide=await settledTodayFeed(p,false);
  if(lang==='en'&&inputState==='synthetic-history'){
   // Reproduce the original boundary: resize back while a stale-feed refresh
   // is in flight. The DOM can already be reparented while it says "loading".
   let resumeFeed;
   holdFeed=new Promise(resolve=>{resumeFeed=resolve;});
   try{
    await p.evaluate(()=>{void window.fp469LoadConsumerForecast();});
    await p.setViewportSize({width:320,height:694});
    await p.waitForFunction(()=>{
     const box=document.querySelector('#nrRoute-today [data-p0-feed-state]');
     return box?.previousElementSibling?.hasAttribute('data-sky-clock')&&box.dataset.state==='loading';
    },null,{timeout:15000});
   }finally{
    holdFeed=null;
    resumeFeed();
   }
  }else await p.setViewportSize({width:320,height:694});
  const narrow=await settledTodayFeed(p,true);
  for(const observation of [wide,narrow]){
   assert.equal(observation.date,beforeResize.date,'resize preserves selected date');
   assert.equal(observation.state,beforeResize.state,'resize preserves settled feed state');
   assert.equal(observation.source,beforeResize.source,'resize preserves complete source');
  }
  if(inputState==='synthetic-history')assert(await status.isVisible(),'resize retains the stale notice');
  const why=p.locator('#nrRoute-today [data-day-why]');
  const summary=why.locator('summary'),reasonList=why.locator('ul');
  try{
   await summary.click();
   await reasonList.waitFor({state:'visible',timeout:5000});
   assert.ok((await reasonList.locator('li').count())>0,'the open list contains reasons');
   await why.evaluate(details=>{
    window.NRConsumerOverview.update();
    if(!details.isConnected||!details.open)throw Error('open details lost during overview refresh');
   });
   await reasonList.waitFor({state:'visible',timeout:5000});
   await summary.click();
   await reasonList.waitFor({state:'hidden',timeout:5000});
   // Force the regular renderer between click dispatch and the native toggle.
   await summary.evaluate(node=>node.addEventListener('click',()=>window.NRConsumerOverview.update(),{once:true}));
   await summary.click();
   await reasonList.waitFor({state:'visible',timeout:5000});
   await summary.click();
   await reasonList.waitFor({state:'hidden',timeout:5000});
   assert.equal(await why.evaluate(node=>node.open),false);
  }catch(error){
   const state=await why.evaluate(node=>({open:node.open,items:node.querySelectorAll('ul>li').length})).catch(()=>null);
   console.error('REASONS '+JSON.stringify({lang,inputState,width,height,state}));
   throw error;
  }
  if(lang==='uk'){
  const localSun=p.locator('[data-sun-first-screen]');
  await localSun.waitFor();
  assert.match(await localSun.innerText(),/Сонце під горизонтом.*Київ · типове місце/);
  assert.equal(await p.locator('#headerSub').isVisible(),false);

  await p.locator('[data-sky-clock] [data-time-open]').click({noWaitAfter:true});
  await p.locator('[data-sky-live] .nr-sl-body[data-body=Sun]').waitFor();
  assert.match(await p.locator('#nrSkyLiveHeading').textContent(),/Києвом/);
  }
  return {...row,resizeRegression:true,reasonsRegression:true};
  }finally{await c.close();}
  }
  // The single-day fixture is an unchanged historical row from fc7150ca98f99a79f5f60cf3a805bfe647a070ba.
  // It cannot drift with the current cloud feed or expose another date's inputs.
  async function candidateFeed(lang){
   const candidate=await fs.readFile(path.join(root,'consumer_cloud/forecast.json'));
   const feed=JSON.parse(candidate);
   assert.equal(feed.schema,'independent_forecast_feed_v1');
   assert.equal(feed.source_integrity?.status,'PASS');
   // An issue just before Kyiv midnight still belongs to that civil day.
   const now=Date.parse(feed.generated_at);
   assert(Number.isFinite(now),'valid candidate issue time');
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
   const day=feed.days?.[date],row=day?.channels?.source_formula;
   assert(day?.date===date&&row,'candidate day is present for its Kyiv issue date');
   assert.equal(row.generated_at,feed.generated_at,'formula belongs to this issue');
   assert.equal(typeof row.available,'boolean');
   if(row.available){
    assert(Number.isInteger(row.value)&&Math.abs(row.value)<=3,'available formula has a valid value');
   }else{
    assert.equal(row.value,null,'unavailable formula has no substituted value');
    if(row.kp_source_requirement==='NOAA_3day_slots'){
     assert.equal(row.status,'missing_kp');
     assert.equal(row.availability_reason,'short_range_coverage_lost');
     assert.equal(row.raw,null);
     assert.deepEqual(row.factors,[]);
    }
   }
   assert.equal(day.source_formula_result?.score,row.value,'public formula projection agrees');
   const c=await browser.newContext({viewport:{width:321,height:741},locale:lang,timezoneId:'Europe/Kyiv',serviceWorkers:'block'});
   try{
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
    await c.addInitScript(language=>{
     localStorage.setItem('nr_locale_v1',language);
     localStorage.setItem('gidx_onboard_done_v2','1');localStorage.setItem('srPrivacyNoticeDismissed','1');
    },lang);
    const page=await c.newPage();await page.clock.setFixedTime(new Date(now));
    const delivered=page.waitForResponse(r=>r.url()===base+'/consumer_cloud/forecast.json');
    await page.goto(base+'/index.html?channel=play#today',{waitUntil:'commit'});
    const response=await delivered;
    assert.equal(response.status(),200);
    assert((await response.body()).equals(candidate),'network bytes match the candidate feed');
    const state=await settledTodayFeed(page,true,row.available?undefined:'missing');
    assert.equal(state.date,date);
    assert(row.available?['fresh','stale'].includes(state.state):state.state==='missing','valid formula freshness at issue time');
    // A withheld row can start a background refresh between two browser calls.
    // Sample the completed load, selected date, formula state and DOM in one turn.
    const handle=await page.waitForFunction(({date,issued,value,available,feedState,lang})=>{
     if(window.__srConsumerLoadState!=='ready')return false;
     const root=document.querySelector('#nrRoute-today');
     if(root.querySelector('[data-overview] select')?.value!==date)return false;
     const raw=window.fp469ConsumerForDate({ds:date});
     const painted=root.querySelector('[data-p0-feed-state]')?.dataset.state;
     if(painted!==feedState||window.SRP0Layout.dataState(raw.consumer,'ready',navigator.onLine)!==painted)return false;
     const own=raw.feed?.channels?.source_formula,score=root.querySelector('.nr-o-hero .nr-o-score');
     const api=window.NRConsumerAuthority,registry=api.registryStatus();
     const conflict=registry.conflict_dates.includes(date),expert=api.expertFor(date);
     const expected=conflict?null:expert?.score??(feedState==='fresh'?value:null);
     const authority=(conflict||expert)?'expert_pdf':'source_formula';
     const grade=expected===null?root.querySelector('.nr-o-hero .nr-dv-tone'):score;
     const missingText={uk:'Оцінки на цей день немає.',en:'No score for this day.',
      es:'No hay puntuación para este día.',fr:'Pas de score pour ce jour.'};
     const box=grade.getBoundingClientRect(),nav=document.getElementById('mobileNav').getBoundingClientRect().top;
     return {language:window.NRLocale.language===lang,
      // selectFeeds registers the day model but excludes withheld formula rows.
      loaded:available?own?.available===true&&own.value===value&&own.generated_at===issued:
       own===undefined&&window.__nrExpertModels?.[date]?.date===date,
      visible:grade.checkVisibility({visibilityProperty:true,opacityProperty:true})&&
       box.width>0&&box.height>0&&box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=nav&&
       (expected!==null||grade.textContent.trim()===missingText[lang]),
      scoreMatches:['ok','partial'].includes(registry.status)&&raw.consumer.authority===authority&&
       raw.consumer.available===(expected!==null)&&raw.consumer.score===expected&&
       score.textContent.trim()===window.SkyScore.formatScore(expected)&&
       (score.dataset.ring==='missing')===(expected===null)};
    },{date,issued:row.generated_at,value:row.value,available:row.available,feedState:state.state,lang},{polling:50,timeout:10000});
    let rendered;
    try{rendered=await handle.jsonValue();}finally{await handle.dispose();}
    const failed=Object.keys(rendered).filter(key=>rendered[key]!==true);
    if(failed.length)console.error('Candidate UI assertions: '+failed.join(', '));
    assert.equal(failed.length,0,'candidate feed reaches the selected day and visible final score');
    return {lang,inputState:'candidate-file',width:321,height:741,feedState:state.state,responseMatches:true,...rendered};
   }finally{await c.close();}
  }
  if(wideOnly||!layoutOnly){
   const rows=[];
   const phones=[[431,741],[440,780],[480,800],[500,741]];
   const larger=[[600,741],[768,768],[768,1024],[1024,768],[1280,800],[1920,1080]];
   for(const lang of ['uk','en','es','fr']){
    for(const [width,height] of [...phones,...larger]){
     const states=width<=500?['fresh-history','scored-history','shipped-feed','synthetic-history','missing-no-advice','synthetic-storm']:['fresh-history','synthetic-storm'];
     for(const inputState of states){
      const row=await coldLayout({lang,width,height,inputState,mustFit:true});
      assert(row.fit&&row.afterHero&&row.sourceVisible&&row.compactCss&&row.compactJs,'visible wide first screen on cold opening');
      rows.push(row);
     }
    }
   }
   assert.equal(rows.length,144);
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
    const dir=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'wide-matrix.json'),JSON.stringify(rows,null,2));
   }
   console.log('PASS full chart on 144 wide cold openings');
   if(wideOnly)return;
  }
  if(edgeSmoke||nativeSmoke||nativeOnly||noaaOnly||!layoutOnly){
   const fixtures=path.join(root,'tools/public/fixtures');
   noaaLossFeed=require('node:child_process').execFileSync('python',['-B',path.join(root,'tools/public/noaa_loss_fixture.py')],{encoding:'utf8'}).trim();
   const day='2026-10-19',projected=JSON.parse(noaaLossFeed),withheld=projected.days[day];
   const formula=withheld.channels.source_formula;
   assert.deepEqual(Object.keys(projected.days),[day]);
   assert.deepEqual(projected.availability_projection.withheld_dates,[day]);
   assert.equal(formula.status,'missing_kp');
   assert.equal(formula.availability_reason,'short_range_coverage_lost');
   assert.equal(formula.kp_source_requirement,'NOAA_3day_slots');
   assert.equal(formula.available,false);
   for(const key of ['value','raw','kp_input','kp_source','kp_daily_max','noaa_issued_at','noaa_retrieved_at'])assert.equal(formula[key],null);
   assert.deepEqual(formula.factors,[]);
   assert.deepEqual(formula.calendar_marks,{date:day,source:'source_formula_calendar_factors',marks:['День порожні руки, несприятливий']});
   assert.equal(withheld.source_formula_result.score,null);
   const withExpert=JSON.parse(await fs.readFile(path.join(fixtures,'decisions_regression.json'),'utf8'));
   const decisions=withExpert.decisions.filter(d=>d.date===day);
   assert.equal(decisions.length,1);
   assert(Number.isInteger(decisions[0].score));
   const without=(dates)=>({...withExpert,decisions:withExpert.decisions.filter(d=>!dates.includes(d.date))});
   noaaLossRegistry={withExpert,decision:decisions[0],withoutExpert:without([day]),withoutEitherDay:without([day,'2026-10-20'])};
   // Rebase the 28 observed symbols from the 13 December native missing-Kp row
   // shipped at f63dd13 to the historical 19 October feed and expert registry.
   const native=structuredClone(projected),own=native.days[day].channels.source_formula;
   delete native.availability_projection;delete own.calendar_marks;delete own.kp_source_requirement;delete own.availability_reason;
   own.kp_input={};
   const symbols={};
   for(const symbol of ('bolt books diwali dress ekadashi first_lunar_day full_moon hand heart masik_shivaratri medical_cross megaphone '+
    'navaratri new_moon pill pitru_paksha plane pradosh sankashti scissors solah_somvar sun_transition_filled sun_transition_outline '+
    'syringe target triangle vijaya_dashami vinayaka_chaturthi').split(' ')){
    const selected=['bolt','plane','scissors','pill'].includes(symbol);
    symbols[symbol]={status:'SOURCE_OBSERVED',observed:selected,selected};
   }
   own.expert_model={version:'expert-factor-model-v2',date:day,calendar_components:{version:'calendar-components-v1',date:day,symbols}};
   nativeLossFeed=JSON.stringify(native);
   const languages=['uk','en','es','fr'],screens=[[321,741],[347,760],[375,800],[430,932]];
   const modes=['ttl','midnight','visibility-resume','pageshow-persisted'];
   if(edgeSmoke&&process.argv.includes('--events-only')){
    for(const [mode,width,height] of [['midnight',347,760],['visibility-resume',375,800],['pageshow-persisted',430,932]]){
     const {expiry}=await coldLayout({lang:'uk',width,height,inputState:'native-loss-expert',mustFit:true,checkExpiry:mode});
     console.log('PASS limited '+mode+' '+expiry.length);
    }
    return;
   }
   async function realBrowserChecks(){
    // The full Chromium distribution, installed by the same pinned Playwright CLI,
    // implements history caching. Chromium headless shell does not exercise this path.
    const fullBrowser=await chromium.launch({channel:'chromium',ignoreDefaultArgs:['--disable-back-forward-cache'],args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    try{
     const options={lang:'uk',width:321,height:741,inputState:'native-loss-expert',mustFit:true,browserDriver:fullBrowser};
     const history=await coldLayout({...options,checkExpiry:'bfcache'});
     return history.bfcache;
    }finally{await fullBrowser.close();}
   }
   if(edgeSmoke&&process.argv.includes('--bfcache-only')){
    console.log('PASS real lifecycle '+JSON.stringify(await realBrowserChecks()));return;
   }
   const projectedRows=[],nativeRows=[],lifecycle=[];
   // A cyclic assignment reaches each language and each screen in each scenario.
   // Both registry states and both feed forms use every assigned pair.
   for(const [li,lang] of languages.entries()){
    for(const [si,[width,height]] of screens.entries()){
     if((nativeSmoke||edgeSmoke)&&li!==0||nativeSmoke&&si!==0)continue;
     const mode=modes[(si-li+4)%4];
     for(const state of ['expert','unavailable']){
      for(const form of ['native','projected']){
       const inputState=(form==='native'?'native-loss-':'noaa-loss-')+state;
       const {expiry,...row}=await coldLayout({lang,width,height,inputState,mustFit:true,checkExpiry:mode});
       (form==='native'?nativeRows:projectedRows).push(row);
       lifecycle.push(...expiry);
      }
     }
    }
   }
   const legacy=lifecycle.filter(r=>r.mode==='ttl'&&r.lang==='uk'&&r.width===321);
   assert.equal(legacy.length,12);assert.equal(nativeRows.length,nativeSmoke?2:edgeSmoke?8:32);
   assert.equal(projectedRows.length,nativeRows.length);assert.equal(lifecycle.length,nativeSmoke?12:edgeSmoke?32:128);
   let cache;
   if(!nativeSmoke){
    cache=await realBrowserChecks();
    pinnedDates.push(await freshPinnedRoute('classic.html?dlDate=2026-10-16'));await savePins();
   }
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
    const dir=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(dir,{recursive:true});
    for(const [file,data] of [['noaa-loss-matrix',projectedRows],['native-loss-matrix',nativeRows],['calendar-ttl-matrix',legacy],['calendar-lifecycle-matrix',lifecycle],['calendar-bfcache',cache]]){
     if(data)await fs.writeFile(path.join(dir,file+'.json'),JSON.stringify(data,null,2));
    }
   }
   console.log('PASS NOAA short-range coverage loss: '+projectedRows.length+' historical cold openings with both registry states');
   console.log('PASS '+nativeRows.length+' native cold openings and 12 open-tab calendar TTL observations');
   console.log('PASS '+nativeRows.length+' native and '+projectedRows.length+' projected openings, '+lifecycle.length+' lifecycle observations');
   if(edgeSmoke||nativeOnly||nativeSmoke)return;
   if(noaaOnly)return;
  }
  if(freshOnly||!layoutOnly){
   const fixtures=path.join(root,'tools/public/fixtures');
   const projectedText=(await fs.readFile(path.join(fixtures,'fresh_20261019.json'),'utf8')).replace(/\r\n/g,'\n');
   // The original forecast Git blob is 185af564f004566f0518e9a5eb5845452461355a.
   assert.equal(require('node:crypto').createHash('sha256').update(projectedText).digest('hex'),'1a96c7411c0c0191158fa4d8b5f528a8fc4dc9e707820ca53c0fb565bb522d33');
   const projection=JSON.parse(projectedText);
   assert.deepEqual(Object.keys(projection.days),['2026-10-19']);
   const source=projection.days['2026-10-19'].channels.source_formula;
   assert.equal(source.generated_at,'2026-10-19T13:11:05.189341+00:00');
   assert.equal(source.noaa_retrieved_at,'2026-10-19T13:11:05.185605+00:00');
   const replay=[];
   for(const lang of ['uk','en','es','fr']){
    for(const [width,height] of (dataScope?[[321,741]]:[[321,741],[375,800],[430,932]])){
     replay.push(await coldLayout({lang,inputState:'fresh-history',width,height,mustFit:true}));
    }
    replay.push(await candidateFeed(lang));
   }
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
    const dir=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'fresh-matrix.json'),JSON.stringify(replay,null,2));
   }
   console.log(dataScope?'PASS data-scope shared clock: 8 cold openings':'PASS fresh-history and candidate feed: 16 cold openings');
   if(!dataScope){
    const storms=[];
    for(const lang of ['uk','en','es','fr']){
     storms.push(await coldLayout({lang,inputState:'synthetic-storm',width:321,height:741,mustFit:true}));
    }
    if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
     await fs.writeFile(path.join(process.env.VERIFY_CLOCK_EVIDENCE_DIR,'storm-matrix.json'),JSON.stringify(storms,null,2));
    }
    console.log('PASS synthetic G3 compact alert and chart: 4 cold openings');
   }
   if(freshOnly)return;
  }
  for(let i=0;i<selectedCases.length;i+=2){
   layouts.push(...await Promise.all(selectedCases.slice(i,i+2).map(coldLayout)));
  }
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await fs.writeFile(path.join(out,'layout-matrix.json'),JSON.stringify(layouts,null,2));
  }
  assert.equal(layouts.length,reasonsOnly?2:scoredOnly?84:heightBandOnly?288:344);
  assert.equal(layouts.filter(row=>row.inputState==='scored-history').length,reasonsOnly?0:84);
  assert.equal(layouts.filter(row=>row.resizeRegression&&row.reasonsRegression).length,reasonsOnly?2:(heightBandOnly||scoredOnly)?0:8);
  assert.equal(layouts.reduce((count,row)=>count+(row.heightSweep?.length||0),0),(reasonsOnly||scoredOnly)?0:960);
  assert.equal(layouts.reduce((count,row)=>count+(row.widthSweep?.length||0),0),(reasonsOnly||scoredOnly)?0:440);
  assert.equal(layouts.filter(row=>row.heightBoundaryFocus).length,(reasonsOnly||scoredOnly)?0:16);
  for(const row of layouts){
   assert.equal(row.compactCss,row.compact,'CSS compact boundary');
   assert.equal(row.compactJs,row.compact,'JS compact boundary');
   assert(row.afterHero&&row.verdictBottom<=row.nav&&row.scoreBottom<=row.nav);
   assert(row.sourceVisible);
   assert.equal(row.adviceVisible,['scored-history','synthetic-history'].includes(row.inputState));
   if(row.mustFit)assert(row.fit,'required first-fold SVG');
   else assert(row.fit||row.scroll?.full,'full SVG accessible by scrolling');
  }
  assert.equal(results.length,layoutOnly?0:3);
  // Output is an allowlist of test labels, never raw feeds, live scores or DOM text.
  console.log(reasonsOnly?'PASS 2 reasons regressions with normal click and forced rerender':scoredOnly?'PASS 84 cold openings with an authenticated historical score and calendar advice':heightBandOnly?'PASS 288 cold openings, 960 height measurements, 440 width measurements and 16 focus checks':'PASS 344 cold openings, 960 height measurements, 440 width measurements, 16 focus checks and 8 resize/reasons regressions');
  if(!layoutOnly)console.log('PASS shared clock round trip ×3, Sun equality, seven bodies, WebGL identity and phase, playback/pause, reduced-motion scrubbing, Kyiv 23/25 h, explicit default');
 }finally{await browser.close();server.close();}
})().catch(e=>{
 // Assertion libraries may include raw actual/expected DOM or feed values.
 // Print only the failure kind and this test's line/column, never their payload.
 const location=String(e.stack||'').match(/verify_shared_clock\.cjs:\d+:\d+/)?.[0]||'shared-clock';
 console.error('FAIL '+location+' ('+(['AssertionError','TimeoutError','Error'].includes(e.name)?e.name:'Error')+'); raw data suppressed');
 server.close();process.exitCode=1;
});
