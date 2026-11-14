/* Standalone preview: one selected instant, existing sky and Moon calculation. */
(()=>{'use strict';
 const names={Sun:'Сонце',Moon:'Місяць',Mercury:'Меркурій',Venus:'Венера',Mars:'Марс',Jupiter:'Юпітер',Saturn:'Сатурн'};
 const symbols={Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄'};
 const directions=['північ','північний схід','схід','південний схід','південь','південний захід','захід','північний захід'];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),dataReduced=matchMedia('(prefers-reduced-data: reduce)');
 let model,instant,callback,host,details,slider,play,stamp,map,moon,fallback,caption,above,notice,loader,frame=0,running=false,startWall=0,startInstant=0,lastPaint=0,snapshot=null;
 const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
 function allowed(){return !document.hidden&&!reduced.matches&&!dataReduced.matches&&!navigator.connection?.saveData&&details?.open;}
 function stop(){running=false;cancelAnimationFrame(frame);frame=0;if(play){play.textContent='▶ Програти добу';play.disabled=!allowed();}}
 function state(){if(!allowed())stop();if(play){play.disabled=!allowed();notice.textContent=!details.open?'':reduced.matches?'Рух вимкнено в системі. Час можна змінити повзунком.':dataReduced.matches||navigator.connection?.saveData?'Економія даних: лише нерухомий перегляд.':'Прискорений перегляд доби · одна дата, одне місце й один годинник.';}}
 function load(src){return new Promise((resolve,reject)=>{const s=e('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Не вдалося завантажити '+src));};document.head.append(s);});}
 async function prepare(){
  if(!loader)loader=(async()=>{if(!window.NRSkyLive)await load('sky_live_v1.js');if(!window.NRMoonGL)await load('moon_gl_v1.js');})().catch(err=>{loader=null;throw err;});
  try{await loader;if(details.open&&model)draw();}catch(err){stop();notice.textContent='Небо недоступне: '+err.message;}
 }
 function fallbackMoon(c){
  const size=112,ctx=fallback.getContext('2d'),img=ctx.createImageData(size,size),sun=NRMoonGL.sunVector(c.phaseAngle,c.limb);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x+.5-size/2)/(size/2),ny=(size/2-y-.5)/(size/2),q=1-nx*nx-ny*ny,idx=4*(y*size+x);if(q<0)continue;const z=Math.sqrt(q),lit=Math.max(0,nx*sun[0]+ny*sun[1]+z*sun[2]),v=.12+.88*Math.sqrt(lit);img.data[idx]=Math.round(239*v);img.data[idx+1]=Math.round(231*v);img.data[idx+2]=Math.round(208*v);img.data[idx+3]=255;}
  ctx.putImageData(img,0,0);
 }
 function draw(){
  if(!model||!details.open||!window.NRSkyLive)return;
  const c=NRSkyLive.compute(new Date(instant),model.place);snapshot=c;host.dataset.instant=String(instant);
  for(const node of [stamp,map,moon,fallback,caption,above])node.dataset.instant=String(instant);
  const fmt=new Intl.DateTimeFormat('uk-UA',{timeZone:model.place.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  stamp.textContent=fmt.format(instant)+' · '+model.place.label;
  const ctx=map.getContext('2d'),w=660,h=320,horizon=210;ctx.clearRect(0,0,w,h);
  const daylight=c.hz.Sun.altitude>0,gradient=ctx.createLinearGradient(0,0,0,horizon);gradient.addColorStop(0,daylight?'#143867':'#0a102b');gradient.addColorStop(1,daylight?'#a47b57':'#302947');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,horizon);ctx.fillStyle='#0d1827';ctx.fillRect(0,horizon,w,h-horizon);
  ctx.strokeStyle='#b1bacb';ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(w,horizon);ctx.stroke();ctx.font='28px system-ui';ctx.textAlign='left';ctx.fillStyle='#d8deec';ctx.fillText('горизонт',8,horizon-10);
  const headings=['Пн','С','Пд','З','Пн'];headings.forEach((s,i)=>{ctx.textAlign=i===0?'left':i===4?'right':'center';ctx.fillText(s,i*w/4,h-10);});
  let i=0;const list=[];
  for(const [body,hor] of Object.entries(c.hz)){
   i++;const x=20+hor.azimuth/360*(w-40),y=horizon-hor.altitude*2;ctx.fillStyle=body==='Sun'?'#ffd980':body==='Moon'?'#f0ecdc':'#a8c7ff';ctx.globalAlpha=hor.altitude>=0?1:.45;
   ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=body==='Sun'?22:0;ctx.beginPath();ctx.arc(x,y,body==='Sun'?13:body==='Moon'?8:5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   if(hor.altitude>=0)list.push(symbols[body]+' '+names[body]+' · '+directions[Math.round(hor.azimuth/45)%8]+' · '+(hor.altitude<15?'низько':hor.altitude>60?'високо':'над горизонтом'));
  }
  ctx.globalAlpha=1;map.dataset.sunX=(20+c.hz.Sun.azimuth/360*(w-40)).toFixed(4);map.dataset.sunY=(horizon-c.hz.Sun.altitude*2).toFixed(4);
  above.replaceChildren();for(const line of list)above.append(e('li','',line));if(!list.length)above.append(e('li','','Ці сім тіл зараз під горизонтом.'));
  const ok=!navigator.connection?.saveData&&!dataReduced.matches&&window.NRMoonGL?.draw(moon,{phaseAngle:c.phaseAngle,limb:c.limb,size:144});
  moon.hidden=!ok;fallback.hidden=!!ok;if(!ok)fallbackMoon(c);
  const percent=c.fraction*100;caption.textContent='Місяць · '+(percent<1?'<1':Math.round(percent))+'% освітлено · '+(c.waxing?'росте':'спадає');caption.dataset.fraction=String(c.fraction);
  $('#pd-visibility').textContent=daylight?'Над горизонтом не означає видно: зараз денне світло. Не дивись прямо на Сонце.':'Положення розраховані; хмари, засвітка й місцеві перешкоди не враховані.';
 }
 const $=s=>host.querySelector(s);
 function update(m,t){model=m;instant=t;if(!host)return;slider.max=String(Math.floor((m.day.end-m.day.start)/60000)-1);slider.value=String(Math.floor((t-m.day.start)/60000));slider.setAttribute('aria-valuetext',new Intl.DateTimeFormat('uk-UA',{timeZone:m.place.zone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset',hourCycle:'h23'}).format(t));if(details.open){if(window.NRSkyLive)draw();else prepare();}}
 function tick(now){if(!running||!allowed()){stop();return;}const fraction=(now-startWall)/18000,t=Math.floor(startInstant+fraction*(model.day.end-model.day.start));if(t>=model.day.end){callback(model.day.end-1000);stop();return;}if(now-lastPaint>60){lastPaint=now;callback(t);}frame=requestAnimationFrame(tick);}
 function mount(parent,onSelect){
  callback=onSelect;host=e('div','personal-sky');details=e('details');details.id='personal-sky';details.append(e('summary','','Небо в обраний час · переглянути добу'));
  const controls=e('div','sky-controls');stamp=e('strong','sky-clock');slider=e('input');slider.type='range';slider.min='0';slider.step='1';slider.setAttribute('aria-label','Хвилина місцевої доби');slider.id='personal-sky-time';play=e('button','','▶ Програти добу');play.type='button';play.id='personal-sky-play';notice=e('p','small');
  controls.append(stamp,slider,play,notice);map=e('canvas','personal-map');map.width=660;map.height=320;map.setAttribute('role','img');map.setAttribute('aria-label','Положення Сонця, Місяця й планет. Текстовий список нижче.');
  const mb=e('div','personal-moon');moon=e('canvas');fallback=e('canvas');fallback.width=fallback.height=112;fallback.hidden=true;caption=e('p');mb.append(moon,fallback,caption,e('small','','Зеніт угорі. Освітлення й орієнтація з того самого моменту.'));
  above=e('ul','above-list');const vis=e('p','small');vis.id='pd-visibility';details.append(controls,map,mb,e('h3','','Що над горизонтом і в якому напрямку'),above,vis);host.append(details);parent.append(host);
  slider.oninput=()=>{stop();callback(model.day.start+Number(slider.value)*60000);};
  play.onclick=()=>{if(running){stop();return;}if(!allowed()||!model)return;running=true;play.textContent='Ⅱ Пауза';startWall=performance.now();startInstant=model.day.start;callback(startInstant);frame=requestAnimationFrame(tick);};
  details.addEventListener('toggle',()=>{state();if(details.open)prepare();});document.addEventListener('visibilitychange',state);reduced.addEventListener('change',state);dataReduced.addEventListener('change',state);navigator.connection?.addEventListener('change',state);
 }
 window.PersonalDaylineScene=Object.freeze({mount,update,stop,snapshot:()=>snapshot,isPlaying:()=>running});
})();
