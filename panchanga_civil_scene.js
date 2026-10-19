/* R9-inspired 30-tithi dial. Marker follows actual elongation, never decorative rotation. */
(function(root){
 'use strict';
 root.SkyRhythmCivilScene=function(el,angle,tithi){
  if(!el.querySelector('svg')){
   const ticks=Array.from({length:30},(_,i)=>`<line data-tithi="${i+1}" x1="80" y1="10" x2="80" y2="${i%5===0?22:17}" transform="rotate(${i*12+6} 80 80)"/>`).join('');
   const petals=Array.from({length:5},(_,i)=>`<ellipse cx="80" cy="65" rx="12" ry="28" transform="rotate(${i*72} 80 80)"/>`).join('');
   el.innerHTML=`<svg viewBox="0 0 160 160" focusable="false" aria-hidden="true"><g class="sr-civil-petals">${petals}</g><circle class="sr-civil-halo" cx="80" cy="80" r="47"/><g class="sr-civil-ticks">${ticks}</g><circle class="sr-civil-track" cx="80" cy="80" r="59"/><g class="sr-civil-marker"><circle cx="80" cy="21" r="5"/></g><path class="sr-civil-seed" d="M80 68 Q94 80 80 92 Q66 80 80 68Z"/></svg>`;
  }
  el.querySelectorAll('[data-tithi]').forEach(x=>x.classList.toggle('is-current',Number(x.dataset.tithi)===tithi));
  el.querySelector('.sr-civil-marker').style.transform=`rotate(${angle}deg)`;
  el.dataset.tithi=String(tithi);el.dataset.angle=String(angle);
 };
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,node;
 function sync(){if(node)node.classList.toggle('sr-scene-paused',document.hidden||!visible||reduce.matches||document.documentElement.classList.contains('nr-design-motion-off')||document.body.classList.contains('nr-design-motion-off'));}
 function find(){node=document.querySelector('.sr-civil-orbit');if(!node)return false;const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1});io.observe(node);sync();return true;}
 function start(){if(!find()){const mo=new MutationObserver(()=>{if(find())mo.disconnect();});mo.observe(document.body,{childList:true,subtree:true});}
  document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
  const mo=new MutationObserver(sync);mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});mo.observe(document.body,{attributes:true,attributeFilter:['class']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(window);
