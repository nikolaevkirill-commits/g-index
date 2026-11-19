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
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 const start=new Date('2026-11-07T15:29:00Z');
 try{
  const layoutOnly=process.argv.includes('--layout-only');
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
  for(const lang of ['uk','en','es','fr']) for(const inputState of ['complete','synthetic-history']){
  const c=await browser.newContext({viewport:{width:320,height:694},locale:lang,timezoneId:'Europe/Kyiv',serviceWorkers:'block'});
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await c.addInitScript(language=>{
   localStorage.setItem('nr_locale_v1',language);
   localStorage.setItem('gidx_onboard_done_v2','1');
   localStorage.setItem('srPrivacyNoticeDismissed','1');
  },lang);
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
   await c.route(/\/(?:consumer_cloud\/forecast|INDEPENDENT_FORECAST_FEED_v1)\.json(?:\?.*)?$/,r=>r.fulfill({contentType:'application/json',body}));
   const decisions=await fs.readFile(path.join(root,'tools/public/fixtures/decisions_regression.json'),'utf8');
   await c.route(/\/consumer_cloud\/final_score_decisions\.json(?:\?.*)?$/,r=>r.fulfill({contentType:'application/json',body:decisions}));
  }
  const p=await c.newPage();
  await p.clock.setFixedTime(start);
  await p.goto(base+'/index.html?channel=play#panch',{waitUntil:'domcontentloaded'});
  // FP569k policy: with no saved place Sky shows Kyiv, labelled as the default place (not an empty card).
  await p.locator('[data-sky-live] [data-sky-example]').waitFor();
  assert.ok(await p.locator('[data-sky-live] .nr-sl-body').count()>=7);
  await p.evaluate(()=>fp434Go('today',false));
  const compactSun=p.locator('[data-sky-clock] [data-time-sun]');
  await compactSun.waitFor();
  await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
  // FP569d (owner decision 01.11): verdict and score open Today; the Sun clock follows the overview card.
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>['ready','error'].includes(window.__srConsumerLoadState),null,{timeout:30000});
  // Wait for the asynchronously mounted share action before measuring the fold.
  await p.locator('[data-sky-clock] [data-share-card] button').waitFor();
  assert.equal(await p.evaluate(()=>window.NRLocale.language),lang);
  const source=p.locator('#nrRoute-today [data-today-source]');
  const status=p.locator('#nrRoute-today [data-p0-feed-state]');
  await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-p0-feed-state]')?.previousElementSibling?.hasAttribute('data-sky-clock'));
  const advice=p.locator('#nrRoute-today [data-day-verdict] p:not(.nr-dv-tone)');
  const actual=await advice.allTextContents();
  const expected=await p.evaluate(()=>window.NRDayVerdict.summary('2026-11-07').lines.map(line=>line.label+' '+line.text));
  const normalize=text=>text.trim().replace(/\s+/g,' ');
  assert.deepEqual(actual.map(normalize),expected.map(normalize),'full advice matches the selected day');
  if(inputState==='synthetic-history'){
   const historical={uk:'За календарем краще відкласти: нові починання',en:'The calendar advises postponing: new beginnings',
    es:'El calendario aconseja posponer: nuevos comienzos',fr:'Le calendrier conseille de reporter : nouveaux commencements'};
   assert.ok(actual.map(normalize).includes(historical[lang]),'complete known historical advice');
   assert.equal(await status.getAttribute('data-state'),'stale');
   assert(await status.isVisible(),'stale status is retained below Sun');
  }
  for(const [width,height] of [[320,694],[360,640],[320,568],[375,667]]){
   await p.setViewportSize({width,height});
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const geometry=await compactSun.evaluate(el=>{
    const nav=document.getElementById('mobileNav').getBoundingClientRect().top;
    const card=el.closest('[data-sky-clock]'),hero=document.querySelector('#nrRoute-today .nr-o-hero');
    const unclipped=node=>{
     if(!node?.textContent.trim())return false;
     const box=node.getBoundingClientRect(),range=document.createRange();
     range.selectNodeContents(node);
     return box.width>0&&box.height>0&&box.left>=0&&box.right<=innerWidth&&
      node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1&&
      [...range.getClientRects()].every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1);
    };
    const children=[...hero.querySelectorAll('[data-day-verdict] p:not(.nr-dv-tone)')];
    const source=hero.querySelector('[data-today-source]');
    return {nav,plotBottom:el.closest('svg').getBoundingClientRect().bottom,
     sunTop:card.getBoundingClientRect().top,heroBottom:hero.getBoundingClientRect().bottom,
     afterHero:card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution'),
     verdictBottom:hero.querySelector('.nr-dv-tone').getBoundingClientRect().bottom,
     scoreBottom:hero.querySelector('.nr-o-verdict').getBoundingClientRect().bottom,
     adviceVisible:children.every(node=>unclipped(node)&&node.getBoundingClientRect().bottom<=nav),
     sourceVisible:unclipped(source)&&source.getBoundingClientRect().bottom<=nav,
     sourceBottom:source.getBoundingClientRect().bottom};
   });
   const fit=geometry.plotBottom<=geometry.nav;
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
   layouts.push({lang,inputState,width,height,...geometry,fit,scroll});
   console.log('LAYOUT '+JSON.stringify(layouts.at(-1)));
  }
  await p.setViewportSize({width:320,height:694});
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR&&inputState==='synthetic-history'&&['es','fr'].includes(lang)){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);
   await fs.mkdir(out,{recursive:true});
   await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await p.screenshot({path:path.join(out,lang+'-320x694.png'),mask:[p.locator('[data-score-tone]')],maskColor:'#273044'});
  }
  const stateBeforeResize=await status.getAttribute('data-state'),sourceText=await source.textContent();
  await p.setViewportSize({width:390,height:844});
  await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-p0-feed-state]')?.parentElement?.matches('.nr-o-hero'));
  await p.setViewportSize({width:320,height:694});
  await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-p0-feed-state]')?.previousElementSibling?.hasAttribute('data-sky-clock'));
  assert.equal(await status.getAttribute('data-state'),stateBeforeResize,'resize preserves feed state');
  if(inputState==='synthetic-history')assert(await status.isVisible(),'resize retains the stale notice');
  assert(await source.textContent()===sourceText,'resize preserves complete source');
  const why=p.locator('#nrRoute-today [data-day-why]');
  await why.locator('summary').click();
  assert(await why.locator('ul').isVisible(),'full reasons remain accessible');
  await why.locator('summary').click();
  if(lang==='uk'){
  const localSun=p.locator('[data-sun-first-screen]');
  await localSun.waitFor();
  assert.match(await localSun.innerText(),/Сонце під горизонтом.*Київ · типове місце/);
  assert.equal(await p.locator('#headerSub').isVisible(),false);

  await p.locator('[data-sky-clock] [data-time-open]').click({noWaitAfter:true});
  await p.locator('[data-sky-live] .nr-sl-body[data-body=Sun]').waitFor();
  assert.match(await p.locator('#nrSkyLiveHeading').textContent(),/Києвом/);
  }
  await c.close();
  }
  if(process.env.VERIFY_CLOCK_EVIDENCE_DIR){
   const out=path.resolve(process.env.VERIFY_CLOCK_EVIDENCE_DIR);await fs.mkdir(out,{recursive:true});
   await fs.writeFile(path.join(out,'layout-matrix.json'),JSON.stringify(layouts,null,2));
  }
  assert.equal(layouts.length,32);
  for(const row of layouts){
   assert(row.afterHero&&row.verdictBottom<=row.nav&&row.scoreBottom<=row.nav);
   assert(row.adviceVisible&&row.sourceVisible);
   if(row.height===694)assert(row.fit);
   else assert(row.fit||row.scroll?.full);
  }
  assert.equal(results.length,layoutOnly?0:3);
  // Output is an allowlist of test labels, never raw feeds, live scores or DOM text.
  console.log('PASS 32 mobile layout cases across four languages and two input states');
  if(!layoutOnly)console.log('PASS shared clock round trip ×3, Sun equality, seven bodies, WebGL identity and phase, playback/pause, reduced-motion scrubbing, Kyiv 23/25 h, explicit default');
 }finally{await browser.close();server.close();}
})().catch(e=>{
 // Assertion libraries may include raw actual/expected DOM or feed values.
 // Print only the failure kind and this test's line/column, never their payload.
 const location=String(e.stack||'').match(/verify_shared_clock\.cjs:\d+:\d+/)?.[0]||'shared-clock';
 console.error('FAIL '+location+' ('+(['AssertionError','TimeoutError','Error'].includes(e.name)?e.name:'Error')+'); raw data suppressed');
 server.close();process.exitCode=1;
});
