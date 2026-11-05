'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const context={navigator:{languages:['uk']},localStorage:{getItem(){return null},setItem(){},removeItem(){}},document:{documentElement:{}},CustomEvent:function(){},addEventListener(){},dispatchEvent(){}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../locale_core_v1.js'),'utf8'),context);
const a=context.NRLocale;
a.register([['Прогноз','Forecast','Pronóstico','Prévision'],['Прогноз ','Forecast with trailing space ','Pronóstico con espacio ','Prévision avec espace ']]);
a.set('es');assert.equal(a.text('Прогноз '),'Pronóstico con espacio ');assert.equal(a.text(' Прогноз '),' Pronóstico con espacio ');assert.equal(a.text('Прогноз'),'Pronóstico');
a.set('en');assert.equal(a.text('Прогноз'),'Forecast');a.register([['Новий','New','Nuevo','Nouveau']]);assert.equal(a.text('Новий'),'New');
for(let i=0;i<10000;i++)assert.equal(a.text('ASCII '+i),'ASCII '+i);
console.log('PASS locale: whitespace-specific keys, language and registration invalidation, unchanged strings');

// Real DOM regression for observer feedback and dynamically updated accessibility labels.
(async()=>{
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{
  const page=await browser.newPage({locale:'en-GB'});
  await page.setContent('<!doctype html><section class="nr-route" id="probe"></section>');
  await page.addScriptTag({path:path.join(__dirname,'../../locale_core_v1.js')});
  await page.evaluate(()=>NRLocale.register([['Прогноз','Forecast','Pronóstico','Prévision'],['Календар','Calendar','Calendario','Calendrier']]));
  await page.addScriptTag({path:path.join(__dirname,'../../locale_bridge_v1.js')});
  const result=await page.evaluate(async()=>{
   const root=document.getElementById('probe'),tick=()=>new Promise(r=>setTimeout(r,0));
   root.innerHTML='<span>Прогноз</span><button title="Прогноз" aria-label="Прогноз">Прогноз</button><textarea translate="no">Прогноз</textarea>';await tick();
   const span=root.querySelector('span'),button=root.querySelector('button');
   const added=span.textContent,attribute=button.title,user=root.querySelector('textarea').value;
   span.firstChild.nodeValue='Календар';button.title='Календар';await tick();
   const changed=span.textContent,changedAttribute=button.title;
   NRLocale.set('uk');await tick();const reverted=span.textContent;NRLocale.set('en');await tick();const restored=span.textContent;
   let walks=0;const original=document.createTreeWalker.bind(document);document.createTreeWalker=(node,...args)=>{walks++;return original(node,...args)};
   for(let i=0;i<100;i++){root.classList.toggle('animation');root.setAttribute('aria-hidden',String(i%2===0));}await tick();
   const visualWalks=walks;document.createTreeWalker=original;
   root.innerHTML='<div class="nr-legacy-details">'+('<span>Прогноз</span>'.repeat(5000))+'</div><span id="visibleTranslation">Календар</span><div translate="no"><span>Прогноз</span></div>';await tick();
   let visited=0;document.createTreeWalker=(...args)=>{const w=original(...args),next=w.nextNode.bind(w);w.nextNode=()=>{const n=next();if(n)visited++;return n;};return w;};
   NRLocaleOverviewRefresh();document.createTreeWalker=original;
   const protectedText=root.querySelector('.nr-legacy-details').textContent,visible=root.querySelector('#visibleTranslation').textContent;
   return {added,attribute,user,changed,changedAttribute,reverted,restored,visualWalks,visited,protectedText,visible};
  });
  const {visited,protectedText,visible,...basic}=result;
  assert.deepEqual(basic,{added:'Forecast',attribute:'Forecast',user:'Прогноз',changed:'Calendar',changedAttribute:'Calendar',reverted:'Календар',restored:'Calendar',visualWalks:0});
  assert(visited<10,'Excluded legacy subtree must not yield 5000 text nodes: '+visited);
  assert.equal(protectedText,'Прогноз'.repeat(5000));assert.equal(visible,'Calendar');
  console.log('PASS excluded legacy subtree: '+visited+' yielded nodes, 5000 protected texts unchanged');
  console.log('PASS locale DOM: content + accessible labels, protected notes, language roundtrip, no walks for 100 visual mutations');
  for(const prefix of ['','preview-v4/','preview-b17/']){
   const probe=await browser.newPage({locale:'en-GB'});
   await probe.setContent('<!doctype html><main></main><textarea id="draft">Моя нотатка</textarea>');
   for(const file of ['locale_core_v1.js',prefix+'locale_overview_v1.js',prefix+'locale_bridge_v1.js'])await probe.addScriptTag({path:path.join(__dirname,'../..',file)});
   await probe.evaluate(()=>{const node=document.createElement('div');node.id='nrRuntimeState';node.innerHTML='<strong>◷ ЗАСТАРІЛІ ДАНІ</strong><span>Частина джерел повернула кешовані дані. Доступність поточного рішення визначається його джерелами та строком чинності.</span>';document.body.append(node);const bar=document.createElement('div');bar.id='swStaleBar';bar.textContent="⚠ Дані з кешу (2 хв тому) — перевірте з'єднання";document.body.append(bar)});
   for(const [lang,header] of [['en','OUTDATED DATA'],['es','DATOS DESACTUALIZADOS'],['fr','DONNÉES PÉRIMÉES'],['uk','ЗАСТАРІЛІ ДАНІ'],['en','OUTDATED DATA']]){
    await probe.evaluate(lang=>NRLocale.set(lang),lang);
    await probe.waitForFunction(header=>document.querySelector('#nrRuntimeState strong').textContent.includes(header),header);
    if(lang!=='uk')assert(!/[А-Яа-яІіЇїЄєҐґ]/u.test(await probe.locator('#nrRuntimeState').innerText()+await probe.locator('#swStaleBar').innerText()));
    assert.equal(await probe.locator('#draft').inputValue(),'Моя нотатка');
   }
   await probe.evaluate(()=>document.querySelector('#swStaleBar').textContent="⚠ Дані з кешу (вік невідомий) — перевірте з'єднання");
   await probe.waitForFunction(()=>document.querySelector('#swStaleBar').textContent.includes('age unknown'));
   await probe.close();
  }
  console.log('PASS offline state localization: 3 entry dictionaries/bridges, 4 languages, dynamic age, language roundtrip, user draft untouched');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
