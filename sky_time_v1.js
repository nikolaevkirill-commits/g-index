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
 ['tromso',['Тромсе','Tromsø','Tromsø','Tromsø'],69.6492,18.9553,'Europe/Oslo'],
['tokyo',['Токіо','Tokyo','Tokio','Tokyo'],35.6762,139.6503,'Asia/Tokyo'],
['sao-paulo',['Сан-Паулу','São Paulo','São Paulo','São Paulo'],-23.5505,-46.6333,'America/Sao_Paulo']
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
 nextSky:['Найближча подія на небі','Next event in the sky','Próximo evento en el cielo','Prochain événement dans le ciel'],
 evRise:['схід Сонця','sunrise','salida del Sol','lever du Soleil'],
 evSet:['захід Сонця','sunset','puesta del Sol','coucher du Soleil'],
 evNoon:['полудень','solar noon','mediodía solar','midi solaire'],
 evMoonRise:['схід Місяця','moonrise','salida de la Luna','lever de la Lune'],
 evMoonSet:['захід Місяця','moonset','puesta de la Luna','coucher de la Lune'],
 motion:['Для програвання ввімкніть анімації. Час можна обрати вручну.','Turn on motion for playback. You can still choose a time.','Activa las animaciones para reproducir. Puedes elegir la hora.','Activez les animations pour lire la journée. Vous pouvez choisir l’heure.'],
 chooseCity:['Обрати місто','Choose a city','Elegir una ciudad','Choisir une ville'],
 yourPlace:['Ваше місце','Your place','Tu ubicación','Votre lieu'],
 rise:['Схід','Sunrise','Amanecer','Lever'],
 set:['Захід','Sunset','Ocaso','Coucher'],
 noon:['Полудень','Noon','Mediodía','Midi'],
 lens:['Сонце й найближча подія','Sun and next event','Sol y próximo evento','Soleil et prochain événement'],
 upcoming:['Наступна подія','Next event','Próximo evento','Prochain événement'],
 sunriseEvent:['Схід Сонця','Sunrise','Salida del Sol','Lever du Soleil'],
 sunsetEvent:['Захід Сонця','Sunset','Puesta del Sol','Coucher du Soleil'],
 moonriseEvent:['Схід Місяця','Moonrise','Salida de la Luna','Lever de la Lune'],
 moonsetEvent:['Захід Місяця','Moonset','Puesta de la Luna','Coucher de la Lune'],
 tithiEvent:['Новий місячний день','New lunar day','Nuevo día lunar','Nouveau jour lunaire'],
 nakshatraEvent:['Накшатра Місяця','Moon’s nakshatra','Nakshatra lunar','Nakshatra lunaire'],
 unavailable:['Шлях Сонця недоступний','Sun path unavailable','Trayectoria solar no disponible','Trajectoire solaire indisponible']
};
const t=k=>copy[k][Math.max(0,language())];
let selected=null, playing=false, frame=0, rangeCache, exampleChosen=false;
let today, firstSun, chartKey, formatterKey, formatter, dateFormatter, offsetFormatter;

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
function renderFirstSun(s,above){
 const subtitle=document.getElementById('headerSub');
 if(!subtitle)return;
 if(!firstSun?.isConnected){
  firstSun=document.createElement('div');
  firstSun.className='sub';
  firstSun.dataset.sunFirstScreen='';
  firstSun.setAttribute('translate','no');
  firstSun.style.cssText='max-width:min(22rem,calc(100vw - 115px));margin-top:3px;font-size:.75rem;line-height:1.35;color:var(--nr-text,#eef3fb);overflow-wrap:anywhere';
  subtitle.after(firstSun);
 }
 const loc=s.loc, label=placeLabel(loc);
 const status=above===null?t('unavailable'):t(above?'sun':'below');
 const text=status+' · '+label+' · '+timeText(s.at,s.zone);
 const state=above===null?'unavailable':above?'above':'below';
 if(firstSun.dataset.state!==state)firstSun.dataset.state=state;
 if(firstSun.textContent!==text)firstSun.textContent=text;
 showFirstSun(!!today.closest('.nr-route.active'));
}
function showFirstSun(show){
 if(!firstSun)return;
 if(firstSun.hidden===show)firstSun.hidden=!show;
 const subtitle=document.getElementById('headerSub');
 if(subtitle&&subtitle.hidden!==show)subtitle.hidden=show;
}
let firstSky=null,nextSkyCache=null;
function nextSkyEvent(loc,now){
 const key=[loc.lat,loc.lon,loc.elevation].join('|');
 if(nextSkyCache?.key===key&&nextSkyCache.time<=now&&nextSkyCache.until>now)return nextSkyCache.event;
 const observer=new Astronomy.Observer(loc.lat,loc.lon,loc.elevation||0),start=new Date(now);
 const candidates=[];
 for(const [body,direction,kind] of [['Sun',1,'sunriseEvent'],['Sun',-1,'sunsetEvent'],['Moon',1,'moonriseEvent'],['Moon',-1,'moonsetEvent']]){
  const match=Astronomy.SearchRiseSet(body,observer,direction,start,1.5);
  if(match&&+match.date>now)candidates.push({at:+match.date,kind});
 }
 const noon=Astronomy.SearchHourAngle('Sun',observer,0,start)?.time;
 if(noon&&+noon.date>now)candidates.push({at:+noon.date,kind:'evNoon'});
 const lunar=window.SkyRhythmLunar;
 if(lunar?.available()){
  const state=lunar.at(now);
  for(const kind of ['tithi','nakshatra']){
   const next=lunar.nextTransition(now,kind,state[kind]);
   if(next?.utcMs>now)candidates.push({at:next.utcMs,kind:kind+'Event',sector:kind==='nakshatra'?next.to:null});
  }
 }
 const event=candidates.sort((a,b)=>a.at-b.at)[0]||null;
 nextSkyCache={key,event,time:now,until:event?.at||now+60000};
 return event;
}

