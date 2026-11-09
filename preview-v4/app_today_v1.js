/* SkyRhythm design-v4 · «Сьогодні»: бал → трактування → лінія дня → тиждень → три складові →
   космічна погода → небо зараз → дії → персональні інструменти → деталі. Лише порядок і оформлення; дані й бал не змінюються.
   Інші модулі переставляють свої блоки під час рендеру, тому порядок відновлюється після кожної зміни
   складу секції (до відмальовування, без мерехтіння). */
(()=>{'use strict';
const ORDER=[':scope > .nr-o-hero',':scope > .sr-expert-caution',':scope > .sr-time-sun',':scope > .sr-dayline',':scope > [data-week-strip]',':scope > [data-p0-signals]',':scope > .nr-o-weather-brief','[data-sky-now]',':scope > .nr-o-journey',':scope > [data-day-you]',':scope > [data-p0-details]'];
function arrange(root){
 const els=ORDER.map(s=>root.querySelector(s)).filter(Boolean);if(els.length<2)return false;
 let moved=false,prev=els[0];
 for(const el of els.slice(1)){if(prev.nextElementSibling!==el){const focused=el.contains(document.activeElement)?document.activeElement:null;prev.after(el);focused?.focus?.({preventScroll:true});moved=true}prev=el}
 return moved;
}
let observed=null,observer;
function watch(){
 const root=document.querySelector('#nrRoute-today [data-overview="today"]');if(!root){setTimeout(watch,250);return}
 if(observed===root){arrange(root);return}observer?.disconnect();observed=root;root.dataset.appToday='';
 arrange(root);
 observer=new MutationObserver(()=>arrange(root));observer.observe(root,{childList:true});
}
window.NRAppToday={arrange:()=>{const r=document.querySelector('#nrRoute-today [data-overview="today"]');return r?arrange(r):false},order:ORDER};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.addEventListener('sr:consumer-load',watch);
})();
