(function(){
'use strict';
let rows={},selected={},mounted=false,topicFilter='all';
function fmt(value){if(!Number.isFinite(value))return '—';const n=Number(value.toFixed(2));return n<0?'−'+Math.abs(n):n>0?'+'+n:'0';}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLabel=ds=>new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long'}).format(new Date(ds+'T12:00:00Z'));
const time=s=>Number.isFinite(Date.parse(s))?new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s)):'не вказано';
const states={fresh:'Дані актуальні',offline:'Офлайн · збережені дані',stale:'Дані застаріли',missing:'Недостатньо даних',invalid:'Час джерела не підтверджено'};
const dayRange=()=>Array.from({length:27},(_,i)=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
function resolve(ds){return NRConsumerAuthority.resolve(rows[ds],ds,Date.now(),!navigator.onLine||window.__nrConsumerCached===true);}
function factorName(f){if(f==='Kp')return 'Геомагнітна складова (2 − Kp максимум)';if(f==='Moon')return 'Місячна складова';if(f==='Eclipse')return 'Складова затемнення';const reviewedLegend={"Серце":["позначка підтримки нових починань у трактуванні джерела",15],"Екадаші":["традиційний день пожертви й посту; не рекомендація обмежувати харчування",14],"Пітру Пакша":["період вшанування предків; джерело застерігає від нових матеріальних справ",17],"Наваратрі":["свято вшанування Богині-Матері",17],"1 місячний день":["планування й постановка цілей",14],"Мішень":["планування й постановка цілей",14],"Амавасья, день мертвих":["30-й місячний день; вшанування померлих родичів",14],"День порожні руки, несприятливий":["застереження джерела щодо нових справ; тема прибирання й очищення",14],"Сурья Санкранті Перехід Сонця із знаку в інший":["перехід Сонця між знаками; застереження джерела щодо нових проєктів",14],"Тричі  трикутник":["застереження джерела про повторення роботи тричі",15],"Ромб":["застереження джерела про повторення роботи",15],"Зелена печатка":["позначка нових починань у трактуванні джерела",15],"День Божого провидіння":["позначка нових починань у трактуванні джерела; заявлену ним імовірність успіху не підтверджено",15],"Рука":["увага до подій дня",15],"Гучномовець":["реклама й маркетингові проєкти",15],"Віджая дашамі":["свято, пов’язане в джерелі з починаннями",14],"Акаша трітья":["позначка починань у трактуванні джерела",14],"Гуру Пурніма":["вшанування вчителів і вдячність",16],"Прадош врат":["традиційний піст і вшанування Шиви",16],"Санкашті":["традиційне вшанування Ганеші",16],"Ганеша чатуртхі":["свято народження Ганеші",16],"Вінаяка":["традиційне вшанування Ганеші",17],"Діпавалі":["свято світла й добра",17],"Махашиваратрі":["ніч вшанування Шиви",16],"Масік Шиваратрі":["традиційний піст на честь Шиви",16],"Савана Сомвара":["цикл шістнадцяти понеділків; назву зіставлено з Солах Сомвара Врат",16],"Шприц":["позначка хірургічних втручань у джерелі; не медична рекомендація",16]};if(Object.hasOwn(reviewedLegend,f)){const [text,page]=reviewedLegend[f];return f+' — '+text+' (легенда джерела, с. '+page+')';}const legend={'Хрест':'відвідування лікаря й початок лікування; позначка календаря, не медична рекомендація','Книги':'початок навчання','Сукня':'перше вдягання нового одягу','Таблетка':'лікування; позначка календаря, не обіцянка одужання'};if(Object.hasOwn(legend,f))return f+' — '+legend[f]+' (легенда джерела, с. '+(f==='Книги'?'15':'16')+')';return f;}

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
 let saved='auto';try{saved=localStorage.getItem('gindex_theme')||'auto'}catch(e){window.NRDiagnostics?.record('ui.theme_read','recoverable')}
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
 const factors=factorsFor(ds),map={business:['Книги','Гучномовець','Мішень','1 місячний день'],love:['Серце'],health:['Хрест','Таблетка'],sport:[],money:[]};
 const matched=factors.filter(f=>(map[id]||[]).includes(f.factor));
 const prompts={sport:'Визначте власну мету тренування та запишіть фактичний результат.',health:'Запишіть власне спостереження. Медичні рішення узгоджуйте з фахівцем.',business:'Оберіть одну робочу справу та критерій її завершення.',love:'Запишіть тему розмови або спільний план.',money:'Запишіть конкретну справу: перевірити витрати або переглянути бюджет.'};
 return {facts:matched.length?matched.map(f=>factorName(f.factor)).join('; '):factors.length?'Окремих позначок для цієї сфери в календарі немає.':'Календарні входи для цієї дати недоступні.',prompt:prompts[id]||'Оберіть власну справу.',boundary:'Це фокус вашого плану, а не прогноз успіху в цій сфері. Окремого бала немає.'};
}
function routeTools(root,route){
 if(route==='today')return;
 const panel=document.createElement('section');panel.className='nr-o-route-tools';
 if(route==='forecast')panel.innerHTML='<p>Порівняйте оцінки та джерело фізичного прогнозу. Далекий орієнтир має інший горизонт, ніж короткий прогноз.</p><div class="nr-o-horizon-list" aria-label="Оцінки та горизонт прогнозу"></div>';
 else panel.innerHTML='<p>Знайдіть дати з потрібними позначками традиційного календаря. Це пошук тем, а не рейтинг найкращих днів.</p><div class="nr-o-topic-filters" role="group" aria-label="Тема календаря">'+[['all','Усі теми'],...TOPICS].map(t=>'<button type="button" data-topic="'+t[0]+'" aria-pressed="'+(t[0]===topicFilter)+'">'+t[1]+'</button>').join('')+'</div><p class="nr-o-topic-status" role="status"></p><div class="nr-o-topic-days" aria-label="Дати за темою"></div>';
 root.querySelector('.nr-o-heading').after(panel);
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(!b)return;topicFilter=b.dataset.topic;const first=dayRange().find(d=>topicMatches(d,topicFilter));if(first&&!topicMatches(selected[route],topicFilter))selected[route]=first;render(root);});
}
function renderRouteTools(root,route,dates,ds){
 if(route==='forecast'){
  const host=root.querySelector('.nr-o-horizon-list');buttons(host,dates.slice(0,14),ds);
  for(const b of host.children){const r=resolve(b.dataset.day);b.textContent=dateLabel(b.dataset.day)+' · '+fmt(r.score)+' — '+horizon(b.dataset.day)+' · '+states[r.state];}
 }
 if(route==='calendar'){
  root.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===topicFilter)));
  const matching=dates.filter(d=>topicMatches(d,topicFilter));buttons(root.querySelector('.nr-o-topic-days'),matching,ds);
  root.querySelector('.nr-o-topic-status').textContent=topicFilter==='all'?'27 дат. Натисніть дату для пояснення.':matching.length?'Дат із цією позначкою: '+matching.length+'. Оцінка може бути відсутня або застаріла.':'На цих 27 датах такої позначки немає в доступних даних. Нижче залишаються деталі обраної дати.';
 }
}
function openOutcome(){window.fp434Go('plan',false);const form=document.getElementById('nrOutcomeForm');if(!form)return;form.scrollIntoView({block:'start'});form.querySelector('[name=result]')?.focus({preventScroll:true});}

