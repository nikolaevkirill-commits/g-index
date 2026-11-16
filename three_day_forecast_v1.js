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
  uk:{tab:'3 дні',choose:'Оберіть день',score:'Власний бал',method:'2 − максимум Kp за місцевою добою, шкала від −3 до +3',kp:'NOAA · кожні 3 години',status:'Час оновлення NOAA',live:'Отримано з NOAA',cached:'Збережена копія NOAA',offline:'Офлайн',stale:'Дані NOAA застаріли',missing:'Актуальні дані NOAA недоступні',loading:'Оновлюємо NOAA…',refresh:'Оновити NOAA',noValue:'Немає даних',observed:'Спостереження',estimated:'Попередня оцінка',predicted:'Прогноз',clock:'Місцевий час',partial:'Для бала потрібні всі інтервали, що починаються цієї доби.',advice:'Календарні застереження',adviceScope:'Для відповідних нових справ за традицією. Окремо від бала.',clear:'Рікти та Санкранті на цю дату немає.',calendarMissing:'Календарні інтервали недоступні.',rikta:'Рікта',sankranti:'Санкранті'},
  en:{tab:'3 days',choose:'Choose a day',score:'Our score',method:'2 − maximum Kp for the local day, scale −3 to +3',kp:'NOAA · every 3 hours',status:'NOAA update time',live:'Retrieved from NOAA',cached:'Saved NOAA copy',offline:'Offline',stale:'NOAA data are out of date',missing:'Current NOAA data are unavailable',loading:'Updating NOAA…',refresh:'Refresh NOAA',noValue:'No data',observed:'Observed',estimated:'Preliminary estimate',predicted:'Forecast',clock:'Local time',partial:'The score requires all intervals starting on this local date.',advice:'Calendar cautions',adviceScope:'For relevant new undertakings in the tradition. Separate from the score.',clear:'No Rikta or Sankranti on this date.',calendarMissing:'Calendar intervals are unavailable.',rikta:'Rikta',sankranti:'Sankranti'},
  es:{tab:'3 días',choose:'Elige un día',score:'Nuestra puntuación',method:'2 − Kp máximo del día local, escala de −3 a +3',kp:'NOAA · cada 3 horas',status:'Actualización de NOAA',live:'Datos de NOAA',cached:'Copia guardada de NOAA',offline:'Sin conexión',stale:'Datos NOAA desactualizados',missing:'Sin datos recientes de NOAA',loading:'Actualizando NOAA…',refresh:'Actualizar NOAA',noValue:'Sin datos',observed:'Observación',estimated:'Estimación preliminar',predicted:'Pronóstico',clock:'Hora local',partial:'La puntuación requiere todos los intervalos que empiezan en esta fecha local.',advice:'Avisos del calendario',adviceScope:'Para nuevos comienzos según la tradición. Fuera de la puntuación.',clear:'Sin Rikta ni Sankranti en esta fecha.',calendarMissing:'Intervalos del calendario no disponibles.',rikta:'Rikta',sankranti:'Sankranti'},
  fr:{tab:'3 jours',choose:'Choisir un jour',score:'Notre note',method:'2 − Kp maximal du jour local, échelle de −3 à +3',kp:'NOAA · toutes les 3 heures',status:'Mise à jour NOAA',live:'Données de NOAA',cached:'Copie NOAA enregistrée',offline:'Hors ligne',stale:'Données NOAA périmées',missing:'Données NOAA à jour indisponibles',loading:'Mise à jour NOAA…',refresh:'Actualiser NOAA',noValue:'Pas de données',observed:'Observation',estimated:'Estimation préliminaire',predicted:'Prévision',clock:'Heure locale',partial:'La note exige tous les intervalles qui commencent à cette date locale.',advice:'Avis du calendrier',adviceScope:'Pour les nouveaux projets selon la tradition. En dehors de la note.',clear:'Aucun Rikta ni Sankranti à cette date.',calendarMissing:'Intervalles du calendrier indisponibles.',rikta:'Rikta',sankranti:'Sankranti'}
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

 let pending=null, reading=null, lastAttempt=-Infinity, problem=false, restored=false;
 async function request(url,signal){
  const response=await fetch(url,{cache:'no-store',credentials:'omit',signal});
  if(!response.ok)throw Error('NOAA HTTP '+response.status);
  return response;
 }
 function snapshot(slots,at,source){
  const now=Date.now();
  if(!Number.isFinite(at)||at>now+5*60000)throw Error('Invalid NOAA timestamp');
  // A current HTTP header cannot make an old observation series fresh.
  const seen=[...slots.values()].filter(r=>r.state==='observed'&&r.start<=now).map(r=>r.start+SLOT);
  return {slots,at,source,validThrough:Math.min(at,Math.max(-Infinity,...seen))+MAX_AGE};
 }
 function storedSnapshot(){
  try{
   const json=localStorage.getItem(SAVED_NOAA);
   if(!json||json.length>MAX_SAVED_LENGTH)return null;
   const {rows,at}=JSON.parse(json);
   return snapshot(parse(rows),at,'cached');
  }catch{return null;}
 }
 function storeSnapshot(snapshot){
  if(snapshot.validThrough<Date.now())return;
  try{
   if((storedSnapshot()?.validThrough??-Infinity)>snapshot.validThrough)return;
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
 async function refresh(force=false){
  if(!restored){restored=true;reading=storedSnapshot();}
  if(pending||!navigator.onLine||Date.now()-lastAttempt<(force?5000:10*60000))return pending;
  lastAttempt=Date.now();
  problem=false;
  pending=(async()=>{
   let next=null;
   try{next=await direct();}catch{}
   if(!next||next.validThrough<Date.now()){
    try{const cached=await archived();if(!next||cached.validThrough>next.validThrough)next=cached;}catch{}
   }
   if(next&&(!reading||next.validThrough>=reading.validThrough)){
    reading=next;
    storeSnapshot(next);
   }
   problem=!next||next.validThrough<Date.now();
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
    if(ingress!==null){
     const start=Math.max(+span.start,ingress-MARGIN),end=Math.min(+span.end,ingress+MARGIN);
     if(start<end)rows.push({key:'sankranti',start,end});
    }
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
  summary.append(node('h3','',w.score),node('strong','',formatScore(value)),node('small','',value===null?w.partial:w.method));
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
   +(!navigator.onLine?' · '+w.offline:''));
  status.setAttribute('role','status');
  const list=node('ul','sr-3d-slots');
  // Intervals are displayed once under their local start date; the end
  // date remains visible on slots that cross midnight.
  for(const row of dayRows){
   const item=node('li','');
   item.dataset.utc=new Date(row.start).toISOString();
   if(row.scale)item.dataset.storm=row.scale;
   const detail=row.kp===null?w.noValue:w[row.state];
   item.append(node('time','',localRange(row.start,row.start+SLOT)),
    node('b','',row.kp===null?'—':'Kp '+number.format(row.kp)+(row.scale?' · '+row.scale:'')),
    node('small','',detail));
   list.append(item);
  }
  forecast.append(header,status,list);
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
  root.addEventListener('online',()=>{if(visible()){refresh(true);redraw();}});
  for(const event of ['offline','nr:locale'])root.addEventListener(event,redraw);
  document.addEventListener('nr:location',redraw);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  root.setInterval(()=>{if(!document.hidden)update();},10*60000);
 }
 const api=Object.freeze({tab:()=>words().tab,mount,parse,daySlots,score});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.NRThreeDayForecast=api;
})(globalThis);
