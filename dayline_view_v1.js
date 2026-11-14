/* DayLine presentation. Score/plan/forecast authority remains in existing modules. */
(function(){'use strict';
// FP569l: plain-language names of day-line changes (owner: «Лінія дня — взагалі не зрозуміло»).
const KIND_RANK=['tithi','nakshatra','yoga','karana'];
const PLAIN={uk:{tithi:'Новий місячний день',nakshatra:'Місяць у новому сузір’ї',yoga:'Нова йога дня',karana:'Половина місячного дня',more:n=>'+ ще '+n,
  legend:['Що означають позначки','Новий місячний день (тітхі) — Місяць відійшов від Сонця ще на 12°; ≈ раз на добу. У традиції кожен місячний день має свою «тему».','Місяць у новому сузір’ї (накшатра) — Місяць переходить у наступну з 27 ділянок неба; ≈ раз на добу.','Нова йога дня — змінюється поєднання Сонця й Місяця (27 видів); ≈ раз на добу.','Половина місячного дня (карана) — ≈ кожні 12 годин.','Це календарні переходи традиції Джйотіш, розраховані астрономічно. На бал дня не впливають.']},
 en:{tithi:'New lunar day',nakshatra:'Moon enters a new star group',yoga:'New day yoga',karana:'Half lunar day',more:n=>'+ '+n+' more',
  legend:['What the markers mean','New lunar day (tithi): the Moon has moved another 12° from the Sun; about once a day. In the tradition each lunar day has its own theme.','Moon enters a new star group (nakshatra): one of 27 sky sections; about once a day.','New day yoga: the Sun–Moon combination changes (27 kinds); about once a day.','Half lunar day (karana): about every 12 hours.','These are Jyotish calendar transitions, computed astronomically. They do not change the day score.']},
 es:{tithi:'Nuevo día lunar',nakshatra:'La Luna entra en otra constelación',yoga:'Nuevo yoga del día',karana:'Medio día lunar',more:n=>'+ '+n+' más',
  legend:['Qué significan las marcas','Nuevo día lunar (tithi): la Luna se aleja otros 12° del Sol; aprox. una vez al día.','La Luna entra en otra constelación (nakshatra): una de 27 secciones; aprox. una vez al día.','Nuevo yoga del día: cambia la combinación Sol–Luna; aprox. una vez al día.','Medio día lunar (karana): aprox. cada 12 horas.','Transiciones del calendario Jyotish, calculadas astronómicamente. No cambian la puntuación.']},
 fr:{tithi:'Nouveau jour lunaire',nakshatra:'La Lune change de constellation',yoga:'Nouveau yoga du jour',karana:'Demi-jour lunaire',more:n=>'+ '+n+' autre'+(n>1?'s':''),
  legend:['Que signifient les repères','Nouveau jour lunaire (tithi) : la Lune s’éloigne encore de 12° du Soleil ; env. une fois par jour.','La Lune change de constellation (nakshatra) : une des 27 sections ; env. une fois par jour.','Nouveau yoga du jour : la combinaison Soleil–Lune change ; env. une fois par jour.','Demi-jour lunaire (karana) : env. toutes les 12 heures.','Transitions du calendrier Jyotish, calculées astronomiquement. Sans effet sur le score.']}};
const plainSet=()=>PLAIN[window.NRLocale?.language]||PLAIN.uk;
const plainKind=k=>plainSet()[k]||k,plainMore=n=>plainSet().more(n);
// Short marker names (the bubble is ~9 em wide at 200 % text); the full name is in the legend, the next-transition line and the dialog.
const SHORT={uk:{tithi:'Місячний день',nakshatra:'Сузір’я Місяця',yoga:'Йога дня',karana:'Пів місячного дня'},en:{tithi:'Lunar day',nakshatra:'Moon’s star',yoga:'Day yoga',karana:'Half lunar day'},es:{tithi:'Día lunar',nakshatra:'Estrella lunar',yoga:'Yoga del día',karana:'Medio día lunar'},fr:{tithi:'Jour lunaire',nakshatra:'Étoile lunaire',yoga:'Yoga du jour',karana:'Demi-jour lunaire'}};
const shortKind=k=>(SHORT[window.NRLocale?.language]||SHORT.uk)[k]||plainKind(k);

const cache=new Map(),failed=new Set(),KEY='srDayLinePreferencesV1';
const cities={kyiv:[50.454,30.524,'Europe/Kyiv'],ny:[40.7128,-74.006,'America/New_York'],delhi:[28.6139,77.209,'Asia/Kolkata'],tromso:[69.6492,18.9553,'Europe/Oslo']};
let node,rootNode,data,dialog,returnFocus,lastDate='',lang='uk',minute=0,artKey='',sunset=null,currentEvent=0,renderSequence=0;
let pref={city:'kyiv',lat:50.454,lon:30.524,zone:'Europe/Kyiv',style:'engraving'};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&['engraving','gouache','none'].includes(p.style))pref=validPlace(p)?p:{...pref,style:p.style};}catch(_){}
if(matchMedia('(prefers-reduced-data: reduce)').matches||navigator.connection?.saveData)pref.style='none';
const words={
uk:['Головне на лінії дня','Пояснити','Поділитися днем','Місце','Зараз','Повернутися до зараз','Перехід','Переходи цього дня завершено','Що це','Як обчислено','Традиційний образ','Джерело реалізації','Попередня','Наступна','Закрити','Копіювати текст','Текст скопійовано','Скопіюйте виділений текст вручну','Оцінка для Києва; для вибраного міста її не перераховано.','Точність прогнозу не встановлена. Календарні переходи не є порадами.','Записати, як минув день','Місце визначає схід, захід і час подій. Дата народження не потрібна.','Застосувати','Інше місце','Широта','Довгота','Часовий пояс IANA','Збережено на цьому пристрої','Не вдалося зберегти; налаштування не змінено','Перевірте координати та часовий пояс','Поточний місцевий час поза цим днем','Схід','Захід','Наступний схід','Додати подію до календаря','Це файл ICS. Нагадування налаштовуються у вашому календарі; фонові сповіщення застосунок не обіцяє.','Без даних','Експертне рішення','Формула джерела','Небо як ритм, а не вирок','Зміна місця оновлює локальне небо й Панчангу. Бал і план залишаються за Києвом.','Символічне тлумачення не визначає бал. Для цієї події окремого перевіреного тексту традиції не додано.'],
en:['Next on the day line','Explain','Share this day','Place','Now','Back to now','Transition','All transitions for this day have passed','What it is','How it is calculated','Traditional image','Implementation source','Previous','Next','Close','Copy text','Text copied','Select and copy the text manually','Score for Kyiv; it has not been recalculated for the selected place.','Predictive accuracy is not established. Calendar transitions are not advice.','Record how the day went','Place determines sunrise, sunset and event times. No birth date is needed.','Apply','Other place','Latitude','Longitude','IANA time zone','Saved on this device','Could not save; settings were not changed','Check coordinates and time zone','The current local time is outside this day','Sunrise','Sunset','Next sunrise','Add event to calendar','This is an ICS file. Set reminders in your calendar; the app does not promise background notifications.','No data','Expert decision','Source formula','The sky as rhythm, not a verdict','Changing place updates the local sky and Panchanga. Score and plan remain on Kyiv time.','Symbolic interpretation does not determine the score. No separately verified traditional text has been added for this event.'],
es:['Lo próximo en la línea del día','Explicar','Compartir el día','Lugar','Ahora','Volver a ahora','Transición','Ya terminaron las transiciones de este día','Qué es','Cómo se calcula','Imagen tradicional','Fuente de implementación','Anterior','Siguiente','Cerrar','Copiar texto','Texto copiado','Seleccione y copie el texto manualmente','Puntuación para Kyiv; no se ha recalculado para el lugar elegido.','La precisión predictiva no está establecida. Las transiciones no son consejos.','Registrar cómo fue el día','El lugar determina la salida y puesta del Sol y los horarios. No se necesita fecha de nacimiento.','Aplicar','Otro lugar','Latitud','Longitud','Zona horaria IANA','Guardado en este dispositivo','No se pudo guardar; los ajustes no cambiaron','Revise las coordenadas y la zona horaria','La hora local actual está fuera de este día','Salida del Sol','Puesta del Sol','Próxima salida','Añadir evento al calendario','Es un archivo ICS. Configure los recordatorios en su calendario; la aplicación no promete avisos en segundo plano.','Sin datos','Decisión experta','Fórmula de la fuente','El cielo como ritmo, no como sentencia','El lugar actualiza el cielo local y la Panchanga. La puntuación y el plan siguen en horario de Kyiv.','La interpretación simbólica no determina la puntuación. No se ha añadido un texto tradicional verificado por separado para este evento.'],
fr:['À venir sur la ligne du jour','Expliquer','Partager la journée','Lieu','Maintenant','Revenir à maintenant','Transition','Les transitions de cette journée sont terminées','Définition','Méthode de calcul','Image traditionnelle','Source de l’implémentation','Précédent','Suivant','Fermer','Copier le texte','Texte copié','Sélectionnez et copiez le texte manuellement','Score pour Kyiv ; il n’a pas été recalculé pour le lieu choisi.','La précision prédictive n’est pas établie. Les transitions ne sont pas des conseils.','Noter le déroulement de la journée','Le lieu détermine le lever, le coucher et les horaires. Aucune date de naissance nécessaire.','Appliquer','Autre lieu','Latitude','Longitude','Fuseau horaire IANA','Enregistré sur cet appareil','Échec de l’enregistrement ; réglages inchangés','Vérifiez les coordonnées et le fuseau horaire','L’heure locale actuelle est en dehors de cette journée','Lever du Soleil','Coucher du Soleil','Lever suivant','Ajouter au calendrier','Fichier ICS. Réglez les rappels dans votre calendrier ; l’application ne promet pas de notifications en arrière-plan.','Sans données','Décision experte','Formule source','Le ciel comme rythme, pas comme verdict','Le lieu actualise le ciel local et la Panchanga. Le score et le plan restent à l’heure de Kyiv.','L’interprétation symbolique ne détermine pas le score. Aucun texte traditionnel vérifié séparément n’a été ajouté pour cet événement.']};
const labels={
 uk:{place:'Місце',pick:'Обрати місце',custom:'Мої координати',art:'Ілюстрації Панчанги',zone:'Часовий пояс',help:'Місце визначає час сходу, заходу й календарних переходів.',mark:'Натисніть позначку, щоб прочитати пояснення всіх переходів.',next:'Наступний перехід',about:'Що змінюється',kinds:{tithi:'Місячний день',nakshatra:'Ділянка Місяця',yoga:'Йога',karana:'Половина місячного дня'}},
 en:{place:'Place',pick:'Choose place',custom:'My coordinates',art:'Panchanga illustrations',zone:'Time zone',help:'The place sets the local sunrise, sunset and calendar transition times.',mark:'Tap a marker to read about all its transitions.',next:'Next transition',about:'What changes',kinds:{tithi:'Lunar day',nakshatra:'Moon sector',yoga:'Yoga',karana:'Half tithi'}},
 es:{place:'Lugar',pick:'Elegir lugar',custom:'Mis coordenadas',art:'Ilustraciones de la Panchanga',zone:'Zona horaria',help:'El lugar determina las horas locales de salida, puesta y transición.',mark:'Toque una marca para leer la explicación de todas sus transiciones.',next:'Próxima transición',about:'Qué cambia',kinds:{tithi:'Día lunar',nakshatra:'Sector lunar',yoga:'Yoga',karana:'Medio tithi'}},
 fr:{place:'Lieu',pick:'Choisir un lieu',custom:'Mes coordonnées',art:'Illustrations de la Panchanga',zone:'Fuseau horaire',help:'Le lieu détermine les heures locales de lever, de coucher et de transition.',mark:'Touchez un repère pour lire les explications de ses transitions.',next:'Prochaine transition',about:'Ce qui change',kinds:{tithi:'Jour lunaire',nakshatra:'Secteur lunaire',yoga:'Yoga',karana:'Demi-tithi'}}
};
const labelSet=()=>labels[lang]||labels.uk;
const defs={
uk:{tithi:'Тітхі — один із 30 секторів різниці довгот Місяця й Сонця. Кожен охоплює 12°.',nakshatra:'Накшатра — один із 27 рівних секторів сидеричної довготи Місяця, по 13°20′.',yoga:'Йога — один із 27 секторів суми сидеричних довгот Сонця й Місяця, по 13°20′.',karana:'Карана відповідає половині тітхі: 6° різниці довгот Місяця й Сонця. Назви повторюються за правилом ядра.'},
en:{tithi:'A tithi is one of 30 sectors of the Moon–Sun longitude difference, each spanning 12°.',nakshatra:'A nakshatra is one of 27 equal sectors of sidereal lunar longitude, each 13°20′.',yoga:'A yoga is one of 27 sectors of the sum of sidereal solar and lunar longitudes, each 13°20′.',karana:'A karana is half a tithi: 6° of Moon–Sun longitude difference. Names repeat according to the core mapping.'},
es:{tithi:'Un tithi es uno de 30 sectores de la diferencia de longitudes Luna–Sol, de 12° cada uno.',nakshatra:'Una nakshatra es uno de 27 sectores de longitud lunar sideral, de 13°20′ cada uno.',yoga:'Un yoga es uno de 27 sectores de la suma de longitudes siderales del Sol y la Luna, de 13°20′.',karana:'Un karana es medio tithi: 6° de diferencia de longitudes Luna–Sol. Los nombres siguen la secuencia del motor.'},
fr:{tithi:'Un tithi est l’un des 30 secteurs de la différence de longitude Lune–Soleil, de 12° chacun.',nakshatra:'Une nakshatra est l’un des 27 secteurs de longitude lunaire sidérale, de 13°20′ chacun.',yoga:'Un yoga est l’un des 27 secteurs de la somme des longitudes sidérales du Soleil et de la Lune, de 13°20′ chacun.',karana:'Un karana est un demi-tithi : 6° de différence de longitude Lune–Soleil. Les noms suivent la séquence du moteur.'}};
const w=i=>(words[lang]||words.uk)[i],tr=k=>SkyRhythmI18n.t(lang,k),name=(k,v)=>SkyRhythmI18n.name(k,v,lang),q=s=>node.querySelector(s);
const fmt=t=>new Intl.DateTimeFormat(SkyRhythmI18n.LOCALE[lang],{timeZone:pref.zone,hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const stamp=t=>new Intl.DateTimeFormat(SkyRhythmI18n.LOCALE[lang],{timeZone:pref.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const place=()=>window.SRSkyTime?.cityLabel?.({cityId:pref.city,label:pref.cityLabel})||(cities[pref.city]?tr('city.'+pref.city):labelSet().custom);
let followNow=true,previewAt=null,scoreDate='',sharedPlaceUsed=false;
const inLiveDay=()=>data?.status==='available'&&Date.now()>=Date.parse(data.start)&&Date.now()<Date.parse(data.end);
const at=()=>followNow&&inLiveDay()?Date.now():previewAt??(Date.parse(data.start)+(Date.parse(data.end)-Date.parse(data.start))*minute/1000);
function validPlace(p){try{return typeof p.lat==='number'&&typeof p.lon==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&typeof p.zone==='string'&&!!new Intl.DateTimeFormat('en',{timeZone:p.zone});}catch(_){return false;}}
function create(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function button(text,fn){const b=create('button','',text);b.type='button';b.onclick=fn;return b;}
function eventText(e){return fmt(e.at)+' · '+tr('kind.'+e.kind)+': '+name(e.kind,e.from)+' → '+name(e.kind,e.to);}
function nowMinute(){return Math.max(0,Math.min(999,Math.floor((Date.now()-Date.parse(data.start))/(Date.parse(data.end)-Date.parse(data.start))*1000)));}
const TIME_COPY={
 uk:{view:'Переглянути цей момент',selected:'Вибраний час',start:'Початок доби'},
 en:{view:'View this moment',selected:'Selected time',start:'Start of the day'},
 es:{view:'Ver este momento',selected:'Hora seleccionada',start:'Inicio del día'},
 fr:{view:'Voir ce moment',selected:'Heure choisie',start:'Début de la journée'}
};
const timeCopy=()=>TIME_COPY[lang]||TIME_COPY.uk;

const CIVIL_COPY={
 uk:['Від початку доби','Далі','Сьогодні переходів більше немає','Розклад по 3 години','Від місцевої півночі. У списку — розрахований час змін.','На початку періоду','Переходів у цьому періоді немає','Тара Бала','Тара Бала від твого натального Місяця · трактування Джйотіш.','Додай дані народження в «Для тебе», щоб побачити Тара-балу.','Уточни час народження: того дня Місяць змінив накшатру.','Тара-бала недоступна для збережених даних.','Точна шкала від сходу до сходу','Розклад для цієї дати недоступний','Зміни цього дня завершилися','Найближча зміна','Ділянка Місяця (накшатра)'],
 en:['At the start of the day','Next','No more transitions today','Three-hour schedule','From local midnight. Each transition shows its calculated time.','At the start of the window','No transitions in this window','Tara Bala','Tara Bala from your natal Moon · Jyotish interpretation.','Add birth details in “For you” to see Tara Bala.','Add your birth time: the Moon changed nakshatra that day.','Tara Bala is unavailable for the saved birth details.','Detailed sunrise-to-sunrise timeline','Schedule unavailable for this date','This day’s transitions have ended','Next change','Moon sector (nakshatra)'],
 es:['Al comenzar el día','Después','No hay más transiciones hoy','Horario de tres horas','Desde la medianoche local. Se indica la hora calculada de cada transición.','Al comenzar el tramo','Sin transiciones en este tramo','Tara Bala','Tara Bala desde tu Luna natal · interpretación jyotish.','Añade tus datos de nacimiento en «Para ti» para ver Tara Bala.','Añade la hora de nacimiento: la Luna cambió de nakshatra ese día.','Tara Bala no está disponible para los datos guardados.','Cronología detallada de amanecer a amanecer','Horario no disponible para esta fecha','Las transiciones de este día han terminado','Próximo cambio','Sector lunar (nakshatra)'],
 fr:['Au début de la journée','Ensuite','Aucune autre transition aujourd’hui','Créneaux de trois heures','Depuis minuit, heure locale. Chaque transition indique son heure calculée.','Au début du créneau','Aucune transition dans ce créneau','Tara Bala','Tara Bala depuis ta Lune natale · interprétation jyotish.','Ajoute tes données de naissance dans « Pour vous » pour voir Tara Bala.','Ajoute ton heure de naissance : la Lune a changé de nakshatra ce jour-là.','Tara Bala est indisponible pour les données enregistrées.','Chronologie détaillée d’un lever au suivant','Créneaux indisponibles pour cette date','Les transitions de la journée sont terminées','Prochain changement','Secteur lunaire (nakshatra)']
};
const civilCopy=i=>(CIVIL_COPY[lang]||CIVIL_COPY.uk)[i];
const SLOT_MS=3*3600000;
const DST_NOTE={
 uk:'Показано зміщення UTC через зміну годинника. Останній період може бути коротшим.',
 en:'UTC offsets are shown because the clocks change. The final window may be shorter.',
 es:'Se indica el desfase UTC por el cambio de hora. El último tramo puede ser más corto.',
 fr:'Les décalages UTC sont indiqués en raison du changement d’heure. Le dernier créneau peut être plus court.'
};
const CIVIL_EVENT_ORDER=(a,b)=>a.at.localeCompare(b.at)||KIND_RANK.indexOf(a.kind)-KIND_RANK.indexOf(b.kind);
function civilEvent(e,origin){
 const index=data?.events.findIndex(item=>item.kind===e.kind&&item.at===e.at)??-1;
 if(index>=0){explain(index);return;}
 const d=openDialog(shortKind(e.kind)+' · '+stamp(e.at),origin);
 d.append(create('p','sr-dl-group-change',name(e.kind,e.from)+' → '+name(e.kind,e.to)),
  create('p','sr-dl-fact',groupCopy().meaning[e.kind]));
 d.querySelector('button').focus();
}
function civilState(civil,time){
 const current={...civil.initial};
 for(const e of civil.events){
  if(Date.parse(e.at)>time)break;
  current[e.kind]=e.to;
 }
 return current;
}
function renderCivil(){
 const overview=q('[data-dl-civil]'),periods=q('[data-dl-periods]');
 const civil=data?.civil;
 if(civil?.status!=='available'){
  overview.hidden=true;periods.hidden=true;
  q('[data-dl-load]').textContent=node.dataset.dlState==='loading'?q('[data-status]').textContent:civilCopy(13);
  return;
 }
 const start=Date.parse(civil.start),end=Date.parse(civil.end),now=Date.now();
 const live=now>=start&&now<end;
 const picked=!followNow&&data.status==='available'?at():null;
 const selected=picked!==null&&picked>=start&&picked<end;
 const time=selected?picked:live?now:start;
 const state=civilState(civil,time);
 overview.hidden=false;periods.hidden=false;q('[data-dl-load]').textContent='';
 const mode=selected?timeCopy().selected:live?w(4):civilCopy(0);
 q('[data-dl-civil-mode]').textContent=mode+' · '+fmt(time);
 q('[data-dl-current-tithi]').textContent=name('tithi',state.tithi);
 q('[data-dl-current-nak]').textContent=name('nakshatra',state.nakshatra);
 q('[data-dl-tithi-label]').textContent=shortKind('tithi');
 q('[data-dl-nak-label]').textContent=civilCopy(16);
 const next=civil.events.filter(e=>Date.parse(e.at)>time).sort(CIVIL_EVENT_ORDER)[0];
 const nextButton=q('[data-dl-next]');
 nextButton.hidden=!next;
 const noNext=q('[data-dl-no-next]');
 noNext.hidden=!!next;
 noNext.textContent=live?civilCopy(2):civilCopy(14);
 if(next){
  q('[data-dl-next-time]').textContent=civilCopy(1)+' · '+fmt(next.at);
  q('[data-dl-next-label]').textContent=shortKind(next.kind)+' · '+name(next.kind,next.to);
  nextButton.setAttribute('aria-label',civilCopy(15)+' · '+fmt(next.at)+' · '+q('[data-dl-next-label]').textContent);
  nextButton.onclick=()=>civilEvent(next,nextButton);
 }
 periods.querySelector('summary').textContent=civilCopy(3);
 if(periods.open)renderPeriods(civil,time,live,selected,now);
}
function renderPeriods(civil,time,live,selected,now){
 const list=q('[data-dl-period-list]');
 const start=Date.parse(civil.start),end=Date.parse(civil.end);
 const values=[civil.initial.nakshatra,...civil.events.filter(e=>e.kind==='nakshatra').map(e=>e.to)];
 const personal=window.NRNatalSky?.timelineTara([...new Set(values)])||{status:'unavailable'};
 const signature=JSON.stringify([lang,pref.zone,start,end,civil.events,personal]);
 if(list.dataset.signature!==signature){
  list.dataset.signature=signature;
  q('[data-dl-period-note]').textContent=civilCopy(4)+(end-start!==86400000?' '+DST_NOTE[lang]:'');
  q('[data-dl-personal-note]').textContent=civilCopy(({available:8,missing:9,ambiguous:10,unavailable:11})[personal.status]);
  list.replaceChildren();
  const offsetFormat=end-start!==86400000?new Intl.DateTimeFormat(SkyRhythmI18n.LOCALE[lang],
   {timeZone:pref.zone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}):null;
  const slotTime=t=>offsetFormat?offsetFormat.format(t):fmt(t);
  for(let a=start;a<end;a+=SLOT_MS){
   const b=Math.min(a+SLOT_MS,end),state=civilState(civil,a);
   const row=create('li','sr-dl-period');
   row.dataset.start=String(a);row.dataset.end=String(b);
   const heading=create('div','sr-dl-period-head');
   const startTime=create('time','',slotTime(a)),endTime=create('time','',slotTime(b));
   startTime.dateTime=new Date(a).toISOString();endTime.dateTime=new Date(b).toISOString();
   const range=create('strong','sr-dl-period-range');
   range.append(startTime,document.createTextNode('–'),endTime);
   const badge=create('span','sr-dl-period-badge');badge.dataset.dlPeriodBadge='';
   heading.append(range,badge);
   row.append(heading,create('p','sr-dl-period-state',civilCopy(5)+' · '+name('tithi',state.tithi)+' · '+name('nakshatra',state.nakshatra)));
   const signal=personal.byNakshatra?.[state.nakshatra];
   if(signal){
    const context=create('p','sr-dl-period-tara',civilCopy(7)+' · '+signal.name+' · '+signal.label);
    context.dataset.tone=signal.tone;
    row.append(context);
   }
   const events=civil.events.filter(e=>Date.parse(e.at)>=a&&Date.parse(e.at)<b).sort(CIVIL_EVENT_ORDER);
   for(const event of events){
    const change=button('',()=>civilEvent(event,change));
    change.className='sr-dl-period-change';change.dataset.eventAt=event.at;change.dataset.kind=event.kind;
    const timestamp=create('time','',fmt(event.at));timestamp.dateTime=event.at;
    const description=shortKind(event.kind)+' · '+name(event.kind,event.to);
    change.append(timestamp,create('span','',description));
    const relation=Date.parse(event.at)>a&&event.kind==='nakshatra'?personal.byNakshatra?.[event.to]:null;
    if(relation)change.append(create('small','',civilCopy(7)+' · '+relation.name+' · '+relation.label));
    row.append(change);
   }
   if(!events.length)row.append(create('p','sr-dl-period-empty',civilCopy(6)));
   list.append(row);
  }
 }
 for(const row of list.children){
  const a=Number(row.dataset.start),b=Number(row.dataset.end);
  const current=live&&now>=a&&now<b;
  const preview=selected&&time>=a&&time<b;
  if(current)row.setAttribute('aria-current','time');
  else row.removeAttribute('aria-current');
  row.toggleAttribute('data-selected',preview);
  row.querySelector('[data-dl-period-badge]').textContent=
   preview&&current?w(4)+' · '+timeCopy().selected:preview?timeCopy().selected:current?w(4):'';
 }
}
function updateTrack(t){
 const bar=q('[data-track]'),cursor=bar.querySelector('.sr-dl-preview-cursor');
 if(cursor){
  cursor.hidden=followNow;
  if(!followNow){
   const a=Date.parse(data.start),b=Date.parse(data.end);
   cursor.style.left=(MARKER_INSET+(bar.clientWidth-2*MARKER_INSET)*(t-a)/(b-a))+'px';
  }
 }
 for(const marker of bar.querySelectorAll('button[data-event-times]')){
  const near=marker.dataset.eventTimes.split(',').some(ms=>Math.abs(t-Number(ms))<=12e5);
  marker.classList.toggle('is-passing',near);
 }
}
function moment(){renderCivil();updateSolarMoment();if(data?.status!=='available'){q('[data-moment]').textContent='';q('figure:not([data-solar-profile])').hidden=true;return;}
 const t0=at(),mode=followNow?(inLiveDay()?w(4):timeCopy().start):timeCopy().selected;
 q('input[type=range]').setAttribute('aria-valuetext',mode+' · '+stamp(t0));
 updateTrack(t0);
 const p=window.SkyRhythmLunar?.available?.()?window.SkyRhythmLunar.at(t0):MeeusCore.panchangaAt(t0+69184),key=({"1": "ashwini", "2": "bharani", "3": "krittika", "4": "rohini", "5": "mrigashira", "6": "ardra", "7": "punarvasu", "8": "pushya", "9": "ashlesha", "10": "magha", "11": "purvaphalguni", "12": "uttaraphalguni", "13": "hasta", "14": "chitra", "15": "swati", "16": "vishakha", "17": "anuradha", "18": "jyeshtha", "19": "mula", "20": "purvaashadha", "21": "uttaraashadha", "22": "shravana", "23": "dhanishta", "24": "water", "25": "fire", "26": "depth", "27": "nourish"})[p.nakshatra],target=key&&pref.style!=='none'&&(pref.style==='engraving'||p.nakshatra>=24)?key+'-'+pref.style:'';
 const summary=q('[data-moment]');
 const title=mode+' · '+stamp(t0);
 const labels=['tithi','nakshatra'].map(k=>shortKind(k)+': '+name(k,p[k]));
 const detail=labels.join(' · ');
 if(summary.firstElementChild?.textContent!==title||summary.lastElementChild?.textContent!==detail)
  summary.replaceChildren(create('strong','',title),create('span','',detail));
 q('figure:not([data-solar-profile])').hidden=!target||failed.has(target);
 if(target!==artKey){artKey=target;if(target){q('img').dataset.art=target;q('img').src='dayline_art/'+target+'.webp';}else q('img').removeAttribute('src');}
 if(key){q('img').alt=name('nakshatra',p.nakshatra)+' — '+tr('artAlt');q('figure:not([data-solar-profile]) figcaption strong').textContent=name('nakshatra',p.nakshatra)+(p.nakshatra>=24?' · '+tr('deity.'+key):'');q('figure:not([data-solar-profile]) figcaption span').textContent=tr('art.'+key);q('figure:not([data-solar-profile]) figcaption small').textContent=tr('artAlt');}
}
// Bṛhat Saṃhitā, Iyer translation, chapters 98.6–11 and 99.2.
const TITHI_GROUPS=[['Нанда','Бхадра','Віджая','Рікта','Пурна'],['Nanda','Bhadra','Vijaya','Rikta','Purna']];
const NAK_GROUP=[null,'light','fierce','mixed','stable','soft','sharp',null,'light','sharp','fierce','fierce','stable','light','soft','moving','mixed','soft','sharp','sharp','fierce','stable','moving','moving','moving','fierce','stable','soft'];
const NAK_LABEL=[
 {stable:'Стійка накшатра',moving:'Рухлива накшатра',fierce:'Сувора накшатра',mixed:'Змішана накшатра',light:'Легка накшатра',soft:'М’яка накшатра',sharp:'Гостра накшатра'},
 {stable:'Stable nakshatra',moving:'Movable nakshatra',fierce:'Fierce nakshatra',mixed:'Mixed nakshatra',light:'Light nakshatra',soft:'Soft nakshatra',sharp:'Sharp nakshatra'}
];
function plainMeaning(kind,value){
 const L=lang==='uk'?0:1;
 if(kind==='tithi'&&Number.isInteger(value)&&value>=1&&value<=30){
  if(value===30)return ['Тітхі молодика','New-moon tithi'][L];
  if(value===15)return ['Тітхі повні','Full-moon tithi'][L];
  if(value===1)return ['Початок світлої половини місяця','Start of the waxing half'][L];
  const label=TITHI_GROUPS[L][(value-1)%5];
  return L?label+' group':'Група «'+label+'»';
 }
 if(kind==='nakshatra'&&Number.isInteger(value)&&value>=1&&value<=27){
  return NAK_LABEL[L][NAK_GROUP[value]]||['Накшатра Місяця','Lunar nakshatra'][L];
 }
 return null;
}
function storyLines(){
 if(data?.status!=='available')return [];
 const uk=lang==='uk',start=Date.parse(data.start),end=Date.parse(data.end),out=[];
 const date=t=>window.NRCivilTime?.dayKey(t,pref.zone);
 const stampLocal=t=>fmt(t)+(date(t)!==date(start)?(uk?' завтра':' tomorrow'):'');
 for(const kind of ['tithi','nakshatra']){
  const changes=data.events.filter(e=>e.kind===kind&&Date.parse(e.at)>start&&Date.parse(e.at)<end);
  let value=data.initial?.[kind]??changes[0]?.from;
  let from=start;
  for(const event of [...changes,{at:data.end}]){
   const to=Date.parse(event.at),head=plainMeaning(kind,value);
   if(head&&to>from){
    const when=from===start
     ?to===end?(uk?'уся доба':'all day'):(uk?'до ':'until ')+stampLocal(to)
     :to===end?(uk?'з ':'from ')+stampLocal(from):stampLocal(from)+' – '+stampLocal(to);
    const sub=(kind==='tithi'?(uk?'Місячний день: ':'Lunar day: '):(uk?'Накшатра: ':'Nakshatra: '))+name(kind,value);
    out.push({when,head,sub});
   }
   from=to;
   value=event.to;
  }
 }
 return out;
}
function renderStory(){let box=q('[data-dl-today]');if(!box){box=create('div','sr-dl-today');box.dataset.dlToday='';q('[data-track]').before(box);}
 const lines=storyLines();const L=lang==='uk'?0:1;
 if(!lines.length){box.hidden=true;return}box.hidden=false;
 const sig=lang+'|'+lines.map(l=>l.when+l.head+l.sub).join('|');if(box.dataset.sig===sig)return;box.dataset.sig=sig;
 const rows=lines.map(l=>{const r=create('div','sr-dl-row');const t=create('span','sr-dl-when',l.when);const body=create('div','sr-dl-row-body');body.append(create('b','',l.head),create('span','sr-dl-row-sub',l.sub));r.append(t,body);return r});
 box.replaceChildren(create('strong','sr-dl-today-title',['Місячний календар доби','Lunar calendar for this day'][L]),...rows,create('small','sr-dl-muted',['Традиційні групи за «Бріхат-самхітою». Бал дня розраховується окремо.','Traditional groups from the Brihat Samhita. The day score is calculated separately.'][L]));}
const MARKER_GAP=120,MARKER_INSET=60;
const dayKey=t=>NRCivilTime.dayKey(t,pref.zone);
const nextDay=e=>dayKey(Date.parse(e.at))!==dayKey(Date.parse(data.start));
function markerTime(e){
 const suffix=({uk:'завтра',en:'tomorrow',es:'mañana',fr:'demain'})[lang];
 return fmt(e.at)+(nextDay(e)?' '+suffix:'');
}
function markerGroups(events,x){
 const groups=[];
 for(let i=events.length-1;i>=0;i--){
  const item={e:events[i],i};
  const group=groups.at(-1);
  // Work from the end so a later primary event keeps its true position.
  if(group&&x(group.main.e.position)-x(item.e.position)<MARKER_GAP){
   group.items.unshift(item);
   if(KIND_RANK.indexOf(item.e.kind)<=KIND_RANK.indexOf(group.main.e.kind))group.main=item;
  }else groups.push({main:item,items:[item]});
 }
 return groups.reverse();
}
function markers(){renderStory();const bar=q('[data-track]'),axis=q('[data-axis]');
 const focus=bar.contains(document.activeElement)?document.activeElement.dataset.index:null;
 const dialogOrigin=bar.contains(returnFocus)?returnFocus.dataset.index:null;
 bar.replaceChildren();axis.replaceChildren();bar.style.background='';if(data?.status!=='available'){const l=q('[data-marker-legend]');if(l)l.hidden=true;return;}
 const width=bar.clientWidth;if(width<MARKER_GAP)return;
 const a=Date.parse(data.start),b=Date.parse(data.end),x=p=>MARKER_INSET+(width-2*MARKER_INSET)*p;
 if(sunset){const pct=x((sunset-a)/(b-a))/width*100;bar.style.background=`linear-gradient(90deg,var(--dl-day) ${pct}%,var(--dl-night) ${pct}%)`;}
 function tick(t,label,align){const s=create('span',align,`${label} ${fmt(t)}`);s.style.left=x((t-a)/(b-a))+'px';s.title=stamp(t);axis.append(s);}
 tick(a,'↑ '+w(31),'start');tick(b,'↑ '+w(33),'end');if(sunset&&width>270)tick(sunset,'↓ '+w(32),'middle');
 bar.setAttribute('aria-label',w(31)+' '+stamp(a)+(sunset?' · '+w(32)+' '+stamp(sunset):'')+' · '+w(33)+' '+stamp(b));
 let legend=q('[data-marker-legend]');if(!legend){legend=create('div','sr-dl-muted');legend.dataset.markerLegend='';axis.after(legend);}const crossesMidnight=data.events.some(e=>window.NRCivilTime?.dayKey(Date.parse(e.at),pref.zone)!==window.NRCivilTime?.dayKey(a,pref.zone));
 const legendKey=lang+'|'+crossesMidnight;
 if(legend.dataset.key!==legendKey){
 const wasOpen=legend.querySelector('details')?.open===true;
 const hadFocus=legend.contains(document.activeElement);
 legend.replaceChildren();legend.dataset.key=legendKey;
 const L=plainSet().legend;const d=create('details','sr-dl-legend');d.append(create('summary','',L[0]));const ul=create('ul');for(const x of L.slice(1,5))ul.append(create('li','',x));d.append(ul,create('p','sr-dl-muted',L[5]));legend.append(d,create('span','',labelSet().mark+(crossesMidnight?' '+({uk:'«завтра» — після півночі.',en:'“Tomorrow” means after midnight.',es:'«Mañana» significa después de medianoche.',fr:'« Demain » indique un moment après minuit.'}[window.NRLocale?.language]||'«завтра» — після півночі.'):'')));d.open=wasOpen;if(hadFocus)d.querySelector('summary').focus({preventScroll:true});}legend.hidden=!data.events.length;
 const now=Date.now();if(now>=a&&now<b){const n=create('i','sr-dl-now');n.style.left=x((now-a)/(b-a))+'px';n.setAttribute('aria-label',w(4)+' '+fmt(now));n.append(create('span','',w(4)));bar.append(n);}
 const cursor=create('i','sr-dl-preview-cursor');cursor.setAttribute('aria-hidden','true');bar.append(cursor);
 for(const {main,items} of markerGroups(data.events,x)){
  const e=main.e;
  const b=button('',()=>explainGroup(items,main,b));
  b.className='sr-dl-marker';
  const clock=create('time','sr-dl-marker-time',markerTime(e));
  clock.dateTime=e.at;
  b.append(clock,create('span','sr-dl-marker-kind',shortKind(e.kind)),create('strong','sr-dl-marker-name',name(e.kind,e.to)));
  const arrow=create('span','sr-dl-marker-arrow','›');
  arrow.setAttribute('aria-hidden','true');
  b.append(arrow);
  b.dataset.index=main.i;
  b.dataset.eventCount=String(items.length);
  b.dataset.eventTimes=items.map(item=>Date.parse(item.e.at)).join(',');
  b.style.left=x(e.position)+'px';
  b.setAttribute('aria-label',markerTime(e)+' · '+shortKind(e.kind)+' · '+name(e.kind,e.to)+' · '+groupCopy().title);
  b.setAttribute('aria-haspopup','dialog');
  bar.append(b);
  if(focus!=null&&items.some(item=>String(item.i)===focus))b.focus({preventScroll:true});
  if(dialogOrigin!=null&&items.some(item=>String(item.i)===dialogOrigin))returnFocus=b;
 }
 updateTrack(at());
}
function headline(){renderCivil();if(data?.status!=='available'){renderStory();q('[data-transition-mean]')?.remove();q('[data-headline]').textContent=tr('tlNoInterval');q('[data-transition-name]').textContent='';q('[data-explain]').disabled=true;q('[data-now]').disabled=true;return;}
 const a=Date.parse(data.start),b=Date.parse(data.end),now=Date.now(),inDay=now>=a&&now<b;
 q('[data-kicker]').textContent=labelSet().next;
 const ix=data.events.findIndex(e=>Date.parse(e.at)>(inDay?now:a-1));currentEvent=ix;
  const event=data.events[ix];
 q('[data-headline]').textContent=event?markerTime(event)+' · '+labelSet().kinds[event.kind]:w(7);
 q('[data-transition-name]').textContent=event?name(event.kind,event.from)+' → '+name(event.kind,event.to):'';
 const meaning=q('[data-transition-mean]')||create('p','sr-dl-trans-mean');
 meaning.dataset.transitionMean='';
 if(!meaning.isConnected)q('[data-transition-name]').after(meaning);
 meaning.textContent=event?(plainMeaning(event.kind,event.to)||(event.kind==='karana'
  ?(lang==='uk'?'Карана — половина місячного дня.':'A karana is half a lunar day.')
  :(lang==='uk'?'Йога — окремий календарний показник.':'Yoga is a separate calendar measure.'))):'';
 q('[data-explain]').disabled=!event;
 q('[data-now]').disabled=!inDay;q('[data-now]').title=inDay?w(5):w(30);
}
function openDialog(title,origin=document.activeElement){mountDialog();const wasOpen=dialog.open;if(!wasOpen)returnFocus=origin;dialog.replaceChildren();const h=create('h2','',title);h.id='sr-dl-dialog-title';dialog.append(button(w(14),()=>dialog.close()),h);if(!wasOpen)dialog.showModal();return dialog;}
const GROUP_COPY={
 uk:{title:'Переходи на позначці',primary:'Головний перехід',back:'← До всіх переходів',detail:'Деталі',meaning:{
  tithi:'Починається новий місячний день.',nakshatra:'Місяць переходить до наступної з 27 ділянок свого шляху.',
  yoga:'Змінюється один із 27 станів, розрахованих за положеннями Сонця й Місяця.',karana:'Починається наступна половина місячного дня.'}},
 en:{title:'Transitions at this marker',primary:'Main transition',back:'← All transitions',detail:'Details',meaning:{
  tithi:'A new lunar day begins.',nakshatra:'The Moon enters the next of 27 sectors along its path.',
  yoga:'One of 27 states calculated from the positions of the Sun and Moon changes.',karana:'The next half of a lunar day begins.'}},
 es:{title:'Transiciones de esta marca',primary:'Transición principal',back:'← Todas las transiciones',detail:'Detalles',meaning:{
  tithi:'Comienza un nuevo día lunar.',nakshatra:'La Luna pasa al siguiente de los 27 sectores de su recorrido.',
  yoga:'Cambia uno de los 27 estados calculados a partir de las posiciones del Sol y la Luna.',karana:'Comienza la siguiente mitad del día lunar.'}},
 fr:{title:'Transitions de ce repère',primary:'Transition principale',back:'← Toutes les transitions',detail:'Détails',meaning:{
  tithi:'Un nouveau jour lunaire commence.',nakshatra:'La Lune entre dans le secteur suivant parmi les 27 de son parcours.',
  yoga:'Un des 27 états calculés à partir des positions du Soleil et de la Lune change.',karana:'La moitié suivante du jour lunaire commence.'}}
};
const groupCopy=()=>GROUP_COPY[lang]||GROUP_COPY.uk;
function explainGroup(items,main,origin){
 const copy=groupCopy(),d=openDialog(copy.title,origin);
 const list=create('ol','sr-dl-group');
 for(const item of items){
  const {e,i}=item,entry=create('li','sr-dl-group-item');
  const head=create('div','sr-dl-group-head'),timeBlock=create('div');
  if(i===main.i){
   entry.dataset.primary='';
   timeBlock.append(create('small','sr-dl-group-primary',copy.primary));
  }
  const when=create('time','',stamp(e.at));
  when.dateTime=e.at;
  timeBlock.append(when);
  const details=button(copy.detail,()=>explain(i,()=>explainGroup(items,main)));
  details.setAttribute('aria-label',copy.detail+' · '+shortKind(e.kind)+' · '+stamp(e.at));
  head.append(timeBlock,details);
  entry.append(head,create('h3','',shortKind(e.kind)),create('p','sr-dl-group-change',name(e.kind,e.from)+' → '+name(e.kind,e.to)));
  entry.append(create('p','sr-dl-group-meaning',copy.meaning[e.kind]));
  list.append(entry);
 }
 d.append(list);
 d.scrollTop=0;
 d.querySelector('button').focus({preventScroll:true});
}
function explain(i,back){const e=data?.events[i];if(!e)return;const d=openDialog(eventText(e));
 d.scrollTop=0;
 if(back)d.append(button(groupCopy().back,back));
 d.append(button(timeCopy().view,()=>{
  selectPreview(Date.parse(e.at));
  shareClock();
  const summary=q('[data-moment]'),explore=summary.closest('details');
  if(explore)explore.open=true;
  returnFocus=summary;dialog.close();
  summary.scrollIntoView({block:'center',behavior:'instant'});
 }));
 const facts=create('section','sr-dl-fact');facts.append(create('h3','',w(8)),create('p','',(defs[lang]||defs.uk)[e.kind]),create('h3','',w(9)),create('p','',tr('pa.conv')));
 const shared=data?.engine==='lunar_core_v1',link=create('a','',w(11)+(shared?' · SkyRhythmLunar.at (astronomy-engine, TT = UTC + 69.184 s)':' · MeeusCore.panchangaAt'));link.href=shared?'lunar_core_v1.js':'meeus_core_v1.js';link.target='_blank';link.rel='noopener';facts.append(link);d.append(facts);
 const tradition=create('section','sr-dl-symbol');tradition.append(create('h3','',w(10)),create('p','',w(41)),create('p','',tr('pr.p2')));d.append(tradition);
 const nav=create('nav','sr-dl-actions');const prev=button('← '+w(12),()=>explain(i-1,back)),next=button(w(13)+' →',()=>explain(i+1,back));prev.disabled=i===0;next.disabled=i===data.events.length-1;nav.append(prev,next);d.append(nav,button(w(34),()=>downloadEvent(e)),create('p','sr-dl-muted',w(35)));d.querySelector('button').focus();
}
function downloadEvent(e){const date=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');const esc=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SkyRhythm//Computed event//EN','BEGIN:VEVENT','UID:'+e.kind+'-'+Date.parse(e.at)+'@skyrhythm.local','DTSTAMP:'+date(Date.now()),'DTSTART:'+date(e.at),'DURATION:PT1M','SUMMARY:'+esc(eventText(e)),'DESCRIPTION:'+esc(pref.zone+' · MeeusCore / DayLine · physical_uncertainty_ms=null. '+w(19)),'END:VEVENT','END:VCALENDAR'];
 // Fold UTF-8 safely at 70 octets, keeping code points intact.
 const fold=s=>{let out='',part='',n=0;for(const c of s){const b=new TextEncoder().encode(c).length;if(n+b>70){out+=part+'\r\n ';part='';n=1;}part+=c;n+=b;}return out+part;};
 const url=URL.createObjectURL(new Blob([lines.map(fold).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}));const a=create('a');a.href=url;a.download='SkyRhythm-'+lastDate+'-'+e.kind+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function shareText(){const s=window.NRConsumerOverview?.snapshot(scoreDate),v=s?.display,score=v?.available?String(v.score):w(36),source=v?.available?(v.authority==='expert_pdf'?w(37):w(38)):w(36);
 return ['SkyRhythm · '+lastDate,(pref.city==='custom'?w(23):place())+' · '+pref.zone,`${tr('scoreFor')}: ${score} · ${source}`,pref.zone!=='Europe/Kyiv'||pref.lat!==50.454||pref.lon!==30.524?w(18):'',...(data?.events||[]).slice(0,3).map(eventText),'MeeusCore / DayLine · physical_uncertainty_ms=null',w(19)].filter(Boolean).join('\n');}
function share(){const d=openDialog(w(2)),text=shareText(),area=create('textarea');area.value=text;area.readOnly=true;area.rows=10;area.setAttribute('aria-label',w(2));const status=create('p');status.setAttribute('role','status');d.append(area,button(w(15),async()=>{try{await navigator.clipboard.writeText(text);status.textContent=w(16);}catch(_){area.focus();area.select();status.textContent=w(17);}}),status);
 if(navigator.share)d.append(button(w(2),async()=>{try{await navigator.share({title:'SkyRhythm',text});}catch(e){if(e.name!=='AbortError'){area.focus();area.select();status.textContent=w(17);}}}));}
function savePreferences(next){try{const old=localStorage.getItem(KEY);if(old!==null){localStorage.setItem(KEY+'.before',old);if(localStorage.getItem(KEY+'.before')!==old)throw Error('BACKUP');}const serialized=JSON.stringify(next);localStorage.setItem(KEY,serialized);if(localStorage.getItem(KEY)!==serialized)throw Error('SAVE');return true;}catch(_){return false;}}
// The same place picker serves the Day line and the live sky.
const PLACE_COPY={
 uk:['Місце','Пошук міста','Наприклад, Ізюм','Моє місце','Визначаємо місце…','Не вдалося визначити місце. Оберіть місто або введіть координати.','Координати округлюються до сотих градуса й лишаються на пристрої.','Введіть координати вручну','Оформлення','Ілюстрації на «Лінії дня». Зміна не впливає на розрахунки.','У списку немає такого міста. Можна ввести координати вручну.','Обране місце','Зберегти місце','Зберегти оформлення'],
 en:['Place','Search cities','For example, Izium','My location','Getting your location…','Could not get your location. Choose a city or enter coordinates.','Coordinates are rounded to hundredths of a degree and stay on this device.','Enter coordinates manually','Appearance','Pictures on the Day line. This setting does not change calculations.','No matching city in the list. You can enter coordinates manually.','Selected place','Save place','Save appearance'],
 es:['Lugar','Buscar ciudad','Por ejemplo, Izium','Mi ubicación','Buscando ubicación…','No se pudo obtener la ubicación. Elige una ciudad o introduce coordenadas.','Las coordenadas se redondean a centésimas de grado y se quedan en este dispositivo.','Introducir coordenadas','Aspecto','Ilustraciones de la Línea del día. Este ajuste no cambia los cálculos.','No hay coincidencias. Puedes introducir las coordenadas.','Lugar elegido','Guardar lugar','Guardar aspecto'],
 fr:['Lieu','Rechercher une ville','Par exemple, Izioum','Ma position','Recherche de la position…','Position indisponible. Choisissez une ville ou saisissez les coordonnées.','Les coordonnées sont arrondies au centième de degré et restent sur cet appareil.','Saisir les coordonnées','Apparence','Illustrations de la Ligne du jour. Ce réglage ne modifie pas les calculs.','Aucune ville correspondante. Vous pouvez saisir les coordonnées.','Lieu choisi','Enregistrer le lieu','Enregistrer l’apparence']
};
const DIRECTORY_OFFLINE={
 uk:'Поза мережею світовий довідник ще не завантажено. Оберіть місто зі швидкого списку або введіть координати.',
 en:'The world directory has not been downloaded for offline use. Choose a preset or enter coordinates.',
 es:'El directorio mundial aún no está descargado para usarlo sin conexión. Elija un lugar de la lista o introduzca coordenadas.',
 fr:'Le répertoire mondial n’a pas encore été téléchargé pour un usage hors connexion. Choisissez un lieu proposé ou saisissez les coordonnées.'
};
const DIRECTORY_COPY={
 uk:['Шукаємо в довіднику міст…','Довідник міст недоступний. Спробуйте з’єднання або введіть координати.','Від 3 літер — пошук у світовому довіднику','Дані міст:'],
 en:['Searching the city directory…','The city directory is unavailable. Try reconnecting or enter coordinates.','Search the world directory from 3 letters','City data:'],
 es:['Buscando en el directorio de ciudades…','El directorio no está disponible. Revisa la conexión o introduce las coordenadas.','Desde 3 letras, busca en el directorio mundial','Datos de ciudades:'],
 fr:['Recherche dans le répertoire des villes…','Le répertoire est indisponible. Vérifiez la connexion ou saisissez les coordonnées.','Dès 3 lettres, recherche dans le répertoire mondial','Données des villes :']
};
const searchCity=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ø/g,'o').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let directoryPromise;
function cityDirectory(){
 if(!directoryPromise)directoryPromise=(async()=>{
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),45000);
  try{
   const r=await fetch('city_directory_v1.json.gz?v=fp569q-audit',{signal:ctl.signal});
   if(!r.ok||!r.body)throw new Error('CITY_DIRECTORY');
   const bytes=await r.arrayBuffer(),head=new Uint8Array(bytes,0,2);
   const stream=new Blob([bytes]).stream();
   const data=await new Response(head[0]===31&&head[1]===139?stream.pipeThrough(new DecompressionStream('gzip')):stream).json();
   if(!Array.isArray(data.cities))throw new Error('CITY_DIRECTORY_FORMAT');
   return data.cities.map(([id,label,country,region,lat,lon,zone,aliases])=>({cityId:'gn:'+id,label,country,region,lat,lon,zone,area:searchCity(region+' '+country),keys:[label,...aliases].map(searchCity)}));
  }finally{clearTimeout(timeout);}
 })().catch(e=>{directoryPromise=null;throw e;});
 return directoryPromise;
}
function setArt(style){
 if(!['engraving','gouache','none'].includes(style))return false;
 // Store only the appearance and any pre-existing legacy place, never a copy of the shared place.
 let old={};try{old=JSON.parse(localStorage.getItem(KEY))||{};}catch(_){}
 if(!savePreferences({...old,style}))return false;
 pref={...pref,style};if(node)moment();return true;
}
function settings(origin){
 lang=window.NRLocale?.language||'uk';syncPlace();
 const [title,searchLabel,placeholder,myPlace,geoBusy,geoFail,privacy,coordinatesLabel,artLabel,artHint,noMatch,selected,savePlace,saveArt]=PLACE_COPY[lang]||PLACE_COPY.uk;
 const [loading,unavailable,lookupHint,creditLabel]=DIRECTORY_COPY[lang]||DIRECTORY_COPY.uk,d=openDialog(title,origin);
 const primary=create('div','sr-dl-place-primary'),label=create('label','',searchLabel),search=create('input'),results=create('ul','sr-dl-city-results');
 search.type='search';search.placeholder=placeholder;search.autocomplete='off';search.spellcheck=false;label.append(search);
 const status=create('p','sr-dl-place-status');status.setAttribute('role','status');
 const current=create('p','sr-dl-place-current');current.append(create('span','',selected),create('strong','',place()));
 const options=window.SRSkyTime?.cityPresets?.()||Object.entries(cities).map(([cityId,[lat,lon,zone]])=>({cityId,label:tr('city.'+cityId),lat,lon,zone}));
 let locating=false;
 function select(next,out=status){
  if(next.zone==='Europe/Kiev')next={...next,zone:'Europe/Kyiv'};
  if(!validPlace(next)){out.textContent=w(29);return;}
  const {cityId,lat,lon,zone}=next,changed=cityId!==pref.city||lat!==pref.lat||lon!==pref.lon||zone!==pref.zone;
  const identity=cityId.startsWith('gn:')?{label:next.label,country:next.country}:{};
  if(changed||!window.NRLocalContext?.current?.()){
   if(!window.NRLocalContext?.choose?.({cityId,lat,lon,zone,...identity})){out.textContent=w(28);return;}
   if(changed)window.dispatchEvent(new Event('sr:place-changed'));
  }
  d.close();
 }
 const geo=button(myPlace,()=>{
  if(locating)return;
  if(!navigator.geolocation){status.textContent=geoFail;return;}
  locating=true;geo.setAttribute('aria-busy','true');status.textContent=geoBusy;
  const end=()=>{locating=false;geo.removeAttribute('aria-busy');return d.open&&d.contains(geo);};
  try{navigator.geolocation.getCurrentPosition(pos=>{
   if(!end())return;
   select({cityId:'device',lat:Math.round(pos.coords.latitude*100)/100,lon:Math.round(pos.coords.longitude*100)/100,zone:Intl.DateTimeFormat().resolvedOptions().timeZone});
  },()=>{if(end())status.textContent=geoFail;},{maximumAge:6e5,timeout:15000,enableHighAccuracy:false});}
  catch(_){if(end())status.textContent=geoFail;}
 });geo.className='sr-dl-geo';
 const hint=create('p','sr-dl-muted sr-dl-city-hint');hint.setAttribute('role','status');
 const credit=create('p','sr-dl-muted sr-dl-city-credit',creditLabel+' '),creditLink=create('a','','GeoNames (CC BY 4.0)');
 creditLink.href='https://www.geonames.org/export/';creditLink.target='_blank';creditLink.rel='noopener noreferrer';credit.append(creditLink);
 let lookup=0,lookupTimer,visible=[];
 const shortcuts=options.map(x=>({...x,keys:[x.label,x.cityId,...(x.aliases||[])].map(searchCity)}));
 const countryNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([lang],{type:'region'}):null;
 function show(list,message=''){
  visible=list;
  results.replaceChildren(...list.map(x=>{
   const li=create('li'),b=button(x.label,()=>select(x));
   if(x.country)b.append(create('small','sr-dl-city-country',[x.region,countryNames?.of(x.country)||x.country].filter(Boolean).join(' · ')));
   if(pref.city===x.cityId)b.setAttribute('aria-current','true');
   li.append(b);return li;
  }));
  hint.textContent=message;
 }
 function matches(){
  const id=++lookup;clearTimeout(lookupTimer);
  const key=searchCity(search.value),terms=key.split(' ').filter(Boolean);
  const inName=(x,t)=>x.keys.some(n=>n.includes(t));
  const match=x=>terms.every(t=>inName(x,t)||x.area?.includes(t))&&(!terms.length||terms.some(t=>inName(x,t)));
  const preset=shortcuts.filter(match);
  if(key.length<3||preset.some(x=>x.keys.includes(key))){show(preset,key.length<3?lookupHint:'');return;}
  show(preset,loading);
  lookupTimer=setTimeout(async()=>{
   try{
    const all=await cityDirectory();
    if(id!==lookup||!d.open||!d.contains(search))return;
    const exact=[],starts=[],rest=[];
    for(const x of all){
     if(!match(x)||preset.some(p=>x.zone===p.zone&&Math.abs(x.lat-p.lat)<.04&&Math.abs(x.lon-p.lon)<.04))continue;
     const bucket=x.keys.includes(key)?exact:x.keys.some(k=>k.startsWith(key))?starts:rest;
     if(bucket.length<8)bucket.push(x);
    }
    const list=[...preset,...exact,...starts,...rest].slice(0,8);
    show(list,list.length?'':noMatch);
   }catch(_){if(id===lookup&&d.open&&d.contains(search))show(preset,navigator.onLine?unavailable:DIRECTORY_OFFLINE[lang]||DIRECTORY_OFFLINE.uk);}
  },180);
 }
 search.oninput=matches;search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(visible.length===1)select(visible[0]);}};
 primary.append(label,geo);d.append(primary,current,results,hint,status,create('p','sr-dl-muted',privacy),create('p','sr-dl-muted',w(40)));matches();
 const manual=create('details','sr-dl-place-section'),f=create('form','sr-dl-place-form'),coords=create('div','sr-dl-coordinates');
 manual.append(create('summary','',coordinatesLabel),f);
 for(const [key,title] of [['lat',24],['lon',25],['zone',26]]){
  const l=create('label','',w(title)),input=create('input');input.name=key;input.value=pref[key];input.required=true;
  input.autocomplete='off';if(key!=='zone')input.inputMode='decimal';
  l.append(input);coords.append(l);
 }
 const msg=create('p','sr-dl-place-status');msg.setAttribute('role','status');
 const save=button(savePlace);save.type='submit';f.append(coords,save,msg);
 f.onsubmit=e=>{e.preventDefault();const decimal=input=>{const x=input.value.trim().replace(',','.');return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x)?Number(x):NaN;};select({cityId:'custom',lat:decimal(f.elements.lat),lon:decimal(f.elements.lon),zone:f.elements.zone.value.trim()},msg);};
 const appearance=create('details','sr-dl-place-section sr-dl-art-settings'),art=create('form','sr-dl-place-form'),field=create('fieldset');
 appearance.append(create('summary','',artLabel),art);art.append(create('p','sr-dl-muted',artHint),field);
 field.append(create('legend','',tr('pr.style')));
 for(const style of ['engraving','gouache','none']){
  const l=create('label'),radio=create('input');radio.type='radio';radio.name='style';radio.value=style;radio.checked=pref.style===style;l.append(radio,create('span','',tr('st.'+style)));field.append(l);
 }
 const artSave=button(saveArt),artStatus=create('p','sr-dl-place-status');artSave.type='submit';artStatus.setAttribute('role','status');
 art.append(artSave,artStatus);art.onsubmit=e=>{e.preventDefault();artStatus.textContent=setArt(art.elements.style.value)?w(27):w(28);};
 d.append(manual,appearance,credit);
}
function mountDialog(){if(dialog)return;dialog=create('dialog','sr-dl-dialog');dialog.setAttribute('translate','no');dialog.setAttribute('aria-labelledby','sr-dl-dialog-title');document.body.append(dialog);dialog.addEventListener('close',()=>!dialog.open&&returnFocus?.isConnected&&returnFocus.focus({preventScroll:true}));
 document.addEventListener('keydown',e=>{if(dialog.open&&e.key==='Escape'){e.preventDefault();dialog.close();}},true);
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea,summary')].filter(x=>x.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
}
function mount(root){if(node)return;rootNode=root;node=create('section','sr-dayline');node.setAttribute('translate','no');node.innerHTML='<div class="sr-dl-head"><h2></h2><button type="button" data-settings></button></div><p data-place class="sr-dl-muted"></p><div class="sr-dl-story"><small data-kicker></small><p data-headline></p><p data-transition-name class="sr-dl-muted"></p><button type="button" data-explain></button></div><p data-status role="status"></p><div data-track></div><div data-axis></div><div class="sr-dl-actions"><button type="button" data-now></button><button type="button" data-share></button></div><label><span data-scrub-label></span><input type="range" min="0" max="999" value="0"></label><p data-moment tabindex="-1"></p><figure hidden><img width="720" height="480" decoding="async" loading="lazy" alt=""><figcaption><small></small><strong></strong><span></span></figcaption></figure><details data-events><summary></summary><ol></ol></details><details data-method><summary></summary><p data-artnote></p><p data-source></p><p data-convention></p></details><p data-scope class="sr-dl-muted"></p>';

 const civilSummary=create('section','sr-dl-civil');civilSummary.dataset.dlCivil='';civilSummary.hidden=true;
 civilSummary.innerHTML='<h3 data-dl-civil-mode></h3><dl><div><dt data-dl-tithi-label></dt><dd data-dl-current-tithi></dd></div><div><dt data-dl-nak-label></dt><dd data-dl-current-nak></dd></div></dl><button type="button" data-dl-next aria-haspopup="dialog"><span data-dl-next-time></span><strong data-dl-next-label></strong><span aria-hidden="true">›</span></button><p data-dl-no-next hidden></p>';
 const periods=create('details','sr-dl-periods');periods.dataset.dlPeriods='';periods.hidden=true;
 periods.innerHTML='<summary></summary><p data-dl-period-note></p><p data-dl-personal-note></p><ol data-dl-period-list></ol>';
 periods.addEventListener('toggle',renderCivil);
 const loadStatus=create('p','sr-dl-muted');loadStatus.dataset.dlLoad='';loadStatus.setAttribute('role','status');
 const precise=create('details','sr-dl-technical');precise.dataset.dlTechnical='';
 precise.append(create('summary'),q('[data-status]'),q('[data-track]'),q('[data-axis]'),q('.sr-dl-story'));
 q('[data-place]').after(loadStatus,civilSummary,periods,precise);
 root.querySelector('select').parentElement.id='srDayDate'; {/* DES-10: deterministic first-screen order; an inactive NOAA brief re-asserts its place right after the hero on every render. */const hero=root.querySelector('.nr-o-hero'),next=hero.nextElementSibling;(next&&next.matches('[data-weather-brief]:not([data-active="true"])')?next:hero).after(node);}window.SRTransitionClient?.mount(node,()=>({...pref}));mountDialog();
 q('[data-settings]').onclick=()=>settings(q('[data-settings]'));q('[data-explain]').onclick=()=>explain(currentEvent);q('[data-share]').onclick=share;q('[data-now]').onclick=()=>{followNow=true;previewAt=null;if(!syncing)try{window.SRSkyTime?.live?.()}catch(_){}minute=nowMinute();q('input[type=range]').value=minute;moment();};
 q('input[type=range]').oninput=e=>{followNow=false;previewAt=null;minute=Number(e.target.value);moment();shareClock();};q('img').onerror=e=>{failed.add(e.target.dataset.art);q('figure:not([data-solar-profile])').hidden=true;};new ResizeObserver(markers).observe(q('[data-track]'));
 const closeDay=create('div','sr-dl-close-day');closeDay.setAttribute('translate','no');closeDay.append(create('p','',w(39)),button(w(20),()=>window.NRConsumerOverview.openOutcome()));root.append(closeDay);
}
function syncPlace(){
 const saved=window.NRLocalContext?.current?.();
 if(saved){const {cityId,label,lat,lon,zone}=saved;pref={...pref,city:cityId||'custom',cityLabel:label,lat,lon,zone};sharedPlaceUsed=true;}
 else if(sharedPlaceUsed){const [lat,lon,zone]=cities.kyiv;pref={...pref,city:'kyiv',cityLabel:undefined,lat,lon,zone};sharedPlaceUsed=false;}
}
async function render(root,date){if(root.dataset.overview!=='today'||!window.MeeusCore||!window.SkyRhythmDayLine||!window.Astronomy||!window.SRDayLineAsync)return;const sequence=++renderSequence;lang=window.NRLocale?.language||'uk';mount(root);
 scoreDate=date;
 syncPlace();
 if(date===NRCivilTime.dayKey(Date.now(),'Europe/Kyiv'))date=NRCivilTime.dayKey(Date.now(),pref.zone);
 q('h2').textContent=tr('tlTitle');q('[data-dl-technical] > summary').textContent=civilCopy(12);q('[data-settings]').textContent=labelSet().place;q('[data-kicker]').textContent=labelSet().next;q('[data-explain]').textContent=labelSet().about+' →';q('[data-share]').textContent=w(2);q('[data-now]').textContent=w(5);q('[data-place]').textContent=place()+' · '+({uk:'місцевий час',en:'local time',es:'hora local',fr:'heure locale'}[lang]);q('[data-scope]').textContent=w(40);
 q('figure:not([data-solar-profile]) figcaption small').textContent=tr('artAlt');q('[data-scrub-label]').textContent=tr('tlMoment');q('[data-events] summary').textContent=tr('tlEvents');q('[data-method] summary').textContent=tr('pr.h1');
 q('[data-artnote]').textContent=tr('pr.p1');q('[data-source]').textContent=tr('pr.p2');q('[data-convention]').textContent=tr('pa.conv');root.querySelector('.sr-dl-close-day p').textContent=w(39);root.querySelector('.sr-dl-close-day button').textContent=w(20);
 try{const key=[date,pref.lat,pref.lon,pref.zone].join('|');if(!cache.has(key)){
  data=null;followNow=true;previewAt=null;lastDate=date;q('[data-solar-profile]')?.setAttribute('hidden','');notify();q('[data-status]').textContent=({uk:'Обчислюємо лінію дня…',en:'Calculating the day line…',es:'Calculando la línea del día…',fr:'Calcul de la ligne du jour…'})[lang]||'Calculating…';
  q('input[type=range]').disabled=true;q('[data-share]').disabled=true;q('figure:not([data-solar-profile])').hidden=true;q('[data-events] ol').replaceChildren();q('[data-track]').replaceChildren();q('[data-axis]').replaceChildren();q('[data-moment]').textContent='';headline();q('[data-headline]').textContent=q('[data-status]').textContent;
  node.dataset.dlState='loading';renderCivil();
  const computed=await SRDayLineAsync.build({date,lat:pref.lat,lon:pref.lon,zone:pref.zone,includeCivil:true});if(sequence!==renderSequence)return;
  cache.set(key,computed);if(cache.size>32)cache.delete(cache.keys().next().value);
 }if(sequence!==renderSequence)return;data=cache.get(key);sunset=null;node.dataset.dlState=data.civil?.status==='available'?'ready':'unavailable';q('[data-share]').disabled=false;
  if(data.status==='available'){try{const t=Astronomy.SearchRiseSet('Sun',new Astronomy.Observer(pref.lat,pref.lon,0),-1,new Date(data.start),1)?.date;sunset=t&&+t>Date.parse(data.start)&&+t<Date.parse(data.end)?+t:null;}catch(_){} }
  if(lastDate!==date){followNow=true;previewAt=null;minute=data.status==='available'?nowMinute():0;lastDate=date;}
  if(followNow&&data.status==='available')minute=nowMinute();q('input[type=range]').value=minute;q('input[type=range]').disabled=data.status!=='available';q('[data-status]').textContent=data.status==='available'?tr('tlInterval').replace('{a}',stamp(data.start)).replace('{b}',stamp(data.end)):tr('tlNoInterval');
  q('[data-events] ol').replaceChildren();for(const [i,e]of data.events.entries()){const li=create('li');li.dataset.event=i;li.append(button(eventText(e),()=>explain(i)));q('[data-events] ol').append(li);}headline();moment();markers();renderSolar();notify();
  const link=new URL(location.href);if(link.searchParams.get('dlDate')===date){const n=data.events.findIndex(e=>e.at===link.searchParams.get('dlAt')&&e.kind===link.searchParams.get('dlKind'));if(n>=0&&link.searchParams.get('dlEvent')){explain(n);for(const k of ['dlDate','dlAt','dlKind','dlEvent'])link.searchParams.delete(k);history.replaceState(null,'',link);}}
 }catch(e){if(sequence!==renderSequence)return;data=null;node.dataset.dlState='unavailable';q('[data-solar-profile]')?.setAttribute('hidden','');notify();q('[data-status]').textContent=tr('tlCalcError')+e.message;q('figure:not([data-solar-profile])').hidden=true;q('input[type=range]').disabled=true;q('[data-events] ol').replaceChildren();q('[data-track]').replaceChildren();q('[data-axis]').replaceChildren();q('[data-moment]').textContent='';headline();}
}
document.addEventListener('nr:location',()=>{
 if(rootNode)render(rootNode,rootNode.querySelector('select').value);
});
// Detached presentation snapshot; no consumer score or normative rule is inferred here.
function snapshot(){
 const base={date:lastDate,status:data?.status||'unavailable',zone:pref.zone,physical_uncertainty_ms:null,events:[]};
 if(data?.status!=='available')return base;
 const events=[{at:data.start,label:w(31),kind:'sunrise'},...(sunset?[{at:new Date(sunset).toISOString(),label:w(32),kind:'sunset'}]:[]),{at:data.end,label:w(33),kind:'sunrise'},...data.events.map((e,index)=>({at:e.at,label:tr('kind.'+e.kind)+': '+name(e.kind,e.from)+' → '+name(e.kind,e.to),kind:e.kind,index}))].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return {...base,date:data.date,start:data.start,end:data.end,initial:{...data.initial},initialLabel:tr('kind.tithi')+': '+name('tithi',data.initial.tithi),events};
}
// Geometric solar altitude, not a score or a prediction of human activity.
function solarProfile(){
 if(data?.status!=='available')return [];
 const start=Date.parse(data.start),end=Date.parse(data.end),observer=new Astronomy.Observer(pref.lat,pref.lon,0);
 return Array.from({length:97},(_,i)=>{const at=start+(end-start)*i/96,t=new Date(at),eq=Astronomy.Equator('Sun',t,observer,true,true),alt=Astronomy.Horizon(t,observer,eq.ra,eq.dec,null).altitude;return {at:new Date(at).toISOString(),altitude:alt};});
}
function renderSolar(){
 let fig=q('[data-solar-profile]');if(!fig){fig=create('figure','sr-solar-profile');fig.dataset.solarProfile='';q('[data-events] ol').before(fig);}
 fig.replaceChildren();fig.hidden=true;
 if(data?.status!=='available')return;
 try{const samples=solarProfile();if(samples.some(x=>!Number.isFinite(x.altitude)))return;
 const labels={uk:['Шлях Сонця','Висота Сонця над горизонтом від сходу до наступного сходу. Пунктир показує шлях Сонця під горизонтом.','горизонт','Схід','Полудень','Захід','Схід'],en:['Sun path','Height of the Sun above the horizon from sunrise to the next sunrise. The dashed line traces the Sun below the horizon.','horizon','Sunrise','Noon','Sunset','Sunrise'],es:['Trayectoria solar','Altura del Sol sobre el horizonte desde el amanecer hasta el siguiente. La línea discontinua indica el recorrido del Sol bajo el horizonte.','horizonte','Amanecer','Mediodía','Ocaso','Amanecer'],fr:['Trajectoire solaire','Hauteur du Soleil au-dessus de l’horizon, d’un lever au lever suivant. Le pointillé indique la trajectoire du Soleil sous l’horizon.','horizon','Lever','Midi','Coucher','Lever']}[lang];
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');fig.hidden=false;const available=fig.clientWidth-parseFloat(getComputedStyle(fig).paddingLeft||0)-parseFloat(getComputedStyle(fig).paddingRight||0),compact=available>0&&available<520,W=compact?available:600,H=compact?160:120,left=32,span=compact?W-52:536,base=compact?70:52,scale=compact?.65:.42;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);Object.assign(svg.dataset,{left,span,base,scale});if(compact){svg.style.setProperty('height','160px','important');svg.style.setProperty('max-height','none','important');}svg.setAttribute('role','img');svg.setAttribute('aria-label',labels[1]);
 const add=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
 const x=i=>left+span*i/96,y=a=>base-a*scale;
 add('rect',{x:left,y:y(0),width:span,height:Math.max(0,H-y(0)-36),fill:'#0b1430',opacity:'.55','data-night':''});add('line',{x1:left,x2:left+span,y1:y(0),y2:y(0),stroke:'#a8bbd7',opacity:'.8','stroke-width':1.2,'data-horizon-line':''});add('text',{x:left+span,y:y(0)-5,fill:'#a8bbd7','text-anchor':'end','font-size':11},labels[2]);
 const pathD=samples.map((v,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(v.altitude).toFixed(2)).join(' '),clipId='srSolarDay'+Math.random().toString(36).slice(2,8);const defs=add('defs',{});const cp=document.createElementNS(svg.namespaceURI,'clipPath');cp.id=clipId;const cr=document.createElementNS(svg.namespaceURI,'rect');for(const[k,v]of Object.entries({x:0,y:0,width:W,height:y(0)}))cr.setAttribute(k,v);cp.append(cr);defs.append(cp);add('path',{d:pathD,fill:'none',stroke:'#7f8fbf','stroke-width':1.6,'stroke-dasharray':'4 4',opacity:'.8','data-night-path':''});add('path',{d:pathD,fill:'none',stroke:'#f3ce78','stroke-width':3,'clip-path':`url(#${clipId})`,'data-day-path':''});
 const observer=new Astronomy.Observer(pref.lat,pref.lon,0),transit=Astronomy.SearchHourAngle('Sun',observer,0,new Date(data.start),1)?.time?.date;
 const culmination=transit&&+transit>=Date.parse(data.start)&&+transit<Date.parse(data.end)?transit:null;
 const eventTick=(at,kind)=>{const f=(Date.parse(at)-Date.parse(data.start))/(Date.parse(data.end)-Date.parse(data.start))*96,eq=Astronomy.Equator('Sun',new Date(at),observer,true,true),alt=Astronomy.Horizon(new Date(at),observer,eq.ra,eq.dec,null).altitude,cx=x(f),cy=y(alt);
 const g=add('g',{'data-solar-event':kind,'data-at':at,'aria-hidden':'true'});g.append(add('line',{x1:cx,x2:cx,y1:cy-5,y2:cy+5,stroke:'#d6e2f5','stroke-width':1.5}));
 };
 eventTick(data.start,'sunrise');if(sunset)eventTick(new Date(sunset).toISOString(),'sunset');eventTick(data.end,'next-sunrise');if(culmination){eventTick(culmination.toISOString(),'culmination');const f=(+culmination-Date.parse(data.start))/(Date.parse(data.end)-Date.parse(data.start))*96;const peq=Astronomy.Equator('Sun',culmination,observer,true,true),palt=Astronomy.Horizon(culmination,observer,peq.ra,peq.dec,null).altitude;add('text',{x:x(f),y:Math.max(12,y(palt)-12),fill:'#ffe3a0','text-anchor':'middle','font-size':12,'data-noon-label':''},labels[4]+' '+fmt(culmination));const tip=add('title',{},({uk:'Кульмінація Сонця',en:'Solar culmination',es:'Culminación solar',fr:'Culmination solaire'}[lang])+' · '+fmt(culmination));svg.querySelector('[data-solar-event=culmination]').append(tip);}
 for(const [at,word] of [[Date.parse(data.start),labels[3]],...(sunset?[[sunset,labels[5]]]:[]),[Date.parse(data.end),labels[6]]]){const f=(at-Date.parse(data.start))/(Date.parse(data.end)-Date.parse(data.start))*96,anchor=f===0?'start':f===96?'end':'middle',tx=f===0?left:f===96?left+span:x(f);add('text',{x:tx,y:compact?136:96,fill:'#a8bbd7','text-anchor':anchor,'font-size':11},(f===96?'↑ ':f===0?'↑ ':'↓ ')+word);add('text',{x:tx,y:compact?152:112,fill:'#eef3fb','text-anchor':anchor,'font-size':13,'font-weight':600},new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{hour:'2-digit',minute:'2-digit',timeZone:pref.zone}).format(new Date(at)));}
 const caption=create('figcaption','sr-solar-caption'),heading=create('span','',labels[0]),choose=button(({uk:'Обрати час',en:'Choose time',es:'Elegir hora',fr:'Choisir l’heure'})[lang],()=>{const slider=q('input[type=range]');for(let parent=slider.parentElement;parent&&parent!==node;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;slider.focus();slider.scrollIntoView({block:'center',behavior:'instant'});});choose.dataset.solarChoose='';caption.append(heading,choose);
 svg.addEventListener('click',e=>{const matrix=svg.getScreenCTM();if(!matrix)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());followNow=false;minute=Math.round(Math.max(0,Math.min(999,(point.x-left)/span*1000)));q('input[type=range]').value=minute;moment();});
 fig.append(caption,svg,create('small','',labels[1]));fig.hidden=false;for(const text of svg.querySelectorAll('text'))if(compact)text.style.setProperty('font-size','13px','important');updateSolarMoment();if(!fig._solarObserver){let width=fig.clientWidth;fig._solarObserver=new ResizeObserver(()=>{const next=fig.clientWidth;if(next>0&&Math.abs(next-width)>1){width=next;requestAnimationFrame(()=>{if(fig.isConnected)renderSolar();});}});fig._solarObserver.observe(fig);}
 }catch(_){fig.hidden=true;}
}