function renderFirstSky(s,orbit,x,y){
 const hero=today.closest('[data-overview="today"]')?.querySelector(':scope > .nr-o-hero');
 if(!hero||!matchMedia('(max-width:600px)').matches){if(firstSky)firstSky.hidden=true;return;}
 if(!firstSky?.isConnected){
  firstSky=document.createElement('section');
  firstSky.className='sr-p0-sky-preview';
  firstSky.dataset.placement='after-hero';
  firstSky.setAttribute('translate','no');
  firstSky.innerHTML='<button type="button" data-p0-next-sky><span></span><time></time></button><svg viewBox="0 0 390 106" role="img"><line x1="18" y1="51" x2="372" y2="51"/><path/><circle r="8"/></svg>';
  const button=firstSky.querySelector('button');
  button.onclick=()=>{
   if(button.dataset.at&&selectMoment(button.dataset.at))window.fp434Go?.('panch',true);
  };
 }
 const style=getComputedStyle(document.documentElement);
 const large=parseFloat(style.fontSize)>=24||parseFloat(style.textSizeAdjust||style.webkitTextSizeAdjust)>=150;
 firstSky.toggleAttribute('data-large-text',large);
 const anchor=hero.querySelector(large?'[data-reference-title]':'.nr-o-verdict')||hero.firstElementChild;
 if(anchor&&anchor.nextElementSibling!==firstSky)anchor.after(firstSky);
 firstSky.hidden=false;
 const lang=window.NRLocale?.locale||'uk-UA';
 const button=firstSky.querySelector('button'),time=button.querySelector('time');
 const event=s.mode==='now'?nextSkyEvent(s.loc,Date.now()):{at:s.at,kind:'selected'};
 const preview=firstSky.querySelector('svg');
 preview.setAttribute('aria-label',t('title'));
 preview.querySelector('path').setAttribute('d',orbit);
 preview.querySelector('circle').setAttribute('cx',x);
 preview.querySelector('circle').setAttribute('cy',y);
 firstSky.setAttribute('aria-label',t('lens'));
 button.disabled=!event;
 if(!event){
  delete button.dataset.at;button.removeAttribute('aria-label');time.removeAttribute('datetime');time.textContent='';
  button.firstElementChild.textContent=t('upcoming')+' · '+t('unavailable');return;
 }
 const name=event.sector&&typeof window.SkyRhythmI18n?.name==='function'?window.SkyRhythmI18n.name('nakshatra',event.sector,window.NRLocale?.language):null;
 const moment=new Date(event.at),newDay=NRCivilTime.dayKey(event.at,s.zone)!==NRCivilTime.dayKey(Date.now(),s.zone);
 const format=new Intl.DateTimeFormat(lang,{timeZone:s.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',...(newDay?{month:'short',day:'numeric'}:{})});
 button.dataset.at=moment.toISOString();
 time.dateTime=button.dataset.at;
 time.textContent=format.format(moment);
 button.firstElementChild.textContent=(name?t(event.kind)+' → '+name:t(event.kind))+' · '+placeLabel(s.loc);
 button.setAttribute('aria-label',button.firstElementChild.textContent+' · '+time.textContent+' · '+t('open'));
}

function paintNextSky(panel,s,loc){
 const button=panel.querySelector('[data-time-open]');
 // A moment chosen by the person stays authoritative: the nearest event is offered only in live mode.
 const next=s.mode==='now'?nextSkyEvent(loc,Date.now()):null;
 button.replaceChildren(document.createTextNode(t('open')));
 if(!next){delete button.dataset.p0NextSky;delete button.dataset.at;button.removeAttribute('aria-label');return;}
 const time=document.createElement('time');time.dateTime=new Date(next.at).toISOString();time.textContent=timeText(next.at,s.zone);
 const glyph={sunriseEvent:'☀↑',sunsetEvent:'☀↓',evNoon:'☀▲',moonriseEvent:'☾↑',moonsetEvent:'☾↓'}[next.kind]||'';
 const long=document.createElement('span');long.className='sr-time-next-long';long.textContent=' '+t(next.kind);
 const short=document.createElement('span');short.className='sr-time-next-short';short.setAttribute('aria-hidden','true');short.textContent=glyph+' ';
 const line=document.createElement('small');line.className='sr-time-next';line.append(short,time,long);
 button.append(line);
 button.toggleAttribute('data-p0-next-sky',!matchMedia('(max-width:600px)').matches);button.dataset.at=time.dateTime;
 const city=placeLabel(loc);
 button.setAttribute('aria-label',t('open').replace(' →','')+'. '+t('nextSky')+(language()===3?' : ':': ')+time.textContent+' '+t(next.kind)+' · '+city);
}
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
  try{renderFirstSky(s,svg.querySelector('path[data-time-orbit]').getAttribute('d'),x,y);}catch{if(firstSky)firstSky.hidden=true;}
  panel.dataset.sun=alt>=0?'above':'below';
  renderFirstSun(s,alt>=0);
  panel.dataset.clockMode=s.mode;
  svg.querySelector('[data-time-progress]').setAttribute('stroke-dasharray',Math.max(0,fraction).toFixed(4)+' 1');
  svg.setAttribute('aria-label',t(alt>=0?'sun':'below'));
  panel.querySelector('[data-time-alt]').textContent=(s.mode==='selected'?t('selected')+' · ':'')+timeText(s.at,s.zone)+' · '+t(alt>=0?'sun':'below');
 }catch{
  chartKey=null;
  for(const path of svg.querySelectorAll('path[data-time-orbit]'))path.removeAttribute('d');
  svg.querySelector('[data-time-sun]').style.visibility='hidden';
  panel.querySelector('[data-time-alt]').textContent=t('unavailable');
  if(firstSky)firstSky.hidden=true;
  renderFirstSun(s,null);
  return;
 }
 svg.querySelector('[data-time-sun]').style.visibility='';
 panel.querySelector('h2').textContent=t('title');
 // FP569f (R-08): a saved place without a name is «Ваше місце», not an IANA identifier; the zone stays in the controls line.
 panel.querySelector('[data-time-place]').textContent=placeLabel(loc);
 paintNextSky(panel,s,loc);
 updateControls(s);
}
function mount(){
 if(today?.isConnected||!window.Astronomy||!window.NRCivilTime)return;
 const overview=document.querySelector('#nrRoute-today [data-overview="today"]');
 if(!overview)return;
 today=document.createElement('section');today.className='sr-time-sun';today.dataset.skyClock='';today.dataset.placement='after-hero';
 today.setAttribute('translate','no');today.setAttribute('aria-labelledby','srTimeSunTitle');
 today.innerHTML='<div class="sr-time-stage"><div class="sr-time-title"><div><h2 id="srTimeSunTitle"></h2><small data-time-place></small></div><button type="button" data-time-open></button></div><svg viewBox="0 0 390 106" role="img"><defs><clipPath id="srTimeAbove"><rect width="390" height="51"/></clipPath><radialGradient id="srTimeGlow"><stop stop-color="#fff3bd" stop-opacity=".95"/><stop offset=".38" stop-color="#ffbd56" stop-opacity=".65"/><stop offset="1" stop-color="#ff8d36" stop-opacity="0"/></radialGradient><radialGradient id="srTimeDisc" cx="34%" cy="32%"><stop stop-color="#fffdf0"/><stop offset=".64" stop-color="#ffe691"/><stop offset="1" stop-color="#ffa840"/></radialGradient></defs><line x1="18" y1="51" x2="372" y2="51"/><path data-time-orbit class="sr-time-orbit-night"/><path data-time-orbit clip-path="url(#srTimeAbove)" class="sr-time-orbit-day"/><path data-time-orbit data-time-progress pathLength="1" clip-path="url(#srTimeAbove)" class="sr-time-orbit-progress"/><g data-time-nowtick style="display:none"><line y1="-4" y2="58" class="sr-time-now-line"/><text y="-8" text-anchor="middle" class="sr-time-now-label"></text></g><g data-time-sun><circle r="28" class="sr-time-halo" fill="url(#srTimeGlow)"/><circle r="11" class="sr-time-disc"/><circle r="4" class="sr-time-night-cursor"/></g></svg><p data-time-alt></p></div>';
 today.querySelector('[data-time-open]').onclick=e=>{if(!place())exampleChosen=true;const at=e.currentTarget.dataset.at;if(at)selectMoment(at);window.fp434Go('panch',true);};
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
 if(!today?.closest('.nr-route.active'))showFirstSun(false);
 if(!document.hidden)notify();
}
// FP569k: live() exported so other views (Лінія дня) can return the one shared clock to «now».
window.SRSkyTime=Object.freeze({live,snapshot,place,cityLabel,placeLabel,cityPresets:()=>cities.map(([cityId,names,lat,lon,zone])=>({cityId,label:names[Math.max(0,language())],aliases:[...names,...({kyiv:['Kiev'],izium:['Izyum'],tromso:['Тромсьо']}[cityId]||[])],lat,lon,zone})),controls,light,timeText,selectMoment});
window.addEventListener('hashchange',sync);
function cityLabel(loc){
 const city=cities.find(([id])=>id===loc?.cityId);
 return city?city[1][Math.max(0,language())]:loc?.cityId==='device'?['Моє місце','My location','Mi ubicación','Ma position'][Math.max(0,language())]:loc?.label;
}
function placeLabel(loc){return loc?.example?t('example'):(cityLabel(loc)||t('yourPlace'));}
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