function mount(){
 if(mounted)return true;
 if(!document.getElementById('nrRoute-today'))return false;
 for(const route of ['today','forecast','calendar']){
  const host=document.getElementById('nrRoute-'+route);if(!host)continue;
  const legacy=document.createElement('details');legacy.className='nr-legacy-details';if(window.GINDEX_PLAY_CHANNEL){legacy.hidden=true;legacy.inert=true;}
  const summary=document.createElement('summary');summary.textContent='Дослідницькі та історичні дані · окремі методики';legacy.append(summary);
  for(const child of [...host.children])legacy.append(child);
  const root=document.createElement('section');root.className='nr-overview';root.dataset.overview=route;
  root.innerHTML=`<div class="nr-o-heading"><span>НЕБОРИТМ · EUROPE/KYIV</span><h1>${route==='today'?'Огляд дня':route==='forecast'?'Прогноз і горизонт':'Календар за темами'}</h1></div><label>Дата <select aria-label="Дата оцінки"></select></label><div class="nr-o-state" role="status" aria-live="polite"></div><div class="nr-o-verdict"><div class="nr-o-score" aria-label="Оцінка моделі"></div><h3 class="nr-o-label"></h3></div><p class="nr-o-scale">Шкала моделі: −3…+3 · від негативної до позитивної оцінки; 0 — нейтральна.</p><section class="nr-o-reasons" aria-label="Найбільші внески"><h2>Чому така оцінка</h2><div></div></section><section class="nr-o-practical"><span class="nr-o-eyebrow">ТЕМИ КАЛЕНДАРЯ</span><h2></h2><p></p><small></small><p class="nr-o-boundary">За традиційним календарем джерела. Це не гарантія результату й не медична рекомендація.</p></section><div class="nr-o-actions"><button type="button" data-why>Чому саме так</button><button type="button" data-calendar>${route==='calendar'?'Порівняти оцінки':'Знайти дату за темою'}</button></div><div class="nr-o-layers"><section><h3>Космічна погода</h3><p class="nr-o-weather"></p><small>Фізичні дані окремо від календарних тем.</small></section><section><h3>Мій ритм</h3><p>Ваші нотатки й підсумки плану. Персонального прогнозу поки немає.</p><button type="button" data-journal>Відкрити мій план</button><button type="button" data-outcome>Підсумок дня</button></section></div><p class="nr-o-boundary">Оцінка за формулою джерела. Прогностичну точність щодо подій ще не підтверджено.</p><button type="button" data-settings>Налаштування</button><div class="nr-o-next" aria-label="Наступні дні"></div><details class="nr-o-factors"><summary>Чому така оцінка</summary><div></div></details><details class="nr-o-reference"><summary>Порівняння з експертним джерелом</summary><p></p></details><div class="nr-o-provenance"></div><div class="nr-o-context"></div><details class="nr-o-calendar" ${route==='today'?'':'open'}><summary>Найближчі 14 днів</summary><div class="nr-o-days"></div></details>`;
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
 for(const b of host.children){const ds=b.dataset.day,r=resolve(ds);b.setAttribute('aria-pressed',String(ds===active));b.textContent=dateLabel(ds)+' · '+fmt(r.score);b.setAttribute('aria-label',dateLabel(ds)+': '+fmt(r.score)+', '+states[r.state]);}
}
function render(root){
 const route=root.dataset.overview,dates=dayRange(),ds=dates.includes(selected[route])?selected[route]:today();selected[route]=ds;
 const select=root.querySelector('select');if([...select.options].map(x=>x.value).join()!==dates.join())select.replaceChildren(...dates.map(d=>new Option(dateLabel(d),d)));select.value=ds;
 window.NRCalendarContext?.render(root.querySelector('.nr-o-context'),window.nrRetroEphemeris?.(),ds);
 const r=resolve(ds),own=rows[ds]?.channels?.source_formula||{};
 root.querySelector('.nr-o-state').textContent=states[r.state]+(ds===today()?' · сьогодні за Києвом':' · '+dateLabel(ds));
 root.querySelector('.nr-o-score').textContent=fmt(r.score);
 root.querySelector('.nr-o-label').textContent=r.available?(r.score>0?'Позитивна оцінка':r.score<0?'Негативна оцінка':'Нейтральна оцінка'):'Актуальну оцінку не показуємо';
 renderRouteTools(root,route,dates,ds);
 buttons(root.querySelector('.nr-o-next'),dates.slice(1,4),ds);buttons(root.querySelector('.nr-o-days'),dates.slice(0,14),ds);
 const factors=Array.isArray(own.factors)?own.factors:[],calendar=factors.filter(x=>x.factor!=='Kp'&&x.value!==0),kp=factors.find(x=>x.factor==='Kp');
 const strongest=factors.filter(x=>Number.isFinite(x.value)&&x.value!==0).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,3);
 root.querySelector('.nr-o-reasons div').innerHTML=strongest.length?strongest.map(x=>'<p>'+esc(factorName(x.factor))+' <strong>'+esc(fmt(x.value))+'</strong></p>').join('')+'<p class="nr-o-boundary">'+(r.available?'Найбільші внески; повна сума до округлення й обмеження: '+esc(fmt(own.raw))+'.':'Внески збереженого розрахунку; актуальний підсумок недоступний.')+'</p>':'Складові для цієї дати недоступні.';
 const topics=practical(factors,own,ds),card=root.querySelector('.nr-o-practical');
 card.querySelector('h2').textContent=topics.title;card.querySelector('p').textContent=topics.body;card.querySelector('small').textContent=topics.limit;
 const live=ds===today()&&typeof currentKpAuthority==='function'?currentKpAuthority():null;
 root.querySelector('.nr-o-weather').textContent=live?(live.usable?'Зараз Kp '+live.kp.toFixed(1)+' · '+live.label:'Поточний Kp недоступний — запасне число не показуємо.'):(r.available&&typeof own.kp_daily_max==='number'?'Прогноз добового максимуму Kp '+own.kp_daily_max+' · '+(own.kp_timezone||'часовий пояс не вказано'):'Немає актуального фізичного прогнозу для цієї дати.');
 root.querySelector('.nr-o-factors div').innerHTML=factors.length?`<h4>Календарні складові</h4>${calendar.map(x=>`<p>${esc(factorName(x.factor))} <strong>${esc(fmt(x.value))}</strong></p>`).join('')||'<p>Ненульових внесків немає.</p>'}<h4>Внесок прогнозного Kp</h4><p>Добовий максимум: ${esc(own.kp_daily_max??'—')} · доба ${esc(own.kp_timezone||'не уточнена')}. ${own.kp_input?.fallback?'Резерв: 27-денний прогноз за добу UTC; це не максимум локальної доби.':own.kp_source==='NOAA_3day_slots'?'Повне покриття трьохгодинними NOAA-слотами.':''}</p><p>Внесок у формулу: ${esc(fmt(kp?.value))}. Сума до перетворення: ${esc(fmt(own.raw))}.</p><p>Фізичний показник і календарні складові поєднані правилом моделі; причинний вплив на події не підтверджено.</p>`:'Розклад складових у цьому знімку недоступний.';
 root.querySelector('.nr-o-reference p').textContent='Експертне джерело: '+fmt(r.expertReference)+'. Формула та календарні дані мають спільне походження. Збіг не є незалежним підтвердженням точності.';
 const covered=Object.keys(rows).filter(d=>rows[d]?.channels?.source_formula?.available===true).sort();
 root.querySelector('.nr-o-provenance').textContent=`Розраховано: ${time(r.generated_at)}. ${r.kp_source==='NOAA_3day_slots'?'NOAA отримано: '+time(r.source_retrieved_at)+'. Час випуску у джерелі відсутній.':'NOAA випущено: '+time(r.source_issued_at)+'.'} Час показано для Europe/Kyiv. Покриття знімка: ${covered.length?dateLabel(covered.at(-1)):'немає'}.`+(r.state==='stale'&&r.lastScore!==null?' Остання збережена оцінка: '+fmt(r.lastScore)+'.':'');
}
function update(next){if(next)rows=next;if(!mount())return;document.querySelectorAll('[data-overview]').forEach(render);window.nrRefreshCategoryContext?.();}
window.NRConsumerOverview={update,category,openOutcome};
window.addEventListener('online',()=>update());window.addEventListener('offline',()=>update());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
setInterval(()=>update(),60000);
})();
