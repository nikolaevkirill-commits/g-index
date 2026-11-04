/* SkyRhythm · «Небо · 27 днів». Context layer: transit positions and events from consumer_cloud/sky.json
   (Swiss Ephemeris, Lahiri) and daily Kp from consumer_cloud/forecast.json. Reads only; never changes the score.
   Missing data -> explicit state, never a zero. */
(()=>{'use strict';
const L=()=>{const l=window.NRLocale?.language||'uk';return ['uk','en','es','fr'].includes(l)?l:'en'};
const I=['uk','en','es','fr'];
const T={
 sw_model:["Розрахунок моделі", "Model run", "Cálculo del modelo", "Calcul du modèle"],
 sw_elapsed:["Оціночний час минув; фактичне прибуття не підтверджено цими даними.", "Estimated time has passed; actual arrival is not confirmed by these data.", "La hora estimada ya pasó; estos datos no confirman la llegada real.", "L’heure estimée est passée ; ces données ne confirment pas l’arrivée réelle."],
 sw_kyiv:["Усі години — Київ.", "All times are Kyiv time.", "Todas las horas son de Kyiv.", "Toutes les heures sont celles de Kyiv."],
 sw_why:["Що можна передбачити?", "What can be forecast?", "¿Qué se puede prever?", "Que peut-on prévoir ?"],
 sw_limits:["≈ — модельна оцінка прибуття CME, а не спостережений удар. Рівень бурі залежить, зокрема, від швидкості вітру та тривалості південного напрямку магнітного поля Bz. Один вимір Bz не підтверджує бурю. Відсутність прибуттів у моделях не виключає інших причин бурі.", "≈ marks a modeled CME arrival, not an observed impact. Storm level depends in part on wind speed and how long the magnetic field Bz stays southward. One Bz sample does not confirm a storm. No modeled arrivals does not rule out other storm drivers.", "≈ indica una llegada CME modelada, no un impacto observado. El nivel de tormenta depende, entre otros factores, de la velocidad del viento y del tiempo que Bz permanece hacia el sur. Una muestra de Bz no confirma una tormenta. La ausencia de llegadas modeladas no excluye otras causas.", "≈ indique une arrivée CME modélisée, et non un impact observé. Le niveau de tempête dépend notamment de la vitesse du vent et de la durée de l’orientation sud de Bz. Une mesure de Bz ne confirme pas une tempête. L’absence d’arrivées modélisées n’exclut pas d’autres causes."],
 sw_horizon:["27-денний орієнтир NOAA показує очікуваний фон. Це не точний розклад бур: ближчі прогнози й вимірювання уточнюють ситуацію.", "The NOAA 27-day outlook describes expected conditions, not an exact storm schedule. Near-term forecasts and observations refine the picture.", "La perspectiva NOAA de 27 días describe las condiciones esperadas, no un horario exacto de tormentas. Los pronósticos próximos y las observaciones precisan la situación.", "La tendance NOAA à 27 jours décrit les conditions attendues, pas un calendrier exact des tempêtes. Les prévisions à court terme et les observations précisent la situation."],
 sw_alternatives:["Окремі оцінки моделей; не довірчий інтервал.", "Separate model estimates; not a confidence interval.", "Estimaciones de modelos separadas; no un intervalo de confianza.", "Estimations de modèles distinctes ; pas un intervalle de confiance."],
 sw_forecast:["Прогноз Kp", "Forecast Kp", "Kp previsto", "Kp prévu"],
 title:['Небо · 27 днів','Sky · 27 days','Cielo · 27 días','Ciel · 27 jours'],
 tradition:['Традиційні трактування: вплив на події не підтверджено.','Traditional interpretations: effects on events are unverified.','Interpretaciones tradicionales: efectos en los sucesos no verificados.','Interprétations traditionnelles : effets sur les événements non vérifiés.'],
 sub:['Розрахунок положень планет (сидерично, Лахірі) і Kp NOAA. Оновлюється автоматично. На бал дня не впливає.','Calculated planetary positions (sidereal, Lahiri) and NOAA Kp. Updates automatically. Does not change the day score.','Posiciones planetarias calculadas (sideral, Lahiri) y Kp de NOAA. Se actualiza automáticamente. No cambia la puntuación del día.','Positions planétaires calculées (sidéral, Lahiri) et Kp de la NOAA. Mise à jour automatique. Ne modifie pas le score du jour.'],
 play:['Програти 27 днів','Play 27 days','Reproducir 27 días','Lire 27 jours'],
 stop:['Зупинити','Stop','Detener','Arrêter'],
 day:['День','Day','Día','Jour'],
 none:['Подій із сильним традиційним значенням цього дня немає.','No events with a strong traditional meaning on this day.','No hay eventos con un significado tradicional fuerte este día.','Aucun événement à forte signification traditionnelle ce jour-là.'],
 missing:['Дані неба зараз недоступні. Бал дня від них не залежить.','Sky data is unavailable right now. The day score does not depend on it.','Los datos del cielo no están disponibles ahora. La puntuación del día no depende de ellos.','Les données du ciel sont indisponibles pour l’instant. Le score du jour n’en dépend pas.'],
 stale:['Розрахунок неба застарів; показано наявні дні.','The sky calculation is out of date; available days are shown.','El cálculo del cielo está desactualizado; se muestran los días disponibles.','Le calcul du ciel est périmé ; les jours disponibles sont affichés.'],
 kp:['Kp NOAA (макс. за добу)','NOAA Kp (daily max)','Kp de NOAA (máx. diario)','Kp NOAA (max. quotidien)'],
 kpNone:['немає','none','sin dato','aucun'],
 kp27:['27-денний орієнтир','27-day outlook','perspectiva de 27 días','tendance à 27 jours'],
 active:['Діє цього дня','Active on this day','Activo este día','Actif ce jour-là'],
 until:['до','until','hasta','jusqu’au'],
 from:['з','from','desde','depuis'],
 exact:['точно','exact','exacto','exact'],
 storm:["Можливий рівень бурі за прогнозом", "Possible forecast storm level", "Nivel posible de tormenta previsto", "Niveau possible de tempête prévu"],
 wheel:['Коло знаків з положеннями планет на','Zodiac wheel with planetary positions on','Rueda zodiacal con posiciones planetarias el','Roue zodiacale avec les positions planétaires le'],
 retro:['ретро','retro','retro','rétro'],
 intensity:['сила','strength','intensidad','intensité'],
 sw:["Космопогода: спостереження й прогнози", "Space weather: observations and forecasts", "Clima espacial: observaciones y pronósticos", "Météo spatiale : observations et prévisions"],
 sw_flare:['Найсильніший спалах за 7 днів','Strongest flare in 7 days','Llamarada más fuerte en 7 días','Éruption la plus forte en 7 jours'],
 sw_noflare:['спалахів класу C і вище немає','no flares of class C or above','sin llamaradas de clase C o superior','aucune éruption de classe C ou plus'],
 sw_wind:["Сонячний вітер · вимірювання NOAA", "Solar wind · NOAA observations", "Viento solar · observaciones NOAA", "Vent solaire · observations NOAA"],
 sw_cme:["CME · модель прибуття NASA", "CME · NASA arrival model", "CME · modelo de llegada NASA", "CME · modèle d’arrivée NASA"],
 sw_nocme:['у завантажених розрахунках NASA прибуттів не знайдено','no arrivals found in the retrieved NASA simulations','sin llegadas en las simulaciones recuperadas de NASA','aucune arrivée dans les simulations NASA récupérées'],
 sw_glancing:['дотичний удар','glancing blow','impacto rasante','impact rasant'],
 sw_none:['немає даних','no data','sin datos','pas de données'],
 sw_stale:['дані застарілі','data out of date','datos desactualizados','données périmées'],
 sw_note:["Час і сила бурі можуть змінитися. Цей контекст не додає балів: Kp уже враховано у формулі.", "Storm timing and strength may change. This context adds no score: Kp is already in the formula.", "El momento y la intensidad de la tormenta pueden cambiar. Este contexto no suma puntos: Kp ya está en la fórmula.", "L’heure et la force de la tempête peuvent changer. Ce contexte n’ajoute aucun point : Kp est déjà dans la formule."],
 now:['Небо дня · 12:00 Київ','Daily sky · 12:00 Kyiv','Cielo del día · 12:00 Kyiv','Ciel du jour · 12:00 Kyiv'],
 open:['Відкрити небо · 27 днів','Open sky · 27 days','Abrir cielo · 27 días','Ouvrir le ciel · 27 jours'],
 quiet:['Сильних подій сьогодні немає — фон рівний.','No strong events today — a steady background.','Hoy no hay eventos fuertes: fondo estable.','Aucun événement fort aujourd’hui : fond stable.'],
 more:['Інші події дня','Other events of the day','Otros eventos del día','Autres événements du jour'],
 ongoing:['триває й після цього періоду','continues beyond this period','continúa después de este periodo','se poursuit au-delà de cette période']
};
const t=k=>T[k][I.indexOf(L())];
const VS='\uFE0E';
const G={Sun:['☉','Сонце','Sun','Sol','Soleil','#F6D27A'],Moon:['☽','Місяць','Moon','Luna','Lune','#E9E6F5'],Mars:['♂','Марс','Mars','Marte','Mars','#FF8F7A'],Mercury:['☿','Меркурій','Mercury','Mercurio','Mercure','#9FE3C9'],Jupiter:['♃','Юпітер','Jupiter','Júpiter','Jupiter','#F0C46A'],Venus:['♀','Венера','Venus','Venus','Vénus','#F3B7D3'],Saturn:['♄','Сатурн','Saturn','Saturno','Saturne','#A9A3D9'],Rahu:['☊','Раху','Rahu','Rahu','Rahu','#8FB6FF'],Ketu:['☋','Кету','Ketu','Ketu','Ketu','#C49BFF']};
const gName=g=>G[g][1+I.indexOf(L())];
const SIGNS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map(s=>s+'\uFE0E');
const SIGN_NAMES=[['Овен','Aries','Aries','Bélier'],['Телець','Taurus','Tauro','Taureau'],['Близнюки','Gemini','Géminis','Gémeaux'],['Рак','Cancer','Cáncer','Cancer'],['Лев','Leo','Leo','Lion'],['Діва','Virgo','Virgo','Vierge'],['Терези','Libra','Libra','Balance'],['Скорпіон','Scorpio','Escorpio','Scorpion'],['Стрілець','Sagittarius','Sagitario','Sagittaire'],['Козеріг','Capricorn','Capricornio','Capricorne'],['Водолій','Aquarius','Acuario','Verseau'],['Риби','Pisces','Piscis','Poissons']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const motionOn=()=>document.documentElement.classList.contains('sr-sky-motion')&&!reduce.matches&&!document.documentElement.classList.contains('nr-design-motion-off');
const kyivToday=()=>{try{return NRCivilTime.dayKey(Date.now(),'Europe/Kyiv')}catch{return new Date().toISOString().slice(0,10)}};
const R=150,ring=(a,r)=>{const x=(-a+90)*Math.PI/180;return [Math.cos(x)*r,-Math.sin(x)*r]}; // 0° Aries at top, counter-clockwise
let sky=null,feed=null,weather=null,state='loading',sel=null,timer=null,host=null;

function dayIndex(ds){return sky?sky.daily.findIndex(d=>d.date===ds):-1}
function skyStale(){return !sky||sky.window?.start!==kyivToday()||!Number.isFinite(Date.parse(sky.generated_at))||Date.now()-Date.parse(sky.generated_at)>86400000||Date.parse(sky.generated_at)>Date.now()+300000}
function kpFor(ds){const resolved=window.fp469ConsumerForDate?.({ds});const value=resolved?.consumer;const status=value?.formula||value;if(status?.state!=='fresh')return null;const ch=resolved?.feed?.channels?.source_formula;const kp=ch?.kp_daily_max??ch?.kp_input?.kp;return Number.isFinite(kp)&&kp>=0&&kp<=9?{kp,src:ch.kp_source}:null}
function kpClass(kp){return kp==null?'none':kp>=7?'g3':kp>=6?'g2':kp>=5?'g1':kp>=4?'active':'quiet'}
function within(item,ds){const s=(item.start||item.at).kyiv_date,e=(item.end||item.at).kyiv_date;return s<=ds&&ds<=e}
function dayItems(ds){if(!sky)return [];return [...sky.intervals,...sky.events].filter(x=>x.reading&&within(x,ds)).sort((a,b)=>(b.reading.intensity-a.reading.intensity)||((a.start||a.at).utc<(b.start||b.at).utc?-1:1))}
function fmtDay(ds){try{return NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'UTC',day:'numeric',month:'short',weekday:'short'}).format(new Date(ds+'T12:00:00Z'))}catch{return ds}}

// Stars in three groups: three animations instead of one per star (keeps idle CPU low).
function stars(n,rmin,rmax,seed){const g=['','',''];let x=seed;const rnd=()=>(x=(x*16807)%2147483647)/2147483647;for(let i=0;i<n;i++){const a=rnd()*360,r=rmin+rnd()*(rmax-rmin),[px,py]=ring(a,r);g[i%3]+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.5+rnd()*1.1).toFixed(2)}"/>`}return g.map((c,i)=>`<g class="nr-sky-star" style="--d:${(i*1.3).toFixed(1)}s;--t:${(3.2+i*0.9).toFixed(1)}s">${c}</g>`).join('')}
function wheel(ds,mini){
 const d=sky.daily[dayIndex(ds)];if(!d)return '';const gid=mini?'nrSkyCoreMini':'nrSkyCore';
 const items=dayItems(ds),active=new Map();
 for(const x of items)for(const b of x.bodies)if(G[b])(active.get(b)||active.set(b,new Set()).get(b)).add(x.type);
 let s=`<svg class="nr-sky-wheel${mini?' is-mini':''}" viewBox="-200 -200 400 400" role="img" aria-label="${esc(t('wheel')+' '+fmtDay(ds))}">`;
 s+=`<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#4A3C80" stop-opacity=".55"/><stop offset="1" stop-color="#101429" stop-opacity="0"/></radialGradient></defs>`;
 s+=`<circle r="${R+34}" class="nr-sky-rim"/><circle r="${R}" class="nr-sky-band"/><circle r="${R-44}" class="nr-sky-inner"/><circle r="${R-46}" fill="url(#${gid})"/>`+stars(mini?18:46,22,R-50,mini?7:11)+stars(mini?6:18,R+12,R+33,mini?3:5);
 // gandanta junctions (water→fire): 0°, 120°, 240°
 for(const b of [0,120,240]){const [x1,y1]=ring(b-10/3,R+6),[x2,y2]=ring(b+10/3,R+6),on=items.some(x=>x.type==='gandanta'&&Math.abs(((x.junction_deg??-1)-b+540)%360-180)<1);s+=`<path class="nr-sky-gandanta${on?' is-on':''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R+6} ${R+6} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
  if(on){const [vx,vy]=ring(b,R+6);s+=`<g class="nr-sky-vortex" transform="translate(${vx.toFixed(1)} ${vy.toFixed(1)})"><path d="M0 0 m-1 0 a1 1 0 0 1 2 0 a3 3 0 0 1 -6 0 a5 5 0 0 1 10 0 a7 7 0 0 1 -14 0"/></g>`}}
 for(let i=0;i<12;i++){const [x,y]=ring(i*30,R),[x2,y2]=ring(i*30,R-44),[gx,gy]=ring(i*30+15,R-22);
  const ing=items.some(e=>e.type==='sign_ingress'&&e.to===i);
  s+=`<line class="nr-sky-cusp${ing?' is-ingress':''}" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><text class="nr-sky-sign" x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" aria-hidden="true">${SIGNS[i]}</text>`}
 for(let i=0;i<27;i++){const [x,y]=ring(i*360/27,R+2),[x2,y2]=ring(i*360/27,R+9);s+=`<line class="nr-sky-nak" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`}
 // conjunction links
 for(const x of items.filter(x=>x.type==='conjunction'||x.type==='graha_yuddha')){const [a,b]=x.bodies.map(g=>ring(d.grahas[g].lon,R+22));s+=`<line class="nr-sky-link nr-sky-${x.type}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`}
 // planets: stacked radially when close
 const order=Object.keys(G).map(g=>({g,lon:d.grahas[g].lon})).sort((a,b)=>a.lon-b.lon);const lane={};
 order.forEach((p,i)=>{let l=0;for(let j=0;j<i;j++){const q=order[j];if(Math.abs(((p.lon-q.lon+540)%360)-180)<9&&lane[q.g]===l)l++}lane[p.g]=l});
 const exact=new Set(items.filter(x=>x.type==='conjunction'&&x.exact?.kyiv_date===ds).flatMap(x=>x.bodies));
 for(const {g} of order){const p=d.grahas[g],[x,y]=ring(p.lon,R+22+lane[g]*15),a=active.get(g)||new Set();
  const cls=['nr-sky-planet',...[...a].map(k=>'is-'+k.replace('_','-'))];if(p.retrograde&&g!=='Rahu'&&g!=='Ketu')cls.push('is-retro');if(exact.has(g))cls.push('is-exact');
  s+=`<g class="${cls.join(' ')}" data-g="${g}" data-lon="${p.lon}" data-rad="${R+22+lane[g]*15}" style="--c:${G[g][5]};transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)"><circle class="nr-sky-flare" r="11"/><circle class="nr-sky-halo" r="11"/><circle class="nr-sky-dot" r="8.5"/><text class="nr-sky-glyph" aria-hidden="true">${G[g][0]+VS}</text>${cls.includes('is-retro')?'<path class="nr-sky-loop" d="M-13 -8 a7 7 0 1 1 0 0.1"/>':''}</g>`}
 // centre: Earth, aurora when the forecast Kp for the day reaches storm level
 const k=kpFor(ds),kc=kpClass(k?.kp);
 s+=`<g class="nr-sky-earth is-${kc}"><circle class="nr-sky-aurora" r="34"/><circle r="15" class="nr-sky-globe"/><text class="nr-sky-kp" y="52">${k?'Kp '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp).replace(/\.0$/,''):''}</text></g>`;
 // eclipse shadow
 if(items.some(x=>x.type.endsWith('eclipse')))s+=`<circle class="nr-sky-eclipse" r="${R-46}"/>`;
 return s+'</svg>';
}

function strip(ds){
 return `<div class="nr-sky-days" role="group" aria-label="${esc(t('kp'))}">`+sky.daily.map(d=>{const k=kpFor(d.date),n=sky?[...sky.intervals,...sky.events].filter(x=>x.reading&&x.reading.intensity>=2&&[x.at,x.exact,x.started_before_window?null:x.start].some(s=>s&&s.kyiv_date===d.date)).length:0;
  return `<button type="button" class="nr-sky-day is-${kpClass(k?.kp)}" data-sky-day="${d.date}" aria-pressed="${d.date===ds}" aria-label="${esc(fmtDay(d.date)+' · Kp '+(k?new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp):t('kpNone'))+(k?.src==='NOAA_27day_outlook'?' ('+t('kp27')+')':''))}"><span>${Number(d.date.slice(8))}</span>${n?`<i>${'•'.repeat(Math.min(n,3))}</i>`:''}</button>`}).join('')+'</div>';
}

function list(ds){
 const items=dayItems(ds).filter(x=>x.reading.intensity>=1),lang=L();
 if(!items.length)return `<p class="nr-sky-none">${esc(t('none'))}</p>`;
 const li=x=>{const r=x.reading,when=x.at?x.at.kyiv:(x.exact&&x.exact.kyiv_date===ds?t('exact')+' '+x.exact.kyiv:[x.start.kyiv_date<ds||x.started_before_window?'':t('from')+' '+x.start.kyiv,x.continues_after_window?t('ongoing'):t('until')+' '+x.end.kyiv].filter(Boolean).join(' · '));
  return `<li class="nr-sky-ev is-${x.type.replace('_','-')}" data-intensity="${r.intensity}"><b aria-hidden="true">${x.bodies.map(g=>(G[g]?.[0]||'')+VS).join(' ')}</b><span><span class="nr-sky-text">${esc(r.text[lang]||r.text.en)}</span><small>${esc(when)} · ${esc(t('intensity'))} ${'●'.repeat(r.intensity)}${'○'.repeat(3-r.intensity)} · ${esc(r.label[lang]||r.label.en)}</small></span></li>`};
 const top=items.slice(0,4),rest=items.slice(4);
 return `<h4>${esc(t('active'))}</h4><ul class="nr-sky-events">${top.map(li).join('')}</ul>`+(rest.length?`<details class="nr-sky-more"><summary>${esc(t('more'))} (${rest.length})</summary><ul class="nr-sky-events">${rest.map(li).join('')}</ul></details>`:'');
}

let todayHost=null;
function renderToday(){
 if(!todayHost)return;const lang=L(),ds=kyivToday();
 const head=`<div class="nr-sky-now-head"><h2>${esc(t('now'))}</h2><span>${esc(fmtDay(ds))}</span></div>`;
 if(state!=='ready'||dayIndex(ds)<0){todayHost.innerHTML=head+`<p class="nr-sky-none">${esc(state==='loading'?'…':t('missing'))}</p>`;return}
 const top=dayItems(ds).filter(x=>x.reading.intensity>=2).slice(0,2);
 todayHost.innerHTML=head+`<div class="nr-sky-now-body">${wheel(ds,true)}<div><ul class="nr-sky-now-list">${top.length?top.map(x=>`<li><b aria-hidden="true">${x.bodies.map(g=>(G[g]?.[0]||'')+VS).join(' ')}</b> ${esc(x.reading.text[lang]||x.reading.text.en)}</li>`).join(''):`<li>${esc(t('quiet'))}</li>`}</ul><small>${esc(t('tradition'))} ${esc(t('sub'))}</small></div></div><button type="button" class="nr-sky-now-open">${esc(t('open'))} →</button>`;
}
function mountToday(){
 if(todayHost&&todayHost.isConnected)return true;const ov=document.querySelector('#nrRoute-today [data-overview="today"]');if(!ov)return false;
 todayHost=document.createElement('section');todayHost.className='nr-sky-now';todayHost.dataset.skyNow='';todayHost.setAttribute('translate','no');todayHost.setAttribute('aria-label',t('now'));
 const anchor=ov.querySelector(':scope > .sr-dayline');anchor?anchor.before(todayHost):ov.append(todayHost);
 todayHost.addEventListener('click',e=>{if(!e.target.closest('.nr-sky-now-open'))return;location.hash='panch';let n=0;const go=()=>{const s=document.querySelector('[data-sky]');if(s&&s.offsetParent){s.scrollIntoView({behavior:motionOn()?'smooth':'auto',block:'start'});s.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true})}else if(n++<20)setTimeout(go,100)};setTimeout(go,60)});
 if('IntersectionObserver' in window)new IntersectionObserver(es=>{for(const x of es)todayHost.classList.toggle('is-visible',x.isIntersecting)}).observe(todayHost);else todayHost.classList.add('is-visible');
 renderToday();return true;
}
function spaceWeather(){
 const stamp=iso=>typeof iso==='string'&&iso.trim()&&Number.isFinite(Date.parse(iso))?Date.parse(iso):null;
 const fmt=iso=>{const ms=stamp(iso);if(ms===null)return t('sw_none');try{return NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return t('sw_none')}};
 const generated=stamp(weather?.generated_at),age=generated===null?null:Date.now()-generated;
 const w=age!==null&&age>=-300000&&age<7200000?weather:null,f=w?.flares,wi=w?.wind,c=w?.cme;
 const unavailable=weather&&!w?t('sw_stale'):t('sw_none');
 const flare=!f?unavailable:f.strongest?`${f.strongest.class} · ${fmt(f.strongest.peak_utc)}`:t('sw_noflare');
 const sample=(value,unit,iso)=>{const ms=stamp(iso);return Number.isFinite(value)&&ms!==null&&ms<=Date.now()+600000?esc(value+unit)+'<small>'+esc(fmt(iso))+(Date.now()-ms>10800000?' · '+esc(t('sw_stale')):'')+'</small>':esc(t('sw_none'))};
 const wind=!wi?esc(unavailable):sample(wi.plasma?.speed_km_s,L()==='uk'?' км/с':' km/s',wi.plasma?.time_utc)+'<br>Bz '+sample(wi.mag?.bz_nt,' nT',wi.mag?.time_utc)+(wi.stale?'<small>'+esc(t('sw_stale'))+'</small>':'');
 const arrivals=Array.isArray(c?.earth_arrivals)?c.earth_arrivals:null;
 const cme=!arrivals?esc(unavailable):arrivals.length?arrivals.map(a=>{
  const ms=stamp(a?.arrival_utc);
  return '<div class="nr-sky-arrival">'+(ms===null?esc(t('sw_none')):'≈ '+esc(fmt(a.arrival_utc)))+(a?.glancing===true?' ('+esc(t('sw_glancing'))+')':'')+
   '<small>'+esc(t('sw_model')+': '+fmt(a?.model_run_utc))+'</small>'+(ms!==null&&ms<Date.now()?'<small class="nr-sky-estimate-past">'+esc(t('sw_elapsed'))+'</small>':'')+'</div>';
 }).join('')+(arrivals.length>1?'<small>'+esc(t('sw_alternatives'))+'</small>':''):esc(t('sw_nocme'));
 return `<div class="nr-sky-sw"><h4>${esc(t('sw'))}</h4><dl><div><dt>${esc(t('sw_flare'))}</dt><dd>${esc(flare)}</dd></div><div><dt>${esc(t('sw_wind'))}</dt><dd>${wind}</dd></div><div><dt>${esc(t('sw_cme'))}</dt><dd>${cme}</dd></div></dl><small>${esc(t('sw_kyiv'))}</small><p class="nr-sky-uncertainty">${esc(t('sw_note'))}</p><details class="nr-sky-weather-help"><summary>${esc(t('sw_why'))}</summary><p>${esc(t('sw_limits'))}</p><p>${esc(t('sw_horizon'))}</p><a href="https://www.spaceweather.gov/phenomena/geomagnetic-storms" target="_blank" rel="noopener noreferrer">NOAA</a> · <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">NASA DONKI</a></details></div>`;
}
function render(){
 renderToday();
 if(!host)return;
 const weatherHelpOpen=host.querySelector('.nr-sky-weather-help')?.open===true;
 host.querySelector('.nr-sky-title').textContent=t('title');host.querySelector('.nr-sky-sub').textContent=t('sub');
 if(state!=='ready'){host.querySelector('.nr-sky-body').innerHTML=`<p class="nr-sky-none" role="status">${esc(state==='loading'?'…':t('missing'))}</p>`;return}
 const today=kyivToday();if(!sel||dayIndex(sel)<0)sel=dayIndex(today)>=0?today:sky.daily[0].date;
 const stale=skyStale();
 const before=new Map([...host.querySelectorAll('.nr-sky-planet[data-g]')].map(e=>[e.dataset.g,[Number(e.dataset.lon),Number(e.dataset.rad)]]));
 host.querySelector('.nr-sky-body').innerHTML=(stale?`<p class="nr-sky-stale" role="status">${esc(t('stale'))}</p>`:'')+
  `<div class="nr-sky-stage">${wheel(sel)}<div class="nr-sky-side"><p class="nr-sky-date">${esc(fmtDay(sel))}${(()=>{const k=kpFor(sel);return k?` · ${esc(t('sw_forecast'))} ${new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp)}${k.src==='NOAA_27day_outlook'?' · '+esc(t('kp27')):''}${k.kp>=5?' · '+esc(t('storm'))+' G'+Math.min(5,Math.floor(k.kp)-4):''}`:''})()}</p><div class="nr-sky-list">${list(sel)}</div>${spaceWeather()}</div></div>`+
  strip(sel)+`<div class="nr-sky-controls"><button type="button" class="nr-sky-play" ${motionOn()?'':'disabled'} aria-pressed="${!!timer}">${esc(timer?t('stop'):t('play'))}</button><label><input type="range" aria-label="${esc(t('day'))}" min="0" max="${sky.daily.length-1}" value="${dayIndex(sel)}" aria-valuetext="${esc(fmtDay(sel))}"></label></div>`;
 if(weatherHelpOpen)host.querySelector('.nr-sky-weather-help')?.setAttribute('open','');
 if(before.size&&motionOn())arcMove(before);
 host.querySelector('.nr-sky-title').textContent=t('title');host.querySelector('.nr-sky-sub').textContent=t('sub');
}
function arcMove(before){
 // Planets travel along the zodiac circle (shortest arc), not across it.
 const els=[...host.querySelectorAll('.nr-sky-wheel:not(.is-mini) .nr-sky-planet[data-g]')].map(e=>{const [a0,r0]=before.get(e.dataset.g)||[];const a1=Number(e.dataset.lon),r1=Number(e.dataset.rad);return Number.isFinite(a0)?{e,a0,r0,da:((a1-a0+540)%360)-180,dr:r1-r0}:null}).filter(Boolean);
 if(!els.length)return;const t0=performance.now(),dur=820;cancelAnimationFrame(arcMove.id);
 const step=now=>{if(!motionOn()||document.hidden)return;const k=Math.min(1,(now-t0)/dur),q=1-Math.pow(1-k,3);for(const o of els){const [x,y]=ring(o.a0+o.da*q,o.r0+o.dr*q);o.e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`}if(k<1)arcMove.id=requestAnimationFrame(step)};
 for(const o of els){const [x,y]=ring(o.a0,o.r0);o.e.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`}arcMove.id=requestAnimationFrame(step);
}
function select(ds,focus,silent){sel=ds;render();if(!silent)try{window.dispatchEvent(new CustomEvent('nr:day',{detail:ds}))}catch{}if(focus)host.querySelector(`[data-sky-day="${ds}"]`)?.focus()}
function stop(){cancelAnimationFrame(arcMove.id);if(timer){clearInterval(timer);timer=null}}
function play(){if(timer){stop();render();return}if(!motionOn())return;let i=Math.max(0,dayIndex(sel));timer=setInterval(()=>{i=(i+1)%sky.daily.length;sel=sky.daily[i].date;render();if(i===sky.daily.length-1)stop()},900);render()}

let tries=0;
function mount(){
 if(host)return true;const route=document.getElementById('nrRoute-panch');if(!route){if(tries++<40)setTimeout(()=>{if(mount())render()},250);return false}
 host=document.createElement('section');host.className='nr-sky';host.setAttribute('translate','no');host.dataset.sky='';host.setAttribute('aria-labelledby','nrSkyTitle');
 host.innerHTML='<div class="nr-sky-head"><h2 class="nr-sky-title" id="nrSkyTitle"></h2><p class="nr-sky-sub"></p></div><div class="nr-sky-body"></div>';
 route.prepend(host); // «Небо» tab: the sky scene first, the panchanga below it
 host.addEventListener('click',e=>{const b=e.target.closest('[data-sky-day]');if(b){stop();select(b.dataset.skyDay,true);return}if(e.target.closest('.nr-sky-play'))play()});
 host.addEventListener('input',e=>{if(e.target.type==='range'){stop();sel=sky.daily[Number(e.target.value)].date;render();host.querySelector('input[type=range]')?.focus()}});
 host.addEventListener('keydown',e=>{const b=e.target.closest('[data-sky-day]');if(!b||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const i=dayIndex(b.dataset.skyDay)+(e.key==='ArrowRight'?1:-1);if(sky.daily[i])select(sky.daily[i].date,true)});
 if('IntersectionObserver' in window)new IntersectionObserver(es=>{for(const x of es)host.classList.toggle('is-visible',x.isIntersecting);if(!es.some(x=>x.isIntersecting))stop()}).observe(host);else host.classList.add('is-visible');
 render();return true;
}
async function load(){
 const get=u=>fetch(u,{cache:'no-cache',signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
 const [s,f,w]=await Promise.allSettled([get('consumer_cloud/sky.json'),get('consumer_cloud/forecast.json'),get('consumer_cloud/space_weather.json')]);
 weather=w.status==='fulfilled'&&w.value?.schema==='space_weather_v1'&&w.value.score_adjustment===0?w.value:null;
 feed=f.status==='fulfilled'?f.value:null;
 if(s.status==='fulfilled'&&s.value?.schema==='sky_transits_v1'&&Array.isArray(s.value.daily)&&s.value.daily.length===27&&s.value.convention?.score_adjustment===0&&Array.isArray(s.value.events)&&Array.isArray(s.value.intervals)){sky=s.value;state='ready'}else state='missing';
 render();
}
window.NRSkyScene={state:()=>state,selected:()=>sel,select:ds=>select(ds,false,true),items:dayItems};
let todayTries=0;const ensureToday=()=>{if(!mountToday()&&todayTries++<40)setTimeout(ensureToday,250)};
const start=()=>{mount();ensureToday();load()};
window.addEventListener('sr:consumer-load',()=>{if(!todayHost||!todayHost.isConnected){todayHost=null;ensureToday()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));else setTimeout(start,0);
window.addEventListener('nr:locale',render);
let loadedAt=Date.now();
function refreshVisible(){if(!document.hidden&&(Date.now()-loadedAt>300000||sky?.window?.start!==kyivToday())){loadedAt=Date.now();load()}}
window.addEventListener('online',refreshVisible);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelAnimationFrame(arcMove.id)}else refreshVisible()});
setInterval(refreshVisible,300000);
let lastMotion=motionOn();new MutationObserver(()=>{const on=motionOn();if(on!==lastMotion){lastMotion=on;if(!on){stop();cancelAnimationFrame(arcMove.id)}render()}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
reduce.addEventListener?.('change',()=>{stop();cancelAnimationFrame(arcMove.id);render()});
})();
