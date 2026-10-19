(function(){
'use strict';
let rows={},selected={},mounted=false,topicFilter='all';
const WEATHER_URL='https://services.swpc.noaa.gov/products/noaa-scales.json';
let weatherData=null,weatherRequest=null,weatherAttempt=0,weatherError=false;
function weatherStatus(data,now=Date.now()){
 const current=data?.['0'],stamp=current?Date.parse(current.DateStamp+'T'+current.TimeStamp+'Z'):NaN;
 if(!Number.isFinite(stamp)||now<stamp||now-stamp>8*3600000)return {state:'unavailable'};
 const level=v=>typeof v==='string'&&/^[0-5]$/.test(v)?Number(v):null;
 const currentLevels=Object.fromEntries(['G','S','R'].map(k=>[k,level(current[k]?.Scale)]));
 if(Object.values(currentLevels).some(v=>v===null))return {state:'unavailable'};
 const day=new Date(now).toISOString().slice(0,10),forecasts=[];
 for(const key of ['1','2','3']){
  const item=data[key],date=item?.DateStamp,g=level(item?.G?.Scale);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<day||date>new Date(now+2*86400000).toISOString().slice(0,10)||g===null)continue;
  const probability=v=>typeof v==='string'&&/^\d{1,3}$/.test(v)&&Number(v)<=100?Number(v):null;
  forecasts.push({date,g,s:probability(item.S?.Prob),rMinor:probability(item.R?.MinorProb),rMajor:probability(item.R?.MajorProb)});
 }
 return {state:'available',stamp,current:currentLevels,forecasts};
}
window.NRSpaceWeather={status:weatherStatus};
function weatherPanel(root){
 let box=root.querySelector('.nr-o-spaceweather');if(!box){box=document.createElement('section');box.className='nr-o-spaceweather nr-o-practical';box.setAttribute('aria-live','polite');root.querySelector('.nr-o-layers').before(box);}
 box.style.display='block';
 const tr=s=>window.NRLocale?.text(s)||s;
 const status=weatherError?{state:'unavailable'}:weatherStatus(weatherData);
 const label=tr('Попередження NOAA · найближчі три доби');
 renderWeatherBrief(root,status,box);
 box.style.borderInlineStart=status.state==='available'&&(Object.values(status.current).some(v=>v>0)||status.forecasts.some(f=>f.g>0))?'4px solid #d99e36':'';
 if(status.state!=='available')box.innerHTML='<h2>'+esc(label)+'</h2><p>'+esc(tr(weatherRequest?'Перевіряємо попередження…':'Попередження недоступні або застарілі. Це не означає відсутності бурі.'))+'</p>';
 else{
  const current=['G','S','R'].map(k=>k+status.current[k]).join(' · ');
  box.innerHTML='<h2>'+esc(label)+'</h2><p><strong>'+esc(tr('Спостерігається: '))+esc(current)+'</strong></p><p>'+esc(tr('G — геомагнітна буря; S — радіаційна буря; R — радіозатемнення. 0 — нижче порога шкали.'))+'</p>'+status.forecasts.map(f=>'<p><strong>'+esc(f.date+' · '+tr('доба UTC')+' · '+tr('Очікується: ')+'G'+f.g)+'</strong><br>'+esc(tr('Імовірність: ')+'S1+: '+(f.s===null?'—':f.s+'%')+' · R1–R2: '+(f.rMinor===null?'—':f.rMinor+'%')+' · R3+: '+(f.rMajor===null?'—':f.rMajor+'%'))+'</p>').join('')+(status.forecasts.length?'':'<p>'+esc(tr('Прогноз попереджень недоступний.'))+'</p>')+'<small>'+esc(tr('Оновлено NOAA: ')+time(new Date(status.stamp).toISOString())+' · Europe/Kyiv')+'</small>';
 }
 box.innerHTML+='<p>'+esc(tr('Очікувана буря не означає, що вона вже почалася. Ці показники не змінюють бал дня.'))+'</p><a href="https://www.swpc.noaa.gov/products/alerts-watches-and-warnings" target="_blank" rel="noopener noreferrer">'+esc(tr('Офіційні повідомлення NOAA'))+'</a>';
 if(!weatherRequest&&Date.now()-weatherAttempt>5*60000){
  weatherAttempt=Date.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  weatherRequest=fetch(WEATHER_URL,{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw Error('NOAA '+r.status);return r.json()}).then(data=>{weatherData=data;weatherError=false;}).catch(()=>{weatherError=true;}).finally(()=>{clearTimeout(timer);weatherRequest=null;document.querySelectorAll('[data-overview]').forEach(weatherPanel);});
 }
}
setInterval(()=>{if(document.visibilityState==='visible')document.querySelectorAll('[data-overview]').forEach(weatherPanel);},60000);
const NAK=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const YOGA=['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
let panchFeedPromise,panchFeedSha='',panchProofPromise;
function panchProof(){return panchProofPromise||(panchProofPromise=fetch('panchanga_reference_check_v1.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null));}

function panchFeed(){return panchFeedPromise||(panchFeedPromise=fetch('panchanga_shadow_feed_v1.json',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);const bytes=await r.arrayBuffer();panchFeedSha=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(new TextDecoder().decode(bytes).replace(/\r\n/g,'\n')))),v=>v.toString(16).padStart(2,'0')).join(''):'';return JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/,''))}).catch(e=>{panchFeedPromise=null;throw e}));}
async function renderPanchPreview(root,ds){
 const box=root.querySelector('.nr-o-panch-values');if(!box)return;box.dataset.date=ds;box.textContent='Завантаження календарних складових…';
 try{
  const feed=await panchFeed();if(box.dataset.date!==ds)return;
  const proof=await panchProof();if(box.dataset.date!==ds)return;const checked=proof&&panchFeedSha&&proof.feed_sha256===panchFeedSha?proof.days?.[ds]:null;
  const sourceMonth=checked?.source_url==='https://packolkata.imd.gov.in/panchang/en/kartika'?'kartika':'asvina';
  const iaeProvenance=checked?.iae?'<br><a href="https://packolkata.imd.gov.in/download/IAE2026.zip" target="_blank" rel="noopener noreferrer">Indian Astronomical Ephemeris 2026</a>: Звірено переходів: '+checked.iae.count+' · найбільша різниця: '+checked.iae.max_abs_seconds.toFixed(1)+' с. Обидва видання — PAC/IMD; це не незалежні джерела.':'';
  const provenance=checked?'<strong>'+ (checked.differences_over_one_minute.length?'Є розбіжність із державним календарем. ':'')+'</strong><a href="https://packolkata.imd.gov.in/panchang/en/'+sourceMonth+'" target="_blank" rel="noopener noreferrer">Rashtriya Panchang · 2026–2027</a>: Звірено переходів: '+checked.count+' · найбільша різниця: '+checked.max_abs_seconds.toFixed(1)+' с.'+iaeProvenance+' Дата звірки — за індійським календарем; моменти переведено в UTC. Це не перевірка прогнозу особистих подій.':'Локальний розрахунковий календар. Звірку цієї дати з державним джерелом ще не виконано.';
  const day=feed.days?.[ds];if(!day||day.timezone!=='Europe/Kyiv')throw Error('date or timezone missing');
  const keys=['tithi','nakshatra','yoga','karana'];
  const starts=keys.map(k=>Date.parse(day.components?.[k]?.segments?.[0]?.start_utc));
  if(starts.some(x=>!Number.isFinite(x)))throw Error('incomplete components');
  const at=ds===today()?Date.now():Math.max(...starts);
  const labels={tithi:'Тітхі · місячний день',nakshatra:'Накшатра · стоянка Місяця',yoga:'Йога · сума довгот',karana:'Карана · півтітхі'};
  const values=keys.map(k=>{const segs=day.components[k].segments;const seg=segs.find(s=>Date.parse(s.start_utc)<=at&&at<Date.parse(s.end_utc));if(!seg)throw Error('uncovered instant');return {key:k,value:seg.value,segs};});
  const weekday=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',weekday:'long'}).format(new Date(ds+'T12:00:00Z'));
  const transitions=values.flatMap(x=>x.segs.slice(1).map(s=>({at:Date.parse(s.start_utc),key:x.key}))).filter(e=>e.at>at).sort((a,b)=>a.at-b.at);
  const next=transitions[0],when=next?new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit'}).format(new Date(next.at)):null;
  box.innerHTML='<p class="nr-o-panch-date">'+esc(dateLabel(ds))+' · '+(ds===today()?'зараз':'на початок календарної доби')+' · Київ</p><dl>'+values.map(x=>'<div><dt>'+labels[x.key]+'</dt><dd>'+esc(x.key==='nakshatra'?NAK[Number(x.value)-1]||x.value:x.key==='yoga'?YOGA[Number(x.value)-1]||x.value:x.value)+'</dd></div>').join('')+'<div><dt>Вара · день тижня</dt><dd>'+esc(weekday)+'</dd></div></dl><p>'+(next?'Найближчий перехід: '+esc(labels[next.key].split(' · ')[0])+' о '+esc(when)+'.':'Подальших переходів у цій добі немає.')+'</p><small class="nr-panch-provenance">'+provenance+'</small>';
  if(window.NRPanchProvenance)box.append(window.NRPanchProvenance.element(feed,[day]));
 }catch(e){if(box.dataset.date===ds)box.textContent='Для обраної дати повні складові недоступні. Значення іншого дня не підставляються.';}
}

