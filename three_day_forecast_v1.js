/* Local three-day outlook. The published consumer resolver is independent of this view. */
(function(root){
 'use strict';
 const NOAA='https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
 const SAVED_NOAA='skyrhythm_three_day_noaa_v1';
 const MAX_SAVED_LENGTH=64000;
 const SLOT=3*3600000, DAY=24*3600000, MAX_AGE=12*3600000, MARGIN=384*60000;
 const STATES=['observed','estimated','predicted'];
 const RIKTA=new Set([4,9,14,19,24,29]);
 const copy={
  uk:{tab:'3 дні',choose:'Оберіть день',score:'Власний бал',method:'2 − максимум Kp серед інтервалів, що починаються цієї доби; шкала від −3 до +2',peak:'Найвищий Kp',calm:'Найнижчий Kp',deviceClock:'Перевірте дату й час на пристрої',kp:'NOAA · кожні 3 години',status:'Час оновлення NOAA',live:'Отримано з NOAA',cached:'Збережена копія NOAA',offline:'Офлайн',stale:'Дані NOAA застаріли',missing:'Актуальні дані NOAA недоступні',loading:'Оновлюємо NOAA…',refresh:'Оновити NOAA',noValue:'Немає даних',observed:'Спостереження',estimated:'Попередня оцінка',predicted:'Прогноз',clock:'Місцевий час',partial:'Для бала потрібні всі інтервали, що починаються цієї доби.',horizon:'NOAA ще не опублікував прогноз до кінця цієї доби. Бал з’явиться, коли NOAA продовжить прогноз.',beyond:'Поза поточним прогнозом NOAA',advice:'Календарні застереження',adviceScope:'Для відповідних нових справ за традицією. Окремо від бала.',clear:'Рікти та Санкранті на цю дату немає.',calendarMissing:'Календарні інтервали недоступні.',rikta:'Рікта',sankranti:'Санкранті'},
  en:{tab:'3 days',choose:'Choose a day',score:'Our score',method:'2 − maximum Kp among intervals starting on this local date; scale −3 to +2',peak:'Highest Kp',calm:'Lowest Kp',deviceClock:'Check the date and time on this device',kp:'NOAA · every 3 hours',status:'NOAA update time',live:'Retrieved from NOAA',cached:'Saved NOAA copy',offline:'Offline',stale:'NOAA data are out of date',missing:'Current NOAA data are unavailable',loading:'Updating NOAA…',refresh:'Refresh NOAA',noValue:'No data',observed:'Observed',estimated:'Preliminary estimate',predicted:'Forecast',clock:'Local time',partial:'The score requires all intervals starting on this local date.',horizon:'NOAA has not yet published a forecast through the end of this day. The score will appear once NOAA extends the forecast.',beyond:'Beyond the current NOAA forecast',advice:'Calendar cautions',adviceScope:'For relevant new undertakings in the tradition. Separate from the score.',clear:'No Rikta or Sankranti on this date.',calendarMissing:'Calendar intervals are unavailable.',rikta:'Rikta',sankranti:'Sankranti'},
  es:{tab:'3 días',choose:'Elige un día',score:'Nuestra puntuación',method:'2 − Kp máximo entre los intervalos que empiezan en esta fecha local; escala de −3 a +2',peak:'Kp más alto',calm:'Kp más bajo',deviceClock:'Comprueba la fecha y la hora del dispositivo',kp:'NOAA · cada 3 horas',status:'Actualización de NOAA',live:'Datos de NOAA',cached:'Copia guardada de NOAA',offline:'Sin conexión',stale:'Datos NOAA desactualizados',missing:'Sin datos recientes de NOAA',loading:'Actualizando NOAA…',refresh:'Actualizar NOAA',noValue:'Sin datos',observed:'Observación',estimated:'Estimación preliminar',predicted:'Pronóstico',clock:'Hora local',partial:'La puntuación requiere todos los intervalos que empiezan en esta fecha local.',horizon:'NOAA aún no ha publicado el pronóstico hasta el final de este día. La puntuación aparecerá cuando NOAA amplíe el pronóstico.',beyond:'Fuera del pronóstico actual de NOAA',advice:'Avisos del calendario',adviceScope:'Para nuevos comienzos según la tradición. Fuera de la puntuación.',clear:'Sin Rikta ni Sankranti en esta fecha.',calendarMissing:'Intervalos del calendario no disponibles.',rikta:'Rikta',sankranti:'Sankranti'},
  fr:{tab:'3 jours',choose:'Choisir un jour',score:'Notre note',method:'2 − Kp maximal parmi les intervalles qui commencent à cette date locale ; échelle de −3 à +2',peak:'Kp le plus élevé',calm:'Kp le plus bas',deviceClock:'Vérifiez l’heure et la date de l’appareil',kp:'NOAA · toutes les 3 heures',status:'Mise à jour NOAA',live:'Données de NOAA',cached:'Copie NOAA enregistrée',offline:'Hors ligne',stale:'Données NOAA périmées',missing:'Données NOAA à jour indisponibles',loading:'Mise à jour NOAA…',refresh:'Actualiser NOAA',noValue:'Pas de données',observed:'Observation',estimated:'Estimation préliminaire',predicted:'Prévision',clock:'Heure locale',partial:'La note exige tous les intervalles qui commencent à cette date locale.',horizon:'NOAA n’a pas encore publié de prévision jusqu’à la fin de cette journée. La note apparaîtra quand NOAA prolongera la prévision.',beyond:'Au-delà de la prévision NOAA actuelle',advice:'Avis du calendrier',adviceScope:'Pour les nouveaux projets selon la tradition. En dehors de la note.',clear:'Aucun Rikta ni Sankranti à cette date.',calendarMissing:'Intervalles du calendrier indisponibles.',rikta:'Rikta',sankranti:'Sankranti'}
 };
 const words=()=>copy[root.NRLocale?.language]||copy.uk;
 const dayKey=(ms,zone)=>root.NRCivilTime.dayKey(ms,zone);
 const dayAnchor=day=>Date.parse(day+'T12:00:00Z');
 const fmt=(locale,options)=>new Intl.DateTimeFormat(locale,options);
 const forDay=ms=>new Date(ms).toISOString().slice(0,10);
 function parse(rows){
  if(!Array.isArray(rows)||!rows.length)throw Error('Missing NOAA records');
  const table=Array.isArray(rows[0]), header=table?rows[0]:null;
  const cols=header&&['time_tag','kp','observed','noaa_scale'].map(key=>header.indexOf(key));
  if(cols&&cols.slice(0,3).includes(-1))throw Error('Unknown NOAA columns');
  const slots=new Map(), conflicts=new Set();
  for(const input of table?rows.slice(1):rows){
   const [tag,value,state,level]=table?cols.map(i=>input?.[i]):[input?.time_tag,input?.kp,input?.observed,input?.noaa_scale];
   const match=typeof tag==='string'&&/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):00:00Z?$/.exec(tag);
   if(!match||!STATES.includes(state))continue;
   const start=Date.parse(match[1]+'T'+match[2]+':00:00Z');
   const kp=typeof value==='number'||(typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value))?Number(value):NaN;
   if(!Number.isFinite(start)||forDay(start)!==match[1]||start%SLOT||!Number.isFinite(kp)||kp<0||kp>9)continue;
   const scale=/^G[1-5]$/.test(level)?level:null, previous=slots.get(start);
   if(previous&&(previous.kp!==kp||previous.state!==state||previous.scale!==scale))conflicts.add(start);
   slots.set(start,{start,kp,state,scale});
  }
  for(const start of conflicts)slots.delete(start);
  if(!slots.size)throw Error('No valid NOAA intervals');
  return slots;
 }
 function daySlots(day,zone,slots){
  const center=Math.floor(dayAnchor(day)/SLOT)*SLOT, rows=[];
  for(let start=center-2*DAY;start<center+2*DAY;start+=SLOT){
   if(dayKey(start,zone)===day)rows.push(slots?.get(start)||{start,kp:null});
  }
  return rows;
 }
 function score(rows){
  if(!rows.length||rows.some(r=>r.kp===null))return null;
  return Math.max(-3,Math.min(3,Math.trunc(2-Math.max(...rows.map(r=>r.kp)))))||0;
 }

 let pending=null, reading=null, lastAttempt=-Infinity, problem=false, restored=false, skewed=false;
 async function request(url,signal){
  const response=await fetch(url,{cache:'no-store',credentials:'omit',signal});
  if(!response.ok)throw Error('NOAA HTTP '+response.status);
  return response;
 }
 function snapshot(slots,at,source){
  const now=Date.now();
  if(!Number.isFinite(at)||at>now+5*60000)throw Error('Invalid NOAA timestamp');
  // A current HTTP header cannot make an old observation series fresh, and
  // an interval cannot be observed before it has ended.
  const seen=[...slots.values()].filter(r=>r.state==='observed'&&r.start+SLOT<=at).map(r=>r.start+SLOT);
  return {slots,at,source,validThrough:Math.min(at,Math.max(-Infinity,...seen))+MAX_AGE};
 }
 function storedSnapshot(){
  try{
   const json=localStorage.getItem(SAVED_NOAA);
   if(!json||json.length>MAX_SAVED_LENGTH)return null;
   const {rows,at}=JSON.parse(json);
   return Object.assign(snapshot(parse(rows),at,'cached'),{restored:true});
  }catch{return null;}
 }
 function atLeastAsFresh(next,current){
  if(!current||next.validThrough!==current.validThrough)return !current||next.validThrough>current.validThrough;
  // At the same observation hour a direct NOAA response outranks a copy
  // restored from this device; otherwise the newer issue time wins.
  return (next.source==='live'&&!!current.restored)||next.at>=current.at;
 }
 // Another tab may have saved a fresher copy after this tab last read storage.
 function adoptSaved(){
  const saved=storedSnapshot();
  if(!saved||(reading&&(saved.validThrough<reading.validThrough||
   (saved.validThrough===reading.validThrough&&saved.at<=reading.at))))return false;
  reading=saved;
  return true;
 }
 function storeSnapshot(snapshot){
  if(snapshot.validThrough<Date.now())return;
  try{
   if(!atLeastAsFresh(snapshot,storedSnapshot()))return;
   const rows=[...snapshot.slots.values()].map(({start,kp,state,scale})=>({
    time_tag:new Date(start).toISOString().replace('.000Z','Z'),kp,observed:state,noaa_scale:scale,
   }));
   const json=JSON.stringify({at:snapshot.at,rows});
   if(json.length<=MAX_SAVED_LENGTH)localStorage.setItem(SAVED_NOAA,json);
  }catch{/* A storage restriction must not prevent showing a network response. */}
 }
 async function direct(){
  const result=await request(NOAA,AbortSignal.timeout(5000));
  const slots=parse(await result.json());
  const modified=Date.parse(result.headers.get('Last-Modified')||'');
  // NOAA cannot have issued data in the device's future: the device clock is behind.
  skewed=Number.isFinite(modified)&&modified>Date.now()+5*60000;
  return snapshot(slots,Number.isFinite(modified)?modified:Date.now(),'live');
 }
 async function archived(){
  const signal=AbortSignal.timeout(4500), path='consumer_cloud/noaa/';
  const receipt=await (await request(path+'receipts/cloud.json',signal)).json();
  if(receipt?.url!==NOAA||!/^[a-f0-9]{64}$/.test(receipt?.sha256)||receipt.body!=='bodies/'+receipt.sha256+'.json')throw Error('Invalid NOAA receipt');
  const bytes=await (await request(path+receipt.body,signal)).arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==receipt.sha256)throw Error('Invalid NOAA body digest');
  return snapshot(parse(JSON.parse(new TextDecoder().decode(bytes))),Date.parse(receipt.retrieved_at),'cached');
 }
 // The short alert uses the verified publication, independently of the consumer score.
 async function archivedDayIntervals(){
  const reading=await archived(), now=Date.now();
  if(now-reading.at>6*3600000||reading.validThrough<now)throw Error('stale');
  return reading;
 }
 async function hourlyOutlook(){
  const reading=await archivedDayIntervals(), now=Date.now();
  const end=now+12*3600000, slots=[];
  let expected=0;
  for(let start=Math.floor(now/SLOT)*SLOT;start<end;start+=SLOT){
   expected++;
   const row=reading.slots.get(start);
   if(!row||row.state==='observed')continue;
   slots.push({time_utc:new Date(start).toISOString(),kp:row.kp,source:row.state});
  }
  if(!slots.length)throw Error('missing');
  return {generated_at:new Date(reading.at).toISOString(),lookahead_hours:12,slots,
   forecast_coverage:{status:slots.length===expected?'complete':'partial'}};
 }
 const hourlyWords={
  uk:['Kp кожні 3 години · найближчі 12 годин','Отримано з NOAA','Попередня оцінка','Прогноз','Часткове покриття','Квитанція NOAA застаріла','Немає підтверджених інтервалів NOAA','Оновлюємо NOAA…','Особиста лінія дня'],
  en:['Kp every 3 hours · next 12 hours','Retrieved from NOAA','Preliminary estimate','Forecast','Partial coverage','NOAA receipt is out of date','No verified NOAA intervals','Updating NOAA…','Personal day line'],
  es:['Kp cada 3 horas · próximas 12 horas','Datos recibidos de NOAA','Estimación preliminar','Pronóstico','Cobertura parcial','Los datos de NOAA están desactualizados','Sin intervalos verificados de NOAA','Actualizando NOAA…','Línea personal del día'],
  fr:['Kp toutes les 3 heures · 12 prochaines heures','Données reçues de la NOAA','Estimation préliminaire','Prévision','Couverture partielle','Les données de la NOAA sont périmées','Aucun intervalle vérifié de la NOAA','Mise à jour NOAA…','Ligne personnelle du jour']
 };
 const hourlyHosts=new WeakMap();
 function hourlyCopy(){return hourlyWords[root.NRLocale?.language]||hourlyWords.uk;}
 async function updateHourly(hourlyPanel){
  if(hourlyPanel.hidden||document.hidden||!hourlyPanel.getClientRects().length)return;
  const request=Symbol();hourlyPanel.request=request;
  const body=hourlyPanel.querySelector('div'), words=hourlyCopy();
  body.textContent=words[7];
  try{
   const data=await hourlyOutlook();
   if(request!==hourlyPanel.request)return;
   const clock=new Intl.DateTimeFormat(root.NRLocale?.locale||'uk-UA',{timeZone:'Europe/Kyiv',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
   const header=document.createElement('p');
   header.textContent=words[1]+' · '+clock.format(new Date(data.generated_at))+' (Europe/Kyiv)';
   if(data.forecast_coverage.status!=='complete')header.textContent+=' · '+words[4];
   const list=document.createElement('ul');
   for(const slot of data.slots){
    const item=document.createElement('li'), start=Date.parse(slot.time_utc);
    item.textContent=clock.format(start)+' – '+clock.format(start+SLOT)+' · Kp '+new Intl.NumberFormat(root.NRLocale?.locale||'uk-UA').format(slot.kp)+' · '+words[slot.source==='estimated'?2:3];
    list.append(item);
   }
   body.replaceChildren(header,list);
  }catch(error){if(request===hourlyPanel.request)body.textContent=words[error.message==='stale'?5:6];}
 }
 function mountHourly(anchor,triggerHost,active=true,after=false){
  if(!triggerHost)return;
  let widget=hourlyHosts.get(anchor);
  if(!widget){
   const panel=document.createElement('section'),button=document.createElement('button');
   const route=anchor.closest('[data-overview]').dataset.overview;
   panel.id='nrHourlyNoaa-'+route;
   panel.setAttribute('aria-labelledby',panel.id+'-title');
   panel.dataset.hourlyNoaa='';
   panel.hidden=true;
   panel.tabIndex=-1;
   panel.style.gridColumn='1 / -1';
   const title=document.createElement('h3');title.id=panel.id+'-title';
   const link=document.createElement('a');link.href='personal_dayline.html';
   const dayButton=document.createElement('button');dayButton.type='button';dayButton.dataset.hourlyDayStrip='';dayButton.className='sr-ds-shortcut';
   dayButton.addEventListener('click',()=>{
    root.fp434Go?.('forecast',true);
    const go=()=>{const tab=document.querySelector('#nrRoute-forecast [data-p0-forecast-tabs] [data-horizon="1"]');if(tab&&tab.getAttribute('aria-pressed')!=='true')tab.click();
     const strip=document.querySelector('#nrRoute-forecast [data-day-strip]');if(!strip)return;strip.tabIndex=-1;strip.focus({preventScroll:true});
     let tries=0;const place=()=>{strip.scrollIntoView({block:'start',behavior:'instant'});if(strip.dataset.stripState!=='ready'&&++tries<40)root.setTimeout(place,150);};place();};
    root.requestAnimationFrame?root.requestAnimationFrame(()=>root.requestAnimationFrame(go)):go();
   });
   panel.append(title,document.createElement('div'),dayButton,link);
   button.type='button';button.dataset.hourlyToggle='';
   button.setAttribute('aria-controls',panel.id);
   button.setAttribute('aria-expanded','false');
   button.style.cssText='min-height:44px;max-width:100%;padding:4px 8px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:600 14px/1.2 system-ui;cursor:pointer';
   if(!after)button.style.flex='0 0 76px';
   const update=()=>updateHourly(panel);
   button.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    button.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden){
     update();
     panel.focus({preventScroll:true});
     panel.scrollIntoView({block:'center',behavior:'instant'});
    }
   });
   document.addEventListener('visibilitychange',update);
   root.addEventListener('pageshow',update);
   root.addEventListener('online',update);
   root.addEventListener('nr:locale',update);
   root.setInterval(update,5*60000);
   widget={panel,button};hourlyHosts.set(anchor,widget);
   if(after)anchor.after(panel);else anchor.prepend(panel);
  }
  const {panel,button}=widget;
  const words=hourlyCopy();
  panel.firstElementChild.textContent=words[0];panel.lastElementChild.textContent=words[8];
  const dayButton=panel.querySelector('[data-hourly-day-strip]');if(dayButton)dayButton.textContent=stripCopy().openDay;
  button.textContent=words[0].split(' · ')[0];
  button.hidden=!active;
  if(!active){panel.hidden=true;button.setAttribute('aria-expanded','false');}
  if(button.parentNode!==triggerHost)triggerHost.append(button);
 }
 async function refresh(force=false){
  if(!restored){restored=true;reading=storedSnapshot();}
  if(pending||!navigator.onLine||Date.now()-lastAttempt<(force?5000:10*60000))return pending;
  lastAttempt=Date.now();
  problem=false;
  pending=(async()=>{
   let next=null;
   try{next=await direct();}catch{}
   if(!next||next.validThrough<Date.now()){
    try{const cached=await archived();if(atLeastAsFresh(cached,next))next=cached;}catch{}
   }
   if(next&&atLeastAsFresh(next,reading)){
    reading=next;
    storeSnapshot(next);
   }
   problem=!next||next.validThrough<Date.now();
   if(problem)adoptSaved();
  })().finally(()=>{pending=null;redraw();});
  return pending;
 }
 const calendarCache=new Map();
 function calendar(days,zone){
  const key=zone+' '+days[0];
  if(calendarCache.has(key))return calendarCache.get(key);
  const lunar=root.SkyRhythmLunar, civil=root.SkyRhythmCivil;
  if(!lunar?.available()||!civil)return null;
  try{
   const spans=days.map(d=>civil.dayIntervals(d,zone));
   if(spans.some(s=>s.status!=='available'))return null;
   const surrounding=[civil.dayIntervals(forDay(dayAnchor(days[0])-DAY),zone),...spans,
    civil.dayIntervals(forDay(dayAnchor(days.at(-1))+DAY),zone)];
   const rikta=[];
   for(const span of surrounding)for(const item of span.segments){
    if(!RIKTA.has(item.tithi))continue;
    const start=+item.start,end=+item.end,previous=rikta.at(-1);
    if(previous?.end===start)previous.end=end;
    else rikta.push({key:'rikta',start,end});
   }
   const first=+spans[0].start-MARGIN,last=+spans.at(-1).end+MARGIN;
   const sign=t=>Math.floor(lunar.bodyLongitude(t,'Sun')/30);
   let ingress=null;
   let left=first,right=last;
   const initial=sign(left);
   if(initial!==sign(right)){
    while(right-left>1000){const mid=Math.floor((left+right)/2);if(sign(mid)===initial)left=mid;else right=mid;}
    ingress=right;
   }
   const result=new Map(spans.map(span=>{
    const rows=rikta.filter(r=>r.start<+span.end&&r.end>+span.start);
    // Like Rikta, the window keeps its real bounds when it crosses midnight.
    if(ingress!==null&&ingress-MARGIN<+span.end&&ingress+MARGIN>+span.start)
     rows.push({key:'sankranti',start:ingress-MARGIN,end:ingress+MARGIN});
    return [span.date,rows];
   }));
   if(calendarCache.size>=8)calendarCache.delete(calendarCache.keys().next().value);
   calendarCache.set(key,result);
   return result;
  }catch{return null;}
 }
 let activePanel=null;
 function node(tag,className,text){
  const item=document.createElement(tag);
  if(className)item.className=className;
  if(text!==undefined)item.textContent=text;
  return item;
 }
 function render(panel){
  const w=words(), zone=root.NRCivilTime.localZone(), locale=root.NRLocale?.locale||'uk-UA', now=Date.now();
  const first=dayKey(now,zone), days=[0,1,2].map(i=>forDay(dayAnchor(first)+DAY*i));
  const selected=days.includes(panel.dataset.day)?panel.dataset.day:first;
  panel.dataset.day=selected;
  const focusKey=panel.contains(document.activeElement)?document.activeElement.dataset.control:null;
  const dateFmt=fmt(locale,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
  const clock=fmt(locale,{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:zone});
  const stamp=fmt(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:zone});
  const localRange=(start,end)=>dayKey(start,zone)===dayKey(end,zone)
   ?clock.format(start)+'–'+clock.format(end):stamp.format(start)+' → '+stamp.format(end);
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
  const formatScore=value=>value===null?'—':value>0?'+'+value:String(value).replace('-','−');
  const ready=reading&&reading.validThrough>=now, slots=ready?reading.slots:null;
  const rowsByDay=new Map(days.map(day=>[day,daySlots(day,zone,slots)]));
  const dayRows=rowsByDay.get(selected), value=score(dayRows);
  const rowCount=dayRows.filter(r=>r.kp!==null).length;
  // Distinguish «NOAA has not issued these hours yet» from a gap in the data.
  const horizon=slots?Math.max(...slots.keys()):Infinity, empty=dayRows.filter(r=>r.kp===null);
  const beyond=empty.length>0&&empty.every(r=>r.start>horizon);
  const intro=node('div','sr-3d-head');
  intro.append(node('small','',w.clock+' · '+zone));
  const choices=node('div','sr-3d-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label',w.choose);
  for(const day of days){
   const s=score(rowsByDay.get(day)), choice=node('button','sr-3d-choice');
   choice.type='button';choice.dataset.control=day;choice.setAttribute('aria-pressed',String(day===selected));
   choice.setAttribute('aria-label',dateFmt.format(dayAnchor(day))+' · '+w.score+' '+(s===null?w.noValue:formatScore(s)));
   choice.append(node('span','',dateFmt.format(dayAnchor(day))),node('b','',formatScore(s)));
   choice.onclick=()=>{panel.dataset.day=day;render(panel);};
   choices.append(choice);
  }
  const summary=node('section','sr-3d-score');
  summary.append(node('h3','',w.score),node('strong','',formatScore(value)),node('small','',value!==null?w.method:beyond?w.horizon:w.partial));
  if(value!==null){
   // Name the interval that sets the score and the quietest one of the day.
   const peak=dayRows.reduce((a,b)=>b.kp>a.kp?b:a), calm=dayRows.reduce((a,b)=>b.kp<a.kp?b:a);
   const span=(label,row)=>label+' '+number.format(row.kp)+' · '+localRange(row.start,row.start+SLOT);
   const extremes=node('small','',span(w.peak,peak)+(calm.kp<peak.kp?'. '+span(w.calm,calm):''));
   extremes.dataset.extremes='';
   summary.append(extremes);
  }
  const warning=node('section','sr-3d-advice');
  warning.append(node('h3','',w.advice),node('small','',w.adviceScope));
  const advisories=calendar(days,zone)?.get(selected);
  if(!advisories?.length)warning.append(node('p','',advisories?w.clear:w.calendarMissing));
  else for(const item of advisories){
   const line=node('p','','');
   line.append(node('b','',w[item.key]+' '),document.createTextNode(localRange(item.start,item.end)));
   warning.append(line);
  }
  const forecast=node('section','sr-3d-noaa'), header=node('div','sr-3d-toolbar');
  const refreshButton=node('button','',w.refresh);
  refreshButton.type='button';refreshButton.dataset.control='refresh';
  refreshButton.setAttribute('aria-disabled',String(!navigator.onLine||!!pending));
  refreshButton.onclick=()=>{if(navigator.onLine&&!pending){refresh(true);render(panel);}};
  header.append(node('h3','',w.kp),refreshButton);
  const status=node('p','sr-3d-status',
   (pending&&!ready?w.loading:ready?w[problem||!navigator.onLine?'cached':reading.source]:reading?w.stale:w.missing)
   +(reading?' · '+w.status+' '+stamp.format(reading.at):'')
   +(!navigator.onLine?' · '+w.offline:!ready&&skewed?' · '+w.deviceClock:''));
  status.setAttribute('role','status');
  intro.append(status);
  const list=node('ul','sr-3d-slots');
  // Intervals are displayed once under their local start date; the end
  // date remains visible on slots that cross midnight.
  for(const row of dayRows){
   const item=node('li','');
   item.dataset.utc=new Date(row.start).toISOString();
   if(row.scale)item.dataset.storm=row.scale;
   const detail=row.kp!==null?w[row.state]:row.start>horizon?w.beyond:w.noValue;
   item.append(node('time','',localRange(row.start,row.start+SLOT)),
    node('b','',row.kp===null?'—':'Kp '+number.format(row.kp)+(row.scale?' · '+row.scale:'')),
    node('small','',detail));
   list.append(item);
  }
  forecast.append(header,list);
  panel.dataset.validSlots=String(rowCount);
  panel.replaceChildren(intro,choices,summary,warning,forecast);
  if(focusKey)[...panel.querySelectorAll('[data-control]')].find(x=>x.dataset.control===focusKey)?.focus({preventScroll:true});
 }
 function visible(){return activePanel?.isConnected&&!activePanel.hidden&&!!activePanel.closest('.nr-route.active');}
 function redraw(){if(visible())render(activePanel);}
 function update(){if(visible()){refresh();redraw();}}
 function mount(panel){activePanel=panel;if(visible())refresh();render(panel);}
 if(typeof document!=='undefined'){
  for(const event of ['focus','sr:place-changed','load'])root.addEventListener(event,update);
  root.addEventListener('storage',event=>{if(event.key===SAVED_NOAA&&adoptSaved())redraw();});
  root.addEventListener('online',()=>{if(visible()){refresh(true);redraw();}});
  for(const event of ['offline','nr:locale'])root.addEventListener(event,redraw);
  document.addEventListener('nr:location',redraw);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  root.setInterval(()=>{if(!document.hidden)update();},10*60000);
 }
 // FP573: «День по 3 години». Один розклад на вибрану дату: інтервали NOAA Kp (сітка UTC 00, 03 … 21),
 // стан і зміни панчанги (тітхі, накшатра, йога) та астрономічні події місця. Kp береться лише з перевіреної
 // квитанції (SHA-256 тіла), застаріла квитанція (понад 6 год) приховує числа. Панчанга і небо — розрахунок, не прогноз.
 const stripWords={
  uk:{clockShift:'перехід годинника',openSky:'на небі →',skyAt:'Відкрити небо о {t}',noDayKp:'NOAA не публікує тригодинних значень Kp для цієї дати',peak:'найвищий Kp доби',openDay:'День по 3 години →',title:'День по 3 години',lead:'Kp NOAA, джйотіш і небо в одному розкладі. Межі блоків збігаються з тригодинними інтервалами NOAA.',
   place:'Місце',kp:'Kp',jyotish:'Джйотіш',sky:'Небо',observed:'факт',estimated:'попередня оцінка',predicted:'прогноз',
   noKp:'немає даних NOAA на цей інтервал',staleKp:'квитанція NOAA застаріла, значення приховано',loadingKp:'перевіряємо квитанцію NOAA…',failKp:'немає перевіреної квитанції NOAA',
   loading:'Розраховуємо панчангу…',noPanch:'панчанга недоступна для цієї дати',quiet:'подій немає',now:'зараз',
   tithi:'тітхі',nakshatra:'накшатра',yoga:'йога',
   sunrise:'схід Сонця',sunset:'захід Сонця',noon:'полудень',dawn:'світанок',dusk:'кінець сутінків',moonrise:'схід Місяця',moonset:'захід Місяця',
   quarter:['молодик','перша чверть Місяця','повня','остання чверть Місяця'],
   note:'Kp — планетарний тригодинний індекс NOAA, однаковий для всіх міст. Тітхі, накшатра та йога — розрахунок панчанги на момент початку блоку; стрілка показує зміну всередині блоку. Світанок і кінець сутінків відповідають Сонцю на 6° під горизонтом. Події неба розраховано для вибраного місця. Окремого значення на кожну годину NOAA не публікує.'},
  en:{clockShift:'clock change',openSky:'in the sky →',skyAt:'Open the sky at {t}',noDayKp:'NOAA publishes no three-hour Kp values for this date',peak:'highest Kp of the day',openDay:'Day in 3-hour blocks →',title:'Day in 3-hour blocks',lead:'NOAA Kp, Jyotish and the sky in one schedule. Block edges match the NOAA three-hour intervals.',
   place:'Place',kp:'Kp',jyotish:'Jyotish',sky:'Sky',observed:'observed',estimated:'preliminary estimate',predicted:'forecast',
   noKp:'no NOAA data for this interval',staleKp:'NOAA receipt is out of date, values hidden',loadingKp:'checking the NOAA receipt…',failKp:'no verified NOAA receipt',
   loading:'Computing the panchanga…',noPanch:'panchanga unavailable for this date',quiet:'no events',now:'now',
   tithi:'tithi',nakshatra:'nakshatra',yoga:'yoga',
   sunrise:'sunrise',sunset:'sunset',noon:'solar noon',dawn:'dawn',dusk:'end of dusk',moonrise:'moonrise',moonset:'moonset',
   quarter:['new Moon','first quarter Moon','full Moon','last quarter Moon'],
   note:'Kp is the NOAA planetary three-hour index, the same for every city. Tithi, nakshatra and yoga are panchanga calculations at the start of each block; an arrow marks a change inside the block. Dawn and end of dusk mean the Sun is 6° below the horizon. Sky events are computed for the selected place. NOAA does not publish a separate value for every hour.'},
  es:{clockShift:'cambio de hora',openSky:'en el cielo →',skyAt:'Abrir el cielo a las {t}',noDayKp:'NOAA no publica valores Kp de tres horas para esta fecha',peak:'Kp más alto del día',openDay:'Día en bloques de 3 horas →',title:'El día en bloques de 3 horas',lead:'Kp de NOAA, Jyotish y el cielo en un solo horario. Los límites coinciden con los intervalos de tres horas de NOAA.',
   place:'Lugar',kp:'Kp',jyotish:'Jyotish',sky:'Cielo',observed:'observado',estimated:'estimación preliminar',predicted:'pronóstico',
   noKp:'sin datos de NOAA para este intervalo',staleKp:'los datos de NOAA están desactualizados; valores ocultos',loadingKp:'comprobando los datos de NOAA…',failKp:'sin datos verificados de NOAA',
   loading:'Calculando el panchanga…',noPanch:'panchanga no disponible para esta fecha',quiet:'sin eventos',now:'ahora',
   tithi:'tithi',nakshatra:'nakshatra',yoga:'yoga',
   sunrise:'salida del Sol',sunset:'puesta del Sol',noon:'mediodía solar',dawn:'alba',dusk:'fin del crepúsculo',moonrise:'salida de la Luna',moonset:'puesta de la Luna',
   quarter:['luna nueva','cuarto creciente','luna llena','cuarto menguante'],
   note:'Kp es el índice planetario de tres horas de NOAA, igual para todas las ciudades. Tithi, nakshatra y yoga se calculan al inicio de cada bloque; la flecha marca un cambio dentro del bloque. El alba y el fin del crepúsculo corresponden al Sol 6° bajo el horizonte. Los eventos del cielo se calculan para el lugar elegido. NOAA no publica un valor para cada hora.'},
  fr:{clockShift:'changement d’heure',openSky:'dans le ciel →',skyAt:'Ouvrir le ciel à {t}',noDayKp:'La NOAA ne publie pas de valeurs Kp sur trois heures pour cette date',peak:'Kp le plus élevé du jour',openDay:'Journée par tranches de 3 h →',title:'La journée par tranches de 3 heures',lead:'Kp de la NOAA, Jyotish et ciel dans un seul horaire. Les limites suivent les intervalles de trois heures de la NOAA.',
   place:'Lieu',kp:'Kp',jyotish:'Jyotish',sky:'Ciel',observed:'observé',estimated:'estimation préliminaire',predicted:'prévision',
   noKp:'aucune donnée NOAA pour cet intervalle',staleKp:'les données de la NOAA sont périmées ; valeurs masquées',loadingKp:'vérification des données NOAA…',failKp:'aucune donnée NOAA vérifiée',
   loading:'Calcul du panchanga…',noPanch:'panchanga indisponible pour cette date',quiet:'aucun événement',now:'maintenant',
   tithi:'tithi',nakshatra:'nakshatra',yoga:'yoga',
   sunrise:'lever du Soleil',sunset:'coucher du Soleil',noon:'midi solaire',dawn:'aube',dusk:'fin du crépuscule',moonrise:'lever de la Lune',moonset:'coucher de la Lune',
   quarter:['nouvelle lune','premier quartier','pleine lune','dernier quartier'],
   note:'Le Kp est l’indice planétaire de trois heures de la NOAA, identique pour toutes les villes. Tithi, nakshatra et yoga sont calculés au début de chaque tranche ; une flèche signale un changement dans la tranche. L’aube et la fin du crépuscule correspondent au Soleil à 6° sous l’horizon. Les événements du ciel sont calculés pour le lieu choisi. La NOAA ne publie pas de valeur pour chaque heure.'}
 };
 const STRIP_KINDS=['tithi','nakshatra','yoga'];
 function stripCopy(){return stripWords[root.NRLocale?.language]||stripWords.uk;}
 function stripPlace(){
  const loc=root.SRSkyTime?.snapshot?.().loc;
  if(loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lon)&&loc.zone)return loc;
  return {cityId:'kyiv',lat:50.454,lon:30.524,zone:'Europe/Kyiv'};
 }
 function offsetAt(at,zone){
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(at).find(x=>x.type==='timeZoneName')?.value||'';}catch(_){return '';}
 }
 function civilBounds(ds,zone){
  const key=d=>root.NRCivilTime.dayKey(d,zone), noon=Date.parse(ds+'T12:00:00Z');
  const edge=next=>{let lo=noon-2*DAY,hi=noon+2*DAY;while(hi-lo>1){const mid=Math.floor((lo+hi)/2),k=key(mid);if(next?k>ds:k>=ds)hi=mid;else lo=mid;}return hi;};
  return {start:edge(false),end:edge(true)};
 }
 function skyEvents(loc,start,end,w){
  const A=root.Astronomy;if(!A)return [];
  const obs=new A.Observer(loc.lat,loc.lon,loc.elevation||0),from=new Date(start),days=(end-start)/DAY,out=[];
  const add=(time,label)=>{const at=time?.date?+time.date:NaN;if(at>=start&&at<end)out.push({at,label});};
  const safe=f=>{try{return f();}catch(_){return null;}};
  add(safe(()=>A.SearchAltitude('Sun',obs,+1,from,days,-6)),w.dawn);
  add(safe(()=>A.SearchRiseSet('Sun',obs,+1,from,days)),w.sunrise);
  add(safe(()=>A.SearchHourAngle('Sun',obs,0,from)?.time),w.noon);
  add(safe(()=>A.SearchRiseSet('Sun',obs,-1,from,days)),w.sunset);
  add(safe(()=>A.SearchAltitude('Sun',obs,-1,from,days,-6)),w.dusk);
  add(safe(()=>A.SearchRiseSet('Moon',obs,+1,from,days)),w.moonrise);
  add(safe(()=>A.SearchRiseSet('Moon',obs,-1,from,days)),w.moonset);
  const q=safe(()=>A.SearchMoonQuarter(from));if(q)add(q.time,w.quarter[q.quarter]);
  return out.sort((a,b)=>a.at-b.at);
 }
 async function stripKp(){
  const reading=await archived();
  return {stale:Date.now()-reading.at>6*3600000||reading.validThrough<Date.now(),at:reading.at,slots:reading.slots};
 }
 // D1: a private worker. SRDayLineAsync keeps one job and rejects the previous one with SUPERSEDED,
 // so sharing it would let this strip and «Лінія дня» cancel each other.
 const stripCache=new Map();let stripWorker=null,stripSeq=0;const stripJobs=new Map();
 function stripCompute(input){
  const key=JSON.stringify([input.date,input.lat,input.lon,input.zone]);
  if(stripCache.has(key))return stripCache.get(key);
  let promise;
  if(typeof Worker==='undefined'||!root.document)promise=Promise.resolve().then(()=>root.SkyRhythmDayLine.build(input));
  else promise=new Promise((resolve,reject)=>{
   try{
    if(!stripWorker){
     stripWorker=new Worker(new URL('dayline_worker_v1.js?v=fp572-lunar',root.document.baseURI));
     stripWorker.onmessage=({data})=>{const job=stripJobs.get(data.id);if(!job)return;stripJobs.delete(data.id);clearTimeout(job.timer);data.error?job.reject(Error(data.error)):job.resolve(data.result);};
     stripWorker.onerror=e=>{e.preventDefault?.();for(const job of stripJobs.values()){clearTimeout(job.timer);job.reject(Error('STRIP_WORKER_FAILED'));}stripJobs.clear();stripWorker?.terminate();stripWorker=null;};
    }
    const id=++stripSeq;
    stripJobs.set(id,{resolve,reject,timer:setTimeout(()=>{stripJobs.delete(id);reject(Error('STRIP_WORKER_TIMEOUT'));},30000)});
    stripWorker.postMessage({id,input});
   }catch(error){reject(error);}
  });
  promise=promise.catch(error=>{stripCache.delete(key);throw error;});
  stripCache.set(key,promise);if(stripCache.size>8)stripCache.delete(stripCache.keys().next().value);
  return promise;
 }
 async function stripPanchanga(ds,loc){
  const input={date:ds,lat:loc.lat,lon:loc.lon,zone:loc.zone,includeCivil:true};
  const result=await stripCompute(input);
  if(result?.civil?.status!=='available')throw Error('PANCHANGA_UNAVAILABLE');
  return result.civil;
 }
 // FP573b: plain-language layer for «День по 3 години». Kp words follow the usual Kp classes; storm effects
 // are quoted from the NOAA Space Weather Scales (G1–G5). Jyotish terms are a calendar, not a proven effect.
 const plainWords={
  uk:{partial:'за доступними інтервалами NOAA',knownPeak:'найвище з доступних значень Kp',noaaSpan:'інтервал NOAA {a}–{b}',chartLabel:'Kp за добу: від {a} до {b}',stormLine:'буря',meterLabel:'Kp {v} з 9',staleShort:'дані NOAA застаріли',inNakShort:'у накшатрі {n}',fromNak:'з {t} — у накшатрі {n}',fromTithi:'з {t} — {x}',stormHead:'{n} магнітна буря {g}',summary:'Головне за день',today:'Сьогодні',field:'Магнітне поле',moon:'Місяць',sun:'Сонце',experts:'Для знавців',earlier:'Раніше сьогодні ({n})',
   quiet:'спокійне',unsettled:'трохи збурене',active:'збурене, але це ще не буря',storm:'магнітна буря {g}',
   stormName:['','слабка','помірна','сильна','дуже сильна','екстремальна'],
   stormNote:['','Можливі слабкі коливання в енергомережах; полярне сяйво видно на високих широтах (шкала NOAA).','Полярне сяйво — до 55° геомагнітної широти; на високих широтах можливе згасання короткохвильового радіо (шкала NOAA).','Можливі перебої супутникової навігації та короткохвильового радіо; полярне сяйво — до 50° геомагнітної широти (шкала NOAA).','Супутникова навігація може погіршуватися на години; полярне сяйво — до 45° геомагнітної широти (шкала NOAA).','Можливі масові збої енергомереж і радіозв’язку; полярне сяйво — до 40° геомагнітної широти (шкала NOAA).'],
   noField:'даних NOAA немає',quietAll:'спокійне весь день',peakAt:'найвищий Kp {v} о {t}',
   parts:['уночі','вранці','вдень','увечері'],
   headStorm:'{d} {p} — {n} магнітна буря ({g})',headCalm:'{d}: магнітне поле спокійне',headBusy:'{d}: магнітне поле {c} {p}',headMoon:'о {t} Місяць переходить у накшатру {n}',
   day:'день',twilight:'сутінки',night:'ніч',
   tithiDay:'{k}-й день {p} Місяця',waxing:'зростаючого',waning:'спадного',full:'повня',newMoon:'молодик',
   inNak:'Місяць у накшатрі {n}',toNak:'о {t} Місяць переходить у накшатру {n}',toTithi:'о {t} починається {x}',
   sunDay:'світловий день {a}–{b}',sunNone:'Сонце не сходить або не заходить цієї доби',at:'о {t} {e}',
   glossTitle:'Що означають ці слова',
   gloss:[['Kp','індекс збурення магнітного поля Землі від 0 до 9. NOAA рахує його за кожні три години. Від 5 починається магнітна буря.'],['G1–G5','шкала магнітних бур NOAA: G1 слабка, G5 екстремальна.'],['Факт, попередня оцінка, прогноз','так NOAA позначає значення: факт — уже виміряне; попередня оцінка — найближчі інтервали, які NOAA оцінює за поточними даними; прогноз — подальші інтервали.'],['Місячний день (тітхі)','тридцята частина місячного місяця: від молодика до повні 15 днів зростаючого Місяця, потім 15 днів спадного.'],['Накшатра','одна з 27 ділянок неба, через які проходить Місяць; у кожній він буває приблизно добу.'],['Йога','величина панчанги, яку обчислюють із суми довгот Сонця й Місяця (27 значень).'],['Світанок і кінець сутінків','моменти, коли Сонце на 6° під горизонтом.']],
   glossNote:'Тітхі, накшатра та йога — поняття традиції джйотіш. Застосунок показує їх як календар, а не як доведений вплив.'},
  en:{partial:'available NOAA intervals',knownPeak:'highest available Kp',noaaSpan:'NOAA interval {a}–{b}',chartLabel:'Kp over the day: from {a} to {b}',stormLine:'storm',meterLabel:'Kp {v} of 9',staleShort:'NOAA data are out of date',inNakShort:'in the nakshatra {n}',fromNak:'from {t}: nakshatra {n}',fromTithi:'from {t}: {x}',stormHead:'{n} geomagnetic storm {g}',summary:'The day at a glance',today:'Today',field:'Magnetic field',moon:'Moon',sun:'Sun',experts:'For experts',earlier:'Earlier today ({n})',
   quiet:'quiet',unsettled:'slightly unsettled',active:'active, but not a storm yet',storm:'geomagnetic storm {g}',
   stormName:['','minor','moderate','strong','severe','extreme'],
   stormNote:['','Weak power grid fluctuations are possible; aurora is seen at high latitudes (NOAA scale).','Aurora down to 55° geomagnetic latitude; HF radio may fade at high latitudes (NOAA scale).','Intermittent satellite navigation and HF radio problems are possible; aurora down to 50° geomagnetic latitude (NOAA scale).','Satellite navigation may be degraded for hours; aurora down to 45° geomagnetic latitude (NOAA scale).','Widespread power grid and radio problems are possible; aurora down to 40° geomagnetic latitude (NOAA scale).'],
   noField:'no NOAA data',quietAll:'quiet all day',peakAt:'highest Kp {v} at {t}',
   parts:['at night','in the morning','in the afternoon','in the evening'],
   headStorm:'{d} {p}: {n} geomagnetic storm ({g})',headCalm:'{d}: the magnetic field is quiet',headBusy:'{d}: magnetic field {c} {p}',headMoon:'at {t} the Moon enters the nakshatra {n}',
   day:'day',twilight:'twilight',night:'night',
   tithiDay:'day {k} of the {p} Moon',waxing:'waxing',waning:'waning',full:'full Moon',newMoon:'new Moon',
   inNak:'Moon in the nakshatra {n}',toNak:'at {t} the Moon enters the nakshatra {n}',toTithi:'at {t} begins {x}',
   sunDay:'daylight {a}–{b}',sunNone:'The Sun does not rise or set on this date',at:'{e} at {t}',
   glossTitle:'What these words mean',
   gloss:[['Kp','index of disturbance of the Earth’s magnetic field from 0 to 9. NOAA gives it for every three hours. A geomagnetic storm starts at 5.'],['G1–G5','NOAA geomagnetic storm scale: G1 minor, G5 extreme.'],['Observed, preliminary estimate, forecast','NOAA labels its values: observed — already measured; preliminary estimate — the nearest intervals, estimated from current data; forecast — later intervals.'],['Lunar day (tithi)','one thirtieth of the lunar month: 15 days of the waxing Moon from new to full Moon, then 15 days of the waning Moon.'],['Nakshatra','one of the 27 sky sectors the Moon passes through; it stays in each for about a day.'],['Yoga','a panchanga value computed from the sum of the Sun and Moon longitudes (27 values).'],['Dawn and end of dusk','the moments when the Sun is 6° below the horizon.']],
   glossNote:'Tithi, nakshatra and yoga come from the Jyotish tradition. The app shows them as a calendar, not as a proven effect.'},
  es:{partial:'intervalos NOAA disponibles',knownPeak:'Kp más alto disponible',noaaSpan:'intervalo NOAA {a}–{b}',chartLabel:'Kp durante el día: de {a} a {b}',stormLine:'tormenta',meterLabel:'Kp {v} de 9',staleShort:'datos de NOAA desactualizados',inNakShort:'en el nakshatra {n}',fromNak:'desde las {t}: nakshatra {n}',fromTithi:'desde las {t}: {x}',stormHead:'tormenta geomagnética {n} {g}',summary:'Lo principal del día',today:'Hoy',field:'Campo magnético',moon:'Luna',sun:'Sol',experts:'Para expertos',earlier:'Antes hoy ({n})',
   quiet:'tranquilo',unsettled:'algo perturbado',active:'perturbado, pero aún no es una tormenta',storm:'tormenta geomagnética {g}',
   stormName:['','menor','moderada','fuerte','severa','extrema'],
   stormNote:['','Posibles fluctuaciones débiles en las redes eléctricas; auroras en latitudes altas (escala NOAA).','Auroras hasta 55° de latitud geomagnética; posible desvanecimiento de la radio de onda corta en latitudes altas (escala NOAA).','Posibles fallos intermitentes de navegación por satélite y de radio de onda corta; auroras hasta 50° de latitud geomagnética (escala NOAA).','La navegación por satélite puede degradarse durante horas; auroras hasta 45° de latitud geomagnética (escala NOAA).','Posibles fallos generalizados en redes eléctricas y radio; auroras hasta 40° de latitud geomagnética (escala NOAA).'],
   noField:'sin datos de NOAA',quietAll:'tranquilo todo el día',peakAt:'Kp máximo {v} a las {t}',
   parts:['de noche','por la mañana','por la tarde','al anochecer'],
   headStorm:'{d} {p}: tormenta geomagnética {n} ({g})',headCalm:'{d}: campo magnético tranquilo',headBusy:'{d}: campo magnético {c} {p}',headMoon:'a las {t} la Luna entra en el nakshatra {n}',
   day:'día',twilight:'crepúsculo',night:'noche',
   tithiDay:'día {k} de la Luna {p}',waxing:'creciente',waning:'menguante',full:'luna llena',newMoon:'luna nueva',
   inNak:'Luna en el nakshatra {n}',toNak:'a las {t} la Luna entra en el nakshatra {n}',toTithi:'a las {t} empieza {x}',
   sunDay:'luz del día {a}–{b}',sunNone:'El Sol no sale o no se pone en esta fecha',at:'{e} a las {t}',
   glossTitle:'Qué significan estas palabras',
   gloss:[['Kp','índice de perturbación del campo magnético terrestre de 0 a 9. NOAA lo da para cada tres horas. Desde 5 empieza una tormenta geomagnética.'],['G1–G5','escala de tormentas geomagnéticas de NOAA: G1 menor, G5 extrema.'],['Observado, estimación preliminar, pronóstico','así marca NOAA sus valores: observado, ya medido; estimación preliminar, los intervalos más próximos estimados con datos actuales; pronóstico, los intervalos posteriores.'],['Día lunar (tithi)','la trigésima parte del mes lunar: 15 días de Luna creciente de luna nueva a llena y luego 15 de Luna menguante.'],['Nakshatra','uno de los 27 sectores del cielo que recorre la Luna; pasa en cada uno cerca de un día.'],['Yoga','valor del panchanga calculado con la suma de las longitudes del Sol y la Luna (27 valores).'],['Alba y fin del crepúsculo','momentos en que el Sol está 6° bajo el horizonte.']],
   glossNote:'Tithi, nakshatra y yoga proceden de la tradición Jyotish. La aplicación los muestra como calendario, no como efecto demostrado.'},
  fr:{partial:'intervalles NOAA disponibles',knownPeak:'Kp disponible le plus élevé',noaaSpan:'intervalle NOAA {a}–{b}',chartLabel:'Kp sur la journée : de {a} à {b}',stormLine:'orage',meterLabel:'Kp {v} sur 9',staleShort:'données NOAA périmées',inNakShort:'dans le nakshatra {n}',fromNak:'dès {t} : nakshatra {n}',fromTithi:'dès {t} : {x}',stormHead:'orage géomagnétique {n} {g}',summary:'L’essentiel du jour',today:'Aujourd’hui',field:'Champ magnétique',moon:'Lune',sun:'Soleil',experts:'Pour les connaisseurs',earlier:'Plus tôt aujourd’hui ({n})',
   quiet:'calme',unsettled:'légèrement perturbé',active:'perturbé, mais pas encore un orage',storm:'orage géomagnétique {g}',
   stormName:['','mineur','modéré','fort','sévère','extrême'],
   stormNote:['','Faibles fluctuations possibles des réseaux électriques ; aurores aux hautes latitudes (échelle NOAA).','Aurores jusqu’à 55° de latitude géomagnétique ; affaiblissement possible de la radio à ondes courtes aux hautes latitudes (échelle NOAA).','Perturbations intermittentes possibles de la navigation par satellite et de la radio à ondes courtes ; aurores jusqu’à 50° de latitude géomagnétique (échelle NOAA).','La navigation par satellite peut être dégradée pendant des heures ; aurores jusqu’à 45° de latitude géomagnétique (échelle NOAA).','Pannes étendues possibles des réseaux électriques et de la radio ; aurores jusqu’à 40° de latitude géomagnétique (échelle NOAA).'],
   noField:'pas de données NOAA',quietAll:'calme toute la journée',peakAt:'Kp maximal {v} à {t}',
   parts:['la nuit','le matin','l’après-midi','le soir'],
   headStorm:'{d} {p} : orage géomagnétique {n} ({g})',headCalm:'{d} : champ magnétique calme',headBusy:'{d} : champ magnétique {c} {p}',headMoon:'à {t}, la Lune entre dans le nakshatra {n}',
   day:'jour',twilight:'crépuscule',night:'nuit',
   tithiDay:'jour {k} de la Lune {p}',waxing:'croissante',waning:'décroissante',full:'pleine lune',newMoon:'nouvelle lune',
   inNak:'Lune dans le nakshatra {n}',toNak:'à {t}, la Lune entre dans le nakshatra {n}',toTithi:'à {t} commence {x}',
   sunDay:'jour {a}–{b}',sunNone:'Le Soleil ne se lève pas ou ne se couche pas ce jour-là',at:'{e} à {t}',
   glossTitle:'Que signifient ces mots',
   gloss:[['Kp','indice de perturbation du champ magnétique terrestre de 0 à 9. La NOAA le donne pour chaque tranche de trois heures. Un orage géomagnétique commence à 5.'],['G1–G5','échelle NOAA des orages géomagnétiques : G1 mineur, G5 extrême.'],['Observé, estimation préliminaire, prévision','ainsi la NOAA marque ses valeurs : observé, déjà mesuré ; estimation préliminaire, les intervalles les plus proches estimés à partir des données actuelles ; prévision, les intervalles suivants.'],['Jour lunaire (tithi)','trentième partie du mois lunaire : 15 jours de Lune croissante de la nouvelle à la pleine lune, puis 15 jours de Lune décroissante.'],['Nakshatra','l’un des 27 secteurs du ciel que traverse la Lune ; elle reste environ un jour dans chacun.'],['Yoga','valeur du panchanga calculée à partir de la somme des longitudes du Soleil et de la Lune (27 valeurs).'],['Aube et fin du crépuscule','moments où le Soleil est à 6° sous l’horizon.']],
   glossNote:'Tithi, nakshatra et yoga viennent de la tradition Jyotish. L’application les montre comme un calendrier, pas comme un effet démontré.'}
 };
 function plainCopy(){return plainWords[root.NRLocale?.language]||plainWords.uk;}
 function fill(text,vars){return Object.keys(vars).reduce((s,k)=>s.split('{'+k+'}').join(String(vars[k])),text);}
 function kpClass(kp){return kp>=5?'storm':kp>=4?'active':kp>=3?'unsettled':'quiet';}
 function stormLevel(row){const g=/^G([1-5])$/.exec(row?.scale||'');return g?Number(g[1]):row&&row.kp>=5?Math.min(5,Math.floor(row.kp)-4):0;}
 function tithiText(n,p,lang){
  if(n===15)return p.full;if(n===30)return p.newMoon;
  return fill(p.tithiDay,{k:((n-1)%15)+1,p:n<=15?p.waxing:p.waning});
 }
 function sunLight(loc,at){
  const A=root.Astronomy;if(!A)return null;
  try{const obs=new A.Observer(loc.lat,loc.lon,loc.elevation||0),time=new Date(at),eq=A.Equator('Sun',time,obs,true,true),alt=A.Horizon(time,obs,eq.ra,eq.dec,'normal').altitude;return alt>0?'day':alt>-6?'twilight':'night';}catch(_){return null;}
 }
 function mountDayStrip(host,ds,active=true){
  if(!host)return;
  host.hidden=!active;
  if(!active||!/^\d{4}-\d{2}-\d{2}$/.test(ds||''))return;
  const w=stripCopy(),loc=stripPlace(),lang=root.NRLocale?.language||'uk',locale=root.NRLocale?.locale||'uk-UA';
  const key=[ds,loc.lat,loc.lon,loc.zone,lang].join('|');
  const age=Date.now()-Number(host.dataset.stripAt||0);
  if(host.dataset.stripKey===key&&((host.dataset.stripState==='ready'&&age<5*60000)||(host.dataset.stripState==='loading'&&age<30000)))return;
  host.dataset.stripKey=key;host.dataset.stripState='loading';host.dataset.stripAt=String(Date.now());
  const request=Symbol();host.stripRequest=request;
  const clock=new Intl.DateTimeFormat(locale,{timeZone:loc.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
  const {start,end}=civilBounds(ds,loc.zone);
  const blocks=[];
  for(let s=Math.floor(start/SLOT)*SLOT;s<end;s+=SLOT)blocks.push({slot:s,from:Math.max(s,start),to:Math.min(s+SLOT,end)});
  const title=node('h3','sr-ds-title',w.title);title.id='srDayStripTitle';
  host.setAttribute('aria-labelledby',title.id);
  const placeName=root.SRSkyTime?.placeLabel?.(loc)||root.SRSkyTime?.cityLabel?.(loc)||loc.label||(Math.abs(loc.lat-50.454)<0.05&&Math.abs(loc.lon-30.524)<0.05?root.SRSkyTime?.cityLabel?.({cityId:'kyiv'}):'')||'';
  const lead=node('p','sr-ds-lead',w.lead);
  const where=node('p','sr-ds-place',w.place+': '+(placeName?placeName+' · ':'')+loc.zone);
  const kpState=node('p','sr-ds-kpstate',w.loadingKp);kpState.setAttribute('aria-live','polite');
  const list=node('ol','sr-ds-list');
  const note=node('p','sr-ds-note',w.note);
  host.replaceChildren(title,list,where,kpState,lead,note);
  const p=plainCopy();
  const partOf=at=>{const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:loc.zone,hour:'2-digit',hourCycle:'h23'}).format(at));return p.parts[h<6?0:h<12?1:h<18?2:3];};
  const isToday=root.NRCivilTime.dayKey(Date.now(),loc.zone)===ds;
  const dayWord=isToday?p.today:new Intl.DateTimeFormat(locale,{timeZone:loc.zone,day:'numeric',month:'long'}).format(start+DAY/2);
  const span=b=>clock.format(b.from)+'–'+(b.to===end?'24:00':clock.format(b.to));
  const summary=node('section','sr-ds-summary');
  host.insertBefore(summary,list);
  const glossary=node('details','sr-ds-gloss');glossary.append(node('summary','',p.glossTitle));
  const dl=node('dl');for(const [term,text] of p.gloss){dl.append(node('dt','',term),node('dd','',text));}
  glossary.append(dl,node('p','sr-ds-gloss-note',p.glossNote));
  note.after(glossary);
  const skyNotes=blocks.map(b=>root.NRForecastDayTimeline?.skyNotes(loc,(b.from+b.to)/2)||[]);
  const light=blocks.map(b=>sunLight(loc,(b.from+b.to)/2));
  const draw=(kp,panch,sky)=>{
   if(host.stripRequest!==request)return;
   const now=Date.now(),rows=[],past=[];
   const label=(kind,value)=>root.SkyRhythmI18n?.name?root.SkyRhythmI18n.name(kind,value,lang):String(value);
   const kpOk=!!(kp&&!kp.error&&!kp.stale);
   const dayCovered=kpOk&&blocks.some(b=>kp.slots.has(b.slot));
   const partial=dayCovered&&blocks.some(b=>!kp.slots.has(b.slot));
   const all=panch&&!panch.error?panch.events.map(e=>({...e,ms:Date.parse(e.at)})).filter(e=>STRIP_KINDS.includes(e.kind)):[];
   let state=panch&&!panch.error?{...panch.initial}:null,events=all.slice();
   const moonChanges=[];
   blocks.forEach((b,index)=>{
    const item=node('li','sr-ds-block');item.dataset.slot=new Date(b.slot).toISOString();
    if(light[index])item.dataset.light=light[index];
    const current=now>=b.from&&now<b.to;
    if(current){item.setAttribute('aria-current','time');item.classList.add('is-now');}
    const row=kpOk?kp.slots.get(b.slot):null;
    if(row)item.dataset.kp=String(row.kp);
    // Block headline: storm first, then the Moon change, then the Sun event, otherwise the field state.
    const inside=sky.filter(e=>e.at>=b.from&&e.at<b.to);
    if(state)for(const e of events)if(e.ms<=b.from)state[e.kind]=e.to;
    if(state)events=events.filter(e=>e.ms>b.from);
    const changes=state?events.filter(e=>e.ms<b.to):[];
    const nakChange=changes.find(e=>e.kind==='nakshatra'),tithiChange=changes.find(e=>e.kind==='tithi');
    const level=stormLevel(row);
    let headline;
    if(row&&level)headline=fill(p.stormHead,{n:p.stormName[level],g:'G'+level});
    else if(nakChange)headline=fill(p.toNak,{t:clock.format(nakChange.ms),n:label('nakshatra',nakChange.to)});
    else if(tithiChange)headline=fill(p.toTithi,{t:clock.format(tithiChange.ms),x:tithiText(tithiChange.to,p,lang)});
    else if(inside.length)headline=fill(p.at,{t:clock.format(inside[0].at),e:inside[0].label});
    else{headline=p.field+': '+(row?p[kpClass(row.kp)]:kp&&kp.stale?p.staleShort:p.noField);item.dataset.fieldHeadline='';}
    headline=headline.charAt(0).toUpperCase()+headline.slice(1);
    for(const e of changes)moonChanges.push(e);
    const head=node('p','sr-ds-time');
    const time=node('time','',span(b));time.dateTime=new Date(b.from).toISOString();
    head.append(time);
    if(light[index])head.append(node('span','sr-ds-light',' · '+p[light[index]]));
    if(current)head.append(node('span','sr-ds-now',' · '+w.now));
    if(offsetAt(b.from,loc.zone)!==offsetAt(b.to-1,loc.zone))head.append(node('span','sr-ds-shift',' · '+w.clockShift));
    const skyButton=node('button','sr-ds-sky-open',w.openSky);skyButton.type='button';skyButton.dataset.stripSky='';
    const at=current?now:b.from;skyButton.dataset.at=new Date(at).toISOString();
    skyButton.setAttribute('aria-label',w.skyAt.replace('{t}',clock.format(at)));
    skyButton.addEventListener('click',()=>{const live=item.classList.contains('is-now')&&Date.now()>=b.from&&Date.now()<b.to;root.SRSkyTime?.selectMoment?.(live?new Date().toISOString():skyButton.dataset.at);root.fp434Go?.('panch',true);});
    head.append(skyButton);
    const title=node('p','sr-ds-headline',headline);
    const kpLine=node('p','sr-ds-kp');kpLine.append(node('b','',p.field+': '));
    if(kp===null)kpLine.append('…');
    else if(!kpOk)kpLine.append('—');
    else if(row){const meter=node('span','sr-ds-meter');meter.setAttribute('role','meter');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','9');meter.setAttribute('aria-valuenow',String(row.kp));meter.setAttribute('aria-label',fill(p.meterLabel,{v:number.format(row.kp)}));meter.dataset.tone=kpClass(row.kp);const fillBar=node('span');fillBar.style.width=Math.max(2,row.kp/9*100).toFixed(1)+'%';meter.append(fillBar);kpLine.append(meter,(item.dataset.fieldHeadline===undefined?p[kpClass(row.kp)].replace('{g}','G'+level)+' · ':'')+'Kp '+number.format(row.kp)+' ('+w[row.state]+')'+((b.from!==b.slot||b.to!==b.slot+SLOT)?' · '+fill(p.noaaSpan,{a:clock.format(b.slot),b:clock.format(b.slot+SLOT)}):''));if(level)kpLine.append(node('span','sr-ds-storm-note',' '+p.stormNote[level]));}
    else kpLine.append(dayCovered?w.noKp:'—');
    const mLine=node('p','sr-ds-jyotish');mLine.append(node('b','',p.moon+': '));
    const expert=node('p','sr-ds-expert');
    if(panch===null)mLine.append(w.loading);
    else if(panch.error)mLine.append(w.noPanch);
    else{
     mLine.append(tithiText(state.tithi,p,lang)+', '+fill(p.inNakShort,{n:label('nakshatra',state.nakshatra)}));
     for(const e of changes.filter(e=>e.kind!=='yoga'))mLine.append(node('span','sr-ds-change',e.kind==='nakshatra'?fill(p.fromNak,{t:clock.format(e.ms),n:label('nakshatra',e.to)}):fill(p.fromTithi,{t:clock.format(e.ms),x:tithiText(e.to,p,lang)})));
     expert.append(node('b','',p.experts+': '),w.tithi+' '+label('tithi',state.tithi)+' · '+w.yoga+' '+label('yoga',state.yoga));
     for(const e of changes.filter(e=>e.kind==='yoga'))expert.append(' → '+clock.format(e.ms)+' '+w.yoga+' '+label('yoga',e.to));
    }
    const sLine=node('p','sr-ds-sky');sLine.append(node('b','',w.sky+': '));
    sLine.append(inside.length?inside.map(e=>clock.format(e.at)+' '+e.label).join(' · '):w.quiet);
    for(const note of skyNotes[index])sLine.append(node('span','sr-ds-change',note));
    item.append(head,title,kpLine,mLine,sLine);
    if(expert.childNodes.length)item.append(expert);
    if(isToday&&b.to<=now)past.push(item);else rows.push(item);
   });
   const items=[];
   if(past.length){
    const wrap=node('li','sr-ds-past'),box=node('details'),inner=node('ol','sr-ds-list');
    box.append(node('summary','',fill(p.earlier,{n:past.length})),inner);inner.append(...past);wrap.append(box);items.push(wrap);
   }
   items.push(...rows);
   list.replaceChildren(...items);
   const kpRows=[...past,...rows].filter(r=>r.dataset.kp!==undefined);
   const kpValues=kpRows.map(r=>Number(r.dataset.kp));
   if(kpRows.length>1&&Math.max(...kpValues)>Math.min(...kpValues)){const top=Math.max(...kpValues);for(const r of kpRows)if(Number(r.dataset.kp)===top){r.classList.add('is-peak');r.querySelector('.sr-ds-kp').append(node('span','sr-ds-peak',' · '+(partial?p.knownPeak:w.peak)));}}
   if(kpOk&&!dayCovered)kpState.textContent=w.noDayKp;
   else if(kpOk)kpState.textContent=hourlyCopy()[1]+' · '+new Intl.DateTimeFormat(locale,{timeZone:loc.zone,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(kp.at)+' ('+loc.zone+')';
   else if(kp)kpState.textContent=kp.error?w.failKp:w.staleKp;
   // Day summary: a news-style headline and three plain lines.
   const covered=kpOk?blocks.map(b=>({b,row:kp.slots.get(b.slot)})).filter(x=>x.row):[];
   const peak=covered.reduce((m,x)=>!m||x.row.kp>m.row.kp?x:m,null);
   const firstNak=moonChanges.find(e=>e.kind==='nakshatra');
   let news;
   if(peak&&stormLevel(peak.row))news=fill(p.headStorm,{d:dayWord,p:partOf(peak.b.from),n:p.stormName[stormLevel(peak.row)],g:'G'+stormLevel(peak.row)});
   else if(peak&&peak.row.kp>=3)news=fill(p.headBusy,{d:dayWord,c:p[kpClass(peak.row.kp)],p:partOf(peak.b.from)});
   else if(peak&&!partial)news=fill(p.headCalm,{d:dayWord})+(firstNak?'; '+fill(p.headMoon,{t:clock.format(firstNak.ms),n:label('nakshatra',firstNak.to)}):'');
   else news=dayWord+(firstNak?': '+fill(p.headMoon,{t:clock.format(firstNak.ms),n:label('nakshatra',firstNak.to)}):'');
   const fieldText=!kp?w.loadingKp:kp.stale?p.staleShort:!kpOk||!peak?p.noField:partial?p.partial+' · '+p[kpClass(peak.row.kp)]+' · '+p.knownPeak+' '+number.format(peak.row.kp):peak.row.kp<3?p.quietAll:(stormLevel(peak.row)?fill(p.stormHead,{n:p.stormName[stormLevel(peak.row)],g:'G'+stormLevel(peak.row)}):p[kpClass(peak.row.kp)])+', '+fill(p.peakAt,{v:number.format(peak.row.kp),t:clock.format(peak.b.slot)+'–'+clock.format(peak.b.slot+SLOT)});
   const moonText=panch===null?w.loading:panch.error?w.noPanch:(moonChanges.filter(e=>e.kind!=='yoga').map(e=>e.kind==='nakshatra'?fill(p.toNak,{t:clock.format(e.ms),n:label('nakshatra',e.to)}):fill(p.toTithi,{t:clock.format(e.ms),x:tithiText(e.to,p,lang)})).join('; ')||(tithiText(panch.initial.tithi,p,lang)+', '+fill(p.inNakShort,{n:label('nakshatra',panch.initial.nakshatra)})));
   const rise=sky.find(e=>e.label===w.sunrise),set=sky.find(e=>e.label===w.sunset);
   const sunText=rise&&set?fill(p.sunDay,{a:clock.format(rise.at),b:clock.format(set.at)}):p.sunNone;
   const lines=node('ul','sr-ds-summary-lines');
   for(const [k,v] of [[p.field,fieldText],[p.moon,moonText],[p.sun,sunText]]){const li=node('li');li.append(node('b','',k+': '),v);lines.append(li);}
   const parts=[node('h4','sr-ds-summary-title',p.summary),node('p','sr-ds-news',news.charAt(0).toUpperCase()+news.slice(1)),lines];
   if(covered.length>1){
    const NS='http://www.w3.org/2000/svg',W=300,H=86,top=8,base=62,n=blocks.length,bw=W/n;
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('class','sr-ds-chart');svg.setAttribute('role','img');
    const values=covered.map(x=>x.row.kp);svg.setAttribute('aria-label',fill(p.chartLabel,{a:number.format(Math.min(...values)),b:number.format(Math.max(...values))}));
    const el=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
    const y=v=>base-(v/9)*(base-top);
    el('line',{x1:0,x2:W,y1:y(5),y2:y(5),class:'sr-ds-chart-storm'});el('text',{x:W-2,y:y(5)-3,'text-anchor':'end',class:'sr-ds-chart-label'},p.stormLine);
    el('line',{x1:0,x2:W,y1:base,y2:base,class:'sr-ds-chart-base'});
    blocks.forEach((b,i)=>{
     const row=kp.slots.get(b.slot),x=i*bw;
     if(light[i])el('rect',{x:x,y:base+2,width:bw,height:5,class:'sr-ds-chart-light',['data-light']:light[i]});
     if(row){const r=el('rect',{x:x+bw*.18,y:y(row.kp),width:bw*.64,height:Math.max(1.5,base-y(row.kp)),rx:2,class:'sr-ds-chart-bar',['data-tone']:kpClass(row.kp)});if(now>=b.from&&now<b.to)r.classList.add('is-now');}
     if(i%2===0)el('text',{x:x+bw/2,y:H-4,'text-anchor':'middle',class:'sr-ds-chart-label'},clock.format(b.from));
    });
    parts.push(svg);
   }
   summary.replaceChildren(...parts);
  };
  const sky=skyEvents(loc,start,end,w);
  let kp=null,panch=null;
  draw(kp,panch,sky);
  const done=()=>{if(host.stripRequest===request&&kp!==null&&panch!==null)host.dataset.stripState='ready';};
  stripKp().then(v=>{kp=v;},()=>{kp={error:true};}).then(()=>{draw(kp,panch,sky);done();});
  // D6: move the «зараз» mark and refresh the receipt state at the next block edge while the strip stays open.
  clearTimeout(host.stripTimer);
  const edge=blocks.find(b=>b.to>Date.now());
  if(edge)host.stripTimer=setTimeout(()=>{if(host.isConnected&&!host.hidden&&host.stripRequest===request){host.dataset.stripAt='0';mountDayStrip(host,ds,true);}},Math.min(edge.to-Date.now()+1000,3*3600000));
  stripPanchanga(ds,loc).then(v=>{panch=v;},()=>{panch={error:true};}).then(()=>{draw(kp,panch,sky);done();});
 }
 const api=Object.freeze({tab:()=>words().tab,mount,parse,daySlots,score,hourlyOutlook,archivedDayIntervals,mountHourly,mountDayStrip});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.NRThreeDayForecast=api;
})(globalThis);
