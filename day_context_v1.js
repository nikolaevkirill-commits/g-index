// FP564 day context: date bar, change vs yesterday, data provenance, day-vs-forecast rating.
// Reads only NRConsumerOverview.snapshot(); never changes scores, authority or resolveFinal.
(function(){
'use strict';
if(window.NRDayContext)return;
const SHOWN='gindex_day_shown_v1',RATED='gindex_day_vs_forecast_v1',MAX_SHOWN=60,MAX_RATED=800;
const BACKUP='gindex_day_context_backup_v1';
const tr=s=>{const row=DC_STRINGS.find(r=>r[0]===s);return row?row[({uk:0,en:1,es:2,fr:3})[window.NRLocale?.language]??0]:(window.NRLocale?.text(s)||s);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const todayKey=()=>window.NRCivilTime?.dayKey?NRCivilTime.dayKey(Date.now()):new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const shift=(ds,n)=>{const d=new Date(ds+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const loc=()=>window.NRLocale?.locale||'uk-UA';
const dayLabel=ds=>new Intl.DateTimeFormat(loc(),{timeZone:'UTC',weekday:'short',day:'numeric',month:'long'}).format(new Date(ds+'T12:00:00Z'));
const stamp=t=>Number.isFinite(Date.parse(t))?new Intl.DateTimeFormat(loc(),{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'—';
const sign=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'0';
const kyivHour=()=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback;}catch(_){return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const scoreOK=x=>Number.isInteger(x)&&Math.abs(x)<=3;
const clone=x=>JSON.parse(JSON.stringify(x));
let storageIssue=false;
function backupRaw(key,raw){
 try{const old=localStorage.getItem(BACKUP),items=old?JSON.parse(old):[];if(!Array.isArray(items))return false;
  if(items.some(x=>x?.key===key&&x.raw===raw))return true;
  const next=JSON.stringify([...items,{key,raw,saved_at:new Date().toISOString()}]);
  localStorage.setItem(BACKUP,next);return localStorage.getItem(BACKUP)===next;
 }catch(_){return false;}
}
// Invalid originals are copied and read back BEFORE any replacement. If backup fails, do not write.
function store(key,kind){
 const empty=()=>kind==='shown'?{}:[];
 try{const raw=localStorage.getItem(key);if(raw===null)return {value:empty(),writable:true};
  let value;try{value=JSON.parse(raw);}catch(_){value=null;}
  const valid=kind==='shown'?object(value):Array.isArray(value);
  const clean=kind==='shown'?Object.fromEntries(valid?Object.entries(value).filter(([d,r])=>isDay(d)&&object(r)&&object(r.last)&&scoreOK(r.last.score)):[]):valid?value.filter(r=>object(r)&&isDay(r.date)&&['better','as_expected','worse','skip'].includes(r.rating)):[];
  const damaged=!valid||JSON.stringify(clean)!==JSON.stringify(value);
  if(damaged)storageIssue=true;
  return {value:clean,writable:!damaged||backupRaw(key,raw)};
 }catch(_){storageIssue=true;return {value:empty(),writable:false};}
}
function observedFor(ds){
 const r=store(SHOWN,'shown').value[ds]?.last;
 if(!object(r)||r.origin!=='visible_overview_v2'||r.date!==ds||!scoreOK(r.score)||!Number.isFinite(Date.parse(r.seen_at))||Date.parse(r.seen_at)>Date.now())return null;
 const seenDay=window.NRCivilTime?.dayKey?NRCivilTime.dayKey(Date.parse(r.seen_at)):new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(new Date(r.seen_at));
 if(seenDay>ds)return null; // No retrospective feed value masquerades as a prior display.
 return clone(r);
}
function visibleScore(root,score){
 const el=root.querySelector('.nr-o-score');if(document.hidden||!el||!root.getClientRects().length)return false;
 for(let n=el;n;n=n.parentElement){const st=getComputedStyle(n);if(n.hidden||st.visibility==='hidden'||st.display==='none'||Number(st.opacity)===0)return false;}
 const b=el.getBoundingClientRect();
 return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth&&el.textContent.trim().replace('−','-')===String(score).replace(/^([1-3])$/,'+$1');
}

const DC_STRINGS=([
 ['PDF, с.','PDF, p.','PDF, p.','PDF, p.'],
 ['немає','none','sin datos','aucune donnée'],
 ['формула','formula','fórmula','formule'],
 ['Оцінка','Score','Puntuación','Score'],
 ['не сьогодні','not today','no es hoy','pas aujourd’hui'],
 ['До сьогодні','Back to today','Volver a hoy',"Revenir à aujourd’hui"],
 ['Проти вчора','Versus yesterday','Frente a ayer','Par rapport à hier'],
 ['Проти попереднього дня','Versus previous day','Frente al día anterior','Par rapport à la veille'],
 ['як показувалось на цьому пристрої','as shown on this device','como se mostró en este dispositivo','tel qu’affiché sur cet appareil'],
 ['вчора — експерт, сьогодні — формула','yesterday expert, today formula','ayer experto, hoy fórmula','hier expert, aujourd’hui formule'],
 ['вчора — формула, сьогодні — експерт','yesterday formula, today expert','ayer fórmula, hoy experto','hier formule, aujourd’hui expert'],
 ['Дані для дати','Data for date','Datos para la fecha','Données pour la date'],
 ['експерт','expert','experto','expert'],
 ['Розраховано','Calculated','Calculado','Calculé'],
 ['NOAA, 3 дні','NOAA, 3 days','NOAA, 3 días','NOAA, 3 jours'],
 ['NOAA, 27 днів — орієнтир','NOAA, 27 days — rough guide','NOAA, 27 días — orientativo','NOAA, 27 jours — indicatif'],
 ['Як пройшов день порівняно з оцінкою?','How did the day go compared with the score?','¿Cómo fue el día frente a la puntuación?','Comment s’est passée la journée par rapport au score ?'],
 ['Краще','Better','Mejor','Mieux'],
 ['Як очікувалось','As expected','Como se esperaba','Comme prévu'],
 ['Гірше','Worse','Peor','Moins bien'],
 ['Не оцінювати','Skip','Omitir','Ignorer'],
 ['Збережено','Saved','Guardado','Enregistré'],
 ['Не вдалося зберегти','Could not save','No se pudo guardar','Échec de l’enregistrement'],
 ['Лише на цьому пристрої. Це ваше спостереження, а не перевірка точності моделі.','On this device only. This is your observation, not a check of model accuracy.','Solo en este dispositivo. Es su observación, no una verificación de la precisión del modelo.','Uniquement sur cet appareil. C’est votre observation, pas une vérification de la précision du modèle.'],
 ['Експорт оцінок (JSON)','Export ratings (JSON)','Exportar valoraciones (JSON)','Exporter les évaluations (JSON)'],
 ['Мої підсумки за оцінкою','My score reflections','Mis reflexiones sobre la puntuación','Mes bilans par rapport au score'],
 ['Записів','Records','Registros','Entrées'],
 ['Бал, показаний на цьому пристрої','Score displayed on this device','Puntuación mostrada en este dispositivo','Score affiché sur cet appareil'],
 ['Є пошкоджені локальні дані. Експорт містить їхні збережені оригінали.','Some local data is damaged. Export includes preserved originals.','Hay datos locales dañados. La exportación incluye los originales conservados.','Certaines données locales sont endommagées. L’export contient les originaux conservés.'],
 ['Порівнюються різні джерела оцінки','Different score sources are being compared','Se comparan distintas fuentes de puntuación','Les sources des scores comparés diffèrent'],
]);
// This module owns its translated nodes. Do not partially register duplicate keys in
// the global dictionary (NRLocale has no has() API); language events re-render them.

// What the user actually saw: first and last available display per date, on this device only.
function rememberShown(root,ds){
 const s=window.NRConsumerOverview?.snapshot?.(ds);
 if(!isDay(ds)||s?.date!==ds||!s?.display?.available||!scoreOK(s.display.score)||!visibleScore(root,s.display.score))return;
 const storage=store(SHOWN,'shown');if(!storage.writable)return;const all=storage.value;
 const snap=clone(s);delete snap.saved_at;const fingerprint=JSON.stringify(snap);
 if(all[ds]?.last?.origin==='visible_overview_v2'&&all[ds].last.fingerprint===fingerprint)return;
 const now={origin:'visible_overview_v2',date:ds,score:s.display.score,authority:s.display.authority??null,state:s.display.state,generated_at:s.provenance?.generated_at??null,
  kp_source:s.calculation?.kp_source??null,expert_pdf:s.expert?.source_pdf??null,seen_at:new Date().toISOString(),snapshot:snap,fingerprint};
 const rec=all[ds]||{first:now};rec.last=now;all[ds]=rec;
 for(const k of Object.keys(all).sort().slice(0,-MAX_SHOWN))delete all[k];
 write(SHOWN,all);
}
function shownFor(ds){
 const s=window.NRConsumerOverview?.snapshot?.(ds);
 if(s?.display?.available&&scoreOK(s.display.score))return {score:s.display.score,authority:s.display.authority??null,local:false};
 const r=observedFor(ds);
 return r?{score:r.score,authority:r.authority??null,local:true}:null;
}
function selectedDate(root){
 const sel=[...root.querySelectorAll('select')].find(x=>isDay(x.value));
 return {ds:sel?.value||todayKey(),sel};
}
function kpText(src){return src==='NOAA_3day_slots'?tr('NOAA, 3 дні'):src==='NOAA_27day_outlook'?tr('NOAA, 27 днів — орієнтир'):src?String(src):tr('немає');}

function bar(root,ds,sel){
 let el=root.querySelector('[data-day-context]');
 if(!el){el=document.createElement('div');el.dataset.dayContext='';el.className='nr-dc-bar';el.setAttribute('translate','no');el.dataset.placement='after-hero';root.prepend(el);}
 const t=todayKey(),isToday=ds===t;
 el.dataset.state=isToday?'today':'other';el.dataset.selectedDate=ds;
 const dt=deltaText(ds);
 const html='<span class="nr-dc-head"><strong>'+esc(isToday?tr('Сьогодні')+' · '+dayLabel(ds):dayLabel(ds)+' · '+tr('не сьогодні'))+'</strong>'+(dt?'<span class="nr-dc-delta" data-day-delta>'+esc(dt)+'</span>':'')+'</span>'+
  (isToday||!sel?'':'<button type="button" class="nr-dc-today">'+esc(tr('До сьогодні'))+'</button>');
 // Idempotent: rewriting unchanged markup would re-trigger layout observers and drop focus elsewhere.
 if(el.dataset.html!==html){el.innerHTML=html;el.dataset.html=html;}
 const b=el.querySelector('.nr-dc-today');
 if(b)b.onclick=()=>{sel.value=t;sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));};
}
function deltaText(ds){
 const cur=shownFor(ds),prev=shownFor(shift(ds,-1));
 if(!cur||!prev)return '';
 const d=cur.score-prev.score,head=ds===todayKey()?tr('Проти вчора'):tr('Проти попереднього дня');
 const mix=prev.authority!==cur.authority?tr('Порівнюються різні джерела оцінки'):'';
 return head+': '+sign(prev.score)+' → '+sign(cur.score)+' ('+(d===0?'0':sign(d))+')'+(mix?'; '+mix:'')+(prev.local?'; '+tr('як показувалось на цьому пристрої'):'');
}
function provenance(root,ds){
 const host=root.parentElement,key=root.dataset.overview;
 let el=host?.querySelector(':scope > [data-day-provenance][data-for="'+key+'"]');
 // Outside the overview root: p0_layout and app_today re-order root.children on every render, and a
 // block of ours inside that list makes them move nodes (and drop focus) back and forth.
 if(!el){el=document.createElement('p');el.dataset.dayProvenance='';el.dataset.for=key;el.className='nr-dc-prov';el.setAttribute('translate','no');root.after(el);}
 const s=window.NRConsumerOverview?.snapshot?.(ds)||{};
 const who=!s.display?.available?tr('немає'):s.display.authority==='expert_pdf'?tr('експерт')+(s.expert?.source_page?', '+tr('PDF, с.')+' '+s.expert.source_page:''):tr('формула');
 const title=s.expert?.source_pdf?'source_pdf: '+s.expert.source_pdf:'',text=tr('Дані для дати')+': '+dayLabel(ds)+' · '+tr('Оцінка')+': '+who+' · '+tr('Розраховано')+': '+stamp(s.provenance?.generated_at)+' · Kp: '+kpText(s.calculation?.kp_source)+' · Europe/Kyiv';
 if(el.title!==title)el.title=title;if(el.textContent!==text)el.textContent=text;
}
function ratingTarget(){
 const t=todayKey(),rated=store(RATED,'rated').value,done=ds=>rated.some(x=>x.date===ds);
 const y=shift(t,-1);
 if(observedFor(y)&&!done(y))return y;
 if(kyivHour()>=18&&observedFor(t)&&!done(t))return t;
 return null;
}
function rating(root,ds){
 let el=root.parentElement?.querySelector(':scope > [data-day-rating]');
 const target=root.dataset.overview==='today'&&ds===todayKey()?ratingTarget():null;
 if(!target){if(el&&!el.dataset.justSaved)el.remove();return;}
 const anchor=root.parentElement?.querySelector(':scope > [data-day-provenance][data-for="'+root.dataset.overview+'"]');if(!anchor)return;
 if(el&&el.dataset.target===target&&el.dataset.lang===loc())return; // keep buttons stable between periodic renders
 if(!el){el=document.createElement('section');el.dataset.dayRating='';el.className='nr-card nr-dc-rate';el.setAttribute('translate','no');anchor.before(el);}
 el.dataset.target=target;el.dataset.lang=loc();
 const shown=observedFor(target);if(!shown)return;
 el.innerHTML='<h3>'+esc(tr('Як пройшов день порівняно з оцінкою?'))+'</h3><p><b>'+esc(dayLabel(target))+'</b>: '+esc(sign(shown.score))+'</p><small>'+esc(tr('Бал, показаний на цьому пристрої'))+' · '+esc(stamp(shown.seen_at))+'</small>'+
  '<div class="nr-dc-row">'+[['better','Краще'],['as_expected','Як очікувалось'],['worse','Гірше']].map(([v,l])=>'<button type="button" class="nr-btn secondary" data-rate="'+v+'">'+esc(tr(l))+'</button>').join('')+
  '<button type="button" class="nr-dc-skip" data-rate="skip">'+esc(tr('Не оцінювати'))+'</button></div><small>'+esc(tr('Лише на цьому пристрої. Це ваше спостереження, а не перевірка точності моделі.'))+'</small><p role="status" data-rate-status></p>';
 el.querySelectorAll('[data-rate]').forEach(b=>b.onclick=async()=>{
  const save=()=>{
  const storage=store(RATED,'rated'),list=storage.value;
  if(!storage.writable){el.querySelector('[data-rate-status]').textContent=tr('Не вдалося зберегти');return;}
  if(!list.some(x=>x?.date===target)){
   list.push({schema:'day_vs_forecast_v1',date:target,rating:b.dataset.rate,rated_at:new Date().toISOString(),
    shown:clone(shown),snapshot:clone(shown.snapshot??null),independent_validation:false,scope:'Personal observation on this device; not validated accuracy.'});
   if(!write(RATED,list.slice(-MAX_RATED))){el.querySelector('[data-rate-status]').textContent=tr('Не вдалося зберегти');return;}
  }
  el.dataset.justSaved='1';el.innerHTML='<p role="status">'+esc(tr('Збережено'))+'</p>'+exportButton();bindExport(el);
  renderTools();
  setTimeout(()=>{delete el.dataset.justSaved;},4000);
  };
  if(navigator.locks?.request)await navigator.locks.request('nr-day-rating',save);else save();
 });
}
function exportButton(){return '<button type="button" class="nr-dc-skip" data-rate-export>'+esc(tr('Експорт оцінок (JSON)'))+'</button>';}
function bindExport(el){const b=el.querySelector('[data-rate-export]');if(!b)return;b.onclick=()=>{
 const raw={};for(const key of [SHOWN,RATED,BACKUP]){try{raw[key]=localStorage.getItem(key);}catch(_){raw[key]=null;}}
 const blob=new Blob([JSON.stringify({schema:'day_vs_forecast_export_v1',exported_at:new Date().toISOString(),items:store(RATED,'rated').value,independent_validation:false,storage_originals:raw},null,1)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='skyrhythm_day_ratings_'+todayKey()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};}
function renderTools(){
 const host=document.querySelector('#nrRoute-more');if(!host)return;
 let el=host.querySelector('[data-day-records-tools]');if(!el){el=document.createElement('section');el.className='nr-card';el.dataset.dayRecordsTools='';el.setAttribute('translate','no');host.append(el);}
 const n=store(RATED,'rated').value.length;
 const html='<h3>'+esc(tr('Мої підсумки за оцінкою'))+'</h3><p>'+esc(tr('Записів'))+': '+n+'</p>'+exportButton()+(storageIssue?'<p role="status">'+esc(tr('Є пошкоджені локальні дані. Експорт містить їхні збережені оригінали.'))+'</p>':'');
 if(el.dataset.html!==html){el.innerHTML=html;el.dataset.html=html;bindExport(el);}
}

const STYLE=`.nr-dc-bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;border-radius:12px;background:var(--nr-surface,rgba(18,28,44,.92));color:var(--nr-text,#eef3fb);backdrop-filter:blur(8px);font-size:.95rem;min-height:44px;box-sizing:border-box}
.nr-dc-bar[data-state=other]{outline:2px solid var(--nr-warn,#f2b84b);outline-offset:-2px}
.nr-dc-today,.nr-dc-skip{min-height:44px;padding:0 12px;border-radius:10px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;cursor:pointer}
.nr-dc-head{display:flex;flex-direction:column;gap:2px}
.nr-dc-delta{font-size:.85rem;opacity:.9}
.nr-dc-prov{margin:14px 0 4px;font-size:.8rem;line-height:1.4;opacity:.85}
.nr-dc-rate .nr-dc-row{display:flex;flex-wrap:wrap;gap:8px;margin:.5rem 0}
.nr-dc-rate small{display:block;opacity:.85}`;
function ensureStyle(){if(document.getElementById('nrDayContextStyle'))return;const s=document.createElement('style');s.id='nrDayContextStyle';s.textContent=STYLE;document.head.append(s);}

function renderAll(){
 ensureStyle();
 document.querySelectorAll('[data-overview]').forEach(root=>{
  try{const {ds,sel}=selectedDate(root);bar(root,ds,sel);provenance(root,ds);if(sel)rememberShown(root,ds);rating(root,ds);}
  catch(e){console.warn('day context',e);}
 });
 renderTools();
}
window.NRDayContext={render:renderAll,ratings:()=>read(RATED,[])};
let pending=0;
function schedule(){renderAll();clearTimeout(pending);pending=setTimeout(renderAll,80);} // second pass runs after other layout layers
document.addEventListener('nr:overview-rendered',schedule);
window.addEventListener('hashchange',schedule);
window.addEventListener('nr:locale',schedule);
window.addEventListener('storage',e=>{if([SHOWN,RATED].includes(e.key)||e.key===null)schedule();});
document.addEventListener('visibilitychange',schedule);
let scrollPending=0;
window.addEventListener('scroll',()=>{clearTimeout(scrollPending);scrollPending=setTimeout(schedule,150);},{passive:true});
document.addEventListener('change',e=>{if(e.target?.matches?.('[data-overview] select'))setTimeout(schedule,0);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderAll);else renderAll();
})();
