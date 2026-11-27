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

 function skyNotes(loc,at){
  const A=window.Astronomy;
  if(!A)return [];
  const view=skyAt(A,new A.Observer(loc.lat,loc.lon,loc.elevation||0),at);
  return [view.planets.length?t('planets')+' · '+view.planets.join(', '):'',view.stars.length?t('stars')+' · '+view.stars.join(', '):''].filter(Boolean);
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
   panel=el('section');panel.className='sr-day-strip';panel.dataset.dayThree='';panel.dataset.dayStrip='';
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
  current={root,date,panel};
  window.NRThreeDayForecast.mountDayStrip(panel,date,true);
 }

 function refresh(){
  if(!current||document.hidden)return;
  current.panel.dataset.stripAt='0';
  mount(current.root,current.date,true);
 }
 window.NRForecastDayTimeline=Object.freeze({mount,skyNotes});
 for(const event of ['pageshow','online','nr:locale'])window.addEventListener(event,refresh);
 document.addEventListener('visibilitychange',refresh);
 document.addEventListener('nr:location',refresh);
 window.setInterval(refresh,300000);
})();
