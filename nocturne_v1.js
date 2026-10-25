// Presentation only: move existing nodes, preserving their text and handlers.
(function(){
 function arrange(){
  const root=document.querySelector('[data-overview=today]');
  if(!root||root.classList.contains('sr-p0-today'))return;
  const hero=root.querySelector('.nr-o-hero'),journey=root.querySelector('.nr-o-journey');
  if(!hero||!journey)return;

  let details=root.querySelector('.sr-day-context');
  if(!details){details=document.createElement('div');details.className='sr-day-context';}
  const dayline=root.querySelector('.sr-dayline');
  if(dayline&&hero.nextElementSibling!==dayline)hero.after(dayline);
  const first=dayline||hero;
  if(first.nextElementSibling!==journey)first.after(journey);
  const anchor=journey;
  if(anchor.nextElementSibling!==details)anchor.after(details);
  for(const selector of ['[data-reason-brief]','[data-weather-brief]']){
   const node=root.querySelector(selector);
   if(node&&node.parentElement!==details)details.append(node);
  }
 }
 const observer=new MutationObserver(arrange);observer.observe(document.documentElement,{childList:true,subtree:true});arrange();
})();
