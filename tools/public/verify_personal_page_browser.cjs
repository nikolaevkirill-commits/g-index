'use strict';
// FP571 (Claude 13.11): published personal day line — More card, empty state, opt-in birth memory, 320/390 reflow.
// Negative controls: without opt-in nothing is written to localStorage; "forget" removes the key.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const P=process.env.NR_SITE_ROOT||path.resolve(__dirname,'../..');
const type=f=>f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':'application/json';
(async()=>{const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://l').pathname).slice(1)||'index.html',f=path.resolve(P,rel);if(!f.startsWith(path.resolve(P)+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',type(f));res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const b=await chromium.launch({headless:true,...(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{})});let checks=0;const ok=f=>{f;checks++;};
 try{
  for(const width of [320,390]){const c=await b.newContext({viewport:{width,height:844},locale:'uk-UA',serviceWorkers:'block'}),p=await c.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await p.clock.setFixedTime(new Date('2026-11-13T10:00:00Z'));
   // 1. Entry from «Ще»
   await p.goto(base+'/index.html?channel=play#more');await p.waitForSelector('[data-personal-dayline]',{state:'attached',timeout:20000});
   ok(assert.match(await p.locator('[data-personal-dayline]').first().innerText(),/Особиста лінія дня/));
   await p.goto(base+'/personal_dayline.html');await p.waitForSelector('#day-blocks button');
   // 2. Empty state: transitions per block, CTA focuses birth date, nothing stored
   const blocks=await p.$$eval('#day-blocks button',bs=>bs.map(b=>b.querySelector('.block-change')?.textContent||''));
   ok(assert.equal(blocks.length,8));ok(assert.ok(blocks.some(t=>/✦|☾/.test(t)),'block transitions shown'));
   await p.click('.birth-cta');await p.waitForTimeout(150);ok(assert.equal(await p.evaluate(()=>document.activeElement.id),'birth-date'));
   ok(assert.equal(await p.evaluate(()=>localStorage.getItem('sr_personal_birth_v1')),null));
   // 3. Submit without opt-in → still nothing stored; setup folds
   await p.fill('#birth-date','1982-11-28');await p.selectOption('#birth-mode','known');await p.fill('#birth-time','06:40');await p.click('#calculate');await p.waitForTimeout(1500);
   ok(assert.equal(await p.evaluate(()=>localStorage.getItem('sr_personal_birth_v1')),null,'no write without opt-in'));
   ok(assert.equal(await p.evaluate(()=>document.querySelector('#setup').open),false));
   ok(assert.equal(await p.locator('.birth-cta').count(),0));
   // 4. Opt-in → stored only date/time/zone/mode; reload restores personal view
   await p.evaluate(()=>{document.querySelector('#setup').open=true;document.querySelector('#birth-panel').open=true;});await p.check('#remember-birth');await p.click('#calculate');await p.waitForTimeout(1500);
   const saved=JSON.parse(await p.evaluate(()=>localStorage.getItem('sr_personal_birth_v1')));ok(assert.deepEqual(Object.keys(saved).sort(),['date','from','mode','time','to','zone']));
   await p.reload();await p.waitForSelector('#day-blocks button');await p.waitForTimeout(800);
   ok(assert.equal(await p.inputValue('#birth-date'),'1982-11-28'));ok(assert.equal(await p.locator('.birth-cta').count(),0));
   ok(assert.match(await p.locator('#current-tara').innerText(),/Тара|тара/));
   // 5. Forget → key removed, CTA back
   await p.evaluate(()=>{document.querySelector('#setup').open=true;document.querySelector('#birth-panel').open=true;});await p.click('#forget-birth');await p.waitForTimeout(1200);
   ok(assert.equal(await p.evaluate(()=>localStorage.getItem('sr_personal_birth_v1')),null));ok(assert.equal(await p.locator('.birth-cta').count(),1));
   ok(assert.match(await p.locator('#day-note').textContent(), /кроком 1 хвилина/));
   // Travel uses sampled changes and exposes the uncertainty at the selected moment.
   const boundaryNote=p.locator('#travel-boundary-note');
   ok(assert.equal(await boundaryNote.count(),1));
   ok(assert.equal(await boundaryNote.isVisible(),false));
   await p.locator('#activity-picker > summary').click();
   await p.locator('#activities [data-activity="travel"]').click();
   ok(assert.equal(await boundaryNote.isVisible(),true));
   ok(assert.match(await boundaryNote.innerText(),/Межі часу орієнтовні.*Коротка зміна між відліками/));
   await p.evaluate(()=>PersonalDaylinePreview.select(PersonalDaylinePreview.getModel().day.start));
   ok(assert.match(await p.locator('#next-change').innerText(),/^Розрахована зміна умов · \d\d:\d\d$/));
   await p.evaluate(()=>PersonalDaylinePreview.select(PersonalDaylinePreview.getModel().day.end-1));
   ok(assert.equal(await p.locator('#next-change').innerText(),'До кінця доби на перевірених відліках змін не виявлено.'));
   await p.locator('#activities [data-activity="study"]').click();
   ok(assert.equal(await boundaryNote.isVisible(),false));
   await p.locator('#activities [data-activity="travel"]').click();
   ok(assert.equal(await boundaryNote.isVisible(),true));
   // 6. Reflow, also at 200 % text
   ok(assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true));
   await p.addStyleTag({content:'html,body{font-size:200%!important}'});await p.waitForTimeout(300);
   const layout=await p.evaluate(()=>{
    const vw=document.documentElement.clientWidth;
    return {vw,doc:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].filter(e=>{
     if(!e.checkVisibility())return false;const r=e.getBoundingClientRect();return r.right>vw+1||r.left<-1||e.scrollWidth>e.clientWidth+2&&e.clientWidth>0;
    }).slice(0,15).map(e=>[e.tagName,e.id,e.className?.baseVal||e.className,e.clientWidth,e.scrollWidth,Math.ceil(e.getBoundingClientRect().right)])};
   });
   ok(assert.equal(await boundaryNote.isVisible(),true));
   ok(assert.ok(layout.doc<=layout.vw,'200% text overflow at '+width+': '+JSON.stringify(layout)));
   for (const venue of [
    { city:'kyiv', zone:'Europe/Kyiv', earlier:'03:59 GMT+3', later:'03:59 GMT+2', next:'03:53 GMT+2' },
    { city:'barcelona', zone:'Europe/Madrid', earlier:'02:59 GMT+2', later:'02:59 GMT+1', next:'02:53 GMT+1' }
   ]) {
    await p.clock.setFixedTime(new Date('2018-10-28T12:00:00Z'));
    await p.goto(base+'/personal_dayline.html');
    await p.waitForSelector('#day-blocks button');
    await p.evaluate(()=>{document.querySelector('#setup').open=true;});
    await p.selectOption('#place',venue.city);
    await p.click('#calculate');
    await p.waitForFunction(zone=>window.PersonalDaylinePreview?.getModel()?.place.zone===zone,venue.zone);
    await p.locator('#activity-picker > summary').click();
    await p.locator('#activities [data-activity="travel"]').click();
    const shown=()=>p.locator('#selected-clock').innerText().then(text=>text.split(' · ')[0]);
    const select=iso=>p.evaluate(value=>PersonalDaylinePreview.select(Date.parse(value)),iso);
    await select('2018-10-28T00:59:59.999Z');
    ok(assert.deepEqual([await shown(),await p.locator('#next-change').innerText()],
     [venue.earlier,'Розрахована зміна умов · '+venue.next],venue.city+' before the repeated hour'));
    await p.locator('#personal-sky > summary').click();
    const skyTime=iso=>p.locator('.sky-clock[data-instant="'+Date.parse(iso)+'"]').innerText()
     .then(text=>text.split(' · ')[0]);
    ok(assert.equal(await skyTime('2018-10-28T00:59:59.999Z'),venue.earlier,venue.city+' sky before the repeated hour'));
    await select('2018-10-28T01:59:59.999Z');
    ok(assert.equal(await shown(),venue.later,venue.city+' after the repeated hour'));
    ok(assert.equal(await skyTime('2018-10-28T01:59:59.999Z'),venue.later,venue.city+' sky after the repeated hour'));
    await p.addStyleTag({content:'html,body{font-size:200%!important}'});
    ok(assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,
     venue.city+' gives no horizontal scroll on a 25-hour day at 200%'));
   }
   ok(assert.deepEqual(errs,[]));await c.close();}
 }finally{await b.close();server.close();}
 console.log(JSON.stringify({status:'PASS',checks,scope:'Chromium emulation 320/390; not a device test.'}));
})().catch(e=>{console.error(e);process.exit(1);});
