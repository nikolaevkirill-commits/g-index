
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const civil = require('../../civil_time_v1.js');

assert.equal(civil.localNoon('2026-11-08', 'Europe/Madrid'), Date.parse('2026-11-08T11:00Z'));
assert.equal(civil.localNoon('2026-07-01', 'Europe/Paris'), Date.parse('2026-07-01T10:00Z'));
assert.equal(civil.localNoon('2026-11-08', 'Asia/Kathmandu'), Date.parse('2026-11-08T06:15Z'));
assert.equal(civil.localNoon('2026-11-08', 'Pacific/Kiritimati'), Date.parse('2026-11-07T22:00Z'));
assert.equal(civil.localNoon('2011-12-30', 'Pacific/Apia'), null);

const root = path.resolve(__dirname, '../..');
const contentTypes = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const now = new Date('2026-11-08T22:30:00Z');
const slot = '2026-11-09T00:00:00Z';
const raw = JSON.stringify([
  {time_tag:'2026-11-08T18:00:00',kp:9,observed:'predicted'},
  {time_tag:'2026-11-08T21:00:00',kp:9,observed:'estimated'},
  {time_tag:'2026-11-09T00:00:00',kp:6,observed:'predicted'},
  {time_tag:'2026-11-09T03:00:00',kp:11,observed:'predicted'},
  {time_tag:'2026-11-09T06:00:00',kp:9,observed:'predicted'},
  {time_tag:'2026-11-09T06:00:00',kp:7,observed:'predicted'}
]);
const hash = createHash('sha256').update(raw).digest('hex');
const bodyPath = 'bodies/'+hash+'.json';
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,bytes)=>res.writeHead(error?404:200,{'Content-Type':contentTypes[path.extname(file)]||'application/octet-stream'}).end(bytes));
});

