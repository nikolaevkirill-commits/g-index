/* One session clock for the civil-day Sun view and the local sky. No forecast inputs. */
(() => {
'use strict';
const KYIV={lat:50.454,lon:30.524,zone:'Europe/Kyiv',example:true};
const DAY=86400000, PLAY_MS=16000, STEP_MS=72;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const reducedData=matchMedia('(prefers-reduced-data: reduce)');
const html=document.documentElement;
const language=()=>['uk','en','es','fr'].indexOf(window.NRLocale?.language||'uk');
const copy={
 sun:['Сонце над горизонтом','Sun above the horizon','Sol sobre el horizonte','Soleil au-dessus de l’horizon'],
 below:['Сонце під горизонтом','Sun below the horizon','Sol bajo el horizonte','Soleil sous l’horizon'],
 title:['Шлях Сонця','Sun path','Trayectoria solar','Trajectoire solaire'],
 day:['Час доби','Time of day','Hora del día','Heure de la journée'],
 play:['▶ Доба','▶ Play day','▶ Reproducir día','▶ Lire la journée'],
 pause:['Ⅱ Пауза','Ⅱ Pause','Ⅱ Pausa','Ⅱ Pause'],
 now:['Зараз','Now','Ahora','Maintenant'],
 selected:['Вибраний час','Selected time','Hora elegida','Heure choisie'],
 running:['Відтворення доби','Day playback','Reproducción del día','Lecture de la journée'],
 example:['Київ · типове місце','Kyiv · default location','Kyiv · lugar predeterminado','Kyiv · lieu par défaut'],
 open:['Небо →','Sky →','Cielo →','Ciel →'],
 motion:['Для програвання ввімкніть анімації. Час можна обрати вручну.','Turn on motion for playback. You can still choose a time.','Activa las animaciones para reproducir. Puedes elegir la hora.','Activez les animations pour lire la journée. Vous pouvez choisir l’heure.'],
 unavailable:['Шлях Сонця недоступний','Sun path unavailable','Trayectoria solar no disponible','Trajectoire solaire indisponible']
};
const t=k=>copy[k][Math.max(0,language())];
let selected=null, playing=false, frame=0, rangeCache, exampleChosen=false;
let today, chartKey, formatterKey, formatter, dateFormatter;

function place(example=false){
 const loc=window.NRLocalContext?.current?.();
 return window.NRLocalContext?.valid(loc,false)?loc:(example||exampleChosen?KYIV:null);
}
function localDay(at,zone){
 const key=NRCivilTime.dayKey(at,zone);
 if(rangeCache?.date===key&&rangeCache.zone===zone)return rangeCache;
 const noon=Date.parse(key+'T12:00:00Z');
 // Find the first real instant of the date and the first of the next date.
 // Comparing civil dates also handles days with 23 or 25 hours.
 function boundary(next){
  let lo=noon-2*DAY,hi=noon+2*DAY;
  while(hi-lo>1){
   const mid=Math.floor((lo+hi)/2);
   const date=NRCivilTime.dayKey(mid,zone);
   if(next?date>key:date>=key)hi=mid;
   else lo=mid;
  }
  return hi;
 }
 rangeCache={date:key,zone,start:boundary(false),end:boundary(true)};
 return rangeCache;
}
function allowed(){
 return !document.hidden&&html.classList.contains('sr-sky-motion')&&!html.classList.contains('nr-design-motion-off')&&
  !reduced.matches&&!reducedData.matches&&!navigator.connection?.saveData;
}
function snapshot(){
 const loc=place(), zone=(loc||KYIV).zone, at=selected??Date.now();
 return {...localDay(at,zone),at,loc,mode:playing?'playing':selected===null?'now':'selected',allowed:allowed()};
}
function timeText(at,zone){
 const locale=window.NRLocale?.locale||'uk-UA',key=locale+'|'+zone;
 if(formatterKey!==key){formatter=new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});dateFormatter=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'numeric',month:'short'});formatterKey=key;}
 return formatter.format(at);
}
function sun(at,loc){
 const obs=new Astronomy.Observer(loc.lat,loc.lon,loc.elevation||0);
 const time=new Date(at);
 const eq=Astronomy.Equator('Sun',time,obs,true,true);
 return Astronomy.Horizon(time,obs,eq.ra,eq.dec,'normal').altitude;
}
function light(alt){return Math.max(0,Math.min(1,(alt+12)/27));}
function notify(){
 const state=snapshot();
 if(today?.closest('.nr-route.active'))renderToday(state);
 window.dispatchEvent(new CustomEvent('sr:sky-time',{detail:state}));
}
function stop(){
 if(!playing)return;
 cancelAnimationFrame(frame);playing=false;
}
function seek(value){
 stop();const s=snapshot();
 selected=Math.round(s.start+(s.end-s.start-1)*Number(value)/1000);
 notify();
}
function live(){stop();selected=null;notify();}
function toggle(){
 if(playing){stop();notify();return;}
 if(!allowed())return;
 const s=snapshot(), length=s.end-s.start-1;
 const from=s.mode==='now'||s.at>=s.end-1000?s.start:s.at;
 selected=from;playing=true;
 const started=performance.now();
 let previous=-Infinity;
 function step(now){
  if(!allowed()){stop();notify();return;}
  const next=Math.min(s.end-1,from+(now-started)*length/PLAY_MS);
  if(now-previous>=STEP_MS||next>=s.end-1){
   selected=Math.round(next);previous=now;
   if(next>=s.end-1)stop();
   notify();
  }
  if(playing)frame=requestAnimationFrame(step);
 }
 notify();frame=requestAnimationFrame(step);
}
function controls(host){
 const el=document.createElement('div');
 el.className='sr-time-controls';
 el.innerHTML='<label><span data-time-label></span><input type="range" min="0" max="1000" step="1" value="0"></label><div><button type="button" data-time-play></button><button type="button" data-time-now></button><time></time></div><small data-time-mode></small>';
 const range=el.querySelector('input'),play=el.querySelector('[data-time-play]'),now=el.querySelector('[data-time-now]');
 range.addEventListener('input',()=>seek(range.value));play.onclick=toggle;now.onclick=live;
 host.append(el);
 return s=>{
  const time=timeText(s.at,s.zone);
  el.querySelector('[data-time-label]').textContent=t('day');
  range.value=Math.floor((s.at-s.start)/(s.end-s.start-1)*1000);
  range.setAttribute('aria-valuetext',time+' · '+s.zone);
  play.textContent=t(s.mode==='playing'?'pause':'play');
  play.disabled=!s.allowed;
  play.title=s.allowed?'':t('motion');
  play.setAttribute('aria-pressed',String(s.mode==='playing'));
  now.textContent=t('now');now.setAttribute('aria-pressed',String(s.mode==='now'));
  const stamp=el.querySelector('time');stamp.dateTime=new Date(s.at).toISOString();stamp.textContent=time;
  el.querySelector('[data-time-mode]').textContent=t(s.mode==='playing'?'running':s.mode==='selected'?'selected':'now')+' · '+dateFormatter.format(s.at)+' · '+s.zone;
  el.dataset.mode=s.mode;
 };
}
let updateControls;
const X=f=>18+354*f, Y=h=>51-.48*h;
function renderToday(s){
 const loc=place(true), panel=today, svg=panel.querySelector('svg'), key=[s.start,s.end,loc.lat,loc.lon,loc.elevation].join('|');
 try{
  if(chartKey!==key){
   const samples=Array.from({length:73},(_,i)=>{
    const f=i/72;
    return (i?'L':'M')+X(f).toFixed(2)+' '+Y(sun(s.start+(s.end-s.start)*f,loc)).toFixed(2);
   }).join(' ');
   for(const path of svg.querySelectorAll('path[data-time-orbit]'))path.setAttribute('d',samples);
   chartKey=key;
  }
  const alt=sun(s.at,loc), x=X((s.at-s.start)/(s.end-s.start)), y=Y(alt);
  const marker=svg.querySelector('[data-time-sun]');
  marker.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';
  marker.dataset.alt=alt.toFixed(3);marker.dataset.at=new Date(s.at).toISOString();
  panel.style.setProperty('--sky-light',light(alt).toFixed(3));
  panel.dataset.sun=alt>=0?'above':'below';
  svg.setAttribute('aria-label',t(alt>=0?'sun':'below'));
  const nf=new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:1,signDisplay:'exceptZero'});
  panel.querySelector('[data-time-alt]').textContent=t(alt>=0?'sun':'below')+' · '+nf.format(alt)+'°';
 }catch{
  chartKey=null;
  for(const path of svg.querySelectorAll('path[data-time-orbit]'))path.removeAttribute('d');
  svg.querySelector('[data-time-sun]').style.visibility='hidden';
  panel.querySelector('[data-time-alt]').textContent=t('unavailable');
  return;
 }
 svg.querySelector('[data-time-sun]').style.visibility='';
 panel.querySelector('h2').textContent=t('title');
 panel.querySelector('[data-time-place]').textContent=loc.example?t('example'):(loc.label||loc.zone);
 panel.querySelector('[data-time-open]').textContent=t('open');
 updateControls(s);
}
function mount(){
 if(today?.isConnected||!window.Astronomy||!window.NRCivilTime)return;
 const overview=document.querySelector('#nrRoute-today [data-overview="today"]');
 if(!overview)return;
 today=document.createElement('section');today.className='sr-time-sun';today.dataset.skyClock='';
 today.setAttribute('translate','no');today.setAttribute('aria-labelledby','srTimeSunTitle');
 today.innerHTML='<div class="sr-time-stage"><div class="sr-time-title"><div><h2 id="srTimeSunTitle"></h2><small data-time-place></small></div><button type="button" data-time-open></button></div><svg viewBox="0 0 390 106" role="img"><defs><clipPath id="srTimeAbove"><rect width="390" height="51"/></clipPath><radialGradient id="srTimeGlow"><stop stop-color="#ffd478" stop-opacity=".84"/><stop offset="1" stop-color="#ffac42" stop-opacity="0"/></radialGradient></defs><line x1="18" y1="51" x2="372" y2="51"/><path data-time-orbit class="sr-time-orbit-night"/><path data-time-orbit clip-path="url(#srTimeAbove)" class="sr-time-orbit-day"/><g data-time-sun><circle r="23" fill="url(#srTimeGlow)"/><circle r="7" class="sr-time-disc"/></g></svg><p data-time-alt></p></div>';
 today.querySelector('[data-time-open]').onclick=()=>{if(!place())exampleChosen=true;window.fp434Go('panch',true);};
 updateControls=controls(today);
 overview.before(today);
 renderToday(snapshot());
}
function sync(){
 if(document.hidden||!['#today','#panch',''].includes(location.hash)||!allowed())stop();
 mount();
 if(!document.hidden)notify();
}
window.SRSkyTime=Object.freeze({snapshot,place,controls,light,timeText});
window.addEventListener('hashchange',sync);
function watchRoutes(){
 const observer=new MutationObserver(sync);
 for(const id of ['nrRoute-today','nrRoute-panch']){
  const route=document.getElementById(id);
  if(route)observer.observe(route,{attributes:true,attributeFilter:['class']});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchRoutes);else watchRoutes();
window.addEventListener('popstate',sync);
window.addEventListener('nr:locale',sync);
document.addEventListener('nr:overview-rendered',mount);
document.addEventListener('visibilitychange',sync);
document.addEventListener('nr:location',()=>{exampleChosen=false;live();});
reduced.addEventListener('change',sync);reducedData.addEventListener('change',sync);
navigator.connection?.addEventListener('change',sync);
new MutationObserver(sync).observe(html,{attributes:true,attributeFilter:['class']});
setInterval(()=>{if(!document.hidden&&selected===null&&['#today','#panch',''].includes(location.hash))notify();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();
