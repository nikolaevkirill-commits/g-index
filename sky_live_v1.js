// FP565 «Небо зараз над вами»: Moon with computed phase and bright-limb orientation, Sun/Moon/planets
// altitude-azimuth for the saved place, aurora possibility from NOAA G-scale and the day's Kp.
// All visual positions share one astronomy-engine instant. The clock does not feed the score.
(function(){
'use strict';
if(window.NRSkyLive)return;
const BODIES=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
// Geomagnetic north (dipole) pole, IGRF-14 epoch 2025: 80.8°N, 72.8°W (WDC Kyoto, poles table).
const POLE={lat:80.8,lon:-72.8};
// NOAA Space Weather Scales (G2–G5): "aurora has been seen as low as … (typically N° geomagnetic lat.)".
// G1 (Kp 5) gives no latitude ("high latitudes"), so it is not mapped to a number here.
const NOAA_G=[[9,40],[8,45],[7,50],[6,55]];
const lang=()=>{const l=window.NRLocale?.language||'uk';return ['uk','en','es','fr'].includes(l)?l:'en'};
const tr=s=>STR.find(r=>r[0]===s)?.[li()]||window.NRLocale?.text(s)||s;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const NAMES={Sun:['Сонце','Sun','Sol','Soleil'],Moon:['Місяць','Moon','Luna','Lune'],Mercury:['Меркурій','Mercury','Mercurio','Mercure'],
 Venus:['Венера','Venus','Venus','Vénus'],Mars:['Марс','Mars','Marte','Mars'],Jupiter:['Юпітер','Jupiter','Júpiter','Jupiter'],Saturn:['Сатурн','Saturn','Saturno','Saturne']};
const COMPASS={uk:['Пн','ПнС','С','ПдС','Пд','ПдЗ','З','ПнЗ'],en:['N','NE','E','SE','S','SW','W','NW'],es:['N','NE','E','SE','S','SO','O','NO'],fr:['N','NE','E','SE','S','SO','O','NO']};
const li=()=>['uk','en','es','fr'].indexOf(lang());
const name=b=>NAMES[b][li()];
const compass=az=>COMPASS[lang()][Math.round(((az%360)+360)%360/45)%8];
const STR=[
 ['Небо зараз над вами','The sky above you now','El cielo sobre usted ahora','Le ciel au-dessus de vous maintenant'],
 ['над горизонтом','above the horizon','sobre el horizonte','au-dessus de l’horizon'],
 ['під горизонтом','below the horizon','bajo el horizonte','sous l’horizon'],
 ['Освітлено','Illuminated','Iluminada','Éclairée'],
 ['росте','waxing','creciente','croissante'],
 ['спадає','waning','menguante','décroissante'],
 ['Орієнтація: зеніт угорі, як на вашому небі.','Orientation: zenith up, as in your sky.','Orientación: cénit arriba, como en su cielo.','Orientation : zénith en haut, comme dans votre ciel.'],
 ['Орієнтація: північ угорі (місце не задано).','Orientation: north up (no location set).','Orientación: norte arriba (sin ubicación).','Orientation : nord en haut (lieu non défini).'],
 ['Вкажіть місце в «Місце й вигляд», щоб побачити, що над горизонтом. Координати іншого міста не підставляються.','Set your location in “Location and appearance” to see what is above the horizon. Another city’s coordinates are not substituted.','Indique su ubicación en «Ubicación y aspecto» para ver qué hay sobre el horizonte. No se sustituyen coordenadas de otra ciudad.','Indiquez votre lieu dans « Lieu et apparence » pour voir ce qui est au-dessus de l’horizon. Les coordonnées d’une autre ville ne sont pas substituées.'],
 ['Сяйво','Aurora','Aurora','Aurore'],
 ['Ваша геомагнітна широта','Your geomagnetic latitude','Su latitud geomagnética','Votre latitude géomagnétique'],
 ['За шкалою NOAA при такому Kp сяйво бачили до','On the NOAA scale, at this Kp aurora has been seen as low as','Según la escala NOAA, con este Kp la aurora se ha visto hasta','Selon l’échelle NOAA, à ce Kp l’aurore a été vue jusqu’à'],
 ['Даних Kp немає — оцінки сяйва немає.','No Kp data — no aurora estimate.','Sin datos de Kp — sin estimación de aurora.','Pas de données Kp — pas d’estimation d’aurore.'],
 ['Це межа «бачили до», а не ймовірність; хмари й засвітка не враховані.','This is a “seen as low as” limit, not a probability; clouds and light pollution are not included.','Es un límite «se ha visto hasta», no una probabilidad; no incluye nubes ni contaminación lumínica.','C’est une limite « vue jusqu’à », pas une probabilité ; nuages et pollution lumineuse non pris en compte.'],
 ['Розрахунок','Calculation','Cálculo','Calcul'],
 ['прогноз Kp на добу','daily Kp forecast','pronóstico diario de Kp','prévision Kp journalière'],
];
STR.push(
 ['Орієнтир, не локальний прогноз','Reference, not a local forecast','Referencia, no un pronóstico local','Repère, pas une prévision locale'],
 ['Для цього Kp шкала не задає числової межі широти.','For this Kp the scale gives no numeric latitude limit.','Para este Kp la escala no da un límite numérico de latitud.','Pour ce Kp, l’échelle ne donne pas de limite numérique de latitude.'],
 ['Ймовірність побачити сяйво тут не розрахована.','The probability of seeing aurora here is not calculated.','No se calcula la probabilidad de ver auroras aquí.','La probabilité de voir une aurore ici n’est pas calculée.'],
 ['За денного світла сяйва не видно.','Aurora is not visible in daylight.','La aurora no es visible a la luz del día.','L’aurore n’est pas visible à la lumière du jour.'],
 ['Широта — наближення диполя IGRF-14, епоха 2025.','Latitude uses the IGRF-14 dipole approximation, epoch 2025.','Latitud aproximada con el dipolo IGRF-14, época 2025.','Latitude approchée par le dipôle IGRF-14, époque 2025.'],
 ['Спостереження Kp NOAA','Observed NOAA Kp','Kp observado NOAA','Kp observé NOAA'],
 ['Оцінка Kp GFZ','GFZ nowcast Kp','Kp estimado de GFZ','Kp estimé par GFZ'],
 ['Попередня оцінка Kp NOAA','Provisional NOAA Kp estimate','Estimación provisional de Kp NOAA','Estimation provisoire Kp NOAA'],
 ['Максимум за добу Києва · прогноз NOAA, 3 дні','Kyiv daily maximum · NOAA 3-day forecast','Máximo diario de Kyiv · pronóstico NOAA de 3 días','Maximum journalier de Kyiv · prévision NOAA à 3 jours'],
 ['Орієнтир на добу UTC · NOAA, 27 днів','UTC-day outlook · NOAA, 27 days','Perspectiva del día UTC · NOAA, 27 días','Tendance du jour UTC · NOAA, 27 jours'],
 ['Хмари, засвітка й локальна карта OVATION тут не враховані.','Clouds, light pollution and a local OVATION map are not included here.','No se incluyen nubes, contaminación lumínica ni un mapa OVATION local.','Nuages, pollution lumineuse et carte OVATION locale ne sont pas inclus.'],
 ['Джерела','Sources','Fuentes','Sources'],
 ['Північ на обох краях; лінія — горизонт.','North at both edges; the line is the horizon.','Norte en ambos extremos; la línea es el horizonte.','Nord aux deux extrémités ; la ligne est l’horizon.'],
 ['Розрахунок неба недоступний.','Sky calculation unavailable.','Cálculo del cielo no disponible.','Calcul du ciel indisponible.'],
 ['Звичайна атмосферна рефракція; погода й рельєф не враховані.','Standard atmospheric refraction; weather and terrain are not included.','Refracción atmosférica estándar; no incluye tiempo ni relieve.','Réfraction atmosphérique standard ; météo et relief non inclus.']
);
function geomagLat(lat,lon){
 const s=Math.sin(rad(lat))*Math.sin(rad(POLE.lat))+Math.cos(rad(lat))*Math.cos(rad(POLE.lat))*Math.cos(rad(lon-POLE.lon));
 return deg(Math.asin(Math.max(-1,Math.min(1,s))));
}
function auroraFor(mlat,kp){
 if(!Number.isFinite(kp)||kp<0||kp>9)return {state:'no_kp'};
 if(!Number.isFinite(mlat)||Math.abs(mlat)>90)return {state:'no_location'};
 const row=NOAA_G.find(([k])=>kp>=k);
 return row?{state:'historical_extent',kp,limit:row[1]}:{state:'no_numeric_limit',kp};
}
// Position angle of the Moon's bright limb (Meeus, Astronomical Algorithms, eq. 48.5), degrees from north via east.
function brightLimb(sun,moon){
 const a0=rad(sun.ra*15),d0=rad(sun.dec),a=rad(moon.ra*15),d=rad(moon.dec);
 return (deg(Math.atan2(Math.cos(d0)*Math.sin(a0-a),Math.sin(d0)*Math.cos(d)-Math.cos(d0)*Math.sin(d)*Math.cos(a0-a)))+360)%360;
}
function parallactic(time,obs,eq){
 const H=rad(((Astronomy.SiderealTime(time)*15+obs.longitude-eq.ra*15)%360+360)%360),phi=rad(obs.latitude),d=rad(eq.dec);
 return deg(Math.atan2(Math.sin(H),Math.tan(phi)*Math.cos(d)-Math.sin(d)*Math.cos(H)));
}
function compute(now,loc){
 const time=Astronomy.MakeTime(now),obs=loc?new Astronomy.Observer(loc.lat,loc.lon,Number.isFinite(loc.elevation)?loc.elevation:0):null;
 const eq={},hz={};
 for(const b of BODIES){eq[b]=loc?Astronomy.Equator(b,time,obs,true,true):Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time),Astronomy.GeoVector(b,time,true)));if(loc)hz[b]=Astronomy.Horizon(time,obs,eq[b].ra,eq[b].dec,'normal');}
 const ill=Astronomy.Illumination('Moon',time),chi=brightLimb(eq.Sun,eq.Moon);
 const q=loc?parallactic(time,obs,eq.Moon):0;
 const phase=Astronomy.MoonPhase(time); // 0 new, 90 first quarter, 180 full, 270 last quarter
 return {time:now,loc,hz,fraction:ill.phase_fraction,phaseAngle:ill.phase_angle,phase,chi,q,limb:(chi-q+360)%360,waxing:phase<180};
}
// Lit region: bright half toward +x, terminator ellipse with rx = r·|1−2k|; then rotated to the limb angle.
function moonSvg(c,size){
 const r=size/2-4,k=c.fraction,rx=Math.abs(1-2*k)*r,sweep=k>0.5?1:0;
 const th=rad(c.limb),rot=deg(Math.atan2(-Math.cos(th),-Math.sin(th))); // north/zenith up, east left
 const lit=`M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${-r}Z`;
 return `<svg class="nr-sl-moon" viewBox="${-size/2} ${-size/2} ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(name('Moon')+': '+tr('Освітлено')+' '+Math.round(k*100)+'%')}" data-fraction="${k.toFixed(6)}" data-limb="${c.limb.toFixed(3)}" data-rx="${rx.toFixed(3)}">
<defs><radialGradient id="nrSlLit" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#fffbea"/><stop offset=".6" stop-color="#e9e3cf"/><stop offset="1" stop-color="#a9a28c"/></radialGradient>
<radialGradient id="nrSlDark" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#2b3247"/><stop offset="1" stop-color="#0d1120"/></radialGradient></defs>
<circle r="${r}" fill="url(#nrSlDark)"/><g transform="rotate(${rot.toFixed(2)})"><path d="${lit}" fill="url(#nrSlLit)"/></g>
<circle r="${r}" fill="none" stroke="rgba(255,255,255,.18)"/></svg>`;
}
// Sky strip: azimuth 0–360 (N→E→S→W→N) left→right, altitude −90…90 bottom→top. Dots placed from computed values.
function skySvg(c){
 const W=360,H=180,y=a=>(90-a),x=az=>az/360*W;
 let s=`<svg class="nr-sl-sky" viewBox="0 0 ${W} ${H+16}" role="img" aria-label="${esc(tr('Небо зараз над вами'))}"><rect width="${W}" height="${y(0)}" class="nr-sl-air"/><rect y="${y(0)}" width="${W}" height="${H-y(0)}" class="nr-sl-ground"/><line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="nr-sl-horizon"/>`;
 for(let i=0;i<8;i++)s+=`<text x="${x(i*45)+(i?0:6)}" y="${H+12}" class="nr-sl-tick">${esc(COMPASS[lang()][i])}</text>`;
 // Labels only: shift a label down/up when it would overlap another one; the dot stays at the computed point.
 const placed=[];
 for(const b of [...BODIES].sort((p,q)=>(c.hz[p]?.azimuth||0)-(c.hz[q]?.azimuth||0))){const h=c.hz[b];if(!h)continue;
  const px=x(h.azimuth),py=y(h.altitude),right=px>W-60;let dy=3;
  for(let k=0;k<6&&placed.some(o=>Math.abs(o.x-px)<70&&Math.abs(o.y-(py+dy))<14);k++)dy+=(k%2?-1:1)*(k+1)*14;
  dy=Math.max(9-py,Math.min(H-3-py,dy));placed.push({x:px,y:py+dy});
  s+=`<g class="nr-sl-body is-${b.toLowerCase()}${h.altitude>0?'':' is-below'}" data-body="${b}" data-alt="${h.altitude.toFixed(3)}" data-az="${h.azimuth.toFixed(3)}" style="transform:translate(${px.toFixed(1)}px,${py.toFixed(1)}px)"><line x1="0" y1="0" x2="${right?-7:7}" y2="${dy-3}" stroke="currentColor" stroke-opacity=".4"/><circle r="${b==='Sun'?6:b==='Moon'?5:3}"/><text x="${right?-7:7}" y="${dy}"${right?' text-anchor="end"':''}>${esc(name(b))}</text></g>`;}
 return s+'</svg>';
}
function selectKp(live,snapshot,now=Date.now(),online=navigator.onLine){
 if(!online)return {kp:null,kind:'missing'};
 const valid=k=>Number.isFinite(k)&&k>=0&&k<=9;
 const observed=window.SRP0Layout?.currentSignal(live,now,online);
 if(valid(observed?.kp)&&Number.isFinite(observed.observedAt)&&observed.observedAt<=now+300000)
  return {kp:observed.kp,kind:observed.provider==='gfz'?'gfz':observed.provisional?'provisional':'observed',stamp:observed.observedAt};
 const c=snapshot?.calculation,stamp=Date.parse(c?.generated_at),state=snapshot?.formula?.state||snapshot?.display?.state;
 if(state!=='fresh'||!valid(c?.kp_daily_max)||!Number.isFinite(stamp)||stamp>now+300000||now-stamp>7200000)return {kp:null,kind:'missing'};
 const kind=c.kp_source==='NOAA_3day_slots'?'forecast3':c.kp_source==='NOAA_27day_outlook'?'outlook27':null;
 return kind?{kp:c.kp_daily_max,kind,stamp}:{kp:null,kind:'missing'};
}
function kpToday(){
 const ds=window.NRCivilTime?.dayKey?.(Date.now(),'Europe/Kyiv');
 return selectKp(window.currentKpAuthority?.(),ds&&window.NRConsumerOverview?.snapshot?.(ds));
}
function auroraHtml(c){
 if(!c.loc)return '';
 const mlat=geomagLat(c.loc.lat,c.loc.lon),k=kpToday(),a=auroraFor(mlat,k.kp);
 const nf=new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2});
 const labels={observed:'Спостереження Kp NOAA',provisional:'Попередня оцінка Kp NOAA',gfz:'Оцінка Kp GFZ',forecast3:'Максимум за добу Києва · прогноз NOAA, 3 дні',outlook27:'Орієнтир на добу UTC · NOAA, 27 днів'};
 const body=(a.state==='no_kp'?tr('Даних Kp немає — оцінки сяйва немає.'):a.limit?tr('За шкалою NOAA при такому Kp сяйво бачили до')+' ~'+a.limit+'°.':tr('Для цього Kp шкала не задає числової межі широти.'))+' '+tr('Ваша геомагнітна широта')+': ≈ '+nf.format(mlat)+'°.';
 const stamp=Number.isFinite(k.stamp)?(['forecast3','outlook27'].includes(k.kind)?tr('Розрахунок')+': ':'')+new Date(k.stamp).toISOString().replace('T',' ').slice(0,16)+' UTC':'';
 return `<div class="nr-sl-aurora" data-aurora="${a.state}" data-mlat="${mlat.toFixed(2)}" data-kp-kind="${k.kind}"><b>${esc(tr('Сяйво'))} · ${esc(tr('Орієнтир, не локальний прогноз'))}</b><p>${esc(body)}</p>${k.kp!==null?`<p>Kp ${esc(nf.format(k.kp))} · ${esc(tr(labels[k.kind]))} · ${esc(stamp)}</p>`:''}<p>${esc(tr('Ймовірність побачити сяйво тут не розрахована.'))} ${c.hz.Sun?.altitude>0?esc(tr('За денного світла сяйва не видно.')):''}</p><small>${esc(tr('Хмари, засвітка й локальна карта OVATION тут не враховані.'))} ${esc(tr('Широта — наближення диполя IGRF-14, епоха 2025.'))}</small></div>`;
}
function listHtml(c){
 if(!c.loc)return `<p class="nr-sl-noloc">${esc(tr('Вкажіть місце в «Місце й вигляд», щоб побачити, що над горизонтом. Координати іншого міста не підставляються.'))}</p>`;
 const nf=new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2});
 return '<ul class="nr-sl-list">'+BODIES.map(b=>{const h=c.hz[b];return `<li data-body="${b}" class="${h.altitude>0?'is-up':'is-down'}"><b>${esc(name(b))}</b> ${esc(nf.format(h.altitude))}° · ${esc(compass(h.azimuth))} ${esc(nf.format(h.azimuth))}° — ${esc(tr(h.altitude>0?'над горизонтом':'під горизонтом'))}</li>`}).join('')+'</ul>';
}
const STYLE=`.nr-sl{margin:14px 0;padding:18px;overflow:hidden}.nr-sl a{color:inherit}.nr-sl-aurora p{margin:.35rem 0}.nr-sl-chart-note{font-size:.8rem;opacity:.8}.nr-sl h2{margin:0 0 8px}
.nr-sl-top{display:grid;gap:10px;align-items:center}.nr-sl-map{min-width:0}.nr-sl-map .nr-sl-chart-note{margin:4px 0 0}.nr-sl-moonbox{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:140px}
.nr-sl-list{list-style:none;margin:12px 0 0;padding:0;font-size:.92rem;line-height:1.55}
@media(min-width:670px){.nr-sl-top{grid-template-columns:minmax(10rem,1fr) minmax(0,3fr)}.nr-sl-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:10px}}.nr-sl-list .is-down{opacity:.6}
.nr-sl-sky{width:100%;max-width:640px;height:auto;margin:10px auto 0;display:block}.nr-sl-air{fill:rgba(60,90,150,.18)}.nr-sl-ground{fill:rgba(0,0,0,.35)}.nr-sl-horizon{stroke:rgba(255,255,255,.4)}
.nr-sl-tick{fill:currentColor;font-size:11px;opacity:.85}.nr-sl-body circle{fill:#cfd8ff}.nr-sl-body.is-sun circle{fill:#ffd36b}.nr-sl-body.is-moon circle{fill:#f3efe0}
.nr-sl-body text{fill:currentColor;font-size:12px}.nr-sl-body.is-below{opacity:.65}
.nr-sl.nr-sl-motion .nr-sl-body{transition:transform .32s ease}
.nr-sl.nr-sl-motion:not([data-clock-mode=now]) .nr-sl-body{transition:none}
.nr-sl .nr-sl-air{fill:rgb(29 91 154 / calc(.16 + .58 * var(--sky-light,0)))}
.nr-sl .nr-sl-moonbox{border:1px solid #526c95;border-radius:22px;background:radial-gradient(ellipse at 50% 28%,#344267,#111a32 72%);padding:10px 8px;text-align:center}
.nr-sl .nr-sl-moonbox small{max-width:16rem}
.nr-sl-body.is-mercury circle{fill:#bfc6d3}.nr-sl-body.is-venus circle{fill:#ffd1a5}.nr-sl-body.is-mars circle{fill:#ff8d70}.nr-sl-body.is-jupiter circle{fill:#ffbf86}.nr-sl-body.is-saturn circle{fill:#ead98d}
@media (prefers-reduced-motion:reduce){.nr-sl-body{transition:none!important}}
.nr-sl-aurora{margin:.6rem 0 0;font-size:.92rem}.nr-sl-aurora span,.nr-sl-aurora small{display:block;opacity:.85;font-size:.82rem}
.nr-sl-foot{margin:.5rem 0 0;font-size:.78rem;opacity:.8}.nr-sl-noloc{margin:0;font-size:.92rem}`;
let host=null,retry=null,last=null,moonCanvas=null,updateControls;
function drawMoon(c){
 const box=host?.querySelector('.nr-sl-moonbox'),svg=box?.querySelector('.nr-sl-moon');if(!svg)return;
 const showSvg=()=>{svg.style.display='';if(moonCanvas)moonCanvas.hidden=true;};
 if(!window.NRMoonGL||navigator.connection?.saveData||dataReduced.matches){showSvg();return;}
 if(!moonCanvas){moonCanvas=document.createElement('canvas');moonCanvas.className='nr-sl-moon-gl';moonCanvas.setAttribute('role','img');}
 if(moonCanvas.parentElement!==box)svg.after(moonCanvas);
 moonCanvas.setAttribute('aria-label',svg.getAttribute('aria-label'));
 const ok=NRMoonGL.draw(moonCanvas,{phaseAngle:c.phaseAngle,limb:c.limb,size:132});
 if(ok){svg.style.display='none';moonCanvas.hidden=false;}else showSvg();
}
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),dataReduced=matchMedia('(prefers-reduced-data:reduce)');
function active(){return !document.hidden&&location.hash.split('?')[0]==='#panch';}
function motion(){
 const on=active()&&document.documentElement.classList.contains('sr-sky-motion')&&!reduced.matches&&!dataReduced.matches&&!navigator.connection?.saveData;
 if(host){host.classList.toggle('nr-sl-motion',on);if(!on)for(const a of host.getAnimations({subtree:true}))a.cancel();}
 return on;
}
function mount(){
 if(host?.isConnected)return true;
 const route=document.getElementById('nrRoute-panch'),scene=route?.querySelector(':scope > [data-sky]');
 if(!route||!scene||typeof window.Astronomy==='undefined')return false;
 if(!document.getElementById('nrSkyLiveStyle')){const s=document.createElement('style');s.id='nrSkyLiveStyle';s.textContent=STYLE;document.head.append(s);}
 host=document.createElement('section');host.className='nr-card nr-sl';host.dataset.skyLive='';host.setAttribute('translate','no');scene.before(host);
 const heading=document.createElement('h2');heading.id='nrSkyLiveHeading';host.setAttribute('aria-labelledby',heading.id);host.append(heading);
 updateControls=SRSkyTime.controls(host);
 return true;
}
function render(state){
 if(!active()||!window.SRSkyTime)return;
 if(!mount()){clearTimeout(retry);retry=setTimeout(render,250);return;}
 const s=state?.detail?.at!==undefined?state.detail:SRSkyTime.snapshot();
 let c;try{c=compute(new Date(s.at),s.loc);}catch(e){host.dataset.state='error';return;}
 last=c;host.dataset.state='ready';host.dataset.time=c.time.toISOString();host.dataset.clockMode=s.mode;motion();
 host.querySelector('h2').textContent=s.mode==='now'?tr('Небо зараз над вами'):['Небо у вибраний час','Sky at the selected time','Cielo a la hora elegida','Ciel à l’heure choisie'][li()];
 if(c.loc?.example)host.querySelector('h2').textContent=['Небо над Києвом','Sky above Kyiv','Cielo sobre Kyiv','Ciel au-dessus de Kyiv'][li()];
 host.style.setProperty('--sky-light',SRSkyTime.light(c.hz.Sun?.altitude??-18).toFixed(3));
 updateControls(s);
 const zone=s.zone,pct=Math.round(c.fraction*100),t=SRSkyTime.timeText(s.at,zone);
 const html=`<div class="nr-sl-top"><div class="nr-sl-moonbox">${moonSvg(c,132)}<span>${esc(name('Moon'))}: ${esc(tr('Освітлено'))} ${pct}% · ${esc(tr(c.waxing?'росте':'спадає'))}</span><small>${esc(tr(c.loc?'Орієнтація: зеніт угорі, як на вашому небі.':'Орієнтація: північ угорі (місце не задано).'))}</small></div>${c.loc?`<div class="nr-sl-map">${skySvg(c)}<p class="nr-sl-chart-note">${esc(tr('Північ на обох краях; лінія — горизонт.'))}</p></div>`:''}</div>${listHtml(c)}<div data-aurora-content>${s.mode==='now'?auroraHtml(c):''}</div><p class="nr-sl-foot">${esc(tr('Розрахунок'))}: astronomy-engine 2.1.19 · ${esc(t)} ${esc(zone)}${c.loc?' · '+c.loc.lat.toFixed(2)+', '+c.loc.lon.toFixed(2):''}. ${esc(tr('Звичайна атмосферна рефракція; погода й рельєф не враховані.'))}</p>`;
 // Stable interactive links live outside the refreshed numeric content. Dot identity survives every tick.
 let content=host.querySelector('[data-live-content]');
 if(!content){content=document.createElement('div');content.dataset.liveContent='';host.append(content);const links=document.createElement('p');links.className='nr-sl-sources';links.innerHTML='<span></span>: <a href="https://www.spaceweather.gov/noaa-scales-explanation" target="_blank" rel="noopener noreferrer">NOAA G</a> · <a href="https://www.spaceweather.gov/products/aurora-30-minute-forecast" target="_blank" rel="noopener noreferrer">OVATION</a> · <a href="https://wdc.kugi.kyoto-u.ac.jp/poles/polesexp.html" target="_blank" rel="noopener noreferrer">IGRF-14</a>';host.append(links);}
 host.querySelector('.nr-sl-sources span').textContent=tr('Джерела');
 const sig=lang()+':'+Boolean(c.loc),tmp=document.createElement('div');tmp.innerHTML=html;
 if(content.dataset.sig!==sig){content.innerHTML=html;content.dataset.sig=sig;drawMoon(c);return;}
 for(const g of tmp.querySelectorAll('.nr-sl-body')){
  const cur=content.querySelector(`.nr-sl-body[data-body="${g.dataset.body}"]`);if(!cur)continue;
  // A crossing of north is a discontinuity of this cylindrical chart, not a trip across the sky.
  const wrap=Math.abs(Number(cur.dataset.az)-Number(g.dataset.az))>180;
  if(wrap)cur.style.transition='none';
  cur.style.transform=g.style.transform;cur.dataset.alt=g.dataset.alt;cur.dataset.az=g.dataset.az;cur.classList.toggle('is-below',g.classList.contains('is-below'));
  const label=cur.querySelector('text'),next=g.querySelector('text');for(const attr of ['x','y','text-anchor']){if(next.hasAttribute(attr))label.setAttribute(attr,next.getAttribute(attr));else label.removeAttribute(attr);}
  for(const attr of ['x2','y2'])cur.querySelector('line').setAttribute(attr,g.querySelector('line').getAttribute(attr));
  if(wrap){void cur.getBoundingClientRect();cur.style.removeProperty('transition');}
 }
 const oldMoon=content.querySelector('.nr-sl-moon'),newMoon=tmp.querySelector('.nr-sl-moon');
 for(const key of ['aria-label','data-fraction','data-limb','data-rx'])oldMoon.setAttribute(key,newMoon.getAttribute(key));
 oldMoon.querySelector('g').setAttribute('transform',newMoon.querySelector('g').getAttribute('transform'));
 oldMoon.querySelector('path').setAttribute('d',newMoon.querySelector('path').getAttribute('d'));
 for(const selector of ['.nr-sl-moonbox>span','.nr-sl-list','.nr-sl-noloc','[data-aurora-content]','.nr-sl-foot']){
  const old=content.querySelector(selector),next=tmp.querySelector(selector);
  if(old&&next&&!old.isEqualNode(next))old.replaceWith(next);
 }
 drawMoon(c);
}
function sync(){
 clearTimeout(retry);motion();
 if(active())render();
}
window.NRSkyLive={render,compute,geomagLat,auroraFor,brightLimb,selectKp,POLE,NOAA_G,snapshot:()=>last,active};
window.addEventListener('sr:sky-time',render);window.addEventListener('nr:locale',sync);document.addEventListener('nr:location',sync);
document.addEventListener('nr:overview-rendered',render);
document.addEventListener('nr:moon-gl',e=>{if(e.target!==moonCanvas)return;if(e.detail?.state==='lost'){moonCanvas.hidden=true;const svg=host?.querySelector('.nr-sl-moon');if(svg)svg.style.display='';}else render();});
document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);
window.addEventListener('online',render);window.addEventListener('offline',render);
reduced.addEventListener('change',motion);dataReduced.addEventListener('change',()=>{motion();render();});navigator.connection?.addEventListener('change',()=>{motion();render();});
new MutationObserver(motion).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
sync();
})();
