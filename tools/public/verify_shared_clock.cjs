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
  const layoutOnly=reasonsOnly||heightBandOnly||scoredOnly||process.argv.includes('--layout-only');
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
   [375,801,false],[376,741,false],[376,800,false],[390,844,false],
  ];
  const sizes=[[320,694,true],[361,700,true],[375,700,true],[360,640,false],[320,568,false],[375,667,false],[376,700,false],...bandSizes];
  const scoredSizes=bandSizes.filter(([w,h])=>
   (w>=321&&w<=375&&h<=800)||(w===375&&h===801)||(w===376&&h===741)||(w===390&&h===844));
  const cases=['uk','en','es','fr'].flatMap(lang=>['scored-history','missing-no-advice','synthetic-history'].flatMap(inputState=>
   (inputState==='scored-history'?scoredSizes:sizes).map(([width,height,mustFit])=>({lang,inputState,width,height,mustFit}))));
  const selectedCases=reasonsOnly?cases.filter(({width,height,lang,inputState})=>
   width===320&&height===694&&((lang==='uk'&&inputState==='missing-no-advice')||(lang==='en'&&inputState==='synthetic-history'))):scoredOnly?cases.filter(row=>row.inputState==='scored-history'):heightBandOnly?cases.filter(row=>row.height>=741):cases;
  async function coldLayout({lang,inputState,width,height,mustFit}){
  const compact=width<=375&&height<=800;
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
  const scored=inputState==='scored-history';
  if(scored){
   // Replay both archived responses unchanged through the normal same-origin loaders.
   // The registry decision and the calendar factor refer to the same historical day.
   const fixture=name=>path.join(root,'tools/public/fixtures',name);
   await c.route(/\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json(?:\?.*)?$/,r=>
    r.fulfill({contentType:'application/json',path:fixture('score_regression.json')}));
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>
    r.fulfill({contentType:'application/json',path:fixture('decisions_regression.json')}));
  }
  const instant=scored?new Date('2026-10-19T15:29:00Z'):start;
  const day=instant.toISOString().slice(0,10);
  const p=await c.newPage();
  await p.clock.setFixedTime(instant);
   await p.goto(base+'/index.html?channel=play#today',{waitUntil:'commit'});
  const compactSun=p.locator('[data-sky-clock] [data-time-sun]');
  await compactSun.waitFor();
  await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
  // FP569d (owner decision 01.11): verdict and score open Today; the Sun clock follows the overview card.
  await p.evaluate(()=>document.fonts.ready);
  // Wait for the asynchronously mounted share action before measuring the fold.
  await p.locator('[data-sky-clock] [data-share-card] button').waitFor();
  assert.equal(await p.evaluate(()=>window.NRLocale.language),lang);
  const status=p.locator('#nrRoute-today [data-p0-feed-state]');
  const initialFeed=await settledTodayFeed(p,compact,inputState==='synthetic-history'?'stale':undefined);
  const advice=p.locator('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)');
  const actual=await advice.allTextContents();
  assert.equal(initialFeed.date,day,'selected date belongs to this fixture');
  const expected=await p.evaluate(ds=>window.NRDayVerdict.summary(ds).lines.map(line=>line.label+' '+line.text),day);
  const normalize=text=>text.trim().replace(/\s+/g,' ');
  assert.deepEqual(actual.map(normalize),expected.map(normalize),'full advice matches the selected day');
  if(scored||inputState==='synthetic-history'){
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
    const plot=el.closest('svg').getBoundingClientRect();
    return {nav,scrollY:window.scrollY,pageWidth:document.documentElement.scrollWidth,plotBottom:plot.bottom,plotTop:plot.top,plotLeft:plot.left,plotRight:plot.right,
     compactCss:getComputedStyle(hero).getPropertyValue('--nr-today-compact').trim()==='1',
     compactJs:hero.parentElement.querySelector('[data-p0-feed-state]')?.dataset.placement==='after-hero',
     sunTop:card.getBoundingClientRect().top,heroBottom:hero.getBoundingClientRect().bottom,
     afterHero:card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution'),
     verdictBottom:hero.querySelector('.nr-dv-tone').getBoundingClientRect().bottom,
     scoreBottom:hero.querySelector('.nr-o-verdict').getBoundingClientRect().bottom,
     adviceLineCount:children.length,adviceVisible:children.length>0&&children.every(within),
     scoreAvailable:result.available===true,scoreVisible:result.available===true&&within(score),
     scoreMatchesResolver:result.available===true&&score.textContent.trim()===window.SkyScore.formatScore(result.score),
     toneVisible:within(tone),sourceMatchesExpert,sourceVisible:within(source),
     sourceBottom:source.getBoundingClientRect().bottom};
   },{lang,day});
   const geometry=await readGeometry();
   const fits=g=>g.plotTop>=0&&g.plotBottom<=g.nav&&g.plotLeft>=0&&g.plotRight<=width;
   const fit=fits(geometry);
   const hasAdvice=inputState!=='missing-no-advice';
   assert.equal(geometry.adviceLineCount,actual.length);
   assert.equal(geometry.adviceLineCount>0,hasAdvice,'expected presence of real advice');
   assert.equal(geometry.adviceVisible,hasAdvice,'each expected advice line is visible');
   assert.equal(geometry.scoreAvailable,scored,'score must exist only in the scored fixture');
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
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&scored&&
    ((width===321&&height===741&&lang==='es')||(width===375&&height===800&&lang==='fr'))){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await p.screenshot({path:path.join(out,'scored-'+lang+'-'+width+'x'+height+'.png'),
    mask:[p.locator('[data-score-tone],.nr-o-score')],maskColor:'#273044'});
  }
  if(scored)return row;
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
   await p.setViewportSize({width,height:801});
   const outside=await settledTodayFeed(p,false);
   assert.equal(outside.date,date,'height boundary preserves selected date');
   await assertFocused('outside-compact');
   await p.setViewportSize({width,height:800});
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
  await p.setViewportSize({width:390,height:844});
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
  for(let i=0;i<selectedCases.length;i+=2){
   layouts.push(...await Promise.all(selectedCases.slice(i,i+2).map(coldLayout)));
  }
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await fs.writeFile(path.join(out,'layout-matrix.json'),JSON.stringify(layouts,null,2));
  }
  assert.equal(layouts.length,reasonsOnly?2:scoredOnly?52:heightBandOnly?196:252);
  assert.equal(layouts.filter(row=>row.inputState==='scored-history').length,reasonsOnly?0:52);
  assert.equal(layouts.filter(row=>row.resizeRegression&&row.reasonsRegression).length,reasonsOnly?2:(heightBandOnly||scoredOnly)?0:8);
  assert.equal(layouts.reduce((count,row)=>count+(row.heightSweep?.length||0),0),(reasonsOnly||scoredOnly)?0:960);
  assert.equal(layouts.reduce((count,row)=>count+(row.widthSweep?.length||0),0),(reasonsOnly||scoredOnly)?0:440);
  assert.equal(layouts.filter(row=>row.heightBoundaryFocus).length,(reasonsOnly||scoredOnly)?0:16);
  for(const row of layouts){
   assert.equal(row.compactCss,row.compact,'CSS compact boundary');
   assert.equal(row.compactJs,row.compact,'JS compact boundary');
   assert(row.afterHero&&row.verdictBottom<=row.nav&&row.scoreBottom<=row.nav);
   assert(row.sourceVisible);
   assert.equal(row.adviceVisible,row.inputState!=='missing-no-advice');
   if(row.mustFit)assert(row.fit,'required first-fold SVG');
   else assert(row.fit||row.scroll?.full,'full SVG accessible by scrolling');
  }
  assert.equal(results.length,layoutOnly?0:3);
  // Output is an allowlist of test labels, never raw feeds, live scores or DOM text.
  console.log(reasonsOnly?'PASS 2 reasons regressions with normal click and forced rerender':scoredOnly?'PASS 52 cold openings with an authenticated historical score and calendar advice':heightBandOnly?'PASS 196 cold openings, 960 height measurements, 440 width measurements and 16 focus checks':'PASS 252 cold openings, 960 height measurements, 440 width measurements, 16 focus checks and 8 resize/reasons regressions');
  if(!layoutOnly)console.log('PASS shared clock round trip ×3, Sun equality, seven bodies, WebGL identity and phase, playback/pause, reduced-motion scrubbing, Kyiv 23/25 h, explicit default');
 }finally{await browser.close();server.close();}
})().catch(e=>{
 // Assertion libraries may include raw actual/expected DOM or feed values.
 // Print only the failure kind and this test's line/column, never their payload.
 const location=String(e.stack||'').match(/verify_shared_clock\.cjs:\d+:\d+/)?.[0]||'shared-clock';
 console.error('FAIL '+location+' ('+(['AssertionError','TimeoutError','Error'].includes(e.name)?e.name:'Error')+'); raw data suppressed');
 server.close();process.exitCode=1;
});
