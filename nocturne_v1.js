// Presentation only: move existing nodes, preserving their text and handlers.
(function(){
 function arrange(){
  const root=document.querySelector('[data-overview=today]');
  if(!root)return;
  const hero=root.querySelector('.nr-o-hero'),journey=root.querySelector('.nr-o-journey');
  if(!hero||!journey)return;
  if(hero.nextElementSibling!==journey)hero.after(journey);
  let details=root.querySelector('.sr-day-context');
  if(!details){details=document.createElement('div');details.className='sr-day-context';}
  if(journey.nextElementSibling!==details)journey.after(details);
  for(const selector of ['[data-reason-brief]','[data-weather-brief]']){
   const node=root.querySelector(selector);
   if(node&&node.parentElement!==details)details.append(node);
  }
 }
 const observer=new MutationObserver(arrange);observer.observe(document.documentElement,{childList:true,subtree:true});arrange();
})();