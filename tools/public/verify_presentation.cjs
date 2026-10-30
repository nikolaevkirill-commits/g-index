const assert=require('node:assert/strict');
const {moonIllumination}=require('../../moon_phase_v1.js');
const score=require('../../score_semantics_v1.js');
for(const [date,k,waxing] of [['2026-10-25',.991,true],['2026-11-01',.551,false],['2026-11-09',.002,true],['2026-11-17',.495,true]]){
 const actual=moonIllumination(new Date(date+'T12:00:00Z'));
 assert(Math.abs(actual.k-k)<=.01,date+' illumination regression');assert.equal(actual.waxing,waxing,date+' direction');
}
for(const v of [null,undefined,NaN,Infinity,'1',1.5,4,-4])assert.equal(score.scoreClass(v),'missing');
for(const v of [-3,-2,-1,0,1,2,3])assert.equal(score.scoreClass(v),v<0?'negative':v>0?'positive':'neutral');
console.log('PASS presentation regression: four illumination fixtures (not independent accuracy proof), strict final-score domain');

// Exercise the actual legacy renderer, including a display:none ancestor (zero rect).
(async()=>{
 const fs=require('fs'),path=require('path'),http=require('http'),{chromium}=require('playwright');
 const root=path.resolve(__dirname,'../..');
 const types={'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
 const server=http.createServer((q,r)=>{const name=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){r.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{r.writeHead(e?404:200,{'content-type':types[path.extname(file)]||'application/octet-stream'});r.end(e?'':b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch();const c=await browser.newContext({serviceWorkers:'block',locale:'uk-UA',viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());const p=await c.newPage();
  await p.addInitScript(()=>{window.__paints=0;const original=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='planetCanvas')window.__paints++;return original.apply(this,args)};});
  await p.goto('http://127.0.0.1:'+server.address().port+'/index.html?channel=play#today');await p.waitForFunction(()=>typeof renderPlanetAnimation==='function');
  await p.evaluate(()=>renderPlanetAnimation(2,30,0,null,null));await p.waitForTimeout(1000);
  const rect=await p.locator('#planetCanvas').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));assert.deepEqual(rect,{width:0,height:0});
  const count=async()=>{await p.evaluate(()=>window.__paints=0);await p.waitForTimeout(1200);return p.evaluate(()=>window.__paints)};
  assert.equal(await count(),0,'hidden canvas must not paint');
  await p.evaluate(()=>{const wrap=document.createElement('div');wrap.id='animationRegression';wrap.style.cssText='position:fixed;top:100px;left:0;width:360px;height:250px;z-index:99999';document.body.append(wrap);wrap.append(document.getElementById('planetCanvas'));renderPlanetAnimation(2,30,0,null,null);});await p.waitForTimeout(1000);
  assert(await count()>0,'visible canvas paints');
  await p.evaluate(()=>document.getElementById('animationRegression').style.top='2000px');assert.equal(await count(),0,'offscreen canvas must not paint');
  await p.evaluate(()=>document.getElementById('animationRegression').style.top='100px');assert(await count()>0,'canvas resumes when visible');
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{window.__paints=0;renderPlanetAnimation(2,30,0,null,null)});await p.waitForTimeout(1200);assert.equal(await p.evaluate(()=>window.__paints),1,'reduced motion paints one static frame');
  console.log('PASS planet renderer: hidden=0, visible paints, offscreen=0, visible resumes, reduced motion=1');
 }finally{if(browser)await browser.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
