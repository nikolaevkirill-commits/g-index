// FP564: date bar (today / other date + back button), change vs yesterday, provenance line,
// day-vs-forecast rating (saved once, survives reload, not shown again), no page errors, 2 entries × 2 widths.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(e?'':d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(),results=[];
try{for(const entry of ['index.html','classic.html'])for(const width of [390,1280]){
 const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',locale:'uk-UA',timezoneId:'Europe/Kyiv',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 const base='http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play';
 await p.clock.setFixedTime(new Date('2026-11-06T10:00:00Z'));
 await p.goto(base+'#today');
 await p.waitForFunction(()=>document.querySelector('[data-overview=today] [data-day-context]'));
 const today=await p.evaluate(()=>NRCivilTime.dayKey(Date.now()));
 const yesterday=await p.evaluate(t=>{const d=new Date(t+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)},today);
 // Seed what this device showed yesterday, so the test does not depend on the feed window.
 await p.evaluate(([y])=>{localStorage.setItem('gindex_day_shown_v1',JSON.stringify({[y]:{last:{origin:'visible_overview_v2',date:y,seen_at:y+'T12:00:00Z',score:-1,authority:'source_formula',snapshot:{date:y,display:{score:-1}}}}}));localStorage.removeItem('gindex_day_vs_forecast_v1');},[yesterday]);
 await p.reload();await p.waitForFunction(()=>document.querySelector('[data-overview=today] [data-day-context]'));await p.waitForTimeout(400);
 const bar=p.locator('[data-overview=today] [data-day-context]');
 assert.equal(await bar.getAttribute('data-state'),'today',entry+' '+width+' bar must mark today');
 assert.equal(await bar.getAttribute('data-selected-date'),today);
 assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('[data-overview=today] [data-day-context]')).position),'sticky');
 const score=await p.evaluate(()=>NRConsumerOverview.snapshot(NRCivilTime.dayKey(Date.now())).display);
 const barText=await bar.innerText();
 if(score.available){const prevScore=await p.evaluate(y=>{const s=NRConsumerOverview.snapshot(y).display;return s.available?s.score:-1},yesterday);
  const sign=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'0';
  assert(barText.includes(sign(prevScore)+' → '+sign(score.score)),entry+' '+width+' delta must use resolved scores: '+barText);}
 const prov=await p.locator('[data-day-provenance][data-for=today]').innerText();
 assert(/Kp: /.test(prov)&&/Europe\/Kyiv/.test(prov),'provenance line incomplete: '+prov);
 assert(await p.locator('[data-day-provenance][data-for=today]').isVisible(),'provenance must not be folded into details');
 // Rating for yesterday: visible, saves once with the shown score, then disappears.
 const rate=p.locator('#nrRoute-today [data-day-rating]');
 assert(await rate.isVisible(),entry+' '+width+' rating card must be visible for an unrated yesterday');
 await rate.locator('[data-rate=as_expected]').click();
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('gindex_day_vs_forecast_v1')||'[]').length===1);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('gindex_day_vs_forecast_v1')||'[]'));
 assert.equal(saved.length,1);assert.equal(saved[0].date,yesterday);assert.equal(saved[0].rating,'as_expected');assert.equal(saved[0].shown?.score,-1);assert.equal(saved[0].snapshot?.display.score,-1);assert.equal(saved[0].independent_validation,false);
 await p.reload();await p.waitForFunction(()=>document.querySelector('[data-overview=today] [data-day-context]'));await p.waitForTimeout(400);
 assert.equal(await p.locator('#nrRoute-today [data-day-rating]').count(),0,'rated day must not be asked again');
 // Another date: bar warns, back button returns to today.
 const other=await p.evaluate(t=>{const sel=[...document.querySelectorAll('[data-overview=today] select')].find(s=>/^\d{4}-\d{2}-\d{2}$/.test(s.value));const o=[...(sel?.options||[])].find(o=>o.value>t);return o?.value||null},today);
 if(other){
  await p.evaluate(v=>{const sel=[...document.querySelectorAll('[data-overview=today] select')].find(s=>/^\d{4}-\d{2}-\d{2}$/.test(s.value));sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));},other);
  await p.waitForFunction(()=>document.querySelector('[data-overview=today] [data-day-context]')?.dataset.state==='other');
  await p.locator('[data-overview=today] .nr-dc-today').click();
  await p.waitForFunction(()=>document.querySelector('[data-overview=today] [data-day-context]')?.dataset.state==='today');
 }
 assert.deepEqual(errors,[],entry+' '+width+' page errors');
 results.push({entry,width,today,other,delta:barText.split('\n')[1]||null});await c.close();}
 console.log(JSON.stringify(results));console.log('PASS day context: 2 entries × mobile/desktop; date bar, delta, provenance, rating saved once');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
