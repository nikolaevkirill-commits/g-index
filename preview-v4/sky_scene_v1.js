/* SkyRhythm · «Небо · 27 днів». Context layer: transit positions and events from consumer_cloud/sky.json
   (Swiss Ephemeris, Lahiri) and daily Kp from consumer_cloud/forecast.json. Reads only; never changes the score.
   Missing data -> explicit state, never a zero. */
(()=>{'use strict';
const L=()=>{const l=window.NRLocale?.language||'uk';return ['uk','en','es','fr'].includes(l)?l:'en'};
const I=['uk','en','es','fr'];
const T={
 pl_title:['Положення у знаках','Positions in the signs','Posiciones en los signos','Positions dans les signes'],
 pl_note:['Знаки — сидеричні (Лахірі), як у Джйотіш. Значення планет — традиційні, не виміряний вплив. Коло вище — та сама картина: 12 секторів = 12 знаків.','Signs are sidereal (Lahiri), as in Jyotish. Planet meanings are traditional, not a measured effect. The wheel above shows the same picture: 12 sectors = 12 signs.','Los signos son siderales (Lahiri), como en Jyotish. Los significados son tradicionales, no un efecto medido. La rueda muestra lo mismo: 12 sectores = 12 signos.','Signes sidéraux (Lahiri), comme en Jyotish. Les significations sont traditionnelles, pas un effet mesuré. La roue montre la même chose : 12 secteurs = 12 signes.'],
 pl_retro:['ретроградний','retrograde','retrógrado','rétrograde'],
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
 event_sky:['Небо в цей момент','Sky at this instant','Cielo en ese momento','Ciel à cet instant'],
 kp27:['27-денний орієнтир','27-day outlook','perspectiva de 27 días','tendance à 27 jours'],
 kp27s:['орієнтир','outlook','perspectiva','tendance'],
 kpfs:['прогноз','forecast','pronóstico','prévision'],
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
const SIGN_GLYPH=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const RETRO_HINT=['з Землі здається, що рухається назад','seems to move backwards as seen from Earth','parece moverse hacia atrás vista desde la Tierra','semble reculer vu de la Terre'];
// Traditional significations (Jyotish), shown as tradition, not as a measured effect.
const MEANS={Sun:['за традицією: сила волі, влада, здоров’я','tradition: will, authority, vitality','tradición: voluntad, autoridad, vitalidad','tradition : volonté, autorité, vitalité'],Moon:['за традицією: настрій, емоції, тіло','tradition: mood, emotions, body','tradición: ánimo, emociones, cuerpo','tradition : humeur, émotions, corps'],Mars:['за традицією: дія, суперечки, ризик','tradition: action, disputes, risk','tradición: acción, disputas, riesgo','tradition : action, conflits, risque'],Mercury:['за традицією: розум, мова, торгівля','tradition: mind, speech, trade','tradición: mente, habla, comercio','tradition : esprit, parole, commerce'],Jupiter:['за традицією: знання, гроші, вчителі','tradition: knowledge, wealth, teachers','tradición: saber, riqueza, maestros','tradition : savoir, richesse, maîtres'],Venus:['за традицією: стосунки, краса, комфорт','tradition: relationships, beauty, comfort','tradición: relaciones, belleza, confort','tradition : relations, beauté, confort'],Saturn:['за традицією: праця, терпіння, обмеження','tradition: work, patience, limits','tradición: trabajo, paciencia, límites','tradition : travail, patience, limites'],Rahu:['за традицією: бажання, нове, плутанина','tradition: desire, novelty, confusion','tradición: deseo, novedad, confusión','tradition : désir, nouveauté, confusion'],Ketu:['за традицією: відпускання, завершення','tradition: letting go, endings','tradición: soltar, finales','tradition : lâcher prise, fins']};
const SIGN_NAMES=[['Овен','Aries','Aries','Bélier'],['Телець','Taurus','Tauro','Taureau'],['Близнюки','Gemini','Géminis','Gémeaux'],['Рак','Cancer','Cáncer','Cancer'],['Лев','Leo','Leo','Lion'],['Діва','Virgo','Virgo','Vierge'],['Терези','Libra','Libra','Balance'],['Скорпіон','Scorpio','Escorpio','Scorpion'],['Стрілець','Sagittarius','Sagitario','Sagittaire'],['Козеріг','Capricorn','Capricornio','Capricorne'],['Водолій','Aquarius','Acuario','Verseau'],['Риби','Pisces','Piscis','Poissons']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const reduceData=matchMedia('(prefers-reduced-data: reduce)');
const motionOn=()=>!document.hidden&&document.documentElement.classList.contains('sr-sky-motion')&&!reduce.matches&&!reduceData.matches&&!navigator.connection?.saveData&&!document.documentElement.classList.contains('nr-design-motion-off');
const kyivToday=()=>{try{return NRCivilTime.dayKey(Date.now(),'Europe/Kyiv')}catch{return new Date().toISOString().slice(0,10)}};
const R=150,ring=(a,r)=>{const x=(-a+90)*Math.PI/180;return [Math.cos(x)*r,-Math.sin(x)*r]}; // 0° Aries at top, counter-clockwise
let sky=null,feed=null,weather=null,state='loading',sel=null,timer=null,host=null;

function dayIndex(ds){return sky?sky.daily.findIndex(d=>d.date===ds):-1}
function skyStale(){return !sky||sky.window?.start!==kyivToday()||!Number.isFinite(Date.parse(sky.generated_at))||Date.now()-Date.parse(sky.generated_at)>86400000||Date.parse(sky.generated_at)>Date.now()+300000}
function kpFor(ds){const resolved=window.fp469ConsumerForDate?.({ds});const value=resolved?.consumer;const status=value?.formula||value;if(status?.state!=='fresh')return null;const ch=resolved?.feed?.channels?.source_formula;const kp=ch?.kp_daily_max??ch?.kp_input?.kp;return Number.isFinite(kp)&&kp>=0&&kp<=9&&['NOAA_3day_slots','NOAA_27day_outlook'].includes(ch?.kp_source)?{kp,src:ch.kp_source}:null}
function kpClass(kp){return kp==null?'none':kp>=7?'g3':kp>=6?'g2':kp>=5?'g1':kp>=4?'active':'quiet'}
function within(item,ds){const s=(item.start||item.at).kyiv_date,e=(item.end||item.at).kyiv_date;return s<=ds&&ds<=e}
function dayItems(ds){if(!sky)return [];return [...sky.intervals,...sky.events].filter(x=>x.reading&&within(x,ds)).sort((a,b)=>(b.reading.intensity-a.reading.intensity)||((a.start||a.at).utc<(b.start||b.at).utc?-1:1))}
function fmtDay(ds){try{return NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'UTC',day:'numeric',month:'short',weekday:'short'}).format(new Date(ds+'T12:00:00Z'))}catch{return ds}}

// Stars in three groups: three animations instead of one per star (keeps idle CPU low).
function stars(n,rmin,rmax,seed){const g=['','',''];let x=seed;const rnd=()=>(x=(x*16807)%2147483647)/2147483647;for(let i=0;i<n;i++){const a=rnd()*360,r=rmin+rnd()*(rmax-rmin),[px,py]=ring(a,r);g[i%3]+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.5+rnd()*1.1).toFixed(2)}"/>`}return g.map((c,i)=>`<g class="nr-sky-star" style="--d:${(i*1.3).toFixed(1)}s;--t:${(3.2+i*0.9).toFixed(1)}s">${c}</g>`).join('')}
const plainScene={
 uk:{near:'Зближення',exact:'Точне з’єднання',city:'за Києвом',details:'Де зараз планети',guide:'Оберіть дату, щоб побачити зближення й переходи. Це календар подій неба.',disabled:'Автовідтворення вимкнене. Дату можна змінити повзунком.'},
 en:{near:'Approach',exact:'Exact conjunction',city:'Kyiv time',details:'Where the planets are',guide:'Choose a date to see approaches and transitions on the sky calendar.',disabled:'Autoplay is off. Use the slider to change the date.'},
 es:{near:'Acercamiento',exact:'Conjunción exacta',city:'hora de Kyiv',details:'Dónde están los planetas',guide:'Elija una fecha para ver acercamientos y cambios en el calendario del cielo.',disabled:'La reproducción está desactivada. Cambie la fecha con el control deslizante.'},
 fr:{near:'Rapprochement',exact:'Conjonction exacte',city:'heure de Kyiv',details:'Où sont les planètes',guide:'Choisissez une date pour voir les rapprochements et les transitions dans le calendrier du ciel.',disabled:'La lecture automatique est désactivée. Changez de date avec le curseur.'}
};
function conjunctionCopy(event,ds){
 const words=plainScene[L()],reading=event.reading.text[L()]||event.reading.text.en;
 if(event.type!=='conjunction')return esc(reading);
 const at=Date.parse(event.exact?.utc);
 const time=Number.isFinite(at)?new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Kyiv'}).format(at):'';
 const isExact=event.exact?.kyiv_date===ds;
 const title=(isExact?words.exact:words.near)+' · '+event.bodies.map(gName).join(' / ');
 const stamp=time?' · '+(isExact?'':words.exact+' ')+time+' ('+words.city+')':'';
 const colon=reading.indexOf(': ');
 return '<strong>'+esc(title+stamp)+'</strong>'+(colon>=0?'<br><span>'+esc(reading.slice(colon+2))+'</span>':'');
}
function planets(ds,compact){
 const d=sky?.daily?.[dayIndex(ds)];if(!d)return '';
 // FP569l (owner: «кому цікаві ці градуси»): sign symbol + name, «початок/середина/кінець знака» and what the planet stands for
 // in the tradition; the exact degree stays in the tooltip and the accessible name.
 const part=deg=>[['на початку знака','early in the sign','al inicio del signo','au début du signe'],['у середині знака','mid-sign','a mitad del signo','au milieu du signe'],['наприкінці знака','late in the sign','al final del signo','en fin de signe']][deg<10?0:deg<20?1:2][I.indexOf(L())];
 const rows=Object.keys(G).filter(g=>d.grahas?.[g]&&Number.isFinite(d.grahas[g].lon)).map(g=>{const p=d.grahas[g],lon=((p.lon%360)+360)%360,s=Math.floor(lon/30),deg=Math.floor(lon-s*30),sign=SIGN_NAMES[s][I.indexOf(L())],retro=p.retrograde&&g!=='Rahu'&&g!=='Ketu',means=MEANS[g]?.[I.indexOf(L())]||'';
  return `<li data-g="${g}" style="--c:${G[g][5]}" title="${esc(sign)} ${deg}°"><b aria-hidden="true">${G[g][0]+VS}</b><span>${esc(gName(g))}</span><em><i aria-hidden="true">${SIGN_GLYPH[s]+VS}</i> ${esc(sign)} · ${esc(part(deg))}${retro?' · '+esc(t('pl_retro'))+' <small>('+esc(RETRO_HINT[I.indexOf(L())])+')</small>':''}</em>${means?`<small class="nr-sky-means">${esc(means)}</small>`:''}</li>`}).join('');
 return `<details class="nr-sky-planet-details"><summary>${esc(plainScene[L()].details)}</summary><div class="nr-sky-planets${compact?' is-compact':''}"><h4>${esc(t('pl_title'))}</h4><ul>${rows}</ul>${compact?'':`<p class="nr-sky-planets-note">${esc(t('pl_note'))}</p>`}</div></details>`;
}
function wheel(ds,mini){
 const d=sky.daily[dayIndex(ds)];if(!d)return '';const gid=mini?'nrSkyCoreMini':'nrSkyCore';
 const items=dayItems(ds),active=new Map();
 for(const x of items)for(const b of x.bodies)if(G[b])(active.get(b)||active.set(b,new Set()).get(b)).add(x.type);
 let s=`<svg class="nr-sky-wheel${mini?' is-mini':''}" viewBox="-214 -214 428 428" role="img" aria-label="${esc(t('wheel')+' '+fmtDay(ds))}">`;
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
 // FP569l: greedy lanes that re-check every nearer body (the old one-pass loop let 3+ bodies collide: Mars/Jupiter/Ketu/Moon).
 order.forEach((p,i)=>{const near=order.slice(0,i).filter(q=>Math.abs(((p.lon-q.lon+540)%360)-180)<10).map(q=>lane[q.g]);let l=0;while(near.includes(l))l++;lane[p.g]=l});
 const exact=new Set(items.filter(x=>x.type==='conjunction'&&x.exact?.kyiv_date===ds).flatMap(x=>x.bodies));
 for(const {g} of order){const p=d.grahas[g],[x,y]=ring(p.lon,R+22+lane[g]*16),a=active.get(g)||new Set();
  const cls=['nr-sky-planet',...[...a].map(k=>'is-'+k.replace('_','-'))];if(p.retrograde&&g!=='Rahu'&&g!=='Ketu')cls.push('is-retro');if(exact.has(g))cls.push('is-exact');
  s+=`<g class="${cls.join(' ')}" data-g="${g}" data-lon="${p.lon}" data-rad="${R+22+lane[g]*16}" style="--c:${G[g][5]};transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)"><circle class="nr-sky-flare" r="11"/><circle class="nr-sky-halo" r="11"/><circle class="nr-sky-dot" r="8.5"/><text class="nr-sky-glyph" aria-hidden="true">${G[g][0]+VS}</text>${cls.includes('is-retro')?'<path class="nr-sky-loop" d="M-13 -8 a7 7 0 1 1 0 0.1"/>':''}</g>`}
 // The central label reports Kp without implying local aurora visibility.
 const k=kpFor(ds);
 s+=`<g class="nr-sky-earth"><circle r="15" class="nr-sky-globe"/><text class="nr-sky-kp" y="52">${k?'Kp '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp).replace(/\.0$/,''):''}</text>${k?`<text class="nr-sky-kp nr-sky-kp-src" y="66" data-kp-src="${k.src==='NOAA_27day_outlook'?'outlook':'forecast'}">${esc(k.src==='NOAA_27day_outlook'?t('kp27s'):t('kpfs'))}</text>`:''}</g>`;
 // eclipse shadow
 if(items.some(x=>x.type.endsWith('eclipse')))s+=`<circle class="nr-sky-eclipse" r="${R-46}"/>`;
 return s+'</svg>';
}

function strip(ds){
 return `<div class="nr-sky-days" role="group" aria-label="${esc(t('kp'))}">`+sky.daily.map(d=>{const k=kpFor(d.date),n=sky?[...sky.intervals,...sky.events].filter(x=>x.reading&&x.reading.intensity>=2&&[x.at,x.exact,x.started_before_window?null:x.start].some(s=>s&&s.kyiv_date===d.date)).length:0;
  return `<button type="button" class="nr-sky-day is-${k?.src==='NOAA_27day_outlook'?'outlook-'+kpClass(k.kp):kpClass(k?.kp)}" data-sky-day="${d.date}" aria-pressed="${d.date===ds}" aria-label="${esc(fmtDay(d.date)+' · Kp '+(k?new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp):t('kpNone'))+(k?.src==='NOAA_27day_outlook'?' ('+t('kp27')+')':''))}"><span>${Number(d.date.slice(8))}</span>${n?`<i>${'•'.repeat(Math.min(n,3))}</i>`:''}</button>`}).join('')+'</div>';
}

function list(ds){
 const items=dayItems(ds).filter(x=>x.reading.intensity>=1),lang=L();
 if(!items.length)return `<p class="nr-sky-none">${esc(t('none'))}</p>`;
 // FP569k: «24 лист., 18:46» instead of the raw «2026-11-24 18:46» from the feed.
 const kt=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s||''));if(!m)return s;return new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(+m[1],m[2]-1,+m[3],12)))+', '+m[4]+':'+m[5]};
 const li=x=>{const r=x.reading,when=x.at?kt(x.at.kyiv):(x.exact&&x.exact.kyiv_date===ds?t('exact')+' '+kt(x.exact.kyiv):[x.start.kyiv_date<ds||x.started_before_window?'':t('from')+' '+kt(x.start.kyiv),x.continues_after_window?t('ongoing'):t('until')+' '+kt(x.end.kyiv)].filter(Boolean).join(' · '));
  const eventTime=x.at||(x.exact?.kyiv_date===ds?x.exact:null);
  const action=window.SRSkyTime&&Number.isFinite(Date.parse(eventTime?.utc))
   ?`<button type="button" class="nr-sky-event-time" data-sky-event-at="${esc(eventTime.utc)}">${esc(t('event_sky'))}</button>`:'';
  return `<li class="nr-sky-ev is-${x.type.replace('_','-')}" data-intensity="${r.intensity}"><b aria-hidden="true">${x.bodies.map(g=>(G[g]?.[0]||'')+VS).join(' ')}</b><span><span class="nr-sky-text">${conjunctionCopy(x,ds)}</span><small>${esc(when)} · ${esc(t('intensity'))} ${'●'.repeat(r.intensity)}${'○'.repeat(3-r.intensity)} · ${esc(r.label[lang]||r.label.en)}</small>${action}</span></li>`};
 const top=items.slice(0,4),rest=items.slice(4);
 return `<h4>${esc(t('active'))}</h4><ul class="nr-sky-events">${top.map(li).join('')}</ul>`+(rest.length?`<details class="nr-sky-more"><summary>${esc(t('more'))} (${rest.length})</summary><ul class="nr-sky-events">${rest.map(li).join('')}</ul></details>`:'');
}

