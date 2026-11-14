/* FP569q space-weather illustration for Today and Sky. */
(()=>{'use strict';
const LANG=()=>window.NRLocale?.language||'uk';
const tx=(uk,en,es,fr)=>({uk,en,es,fr})[LANG()]??en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ZONE='Europe/Kyiv';
const dayKey=t=>window.NRCivilTime.dayKey(t,ZONE);
const dm=d=>new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const num=(v,d=1)=>new Intl.NumberFormat(window.NRLocale?.locale||'uk-UA',{maximumFractionDigits:d,minimumFractionDigits:0}).format(v);
const HOUR=3600000, DAY=24*HOUR;
let snapshot={},loading,lastLoad=-Infinity;
function load(now=Date.now()){
 if(loading)return loading;
 if(now-lastLoad<5*60000)return Promise.resolve(snapshot);
 lastLoad=now;
 const get=async url=>{
  const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
 };
 loading=Promise.allSettled([
  get('consumer_cloud/space_weather.json'),get('consumer_cloud/forecast.json')
 ]).then(([sw,fc])=>{
  snapshot={sw:sw.value??snapshot.sw,fc:fc.value??snapshot.fc};
  return snapshot;
 }).finally(()=>{loading=null;});
 return loading;
}
function recent(stamp,now,limit){
 const age=now-Date.parse(stamp);
 return age>=-300000&&age<=limit;
}
// Older samples remain visible with their age. Only fresh samples drive the scene.
function windObservations(weather,now){
 const wind=recent(weather?.generated_at,now,6*HOUR)?weather.wind:null;
 const sample=(item,key)=>{
  if(!Number.isFinite(item?.[key])||!recent(item.time_utc,now,6*HOUR))return null;
  const elapsed=now-Date.parse(item.time_utc);
  return {value:item[key],time:item.time_utc,age:Math.max(0,Math.floor(elapsed/60000)),stale:elapsed>3*HOUR};
 };
 const plasma=sample(wind?.plasma,'speed_km_s');
 return {plasma:plasma?.value>0?plasma:null,mag:sample(wind?.mag,'bz_nt')};
}
window.SRSpaceWeather=Object.freeze({windObservations});
function inputs({sw,fc},now){
 const today=dayKey(now),days=[];
 for(let i=0;i<3;i++){
  const date=new Date(Date.parse(today)+i*DAY).toISOString().slice(0,10);
  const kp=fc?.days?.[date]?.channels?.source_formula?.kp_input;
  if(!kp||kp.source!=='NOAA_3day_slots'||kp.fallback!==false||kp.kp_synthetic!==false)continue;
  if(!recent(fc.generated_at,now,8*HOUR)||!recent(kp.retrieved_at,now,8*HOUR))continue;
  if(Number.isFinite(kp.kp)&&kp.kp>=0&&kp.kp<=9)days.push({date,kp:kp.kp});
 }
 const fresh=recent(sw?.generated_at,now,6*HOUR)?sw:null;
 return {today,days,wind:windObservations(sw,now),flares:fresh?.flares,cme:fresh?.cme};
}
// --- plain classifications (NOAA conventions; thresholds are the published scale, not ours) ---
const gOf=kp=>kp>=9?5:kp>=8?4:kp>=7?3:kp>=6?2:kp>=5?1:0;
const G_NAME={uk:['','слабка','помірна','сильна','дуже сильна','екстремальна'],en:['','minor','moderate','strong','severe','extreme'],es:['','leve','moderada','fuerte','severa','extrema'],fr:['','faible','modérée','forte','sévère','extrême']};
function flareWord(cls){const c=String(cls||'')[0];return c==='X'?tx('сильний','strong',"intensa","forte"):c==='M'?tx('середній','medium',"moderada","modérée"):tx('слабкий','weak',"débil","faible")}
function model(d,now){
 const max=d.days.reduce((a,x)=>!a||x.kp>a.kp?x:a,null),kp0=d.days.find(x=>x.date===d.today)?.kp??null;
 const level=max?gOf(max.kp):0,unsettled=!!max&&max.kp>=4&&level===0;
 const {plasma,mag}=d.wind;
 const speed=plasma&&!plasma.stale?plasma.value:null;
 const bz=mag&&!mag.stale?mag.value:null;
 const st=d.flares?.strongest;
 const strongest=recent(st?.peak_utc,now,7*DAY)&&/^[ABCMX]\d+(?:\.\d+)?$/.test(st.class)?st:null;
 const hot=Boolean(strongest&&/^[MX]/.test(strongest.class)&&recent(strongest.peak_utc,now,3*DAY));
 const cme=(Array.isArray(d.cme?.earth_arrivals)?d.cme.earth_arrivals:[]).filter(a=>a?.arrival_utc&&Date.parse(a.arrival_utc)>=now).sort((a,b)=>Date.parse(a.arrival_utc)-Date.parse(b.arrival_utc));
 return {max,kp0,level,unsettled,speed,bz,plasma,mag,strongest,hot,cme};
}
function headline(m,d){
 if(!m.max)return {title:tx('Космічна погода','Space weather',"Clima espacial","Météo spatiale"),tone:'none',forecast:tx('Свіжого прогнозу магнітних бур поки немає.','There is no current geomagnetic storm forecast.',"Por ahora no hay un pronóstico actualizado de tormentas geomagnéticas.","Aucune prévision récente de tempête géomagnétique n’est disponible.")};
 const dates=d.days.map(x=>x.date);
 const day=d=>new Date(d+'T12:00:00Z');
 const format=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{day:'numeric',month:'long',timeZone:'UTC'});
 const span=(dates.length===3&&format.formatRange?format.formatRange(day(dates[0]),day(dates[2])):dates.map(dm).join(', ')).replace(/[\s\u2009]*–[\s\u2009]*/g,'\u2060–\u2060').replace(/(\d) /g,'$1\u00a0'); // keep «9–11 листопада» on one line
 const title=(m.level?tx('Можлива магнітна буря · ','Possible geomagnetic storm · ',"Posible tormenta geomagnética · ","Tempête géomagnétique possible · "):m.unsettled?tx('Неспокійне магнітне поле · ','Unsettled magnetic field · ',"Campo magnético inestable · ","Champ magnétique perturbé · "):tx('Спокійне магнітне поле · ','Quiet magnetic field · ',"Campo magnético tranquilo · ","Champ magnétique calme · "))+span;
 const period=tx('Прогноз NOAA. Дати за київським часом.','NOAA forecast. Dates use Kyiv time.',"Pronóstico de NOAA. Fechas en hora de Kyiv.","Prévisions de la NOAA. Dates à l’heure de Kyiv.");
 if(m.level)return {title,tone:'storm',forecast:tx('Можлива буря G','Possible storm G',"Posible tormenta G","Tempête G")+m.level+' ('+(G_NAME[LANG()]||G_NAME.en)[m.level]+') · '+dm(m.max.date),period};
 return {title,tone:m.unsettled?'watch':'calm',forecast:m.unsettled?tx('Можливі слабкі збурення. Магнітної бурі не очікують.','Minor disturbances are possible. No geomagnetic storm is expected.',"Puede haber perturbaciones leves. No se espera una tormenta geomagnética.","De faibles perturbations sont possibles. Aucune tempête géomagnétique n’est prévue."):tx('Збурень не очікують.','No disturbances are expected.',"No se esperan perturbaciones.","Aucune perturbation n’est prévue."),period};
}
function observationAge(sample){
 const hours=Math.floor(sample.age/60),minutes=sample.age%60;
 const duration=hours?hours+tx(' год',' h'," h"," h")+(minutes?' '+minutes+tx(' хв',' min'," min"," min"):''):minutes+tx(' хв',' min'," min"," min");
 return sample.age===0?tx('Щойно виміряно','Just measured',"Medición reciente","Mesure récente"):
  tx('Виміряно ','Measured ',"Medición de hace ","Mesure d’il y a ")+duration+tx(' тому',' ago',"","")+(sample.stale?tx(' · застаріле',' · out of date'," · datos antiguos"," · mesure ancienne"):'');
}
function chips(m){
 const out=[];
 if(m.strongest)out.push({icon:'☀',k:tx('Спалах на Сонці','Solar flare',"Erupción solar","Éruption solaire"),v:tx('За тиждень найсильнішим був ','The strongest flare this week was ',"La erupción más fuerte de la semana fue ","L’éruption la plus forte de la semaine était ")+flareWord(m.strongest.class),details:m.strongest.class+' · '+dm(m.strongest.peak_utc.slice(0,10))+' UTC',tone:/^X/.test(m.strongest.class)?'storm':/^M/.test(m.strongest.class)?'watch':'calm'});
 if(m.plasma){
  const speed=m.plasma.value;
  const summary=speed>=500?tx('Швидкий потік','Fast flow',"Flujo rápido","Vent rapide"):speed<300?tx('Повільний потік','Slow flow',"Flujo lento","Vent lent"):tx('Швидкість близька до звичайної','Speed is near typical',"Velocidad cercana a la habitual","Vitesse proche de la normale");
  out.push({icon:'➜',k:tx('Сонячний вітер','Solar wind',"Viento solar","Vent solaire"),v:m.plasma.stale?tx('Останнє вимірювання швидкості','Last measured speed',"Última velocidad medida","Dernière vitesse mesurée"):summary,
   details:num(speed,0)+tx(' км/с · типовий орієнтир ≈ 400 км/с',' km/s · typical reference ≈ 400 km/s'," km/s · valor habitual ≈ 400 km/s"," km/s · repère usuel ≈ 400 km/s"),ageKey:'plasma',age:observationAge(m.plasma),tone:m.plasma.stale?'none':speed>=500?'watch':'calm'});
 }
 if(m.mag){
  const bz=m.mag.value;
  const summary=bz<0?tx('Вітер може легше передавати енергію магнітному полю Землі','The wind may transfer energy to Earth’s magnetic field more readily',"El viento puede transferir energía con mayor facilidad al campo magnético terrestre","Le vent peut transférer plus facilement de l’énergie au champ magnétique terrestre"):
   bz>0?tx('Поле вітру менш сприятливе для збурень','The wind’s field is less favorable to disturbances',"El campo del viento es menos favorable a las perturbaciones","Le champ du vent est moins favorable aux perturbations"):tx('Поле вітру близьке до нейтрального за напрямком північ–південь','The north–south field is near zero',"La componente norte-sur del campo está cerca de cero","La composante nord-sud du champ est proche de zéro");
  out.push({icon:'◈',k:tx('Взаємодія з полем Землі','Interaction with Earth’s magnetic field',"Interacción con el campo magnético terrestre","Interaction avec le champ magnétique terrestre"),v:m.mag.stale?tx('Останнє вимірювання поля сонячного вітру','Last measurement of the solar wind field',"Última medición del campo del viento solar","Dernière mesure du champ du vent solaire"):summary,
   details:'Bz '+(bz>0?'+':'')+num(bz)+tx(' нТл',' nT'," nT"," nT"),ageKey:'mag',age:observationAge(m.mag),tone:m.mag.stale?'none':bz<0?'watch':'calm'});
 }
 if(m.kp0!==null){
  const g=gOf(m.kp0);
  const summary=g?tx('Сьогодні можлива буря G','A storm is possible today: G',"Hoy es posible una tormenta G","Une tempête est possible aujourd’hui, niveau G")+g:
   m.kp0>=4?tx('Сьогодні можливі збурення','Disturbances are possible today',"Hoy puede haber perturbaciones","Des perturbations sont possibles aujourd’hui"):tx('На сьогодні прогнозують спокійний стан','Today’s forecast is calm',"Hoy se prevé calma","Le calme est prévu aujourd’hui");
  out.push({icon:'◉',k:tx('Прогноз на сьогодні','Today’s forecast',"Pronóstico de hoy","Prévisions du jour"),v:summary,details:tx('Максимум Kp ','Maximum Kp ',"Kp máximo ","Kp maximal ")+num(m.kp0,2)+tx(' · поріг бурі Kp 5',' · storm threshold Kp 5'," · umbral de tormenta Kp 5"," · seuil de tempête Kp 5"),tone:g?'storm':m.kp0>=4?'watch':'calm'});
 }
 if(m.cme.length){
  const at=new Intl.DateTimeFormat(window.NRLocale?.locale||'uk-UA',{timeZone:ZONE,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(m.cme[0].arrival_utc));
  out.push({icon:'☄',k:tx('Хмара плазми (CME)','Plasma cloud (CME)',"Nube de plasma (CME)","Nuage de plasma (CME)"),v:tx('За моделлю NASA можливе прибуття ','NASA model: possible arrival ',"Posible llegada según el modelo de la NASA ","Arrivée possible selon le modèle de la NASA ")+at+tx(' · Київ',' · Kyiv'," · Kyiv"," · Kyiv"),tone:'watch'});
 }
 return out;
}
function animate(canvas,resize,draw){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const dataSaver=matchMedia('(prefers-reduced-data: reduce)');
 const html=document.documentElement;
 let inView=false,frame=0,last=0,elapsed=0,needsPaint=true;
 function tick(now){
  frame=0;
  if(!inView||document.hidden)return;
  const moves=!reduced.matches&&!dataSaver.matches&&!navigator.connection?.saveData&&
   html.classList.contains('sr-sky-motion')&&!html.classList.contains('nr-design-motion-off');
  if(needsPaint||(moves&&now-last>=32)){
   if(moves&&last)elapsed+=Math.min(now-last,100);
   last=now;needsPaint=false;
   draw(elapsed,moves);
  }
  if(moves)frame=requestAnimationFrame(tick);
  else last=0;
 }
 function wake(){
  if(!inView||document.hidden){cancelAnimationFrame(frame);frame=0;last=0;return;}
  if(!frame)frame=requestAnimationFrame(tick);
 }
 function repaint(){needsPaint=true;wake();}
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;wake();});
 const ro=new ResizeObserver(()=>{resize();repaint();});
 const options=new MutationObserver(repaint);
 resize();observer.observe(canvas);ro.observe(canvas.parentElement);
 options.observe(html,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',wake);
 for(const preference of [reduced,dataSaver])preference.addEventListener('change',repaint);
 navigator.connection?.addEventListener('change',repaint);
 return {repaint,stop(){
  cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();options.disconnect();
  document.removeEventListener('visibilitychange',wake);
  for(const preference of [reduced,dataSaver])preference.removeEventListener('change',repaint);
  navigator.connection?.removeEventListener('change',repaint);
 }};
}
// ---------------------------------------------------------------- drawing
function scene(canvas,m){
 const g=canvas.getContext('2d');
 let W=0,H=0,dpr=1;
 const lvl=m.level,watch=m.unsettled;
 const shieldCol=lvl>=2?[255,107,107]:lvl===1||watch?[242,196,107]:[110,220,255];
 const windCol=lvl>=2?[255,140,110]:lvl===1||watch?[255,206,120]:[150,200,255];
 const speedK=Math.max(.6,Math.min(2.2,(m.speed||420)/420));
 const bzOpen=m.bz!==null&&m.bz<0;
 // deterministic pseudo-random
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const parts=Array.from({length:70+Math.min(4,lvl)*25+(watch?10:0)},()=>({p:rnd(),y:rnd()*2-1,s:.6+rnd()*.8,z:rnd()}));
 const spots=Array.from({length:5},()=>({a:rnd()*6.28,r:.25+rnd()*.55,s:.06+rnd()*.07}));
 const gran=Array.from({length:60},()=>({a:rnd()*6.28,r:Math.sqrt(rnd())*.92,s:.05+rnd()*.08,ph:rnd()*6.28}));
 const land=Array.from({length:9},()=>({lon:rnd()*6.28,lat:(rnd()*2-1)*1.1,r:.18+rnd()*.28}));
 const stars=Array.from({length:60},()=>({x:rnd(),y:rnd(),r:rnd()*1.1+.2,tw:rnd()*6.28}));
 function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,Math.round(W*.56));canvas.style.height=H+'px';canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);g.setTransform(dpr,0,0,dpr,0,0)}
 function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
 function frame(elapsed,moving){
  const t=elapsed/1000;g.clearRect(0,0,W,H);
  // space
  const bg=g.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#1a0f1e');bg.addColorStop(.35,'#0a0d24');bg.addColorStop(1,'#070b1c');g.fillStyle=bg;g.fillRect(0,0,W,H);
  for(const s of stars){g.fillStyle='rgba(255,255,255,'+(.35+.35*Math.sin(t*1.3+s.tw))+')';g.beginPath();g.arc(s.x*W,s.y*H,s.r,0,7);g.fill()}
  // ---- Sun
  const sx=W*.13,sy=H*.5,sr=H*.36;
  const halo=g.createRadialGradient(sx,sy,sr*.8,sx,sy,sr*2.3);halo.addColorStop(0,m.hot?'rgba(255,120,60,.55)':'rgba(255,170,70,.42)');halo.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=halo;g.beginPath();g.arc(sx,sy,sr*2.3,0,7);g.fill();
  const body=g.createRadialGradient(sx-sr*.25,sy-sr*.25,sr*.1,sx,sy,sr);body.addColorStop(0,'#fff3b0');body.addColorStop(.45,m.hot?'#ff9a3c':'#ffb648');body.addColorStop(1,m.hot?'#d8361c':'#e86a1f');
  g.fillStyle=body;g.beginPath();g.arc(sx,sy,sr,0,7);g.fill();
  g.save();g.beginPath();g.arc(sx,sy,sr,0,7);g.clip();
  for(const c of gran){const a=c.a+t*.05,rr=c.r*sr;const x=sx+Math.cos(a)*rr,y=sy+Math.sin(a)*rr;g.fillStyle='rgba(255,236,170,'+(.06+.05*Math.sin(t*2+c.ph))+')';g.beginPath();g.arc(x,y,c.s*sr*.7,0,7);g.fill()}
  for(const s of spots){const a=s.a+t*.03,x=sx+Math.cos(a)*s.r*sr,y=sy+Math.sin(a)*s.r*sr*.8;g.fillStyle='rgba(90,25,10,.55)';g.beginPath();g.ellipse(x,y,s.s*sr,s.s*sr*.7,a,0,7);g.fill()}
  g.restore();
  // flare: a bright loop on the limb, pulsing, when a medium/strong flare happened in the last 3 days
  if(m.hot){const p=(Math.sin(t*1.6)+1)/2,a=-.35;const fx=sx+Math.cos(a)*sr,fy=sy+Math.sin(a)*sr;
   const fl=g.createRadialGradient(fx,fy,0,fx,fy,sr*.9);fl.addColorStop(0,'rgba(255,255,230,'+(.55+.4*p)+')');fl.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=fl;g.beginPath();g.arc(fx,fy,sr*.9,0,7);g.fill();
   g.strokeStyle='rgba(255,220,150,'+(.5+.4*p)+')';g.lineWidth=2.2;g.beginPath();g.arc(fx+sr*.12,fy-sr*.05,sr*.22,Math.PI*.9,Math.PI*2.05);g.stroke()}
  // ---- Earth + shield geometry
  const ex=W*.78,ey=H*.5,er=H*.16;
  const stand=er*(2.15-Math.min(.8,lvl*.2+(watch?.12:0)));  // shield is pushed closer in a storm
  const breath=1+.03*Math.sin(t*2.2*speedK);
  // Show the illustrative plasma arc only when the NASA feed has a future CME arrival.
  if(m.cme.length){const ph=(t%5)/5,R=sr+(ex-sx-sr)*ph*.9;g.strokeStyle='rgba(255,150,90,'+(.5*(1-ph))+')';g.lineWidth=6*(1-ph)+1;g.beginPath();g.arc(sx,sy,R,-.55,.55);g.stroke();g.fillStyle='rgba(255,120,70,'+(.08*(1-ph))+')';g.beginPath();g.moveTo(sx,sy);g.arc(sx,sy,R,-.55,.55);g.closePath();g.fill()}
  // ---- solar wind
  for(const q of parts){
   q.p+=.0032*q.s*speedK*(moving?1:0);if(q.p>1){q.p=0;q.y=rnd()*2-1}
   let x=sx+sr+(ex-sx-sr)*q.p,y=sy+q.y*H*.42*(0.35+q.p*.65);
   const dx=x-ex-stand*.15,dy=(y-ey)/1.12,dist=Math.hypot(dx,dy),R=stand*breath;
   if(dist<R&&dx<R*.3){ // deflect around the shield (inflow through if Bz south, a few)
    if(!(bzOpen&&q.z<.18)){const ang=Math.atan2(dy,dx);x=ex+stand*.15+Math.cos(ang)*R;y=ey+Math.sin(ang)*R*1.12}
   }
   const a=Math.min(1,q.p*4)*(1-Math.max(0,(q.p-.92)*10));
   g.strokeStyle=rgba(windCol,.55*a);g.lineWidth=1.3;g.beginPath();g.moveTo(x,y);g.lineTo(x-8*speedK,y);g.stroke();
  }
  // shield arcs (bow + magnetopause) and tail
  g.save();g.shadowColor=rgba(shieldCol,.9);g.shadowBlur=lvl?10+lvl*5:watch?6:4;
  for(let i=0;i<3;i++){const R=stand*breath*(1+i*.22),al=(.55-i*.16)*(lvl?(.75+.25*Math.sin(t*4)):1);
   g.strokeStyle=rgba(shieldCol,al);g.lineWidth=(lvl?3.2:2.2)-i*.5;g.beginPath();g.ellipse(ex+R*.15,ey,R,R*1.12,0,Math.PI*.55,Math.PI*1.45);g.stroke();
   g.beginPath();g.moveTo(ex+R*.15+Math.cos(Math.PI*.55)*R,ey+Math.sin(Math.PI*.55)*R*1.12);g.quadraticCurveTo(ex+R*1.2,ey+R*.9,W+10,ey+R*(.7+i*.15));g.stroke();
   g.beginPath();g.moveTo(ex+R*.15+Math.cos(Math.PI*1.45)*R,ey+Math.sin(Math.PI*1.45)*R*1.12);g.quadraticCurveTo(ex+R*1.2,ey-R*.9,W+10,ey-R*(.7+i*.15));g.stroke()}
  g.restore();
  // aurora at the poles (Kp 4 faint, storm bright)
  const au=lvl?Math.min(1,.6+lvl*.15):watch?.32:0;
  if(au){for(const s of [-1,1]){const ay=ey+s*er*.95,ag=g.createRadialGradient(ex,ay,0,ex,ay,er*.95);const p=.75+.25*Math.sin(t*3+s);ag.addColorStop(0,'rgba(120,255,170,'+(au*p)+')');ag.addColorStop(.6,'rgba(170,110,255,'+(au*.45*p)+')');ag.addColorStop(1,'rgba(120,255,170,0)');g.fillStyle=ag;g.beginPath();g.ellipse(ex,ay,er*1.05,er*.5,0,0,7);g.fill();
   if(lvl){g.save();g.filter='blur(1.5px)';g.lineCap='round';for(let k=0;k<22;k++){const f=k/21,xx=ex-er*.85+f*er*1.7,h=er*(.28+.22*Math.sin(t*1.8+k*.9)+.1*Math.sin(t*3.1+k*2.3))*(1-Math.abs(f-.5)*.9);const base=ay+s*er*.05;const cg=g.createLinearGradient(0,base,0,base+s*-h);cg.addColorStop(0,'rgba(140,255,180,'+(.7*au)+')');cg.addColorStop(.7,'rgba(160,120,255,'+(.3*au)+')');cg.addColorStop(1,'rgba(160,120,255,0)');g.strokeStyle=cg;g.lineWidth=2.4;g.beginPath();g.moveTo(xx,base);g.lineTo(xx+Math.sin(t+k)*2,base-s*h);g.stroke()}g.restore()}}}
  // Earth
  const eg=g.createRadialGradient(ex-er*.4,ey-er*.3,er*.1,ex,ey,er);eg.addColorStop(0,'#7fd0ff');eg.addColorStop(.6,'#2a74c9');eg.addColorStop(1,'#0d2f6b');g.fillStyle=eg;g.beginPath();g.arc(ex,ey,er,0,7);g.fill();
  g.save();g.beginPath();g.arc(ex,ey,er,0,7);g.clip();
  for(const l of land){const lon=l.lon+t*.12;const c=Math.cos(lon);if(c<-.1)continue;const x=ex+Math.sin(lon)*er*.95,y=ey+l.lat*er*.6;g.fillStyle='rgba(90,170,90,'+(.55*Math.max(0,c+.1))+')';g.beginPath();g.ellipse(x,y,l.r*er*Math.max(.25,c),l.r*er*.8,0,0,7);g.fill()}
  const night=g.createLinearGradient(ex-er,0,ex+er,0);night.addColorStop(0,'rgba(0,0,20,0)');night.addColorStop(.55,'rgba(0,0,20,.05)');night.addColorStop(1,'rgba(0,0,25,.7)');g.fillStyle=night;g.fillRect(ex-er,ey-er,er*2,er*2);
  g.restore();
  g.strokeStyle='rgba(160,210,255,.6)';g.lineWidth=1.2;g.beginPath();g.arc(ex,ey,er+1.5,0,7);g.stroke();
  // labels
  g.font='600 12px system-ui, sans-serif';g.fillStyle='rgba(255,236,200,.95)';g.textAlign='center';g.fillText(tx('Сонце','Sun',"Sol","Soleil"),sx,sy+sr+16>H-4?H-6:sy+sr+16);
  g.fillStyle='rgba(220,236,255,.95)';g.fillText(tx('Земля','Earth',"Tierra","Terre"),ex,ey+er+16+(au?6:0));
  g.fillStyle=rgba(shieldCol,.95);g.textAlign='right';g.fillText(tx('магнітний щит','magnetic shield',"escudo magnético","bouclier magnétique"),ex-stand*.6,H-8);g.textAlign='left';
 }
 return animate(canvas,size,frame).stop;
}
// ---------------------------------------------------------------- card
const STYLE=`.sr-space{margin:12px 0;padding:0;overflow:hidden;border-radius:20px;background:#0a0d24;border:1px solid rgba(185,163,227,.25)}
.sr-space{position:relative}.sr-space canvas{display:block;width:100%}.sr-space-stage{position:relative}.sr-space-stage .sr-space-ov{position:absolute;inset:0;pointer-events:none}
.sr-space-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 12px;background:#101630;color:#f5d49e;font-size:.8rem}
.sr-space-badge{max-width:100%;overflow-wrap:anywhere;padding:4px 10px;border-radius:999px;font:800 .72rem/1.4 system-ui,sans-serif;letter-spacing:.08em;background:rgba(10,13,36,.75);color:#8FE0BE;border:1px solid currentColor}
.sr-space-badge[data-tone=watch]{color:#F2C46B}.sr-space-badge[data-tone=storm]{color:#fff;background:#8f2437;border-color:#ff8f96}
.sr-space-stage{aspect-ratio:100 / 56}.sr-space-stage canvas{position:absolute;inset:0}.sr-space-stage .sr-space-ov{pointer-events:none}
@media(min-width:1024px){[data-space-scene=sky] :is(.sr-space-stage,.sr-space-legend){max-width:680px;margin-inline:auto}}
.sr-space-body{padding:12px 16px 14px}
.sr-space h3{margin:0 0 4px;font:700 1.12rem/1.3 Georgia,'Times New Roman',serif;color:#F4F5FF}
.sr-space[data-tone=storm] h3{color:#FF9AA2}.sr-space[data-tone=watch] h3{color:#F2C46B}.sr-space[data-tone=calm] h3{color:#8FE0BE}
.sr-space-impact{margin:0 0 12px;color:#D9DCF0;font-size:.9rem;line-height:1.45}.sr-space li .sr-space-detail{display:block;margin-top:4px;color:#BCC3DF;font-size:.8rem}
.sr-space ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.sr-space li{display:grid;grid-template-columns:minmax(28px,max-content) minmax(0,1fr);gap:8px;align-items:start;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border-left:3px solid #AEB6D8}
.sr-space li[data-tone=calm]{border-left-color:#63E6AD}.sr-space li[data-tone=watch]{border-left-color:#F2C46B}.sr-space li[data-tone=storm]{border-left-color:#FF858D}
.sr-space li i{font-style:normal;font-size:1.15rem;line-height:1.3;text-align:center}
.sr-space li b{display:block;color:#EEF0FF;font-size:.86rem}.sr-space li span{display:block;color:#D9DCF0;line-height:1.4;font-size:.9rem}
.sr-space .sr-space-forecast{margin:4px 0 2px;font-size:1rem;font-weight:750;color:#8FE0BE}.sr-space[data-tone=storm] .sr-space-forecast{color:#FF9AA2}.sr-space[data-tone=watch] .sr-space-forecast{color:#F2C46B}.sr-space[data-tone=none] .sr-space-forecast{color:#D9DCF0}
.sr-space .sr-space-period{margin:0 0 10px;color:#C9CDEA;font-size:.85rem}
.sr-space small{display:block;margin-top:8px;color:#BCC3DF;line-height:1.4}.sr-space .sr-space-sources{display:flex;flex-wrap:wrap;gap:0 12px;margin:0;font-size:.8rem}.sr-space .sr-space-sources a{color:#c5dcff;display:inline-flex;align-items:center;min-height:44px;margin:0;padding:0}`;
function cardHtml(m,h,id){
 const cs=chips(m);
 const badge=m.level?tx('Прогноз G','Forecast G',"Pronóstico G","Prévision G")+m.level:m.unsettled?tx('Можливі збурення','Possible disturbance',"Posibles perturbaciones","Perturbations possibles"):m.max?tx('Спокійний прогноз','Calm outlook',"Se prevé calma","Calme prévu"):'';
 const illustration=cs.length?'<div class="sr-space-legend">'+
  (badge?'<span class="sr-space-badge" data-tone="'+h.tone+'">'+esc(badge)+'</span>':'')+
  '<span class="sr-space-wind-label">'+esc(tx('Сонячний вітер →','Solar wind →',"Viento solar →","Vent solaire →"))+'</span></div>'+
  '<div class="sr-space-stage" role="img" aria-label="'+esc(tx('Ілюстрація Сонця, сонячного вітру й магнітного поля Землі','Illustration of the Sun, solar wind and Earth’s magnetic field',"Ilustración del Sol, el viento solar y el campo magnético terrestre","Illustration du Soleil, du vent solaire et du champ magnétique terrestre"))+'"><canvas class="sr-space-gl"></canvas><canvas class="sr-space-ov"></canvas></div>' : '';
 const impact=tx('На землі магнітна буря зазвичай не відчувається. Залежно від сили бурі можливі збої радіозв’язку чи супутникової навігації.','People on the ground generally do not feel geomagnetic storms. Depending on the storm, radio or satellite navigation can be disrupted.',"En tierra, normalmente no se sienten las tormentas geomagnéticas. Según su intensidad, pueden afectar a las radiocomunicaciones o a la navegación por satélite.","Au sol, les tempêtes géomagnétiques passent généralement inaperçues. Selon leur intensité, elles peuvent perturber les communications radio ou la navigation par satellite.");
 return '<header class="sr-space-body"><h3 id="'+id+'">'+esc(h.title)+'</h3><p class="sr-space-forecast">'+esc(h.forecast)+'</p></header>'+illustration+
  '<div class="sr-space-body"><p class="sr-space-impact"><strong>'+esc(tx('Що відчують люди','What people may notice',"Qué se puede notar","Ce que l’on peut remarquer"))+'</strong><br>'+esc(impact)+'</p>'+
  (cs.length?'<ul>'+cs.map(c=>'<li data-tone="'+c.tone+'"><i aria-hidden="true">'+c.icon+'</i><div><b>'+esc(c.k)+'</b><span>'+esc(c.v)+'</span>'+
   (c.details?'<small class="sr-space-detail">'+esc(c.details)+'</small>':'')+(c.age?'<small class="sr-space-detail" data-observation-age="'+c.ageKey+'">'+esc(c.age)+'</small>':'')+'</div></li>').join('')+'</ul>':'')+
  '<small>'+(h.period?esc(h.period)+' ':'')+esc(tx('Спалахи, вітер і Kp — NOAA. Геометрія поля й сяйво ілюстративні.','Flares, solar wind and Kp from NOAA. Field geometry and aurora are illustrative.',"Erupciones, viento solar y Kp de NOAA. La forma del campo y la aurora son ilustrativas.","Éruptions, vent solaire et Kp fournis par la NOAA. La forme du champ et l’aurore sont illustratives."))+
  '</small><p class="sr-space-sources"><a href="https://www.spaceweather.gov/noaa-scales-explanation" target="_blank" rel="noopener noreferrer">'+esc(tx('Шкала NOAA','NOAA scale',"Escala de NOAA","Échelle de la NOAA"))+'</a><a href="https://svs.gsfc.nasa.gov/2915" target="_blank" rel="noopener noreferrer">NASA/GSFC SVS · Blue Marble</a><a href="https://www.usgs.gov/faqs/does-earths-magnetic-field-affect-human-health" target="_blank" rel="noopener noreferrer">USGS</a></p></div>';
}
const hosts={
 today:{route:'nrRoute-today',anchor:route=>route.querySelector('[data-overview=today] > .nr-o-hero'),
  place:(box,anchor)=>{
   const clock=anchor.parentElement.querySelector(':scope > [data-sky-clock]');
   // The primary layout can prioritise an active alert; Classic keeps its compact Sun first.
   if(window.NRAppToday){anchor.after(box);window.NRAppToday.arrange();}
   else {
    const caution=anchor.parentElement.querySelector(':scope > .sr-expert-caution');
    (clock||caution||anchor).after(box);
   }
  }},
 sky:{route:'nrRoute-panch',anchor:route=>route.querySelector(':scope > section.nr-sky'),
  place:(box,anchor)=>anchor.before(box)}
};
const cleanups={};
function currentHost(){
 for(const [key,host] of Object.entries(hosts)){
  const route=document.getElementById(host.route);
  if(route?.classList.contains('active'))return {key,host,route};
 }
 return null;
}
async function render(){
 const entry=currentHost();
 if(!entry||document.hidden||!entry.host.anchor(entry.route))return;
 const raw=await load();
 const active=currentHost();
 if(!active||document.hidden)return;
 const {key,host,route}=active;
 const anchor=host.anchor(route);
 if(!anchor)return;
 const now=Date.now(),data=inputs(raw,now),m=model(data,now),h=headline(m,data);
 const {plasma,mag,...visual}=m;
 const observationKey=sample=>sample&&[sample.value,sample.time,sample.stale];
 const signature=JSON.stringify([LANG(),h,visual,observationKey(plasma),observationKey(mag)]);
 const current=route.querySelector('[data-space-scene]');
 if(current?.dataset.sig===signature){
  for(const label of current.querySelectorAll('[data-observation-age]')){
   const age=observationAge(m[label.dataset.observationAge]);
   if(label.textContent!==age)label.textContent=age;
  }
  if(key==='sky'&&current.nextElementSibling!==anchor)host.place(current,anchor);
  return;
 }
 cleanups[key]?.();
 if(!document.getElementById('srSpaceStyle')){
  const style=document.createElement('style');style.id='srSpaceStyle';style.textContent=STYLE;document.head.append(style);
 }
 const box=document.createElement('section'),id='srSpaceTitle-'+key;
 box.className='sr-space';
 Object.assign(box.dataset,{spaceScene:key,tone:h.tone,sig:signature,level:m.max?String(m.level):'unknown'});
 if(key==='today')box.dataset.placement='after-hero';
 box.setAttribute('aria-labelledby',id);
 box.setAttribute('translate','no');
 box.innerHTML=cardHtml(m,h,id);
 if(current)current.replaceWith(box);
 if(!current||(key==='sky'&&box.nextElementSibling!==anchor))host.place(box,anchor);
 const gl=box.querySelector('.sr-space-gl'),overlay=box.querySelector('.sr-space-ov');
 if(!gl){cleanups[key]=null;return;}
 let stop=null;
 function fallback(){
  stop?.();
  gl.remove();
  overlay.classList.remove('sr-space-ov');
  box.dataset.renderer='2d';
  stop=scene(overlay,m);
 }
 try{stop=window.SRSpaceGL?.mount(gl,overlay,m,animate,tx)||null;}catch(_){}
 if(stop){
  box.dataset.renderer='webgl';
  gl.addEventListener('webglcontextlost',fallback,{once:true});
 }else fallback();
 cleanups[key]=()=>{gl.removeEventListener('webglcontextlost',fallback);stop?.();};
}
let pending=0;
function schedule(){
 if(pending)return;
 pending=setTimeout(()=>{
  pending=0;
  render().catch(error=>console.warn('Space-weather scene:',error));
 },60);
}
function watch(){
 for(const [key,host] of Object.entries(hosts)){
  const route=document.getElementById(host.route);
  if(!route)continue;
  new MutationObserver(()=>{
   const card=route.querySelector('[data-space-scene]');
   if(!card||(key==='sky'&&card.nextElementSibling!==host.anchor(route)))schedule();
  }).observe(route,{childList:true,subtree:key==='today'});
 }
 schedule();
}
for(const ev of ['sr:consumer-load','gindex:consumer-ready','nr:locale','hashchange'])window.addEventListener(ev,schedule);
document.addEventListener('visibilitychange',schedule);
document.addEventListener('nr:overview-rendered',schedule);
setInterval(schedule,60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
