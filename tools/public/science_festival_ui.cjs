const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,s)=>{const f=path.join(root,decodeURI(q.url.split('?')[0]));fs.readFile(f,(e,b)=>{s.writeHead(e?404:200,{'content-type':f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});s.end(e?'':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch({headless:true});const rows=[];try{
 for(const entry of ['index.html','design-v4.html']){
  const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/'+entry+'?channel=play#today');await p.waitForSelector('[data-festival-route="today"]');
  for(const lang of ['uk','en','es','fr']){
   await p.evaluate(lang=>NRLocale.set(lang),lang);
   for(const route of ['today','panch']){
    await p.evaluate(route=>{location.hash=route;},route);const box=p.locator('[data-festival-route="'+route+'"]');await box.evaluate(el=>el.open=true);
    for(const id of ['kyiv-2028-01','delhi-2028-05','new-york-2028-12']){
     await box.locator('[data-cases]').selectOption(id);
     const row=await box.evaluate(el=>({saved:el._decision,text:el.innerText,status:el.querySelector('[data-result]').dataset.status,width:el.getBoundingClientRect().width,scroll:el.scrollWidth}));
     assert.ok(row.saved);assert.equal(row.saved.result.affects_score,false);assert.ok(row.saved.result.flags.includes('INSUFFICIENT_EVIDENCE'));assert.ok(row.saved.result.flags.includes('BOUNDARY_SENSITIVE'));
     for(const d of row.saved.result.decisions){if(d.selected_date)assert.ok(row.text.includes(d.selected_date));assert.equal(d.publish_as_verified,false);}
     assert.ok(row.text.includes(row.saved.reference.published_dates[0]));assert.ok(row.scroll<=row.width+2);rows.push({entry,lang,route,id,status:row.status});
    }
   }
  }
  // v120 coverage remains authoritative for ordinary events; conflicts must remain visible.
  const coverage=await p.evaluate(()=>['2026-10-25','2027-02-01'].map(date=>{const host=document.createElement('div');SRResearchObservances.render(host,date,'en');return {date,state:host.querySelector('.sr-research-observances')?.dataset.state};}));
  assert.deepEqual(coverage,[{date:'2026-10-25',state:'none'},{date:'2027-02-01',state:'conflicting'}]);
  // No writes to user data: this is a new isolated browser context and synthetic location fixture.
  const live=await p.evaluate(()=>{const input=SRFestivalAstronomy.build({date:'2028-03-12',lat:40.7141666667,lon:-74.0058333333,zone:'America/New_York'});return {input,result:SRFestivalDecision.compare(input,['panchangtime-sankashti','nava-sankashti'])};});
  assert.ok(live.input.end>live.input.start);assert.equal(live.input.astronomy.engine,'Astronomy Engine 2.1.19');assert.equal(live.result.status,'INSUFFICIENT_EVIDENCE');
  const dst=await p.evaluate(()=>['2028-03-12','2028-11-05'].map(date=>{const d=SkyRhythmCivil.dayIntervals(date,'America/New_York');return (+d.end- +d.start)/36e5;}));assert.deepEqual(dst,[23,25]);
  await p.evaluate(()=>{NRLocale.set('uk');location.hash='today';});const box=p.locator('[data-festival-route="today"]');await box.locator('[data-cases]').selectOption('kyiv-2028-01');await box.locator('[data-result] > p').filter({hasText:'archived_evidence'}).evaluate(el=>el.scrollIntoView({block:'center'}));await p.screenshot({path:path.join(out,entry+'.png')});const detail=box.locator('.sr-festival-rule details').first();await detail.evaluate(el=>el.open=true);assert.ok(await detail.evaluate(el=>el.scrollWidth<=el.getBoundingClientRect().width+2));await detail.locator('p').first().evaluate(el=>el.scrollIntoView({block:'center'}));await p.screenshot({path:path.join(out,entry+'-trace.png')});
  await p.evaluate(()=>localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.45,lon:30.52,zone:'Europe/Kyiv',saved_at:'2026-10-19T00:00:00Z'})));
  await box.locator('[data-cases]').selectOption('live');await box.locator('input').fill('2028-03-12');await box.locator('[data-run]').click();assert.ok(await box.evaluate(el=>el._decision?.input.astronomy.engine==='Astronomy Engine 2.1.19'));assert.equal(await box.locator('[data-result]').getAttribute('data-status'),'INSUFFICIENT_EVIDENCE');

  await p.addScriptTag({path:path.join(__dirname,'vendor/axe.min.js')});
  for(const theme of ['light','dark'])for(const route of ['today','panch']){
   await p.evaluate(({theme,route})=>{const choice=document.getElementById('nrThemeChoice');choice.value=theme;choice.dispatchEvent(new Event('change',{bubbles:true}));location.hash=route;},{theme,route});
   const panel=p.locator('[data-festival-route="'+route+'"]');await panel.evaluate(el=>el.open=true);await panel.locator('[data-cases]').selectOption('kyiv-2028-01');
   await p.waitForFunction(route=>document.querySelector('[data-festival-route="'+route+'"]')?.closest('.nr-route')?.classList.contains('active'),route);
   // Measure the displayed route after its finite entry animation, without disabling motion or contrast rules.
   const opacity=await panel.evaluate(async el=>{const ancestors=[];for(let n=el;n;n=n.parentElement)ancestors.push(n);await Promise.all(ancestors.flatMap(n=>n.getAnimations()).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished));return ancestors.map(n=>Number(getComputedStyle(n).opacity));});
   assert.ok(opacity.every(x=>x===1),'Festival and ancestors must be fully visible before accessibility measurement');
   const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
   assert.deepEqual(violations,[],entry+'/'+theme+'/'+route);
   if(theme==='light'&&route==='today'){await panel.locator('[data-result] > p').filter({hasText:'archived_evidence'}).evaluate(el=>el.scrollIntoView({block:'center'}));await p.screenshot({path:path.join(out,entry+'-light.png')});}
  }

  assert.deepEqual(errors,[]);await c.close();
 }
 fs.writeFileSync(path.join(out,'UI.json'),JSON.stringify({status:'PASS',cases:rows.length,liveAdapters:2,accessibilityPanels:8,DST:[23,25],rows},null,2));console.log('PASS '+rows.length+' source-to-display cases, 2 live adapters, DST 23/25h');
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
