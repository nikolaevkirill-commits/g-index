'use strict';
// FP569o guard (Claude, 09.11.2026; owner: «я не розумію цих скрінів … начо стільки зайвої інфи»):
// NOAA card = one plain answer + what it means, no S0/R0/UTC noise; the G scale marks «зараз» and «прогноз».
// Day line opens with «Сьогодні в місячному календарі»: chronological plain sentences with the traditional meaning.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});s.end(b)})});
// NOAA scales fixture: calm now (G0 S0 R0), G1 forecast for tomorrow.
const FX={'0':{DateStamp:'2026-11-09',TimeStamp:'08:30:00',R:{Scale:'0'},S:{Scale:'0'},G:{Scale:'0'}},'1':{DateStamp:'2026-11-09',R:{MinorProb:'15',MajorProb:'1'},S:{Prob:'1'},G:{Scale:'0'}},'2':{DateStamp:'2026-11-10',R:{MinorProb:'15',MajorProb:'1'},S:{Prob:'1'},G:{Scale:'1'}},'3':{DateStamp:'2026-11-11',R:{MinorProb:'15',MajorProb:'1'},S:{Prob:'1'},G:{Scale:'0'}}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let n=0;
try{for(const lang of ['uk','en']){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv',isMobile:true,hasTouch:true});
 await c.route(/noaa-scales\.json/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(FX)}));
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)(?!.*noaa-scales)/,r=>r.abort());
 await c.addInitScript(l=>{localStorage.setItem('gidx_onboard_done_v2','1');if(l==='en')localStorage.setItem('nr_locale_v1','en');},lang);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:new Date('2026-11-09T08:51:00Z')});
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-weather-brief]')?.dataset.gForecast==='1'&&document.querySelector('.sr-dl-today:not([hidden])')&&document.querySelector('#nrRoute-today .sr-g-cells i.is-forecast'),null,{timeout:60000});
 const w=await p.evaluate(()=>{const el=document.querySelector('#nrRoute-today [data-weather-brief]');return {text:el.innerText,fc:document.querySelectorAll('#nrRoute-today .sr-g-cells i.is-forecast').length,fcText:document.querySelector('#nrRoute-today .sr-g-markers [data-g-kind=forecast]')?.textContent}});
 const uk=lang==='uk';
 assert.match(w.text,uk?/Можлива магнітна буря · G1 · 10.*UTC/:/Possible magnetic storm · G1 · 10.*UTC/);n++;
 assert.match(w.text,uk?/Геомагнітної бурі не спостерігається/:/No geomagnetic storm observed/);n++;
 assert.match(w.text,uk?/оновлено 10:30 · Київ/:/updated 10:30 · Kyiv/);n++;
 assert.doesNotMatch(w.text,/\bS0\b|\bR0\b|завтра|tomorrow/);n++;
 assert.equal(w.fc,1);assert.match(w.fcText,uk?/G1 · прогноз/:/G1 · forecast/);n+=2;

 const lineRoot=p.locator('.sr-dayline');
 const technical=lineRoot.locator('[data-dl-technical]');
 assert.equal(await technical.evaluate(el=>el.open),false);n++;
 const daySummary=lineRoot.locator('[data-dl-civil]');
 await daySummary.waitFor({state:'visible'});
 assert.match(await daySummary.locator('[data-dl-civil-mode]').textContent(),uk?/^Зараз · 10:51/:/^Now · 10:51/);n++;
 assert.match(await daySummary.locator('[data-dl-current-tithi]').textContent(),uk?/Шукла Пратіпада/:/Shukla Pratipada/);n++;
 assert.match(await daySummary.locator('[data-dl-next-time]').textContent(),/21:43/);n++;
 const periods=lineRoot.locator('[data-dl-periods]');
 assert.equal(await periods.evaluate(el=>el.open),false);
 await periods.locator('summary').click();
 await periods.locator('[data-dl-period-list] > li').first().waitFor({state:'visible'});
 const shape=()=>periods.locator('li[data-start]').evaluateAll(nodes=>nodes.map(row=>({start:+row.dataset.start,end:+row.dataset.end,current:row.hasAttribute('aria-current'),times:[...row.querySelectorAll('[data-event-at]')].map(e=>Date.parse(e.dataset.eventAt))})));
 const windows=await shape();
 assert.equal(windows.length,8);n++;
 assert.ok(windows.every((x,i)=>x.end-x.start===10800000&&(i===0||x.start===windows[i-1].end)&&x.times.every(t=>t>=x.start&&t<x.end)));n++;
 assert.equal(windows.filter(x=>x.current).length,1);n++;
 assert.equal(await periods.locator('.sr-dl-period-tara').count(),0);
 assert.match(await periods.locator('[data-dl-personal-note]').textContent(),uk?/Додай дані народження/:/Add birth details/);n++;
 await p.evaluate(()=>{
  localStorage.setItem('personalData_0',JSON.stringify({date:'1990-06-15',time:'14:20',utcOff:4,tz:'Europe/Kyiv'}));
  window.dispatchEvent(new Event('nr:natal'));
 });
 assert.equal(await periods.locator('.sr-dl-period-tara').count(),8);
 const relation=await periods.locator('.sr-dl-period-tara').first().textContent();
 assert.match(relation,uk?/Тара Бала · .*за традицією/:/Tara Bala · .*by tradition/);n+=2;
 if(process.env.FP569O_EVIDENCE&&uk)await periods.locator('[aria-current=time]').screenshot({path:path.join(process.env.FP569O_EVIDENCE,'dayline_personal_390.png')});
 const personal=await p.evaluate(()=>NRNatalSky.timelineTara([1,2,27]));
 const reference=await p.evaluate(()=>[1,2,27].map(v=>calcTaara(24,v-1).danger?'caution':'good'));
 assert.deepEqual([1,2,27].map(v=>personal.byNakshatra[v].tone),reference);n++;
 await p.evaluate(()=>{
  for(let d=1;d<=15;d++){
   const date='1990-06-'+String(d).padStart(2,'0');
   localStorage.setItem('personalData_0',JSON.stringify({date,time:'',utcOff:4,tz:'Europe/Kyiv'}));
   if(NRNatalSky.timelineTara([1]).status==='ambiguous')break;
  }
  window.dispatchEvent(new Event('nr:natal'));
 });
 assert.equal(await periods.locator('.sr-dl-period-tara').count(),0);
 assert.match(await periods.locator('[data-dl-personal-note]').textContent(),uk?/Уточни час народження/:/Add your birth time/);n++;
 await p.evaluate(()=>{localStorage.removeItem('personalData_0');window.dispatchEvent(new Event('nr:natal'));});
 if(process.env.FP569O_EVIDENCE&&uk){
  await daySummary.screenshot({path:path.join(process.env.FP569O_EVIDENCE,'dayline_plain_390.png')});
  await periods.locator('[aria-current=time]').screenshot({path:path.join(process.env.FP569O_EVIDENCE,'dayline_window_390.png')});
 }
 await periods.locator('summary').click();
 const t=await p.locator('.sr-dl-today .sr-dl-row').allTextContents();
 assert.equal(t.length,4,JSON.stringify(t));n++;
 assert.match(t[0],uk?/до 09:02.*Амавасья/:/until 09:02.*Amavasya/);n++;
 assert.match(t[1],uk?/з 09:02.*Шукла Пратіпада/:/from 09:02.*Shukla Pratipada/);n++;
 assert.match(t[2],uk?/до 05:49 завтра.*Вішакха/:/until 05:49 tomorrow.*Vishakha/);n++;
 assert.match(t[3],uk?/з 05:49 завтра.*Анурадха/:/from 05:49 tomorrow.*Anuradha/);n++;
 const tm=await p.locator('.sr-dayline [data-transition-mean]').textContent();
 assert.match(tm,uk?/Карана — половина місячного дня/:/half a lunar day/);n++;
 await p.locator('.sr-dayline [data-dl-technical] > summary').click();
 const legend=p.locator('.sr-dayline .sr-dl-legend summary');
 assert.equal(await legend.evaluate(el=>el.closest('details').open),false);
 await legend.click();
 assert.equal(await legend.evaluate(el=>el.closest('details').open),true);n+=2;
 if(uk){
  const line=p.locator('.sr-dayline'),dlg=p.locator('.sr-dl-dialog');
  const {events,now}=await p.evaluate(()=>({events:SRDayLineView.snapshot().events,now:Date.now()}));
  const old=events.find(e=>Number.isInteger(e.index)&&Date.parse(e.at)<now);
  const upcoming=events.find(e=>Number.isInteger(e.index)&&Date.parse(e.at)>now);
  assert(old&&upcoming);
  await p.evaluate(i=>SRDayLineView.openEvent(i),old.index);
  assert.ok((await dlg.locator('h2').textContent()).includes(old.label));
  await p.keyboard.press('Escape');
  await line.locator('[data-dl-next]').click();
  assert.ok((await dlg.locator('h2').textContent()).includes(upcoming.label),'viewing an old event must not replace the next event');
  await dlg.getByRole('button',{name:'Переглянути цей момент'}).click();
  assert.equal(await p.evaluate(()=>SRSkyTime.snapshot().at),Date.parse(upcoming.at),'preview must use the exact transition');
  assert.equal(await p.locator('[data-time-sun]').getAttribute('data-at'),upcoming.at,'Sun and event preview share the same instant');
  assert.match(await line.locator('[data-moment]').textContent(),/^Вибраний час.*Місячний день:.*Сузір’я Місяця:/);
  assert.equal(await line.locator('.sr-dl-preview-cursor').getAttribute('hidden'),null);
  assert.equal(await line.locator('.sr-dl-now').count(),1);
  const legendOpen=()=>legend.evaluate(el=>el.closest('details').open);
  if(!await legendOpen())await legend.click();
  assert.equal(await legendOpen(),true);
  await legend.evaluate(el=>{window.__legendBeforeTick=el;});
  await p.clock.fastForward(65000);
  assert.ok(await legend.evaluate(el=>el===window.__legendBeforeTick&&el.closest('details').open),'minute tick preserves the expanded legend');
  if(process.env.FP569O_EVIDENCE){
   await line.locator('[data-moment]').screenshot({path:path.join(process.env.FP569O_EVIDENCE,'selected_moment_390.png')});
  }
  await line.locator('[data-now]').click();
  assert.equal(await p.evaluate(()=>SRSkyTime.snapshot().mode),'now');
  assert.notEqual(await line.locator('.sr-dl-preview-cursor').getAttribute('hidden'),null);n+=9;
 }
 if(process.env.FP569O_EVIDENCE&&uk){
  if(!await technical.evaluate(el=>el.open))await technical.locator(':scope > summary').click();
  await p.locator('.sr-dayline .sr-dl-today').screenshot({path:path.join(process.env.FP569O_EVIDENCE,'dayline_390_uk.png')});
  await p.locator('#nrRoute-today [data-weather-brief]').screenshot({path:path.join(process.env.FP569O_EVIDENCE,'noaa_390_uk.png')});
 }
 const line=p.locator('.sr-dayline'),dlg=p.locator('.sr-dl-dialog');
 if(!await line.locator('[data-dl-technical]').evaluate(el=>el.open))await line.locator('[data-dl-technical] > summary').click();
 const marks=line.locator('.sr-dl-marker');
 const allEvents=await p.evaluate(()=>SRDayLineView.snapshot().events.filter(e=>Number.isInteger(e.index)).map(e=>e.at));
 for(const width of [390,320]){
  await p.setViewportSize({width,height:844});
  await p.waitForFunction(w=>innerWidth===w,width);
  const groups=await marks.evaluateAll(nodes=>nodes.map(n=>{
   const r=n.getBoundingClientRect(),parent=n.parentElement.getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,parentLeft:parent.left,parentRight:parent.right,parentBottom:parent.bottom,count:+n.dataset.eventCount};
  }));
  assert.ok(groups.length&&groups.reduce((n,g)=>n+g.count,0)===allEvents.length);
  for(const [i,g] of groups.entries()){
   assert.ok(g.left>=g.parentLeft&&g.right<=g.parentRight&&g.bottom<=g.parentBottom,'marker fits on '+width+'px');
   assert.ok(i===0||groups[i-1].right<g.left,'no marker overlap');
  }
  const explained=[];
  for(const marker of await marks.all()){
   const count=Number(await marker.getAttribute('data-event-count'));
   const time=await marker.locator('time').getAttribute('datetime');
   const title=await marker.locator('.sr-dl-marker-name').textContent();
   await marker.tap();
   const rows=dlg.locator('.sr-dl-group-item');
   assert.equal(await rows.count(),count);
   const dates=await rows.locator('time').evaluateAll(nodes=>nodes.map(x=>x.dateTime));
   explained.push(...dates);
   const primary=dlg.locator('[data-primary]');
   assert.equal(await primary.locator('time').getAttribute('datetime'),time);
   assert.ok((await primary.locator('.sr-dl-group-change').textContent()).endsWith(title));
   assert.ok((await rows.locator('.sr-dl-group-meaning').allTextContents()).every(t=>t.length>15));
   assert.equal((await rows.locator('.sr-dl-group-change').allTextContents()).filter(t=>t.includes(' → ')).length,count);
   if(!uk)assert.doesNotMatch(await dlg.innerText(),/[А-Яа-яІіЇїЄєҐґ]/);
   if(uk&&width===390&&count>=3){
    assert.match(await marker.locator('time').textContent(),/05:49 завтра/);
    assert.match(await primary.locator('time').textContent(),/10 лист.*05:49/);
    if(process.env.FP569O_EVIDENCE){
     await p.waitForTimeout(250);
     await p.screenshot({path:path.join(process.env.FP569O_EVIDENCE,'02-all-transitions-390.png')});
    }
    await rows.first().getByRole('button').tap();
    await dlg.getByRole('button',{name:'← До всіх переходів'}).tap();
    assert.equal(await dlg.locator('.sr-dl-group-item').count(),count);
    await p.clock.fastForward(65000);
   }
   await dlg.getByRole('button',{name:uk?'Закрити':'Close',exact:true}).tap();
   await dlg.waitFor({state:'hidden'});
   await p.waitForFunction(t=>document.activeElement?.querySelector('time')?.dateTime===t,time);
  }
  assert.deepEqual(explained,allEvents,'every calendar transition appears in order exactly once');
  if(uk&&process.env.FP569O_EVIDENCE){
   await legend.evaluate(el=>el.closest('details').open=false);
   await line.locator('[data-track]').evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-205));
   await p.waitForTimeout(200);
   await p.screenshot({path:path.join(process.env.FP569O_EVIDENCE,width===390?'01-dayline-390.png':'03-dayline-320.png')});
  }
  n+=6;
 }
 if(uk){
  const active=await p.evaluate(()=>{
   SRSkyTime.selectMoment('2026-11-10T00:00:00Z');
   return [...document.querySelectorAll('.sr-dl-marker.is-passing')].length;
  });
  assert.equal(active,0,'a time between grouped transitions is not highlighted');
  await p.evaluate(()=>SRSkyTime.live());
  n++;
 }
 const mk=await p.evaluate(()=>[...document.querySelectorAll('.sr-dayline [data-track] button')].map(b=>b.textContent).join('|'));assert.doesNotMatch(mk,/⁺¹|[^ ]\+\d/,'markers: '+mk);n++;
 const note=await p.evaluate(()=>document.querySelector('.sr-dl-today small').textContent);assert.match(note,lang==='uk'?/Бал дня розраховується окремо/:/day score is calculated separately/);n++;
 if(lang==='en'){assert.equal(/[А-Яа-яІіЇїЄєҐґ]/.test(w.text+JSON.stringify(t)+tm),false,'English has no Cyrillic');n++}
 assert.deepEqual(errs,[]);n++;await c.close();
}
 console.log('PASS plain FP569o:',n,'checks');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;srv.close()});
