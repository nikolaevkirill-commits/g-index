/* NeboRhythm · сцени й рух. Шар оформлення: читає вже показані значення, нічого не обчислює для бала.
   Джерела:
   - бал/горизонт днів — кнопки стрічки .nr-b-week (data-tone з present().opKey, data-horizon, текст бала);
   - рівень G — рядок NOAA «G#·S#·R#» у [data-weather-brief] (шкала NOAA, без нових порогів);
   - фаза Місяця й номер тітхі — computePanchanga(поточний момент) лише для читання, якщо функції є.
   Немає даних → немає точки/лінії (missing ≠ 0). */
(()=>{'use strict';
const root=document.documentElement;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const motionOn=()=>!reduce.matches&&!root.classList.contains('nr-design-motion-off');
const raf=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));

/* ---------- Заставка ---------- */
const launch=document.getElementById('nrLaunch');
if(launch){
  const t0=performance.now();let seen=false;try{seen=sessionStorage.getItem('nrs_launch')==='1';sessionStorage.setItem('nrs_launch','1')}catch{}
  const end=()=>{if(launch.dataset.done)return;launch.dataset.done='1';
    const min=(seen||!motionOn())?0:520,wait=Math.max(0,min-(performance.now()-t0));
    setTimeout(()=>{launch.classList.add('is-leaving');setTimeout(()=>launch.remove(),motionOn()?440:0)},wait)};
  if(!root.classList.contains('nr-shell-starting'))end();
  else new MutationObserver((m,o)=>{if(!root.classList.contains('nr-shell-starting')){o.disconnect();end()}}).observe(root,{attributes:true,attributeFilter:['class']});
  setTimeout(end,4600);
}

/* ---------- Дані для сцен (тільки читання) ---------- */
function weekData(scope){
  const wk=scope.querySelector('.nr-b-week');if(!wk)return null;
  return [...wk.querySelectorAll('button')].map(b=>{
    const raw=(b.querySelector('strong')?.textContent||'').trim().replace('−','-');
    const v=/^[+-]?[0-3]$/.test(raw)?Number(raw):null;
    return {day:b.dataset.day||'',score:v,tone:b.dataset.tone||'none',outlook:b.dataset.horizon==='outlook',sel:b.getAttribute('aria-pressed')==='true'};
  });
}
function gLevel(){
  const b=document.querySelector('[data-weather-brief]');if(b&&/^[0-5]$/.test(b.dataset.g||''))return Number(b.dataset.g);
  const t=b?.textContent||'';
  const m=t.match(/G\s?([0-5])\s*·\s*S\s?[0-5]\s*·\s*R\s?[0-5]/);return m?Number(m[1]):null;
}
let panchCache={key:'',v:null};
function panch(){
  try{
    if(typeof computePanchanga!=='function')return null;
    const now=new Date(),key=Math.floor(now.getTime()/60000);if(panchCache.key===key)return panchCache.v;
    const p=computePanchanga(now);
    const nk=Number(p?.nakshatra?.num??p?.nakshatra?.index??p?.nakshatraNum);const v=p&&Number.isFinite(Number(p.phaseDeg))?{phase:((Number(p.phaseDeg)%360)+360)%360,tithi:Number(p.tithi?.num)||null,nak:nk>=1&&nk<=27?nk:null}:null;
    panchCache={key,v};return v;
  }catch{return null}
}
/* Положення Сонця для Києва (рівень міста, як підпис «Київ · Europe/Kyiv»; не GPS) — astronomy-engine, лише для кольору неба.
   Межі фаз — астрономічні: −6° (цивільні сутінки) і +6° (кінець «золотої години»); на бал не впливають. */
