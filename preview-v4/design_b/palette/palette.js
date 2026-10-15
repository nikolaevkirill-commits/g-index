/* v7: isolated, accessible palette controller. Never touches forecast/data.
   v7.1 (інтеграція 15.10): #nrRoute-more створюється оболонкою ПІСЛЯ DOMContentLoaded — тимчасовий спостерігач чекає на нього й від'єднується;
   roving tabindex за APG (одна зупинка Tab у групі); підпис групи оновлюється при зміні мови. */
(()=>{'use strict';
const KEY='nr_palette_v1', root=document.documentElement;
let palette='velvet', saveFailed=false, observer=null, scheduled=false;
try{const stored=localStorage.getItem(KEY);if(['classic','velvet'].includes(stored))palette=stored}catch{}
const labels={
 uk:{title:'Палітра оформлення',classic:'Класична',velvet:'Аметистова ніч',error:'Не вдалося зберегти вибір; він діє лише на цій сторінці.'},
 en:{title:'Appearance palette',classic:'Classic',velvet:'Amethyst night',error:'Could not save preference; it applies to this page only.'},
 es:{title:'Paleta visual',classic:'Clásica',velvet:'Noche amatista',error:'No se pudo guardar; el ajuste solo se aplica a esta página.'},
 fr:{title:'Palette visuelle',classic:'Classique',velvet:'Nuit améthyste',error:'Préférence non enregistrée ; ce choix ne s’applique qu’à cette page.'}
};
function apply(){if(palette==='velvet')root.setAttribute('data-nr-palette','velvet');else root.removeAttribute('data-nr-palette')}
function locale(){return labels[window.NRLocale?.language]||labels.uk}
function sync(){const t=locale();document.querySelectorAll('[data-nr-palette-choice]').forEach(button=>{const choice=button.dataset.nrPaletteChoice;button.textContent=t[choice];button.setAttribute('aria-checked',String(palette===choice));button.tabIndex=palette===choice?0:-1});document.querySelectorAll('.nr-palette-options[role=radiogroup]').forEach(g=>g.setAttribute('aria-label',t.title));document.querySelectorAll('[data-nr-palette-title]').forEach(el=>el.textContent=t.title);document.querySelectorAll('[data-nr-palette-status]').forEach(el=>el.textContent=saveFailed?t.error:'')}
function choose(next){if(next!== 'classic'&&next!=='velvet')return;const changed=next!==palette;palette=next;try{localStorage.setItem(KEY,palette);saveFailed=false}catch{saveFailed=true}apply();sync();if(changed)window.NRScenes?.mount?.()}
function create(){const host=document.querySelector('#nrRoute-more');if(!host)return;if(host.querySelector('[data-nr-palette-settings]')){sync();return}const field=document.createElement('fieldset');field.className='nr-palette-settings';field.dataset.nrPaletteSettings='';const legend=document.createElement('legend');legend.dataset.nrPaletteTitle='';field.append(legend);const group=document.createElement('div');group.className='nr-palette-options';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',locale().title);for(const option of ['velvet','classic']){const button=document.createElement('button');button.type='button';button.className='nr-btn secondary nr-palette-option';button.dataset.nrPaletteChoice=option;button.setAttribute('role','radio');button.addEventListener('click',()=>choose(option));button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?'velvet':e.key==='End'?'classic':(option==='velvet'?'classic':'velvet');choose(target);group.querySelector(`[data-nr-palette-choice="${target}"]`)?.focus()});group.append(button)}field.append(group);const status=document.createElement('p');status.dataset.nrPaletteStatus='';status.setAttribute('role','status');field.append(status);host.prepend(field);sync()}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;create()})}
function watchHost(host){create();if(observer)observer.disconnect();observer=new MutationObserver(()=>{if(!host.isConnected){observer.disconnect();waitHost();return}if(!host.querySelector('[data-nr-palette-settings]'))schedule()});observer.observe(host,{childList:true})}
function waitHost(){const host=document.querySelector('#nrRoute-more');if(host){watchHost(host);return}const w=new MutationObserver(()=>{const h=document.querySelector('#nrRoute-more');if(h){w.disconnect();watchHost(h)}});w.observe(document.body,{childList:true,subtree:true})}
function start(){apply();waitHost();window.addEventListener('nr:locale',sync);window.addEventListener('pageshow',sync)}
apply();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.NRPalette={get value(){return palette},set(value){choose(value)}};
})();
