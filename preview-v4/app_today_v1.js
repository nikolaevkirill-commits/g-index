/* SkyRhythm design-v4 · «Сьогодні»: бал → трактування → Сонце → космічна погода → лінія дня → тиждень → три складові → небо зараз → дії → персональні інструменти → деталі. Лише порядок і оформлення; дані й бал не змінюються.
   Інші модулі переставляють свої блоки під час рендеру, тому порядок відновлюється після кожної зміни
   складу секції (до відмальовування, без мерехтіння). */
(()=>{'use strict';
const ORDER=[':scope > .nr-o-hero',':scope > .sr-expert-caution',':scope > [data-space-scene=today][data-tone=storm]:is([data-level="3"],[data-level="4"],[data-level="5"])',':scope > .sr-time-sun',':scope > [data-space-scene=today]:not([data-tone=storm]:is([data-level="3"],[data-level="4"],[data-level="5"]))',':scope > .sr-dayline',':scope > [data-week-strip]',':scope > [data-p0-signals]',':scope > [data-today-more]',':scope > .nr-o-weather-brief','[data-sky-now]',':scope > .nr-o-journey',':scope > [data-day-you]',':scope > [data-p0-details]'];
// FP573: G3–G5 keep the full space-weather card above the Sun clock (NOAA scale: satellite navigation and HF radio
// problems start at G3). Watch and G1–G2 get one line inside the day card; the full card follows the Sun clock.
const ALERT_MORE={uk:'Детально ↓',en:'Details ↓',es:'Detalles ↓',fr:'Détails ↓'};
let heroSkyPending=0;
function syncHeroSkySoon(root){if(heroSkyPending)return;heroSkyPending=requestAnimationFrame(()=>{heroSkyPending=0;try{syncHeroSky(root);}catch(_){}});}
function syncAlert(root){
 const hero=root.querySelector(':scope > .nr-o-hero'),scene=root.querySelector(':scope > [data-space-scene=today]');
 let alert=hero?.querySelector(':scope > [data-space-alert]');
 // The day card may already warn about the storm («Уважно: буря за прогнозом NOAA G1»); one mention is enough.
 const warned=!!hero&&/NOAA\s*G[1-5]/.test([...hero.children].filter(e=>!e.matches('[data-space-alert],canvas')).map(e=>e.textContent).join(' '));
 const tone=scene?.dataset.tone,compact=!warned&&!!(hero&&scene&&(tone==='watch'||tone==='storm')&&!scene.matches('[data-tone=storm]:is([data-level="3"],[data-level="4"],[data-level="5"])'));
 if(!compact){alert?.remove();return;}
 const title=scene.querySelector('h3')?.textContent||'',forecast=scene.querySelector('.sr-space-forecast')?.textContent||'';
 const key=[tone,title,forecast,window.NRLocale?.language||'uk'].join('|');
 if(alert?.dataset.key===key)return;
 if(!alert){alert=document.createElement('div');alert.dataset.spaceAlert='';alert.className='sr-space-alert';alert.setAttribute('role','status');hero.append(alert);}
 alert.dataset.key=key;alert.dataset.tone=tone;
 // One sentence: the forecast line already names the level and the date; the card title stays for screen readers.
 const line=document.createElement('span');line.textContent=forecast||title;alert.setAttribute('aria-label',title+'. '+forecast);
 const more=document.createElement('button');more.type='button';more.textContent=ALERT_MORE[window.NRLocale?.language]||ALERT_MORE.uk;
 more.addEventListener('click',()=>{const card=root.querySelector(':scope > [data-space-scene=today]');if(!card)return;card.scrollIntoView({block:'start',behavior:'instant'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}});
 alert.replaceChildren(line,more);
}
// FP573: «Живе небо» — the day card shows the real sky of the shown moment and place: colour from the Sun altitude,
// Sun and Moon at their azimuth/altitude (view to the south, east on the left), the Moon in its real phase, stars
// after civil dusk and an aurora band only when NOAA forecasts a storm. Decorative: aria-hidden, no layout change.
const HERO_SKY={raf:0,timer:0,size:'',key:''};
function heroSkyState(){
 const A=window.Astronomy,snap=window.SRSkyTime?.snapshot?.();if(!A||!snap?.loc)return null;
 const at=new Date(snap.mode==='now'?Date.now():snap.at),loc=snap.loc,obs=new A.Observer(loc.lat,loc.lon,loc.elevation||0);
 const pos=body=>{const eq=A.Equator(body,at,obs,true,true),h=A.Horizon(at,obs,eq.ra,eq.dec,'normal');return {alt:h.altitude,az:h.azimuth};};
 let sun,moon,phase,illum;
 try{sun=pos('Sun');moon=pos('Moon');phase=A.MoonPhase(at);illum=A.Illumination('Moon',at).phase_fraction;}catch(_){return null;}
 const scene=document.querySelector('#nrRoute-today [data-space-scene=today]');
 const level=Number(scene?.dataset.level)||0;
 return {at:+at,sun,moon,phase,illum,level};
}
function skyColours(alt){
 // night < -12°, twilight to 0°, day above; muted so text stays readable.
 if(alt<-12)return ['#050a1c','#0d1638','#1a2552'];
 if(alt<-6)return ['#0a1030','#22285c','#4a3f7a'];
 if(alt<0)return ['#141a46','#4b3f80','#c27a6a'];
 if(alt<8)return ['#1f3a78','#5a6fae','#e3a77a'];
 return ['#173a7a','#3d6fb3','#86b3df'];
}
function drawHeroSky(canvas,state,t){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),W=Math.max(1,Math.round(r.width)),H=Math.max(1,Math.round(r.height));
 if(canvas.width!==W*dpr||canvas.height!==H*dpr){canvas.width=W*dpr;canvas.height=H*dpr;}
 const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 const band=Math.min(H,300),horizon=band*0.88,c=skyColours(state.sun.alt);
 const sky=g.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,c[0]);sky.addColorStop(.6,c[1]);sky.addColorStop(1,c[2]);
 g.fillStyle=sky;g.fillRect(0,0,W,horizon);
 g.fillStyle='rgba(10,15,36,1)';
 const dark=state.sun.alt<-6;
 if(dark){ // deterministic stars
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<Math.round(W*band/1500);i++){const x=rnd()*W,y=rnd()*horizon*.95,s=rnd()*1.6+.6,tw=t?(.6+.4*Math.sin(t/900+i)):.85;g.globalAlpha=Math.min(1,(state.sun.alt<-12?1:.6)*tw*(.5+.5*x/W));g.fillStyle='#fff';g.beginPath();g.arc(x,y,s/2,0,Math.PI*2);g.fill();}
  g.globalAlpha=1;
 }
 if(state.level>0){ // aurora only on a NOAA storm forecast; stronger storms reach lower
  const amp=Math.min(1,.35+state.level*.13);
  for(let k=0;k<3;k++){
   const band=g.createLinearGradient(0,0,0,horizon*.75);band.addColorStop(0,'rgba(120,255,190,0)');band.addColorStop(.55,'rgba(110,240,170,'+(dark?.22:.1)*amp+')');band.addColorStop(1,'rgba(160,90,255,0)');
   g.fillStyle=band;g.beginPath();g.moveTo(0,horizon*.2);
   for(let x=0;x<=W;x+=8){const y=horizon*(.28+.12*k)+Math.sin(x/(70+k*25)+(t||0)/2400+k)*14;g.lineTo(x,y);}
   g.lineTo(W,0);g.lineTo(0,0);g.closePath();g.fill();
  }
 }
 const place=p=>{if(p.az<60||p.az>300||p.alt<-4)return null;return {x:W*.6+(p.az-60)/240*W*.36,y:horizon-Math.min(60,Math.max(-4,p.alt))/60*horizon*.42};};
 const sun=place(state.sun);
 if(sun){const glow=g.createRadialGradient(sun.x,sun.y,0,sun.x,sun.y,46);glow.addColorStop(0,'rgba(255,236,170,.95)');glow.addColorStop(.25,'rgba(255,210,120,.55)');glow.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=glow;g.beginPath();g.arc(sun.x,sun.y,46,0,Math.PI*2);g.fill();g.fillStyle='#fff4cf';g.beginPath();g.arc(sun.x,sun.y,8,0,Math.PI*2);g.fill();}
 const moon=place(state.moon);
 if(moon){const R=11;g.save();g.translate(moon.x,moon.y);
  g.fillStyle='rgba(40,48,80,.9)';g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fill();
  // lit part: phase 0 new, 180 full; waxing lit on the right (northern hemisphere view)
  const waxing=state.phase<180,f=state.illum,k=Math.cos(Math.PI*f);
  g.fillStyle='#f3eedb';g.beginPath();g.arc(0,0,R,-Math.PI/2,Math.PI/2,!waxing);g.ellipse(0,0,Math.abs(k)*R,R,0,Math.PI/2,-Math.PI/2,(k>0)===waxing);g.fill();
  const halo=g.createRadialGradient(0,0,R,0,0,R*2.6);halo.addColorStop(0,'rgba(240,236,210,'+(.18*f+.05)+')');halo.addColorStop(1,'rgba(240,236,210,0)');g.fillStyle=halo;g.beginPath();g.arc(0,0,R*2.6,0,Math.PI*2);g.fill();
  g.restore();}
 // ground and readability scrim (text sits on the left)
 // a low hill line, then fade into the card colour below the sky band
 g.fillStyle='#0a0f24';g.beginPath();g.moveTo(0,horizon);for(let x=0;x<=W;x+=12)g.lineTo(x,horizon-4-3*Math.sin(x/37)-2*Math.sin(x/11));g.lineTo(W,band);g.lineTo(0,band);g.closePath();g.fill();
 const ground=g.createLinearGradient(0,horizon,0,Math.min(H,band+60));ground.addColorStop(0,'rgba(10,15,36,1)');ground.addColorStop(1,'rgba(10,15,36,0)');g.fillStyle=ground;g.fillRect(0,horizon,W,Math.min(H,band+60)-horizon);
 const scrim=g.createLinearGradient(0,0,W,0);scrim.addColorStop(0,'rgba(6,10,28,.78)');scrim.addColorStop(.45,'rgba(6,10,28,.5)');scrim.addColorStop(1,'rgba(6,10,28,.08)');g.fillStyle=scrim;g.fillRect(0,0,W,band);
}
function syncHeroSky(root){
 const hero=root.querySelector(':scope > .nr-o-hero');if(!hero)return;
 let canvas=hero.querySelector(':scope > canvas.sr-hero-sky');
 if(!canvas){canvas=document.createElement('canvas');canvas.className='sr-hero-sky';canvas.setAttribute('aria-hidden','true');hero.append(canvas);hero.dataset.heroSky='';} // appended: p0_layout keeps the title block first (moving it would drop focus)
 const state=heroSkyState();if(!state){canvas.hidden=true;return;}
 canvas.hidden=false;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off'||document.documentElement.classList.contains('nr-design-motion-off');
 cancelAnimationFrame(HERO_SKY.raf);
 const animate=!reduce&&(state.sun.alt<-6||state.level>0);
 let last=0;
 const frame=t=>{if(!canvas.isConnected||document.hidden)return;if(!animate||t-last>=66){last=t;drawHeroSky(canvas,state,animate?t:0);}if(animate)HERO_SKY.raf=requestAnimationFrame(frame);};
 frame(animate?performance.now():0);
}
// FP573: Today keeps the day card, Sun, space weather, day line, week and signals open. NOAA warnings, the planet
// card and the compare tools repeat other routes, so they fold behind «Ще про день» (kept in the DOM and in order;
// folded = zero height and inert, so links, tests and screen readers do not reach hidden controls).
const MORE_SEL=[':scope > .nr-o-weather-brief',':scope > [data-sky-now]',':scope > .nr-o-journey'];
const MORE_COPY={uk:['Ще про день','попередження NOAA, небо дня, порівняння','Згорнути'],en:['More about the day','NOAA warnings, sky of the day, compare','Collapse'],es:['Más sobre el día','avisos de NOAA, cielo del día, comparar','Contraer'],fr:['Plus sur la journée','alertes NOAA, ciel du jour, comparer','Réduire']};
function moreOpen(){try{return localStorage.getItem('srTodayMore')==='1';}catch(_){return false;}}
function syncMore(root){
 const items=MORE_SEL.map(s=>root.querySelector(s)).filter(Boolean);
 let button=root.querySelector(':scope > [data-today-more]');
 if(!items.length){button?.remove();return;}
 if(!button){button=document.createElement('button');button.type='button';button.dataset.todayMore='';button.className='sr-today-more';
  button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';try{localStorage.setItem('srTodayMore',open?'1':'0');}catch(_){}syncMore(root);if(open)items[0]?.focus?.({preventScroll:true});});
  items[0].before(button);}
 const open=moreOpen(),c=MORE_COPY[window.NRLocale?.language]||MORE_COPY.uk;
 button.setAttribute('aria-expanded',String(open));
 const label=open?c[2]:c[0];
 if(button.dataset.label!==label+c[1]){button.dataset.label=label+c[1];button.replaceChildren(Object.assign(document.createElement('b'),{textContent:label}),Object.assign(document.createElement('small'),{textContent:open?'':c[1]}));}
 for(const el of items){el.classList.toggle('sr-folded',!open);if(open)el.removeAttribute('inert');else el.setAttribute('inert','');}
}
// FP573: the score ring sweeps in once per page load (CSS, number unchanged); later re-renders stay still.
let scoreIntro=false;
function syncScoreIntro(root){
 if(scoreIntro||!root.querySelector(':scope > .nr-o-hero .nr-o-score[data-ring=value]'))return;
 scoreIntro=true;root.classList.add('sr-score-intro');setTimeout(()=>root.classList.remove('sr-score-intro'),1800);
}
function arrange(root){
 syncAlert(root);
 syncScoreIntro(root);
 syncMore(root);
 syncHeroSkySoon(root);
 const els=ORDER.map(s=>root.querySelector(s)).filter(Boolean);if(els.length<2)return false;
 let moved=false,prev=els[0];
 for(const el of els.slice(1)){if(prev.nextElementSibling!==el){const focused=el.contains(document.activeElement)?document.activeElement:null;prev.after(el);focused?.focus?.({preventScroll:true});moved=true}prev=el}
 return moved;
}
let observed=null,observer;
function watch(){
 const root=document.querySelector('#nrRoute-today [data-overview="today"]');if(!root){setTimeout(watch,250);return}
 if(observed===root){arrange(root);return}observer?.disconnect();observed=root;root.dataset.appToday='';
 arrange(root);
 observer=new MutationObserver(()=>arrange(root));observer.observe(root,{childList:true});
 clearInterval(HERO_SKY.timer);HERO_SKY.timer=setInterval(()=>syncHeroSkySoon(root),60000);
 for(const ev of ['sr:sky-time','resize','visibilitychange'])window.addEventListener(ev,()=>syncHeroSkySoon(root));
 document.addEventListener('visibilitychange',()=>syncHeroSkySoon(root));
 // The space card updates its tone in place or by replacement; the hero may re-render its children.
 new MutationObserver(()=>syncAlert(root)).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-tone','data-level']});
}
window.NRAppToday={arrange:()=>{const r=document.querySelector('#nrRoute-today [data-overview="today"]');return r?arrange(r):false},order:ORDER};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.addEventListener('sr:consumer-load',watch);
})();
