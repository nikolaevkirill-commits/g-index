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
   return {added,attribute,user,changed,changedAttribute,reverted,restored,visualWalks};
  });
  assert.deepEqual(result,{added:'Forecast',attribute:'Forecast',user:'Прогноз',changed:'Calendar',changedAttribute:'Calendar',reverted:'Календар',restored:'Calendar',visualWalks:0});
  console.log('PASS locale DOM: content + accessible labels, protected notes, language roundtrip, no walks for 100 visual mutations');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