// the Sun, Mars, Jupiter and Saturn on lanes in the classical (Chaldean) order; each at its sidereal longitude
// (Swiss Lahiri, SkyRhythmLunar), so the sign on the ring equals the sign used by the panchanga. R marks apparent
// retrograde motion. The camera tilt and slow turn are decorative; positions follow the shared sky clock.
(function(){
'use strict';
const BODIES=['Moon','Mercury','Venus','Sun','Mars','Jupiter','Saturn'];
const COLOR={Moon:'#e9e6dc',Mercury:'#b9b4a8',Venus:'#f4e3b5',Sun:'#ffd36b',Mars:'#e2775d',Jupiter:'#e8c79a',Saturn:'#d9c38a'};
const SIZE={Moon:6,Mercury:4,Venus:5.5,Sun:9,Mars:4.5,Jupiter:7.5,Saturn:6.5};
const W={
 uk:{title:'Світила навколо Землі',lead:'Де Сонце, Місяць і планети зараз: напрямок із Землі та знак, у якому кожне стоїть. Знаки сидеричні (Лахірі), як у панчанзі. R — ретроградний рух: з Землі здається, що планета йде назад.',
  names:{Moon:'Місяць',Mercury:'Меркурій',Venus:'Венера',Sun:'Сонце',Mars:'Марс',Jupiter:'Юпітер',Saturn:'Сатурн'},
  signs:['Овен','Телець','Близнюки','Рак','Лев','Діва','Терези','Скорпіон','Стрілець','Козоріг','Водолій','Риби'],retro:'ретроградний',earth:'Земля',moment:'Момент',note:'Відстані не в масштабі: кожне світило на своїй доріжці за давнім порядком від Місяця до Сатурна.',chart:'Світила навколо Землі: '},
 en:{title:'The sky around the Earth',lead:'Where the Sun, the Moon and the planets are now: the direction from the Earth and the sign each one is in. Signs are sidereal (Lahiri), as in the panchanga. R marks retrograde motion: seen from the Earth the planet appears to move backwards.',
  names:{Moon:'Moon',Mercury:'Mercury',Venus:'Venus',Sun:'Sun',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturn'},
  signs:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],retro:'retrograde',earth:'Earth',moment:'Moment',note:'Distances are not to scale: each body has its own lane in the classical order from the Moon to Saturn.',chart:'Bodies around the Earth: '},
 es:{title:'El cielo alrededor de la Tierra',lead:'Dónde están ahora el Sol, la Luna y los planetas: la dirección desde la Tierra y el signo de cada uno. Los signos son siderales (Lahiri), como en el panchanga. R indica movimiento retrógrado: desde la Tierra el planeta parece retroceder.',
  names:{Moon:'Luna',Mercury:'Mercurio',Venus:'Venus',Sun:'Sol',Mars:'Marte',Jupiter:'Júpiter',Saturn:'Saturno'},
  signs:['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'],retro:'retrógrado',earth:'Tierra',moment:'Momento',note:'Las distancias no están a escala: cada astro tiene su carril en el orden clásico de la Luna a Saturno.',chart:'Astros alrededor de la Tierra: '},
 fr:{title:'Le ciel autour de la Terre',lead:'Où se trouvent maintenant le Soleil, la Lune et les planètes : la direction depuis la Terre et le signe de chacun. Les signes sont sidéraux (Lahiri), comme dans le panchanga. R indique le mouvement rétrograde : vue de la Terre, la planète semble reculer.',
  names:{Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Sun:'Soleil',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturne'},
  signs:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'],retro:'rétrograde',earth:'Terre',moment:'Moment',note:'Les distances ne sont pas à l’échelle : chaque astre a son couloir dans l’ordre classique de la Lune à Saturne.',chart:'Astres autour de la Terre : '}
};
const words=()=>W[window.NRLocale?.language]||W.uk;
const norm=x=>((x%360)+360)%360;
function state(){
 const L=window.SkyRhythmLunar,snap=window.SRSkyTime?.snapshot?.();if(!L?.bodyLongitude)return null;
 const at=snap&&snap.mode!=='now'?snap.at:Date.now(),out=[];
 for(const b of BODIES){try{const lon=norm(L.bodyLongitude(at,b));const later=norm(L.bodyLongitude(at+6*3600000,b));let d=later-lon;if(d>180)d-=360;if(d<-180)d+=360;out.push({body:b,lon,retro:b!=='Sun'&&b!=='Moon'&&d<0});}catch(_){return null;}}
 return {at,bodies:out};
}
const view={yaw:-90,raf:0,last:0,state:null,host:null};
function draw(canvas,s,t){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),Wd=Math.max(1,Math.round(r.width)),H=Math.max(1,Math.round(r.height));
 if(canvas.width!==Wd*dpr||canvas.height!==H*dpr){canvas.width=Wd*dpr;canvas.height=H*dpr;}
 const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,Wd,H);
 const w=words(),cx=Wd/2,cy=H*0.5,R=Math.min(Wd*0.37,H*0.78),tilt=0.5;
 const proj=(deg,rad)=>{const a=(deg+view.yaw)*Math.PI/180;return {x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad*tilt,z:Math.sin(a)};};
 // background stars
 let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<Math.round(Wd*H/1800);i++){g.globalAlpha=.25+.5*rnd();g.fillStyle='#fff';g.fillRect(rnd()*Wd,rnd()*H,1,1);}g.globalAlpha=1;
 // zodiac ring: 12 sidereal signs (sign i spans i*30..i*30+30)
 const rIn=R*0.93,rOut=R*1.04;
 for(let i=0;i<12;i++){
  g.beginPath();for(let d=0;d<=30;d+=3){const p=proj(i*30+d,rOut);d?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}for(let d=30;d>=0;d-=3){const p=proj(i*30+d,rIn);g.lineTo(p.x,p.y);}g.closePath();
  g.fillStyle=i%2?'rgba(120,140,220,.16)':'rgba(170,140,230,.22)';g.fill();
  const m=proj(i*30+15,R*1.17);g.fillStyle='rgba(225,230,255,'+(m.z>0?.95:.6)+')';g.font=(m.z>0?'600 11px':'500 10px')+' system-ui';g.textAlign='center';const tw=g.measureText(w.signs[i]).width/2;g.fillText(w.signs[i],Math.min(Wd-tw-2,Math.max(tw+2,m.x)),m.y+4);
 }
 // lanes
 BODIES.forEach((b,i)=>{const rad=R*(0.24+i*0.105);g.beginPath();for(let d=0;d<=360;d+=4){const p=proj(d,rad);d?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.strokeStyle='rgba(160,180,240,.18)';g.lineWidth=1;g.stroke();});
 // Earth
 const eg=g.createRadialGradient(cx-3,cy-3,1,cx,cy,11);eg.addColorStop(0,'#9fd3ff');eg.addColorStop(.6,'#2d6fbf');eg.addColorStop(1,'#123a6b');g.fillStyle=eg;g.beginPath();g.arc(cx,cy,10,0,Math.PI*2);g.fill();
 g.fillStyle='rgba(220,235,255,.9)';g.font='500 10px system-ui';g.textAlign='center';g.fillText(w.earth,cx,cy+24);
 // bodies, far side first
 const items=s.bodies.map(o=>{const i=BODIES.indexOf(o.body),rad=R*(0.24+i*0.105),p=proj(o.lon,rad);return {...o,p,rad};}).sort((a,b)=>a.p.z-b.p.z);
 for(const o of items){
  const {x,y,z}=o.p,size=SIZE[o.body]*(z>0?1.08:0.9);
  g.strokeStyle='rgba(255,255,255,.12)';g.beginPath();g.moveTo(cx,cy);g.lineTo(x,y);g.stroke();
  if(o.body==='Sun'){const glow=g.createRadialGradient(x,y,0,x,y,28);glow.addColorStop(0,'rgba(255,225,140,.9)');glow.addColorStop(1,'rgba(255,200,100,0)');g.fillStyle=glow;g.beginPath();g.arc(x,y,28,0,Math.PI*2);g.fill();}
  const grad=g.createRadialGradient(x-size*.35,y-size*.35,size*.2,x,y,size);grad.addColorStop(0,'#fff');grad.addColorStop(.35,COLOR[o.body]);grad.addColorStop(1,'rgba(20,24,50,.95)');
  g.fillStyle=grad;g.beginPath();g.arc(x,y,size,0,Math.PI*2);g.fill();
  if(o.body==='Saturn'){g.strokeStyle='rgba(230,210,150,.8)';g.lineWidth=1.2;g.beginPath();g.ellipse(x,y,size*1.8,size*.55,-.3,0,Math.PI*2);g.stroke();}
  o.size=size;
 }
 // labels: try above, below, right, left of each body; skip boxes already taken
 g.font='600 11px system-ui';g.textAlign='left';const ew=g.measureText(w.earth).width;const boxes=[[cx-ew/2-2,cy+13,cx+ew/2+2,cy+27]];
 for(const o of [...items].sort((a,b)=>b.p.z-a.p.z)){
  const text=w.names[o.body]+(o.retro?' R':''),tw=g.measureText(text).width,{x,y}=o.p,s=o.size;
  const tries=[[x-tw/2,y-s-16],[x-tw/2,y+s+4],[x+s+4,y-6],[x-s-4-tw,y-6],[x-tw/2,y-s-30],[x-tw/2,y+s+18]];
  let pick=tries[0];for(const c of tries){const box=[c[0],c[1],c[0]+tw,c[1]+13];if(box[0]<0||box[2]>Wd||box[1]<0||box[3]>H)continue;if(!boxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])){pick=c;break;}}
  boxes.push([pick[0],pick[1],pick[0]+tw,pick[1]+13]);
  g.fillStyle='rgba(6,10,28,.55)';g.fillRect(pick[0]-2,pick[1]-1,tw+4,15);g.fillStyle='#fff';g.fillText(text,pick[0],pick[1]+11);
 }
}
function render(host){
 const s=state(),w=words();if(!s){host.hidden=true;return;}host.hidden=false;view.state=s;
 const canvas=host.querySelector('canvas'),list=host.querySelector('ul');
 canvas.setAttribute('aria-label',w.chart+s.bodies.map(o=>w.names[o.body]+' — '+w.signs[Math.floor(o.lon/30)]+(o.retro?' ('+w.retro+')':'')).join('; '));
 list.replaceChildren(...s.bodies.map(o=>{const li=document.createElement('li');const deg=Math.floor(o.lon%30);li.innerHTML='';const dot=document.createElement('span');dot.className='sr-or-dot';dot.style.background=COLOR[o.body];const b=document.createElement('b');b.textContent=w.names[o.body];li.append(dot,b,' '+w.signs[Math.floor(o.lon/30)]+' '+deg+'°'+(o.retro?' · R ('+w.retro+')':''));return li;}));
 host.querySelector('h3').textContent=w.title;host.querySelector('.sr-or-lead').textContent=w.lead;host.querySelector('.sr-or-note').textContent=w.note;
 animate(host);
}
function animate(host){
 cancelAnimationFrame(view.raf);
 const canvas=host.querySelector('canvas'),still=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('nr-design-motion-off');
 const frame=t=>{if(!host.isConnected||host.hidden||document.hidden)return;if(!view.last)view.last=t;const dt=t-view.last;
  if(still||dt>=50){if(!still)view.yaw=(view.yaw+dt*0.004)%360;view.last=t;draw(canvas,view.state,t);}
  if(!still&&document.querySelector('#nrRoute-panch.active'))view.raf=requestAnimationFrame(frame);};
 view.last=0;frame(performance.now());
}
function mount(){
 const route=document.getElementById('nrRoute-panch');if(!route)return;
 const anchor=route.querySelector(':scope > section.nr-sky');if(!anchor)return;
 let host=route.querySelector(':scope > [data-sky-orrery]');
 if(!host){host=document.createElement('section');host.className='nr-card sr-orrery';host.dataset.skyOrrery='';host.setAttribute('aria-labelledby','srOrreryTitle');
  host.innerHTML='<h3 id="srOrreryTitle"></h3><p class="sr-or-lead"></p><canvas role="img"></canvas><ul class="sr-or-list"></ul><p class="sr-or-note"></p>';}
 if(!host.isConnected)anchor.after(host);
 render(host);
}
let pending=0;const soon=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;try{mount();}catch(_){}});};
addEventListener('sr:sky-time',soon);addEventListener('hashchange',soon);document.addEventListener('nr:language',soon);(()=>{const r=()=>document.getElementById('nrRoute-panch');const o=new MutationObserver(()=>{if(r()?.classList.contains('active'))soon();});let n=0;const go=()=>{const el=r();if(el){o.observe(el,{attributes:true,attributeFilter:['class'],childList:true});soon();}else if(n++<60)setTimeout(go,250);};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go,{once:true}):go();})();addEventListener('resize',soon);
document.addEventListener('visibilitychange',soon);setInterval(()=>{if(document.querySelector('#nrRoute-panch.active'))soon();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon);else soon();
})();

