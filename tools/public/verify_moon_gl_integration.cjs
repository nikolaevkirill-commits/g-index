'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const srv=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream'});r.end(e?'':d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),rows=[];try{
for(const entry of ['index.html','classic.html']){
 const c=await b.newContext({viewport:{width:390,height:950},locale:'uk-UA',timezoneId:'Europe/Kyiv',serviceWorkers:'block',reducedMotion:'reduce'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-11-06T05:30:00Z')});
 await p.addInitScript(()=>localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.4501,lon:30.5234,zone:'Europe/Kyiv',saved_at:new Date().toISOString()})));
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today');await p.waitForFunction(()=>window.NRConsumerOverview);
 assert.equal(await p.evaluate(()=>!!window.NRMoonGL),false,'WebGL module must not execute on Today');
 await p.evaluate(()=>location.hash='#panch');await p.clock.runFor(1500);await p.waitForSelector('canvas.nr-sl-moon-gl:visible');
 const initial=await p.evaluate(()=>{window.__canvas=document.querySelector('canvas.nr-sl-moon-gl');window.__gl=__canvas.getContext('webgl');const s=NRSkyLive.snapshot();return {phase:+__canvas.dataset.phaseAngle,limb:+__canvas.dataset.limb,expectedPhase:s.phaseAngle,expectedLimb:s.limb,anims:document.querySelector('[data-sky-live]').getAnimations({subtree:true}).length,svgHidden:getComputedStyle(document.querySelector('.nr-sl-moon')).display==='none'};});
 assert(Math.abs(initial.phase-initial.expectedPhase)<.0001&&Math.abs(initial.limb-initial.expectedLimb)<.0001);assert(initial.svgHidden);assert.equal(initial.anims,0);
 await p.clock.fastForward(61000);assert(await p.evaluate(()=>__canvas===document.querySelector('canvas.nr-sl-moon-gl')&&__gl===__canvas.getContext('webgl')),'reuse canvas/context across ticks');
 await p.evaluate(()=>{window.__ext=__gl.getExtension('WEBGL_lose_context');if(!__ext)throw Error('Context-loss validation requires extension');__ext.loseContext();});
 await p.waitForFunction(()=>document.querySelector('canvas.nr-sl-moon-gl').hidden&&getComputedStyle(document.querySelector('.nr-sl-moon')).display!=='none');
 assert.equal(await p.evaluate(()=>NRMoonGL.draw(__canvas,{phaseAngle:90,limb:0})),false,'lost context returns false, no throw');
 await p.evaluate(()=>__ext.restoreContext());await p.waitForFunction(()=>!__gl.isContextLost()&&!__canvas.hidden);
 assert(await p.evaluate(()=>__canvas===document.querySelector('canvas.nr-sl-moon-gl')),'same canvas after restoration');
 await p.evaluate(()=>{Object.defineProperty(navigator.connection,'saveData',{configurable:true,get:()=>true});navigator.connection.dispatchEvent(new Event('change'));});
 assert(await p.evaluate(()=>__canvas.hidden&&getComputedStyle(document.querySelector('.nr-sl-moon')).display!=='none'),'save-data selects SVG');
 await p.evaluate(()=>{delete navigator.connection.saveData;navigator.connection.dispatchEvent(new Event('change'));});
 assert(await p.evaluate(()=>!__canvas.hidden),'GL resumes without a new canvas');
 if(process.env.SKY_VISUAL_DIR){fs.mkdirSync(process.env.SKY_VISUAL_DIR,{recursive:true});await p.setViewportSize({width:390,height:1600});await p.locator('[data-sky-live]').screenshot({path:path.join(process.env.SKY_VISUAL_DIR,'gl-'+entry+'.png')});}
 assert.deepEqual(errors,[]);rows.push({entry,renderedPhase:initial.phase,reused:true,lossRestore:true,saveDataFallback:true});await c.close();
}
console.log('PASS WebGL integration '+JSON.stringify(rows));}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);srv.close();process.exitCode=1});