function renderWeatherBrief(root,status,full){
 if(!['today','forecast'].includes(root.dataset.overview))return;
 const hero=root.querySelector('.nr-o-hero'),tr=s=>window.NRLocale?.text(s)||s;
 let brief=root.querySelector('[data-weather-brief]');
 if(!brief){brief=document.createElement('button');brief.type='button';brief.dataset.weatherBrief='';brief.className='nr-o-brief nr-o-weather-brief';brief.setAttribute('translate','no');hero.insertBefore(brief,hero.querySelector('[data-panch-countdown]'));brief.onclick=()=>{full.setAttribute('tabindex','-1');full.focus({preventScroll:true});full.scrollIntoView({block:'start'});};}
 let body;
 if(status.state!=='available')body='<span>'+esc(tr(weatherRequest?'Перевіряємо попередження…':'Попередження недоступні або застарілі. Це не означає відсутності бурі.'))+'</span>';
 else{
  const strongest=status.forecasts.reduce((a,b)=>!a||b.g>a.g?b:a,null);
  const issued=NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(status.stamp));
  body='<span>'+esc(tr('Спостерігається: ')+['G','S','R'].map(k=>k+status.current[k]).join(' · '))+'</span><span>'+esc(strongest?tr('Прогноз G · максимум: ')+'G'+strongest.g+' · '+strongest.date+' UTC':tr('Прогноз попереджень недоступний.'))+'</span><small>'+esc(tr('Оновлено NOAA: ')+issued+' UTC')+'</small>';
 }
 brief.dataset.g=status.state==='available'&&Number.isInteger(status.current?.G)?String(status.current.G):'';
 brief.dataset.active=String(status.state==='available'&&(Object.values(status.current).some(v=>v>0)||status.forecasts.some(f=>f.g>0)));
 if(brief.dataset.active==='true'){if(hero.firstElementChild!==brief)hero.prepend(brief)}else if(hero.nextElementSibling!==brief)hero.after(brief);
 /* v5 NR-01: в активному стані заголовок називає сигнал і рівень за шкалою NOAA (G1…G5: слабка…екстремальна); без нових порогів */
 const gNames=['','слабка','помірна','сильна','дуже сильна','екстремальна'],cur=status.current||{},fmax=(status.forecasts||[]).reduce((a,f)=>Math.max(a,Number(f.g)||0),0);
 const title=brief.dataset.active!=='true'?tr('NOAA · попередження та ймовірності'):cur.G>0&&gNames[cur.G]?tr('Геомагнітна буря')+' G'+cur.G+' · '+tr(gNames[cur.G])+' '+tr('(шкала NOAA)'):(cur.S>0||cur.R>0)?tr('Активне попередження NOAA'):tr('Прогноз NOAA: можлива буря')+' G'+fmax;
 brief.dataset.signal=brief.dataset.active!=='true'?'none':cur.G>0?'storm':(cur.S>0||cur.R>0)?'alert':'forecast';
 brief.innerHTML='<strong>'+esc(title)+' →</strong>'+body;
 kpNote(root);
}
// v126: component arithmetic explains the formula, never an expert override.
function reasonCopy(){return ({
 uk:{title:'Складові формули',expert:'Календар і космічна погода',sum:'Сума внесків: ',score:' · бал формули: ',missing:'Актуальний розрахунок формули недоступний.'},
 en:{title:'Formula components',expert:'Calendar and space weather',sum:'Sum of contributions: ',score:' · formula score: ',missing:'The current formula calculation is unavailable.'},
 es:{title:'Componentes de la fórmula',expert:'Calendario y clima espacial',sum:'Suma de aportes: ',score:' · puntuación de la fórmula: ',missing:'El cálculo actual de la fórmula no está disponible.'},
 fr:{title:'Composantes de la formule',expert:'Calendrier et météo spatiale',sum:'Somme des contributions : ',score:' · score de la formule : ',missing:'Le calcul actuel de la formule est indisponible.'}
})[window.NRLocale?.language||'uk']||{title:'Formula components',expert:'Calendar and space weather',sum:'Sum: ',score:' · formula score: ',missing:'Current formula unavailable.'}}
function renderReasonBrief(root,r,strongest,own){
 if(!['today','forecast'].includes(root.dataset.overview))return;
 const hero=root.querySelector('.nr-o-hero'),tr=s=>window.NRLocale?.text(s)||s;
 let brief=root.querySelector('[data-reason-brief]');
 if(!brief){brief=document.createElement('button');brief.type='button';brief.dataset.reasonBrief='';brief.className='nr-o-brief nr-o-reason-brief';brief.setAttribute('translate','no');hero.append(brief);brief.onclick=()=>{const full=root.querySelector('.nr-o-reasons');full.setAttribute('tabindex','-1');full.focus({preventScroll:true});full.scrollIntoView({block:'start'});};}
 const names={Kp:'Геомагнітна складова',Moon:'Пурніма (за календарем)',Eclipse:'Складова затемнення'};
 const formula=r.formula||r,copy=reasonCopy(),usable=formula.available===true;
 brief.innerHTML='<strong>'+esc(r.authority==='expert_pdf'?copy.expert:copy.title)+' ↗</strong>'+(usable&&strongest.length?strongest.map(f=>'<span class="nr-o-brief-factor"><span>'+esc(tr(names[f.factor]||f.factor))+'</span><b>'+esc(fmt(f.value))+'</b></span>').join(''):'<span>'+esc(usable?tr('Ненульових внесків немає.'):copy.missing)+'</span>')+(usable?kpLine(own,tr):'');
}

