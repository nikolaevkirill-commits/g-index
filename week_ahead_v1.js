/* SkyRhythm · тиждень наперед (FP569).
   1) «Сьогодні»: смуга 7 днів із підсумковим балом кожного дня (як тижнева лінійка UAV Forecast).
   2) «Прогноз»: «Події тижня» — перевірені дати Drik для Києва + фази Місяця (astronomy-engine), як місячний календар AstroMatrix.
   3) «Сьогодні»: явний кінець огляду.
   Нічого не рахує заново: бал — лише fp469ConsumerForDate (resolveFinal); події — SRCalendarAuthority; на бал не впливає. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const T={
 nextLbl:['Найближча підтверджена подія · Київ','Next verified event · Kyiv','Próximo evento verificado · Kyiv','Prochain événement vérifié · Kyiv'],
 todayLbl:['Сьогодні · Київ','Today · Kyiv','Hoy · Kyiv','Aujourd’hui · Kyiv'],
 inDays:[n=>n===1?'завтра':`через ${n} ${n%10===1&&n%100!==11?'день':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'дні':'днів'}`,n=>n===1?'tomorrow':`in ${n} days`,n=>n===1?'mañana':`en ${n} días`,n=>n===1?'demain':`dans ${n} jours`],
 noNext:['Перевірених дат на найближчі 45 днів немає.','No verified dates in the next 45 days.','No hay fechas verificadas en los próximos 45 días.','Aucune date vérifiée dans les 45 prochains jours.'],
 ics:['＋ У календар','＋ To calendar','＋ Al calendario','＋ Au calendrier'],
 icsDone:['Файл календаря передано. Відкрийте його й перевірте подію.','Calendar file handed over. Open it and check the event.','Archivo de calendario entregado. Ábrelo y revisa el evento.','Fichier calendrier transmis. Ouvrez-le et vérifiez l’événement.'],
 icsError:['Не вдалося зберегти файл календаря. Спробуйте ще раз.','Could not save the calendar file. Try again.','No se pudo guardar el calendario. Inténtalo de nuevo.','Le fichier calendrier n’a pas pu être enregistré. Réessayez.'],
 icsNote:['Дата за Drik Panchang для Києва. На бал SkyRhythm не впливає.','Date per Drik Panchang for Kyiv. Does not affect the SkyRhythm score.','Fecha según Drik Panchang para Kyiv. No afecta la puntuación de SkyRhythm.','Date selon Drik Panchang pour Kyiv. Sans effet sur le score SkyRhythm.'],
 week:['Тиждень · оцінки за Києвом','Week · scores by Kyiv date','Semana · puntuaciones por fecha de Kyiv','Semaine · scores selon la date à Kyiv'],
 weekNote:['Підсумковий бал кожного дня; ◆ — подія календаря Drik. Далекі дні — орієнтир.','Final score for each day; ◆ — a Drik calendar event. Later days are an outlook.','Puntuación final de cada día; ◆ — evento del calendario Drik. Los días lejanos son orientativos.','Score final de chaque jour ; ◆ — événement du calendrier Drik. Les jours lointains sont indicatifs.'],
 open:['Прогноз →','Forecast →','Pronóstico →','Prévision →'],
 events:['Події тижня','Events this week','Eventos de la semana','Événements de la semaine'],
 localEventsNote:['Фази Місяця подано за місцевим часом. Для обраного місця дати обрядів не підтверджено.','Moon phases use local time. Observance dates for this location are unverified.','Las fases lunares se muestran en hora local. Las fechas rituales de este lugar no están verificadas.','Les phases lunaires sont en heure locale. Les dates rituelles de ce lieu restent à confirmer.'],
 noMoon:['Цього тижня немає головних фаз Місяця.','No principal Moon phase this week.','No hay fases lunares principales esta semana.','Aucune phase lunaire principale cette semaine.'],
 eventsNote:['Дати обрядів — опубліковані дати Drik Panchang для Києва; фази Місяця — астрономічний розрахунок, час київський. На бал не впливають.','Observance dates are published Drik Panchang dates for Kyiv; Moon phases are an astronomical calculation in Kyiv time. They do not affect the score.','Las fechas rituales son las publicadas por Drik Panchang para Kyiv; las fases lunares son un cálculo astronómico en hora de Kyiv. No afectan la puntuación.','Les dates rituelles sont celles publiées par Drik Panchang pour Kyiv ; les phases de la Lune sont un calcul astronomique, heure de Kyiv. Sans effet sur le score.'],
 evMark:['є подія календаря','calendar event','evento del calendario','événement du calendrier'],
 none:['подій немає','no events','sin eventos','aucun événement'],
 noData:['Перевірених дат на цей період немає.','No verified dates for this period.','No hay fechas verificadas para este período.','Aucune date vérifiée pour cette période.'],
 today:['сьогодні','today','hoy','aujourd’hui'],
 end:['Це весь огляд дня.','That is the whole day overview.','Este es todo el resumen del día.','C’est tout l’aperçu du jour.'],
 top:['↑ На початок','↑ Back to top','↑ Volver arriba','↑ Haut de page'],
 gTitle:['Шкала геомагнітних бур NOAA','NOAA geomagnetic storm scale','Escala de tormentas geomagnéticas NOAA','Échelle des tempêtes géomagnétiques NOAA'],
 gNone:['зараз немає даних','no current data','sin datos actuales','pas de données actuelles'],
 gNow:['зараз','now','ahora','maintenant'],
 gWords:[['спокійно','буря'],['quiet','storm'],['calma','tormenta'],['calme','tempête']],
 q:[['Молодик','Перша чверть','Повня','Остання чверть'],['New Moon','First quarter','Full Moon','Last quarter'],['Luna nueva','Cuarto creciente','Luna llena','Cuarto menguante'],['Nouvelle lune','Premier quartier','Pleine lune','Dernier quartier']]
};
const CAT={uk:{amavasya:'Амавасья',purnima:'Пурніма',ekadashi:'Екадаші',pradosh:'Прадош',sankashti:'Санкаштхі',vinayaka_chaturthi:'Вінаяка Чатурті',masik_shivaratri:'Масік Шіваратрі'},
 en:{amavasya:'Amavasya',purnima:'Purnima',ekadashi:'Ekadashi',pradosh:'Pradosh',sankashti:'Sankashti',vinayaka_chaturthi:'Vinayaka Chaturthi',masik_shivaratri:'Masik Shivaratri'}};
const t=k=>T[k][ix()];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ZONE='Europe/Kyiv',DAYS=7;
const loc=()=>({uk:'uk-UA',en:'en-GB',es:'es-ES',fr:'fr-FR'}[L()]);
function todayKey(zone=ZONE){try{return NRCivilTime.dayKey(Date.now(),zone)}catch{return new Date().toISOString().slice(0,10)}}
function addDays(ds,n){const d=new Date(ds+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dateOf(ds){return new Date(ds+'T12:00:00Z')}
function score(ds){const c=window.fp469ConsumerForDate?.({ds})?.consumer;return c?.available?c.score:null}
function tone(v){return window.SkyScore?window.SkyScore.scoreClass(v):'missing'}
function fmt(v){return window.SkyScore?window.SkyScore.formatScore(v):(Number.isFinite(v)?String(v):'—')}
function icon(v){return ({positive:'▲',neutral:'●',negative:'▼',missing:'○'})[tone(v)]}
function describe(v){return window.SkyScore?window.SkyScore.describe(v):fmt(v)}
function drik(ds){try{const r=window.SRCalendarAuthority?.resolve(ds,ZONE);return r?.status==='source_verified'?{ok:true,events:r.events||[]}:{ok:false,events:[]}}catch{return {ok:false,events:[]}}}
function catName(c){return (CAT[L()]||CAT.en)[c]||c}
let phaseCache;
function moonQuarters(fromDs,toDs,zone){
 const A=window.Astronomy;if(!A?.SearchMoonQuarter)return null;
 if(phaseCache?.from===fromDs&&phaseCache.to===toDs&&phaseCache.zone===zone)return phaseCache.events;
 // Search a wider UTC interval, then filter by the selected civil date.
 const out=[];try{const a=new Date(addDays(fromDs,-1)+'T00:00:00Z');const b=new Date(addDays(toDs,2)+'T00:00:00Z');
  let mq=A.SearchMoonQuarter(a);for(let i=0;i<4&&mq&&mq.time.date<b;i++){const ds=NRCivilTime.dayKey(+mq.time.date,zone);if(ds>=fromDs&&ds<=toDs)out.push({ds,q:mq.quarter,at:mq.time.date});mq=A.NextMoonQuarter(mq);}
 }catch{return null}
 phaseCache={from:fromDs,to:toDs,zone,events:out};return out}
function clock(d,zone){try{return new Intl.DateTimeFormat(loc(),{hour:'2-digit',minute:'2-digit',timeZone:zone}).format(d)}catch{return ''}}
const wd=ds=>new Intl.DateTimeFormat(loc(),{weekday:'short',timeZone:'UTC'}).format(dateOf(ds));
const dm=ds=>new Intl.DateTimeFormat(loc(),{day:'numeric',month:'short',timeZone:'UTC'}).format(dateOf(ds));
const full=ds=>new Intl.DateTimeFormat(loc(),{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(dateOf(ds));

// FP569d: «Наступна подія» — як у застосунках-календарях Панчанги (найближча перевірена дата Drik і відлік днів).
function nextEvent(){const start=todayKey();for(let i=1;i<=45;i++){const ds=addDays(start,i),d=drik(ds);if(d.events.length)return {ds,n:i,events:d.events}}return null}
function kyivReference(){
 const place=window.NRLocalContext?.current?.();
 return NRCivilTime.localZone()===ZONE&&(!place||place.cityId==='kyiv'||(Math.abs(place.lat-50.454)<0.02&&Math.abs(place.lon-30.524)<0.02));
}
function nextLine(){if(!kyivReference())return '';const start=todayKey(),now=drik(start),nx=nextEvent(),names=ev=>ev.map(e=>catName(e.category)).join(', ');
 const parts=[];if(now.events.length)parts.push(`<span><b>${esc(t('todayLbl'))}:</b> ${esc(names(now.events))}</span>`);
 parts.push(nx?`<span><b>${esc(t('nextLbl'))}:</b> ${esc(names(nx.events))} — ${esc(T.inDays[ix()](nx.n))} <small>(${esc(full(nx.ds))})</small></span>`:`<span>${esc(t('noNext'))}</span>`);
 return `<p class="sr-week-next" data-week-next="${nx?nx.ds:''}">${parts.join('')}</p>`}
function icsFor(ds){const ev=drik(ds).events;if(!ev.length)return null;const d=ds.replace(/-/g,''),e=addDays(ds,1).replace(/-/g,''),now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
 const esc2=s=>String(s).replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n'),fold=l=>{const enc=new TextEncoder(),o=[];let cur='',n=0;for(const ch of l){const b=enc.encode(ch).length;if(n+b>74){o.push(cur);cur=' ';n=1}cur+=ch;n+=b}o.push(cur);return o.join('\r\n')};// RFC 5545: ≤75 octets per line
 const title=ev.map(x=>catName(x.category)).join(', ');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SkyRhythm//Calendar events//UK','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:skyrhythm-'+ds+'-'+ev.map(x=>x.category).join('-')+'@neborhythm.local','DTSTAMP:'+now,'DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+e,'SUMMARY:'+esc2(title),'DESCRIPTION:'+esc2(ev.map(x=>x.source_label).filter(Boolean).join('; ')+'\n'+t('icsNote')),'TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n'}
function downloadIcs(text,name){
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));
 a.download=name;
 document.body.append(a);
 try{a.click();}finally{const url=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
async function exportIcs(ds,btn){
 const text=icsFor(ds);if(!text)return;
 const name='SkyRhythm-'+ds+'.ics',status=btn.parentElement.querySelector('[data-week-ics-status]');
 btn.disabled=true;
 if(status)status.textContent='';
 try{
  const file=typeof File==='function'?new File([text],name,{type:'text/calendar'}):null;
  let shared=false;
  if(file&&navigator.share){
   try{
    if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'SkyRhythm'});shared=true;}
   }catch(err){if(err?.name==='AbortError')return;}
  }
  if(!shared)downloadIcs(text,name);
  if(status)status.textContent=t('icsDone');
 }catch(err){if(status)status.textContent=t('icsError');}
 finally{btn.disabled=false;}
}
function weekStrip(){
 const start=todayKey(),cells=[],reference=kyivReference();
 for(let i=0;i<DAYS;i++){const ds=addDays(start,i),s=score(ds),ev=reference?drik(ds).events.length:0;
  cells.push(`<li data-week-day="${ds}" data-score-tone="${tone(s)}"><button type="button" data-week-go${i===0?' aria-current="date"':''} aria-label="${esc(full(ds)+': '+describe(s)+(ev?' · '+t('evMark'):''))}"><span class="sr-wk-wd" aria-hidden="true">${esc(wd(ds))}</span><span class="sr-wk-d" aria-hidden="true">${esc(dateOf(ds).getUTCDate())}</span><strong class="sr-wk-s" aria-hidden="true">${icon(s)} ${esc(fmt(s))}</strong><span class="sr-wk-ev" aria-hidden="true">${ev?'◆':''}</span></button></li>`)}
 return `<section class="sr-week" data-week-strip data-placement="after-hero" aria-labelledby="srWeekTitle"><div class="sr-week-head"><h2 id="srWeekTitle">${esc(t('week'))}</h2><button type="button" data-week-open>${esc(t('open'))}</button></div><ol>${cells.join('')}</ol>${nextLine()}<p class="sr-week-note">${esc(t('weekNote'))}</p></section>`}

function weekEvents(){
 const reference=kyivReference(),zone=NRCivilTime.localZone(),start=todayKey(zone),end=addDays(start,DAYS-1),moons=moonQuarters(start,end,zone),rows=[];let verified=false;
 for(let i=0;i<DAYS;i++){const ds=addDays(start,i),s=reference?score(ds):null,d=reference?drik(ds):{ok:false,events:[]};if(d.ok)verified=true;
  const items=[...d.events.map(e=>`<li class="is-drik"><span>${esc(catName(e.category))}</span> <small lang="en">${esc(e.source_label||'')}</small></li>`),
   ...(moons||[]).filter(m=>m.ds===ds).map(m=>`<li class="is-moon" data-moon-quarter="${m.q}"><span>${['🌑','🌓','🌕','🌗'][m.q]} ${esc(T.q[ix()][m.q])}</span> <small><time datetime="${m.at.toISOString()}">≈ ${esc(clock(m.at,zone))}</time></small></li>`)];
  if(!items.length)continue;
  rows.push(`<li data-week-event="${ds}"><div class="sr-we-date"><strong>${esc(dm(ds))}</strong><span>${esc(i===0?t('today'):wd(ds))}</span></div>${reference?`<span class="sr-we-score" data-score-tone="${tone(s)}" aria-label="${esc(describe(s))}">${icon(s)} ${esc(fmt(s))}</span>`:''}<ul>${items.join('')}</ul>${d.events.length?`<div class="sr-we-ics"><button type="button" data-week-ics="${ds}">${esc(t('ics'))}</button><small role="status" data-week-ics-status></small></div>`:''}</li>`)}
 const body=rows.length?`<ol class="sr-we-list">${rows.join('')}</ol>`:`<p class="sr-week-note">${esc(reference?(verified?t('none'):t('noData')):(moons?t('noMoon'):t('noData')))}</p>`;
 return `<section class="sr-week-events" data-week-events data-week-zone="${esc(zone)}" aria-labelledby="srWeekEventsTitle"><h2 id="srWeekEventsTitle">${esc(t('events'))}</h2>${body}<p class="sr-week-note">${esc(reference?t('eventsNote'):t('localEventsNote'))} · ${esc(zone)}</p></section>`}

function gScale(g){const n=/^[0-5]$/.test(g)?+g:null,w=T.gWords[ix()];
 return `<span class="sr-g-scale" data-g-scale="${n??''}" aria-hidden="true"><span class="sr-g-title">${esc(t('gTitle'))}${n===null?' · '+esc(t('gNone')):''}</span><span class="sr-g-cells">${[0,1,2,3,4,5].map(i=>`<i data-level="${i}"${i===n?' class="is-now"':''}>G${i}</i>`).join('')}</span><span class="sr-g-ends"><span>${esc(w[0])}</span><span>${esc(w[1])} →</span></span></span>`}
function endHtml(){return `<p class="sr-today-end" data-today-end><span>${esc(t('end'))}</span><button type="button" data-today-top>${esc(t('top'))}</button></p>`}

const sig=new WeakMap();
// Idempotent. where: 'after' (ref.after), 'end', or 'free' (insert after ref once; the order module
// preview-v4/app_today_v1.js owns the position afterwards, so nothing here fights it).
function put(host,ref,sel,html,where='after'){
 if(!host)return;let el=host.querySelector(':scope > '+sel);
 const placed=el&&(where==='free'||(where==='end'?el===host.lastElementChild:el.previousElementSibling===ref));
 if(placed&&sig.get(el)===html)return;
 if(el&&sig.get(el)===html){el.remove();}else{const tmp=document.createElement('div');tmp.innerHTML=html;const fresh=tmp.firstElementChild;sig.set(fresh,html);if(el)el.remove();el=fresh;}
 if(where==='end'||!ref||ref.parentElement!==host)host.append(el);else ref.after(el);
}
function render(){
 const tr=document.querySelector('#nrRoute-today'),ov=tr?.querySelector('.nr-overview');
 if(ov){const ref=ov.querySelector(':scope > .sr-dayline')||ov.querySelector(':scope > [data-p0-signals]');if(ref)put(ov,ref,'[data-week-strip]',weekStrip(),'free');}
 if(tr)put(tr,null,'[data-today-end]',endHtml(),'end');
 for(const b of document.querySelectorAll('[data-weather-brief]'))put(b,null,'.sr-g-scale',gScale(b.dataset.g),'end');
 const tools=document.querySelector('#nrRoute-forecast .nr-o-route-tools'),list=tools?.querySelector(':scope > .nr-o-horizon-list');
 if(list)put(tools,list,'[data-week-events]',weekEvents());
}
let pending=false;const soon=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;try{render()}catch(e){console.warn('week_ahead',e)}})};
function watch(){for(const id of ['nrRoute-today','nrRoute-forecast']){const r=document.getElementById(id);if(!r){setTimeout(watch,300);return}
 if(r.dataset.weekWatch)continue;r.dataset.weekWatch='1';new MutationObserver(soon).observe(r,{childList:true,subtree:true});}soon()}
document.addEventListener('nr:location',soon);
document.addEventListener('click',e=>{
 const icsBtn=e.target.closest?.('[data-week-ics]');if(icsBtn){exportIcs(icsBtn.dataset.weekIcs,icsBtn);return}
 const weekButton=e.target.closest?.('[data-week-open],[data-week-go]');
 if(weekButton){
  window.fp434Go('forecast',true);
  const date=weekButton.closest('[data-week-day]')?.dataset.weekDay;
  const select=document.querySelector('#nrRoute-forecast [data-overview="forecast"] select');
  if(date&&select&&Array.from(select.options).some(option=>option.value===date)){
   select.value=date;
   select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  return;
 }
 if(e.target.closest?.('[data-today-top]')){scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});document.getElementById('nrOverviewHeading-today')?.focus({preventScroll:true})}
});
let renderedDate='';
function checkDate(){
 if(document.hidden||!window.NRCivilTime)return;
 const zone=NRCivilTime.localZone(),signature=[todayKey(),zone,todayKey(zone)].join('|');
 if(signature!==renderedDate){renderedDate=signature;soon();}
}
document.addEventListener('visibilitychange',checkDate);
setInterval(checkDate,60000);
for(const e of ['sr:consumer-load','gindex:consumer-ready','nr:consumer-feed','nr:locale','nr:day','online','offline'])window.addEventListener(e,soon);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRWeekAhead=Object.freeze({nextEvent,icsFor,render,weekStrip,weekEvents});
})();
