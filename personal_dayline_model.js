/* Local research prototype. No consumer score, storage, network or production hooks. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 // A page cached before FP572 has no <script> for the shared lunar source. While that page is still being
 // parsed, request it right after this file so the scripts that follow find it (mixed-version safety).
 if(!node&&!root.SkyRhythmLunar&&typeof document!=='undefined'&&document.readyState==='loading'&&document.currentScript&&!document.currentScript.async)
  document.write('<script src="lunar_core_v1.js?v=fp572"><\/script>');
 const lunar=node?require('./lunar_core_v1.js'):null;
 const api=factory(node?require('./astronomy-engine-2.1.19.min.js'):root.Astronomy,()=>{const L=lunar||root.SkyRhythmLunar;if(!L)throw Error('Не завантажено спільне місячне ядро (lunar_core_v1.js). Оновіть сторінку.');return L;});
 if(node)module.exports=api;else root.PersonalDayline=api;
})(globalThis,function(A,shared){'use strict';
 const H=3600000,D=24*H,N=360/27,P=360/108;
 const nakNames=['Ашвіні','Бхарані','Крітіка','Рохіні','Мрігашіра','Ардра','Пунарвасу','Пушья','Ашлеша','Магха','Пурва Пхалгуні','Уттара Пхалгуні','Хаста','Читра','Сваті','Вішакха','Анурадха','Джйєштха','Мула','Пурва Ашадха','Уттара Ашадха','Шравана','Дханіштха','Шатабхіша','Пурва Бхадрапада','Уттара Бхадрапада','Реваті'];
 const taraNames=['Джанма','Сампат','Віпат','Кшема','Пратьярі','Садхана','Найдхана','Мітра','Атімітра'];
 const planets=['Сонце','Венера','Меркурій','Місяць','Сатурн','Юпітер','Марс'];
 const glyphs=['☉','♀','☿','☾','♄','♃','♂'];
 const dayLords=[0,3,6,2,5,1,4],fmtCache=new Map();
 const mod=(x,n)=>((x%n)+n)%n;
 function validateDate(ds){if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)||ds<'1900-01-01'||ds>'2100-12-31'||!Number.isFinite(Date.parse(ds+'T00:00:00Z'))||new Date(ds+'T00:00:00Z').toISOString().slice(0,10)!==ds)throw Error('Дата поза підтриманим діапазоном 1900–2100 або некоректна.');}
 function parts(t,zone){
  if(!Number.isFinite(t))throw Error('Некоректний момент часу.');
  if(!zone)throw Error('Потрібен часовий пояс.');
  let f=fmtCache.get(zone);if(!f){f=new Intl.DateTimeFormat('en-GB',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});fmtCache.set(zone,f);}
  const p=Object.fromEntries(f.formatToParts(t).map(x=>[x.type,x.value]));
  return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute,seconds:p.second};
 }
 function civilDay(ds,zone){
  validateDate(ds);const anchor=Date.parse(ds+'T00:00:00Z');parts(anchor,zone);
  const next=new Date(anchor+D).toISOString().slice(0,10);
  function first(key){let lo=anchor-2*D,hi=anchor+3*D;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(parts(mid,zone).date<key)lo=mid;else hi=mid;}return hi;}
  const start=first(ds),end=first(next);
  if(start>=end||parts(start,zone).date!==ds)throw Error('Ця місцева дата пропущена календарем часового поясу.');
  return {start,end,durationMinutes:(end-start)/60000};
 }
 function wallInstants(ds,time,zone){
  validateDate(ds);if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Укажіть час у форматі години:хвилини.');
  const wall=Date.parse(ds+'T'+time+':00Z'),offsets=new Set();
  for(let p=wall-2*D;p<=wall+2*D;p+=6*H){const z=parts(p,zone);offsets.add(Date.parse(z.date+'T'+z.time+':'+z.seconds+'Z')-p);}
  return [...offsets].map(off=>wall-off).filter(t=>{const p=parts(t,zone);return p.date===ds&&p.time===time&&p.seconds==='00';}).sort((a,b)=>a-b);
 }
 function moon(t){
  // FP572: the shared lunar source (lunar_core_v1.js) — the same instant, TT = UTC + 69.184 s and
  // ayanamsha as the main day line and Panchanga, for BOTH birth and transit.
  const lon=shared().moonLongitude(t);
  return {longitude:lon,nak:Math.floor(lon/N),pada:Math.floor((lon%N)/P)+1};
 }
 function lunarSeries(start,end,withPada=true){
  if(!(Number.isFinite(start)&&end>start))throw Error('Некоректний інтервал.');
  const stateKey=s=>withPada?s.nak*4+s.pada-1:s.nak,initial=moon(start),events=[];
  let left=start,previous=initial;
  while(left<end-1){const right=Math.min(left+60000,end-1),next=moon(right);
   if(mod(next.longitude-previous.longitude,360)>0.1)throw Error('Непідтримана швидкість зміни довготи.');
   if(stateKey(next)!==stateKey(previous)){
    let lo=left,hi=right;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(stateKey(moon(mid))===stateKey(previous))lo=mid;else hi=mid;}
    events.push({at:hi,from:previous,to:moon(hi),numerical_bracket_ms:hi-lo});
   }left=right;previous=next;
  }
  return {initial,events,coverage:'one_minute_survey_with_root_refinement',physical_uncertainty_ms:null};
 }
 // Tithi elongation in the SAME apparent true-ecliptic-of-date convention as planetSign/moon:
 // Moon EclipticGeoMoon minus Sun with aberration. Astronomy.MoonPhase uses aberration=false for
 // both bodies, which delays boundaries by ~35-40 s vs apparent (drik/Swiss default) positions.
 // Lahiri (Swiss SIDM_LAHIRI mean, FP571) PLUS nutation in longitude, so true-of-date
 // longitudes minus this equal Swiss FLG_SIDEREAL (mean, no nutation) positions. Without dpsi the sidereal
 // Moon was off by up to ±17" (nutation), ~27 s at nakshatra boundaries on 13.11.2026 (Claude 13.11).
 // FP571: Swiss SIDM_LAHIRI mean ayanamsa (quadratic fit, <0.001") + nutation in longitude.
 const ayanamsha=at=>shared().ayanamshaAt(at);
 function elongation(t){return shared().elongation(t);}
 function tithi(t){
  if(!Number.isFinite(t))throw Error('Некоректний момент тітхі.');
  const angle=elongation(t),number=Math.floor(angle/12)+1;
  return {number,inPaksha:(number-1)%15+1,paksha:number<=15?'shukla':'krishna',angle};
 }
 function tithiSeries(start,end){
  if(!(Number.isFinite(start)&&Number.isFinite(end)&&end>start))throw Error('Некоректний інтервал тітхі.');
  const initial=tithi(start),events=[];let left=start,previous=initial;
  while(left<end-1){const right=Math.min(left+60000,end-1),next=tithi(right);
   if(next.number!==previous.number){let lo=left,hi=right;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(tithi(mid).number===previous.number)lo=mid;else hi=mid;}
    events.push({at:hi,from:previous,to:tithi(hi),numerical_bracket_ms:hi-lo});
   }left=right;previous=next;
  }return {initial,events,physical_uncertainty_ms:null};
 }
 // Apparent geocentric ecliptic of date; same linear Lahiri convention as the natal Moon.
 function planetSign(t,body){
  if(!Number.isFinite(t)||!['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].includes(body))throw Error('Некоректна планета або час.');
  const longitude=shared().bodyLongitude(t,body);
  return {body,rashi:Math.floor(longitude/30)};
 }
 function signSeries(start,end,body){
  if(!(Number.isFinite(start)&&Number.isFinite(end)&&end>start))throw Error('Некоректний інтервал знака.');
  const initial=planetSign(start,body),events=[];let left=start,previous=initial;
  while(left<end-1){const right=Math.min(left+60000,end-1),next=planetSign(right,body);
   if(next.rashi!==previous.rashi){let lo=left,hi=right;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(planetSign(mid,body).rashi===previous.rashi)lo=mid;else hi=mid;}
    events.push({at:hi,from:previous,to:planetSign(hi,body),numerical_bracket_ms:hi-lo});}
   left=right;previous=next;
  }return {initial,events,coverage:'one_minute_survey_with_root_refinement',physical_uncertainty_ms:null};
 }
 const weekdayBodies=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
 function stateAt(series,t){let state=series.initial;for(const e of series.events){if(e.at>t)break;state=e.to;}return state;}
 function birthEvidence(input){
  if(!input?.date)return {status:'missing',candidates:[]};
  try{
   const mode=input.mode||'known';let intervals,day;
   if(input.offsetHours!==undefined){
    validateDate(input.date);
    const off=input.offsetHours;
    if(!Number.isFinite(off)||Math.abs(off)>14||!['known','unknown'].includes(mode))throw Error('Некоректний фіксований зсув часу.');
    const start=Date.parse(input.date+'T00:00:00Z')-Math.round(off*H);
    day={start,end:start+D,durationMinutes:1440};
   }else day=civilDay(input.date,input.zone);
   if(mode==='unknown')intervals=[day];
   else if(mode==='known'){
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time||''))throw Error('Укажіть час у форматі години:хвилини.');
    const times=input.offsetHours===undefined?wallInstants(input.date,input.time,input.zone):
     [day.start+(Number(input.time.slice(0,2))*60+Number(input.time.slice(3)))*60000];
    if(!times.length)throw Error('Цього часу не було через переведення годинника.');
    intervals=times.map(start=>({start,end:Math.min(start+60000,day.end)}));
   }else if(mode==='range'){
    if(input.from>input.to)throw Error('Для цього прототипу проміжок має бути в межах однієї доби.');
    const starts=wallInstants(input.date,input.from,input.zone),ends=wallInstants(input.date,input.to,input.zone);
    if(!starts.length||!ends.length)throw Error('Одна з меж не існує через переведення годинника.');
    // Range means all actual instants whose LOCAL clock minute is between the
    // supplied inclusive endpoints. In a DST fold, pair each wall minute with
    // its own occurrence, rather than linking the first start to the second
    // end and inventing a continuous 60+ minute birth interval.
    intervals=[];
    for(let t=day.start;t<day.end;t+=60000){
     const local=parts(t,input.zone).time;
     if(local>=input.from&&local<=input.to){
      const end=Math.min(t+60000,day.end),last=intervals.at(-1);
      if(last&&last.end===t)last.end=end;else intervals.push({start:t,end});
     }
    }
    if(!intervals.length)throw Error('Некоректний проміжок.');
   }else throw Error('Невідомий режим часу народження.');
   const candidates=new Set(),rashis=new Set(),transitions=[],jointIntervals=[];
   // Keep the real nakshatra/sign pairing at each birth instant. Marginal lists
   // must never be multiplied into impossible natal charts.
   const union=[];for(const x of [...intervals].sort((a,b)=>a.start-b.start)){const last=union.at(-1);if(last&&x.start<=last.end)last.end=Math.max(last.end,x.end);else union.push({start:x.start,end:x.end});}
   for(const interval of union){
    const ns=lunarSeries(interval.start,interval.end,false),rs=signSeries(interval.start,interval.end,'Moon');transitions.push(...ns.events);
    const cuts=[...new Set([interval.start,interval.end,...ns.events.map(e=>e.at),...rs.events.map(e=>e.at)])].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
     const start=cuts[i],end=cuts[i+1],nak=moon(start).nak,rashi=planetSign(start,'Moon').rashi,last=jointIntervals.at(-1);
     candidates.add(nak);rashis.add(rashi);
     if(last&&last.end===start&&last.nak===nak&&last.rashi===rashi)last.end=end;else jointIntervals.push({start,end,nak,rashi});
    }
   }
   const jointCandidates=[...new Map(jointIntervals.map(x=>[x.nak+':'+x.rashi,{nak:x.nak,rashi:x.rashi}])).values()];
   const list=[...candidates].sort((a,b)=>a-b);
   return {status:list.length===1?'available':'ambiguous',candidates:list,rashiCandidates:[...rashis].sort((a,b)=>a-b),jointCandidates,jointIntervals,intervals,transitions,
    instantAmbiguous:mode==='known'&&intervals.length>1,mode,zone:input.zone,
    resolution:mode==='known'?'reported_minute_not_accuracy':null,physical_uncertainty_ms:null};
  }catch(e){return {status:'incomplete',candidates:[],error:e.message};}
 }
 function tara(natal,current,pada){
  if(!Number.isInteger(natal)||natal<0||natal>26||!Number.isInteger(current)||current<0||current>26)throw Error('Invalid nakshatra');
  const d=mod(current-natal,27),group=d%9+1,cycle=Math.floor(d/9)+1;
  let interpretation=group===1?'context':'support';
  if([3,5,7].includes(group)){
   if(cycle===1)interpretation='caution';
   else if(cycle===3)interpretation='released';
   else interpretation=![1,2,3,4].includes(pada)?'unknown':pada===({3:1,5:4,7:3})[group]?'caution':'released';
  }
  return {natal,current,pada,position:d+1,group,cycle,name:taraNames[group-1],interpretation,ruleId:'tara_muhurta_chintamani_4_11_13_v1'};
 }
 function evaluate(birth,state){
  if(!birth.candidates.length)return {status:birth.status,interpretation:'missing',variants:[]};
  const variants=birth.candidates.map(n=>tara(n,state.nak,state.pada));
  const unique=new Set(variants.map(v=>v.interpretation));
  return {status:unique.size===1?'available':'ambiguous',interpretation:unique.size===1?variants[0].interpretation:'ambiguous',
   common:variants.length>1&&unique.size===1,variants};
 }
 function horas(start,end,place){
  const observer=new A.Observer(place.lat,place.lon,place.height||0),rows=[];
  // At most the immediately surrounding solar days; never substitute a distant polar sunrise.
  let rise=A.SearchRiseSet('Sun',observer,1,new Date(start-2*D),4)?.date.getTime();
  for(let guard=0;guard<7;guard++){
   if(!Number.isFinite(rise)||rise>=end)break;
   const set=A.SearchRiseSet('Sun',observer,-1,new Date(rise+1),1.2)?.date.getTime();
   // Exclude the same sunrise returned again within the solver tolerance.
   // This changes only the SEARCH anchor; hora coverage still starts at rise.
   const nextRise=A.SearchRiseSet('Sun',observer,1,new Date(rise+60000),1.2)?.date.getTime();
   if(rise<set&&set<nextRise&&nextRise>start){
    const localDate=parts(rise,place.zone).date;
    const weekday=new Date(localDate+'T12:00:00Z').getUTCDay(),first=dayLords[weekday];
    for(let i=0;i<24;i++){
     const base=i<12?rise:set,finish=i<12?set:nextRise,j=i%12;
     const a=base+(finish-base)*j/12,b=base+(finish-base)*(j+1)/12;
     if(b>start&&a<end)rows.push({start:a,end:b,planet:planets[(first+i)%7],glyph:glyphs[(first+i)%7],sunrise:rise,sunset:set,nextSunrise:nextRise,localSunriseDate:localDate,weekday,solarHour:i+1});
    }
   }
   // Reuse exactly the previous night's end. Re-solving an identical event from
   // another anchor can otherwise introduce a millisecond gap/overlap.
   if(!(nextRise>rise))break;
   rise=nextRise;
  }
  rows.sort((a,b)=>a.start-b.start);
  return rows;
 }
 function build({date,place,birth}){
  if(date<'2017-01-01'||date>'2028-12-31')throw Error('День перегляду прототипу: 2017–2028.');
  if(!place||!Number.isFinite(place.lat)||Math.abs(place.lat)>90||!Number.isFinite(place.lon)||Math.abs(place.lon)>180)throw Error('Перевірте координати місця.');
  const day=civilDay(date,place.zone),evidence=birthEvidence(birth),series=lunarSeries(day.start,day.end),tithis=tithiSeries(day.start,day.end),hours=horas(day.start,day.end,place),windows=[];
  const bodies=[...new Set(['Sun','Moon',...hours.map(h=>weekdayBodies[h.weekday])])],planetSeries=Object.fromEntries(bodies.map(body=>[body,signSeries(day.start,day.end,body)]));
  for(let a=day.start;a<day.end;a+=3*H){
   const b=Math.min(a+3*H,day.end),cuts=[a,b,...series.events.map(e=>e.at),...tithis.events.map(e=>e.at),...Object.values(planetSeries).flatMap(s=>s.events.map(e=>e.at)),...hours.flatMap(h=>[h.start,h.end])].filter(t=>t>=a&&t<=b);
   const sorted=[...new Set(cuts)].sort((x,y)=>x-y),segments=[];
   for(let i=0;i<sorted.length-1;i++){
    const start=sorted[i],end=sorted[i+1];let current=series.initial;
    for(const ev of series.events){if(ev.at>start)break;current=ev.to;}
    let currentTithi=tithis.initial;for(const ev of tithis.events){if(ev.at>start)break;currentTithi=ev.to;}
    const hora=hours.find(h=>h.start<=start&&start<h.end)||null,body=hora?weekdayBodies[hora.weekday]:null;
    segments.push({start,end,moon:current,tithi:currentTithi,tara:evaluate(evidence,current),hora,travelSky:{sun:stateAt(planetSeries.Sun,start),moon:stateAt(planetSeries.Moon,start),dayLord:body?stateAt(planetSeries[body],start):null,natalRashis:evidence.rashiCandidates||[],natalStates:evidence.jointCandidates||[]}});
   }
   windows.push({start:a,end:b,segments});
  }
  return {date,place,day,birth:evidence,series,tithis,planetSeries,hours,windows,profile:'personal_dayline_prototype_v1',horaProfile:'seasonal_12_day_12_night_v1',engine:'astronomy-engine 2.1.19',
   lunarSource:shared().version,timeConvention:{tt_minus_utc_seconds:shared().ttMinusUtcMs(day.start)===null?null:shared().ttMinusUtcMs(day.start)/1000,
    policy:shared().convention.tt_status,model_tolerance_ms:shared().convention.model_tolerance_ms,reference:shared().convention.reference},
   ayanamsha:'Swiss Lahiri quadratic approximation at TT with Astronomy Engine nutation in longitude',physical_uncertainty_ms:null};
 }
 return Object.freeze({build,birthEvidence,moon,ayanamsha,elongation,tithi,tithiSeries,planetSign,signSeries,tara,evaluate,civilDay,wallInstants,parts,horas,nakNames,planets});
});
