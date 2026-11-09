/* Presentation only. All scores remain owned by NRConsumerAuthority.resolveFinal. */
(function(){'use strict';
const COPY=[["Прогноз Kp", "Kp forecast", "Pronóstico Kp", "Prévision Kp"], ["На початок дня", "At the start of the day", "Al inicio del día", "Au début du jour"], ["Хронологія неба", "Sky timeline", "Cronología del cielo", "Chronologie du ciel"], ["Розраховані події", "Calculated events", "Eventos calculados", "Événements calculés"], ["Календарні дані відсутні", "Calendar data unavailable", "Datos de calendario no disponibles", "Données du calendrier indisponibles"], ["Рух тла", "Background motion", "Movimiento del fondo", "Animation du fond"],["День", "Day", "Día", "Jour"], ["Тиждень", "Week", "Semana", "Semaine"], ["27 днів", "27 days", "27 días", "27 jours"], ["Попередній місяць", "Previous month", "Mes anterior", "Mois précédent"], ["Наступний місяць", "Next month", "Mes siguiente", "Mois suivant"], ["Порівняти до трьох дат", "Compare up to three dates", "Comparar hasta tres fechas", "Comparer jusqu’à trois dates"], ["Додати обрану дату", "Add selected date", "Añadir fecha elegida", "Ajouter la date choisie"], ["Прибрати", "Remove", "Quitar", "Retirer"], ["Надані складові", "Provided components", "Componentes proporcionados", "Composantes fournies"], ["Детально: джерела, розрахунок і календар", "Details: sources, calculation and calendar", "Detalles: fuentes, cálculo y calendario", "Détails : sources, calcul et calendrier"], ["Усі події, час і традиційні образи", "All events, times and traditional imagery", "Eventos, horarios e imágenes tradicionales", "Événements, horaires et images traditionnelles"], ["Астрономія й NOAA", "Astronomy and NOAA", "Astronomía y NOAA", "Astronomie et NOAA"], ["Панчанга", "Panchanga", "Panchanga", "Panchanga"], ["Оцінка дня", "Day score", "Puntuación del día", "Note du jour"], ["Формульні дані актуальні", "Formula data are current", "Datos de la fórmula actualizados", "Données de formule à jour"], ["Формульні дані застаріли", "Formula data are stale", "Datos de la fórmula obsoletos", "Données de formule périmées"], ["Офлайн: перевірте час збережених даних", "Offline: check the saved data timestamp", "Sin conexión: compruebe la fecha de los datos guardados", "Hors ligne : vérifiez la date des données enregistrées"], ["Оновлюємо дані…", "Updating data…", "Actualizando datos…", "Mise à jour des données…"], ["Формульні дані відсутні", "Formula data are missing", "Faltan datos de la fórmula", "Données de formule absentes"], ["Не вдалося оновити дані", "Could not update data", "No se pudieron actualizar los datos", "Impossible de mettre à jour les données"], ["Спробувати ще", "Try again", "Reintentar", "Réessayer"], ["Дата · Київ", "Date · Kyiv", "Fecha · Kyiv", "Date · Kyiv"], ["Розрахована фаза Місяця", "Calculated Moon phase", "Fase lunar calculada", "Phase lunaire calculée"], ["зростає", "waxing", "creciente", "croissante"], ["росте", "waxing", "creciente", "croissante"], ["спадає", "waning", "menguante", "décroissante"], ["Місяць: освітлено", "Moon: illuminated", "Luna: iluminada", "Lune : éclairée"], ["Теми дня за календарем джерела:", "Day themes from the source calendar:", "Temas del día según el calendario fuente:", "Thèmes du jour selon le calendrier source :"], ["Перегляньте календарні теми й підстави оцінки дня.", "Explore calendar themes and the reasons for the day score.", "Consulte los temas del calendario y los motivos de la puntuación.", "Consultez les thèmes du calendrier et les raisons de la note."], ["Актуальної оцінки немає. Порожнє значення не означає нейтральний день.", "No current score. A missing value does not mean a neutral day.", "No hay puntuación actual. Un valor ausente no indica un día neutro.", "Aucune note actuelle. Une valeur absente ne signifie pas un jour neutre."], ["Джерело: експертна оцінка", "Source: expert assessment", "Fuente: valoración experta", "Source : évaluation experte"], ["Джерело: формула календаря", "Source: calendar formula", "Fuente: fórmula del calendario", "Source : formule du calendrier"], ["Оцінка недоступна", "Score unavailable", "Puntuación no disponible", "Note indisponible"], ["Експертна оцінка", "Expert assessment", "Valoración experta", "Évaluation experte"], ["Формула джерела", "Source formula", "Fórmula de la fuente", "Formule de la source"], ["▲ Позитивна · ● Нейтральна · ▼ Негативна · ○ Немає оцінки", "▲ Positive · ● Neutral · ▼ Negative · ○ No score", "▲ Positiva · ● Neutra · ▼ Negativa · ○ Sin puntuación", "▲ Positive · ● Neutre · ▼ Négative · ○ Sans note"], ["Три складові дня", "Three parts of the day", "Tres aspectos del día", "Trois aspects du jour"]];
// FP542 (F1): COPY is sorted once per size and results are memoised per language and locale registry version.
let trSorted=null,trSize=-1;const trMemo=new Map();
function tr(text){let value=String(text),lang=window.NRLocale?.language,idx={uk:0,en:1,es:2,fr:3}[lang]||0;if(!idx)return value;if(trSize!==COPY.length){trSorted=[...COPY].sort((a,b)=>b[0].length-a[0].length);trSize=COPY.length;trMemo.clear();}const key=lang+'\u0000'+(window.NRLocale?.version??0)+'\u0000'+value,hit=trMemo.get(key);if(hit!==undefined)return hit;for(const row of trSorted)value=value.split(row[0]).join(row[idx]);const out=window.NRLocale?.text(value)||value;if(trMemo.size>=4000)trMemo.clear();trMemo.set(key,out);return out;}
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=tr(text);return e;};
function noonKyiv(ds){let d=new Date(ds+'T12:00:00Z');const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(d));return new Date(d.getTime()+(12-h)*3600000);}
COPY.push(['Оцінки за днями','Daily scores','Puntuaciones por día','Notes par jour'],['Окремі денні оцінки. Риска означає відсутні дані; 0 — нейтральну оцінку.','Separate daily scores. A dash means missing data; 0 means neutral.','Puntuaciones diarias independientes. Una raya indica datos ausentes; 0 significa neutral.','Notes quotidiennes distinctes. Un tiret indique une donnée absente ; 0 signifie neutre.']);
// Only geometry: final-score authority and rounding remain in the resolver.
function forecastPoints(entries){return entries.map((entry,i)=>{const c=entry.consumer,score=c?.available===true&&SkyScore.isValidFinal(c.score)?c.score:null;return {date:entry.date,score,authority:c?.authority||null,x:entries.length===1?190:46+i*288/(entries.length-1),y:score===null?null:100-score*23};});}
COPY.push(['NOAA: Kp із прогнозу з кроком 3 години','NOAA: Kp from a forecast in 3-hour steps','NOAA: Kp de una previsión en intervalos de 3 horas','NOAA : Kp issu de prévisions par pas de 3 heures'],['NOAA: орієнтир на 27 днів','NOAA: 27-day outlook','NOAA: perspectiva de 27 días','NOAA : perspectives à 27 jours'],['Дата випуску не вказана','Issue date not provided','Fecha de emisión no indicada','Date de publication non indiquée']);
COPY.push(['орієнтир 27 дн.','27-day outlook','perspectiva de 27 d','tendance à 27 j']);
function horizonText(source){
 if(source?.kp_source==='NOAA_3day_slots')return tr('NOAA: Kp із прогнозу з кроком 3 години');
 if(source?.kp_source!=='NOAA_27day_outlook')return '';
 const stamp=source.kp_input?.issued_at,valid=typeof stamp==='string'&&Number.isFinite(Date.parse(stamp));
 return tr('NOAA: орієнтир на 27 днів')+' · '+(valid?new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{dateStyle:'long',timeZone:'UTC'}).format(new Date(stamp)):tr('Дата випуску не вказана'));
}
COPY.push(
 ['Дати з оцінкою','Dates with a score','Fechas con puntuación','Dates avec une note'],
 ['Риска означає, що оцінки немає. Нуль означає нейтральну оцінку.','A dash means no score. Zero means neutral.','Un guion indica que no hay puntuación. Cero significa neutral.','Un tiret indique une note indisponible. Zéro signifie neutre.'],
 ['Експерт','Expert','Experto','Expert'],['Формула','Formula','Fórmula','Formule'],['Без оцінки','No score','Sin puntuación','Sans note'],
 ['Оберіть період, а потім дату, щоб переглянути її оцінку й джерело.','Choose a period, then a date to see its score and source.','Elija un periodo y una fecha para ver la puntuación y su fuente.','Choisissez une période, puis une date pour afficher la note et sa source.']
);
function renderForecastGraph(root){
 const host=root.querySelector('.nr-o-horizon-list');if(!host)return;
 const points=forecastPoints([...host.querySelectorAll('[data-day]')].filter(b=>!b.hidden).map(b=>({date:b.dataset.day,consumer:resolvedFor(b.dataset.day).consumer})));
 let figure=root.querySelector('[data-forecast-graph]');
 if(points.length<2||points.length>7){figure?._labelObserver?.disconnect();figure?.remove();return;}
 if(!figure){
  figure=make('figure','sr-forecast-graph');figure.dataset.forecastGraph='';
  const plot=make('div','');plot.dataset.forecastScroll='';
  figure.append(make('figcaption',''),plot,make('p',''));host.before(figure);
 }
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const baseWidth=360;
 svg.setAttribute('viewBox','0 0 360 225');svg.setAttribute('role','img');
 const node=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 const descriptions=points.map(p=>p.date+': '+SkyScore.describe(p.score)+' · '+tr(p.score===null?'Оцінка недоступна':p.authority==='expert_pdf'?'Експертна оцінка':'Формула джерела'));
 svg.setAttribute('aria-label',tr('Оцінки за днями')+'. '+descriptions.join('; '));
 // FP569l (owner: «провали» на графіку): tinted zones with words, bars from zero, weekday under each date.
 {const W=[['сприятливо','favourable','favorable','favorable'],['обережно','caution','cautela','prudence']],li=Math.max(0,['uk','en','es','fr'].indexOf(window.NRLocale?.language||'uk'));
  node('rect',{x:30,y:31,width:baseWidth-40,height:69,fill:'rgba(99,230,173,.07)'});node('rect',{x:30,y:100,width:baseWidth-40,height:69,fill:'rgba(255,133,141,.07)'});
  node('text',{x:baseWidth-12,y:45,'text-anchor':'end',fill:'#8FE0BE','font-size':11,'font-weight':600},W[0][li]+' ↑');node('text',{x:baseWidth-12,y:163,'text-anchor':'end',fill:'#FF9AA2','font-size':11,'font-weight':600},W[1][li]+' ↓');}
 for(const score of [3,0,-3]){const y=100-score*23;node('line',{x1:30,y1:y,x2:baseWidth-10,y2:y,stroke:score===0?'#8fa2c6':'#435575','stroke-dasharray':score===0?'none':'3 5'});node('text',{x:4,y:y+4,fill:'#c7d4ec','font-size':12},score>0?'+'+score:String(score));}
 for(const p of points){const color=SkyScore.color(p.score),g=node('g',{'data-date':p.date,'data-score':p.score===null?'missing':p.score});
  const add=(tag,attrs,text)=>{const e=node(tag,attrs,text);g.append(e);};
  if(p.score===null)add('text',{x:p.x,y:105,'text-anchor':'middle',fill:color,'font-size':20},'—');
  else{if(p.score!==0)add('rect',{x:p.x-9,y:Math.min(100,p.y),width:18,height:Math.abs(p.y-100),rx:4,fill:color,opacity:.55});add('circle',{cx:p.x,cy:p.y,r:5,fill:color,stroke:'#101a30','stroke-width':2});add('text',{x:p.x,y:p.y+(p.score<0?19:-12),'text-anchor':'middle',fill:color,'font-size':13,'font-weight':700},SkyScore.formatScore(p.score));}
  add('text',{x:p.x,y:203,'text-anchor':'middle',fill:'#aeb6d8','font-size':11},new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{weekday:'short',timeZone:'UTC'}).format(new Date(p.date+'T12:00:00Z')));add('text',{x:p.x,y:219,'text-anchor':'middle',fill:'#dce6fa','font-size':12},p.date.slice(8)+'.'+p.date.slice(5,7));
 }
 const plot=figure.querySelector('[data-forecast-scroll]');
 figure.querySelector('figcaption').textContent=tr('Оцінки за днями');
 figure.lastElementChild.textContent=tr('Окремі денні оцінки. Риска означає відсутні дані; 0 — нейтральну оцінку.');
 plot.replaceChildren(svg);
 const geometry=[...svg.querySelectorAll('[x],[x1],[cx]')].map(el=>({el,values:['x','x1','x2','cx'].filter(a=>el.hasAttribute(a)).map(a=>[a,Number(el.getAttribute(a))])}));
 const resizeLabels=()=>{const width=svg.getBoundingClientRect().width;if(!svg.isConnected||!(width>0))return;const W=innerWidth>=900?width:360;svg.setAttribute('viewBox','0 0 '+W+' 225');for(const {el,values} of geometry)for(const [a,v]of values)el.setAttribute(a,W===360||v<30?v:30+(v-30)*(W-40)/320);for(const label of svg.querySelectorAll('text'))label.style.setProperty('font-size',(13*W/width)+'px','important');};
 figure._labelObserver?.disconnect();figure._labelObserver=new ResizeObserver(()=>requestAnimationFrame(resizeLabels));figure._labelObserver.observe(svg);resizeLabels();

}
function moon(at){
 const {k,waxing}=SkyMoon.moonIllumination(at),r=35,c=40,rx=r*Math.abs(2*k-1),limb=waxing?1:0,term=k>=.5?(waxing?1:0):(waxing?0:1),pct=Math.round(k*100),id='srMoon'+(++moonSerial);
 const d=`M${c},${c-r} A${r},${r} 0 0 ${limb} ${c},${c+r} A${rx.toFixed(3)},${r} 0 0 ${term} ${c},${c-r} Z`;
 return `<svg viewBox="0 0 80 80" role="img" aria-label="Місяць: освітлено ${pct===0?'менше 1':pct}%, ${waxing?'росте':'спадає'}" data-moon-k="${k}" data-moon-waxing="${waxing}"><defs><radialGradient id="${id}lit" cx="62%" cy="38%" r="75%"><stop stop-color="#fff8e6"/><stop offset=".55" stop-color="#f3e9cf"/><stop offset="1" stop-color="#b8ab8c"/></radialGradient><radialGradient id="${id}dark"><stop stop-color="#2c3a66"/><stop offset="1" stop-color="#161f3d"/></radialGradient><radialGradient id="${id}halo"><stop offset=".7" stop-color="#e9e5c8" stop-opacity=".16"/><stop offset="1" stop-color="#cddafa" stop-opacity="0"/></radialGradient><radialGradient id="${id}edge" cx="42%" cy="38%" r="67%"><stop offset=".55" stop-color="#151e32" stop-opacity="0"/><stop offset="1" stop-color="#151e32" stop-opacity=".65"/></radialGradient><radialGradient id="${id}sea"><stop stop-color="#736d60" stop-opacity=".22"/><stop offset=".65" stop-color="#736d60" stop-opacity=".12"/><stop offset="1" stop-color="#736d60" stop-opacity="0"/></radialGradient><clipPath id="${id}clip"><path d="${d}"/></clipPath></defs><circle cx="40" cy="40" r="40" fill="url(#${id}halo)"/><circle cx="40" cy="40" r="35" fill="url(#${id}dark)"/><path d="${d}" fill="url(#${id}lit)"/><g clip-path="url(#${id}clip)" fill="url(#${id}sea)"><ellipse cx="31" cy="29" rx="14" ry="17"/><ellipse cx="54" cy="25" rx="10" ry="12"/><ellipse cx="51" cy="51" rx="13" ry="14"/><ellipse cx="28" cy="53" rx="9" ry="8"/></g><circle cx="40" cy="40" r="35" fill="url(#${id}edge)"/></svg><span>${pct===0?'<1':pct}% · ${waxing?'росте':'спадає'}<small>Розрахована фаза Місяця</small></span>`;
}
let moonSerial=0;
function atmosphere(at,ds){
 document.documentElement.classList.add('wow');
 if(!document.querySelector('.wow-sky')){const sky=make('div','wow-sky');sky.setAttribute('aria-hidden','true');let seed=11;const rand=()=>((seed=(seed*9301+49297)%233280)/233280);let dots='';for(let i=0;i<200;i++){dots+=`<circle cx="${(rand()*100).toFixed(2)}%" cy="${(rand()*100).toFixed(2)}%" r="${i%13===0?1.5:.8}" fill="#eef3ff" opacity="${(.2+rand()*.55).toFixed(2)}" class="${i%7===0?'tw':''}" style="--d:7s;--dl:${i%5}s"/>`;}sky.innerHTML='<svg class="layer2" aria-hidden="true">'+dots+'</svg>';document.body.prepend(sky);}
 const header=document.querySelector('body>header')||document.getElementById('headerTitle')?.closest('header');if(!header)return;const nav=document.getElementById('nrTopNav');if(nav&&nav.parentElement!==header)header.append(nav);const notice=document.getElementById('playChannelNotice');if(notice&&!notice.querySelector('button')){const close=make('button','','×');close.type='button';close.setAttribute('aria-label',tr('Закрити'));close.onclick=()=>{notice.hidden=true;try{localStorage.setItem('srPrivacyNoticeDismissed','1');}catch(_){}};notice.append(close);try{notice.hidden=localStorage.getItem('srPrivacyNoticeDismissed')==='1';}catch(_){}}
 let box=header.querySelector('.wow-header-moon');if(!box){box=make('div','wow-header-moon');box.setAttribute('translate','no');header.append(box);}const next=document.createElement('template');next.innerHTML=tr(moon(at));const oldSvg=box.querySelector('svg'),newSvg=next.content.querySelector('svg');if(oldSvg&&newSvg){for(const key of ['aria-label','data-moon-k','data-moon-waxing'])oldSvg.setAttribute(key,newSvg.getAttribute(key));const paths=newSvg.querySelectorAll('path');oldSvg.querySelectorAll('path').forEach((p,i)=>p.setAttribute('d',paths[i].getAttribute('d')));box.querySelector('span')?.replaceWith(next.content.querySelector('span'));}else{box.replaceChildren(next.content);}box.dataset.date=ds;box.title=ds+' · '+at.toISOString();const caption=box.querySelector('span');caption?.append(make('small','',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'Europe/Kyiv'}).format(at)));
}

