'use strict';
// Isolated test origin; checks exposure, immutable answers, recovery and persistent export.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const code=fs.readFileSync(path.resolve(__dirname,'../../day_context_v1.js'),'utf8');
const SHOWN='gindex_day_shown_v1',RATED='gindex_day_vs_forecast_v1',BACKUP='gindex_day_context_backup_v1';
(async()=>{const browser=await chromium.launch(),results=[];
async function setup({selected='2026-11-06',raw=null,evening=false,hidden=false,rated=null,quota=false}={}){
 const c=await browser.newContext({timezoneId:'Europe/Kyiv',locale:'uk-UA'}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://audit.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main id="nrRoute-today"><div data-overview="today"><select><option>2026-11-06</option><option>2026-11-07</option></select><span class="nr-o-score">+1</span></div></main><section id="nrRoute-more"></section></body></html>'}));
 await p.goto('https://audit.invalid/');await p.clock.setFixedTime(new Date('2026-11-06T'+(evening?'17':'10')+':00:00Z'));
 await p.evaluate(({selected,raw,hidden,rated,quota,SHOWN,RATED})=>{
  document.querySelector('select').value=selected;document.querySelector('[data-overview]').hidden=hidden;window.testScore=1;
  window.NRCivilTime={dayKey:time=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time))};
  window.NRConsumerOverview={snapshot:date=>({date,display:{available:true,score:window.testScore,authority:'source_formula',state:'fresh'},provenance:{generated_at:'2026-11-06T09:50:00Z'},calculation:{kp_source:'NOAA_3day_slots'}})};
  if(raw!==null)localStorage.setItem(SHOWN,raw);if(rated!==null)localStorage.setItem(RATED,JSON.stringify(rated));
  if(quota)Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};
 },{selected,raw,hidden,rated,quota,SHOWN,RATED});
 await p.addScriptTag({content:code});
 return {c,p,errors};
}
async function finish(ctx,label){assert.deepEqual(ctx.errors,[],label);results.push(label);await ctx.c.close();}
try{
 {const x=await setup({selected:'2026-11-07'}),got=await x.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),SHOWN);
  assert.deepEqual(Object.keys(got),['2026-11-07']);assert.equal(got['2026-11-07'].last.score,1);await finish(x,'DC-A: only the visibly selected date is recorded');}
 {const x=await setup({hidden:true});assert.equal(await x.p.evaluate(k=>localStorage.getItem(k),SHOWN),null);await finish(x,'Hidden overview is not a display record');}
 {const x=await setup();assert.equal(await x.p.locator('[data-day-rating]').count(),0);await finish(x,'DC-C: live yesterday feed alone never enables retrospective rating');}
 {const x=await setup({evening:true});assert.equal(await x.p.locator('[data-day-rating]').getAttribute('data-target'),'2026-11-06');
  assert.match(await x.p.locator('[data-day-rating] > p').first().innerText(),/\+1/);
  await x.p.evaluate(()=>{window.testScore=3;document.querySelector('.nr-o-score').textContent='+3';NRDayContext.render();});
  await x.p.locator('[data-rate=as_expected]').click();await x.p.waitForFunction(k=>!!localStorage.getItem(k),RATED);
  const saved=await x.p.evaluate(k=>JSON.parse(localStorage.getItem(k))[0],RATED);
  assert.equal(saved.shown.score,1);assert.equal(saved.snapshot.display.score,1);assert.equal(saved.independent_validation,false);
  await finish(x,'DC-B: refreshed feed cannot change the score on an already displayed rating card');}
 for(const raw of ['{"2026-11-06":"malformed"}','null','[]','{broken']){
  const x=await setup({raw});assert.equal(await x.p.locator('[data-day-context]').count(),1);assert.equal(await x.p.locator('[data-day-provenance]').count(),1);
  const copies=await x.p.evaluate(k=>JSON.parse(localStorage.getItem(k)),BACKUP);assert(copies.some(r=>r.key===SHOWN&&r.raw===raw));
  await finish(x,'DC-D: malformed original preserved before recovery: '+raw);
 }
 {const raw='{"2026-11-06":"malformed"}',x=await setup({raw,quota:true});assert.equal(await x.p.evaluate(k=>localStorage.getItem(k),SHOWN),raw);
  assert.equal(await x.p.locator('[data-day-context]').count(),1);await finish(x,'Backup quota failure leaves original intact and date UI usable');}
 {const rows=[{date:'2026-11-05',rating:'as_expected'},{date:'2026-11-06',rating:'better'}],x=await setup({rated:rows});
  await x.p.reload();await x.p.addScriptTag({content:code});
  const pending=x.p.waitForEvent('download');await x.p.locator('#nrRoute-more [data-rate-export]').click();const d=await pending;
  const exported=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.deepEqual(exported.items,rows);assert.equal(exported.independent_validation,false);
  assert.deepEqual(JSON.parse(exported.storage_originals[RATED]),rows);await finish(x,'DC-E: export remains available after reopening with all days rated');}
 {const raw=JSON.stringify({'2026-11-05':{last:{score:-1,authority:'formula'}}}),x=await setup({raw});
  assert.equal(await x.p.locator('[data-day-rating]').count(),0);await finish(x,'Legacy records are retained but never promoted to prior visible exposure');}
 {const x=await setup({evening:true});await x.p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await x.p.locator('[data-rate=better]').click();await x.p.waitForFunction(()=>document.querySelector('[data-rate-status]')?.textContent==='Не вдалося зберегти');
  assert.equal(await x.p.evaluate(k=>localStorage.getItem(k),RATED),null);await finish(x,'Failed write is reported and never shown as saved');}
 console.log(JSON.stringify({status:'PASS',checks:results.length,results}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
