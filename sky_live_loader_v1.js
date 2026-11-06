// Load/execute the live-sky renderer only when the Sky route is opened.
// The service worker may precache this small module for offline use; it is not a 3D engine.
(function(){
'use strict';
let loading=false;
function load(){
 if(document.hidden||location.hash.split('?')[0]!=='#panch'||loading||window.NRSkyLive)return;
 loading=true;const s=document.createElement('script');s.src='sky_live_v1.js?v=sl2';s.defer=true;
 s.onerror=()=>{loading=false;s.remove();};document.head.append(s);
}
window.addEventListener('hashchange',load);document.addEventListener('visibilitychange',load);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