// on first view the phase grows from the new Moon to the real phase (once, never with reduced motion).
// Orientation is the northern-hemisphere convention (waxing lit on the right); the horizon view keeps the exact angle.
(function(){
'use strict';
const T={uk:{title:'Місяць',lit:'освітлено',waxing:'росте',waning:'спадає',next:'Далі',q:['молодик','перша чверть','повня','остання чверть'],note:'Вигляд для північної півкулі: зростаючий Місяць освітлений праворуч.',noteS:'Вигляд для південної півкулі: зростаючий Місяць освітлений ліворуч.'},
 en:{title:'The Moon',lit:'lit',waxing:'waxing',waning:'waning',next:'Next',q:['new Moon','first quarter','full Moon','last quarter'],note:'Northern-hemisphere view: the waxing Moon is lit on the right.',noteS:'Southern-hemisphere view: the waxing Moon is lit on the left.'},
 es:{title:'La Luna',lit:'iluminada',waxing:'creciente',waning:'menguante',next:'Después',q:['luna nueva','cuarto creciente','luna llena','cuarto menguante'],note:'Vista del hemisferio norte: la Luna creciente se ilumina a la derecha.',noteS:'Vista del hemisferio sur: la Luna creciente se ilumina a la izquierda.'},
 fr:{title:'La Lune',lit:'éclairée',waxing:'croissante',waning:'décroissante',next:'Ensuite',q:['nouvelle lune','premier quartier','pleine lune','dernier quartier'],note:'Vue de l’hémisphère nord : la Lune croissante est éclairée à droite.',noteS:'Vue de l’hémisphère sud : la Lune croissante est éclairée à gauche.'}};
const words=()=>T[window.NRLocale?.language]||T.uk;
let intro=false,raf=0;
function mount(){
 const route=document.getElementById('nrRoute-panch'),A=window.Astronomy;if(!route||!A||!window.NRMoonGL)return;
 const anchor=route.querySelector(':scope > section.sr-mm');if(!anchor)return;
 let host=route.querySelector(':scope > [data-moon-hero]');
 if(!host){host=document.createElement('section');host.className='nr-card sr-moon-hero';host.dataset.moonHero='';host.setAttribute('aria-labelledby','srMoonHeroTitle');
  host.innerHTML='<div class="sr-mh-art"><canvas role="img"></canvas></div><div class="sr-mh-text"><h3 id="srMoonHeroTitle"></h3><p class="sr-mh-big"></p><p class="sr-mh-next"></p><p class="sr-mh-note"></p></div>';}
 if(!host.isConnected)anchor.before(host);
 const w=words(),snap=window.SRSkyTime?.snapshot?.(),at=new Date(snap&&snap.mode!=='now'?snap.at:Date.now());
 const ill=A.Illumination('Moon',at),phase=A.MoonPhase(at),waxing=phase<180,pct=Math.round(ill.phase_fraction*100);
 const q=A.SearchMoonQuarter(at),zone=snap?.loc?.zone||'Europe/Kyiv',locale=window.NRLocale?.locale||'uk-UA';
 const when=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(q.time.date);
 host.querySelector('h3').textContent=w.title;
 host.querySelector('.sr-mh-big').textContent=pct+' % '+w.lit+' · '+(waxing?w.waxing:w.waning);
 host.querySelector('.sr-mh-next').textContent=w.next+': '+w.q[q.quarter]+' · '+when;
 const south=Number(snap?.loc?.lat)<0;
 host.querySelector('.sr-mh-note').textContent=south?w.noteS:w.note;
 const canvas=host.querySelector('canvas');canvas.setAttribute('aria-label',w.title+': '+pct+' % '+w.lit+', '+(waxing?w.waxing:w.waning));
 // limb = position angle of the bright limb (north through east, as in sky_live): 270° lit on the right, 90° on the left
 const limb=waxing!==south?270:90,target=ill.phase_angle;
 const still=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('nr-design-motion-off');
 cancelAnimationFrame(raf);
 const paint=pa=>window.NRMoonGL.draw(canvas,{phaseAngle:pa,limb,size:220});
 if(intro||still||!route.classList.contains('active')){paint(target);intro=intro||route.classList.contains('active');return;}
 intro=true;const t0=performance.now(),D=1600;
 const step=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);paint(180-(180-target)*e);if(k<1)raf=requestAnimationFrame(step);};
 raf=requestAnimationFrame(step);
}
let pending=0;const soon=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;try{mount();}catch(_){}});};
addEventListener('sr:sky-time',soon);addEventListener('hashchange',soon);document.addEventListener('nr:language',soon);(()=>{const r=()=>document.getElementById('nrRoute-panch');const o=new MutationObserver(()=>{if(r()?.classList.contains('active'))soon();});let n=0;const go=()=>{const el=r();if(el){o.observe(el,{attributes:true,attributeFilter:['class'],childList:true});soon();}else if(n++<60)setTimeout(go,250);};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go,{once:true}):go();})();
setInterval(()=>{if(document.querySelector('#nrRoute-panch.active'))soon();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon);else soon();
})();