COPY.push(['Завантажити порівняння','Download comparison','Descargar comparación','Télécharger la comparaison'],['Це складові формули, а не розклад експертного бала.','These are formula components, not a breakdown of the expert score.','Son componentes de la fórmula, no un desglose de la puntuación experta.','Ce sont les composantes de la formule, pas une décomposition de la note experte.']);
COPY.push(['Дата для порівняння','Date to compare','Fecha para comparar','Date à comparer'],['Додано дат:','Dates added:','Fechas añadidas:','Dates ajoutées :']);
const compared=new Set();let comparisonChoice='';
function resolvedFor(ds){return window.fp469ConsumerForDate?.({ds})||{consumer:{score:null,available:false}};}
function paintScore(node,result){const v=result?.available?result.score:null,kind=SkyScore.scoreClass(v),sem=SkyScore.SEMANTIC[kind];node.dataset.scoreTone=kind;node.textContent=sem.icon+' '+SkyScore.formatScore(v);node.setAttribute('aria-label',SkyScore.describe(v));}
function pick(root,ds){const select=root.querySelector('select');if(!select)return;if(![...select.options].some(x=>x.value===ds))select.add(new Option(ds,ds));select.value=ds;select.dispatchEvent(new Event('change',{bubbles:true}));}
function extras(root,ds){
 const route=root.dataset.overview;
 for(const btn of root.querySelectorAll('[data-day]')){const value=resolvedFor(btn.dataset.day).consumer;btn.dataset.scoreTone=SkyScore.scoreClass(value?.available?value.score:null);for(const number of btn.querySelectorAll('strong')){number.dataset.scoreTone=btn.dataset.scoreTone;/* FP569k: on a light «pressed» chip (week strip, calendar) the sign colour had 1.1:1 contrast; use dark ink there. */number.style.setProperty('color',btn.matches('[aria-pressed="true"]')&&btn.closest('#nrRoute-forecast nav.nr-b-week,.nr-o-days')?'#101429':SkyScore.color(value?.available?value.score:null),'important');number.setAttribute('aria-label',SkyScore.describe(value?.available?value.score:null));}}
 if(route==='forecast'){
  const list=root.querySelector('.nr-o-horizon-list');
  const count=Number(root.dataset.forecastCount||7);
  const datesFrom=start=>Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  let week=datesFrom(root.dataset.forecastStart||ds);
  if(!week.includes(ds))week=datesFrom(ds);
  root.dataset.forecastStart=week[0];
  if(list)list.dataset.forecastGrid=count===27?'month':'';
  const intro=list?.parentElement?.querySelector(':scope > p');
  if(intro)intro.textContent=tr('Оберіть період, а потім дату, щоб переглянути її оцінку й джерело.');

  for(const date of week)if(list&&![...list.querySelectorAll('[data-day]')].some(b=>b.dataset.day===date)){const b=make('button','');b.type='button';b.dataset.day=date;b.setAttribute('aria-pressed',String(date===ds));b.onclick=()=>pick(root,date);list.append(b);}
  if(list)list.append(...[...list.querySelectorAll('[data-day]')].sort((a,b)=>a.dataset.day.localeCompare(b.dataset.day)));
  for(const b of root.querySelectorAll('.nr-o-horizon-list [data-day]')){const own=resolvedFor(b.dataset.day),value=own.consumer,date=make('span','sr-forecast-date',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(b.dataset.day+'T12:00:00Z'))),score=make('strong','');paintScore(score,value);score.style.color=SkyScore.color(value?.available?value.score:null);const source=tr(value?.authority==='expert_pdf'?'Експертна оцінка':value?.available?'Формула джерела':'Оцінка недоступна');const state=dataState(value),copy={fresh:'Формульні дані актуальні',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних',missing:'Формульні дані відсутні',loading:'Оновлюємо дані…',error:'Не вдалося оновити дані'};// Owner review 01.11 (D4): the card shows date, score, source and horizon only; the data state is shown once in
  // the hero and the full horizon text stays available as the card's title and accessible description.
  const full=source+' · '+tr(copy[state])+(horizonText(own.feed?.channels?.source_formula)?' · '+horizonText(own.feed.channels.source_formula):'');
  const outlook=value?.available&&value.authority!=='expert_pdf'&&state==='fresh'&&own.feed?.channels?.source_formula?.kp_source==='NOAA_27day_outlook';
  if(count===27)date.textContent=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(b.dataset.day+'T12:00:00Z'));
  const compactSource=tr(value?.authority==='expert_pdf'?'Експерт':value?.available?'Формула':'Без оцінки');
  b.setAttribute('aria-label',date.textContent+' · '+SkyScore.describe(value?.available?value.score:null)+' · '+source);
  b.replaceChildren(date,score,make('small','',(count===27?compactSource:source)+(outlook?' · '+tr('орієнтир 27 дн.'):'')));b.title=full;b.dataset.fullState=full;}

  let controls=root.querySelector('[data-p0-forecast-tabs]');if(!controls){controls=make('div','sr-p0-tabs');controls.dataset.p0ForecastTabs='';for(const [name,count]of [['День',1],['Тиждень',7],['27 днів',27]]){const b=make('button','',name);b.type='button';b.onclick=()=>{root.dataset.forecastCount=String(count);root.dataset.forecastStart=root.querySelector('select')?.value||ds;extras(root,root.querySelector('select')?.value||ds);};controls.append(b);}root.querySelector('.nr-o-horizon-list')?.before(controls);}
  controls.querySelectorAll('button').forEach((b,i)=>b.textContent=tr(['День','Тиждень','27 днів'][i]));
  [...root.querySelectorAll('.nr-o-horizon-list [data-day]')].forEach(b=>b.hidden=Number(root.dataset.forecastCount||7)===1?b.dataset.day!==ds:!week.includes(b.dataset.day));
  controls.querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-pressed',String(Number(root.dataset.forecastCount||7)===[1,7,27][i]));});
  let overview=root.querySelector('[data-forecast-summary]');
  if(!overview){overview=make('div','sr-forecast-summary');overview.dataset.forecastSummary='';controls.after(overview);}
  const fmt=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'short',timeZone:'UTC'});
  const first=new Date(week[0]+'T12:00:00Z'),last=new Date(week.at(-1)+'T12:00:00Z');
  const scored=week.filter(day=>resolvedFor(day).consumer?.available===true).length;
  overview.replaceChildren(make('strong','',count===1?fmt.format(first):fmt.formatRange(first,last)),
   make('span','',tr('Дати з оцінкою')+' · '+scored+' / '+count));
  if(scored<count)overview.append(make('small','','Риска означає, що оцінки немає. Нуль означає нейтральну оцінку.'));
  // FP569l: the big score at the top belongs to one date — say which (owner: «незрозуміло, що обрано»).
  {const hero=root.querySelector('.nr-o-hero');if(hero){let sel=hero.querySelector('[data-forecast-selected]');if(!sel){sel=make('p','sr-forecast-selected');sel.dataset.forecastSelected='';hero.prepend(sel);}
   sel.textContent=({uk:'Обрана дата: ',en:'Selected date: ',es:'Fecha elegida: ',fr:'Date choisie : '}[window.NRLocale?.language]||'Обрана дата: ')+new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{weekday:'short',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(ds+'T12:00:00Z'));}}
  // FP569k: «День» says what the day is in one sentence (same text as Today), not only a number.
  let verdictBox=root.querySelector('[data-forecast-verdict]');
  if(count===1){const v=window.NRDayVerdict?.summary?.(ds);if(v){if(!verdictBox){verdictBox=make('div','sr-forecast-verdict');verdictBox.dataset.forecastVerdict='';verdictBox.setAttribute('translate','no');}
    if(verdictBox.previousElementSibling!==overview)overview.after(verdictBox);
    verdictBox.replaceChildren(make('p','sr-fv-tone',v.tone),...v.lines.map(l=>{const p=make('p','sr-fv-'+l.kind);p.append(make('b','',l.label+' '),document.createTextNode(l.text));return p}));verdictBox.hidden=false;}}
  else if(verdictBox)verdictBox.hidden=true;
  // FP569k: the 27-day grid states where the period ends; «Події тижня» belong to Day/Week, not to the 27-day view.
  let endNote=root.querySelector('[data-forecast-end]');if(count===27&&list){if(!endNote){endNote=make('p','sr-forecast-end');endNote.dataset.forecastEnd='';}if(endNote.previousElementSibling!==list)list.after(endNote);endNote.textContent=({uk:'Кінець періоду · ',en:'End of period · ',es:'Fin del periodo · ',fr:'Fin de la période · '}[window.NRLocale?.language]||'Кінець періоду · ')+fmt.format(last);endNote.hidden=false;}else if(endNote)endNote.hidden=true;
  document.documentElement.dataset.forecastCount=String(count);
  renderForecastGraph(root);
 }
 if(route!=='calendar')return;
 let box=root.querySelector('[data-p0-month]');if(!box){box=make('section','sr-p0-month');box.dataset.p0Month='';root.querySelector('.nr-o-hero').after(box);}
 const key=box.dataset.month||ds.slice(0,7);box.dataset.month=key;const [y,m]=key.split('-').map(Number),count=new Date(Date.UTC(y,m,0)).getUTCDate(),offset=(new Date(key+'-01T12:00:00Z').getUTCDay()+6)%7;
 box.replaceChildren();const header=make('div','sr-p0-month-head');for(const [text,delta]of [['‹',-1],[new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z')),0],['›',1]]){const e=make(delta?'button':'h2','',text);if(delta){e.type='button';e.setAttribute('aria-label',tr(delta<0?'Попередній місяць':'Наступний місяць'));e.onclick=()=>{box.dataset.month=new Date(Date.UTC(y,m-1+delta,1,12)).toISOString().slice(0,7);extras(root,ds);};}header.append(e);}box.append(header);
 const grid=make('div','sr-p0-month-grid');for(let d=5;d<=11;d++)grid.append(make('span','',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,d)))));for(let i=0;i<offset;i++)grid.append(make('span',''));
 for(let d=1;d<=count;d++){const date=key+'-'+String(d).padStart(2,'0'),result=resolvedFor(date).consumer,b=make('button','');b.type='button';b.dataset.calendarDate=date;b.append(make('span','',String(d)));const val=make('strong','sr-p0-value');paintScore(val,result);const words=val.textContent.split(' ');val.replaceChildren(...words.map(word=>make('span','',word)));b.append(val);b.setAttribute('aria-label',date+' · '+SkyScore.describe(result?.available?result.score:null));b.setAttribute('aria-pressed',String(date===ds));b.onclick=()=>pick(root,date);grid.append(b);}box.append(grid,make('p','sr-p0-legend','▲ Позитивна · ● Нейтральна · ▼ Негативна · ○ Немає оцінки'));
 let compare=root.querySelector('[data-p0-compare]');if(!compare){compare=make('section','sr-p0-compare');compare.dataset.p0Compare='';box.after(compare);}compare.replaceChildren(make('h2','','Порівняти до трьох дат'));
 const pickerLabel=make('label','sr-compare-picker','Дата для порівняння'),picker=make('select','');picker.dataset.compareDate='';
 const available=[...root.querySelector('select').options];for(const opt of available)picker.add(new Option(opt.textContent,opt.value));
 if(!available.some(o=>o.value===comparisonChoice))comparisonChoice=ds;picker.value=comparisonChoice;pickerLabel.append(picker);compare.append(pickerLabel);
 const add=make('button','','Додати обрану дату');add.type='button';add.dataset.compareAdd='';const updateAdd=()=>{add.disabled=compared.size>=3||compared.has(picker.value)||!picker.value;};updateAdd();picker.onchange=()=>{comparisonChoice=picker.value;updateAdd();};
 add.onclick=()=>{if(add.disabled)return;compared.add(picker.value);comparisonChoice=available.find(o=>!compared.has(o.value))?.value||ds;extras(root,ds);compare.querySelector('[data-compare-date]').focus({preventScroll:true});};compare.append(add);
 const status=make('p','sr-compare-count',tr('Додано дат:')+' '+compared.size+' / 3');status.setAttribute('role','status');compare.append(status);
 for(const date of compared){const data=resolvedFor(date),card=make('article','sr-p0-compare-card');card.dataset.date=date;card.style.setProperty('--compare-color',SkyScore.color(data.consumer?.available?data.consumer.score:null));card.append(make('h3','',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))));const score=make('strong','sr-p0-value sr-compare-ring');paintScore(score,data.consumer);card.append(score,make('p','',data.consumer?.authority==='expert_pdf'?'Експертна оцінка':data.consumer?.available?'Формула джерела':'Оцінка недоступна'));
 const parts=make('details','');parts.append(make('summary','','Надані складові'),make('p','','Це складові формули, а не розклад експертного бала.'));for(const f of data.feed?.channels?.source_formula?.factors||[])parts.append(make('p','',(window.NRConsumerOverview?.factorName?.(f.factor)||String(f.factor))+': '+(Number.isFinite(f.value)?String(f.value).replace('.',','):'—')));card.append(parts);const remove=make('button','','Прибрати');remove.type='button';remove.onclick=()=>{compared.delete(date);comparisonChoice=date;extras(root,ds);compare.querySelector('[data-compare-date]').focus({preventScroll:true});};card.append(remove);compare.append(card);}
 if(compared.size){const save=make('button','sr-compare-save','Завантажити порівняння');save.type='button';save.onclick=()=>{const payload={schema:'skyrhythm-comparison-v1',exported_at:new Date().toISOString(),note:'Snapshot of resolved scores, not evidence of predictive accuracy',dates:[...compared].map(date=>({date,consumer:resolvedFor(date).consumer}))};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SkyRhythm_comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};compare.append(save);}
}
function compactForecast(root){
 let details=root.querySelector('[data-forecast-details]');
 if(!details){details=make('details','sr-p0-details');details.dataset.forecastDetails='';details.append(make('summary','','Детально: джерела, розрахунок і календар'));root.append(details);
  root.addEventListener('click',e=>{if(e.target.closest('[data-why],.nr-o-reason-brief'))details.open=true;},true);
 }
 details.querySelector(':scope > summary').textContent=tr('Детально: джерела, розрахунок і календар');
 for(const selector of ['.nr-o-spaceweather','.nr-o-reasons','.nr-o-factors','.nr-o-provenance','.nr-o-context','.nr-o-panch-preview','.nr-o-next','.nr-o-calendar','.nr-o-layers','[data-settings]']){const item=root.querySelector(selector);if(item&&!details.contains(item))details.append(item);}
}
function compactRouteHero(root){
 const hero=root.querySelector('.nr-o-hero'),details=root.querySelector('[data-forecast-details]');if(!hero||!details)return;
 hero.classList.add('sr-compact-header');const heading=hero.querySelector('.nr-o-heading');if(heading)root.prepend(heading);
 for(const child of [...hero.children])if(!child.matches('label,.nr-o-verdict,[data-scoped-opinion]'))details.append(child);
 const source=hero.querySelector('[data-score-source]');if(source)details.append(source);
 let chip=hero.querySelector('[data-compact-source]');if(!chip){chip=make('span','sr-compact-source');chip.dataset.compactSource='';hero.append(chip);}
 const result=resolvedFor(root.querySelector('select')?.value).consumer;
 chip.textContent=tr(result?.authority==='expert_pdf'?'Експертна оцінка':result?.available?'Формула джерела':'Оцінка недоступна');
 const state=root.querySelector('[data-p0-feed-state]');if(state)details.append(state);
 if(root.dataset.overview==='calendar')for(const selector of ['.nr-o-practical','.nr-o-actions','.nr-o-spaceweather','.nr-o-boundary']){const e=root.querySelector(selector);if(e)details.append(e);}
 const tools=root.querySelector(root.dataset.overview==='calendar'?'[data-p0-month]':'.nr-o-route-tools');if(tools)hero.after(tools);
 // FP542 (D4): on the calendar, theme chips and the match count come before the month grid; the long
 // date list stays below it. Without the theme panel the previous order is kept.
 if(root.dataset.overview==='calendar'){const topics=root.querySelector('.nr-o-route-tools'),status=topics?.querySelector('.nr-o-topic-status');if(topics&&status&&tools){hero.after(topics);status.after(tools);const compare=root.querySelector('[data-p0-compare]');if(compare)tools.after(compare);}else if(topics&&tools)tools.after(topics);}
}
function expertCaution(root,ds){
 const texts={
 '2026-10-30':['Домовленості й завершення справ','Agreements and unfinished tasks','Acuerdos y tareas pendientes','Accords et tâches inachevées'],
 '2026-11-01':['Важливі фінансові рішення','Major financial decisions','Decisiones financieras importantes','Décisions financières importantes']};
 const body={
 '2026-10-30':['У прогнозі експерта на цей день — переперевірка деталей перед оплатою, підтвердженням завдання чи поїздкою та повернення до незавершених справ.','The expert’s forecast for this date emphasizes checking details before payment, confirming a task or travelling, and returning to unfinished tasks.','La previsión experta para esta fecha destaca revisar los detalles antes de pagar, confirmar una tarea o viajar, y retomar tareas pendientes.','La prévision experte pour cette date met l’accent sur la vérification des détails avant un paiement, la confirmation d’une tâche ou un voyage, et sur les tâches inachevées.'],
 '2026-11-01':['Експерт пропонує приділити день родині й плануванню бюджету, утримавшись від важливих фінансових рішень. Це тематичне застереження джерела, а не персональна фінансова порада.','The expert suggests family time and budget planning while avoiding major financial decisions. This is a source-specific caution, not personal financial advice.','La experta propone dedicar tiempo a la familia y planificar el presupuesto, evitando decisiones financieras importantes. Es una advertencia de la fuente, no asesoramiento financiero personal.','L’experte propose de privilégier la famille et la préparation du budget, en évitant les décisions financières importantes. Il s’agit d’une réserve de la source, pas d’un conseil financier personnel.']};
 let box=root.querySelector('[data-expert-caution]');if(!texts[ds]){box?.remove();return;}
 const i={uk:0,en:1,es:2,fr:3}[window.NRLocale?.language]||0;
 if(!box){box=make('details','sr-expert-caution');box.dataset.expertCaution='';box.setAttribute('translate','no');}
 if(box.dataset.date!==ds)box.open=false;
 box.dataset.date=ds;box.dataset.sourceId='3202';box.dataset.sourceTextSha256='356781324ff588721b4792ee874dc6850274165f1226639e49b59508554768c2';box.dataset.sourceEdited='2026-10-25T16:49:49+00:00';
 const label=['Трактування експерта','Expert interpretation','Interpretación experta','Interprétation experte'][i],note=['Загальний бал не означає однакової оцінки для всіх справ. Це застереження не змінює бал; вплив на реальні події не підтверджений.','The overall score does not rate every activity equally. This caution does not change the score; an effect on real events has not been established.','La puntuación general no valora por igual todas las actividades. Esta advertencia no cambia la puntuación; no se ha demostrado un efecto en hechos reales.','La note globale ne vaut pas pour toutes les activités de la même façon. Cette réserve ne change pas la note ; un effet sur les événements réels n’est pas établi.'][i];
 const summary=make('summary','');summary.append(make('small','',label+' · '+ds),document.createTextNode(' '),make('strong','',texts[ds][i]));
 box.replaceChildren(summary,make('p','',body[ds][i]),make('p','sr-caution-note',note));
 const link=make('a','',['Допис @devakan від 25.10.2026','@devakan post dated 25 Oct 2026','Publicación de @devakan del 25/10/2026','Publication @devakan du 25/10/2026'][i]);link.href='https://t.me/devakan/3202';link.target='_blank';link.rel='noopener noreferrer';box.append(link);root.querySelector('.nr-o-hero')?.after(box);
}
function apply(root,ds,resolved){
 expertCaution(root,ds);
 feedStatus(root,ds,resolved);extras(root,ds);paintRing(root,resolved);if(root.dataset.overview!=='today'){compactForecast(root);compactRouteHero(root);return;}
 root.classList.add('sr-p0-today');const hero=root.querySelector('.nr-o-hero');if(!hero)return;
 const titleBox=root.querySelector('.nr-o-heading');if(titleBox){titleBox.dataset.referenceTitle='';titleBox.classList.add('sr-reference-title');if(hero.firstElementChild!==titleBox)hero.prepend(titleBox);titleBox.querySelector('h1').textContent=({uk:'Огляд дня',en:'Day overview',es:'Resumen del día',fr:'Aperçu du jour'}[window.NRLocale?.language||'uk']);}
 let details=root.querySelector(':scope > [data-p0-details]');
 if(!details){details=make('details','sr-p0-details');details.dataset.p0Details='';details.append(make('summary','','Детально: джерела, розрахунок і календар'));root.append(details);}
 let signals=root.querySelector(':scope > [data-p0-signals]');
 if(!signals){signals=make('nav','sr-p0-signals');signals.dataset.p0Signals='';signals.setAttribute('aria-label','Три складові дня');for(const [name,selector]of [['Астрономія й NOAA','.nr-o-spaceweather'],['Панчанга','.nr-o-panch-preview'],['Оцінка дня','.nr-o-reasons']]){const btn=make('button','',name);btn.type='button';btn.onclick=()=>{details.open=true;const target=root.querySelector(selector);target?.scrollIntoView({block:'start'});if(target){target.tabIndex=-1;target.focus({preventScroll:true});}};signals.append(btn);}hero.after(signals);}
 let visual=hero.querySelector('[data-p0-moon]');if(!visual){visual=make('div','sr-p0-moon');visual.dataset.p0Moon='';hero.append(visual);}
 const now=new Date(),today=NRCivilTime.dayKey(now),at=ds===today?now:noonKyiv(ds);visual.innerHTML=tr(moon(at));atmosphere(at,ds);visual.dataset.source='astronomy';visual.title='Геоцентричний розрахунок освітленої частки · '+at.toISOString();
 let sentence=hero.querySelector('[data-p0-sentence]');if(!sentence){sentence=make('p','sr-p0-sentence');sentence.dataset.p0Sentence='';hero.append(sentence);}
 const topic=root.querySelector('.nr-o-practical h2')?.textContent;
 // FP542 (D2): name what moves the score on the first screen instead of a generic topic line.
 const generic=!topic||topic==='Позначки календаря цього дня'||topic==='Календарні теми ще недоступні';
 const contributions=(resolved.formula?.available?(resolvedFor(ds).feed?.channels?.source_formula?.factors||[]):[]).filter(x=>Number.isFinite(x.value)&&x.value!==0);
const driverLabel=x=>x.factor==='Kp'?'Геомагнітна складова':x.factor==='Moon'?'Пурніма':x.factor==='Eclipse'?'Складова затемнення':x.factor;
 const signed=v=>(v>0?'+':v<0?'−':'')+String(Math.round(Math.abs(v)*100)/100).replace('.',',');
 const lowering=contributions.filter(x=>x.value<0&&(x.factor!=='Kp'||x.value<=-1)).sort((a,b)=>a.value-b.value).slice(0,2);
 const strongest=[...contributions].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,2);
 const list=xs=>xs.map(x=>driverLabel(x)+' '+signed(x.value)).join('; ');
 let text=resolved.available?(generic?'':'Теми дня за календарем джерела: '+topic.replace(/[.!?]+$/,'')+'.'):'Актуальної оцінки немає. Порожнє значення не означає нейтральний день.';
 if(resolved.available&&resolved.score<0&&lowering.length)text+=(text?' ':'')+(resolved.authority==='expert_pdf'?'У формульному розрахунку знижують оцінку: ':'Знижують оцінку: ')+list(lowering)+'.';
 else if(resolved.available&&generic&&strongest.length)text='Найбільші внески у формульний розрахунок: '+list(strongest)+'.';
 if(resolved.available&&!text)text='Перегляньте календарні теми й підстави оцінки дня.';
 sentence.textContent=text;
 let chip=hero.querySelector('[data-p0-source]');if(!chip){chip=make('button','sr-p0-source');chip.dataset.p0Source='';chip.type='button';chip.onclick=()=>{details.open=true;root.querySelector('[data-score-source]')?.scrollIntoView({block:'center'});};hero.append(chip);}
 chip.textContent=resolved.authority==='expert_pdf'?'Джерело: експертна оцінка':resolved.available?'Джерело: формула календаря':'Оцінка недоступна';
 const label=hero.querySelector(':scope > label');if(label){label.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=tr('Дата · Київ');});label.dataset.p0Date='';}
 // Keep the original accessible route heading, while removing duplicate visual chrome.
 const heading=root.querySelector('.nr-o-heading');if(heading&&heading.parentElement!==hero)hero.prepend(heading);
 for(const e of [...hero.children])if(!e.matches('[data-reference-title],[data-p0-date],[data-p0-moon],[data-p0-sentence],.nr-o-verdict,[data-p0-source],[data-share-card],.sr-p0-accessible-heading,[data-placement="after-hero"]'))details.append(e);
 sentence.textContent=tr(sentence.textContent);chip.textContent=tr(chip.textContent);
 details.querySelector(':scope > summary').textContent=tr('Детально: джерела, розрахунок і календар');
 signals.querySelectorAll('button').forEach((b,i)=>b.textContent=tr(['Астрономія й NOAA','Панчанга','Оцінка дня'][i]));
 const source=root.querySelector('[data-score-source]');if(source)details.prepend(source);
 for(const e of [...root.children])if(e!==hero&&e!==details&&e!==signals&&!e.matches('.sr-dayline,.nr-o-journey,.nr-o-heading,[data-p0-feed-state],[data-expert-caution],[data-placement="after-hero"]'))details.append(e);// DES-12: a block that declares its own placement (design-v4 NOAA brief) is not moved back and forth.

 // Hide duplicate weather summaries only by putting them in the existing details; no data are dropped.
 const line=root.querySelector('.sr-dayline');if(line){signals.after(line);let explore=line.querySelector('[data-p0-explore]');if(!explore){explore=make('details','sr-p0-explore');explore.dataset.p0Explore='';explore.append(make('summary','','Усі події, час і традиційні образи'));line.append(explore);}
 for(const selector of ['.sr-dl-actions','label','[data-moment]','figure:not([data-solar-profile])','[data-events]','[data-method]','[data-scope]']){const item=line.querySelector(':scope > '+selector);if(item)explore.append(item);}}
 const exp=root.querySelector('[data-p0-explore]>summary');if(exp)exp.textContent=tr('Усі події, час і традиційні образи');
 const journey=root.querySelector('.nr-o-journey');if(journey){(line||signals).after(journey);}if(root.lastElementChild!==details)root.append(details);
 renderSignals(root,ds,resolved);renderTimeline(root,ds);motionControl(document.querySelector('#nrRoute-more')||details);hero.append(root.querySelector('[data-p0-feed-state]'));
 // Route-level disclosures retain their own keyboard and deep-link entry points.
}