let todayHost=null;
function renderToday(){
 if(!todayHost)return;todayHost.classList.toggle('is-motion',motionOn());const lang=L(),ds=kyivToday();
 const head=`<div class="nr-sky-now-head"><h2>${esc(t('now'))}</h2><span>${esc(fmtDay(ds))}</span></div>`;
 if(state!=='ready'||dayIndex(ds)<0){todayHost.innerHTML=head+`<p class="nr-sky-none">${esc(state==='loading'?'…':t('missing'))}</p>`;return}
 const top=dayItems(ds).filter(x=>x.reading.intensity>=2).slice(0,2);
 todayHost.innerHTML=head+`<div class="nr-sky-now-body is-readable"><div><ul class="nr-sky-now-list">${top.length?top.map(x=>`<li><b aria-hidden="true">${x.bodies.map(g=>(G[g]?.[0]||'')+VS).join(' ')}</b> ${conjunctionCopy(x,ds)}</li>`).join(''):`<li>${esc(t('quiet'))}</li>`}</ul><small>${esc(t('tradition'))} ${esc(t('sub'))}</small></div>${planets(ds,true)}</div><button type="button" class="nr-sky-now-open">${esc(t('open'))} →</button>`;
}
function mountToday(){
 if(todayHost&&todayHost.isConnected)return true;const ov=document.querySelector('#nrRoute-today [data-overview="today"]');if(!ov)return false;
 todayHost=document.createElement('section');todayHost.className='nr-sky-now';todayHost.dataset.skyNow='';todayHost.setAttribute('translate','no');todayHost.setAttribute('aria-label',t('now'));
 const anchor=ov.querySelector(':scope > .sr-dayline');anchor?anchor.before(todayHost):ov.append(todayHost);
 todayHost.addEventListener('click',e=>{if(!e.target.closest('.nr-sky-now-open'))return;location.hash='panch';let n=0;const go=()=>{const s=document.querySelector('[data-sky]');if(s&&s.offsetParent){const detail=s.querySelector('.nr-sky-expand');detail.open=true;s.scrollIntoView({behavior:motionOn()?'smooth':'auto',block:'start'});(s.querySelector('[aria-pressed="true"]')||detail.querySelector('summary')).focus({preventScroll:true})}else if(n++<20)setTimeout(go,100)};setTimeout(go,60)});
 if('IntersectionObserver' in window)new IntersectionObserver(es=>{for(const x of es)todayHost.classList.toggle('is-visible',x.isIntersecting)}).observe(todayHost);else todayHost.classList.add('is-visible');
 renderToday();return true;
}
function spaceWeather(){
 const stamp=iso=>typeof iso==='string'&&iso.trim()&&Number.isFinite(Date.parse(iso))?Date.parse(iso):null;
 const fmt=iso=>{const ms=stamp(iso);if(ms===null)return t('sw_none');try{return NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch{return t('sw_none')}};
 const generated=stamp(weather?.generated_at),age=generated===null?null:Date.now()-generated;
 const w=age!==null&&age>=-300000&&age<7200000?weather:null,f=w?.flares,c=w?.cme;
 const unavailable=weather&&!w?t('sw_stale'):t('sw_none');
 const flare=!f?unavailable:f.strongest?`${f.strongest.class} · ${fmt(f.strongest.peak_utc)}`:t('sw_noflare');
 const wi=window.SRSpaceWeather?.windObservations(weather,Date.now());
 const number=new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:1});
 const sample=(observation,unit)=>observation?esc(number.format(observation.value)+unit)+'<small>'+esc(fmt(observation.time))+(observation.stale?' · '+esc(t('sw_stale')):'')+'</small>':esc(t('sw_none'));
 const wind=sample(wi?.plasma,L()==='uk'?' км/с':' km/s')+'<br>Bz '+sample(wi?.mag,' nT');
 const arrivals=Array.isArray(c?.earth_arrivals)?c.earth_arrivals:null;
 const cme=!arrivals?esc(unavailable):arrivals.length?arrivals.map(a=>{
  const ms=stamp(a?.arrival_utc);
  return '<div class="nr-sky-arrival">'+(ms===null?esc(t('sw_none')):'≈ '+esc(fmt(a.arrival_utc)))+(a?.glancing===true?' ('+esc(t('sw_glancing'))+')':'')+
   '<small>'+esc(t('sw_model')+': '+fmt(a?.model_run_utc))+'</small>'+(ms!==null&&ms<Date.now()?'<small class="nr-sky-estimate-past">'+esc(t('sw_elapsed'))+'</small>':'')+'</div>';
 }).join('')+(arrivals.length>1?'<small>'+esc(t('sw_alternatives'))+'</small>':''):esc(t('sw_nocme'));
 return `<div class="nr-sky-sw"><h4>${esc(t('sw'))}</h4><dl><div><dt>${esc(t('sw_flare'))}</dt><dd>${esc(flare)}</dd></div><div><dt>${esc(t('sw_wind'))}</dt><dd>${wind}</dd></div><div><dt>${esc(t('sw_cme'))}</dt><dd>${cme}</dd></div></dl><small>${esc(t('sw_kyiv'))}</small><p class="nr-sky-uncertainty">${esc(t('sw_note'))}</p><details class="nr-sky-weather-help"><summary>${esc(t('sw_why'))}</summary><p>${esc(t('sw_limits'))}</p><p>${esc(t('sw_horizon'))}</p><a href="https://www.spaceweather.gov/phenomena/geomagnetic-storms" target="_blank" rel="noopener noreferrer">NOAA</a> · <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">NASA DONKI</a></details></div>`;
}
const progressText=(i,n)=>({
 uk:`День ${i} з ${n}`,en:`Day ${i} of ${n}`,es:`Día ${i} de ${n}`,fr:`Jour ${i} sur ${n}`
})[L()];
function syncPlayback(){
 const controls=host?.querySelector('.nr-sky-controls');
 if(!controls||state!=='ready')return;
 const play=controls.querySelector('button'),range=controls.querySelector('input');
 const i=dayIndex(sel),label=progressText(i+1,sky.daily.length);
 play.textContent=timer?t('stop'):t('play');
 play.disabled=!motionOn()||sky.daily.length<2;
 play.setAttribute('aria-pressed',String(!!timer));
 range.max=String(sky.daily.length-1);
 range.value=String(i);
 range.setAttribute('aria-label',t('day'));
 range.setAttribute('aria-valuetext',fmtDay(sel)+' · '+label);
 controls.querySelector('.nr-sky-progress').textContent=label;
}
let stripSource=null,stripForecast=null,stripLocale=null;
function render(repaintToday=true){
 if(repaintToday)renderToday();
 if(!host)return;
 host.classList.toggle('is-motion',motionOn());
 const body=host.querySelector('.nr-sky-body');
 const weatherHelpOpen=host.querySelector('.nr-sky-weather-help')?.open===true;
 const planetDetailsOpen=host.querySelector('.nr-sky-planet-details')?.open===true;
 host.querySelector('.nr-sky-title').textContent=t('title');host.querySelector('.nr-sky-sub').textContent=plainScene[L()].guide+' '+t('sub');
 if(state!=='ready'){stop();body.innerHTML=`<p class="nr-sky-none" role="status">${esc(state==='loading'?'…':t('missing'))}</p>`;return}
 const today=kyivToday();if(!sel||dayIndex(sel)<0)sel=dayIndex(today)>=0?today:sky.daily[0].date;
 const stale=skyStale();
 const before=new Map([...host.querySelectorAll('.nr-sky-planet[data-g]')].map(e=>[e.dataset.g,[Number(e.dataset.visualLon??e.dataset.lon),Number(e.dataset.visualRad??e.dataset.rad)]]));
 // Keep the native range and its focus/pointer capture while replacing the picture.
 if(!body.querySelector('.nr-sky-controls')){
  body.replaceChildren();
  body.insertAdjacentHTML('afterbegin','<div class="nr-sky-controls"><button type="button" class="nr-sky-play"></button><label><input type="range" min="0"></label><span class="nr-sky-progress" aria-hidden="true"></span></div>');
 }
 body.querySelector('.nr-sky-stale')?.remove();
 if(stale)body.insertAdjacentHTML('afterbegin',`<p class="nr-sky-stale" role="status">${esc(t('stale'))}</p>`);
 const oldStage=body.querySelector('.nr-sky-stage');
 const stage=document.createElement('template');
 stage.innerHTML=
  `<div class="nr-sky-stage">${motionOn()?'':'<p class="nr-sky-motion-note">'+esc(plainScene[L()].disabled)+'</p>'}<p class="nr-sky-date">${esc(fmtDay(sel))}${(()=>{const k=kpFor(sel);return k?` · ${k.src==='NOAA_27day_outlook'?'Kp':esc(t('sw_forecast'))} ${new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(k.kp)}${k.src==='NOAA_27day_outlook'?' · '+esc(t('kp27')):''}${k.src==='NOAA_3day_slots'&&k.kp>=5?' · '+esc(t('storm'))+' G'+Math.min(5,Math.floor(k.kp)-4):''}`:''})()}</p><div class="nr-sky-wheel-wrap">${wheel(sel)}${planets(sel,false)}</div><div class="nr-sky-side"><div class="nr-sky-list">${list(sel)}</div>${spaceWeather()}</div></div>`;
 if(oldStage)oldStage.replaceWith(stage.content);
 else body.querySelector('.nr-sky-controls').after(stage.content);
 let days=body.querySelector('.nr-sky-days');
 if(!days||stripSource!==sky||stripForecast!==feed||stripLocale!==L()){
  const scroll=days?.scrollLeft||0;
  const focus=days?.contains(document.activeElement)?document.activeElement.dataset.skyDay:null;
  days?.remove();
  body.insertAdjacentHTML('beforeend',strip(sel));
  days=body.querySelector('.nr-sky-days');
  days.scrollLeft=scroll;
  if(focus)days.querySelector(`[data-sky-day="${focus}"]`)?.focus({preventScroll:true});
  stripSource=sky;stripForecast=feed;stripLocale=L();
 }else for(const b of days.children)b.setAttribute('aria-pressed',String(b.dataset.skyDay===sel));
 syncPlayback();
 cancelAnimationFrame(arcMove.id);arcMove.id=0;
 if(planetDetailsOpen)host.querySelector('.nr-sky-planet-details')?.setAttribute('open','');
 if(weatherHelpOpen)host.querySelector('.nr-sky-weather-help')?.setAttribute('open','');
 if(before.size&&motionOn()&&host.classList.contains('is-visible')&&host.querySelector('.nr-sky-expand').open)arcMove(before);
}
function arcMove(before){
 // Planets travel along the zodiac circle (shortest arc), not across it.
 const els=[...host.querySelectorAll('.nr-sky-wheel:not(.is-mini) .nr-sky-planet[data-g]')].map(e=>{const [a0,r0]=before.get(e.dataset.g)||[];const a1=Number(e.dataset.lon),r1=Number(e.dataset.rad);const da=((a1-a0+540)%360)-180,dr=r1-r0;return Number.isFinite(a0)&&(Math.abs(da)>.0001||Math.abs(dr)>.0001)?{e,a0,r0,da,dr}:null}).filter(Boolean);
 if(!els.length)return;const t0=performance.now(),dur=820;
 const point=(o,q)=>ring(o.a0+o.da*q,o.r0+o.dr*q);
 for(const o of els){
  if(Math.abs(o.da)<2)continue;
  const trace=document.createElementNS(o.e.namespaceURI,'path');
  trace.setAttribute('class','nr-sky-motion-trace');
  trace.setAttribute('stroke',G[o.e.dataset.g][5]);
  trace.setAttribute('aria-hidden','true');
  o.e.before(trace);o.trace=trace;
 }
 const place=(o,q)=>{
  const lon=o.a0+o.da*q,r=o.r0+o.dr*q,[x,y]=ring(lon,r);
  o.e.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';
  o.e.dataset.visualLon=String((lon+360)%360);o.e.dataset.visualRad=String(r);
 };
 const step=now=>{
  if(!motionOn())return;
  const k=Math.min(1,(now-t0)/dur);
  const q=1-Math.pow(1-k,3);
  for(const o of els){
   place(o,q);
   if(!o.trace)continue;
   if(k>=1){o.trace.remove();continue;}
   const start=Math.max(0,q-.55);
   const points=Array.from({length:9},(_,i)=>point(o,start+(q-start)*i/8).map(x=>x.toFixed(1)).join(' '));
   o.trace.setAttribute('d','M'+points.join(' L'));
   o.trace.style.opacity=String(Math.min(1,k*6,(1-k)*4));
  }
  arcMove.id=k<1?requestAnimationFrame(step):0;
 };
 for(const o of els)place(o,0);
 arcMove.id=requestAnimationFrame(step);
}
function select(ds,focus,silent){sel=ds;render(false);if(!silent)try{window.dispatchEvent(new CustomEvent('nr:day',{detail:ds}))}catch{}if(focus)host.querySelector(`[data-sky-day="${ds}"]`)?.focus()}
function stop(){
 cancelAnimationFrame(arcMove.id);arcMove.id=0;
 if(timer){clearInterval(timer);timer=null;}
 for(const trace of host?.querySelectorAll('.nr-sky-motion-trace')||[])trace.remove();
 for(const planet of host?.querySelectorAll('[data-visual-lon]')||[]){
  const [x,y]=ring(Number(planet.dataset.lon),Number(planet.dataset.rad));
  planet.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';
  delete planet.dataset.visualLon;delete planet.dataset.visualRad;
 }
 syncPlayback();
}
function play(){
 if(timer){stop();return}
 if(!motionOn()||state!=='ready'||!host.querySelector('.nr-sky-expand').open)return;
 if(dayIndex(sel)===sky.daily.length-1){sel=sky.daily[0].date;render(false);}
 timer=setInterval(()=>{
  if(!motionOn()||!host.classList.contains('is-visible')||!host.querySelector('.nr-sky-expand').open){stop();return;}
  const i=dayIndex(sel)+1;
  if(!sky.daily[i]){stop();return;}
  sel=sky.daily[i].date;
  if(i===sky.daily.length-1){clearInterval(timer);timer=null;}
  render(false);
 },900);
 syncPlayback();
}

