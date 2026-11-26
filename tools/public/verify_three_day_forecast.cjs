'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
require('../../civil_time_v1.js');
const model=require('../../three_day_forecast_v1.js');

const root=path.resolve(__dirname,'../..');
const NOAA='https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
const STEP=3*3600e3, at=Date.parse('2026-11-16T11:02:00Z');
const first=Date.parse('2026-11-16T00:00:00Z');
const days=['2026-11-16','2026-11-17','2026-11-18'];
const fixture=process.env.NR3D_FIXTURE?JSON.parse(fs.readFileSync(process.env.NR3D_FIXTURE,'utf8')):
 Array.from({length:24},(_,i)=>({
  time_tag:new Date(first+i*STEP).toISOString().replace('.000Z',''),
  kp:i===7?3.67:[15,16].includes(i)?4.67:2,
  observed:i<3?'observed':i<8?'estimated':'predicted',
  noaa_scale:[15,16].includes(i)?'G1':null,
 }));
const data=model.parse(fixture);
assert.deepEqual(days.map(d=>model.score(model.daySlots(d,'Europe/Kyiv',data))),[-1,-2,-2]);
const g1=Date.parse('2026-11-17T21:00:00Z'),other=Date.parse('2026-11-18T00:00:00Z');
assert.equal(data.get(g1).scale,'G1');assert.equal(data.get(other).scale,'G1');
const conflict=fixture.find(r=>Date.parse(r.time_tag+'Z')===g1);
assert.equal(model.parse([...fixture,{...conflict,kp:2}]).has(g1),false);
assert.equal(model.score(model.daySlots(days[1],'Europe/Kyiv',new Map())),null);
assert.equal(model.daySlots(days[1],'America/New_York',data).find(r=>r.start===g1).scale,'G1');
assert.equal(model.daySlots('2026-10-25','Europe/Kyiv',data).length,9);
assert.equal(model.daySlots('2026-03-29','Europe/Kyiv',data).length,7);
const table=[['time_tag','kp','observed','noaa_scale'],['2026-11-17 21:00:00','4.67','predicted','G1']];
assert.equal(model.parse(table).get(g1).kp,4.67);

const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json',
 '.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.png':'image/png'};