function dataState(result,load=window.__srConsumerLoadState,online=navigator.onLine){
 if(!online)return 'offline';if(load==='loading')return 'loading';if(load==='error')return 'error';
 const state=(result?.formula||result)?.state;return state==='fresh'?'fresh':state==='stale'?'stale':state==='offline'?'offline':state==='invalid'?'invalid':'missing';
}
function feedStatus(root,ds,result){
 let box=root.querySelector('[data-p0-feed-state]');if(!box){box=make('div','sr-p0-feed-state');box.dataset.p0FeedState='';root.prepend(box);}
 const state=dataState(result);box.dataset.state=state;root.setAttribute('aria-busy',String(state==='loading'));box.setAttribute('role',state==='error'?'alert':'status');
 const texts={fresh:'Формульні дані актуальні',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних',loading:'Оновлюємо дані…',missing:'Формульні дані відсутні',invalid:'Годинник пристрою розходиться з часом джерела',error:'Не вдалося оновити дані'};
 box.replaceChildren(make('span','',tr(texts[state])));
 const reg=window.NRConsumerAuthority?.registryStatus?.();
 if(reg&&['partial','stale','unavailable'].includes(reg.status)){const note=make('small','sr-p0-registry-note',' · '+tr(reg.status==='partial'?'Частину експертних рішень відхилено перевіркою':reg.status==='stale'?'Експертний реєстр не оновився; показано останню перевірену версію':'Експертний реєстр недоступний'));note.dataset.registry=reg.status;box.append(note);}
 const own=resolvedFor(ds).feed?.channels?.source_formula,stamp=own?.generated_at;
 if(typeof stamp==='string'&&Number.isFinite(Date.parse(stamp)))box.append(make('small','', ' · '+new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(stamp))+' · '+tr('за київським часом')));
 if(state==='error'){const retry=make('button','','Спробувати ще');retry.type='button';retry.onclick=()=>window.fp469LoadConsumerForecast?.();box.append(retry);}
}
window.addEventListener('sr:consumer-load',()=>{for(const root of document.querySelectorAll('[data-overview]')){const ds=root.querySelector('select')?.value;if(ds){const result=resolvedFor(ds).consumer;feedStatus(root,ds,result);renderSignals(root,ds,result);}}});
function signalData(result,feed,load=window.__srConsumerLoadState,online=navigator.onLine){
 const state=dataState(result,load,online),own=feed?.channels?.source_formula,kp=own?.kp_input?.kp;
 // A retained DOM label or expert score is never evidence of fresh NOAA data.
 const valid=state==='fresh'&&Number.isFinite(kp)&&kp>=0&&kp<=9&&own?.available===true;
 return {state,kp:valid?kp:null,source:valid?own.kp_source:null};
}
COPY.push(['У формульному розрахунку знижують оцінку:','In the formula calculation, the score is lowered by:','En el cálculo por fórmula, bajan la puntuación:','Dans le calcul par formule, la note est abaissée par :'],['Знижують оцінку:','Lowering the score:','Bajan la puntuación:','Abaissent la note :'],['Найбільші внески у формульний розрахунок:','Largest contributions to the formula calculation:','Mayores contribuciones al cálculo por fórmula:','Principales contributions au calcul par formule :'],['Складова затемнення','Eclipse component','Componente de eclipse','Composante d’éclipse']);
COPY.push(['Годинник пристрою розходиться з часом джерела','Device clock differs from the source time','El reloj del dispositivo no coincide con la hora de la fuente','L’horloge de l’appareil diffère de l’heure de la source'],['Частину експертних рішень відхилено перевіркою','Some expert decisions failed validation','Algunas decisiones expertas no superaron la validación','Certaines décisions d’expert ont échoué à la validation'],['Експертний реєстр не оновився; показано останню перевірену версію','The expert register did not update; showing the last validated version','El registro experto no se actualizó; se muestra la última versión validada','Le registre d’expert n’a pas été mis à jour ; dernière version validée affichée'],['Експертний реєстр недоступний','Expert register unavailable','Registro experto no disponible','Registre d’expert indisponible']);
COPY.push(['прогноз NOAA, 3 дні','NOAA 3-day forecast','pronóstico NOAA a 3 días','prévision NOAA à 3 jours'],['спостереження немає','no observation','sin observación','pas d’observation'],['Kp — немає актуальних даних','Kp — current data unavailable','Kp — datos actuales no disponibles','Kp — données actuelles indisponibles'],['Попередній Kp NOAA','Provisional NOAA Kp','Kp provisional NOAA','Kp provisoire NOAA'],['Спостереження','Observation','Observación','Observation']);
COPY.push(['Оцінка Kp GFZ','GFZ nowcast Kp','Kp estimado de GFZ','Kp estimé par GFZ']);
function currentSignal(live,now=Date.now(),online=navigator.onLine){
 const valid=online&&live?.usable===true&&Number.isFinite(live.kp)&&live.kp>=0&&live.kp<=9&&Number.isFinite(live.expiresAt)&&now<=live.expiresAt;
 return {kp:valid?live.kp:null,provider:valid?live.provider:null,provisional:valid&&!!live.provisional,observedAt:valid?live.expiresAt-(live.provisional?.5:6)*3600000:null};
}
function renderSignals(root,ds,result){
 const buttons=root.querySelectorAll('[data-p0-signals]>button');if(buttons.length!==3)return;
 const info=currentSignal(typeof currentKpAuthority==='function'?currentKpAuthority():null),dl=window.SRDayLineView?.snapshot();
 const states={fresh:'Формульні дані актуальні',loading:'Оновлюємо дані…',error:'Не вдалося оновити дані',missing:'Формульні дані відсутні',invalid:'Годинник пристрою розходиться з часом джерела',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних'};
 const kpSource=info.provider==='gfz'?'Оцінка Kp GFZ':info.provisional?'Попередній Kp NOAA':'Спостереження';
 const kpHeading=info.provider==='gfz'||info.provisional?kpSource:'NOAA';
 // FP569j: with no fresh observation, show the fresh NOAA 3-day forecast for this day (display only; the score already uses it).
 let fc=null;if(info.kp===null){try{const r=window.fp469ConsumerForDate?.({ds}),st=(r?.consumer?.formula||r?.consumer)?.state,ch=r?.feed?.channels?.source_formula,v=ch?.kp_daily_max??ch?.kp_input?.kp;if(st==='fresh'&&ch?.kp_source==='NOAA_3day_slots'&&Number.isFinite(v))fc=v;}catch(_){}}
 const fcText=fc===null?'':'Kp '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(fc)+(fc>=5?' · G'+Math.min(5,Math.floor(fc)-4):'');
 const kp=info.kp===null?(fc===null?tr('Kp — немає актуальних даних'):fcText+' · '+tr('прогноз NOAA, 3 дні')+' · '+tr('спостереження немає')):'Kp '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(info.kp)+' · '+tr(kpSource);
 const score=SkyScore.formatScore(result?.available?result.score:null);
 const scoreSource=tr(result?.authority==='expert_pdf'?'Експертна оцінка':result?.available?'Формула джерела':'Оцінка недоступна');
 const labels=[kp,dl?.date===ds&&dl.status==='available'?dl.initialLabel+' · '+tr('На початок дня'):tr('Календарні дані відсутні'),score+' · '+scoreSource];
 buttons[0].dataset.observedAt=info.observedAt?new Date(info.observedAt).toISOString():'';buttons[0].title=info.observedAt?new Date(info.observedAt).toISOString().replace('T',' ').slice(0,16)+' UTC':tr('Kp — немає актуальних даних');
 buttons.forEach((b,i)=>{
  const accessible=i===0&&info.provider==='gfz'?labels[0]:tr(['Астрономія й NOAA','Панчанга','Оцінка дня'][i])+': '+labels[i];
  b.setAttribute('aria-label',accessible+(i===0?' '+b.title:''));
  const compact=i===0?(info.kp===null?(fc===null?'—':fcText):'Kp '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(info.kp)):i===1?labels[i].split(' · ')[0].replace(/^[^:]+: /,''):score;
  b.replaceChildren(make('span','',tr([kpHeading,'Панчанга','Оцінка дня'][i])),make('strong','',compact));
  if(i===0)b.append(make('small','',info.observedAt?new Date(info.observedAt).toISOString().slice(11,16)+' UTC':fc===null?tr('Kp — немає актуальних даних'):tr('прогноз NOAA, 3 дні')));
  if(i===0)b.dataset.kpForecast=fc===null?'':String(fc);
  if(i===1&&dl?.date===ds&&dl.status==='available')b.append(make('small','',tr('На початок дня')));
  if(i===2)b.append(make('small','',scoreSource));
 });
}
function renderTimeline(root,ds){
 const line=root.querySelector('.sr-dayline');if(!line)return;
 let box=line.querySelector('[data-sky-events]');if(!box){box=make('details','sr-sky-events');box.open=false;box.dataset.skyEvents='';line.querySelector('.sr-dl-story').after(box);}
 const explore=line.querySelector('[data-p0-explore]');if(explore&&box.parentElement!==explore)explore.append(box);
 const snap=window.SRDayLineView?.snapshot();box.replaceChildren();
 if(snap?.date!==ds||snap.status!=='available'){box.hidden=true;return;}box.hidden=false;
 box.append(make('summary','','Хронологія неба'),make('p','sr-dl-muted',tr('Розраховані події')+' · '+({uk:'місцевий час',en:'local time',es:'hora local',fr:'heure locale'}[window.NRLocale?.language||'uk'])));const list=make('ol','');
 const fmt=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{timeZone:snap.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 for(const e of snap.events){const li=make('li',''),time=make('time','',fmt.format(new Date(e.at)));time.dateTime=e.at;li.append(time);const label=make(Number.isInteger(e.index)?'button':'span','',e.label);if(label.tagName==='BUTTON'){label.type='button';label.onclick=()=>window.SRDayLineView.openEvent(e.index);}li.append(label);list.append(li);}box.append(list);
}
function paintRing(root,result){const el=root.querySelector('.nr-o-score');if(!el)return;const value=result?.available&&SkyScore.isValidFinal(result.score)?result.score:null;el.dataset.ring=value===null?'missing':value===0?'zero':'value';el.style.setProperty('--score-arc',(value===null?0:Math.abs(value)*120)+'deg');el.style.setProperty('--score-color',SkyScore.color(value));}
window.addEventListener('sr:dayline-ready',()=>{const root=document.querySelector('[data-overview=today]'),ds=root?.querySelector('select')?.value;if(ds){renderTimeline(root,ds);renderSignals(root,ds,resolvedFor(ds).consumer);}});
const APPEARANCE_KEY='srAppearanceV1';let appearance='cosmos',appearanceSaved=true;
try{const value=localStorage.getItem(APPEARANCE_KEY);if(['cosmos','observatory'].includes(value))appearance=value;}catch(_){}
document.documentElement.dataset.srAppearance=appearance;
function appearanceControl(section){
 const lang=window.NRLocale?.language||'uk',copy={uk:['Тло','Космос','Зоряне тло, тепле світло й виразні образи.','Обсерваторія','Спокійне тло, чіткі картки й акцент на даних.','Вибір діє лише в цьому сеансі: не вдалося зберегти.'],en:['Background','Cosmos','Starry scenery, warm light and expressive imagery.','Observatory','Quiet background, clear cards and a focus on data.','This choice applies only to this session: saving failed.'],es:['Fondo','Cosmos','Fondo estrellado, luz cálida e imágenes expresivas.','Observatorio','Fondo tranquilo, tarjetas claras y atención a los datos.','La elección solo se aplica a esta sesión: no se pudo guardar.'],fr:['Fond','Cosmos','Ciel étoilé, lumière chaude et images expressives.','Observatoire','Fond sobre, cartes lisibles et priorité aux données.','Choix valable pour cette session uniquement : enregistrement impossible.']}[lang];
 let field=section.querySelector('[data-appearance]');if(!field){field=make('fieldset','sr-appearance');field.dataset.appearance='';field.append(make('legend'));for(const value of ['cosmos','observatory']){const label=make('label'),input=make('input'),text=make('span');input.type='radio';input.name='sr-appearance';input.value=value;text.append(make('strong'),make('small'));label.append(input,text);field.append(label);input.onchange=()=>{if(!input.checked)return;appearance=value;document.documentElement.dataset.srAppearance=value;try{localStorage.setItem(APPEARANCE_KEY,value);appearanceSaved=true;}catch(_){appearanceSaved=false;}appearanceControl(section);};}const status=make('p');status.dataset.appearanceStatus='';status.setAttribute('role','status');field.append(status);section.append(field);}
 field.querySelector('legend').textContent=copy[0];for(const [i,input]of [...field.querySelectorAll('input')].entries()){input.checked=input.value===appearance;input.nextElementSibling.querySelector('strong').textContent=copy[1+i*2];input.nextElementSibling.querySelector('small').textContent=copy[2+i*2];}field.querySelector('[data-appearance-status]').textContent=appearanceSaved?'':copy[5];
}

const dataQuery=matchMedia('(prefers-reduced-data: reduce)'),motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let motionWanted=true,decorWanted=false,motionSaved=true;
function readMotion(){try{motionWanted=localStorage.getItem('srSkyBackgroundMotionV1')!=='off';decorWanted=localStorage.getItem('srSkyDecorMotionV1')==='on';}catch(_){}}
readMotion();
function updateMotion(){
 const reduced=motionQuery.matches||dataQuery.matches||!!navigator.connection?.saveData,lang=window.NRLocale?.language||'uk';
 const motionOn=motionWanted&&!reduced&&!document.hidden;
 document.documentElement.classList.toggle('sr-sky-motion',motionOn);
 // Background effects do not encode data. Planet/day transitions remain governed by the master control.
 document.documentElement.classList.toggle('sr-decor-motion',motionOn&&decorWanted);
 for(const b of document.querySelectorAll('[data-sky-motion]')){b.textContent=({uk:'Анімації',en:'Animations',es:'Animaciones',fr:'Animations'})[lang];b.setAttribute('aria-pressed',String(motionWanted));b.disabled=reduced;}
 for(const b of document.querySelectorAll('[data-sky-decor-motion]')){b.textContent=({uk:'Фоновий рух',en:'Background motion',es:'Movimiento del fondo',fr:'Mouvement du fond'})[lang];b.setAttribute('aria-pressed',String(decorWanted));b.disabled=reduced||!motionWanted;}
 for(const p of document.querySelectorAll('[data-motion-note]'))p.textContent=({uk:'Фоновий рух додає мерехтіння зірок і рух тла. Положення планет та фаза Місяця залишаються видимими без анімацій.',en:'Background motion adds star twinkle and scenery movement. Planetary positions and the Moon phase stay visible with animations off.',es:'El movimiento del fondo añade destellos de estrellas y movimiento del paisaje. Las posiciones planetarias y la fase lunar siguen visibles sin animaciones.',fr:'Le mouvement du fond ajoute le scintillement des étoiles et le mouvement du décor. Les positions planétaires et la phase lunaire restent visibles sans animations.'})[lang];
 for(const p of document.querySelectorAll('[data-motion-status]'))p.textContent=motionSaved?'':({uk:'Вибір діє лише в цьому сеансі: не вдалося зберегти.',en:'This choice applies only to this session: saving failed.',es:'La elección solo se aplica a esta sesión: no se pudo guardar.',fr:'Choix valable pour cette session uniquement : enregistrement impossible.'})[lang];
}
function motionControl(details){
 if(details.id==='nrRoute-more'){
  let section=details.querySelector('[data-motion-settings]');
  if(!section){section=make('section','nr-card');section.dataset.motionSettings='';section.append(make('h2'));const grid=details.querySelector('#fp434MoreGrid');if(grid)grid.before(section);else details.append(section);}
  section.querySelector('h2').textContent=({uk:'Вигляд і рух',en:'Appearance and motion',es:'Aspecto y movimiento',fr:'Apparence et mouvement'}[window.NRLocale?.language||'uk']);details=section;appearanceControl(section);
 }
 for(const [attr,key]of [['skyMotion','srSkyBackgroundMotionV1'],['skyDecorMotion','srSkyDecorMotionV1']]){
  const selector=attr==='skyMotion'?'[data-sky-motion]':'[data-sky-decor-motion]';
  if(details.querySelector(selector))continue;
  const b=make('button');b.type='button';b.dataset[attr]='';b.style.minHeight='44px';b.style.margin='12px 8px 0 0';
  b.onclick=()=>{if(attr==='skyMotion')motionWanted=!motionWanted;else decorWanted=!decorWanted;
   try{localStorage.setItem(key,(attr==='skyMotion'?motionWanted:decorWanted)?'on':'off');motionSaved=true;}catch(_){motionSaved=false;}updateMotion();};details.append(b);
 }
 for(const attr of ['motionNote','motionStatus']){const selector=attr==='motionNote'?'[data-motion-note]':'[data-motion-status]';if(!details.querySelector(selector)){const p=make('p');p.dataset[attr]='';if(attr==='motionStatus')p.setAttribute('role','status');details.append(p);}}
 updateMotion();
}
window.addEventListener('storage',e=>{if(e.key===null||['srSkyBackgroundMotionV1','srSkyDecorMotionV1'].includes(e.key)){readMotion();updateMotion();}});
motionQuery.addEventListener('change',updateMotion);dataQuery.addEventListener('change',updateMotion);navigator.connection?.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateMotion);
updateMotion();
window.SRP0Layout=Object.freeze({apply,noonKyiv,moon,dataState,signalData,currentSignal,forecastPoints,horizonText});
})();
