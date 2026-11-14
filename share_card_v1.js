/* SkyRhythm · «Поділитися днем» — image card (FP569n, Claude 09.11.2026).
   A 1080×1350 PNG drawn on canvas from the same data the screen shows: date, the plain verdict, the final score
   (resolveFinal), the computed Moon phase and Kyiv sunrise/sunset. Shared with the Web Share API (files) when the
   phone supports it, otherwise downloaded. Nothing leaves the device unless the person shares it. */
(()=>{'use strict';
const I=['uk','en','es','fr'],li=()=>Math.max(0,I.indexOf(window.NRLocale?.language||'uk'));
const T={btn:['Поділитися днем','Share the day','Compartir el día','Partager la journée'],
 rise:['Схід Сонця','Sunrise','Salida del Sol','Lever du Soleil'],set:['Захід Сонця','Sunset','Puesta del Sol','Coucher du Soleil'],moon:['Місяць','Moon','Luna','Lune'],
 waxing:['росте','waxing','creciente','croissante'],waning:['спадає','waning','menguante','décroissante'],
 foot:['Оцінка за традицією й даними неба — не гарантія.','A score from tradition and sky data — not a guarantee.','Puntuación según tradición y datos del cielo; no es garantía.','Score selon la tradition et le ciel — pas une garantie.'],
 made:['Картинку збережено.','Image saved.','Imagen guardada.','Image enregistrée.'],fail:['Не вдалося створити картинку.','Could not create the image.','No se pudo crear la imagen.','Impossible de créer l’image.']};
const t=k=>T[k][li()];
const ZONE='Europe/Kyiv',KYIV={lat:50.4501,lon:30.5234};
function wrap(g,text,x,y,max,lh){const words=String(text).split(/\s+/);let line='',yy=y;for(const w of words){const test=line?line+' '+w:w;if(g.measureText(test).width>max&&line){g.fillText(line,x,yy);line=w;yy+=lh}else line=test}if(line)g.fillText(line,x,yy);return yy+lh}
function moon(g,cx,cy,r,f,waxing){g.save();g.translate(cx,cy);g.fillStyle='#1b2142';g.beginPath();g.arc(0,0,r,0,7);g.fill();g.strokeStyle='rgba(220,226,255,.55)';g.lineWidth=3;g.beginPath();g.arc(0,0,r,0,7);g.stroke();
 g.fillStyle='#EDE9DA';g.beginPath();const s=waxing?1:-1;g.arc(0,0,r,-Math.PI/2,Math.PI/2,s<0);const k=1-2*f;g.ellipse(0,0,Math.abs(k)*r,r,0,Math.PI/2,-Math.PI/2,(k>0)===(s>0));g.fill();g.restore()}
async function draw(ds){
 const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0B1030');bg.addColorStop(.6,'#1A1F52');bg.addColorStop(1,'#2A1E4A');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<140;i++){const x=(i*397)%W,y=(i*211)%(H*.55),r=(i%5===0)?2.2:1.1;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 const loc=window.NRLocale?.locale||'uk-UA',date=new Date(ds+'T12:00:00Z');
 g.fillStyle='#F2C46B';g.font='600 40px Georgia, serif';g.fillText('SkyRhythm ✦',72,110);
 g.fillStyle='#EEF0FF';g.font='700 64px Georgia, serif';g.fillText(new Intl.DateTimeFormat(loc,{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(date),72,200,W-144);
 g.fillStyle='#AEB6D8';g.font='400 29px system-ui, sans-serif';g.fillText(ds.slice(0,4),72,248);
 const r=window.fp469ConsumerForDate?.({ds}),cons=r?.consumer||{},score=cons.available?cons.score:null;
 const color=score===null?'#AEB6D8':score>0?'#63E6AD':score<0?'#FF858D':'#F2C46B';
 g.lineWidth=14;g.strokeStyle=color;g.beginPath();g.arc(220,420,120,0,7);g.stroke();
 g.fillStyle=color;g.font='700 120px system-ui, sans-serif';g.textAlign='center';g.fillText(score===null?'—':(score>0?'+':'')+score,220,462);g.textAlign='left';
 const v=window.NRDayVerdict?.summary?.(ds);
 const provenance=score===null?['Оцінка недоступна','Score unavailable','Puntuación no disponible','Score indisponible'][li()]:
  cons.authority==='expert_pdf'?['Джерело: експертна оцінка','Source: expert score','Fuente: valoración experta','Source : avis expert'][li()]:
  ['Джерело: формула SkyRhythm','Source: SkyRhythm formula','Fuente: fórmula SkyRhythm','Source : formule SkyRhythm'][li()];
 g.fillStyle='#AEB6D8';g.font='400 29px system-ui, sans-serif';g.fillText(provenance,72,582,W-144);
 g.fillStyle='#EEF0FF';g.font='700 54px Georgia, serif';let y=wrap(g,v?.tone||'',390,380,620,64);
 g.font='500 36px system-ui, sans-serif';for(const l of (v?.lines||[]).slice(0,2)){g.fillStyle=l.kind==='good'?'#8FE0BE':l.kind==='avoid'?'#FF9AA2':'#F2C46B';y=wrap(g,l.label+' '+l.text,390,y+6,620,46)}
 // Tonight in one line (same computation as «Вечір під небом» on Sky).
 try{const ev=window.SRSkyEvening?.compute(Date.parse(ds+'T10:00:00Z'),{...KYIV,zone:ZONE});if(ev?.dusk){const tf=d=>new Intl.DateTimeFormat(loc,{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  const names={Venus:['Венера','Venus','Venus','Vénus'],Mars:['Марс','Mars','Marte','Mars'],Jupiter:['Юпітер','Jupiter','Júpiter','Jupiter'],Saturn:['Сатурн','Saturn','Saturno','Saturne'],Mercury:['Меркурій','Mercury','Mercurio','Mercure']};
  const head=['Увечері','Tonight','Esta noche','Ce soir'][li()],dark=['кінець морських сутінків','nautical dusk','fin del crepúsculo náutico','fin du crépuscule nautique'][li()],see=['шукайте','look for','busque','cherchez'][li()];
  const pl=ev.planets.map(x=>names[x.b][li()]).join(', ');
  g.fillStyle='#EEF0FF';g.font='600 38px system-ui, sans-serif';wrap(g,'✦ '+head+': '+dark+' '+tf(ev.dusk)+(pl?' · '+see+': '+pl:''),72,640,W-144,48);}}catch(_){}
 // Sun and Moon for Kyiv, computed.
 const A=window.Astronomy;if(A){const obs=new A.Observer(KYIV.lat,KYIV.lon,0),start=new Date(Date.parse(ds+'T00:00:00Z')-3*36e5);
  const tf=d=>d?new Intl.DateTimeFormat(loc,{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d):'—';
  const rise=A.SearchRiseSet('Sun',obs,+1,start,1)?.date,set=A.SearchRiseSet('Sun',obs,-1,start,1)?.date;
  const at=new Date(ds+'T10:00:00Z'),f=A.Illumination('Moon',at).phase_fraction,wax=A.MoonPhase(at)<180;
  const by=760;g.fillStyle='rgba(255,255,255,.06)';g.beginPath();g.roundRect?g.roundRect(60,by,W-120,300,36):g.rect(60,by,W-120,300);g.fill();
  moon(g,200,by+150,90,f,wax);
  g.fillStyle='#EEF0FF';g.font='600 42px system-ui, sans-serif';g.fillText(t('moon')+': '+(Math.round(f*100)===0?'<1':Math.round(f*100))+'% · '+t(wax?'waxing':'waning'),340,by+110);
  g.font='500 40px system-ui, sans-serif';g.fillStyle='#F2C46B';g.fillText('↑ '+t('rise')+' '+tf(rise),340,by+174,625);
  g.fillText('↓ '+t('set')+' '+tf(set),340,by+221,625);
  g.fillStyle='#AEB6D8';g.font='400 30px system-ui, sans-serif';g.fillText(['Київ','Kyiv','Kyiv','Kyiv'][li()]+' · Europe/Kyiv',340,by+274);}
 g.fillStyle='#AEB6D8';g.font='400 30px system-ui, sans-serif';wrap(g,t('foot'),72,1180,W-144,40);
 g.fillStyle='#F2C46B';g.font='600 30px system-ui, sans-serif';g.fillText('skyrhythm',72,1290);
 return new Promise(res=>c.toBlob(b=>res(b),'image/png'));
}
async function share(ds,btn){
 try{const blob=await draw(ds);if(!blob)throw Error('blob');const file=new File([blob],'skyrhythm-'+ds+'.png',{type:'image/png'});
  if(typeof navigator.share==='function'&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'SkyRhythm · '+ds});return 'shared'}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
  btn.nextElementSibling&&(btn.nextElementSibling.textContent=t('made'));return 'downloaded';
 }catch(e){if(e?.name==='AbortError')return 'cancelled';btn.nextElementSibling&&(btn.nextElementSibling.textContent=t('fail'));return 'failed'}
}
function selected(){const r=document.querySelector('[data-overview="today"]');return r?.querySelector('select')?.value||(window.NRCivilTime?NRCivilTime.dayKey(Date.now(),ZONE):new Date().toISOString().slice(0,10))}
const phone=matchMedia('(max-width:600px)');
function mount(){
 const root=document.querySelector('#nrRoute-today [data-overview="today"]'),hero=root?.querySelector(':scope > .nr-o-hero');if(!hero)return;
 const solar=phone.matches&&root.hasAttribute('data-app-today')&&root.querySelector(':scope > [data-sky-clock]');
 const target=solar||hero;
 let box=root.querySelector('[data-share-card]');
 if(!box){
  box=document.createElement('div');box.className='sr-share-card';box.dataset.shareCard='';
  box.innerHTML='<button type="button"></button><small role="status"></small>';
  box.querySelector('button').onclick=e=>share(selected(),e.currentTarget);
 }
 if(box.parentElement!==target){
  const focused=box.contains(document.activeElement)?document.activeElement:null;
  target.append(box);
  focused?.focus({preventScroll:true});
 }
 const b=box.querySelector('button');if(b.textContent!=='↗ '+t('btn'))b.textContent='↗ '+t('btn');
}
const STYLE='.sr-share-card{margin:10px 0 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}[data-sky-clock]>.sr-share-card{margin:4px 15px 16px}.sr-share-card button{min-height:44px;padding:0 16px;border-radius:14px;border:1px solid rgba(242,196,107,.6);background:rgba(242,196,107,.12);color:#F2C46B;font:600 15px/1 system-ui,sans-serif;cursor:pointer}.sr-share-card button:focus-visible{outline:3px solid #F2C46B;outline-offset:2px}.sr-share-card small{opacity:.8}';
let pending=0;const soon=()=>{clearTimeout(pending);pending=setTimeout(()=>{if(!document.getElementById('srShareStyle')){const s=document.createElement('style');s.id='srShareStyle';s.textContent=STYLE;document.head.append(s)}try{mount()}catch(e){console.warn('share_card',e)}},250)};
phone.addEventListener('change',soon);
for(const ev of ['sr:consumer-load','gindex:consumer-ready','nr:locale','hashchange'])window.addEventListener(ev,soon);
function watch(){const r=document.getElementById('nrRoute-today');if(!r){setTimeout(watch,400);return}new MutationObserver(soon).observe(r,{childList:true,subtree:true});soon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.SRShareCard=Object.freeze({draw,share});
})();
