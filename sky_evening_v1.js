/* SkyRhythm · «Вечір під небом» (FP569n, Claude 09.11.2026).
   A plain go/wait answer for tonight, like the best aurora/astronomy apps give: when it gets dark, whether the Moon
   washes out the stars, which bright planets are up and where. Everything is computed with astronomy-engine for the
   chosen place (Kyiv by default). Clouds are NOT known to the app and are said so. Does not affect the day score. */
(()=>{'use strict';
const I=['uk','en','es','fr'],li=()=>Math.max(0,I.indexOf(window.NRLocale?.language||'uk'));
const T={
 title:['Вечір під небом','Tonight’s sky','El cielo esta noche','Le ciel ce soir'],
 dark:['Морські сутінки закінчуються о','Nautical twilight ends at','El crepúsculo náutico acaba a las','Le crépuscule nautique se termine à'],
 ongoing:['Сонце вже нижче −12° о','The Sun is already below −12° at','El Sol ya está por debajo de −12° a las','Le Soleil est déjà sous −12° à'],
 good:['Місяць мало заважає спостереженню в цей час.','Little interference from moonlight at this time.','Buena noche para las estrellas: la Luna no molesta.','Bonne soirée pour les étoiles : la Lune ne gêne pas.'],
 moon:['Яскравий Місяць може заважати бачити слабкі зорі.','A bright Moon may make faint stars harder to see.','La Luna brilla: estrellas débiles peor, planetas bien.','La Lune est brillante : étoiles faibles gênées, planètes faciles.'],
 moonLate:['Місяць зійде о','The Moon rises at','La Luna sale a las','La Lune se lève à'],
 moonSet:['Місяць зайде о','The Moon sets at','La Luna se pone a las','La Lune se couche à'],
 later:['Пізніше зійдуть','Rising later','Saldrán más tarde','Se lèveront plus tard'],
 planets:['Яскраві планети для спостереження о','Bright planets to look for at','Planetas brillantes para buscar a las','Planètes brillantes à chercher à'],
 none:['Яскравих планет над горизонтом немає.','No bright planets above the horizon.','No hay planetas brillantes sobre el horizonte.','Pas de planète brillante au-dessus de l’horizon.'],
 clouds:['Хмарність застосунок не знає — перевірте прогноз погоди.','The app does not know the clouds — check the weather forecast.','La app no conoce las nubes: mire el pronóstico.','L’app ne connaît pas les nuages : vérifiez la météo.'],
 low:['низько','low','bajo','bas'],high:['високо','high','alto','haut'],
 noDark:['Цієї ночі Сонце не опускається до −12°: морські сутінки не закінчуються.','The Sun does not reach −12° tonight: nautical twilight does not end.','El Sol no llega a −12° esta noche: el crepúsculo náutico no termina.','Le Soleil n’atteint pas −12° cette nuit : le crépuscule nautique ne se termine pas.']
};
const t=k=>T[k][li()];
const NAMES={Moon:['Місяць','Moon','Luna','Lune'],Venus:['Венера','Venus','Venus','Vénus'],Mars:['Марс','Mars','Marte','Mars'],Jupiter:['Юпітер','Jupiter','Júpiter','Jupiter'],Saturn:['Сатурн','Saturn','Saturno','Saturne'],Mercury:['Меркурій','Mercury','Mercurio','Mercure']};
const GLYPH={Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Mercury:'☿'};
const DIRS=[['пн','N','N','N'],['пн-сх','NE','NE','NE'],['сх','E','E','E'],['пд-сх','SE','SE','SE'],['пд','S','S','S'],['пд-зх','SW','SO','SO'],['зх','W','O','O'],['пн-зх','NW','NO','NO']];
const dir=az=>DIRS[Math.round(((az%360)+360)%360/45)%8][li()];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function compute(at,loc){
 const A=window.Astronomy,C=window.NRCivilTime;if(!A||!C||!loc?.zone||!Number.isFinite(at))return null;
 const obs=new A.Observer(loc.lat,loc.lon,loc.elevation||0);
 // Local civil noon to next local noon, including evenings whose dusk is after midnight.
 const day=C.dayKey(at,loc.zone), next=new Date(Date.parse(day+'T12:00:00Z')+864e5).toISOString().slice(0,10);
 const noon=C.localNoon(day,loc.zone), end=C.localNoon(next,loc.zone);
 if(noon===null||end===null||end<=noon)return null;
 const atAlt=(b,time,ref)=>{const eq=A.Equator(b,time,obs,true,true);return A.Horizon(time,obs,eq.ra,eq.dec,ref)};
 const dusk=A.SearchAltitude('Sun',obs,-1,new Date(noon),(end-noon)/864e5,-12);
 // Polar winter can already be below −12° in the evening without a crossing.
 const look=new Date(dusk?dusk.date.getTime()+30*6e4:noon+6*36e5);
 if(atAlt('Sun',look,undefined).altitude>-12){
  if(!dusk)return {noDark:true,day};
  look.setTime(dusk.date.getTime()+1000);
 }
 const hz=b=>atAlt(b,look,'normal');
 const moonH=hz('Moon'),moonF=A.Illumination('Moon',look).phase_fraction;
 const rise=A.SearchRiseSet('Moon',obs,+1,look,0.5),set=A.SearchRiseSet('Moon',obs,-1,look,0.5);
 const planets=['Venus','Jupiter','Mars','Saturn','Mercury'].map(b=>{const h=hz(b),m=A.Illumination(b,look).mag;return {b,alt:h.altitude,az:h.azimuth,mag:m}}).filter(p=>p.alt>8&&p.mag<=2).sort((a,b)=>a.mag-b.mag);
 // Bright planets that rise later the same night (before 02:00 local-ish: within 8 h of the look time).
 const later=['Jupiter','Venus','Mars','Saturn'].filter(b=>!planets.some(p=>p.b===b)).map(b=>{const r=A.SearchRiseSet(b,obs,+1,look,0.34);return r&&A.Illumination(b,r.date).mag<=2?{b,at:r.date}:null}).filter(Boolean).sort((a,b)=>a.at-b.at);
 return {day,later,dusk:dusk?.date||null,look,moonUp:moonH.altitude>0,moonF,moonRise:rise?.date||null,moonSet:set?.date||null,planets};
}
function html(c,zone){
 const tf=d=>new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
 if(!c)return '';
 if(c.noDark)return `<section class="nr-card sr-evening" data-sky-evening><h2>${esc(t('title'))}</h2><p>${esc(t('noDark'))}</p></section>`;
 const brightMoon=c.moonUp&&c.moonF>.45;
 const verdict=brightMoon?t('moon'):t('good');
 const moonLine=!c.moonUp&&c.moonRise&&c.moonRise-c.look<12*36e5?t('moonLate')+' '+tf(c.moonRise)+'.':c.moonUp&&c.moonSet&&c.moonSet-c.look<12*36e5?t('moonSet')+' '+tf(c.moonSet)+'.':'';
 const list=c.planets.length?c.planets.map(p=>`<li><b aria-hidden="true">${GLYPH[p.b]}︎</b> <span>${esc(NAMES[p.b][li()])}</span> <small>${esc(dir(p.az))} · ${esc(p.alt>35?t('high'):t('low'))}</small></li>`).join(''):`<li>${esc(t('none'))}</li>`;
 return `<section class="nr-card sr-evening is-${brightMoon?'moon':'good'}" data-sky-evening data-verdict="${brightMoon?'moon':'good'}" aria-labelledby="srEveningTitle">
<h2 id="srEveningTitle">${esc(t('title'))}</h2>
<p class="sr-ev-verdict"><span aria-hidden="true">${brightMoon?'◐':'✦'}</span> ${esc(verdict)}</p>
<p class="sr-ev-dark">${esc(t(c.dusk?'dark':'ongoing'))} <strong>${esc(tf(c.dusk||c.look))}</strong>${moonLine?' · '+esc(moonLine):''}</p>
<p class="sr-ev-sub">${esc(t('planets'))} ${esc(tf(c.look))}:</p><ul class="sr-ev-planets">${list}</ul>
${c.later?.length?`<p class="sr-ev-sub">${esc(t('later'))}: ${c.later.map(x=>esc(GLYPH[x.b]+'\uFE0E '+NAMES[x.b][li()]+' ~'+tf(x.at))).join(' · ')}</p>`:''}<p class="sr-ev-note">${esc(t('clouds'))}</p></section>`;
}
const STYLE=`.sr-evening{margin:0 0 16px;padding:16px 18px;border-radius:20px;border:1px solid rgba(242,196,107,.45);background:linear-gradient(160deg,rgba(26,32,82,.95),rgba(11,16,48,.95))}
.sr-evening h2{margin:0 0 6px;font:600 1.25rem/1.25 Georgia,serif}
.sr-evening p{margin:4px 0;line-height:1.45}.sr-ev-verdict{font-weight:700;font-size:1.05rem}
.sr-evening.is-good .sr-ev-verdict{color:#8FE0BE}.sr-evening.is-moon .sr-ev-verdict{color:#F2C46B}
.sr-ev-planets{list-style:none;margin:6px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sr-ev-planets li{padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(185,163,227,.25)}
.sr-ev-planets b{color:#F2C46B}.sr-ev-planets small{opacity:.8}
.sr-ev-note{font-size:.85rem;opacity:.75}`;
let last='';
function render(){
 if(!document.getElementById('srEveningStyle')){const s=document.createElement('style');s.id='srEveningStyle';s.textContent=STYLE;document.head.append(s);}
 const route=document.getElementById('nrRoute-panch');if(!route||!window.SRSkyTime||!window.Astronomy)return;
 const anchor=route.querySelector('[data-sky-live]');if(!anchor)return;
 const s=SRSkyTime.snapshot(),day=new Intl.DateTimeFormat('en-CA',{timeZone:s.zone}).format(new Date(s.at)),key=[day,s.zone,s.loc?.lat,s.loc?.lon,s.loc?.elevation,li()].join('|');
 let el=route.querySelector('[data-sky-evening]');
 if(el&&key===last&&el.nextElementSibling===anchor)return;
 if(document.hidden||location.hash.split('?')[0]!=='#panch')return;
 let c=null;try{c=compute(s.at,s.loc)}catch(_){c=null}
 const h=html(c,s.zone);last=key;
 if(!h){el?.remove();return;}
 const tmp=document.createElement('div');tmp.innerHTML=h;const next=tmp.firstElementChild;
 if(el)el.replaceWith(next);else anchor.before(next);
}
let pending=0;const soon=()=>{clearTimeout(pending);pending=setTimeout(()=>{try{render()}catch(e){console.warn('sky_evening',e)}},200)};
for(const ev of ['hashchange','nr:locale','sr:sky-time'])window.addEventListener(ev,soon);document.addEventListener('nr:location',soon);
function watch(){const r=document.getElementById('nrRoute-panch');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRSkyEvening=Object.freeze({compute,render});
})();