let skyCache={t:0,v:null};
function sky(){
  const now=Date.now();if(now-skyCache.t<60000)return skyCache.v;let v=null;
  try{const A=window.Astronomy;if(A&&A.Observer&&A.Equator&&A.Horizon){const d=new Date(now),obs=new A.Observer(50.45,30.52,0);
    const eq=A.Equator('Sun',d,obs,true,true),alt=A.Horizon(d,obs,eq.ra,eq.dec,'normal').altitude;
    let frac=null;try{const r=A.SearchRiseSet('Sun',obs,+1,new Date(now-864e5),1),st=r&&A.SearchRiseSet('Sun',obs,-1,r.date,1);
      if(r&&st&&now>=+r.date&&now<=+st.date)frac=(now-r.date)/(st.date-r.date)}catch{}
    v={alt,frac,phase:alt>=6?'day':alt>=-6?'twilight':'night'}}}catch{v=null}
  skyCache={t:now,v};return v;
}
function seeded(seed){let a=0;for(const c of String(seed))a=(a*31+c.charCodeAt(0))|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- Графіка ---------- */
let uid=0;
const hatchDef=id=>`<pattern id="${id}" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="currentColor" stroke-width=".7" opacity=".75"/></pattern><pattern id="${id}x" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" stroke-width=".5" opacity=".6"/></pattern><radialGradient id="${id}glow"><stop offset="0" style="stop-color:var(--nrs-accent)" stop-opacity=".22"/><stop offset="1" style="stop-color:var(--nrs-accent)" stop-opacity="0"/></radialGradient><radialGradient id="${id}orb" cx=".38" cy=".32" r=".75"><stop offset="0" style="stop-color:#eef3f2"/><stop offset=".45" style="stop-color:#a7b8c6"/><stop offset="1" style="stop-color:#43566c"/></radialGradient><filter id="${id}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter><radialGradient id="${id}night" gradientUnits="userSpaceOnUse" cx="330" cy="8" r="170"><stop offset="0" style="stop-color:var(--nrs-night,#30476a)" stop-opacity=".55"/><stop offset=".6" style="stop-color:var(--nrs-night,#30476a)" stop-opacity=".18"/><stop offset="1" style="stop-color:var(--nrs-night,#30476a)" stop-opacity="0"/></radialGradient><linearGradient id="${id}aur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--nrs-aur-b)" stop-opacity="0"/><stop offset=".45" style="stop-color:var(--nrs-aur-b)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--nrs-aur-a)" stop-opacity="0"/></linearGradient><linearGradient id="${id}fog" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--nrs-fog)" stop-opacity="0"/><stop offset=".35" style="stop-color:var(--nrs-fog)" stop-opacity="1"/><stop offset="1" style="stop-color:var(--nrs-fog)" stop-opacity="1"/></linearGradient><radialGradient id="${id}dawn" gradientUnits="userSpaceOnUse" cx="60" cy="88" r="220"><stop offset="0" style="stop-color:var(--nrs-dawn)" stop-opacity=".42"/><stop offset="1" style="stop-color:var(--nrs-dawn)" stop-opacity="0"/></radialGradient><filter id="${id}blur" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="2.4"/></filter><linearGradient id="${id}sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--nrs-accent)" stop-opacity=".16"/><stop offset=".6" style="stop-color:var(--nrs-accent)" stop-opacity="0"/></linearGradient>`;
function moon(cx,cy,r,phase,hid){
  const e=phase*Math.PI/180,rx=Math.abs(Math.cos(e))*r,top=`${cx} ${cy-r}`,bot=`${cx} ${cy+r}`;
  let d;
  if(phase<180){d=`M${top}A${r} ${r} 0 0 0 ${bot}A${rx.toFixed(2)} ${r} 0 0 ${phase<90?0:1} ${top}Z`}
  else{const f=phase-180;d=`M${top}A${r} ${r} 0 0 1 ${bot}A${rx.toFixed(2)} ${r} 0 0 ${f<90?0:1} ${top}Z`}
  const cr=[[.35,-.3,.16],[-.25,.25,.12],[.1,.45,.09]];
  const ink=cr.map(([a,b,k])=>`<circle cx="${(cx+a*r).toFixed(1)}" cy="${(cy+b*r).toFixed(1)}" r="${(k*r).toFixed(1)}" fill="none" stroke="currentColor" stroke-width=".5" opacity=".35"/>`).join('');
  const orb=cr.map(([a,b,k])=>`<circle cx="${(cx+a*r).toFixed(1)}" cy="${(cy+b*r).toFixed(1)}" r="${(k*r).toFixed(1)}" style="fill:#33465b" opacity=".35"/>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${(r*1.9).toFixed(1)}" fill="url(#${hid}glow)"/>`+
   /* світла тема: гравюра */
   `<g class="nrs-ink"><circle cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--nrs-paper)" stroke="currentColor" stroke-width=".9"/>${ink}<path d="${d}" fill="url(#${hid})"/><path d="${d}" fill="url(#${hid}x)" opacity=".5"/></g>`+
   /* темна тема: об'ємна куля, тінь за реальною фазою */
   `<g class="nrs-orb"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${hid}orb)"/>${orb}<path d="${d}" style="fill:#0a111c" opacity=".78" filter="url(#${hid}soft)"/><path d="M${top}A${r} ${r} 0 0 ${phase<180?1:0} ${bot}" fill="none" style="stroke:#f4f7f5" stroke-width="1.3" opacity="${(0.55+0.4*Math.min(1,Math.abs(Math.sin(e))+.2)).toFixed(2)}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" style="stroke:rgba(214,230,245,.22)" stroke-width=".8"/></g>`;
}
function stars(rnd,n,w,h,yMax){let s='';for(let i=0;i<n;i++){const x=(rnd()*w).toFixed(1),y=(4+rnd()*(yMax-4)).toFixed(1),r=(.5+rnd()*.9).toFixed(2),tw=i%3===0;
  s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" ${tw?`class="nrs-twinkle" style="--nrs-d:${(rnd()*3).toFixed(2)}s;--nrs-tw:${(3+rnd()*3).toFixed(1)}s"`:'opacity=".5"'}/>`}return s}
function wave(y,amp,w){let d=`M-10 ${y}`,up=true;for(let x=-10;x<w+50;x+=20){d+=` q10 ${up?-amp:amp} 20 0`;up=!up}return d}

/* Полярне сяйво — лише коли NOAA вже показує G ≥ 1 (шкала NOAA, без нових порогів). Кількість стрічок = min(G,3). */
function aurora(g,hid,W,rnd){if(g===null||g<1)return '';let s='';const n=Math.min(g,3);
  for(let i=0;i<n;i++){const y0=6+i*7,h=26+i*4;let d=`M-20 ${y0+h}`;const pts=[];for(let x=-20;x<=W+40;x+=26)pts.push([x,y0+Math.sin((x+i*40)/52)*5+rnd()*3]);
    d=`M${pts[0][0]} ${pts[0][1]}`+pts.slice(1).map(([x,y])=>` L${x} ${y.toFixed(1)}`).join('')+pts.slice().reverse().map(([x,y])=>` L${x} ${(y+h).toFixed(1)}`).join('')+'Z';
    s+=`<path class="nrs-aurora" style="--nrs-ad:${(9+i*3)}s;--nrs-d:${(i*-2.3).toFixed(1)}s" d="${d}" fill="url(#${hid}aur)" filter="url(#${hid}blur)" opacity="${(.32+.12*n).toFixed(2)}"/>`}
  return `<g class="nrs-fade" style="--nrs-d:.15s">${s}</g>`}
function sceneToday(scope){
  const g=gLevel(),p=panch(),rnd=seeded(document.querySelector('.nr-b-week [aria-pressed=true]')?.dataset.day||'d');
  const hid='nrsH'+(++uid),W=390,n=g===null?2:2+Math.min(g,3),amp=g===null?3:3+g*1.6,drift=g===null?18:Math.max(7,16-g*2.5);
  let lines='';for(let i=0;i<n;i++){const y=22+i*(40/Math.max(1,n-1||1));lines+=`<path d="${wave(y.toFixed(1),amp.toFixed(1),W)}" fill="none" stroke="currentColor" stroke-width="${g>=1?1.1:.9}" ${g===null?'stroke-dasharray="2 4"':''} opacity="${(g===null?.35:.45+i*.05).toFixed(2)}"/>`}
  const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hour12:false,timeZone:'Europe/Kyiv'}).format(new Date()));
  const sk=sky(),phase=sk?sk.phase:(hour<7||hour>=19?'night':'day'),night=phase==='night';
  /* Сонце на денній дузі: частка світлового дня від сходу до заходу */
  const sun=sk&&sk.frac!==null?(()=>{const a=Math.PI*(1-sk.frac),cx=96+Math.cos(a)*78,cy=70-Math.sin(a)*46;return `<path class="nrs-draw" pathLength="1" style="--nrs-d:.2s" d="M18 70 A78 46 0 0 1 174 70" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1.5 3" opacity=".4"/><g class="nrs-pop nrs-sun" style="--nrs-d:.45s"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" style="fill:var(--nrs-sun)" opacity=".18"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.2" style="fill:var(--nrs-sun)"/></g>`})():'';
  return {sig:`t|${g}|${p?Math.round(p.phase):'x'}|${phase}|${sk&&sk.frac!==null?Math.round(sk.frac*40):'-'}`,get svg(){return `<svg viewBox="0 0 ${W} 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${hatchDef(hid)}<clipPath id="${hid}g"><rect x="0" y="72" width="${W}" height="16"/></clipPath></defs>
   <g class="nrs-skyphase" data-phase="${phase}"><rect class="nrs-nightglow" x="0" y="0" width="${W}" height="88" fill="url(#${hid}night)"/>${phase==='twilight'?`<rect class="nrs-fade" x="0" y="0" width="${W}" height="88" fill="url(#${hid}dawn)"/>`:''}<rect x="0" y="30" width="${W}" height="42" fill="url(#${hid}sky)" class="nrs-fade"/><g class="nrs-fade">${stars(rnd,night?26:phase==='twilight'?14:6,W,88,62)}</g></g>
   ${aurora(g,hid,W,rnd)}${sun}
   <g class="nrs-drift" style="--nrs-drift:${drift}s;color:var(--nrs-accent)">${lines}</g>
   <line class="nrs-draw" pathLength="1" x1="0" y1="72" x2="${W}" y2="72" stroke="currentColor" stroke-width=".9"/>
   <rect x="0" y="72" width="${W}" height="16" fill="url(#${hid})" opacity=".55" clip-path="url(#${hid}g)"/>
   ${p?`<g class="nrs-pop" style="--nrs-d:.25s">${moon(342,30,13,p.phase,hid)}</g>`:''}
   <rect class="nrs-scan" x="0" y="0" width="24" height="72" fill="currentColor" opacity=".06"/></svg>`}};
}
function scenePanch(){
  const p=panch(),hid='nrsH'+(++uid),W=390;if(!p)return null;
  const t=p.tithi||Math.floor(p.phase/12)+1;let ticks='';
  for(let i=1;i<=30;i++){const x=128+(i-1)*8.3,cur=i===t,h=cur?30:(i===15||i===30?16:9),y=58-h;
    ticks+=`<line class="nrs-fade" style="--nrs-d:${cur?'.6':(i*0.018).toFixed(3)}s${cur?';color:var(--nrs-accent)':''}" x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="58" stroke="currentColor" stroke-width="${cur?2.2:1}" ${i>15&&!cur?'stroke-dasharray="1.5 1.5"':''} opacity="${cur?1:(i<t?.75:.4)}"/>`}
  const nk=p.nak;let ring='';for(let i=0;i<27;i++){const a=i/27*Math.PI*2-Math.PI/2,cur=nk===i+1,ro=cur?44:40,x1=60+Math.cos(a)*36,y1=44+Math.sin(a)*36,x2=60+Math.cos(a)*ro,y2=44+Math.sin(a)*ro;ring+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="${cur?2:.8}" opacity="${cur?1:.5}"${cur?' style="color:var(--nrs-accent)" class="nrs-naksh"':''}/>`}
  /* Дуга тітхі: Місяць «проходить» від 1-ї тітхі до поточної (лінія прокреслюється), далі — пунктир */
  const ax=i=>128+(i-1)*8.3,ay=i=>20-Math.sin(Math.PI*(i-1)/29)*12;let trail=`M${ax(1)} ${ay(1).toFixed(1)}`,rest=`M${ax(t).toFixed(1)} ${ay(t).toFixed(1)}`;
  for(let i=2;i<=t;i++)trail+=` L${ax(i).toFixed(1)} ${ay(i).toFixed(1)}`;for(let i=t+1;i<=30;i++)rest+=` L${ax(i).toFixed(1)} ${ay(i).toFixed(1)}`;
  const arc=`<path d="${rest}" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1.5 3" opacity=".4"/>${t>1?`<path class="nrs-draw" pathLength="1" d="${trail}" fill="none" stroke="currentColor" stroke-width="1" opacity=".75" style="--nrs-d:.1s;color:var(--nrs-accent)"/>`:''}<g class="nrs-pop" style="--nrs-d:.85s">${moon(ax(t),ay(t),5.2,p.phase,hid+'m')}</g>`;
  return {sig:`p|${Math.round(p.phase)}|${t}|${nk||'-'}`,get svg(){return `<svg viewBox="0 0 ${W} 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${hatchDef(hid)}${hatchDef(hid+'m')}</defs>
   <rect class="nrs-nightglow" x="0" y="0" width="${W}" height="88" fill="url(#${hid}night)"/>
   <g class="nrs-spin" style="transform-origin:60px 44px">${ring}</g>
   <g class="nrs-pop">${moon(60,44,26,p.phase,hid)}</g>${arc}
   <line class="nrs-draw" pathLength="1" x1="124" y1="58" x2="${W-6}" y2="58" stroke="currentColor" stroke-width=".8" opacity=".6"/>
   ${ticks}
   <circle cx="${(128+14*8.3).toFixed(1)}" cy="66" r="2.6" fill="none" stroke="currentColor" stroke-width=".9"/><circle cx="${(128+29*8.3).toFixed(1)}" cy="66" r="2.6" fill="currentColor"/></svg>`}};
}
function sceneForecast(scope){
  const d=weekData(scope);if(!d||!d.length)return null;
  const W=390,x=i=>36+i*((W-72)/Math.max(1,d.length-1)),y=v=>44-v*9.5;let seg='',pts='',k=0;
  for(let i=1;i<d.length;i++){const a=d[i-1],b=d[i];if(a.score===null||b.score===null)continue;
    const dash=a.outlook||b.outlook;seg+=`<line class="${dash?'nrs-fade':'nrs-draw'}" ${dash?'':'pathLength="1"'} style="--nrs-d:${(0.1+i*0.08).toFixed(2)}s" x1="${x(i-1).toFixed(1)}" y1="${y(a.score)}" x2="${x(i).toFixed(1)}" y2="${y(b.score)}" stroke="currentColor" stroke-width="1" ${dash?'stroke-dasharray="3 3"':''} opacity=".7"/>`}
  d.forEach((p,i)=>{if(p.score===null){pts+=`<line x1="${x(i).toFixed(1)}" y1="40" x2="${x(i).toFixed(1)}" y2="48" stroke="currentColor" stroke-width=".8" opacity=".4"/>`;return}
    const tone=p.tone==='favorable'||p.tone==='good'?'var(--nrs-pos,currentColor)':p.tone==='tense'?'var(--nrs-neg,currentColor)':p.tone==='unstable'?'var(--nrs-warn,currentColor)':'currentColor';
    pts+=`<g class="nrs-pop" style="--nrs-d:${(0.15+(k++)*0.07).toFixed(2)}s">${p.sel?`<circle cx="${x(i).toFixed(1)}" cy="${y(p.score)}" r="7.5" fill="none" stroke="currentColor" stroke-width=".9"/>`:''}<circle cx="${x(i).toFixed(1)}" cy="${y(p.score)}" r="3.4" ${p.outlook?`fill="none" style="stroke:${tone}" stroke-width="1.3"`:`style="fill:${tone}"`}/></g>`});
  const rnd=seeded('w'+(d[0]?.day||'')),fid='nrsF'+(++uid),o0=d.findIndex(p=>p.outlook);
  /* «Туман невизначеності» над 27-денними днями: це орієнтир NOAA, не короткий прогноз */
  const fog=o0<0?'':`<defs>${hatchDef(fid)}</defs><g class="nrs-fog nrs-fade" style="--nrs-d:.5s"><rect x="${(x(o0)-(o0?((W-72)/Math.max(1,d.length-1))/2:36)).toFixed(1)}" y="0" width="${W}" height="88" fill="url(#${fid}fog)"/><rect class="nrs-fogdrift" x="${(x(o0)-10).toFixed(1)}" y="0" width="${W+60}" height="88" fill="url(#${fid}x)" opacity=".18"/></g>`;
  return {sig:'f|'+d.map(p=>[p.score,p.outlook?1:0,p.sel?1:0,p.tone].join(':')).join(','),get svg(){return `<svg viewBox="0 0 ${W} 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
   <g opacity=".6">${stars(rnd,10,W,88,84)}</g>${fog}
   <line x1="0" y1="44" x2="${W}" y2="44" stroke="currentColor" stroke-width=".7" stroke-dasharray="2 5" opacity=".45"/>
   ${seg}${pts}</svg>`}};
}


/* ---------- Пріоритет місця на першому екрані «Сьогодні» ----------
   1) «Мій план» над нижньою навігацією; 2) стрічка дат над балом; 3) декоративна смуга сцени.
   Перебираємо варіанти (сцена+стрічка вгорі → без сцени+стрічка вгорі → сцена+стрічка під шкалою → без сцени+стрічка під шкалою). */
let lastFitHero=null,lastFitKey=null;
function fit(){
  const t=document.querySelector('[data-overview="today"]');if(!t||!t.offsetParent)return;
  const hero=t.querySelector('.nr-o-hero'),plan=hero?.querySelector('.nr-b-primary');if(!hero||!plan||!hero.__placeWeek)return;
  const band=t.querySelector(':scope > .nr-scene[data-scene="today"]');
  /* nav — position:fixed, тому offsetParent завжди null; прихованість визначаємо стилем і висотою */
  const lim=(n=>{if(!n)return innerHeight;const r=n.getBoundingClientRect(),cs=getComputedStyle(n);return cs.display==='none'||cs.visibility==='hidden'||r.height===0?innerHeight:r.top})(document.getElementById('mobileNav'))-8;
  // ResizeObserver also sees our own layout changes. Reuse an identical settled
  // geometry; real data, fonts, viewport and replacement heroes invalidate it.
  const key=()=>[innerWidth,innerHeight,lim,getComputedStyle(root).fontSize,document.querySelector('body>header')?.offsetHeight,hero.offsetHeight,plan.offsetHeight,hero.__weekHeight?.(),hero.textContent].join('|');
  if(lastFitHero===hero&&lastFitKey===key())return;
  const settled=()=>{lastFitHero=hero;lastFitKey=key()};
  /* Пробуємо варіанти по черзі й міряємо фактичне положення (синхронний layout, без кадру між спробами — без мерехтіння) */
  /* v5: підпис «Модель дня · не прогноз бурі» ховається лише останнім кроком і лише без активного попередження NOAA —
     під час бурі розмежування сигналів важливіше за «Мій план» на першому екрані */
  const storm=hero.querySelector('[data-weather-brief][data-active=true]'),kindOk=!storm&&hero.querySelector('.nr-o-kind');
  const base=(band?[[1,1,0],[0,1,0],[1,0,0],[0,0,0]]:[[0,1,0],[0,0,0]]).concat(kindOk?[[0,1,1],[0,0,1]]:[]);
  /* v7.2: пояснення «бал vs NOAA» (лише під час бурі) спершу біля бала; якщо через нього «Мій план» не вміщається — переноситься одразу під кнопку */
  const note=hero.querySelector('.nr-o-kpnote'),label=hero.querySelector('.nr-o-label');
  const placeNote=below=>{if(!note||!label)return;if(below){if(plan.nextElementSibling!==note)plan.after(note);note.classList.add('is-below')}else if(note.parentElement!==label){label.append(note);note.classList.remove('is-below')}};
  const opts=base.map(o=>o.concat(0)).concat(note?base.map(o=>o.concat(1)):[]);
  for(const [b,w,k,n] of opts){if(band)band.classList.toggle('is-compact',!b);hero.classList.toggle('nr-kind-compact',!!k);placeNote(!!n);hero.__placeWeek(!!w);if(plan.getBoundingClientRect().bottom+scrollY<=lim){settled();return}}
  settled();
}
/* Рішення ухвалюється через 120 мс після останньої зміни DOM — коли рендер завершено і висоти остаточні */
let fitT=0;function fitSoon(){if(fitT)return;fitT=setTimeout(()=>{fitT=0;fit()},120)} // не довше 120 мс від першої зміни, навіть якщо DOM оновлюється далі
/* ---------- Монтаж (ідемпотентний) ---------- */
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('is-offscreen',!e.isIntersecting))):null;
function place(host,before,kind,build){
  if(!host)return;let el=host.querySelector(':scope > .nr-scene[data-scene="'+kind+'"]')||(before&&before.previousElementSibling?.matches?.('.nr-scene[data-scene="'+kind+'"]')?before.previousElementSibling:null);
  const sc=build();if(!sc){el?.remove();return}
  if(!el){if(kind==='today')fitSoon();el=document.createElement('div');el.className='nr-scene';el.dataset.scene=kind;el.setAttribute('aria-hidden','true');(before||host.firstChild)?host.insertBefore(el,before||host.firstChild):host.append(el);io?.observe(el)}
  const ls=window.__nrConsumerLoadState,state=ls==='loading'?'loading':ls==='error'?'error':navigator.onLine===false?'offline':'ready';if(el.dataset.state!==state)el.dataset.state=state;
  if(el.dataset.sig!==sc.sig){el.dataset.sig=sc.sig;el.innerHTML=sc.svg}
}
function mount(){
  const t=document.querySelector('[data-overview="today"]'),f=document.querySelector('[data-overview="forecast"]'),pr=document.getElementById('nrRoute-panch');
  if(t)place(t,t.firstElementChild,'today',()=>sceneToday(t));
  if(f)place(f,f.firstElementChild,'forecast',()=>sceneForecast(f));
  if(pr){const head=pr.querySelector(':scope > .nr-route-head');if(head)place(pr,head,'panch',scenePanch)}
}
let queued=false;
const inScene=n=>n&&(n.nodeType===1?n:n.parentElement)?.closest?.('.nr-scene');
const ours=r=>inScene(r.target)||(r.removedNodes.length===0&&r.addedNodes.length>0&&[...r.addedNodes].every(n=>n.nodeType===1&&n.matches?.('.nr-scene')));
// The responsive fit moves this group within the same hero. These moves must not
// schedule another fit (above -> below -> above every 120 ms on compact screens).
// A removed/replaced renderer node is disconnected and is still processed.
const ownWeekMove=r=>{const nodes=[...r.addedNodes,...r.removedNodes];return nodes.length>0&&nodes.every(n=>n.nodeType===1&&n.isConnected&&n.matches('.nr-b-week,.nr-b-horizon-note,.nr-b-scroll-hint')&&n.parentElement===r.target)};
const mo=new MutationObserver(recs=>{if(recs.every(r=>ours(r)||ownWeekMove(r)))return; // власні вставки сцен ігноруємо; видалення сцени чужим рендером — перемонтовуємо
  if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount();watchScores()})}if(document.querySelector('#nrRoute-today.active'))fitSoon();});

