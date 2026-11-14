/* One session clock for the civil-day Sun view and the local sky. No forecast inputs. */
(() => {
'use strict';
const KYIV={lat:50.454,lon:30.524,zone:'Europe/Kyiv',example:true};
// City centers from GeoNames. The selector runs entirely on the device.
const cities=[
 ['kyiv',['Київ','Kyiv','Kyiv','Kyiv'],50.454,30.524,'Europe/Kyiv'],
 ['barcelona',['Барселона','Barcelona','Barcelona','Barcelone'],41.38879,2.15899,'Europe/Madrid'],
 ['izium',['Ізюм','Izium','Izium','Izioum'],49.206971,37.276791,'Europe/Kyiv'],
 ['perpignan',['Перпіньян','Perpignan','Perpiñán','Perpignan'],42.69764,2.89541,'Europe/Paris'],
 ['ny',['Нью-Йорк','New York','Nueva York','New York'],40.7128,-74.006,'America/New_York'],
 ['delhi',['Делі','Delhi','Delhi','Delhi'],28.6139,77.209,'Asia/Kolkata'],
 ['tromso',['Тромсе','Tromsø','Tromsø','Tromsø'],69.6492,18.9553,'Europe/Oslo']
];
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
 play:['▶ Програти добу','▶ Play day','▶ Reproducir día','▶ Lire la journée'],
 pause:['Ⅱ Пауза','Ⅱ Pause','Ⅱ Pausa','Ⅱ Pause'],
 now:['Зараз','Now','Ahora','Maintenant'],
 selected:['Вибраний час','Selected time','Hora elegida','Heure choisie'],
 running:['Відтворення доби','Day playback','Reproducción del día','Lecture de la journée'],
 nowTick:['зараз','now','ahora','maintenant'],
 example:['Київ · типове місце','Kyiv · default location','Kyiv · lugar predeterminado','Kyiv · lieu par défaut'],
 open:['Небо →','Sky →','Cielo →','Ciel →'],
 motion:['Для програвання ввімкніть анімації. Час можна обрати вручну.','Turn on motion for playback. You can still choose a time.','Activa las animaciones para reproducir. Puedes elegir la hora.','Activez les animations pour lire la journée. Vous pouvez choisir l’heure.'],
 chooseCity:['Обрати місто','Choose a city','Elegir una ciudad','Choisir une ville'],
 yourPlace:['Ваше місце','Your place','Tu ubicación','Votre lieu'],
 rise:['Схід','Sunrise','Amanecer','Lever'],
 set:['Захід','Sunset','Ocaso','Coucher'],
 noon:['Полудень','Noon','Mediodía','Midi'],
 unavailable:['Шлях Сонця недоступний','Sun path unavailable','Trayectoria solar no disponible','Trajectoire solaire indisponible']
};
const t=k=>copy[k][Math.max(0,language())];
let selected=null, playing=false, frame=0, rangeCache, exampleChosen=false;
let today, chartKey, formatterKey, formatter, dateFormatter, offsetFormatter;

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
 // FP569k: with no saved place every screen uses Kyiv, labelled «Київ · типове місце» (Today already did; Sky showed an empty sky).
 const loc=place(true), zone=loc.zone, at=selected??Date.now();
 return {...localDay(at,zone),at,loc,mode:playing?'playing':selected===null?'now':'selected',allowed:allowed()};
}
function timeText(at,zone){
 const locale=window.NRLocale?.locale||'uk-UA',key=locale+'|'+zone;
 if(formatterKey!==key){
  formatter=new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  dateFormatter=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'numeric',month:'short'});
  offsetFormatter=new Intl.DateTimeFormat(locale,{timeZone:zone,timeZoneName:'shortOffset'});
  formatterKey=key;
 }
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
function selectMoment(instant){
 const at=typeof instant==='string'?Date.parse(instant):NaN;
 if(!Number.isFinite(at))return false;
 stop();selected=at;notify();
 return true;
}
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
 el.innerHTML='<label><span data-time-label></span><input type="range" min="0" max="1000" step="1" value="0"></label><div><button type="button" data-time-play></button><button type="button" data-time-now></button><time></time></div><small data-time-mode></small><small data-time-help hidden></small>';
 const range=el.querySelector('input'),play=el.querySelector('[data-time-play]'),now=el.querySelector('[data-time-now]');
 range.addEventListener('input',()=>seek(range.value));play.onclick=toggle;now.onclick=live;
 host.append(el);
 return s=>{
  const time=timeText(s.at,s.zone);
  el.querySelector('[data-time-label]').textContent=t('day');
  range.value=Math.floor((s.at-s.start)/(s.end-s.start-1)*1000);
  // The same local clock reading occurs twice when the UTC offset moves back.
  const offset=s.end-s.start===DAY?'':offsetFormatter.formatToParts(s.at).find(p=>p.type==='timeZoneName')?.value;
  range.setAttribute('aria-valuetext',[time,offset,s.zone].filter(Boolean).join(' · '));
  play.textContent=t(s.mode==='playing'?'pause':'play');
  play.disabled=!s.allowed;
  play.title=s.allowed?'':t('motion');
  play.setAttribute('aria-pressed',String(s.mode==='playing'));
  now.textContent=t('now');now.setAttribute('aria-pressed',String(s.mode==='now'));
  const stamp=el.querySelector('time');stamp.dateTime=new Date(s.at).toISOString();stamp.textContent=time;
  // Human offset (UTC+2) instead of the raw IANA id; it also disambiguates repeated DST hours.
  const human=(offsetFormatter.formatToParts(s.at).find(p=>p.type==='timeZoneName')?.value||'').replace(/^GMT/,'UTC')||s.zone;
  el.querySelector('[data-time-mode]').textContent=[t(s.mode==='playing'?'running':s.mode==='selected'?'selected':'now'),dateFormatter.format(s.at),human].filter(Boolean).join(' · ');
  const hint=el.querySelector('[data-time-help]');hint.hidden=s.allowed;hint.textContent=s.allowed?'':t('motion');
  el.dataset.mode=s.mode;
 };
}
let updateControls;
const X=f=>18+354*f, Y=h=>51-.48*h;
function renderToday(s){
 const loc=place(true), panel=today, svg=panel.querySelector('svg'), key=[s.start,s.end,s.zone,loc.lat,loc.lon,loc.elevation,language()].join('|');
 try{
  if(chartKey!==key){
   const samples=Array.from({length:73},(_,i)=>{
    const f=i/72;
    return (i?'L':'M')+X(f).toFixed(2)+' '+Y(sun(s.start+(s.end-s.start)*f,loc)).toFixed(2);
   }).join(' ');
   for(const path of svg.querySelectorAll('path[data-time-orbit]'))path.setAttribute('d',samples);
   // FP569d: sunrise, noon and sunset are written on the picture (owner: pictures must explain themselves).
   let g=svg.querySelector('[data-time-labels]');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.dataset.timeLabels='';g.setAttribute('aria-hidden','true');svg.append(g);}
   g.textContent='';
   const obs=new Astronomy.Observer(loc.lat,loc.lon,loc.elevation||0),span=s.end-s.start,fx=at=>(at-s.start)/span;
   const find=(kind)=>{try{if(kind==='noon'){const h=Astronomy.SearchHourAngle('Sun',obs,0,new Date(s.start));return h?.time?.date}const r=Astronomy.SearchRiseSet('Sun',obs,kind==='rise'?+1:-1,new Date(s.start),span/DAY);return r?.date}catch{return null}};
   const mark=(at,word,y,anchor)=>{if(!at)return;const f=fx(+at);if(f<0||f>=1)return;const el=document.createElementNS('http://www.w3.org/2000/svg','text');el.setAttribute('x',X(f).toFixed(1));el.setAttribute('y',y);el.setAttribute('text-anchor',anchor||'middle');el.setAttribute('class','sr-time-label');el.textContent=word+' '+timeText(+at,s.zone);g.append(el);};
   const rise=find('rise'),set=find('set'),noon=find('noon');
   mark(rise,'↑ '+t('rise'),100);mark(set,'↓ '+t('set'),100);
   if(noon){const na=sun(+noon,loc);mark(noon,t('noon'),Math.max(10,Y(na)-7).toFixed(1));}
   chartKey=key;
  }
  const alt=sun(s.at,loc), fraction=(s.at-s.start)/(s.end-s.start), x=X(fraction), y=Y(alt);
  const daylight=light(alt), twilight=Math.max(0,1-Math.abs(alt)/12);
  const marker=svg.querySelector('[data-time-sun]');
  marker.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';
  marker.dataset.alt=alt.toFixed(3);marker.dataset.at=new Date(s.at).toISOString();
  panel.style.setProperty('--sky-light',daylight.toFixed(3));
  panel.style.setProperty('--sky-twilight',twilight.toFixed(3));
  panel.style.setProperty('--sun-x',(100*x/390).toFixed(2)+'%');

  // FP569k (K1): «зараз» is a dashed tick; the played/selected time is the Sun itself. They coincide in «now» mode.
  const nowG=svg.querySelector('[data-time-nowtick]');if(nowG){const n=Date.now(),inDay=n>=s.start&&n<s.end;nowG.style.display=s.mode==='now'||!inDay?'none':'';
   if(inDay){const nx=X((n-s.start)/(s.end-s.start));nowG.setAttribute('transform','translate('+nx.toFixed(2)+' 0)');nowG.querySelector('text').textContent=t('nowTick')+' '+timeText(n,s.zone);}}
  panel.dataset.sun=alt>=0?'above':'below';
  panel.dataset.clockMode=s.mode;
  svg.querySelector('[data-time-progress]').setAttribute('stroke-dasharray',Math.max(0,fraction).toFixed(4)+' 1');
  svg.setAttribute('aria-label',t(alt>=0?'sun':'below'));
  panel.querySelector('[data-time-alt]').textContent=(s.mode==='selected'?t('selected')+' · ':'')+timeText(s.at,s.zone)+' · '+t(alt>=0?'sun':'below');
 }catch{
  chartKey=null;
  for(const path of svg.querySelectorAll('path[data-time-orbit]'))path.removeAttribute('d');
  svg.querySelector('[data-time-sun]').style.visibility='hidden';
  panel.querySelector('[data-time-alt]').textContent=t('unavailable');
  return;
 }
 svg.querySelector('[data-time-sun]').style.visibility='';
 panel.querySelector('h2').textContent=t('title');
 // FP569f (R-08): a saved place without a name is «Ваше місце», not an IANA identifier; the zone stays in the controls line.
 panel.querySelector('[data-time-place]').textContent=loc.example?t('example'):(cityLabel(loc)||t('yourPlace'));
 panel.querySelector('[data-time-open]').textContent=t('open');
 updateControls(s);
}
function mount(){
 if(today?.isConnected||!window.Astronomy||!window.NRCivilTime)return;
 const overview=document.querySelector('#nrRoute-today [data-overview="today"]');
 if(!overview)return;
 today=document.createElement('section');today.className='sr-time-sun';today.dataset.skyClock='';today.dataset.placement='after-hero';
 today.setAttribute('translate','no');today.setAttribute('aria-labelledby','srTimeSunTitle');
 today.innerHTML='<div class="sr-time-stage"><div class="sr-time-title"><div><h2 id="srTimeSunTitle"></h2><small data-time-place></small></div><button type="button" data-time-open></button></div><svg viewBox="0 0 390 106" role="img"><defs><clipPath id="srTimeAbove"><rect width="390" height="51"/></clipPath><radialGradient id="srTimeGlow"><stop stop-color="#fff3bd" stop-opacity=".95"/><stop offset=".38" stop-color="#ffbd56" stop-opacity=".65"/><stop offset="1" stop-color="#ff8d36" stop-opacity="0"/></radialGradient><radialGradient id="srTimeDisc" cx="34%" cy="32%"><stop stop-color="#fffdf0"/><stop offset=".64" stop-color="#ffe691"/><stop offset="1" stop-color="#ffa840"/></radialGradient></defs><line x1="18" y1="51" x2="372" y2="51"/><path data-time-orbit class="sr-time-orbit-night"/><path data-time-orbit clip-path="url(#srTimeAbove)" class="sr-time-orbit-day"/><path data-time-orbit data-time-progress pathLength="1" clip-path="url(#srTimeAbove)" class="sr-time-orbit-progress"/><g data-time-nowtick style="display:none"><line y1="-4" y2="58" class="sr-time-now-line"/><text y="-8" text-anchor="middle" class="sr-time-now-label"></text></g><g data-time-sun><circle r="28" class="sr-time-halo" fill="url(#srTimeGlow)"/><circle r="11" class="sr-time-disc"/><circle r="4" class="sr-time-night-cursor"/></g></svg><p data-time-alt></p></div>';
 today.querySelector('[data-time-open]').onclick=()=>{if(!place())exampleChosen=true;window.fp434Go('panch',true);};
 updateControls=controls(today);
 // FP569d: verdict and score come first (owner decision 01.11); the Sun clock follows the day overview card.
 const hero=overview.querySelector(':scope > .nr-o-hero');
 const caution=overview.querySelector(':scope > .sr-expert-caution');
 if(caution||hero)(caution||hero).after(today);else overview.prepend(today);
 renderToday(snapshot());
}
function sync(){
 if(document.hidden||!['#today','#panch',''].includes(location.hash)||!allowed())stop();
 mount();
 if(!document.hidden)notify();
}
// FP569k: live() exported so other views (Лінія дня) can return the one shared clock to «now».
window.SRSkyTime=Object.freeze({live,snapshot,place,cityLabel,cityPresets:()=>cities.map(([cityId,names,lat,lon,zone])=>({cityId,label:names[Math.max(0,language())],aliases:[...names,...({kyiv:['Kiev'],izium:['Izyum'],tromso:['Тромсьо']}[cityId]||[])],lat,lon,zone})),controls,light,timeText,selectMoment});
window.addEventListener('hashchange',sync);
function cityLabel(loc){
 const city=cities.find(([id])=>id===loc?.cityId);
 return city?city[1][Math.max(0,language())]:loc?.cityId==='device'?['Моє місце','My location','Mi ubicación','Ma position'][Math.max(0,language())]:loc?.label;
}
function mountCityPicker(){
 const box=document.getElementById('nrLocalContext');
 if(!box)return;
 let label=box.querySelector('[data-sky-city-picker]');
 if(!label){
  label=document.createElement('label');
  label.dataset.skyCityPicker='';
  label.style.cssText='display:grid;gap:6px;margin:12px 0';
  const select=document.createElement('select');
  select.style.cssText='width:100%;min-height:44px;font:inherit';
  label.append(document.createElement('span'),select);
  box.querySelector('[data-locate]').before(label);
  select.addEventListener('change',()=>{
   const city=cities.find(([id])=>id===select.value);
   if(!city)return;
   const [cityId,,lat,lon,zone]=city;
   window.NRLocalContext?.choose?.({cityId,lat,lon,zone});
  });
 }
 const title=t('chooseCity'),select=label.querySelector('select');
 if(label.firstChild.textContent!==title){
  label.firstChild.textContent=title;
  select.replaceChildren(new Option(title,''),...cities.map(([id,names])=>new Option(names[Math.max(0,language())],id)));
  select.options[0].disabled=true;
 }
 select.value=place()?.cityId||'';
}
function watchRoutes(){
 const observer=new MutationObserver(sync);
 for(const id of ['nrRoute-today','nrRoute-panch']){
  const route=document.getElementById(id);
  if(route)observer.observe(route,{attributes:true,attributeFilter:['class']});
  if(id==='nrRoute-panch'&&route){
   const picker=new MutationObserver(mountCityPicker);
   picker.observe(route,{childList:true,subtree:true});
   mountCityPicker();
  }
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchRoutes);else watchRoutes();
window.addEventListener('popstate',sync);
window.addEventListener('nr:locale',()=>{sync();mountCityPicker();});
document.addEventListener('nr:overview-rendered',()=>{mount();mountCityPicker();});
document.addEventListener('visibilitychange',sync);
document.addEventListener('nr:location',()=>{exampleChosen=false;live();mountCityPicker();});
reduced.addEventListener('change',sync);reducedData.addEventListener('change',sync);
navigator.connection?.addEventListener('change',sync);
new MutationObserver(sync).observe(html,{attributes:true,attributeFilter:['class']});
setInterval(()=>{if(!document.hidden&&selected===null&&['#today','#panch',''].includes(location.hash))notify();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
// Claude 13.11: «На цій сторінці» — chips to the Sky route sections (the route is ~8800 px on a phone).
// Built from the visible h2 headings, so labels follow the current language and new sections appear by themselves.
(function skyToc(){
 const TITLE=['На цій сторінці','On this page','En esta página','Sur cette page'];
 const REFERENCE=['Докладніше про Панчангу','Panchanga reference','Más sobre el Panchanga','En savoir plus sur le Panchanga'];
 const short=s=>{const head=s.split('·')[0].trim();s=head.length<8?s.trim():head;return s.length>22?s.slice(0,21)+'…':s;};
 let timer=0,last='';
 function build(){
  const route=document.getElementById('nrRoute-panch');if(!route)return;
  const live=route.querySelector(':scope > [data-sky-live]'),evening=route.querySelector(':scope > [data-sky-evening]');
  const local=route.querySelector(':scope > #srCivilPanel'),anchor=evening||live;
  if(anchor&&local&&anchor.nextElementSibling!==local&&!local.contains(document.activeElement))anchor.after(local);
  const guide=route.querySelector(':scope > #nrPanchGuide'),legacy=route.querySelector(':scope > #nrPanchLive');
  if(local&&guide&&!guide.contains(document.activeElement)&&!legacy?.contains(document.activeElement)){
   const extra=document.createElement('details');extra.className='sr-sky-reference';
   extra.append(document.createElement('summary'));guide.before(extra);extra.append(guide);
   if(legacy)extra.append(legacy);
  }
  const reference=route.querySelector('.sr-sky-reference > summary'),referenceLabel=REFERENCE[language()]||REFERENCE[0];
  if(reference&&reference.textContent!==referenceLabel)reference.textContent=referenceLabel;
  const heads=[...route.querySelectorAll('h2')].filter(h=>h.offsetParent&&!h.closest('.sr-sky-toc,.sr-sky-reference')&&h.textContent.trim());
  const sig=heads.map(h=>h.textContent.trim()).join('|')+language();
  let nav=route.querySelector(':scope > .sr-sky-toc');
  if(heads.length<3){nav?.remove();last='';return;}
  if(nav&&sig===last)return;last=sig;
  if(!nav){nav=document.createElement('nav');nav.className='sr-sky-toc';nav.setAttribute('translate','no');route.prepend(nav);}
  nav.setAttribute('aria-label',TITLE[language()]||TITLE[0]);nav.replaceChildren();
  const label=document.createElement('span');label.textContent=TITLE[language()]||TITLE[0];nav.append(label);
  heads.forEach((h,i)=>{if(!h.id)h.id='srSkySec'+i;const b=document.createElement('button');b.type='button';b.textContent=short(h.textContent.trim());
   b.onclick=()=>{const target=h.closest('summary')||h;target.style.scrollMarginTop='72px';target.scrollIntoView({block:'start'});if(target===h)target.tabIndex=-1;target.focus({preventScroll:true});};nav.append(b);});
 }
 // Throttle, not debounce: the live sky keeps mutating the route, a debounce would never fire.
 const soon=()=>{if(timer)return;timer=setTimeout(()=>{timer=0;build();},600);};
 const style=document.createElement('style');style.id='srSkyTocStyle';
 style.textContent='html body .sr-sky-toc{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 12px;padding:0}html body .sr-sky-toc span{width:100%;font:600 11px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#aebbd6}html body .sr-sky-toc button{min-height:32px!important;min-width:0!important;width:auto!important;padding:4px 11px!important;border-radius:999px!important;border:1px solid rgba(242,196,107,.5)!important;background:rgba(12,20,40,.82)!important;color:#f4ead2!important;font:600 12.5px/1.2 system-ui,sans-serif!important;box-shadow:none!important;cursor:pointer;max-width:100%;overflow-wrap:anywhere}html body .sr-sky-toc button:hover{border-color:#f2c46b!important}html body .sr-sky-toc button:focus-visible{outline:3px solid #f2c46b;outline-offset:2px}';
 style.textContent+=' .nr-sky-expand>summary,.sr-sky-reference>summary{display:flex;align-items:center;gap:.65rem;min-height:44px;cursor:pointer}.nr-sky-expand>summary::before,.sr-sky-reference>summary::before{content:"+";color:#f2c46b;font-weight:700}.nr-sky-expand[open]>summary::before,.sr-sky-reference[open]>summary::before{content:"−"}.nr-sky-expand>summary:focus-visible,.sr-sky-reference>summary:focus-visible{outline:2px solid #f2c46b;outline-offset:3px}.sr-sky-reference{padding:0 14px;margin:12px 0;border:1px solid var(--nr-line);border-radius:14px}';
 if(!document.getElementById('srSkyTocStyle'))document.head.append(style);
 // The route node is created later by the shell; watch the body (throttled) instead of a missing node.
 const start=()=>{new MutationObserver(soon).observe(document.body,{childList:true,subtree:true});soon();};
 addEventListener('hashchange',soon);document.addEventListener('nr:language',soon);
 document.addEventListener('focusout',e=>{if(e.target.closest?.('#nrRoute-panch'))soon();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
})();
