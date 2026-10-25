/* Presentation only. All scores remain owned by NRConsumerAuthority.resolveFinal. */
(function(){'use strict';
const COPY=[["Прогноз Kp", "Kp forecast", "Pronóstico Kp", "Prévision Kp"], ["На початок дня", "At the start of the day", "Al inicio del día", "Au début du jour"], ["Хронологія неба", "Sky timeline", "Cronología del cielo", "Chronologie du ciel"], ["Розраховані події", "Calculated events", "Eventos calculados", "Événements calculés"], ["Календарні дані відсутні", "Calendar data unavailable", "Datos de calendario no disponibles", "Données du calendrier indisponibles"], ["Рух тла", "Background motion", "Movimiento del fondo", "Animation du fond"],["День", "Day", "Día", "Jour"], ["Тиждень", "Week", "Semana", "Semaine"], ["Місяць — згодом", "Month — later", "Mes — próximamente", "Mois — à venir"], ["Попередній місяць", "Previous month", "Mes anterior", "Mois précédent"], ["Наступний місяць", "Next month", "Mes siguiente", "Mois suivant"], ["Порівняти до трьох дат", "Compare up to three dates", "Comparar hasta tres fechas", "Comparer jusqu’à trois dates"], ["Додати обрану дату", "Add selected date", "Añadir fecha elegida", "Ajouter la date choisie"], ["Прибрати", "Remove", "Quitar", "Retirer"], ["Надані складові", "Provided components", "Componentes proporcionados", "Composantes fournies"], ["Детально: джерела, розрахунок і календар", "Details: sources, calculation and calendar", "Detalles: fuentes, cálculo y calendario", "Détails : sources, calcul et calendrier"], ["Усі події, час і традиційні образи", "All events, times and traditional imagery", "Eventos, horarios e imágenes tradicionales", "Événements, horaires et images traditionnelles"], ["Астрономія й NOAA", "Astronomy and NOAA", "Astronomía y NOAA", "Astronomie et NOAA"], ["Панчанга", "Panchanga", "Panchanga", "Panchanga"], ["Оцінка дня", "Day score", "Puntuación del día", "Note du jour"], ["Формульні дані актуальні", "Formula data are current", "Datos de la fórmula actualizados", "Données de formule à jour"], ["Формульні дані застаріли", "Formula data are stale", "Datos de la fórmula obsoletos", "Données de formule périmées"], ["Офлайн: перевірте час збережених даних", "Offline: check the saved data timestamp", "Sin conexión: compruebe la fecha de los datos guardados", "Hors ligne : vérifiez la date des données enregistrées"], ["Оновлюємо дані…", "Updating data…", "Actualizando datos…", "Mise à jour des données…"], ["Формульні дані відсутні", "Formula data are missing", "Faltan datos de la fórmula", "Données de formule absentes"], ["Не вдалося оновити дані", "Could not update data", "No se pudieron actualizar los datos", "Impossible de mettre à jour les données"], ["Спробувати ще", "Try again", "Reintentar", "Réessayer"], ["Дата · Київ", "Date · Kyiv", "Fecha · Kyiv", "Date · Kyiv"], ["Розрахована фаза Місяця", "Calculated Moon phase", "Fase lunar calculada", "Phase lunaire calculée"], ["зростає", "waxing", "creciente", "croissante"], ["спадає", "waning", "menguante", "décroissante"], ["Місяць: освітлено", "Moon: illuminated", "Luna: iluminada", "Lune : éclairée"], ["Теми дня за календарем джерела:", "Day themes from the source calendar:", "Temas del día según el calendario fuente:", "Thèmes du jour selon le calendrier source :"], ["Перегляньте календарні теми й підстави оцінки дня.", "Explore calendar themes and the reasons for the day score.", "Consulte los temas del calendario y los motivos de la puntuación.", "Consultez les thèmes du calendrier et les raisons de la note."], ["Актуальної оцінки немає. Порожнє значення не означає нейтральний день.", "No current score. A missing value does not mean a neutral day.", "No hay puntuación actual. Un valor ausente no indica un día neutro.", "Aucune note actuelle. Une valeur absente ne signifie pas un jour neutre."], ["Джерело: експертна оцінка", "Source: expert assessment", "Fuente: valoración experta", "Source : évaluation experte"], ["Джерело: формула календаря", "Source: calendar formula", "Fuente: fórmula del calendario", "Source : formule du calendrier"], ["Оцінка недоступна", "Score unavailable", "Puntuación no disponible", "Note indisponible"], ["Експертна оцінка", "Expert assessment", "Valoración experta", "Évaluation experte"], ["Формула джерела", "Source formula", "Fórmula de la fuente", "Formule de la source"], ["▲ Позитивна · ● Нейтральна · ▼ Негативна · ○ Немає оцінки", "▲ Positive · ● Neutral · ▼ Negative · ○ No score", "▲ Positiva · ● Neutra · ▼ Negativa · ○ Sin puntuación", "▲ Positive · ● Neutre · ▼ Négative · ○ Sans note"], ["Три складові дня", "Three parts of the day", "Tres aspectos del día", "Trois aspects du jour"]];
function tr(text){let value=String(text),idx={uk:0,en:1,es:2,fr:3}[window.NRLocale?.language]||0;if(!idx)return value;for(const row of [...COPY].sort((a,b)=>b[0].length-a[0].length))value=value.split(row[0]).join(row[idx]);return window.NRLocale?.text(value)||value;}
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=tr(text);return e;};
function noonKyiv(ds){let d=new Date(ds+'T12:00:00Z');const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(d));return new Date(d.getTime()+(12-h)*3600000);}
COPY.push(['Оцінки за днями','Daily scores','Puntuaciones por día','Notes par jour'],['Окремі денні оцінки. Риска означає відсутні дані; 0 — нейтральну оцінку.','Separate daily scores. A dash means missing data; 0 means neutral.','Puntuaciones diarias independientes. Una raya indica datos ausentes; 0 significa neutral.','Notes quotidiennes distinctes. Un tiret indique une donnée absente ; 0 signifie neutre.']);
// Only geometry: final-score authority and rounding remain in the resolver.
function forecastPoints(entries){return entries.map((entry,i)=>{const c=entry.consumer,score=c?.available===true&&SkyScore.isValidFinal(c.score)?c.score:null;return {date:entry.date,score,authority:c?.authority||null,x:entries.length===1?190:46+i*288/(entries.length-1),y:score===null?null:100-score*23};});}
COPY.push(['NOAA: Kp із прогнозу з кроком 3 години','NOAA: Kp from a forecast in 3-hour steps','NOAA: Kp de una previsión en intervalos de 3 horas','NOAA : Kp issu de prévisions par pas de 3 heures'],['NOAA: орієнтир на 27 днів','NOAA: 27-day outlook','NOAA: perspectiva de 27 días','NOAA : perspectives à 27 jours'],['Дата випуску не вказана','Issue date not provided','Fecha de emisión no indicada','Date de publication non indiquée']);
function horizonText(source){
 if(source?.kp_source==='NOAA_3day_slots')return tr('NOAA: Kp із прогнозу з кроком 3 години');
 if(source?.kp_source!=='NOAA_27day_outlook')return '';
 const stamp=source.kp_input?.issued_at,valid=typeof stamp==='string'&&Number.isFinite(Date.parse(stamp));
 return tr('NOAA: орієнтир на 27 днів')+' · '+(valid?new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{dateStyle:'short',timeZone:'UTC'}).format(new Date(stamp)):tr('Дата випуску не вказана'));
}
function renderForecastGraph(root){
 const host=root.querySelector('.nr-o-horizon-list');if(!host)return;
 let figure=root.querySelector('[data-forecast-graph]');if(!figure){figure=make('figure','sr-forecast-graph');figure.dataset.forecastGraph='';host.before(figure);}
 const points=forecastPoints([...host.querySelectorAll('[data-day]')].filter(b=>!b.hidden).map(b=>({date:b.dataset.day,consumer:resolvedFor(b.dataset.day).consumer})));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 225');svg.setAttribute('role','img');
 const node=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 const descriptions=points.map(p=>p.date+': '+SkyScore.describe(p.score)+' · '+tr(p.score===null?'Оцінка недоступна':p.authority==='expert_pdf'?'Експертна оцінка':'Формула джерела'));
 svg.setAttribute('aria-label',tr('Оцінки за днями')+'. '+descriptions.join('; '));
 for(const score of [3,0,-3]){const y=100-score*23;node('line',{x1:30,y1:y,x2:350,y2:y,stroke:score===0?'#8fa2c6':'#435575','stroke-dasharray':score===0?'none':'3 5'});node('text',{x:4,y:y+4,fill:'#c7d4ec','font-size':12},score>0?'+'+score:String(score));}
 for(const p of points){const color=SkyScore.color(p.score),g=node('g',{'data-date':p.date,'data-score':p.score===null?'missing':p.score});
  const add=(tag,attrs,text)=>{const e=node(tag,attrs,text);g.append(e);};
  if(p.score===null)add('text',{x:p.x,y:105,'text-anchor':'middle',fill:color,'font-size':20},'—');
  else{if(p.score!==0)add('line',{x1:p.x,y1:100,x2:p.x,y2:p.y,stroke:color,'stroke-width':5,'stroke-linecap':'round',opacity:.65});add('circle',{cx:p.x,cy:p.y,r:5,fill:color,stroke:'#101a30','stroke-width':2});add('text',{x:p.x,y:p.y+(p.score<0?19:-12),'text-anchor':'middle',fill:color,'font-size':13,'font-weight':700},SkyScore.formatScore(p.score));}
  add('text',{x:p.x,y:218,'text-anchor':'middle',fill:'#dce6fa','font-size':12},p.date.slice(8)+'.'+p.date.slice(5,7));
 }
 figure.replaceChildren(make('figcaption','','Оцінки за днями'),svg,make('p','','Окремі денні оцінки. Риска означає відсутні дані; 0 — нейтральну оцінку.'));
}
function moon(at){
 const {k,waxing}=SkyMoon.moonIllumination(at),r=35,c=40,rx=r*Math.abs(2*k-1),limb=waxing?1:0,term=k>=.5?(waxing?1:0):(waxing?0:1),pct=Math.round(k*100),id='srMoon'+(++moonSerial);
 const d=`M${c},${c-r} A${r},${r} 0 0 ${limb} ${c},${c+r} A${rx.toFixed(3)},${r} 0 0 ${term} ${c},${c-r} Z`;
 return `<svg viewBox="0 0 80 80" role="img" aria-label="Місяць: освітлено ${pct}%, ${waxing?'зростає':'спадає'}" data-moon-k="${k}" data-moon-waxing="${waxing}"><defs><radialGradient id="${id}lit" cx="62%" cy="38%" r="75%"><stop stop-color="#fff8e6"/><stop offset=".55" stop-color="#f3e9cf"/><stop offset="1" stop-color="#b8ab8c"/></radialGradient><radialGradient id="${id}dark"><stop stop-color="#2c3a66"/><stop offset="1" stop-color="#161f3d"/></radialGradient><clipPath id="${id}clip"><path d="${d}"/></clipPath></defs><circle cx="40" cy="40" r="35" fill="url(#${id}dark)"/><path d="${d}" fill="url(#${id}lit)"/><g clip-path="url(#${id}clip)" fill="#827958" opacity=".19"><circle cx="29" cy="32" r="6"/><circle cx="47" cy="26" r="3.5"/><circle cx="52" cy="46" r="5"/><circle cx="38" cy="53" r="4"/><circle cx="25" cy="47" r="3"/><circle cx="43" cy="40" r="2"/></g></svg><span>${pct}% · ${waxing?'зростає':'спадає'}<small>Розрахована фаза Місяця</small></span>`;
}
let moonSerial=0;
function atmosphere(at,ds){
 document.documentElement.classList.add('wow');
 if(!document.querySelector('.wow-sky')){const sky=make('div','wow-sky');sky.setAttribute('aria-hidden','true');let seed=11;const rand=()=>((seed=(seed*9301+49297)%233280)/233280);let dots='';for(let i=0;i<200;i++){dots+=`<circle cx="${(rand()*100).toFixed(2)}%" cy="${(rand()*100).toFixed(2)}%" r="${i%13===0?1.5:.8}" fill="#eef3ff" opacity="${(.2+rand()*.55).toFixed(2)}" class="${i%7===0?'tw':''}" style="--d:7s;--dl:${i%5}s"/>`;}sky.innerHTML='<svg class="layer2" aria-hidden="true">'+dots+'</svg>';document.body.prepend(sky);}
 const header=document.querySelector('body>header')||document.getElementById('headerTitle')?.closest('header');if(!header)return;
 let box=header.querySelector('.wow-header-moon');if(!box){box=make('div','wow-header-moon');box.setAttribute('translate','no');header.append(box);}box.innerHTML=tr(moon(at));box.dataset.date=ds;box.title=ds+' · '+at.toISOString();const caption=box.querySelector('span');caption?.append(make('small','',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'Europe/Kyiv'}).format(at)));
}