/* v7.2 NRA-02: явна дія після вичерпання автоповторів (та сама функція завантаження, лічильник скинуто) */
function retryButton(root,status,show){let b=root.querySelector(':scope .nr-o-retry');if(!show){b?.remove();return}const tr=s=>window.NRLocale?.text(s)||s;if(!b){b=document.createElement('button');b.type='button';b.className='nr-btn secondary nr-o-retry';b.onclick=()=>{b.disabled=true;window.fp469RetryConsumerForecast?.()};status.after(b)}b.disabled=false;const t=tr('Повторити');if(b.textContent!==t)b.textContent=t}
/* v7.2 NRA-11: за активної бурі — чим бал відрізняється від поточного спостереження NOAA. Відповідність Kp→G — та сама, що в kpLine; нових порогів немає */
function kpNote(root){const lb=root.querySelector('.nr-o-label');if(!lb)return;root.querySelectorAll('.nr-o-kpnote').forEach(n=>n.remove());const brief=root.querySelector('[data-weather-brief]'),cur=Number(brief?.dataset.g),ds=root.querySelector('select')?.value;if(brief?.dataset.active!=='true'||!(cur>0)||ds!==today())return;const own=rows[ds]?.channels?.source_formula,kp=own?.kp_input?.kp;if(!own?.available||!Number.isFinite(kp))return;const g=kp>=9?5:kp>=8?4:kp>=7?3:kp>=6?2:kp>=5?1:0,tr=s=>window.NRLocale?.text(s)||s;const n=document.createElement('small');n.className='nr-o-kpnote';n.setAttribute('translate','no');const when=Number.isFinite(Date.parse(own.generated_at))?NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(own.generated_at)):'—';n.textContent=tr('Бал розраховано ')+when+tr(' з Kp макс. ')+String(Number(kp.toFixed(2)))+' (G'+g+')'+tr('; поточне спостереження NOAA G')+cur+tr(' показано окремо; бал використовує прогнозний Kp.');lb.append(n)}
function kpLine(own,tr){const kp=own?.kp_input?.kp;if(!Number.isFinite(kp))return '';const g=kp>=9?5:kp>=8?4:kp>=7?3:kp>=6?2:kp>=5?1:0;const src=own.kp_source==='NOAA_27day_outlook'?tr(' · NOAA outlook від ')+String(own.kp_input.issued_at||'').slice(0,10):tr(' · NOAA 3-годинний прогноз');return '<small data-kp-line>'+esc(tr('Kp макс. ')+String(Number(kp.toFixed(2)))+' (G'+g+')'+src)+'</small>';}
function fmt(value){if(!Number.isFinite(value))return '—';const n=Number(value.toFixed(2));return n<0?'−'+Math.abs(n):n>0?'+'+n:'0';}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'});
const dateFormatters=new Map();
const timeFormatter=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const today=()=>todayFormatter.format(new Date());
const dateLabel=ds=>{const locale=window.NRLocale?.locale||'uk-UA';let formatter=dateFormatters.get(locale);if(!formatter){formatter=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Kyiv',day:'numeric',month:'long'});dateFormatters.set(locale,formatter)}return formatter.format(new Date(ds+'T12:00:00Z'))};
const time=s=>Number.isFinite(Date.parse(s))?timeFormatter.format(new Date(s)):'не вказано';
const stateLabel=(r,ds)=>r.state==='fresh'&&rows[ds]?.channels?.source_formula?.kp_source==='NOAA_27day_outlook'?'Орієнтир · outlook NOAA від '+String(rows[ds].channels.source_formula.kp_input?.issued_at||'').slice(0,10):states[r.state];
const states={expert:'Експертна правка (PDF) · найвищий пріоритет',fresh:'Дані актуальні',offline:'Офлайн · збережені дані',stale:'Дані застаріли',missing:'Недостатньо даних',invalid:'Час джерела не підтверджено'};
const dayRange=()=>Array.from({length:27},(_,i)=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
function resolve(ds){return NRConsumerAuthority.resolveFinal(rows[ds],ds,Date.now(),!navigator.onLine||window.__nrConsumerCached===true);}
function factorName(f){if(f==='Kp')return 'Геомагнітна складова (2 − Kp максимум)';if(f==='Moon')return 'Пурніма (за календарем)';if(f==='Eclipse')return 'Складова затемнення';const reviewedLegend={"Серце":["позначка підтримки нових починань у трактуванні джерела",15],"Екадаші":["традиційний день пожертви й посту; не рекомендація обмежувати харчування",14],"Пітру Пакша":["період вшанування предків; джерело застерігає від нових матеріальних справ",17],"Наваратрі":["свято вшанування Богині-Матері",17],"1 місячний день":["планування й постановка цілей",14],"Мішень":["планування й постановка цілей",14],"Амавасья, день мертвих":["30-й місячний день; вшанування померлих родичів",14],"День порожні руки, несприятливий":["застереження джерела щодо нових справ; тема прибирання й очищення",14],"Сурья Санкранті Перехід Сонця із знаку в інший":["перехід Сонця між знаками; застереження джерела щодо нових проєктів",14],"Тричі  трикутник":["застереження джерела про повторення роботи тричі",15],"Ромб":["застереження джерела про повторення роботи",15],"Зелена печатка":["позначка нових починань у трактуванні джерела",15],"День Божого провидіння":["позначка нових починань у трактуванні джерела; заявлену ним імовірність успіху не підтверджено",15],"Рука":["увага до подій дня",15],"Гучномовець":["реклама й маркетингові проєкти",15],"Віджая дашамі":["свято, пов’язане в джерелі з починаннями",14],"Акаша трітья":["позначка починань у трактуванні джерела",14],"Гуру Пурніма":["вшанування вчителів і вдячність",16],"Прадош врат":["традиційний піст і вшанування Шиви",16],"Санкашті":["традиційне вшанування Ганеші",16],"Ганеша чатуртхі":["свято народження Ганеші",16],"Вінаяка":["традиційне вшанування Ганеші",17],"Діпавалі":["свято світла й добра",17],"Махашиваратрі":["ніч вшанування Шиви",16],"Масік Шиваратрі":["традиційний піст на честь Шиви",16],"Савана Сомвара":["цикл шістнадцяти понеділків; назву зіставлено з Солах Сомвара Врат",16],"Шприц":["позначка хірургічних втручань у джерелі; не медична рекомендація",16]};if(Object.hasOwn(reviewedLegend,f)){const [text,page]=reviewedLegend[f];return f+' — '+text+' (легенда джерела, с. '+page+')';}const legend={'Хрест':'відвідування лікаря й початок лікування; позначка календаря, не медична рекомендація','Книги':'початок навчання','Сукня':'перше вдягання нового одягу','Таблетка':'лікування; позначка календаря, не обіцянка одужання'};if(Object.hasOwn(legend,f))return f+' — '+legend[f]+' (легенда джерела, с. '+(f==='Книги'?'15':'16')+')';return f;}

function theme(value){
 const choice=['auto','light','dark'].includes(value)?value:'auto';
 document.documentElement.dataset.nrTheme=choice;
 document.documentElement.style.colorScheme=choice==='auto'?'light dark':choice;
 const control=document.getElementById('nrThemeChoice');if(control)control.value=choice;
}
function settings(){
 if(document.getElementById('nrThemeChoice'))return;
 const host=document.getElementById('nrRoute-profile');if(!host)return;
 const box=document.createElement('section');box.className='nr-overview nr-o-settings';
 box.innerHTML='<h1 tabindex="-1">Налаштування</h1><label for="nrThemeChoice">Оформлення</label><select id="nrThemeChoice"><option value="auto">Як у системі</option><option value="light">Світле</option><option value="dark">Темне</option></select><p role="status" id="nrThemeStatus"></p><p>Мова інтерфейсу: українська.<br>Дати моделі та час планів: Europe/Kyiv. Часовий пояс пристрою: <span id="nrDeviceZone"></span>. Місцева доба може відрізнятися.</p><h2>Ваші дані</h2><p>Записи залишаються на цьому пристрої. Збережіть копію перед очищенням.</p><div class="nr-o-actions"><button type="button" data-export>Експортувати дані</button><button type="button" data-clear>Очистити мої дані</button></div>';
 host.prepend(box);box.querySelector('#nrDeviceZone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone;
 box.querySelector('[data-export]').onclick=()=>window.fp450ExportLocalData?.();
 box.querySelector('[data-clear]').onclick=()=>window.fp450ClearLocalData?.();
 let saved='dark';try{saved=localStorage.getItem('gindex_theme')||'dark'}catch(e){window.NRDiagnostics?.record('ui.theme_read','recoverable')}
 theme(saved);
 box.querySelector('select').onchange=e=>{theme(e.target.value);let saved=true;try{localStorage.setItem('gindex_theme',e.target.value)}catch(error){saved=false;window.NRDiagnostics?.record('ui.theme_write','recoverable')}document.getElementById('nrThemeStatus').textContent=saved?'Оформлення збережено.':'Оформлення змінено на цей сеанс; сховище недоступне.'};
}
function practical(factors,own,ds){
 const names=new Set(factors.filter(x=>typeof x.value==='number').map(x=>x.factor));
 const ideas=[];
 if(names.has('Книги'))ideas.push('Навчання й нові знання');
 if(names.has('1 місячний день')||names.has('Мішень'))ideas.push('Планування й постановка цілей');
 if(names.has('сприятливий для подорожей'))ideas.push('Подорожі');
 if(names.has('сприятливий для стрижки'))ideas.push('Стрижка й особистий догляд');
 if(names.has('Сукня'))ideas.push('Новий одяг');
 if(names.has('Гучномовець'))ideas.push('Реклама й комунікація');
 const limit=names.has('День порожні руки, несприятливий')?'У джерелі є застереження щодо нових починань.':names.has('Тричі  трикутник')?'У джерелі є позначка повторної роботи — перевірте деталі плану.':'';
 const title=ideas.length?ideas.slice(0,2).join(' · '):factors.length?'Позначки календаря цього дня':'Календарні теми ще недоступні';
 return {title,body:ideas.length?ideas.join(' · '):factors.length?factors.filter(x=>!['Kp','Moon','Eclipse'].includes(x.factor)&&x.value!==0).map(x=>factorName(x.factor)).join(' · ')||'Окремих календарних позначок немає.':'Поки немає календарних входів для цієї дати.',limit};
}


const TOPICS=[['study','Навчання',['Книги']],['travel','Подорожі',['сприятливий для подорожей']],['care','Догляд',['сприятливий для стрижки','Сукня']],['planning','Планування',['1 місячний день','Мішень']],['communication','Комунікація',['Гучномовець']]];
function factorsFor(ds){const value=rows[ds]?.channels?.source_formula?.factors;return Array.isArray(value)?value.filter(x=>typeof x.value==='number'&&Number.isFinite(x.value)):[];}
function topicMatches(ds,id){return id==='all'||(TOPICS.find(t=>t[0]===id)?.[2]||[]).some(name=>factorsFor(ds).some(f=>f.factor===name));}
function horizon(ds){const own=rows[ds]?.channels?.source_formula||{};return own.kp_source==='NOAA_3day_slots'?'Короткий прогноз · 3-годинні слоти':own.kp_source==='NOAA_27day_outlook'?'Орієнтир · 27-денний NOAA outlook':'Фізичний горизонт не визначений';}
function category(ds,id){
 const factors=factorsFor(ds),map={business:['Книги','Гучномовець','Мішень','1 місячний день'],love:[],health:['Хрест','Таблетка'],sport:[],money:[]};
 const matched=factors.filter(f=>(map[id]||[]).includes(f.factor));
 const prompts={sport:'Визначте власну мету тренування та запишіть фактичний результат.',health:'Запишіть власне спостереження. Медичні рішення узгоджуйте з фахівцем.',business:'Оберіть одну робочу справу та критерій її завершення.',love:'Запишіть тему розмови або спільний план.',money:'Запишіть конкретну справу: перевірити витрати або переглянути бюджет.'};
 return {facts:matched.length?matched.map(f=>factorName(f.factor)).join('; '):factors.length?'Окремих позначок для цієї сфери в календарі немає.':'Календарні входи для цієї дати недоступні.',prompt:prompts[id]||'Оберіть власну справу.',boundary:'Це фокус вашого плану, а не прогноз успіху в цій сфері. Окремого бала немає.'};
}
function routeTools(root,route){
 if(route==='today')return;
 const panel=document.createElement('section');panel.className='nr-o-route-tools';
 if(route==='forecast')panel.innerHTML='<p>Порівняйте оцінки та джерело фізичного прогнозу. Далекий орієнтир має інший горизонт, ніж короткий прогноз.</p><div class="nr-o-horizon-list" aria-label="Оцінки та горизонт прогнозу"></div>';
 else panel.innerHTML='<p>Знайдіть дати з потрібними позначками традиційного календаря. Це пошук тем, а не рейтинг найкращих днів.</p><div class="nr-o-topic-filters" role="group" aria-label="Тема календаря">'+[['all','Усі теми'],...TOPICS].map(t=>'<button type="button" data-topic="'+t[0]+'" aria-pressed="'+(t[0]===topicFilter)+'">'+t[1]+'</button>').join('')+'</div><p class="nr-o-topic-status" role="status"></p><div class="nr-o-topic-days" aria-label="Дати за темою"></div>';
 root.querySelector('.nr-o-hero').after(panel);
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(!b)return;topicFilter=b.dataset.topic;const first=dayRange().find(d=>topicMatches(d,topicFilter));if(first&&!topicMatches(selected[route],topicFilter))selected[route]=first;render(root);});
}
function renderRouteTools(root,route,dates,ds){
 if(route==='forecast'){
  const host=root.querySelector('.nr-o-horizon-list');buttons(host,dates.slice(0,14),ds);
  for(const b of host.children){const r=resolve(b.dataset.day);b.textContent=dateLabel(b.dataset.day)+' · '+fmt(r.score)+' — '+horizon(b.dataset.day)+' · '+(r.state==='fresh'&&rows[b.dataset.day]?.channels?.source_formula?.kp_source==='NOAA_27day_outlook'?'випуск '+String(rows[b.dataset.day].channels.source_formula.kp_input?.issued_at||'').slice(0,10):states[r.state]);}
 }
 if(route==='calendar'){
  root.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===topicFilter)));
  const matching=dates.filter(d=>topicMatches(d,topicFilter));buttons(root.querySelector('.nr-o-topic-days'),matching,ds);
  root.querySelector('.nr-o-topic-status').textContent=topicFilter==='all'?'27 дат. Натисніть дату для пояснення.':matching.length?'Дат із цією позначкою: '+matching.length+'. Оцінка може бути відсутня або застаріла.':'На цих 27 датах такої позначки немає в доступних даних. Нижче залишаються деталі обраної дати.';
 }
}
function openOutcome(){window.fp434Go('plan',false);const form=document.getElementById('nrOutcomeForm');if(!form)return;form.scrollIntoView({block:'start'});form.querySelector('[name=result]')?.focus({preventScroll:true});}