let tries=0;
function mount(){
 if(host)return true;const route=document.getElementById('nrRoute-panch');if(!route){if(tries++<40)setTimeout(()=>{if(mount())render()},250);return false}
 host=document.createElement('section');host.className='nr-sky';host.setAttribute('translate','no');host.dataset.sky='';host.setAttribute('aria-labelledby','nrSkyTitle');
 host.innerHTML='<details class="nr-sky-expand"><summary class="nr-sky-head"><h2 class="nr-sky-title" id="nrSkyTitle"></h2></summary><p class="nr-sky-sub"></p><div class="nr-sky-body"></div></details>';
 const detail=host.querySelector('.nr-sky-expand');
 detail.addEventListener('toggle',()=>{if(!detail.open)stop();});
 route.prepend(host); // The local sky is mounted just before the longer-range view.
 host.addEventListener('click',e=>{
  const event=e.target.closest('[data-sky-event-at]');
  if(event&&window.SRSkyTime?.selectMoment(event.dataset.skyEventAt)){
   stop();
   const heading=document.getElementById('nrSkyLiveHeading');
   if(heading){
    heading.tabIndex=-1;
    heading.focus({preventScroll:true});
    heading.scrollIntoView({block:'start',behavior:'instant'});
   }
   return;
  }
  const b=e.target.closest('[data-sky-day]');
  if(b){stop();select(b.dataset.skyDay,true);return}
  if(e.target.closest('.nr-sky-play')){
   play();
   host.querySelector('.nr-sky-play')?.focus({preventScroll:true});
  }
 });
 host.addEventListener('input',e=>{
  if(!e.target.matches('.nr-sky-controls input'))return;
  const next=sky?.daily[Number(e.target.value)]?.date;
  if(next){stop();select(next,false);}
 });
 host.addEventListener('keydown',e=>{const b=e.target.closest('[data-sky-day]');if(!b||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const i=dayIndex(b.dataset.skyDay)+(e.key==='ArrowRight'?1:-1);if(sky.daily[i]){stop();select(sky.daily[i].date,true)}});
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
window.NRSkyScene={state:()=>state,selected:()=>sel,select:ds=>{if(dayIndex(ds)>=0){if(ds!==sel)stop();select(ds,false,true);}},items:dayItems};
let todayTries=0;const ensureToday=()=>{if(!mountToday()&&todayTries++<40)setTimeout(ensureToday,250)};
const start=()=>{mount();ensureToday();load()};
window.addEventListener('sr:consumer-load',()=>{if(!todayHost||!todayHost.isConnected){todayHost=null;ensureToday()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));else setTimeout(start,0);
window.addEventListener('nr:locale',render);
let loadedAt=Date.now();
function refreshVisible(){if(!document.hidden&&(Date.now()-loadedAt>300000||sky?.window?.start!==kyivToday())){loadedAt=Date.now();load()}}
window.addEventListener('online',refreshVisible);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();host?.classList.remove('is-motion');todayHost?.classList.remove('is-motion');}else{render();refreshVisible();}});
setInterval(refreshVisible,300000);
let lastMotion=motionOn();new MutationObserver(()=>{const on=motionOn();if(on!==lastMotion){lastMotion=on;if(!on){stop();cancelAnimationFrame(arcMove.id)}render()}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
const motionPreferenceChanged=()=>{stop();render();};
reduce.addEventListener?.('change',motionPreferenceChanged);
reduceData.addEventListener?.('change',motionPreferenceChanged);
navigator.connection?.addEventListener('change',motionPreferenceChanged);
})();
