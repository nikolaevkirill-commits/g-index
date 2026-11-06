'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const srv=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream'});r.end(e?'':d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch(),results=[];
try{
for(const lang of ['uk','en','es','fr']){
 console.log('checking live sky',lang);
 const c=await b.newContext({viewport:{width:390,height:900},locale:lang,serviceWorkers:'block',timezoneId:'Europe/Kyiv'});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-11-06T05:30:00Z')});
 await p.addInitScript(l=>{localStorage.setItem('gindex_locale_v1',l);localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.4501,lon:30.5234,zone:'Europe/Kyiv',saved_at:new Date().toISOString()}));},lang);
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today');
 await p.waitForFunction(()=>window.NRConsumerOverview&&window.NRLocale);
 await p.clock.runFor(1000);
 assert.equal(await p.evaluate(()=>!!window.NRSkyLive),false,'live module must not execute on Today');
 await p.evaluate(l=>{window.NRLocale.set(l);location.hash='#panch'},lang);
 await p.clock.runFor(1000);
 await p.waitForSelector('[data-sky-live][data-state=ready]');
 const r=await p.evaluate(()=>{
  const S=window.NRSkyLive,now=Date.now(),snap={formula:{state:'fresh'},calculation:{generated_at:new Date(now).toISOString(),kp_daily_max:4.67,kp_source:'NOAA_3day_slots'}};
  const live={usable:true,kp:.67,expiresAt:now+5*3600000,provisional:false};
  const pick=(l,s=snap,online=true)=>S.selectKp(l,s,now,online);
  return {language:NRLocale.language,text:document.querySelector('[data-sky-live]').textContent,
   states:[pick(live),pick({...live,provisional:true,expiresAt:now+600000}),pick({...live,expiresAt:now-1}),pick(null,{...snap,formula:{state:'stale'}}),pick(null,{...snap,calculation:{...snap.calculation,generated_at:null}}),pick(live,snap,false),pick(null,{...snap,calculation:{...snap.calculation,kp_source:'NOAA_27day_outlook'}}),pick({...live,kp:NaN}),pick({...live,kp:10},{...snap,calculation:{...snap.calculation,kp_daily_max:10}})],
   polar:S.auroraFor(80,1),unknown:S.auroraFor(null,6),bad:S.auroraFor(47,10),
   noLoc:S.compute(new Date(),null),score:document.querySelector('[data-overview="today"] [data-final-score]')?.textContent};
 });
 assert.equal(r.language,lang);if(lang!=='uk')assert(!/[А-Яа-яІіЇїЄє]/.test(r.text),'all live-sky text localized: '+r.text);
 assert.deepEqual(r.states.map(x=>x.kind),['observed','provisional','forecast3','missing','missing','missing','outlook27','forecast3','missing']);
 assert.equal(r.states[0].kp,.67);assert.equal(r.states[2].kp,4.67);assert.equal(r.polar.state,'no_numeric_limit');assert.equal(r.unknown.state,'no_location');assert.equal(r.bad.state,'no_kp');
 assert.deepEqual(r.noLoc.hz,{});assert.equal(r.noLoc.loc,null);assert(Number.isFinite(r.noLoc.limb));
 assert(!/unlikely|малоймовір|poco probable|peu probable/.test(r.text),'no fabricated likelihood');
 console.log('data guards passed',lang);
 // A minute refresh must retain dot identity and focused source links.
 await p.evaluate(()=>{window.__dot=document.querySelector('.nr-sl-body[data-body=Sun]');window.__link=document.querySelector('.nr-sl-sources a');__link.focus();});
 await p.clock.fastForward(61000);
 assert(await p.evaluate(()=>__dot===document.querySelector('.nr-sl-body[data-body=Sun]')&&document.activeElement===__link),'stable dots and focus across clock tick');
 // Session-only saved location after a storage failure must match the form's location.
 await p.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='gindex_local_context_v1')throw new Error('test storage failure');return original.call(this,k,v)};window.__restore=()=>Storage.prototype.setItem=original;const f=document.querySelector('#nrLocalContext form');f.elements.lat.value='-33.86';f.elements.lon.value='151.21';f.elements.zone.value='Australia/Sydney';f.dispatchEvent(new Event('submit',{cancelable:true}));});
 const session=await p.evaluate(()=>({loc:NRSkyLive.snapshot().loc,foot:document.querySelector('.nr-sl-foot').textContent,stored:JSON.parse(localStorage.getItem('gindex_local_context_v1')).lat}));
 assert.equal(session.loc.lat,-33.86);assert.equal(session.stored,50.4501);assert(session.foot.includes('Australia/Sydney'));await p.evaluate(()=>__restore());
 // Hidden document, inactive route, OS reduced motion and save-data each suppress animation/work.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.__time=document.querySelector('[data-sky-live]').dataset.time;});
 await p.clock.fastForward(61000);
 assert(await p.evaluate(()=>__time===document.querySelector('[data-sky-live]').dataset.time&&!document.querySelector('[data-sky-live]').classList.contains('nr-sl-motion')));
 await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));location.hash='#today';});await p.clock.runFor(500);
 const stopped=await p.locator('[data-sky-live]').getAttribute('data-time');await p.clock.fastForward(61000);assert.equal(await p.locator('[data-sky-live]').getAttribute('data-time'),stopped);
 await p.evaluate(()=>location.hash='#panch');await p.clock.runFor(500);await p.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await p.evaluate(()=>document.querySelector('[data-sky-live]').getAnimations({subtree:true}).length),0);
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(()=>{Object.defineProperty(navigator.connection,'saveData',{configurable:true,get:()=>true});navigator.connection.dispatchEvent(new Event('change'));});
 assert.equal(await p.evaluate(()=>document.querySelector('[data-sky-live]').getAnimations({subtree:true}).length),0);
 assert.equal(await p.evaluate(()=>document.querySelector('[data-sky-live]').classList.contains('nr-sl-motion')),false);
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow);
 if(process.env.SKY_VISUAL_DIR){fs.mkdirSync(process.env.SKY_VISUAL_DIR,{recursive:true});await p.locator('[data-sky-live]').screenshot({path:path.join(process.env.SKY_VISUAL_DIR,'sky-'+lang+'-390.png')});}
 assert.deepEqual(errors,[]);results.push({lang,checks:'lazy, provenance, stale/offline, no-location, session location, focus, visibility, reduced/save-data, localization'});await c.close();
}
console.log('PASS live sky guards '+JSON.stringify(results));
}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);srv.close();process.exitCode=1});
