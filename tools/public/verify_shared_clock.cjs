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
  for(const [entry,width,height] of [['index.html',390,844],['classic.html',390,844],['index.html',1280,900]]){
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
   assert.equal(await p.evaluate(()=>Boolean(window.NRMoonGL)),false);
   const input=(host,value)=>host.locator('.sr-time-controls input').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await input(today,475);
   const reference=await sun.evaluate(el=>({at:el.dataset.at,alt:+el.dataset.alt,transform:el.style.transform}));
   assert(reference.alt>0);
   await today.locator('[data-time-open]').click();
   const sky=p.locator('[data-sky-live]');
   await sky.waitFor();
   const savedAt=await sky.getAttribute('data-time');
   assert.equal(savedAt,reference.at);
   assert.equal(+(await sky.locator('.nr-sl-body[data-body=Sun]').getAttribute('data-alt')),reference.alt);
   const canvas=sky.locator('canvas.nr-sl-moon-gl');
   await canvas.waitFor();
   await canvas.evaluate(el=>window.__clockCanvas=el);
   const stamp=()=>sky.evaluate(el=>{
    const s=NRSkyLive.snapshot(), c=el.querySelector('canvas'), g=[...el.querySelectorAll('.nr-sl-body')];
    return {at:s.time.toISOString(),phase:s.phaseAngle,limb:s.limb,canvasPhase:+c.dataset.phaseAngle,canvasLimb:+c.dataset.limb,
     sameCanvas:c===window.__clockCanvas,values:g.map(x=>[x.dataset.body,+x.dataset.alt,+x.dataset.az,x.style.transform])};
   });
   const a=await stamp();
   await input(sky,880);
   const b=await stamp();
   for(const r of [a,b]){
    assert(r.sameCanvas);assert(Math.abs(r.phase-r.canvasPhase)<.0001);assert(Math.abs(r.limb-r.canvasLimb)<.0001);
    assert.equal(r.values.length,7);
   }
   assert.notEqual(a.at,b.at);assert.notEqual(a.limb,b.limb);
   for(const [i,g] of a.values.entries())assert.notDeepEqual(g.slice(1),b.values[i].slice(1));
   const fixture=JSON.parse(await fs.readFile(path.join(root,'consumer_cloud/sky.json'),'utf8'));
   const timed=fixture.intervals.find(x=>x.exact&&x.reading?.intensity>=1)?.exact||
    fixture.events.find(x=>x.at&&x.reading?.intensity>=1)?.at;
   assert(timed,'fixture has a timed event');
   await p.waitForFunction(()=>window.NRSkyScene?.state()==='ready');
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
  const c=await browser.newContext({viewport:{width:320,height:694},locale:'uk-UA',timezoneId:'Europe/Kyiv',serviceWorkers:'block'});
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  const p=await c.newPage();await p.goto(base+'/index.html?channel=play#panch',{waitUntil:'domcontentloaded'});
  await p.locator('[data-sky-live] .nr-sl-noloc').waitFor();
  assert.equal(await p.locator('[data-sky-live] .nr-sl-body').count(),0);
  await p.evaluate(()=>fp434Go('today',false));
  const compactSun=p.locator('[data-sky-clock] [data-time-sun]');
  await compactSun.waitFor();
  await p.waitForFunction(()=>!!document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')&&!!document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict'),null,{timeout:30000});
  // FP569d (owner decision 01.11): verdict and score open Today; the Sun clock follows the overview card.
  const first=await compactSun.evaluate(el=>{const nav=document.getElementById('mobileNav').getBoundingClientRect().top,card=el.closest('[data-sky-clock]');
   return {verdict:document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')?.getBoundingClientRect().bottom<nav,score:document.querySelector('#nrRoute-today .nr-o-hero .nr-o-verdict')?.getBoundingClientRect().bottom<nav,
    afterHero:card.previousElementSibling?.matches('.nr-o-hero,.sr-expert-caution'),sunStarts:card.getBoundingClientRect().top<nav}});
  assert(first.verdict&&first.score,'verdict and score must fit on a 320×694 first viewport');
  assert(first.afterHero&&first.sunStarts,'Sun clock follows the overview card and starts on the first viewport');
  await p.locator('[data-sky-clock] [data-time-open]').click();
  await p.locator('[data-sky-live] .nr-sl-body[data-body=Sun]').waitFor();
  assert.match(await p.locator('#nrSkyLiveHeading').textContent(),/Києвом/);
  await c.close();
  assert.equal(results.length,3);
  console.log('PASS first viewport ×3, shared clock round trip ×3, Sun equality, seven bodies, WebGL identity and phase, playback/pause, reduced-motion scrubbing, Kyiv 23/25 h, explicit default');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
