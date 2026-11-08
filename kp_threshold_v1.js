/* SkyRhythm · «Мій поріг Kp» (FP569f). Власний поріг, як в UAV Forecast: попередження в застосунку, коли
   спостережений Kp NOAA або 3-денний прогноз NOAA досягає порогу. Без push і без сервера; 27-денний орієнтир
   не враховується (не прогноз бурі). На бал не впливає. Налаштування лише в цьому браузері. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const KEY='sr_kp_threshold_v1',SEEN='sr_kp_threshold_seen_v1',LEVELS=[4,5,6,7,8];
const T={
 title:['Мій поріг Kp','My Kp threshold','Mi umbral de Kp','Mon seuil Kp'],
 desc:['Покажемо попередження вгорі «Сьогодні», коли Kp NOAA за спостереженням або 3-денним прогнозом досягне вашого порогу. 27-денний орієнтир не враховується. Без push; налаштування лише на цьому пристрої. На бал не впливає.','We show a warning at the top of Today when NOAA Kp (observed or 3-day forecast) reaches your threshold. The 27-day outlook is not used. No push; the setting stays on this device. Does not affect the score.','Mostraremos un aviso arriba en Hoy cuando el Kp de NOAA (observado o previsto a 3 días) alcance tu umbral. No se usa la perspectiva de 27 días. Sin push; el ajuste queda en este dispositivo. No afecta la puntuación.','Un avertissement s’affiche en haut d’Aujourd’hui lorsque le Kp NOAA (observé ou prévu à 3 jours) atteint votre seuil. La tendance à 27 jours n’est pas utilisée. Sans push ; réglage local. Sans effet sur le score.'],
 off:['Вимкнено','Off','Desactivado','Désactivé'],
 g:['буря G','storm G','tormenta G','tempête G'],
 hit:['Ваш поріг Kp','Your Kp threshold','Tu umbral de Kp','Votre seuil Kp'],
 obs:['спостереження NOAA','NOAA observation','observación NOAA','observation NOAA'],
 fc:['прогноз NOAA на','NOAA forecast for','pronóstico NOAA para','prévision NOAA pour'],
 dismiss:['Зрозуміло','Got it','Entendido','Compris'],
 saved:['Збережено.','Saved.','Guardado.','Enregistré.'],
 nodata:['Зараз немає свіжих даних Kp — перевірка поза мережею не виконується.','No fresh Kp data now — nothing is checked offline.','No hay datos de Kp recientes; sin conexión no se comprueba.','Pas de données Kp récentes ; rien n’est vérifié hors ligne.']
};
const t=k=>T[k][ix()];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=v=>new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:2}).format(v);
function getPref(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&LEVELS.includes(v.kp)?v:null}catch{return null}}
function setPref(kp){try{if(getPref()?.kp!==kp)sessionStorage.removeItem(SEEN);if(kp)localStorage.setItem(KEY,JSON.stringify({kp,saved_at:new Date().toISOString()}));else localStorage.removeItem(KEY)}catch{}}
const hour=3600000,slot=3*hour,freshFor=2*hour;
const url='https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
let forecast=null,pendingFetch=false,nextFetch=0;
const fresh=(at,now)=>Number.isFinite(at)&&at<=now&&now-at<=freshFor;
function forecastRows(raw,at){
 if(!Array.isArray(raw))return [];
 const found=new Map(),conflicts=new Set();
 for(const row of raw){
  if(!/^\d{4}-\d{2}-\d{2}T(?:00|03|06|09|12|15|18|21):00:00Z?$/.test(row?.time_tag||''))continue;
  const tag=row.time_tag.endsWith('Z')?row.time_tag:row.time_tag+'Z',start=Date.parse(tag);
  if(!Number.isFinite(start)||new Date(start).toISOString().replace('.000','')!==tag||start+slot<=at||start>at+72*hour)continue;
  if(found.has(start)){conflicts.add(start);continue;}
  found.set(start,row);
 }
 return [...found].filter(([start,row])=>!conflicts.has(start)&&row.observed==='predicted'&&Number.isFinite(row.kp)&&row.kp>=0&&row.kp<=9)
  .map(([start,row])=>({kind:'fc',kp:row.kp,start}));
}
async function loadForecast(){
 const now=Date.now();
 if(!getPref()||pendingFetch||navigator.onLine===false||now<nextFetch)return;
 pendingFetch=true;nextFetch=now+60000;
 try{
  const signal=AbortSignal.timeout(8000),opts={cache:'no-store',signal};
  const res=await fetch('./consumer_cloud/noaa/receipts/cloud.json',opts);
  if(!res.ok)return;
  const receipt=await res.json(),at=Date.parse(receipt.retrieved_at),hash=receipt.sha256;
  if(receipt.url!==url||!fresh(at,Date.now())||!/^[a-f0-9]{64}$/.test(hash)||receipt.body!=='bodies/'+hash+'.json')return;
  if(forecast?.hash===hash){forecast.at=at;return;}
  const body=await fetch('./consumer_cloud/noaa/'+receipt.body,opts);
  if(!body.ok)return;
  const bytes=await body.arrayBuffer();
  if(bytes.byteLength>200000)return;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==hash)return;
  const rows=forecastRows(JSON.parse(new TextDecoder().decode(bytes)),at);
  forecast={hash,at,rows};
 }catch{}
 finally{pendingFetch=false;}
}
function check(threshold,now=Date.now()){
 if(navigator.onLine===false)return [];
 const hits=[];
 const observed=window.currentKpAuthority?.(now);
 if(observed?.provider==='noaa'&&!observed.provisional&&observed.usable&&Number.isFinite(observed.expiresAt)&&observed.expiresAt>=now&&Number.isFinite(observed.kp)&&observed.kp<=9&&observed.kp>=threshold)
  hits.push({kind:'obs',kp:observed.kp,start:observed.expiresAt-6*hour});
 if(fresh(forecast?.at,now)){
  for(const hit of forecast.rows)if(hit.start+slot>now&&hit.start<=now+72*hour&&hit.kp>=threshold)hits.push(hit);
 }
 return hits.sort((a,b)=>b.kp-a.kp||a.start-b.start);
}
function slotText(start){
 const zone=NRCivilTime.localZone();
 const fmt=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{timeZone:zone,dateStyle:'short',timeStyle:'short'});
 return fmt.formatRange(start,start+slot)+' · '+zone;
}
function gLevel(kp){return kp>=5?Math.min(5,Math.floor(kp)-4):0}
function bannerHtml(pref,hit){const g=gLevel(hit.kp);
 const what=hit.kind==='obs'?t('obs'):t('fc')+' '+slotText(hit.start);
 return `<div class="sr-kpt-alert" role="alert" data-kp-threshold-alert data-kp-hit="${hit.kp}" data-kp-kind="${hit.kind}" data-kp-slot="${new Date(hit.start).toISOString()}"><p><b>${esc(t('hit'))} ${pref.kp}:</b> Kp ${esc(nf(hit.kp))}${g?` (${esc(t('g'))}${g})`:''} — ${esc(what.replace(/\.$/,''))}.</p><button type="button" data-kp-threshold-dismiss>${esc(t('dismiss'))}</button></div>`}
function settingsHtml(pref){
 const opts=[0,...LEVELS].map(v=>`<option value="${v}"${(pref?.kp||0)===v?' selected':''}>${v?('Kp ≥ '+v+(gLevel(v)?' · '+t('g')+gLevel(v):'')):esc(t('off'))}</option>`).join('');
 return `<section class="nr-card sr-kpt" data-kp-threshold-settings data-lang="${L()}" aria-labelledby="srKptTitle"><h2 id="srKptTitle">${esc(t('title'))}</h2><p>${esc(t('desc'))}</p><select data-kp-threshold-select aria-labelledby="srKptTitle">${opts}</select><small role="status" data-kp-threshold-status></small></section>`}
const STYLE=`.sr-kpt{margin:16px 0;padding:18px}.sr-kpt h2{margin:0 0 8px}.sr-kpt p{margin:0 0 12px;line-height:1.5}
.sr-kpt select{min-height:44px;min-width:200px;padding:0 12px;border-radius:12px;font:inherit}
.sr-kpt small{display:block;margin-top:6px;opacity:.75}
.sr-kpt-alert{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;margin:0 0 14px;padding:12px 16px;border-radius:16px;border:1px solid #C49BFF;background:rgba(196,155,255,.14);color:inherit}
.sr-kpt-alert p{margin:0;flex:1 1 220px;line-height:1.45}.sr-kpt-alert button{min-height:44px;padding:0 14px;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;font-weight:600;cursor:pointer}
.sr-kpt-alert button:focus-visible,.sr-kpt select:focus-visible{outline:3px solid #D9B777;outline-offset:2px}`;
function seenKey(hit){return [hit.kind,hit.start,hit.kp].join('|')}
function dismissed(hit){try{return JSON.parse(sessionStorage.getItem(SEEN)||'[]').includes(seenKey(hit))}catch{return false}}
function render(){
 if(!document.getElementById('srKptStyle')){const s=document.createElement('style');s.id='srKptStyle';s.textContent=STYLE;document.head.append(s)}
 const pref=getPref();
 const more=document.querySelector('#nrRoute-more');
 const old=more?.querySelector('[data-kp-threshold-settings]');if(old&&old.dataset.lang!==L())old.remove();
 if(more&&!more.querySelector('[data-kp-threshold-settings]')){const anchor=more.querySelector(':scope > .nr-route-head')||more.firstElementChild;const tmp=document.createElement('div');tmp.innerHTML=settingsHtml(pref);anchor?anchor.after(tmp.firstElementChild):more.prepend(tmp.firstElementChild)}
 const today=document.querySelector('#nrRoute-today'),ov=today?.querySelector(':scope > .nr-overview');
 const cur=today?.querySelector(':scope > [data-kp-threshold-alert]');
 const hit=pref?check(pref.kp)[0]:null;
 if(!hit||dismissed(hit)){cur?.remove();return}
 const h=bannerHtml(pref,hit);if(cur&&cur.outerHTML===h&&cur.nextElementSibling===ov)return;
 const tmp=document.createElement('div');tmp.innerHTML=h;const el=tmp.firstElementChild;cur?.remove();if(ov)ov.before(el);else today?.prepend(el);
}
document.addEventListener('change',e=>{const s=e.target.closest?.('[data-kp-threshold-select]');if(!s)return;setPref(+s.value||0);
 const st=s.closest('[data-kp-threshold-settings]')?.querySelector('[data-kp-threshold-status]');if(st)st.textContent=t('saved')+(+s.value&&!check(0).length?' '+t('nodata'):'');render();soon()});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-kp-threshold-dismiss]');if(!b)return;const pref=getPref(),hit=pref&&check(pref.kp)[0];if(hit)try{const raw=JSON.parse(sessionStorage.getItem(SEEN)||'[]'),seen=Array.isArray(raw)?raw:[];sessionStorage.setItem(SEEN,JSON.stringify([...seen,seenKey(hit)].slice(-48)))}catch{};b.closest('[data-kp-threshold-alert]')?.remove()});
let pending=false;const soon=()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;loadForecast().then(render).catch(err=>console.warn('kp_threshold',err))},250)};
for(const ev of ['sr:consumer-load','gindex:consumer-ready','nr:consumer-feed','nr:locale','online','offline','hashchange','storage'])window.addEventListener(ev,soon);
document.addEventListener('nr:location',soon);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)soon();});
setInterval(()=>{if(!document.hidden)soon();},60000);
function watch(){const r=document.getElementById('nrRoute-today');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRKpThreshold=Object.freeze({check,getPref,setPref,render});
})();
