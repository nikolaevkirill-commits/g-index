/* One civil day on NOAA's native three-hour grid. This view never computes a consumer score. */
(() => {
 'use strict';
 const STEP=3*3600000;
 const LANG=['uk','en','es','fr'];
 const TEXT={
  jump:['День по 3 години','Day in 3-hour blocks','Día en bloques de 3 horas','Journée par tranches de 3 heures'],
  title:['День по 3 години','Your day in 3-hour blocks','El día en bloques de 3 horas','La journée par tranches de 3 heures'],
  jyotish:['Джйотіш','Jyotish','Jyotish','Jyotish'],
  sky:['Небо','Sky','Cielo','Ciel'],
  openSky:['Відкрити небо о','Open sky at','Abrir el cielo a las','Ouvrir le ciel à'],
  stars:['Яскраві зорі','Bright stars','Estrellas brillantes','Étoiles brillantes'],
  planets:['Планети','Planets','Planetas','Planètes'],
  daylight:['Денне небо','Daylight','Cielo diurno','Ciel de jour'],
  twilight:['Сутінки','Twilight','Crepúsculo','Crépuscule'],
  none:['Серед вибраних об’єктів немає високих над горизонтом','None of the selected objects is high above the horizon','Ninguno de los objetos seleccionados está alto sobre el horizonte','Aucun des objets sélectionnés n’est haut au-dessus de l’horizon'],
  note:['Місцевий час. Межі доби обрізають крайні інтервали NOAA. Небо розраховано для середини інтервалу, хмарність не враховано.','Local time. The day boundaries clip the first and last NOAA intervals. Sky positions are for the midpoint, without cloud cover.','Hora local. Los límites del día recortan los intervalos extremos de NOAA. Las posiciones corresponden al punto medio, sin nubosidad.','Heure locale. Les limites du jour raccourcissent les intervalles NOAA extrêmes. Les positions sont calculées au milieu de l’intervalle, sans nébulosité.'],
  loading:['Звіряємо NOAA…','Verifying NOAA…','Verificando NOAA…','Vérification NOAA…'],
  stale:['Квитанція NOAA застаріла','NOAA receipt is out of date','Datos de NOAA desactualizados','Données NOAA périmées'],
  missing:['Немає підтверджених даних NOAA','No verified NOAA data','Sin datos verificados de NOAA','Aucune donnée NOAA vérifiée'],
  noSlot:['Для цього інтервалу даних немає','No data for this interval','No hay datos para este intervalo','Aucune donnée pour cet intervalle'],
  unavailable:['Розрахунок недоступний','Calculation unavailable','Cálculo no disponible','Calcul indisponible'],
  received:['NOAA, отримано','NOAA, retrieved','NOAA, recibido','NOAA, reçu'],
  observed:['спостереження','observed','observado','observé'],
  estimated:['попередня оцінка','estimated','estimado','estimé'],
  predicted:['прогноз','forecast','pronóstico','prévision'],
  tithi:['Тітхі','Tithi','Tithi','Tithi'],
  nakshatra:['Накшатра','Nakshatra','Nakshatra','Nakshatra'],
  yoga:['Йога','Yoga','Yoga','Yoga'],
  karana:['Карана','Karana','Karana','Karana'],
  sunrise:['Схід Сонця','Sunrise','Salida del Sol','Lever du Soleil'],
  sunset:['Захід Сонця','Sunset','Puesta del Sol','Coucher du Soleil'],
  moonrise:['Схід Місяця','Moonrise','Salida de la Luna','Lever de la Lune'],
  moonset:['Захід Місяця','Moonset','Puesta de la Luna','Coucher de la Lune'],
  Venus:['Венера','Venus','Venus','Vénus'], Mars:['Марс','Mars','Marte','Mars'],
  Jupiter:['Юпітер','Jupiter','Júpiter','Jupiter'], Saturn:['Сатурн','Saturn','Saturno','Saturne'],
  Mercury:['Меркурій','Mercury','Mercurio','Mercure']
 };
 // ICRS at J2000, CDS SIMBAD. Precision here serves a coarse horizon guide.
 const STARS=[
  [['Сіріус','Sirius','Sirio','Sirius'],6.752477,-16.716116],
  [['Вега','Vega','Vega','Véga'],18.615649,38.783689],
  [['Капелла','Capella','Capella','Capella'],5.278155,45.997992],
  [['Рігель','Rigel','Rigel','Rigel'],5.242298,-8.201638],
  [['Арктур','Arcturus','Arturo','Arcturus'],14.261021,19.182409]
 ];
 const PLANETS=['Venus','Jupiter','Mars','Saturn','Mercury'];
 const KINDS=['tithi','nakshatra','yoga','karana'];
 let current=null;
 const lang=()=>Math.max(0,LANG.indexOf(window.NRLocale?.language));
 const t=key=>TEXT[key][lang()];
 const el=(tag,words)=>{const node=document.createElement(tag);if(words)node.textContent=words;return node;};
 const instant=ms=>new Date(ms).toISOString();

 function lunarEvents(start,end){
  const core=window.SkyRhythmLunar;
  if(!core?.available())return [];
  const initial=core.at(start), list=[];
  for(const kind of ['tithi','nakshatra']){
   let from=initial[kind], cursor=start;
   for(let i=0;i<3;i++){
    const next=core.nextTransition(cursor,kind,from);
    if(!next||next.utcMs>=end)break;
    list.push({kind,at:next.utcMs,value:next.to});
    cursor=next.utcMs;from=next.to;
   }
  }
  return list.sort((a,b)=>a.at-b.at);
 }

 function skyEvents(A,observer,start,end){
  return [['Sun',1,'sunrise'],['Sun',-1,'sunset'],['Moon',1,'moonrise'],['Moon',-1,'moonset']].flatMap(([body,sign,kind])=>{
   const event=A.SearchRiseSet(body,observer,sign,new Date(start),(end-start)/86400000);
   return event&&+event.date>=start&&+event.date<end?[{kind,at:+event.date}]:[];
  }).sort((a,b)=>a.at-b.at);
 }

 function skyAt(A,observer,at){
  const time=new Date(at);
  const horizon=(ra,dec)=>A.Horizon(time,observer,ra,dec,'normal').altitude;
  const altitude=body=>{const eq=A.Equator(body,time,observer,true,true);return horizon(eq.ra,eq.dec);};
  const sun=altitude('Sun');
  if(sun>0)return {light:'daylight',planets:[],stars:[]};
  const planets=PLANETS.filter(p=>altitude(p)>8&&A.Illumination(p,time).mag<=2).map(t);
  if(sun>-12)return {light:'twilight',planets,stars:[]};
  const frame=A.MakeTime(time),rotation=A.Rotation_EQJ_EQD(frame), rad=Math.PI/180;
  const stars=STARS.flatMap(([names,ra,dec])=>{
   const a=ra*15*rad,d=dec*rad;
   const j2000=new A.Vector(Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d),frame);
   const eq=A.EquatorFromVector(A.RotateVector(rotation,j2000));
   return horizon(eq.ra,eq.dec)>12?[names[lang()]]:[];
  });
  return {light:null,planets,stars};
 }

 function addEvents(line,events,clock,naming){
  for(const event of events){
   const paragraph=el('p'),time=el('time',clock.format(event.at));
   time.dateTime=instant(event.at);
   paragraph.append(time,document.createTextNode(' · '+t(event.kind)+(naming?' → '+naming(event.kind,event.value):'')));
   line.append(paragraph);
  }
 }

 function openSky(at){
  if(window.SRSkyTime?.selectMoment(instant(at)))window.fp434Go?.('panch',true);
 }

 function renderSection(panel,date,loc){
  const locale=window.NRLocale?.locale||'uk-UA';
  const clock=new Intl.DateTimeFormat(locale,{timeZone:loc.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const formatDay=new Intl.DateTimeFormat(locale,{timeZone:'UTC',dateStyle:'long'});
  const summary=el('p',window.SRSkyTime.cityLabel(loc)+' · '+formatDay.format(new Date(date+'T12:00:00Z'))+' · '+loc.zone);
  summary.className='sr-day-three-place';
  const hint=el('p',t('note'));
  hint.className='sr-day-three-note';
  const status=el('p',t('loading'));status.dataset.dayThreeNoaa='';
  const heading=el('h2',t('title'));heading.id='srDayThreeTitle';
  panel.replaceChildren(heading,summary,hint,status);
  const civil=window.SkyRhythmCivil.dayIntervals(date,loc.zone);
  if(civil.status!=='available')throw Error(civil.status);
  const start=+civil.start,end=+civil.end,A=window.Astronomy;
  const observer=new A.Observer(loc.lat,loc.lon,loc.elevation||0);
  const skyChanges=skyEvents(A,observer,start,end), jyotishChanges=lunarEvents(start,end);
  const name=(kind,value)=>window.SkyRhythmI18n.name(kind,value,LANG[lang()]);
  const rows=el('ol');
  const points=[];
  for(let slot=Math.floor(start/STEP)*STEP;slot<end;slot+=STEP){
   const left=Math.max(start,slot),right=Math.min(end,slot+STEP),middle=Math.floor((left+right)/2);
   const row=el('li');
   row.dataset.slot=instant(slot);
   const header=el('div');header.className='sr-day-three-row-title';
   const time=el('time',clock.format(left)+'–'+clock.format(right));
   time.dateTime=instant(left);
   if(right-left<STEP)row.dataset.clipped='';
   const link=el('button',t('openSky')+' '+clock.format(middle));
   link.type='button';link.dataset.skyAt=instant(middle);
   link.onclick=()=>openSky(middle);
   header.append(time,link);
   const details=el('dl');
   const noaa=el('dd',t('loading'));noaa.dataset.slotNoaa='';
   const jt=el('dd');
   const lunar=window.SkyRhythmLunar;
   if(lunar?.available()){
    const state=lunar.at(left);
    jt.append(el('p',KINDS.slice(0,2).map(k=>t(k)+' '+name(k,state[k])).join(' · ')),
     el('p',KINDS.slice(2).map(k=>t(k)+' '+name(k,state[k])).join(' · ')));
    addEvents(jt,jyotishChanges.filter(v=>v.at>=left&&v.at<right),clock,name);
   }else jt.append(el('p',t('unavailable')));
   const sky=el('dd'),snapshot=skyAt(A,observer,middle);
   if(snapshot.light)sky.append(el('p',t(snapshot.light)));
   if(snapshot.planets.length)sky.append(el('p',t('planets')+' · '+snapshot.planets.join(', ')));
   if(snapshot.stars.length)sky.append(el('p',t('stars')+' · '+snapshot.stars.join(', ')));
   if(!snapshot.light&&!snapshot.planets.length&&!snapshot.stars.length)sky.append(el('p',t('none')));
   addEvents(sky,skyChanges.filter(v=>v.at>=left&&v.at<right),clock);
   details.append(el('dt','NOAA · Kp'),noaa,el('dt',t('jyotish')),jt,el('dt',t('sky')),sky);
   row.append(header,details);
   rows.append(row);
   points.push({slot,noaa});
  }
  panel.append(rows);
  return {status,points,locale};
 }

 async function refreshNoaa(session){
  if(!session.view)return;
  const request=Symbol();
  session.request=request;
  const {status,points,locale}=session.view;
  const settle=state=>{
   status.textContent=t(state);
   for(const {noaa} of points)noaa.textContent=t('noSlot');
  };
  try{
   const data=await window.NRThreeDayForecast.archivedDayIntervals();
   if(current!==session||request!==session.request)return;
   const number=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
   const form=new Intl.DateTimeFormat(locale,{timeZone:session.loc.zone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
   for(const {slot,noaa} of points){
    const row=data.slots.get(slot);
    noaa.textContent=row?'Kp '+number.format(row.kp)+' · '+t(row.state):t('noSlot');
   }
   status.textContent=t('received')+' '+form.format(data.at);
  }catch(error){
   if(current===session&&request===session.request)settle(error.message==='stale'?'stale':'missing');
  }
 }

 function mount(root,date,active){
  let panel=root.querySelector('[data-day-three]');
  let jump=root.querySelector('[data-day-three-jump]');
  if(!active){
   if(panel)panel.hidden=true;
   if(jump)jump.hidden=true;
   current=null;
   return;
  }
  const verdict=root.querySelector('[data-forecast-verdict]'),heading=root.querySelector('.nr-o-heading');
  if(!verdict||!heading)return;
  if(!panel){
   panel=el('section');panel.className='sr-day-three';panel.dataset.dayThree='';
   panel.id='srDayThree';
   panel.tabIndex=-1;
   panel.setAttribute('aria-labelledby','srDayThreeTitle');
   verdict.after(panel);
  }
  if(!jump){
   jump=el('button');
   jump.type='button';
   jump.dataset.dayThreeJump='';
   jump.setAttribute('aria-controls',panel.id);
   jump.onclick=()=>{
    panel.scrollIntoView({block:'start',behavior:'instant'});
    panel.focus({preventScroll:true});
   };
   heading.append(jump);
  }
  jump.textContent=t('jump');
  panel.hidden=false;
  jump.hidden=false;
  const loc=window.SRSkyTime?.place(true);
  if(!loc||!window.SkyRhythmCivil||!window.Astronomy||!window.SkyRhythmI18n){
   if(document.readyState!=='complete'&&!panel.dataset.waiting){
    panel.dataset.waiting='';
    window.addEventListener('load',()=>{delete panel.dataset.waiting;if(!panel.hidden)mount(root,root.querySelector('select')?.value||date,true);},{once:true});
   }
   return;
  }
  const key=[date,loc.lat,loc.lon,loc.zone,loc.elevation,window.SRSkyTime.cityLabel(loc),lang()].join('|');
  if(current?.key===key&&current.panel===panel)return;
  const session={root,date,panel,loc,key};
  current=session;
  try{session.view=renderSection(panel,date,loc);}catch{
   const heading=el('h2',t('title'));heading.id='srDayThreeTitle';
   panel.replaceChildren(heading,el('p',t('unavailable')));
  }
  refreshNoaa(session);
 }

 window.NRForecastDayTimeline=Object.freeze({mount});
 for(const event of ['pageshow','online'])window.addEventListener(event,()=>{if(current)refreshNoaa(current);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current)refreshNoaa(current);});
 const refreshContext=()=>{if(current)mount(current.root,current.date,true);};
 document.addEventListener('nr:location',refreshContext);
 window.addEventListener('nr:locale',refreshContext);
 window.setInterval(()=>{if(!document.hidden&&current&&!current.panel.hidden)refreshNoaa(current);},300000);
})();