(()=>{'use strict';
const D2R=Math.PI/180,SLOT=3*3600000,POLE={lat:80.8,lon:-72.8};
const T=(uk,en,es,fr)=>({uk,en,es,fr})[window.NRLocale?.language||'uk']??en;
const boundary=kp=>66.5-2*kp;
const tone=kp=>kp>=5?'storm':kp>=4?'active':kp>=3?'unsettled':'quiet';
function magLat(lat,lon){const s=Math.sin(lat*D2R)*Math.sin(POLE.lat*D2R)+Math.cos(lat*D2R)*Math.cos(POLE.lat*D2R)*Math.cos((lon-POLE.lon)*D2R);return Math.asin(Math.max(-1,Math.min(1,s)))/D2R;}
function fromPole(colat,bearing,sign){
 const p=sign*POLE.lat*D2R,d=colat*D2R,b=bearing*D2R,la=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(b));
 const lo=(POLE.lon+(sign<0?180:0))*D2R+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(la));return [la/D2R,lo/D2R];}
function sun(ms){const d=new Date(ms),doy=(ms-Date.UTC(d.getUTCFullYear(),0,1))/864e5,h=d.getUTCHours()+d.getUTCMinutes()/60;
 return {dec:-23.44*Math.cos(2*Math.PI*(doy+10)/365),lon:(12-h)*15};}
