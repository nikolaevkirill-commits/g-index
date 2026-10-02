(function(){
'use strict';
let rows={},selected={},mounted=false;
const fmt=n=>typeof n!=='number'?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLabel=ds=>new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long'}).format(new Date(ds+'T12:00:00Z'));
const time=s=>Number.isFinite(Date.parse(s))?new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s)):'не вказано';
const states={fresh:'Дані актуальні',offline:'Офлайн · збережені дані',stale:'Дані застаріли',missing:'Недостатньо даних',invalid:'Час джерела не підтверджено'};
const dayRange=()=>Array.from({length:27},(_,i)=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
function resolve(ds){return NRConsumerAuthority.resolve(rows[ds],ds,Date.now(),!navigator.onLine||window.__nrConsumerCached===true);}
function factorName(f){if(f==='Moon')return 'Місячна складова';if(f==='Eclipse')return 'Складова затемнення';if(['Хрест','Книги','Сукня','Таблетка'].includes(f))return 'Позначка календаря — тлумачення потребує уточнення';return f;}
function mount(){
 if(mounted)return true;
 if(!document.getElementById('nrRoute-today'))return false;
 for(const route of ['today','forecast','calendar']){
  const host=document.getElementById('nrRoute-'+route);if(!host)continue;
  const legacy=document.createElement('details');legacy.className='nr-legacy-details';
  const summary=document.createElement('summary');summary.textContent='Дослідницькі та історичні дані · окремі методики';legacy.append(summary);
  for(const child of [...host.children])legacy.append(child);
  const root=document.createElement('section');root.className='nr-overview';root.dataset.overview=route;
  root.innerHTML=`<div class="nr-o-heading"><span>НЕБОРИТМ · EUROPE/KYIV</span><h1>${route==='today'?'Огляд дня':'Календар оцінок'}</h1></div><label>Дата <select aria-label="Дата оцінки"></select></label><div class="nr-o-state" role="status" aria-live="polite"></div><div class="nr-o-score" aria-label="Оцінка моделі"></div><h3 class="nr-o-label"></h3><p class="nr-o-boundary">Оцінка за формулою джерела. Прогностичну точність щодо подій ще не підтверджено.</p><div class="nr-o-next" aria-label="Наступні дні"></div><details class="nr-o-factors"><summary>Чому така оцінка</summary><div></div></details><details class="nr-o-reference"><summary>Порівняння з експертним джерелом</summary><p></p></details><div class="nr-o-provenance"></div><details class="nr-o-calendar" ${route==='today'?'':'open'}><summary>Найближчі 14 днів</summary><div class="nr-o-days"></div></details>`;
  host.append(root,legacy);selected[route]=today();
  root.querySelector('select').addEventListener('change',e=>{selected[route]=e.target.value;render(root);});
  root.addEventListener('click',e=>{const b=e.target.closest('button[data-day]');if(b){selected[route]=b.dataset.day;render(root);b.focus();}});
 }
 mounted=true;return true;
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
 const r=resolve(ds),own=rows[ds]?.channels?.source_formula||{};
 root.querySelector('.nr-o-state').textContent=states[r.state]+(ds===today()?' · сьогодні':' · '+dateLabel(ds));
 root.querySelector('.nr-o-score').textContent=fmt(r.score);
 root.querySelector('.nr-o-label').textContent=r.available?(r.score>0?'Позитивна оцінка':r.score<0?'Негативна оцінка':'Нейтральна оцінка'):'Актуальну оцінку не показуємо';
 buttons(root.querySelector('.nr-o-next'),dates.slice(1,4),ds);buttons(root.querySelector('.nr-o-days'),dates.slice(0,14),ds);
 const factors=Array.isArray(own.factors)?own.factors:[],calendar=factors.filter(x=>x.factor!=='Kp'&&x.value!==0),kp=factors.find(x=>x.factor==='Kp');
 root.querySelector('.nr-o-factors div').innerHTML=factors.length?`<h4>Календарні складові</h4>${calendar.map(x=>`<p>${esc(factorName(x.factor))} <strong>${esc(fmt(x.value))}</strong></p>`).join('')||'<p>Ненульових внесків немає.</p>'}<h4>Внесок прогнозного Kp</h4><p>Добовий максимум: ${esc(own.kp_daily_max??'—')} · доба ${esc(own.kp_timezone||'не уточнена')}. ${own.kp_input?.fallback?'Резерв: 27-денний прогноз за добу UTC; це не максимум локальної доби.':own.kp_source==='NOAA_3day_slots'?'Повне покриття трьохгодинними NOAA-слотами.':''}</p><p>Внесок у формулу: ${esc(fmt(kp?.value))}. Сума до перетворення: ${esc(fmt(own.raw))}.</p><p>Фізичний показник і календарні складові поєднані правилом моделі; причинний вплив на події не підтверджено.</p>`:'Розклад складових у цьому знімку недоступний.';
 root.querySelector('.nr-o-reference p').textContent='Експертне джерело: '+fmt(r.expertReference)+'. Формула та календарні дані мають спільне походження. Збіг не є незалежним підтвердженням точності.';
 const covered=Object.keys(rows).filter(d=>rows[d]?.channels?.source_formula?.available===true).sort();
 root.querySelector('.nr-o-provenance').textContent=`Розраховано: ${time(r.generated_at)}. ${r.kp_source==='NOAA_3day_slots'?'NOAA отримано: '+time(r.source_retrieved_at)+'. Час випуску у джерелі відсутній.':'NOAA випущено: '+time(r.source_issued_at)+'.'} Час показано для Europe/Kyiv. Покриття знімка: ${covered.length?dateLabel(covered.at(-1)):'немає'}.`+(r.state==='stale'&&r.lastScore!==null?' Остання збережена оцінка: '+fmt(r.lastScore)+'.':'');
}
function update(next){if(next)rows=next;if(!mount())return;document.querySelectorAll('[data-overview]').forEach(render);}
window.NRConsumerOverview={update};
window.addEventListener('online',()=>update());window.addEventListener('offline',()=>update());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
setInterval(()=>update(),60000);
})();
