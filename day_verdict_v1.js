/* SkyRhythm · вердикт дня першим рядком: «що підходить / чого уникати / чому».
   Лише збирає вже наявні дані: підсумковий бал (resolveFinal через fp469ConsumerForDate), календарні позначки
   джерела (factors), застереження експерта (показане на сторінці), Kp NOAA, найсильнішу подію неба (sky.json).
   Нічого не вигадує й не змінює бал. Немає даних → про це сказано прямо. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const T={
 tone_pos:['Сприятливий день.','A favourable day.','Un día favorable.','Une journée favorable.'],
 tone_zero:['Рівний день.','A steady day.','Un día estable.','Une journée stable.'],
 tone_neg:['Напружений день.','A tense day.','Un día tenso.','Une journée tendue.'],
 tone_none:['Оцінки на цей день немає.','No score for this day.','No hay puntuación para este día.','Pas de score pour ce jour.'],
 good:['Підходить:','Good for:','Adecuado para:','Propice à :'],
 avoid:['Краще відкласти:','Better to postpone:','Mejor posponer:','Mieux vaut reporter :'],
 check:['Уважно:','Take care:','Con atención:','Attention :'],
 why:['Чому так','Why','Por qué','Pourquoi'],
 newStarts:['нові починання','new beginnings','nuevos comienzos','nouveaux commencements'],
 recheck:['перевіряйте деталі — можлива повторна робота','check details — rework is possible','revise los detalles: puede haber que rehacer','vérifiez les détails — reprise possible'],
 score_exp:['Оцінка експерта','Expert score','Puntuación experta','Score de l’expert'],
 score_formula:['Оцінка за формулою','Formula score','Puntuación por fórmula','Score par formule'],
 calendar:['Календар джерела','Source calendar','Calendario de la fuente','Calendrier de la source'],
 calendar_none:['окремих позначок немає','no specific marks','sin marcas específicas','pas de marques particulières'],
 kp:['Космопогода NOAA','NOAA space weather','Clima espacial NOAA','Météo spatiale NOAA'],
 kp_quiet:['спокійно','quiet','tranquilo','calme'],kp_active:['збурено','unsettled','agitado','agité'],kp_storm:['буря','storm','tormenta','tempête'],
 kp_none:['даних немає','no data','sin datos','pas de données'],
 sky:['Небо','Sky','Cielo','Ciel'],sky_note:['традиція, не перевірено','tradition, not validated','tradición, no validado','tradition, non validé'],
 match:['Сьогодні збіглось?','Did today match?','¿Coincidió hoy?','Ça a correspondu aujourd’hui ?'],
 m_yes:['Так','Yes','Sí','Oui'],m_partial:['Частково','Partly','En parte','En partie'],m_no:['Ні','No','No','Non'],
 m_saved:['Записано','Saved','Guardado','Enregistré'],
 evening:['Як пройшов день? Записати результат →','How did the day go? Record it →','¿Cómo fue el día? Registrarlo →','Comment s’est passée la journée ? L’enregistrer →'],
 storm_check:['геомагнітна буря за прогнозом NOAA','geomagnetic storm in the NOAA forecast','tormenta geomagnética en el pronóstico de NOAA','tempête géomagnétique prévue par la NOAA']
};
const t=k=>T[k][ix()];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=s=>window.NRLocale?.text?window.NRLocale.text(s):s;
// Calendar marks of the source → practical topics (same mapping as the Today topics line).
const GOOD=[['Книги','Навчання й нові знання'],['сприятливий для подорожей','Подорожі'],['1 місячний день','Планування й постановка цілей'],['Мішень','Планування й постановка цілей'],['сприятливий для стрижки','Стрижка й особистий догляд'],['Сукня','Новий одяг'],['Гучномовець','Реклама й комунікація']];
let sky=null,skyTried=false;
function root(){return document.querySelector('#nrRoute-today [data-overview="today"]')}
function selected(r){return r?.querySelector('select')?.value||(()=>{try{return NRCivilTime.dayKey(Date.now(),'Europe/Kyiv')}catch{return new Date().toISOString().slice(0,10)}})()}
function build(r,ds){
 const res=window.fp469ConsumerForDate?.({ds})||{},c=res.consumer||{},row=res.feed||null,ch=row?.channels?.source_formula||{};
 const factors=(Array.isArray(ch.factors)?ch.factors:[]).filter(x=>typeof x.value==='number'&&Number.isFinite(x.value));
 const names=new Set(factors.map(x=>x.factor));
 const tone=!c.available?'tone_none':c.score>0?'tone_pos':c.score<0?'tone_neg':'tone_zero';
 const good=[...new Set(GOOD.filter(([n])=>names.has(n)).map(([,label])=>tr(label)))];
 const avoid=[],care=[];
 if(names.has('День порожні руки, несприятливий'))avoid.push(t('newStarts'));
 const caution=r.querySelector('.sr-expert-caution summary strong')?.textContent?.trim();if(caution)avoid.push(caution);
 if(names.has('Тричі  трикутник'))care.push(t('recheck'));
 const kp=Number.isFinite(ch.kp_daily_max)?ch.kp_daily_max:null;if(kp!=null&&kp>=5)care.push(t('storm_check')+' G'+Math.min(5,Math.floor(kp)-4));
 // why
 const why=[];
 if(c.available){const ex=c.authority==='expert_pdf';why.push([ex?t('score_exp'):t('score_formula'),(c.score>0?'+':c.score<0?'−':'')+Math.abs(c.score)])}
 why.push([t('calendar'),good.length?good.join(', '):avoid.includes(t('newStarts'))?t('avoid').replace(/:$/,'').toLowerCase()+': '+t('newStarts'):t('calendar_none')]);
 why.push([t('kp'),kp==null?t('kp_none'):'Kp '+kp.toFixed(1).replace('.',L()==='en'?'.':',')+' · '+(kp>=5?t('kp_storm'):kp>=4?t('kp_active'):t('kp_quiet'))]);
 const ev=sky?[...sky.intervals,...sky.events].filter(x=>x.reading&&x.reading.intensity>=3&&(x.start||x.at).kyiv_date<=ds&&ds<=(x.end||x.at).kyiv_date)[0]:null;
 if(ev)why.push([t('sky'),(ev.reading.text[L()]||ev.reading.text.en).replace(/:.*$/,'')+' ('+t('sky_note')+')']);
 return {tone,good,avoid,care,why};
}
function render(){
 const r=root();if(!r)return;const hero=r.querySelector('.nr-o-hero'),verdict=hero?.querySelector('.nr-o-verdict');if(!hero||!verdict)return;
 // Other modules may move unknown blocks out of a rebuilt hero (p0_layout → details): drop stale copies.
 for(const x of r.querySelectorAll('[data-day-verdict],[data-day-why]'))if(!hero.contains(x))x.remove();
 let box=hero.querySelector('[data-day-verdict]');
 if(!box){box=document.createElement('div');box.className='nr-day-verdict';box.dataset.dayVerdict='';box.setAttribute('translate','no');box.setAttribute('aria-live','polite')}
 if(box.nextElementSibling!==verdict)verdict.before(box);
 const ds=selected(r),v=build(r,ds);
 let today='';try{today=NRCivilTime.dayKey(Date.now(),'Europe/Kyiv')}catch{}
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 const evening=ds===today&&hour>=18&&r.querySelector('.nr-o-journey button:last-of-type');
 const line=(k,xs)=>xs.length?`<p class="nr-dv-${k}"><b>${esc(t(k))}</b> ${esc(xs.join(' · '))}</p>`:'';
 box.innerHTML=`<p class="nr-dv-tone">${esc(t(v.tone))}</p>${line('good',v.good)}${line('avoid',v.avoid)}${line('check',v.care)}`;
 let whyBox=hero.querySelector('[data-day-why]');
 if(!whyBox){whyBox=document.createElement('details');whyBox.className='nr-day-why';whyBox.dataset.dayWhy='';whyBox.setAttribute('translate','no')}
 if(verdict.nextElementSibling!==whyBox)verdict.after(whyBox);
 // Keep optional personal tools below the public DayLine and weather.
 let youBox=r.querySelector(':scope > [data-day-you]');
 if(!youBox){
  youBox=document.createElement('div');youBox.className='nr-day-you';youBox.dataset.dayYou='';youBox.dataset.placement='after-hero';youBox.setAttribute('translate','no');
  const details=r.querySelector(':scope > [data-p0-details]');
  if(details)details.before(youBox);else r.append(youBox);
 }
 const youHtml=(window.NRNatalSky?window.NRNatalSky.html(ds,sky):'')+(ds===today&&hour>=18?matchHtml(ds):'')+(evening?`<button type="button" class="nr-dv-evening">${esc(t('evening'))}</button>`:'');
 if(youBox.dataset.html!==youHtml){const formOpen=youBox.querySelector('.nr-dv-you-form')?.open;youBox.innerHTML=youHtml;youBox.dataset.html=youHtml;if(formOpen)youBox.querySelector('.nr-dv-you-form')&&(youBox.querySelector('.nr-dv-you-form').open=true)}
 youBox.hidden=!youHtml;
 const open=whyBox.open;whyBox.innerHTML=`<summary>${esc(t('why'))}</summary><ul>${v.why.map(([k,val])=>`<li><span>${esc(k)}</span><strong>${esc(val)}</strong></li>`).join('')}</ul>`;whyBox.open=open;
}
// «Сьогодні збіглось?» — лише ввечері (з 18:00) для сьогоднішнього дня, один дотик, лише на цьому пристрої.
// Зберігає відповідь разом із балом, показаним на момент відповіді, — для майбутньої перевірки; на бал не впливає.
const MATCH_KEY='nrDayMatch_v1',MATCH_VALUES=['yes','partial','no'];
function matchAll(){try{const raw=window.NRStorage?window.NRStorage.get(MATCH_KEY,'{}'):localStorage.getItem(MATCH_KEY);const d=JSON.parse(raw||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{}}catch{return {}}}
function matchSave(ds,v){if(!MATCH_VALUES.includes(v)||!/^\d{4}-\d{2}-\d{2}$/.test(ds))return;const all=matchAll();let score=null,authority=null;
 try{const c=window.fp469ConsumerForDate({ds}).consumer;if(Number.isFinite(c?.score)){score=c.score;authority=c.authority||null}}catch{}
 all[ds]={v,at:new Date().toISOString(),score,authority};const raw=JSON.stringify(all);
 try{window.NRStorage?window.NRStorage.set(MATCH_KEY,raw):localStorage.setItem(MATCH_KEY,raw)}catch{}
 window.dispatchEvent(new CustomEvent('nr:day-match',{detail:{ds,...all[ds]}}))}
function matchHtml(ds){const got=matchAll()[ds];
 if(got&&MATCH_VALUES.includes(got.v))return `<p class="nr-dv-match is-saved" data-day-match>✓ ${esc(t('m_saved'))}: ${esc(t('m_'+got.v))}</p>`;
 return `<div class="nr-dv-match" data-day-match role="group" aria-label="${esc(t('match'))}"><span>${esc(t('match'))}</span>${MATCH_VALUES.map(v=>`<button type="button" data-match="${v}">${esc(t('m_'+v))}</button>`).join('')}</div>`}
let scheduled=false;const soon=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})};
async function loadSky(){if(skyTried)return;skyTried=true;try{const r=await fetch('consumer_cloud/sky.json',{cache:'no-cache'});if(r.ok){const d=await r.json();if(d?.schema==='sky_transits_v1')sky=d}}catch{}soon()}
let watched=null;
function watch(){const r=root();if(!r){setTimeout(watch,250);return}if(watched===r)return;watched=r;
 new MutationObserver(()=>{const h=r.querySelector('.nr-o-hero');if(!h?.querySelector('[data-day-verdict]')||!h.querySelector('[data-day-why]')||!r.querySelector(':scope > [data-day-you]'))soon()}).observe(r,{childList:true,subtree:true});
 r.addEventListener('change',e=>{if(e.target.matches('select'))setTimeout(soon,0)});soon()}
window.NRDayVerdict={build:ds=>{const r=root();return r?build(r,ds||selected(r)):null},render,matches:matchAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watch();loadSky()});else{watch();loadSky()}
for(const e of ['sr:consumer-load','nr:locale','gindex:consumer-ready','nr:natal'])window.addEventListener(e,soon);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-day-match] button[data-match]');if(!b)return;const r=root();if(!r)return;
 let today='';try{today=NRCivilTime.dayKey(Date.now(),'Europe/Kyiv')}catch{}if(selected(r)!==today)return;
 matchSave(today,b.dataset.match);soon()});
document.addEventListener('click',e=>{if(!e.target.closest?.('.nr-dv-evening'))return;document.querySelector('#nrRoute-today .nr-o-journey button:last-of-type')?.click()});
})();
