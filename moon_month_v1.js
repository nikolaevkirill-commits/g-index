/* SkyRhythm · «Місяць по днях» (FP569f). Місячний календар фаз на місяць, як у застосунках-календарях Місяця.
   Фаза — astronomy-engine о 12:00 місцевого часу; чверті — SearchMoonQuarter. На бал не впливає. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const T={
 title:['Місяць по днях','Moon by day','La Luna día a día','La Lune jour par jour'],
 prev:['Попередній місяць','Previous month','Mes anterior','Mois précédent'],
 next:['Наступний місяць','Next month','Mes siguiente','Mois suivant'],
 now:['Цей місяць','This month','Este mes','Ce mois-ci'],
 note:['Фаза о 12:00 місцевого часу. Час чвертей подано в цьому самому поясі. Астрономічний розрахунок, на бал не впливає.','Phase at 12:00 local time. Quarter times use the same zone. Astronomical calculation; no effect on the score.','Fase a las 12:00, hora local. Las horas de las fases usan la misma zona. Cálculo astronómico sin efecto en la puntuación.','Phase à midi, heure locale. Les heures des quartiers utilisent le même fuseau. Calcul astronomique sans effet sur le score.'],
 wax:['росте','waxing','creciente','croissante'],wane:['спадає','waning','menguante','décroissante'],
 q:[['Молодик','Перша чверть','Повня','Остання чверть'],['New Moon','First quarter','Full Moon','Last quarter'],['Luna nueva','Cuarto creciente','Luna llena','Cuarto menguante'],['Nouvelle lune','Premier quartier','Pleine lune','Dernier quartier']],
 qs:[['молодик','1 чв.','повня','3 чв.'],['new','1st q.','full','3rd q.'],['nueva','1.er c.','llena','3.er c.'],['nouv.','1er q.','pleine','3e q.']],
 unavailable:['Розрахунок фаз недоступний.','Phase calculation unavailable.','Cálculo de fases no disponible.','Calcul des phases indisponible.']
};
const t=k=>T[k][ix()];
const loc=()=>({uk:'uk-UA',en:'en-GB',es:'es-ES',fr:'fr-FR'}[L()]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(ms,zone)=>NRCivilTime.dayKey(ms,zone);
let offset=0;
function phaseAt(ms){const A=window.Astronomy;const ill=A.Illumination('Moon',new Date(ms)),ang=A.MoonPhase(new Date(ms));return {k:ill.phase_fraction,waxing:ang<180}}
function disc(k,waxing,r=11){const rx=Math.abs(1-2*k)*r;
 return `<svg viewBox="-13 -13 26 26" aria-hidden="true"><circle r="${r}" class="sr-mm-dark"/><path class="sr-mm-lit" d="M0,${-r} A${r},${r} 0 0 ${waxing?1:0} 0,${r} A${rx.toFixed(2)},${r} 0 0 ${(k>0.5)===waxing?1:0} 0,${-r}Z"/><circle r="${r}" class="sr-mm-rim"/></svg>`}
function monthOf(off,zone){const [y,m]=key(Date.now(),zone).split('-').map(Number);const d=new Date(Date.UTC(y,m-1+off,1));return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1}}
function html(zone=window.NRCivilTime?.localZone()){
 const A=window.Astronomy;if(!A?.Illumination||!window.NRCivilTime)return `<section class="sr-mm" data-moon-month><h2>${esc(t('title'))}</h2><p>${esc(t('unavailable'))}</p></section>`;
 const {y,m}=monthOf(offset,zone),days=new Date(Date.UTC(y,m,0)).getUTCDate(),first=`${y}-${String(m).padStart(2,'0')}-01`,last=`${y}-${String(m).padStart(2,'0')}-${days}`,today=key(Date.now(),zone);
 const quarters={};try{let mq=A.SearchMoonQuarter(new Date(Date.parse(first+'T00:00:00Z')-86400000));for(let i=0;i<8&&mq;i++){const ds=key(+mq.time.date,zone);if(ds>last)break;if(ds>=first)quarters[ds]={q:mq.quarter,at:mq.time.date};mq=A.NextMoonQuarter(mq)}}catch{}
 const lead=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7; // Monday first
 const wk=[...Array(7)].map((_,i)=>new Intl.DateTimeFormat(loc(),{weekday:'narrow',timeZone:'UTC'}).format(new Date(Date.UTC(2024,0,1+i))));
 const fmtTime=d=>new Intl.DateTimeFormat(loc(),{hour:'2-digit',minute:'2-digit',timeZone:zone}).format(d);
 const full=ds=>new Intl.DateTimeFormat(loc(),{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(ds+'T12:00:00Z'));
 let cells='';for(let i=0;i<lead;i++)cells+='<li class="is-pad" aria-hidden="true"></li>';
 for(let d=1;d<=days;d++){const ds=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,at=NRCivilTime.localNoon(ds,zone),p=at===null?null:phaseAt(at),q=quarters[ds];
  const label=full(ds)+': '+(p?Math.round(p.k*100)+' %, '+(p.waxing?t('wax'):t('wane')):t('unavailable'))+(q?' · '+T.q[ix()][q.q]+' '+fmtTime(q.at):'');
  cells+=`<li data-mm-day="${ds}"${ds===today?' aria-current="date"':''}${q?` data-mm-quarter="${q.q}"`:''} aria-label="${esc(label)}"><span class="sr-mm-d" aria-hidden="true">${d}</span>${p?disc(p.k,p.waxing):'—'}</li>`}
 const list=Object.entries(quarters).map(([ds,q])=>`<li>${disc(q.q===0?0:q.q===2?1:0.5,q.q<2,8)} <b>${esc(T.q[ix()][q.q])}</b> — ${esc(full(ds))}, ${esc(fmtTime(q.at))}</li>`).join('');
 const monthName=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,15)));
 return `<section class="sr-mm" data-moon-month data-mm-zone="${esc(zone)}" data-mm-month="${y}-${String(m).padStart(2,'0')}" aria-labelledby="srMmTitle"><div class="sr-mm-head"><h2 id="srMmTitle">${esc(t('title'))} · <span>${esc(monthName)}</span></h2><div class="sr-mm-nav"><button type="button" data-mm-step="-1" aria-label="${esc(t('prev'))}">‹</button><button type="button" data-mm-step="0"${offset===0?' disabled':''}>${esc(t('now'))}</button><button type="button" data-mm-step="1" aria-label="${esc(t('next'))}">›</button></div></div><ol class="sr-mm-wk" aria-hidden="true">${wk.map(w=>`<li>${esc(w)}</li>`).join('')}</ol><ol class="sr-mm-grid">${cells}</ol><ul class="sr-mm-q">${list}</ul><p class="sr-mm-note">${esc(t('note'))} · ${esc(zone)}</p></section>`}
const STYLE=`.sr-mm{margin:16px 0;padding:18px;border:1px solid rgba(185,197,255,.22);border-radius:20px;background:rgba(13,22,48,.72);color:#F3EFF8}
.sr-mm-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.sr-mm h2{margin:0;font:600 21px/1.25 'Literata',Georgia,serif}.sr-mm h2 span{color:#D9B777;font-size:.85em}
.sr-mm-nav{display:flex;gap:6px}html body .sr-mm .sr-mm-nav button{min-width:44px;min-height:44px;padding:0 12px!important;border-radius:12px!important;border:1px solid rgba(185,197,255,.3)!important;background:transparent!important;color:#D9B777!important;font:600 14px/1 'Fira Sans',system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important}
.sr-mm .sr-mm-nav button:disabled{opacity:.45!important;cursor:default}.sr-mm-nav button:focus-visible{outline:3px solid #D9B777;outline-offset:2px}
.sr-mm-wk,.sr-mm-grid{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.sr-mm-wk li{font:500 11px/1.2 'Fira Sans',system-ui,sans-serif;color:rgba(243,239,248,.62);text-transform:lowercase}
.sr-mm-grid li{display:grid;justify-items:center;gap:2px;padding:6px 0 5px;border-radius:10px;border:1px solid transparent}
.sr-mm-grid li[aria-current=date]{border-color:#D9B777;background:rgba(217,183,119,.12)}
.sr-mm-grid li[data-mm-quarter]{background:rgba(255,255,255,.06)}
.sr-mm-d{font:600 13px/1 'Fira Sans',system-ui,sans-serif}.sr-mm-p{font:500 10px/1.1 'Fira Sans',system-ui,sans-serif;color:rgba(243,239,248,.7);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sr-mm-grid svg{width:24px;height:24px}.sr-mm-q svg{width:16px;height:16px;vertical-align:-3px}
.sr-mm-dark{fill:#2a2840}.sr-mm-lit{fill:#f3ecd6}.sr-mm-rim{fill:none;stroke:rgba(243,236,214,.45);stroke-width:1}
.sr-mm-q{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:6px;font:14px/1.45 'Fira Sans',system-ui,sans-serif}
.sr-mm-note{margin:10px 0 0;font:13px/1.45 'Fira Sans',system-ui,sans-serif;color:rgba(243,239,248,.62)}
html[data-nr-theme=light] .sr-mm{background:rgba(255,252,255,.86);color:#2a2240;border-color:rgba(42,34,64,.18)}
html[data-nr-theme=light] .sr-mm-dark{fill:#d9d1dc}html[data-nr-theme=light] .sr-mm-lit{fill:#fffdf4}html[data-nr-theme=light] .sr-mm-rim{stroke:#8f7c8f}
html[data-nr-theme=light] .sr-mm-p,html[data-nr-theme=light] .sr-mm-note,html[data-nr-theme=light] .sr-mm-wk li{color:#5b5470}
@media(forced-colors:active){.sr-mm-lit{fill:CanvasText}.sr-mm-dark{fill:Canvas}.sr-mm-rim{stroke:CanvasText}}
@media(min-width:900px){.sr-mm-wk,.sr-mm-grid,.sr-mm-q{max-width:560px}.sr-mm-grid svg{width:30px;height:30px}.sr-mm-d{font-size:14px}}`;
let lastKey='',lastHtml='';
function render(focusStep){
 const route=document.getElementById('nrRoute-panch'),anchor=route?.querySelector(':scope > [data-sky]');if(!anchor)return;
 if(!document.getElementById('srMoonMonthStyle')){const s=document.createElement('style');s.id='srMoonMonthStyle';s.textContent=STYLE;document.head.append(s)}
 const zone=window.NRCivilTime?.localZone(),signature=[zone,zone?key(Date.now(),zone):'',offset,L(),!!window.Astronomy].join('|');
 const cur=route.querySelector(':scope > [data-moon-month]');
 if(cur&&lastKey===signature&&cur.previousElementSibling===anchor)return;
 if(lastKey!==signature){lastHtml=html(zone);lastKey=signature;}
 const h=lastHtml;
 const tmp=document.createElement('div');tmp.innerHTML=h;const el=tmp.firstElementChild;if(cur)cur.remove();anchor.after(el);
 if(focusStep!==undefined)el.querySelector(`[data-mm-step="${focusStep}"]`)?.focus({preventScroll:true});
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-mm-step]');if(!b)return;const s=+b.dataset.mmStep;offset=s===0?0:offset+s;render(s===0?1:s)});
let pending=false;const soon=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;try{render()}catch(err){console.warn('moon_month',err)}})};
function watch(){const r=document.getElementById('nrRoute-panch');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true});soon()}
for(const ev of ['nr:locale','hashchange','focus'])window.addEventListener(ev,soon);
document.addEventListener('nr:location',()=>{offset=0;soon();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)soon();});
setInterval(()=>{if(!document.hidden&&location.hash==='#panch')soon();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRMoonMonth=Object.freeze({render,html,phaseAt,localNoon:(ds,zone=NRCivilTime.localZone())=>NRCivilTime.localNoon(ds,zone)});
})();
