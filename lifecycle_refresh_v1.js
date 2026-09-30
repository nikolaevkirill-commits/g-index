// Versioned lifecycle module; authority and numerical logic stay in the application.
(function(host){
'use strict';
function install({todayKyivStr,runDataRefresh}){

  let hiddenAt=document.hidden?Date.now():null;
  let visibleDay=todayKyivStr(),pendingTimer=null,lastRequest=-Infinity,pendingReason=null;
  function schedule(reason,force){
    const now=Date.now(),day=todayKyivStr(),last=window.__lastRefreshCycle;
    const old=!last || now-last.finishedAt>=60000 || last.status==='partial';
    const away=hiddenAt!==null && now-hiddenAt>=60000;
    if(force && (reason!=='auto'||!pendingReason))pendingReason=reason;
    if(!pendingReason && !old && !away && day===visibleDay)return;
    if(!pendingReason)pendingReason=reason;
    if(document.hidden || !navigator.onLine || pendingTimer!==null)return;
    pendingTimer=setTimeout(()=>{
      pendingTimer=null;
      if(document.hidden || !navigator.onLine)return;
      const requested=pendingReason;pendingReason=null;
      lastRequest=Date.now();hiddenAt=null;visibleDay=todayKyivStr();
      runDataRefresh(requested);
    },Math.max(500,5000-(now-lastRequest)));
  }
  window.requestLifecycleRefresh=schedule;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)hiddenAt=Date.now();else schedule('resume',false);
  });
  window.addEventListener('focus',()=>schedule('resume',false));
  window.addEventListener('online',()=>schedule('online',true));
  window.addEventListener('pageshow',event=>{if(event.persisted)schedule('bfcache',true);});

}
host.NRLifecycle=Object.freeze({install});
})(window);