async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch();
  try{
    for(const width of [320,390]){
      const context=await browser.newContext({locale:'uk-UA',timezoneId:'America/New_York',serviceWorkers:'block',viewport:{width,height:844},reducedMotion:'reduce',acceptDownloads:true});
      const receipt = {url:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',retrieved_at:now.toISOString(),body:bodyPath,sha256:hash};
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==base)return route.abort();
        if(url.pathname.endsWith('/noaa/receipts/cloud.json'))return route.fulfill({json:receipt});
        if(url.pathname.endsWith('/noaa/'+bodyPath))return route.fulfill({contentType:'application/json',body:width===320?raw:raw+' '});
        return route.continue();
      });
      await context.addInitScript(()=>localStorage.setItem('gidx_onboard_done_v2','1'));
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.clock.setFixedTime(now);
      await page.goto(base+'/index.html?channel=play#panch',{waitUntil:'load',timeout:120000});
      await page.evaluate(async()=>{await fp469LoadConsumerForecast();fp434Go('panch',false);});
      const picker=page.locator('[data-sky-city-picker] select');
      await picker.waitFor({timeout:30000}).catch(async error=>{console.error(await page.evaluate(()=>({hash:location.hash,context:!!document.querySelector('#nrLocalContext'),picker:!!document.querySelector('[data-sky-city-picker]'),ready:!!window.SRSkyTime,overview:!!window.NRConsumerOverview})),errors);throw error;});
      const moon=page.locator('[data-moon-month]');
      for(const [id,zone,date,noon] of [
        ['barcelona','Europe/Madrid','2026-11-08','2026-11-08T11:00:00.000Z'],
        ['izium','Europe/Kyiv','2026-11-09','2026-11-09T10:00:00.000Z'],
        ['perpignan','Europe/Paris','2026-11-08','2026-11-08T11:00:00.000Z']
      ]){
        await picker.selectOption(id);
        await page.waitForFunction(({zone,date})=>document.querySelector('[data-moon-month]')?.dataset.mmZone===zone&&document.querySelector('[data-moon-month] [aria-current=date]')?.dataset.mmDay===date,{zone,date});
        const actual=await page.evaluate(({id,zone,date})=>{
          const clock=SRSkyTime.snapshot(),el=document.querySelector('[data-moon-month]');
          const day=el.querySelector('[aria-current=date]');
          const got=Object.fromEntries([...el.querySelectorAll('[data-mm-quarter]')].map(x=>[x.dataset.mmDay,Number(x.dataset.mmQuarter)]));
          const exp={};let q=Astronomy.SearchMoonQuarter(new Date(Date.parse(el.dataset.mmMonth+'-01T00:00:00Z')-86400000));
          for(let i=0;i<8;i++){const ds=NRCivilTime.dayKey(+q.time.date,zone);if(ds.startsWith(el.dataset.mmMonth))exp[ds]=q.quarter;q=Astronomy.NextMoonQuarter(q);}
          return {id:clock.loc?.cityId,zone:clock.zone,date:clock.date,got,exp,label:day.getAttribute('aria-label'),noon:new Date(SRMoonMonth.localNoon(date)).toISOString(),overflow:document.documentElement.scrollWidth>innerWidth,pancha:document.querySelector('#srCivilPanel input').value};
        },{id,zone,date});
        assert.equal(actual.id,id);
        assert.equal(actual.zone,zone);
        assert.equal(actual.date,date);
        assert.equal(actual.pancha,date);
        await page.waitForFunction(({zone,date})=>{const day=window.SRDayLineView?.snapshot?.();return day?.zone===zone&&day?.date===date;},{zone,date});
        assert.equal(actual.noon,noon);
        assert.deepEqual(actual.got,actual.exp);
        assert.equal(actual.overflow,false);
      }
      if(width===390){
        const other=await context.newPage();
        await other.clock.setFixedTime(now);
        await other.goto(base+'/index.html?channel=play#panch',{waitUntil:'domcontentloaded'});
        await other.waitForFunction(()=>window.NRLocalContext?.current()?.cityId==='perpignan');
        await picker.selectOption('barcelona');
        await other.waitForFunction(()=>window.NRCivilTime?.localZone()==='Europe/Madrid');
        await picker.selectOption('perpignan');
        await other.waitForFunction(()=>window.NRCivilTime?.localZone()==='Europe/Paris');
        await other.close();
      }
      await page.locator('[data-mm-step="1"]').click();
      assert.equal(await moon.getAttribute('data-mm-month'),'2026-12');
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.mmStep),'1');

      await page.evaluate(()=>fp434Go('forecast',false));
      const week=page.locator('[data-week-events]');
      await week.waitFor();
      assert.equal(await week.getAttribute('data-week-zone'),'Europe/Paris');
      assert.equal(await week.locator('[data-week-ics], .is-drik').count(),0);

      await page.evaluate(()=>fp434Go('more',false));
      const select=page.locator('[data-kp-threshold-select]');
      await select.waitFor();
      const bodyReady=page.waitForResponse(response=>response.url().endsWith('/noaa/'+bodyPath));
      await select.selectOption('5');
      await page.evaluate(()=>{
        window.currentKpAuthority=()=>({usable:true,kp:9,provider:'gfz',expiresAt:Date.now()+3600000});
        fp434Go('today',false);
      });
      const alert=page.locator('[data-kp-threshold-alert]');
      if(width===320){
        await alert.waitFor();
        assert.equal(await alert.getAttribute('data-kp-slot'),slot.replace('Z','.000Z'));
        assert.equal(await alert.getAttribute('data-kp-hit'),'6');
        assert.match(await alert.textContent(),/Europe\/Paris/);
        assert.equal(await page.evaluate(()=>SRKpThreshold.check(7).length),0);
        await alert.locator('[data-kp-threshold-dismiss]').click();
        assert.equal(await alert.count(),0);
        assert.equal(await page.evaluate(()=>SRKpThreshold.check(5,Date.parse('2026-11-09T02:00Z')).length),0,'stale receipt');
        await page.evaluate(()=>{window.currentKpAuthority=()=>({usable:true,kp:7,provider:'noaa',provisional:true,expiresAt:Date.now()+3600000});SRKpThreshold.render()});
        assert.equal(await alert.count(),0,'provisional NOAA is not observed');
      }else{
        await bodyReady;
        await page.waitForTimeout(400);
        assert.equal(await page.evaluate(()=>SRKpThreshold.check(5).length),0,'altered body and GFZ cannot trigger');
        assert.equal(await alert.count(),0);
      }
      await page.evaluate(()=>{window.currentKpAuthority=()=>({usable:true,kp:7,provider:'noaa',provisional:false,expiresAt:Date.now()+3600000});SRKpThreshold.render()});
      await alert.waitFor();
      assert.equal(await alert.getAttribute('data-kp-kind'),'obs');
      await context.setOffline(true);
      await alert.waitFor({state:'detached'});
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS location picker, Moon, local Panchanga, week scope and trusted Kp at 320/390; local noon including skipped date and +14/+05:45');
  }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