const elev=(lat,lon,s)=>Math.sin(lat*D2R)*Math.sin(s.dec*D2R)+Math.cos(lat*D2R)*Math.cos(s.dec*D2R)*Math.cos((lon-s.lon)*D2R);
let state={reading:null,error:false,at:0,sel:null},raf=0,shown=null,grown=false,introAt=0,nightCache=null;
function place(){const snap=window.SRSkyTime?.snapshot?.(),l=snap?.loc;const kyiv=T('Київ','Kyiv','Kiev','Kyiv');return l&&Number.isFinite(l.lat)?{lat:l.lat,lon:l.lon,zone:l.zone||'Europe/Kyiv',name:window.SRSkyTime?.placeLabel?.(l)||window.SRSkyTime?.cityLabel?.(l)||l.label||(Math.abs(l.lat-50.45)<.1&&Math.abs(l.lon-30.52)<.1?kyiv:T('Ваше місце','Your place','Su lugar','Votre lieu'))}:{lat:50.45,lon:30.52,zone:'Europe/Kyiv',name:T('Київ','Kyiv','Kiev','Kyiv')};}
function load(){
 const api=window.NRThreeDayForecast;if(!api?.archivedDayIntervals||Date.now()-state.at<10*60000)return;
 state.at=Date.now();api.archivedDayIntervals().then(r=>{state.reading=r;state.error=false;soon();},()=>{state.reading=null;state.error=true;soon();});
}
function rows(){const now=Date.now(),cur=Math.floor(now/SLOT)*SLOT,out=[];for(let k=-2;k<6;k++){const s=cur+k*SLOT,r=state.reading&&now-state.reading.at<=6*3600000&&now<=state.reading.validThrough?state.reading.slots.get(s):null;out.push({start:s,kp:r?r.kp:null,state:r?.state||null,now:k===0});}return out;}
function draw(canvas,kpShown,t,loc,ms){
 const g=canvas.getContext('2d'),r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),W=Math.max(1,r.width),H=Math.max(1,r.height);
 if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 const cx=W/2,cy=H/2,R=Math.min(W,H)*.46,sign=magLat(loc.lat,loc.lon)<0?-1:1;
 const EDGE=Math.min(35,sign*loc.lat-4);
 const pole=sign<0?T('Південний полюс','South Pole','Polo Sur','Pôle Sud'):T('Північний полюс','North Pole','Polo Norte','Pôle Nord');
 const P=(lat,lon)=>{const rr=(90-sign*lat)/(90-EDGE)*R,a=sign*lon*D2R;return [cx+rr*Math.sin(a),cy+rr*Math.cos(a)];};
 // stars
 for(let i=0;i<70;i++){const x=(i*97.3%W),y=(i*57.1%H),a=.25+.25*Math.sin(t*1.1+i);g.fillStyle='rgba(255,255,255,'+a+')';g.fillRect(x,y,1.2,1.2);}
 // globe
 const gl=g.createRadialGradient(cx,cy,R*.1,cx,cy,R);gl.addColorStop(0,'#3a86d6');gl.addColorStop(1,'#16508f');g.fillStyle=gl;g.beginPath();g.arc(cx,cy,R,0,7);g.fill();
 // night side from the real Sun position (cached per minute on a small grid)
 const s=sun(ms),key=[Math.floor(ms/60000),sign,EDGE].join('|');
 if(!nightCache||nightCache.key!==key){const N=140,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),img=x.createImageData(N,N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const dx=(i+.5)/N*2-1,dy=(j+.5)/N*2-1,rr=Math.hypot(dx,dy);if(rr>1)continue;const lat=sign*(90-rr*(90-EDGE)),lon=sign*Math.atan2(dx,dy)/D2R,e=elev(lat,lon,s),k=4*(j*N+i);
   const a=e< -.1?.78:e<.05?.78*(.05-e)/.15:0;img.data[k]=3;img.data[k+1]=6;img.data[k+2]=24;img.data[k+3]=Math.round(a*255);}
  x.putImageData(img,0,0);nightCache={key,c};}
 g.drawImage(nightCache.c,cx-R,cy-R,R*2,R*2);
 // graticule
 g.strokeStyle='rgba(170,200,255,.18)';g.lineWidth=1;g.font='600 10px system-ui,sans-serif';g.fillStyle='rgba(190,210,255,.55)';g.textAlign='center';
 for(const lat of [40,50,60,70,80]){const rr=(90-lat)/(90-EDGE)*R;g.beginPath();g.arc(cx,cy,rr,0,7);g.stroke();if(lat<=60)g.fillText((sign*lat)+'°',cx,cy-rr-3);}
 for(let lon=0;lon<360;lon+=30){const [x,y]=P(sign*EDGE,lon);g.beginPath();g.moveTo(cx,cy);g.lineTo(x,y);g.stroke();}
 g.strokeStyle='rgba(170,200,255,.45)';g.beginPath();g.arc(cx,cy,R,0,7);g.stroke();
 // aurora oval
 if(kpShown!==null){
  const B=boundary(kpShown),kq=Math.max(0,kpShown),width=4+kq*.9,power=.35+kq/9*.65;
  g.save();g.beginPath();g.arc(cx,cy,R,0,7);g.clip();g.globalCompositeOperation='lighter';
  for(let b=0;b<360;b+=2){
   const [la,lo]=fromPole(90-B-width/2,b,sign),[x,y]=P(la,lo),night=Math.max(0,Math.min(1,.5-elev(la,lo,s)*2.5));
   const wave=.55+.45*Math.sin(b*D2R*7-t*1.7)*Math.sin(b*D2R*3+t*.9),a=power*(.25+.75*night)*wave;
   const [la2,lo2]=fromPole(90-B,b,sign),[x2,y2]=P(la2,lo2),[la3,lo3]=fromPole(90-B-width,b,sign),[x3,y3]=P(la3,lo3);
   const cg=g.createLinearGradient(x2,y2,x3,y3);cg.addColorStop(0,'rgba(90,255,160,'+a+')');cg.addColorStop(.55,'rgba(120,255,190,'+a*.6+')');cg.addColorStop(1,'rgba(200,90,255,'+a*.35+')');
   g.strokeStyle=cg;g.lineWidth=Math.max(2,R*.035);g.lineCap='round';g.beginPath();g.moveTo(x2,y2);g.lineTo(x3,y3);g.stroke();
   if(b%6===0){g.fillStyle='rgba(160,255,200,'+a*.5+')';g.beginPath();g.arc(x,y,Math.max(1.5,R*.012),0,7);g.fill();}
  }
  g.restore();
 }
 // your magnetic latitude and place
 const ml=Math.abs(magLat(loc.lat,loc.lon));g.setLineDash([4,4]);g.strokeStyle='rgba(255,220,140,.5)';g.beginPath();
 for(let b=0;b<=360;b+=4){const [la,lo]=fromPole(90-ml,b,sign),[x,y]=P(la,lo);b?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.setLineDash([]);
 const [px,py]=P(loc.lat,loc.lon),pulse=(t*.8)%1;
 g.strokeStyle='rgba(255,220,140,'+(1-pulse)+')';g.lineWidth=2;g.beginPath();g.arc(px,py,4+pulse*12,0,7);g.stroke();
 g.fillStyle='#ffdc8c';g.beginPath();g.arc(px,py,4,0,7);g.fill();
 g.font='700 12px system-ui,sans-serif';g.textAlign=px>cx?'right':'left';g.fillStyle='#fff3d6';g.fillText(loc.name,px+(px>cx?-9:9),py-8);
 g.textAlign='center';g.fillStyle='rgba(230,240,255,.85)';g.font='700 11px system-ui,sans-serif';g.fillText(pole,cx,cy+15);g.beginPath();g.arc(cx,cy,2.5,0,7);g.fill();
}
function mount(){
 const route=document.getElementById('nrRoute-panch'),sky=route?.querySelector(':scope > section.nr-sky'),anchor=route?.querySelector(':scope > [data-moon-hero]')||sky;
 if(!route||!sky||!route.classList.contains('active'))return;
 load();
 let host=route.querySelector(':scope > [data-kp-pulse]');
 if(!host){host=document.createElement('section');host.className='nr-card sr-pulse';host.dataset.kpPulse='';host.setAttribute('aria-labelledby','srPulseTitle');
  host.innerHTML='<h3 id="srPulseTitle"></h3><p class="sr-pu-big" aria-live="polite"></p><div class="sr-pu-art"><canvas role="img"></canvas></div><p class="sr-pu-line"></p><p class="sr-pu-verdict"></p><p class="sr-pu-hint"></p><ol class="sr-pu-bars"></ol><p class="sr-pu-note"></p>';
  host.addEventListener('click',e=>{const b=e.target.closest('button[data-slot]');if(!b)return;state.sel=Number(b.dataset.slot);introAt=performance.now();soon();});}
 if(!host.isConnected)anchor.after(host);
 const loc=place(),list=rows(),locale=window.NRLocale?.locale||'uk-UA',num=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 const clock=new Intl.DateTimeFormat(locale,{timeZone:loc.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 if(state.sel!==null&&!list.some(x=>x.start===state.sel))state.sel=null;
 const cur=list.find(x=>x.now),pick=list.find(x=>x.start===state.sel)||cur,kp=pick?.kp??null;
 const STATE={observed:T('спостереження','observed','observado','observé'),estimated:T('попередня оцінка','estimate','estimación','estimation'),predicted:T('прогноз','forecast','pronóstico','prévision')};
 const WORD={quiet:T('спокійно','quiet','tranquilo','calme'),unsettled:T('неспокійно','unsettled','inestable','instable'),active:T('збурено','active','activo','actif'),storm:T('магнітна буря','geomagnetic storm','tormenta geomagnética','tempête géomagnétique')};
 host.dataset.tone=kp===null?'none':tone(kp);
 host.querySelector('h3').textContent=T('Пульс магнітосфери','Magnetosphere pulse','Pulso de la magnetosfera','Pouls de la magnétosphère');
 const span=pick?clock.format(pick.start)+'–'+clock.format(pick.start+SLOT):'';
 host.querySelector('.sr-pu-big').textContent=kp===null?T('Даних NOAA Kp недостатньо','Not enough NOAA Kp data','Datos Kp de NOAA insuficientes','Données Kp NOAA insuffisantes'):
  (pick.now?T('Зараз','Now','Ahora','Maintenant'):span)+' · Kp '+num.format(kp)+' · '+WORD[tone(kp)]+' ('+STATE[pick.state]+')';
 const ml0=magLat(loc.lat,loc.lon),south=ml0<0,ml=Math.abs(ml0),B=kp===null?null:boundary(kp);
 host.querySelector('.sr-pu-line').textContent=B===null?'':T('Межа сяйва ≈ ','Aurora edge ≈ ','Borde de la aurora ≈ ','Limite de l’aurore ≈ ')+Math.round(B)+T('° магн. широти · ','° magnetic latitude · ','° de latitud magnética · ','° de latitude magnétique · ')+(loc.name||'')+' ≈ '+Math.round(ml)+'°'+(south?T(' (південна)',' (south)',' (sur)',' (sud)'):'');
 host.querySelector('.sr-pu-verdict').textContent=B===null?'':ml>=B?T('Сяйво може бути над головою — якщо ніч і ясно.','Aurora may be overhead if it is dark and clear.','La aurora podría verse en lo alto si es de noche y está despejado.','L’aurore pourrait être au-dessus de vous s’il fait nuit et clair.'):
  ml>=B-7?(south?T('Можливе низько над південним горизонтом — якщо ніч і ясно.','Possible low on the southern horizon if dark and clear.','Posible baja sobre el horizonte sur si es de noche y está despejado.','Possible bas sur l’horizon sud s’il fait nuit et clair.'):T('Можливе низько над північним горизонтом — якщо ніч і ясно.','Possible low on the northern horizon if dark and clear.','Posible baja sobre el horizonte norte si es de noche y está despejado.','Possible bas sur l’horizon nord s’il fait nuit et clair.')):
  T('Тут сяйво малоймовірне: до межі ще ','Aurora is unlikely here: the edge is still ','Aquí la aurora es improbable: el borde está a ','Aurore peu probable ici : la limite est encore à ')+Math.round(B-ml)+(south?T('° на південь (південне сяйво).','° to the south (aurora australis).','° al sur (aurora austral).','° au sud (aurore australe).'):T('° на північ.','° to the north.','° al norte.','° au nord.'));
 host.querySelector('.sr-pu-hint').textContent=T('Натисніть стовпчик, щоб побачити овал сяйва в цей проміжок.','Tap a bar to see the aurora oval for that interval.','Toque una barra para ver el óvalo de la aurora en ese intervalo.','Touchez une barre pour voir l’ovale de l’aurore à ce moment.');
 const ol=host.querySelector('.sr-pu-bars'),sig=JSON.stringify([list,loc.zone,locale]);
 if(ol.dataset.sig!==sig){ol.dataset.sig=sig;ol.replaceChildren(...list.map((x,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.slot=String(x.start);
  b.dataset.tone=x.kp===null?'none':tone(x.kp);if(x.state)b.dataset.state=x.state;b.setAttribute('aria-pressed',String(x.start===(pick?.start)));b.style.setProperty('--h',x.kp===null?'4%':Math.max(6,x.kp/9*100)+'%');b.style.setProperty('--i',String(i));
  b.setAttribute('aria-label',clock.format(x.start)+'–'+clock.format(x.start+SLOT)+': '+(x.kp===null?T('немає даних','no data','sin datos','pas de données'):'Kp '+num.format(x.kp)+', '+STATE[x.state]));
  b.innerHTML='<span class="sr-pu-col"><i></i></span><b>'+(x.kp===null?'—':num.format(x.kp))+'</b><small>'+(x.now?T('зараз','now','ahora','maint.'):clock.format(x.start))+'</small>';li.append(b);return li;}));}
 host.querySelector('.sr-pu-note').textContent=T('Kp — NOAA SWPC, по 3 години; суцільний стовпчик — спостереження, прозорий — прогноз. Карта ілюстративна: межа овалу за орієнтовним правилом 66,5° − 2·Kp, полюс у дипольному наближенні; нічний бік — за положенням Сонця.','Kp from NOAA SWPC in 3-hour intervals; solid bars are observations, translucent ones forecasts. The map is illustrative: oval edge by the rough rule 66.5° − 2·Kp, dipole pole; night side from the Sun position.','Kp de NOAA SWPC cada 3 horas; barras sólidas: observaciones, translúcidas: pronósticos. Mapa ilustrativo: borde del óvalo según la regla aproximada 66,5° − 2·Kp, polo dipolar; lado nocturno según la posición del Sol.','Kp de la NOAA SWPC par intervalles de 3 h ; barres pleines : observations, translucides : prévisions. Carte illustrative : limite de l’ovale selon la règle approchée 66,5° − 2·Kp, pôle dipolaire ; côté nuit selon la position du Soleil.');
 for(const b of ol.querySelectorAll('button'))b.setAttribute('aria-pressed',String(Number(b.dataset.slot)===pick.start));
 const canvas=host.querySelector('canvas');canvas.setAttribute('aria-label',host.querySelector('.sr-pu-big').textContent+'. '+host.querySelector('.sr-pu-line').textContent);
 const still=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('nr-design-motion-off');
 const mapTime=pick.now?Date.now():pick.start+SLOT/2;
 const target=kp;if(!introAt)introAt=performance.now();
 cancelAnimationFrame(raf);
 if(!host.srSeen){host.srSeen=true;host.srVisible=false;new IntersectionObserver(e=>{host.srVisible=e[0].isIntersecting;if(host.srVisible)soon();}).observe(canvas);}
 let lastPaint=0;
 const frame=now=>{raf=0;if(!host.isConnected||!route.classList.contains('active')||document.hidden||!host.srVisible)return;
  if(now-lastPaint<45){raf=requestAnimationFrame(frame);return;}lastPaint=now;
  const k=still?1:Math.min(1,(now-introAt)/1400),e=1-Math.pow(1-k,3),from=shown??target,show=target===null?null:from+(target-from)*e;
  draw(canvas,show,still?0:now/1000,loc,mapTime);
  if(k>=1)shown=target;
  if(!still)raf=requestAnimationFrame(frame);};
 if(!grown&&target!==null&&!still){shown=-6;grown=true;introAt=performance.now();}
 raf=requestAnimationFrame(frame);
}
let pending=0;const soon=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;try{mount();}catch(e){console.warn('Kp pulse:',e);}});};
addEventListener('sr:sky-time',soon);addEventListener('hashchange',soon);document.addEventListener('nr:language',soon);(()=>{const r=()=>document.getElementById('nrRoute-panch');const o=new MutationObserver(()=>{if(r()?.classList.contains('active'))soon();});let n=0;const go=()=>{const el=r();if(el){o.observe(el,{attributes:true,attributeFilter:['class'],childList:true});soon();}else if(n++<60)setTimeout(go,250);};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go,{once:true}):go();})();document.addEventListener('visibilitychange',soon);
setInterval(()=>{if(document.querySelector('#nrRoute-panch.active'))soon();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon);else soon();
})();