/* ---------- Вхід екрана й зміна бала ---------- */
function enter(el,dy=10,dur=320){if(!el||!motionOn()||!el.animate)return;el.animate([{opacity:0,transform:`translateY(${dy}px)`},{opacity:1,transform:'none'}],{duration:dur,easing:'cubic-bezier(.2,.8,.2,1)'})}
function wrapRouter(){
  if(typeof window.fp434Go!=='function'||window.fp434Go.__nrs)return false;
  const orig=window.fp434Go;
  const wrapped=function(name){const before=document.querySelector('.nr-route.active');const out=orig.apply(this,arguments);
    const now=document.querySelector('.nr-route.active');navInd();if(now&&now!==before){mount(); /* вхід екрана — чинна анімація B17 nr-route-enter 180 мс; власну не накладаємо */const s=now.querySelector('.nr-scene');if(s&&motionOn()&&s.getAnimations)s.getAnimations({subtree:true}).forEach(a=>{try{a.cancel();a.play()}catch{}}) /* повтор прокреслення без повторного розбору SVG */}
    return out};
  wrapped.__nrs=true;window.fp434Go=wrapped;return true;
}
/* Ковзна риска активної вкладки нижньої навігації (замість стрибка між кнопками). Без JS лишається риска B17. */
function navInd(){const nav=document.getElementById('mobileNav');if(!nav)return;let ind=nav.querySelector(':scope > .nrs-navind');
  const cur=nav.querySelector('button[aria-current="page"],a[aria-current="page"]');if(!cur){nav.classList.remove('nrs-ind-on');return}
  if(!ind){ind=document.createElement('span');ind.className='nrs-navind';ind.setAttribute('aria-hidden','true');nav.append(ind)}
  const nr=nav.getBoundingClientRect(),br=cur.getBoundingClientRect();if(!br.width)return;
  ind.style.width=br.width+'px';ind.style.transform=`translateX(${(br.left-nr.left).toFixed(1)}px)`;
  if(!nav.classList.contains('nrs-ind-on'))requestAnimationFrame(()=>nav.classList.add('nrs-ind-on'));}
