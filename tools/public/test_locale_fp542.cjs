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
   const entry=prefix==='preview-b17/'?'design-b17.html':prefix?'index.html':'classic.html';
   const entrySource=fs.readFileSync(path.join(__dirname,'../..',entry),'utf8').replace(/\r\n/g,'\n');
   const updateBar=entrySource.match(/<div id="pwaUpdateBar"[^>]*>[\s\S]*?<\/div>/)[0];
   const updateStart=entrySource.indexOf('function pwaReload() {');
   const updateCode=entrySource.slice(updateStart,entrySource.indexOf('\n}',updateStart)+2);
   await probe.evaluate(markup=>document.body.insertAdjacentHTML('beforeend',markup),updateBar);
   await probe.addScriptTag({content:"var _swReg={waiting:{postMessage(){}}};"+updateCode});
   await probe.setViewportSize({width:320,height:741});
   await probe.addStyleTag({content:'body{font-family:system-ui} :is(#pwaInstallBar,#pwaUpdateBar){display:flex!important} :is(#pwaInstallBar,#pwaUpdateBar), :is(#pwaInstallBar,#pwaUpdateBar) button{font:inherit;font-size:26px!important}'});
   const assertBannerFits=async(id,label)=>{
    const overflow=await probe.locator(id).evaluate(bar=>[bar,...bar.children].flatMap(node=>{
     const bounds=node.getBoundingClientRect();
     return bounds.left>=-.5&&bounds.right<=innerWidth+.5&&node.scrollWidth<=node.clientWidth+1
      ? [] : [{element:node.tagName,right:bounds.right,overflow:node.scrollWidth-node.clientWidth}];
    }));
    assert.deepEqual(overflow,[],entry+' '+label+' fits at 320px with doubled text');
   };
   const status=probe.locator('#pwaUpdateBar span');
   const updateButton=probe.locator('#pwaUpdateBar button');
   const brand=entry==='design-b17.html'?'NeboRhythm':'SkyRhythm';
   const updateCopy=[
    ['uk','Доступне оновлення '+brand,'Оновити застосунок','Застосовую оновлення SkyRhythm…','Оновлення ще не активовано. Можна спробувати ще раз.'],
    ['en','Update available for '+brand,'Update app','Updating SkyRhythm…','The update is not active yet. You can try again.'],
    ['es','Actualización de '+brand+' disponible','Actualizar la aplicación','Actualizando SkyRhythm…','La actualización aún no está activa. Puedes reintentarlo.'],
    ['fr','Mise à jour de '+brand+' disponible','Mettre à jour l’application','Mise à jour de SkyRhythm…','La mise à jour n’est pas encore active. Vous pouvez réessayer.'],
   ];
   for(const [lang,ready,action] of updateCopy){
    await probe.evaluate(lang=>NRLocale.set(lang),lang);
    assert.equal(await status.textContent(),'🔄 '+ready,entry+' ready in '+lang);
    assert.equal(await updateButton.textContent(),action,entry+' action in '+lang);
    await assertBannerFits('#pwaUpdateBar','update ready in '+lang);
   }
   assert.equal(await status.getAttribute('role'),'status',entry+' update announcements');
   const installBar=entrySource.match(/<div id="pwaInstallBar"[^>]*>[\s\S]*?<\/div>/)[0];
   const installStart=entrySource.indexOf('function pwaInstallOrHelp() {');
   const installCode=entrySource.slice(installStart,entrySource.indexOf('\n}',installStart)+2);
   await probe.evaluate(markup=>document.body.insertAdjacentHTML('beforeend',markup),installBar);
   await probe.addScriptTag({content:"var _deferredInstall=null;"+installCode});
   const installCopy=[
    ['uk','Встановити','Закрити пропозицію встановлення','початковий екран','уже відкритий','меню браузера'],
    ['en','Install','Dismiss install prompt','Home Screen','already open','browser menu'],
    ['es','Instalar','Cerrar el aviso de instalación','pantalla de inicio','ya está abierto','menú del navegador'],
    ['fr','Installer','Fermer l’invite d’installation','écran d’accueil','est déjà ouverte','menu du navigateur'],
   ];
   for(const [lang,action,dismiss,iosText,standaloneText,browserText] of installCopy){
    await probe.evaluate(lang=>NRLocale.set(lang),lang);
    assert.equal(await probe.locator('#pwaInstallBar strong').textContent(),action+' '+brand,entry+' install heading in '+lang);
    assert.equal(await probe.locator('#pwaInstallBar button').first().textContent(),action,entry+' install action in '+lang);
    assert.equal(await probe.locator('#pwaInstallBar button').last().getAttribute('aria-label'),dismiss,entry+' install dismissal in '+lang);
    await assertBannerFits('#pwaInstallBar','install in '+lang);
    for(const [mode,fragment] of [['ios',iosText],['standalone',standaloneText],['browser',browserText]]){
     const help=await probe.evaluate(mode=>{
      let message='';
      const before={matchMedia:window.matchMedia,alert:window.alert,agent:Object.getOwnPropertyDescriptor(navigator,'userAgent')};
      try {
       Object.defineProperty(navigator,'userAgent',{configurable:true,value:mode==='ios'?'iPhone':'Browser'});
       window.matchMedia=()=>({matches:mode==='standalone'});
       window.alert=text=>{message=text};
       pwaInstallOrHelp();
       return message;
      } finally {
       window.matchMedia=before.matchMedia;
       window.alert=before.alert;
       if(before.agent)Object.defineProperty(navigator,'userAgent',before.agent);
       else delete navigator.userAgent;
      }
     },mode);
     assert(help.includes(fragment),entry+' '+mode+' installation help in '+lang);
     if(lang!=='uk')assert(!/[А-Яа-яІіЇїЄєҐґ]/u.test(help),entry+' '+mode+' help contains Ukrainian in '+lang);
    }
   }
   await probe.clock.install();
   await probe.evaluate(()=>pwaReload());
   for(const [lang,,,applying] of updateCopy){
    await probe.evaluate(lang=>NRLocale.set(lang),lang);
    assert.equal(await status.textContent(),'🔄 '+applying,entry+' applying in '+lang);
    assert(await updateButton.isDisabled(),entry+' awaiting activation');
    await assertBannerFits('#pwaUpdateBar','updating in '+lang);
   }
   await probe.clock.fastForward(4000);
   for(const [lang,,,,retry] of updateCopy){
    await probe.evaluate(lang=>NRLocale.set(lang),lang);
    assert.equal(await status.textContent(),retry,entry+' retry in '+lang);
    assert(await updateButton.isEnabled(),entry+' retry available');
    await assertBannerFits('#pwaUpdateBar','update retry in '+lang);
   }
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
  console.log('PASS app prompts: 3 entry pages, 4 languages, update and install help, 320px at 200% text');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