const server=http.createServer((request,response)=>{
 const rel=decodeURIComponent(new URL(request.url,'http://local').pathname).slice(1)||'index.html';
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep))return response.writeHead(403).end();
 fs.readFile(full,(error,body)=>error?response.writeHead(404).end():
  response.writeHead(200,{'content-type':mime[path.extname(full)]||'application/octet-stream'}).end(body));
});
const panelSelector='[data-forecast-three-days]';
const tabSelector='[data-p0-forecast-tabs] [data-horizon=';
const active='#nrRoute-forecast ';
async function setup(browser,base,{width=390,height=width>900?920:844,lang='uk',mode='fixture',hourlyState=null,routeName='today'}={}){
 const context=await browser.newContext({viewport:{width,height},hasTouch:!!hourlyState,isMobile:!!hourlyState,locale:lang==='uk'?'uk-UA':'en-GB',
  timezoneId:'Europe/Kyiv',serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(url=>{
  localStorage.setItem('gidx_onboard_done_v2','1');
  localStorage.setItem('srPrivacyNoticeDismissed','1');
  const fetchOriginal=window.fetch;
  window.__threeDayNoaaRequests=0;
  window.fetch=function(input,...extra){
   if(String(input)===url&&new Error().stack.includes('three_day_forecast_v1.js'))window.__threeDayNoaaRequests++;
   return fetchOriginal.call(this,input,...extra);
  };
 },NOAA);
 const body=JSON.stringify(fixture), digest=createHash('sha256').update(body).digest('hex');
 const receiptTime=new Date(at-(hourlyState==='stale'?9:1)*3600e3).toISOString();
 let testFeed;
 if(hourlyState){
  testFeed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));
  const row=structuredClone(Object.values(testFeed.days)[0]);row.date=days[0];
  Object.assign(row.channels.source_formula,{available:true,value:0,expert_override_used:false,kp_source:'NOAA_3day_slots',
   generated_at:receiptTime,noaa_issued_at:receiptTime,noaa_retrieved_at:receiptTime});
  testFeed.days={[days[0]]:row};
 }
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(hourlyState&&url.includes('/consumer_cloud/forecast.json'))return route.fulfill({json:testFeed});
  if(hourlyState&&url.includes('/consumer_cloud/final_score_decisions.json'))return route.fulfill({json:{schema:'consumer-final-decisions-v1',decisions:[]}});
  if(url===NOAA){
   if(mode==='live')return route.continue();
   if(mode==='fallback'||mode==='missing')return route.abort();
   const age=mode==='stale'?13*3600e3:60e3;
   return route.fulfill({json:fixture,headers:{'Last-Modified':new Date(at-age).toUTCString()}});
  }
  if(mode==='fallback'&&url.includes('/noaa/receipts/cloud.json'))
   return route.fulfill({json:{url:NOAA,body:'bodies/'+digest+'.json',sha256:digest,retrieved_at:receiptTime}});
  if(mode==='fallback'&&url.endsWith('/noaa/bodies/'+digest+'.json'))
   return route.fulfill({body,contentType:'application/json'});
  if(['missing','stale'].includes(mode)&&url.includes('/noaa/receipts/cloud.json'))return route.abort();
  return url.startsWith(base)?route.continue():route.abort();
 });
 const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.clock.setFixedTime(mode==='live'?new Date():new Date(at));
 await p.goto(base+'/index.html?channel=play#'+routeName,{waitUntil:'load'});
 await p.waitForFunction(()=>typeof window.fp434Go==='function');
 if(hourlyState)return {p,context,errors};
 await p.evaluate(()=>fp434Go('forecast',false));
 await p.locator(active+tabSelector+'"3"]').click();
 return {p,context,panel:p.locator(active+panelSelector),errors};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{});
  const base='http://127.0.0.1:'+server.address().port;
  for(const [width,lang] of [[320,'uk'],[390,'uk'],[1280,'uk'],[390,'en']]){
   const t=await setup(browser,base,{width,lang}),{p,panel}=t;
   await p.waitForFunction(selector=>document.querySelector(selector)?.dataset.validSlots==='8',active+panelSelector);
   assert.equal(await panel.locator('.sr-3d-score strong').innerText(),'−1');
   const captions=await p.locator(active+'[data-p0-forecast-tabs] button').allTextContents();
   assert.deepEqual(captions,lang==='uk'?['День','3 дні','Тиждень','27 днів']:['Day','3 days','Week','27 days']);
   assert.equal(await panel.locator('.sr-3d-slots li').count(),8);
   if(width===320){
    await p.evaluate(()=>{
     window.dispatchEvent(new Event('engine-data-stale'));
     document.getElementById('swStaleBar').style.display='block';
     document.getElementById('offlineBanner').style.display='block';
     window.scrollTo({top:0,behavior:'instant'});
    });
    // A refresh replaces the status node. Resolve it and read the painted
    // geometry in one browser task so a detached handle cannot report zero.
    const placement=await p.evaluate(()=>{
     const el=document.querySelector('#nrRoute-forecast.active [data-forecast-three-days]:not([hidden]) .sr-3d-head [role="status"]');
     if(!el)return null;
     const r=el.getBoundingClientRect();
     const hit=document.elementFromPoint(r.left+3,r.top+r.height/2);
     return {text:el.innerText,top:r.top,bottom:r.bottom,width:r.width,height:r.height,
      viewportHeight:innerHeight,exposed:el.contains(hit),hit:hit?.outerHTML.slice(0,150)};
    });
    assert(placement&&placement.width>0&&placement.height>0&&placement.top>=0&&
     placement.bottom<=placement.viewportHeight&&placement.exposed,
     'NOAA source and timestamp visible and unobstructed at 320 px: '+JSON.stringify(placement));
    assert.match(placement.text,/Отримано з NOAA.*Час оновлення NOAA/s);
    for(const banner of ['#swStaleBar','#offlineBanner','#nrRuntimeState'])
     assert.equal(await p.locator(banner).isVisible(),false,banner);
    await p.locator(active+tabSelector+'"7"]').click();
    assert.equal(await p.locator('#swStaleBar').isVisible(),true);
    assert.equal(await p.locator('#nrRuntimeState').isVisible(),true);
    await p.locator(active+tabSelector+'"3"]').click();
   }
   if(lang==='uk')assert.match(await panel.locator('[data-extremes]').innerText(),/Найвищий Kp 3[,.]67 · .*23:00 → .*02:00\. Найнижчий Kp 2 · 02:00–05:00/s);
   assert.match(await panel.locator('.sr-3d-advice').innerText(),/09:49.*22:37/s);
   if(process.env.NR3D_EVIDENCE&&width===390&&lang==='uk')
    await p.screenshot({path:path.join(process.env.NR3D_EVIDENCE,'3days_16_390.png')});
   await panel.locator('[data-control="'+days[1]+'"]').press('Enter');
   assert.equal(await panel.getAttribute('data-day'),days[1]);
   assert.equal(await p.evaluate(()=>document.activeElement.dataset.control),days[1]);
   assert.equal(await panel.locator('.sr-3d-score strong').innerText(),'−2');
   const cross=panel.locator('[data-storm="G1"]');
   assert.equal(await cross.count(),1);
   assert.match(await cross.innerText(),/23:00.*02:00.*4[,.]67/s);
   if(process.env.NR3D_EVIDENCE&&width===390&&lang==='uk')
    await cross.screenshot({path:path.join(process.env.NR3D_EVIDENCE,'3days_17_cross_midnight_390.png')});
   await panel.locator('[data-control="'+days[2]+'"]').click();
   assert.equal(await panel.getAttribute('data-day'),days[2]);
   assert.equal(await panel.locator('.sr-3d-score strong').innerText(),'−2');
   assert.match(await panel.locator('[data-storm="G1"]').innerText(),/02:00.*05:00/s);
   assert.match(await panel.locator('.sr-3d-advice').innerText(),/02:35.*03:36/s);
   if(process.env.NR3D_EVIDENCE&&width===320&&lang==='uk')
    await p.screenshot({path:path.join(process.env.NR3D_EVIDENCE,'3days_18_320.png')});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.locator(active+tabSelector+'"7"]').click();
   assert.equal(await panel.isVisible(),false);
   assert.equal(await p.locator(active+'.nr-o-horizon-list [data-day]:visible').count(),7);
   await p.locator(active+tabSelector+'"3"]').click();
   assert.equal(await panel.isVisible(),true);
   assert.equal(await p.evaluate(()=>window.__threeDayNoaaRequests),1);
   assert.deepEqual(t.errors,[]);
   await t.context.close();
  }
  for(const mode of ['fallback','missing','stale']){
   const t=await setup(browser,base,{mode});
   await t.p.waitForFunction(selector=>!document.querySelector(selector)?.textContent.includes('Оновлюємо NOAA…'),active+panelSelector);
   if(mode==='fallback'){
    assert.equal(await t.panel.getAttribute('data-valid-slots'),'8');
    assert.match(await t.panel.locator('.sr-3d-status').innerText(),/Збережена копія NOAA/);
    await t.p.evaluate(()=>NRLocalContext.choose({lat:40.71,lon:-74.01,zone:'America/New_York'}));
    assert.match(await t.panel.locator('.sr-3d-head small').innerText(),/America\/New_York/);
    await t.panel.locator('[data-control="'+days[1]+'"]').click();
    assert.match(await t.panel.locator('[data-storm="G1"]').first().innerText(),/16:00.*19:00/s);
   }else{
    assert.equal(await t.panel.getAttribute('data-valid-slots'),'0');
    assert.equal(await t.panel.locator('.sr-3d-score strong').innerText(),'—');
    assert.match(await t.panel.locator('.sr-3d-status').innerText(),mode==='stale'?/застаріли/:/недоступні/);
    assert.match(await t.panel.locator('.sr-3d-advice').innerText(),/Санкранті/);
   }
   assert.deepEqual(t.errors,[]);
   await t.context.close();
  }
  const saved=await setup(browser,base);
  const selector=active+panelSelector;
  await saved.p.waitForFunction(s=>document.querySelector(s)?.textContent.includes('Отримано з NOAA'),selector);
  // The copy shares the latest observation with every network response below
  // but has a newer issue time and a revised forecast.
  const revise=()=>saved.p.evaluate(()=>{
   const key='skyrhythm_three_day_noaa_v1', snapshot=JSON.parse(localStorage.getItem(key));
   snapshot.at+=30000;
   snapshot.rows.find(row=>row.time_tag==='2026-11-16T21:00:00Z').kp=5;
   localStorage.setItem(key,JSON.stringify(snapshot));
  });
  const reopen=async text=>{
   await saved.p.reload({waitUntil:'load'});
   await saved.p.locator(active+tabSelector+'"3"]').click();
   await saved.p.waitForFunction(([s,text])=>document.querySelector(s)?.textContent.includes(text)&&
    document.querySelector(s+' [data-control=refresh]')?.getAttribute('aria-disabled')==='false',[selector,text]);
   return saved.panel.locator('.sr-3d-score strong').innerText();
  };
  // A direct NOAA response outranks the device copy at the same observation
  // hour, so a damaged or altered local record cannot hide current data.
  await revise();
  assert.equal(await reopen('Отримано з NOAA'),'−1');
  assert.equal(await saved.p.evaluate(()=>JSON.parse(localStorage.getItem('skyrhythm_three_day_noaa_v1')).rows
   .find(row=>row.time_tag==='2026-11-16T21:00:00Z').kp),3.67);
  // The older verified archive cannot replace a newer saved issue.
  await revise();
  const body=JSON.stringify(fixture), digest=createHash('sha256').update(body).digest('hex');
  const noNoaa=route=>route.abort();
  const receipt=route=>route.fulfill({json:{url:NOAA,body:'bodies/'+digest+'.json',sha256:digest,retrieved_at:new Date(at-3600e3).toISOString()}});
  const archive=route=>route.fulfill({body,contentType:'application/json'});
  await saved.context.route(url=>url.href===NOAA,noNoaa);
  await saved.context.route(url=>url.pathname.endsWith('/noaa/receipts/cloud.json'),receipt);
  await saved.context.route(url=>url.pathname.endsWith('/noaa/bodies/'+digest+'.json'),archive);
  assert.equal(await reopen('Збережена копія NOAA'),'−3');
  // Another tab that saves a fresher copy updates this one without a reload.
  await saved.context.route(url=>url.pathname.endsWith('/noaa/receipts/cloud.json'),route=>route.abort());
  const other=await saved.context.newPage();
  await other.clock.setFixedTime(new Date(at));
  await other.goto(base+'/index.html?channel=play#today',{waitUntil:'load'});
  await other.evaluate(()=>{
   const key='skyrhythm_three_day_noaa_v1', snapshot=JSON.parse(localStorage.getItem(key));
   snapshot.at+=30000;
   snapshot.rows.find(row=>row.time_tag==='2026-11-16T21:00:00Z').kp=4;
   localStorage.setItem(key,JSON.stringify(snapshot));
  });
  await saved.p.waitForFunction(s=>document.querySelector(s+' .sr-3d-score strong')?.textContent==='−2',selector);
  await other.close();
  assert.equal(await reopen('Збережена копія NOAA'),'−2');
  assert.equal(await saved.panel.getAttribute('data-valid-slots'),'8');
  await saved.p.clock.setFixedTime(new Date(at+13*3600e3));
  await saved.p.reload({waitUntil:'load'});
  await saved.p.locator(active+tabSelector+'"3"]').click();
  await saved.p.waitForFunction(s=>document.querySelector(s)?.textContent.includes('застаріли'),selector);
  assert.equal(await saved.panel.getAttribute('data-valid-slots'),'0');
  assert.equal(await saved.panel.locator('.sr-3d-score strong').innerText(),'—');
  assert.deepEqual(saved.errors,[]);
  await saved.context.close();
  // A device clock far behind NOAA rejects every source; the status says why.
  const behind=await setup(browser,base);
  await behind.p.clock.setFixedTime(new Date(at-3600e3));
  await behind.p.evaluate(()=>localStorage.removeItem('skyrhythm_three_day_noaa_v1'));
  await behind.p.reload({waitUntil:'load'});
  await behind.p.locator(active+tabSelector+'"3"]').click();
  await behind.p.waitForFunction(s=>document.querySelector(s)?.textContent.includes('Перевірте дату й час'),selector);
  assert.equal(await behind.panel.getAttribute('data-valid-slots'),'0');
  assert.deepEqual(behind.errors,[]);
  await behind.context.close();
  for(const [width,height] of [[320,741],[390,844]])for(const state of ['fresh','stale'])for(const routeName of ['today','forecast']){
   const {p,context,errors}=await setup(browser,base,{width,height,mode:'fallback',hourlyState:state,routeName});
   try{
    const route='#nrRoute-'+routeName+' ';
    const tapVisible=async locator=>{
     const point=await locator.evaluate(e=>{
      const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      return {x,y,top:r.top,bottom:r.bottom,width:r.width,height:r.height,viewport:innerHeight,scroll:scrollY,hit:e.contains(document.elementFromPoint(x,y))};
     });
     assert(point.scroll<2&&point.top>=0&&point.bottom<=point.viewport&&point.width>=44&&point.height>=44&&point.hit,
      routeName+' '+state+' '+width+' × '+height+' before scrolling: '+JSON.stringify(point));
     await p.touchscreen.tap(point.x,point.y);
    };
    await p.waitForFunction(([day,state])=>window.fp469ConsumerForDate?.({ds:day})?.consumer.state===state,[days[0],state]);
    if(routeName==='forecast')await tapVisible(p.locator(active+tabSelector+'"1"]'));
    const button=p.locator(route+'[data-hourly-toggle]'),box=p.locator(route+'[data-hourly-noaa]');
    await button.waitFor({state:'visible'});
    assert.equal(await box.isVisible(),false);
    await tapVisible(button);
    await p.waitForFunction(sel=>document.activeElement===document.querySelector(sel),route+'[data-hourly-noaa]');
    assert.equal(await button.getAttribute('aria-expanded'),'true');
    assert.equal(await box.locator('a').getAttribute('href'),'personal_dayline.html');
    const waitContent=text=>p.waitForFunction(([sel,text])=>document.querySelector(sel).textContent.includes(text),[route+'[data-hourly-noaa]',text]);
    if(state==='stale'){await waitContent('Квитанція NOAA застаріла');assert.equal(await box.locator('li').count(),0);}
    else{
     await waitContent('Отримано з NOAA');
     assert.equal(await box.locator('li').count(),5);
     assert.match(await box.innerText(),/Попередня оцінка/);
     if(width===320&&routeName==='today'){
      const bodyURL=url=>url.pathname.endsWith('/noaa/bodies/'+digest+'.json');
      await context.route(bodyURL,r=>r.fulfill({body:'[]',contentType:'application/json'}));
      await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
      await waitContent('Немає підтверджених');
      assert.equal(await box.locator('li').count(),0);
      await context.unroute(bodyURL);
      await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
      await waitContent('Отримано з NOAA');
      await p.evaluate(()=>loadKpHourlyAlert());
      assert.match(await p.locator('#kpHourlyBody').textContent(),/Отримано з NOAA/);
     }
    }
    if(routeName==='forecast'){
     await p.locator(active+tabSelector+'"7"]').click();
     assert.equal(await button.isVisible(),false);
     assert.equal(await box.isVisible(),false);
    }
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
  console.log('PASS hourly NOAA: 8 cold first-screen touch checks, Today and Forecast Day, fresh/stale, 320x741 and 390x844, verified receipt, no scroll before tap, corruption and resume');
  if(process.env.NR3D_LIVE==='1'){
   const t=await setup(browser,base,{mode:'live'});
   await t.p.waitForFunction(selector=>document.querySelector(selector)?.textContent.includes('Отримано з NOAA'),active+panelSelector);
   assert(Number(await t.panel.getAttribute('data-valid-slots'))>0);
   console.log('PASS direct NOAA in Chromium');
   await t.context.close();
  }
  console.log('PASS 3 days Kyiv 16–18, mobile/desktop, keyboard, New York, DST, direct/fallback/missing NOAA, saved copy: live wins tie, archive loses tie, second tab, expiry, device clock, extremes');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