let lastScore=new WeakMap();
function watchScores(){document.querySelectorAll('.nr-o-score').forEach(s=>{const v=s.textContent.trim();if(lastScore.has(s)&&lastScore.get(s)!==v)enter(s,8,420);lastScore.set(s,v)})}

function start(){if(start.done)return;start.done=true;try{mount()}catch(e){console.error('NRScenes mount',e)}if(!wrapRouter()){let n=0;const t=setInterval(()=>{if(wrapRouter()||++n>40)clearInterval(t)},100)}watchScores();
  mo.observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('nr:locale',()=>{mount();navInd()});addEventListener('resize',navInd);addEventListener('online',mount);addEventListener('offline',mount);navInd();
  const nav=document.getElementById('mobileNav');if(nav)new MutationObserver(navInd).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});reduce.addEventListener?.('change',mount);
  setInterval(()=>{if(!document.hidden)mount()},60000);
}
// Старт без rAF: у частині сценаріїв (мова en) перший кадр не настає до кінця збирання оболонки.
const kick=()=>setTimeout(start,0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kick,{once:true});else kick();
window.addEventListener('load',kick,{once:true});setTimeout(start,1500);
window.NRScenes={mount,fit:fitSoon,fitNow:fit,version:'scenes4',get started(){return !!start.done}};
})();
