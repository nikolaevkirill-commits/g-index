/* SkyRhythm · один вибраний день для всіх вкладок (огляд, прогноз, календар, небо).
   Вибір дати в будь-якому місці переносить її в інші; дата поза їхнім діапазоном не нав'язується. */
(()=>{'use strict';
let busy=false;
function apply(ds,from){
 if(busy||!/^\d{4}-\d{2}-\d{2}$/.test(ds||''))return;busy=true;
 try{
  for(const sel of document.querySelectorAll('.nr-route [data-overview] select')){
   if(sel===from||sel.value===ds||![...sel.options].some(o=>o.value===ds))continue;
   sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if(from!=='sky'&&window.NRSkyScene?.selected?.()!==ds&&window.NRSkyScene?.state?.()==='ready')window.NRSkyScene.select(ds);
  window.__nrSharedDay=ds;
 }finally{busy=false}
}
document.addEventListener('change',e=>{const s=e.target;if(s.matches?.('.nr-route [data-overview] select'))apply(s.value,s)},true);
window.addEventListener('nr:day',e=>apply(e.detail,'sky'));
window.NRSharedDay={apply:ds=>apply(ds,null),get:()=>window.__nrSharedDay||null};
})();
