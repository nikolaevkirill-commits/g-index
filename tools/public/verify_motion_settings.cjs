'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end();}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream'});r.end(e?'':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(),rows=[];
try{for(const entry of ['index.html','classic.html'])for(const locale of ['uk-UA','en-GB','es-ES','fr-FR']){
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',locale,reducedMotion:'no-preference'}),p=await c.newPage(),errors=[];
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());p.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#more';await p.goto(url);
 const bg=p.locator('[data-sky-decor-motion]'),master=p.locator('[data-sky-motion]');await bg.waitFor({state:'visible'});
 assert.equal(await bg.getAttribute('aria-pressed'),'false');
 assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('sr-decor-motion')),false);
 const label=await bg.innerText();assert.equal(label,{'uk-UA':'Фоновий рух','en-GB':'Background motion','es-ES':'Movimiento del fondo','fr-FR':'Mouvement du fond'}[locale]);
 await bg.focus();await p.keyboard.press('Space');assert.equal(await bg.getAttribute('aria-pressed'),'true');
 assert.equal(await p.evaluate(()=>localStorage.getItem('srSkyDecorMotionV1')),'on');
 await p.reload();await bg.waitFor({state:'visible'});assert.equal(await bg.getAttribute('aria-pressed'),'true');
 await master.click();assert.equal(await bg.isDisabled(),true);assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('sr-decor-motion')),false);
 await p.reload();await bg.waitFor({state:'visible'});assert.equal(await master.getAttribute('aria-pressed'),'false');
 await master.click();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('[data-sky-motion]')?.disabled===true);assert.equal(await bg.isDisabled(),true);assert.equal(await master.isDisabled(),true);
 assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('sr-decor-motion')||document.documentElement.classList.contains('sr-sky-motion')),false);
 await p.evaluate(()=>location.hash='today');await p.waitForTimeout(500);
 if(!locale.startsWith('uk')){const text=await p.locator('[data-day-context],[data-day-provenance],[data-day-records-tools],[data-motion-settings]').allTextContents();assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(text.join('\n')),locale+' new UI contains untranslated text: '+text.join('\n'));}
 assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&['wowTwinkle','wowDrift','srSkyBreath'].includes(a.animationName)).length),0);
 assert.deepEqual(errors,[]);rows.push({entry,locale,label,persistence:true,masterOff:true,reduced:true});await c.close();
}console.log(JSON.stringify({status:'PASS',scenarios:rows.length,rows}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