function updateSolarMoment(){
 const fig=q('[data-solar-profile]'),svg=fig?.querySelector('svg');if(!svg||data?.status!=='available')return;
 let marker=svg.querySelector('[data-solar-cursor]'),label=fig.querySelector('[data-solar-moment]');
 if(!marker){marker=document.createElementNS(svg.namespaceURI,'g');marker.dataset.solarCursor='';marker.setAttribute('aria-hidden','true');marker.innerHTML='<line y1="8" y2="96" stroke="#fff2bf" stroke-dasharray="2 4" opacity=".6"/><circle r="17" fill="#ffd16c" opacity=".2"/><circle data-active-sun r="7" fill="#fff4ce" stroke="#eab84c" stroke-width="2"/>';const rays=document.createElementNS(svg.namespaceURI,'g');rays.dataset.solarRays='';for(let i=0;i<8;i++){const ray=document.createElementNS(svg.namespaceURI,'line'),a=i*Math.PI/4;for(const [k,v]of Object.entries({x1:Math.cos(a)*11,y1:Math.sin(a)*11,x2:Math.cos(a)*15,y2:Math.sin(a)*15,stroke:'#ffe2a2','stroke-width':1.5}))ray.setAttribute(k,v);rays.append(ray);}marker.append(rays);svg.append(marker);label=fig.querySelector(':scope > small')||create('small');label.title=label.textContent;label.classList.add('sr-solar-moment');label.dataset.solarMoment='';fig.append(label);}
 try{const t=at(),observer=new Astronomy.Observer(pref.lat,pref.lon,0),eq=Astronomy.Equator('Sun',new Date(t),observer,true,true),alt=Astronomy.Horizon(new Date(t),observer,eq.ra,eq.dec,null).altitude;
 if(!Number.isFinite(alt)){marker.setAttribute('hidden','');return;}
 const x=Number(svg.dataset.left)+Number(svg.dataset.span)*(t-Date.parse(data.start))/(Date.parse(data.end)-Date.parse(data.start)),y=Number(svg.dataset.base)-alt*Number(svg.dataset.scale);
 marker.removeAttribute('hidden');marker.dataset.at=new Date(t).toISOString();marker.dataset.altitude=String(alt);marker.dataset.mode=followNow&&inLiveDay()?'live':'selected';
 for(const c of marker.querySelectorAll('circle')){c.setAttribute('cx',x);c.setAttribute('cy',y);}const line=marker.querySelector(':scope > line');line.setAttribute('x1',x);line.setAttribute('x2',x);marker.querySelector('[data-solar-rays]').style.transform='translate('+x+'px,'+y+'px)';marker.dataset.horizon=alt<0?'below':'above';
 const titles={uk:['Зараз','Вибраний час'],en:['Now','Selected time'],es:['Ahora','Hora seleccionada'],fr:['Maintenant','Heure choisie']}[lang];
 const pos={uk:['Сонце над горизонтом','Сонце під горизонтом'],en:['Sun above the horizon','Sun below the horizon'],es:['Sol sobre el horizonte','Sol bajo el horizonte'],fr:['Soleil au-dessus de l’horizon','Soleil sous l’horizon']}[lang];label.textContent=titles[marker.dataset.mode==='live'?0:1]+' · '+fmt(t)+' · '+pos[alt<0?1:0]+', '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:1}).format(alt)+'°';
 }catch(_){marker.setAttribute('hidden','');if(label)label.textContent='';}
}
function tick(){if(!node||document.hidden)return;headline();markers();if(data?.status==='available'&&followNow){minute=nowMinute();q('input[type=range]').value=minute;moment();}}