// Compare only fresh calculations actually seen on this device, never inferred history.
const changeKey='gindex_forecast_seen_v1';
function rememberForecast(){
 let previous={};try{previous=JSON.parse(localStorage.getItem(changeKey)||'{}')||{};}catch(_){}
 const next={};
 for(const ds of Object.keys(rows).sort().slice(-40)){
  const r=resolve(ds),c=rows[ds]?.channels?.source_formula;
  if(!r.available||!c||!Number.isFinite(c.value)||!Number.isFinite(c.raw)||!Number.isFinite(Date.parse(r.generated_at)))continue;
  const now={stamp:r.generated_at,score:c.value,raw:c.raw,kp:Number.isFinite(c.kp_daily_max)?c.kp_daily_max:null};
  const old=previous[ds];
  if(old&&Date.parse(old.stamp)>=Date.parse(now.stamp)){next[ds]=old;continue;}
  if(old&&Number.isFinite(old.score)&&Number.isFinite(old.raw)&&['score','raw','kp'].some(k=>old[k]!==now[k]))now.before={stamp:old.stamp,score:old.score,raw:old.raw,kp:old.kp};
  next[ds]=now;
 }
 // An empty or stale response must not erase the last successfully seen baseline.
 if(Object.keys(next).length)try{localStorage.setItem(changeKey,JSON.stringify(next));}catch(_){}
}
function renderFeedback(root,ds){
 const tr=s=>window.NRLocale?.text(s)||s;
 const stamp=t=>NRPresentation.dateFormatter(window.NRLocale?.locale||'uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
 let box=root.querySelector('[data-forecast-change]');
 if(!box){box=document.createElement('details');box.dataset.forecastChange='';box.className='nr-card';box.setAttribute('translate','no');root.querySelector('.nr-o-verdict').before(box);}
 let item;try{item=JSON.parse(localStorage.getItem(changeKey)||'{}')?.[ds];}catch(_){}
 const r=resolve(ds),old=item?.before;
 box.hidden=!(r.available&&old&&item.stamp===r.generated_at);
 if(!box.hidden){
  const lines=[['score','Оцінка моделі'],['raw','Сума до округлення'],['kp','Прогноз добового максимуму Kp']].filter(([k])=>old[k]!==item[k]).map(([k,label])=>'<p>'+esc(tr(label))+': <b>'+esc(fmt(old[k]))+' → '+esc(fmt(item[k]))+'</b></p>').join('');
  box.innerHTML='<summary>'+esc(tr('Що змінилося?'))+'</summary>'+lines+'<small>'+esc(tr('Порівняно з попереднім розрахунком, відкритим на цьому пристрої.'))+' '+esc(stamp(old.stamp))+' → '+esc(stamp(item.stamp))+'. Europe/Kyiv.</small>';
 }
 if(root.dataset.overview!=='today')return;
 let evening=root.querySelector('[data-evening-summary]');
 if(!evening){evening=document.createElement('section');evening.dataset.eveningSummary='';evening.className='nr-card';evening.setAttribute('translate','no');root.querySelector('.nr-o-journey').after(evening);}
 let plan=null,outcomes=[];try{plan=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null');outcomes=JSON.parse(localStorage.getItem('gindex_plan_outcomes_v1')||'[]');}catch(_){}
 const hour=Number(NRPresentation.dateFormatter('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 evening.hidden=ds!==today()||hour<18||plan?.date!==today()||!plan?.priority||!Array.isArray(outcomes);
 if(evening.hidden)return;
 const saved=outcomes.find(x=>x?.date===today()),labels={done:'Виконано',partial:'Частково',not_done:'Не виконано'};
 evening.innerHTML='<h3>'+esc(tr('Як пройшов ваш план?'))+'</h3><p>'+esc(plan.priority)+'</p>'+(saved?'<p role="status">'+esc(tr('Підсумок уже збережено'))+': '+esc(tr(labels[saved.result]||'Оберіть'))+'</p>':'<p>'+esc(tr('Один дотик — запис у ваш щоденник. Вечір за Києвом.'))+'</p><div style="display:flex;flex-wrap:wrap;gap:8px">'+Object.entries(labels).map(([v,label])=>'<button type="button" class="nr-btn secondary" data-quick-outcome="'+v+'">'+esc(tr(label))+'</button>').join('')+'</div>')+'<button type="button" class="nr-btn secondary" data-evening-open style="margin-top:10px">'+esc(tr('Відкрити щоденник'))+'</button><p role="status" data-evening-status></p>';
 evening.querySelector('[data-evening-open]').onclick=openOutcome;
 evening.querySelectorAll('[data-quick-outcome]').forEach(b=>b.onclick=()=>{
  // Re-read at click time: another tab or a double click may already have saved it.
  let latest;try{latest=JSON.parse(localStorage.getItem('gindex_plan_outcomes_v1')||'[]');}catch(_){latest=null;}
  if(!Array.isArray(latest)){evening.querySelector('[data-evening-status]').textContent=tr('Не вдалося зберегти результат');return;}
  if(latest.some(x=>x?.date===today())){renderFeedback(root,ds);return;}
  const form=document.createElement('form');for(const [name,value] of [['result',b.dataset.quickOutcome],['note','']]){const input=document.createElement('input');input.name=name;input.value=value;form.append(input);}
  window.fp466SaveOutcome({preventDefault(){},currentTarget:form});
  let savedNow=false;try{savedNow=JSON.parse(localStorage.getItem('gindex_plan_outcomes_v1')||'[]').some(x=>x?.date===today());}catch(_){}
  if(savedNow)renderFeedback(root,ds);else evening.querySelector('[data-evening-status]').textContent=tr('Не вдалося зберегти результат');
 });
}

function mount(){
 if(mounted)return true;
 if(!document.getElementById('nrRoute-today'))return false;
 for(const route of ['today','forecast','calendar']){
  const host=document.getElementById('nrRoute-'+route);if(!host)continue;
  const legacy=document.createElement('details');legacy.className='nr-legacy-details';if(window.GINDEX_PLAY_CHANNEL){legacy.hidden=true;legacy.inert=true;}
  const summary=document.createElement('summary');summary.textContent='Дослідницькі та історичні дані · окремі методики';legacy.append(summary);const notice=document.createElement('p');notice.className='nr-research-warning';notice.setAttribute('role','note');legacy.append(notice);
  for(const child of [...host.children])legacy.append(child);
  const root=document.createElement('section');root.className='nr-overview';root.dataset.overview=route;
  root.innerHTML=`<div class="nr-o-heading"><span>SKYRHYTHM · EUROPE/KYIV</span><h1>${route==='today'?'Огляд дня':route==='forecast'?'Прогноз і горизонт':'Календар за темами'}</h1></div><label>Дата <select aria-label="Дата оцінки"></select></label><div class="nr-o-state" role="status" aria-live="polite"></div><div class="nr-o-verdict"><div class="nr-o-score" aria-label="Оцінка моделі"></div><h3 class="nr-o-label" aria-level="2"></h3></div><p class="nr-o-scale">Шкала моделі: −3…+3 · від негативної до позитивної оцінки; 0 — нейтральна.</p><section class="nr-o-reasons" aria-label="Найбільші внески"><h2>Чому така оцінка</h2><div></div></section><p class="nr-o-caution" role="note" hidden></p><section class="nr-o-practical"><span class="nr-o-eyebrow">ТЕМИ КАЛЕНДАРЯ</span><h2></h2><p></p><small></small><p class="nr-o-boundary">За традиційним календарем джерела. Це не гарантія результату й не медична рекомендація.</p></section><div class="nr-o-actions"><button type="button" data-why>Чому саме так</button><button type="button" data-calendar>${route==='calendar'?'Порівняти оцінки':'Знайти дату за темою'}</button></div><div class="nr-o-layers"><section><h3>Космічна погода</h3><p class="nr-o-weather"></p><small>Фізичні дані окремо від календарних тем.</small></section><section><h3>Мій ритм</h3><p>Ваші нотатки й підсумки плану. Персонального прогнозу поки немає.</p><button type="button" data-journal>Відкрити мій план</button><button type="button" data-outcome>Підсумок дня</button></section></div><p class="nr-o-boundary">Оцінка за формулою джерела. Прогностичну точність щодо подій ще не підтверджено.</p><button type="button" data-settings>Налаштування</button><div class="nr-o-next" aria-label="Наступні дні"></div><details class="nr-o-factors"><summary>Чому така оцінка</summary><div></div></details><div class="nr-o-provenance"></div><div class="nr-o-context"></div><details class="nr-o-calendar" ${route==='today'?'':'open'}><summary>Найближчі 14 днів</summary><div class="nr-o-days"></div></details>`;
  const hero=document.createElement('div');hero.className='nr-o-hero';
  for(const selector of ['.nr-o-heading','label','.nr-o-state','.nr-o-verdict','.nr-o-scale'])hero.append(root.querySelector(selector));
  root.prepend(hero);
  if(route==='today'||route==='forecast'){
   const week=document.createElement('nav');week.className='nr-b-week';week.setAttribute('aria-label','Дати прогнозу');
   {const verdict=hero.querySelector('.nr-o-verdict');if(verdict)verdict.before(week);else hero.append(week);} // N2: стрічка дат над балом
   const datesMore=document.createElement('details');datesMore.className='nr-b-dates-more';const dateSummary=document.createElement('summary');dateSummary.textContent='Інші дати';datesMore.append(dateSummary,hero.querySelector('label'));hero.append(datesMore);
   const scrollHint=document.createElement('p');scrollHint.className='nr-b-scroll-hint';scrollHint.textContent='← Прокрутіть дати →';week.after(scrollHint);new ResizeObserver(()=>{scrollHint.hidden=week.scrollWidth<=week.clientWidth+1}).observe(week);
   // N2 + B14-13: стрічка дат над балом, якщо «Мій план» при цьому лишається над нижньою навігацією; інакше — під шкалою, як у B17.
   const weekGroup=()=>{const g=[week];for(let n=week.nextElementSibling;n&&n.matches('.nr-b-horizon-note,.nr-b-scroll-hint');n=n.nextElementSibling)g.push(n);return g};hero.__placeWeek=above=>{const verdict=hero.querySelector('.nr-o-verdict'),below=hero.querySelector('.nr-o-scale');if(!verdict||!below)return;const g=weekGroup(),isAbove=!!(week.compareDocumentPosition(verdict)&Node.DOCUMENT_POSITION_FOLLOWING);if(above&&!isAbove)verdict.before(...g);else if(!above&&isAbove)below.after(...g);hero.dataset.weekPlace=above?'above':'below'};hero.__weekHeight=()=>weekGroup().reduce((a,e)=>a+e.getBoundingClientRect().height,0);
   const fitWeek=()=>{if(window.NRScenes?.fit&&route==='today'){window.NRScenes.fit();return} /* зі сценами рішення ухвалює сцена (декор поступається першим) */const verdict=hero.querySelector('.nr-o-verdict'),plan=hero.querySelector('.nr-b-primary');if(!verdict||!plan||!hero.isConnected||!hero.offsetParent)return;const h=hero.__weekHeight(),above=hero.dataset.weekPlace!=='below'&&!!(week.compareDocumentPosition(verdict)&Node.DOCUMENT_POSITION_FOLLOWING);const navTop=(n=>{if(!n)return innerHeight;const r=n.getBoundingClientRect(),cs=getComputedStyle(n);return cs.display==='none'||cs.visibility==='hidden'||r.height===0?innerHeight:r.top})(document.getElementById('mobileNav'));const planBottom=plan.getBoundingClientRect().bottom+scrollY+(above?0:h);hero.__placeWeek(planBottom<=navTop-8);};
   window.addEventListener('resize',()=>requestAnimationFrame(fitWeek));window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(fitWeek));document.fonts?.ready?.then(()=>requestAnimationFrame(fitWeek));new MutationObserver(()=>requestAnimationFrame(fitWeek)).observe(document.documentElement,{attributes:true,attributeFilter:['style','class','data-nr-theme']});window.addEventListener('pageshow',()=>requestAnimationFrame(fitWeek));hero.__fitWeek=fitWeek; // без ResizeObserver на hero: поруч уже є RO підказки прокрутки, разом вони дають «ResizeObserver loop»
   if(route==='forecast'){const comparison=root.querySelector('.nr-o-calendar');hero.after(comparison);comparison.open=true;comparison.classList.add('nr-b-forecast-comparison');}

   week.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(e.key))return;const bs=[...week.querySelectorAll('button')],i=bs.indexOf(e.target);if(i<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?bs.length-1:Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowRight'?1:-1)));const day=bs[n].dataset.day;bs[n].click();const target=[...week.children].find(b=>b.dataset.day===day);target?.focus();target?.scrollIntoView({block:'nearest',inline:'nearest'});});
  }

  const sky=document.createElement('div');sky.className='nr-o-sky-art';sky.setAttribute('aria-hidden','true');
  sky.innerHTML='<svg viewBox="0 0 220 220" fill="none"><defs><radialGradient id="nrSkyGlow"><stop stop-color="#f8dfa1" stop-opacity=".20"/><stop offset="1" stop-color="#d7ae61" stop-opacity="0"/></radialGradient></defs><circle cx="110" cy="110" r="108" fill="url(#nrSkyGlow)"/><g stroke="currentColor"><circle cx="110" cy="110" r="74"/><ellipse cx="110" cy="110" rx="35" ry="74" transform="rotate(-28 110 110)"/><ellipse cx="110" cy="110" rx="88" ry="25" transform="rotate(-28 110 110)"/><path d="M110 23v18m0 138v18M23 110h18m138 0h18"/><circle cx="110" cy="110" r="25"/><circle cx="173" cy="78" r="5" fill="currentColor"/></g></svg>';
  hero.append(sky);
  if(route==='today'){
   const weather=root.querySelector('.nr-o-layers section:first-child');weather.classList.add('nr-o-weather-top');hero.after(weather);
   const strip=root.querySelector('.nr-o-next');weather.after(strip);
  }
  if(route==='today'||route==='forecast'){
   const panch=document.createElement('section');panch.className='nr-o-panch-preview';panch.innerHTML='<span class="nr-o-eyebrow">ПАНЧАНГА · П’ЯТЬ СКЛАДОВИХ ДНЯ</span><h2>Ритми неба</h2><p>Сонце, Місяць і переходи традиційного календаря.</p><details><summary>Складові обраного дня</summary><div class="nr-o-panch-values" role="status"></div></details><button type="button" data-panch>Відкрити Панчангу сьогодні →</button>';
   root.querySelector('.nr-o-reasons').after(panch);panch.querySelector('[data-panch]').onclick=()=>window.fp434Go('panch',true);
  }

  const legends=document.createElement('details');legends.className='nr-o-legends';legends.innerHTML='<summary>Значення позначок і джерело</summary><div></div>';root.querySelector('.nr-o-reasons').append(legends);
  if(route==='today'){
   const journey=document.createElement('nav');journey.className='nr-o-journey';journey.setAttribute('aria-label','Ваш день');
   journey.innerHTML='<button type="button" data-step="plan"><span>01 · СПЛАНУВАТИ</span><b>Мій план <i aria-hidden="true">→</i></b></button><button type="button" data-step="calendar"><span>02 · ПОРІВНЯТИ</span><b>Обрати дату <i aria-hidden="true">→</i></b></button><button type="button" data-step="outcome"><span>03 · ПІДСУМУВАТИ</span><b>Записати результат <i aria-hidden="true">→</i></b></button>';
   hero.after(journey);const primary=journey.querySelector('[data-step=plan]');primary.classList.add('nr-b-primary');hero.querySelector('.nr-o-verdict').after(primary);primary.onclick=()=>window.fp434Go('plan',true);journey.addEventListener('click',e=>{const step=e.target.closest('[data-step]')?.dataset.step;if(step==='outcome')openOutcome();else if(step)window.fp434Go(step,true)});
  }
  const practicalBody=root.querySelector('.nr-o-practical>p');const more=document.createElement('details');more.className='nr-o-topic-detail';more.innerHTML='<summary>Пояснення тем дня</summary>';practicalBody.before(more);more.append(practicalBody);
  host.append(root,legacy);selected[route]=today();routeTools(root,route);
  root.querySelector('[data-outcome]').onclick=openOutcome;
  root.querySelector('[data-why]').onclick=()=>{const d=root.querySelector('.nr-o-factors');d.open=true;d.querySelector('summary').focus();d.scrollIntoView({block:'start'})};
  root.querySelector('[data-calendar]').onclick=()=>window.fp434Go(route==='calendar'?'forecast':'calendar',true);
  root.querySelector('[data-journal]').onclick=()=>window.fp434Go('plan',true);
  root.querySelector('[data-settings]').onclick=()=>window.fp434Go('profile',true);
  root.querySelector('select').addEventListener('change',e=>{selected[route]=e.target.value;render(root);});
  root.addEventListener('click',e=>{const b=e.target.closest('button[data-day]');if(b){selected[route]=b.dataset.day;render(root);b.focus();}});
 }
 settings();mounted=true;return true;
}
function buttons(host,dates,active){
 const existing=[...host.children];
 if(existing.map(x=>x.dataset.day).join()!==dates.join()){
  host.replaceChildren(...dates.map(ds=>{const b=document.createElement('button');b.type='button';b.dataset.day=ds;return b;}));
 }
 for(const b of host.children){const ds=b.dataset.day,r=resolve(ds);b.setAttribute('aria-pressed',String(ds===active));const number=document.createElement('strong');number.className='nr-b-score-value';number.dataset.opKey=NRConsumerAuthority.present(r).opKey||'none';number.textContent=fmt(r.score);b.replaceChildren(document.createTextNode(dateLabel(ds)+' · '),number);b.setAttribute('aria-label',dateLabel(ds)+': '+fmt(r.score)+', '+states[r.state]);const outlook=r.kp_source==='NOAA_27day_outlook';b.dataset.horizon=outlook?'outlook':r.kp_source==='NOAA_3day_slots'?'short':'none';if(outlook){const label=({uk:'27-денний орієнтир NOAA',en:'NOAA 27-day outlook',es:'Perspectiva NOAA de 27 días',fr:'Tendance NOAA à 27 jours'})[window.NRLocale?.language||'uk'];b.append(document.createTextNode(' · 27d'));b.title=label;b.setAttribute('aria-label',b.getAttribute('aria-label')+' · '+label)}else b.removeAttribute('title');}
}
function renderForecastTable(root,dates,ds){
 const lang=window.NRLocale?.language||'uk',t=({uk:['Дата','Оцінка','Kp макс.','Горизонт','3 дні','27 днів · орієнтир','Немає даних','Що змінилося від попереднього дня','Попередній день недоступний для порівняння.','Зміна оцінки: '],en:['Date','Score','Kp max','Horizon','3 days','27-day outlook','No data','Change from previous day','Previous day unavailable for comparison.','Score change: '],es:['Fecha','Puntuación','Kp máx.','Horizonte','3 días','Perspectiva de 27 días','Sin datos','Cambio respecto al día anterior','Día anterior no disponible para comparar.','Cambio de puntuación: '],fr:['Date','Score','Kp max','Horizon','3 jours','Tendance à 27 jours','Pas de données','Évolution depuis la veille','Jour précédent indisponible pour comparaison.','Variation du score : ']})[lang];
 let box=root.querySelector('.nr-b-forecast-table');if(!box){box=document.createElement('section');box.className='nr-b-forecast-table';box.setAttribute('translate','no');root.querySelector('.nr-o-verdict').before(box)}
 const start=Math.max(0,Math.min(dates.indexOf(ds)-3,dates.length-7)),week=dates.slice(start,start+7);
 const table=document.createElement('table');table.innerHTML='<caption>'+esc(t[3])+' · NOAA</caption><thead><tr>'+t.slice(0,4).map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+week.map(d=>{const r=resolve(d),own=rows[d]?.channels?.source_formula,kp=r.available?own?.kp_input?.kp:null;return '<tr'+(d===ds?' aria-current="date"':'')+'><th scope="row">'+esc(dateLabel(d))+'</th><td class="nr-b-score-value" data-op-key="'+esc(NRConsumerAuthority.present(r).opKey||'none')+'">'+esc(fmt(r.score))+'</td><td>'+esc(Number.isFinite(kp)?String(Number(kp.toFixed(2))):'—')+'</td><td>'+esc(!r.available?t[6]:r.kp_source==='NOAA_27day_outlook'?t[5]:t[4])+'</td></tr>'}).join('')+'</tbody>';
 const prevDate=new Date(ds+'T12:00:00Z');prevDate.setUTCDate(prevDate.getUTCDate()-1);const prev=resolve(prevDate.toISOString().slice(0,10)),current=resolve(ds),h=document.createElement('h2'),change=document.createElement('p');h.textContent=t[7];change.textContent=current.available&&prev.available?t[9]+fmt(current.score-prev.score):t[8];box.replaceChildren(table,h,change);
}
function render(root){
 weatherPanel(root);
 const route=root.dataset.overview,dates=dayRange(),ds=dates.includes(selected[route])?selected[route]:today();selected[route]=ds;
 renderPanchPreview(root,ds);
 renderFeedback(root,ds);
 const select=root.querySelector('select');if([...select.options].map(x=>x.value).join()!==dates.join())select.replaceChildren(...dates.map(d=>new Option(dateLabel(d),d)));select.value=ds;
 window.NRCalendarContext?.render(root.querySelector('.nr-o-context'),window.nrRetroEphemeris?.(),ds);
 const r=resolve(ds),source=rows[ds]?.channels?.source_formula,own=r.lastScore===null?{}:source||{};
 const status=root.querySelector('.nr-o-state'),transport=window.__nrConsumerLoadState;
 const transportLabels={uk:{loading:'Завантажуємо прогноз…',error:'Не вдалося отримати прогноз. Спробуйте пізніше.',retrying:'Не вдалося з першої спроби — повторюємо автоматично…'},en:{loading:'Loading forecast…',error:'Unable to load the forecast. Please try again later.',retrying:'First attempt failed — retrying automatically…'},es:{loading:'Cargando el pronóstico…',error:'No se pudo cargar el pronóstico. Inténtalo más tarde.',retrying:'Falló el primer intento — reintentando automáticamente…'},fr:{loading:'Chargement des prévisions…',error:'Impossible de charger les prévisions. Réessayez plus tard.',retrying:'Échec du premier essai — nouvelle tentative automatique…'}};
 /* v7.2 NRA-01: поки запланований автоповтор — не показувати остаточну помилку */
 const transportKey=transport==='error'&&window.__nrConsumerRetry?.pending?'retrying':transport;
 const transportText=r.state==='missing'&&transportLabels.uk[transportKey]?(transportLabels[window.NRLocale?.language]||transportLabels.uk)[transportKey]:null;
 retryButton(root,status,r.state==='missing'&&transportKey==='error');
 if(transportText){status.setAttribute('translate','no');status.textContent=transportText;status.dataset.transportState=transport;}
 else{status.removeAttribute('translate');delete status.dataset.transportState;status.textContent=stateLabel(r,ds)+(ds===today()?' · сьогодні за Києвом':' · '+dateLabel(ds)+' · Київ');}
 root.querySelector('.nr-o-score').textContent=fmt(r.score);
 root.querySelector('.nr-o-label').textContent=r.available?(r.score>0?'Позитивна оцінка':r.score<0?'Негативна оцінка':'Нейтральна оцінка'):'Актуальну оцінку не показуємо';
 renderRouteTools(root,route,dates,ds);
 if(route==='today'||route==='forecast'){
 const heading=root.querySelector('.nr-o-heading');heading.setAttribute('translate','no');heading.querySelector('h1').textContent=route==='today'?dateLabel(ds):({uk:'Прогноз на тиждень',en:'Weekly forecast',es:'Pronóstico semanal',fr:'Prévisions de la semaine'})[window.NRLocale?.language||'uk'];heading.querySelector('span').textContent=({uk:'Київ',en:'Kyiv',es:'Kyiv',fr:'Kyiv'})[window.NRLocale?.language||'uk']+' · Europe/Kyiv';
 }
 if(route==='forecast')renderForecastTable(root,dates,ds);

 buttons(root.querySelector('.nr-o-next'),dates.slice(1,4),ds);buttons(root.querySelector('.nr-o-days'),dates.slice(0,14),ds);
 const week=root.querySelector('.nr-b-week');if(week){requestAnimationFrame(()=>root.querySelector('.nr-o-hero')?.__fitWeek?.());
  const ui=({uk:['Інші дати','← Прокрутіть дати →'],en:['Other dates','← Scroll dates →'],es:['Otras fechas','← Desliza las fechas →'],fr:['Autres dates','← Faites défiler les dates →']})[window.NRLocale?.language||'uk'];
  const summary=root.querySelector('.nr-b-dates-more summary'),hint=root.querySelector('.nr-b-scroll-hint');summary.setAttribute('translate','no');summary.textContent=ui[0];hint.setAttribute('translate','no');hint.textContent=ui[1];

  const start=Math.max(0,Math.min(dates.indexOf(ds)-3,dates.length-7));buttons(week,dates.slice(start,start+7),ds);
  week.setAttribute('aria-label',({uk:'Дати прогнозу',en:'Forecast dates',es:'Fechas del pronóstico',fr:'Dates des prévisions'})[window.NRLocale?.language||'uk']);
  let legend=week.nextElementSibling;if(!legend?.classList.contains('nr-b-horizon-note')){legend=document.createElement('p');legend.className='nr-b-horizon-note';legend.setAttribute('translate','no');week.after(legend)}
  legend.textContent=({uk:'27d · пунктир: 27-денний орієнтир NOAA, не короткий прогноз.',en:'27d · dotted: NOAA 27-day outlook, not a short-range forecast.',es:'27d · puntos: perspectiva NOAA de 27 días, no pronóstico a corto plazo.',fr:'27d · pointillés : tendance NOAA à 27 jours, pas une prévision à court terme.'})[window.NRLocale?.language||'uk'];
  for(const b of week.children){const result=resolve(b.dataset.day),presentation=window.NRConsumerAuthority.present(result);b.dataset.tone=presentation.opKey||'none';b.tabIndex=b.dataset.day===ds?0:-1;b.replaceChildren();const date=document.createElement('span'),score=document.createElement('strong');date.textContent=new Intl.DateTimeFormat(({uk:'uk-UA',en:'en-GB',es:'es-ES',fr:'fr-FR'})[window.NRLocale?.language||'uk'],{day:'numeric',weekday:'short',timeZone:'Europe/Kyiv'}).format(new Date(b.dataset.day+'T12:00:00Z'));score.textContent=fmt(result.score);b.append(date,score);
   const kind=result.kp_source==='NOAA_3day_slots'?'short':result.kp_source==='NOAA_27day_outlook'?'outlook':'none';b.dataset.horizon=kind;
   if(kind==='outlook'){const tag=document.createElement('small');tag.textContent='27d';tag.title=({uk:'27-денний орієнтир NOAA',en:'NOAA 27-day outlook',es:'Perspectiva NOAA de 27 días',fr:'Tendance NOAA à 27 jours'})[window.NRLocale?.language||'uk'];tag.setAttribute('translate','no');b.append(tag);{const al=b.getAttribute('aria-label')||'';if(!al.includes(tag.title))b.setAttribute('aria-label',al+' · '+tag.title);}}
}
 }

 const factors=Array.isArray(own.factors)?own.factors:[],calendar=factors.filter(x=>x.factor!=='Kp'&&x.value!==0),kp=factors.find(x=>x.factor==='Kp');
 const strongest=factors.filter(x=>Number.isFinite(x.value)&&x.value!==0).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,3);
 renderReasonBrief(root,r,strongest,own);
 const reasonTitle=reasonCopy()[r.authority==='expert_pdf'?'expert':'title'];for(const el of [root.querySelector('.nr-o-reasons h2'),root.querySelector('.nr-o-factors summary')]){el.setAttribute('translate','no');el.textContent=reasonTitle;}
 root.querySelector('.nr-o-reasons div').innerHTML=strongest.length?strongest.map(x=>'<p>'+'<span>'+esc(x.factor==='Kp'?'Геомагнітна складова':x.factor==='Moon'?'Пурніма (за календарем)':x.factor==='Eclipse'?'Складова затемнення':x.factor)+'</span> <strong>'+esc(fmt(x.value))+'</strong></p>').join('')+'<p class="nr-o-boundary">'+((r.formula||r).available?'Найбільші внески; повна сума до округлення й обмеження: '+esc(fmt(own.raw))+'.':'Внески збереженого розрахунку; актуальний підсумок недоступний.')+'</p>':'Складові для цієї дати недоступні.';
 root.querySelector('.nr-o-legends div').innerHTML=strongest.map(x=>'<p>'+esc(factorName(x.factor))+'</p>').join('');
 root.querySelector('.nr-o-legends div').innerHTML += '<p>'+esc('Календарні позначки враховано за цілу добу. Часові межі окремих позначок не змінюють цей бал.')+'</p>';
 if(factors.some(x=>x.factor==='Савана Сомвара'))root.querySelector('.nr-o-legends div').innerHTML += '<p>'+esc('Солах Сомвара: використано вагу Савана Сомвара +1; відповідність назв не підтверджена.')+'</p>';
 if(factors.some(x=>x.factor==='Пітру Пакша'))root.querySelector('.nr-o-legends div').innerHTML += '<p>'+esc('Пітру Пакша: вага джерела +1; легенда водночас застерігає від нових матеріальних справ.')+'</p>';
 const minus=factors.filter(x=>!['Kp','Moon','Eclipse'].includes(x.factor)&&Number.isFinite(x.value)&&x.value<0);
 const caution=root.querySelector('.nr-o-caution');
 caution.hidden=!(r.available&&r.score>0&&minus.length);
 root.querySelector('.nr-o-score').dataset.opKey=NRConsumerAuthority.present(r).opKey||'none';
 root.querySelector('.nr-o-score').dataset.scoreTone=!r.available?'missing':r.score<0?'negative':r.score===0?'neutral':caution.hidden?'positive':'caution';
 if(!caution.hidden&&r.state!=='expert')root.querySelector('.nr-o-label').textContent='Додатна · є застереження';
 /* v5 NR-01: тип сигналу біля бала — модель дня, не прогноз бурі (бал містить прогноз Kp як одну складову) */
 if(r.available){const lb=root.querySelector('.nr-o-label'),k=document.createElement('small');k.className='nr-o-kind';k.textContent=r.state==='expert'?'Експертна правка · не прогноз бурі':'Модель дня · не прогноз бурі';lb.append(document.createTextNode(' '),k)}
 kpNote(root);
 caution.textContent=caution.hidden?'':'Оцінка додатна, але в календарі є позначки з мінусом: '+minus.map(x=>factorName(x.factor)+' '+fmt(x.value)).join('; ')+'.';
 const topics=practical(factors,own,ds),card=root.querySelector('.nr-o-practical');
 card.querySelector('h2').textContent=topics.title;card.querySelector('p').textContent=topics.body;card.querySelector('small').textContent=topics.limit;
 const live=ds===today()&&typeof currentKpAuthority==='function'?currentKpAuthority():null;
 root.querySelector('.nr-o-weather').textContent=live?(live.usable?'Зараз Kp '+live.kp.toFixed(1)+' · '+live.label:'Поточний Kp недоступний — запасне число не показуємо.'):(r.available&&typeof own.kp_daily_max==='number'?'Прогноз добового максимуму Kp '+own.kp_daily_max+' · '+(own.kp_timezone||'часовий пояс не вказано'):'Немає актуального фізичного прогнозу для цієї дати.');
 root.querySelector('.nr-o-factors div').innerHTML=factors.length?`<h4>Календарні складові</h4>${calendar.map(x=>`<p>${esc(factorName(x.factor))} <strong>${esc(fmt(x.value))}</strong></p>`).join('')||'<p>Ненульових внесків немає.</p>'}<h4>Внесок прогнозного Kp</h4><p>Добовий максимум: ${esc(own.kp_daily_max??'—')} · доба ${esc(own.kp_timezone||'не уточнена')}. ${own.kp_input?.fallback?'Резерв: 27-денний прогноз за добу UTC; це не максимум локальної доби.':own.kp_source==='NOAA_3day_slots'?'Повне покриття трьохгодинними NOAA-слотами.':''}</p><p>Внесок у формулу: ${esc(fmt(kp?.value))}. Сума до перетворення: ${esc(fmt(own.raw))}.</p><p>Фізичний показник і календарні складові поєднані правилом моделі; причинний вплив на події не підтверджено.</p>`:'Розклад складових у цьому знімку недоступний.';
 let save=root.querySelector('[data-save-calculation]');if(!save){save=document.createElement('button');save.type='button';save.dataset.saveCalculation='';root.querySelector('.nr-o-provenance').after(save);}
 save.textContent='Зберегти розрахунок';save.disabled=!rows[ds];
 save.onclick=()=>{const data=snapshot(ds),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SkyRhythm-'+ds+'-calculation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const covered=Object.keys(rows).filter(d=>rows[d]?.channels?.source_formula?.available===true).sort();
 root.querySelector('.nr-o-provenance').textContent=`Розраховано: ${time(r.generated_at)}. ${r.kp_source==='NOAA_3day_slots'?'NOAA отримано: '+time(r.source_retrieved_at)+'. Час випуску у джерелі відсутній.':'NOAA випущено: '+time(r.source_issued_at)+'.'} Час показано для Europe/Kyiv. Покриття знімка: ${covered.length?dateLabel(covered.at(-1)):'немає'}.`+(r.state==='stale'&&r.lastScore!==null?' Остання збережена оцінка: '+fmt(r.lastScore)+'.':'');

}
function snapshot(ds){
 const r=resolve(ds),source=rows[ds]?.channels?.source_formula,own=r.lastScore===null?{}:source||{},input=own.kp_input||{};
 const pick=(obj,keys)=>Object.fromEntries(keys.map(k=>[k,obj[k]??null]));
 return {schema:'neborhythm_calculation_snapshot_v1',date:ds,saved_at:new Date().toISOString(),display_timezone:'Europe/Kyiv',
  display:{state:r.state,available:r.available===true,score:r.available===true?r.score:null,authority:r.authority},
  expert:r.expert?{source_pdf:r.expert.source_pdf,source_page:r.expert.source_page,category:r.expert.category}:null,
  formula:r.formula?{state:r.formula.state,score:r.formula.score,last_score:r.formula.lastScore}:null,
  calculation:pick(own,['generated_at','available','value','raw','threshold_policy','kp_source','kp_daily_max','kp_timezone']),
  source:pick(input,['source','issued_at','retrieved_at','raw_sha256','kp','timezone','kp_statistic','fallback','slot_count','expected_slots']),
  provenance:{generated_at:r.generated_at??null,issued_at:r.source_issued_at??null,retrieved_at:r.source_retrieved_at??null},
  factors:(own.factors||[]).map(f=>pick(f,['factor','value'])),
  scope:'Saved calculation inputs; not verified predictive accuracy. No personal notes or plans.'};
}
function update(next){if(next){rows=next;rememberForecast();}if(!mount())return;document.querySelectorAll('[data-overview]').forEach(render);window.NRLocalContext?.render();window.nrRefreshCategoryContext?.();}
window.NRConsumerOverview={update,category,openOutcome,snapshot};
window.addEventListener('nr:locale',()=>update());
window.addEventListener('nr:outcome',()=>update());
window.addEventListener('storage',e=>{if([changeKey,'gindex_day_plan_v1','gindex_plan_outcomes_v1'].includes(e.key)||e.key===null)update();});
window.addEventListener('online',()=>update());window.addEventListener('offline',()=>update());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
setInterval(()=>update(),60000);
})();

(function(){
'use strict';
const key='gindex_local_context_v1',tr=s=>window.NRLocale?.text(s)||s;
let location=null,source='saved',message='',busy=false;
function valid(x){if(!x||typeof x.lat!=='number'||typeof x.lon!=='number'||!Number.isFinite(x.lat)||!Number.isFinite(x.lon)||Math.abs(x.lat)>90||Math.abs(x.lon)>180)return false;try{new Intl.DateTimeFormat('en',{timeZone:x.zone});return typeof x.zone==='string'&&Number.isFinite(Date.parse(x.saved_at))}catch{return false}}
try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved))location=saved}catch{}
const dateIn=(t,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
// Complete missing events when the noon hour-angle approximation is undefined.
// Uses the same Meeus solar declination/equation-of-time and -0.833 degree horizon.
function completeSolarEvents(result,x){
 const rad=Math.PI/180,sinLat=Math.sin(x.lat*rad),cosLat=Math.cos(x.lat*rad);
 const start=Date.parse(result.date+'T00:00:00Z')-86400000,end=start+3*86400000;
 function height(ms){
  const jd=ms/86400000+2440587.5,t=_sjcSunrise(jd),dec=_sunDeclinationSunrise(t)*rad;
  const utcMinutes=((ms%86400000)+86400000)%86400000/60000;
  const hourAngle=(utcMinutes+_equationOfTimeMinSunrise(t)+4*x.lon-720)/4*rad;
  return sinLat*Math.sin(dec)+cosLat*Math.cos(dec)*Math.cos(hourAngle)-Math.sin(-0.833*rad);
 }
 let left=start,a=height(left);
 // One-minute sampling covers short polar crossings; exact tangency is not a crossing.
 for(let right=start+60000;right<=end;right+=60000){const b=height(right);
  if((a<0&&b>=0)||(a>0&&b<=0)){
   const key=a<0?'sunrise':'sunset';let lo=left,hi=right;
   for(let n=0;n<17;n++){const m=(lo+hi)/2;if((height(m)>=0)===(b>=0))hi=m;else lo=m;}
   const event=new Date((lo+hi)/2);
   if(!result[key]&&dateIn(event,x.zone)===result.date)result[key]=event.toISOString();
  }
  left=right;a=b;
 }
 return result;
}

function solar(x,now=Date.now()){
 if(!valid(x)||typeof sunRiseSetUTC_Meeus!=='function')return {state:'unavailable'};
 const date=dateIn(now,x.zone),mid=Date.parse(date+'T12:00:00Z'),result={state:'calculated',date,zone:x.zone,sunrise:null,sunset:null};
 for(let i=-2;i<=2;i++){const pair=sunRiseSetUTC_Meeus(new Date(mid+i*86400000),x.lat,x.lon);for(const k of ['sunrise','sunset'])if(Number.isFinite(pair[k]?.getTime())&&dateIn(pair[k],x.zone)===date)result[k]=pair[k].toISOString();}
 return (!result.sunrise||!result.sunset)?completeSolarEvents(result,x):result;
}
function persist(x,how){x.auto=how==='device';location=x;source=how;try{localStorage.setItem(key,JSON.stringify(x));message='Місце збережено лише на пристрої.'}catch{message='Місце діє лише в цьому сеансі.'}render();const f=document.querySelector('#nrLocalContext form');if(f){f.elements.lat.value=x.lat;f.elements.lon.value=x.lon;f.elements.zone.value=x.zone}}
function locate(){if(busy)return;busy=true;message='Визначаємо місце…';render();if(!navigator.geolocation){busy=false;message='Місце недоступне. Введіть координати вручну.';render();return}navigator.geolocation.getCurrentPosition(p=>{busy=false;const x={lat:p.coords.latitude,lon:p.coords.longitude,zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',saved_at:new Date().toISOString()};if(valid(x))persist(x,'device');else{message='Некоректні координати або часовий пояс.';render()}},()=>{busy=false;message='Місце недоступне. Введіть координати вручну.';render()},{timeout:10000,maximumAge:0});}
function render(){
 const host=document.getElementById('nrRoute-panch');if(!host)return;
 let box=document.getElementById('nrLocalContext');
 if(!box){box=document.createElement('section');box.id='nrLocalContext';box.className='nr-panch-section';box.innerHTML='<h2 data-title></h2><p data-position></p><button type="button" data-locate></button><details><summary data-manual></summary><form><label><span data-lat></span><input name="lat" type="number" min="-90" max="90" step="any" required></label><label><span data-lon></span><input name="lon" type="number" min="-180" max="180" step="any" required></label><label><span data-zone></span><input name="zone" type="text" required></label><button type="submit" data-save></button><button type="button" data-clear></button></form></details><p role="status" data-status></p><p data-solar></p><p data-limit></p><details><summary data-scope-title></summary><p data-scope></p></details>';
  (host.querySelector('#nrPanchGuide')||host).append(box);
  const form=box.querySelector('form');form.style.cssText='display:grid;gap:12px;margin:14px 0';box.querySelectorAll('label').forEach(e=>e.style.cssText='display:grid;gap:6px');box.querySelectorAll('input').forEach(e=>e.style.cssText='box-sizing:border-box;width:100%;min-height:44px;padding:10px;font:inherit;color:var(--nr-copy);background:var(--nr-panel);border:1px solid var(--nr-line);border-radius:8px');box.querySelectorAll('button').forEach(e=>e.className='nr-btn secondary');form.elements.lat.value=location?.lat??'';form.elements.lon.value=location?.lon??'';form.elements.zone.value=location?.zone||Intl.DateTimeFormat().resolvedOptions().timeZone;
  box.querySelector('[data-locate]').onclick=locate;
  form.onsubmit=e=>{e.preventDefault();const x={lat:Number(form.elements.lat.value),lon:Number(form.elements.lon.value),zone:form.elements.zone.value.trim(),saved_at:new Date().toISOString()};if(!form.elements.lat.value.trim()||!form.elements.lon.value.trim()||!valid(x)){message='Некоректні координати або часовий пояс.';render();return}persist(x,'manual')};
  box.querySelector('[data-clear]').onclick=()=>{try{localStorage.removeItem(key);location=null;message='Місце видалено.';form.reset();form.elements.zone.value=Intl.DateTimeFormat().resolvedOptions().timeZone}catch{message='Не вдалося видалити місце.'}render()};
 }
 const put=(selector,text)=>{const e=box.querySelector(selector);if(e.textContent!==text)e.textContent=text};
 for(const [selector,text] of Object.entries({'[data-title]':'Сонце для вашого місця','[data-locate]':'Визначити моє місце','[data-manual]':'Ввести або змінити місце','[data-lat]':'Широта (−90…90)','[data-lon]':'Довгота (−180…180)','[data-zone]':'Часовий пояс IANA','[data-save]':'Зберегти місце','[data-clear]':'Видалити місце','[data-scope-title]':'Які показники залежать від місця'}))put(selector,tr(text));
 box.querySelector('[data-locate]').disabled=busy;put('[data-status]',tr(message));
 put('[data-position]',location?tr(source==='device'?'Координати пристрою: ':source==='manual'?'Введені координати: ':'Збережені координати: ')+location.lat.toFixed(3)+', '+location.lon.toFixed(3)+' · '+location.zone+' · '+new Date(location.saved_at).toLocaleString(window.NRLocale?.locale,{timeZone:location.zone}):tr('Місце ще не визначено. Координати іншого міста не підставляються.'));
 const s=solar(location),fmt=t=>new Intl.DateTimeFormat(window.NRLocale?.locale,{timeZone:location.zone,hour:'2-digit',minute:'2-digit'}).format(new Date(t));
 put('[data-solar]',s.state==='calculated'?s.date+' · '+tr('Схід Сонця: ')+(s.sunrise?fmt(s.sunrise):tr('немає переходу горизонту'))+' · '+tr('Захід Сонця: ')+(s.sunset?fmt(s.sunset):tr('немає переходу горизонту')):tr('Схід і захід недоступні без коректного місця.'));
 put('[data-limit]',tr('Розрахунок для рівного горизонту; погода й рельєф можуть змінити спостережуваний час. Перевірте часовий пояс, особливо в подорожі. Цей блок не змінює бал дня.'));
 put('[data-scope]',tr('Kp, Ap, Dst — спільні геомагнітні індекси. Bz і сонячний вітер вимірюються в космосі, Sn — показник сонячної активності; координати їх не перераховують. Локальний K потребує обсерваторії і тут не підключений. Переходи панчанги показано за часом пристрою; Сонце в цьому блоці — за вказаним місцем. Бал і плани залишаються за Києвом.'));
}
window.NRLocalContext={render,solar,valid};window.addEventListener('nr:locale',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
if(location?.auto&&navigator.permissions)navigator.permissions.query({name:'geolocation'}).then(p=>{if(p.state==='granted')locate()}).catch(()=>{});
})();

// Research views are opt-in and never a second consumer forecast.
(function(){
 const texts={uk:['Відкрити дослідницький архів — не прогноз','G_raw і Live G — технічні розрахунки для досліджень. Вони не замінюють підсумковий бал на екрані «Сьогодні» і не є іншою рекомендацією дня.'],en:['Open research archive — not a forecast','G_raw and Live G are technical research calculations. They do not replace the final score on Today and are not another daily recommendation.'],es:['Abrir archivo de investigación — no es un pronóstico','G_raw y Live G son cálculos técnicos de investigación. No sustituyen la puntuación final de Hoy ni son otra recomendación diaria.'],fr:['Ouvrir les archives de recherche — pas une prévision','G_raw et Live G sont des calculs techniques de recherche. Ils ne remplacent pas le score final dans Aujourd’hui et ne constituent pas une autre recommandation quotidienne.']};
 function label(){const lang=(window.NRLocale?.locale||'uk').slice(0,2),t=texts[lang]||texts.uk;document.querySelectorAll('.nr-research-gate > summary,.nr-legacy-details > summary').forEach(n=>n.textContent=t[0]);document.querySelectorAll('.nr-research-warning').forEach(n=>n.textContent=t[1]);}
 window.addEventListener('nr:locale',label);window.addEventListener('load',label);setTimeout(label,1500);
})();
