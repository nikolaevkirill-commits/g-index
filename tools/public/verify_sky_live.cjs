// FP565 «Небо зараз над вами»: drawn values equal astronomy-engine output; no location -> no positions and no
// substituted city; NOAA historical-extent labels, not a visibility probability; reduced motion -> no transitions; «Фоновий рух» setting.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const A=require('../../astronomy-engine-2.1.19.min.js');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(e?'':d)})});
const KYIV={lat:50.4501,lon:30.5234};
const NOW=new Date('2026-11-06T18:30:00Z'); // evening in Kyiv: Moon below, planets mixed
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(),results=[];
try{
 // Pure-function checks (no browser): geomagnetic latitude of Kyiv and NOAA mapping.
 for(const entry of ['index.html','classic.html'])for(const width of [390,1280]){
  const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',locale:'uk-UA',timezoneId:'Europe/Kyiv',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  await p.clock.install({time:NOW});
  await p.addInitScript(k=>{try{localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:k.lat,lon:k.lon,auto:false,zone:'Europe/Kyiv',saved_at:new Date().toISOString()}))}catch(_){}},KYIV);
  await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#panch');
  await p.clock.runFor(4000);
  await p.waitForFunction(()=>document.querySelector('[data-sky-live] .nr-sl-moon'),null,{timeout:20000});
  const got=await p.evaluate(()=>{const h=document.querySelector('[data-sky-live]'),m=h.querySelector('.nr-sl-moon');
   return {time:h.dataset.time,inScene:!!h.closest('[data-sky]'),fraction:+m.dataset.fraction,limb:+m.dataset.limb,rx:+m.dataset.rx, radius:+m.querySelector("circle")?.getAttribute("r"),
    bodies:[...h.querySelectorAll('.nr-sl-body')].map(g=>({b:g.dataset.body,alt:+g.dataset.alt,az:+g.dataset.az,transform:g.style.transform,below:g.classList.contains('is-below')})),
    list:[...h.querySelectorAll('.nr-sl-list li')].map(li=>({b:li.dataset.body,up:li.classList.contains('is-up')})),
    aurora:h.querySelector('[data-aurora]')?.dataset.aurora,mlat:+h.querySelector('[data-aurora]')?.dataset.mlat,
    transitions:[...h.querySelectorAll('.nr-sl-body')].map(g=>getComputedStyle(g).transitionDuration),
    anims:document.getAnimations().filter(a=>h.contains(a.effect?.target)).length,
    pole:window.NRSkyLive.POLE,map:window.NRSkyLive.NOAA_G,
    ag:[[5.7,47.6],[6,47.6],[7.3,47.6],[8,47.6],[9,47.6],[null,47.6]].map(([k,l])=>window.NRSkyLive.auroraFor(l,k).state)}});
  assert(Math.abs(Date.parse(got.time)-NOW.getTime())<120000,'computed for the page clock');assert(!got.inScene,'card must be a sibling of the scene, not inside it');
  // Independent recomputation in Node with the same library and time.
  const t=A.MakeTime(new Date(got.time)),obs=new A.Observer(KYIV.lat,KYIV.lon,0),ill=A.Illumination('Moon',t);
  assert(Math.abs(got.fraction-ill.phase_fraction)<1e-5,entry+' moon fraction '+got.fraction+' vs '+ill.phase_fraction);
  const r=got.radius;assert(r>0,"Moon has a nonzero disc radius");assert(Math.abs(got.rx-Math.abs(1-2*ill.phase_fraction)*r)<1e-2,'terminator ellipse');
  assert.equal(got.bodies.length,7,'7 bodies on the sky strip');assert.equal(got.list.length,7,'7 rows');
  for(const g of got.bodies){const e=A.Equator(g.b,t,obs,true,true),h=A.Horizon(t,obs,e.ra,e.dec,'normal');
   assert(Math.abs(g.alt-h.altitude)<1e-2&&Math.abs(((g.az-h.azimuth+540)%360)-180)<1e-2,entry+' '+g.b+' alt/az');
   const xy=g.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);assert(xy,'real chart transform');assert(Math.abs(+xy[1]-h.azimuth)<.06&&Math.abs(+xy[2]-(90-h.altitude))<.06,'actual point location, including far below horizon');
   assert.equal(g.below,h.altitude<=0,g.b+' below flag');assert.equal(got.list.find(x=>x.b===g.b).up,h.altitude>0,g.b+' list flag');}
  // Bright limb: Meeus 48.5 from independent coordinates, minus parallactic angle.
  const s=A.Equator('Sun',t,obs,true,true),m=A.Equator('Moon',t,obs,true,true),R=x=>x*Math.PI/180,D=x=>x*180/Math.PI;
  const chi=(D(Math.atan2(Math.cos(R(s.dec))*Math.sin(R(s.ra*15-m.ra*15)),Math.sin(R(s.dec))*Math.cos(R(m.dec))-Math.cos(R(s.dec))*Math.sin(R(m.dec))*Math.cos(R(s.ra*15-m.ra*15))))+360)%360;
  const H=R(((A.SiderealTime(t)*15+KYIV.lon-m.ra*15)%360+360)%360),q=D(Math.atan2(Math.sin(H),Math.tan(R(KYIV.lat))*Math.cos(R(m.dec))-Math.sin(R(m.dec))*Math.cos(H)));
  assert(Math.abs(((got.limb-(chi-q)+540)%360)-180)<0.05,'bright limb angle '+got.limb+' vs '+((chi-q+360)%360));
  assert.deepEqual(got.pole,{lat:80.8,lon:-72.8});assert.deepEqual(got.map,[[9,40],[8,45],[7,50],[6,55]]);
  assert(got.mlat>46&&got.mlat<49,'Kyiv geomagnetic latitude ~47.6°: '+got.mlat);
  assert.deepEqual(got.ag,['no_numeric_limit','historical_extent','historical_extent','historical_extent','historical_extent','no_kp']);
  assert(got.transitions.every(d=>d==='0s'),'reduced motion: no transitions');assert.equal(got.anims,0);
  // FP569k policy (Claude, mobile brief 09.11): no saved place → the sky of Kyiv, named as the default place
  // («Небо над Києвом» + «Типове місце — Київ…»), exactly like «Шлях Сонця» on Today. Never the user's own coordinates.
  await p.evaluate(()=>{document.querySelector('#nrLocalContext [data-clear]').click();window.NRSkyLive.render()});
  const none=await p.evaluate(()=>{const h=document.querySelector('[data-sky-live]');return {title:h.querySelector('h2')?.textContent,sky:!!h.querySelector('.nr-sl-sky'),example:!!h.querySelector('[data-sky-example]'),foot:h.querySelector('.nr-sl-foot').textContent}});
  assert(none.sky&&none.example&&/Києв/.test(none.title)&&/50\.45, 30\.52/.test(none.foot),'no-location policy (Kyiv default, labelled) '+JSON.stringify(none));
  assert.deepEqual(errors,[],entry+' '+width+' page errors');
  results.push({entry,width,fraction:got.fraction,limb:got.limb,mlat:got.mlat,up:got.list.filter(x=>x.up).map(x=>x.b)});await c.close();}
 // «Фоновий рух»: separate from «Анімації», off by default, toggles the decorative class only.
 const c=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',locale:'uk-UA',reducedMotion:'no-preference'}),p=await c.newPage();
 await p.goto('http://127.0.0.1:'+server.address().port+'/index.html?channel=play#more');
 await p.waitForFunction(()=>document.querySelector('[data-sky-decor-motion]'),null,{timeout:20000});
 const before=await p.evaluate(()=>({text:document.querySelector('[data-sky-decor-motion]').textContent,pressed:document.querySelector('[data-sky-decor-motion]').getAttribute('aria-pressed'),decor:document.documentElement.classList.contains('sr-decor-motion')}));
 assert.equal(before.text,'Фоновий рух');assert.equal(before.pressed,'false');assert.equal(before.decor,false);
 await p.evaluate(()=>document.querySelector('[data-sky-decor-motion]').click());
 const after=await p.evaluate(()=>({pressed:document.querySelector('[data-sky-decor-motion]').getAttribute('aria-pressed'),key:localStorage.getItem('srSkyDecorMotionV1'),decor:document.documentElement.classList.contains('sr-decor-motion')}));
 assert.deepEqual(after,{pressed:'true',key:'on',decor:true});await c.close();
 console.log(JSON.stringify(results));console.log('PASS sky live: 2 entries × mobile/desktop; values = astronomy-engine; NOAA G-scale aurora; no-location policy; reduced motion; «Фоновий рух»');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
