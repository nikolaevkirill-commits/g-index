'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const type={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
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
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 const start=new Date('2026-11-07T15:29:00Z');
 try{
  const reasonsOnly=process.argv.includes('--reasons-only');
  const heightBandOnly=process.argv.includes('--height-band-only');
  const scoredOnly=process.argv.includes('--scored-only');
  const dataScope=process.env.VERIFY_CLOCK_SCOPE==='data';
  const noaaOnly=process.argv.includes('--noaa-loss-only');
  const freshOnly=dataScope||process.argv.includes('--fresh-only');
  const layoutOnly=noaaOnly||freshOnly||reasonsOnly||heightBandOnly||scoredOnly||process.argv.includes('--layout-only');
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
  let noaaLossFeed, noaaLossRegistry;
  async function coldLayout({lang,inputState,width,height,mustFit}){
  const compact=width<=430&&height<=932;
  const c=await browser.newContext({viewport:{width,height},locale:lang,timezoneId:'Europe/Kyiv',serviceWorkers:'block'});
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
  const noaaExpert=inputState==='noaa-loss-expert',noaaMissing=inputState==='noaa-loss-unavailable';
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
    r.fulfill({contentType:'application/json',body:noaaLossFeed}));
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>
    r.fulfill({json:noaaExpert?noaaLossRegistry.withExpert:noaaLossRegistry.withoutExpert}));
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
  await p.clock.setFixedTime(instant);
  const deliveredLoss=noaaLoss?p.waitForResponse(r=>r.url()===base+'/consumer_cloud/forecast.json'):null;
   await p.goto(base+'/index.html?channel=play#today',{waitUntil:'commit'});
  if(deliveredLoss){
   const response=await deliveredLoss;
   assert.equal(response.status(),200);
   assert((await response.body()).equals(Buffer.from(noaaLossFeed)),'the browser received the exact withheld feed');
  }
  const compactSun=p.locator('[data-sky-clock] [data-time-sun]');
  await compactSun.waitFor();
  await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
  // FP569d (owner decision 01.11): verdict and score open Today; the Sun clock follows the overview card.
  await p.evaluate(()=>document.fonts.ready);
  // Wait for the asynchronously mounted share action before measuring the fold.
  await p.locator('[data-sky-clock] [data-share-card] button').waitFor();
  assert.equal(await p.evaluate(()=>window.NRLocale.language),lang);
  const status=p.locator('#nrRoute-today [data-p0-feed-state]');
  const initialFeed=await settledTodayFeed(p,compact,noaaLoss?'missing':fresh?'fresh':inputState==='synthetic-history'?'stale':undefined);
  const advice=p.locator('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)');
  const actual=await advice.allTextContents();
  assert.equal(initialFeed.date,day,'selected date belongs to this fixture');
  const expected=await p.evaluate(ds=>window.NRDayVerdict.summary(ds).lines.map(line=>line.label+' '+line.text),day);
  const normalize=text=>text.trim().replace(/\s+/g,' ');
  assert.deepEqual(actual.map(normalize),expected.map(normalize),'full advice matches the selected day');
  if((scored&&!noaaLoss)||inputState==='synthetic-history'){
   const historical={uk:'За календарем краще відкласти: нові починання',en:'The calendar advises postponing: new beginnings',
    es:'El calendario aconseja posponer: nuevos comienzos',fr:'Le calendrier conseille de reporter : nouveaux commencements'};
   assert.ok(actual.map(normalize).includes(historical[lang]),'complete known historical advice');
  }
  if(inputState==='synthetic-history'){
   assert.equal(initialFeed.state,'stale');
   assert(await status.isVisible(),'stale status is retained below Sun');
  }
   const readGeometry=()=>compactSun.evaluate((el,{lang,day})=>{
    const nav=document.getElementById('mobileNav').getBoundingClientRect().top;
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
   // Loss removes all formula factors. Neither registry variant adds a caution for this day.
   const hasAdvice=!noaaLoss&&(scored||inputState==='synthetic-history');
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
     const nav=document.getElementById('mobileNav').getBoundingClientRect().top;
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
    const rect=button.getBoundingClientRect(),nav=document.querySelector('#mobileNav').getBoundingClientRect().top;
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
   const projection=await p.waitForFunction(({day,expert,expected,copy})=>{
    const route=document.querySelector('#nrRoute-today'),hero=route?.querySelector('.nr-o-hero');
    const registry=window.NRConsumerAuthority?.registryStatus(),decision=window.NRConsumerAuthority?.expertFor(day);
    if(window.__srConsumerLoadState!=='ready'||!['ok','partial'].includes(registry?.status)||
       route?.querySelector('[data-overview] select')?.value!==day||
       route?.querySelector('[data-p0-feed-state]')?.dataset.state!=='missing')return false;
    const result=window.fp469ConsumerForDate({ds:day}),tone=hero.querySelector('.nr-dv-tone');
    return {
     withheldDayLoaded:window.__nrFormulaFeedStamp>0&&!result.feed?.channels?.source_formula,
     authorityMatches:result.consumer.authority===(expert?'expert_pdf':'source_formula')&&
      (expert?decision?.score===expected:!decision)&&result.consumer.score===expected,
     missingCopyMatches:expert||tone.textContent.trim()===copy[1],
     missingSourceMatches:expert||hero.querySelector('[data-today-source]').textContent.trim()===copy[0],
     noWeatherWarning:!route.querySelector('[data-weather-summary]')&&
      !route.querySelector('[data-space-scene=today]:is([data-tone=watch],[data-tone=storm])'),
    };
   },{day,expert:noaaExpert,expected:noaaExpert?noaaLossRegistry.decision.score:null,copy},{polling:50,timeout:15000});
   let checked;
   try{checked=await projection.jsonValue();}finally{await projection.dispose();}
   const failed=Object.keys(checked).filter(label=>!checked[label]);
   if(failed.length)console.error('NOAA loss '+lang+' '+inputState+': '+failed.join(', '));
   assert.equal(failed.length,0,'NOAA loss UI matches the withheld source and selected authority');
   assert(geometry.sourceVisible&&geometry.toneVisible&&fit,'NOAA loss source, verdict and complete chart on first screen');
   return {...row,...checked,sourceMatchesAuthority:noaaExpert?geometry.sourceMatchesExpert:checked.missingSourceMatches,responseMatches:true};
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
  await p.setViewportSize({width:431,height:932});
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
  if(noaaOnly||!layoutOnly){
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
   assert.equal(withheld.source_formula_result.score,null);
   const withExpert=JSON.parse(await fs.readFile(path.join(fixtures,'decisions_regression.json'),'utf8'));
   const decisions=withExpert.decisions.filter(d=>d.date===day);
   assert.equal(decisions.length,1);
   assert(Number.isInteger(decisions[0].score));
   noaaLossRegistry={withExpert,decision:decisions[0],withoutExpert:{...withExpert,decisions:withExpert.decisions.filter(d=>d.date!==day)}};
   const rows=[];
   for(const lang of ['uk','en','es','fr']){
    for(const [width,height] of [[321,741],[347,760],[375,800],[430,932]]){
     const states=['noaa-loss-expert','noaa-loss-unavailable'];
     rows.push(...await Promise.all(states.map(inputState=>coldLayout({lang,inputState,width,height,mustFit:true}))));
    }
   }
   assert.equal(rows.length,32);
   if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
    const dir=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(dir,{recursive:true});
    await fs.writeFile(path.join(dir,'noaa-loss-matrix.json'),JSON.stringify(rows,null,2));
   }
   console.log('PASS NOAA short-range coverage loss: 32 historical cold openings with both registry states');
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