const compared=new Set();
function resolvedFor(ds){return window.fp469ConsumerForDate?.({ds})||{consumer:{score:null,available:false}};}
function paintScore(node,result){const v=result?.available?result.score:null,kind=SkyScore.scoreClass(v),sem=SkyScore.SEMANTIC[kind];node.dataset.scoreTone=kind;node.textContent=sem.icon+' '+SkyScore.formatScore(v);node.setAttribute('aria-label',SkyScore.describe(v));}
function pick(root,ds){const select=root.querySelector('select');if(!select)return;if(![...select.options].some(x=>x.value===ds))select.add(new Option(ds,ds));select.value=ds;select.dispatchEvent(new Event('change',{bubbles:true}));}
function extras(root,ds){
 const route=root.dataset.overview;
 for(const btn of root.querySelectorAll('[data-day]')){const value=resolvedFor(btn.dataset.day).consumer;btn.dataset.scoreTone=SkyScore.scoreClass(value?.available?value.score:null);for(const number of btn.querySelectorAll('strong')){number.dataset.scoreTone=btn.dataset.scoreTone;number.style.setProperty('color',SkyScore.color(value?.available?value.score:null),'important');number.setAttribute('aria-label',SkyScore.describe(value?.available?value.score:null));}}
 if(route==='forecast'){
  const list=root.querySelector('.nr-o-horizon-list');
  const week=Array.from({length:7},(_,i)=>new Date(Date.parse(ds+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  for(const date of week)if(list&&![...list.querySelectorAll('[data-day]')].some(b=>b.dataset.day===date)){const b=make('button','');b.type='button';b.dataset.day=date;b.setAttribute('aria-pressed',String(date===ds));b.onclick=()=>pick(root,date);list.append(b);}
  if(list)list.append(...[...list.querySelectorAll('[data-day]')].sort((a,b)=>a.dataset.day.localeCompare(b.dataset.day)));
  for(const b of root.querySelectorAll('.nr-o-horizon-list [data-day]')){const own=resolvedFor(b.dataset.day),value=own.consumer,date=make('span','sr-forecast-date',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(b.dataset.day+'T12:00:00Z'))),score=make('strong','');paintScore(score,value);score.style.color=SkyScore.color(value?.available?value.score:null);const source=tr(value?.authority==='expert_pdf'?'Експертна оцінка':value?.available?'Формула джерела':'Оцінка недоступна');const state=dataState(value),copy={fresh:'Формульні дані актуальні',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних',missing:'Формульні дані відсутні',loading:'Оновлюємо дані…',error:'Не вдалося оновити дані'};b.replaceChildren(date,score,make('small','',source+' · '+tr(copy[state])+(horizonText(own.feed?.channels?.source_formula)?' · '+horizonText(own.feed.channels.source_formula):'')));}

  let controls=root.querySelector('[data-p0-forecast-tabs]');if(!controls){controls=make('div','sr-p0-tabs');controls.dataset.p0ForecastTabs='';for(const [name,count]of [['День',1],['Тиждень',7]]){const b=make('button','',name);b.type='button';b.onclick=()=>{root.dataset.forecastCount=String(count);extras(root,root.querySelector('select')?.value||ds);};controls.append(b);}const month=make('button','','Місяць — згодом');month.disabled=true;controls.append(month);root.querySelector('.nr-o-horizon-list')?.before(controls);}
  controls.querySelectorAll('button').forEach((b,i)=>b.textContent=tr(['День','Тиждень','Місяць — згодом'][i]));
  [...root.querySelectorAll('.nr-o-horizon-list [data-day]')].forEach(b=>b.hidden=Number(root.dataset.forecastCount||7)===1?b.dataset.day!==ds:!week.includes(b.dataset.day));
  controls.querySelectorAll('button').forEach((b,i)=>{if(i<2)b.setAttribute('aria-pressed',String(Number(root.dataset.forecastCount||7)===[1,7][i]));});
  renderForecastGraph(root);
 }
 if(route!=='calendar')return;
 let box=root.querySelector('[data-p0-month]');if(!box){box=make('section','sr-p0-month');box.dataset.p0Month='';root.querySelector('.nr-o-hero').after(box);}
 const key=box.dataset.month||ds.slice(0,7);box.dataset.month=key;const [y,m]=key.split('-').map(Number),count=new Date(Date.UTC(y,m,0)).getUTCDate(),offset=(new Date(key+'-01T12:00:00Z').getUTCDay()+6)%7;
 box.replaceChildren();const header=make('div','sr-p0-month-head');for(const [text,delta]of [['‹',-1],[new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z')),0],['›',1]]){const e=make(delta?'button':'h2','',text);if(delta){e.type='button';e.setAttribute('aria-label',tr(delta<0?'Попередній місяць':'Наступний місяць'));e.onclick=()=>{box.dataset.month=new Date(Date.UTC(y,m-1+delta,1,12)).toISOString().slice(0,7);extras(root,ds);};}header.append(e);}box.append(header);
 const grid=make('div','sr-p0-month-grid');for(let d=5;d<=11;d++)grid.append(make('span','',new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,d)))));for(let i=0;i<offset;i++)grid.append(make('span',''));
 for(let d=1;d<=count;d++){const date=key+'-'+String(d).padStart(2,'0'),result=resolvedFor(date).consumer,b=make('button','');b.type='button';b.dataset.calendarDate=date;b.append(make('span','',String(d)));const val=make('strong','sr-p0-value');paintScore(val,result);const words=val.textContent.split(' ');val.replaceChildren(...words.map(word=>make('span','',word)));b.append(val);b.setAttribute('aria-label',date+' · '+SkyScore.describe(result?.available?result.score:null));b.setAttribute('aria-pressed',String(date===ds));b.onclick=()=>pick(root,date);grid.append(b);}box.append(grid,make('p','sr-p0-legend','▲ Позитивна · ● Нейтральна · ▼ Негативна · ○ Немає оцінки'));
 let compare=root.querySelector('[data-p0-compare]');if(!compare){compare=make('section','sr-p0-compare');compare.dataset.p0Compare='';box.after(compare);}compare.replaceChildren(make('h2','','Порівняти до трьох дат'));
 const add=make('button','','Додати обрану дату');add.type='button';add.disabled=compared.size>=3||compared.has(ds);add.onclick=()=>{compared.add(ds);extras(root,ds);};compare.append(add);
 for(const date of compared){const data=resolvedFor(date),card=make('article','sr-p0-compare-card');card.append(make('h3','',date));const score=make('strong','sr-p0-value');paintScore(score,data.consumer);card.append(score,make('p','',data.consumer?.authority==='expert_pdf'?'Експертна оцінка':data.consumer?.available?'Формула джерела':'Оцінка недоступна'));
 const parts=make('details','');parts.append(make('summary','','Надані складові'));for(const f of data.feed?.channels?.source_formula?.factors||[])parts.append(make('p','',(window.NRConsumerOverview?.factorName?.(f.factor)||String(f.factor))+': '+(Number.isFinite(f.value)?String(f.value).replace('.',','):'—')));card.append(parts);const remove=make('button','','Прибрати');remove.type='button';remove.onclick=()=>{compared.delete(date);extras(root,ds);};card.append(remove);compare.append(card);}
}
function compactForecast(root){
 let details=root.querySelector('[data-forecast-details]');
 if(!details){details=make('details','sr-p0-details');details.dataset.forecastDetails='';details.append(make('summary','','Детально: джерела, розрахунок і календар'));root.append(details);
  root.addEventListener('click',e=>{if(e.target.closest('[data-why],.nr-o-reason-brief'))details.open=true;},true);
 }
 details.querySelector(':scope > summary').textContent=tr('Детально: джерела, розрахунок і календар');
 for(const selector of ['.nr-o-reasons','.nr-o-factors','.nr-o-provenance','.nr-o-context','.nr-o-panch-preview','.nr-o-next','.nr-o-calendar','.nr-o-layers','[data-settings]']){const item=root.querySelector(selector);if(item&&!details.contains(item))details.append(item);}
}
function apply(root,ds,resolved){
 feedStatus(root,ds,resolved);extras(root,ds);paintRing(root,resolved);if(root.dataset.overview==='forecast')compactForecast(root);if(root.dataset.overview!=='today')return;
 root.classList.add('sr-p0-today');const hero=root.querySelector('.nr-o-hero');if(!hero)return;
 let details=root.querySelector(':scope > [data-p0-details]');
 if(!details){details=make('details','sr-p0-details');details.dataset.p0Details='';details.append(make('summary','','Детально: джерела, розрахунок і календар'));root.append(details);}
 let signals=root.querySelector(':scope > [data-p0-signals]');
 if(!signals){signals=make('nav','sr-p0-signals');signals.dataset.p0Signals='';signals.setAttribute('aria-label','Три складові дня');for(const [name,selector]of [['Астрономія й NOAA','.nr-o-spaceweather'],['Панчанга','.nr-o-panch-preview'],['Оцінка дня','.nr-o-reasons']]){const btn=make('button','',name);btn.type='button';btn.onclick=()=>{details.open=true;const target=root.querySelector(selector);target?.scrollIntoView({block:'start'});if(target){target.tabIndex=-1;target.focus({preventScroll:true});}};signals.append(btn);}hero.after(signals);}
 let visual=hero.querySelector('[data-p0-moon]');if(!visual){visual=make('div','sr-p0-moon');visual.dataset.p0Moon='';hero.append(visual);}
 const now=new Date(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),at=ds===today?now:noonKyiv(ds);visual.innerHTML=tr(moon(at));atmosphere(at,ds);visual.dataset.source='astronomy';visual.title='Геоцентричний розрахунок освітленої частки · '+at.toISOString();
 let sentence=hero.querySelector('[data-p0-sentence]');if(!sentence){sentence=make('p','sr-p0-sentence');sentence.dataset.p0Sentence='';hero.append(sentence);}
 const topic=root.querySelector('.nr-o-practical h2')?.textContent;sentence.textContent=resolved.available?(topic?'Теми дня за календарем джерела: '+topic.replace(/[.!?]+$/,'')+'.':'Перегляньте календарні теми й підстави оцінки дня.'):'Актуальної оцінки немає. Порожнє значення не означає нейтральний день.';
 let chip=hero.querySelector('[data-p0-source]');if(!chip){chip=make('button','sr-p0-source');chip.dataset.p0Source='';chip.type='button';chip.onclick=()=>{details.open=true;root.querySelector('[data-score-source]')?.scrollIntoView({block:'center'});};hero.append(chip);}
 chip.textContent=resolved.authority==='expert_pdf'?'Джерело: експертна оцінка':resolved.available?'Джерело: формула календаря':'Оцінка недоступна';
 const label=hero.querySelector(':scope > label');if(label){label.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=tr('Дата · Київ');});label.dataset.p0Date='';}
 // Keep the original accessible route heading, while removing duplicate visual chrome.
 const heading=root.querySelector('.nr-o-heading');if(heading&&heading.parentElement!==root)root.prepend(heading);
 for(const e of [...hero.children])if(!e.matches('[data-p0-date],[data-p0-moon],[data-p0-sentence],.nr-o-verdict,[data-p0-source],.sr-p0-accessible-heading'))details.append(e);
 sentence.textContent=tr(sentence.textContent);chip.textContent=tr(chip.textContent);
 details.querySelector(':scope > summary').textContent=tr('Детально: джерела, розрахунок і календар');
 signals.querySelectorAll('button').forEach((b,i)=>b.textContent=tr(['Астрономія й NOAA','Панчанга','Оцінка дня'][i]));
 const source=root.querySelector('[data-score-source]');if(source)details.prepend(source);
 for(const e of [...root.children])if(e!==hero&&e!==details&&e!==signals&&!e.matches('.sr-dayline,.nr-o-journey,.nr-o-heading,[data-p0-feed-state]'))details.append(e);
 // Hide duplicate weather summaries only by putting them in the existing details; no data are dropped.
 const line=root.querySelector('.sr-dayline');if(line){signals.after(line);let explore=line.querySelector('[data-p0-explore]');if(!explore){explore=make('details','sr-p0-explore');explore.dataset.p0Explore='';explore.append(make('summary','','Усі події, час і традиційні образи'));line.append(explore);}
 for(const selector of ['.sr-dl-actions','label','[data-moment]','figure','[data-events]','[data-method]','[data-scope]']){const item=line.querySelector(':scope > '+selector);if(item)explore.append(item);}}
 const exp=root.querySelector('[data-p0-explore]>summary');if(exp)exp.textContent=tr('Усі події, час і традиційні образи');
 const journey=root.querySelector('.nr-o-journey');if(journey){(line||signals).after(journey);}if(root.lastElementChild!==details)root.append(details);
 renderSignals(root,ds,resolved);renderTimeline(root,ds);motionControl(details);
 // Route-level disclosures retain their own keyboard and deep-link entry points.
}

function dataState(result,load=window.__srConsumerLoadState,online=navigator.onLine){
 if(!online)return 'offline';if(load==='loading')return 'loading';if(load==='error')return 'error';
 const state=(result?.formula||result)?.state;return state==='fresh'?'fresh':state==='stale'?'stale':state==='offline'?'offline':'missing';
}
function feedStatus(root,ds,result){
 let box=root.querySelector('[data-p0-feed-state]');if(!box){box=make('div','sr-p0-feed-state');box.dataset.p0FeedState='';root.prepend(box);}
 const state=dataState(result);box.dataset.state=state;root.setAttribute('aria-busy',String(state==='loading'));box.setAttribute('role',state==='error'?'alert':'status');
 const texts={fresh:'Формульні дані актуальні',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних',loading:'Оновлюємо дані…',missing:'Формульні дані відсутні',error:'Не вдалося оновити дані'};
 box.replaceChildren(make('span','',texts[state]));
 const own=resolvedFor(ds).feed?.channels?.source_formula,stamp=own?.generated_at;
 if(typeof stamp==='string'&&Number.isFinite(Date.parse(stamp)))box.append(make('small','', ' · '+new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(stamp))+' · Europe/Kyiv'));
 if(state==='error'){const retry=make('button','','Спробувати ще');retry.type='button';retry.onclick=()=>window.fp469LoadConsumerForecast?.();box.append(retry);}
}
window.addEventListener('sr:consumer-load',()=>{for(const root of document.querySelectorAll('[data-overview]')){const ds=root.querySelector('select')?.value;if(ds){const result=resolvedFor(ds).consumer;feedStatus(root,ds,result);renderSignals(root,ds,result);}}});
function signalData(result,feed,load=window.__srConsumerLoadState,online=navigator.onLine){
 const state=dataState(result,load,online),own=feed?.channels?.source_formula,kp=own?.kp_input?.kp;
 // A retained DOM label or expert score is never evidence of fresh NOAA data.
 const valid=state==='fresh'&&Number.isFinite(kp)&&kp>=0&&kp<=9&&own?.available===true;
 return {state,kp:valid?kp:null,source:valid?own.kp_source:null};
}
function renderSignals(root,ds,result){
 const buttons=root.querySelectorAll('[data-p0-signals]>button');if(buttons.length!==3)return;
 const info=signalData(result,resolvedFor(ds).feed),dl=window.SRDayLineView?.snapshot();
 const states={fresh:'Формульні дані актуальні',loading:'Оновлюємо дані…',error:'Не вдалося оновити дані',missing:'Формульні дані відсутні',stale:'Формульні дані застаріли',offline:'Офлайн: перевірте час збережених даних'};
 const kp=info.kp===null?tr(states[info.state]):tr('Прогноз Kp')+' '+new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(info.kp);
 const labels=[kp,dl?.date===ds&&dl.status==='available'?dl.initialLabel+' · '+tr('На початок дня'):tr('Календарні дані відсутні'),SkyScore.formatScore(result?.available?result.score:null)+' · '+tr(result?.authority==='expert_pdf'?'Експертна оцінка':result?.available?'Формула джерела':'Оцінка недоступна')];
 buttons.forEach((b,i)=>{b.replaceChildren(make('span','',tr(['Астрономія й NOAA','Панчанга','Оцінка дня'][i])),make('strong','',labels[i]));});
}
function renderTimeline(root,ds){
 const line=root.querySelector('.sr-dayline');if(!line)return;
 let box=line.querySelector('[data-sky-events]');if(!box){box=make('details','sr-sky-events');box.open=matchMedia('(min-width:1024px)').matches;box.dataset.skyEvents='';line.querySelector('.sr-dl-story').after(box);}
 const snap=window.SRDayLineView?.snapshot();box.replaceChildren();
 if(snap?.date!==ds||snap.status!=='available'){box.hidden=true;return;}box.hidden=false;
 box.append(make('summary','','Хронологія неба'),make('p','sr-dl-muted',tr('Розраховані події')+' · '+snap.zone));const list=make('ol','');
 const fmt=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{timeZone:snap.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 for(const e of snap.events){const li=make('li',''),time=make('time','',fmt.format(new Date(e.at)));time.dateTime=e.at;li.append(time);const label=make(Number.isInteger(e.index)?'button':'span','',e.label);if(label.tagName==='BUTTON'){label.type='button';label.onclick=()=>window.SRDayLineView.openEvent(e.index);}li.append(label);list.append(li);}box.append(list);
}
function paintRing(root,result){const el=root.querySelector('.nr-o-score');if(!el)return;const value=result?.available&&SkyScore.isValidFinal(result.score)?result.score:null;el.dataset.ring=value===null?'missing':value===0?'zero':'value';el.style.setProperty('--score-arc',(value===null?0:Math.abs(value)*120)+'deg');el.style.setProperty('--score-color',SkyScore.color(value));}
window.addEventListener('sr:dayline-ready',()=>{const root=document.querySelector('[data-overview=today]'),ds=root?.querySelector('select')?.value;if(ds){renderTimeline(root,ds);renderSignals(root,ds,resolvedFor(ds).consumer);}});
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let motionWanted=false;
try{motionWanted=localStorage.getItem('srSkyBackgroundMotionV1')==='on';}catch(_){}
function updateMotion(){document.documentElement.classList.toggle('sr-sky-motion',motionWanted&&!motionQuery.matches&&!document.hidden&&!navigator.connection?.saveData);for(const b of document.querySelectorAll('[data-sky-motion]')){b.textContent=tr('Рух тла');b.setAttribute('aria-pressed',String(motionWanted));b.disabled=motionQuery.matches||!!navigator.connection?.saveData;}}
function motionControl(details){let b=details.querySelector('[data-sky-motion]');if(!b){b=make('button','');b.type='button';b.dataset.skyMotion='';b.onclick=()=>{motionWanted=!motionWanted;try{localStorage.setItem('srSkyBackgroundMotionV1',motionWanted?'on':'off');}catch(_){}updateMotion();};details.append(b);}updateMotion();}
motionQuery.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateMotion);
window.SRP0Layout=Object.freeze({apply,noonKyiv,moon,dataState,signalData,forecastPoints,horizonText});
})();
