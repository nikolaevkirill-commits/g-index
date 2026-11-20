/* SkyRhythm design-v4 · «Сьогодні»: бал → трактування → Сонце → космічна погода → лінія дня → тиждень → три складові → небо зараз → дії → персональні інструменти → деталі. Лише порядок і оформлення; дані й бал не змінюються.
   Інші модулі переставляють свої блоки під час рендеру, тому порядок відновлюється після кожної зміни
   складу секції (до відмальовування, без мерехтіння). */
(()=>{'use strict';
const HERO=':scope > .nr-o-hero',ACTIVE=':scope > [data-space-scene=today]:is([data-tone=watch],[data-tone=storm])';
const LEAD=[HERO,':scope > .sr-expert-caution'];
const SUN_AND_STATUS=[':scope > .sr-time-sun',':scope > [data-p0-feed-state]'];
const REST=[':scope > [data-space-scene=today]:not([data-tone=watch],[data-tone=storm])',':scope > .sr-dayline',':scope > [data-week-strip]',':scope > [data-p0-signals]',':scope > .nr-o-weather-brief','[data-sky-now]',':scope > .nr-o-journey',':scope > [data-day-you]',':scope > [data-p0-details]'];
const ORDER=[...LEAD,ACTIVE,...SUN_AND_STATUS,...REST];
const COMPACT_ORDER=[...LEAD,...SUN_AND_STATUS,ACTIVE,...REST];
const compact=matchMedia('(max-width:430px) and (max-height:932px)');
function updateWeatherSummary(hero,scene){
 let button=hero.querySelector('[data-weather-summary]');
 if(!compact.matches||!scene){
  button?.remove();
  return;
 }
 const title=scene.querySelector('h3'),forecast=scene.querySelector('.sr-space-forecast');
 if(!title||!forecast)return;
 if(!button){
  button=document.createElement('button');
  button.type='button';button.dataset.weatherSummary='';
  button.addEventListener('click',()=>{
   const heading=document.getElementById(button.getAttribute('aria-controls'));
   if(heading){heading.tabIndex=-1;heading.focus();heading.scrollIntoView({block:'center',behavior:'instant'});}
  });
  hero.append(button);
 }
 button.dataset.tone=scene.dataset.tone;
 button.setAttribute('aria-controls',title.id);
 if(button.textContent!==forecast.textContent)button.textContent=forecast.textContent;
}
function arrange(root){
 const hero=root.querySelector(HERO),alert=root.querySelector(ACTIVE);
 if(hero)updateWeatherSummary(hero,alert);
 const selectors=compact.matches?COMPACT_ORDER:ORDER;
 const els=selectors.map(s=>root.querySelector(s)).filter(Boolean);if(els.length<2)return false;
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
compact.addEventListener('change',watch);
})();
