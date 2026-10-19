(function(root){'use strict';
const names={uk:['Екадаші · смарта','Екадаші · вайшнавська','Прадош','Масік Шіваратрі','Санкаштхі','Вінаяка Чатурті','Пурніма на світанку','Амавасья'],en:['Ekadashi · Smarta','Ekadashi · Vaishnava','Pradosh','Masik Shivaratri','Sankashti','Vinayaka Chaturthi','Purnima at sunrise','Amavasya'],es:['Ekadashi · Smarta','Ekadashi · Vaishnava','Pradosh','Masik Shivaratri','Sankashti','Vinayaka Chaturthi','Purnima al amanecer','Amavasya'],fr:['Ekadashi · Smarta','Ekadashi · Vaishnava','Pradosh','Masik Shivaratri','Sankashti','Vinayaka Chaturthi','Purnima au lever du soleil','Amavasya']};
const keys=['ekadashi_smarta','ekadashi_vaishnava','pradosh','masik_shivaratri','sankashti','vinayaka_chaturthi','purnima_sunrise','amavasya_aparahna'];
const words={uk:['Календарні події · Київ','Дослідницький розрахунок для Києва (Europe/Kyiv), не затверджений календар свят. Не перераховано для вашого місця; бал прогнозу не змінюється.','На цю дату подій за підтриманими правилами немає.','Вибір дати не вирішено','Даних за цей рік немає.'],en:['Calendar events · Kyiv','Research calculation for Kyiv (Europe/Kyiv), not an approved observance calendar. Not recalculated for your location; no effect on the forecast score.','No events under the supported rules on this date.','Date selection unresolved','No data for this year.'],es:['Eventos del calendario · Kyiv','Cálculo de investigación para Kyiv (Europe/Kyiv), no un calendario de festividades aprobado. No se recalcula para tu ubicación ni cambia la puntuación.','No hay eventos según las reglas disponibles en esta fecha.','Selección de fecha sin resolver','No hay datos para este año.'],fr:['Événements du calendrier · Kyiv','Calcul de recherche pour Kyiv (Europe/Kyiv), pas un calendrier de fêtes approuvé. Non recalculé pour votre lieu ; aucun effet sur le score.','Aucun événement selon les règles disponibles à cette date.','Choix de date non résolu','Aucune donnée pour cette année.']};

const sourceWords={
 uk:['Події за календарем Drik · Київ','Перевірено за опублікованими датами Drik Panchang для Києва. Назви варіантів обряду збережено мовою джерела. Це не перерахунок для вашого місця; на бал моделі не впливає.','У семи перевірених переліках немає подій на цю дату.','Старий підпис Excel виправлено за PDF Таніти. Позначки джерела: ','Цієї святкової позначки немає в оригіналі Таніти.','Стару дату Excel спростовано календарем Drik для Києва та даними IMD.','Джерело'],
 en:['Drik calendar events · Kyiv','Checked against published Drik Panchang dates for Kyiv. Observance variants retain their original source names. Not recalculated for your location; no effect on the model score.','No events in the seven checked lists on this date.','Old Excel label corrected against the Tanita PDF. Source labels: ','This observance label is absent from the Tanita original.','The old Excel date is contradicted by Drik for Kyiv and IMD data.','Source'],
 es:['Eventos del calendario Drik · Kyiv','Verificados con las fechas publicadas de Drik Panchang para Kyiv. Se conservan los nombres originales de las variantes rituales. No se recalculan para tu ubicación ni cambian la puntuación.','No hay eventos en las siete listas verificadas para esta fecha.','Etiqueta antigua de Excel corregida con el PDF de Tanita. Etiquetas de la fuente: ','Esta etiqueta festiva no aparece en el original de Tanita.','La fecha antigua de Excel contradice Drik para Kyiv y los datos de IMD.','Fuente'],
 fr:['Événements du calendrier Drik · Kyiv','Vérifiés avec les dates publiées par Drik Panchang pour Kyiv. Les variantes rituelles gardent leur nom original. Aucun recalcul pour votre lieu ni effet sur le score.','Aucun événement dans les sept listes vérifiées à cette date.','Ancien libellé Excel corrigé avec le PDF de Tanita. Libellés de la source : ','Ce libellé de fête est absent de l’original de Tanita.','L’ancienne date Excel contredit Drik pour Kyiv et les données IMD.','Source']};
const sourceTitles={pradosh:'Pradoṣa',lunar_eclipse:'Lunar eclipse',amavasya:'Amāvāsyā',navaratri:'Navarātri',vijaya_dashami:'Vijayadaśamī',dipavali:'Dīpāvalī'};
// The source calendar is authoritative only within its explicit published scope.
root.SRCalendarAuthority={resolve(date,zone='Europe/Kyiv'){
 const data=root.SRVerifiedCalendarSources;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return {status:'invalid_date',events:[]};
 if(zone!=='Europe/Kyiv')return {status:'unsupported_location',events:[]};
 // v121 (from v120 Hardening): a malformed registry is rejected as a whole.
 const valid=!!data&&Array.isArray(data.years)&&Array.isArray(data.records)&&Array.isArray(data.corrections)&&Array.isArray(data.categories);
 if(!valid)return {status:'missing',events:[]};
 const corrections=data.corrections.filter(r=>r&&r.date===date);
 // v121: corrections outside the covered years (Dec 2024, rejected by Drik/IMD) stay visible; no events are invented.
 if(!data.years.includes(Number(date.slice(0,4))))return {status:'missing',events:[],corrections};
 return {status:'source_verified',scope:data.scope,events:data.records.filter(r=>r&&r.date===date),coveredCategories:[...data.categories],corrections,affectsScore:false};
}};
// v120: every research key whose category is in the verified Drik scope is covered (all 7 categories,
// not only 3): otherwise e.g. 2027-02-01 showed a computed Smarta Ekadashi next to Drik's 2027-02-02.
const baseCategory=k=>k.replace(/_(smarta|vaishnava|sunrise|aparahna)$/,'');
const selectedWords={uk:'Для Києва в цьому році всі сім категорій (Екадаші, Прадош, Масік Шіваратрі, Санкаштхі, Вінаяка, Пурніма, Амавасья) показуємо лише за перевіреними датами Drik у панелі вище. Розрахункові варіанти не є другим календарем.',en:'For Kyiv in this year all seven categories (Ekadashi, Pradosh, Masik Shivaratri, Sankashti, Vinayaka, Purnima, Amavasya) are shown only from the verified Drik dates in the panel above. Computed candidates are not a second calendar.',es:'Para Kyiv en este año, las siete categorías (Ekadashi, Pradosh, Masik Shivaratri, Sankashti, Vinayaka, Purnima, Amavasya) se muestran solo con las fechas verificadas de Drik del panel de arriba. Las alternativas calculadas no son un segundo calendario.',fr:'Pour Kyiv cette année, les sept catégories (Ekadashi, Pradosh, Masik Shivaratri, Sankashti, Vinayaka, Purnima, Amavasya) ne sont affichées que d’après les dates Drik vérifiées du panneau ci-dessus. Les variantes calculées ne constituent pas un second calendrier.'};
const unsafeWords={uk:'джерельне посилання недоступне',en:'source link unavailable',es:'enlace de la fuente no disponible',fr:'lien source indisponible'};
function renderSourceCalendar(host,date,lang){
 const data=root.SRVerifiedCalendarSources;if(!data)return;
 const resolved=root.SRCalendarAuthority.resolve(date);if(resolved.status==='invalid_date'||resolved.status==='unsupported_location')return;
 const events=resolved.events,corrections=resolved.corrections||[];
 if(resolved.status!=='source_verified'&&!corrections.length)return;
 const w=sourceWords[lang]||sourceWords.uk,panel=document.createElement('details');panel.className='sr-source-calendar';panel.dataset.state=events.length?'source-verified':corrections.length?'corrected':'none';panel.open=!!(events.length||corrections.length);
 const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;panel.append(e);return e;};
 add('summary',w[0]).style.minHeight='44px';add('p',w[1]);
 for(const r of events){const a=add('a',r.source_label+' ↗');const url=typeof r.source_url==='string'?r.source_url:'';
  // v121 (from v120 Hardening): only a well-formed https URL becomes a link; otherwise inactive text.
  if(!/^https:\/\/[^\s\\/?#]+(?::[0-9]+)?(?:[/?#][^\s\\]*)?$/i.test(url)){a.removeAttribute('href');a.removeAttribute('target');a.textContent=r.source_label+' · '+(unsafeWords[lang]||unsafeWords.uk);}else{a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
  a.lang='en';a.style.display='block';a.style.minHeight='44px';a.style.overflowWrap='anywhere';}
 for(const r of corrections){add('p',r.source==='tanita_primary_pdf'?(r.source_events.length?w[3]+r.source_events.map(k=>sourceTitles[k]||k).join(', '):w[4]):w[5]);}
 if(!events.length&&!corrections.length)add('p',w[2]);host.append(panel);
}

root.SRResearchObservances={renderSources:renderSourceCalendar,render(host,date,lang){
 renderSourceCalendar(host,date,lang);
 lang=words[lang]?lang:'uk';const w=words[lang],data=root.SRResearchObservancesData?.years?.[date.slice(0,4)];
 const panel=document.createElement('details');panel.className='sr-research-observances';panel.setAttribute('translate','no');
 const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;panel.append(e);return e;};
 add('summary',w[0]).style.minHeight='44px';add('p',w[1]);
 if(!data){panel.dataset.state='missing';add('p',w[4]);host.append(panel);return;}
 const selected=root.SRCalendarAuthority.resolve(date),covered=selected.status==='source_verified'?new Set(keys.filter(k=>(selected.coveredCategories||[]).includes(baseCategory(k)))):new Set();
 const conflicts=data.conflicts.filter(c=>c.dates.includes(date)&&!covered.has(c.event)&&!covered.has(baseCategory(c.event))),events=keys.filter(k=>!covered.has(k)&&(data.events[k]||[]).includes(date)&&!conflicts.some(c=>c.event===k));
 if(covered.size)add('p',selectedWords[lang]);
 panel.dataset.state=conflicts.length?'conflicting':events.length?'research':'none';
 for(const k of events)add('p',names[lang][keys.indexOf(k)]);
 for(const c of conflicts)add('p',names[lang][keys.indexOf(c.event)]+' · '+w[3]+': '+c.dates.join(' / '));
 if(!events.length&&!conflicts.length)add('p',covered.size?({uk:'Інших дослідницьких подій на цю дату немає.',en:'No other research events on this date.',es:'No hay otros eventos de investigación en esta fecha.',fr:'Aucun autre événement de recherche à cette date.'})[lang]:w[2]);host.append(panel);
}};

root.SRMountSourceCalendar=function(){
 let box;
 function mount(){const route=document.getElementById('nrRoute-panch');if(!route||box)return !!box;
  box=document.createElement('section');box.className='nr-panch-section';box.id='srSourceCalendarLegacy';
  const label=document.createElement('label'),input=document.createElement('input'),content=document.createElement('div');input.type='date';input.style.minHeight='44px';input.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  label.append(input);box.append(label,content);route.append(box);
  function render(){const lang=root.NRLocale?.language||'uk';input.setAttribute('aria-label',({uk:'Дата календаря · Київ',en:'Calendar date · Kyiv',es:'Fecha del calendario · Kyiv',fr:'Date du calendrier · Kyiv'})[lang]||'Calendar date · Kyiv');content.replaceChildren();renderSourceCalendar(content,input.value,lang);if(!content.children.length)content.textContent=(words[lang]||words.uk)[4];}
  input.addEventListener('input',render);root.addEventListener('nr:locale',render);render();return true;}
 function start(){if(mount())return;const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
};

})(window);