function notify(){window.dispatchEvent(new Event('sr:dayline-ready'));}
// FP569k: one time per screen. «Переглянути момент» and «Шлях Сонця» share SRSkyTime: moving either moves both.
let syncing=false;
function shareClock(){if(syncing||!data||data.status!=='available'||!window.SRSkyTime?.selectMoment)return;syncing=true;try{SRSkyTime.selectMoment(new Date(at()).toISOString())}finally{syncing=false}}
window.addEventListener('sr:sky-time',e=>{const s=e.detail;if(syncing||!node||!s||data?.status!=='available')return;
 const start=Date.parse(data.start),end=Date.parse(data.end);
 if(s.mode==='now'){if(!followNow){followNow=true;previewAt=null;minute=nowMinute();q('input[type=range]').value=minute;moment();}return;}
 if(!(s.at>=start&&s.at<end))return; // another day: the panchanga-day slider keeps its own range
 syncing=true;try{selectPreview(s.at);}finally{syncing=false}});
function selectPreview(time){
 const start=Date.parse(data.start),end=Date.parse(data.end);
 if(!(time>=start&&time<end))return;
 followNow=false;previewAt=time;
 minute=Math.max(0,Math.min(999,Math.round((time-start)/(end-start)*1000)));
 q('input[type=range]').value=minute;moment();
}
window.SRDayLineView=Object.freeze({render,snapshot,solarProfile,openPlace(origin){settings(origin);},openEvent(index){if(Number.isInteger(index)&&data?.events[index])explain(index);}});
function initial(){const r=document.querySelector('[data-overview="today"]');const select=r?.querySelector('select');if(select)render(r,select.value);}
window.addEventListener('nr:natal',()=>{if(node)renderCivil();});
window.addEventListener('storage',event=>{if(node&&(!event.key||event.key.startsWith('personalData_')))renderCivil();});
window.addEventListener('load',initial);window.addEventListener('nr:locale',()=>{if(dialog?.open)dialog.close();initial();});
setInterval(tick,60000);document.addEventListener('visibilitychange',tick);initial();
})();

