/* v7.2 — стани мережі лише для preview (design-v4.html). Кореневі файли основного застосунку не змінюються.
   NRA-04: «Застарілі дані» з'являються лише для ДАНИХ (.json/.csv/.jsonl), а не для кешованих JS/CSS/HTML.
   NRA-03/06: офлайн — один глобальний банер (#offlineBanner) + статус у hero; дублікати ховаються класом html.nr-offline. */
(()=>{'use strict';
const root=document.documentElement;
const isData=u=>{try{return /\.(json|jsonl|csv)$/i.test(new URL(String(u||''),location.href).pathname)}catch{return false}};
// Перший у черзі слухач window (capture) — відкидає «stale» для статичних ресурсів до того, як його побачать інші
window.addEventListener('engine-data-stale',e=>{const u=e?.detail?.url;if(u&&!isData(u))e.stopImmediatePropagation()},true);
const sync=()=>root.classList.toggle('nr-offline',navigator.onLine===false);
const age=()=>{const g=window.__nrConsumerGeneratedAt,el=document.getElementById('offlineDataAge');if(!el||!g||!Number.isFinite(Date.parse(g)))return;const t=new Intl.DateTimeFormat(window.NRLocale?.locale||navigator.language||'uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(g));if(el.textContent!==t)el.textContent=t};
// NRA-05: час банера офлайну — час генерації consumer feed (оновлюється, щойно feed прочитано з кешу)
addEventListener('nr:consumer-feed',age);addEventListener('nr:locale',age);addEventListener('offline',()=>setTimeout(age,0));
sync();addEventListener('online',sync);addEventListener('offline',sync);addEventListener('pageshow',sync);
window.NRPreviewStates={isData,get offline(){return navigator.onLine===false}};
})();
