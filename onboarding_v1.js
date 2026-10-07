(function(){
'use strict';
const key='gidx_onboard_done_v2';let dismissed=false;
function show(force=false){
 const host=document.querySelector('[data-overview="today"]');if(!host)return false;
 let seen=false;try{seen=localStorage.getItem(key)==='1'}catch(e){window.NRDiagnostics?.record('onboard.storage','recoverable')}
 if(!force&&(seen||dismissed))return true;
 if(document.getElementById('nrWelcome'))return true;
 const card=document.createElement('section');card.id='nrWelcome';card.setAttribute('aria-labelledby','nrWelcomeTitle');card.className='nr-welcome';
 card.innerHTML='<h2 id="nrWelcomeTitle">Як читати NeboRhythm</h2><p>Оцінка −3…+3 поєднує Kp NOAA та складові традиційного календаря. Її точність щодо подій не підтверджена.</p><p>Перевіряйте дату й стан джерел. Доба моделі та час плану — за Києвом. «Чому така оцінка» показує внески; «План і щоденник» зберігає ваш власний план і підсумок.</p><button type="button">Зрозуміло</button>';
 card.querySelector('button').onclick=()=>{dismissed=true;try{localStorage.setItem(key,'1')}catch(e){window.NRDiagnostics?.record('onboard.storage','recoverable')}card.remove()};
 host.querySelector('.nr-o-heading').after(card);return true;
}
window.onboardFinish=()=>document.querySelector('#nrWelcome button')?.click();window.onboardNext=()=>show(true);window.obSelectProfile=()=>{};
function mount(){const force=new URLSearchParams(location.search).get('onboard')==='1';if(show(force))return;const observer=new MutationObserver(()=>{if(show(force))observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
