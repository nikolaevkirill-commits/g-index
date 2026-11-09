/* SkyRhythm · «Мій журнал збігів» (FP569n, Claude 09.11.2026).
   Counts the person's own evening answers «Сьогодні збіглось? Так / Частково / Ні» (nrDayMatch_v1, local only) and,
   from 5 answers on, shows how often the day matched the score. It is a personal diary, not proof of accuracy. */
(()=>{'use strict';
const L=()=>(window.NRLocale?.language||'uk')==='uk'?0:1;
const T={title:['Мій журнал збігів','My match diary'],need:['Ще {n} відповідей на «Сьогодні збіглось?» — і тут з’явиться, як часто день збігався з оцінкою.','{n} more answers to “Did today match?” and you will see how often the day matched the score.'],
 sum:['За {d} днів: збіглось {y}, частково {p}, не збіглось {no}.','Over {d} days: matched {y}, partly {p}, did not match {no}.'],
 rate:['Збіг (так + ½ частково): {r}%','Match (yes + ½ partly): {r}%'],note:['Це ваш особистий журнал на цьому пристрої, а не доказ точності моделі.','This is your personal diary on this device, not proof of model accuracy.'],
 empty:['Увечері на «Сьогодні» з’являється питання «Сьогодні збіглось?». Відповідайте — тут буде ваша статистика.','In the evening Today asks “Did today match?”. Answer it to build your statistics here.']};
const t=(k,v={})=>T[k][L()].replace(/\{(\w+)\}/g,(_,x)=>v[x]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stats(){let all={};try{all=JSON.parse((window.NRStorage?.get('nrDayMatch_v1','{}')??localStorage.getItem('nrDayMatch_v1'))||'{}')||{}}catch{}
 const v=Object.entries(all).filter(([date])=>/^\d{4}-\d{2}-\d{2}$/.test(date)).map(([,x])=>x?.v).filter(x=>['yes','partial','no'].includes(x));
 const y=v.filter(x=>x==='yes').length,p=v.filter(x=>x==='partial').length,no=v.filter(x=>x==='no').length;
 return {d:v.length,y,p,no,r:v.length?Math.round((y+p/2)/v.length*100):null}}
function html(){const s=stats();let body;
 if(!s.d)body=`<p>${esc(t('empty'))}</p>`;
 else if(s.d<5)body=`<p>${esc(t('need',{n:5-s.d}))}</p><p class="sr-js-sum">${esc(t('sum',s))}</p>`;
 else body=`<p class="sr-js-rate"><strong>${esc(t('rate',s))}</strong></p><div class="sr-js-bar" aria-hidden="true"><i style="width:${s.y/s.d*100}%" class="y"></i><i style="width:${s.p/s.d*100}%" class="p"></i><i style="width:${s.no/s.d*100}%" class="n"></i></div><p class="sr-js-sum">${esc(t('sum',s))}</p>`;
 return `<section class="nr-card sr-journal-stats" data-journal-stats data-sig="${L()}|${s.d}|${s.y}|${s.p}|${s.no}" aria-labelledby="srJsTitle"><h2 id="srJsTitle">${esc(t('title'))}</h2>${body}<p class="sr-js-note">${esc(t('note'))}</p></section>`}
const STYLE=`.sr-journal-stats{margin:16px 0;padding:16px 18px}.sr-journal-stats h2{margin:0 0 6px}.sr-journal-stats p{margin:4px 0;line-height:1.45}
.sr-js-bar{display:flex;height:12px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.08);margin:6px 0}.sr-js-bar i{display:block}
.sr-js-bar .y{background:#63E6AD}.sr-js-bar .p{background:#F2C46B}.sr-js-bar .n{background:#FF858D}.sr-js-note{font-size:.85rem;opacity:.75}`;
function render(){if(!document.getElementById('srJsStyle')){const s=document.createElement('style');s.id='srJsStyle';s.textContent=STYLE;document.head.append(s)}
 const more=document.getElementById('nrRoute-more');if(!more)return;const h=html(),sig=/data-sig="([^"]*)"/.exec(h)[1];
 const old=more.querySelector('[data-journal-stats]');if(old&&old.dataset.sig===sig)return;
 const tmp=document.createElement('div');tmp.innerHTML=h;const el=tmp.firstElementChild;
 if(old)old.replaceWith(el);else{const g=more.querySelector('[data-glossary]');g?g.before(el):more.append(el)}}
let pending=0;const soon=()=>{clearTimeout(pending);pending=setTimeout(()=>{try{render()}catch(e){console.warn('journal_stats',e)}},250)};
for(const ev of ['hashchange','nr:locale','nr:day-match','storage'])window.addEventListener(ev,soon);
function watch(){const r=document.getElementById('nrRoute-more');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRJournalStats=Object.freeze({stats,render});
})();
