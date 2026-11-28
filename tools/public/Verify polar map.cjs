'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');

module.exports = async function verifyPolarMap(browser, base) {
 const p = await browser.newPage({viewport: {width:390, height:844}, locale:'uk-UA', timezoneId:'Europe/Kyiv', serviceWorkers:'block', reducedMotion:'reduce'});
 try {
  const start = Date.parse('2026-11-27T12:00:00Z'), step = 3*3600000;
  const rows = Array.from({length:20}, (_,i)=>({
   time_tag:new Date(start+(i-8)*step).toISOString().slice(0,19), kp:3, observed:i<8?'observed':'predicted', noaa_scale:null
  }));
  const body = JSON.stringify(rows), sha256 = createHash('sha256').update(body).digest('hex');
  await p.route('**/*', route=>{
   const url = new URL(route.request().url());
   if(url.origin!==base)return route.abort();
   if(url.pathname.endsWith('/noaa/receipts/cloud.json'))return route.fulfill({json:{
    url:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', retrieved_at:new Date(start).toISOString(), sha256, body:'bodies/'+sha256+'.json'
   }});
   if(url.pathname.endsWith('/bodies/'+sha256+'.json'))return route.fulfill({body,contentType:'application/json'});
   return route.continue();
  });
  await p.addInitScript(()=>{
   localStorage.setItem('gidx_onboard_done_v2','1');localStorage.setItem('srPrivacyNoticeDismissed','1');
   const proto=CanvasRenderingContext2D.prototype, fill=proto.fillText, draw=proto.drawImage;
   proto.fillText=function(text,...args){
    if(this.canvas.closest('.sr-pu-art')&&text.endsWith(' полюс'))window.lastPolarLabel=text;
    return fill.call(this,text,...args);
   };
   proto.drawImage=function(layer,...args){
    if(this.canvas.closest('.sr-pu-art')&&layer.width===140&&layer.height===140){
     const pixels=layer.getContext('2d').getImageData(0,0,140,140).data;
     let hash=2166136261;
     for(let i=3;i<pixels.length;i+=4)hash=Math.imul(hash^pixels[i],16777619);
     window.nightMaskHash=hash;
    }
    return draw.call(this,layer,...args);
   };
  });
  await p.clock.setFixedTime(new Date(start));
  await p.goto(base+'/index.html?channel=play#panch',{waitUntil:'domcontentloaded'});
  const card=p.locator('[data-kp-pulse]'), canvas=card.locator('canvas'), bars=card.locator('.sr-pu-bars button');
  await p.waitForFunction(()=>document.querySelector('[data-kp-pulse]')?.dataset.tone==='unsettled');
  const firstLabels=[];
  for(const [id,pole] of [['kyiv','Північний полюс'],['sao-paulo','Південний полюс'],['tokyo','Північний полюс']]){
   await p.evaluate(city=>NRLocalContext.choose(SRSkyTime.cityPresets().find(v=>v.cityId===city)),id);
   await canvas.scrollIntoViewIfNeeded();
   await p.waitForFunction(expected=>window.lastPolarLabel===expected,pole);
   assert.equal(await bars.count(),8);
   firstLabels.push(await bars.first().getAttribute('aria-label'));
  }
  assert.equal(new Set(firstLabels).size,3,'intervals must show city-local times');
  const before=await p.evaluate(()=>window.nightMaskHash);
  const choice=bars.nth(6);
  await choice.focus();await p.keyboard.press('Enter');
  await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-pressed')==='true');
  assert(await choice.evaluate(el=>el===document.activeElement),'keyboard focus stays on the chosen interval');
  await canvas.scrollIntoViewIfNeeded();
  await p.waitForFunction(hash=>window.nightMaskHash!==hash,before);
  for(const minutes of [359,361]){
   await p.clock.setFixedTime(new Date(start+minutes*60000));
   const seen=minutes===359?p.waitForResponse(resp=>resp.url().includes('/noaa/receipts/cloud.json'),{timeout:10000}):null;
   await p.evaluate(()=>dispatchEvent(new Event('sr:sky-time')));
   if(minutes===359)await seen;
  }
  await p.waitForFunction(()=>document.querySelector('[data-kp-pulse]')?.dataset.tone==='none'&&!document.querySelector('.sr-pu-bars button[data-state]'));
  console.log('PASS polar map: both poles, three local clocks, selected interval terminator, keyboard focus, expired receipt');
 }finally{await p.context().close();}
};
