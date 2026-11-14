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
   // 6. Reflow, also at 200 % text
   ok(assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true));
   await p.addStyleTag({content:'html,body{font-size:200%!important}'});await p.waitForTimeout(300);
   ok(assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% text overflow at '+width));
   ok(assert.deepEqual(errs,[]));await c.close();}
 }finally{await b.close();server.close();}
 console.log(JSON.stringify({status:'PASS',checks,scope:'Chromium emulation 320/390; not a device test.'}));
})().catch(e=>{console.error(e);process.exit(1);});
