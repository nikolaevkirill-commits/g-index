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
async function setup(browser,base,{width=390,lang='uk',mode='fixture'}={}){
 const context=await browser.newContext({viewport:{width,height:width>900?920:844},locale:lang==='uk'?'uk-UA':'en-GB',
  timezoneId:'Europe/Kyiv',serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(url=>{
  localStorage.setItem('gidx_onboard_done_v2','1');
  const fetchOriginal=window.fetch;
  window.__threeDayNoaaRequests=0;
  window.fetch=function(input,...extra){
   if(String(input)===url&&new Error().stack.includes('three_day_forecast_v1.js'))window.__threeDayNoaaRequests++;
   return fetchOriginal.call(this,input,...extra);
  };
 },NOAA);
 const body=JSON.stringify(fixture), digest=createHash('sha256').update(body).digest('hex');
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url===NOAA){
   if(mode==='live')return route.continue();
   if(mode==='fallback'||mode==='missing')return route.abort();
   const age=mode==='stale'?13*3600e3:60e3;
   return route.fulfill({json:fixture,headers:{'Last-Modified':new Date(at-age).toUTCString()}});
  }
  if(mode==='fallback'&&url.includes('/noaa/receipts/cloud.json'))
   return route.fulfill({json:{url:NOAA,body:'bodies/'+digest+'.json',sha256:digest,retrieved_at:new Date(at-3600e3).toISOString()}});
  if(mode==='fallback'&&url.endsWith('/noaa/bodies/'+digest+'.json'))
   return route.fulfill({body,contentType:'application/json'});
  if(['missing','stale'].includes(mode)&&url.includes('/noaa/receipts/cloud.json'))return route.abort();
  return url.startsWith(base)?route.continue():route.abort();
 });
 const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.clock.setFixedTime(mode==='live'?new Date():new Date(at));
 await p.goto(base+'/index.html?channel=play#today',{waitUntil:'load'});
 await p.waitForFunction(()=>typeof window.fp434Go==='function');
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
  await saved.context.route(url=>url.href===NOAA||url.pathname.endsWith('/noaa/receipts/cloud.json'),route=>route.abort());
  await saved.p.reload({waitUntil:'load'});
  await saved.p.locator(active+tabSelector+'"3"]').click();
  await saved.p.waitForFunction(s=>document.querySelector(s)?.textContent.includes('Збережена копія NOAA'),selector);
  assert.equal(await saved.panel.getAttribute('data-valid-slots'),'8');
  assert.equal(await saved.panel.locator('.sr-3d-score strong').innerText(),'−1');
  await saved.p.clock.setFixedTime(new Date(at+13*3600e3));
  await saved.p.reload({waitUntil:'load'});
  await saved.p.locator(active+tabSelector+'"3"]').click();
  await saved.p.waitForFunction(s=>document.querySelector(s)?.textContent.includes('застаріли'),selector);
  assert.equal(await saved.panel.getAttribute('data-valid-slots'),'0');
  assert.equal(await saved.panel.locator('.sr-3d-score strong').innerText(),'—');
  assert.deepEqual(saved.errors,[]);
  await saved.context.close();
  if(process.env.NR3D_LIVE==='1'){
   const t=await setup(browser,base,{mode:'live'});
   await t.p.waitForFunction(selector=>document.querySelector(selector)?.textContent.includes('Отримано з NOAA'),active+panelSelector);
   assert(Number(await t.panel.getAttribute('data-valid-slots'))>0);
   console.log('PASS direct NOAA in Chromium');
   await t.context.close();
  }
  console.log('PASS 3 days Kyiv 16–18, mobile/desktop, keyboard, New York, DST, direct/fallback/missing NOAA, saved copy expires');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
