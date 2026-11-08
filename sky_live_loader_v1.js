// Load/execute the live-sky renderer only when the Sky route is opened.
// The service worker may precache these small scripts; GPU resources are created only in Sky.
(function(){
'use strict';
let loading=false;
function load(){
 if(document.hidden||location.hash.split('?')[0]!=='#panch'||loading||window.NRSkyLive)return;
 loading=true;const s=document.createElement('script');s.src='sky_live_v1.js?v=fp569c-clock';s.defer=true;
 s.onerror=()=>{loading=false;s.remove();};document.head.append(s);
 const gl=document.createElement('script');gl.src='moon_gl_v1.js?v=mg2';gl.defer=true;gl.onload=()=>window.NRSkyLive?.render();document.head.append(gl);
}
window.addEventListener('hashchange',load);window.addEventListener('sr:sky-time',load);document.addEventListener('visibilitychange',load);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
