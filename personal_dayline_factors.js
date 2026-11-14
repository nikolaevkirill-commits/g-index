/* Explicit components of a source rule. Never a full election or a numeric score. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PersonalDaylineFactors=api;})(globalThis,function(){'use strict';
 const profiles={
  study:{nak:[0,4,5,6,7,8,10,12,13,14,18,19,21,22,23,24],nakSchoolVariant:{nak:[22,23],note:'Шравана-трійка — за Махешварою; Васиштха наводить лише Шравану (MC 5.38, коментар, друк.102 / кадр122)'},tithi:[2,3,5,6,10,11,12],weekday:[0,3,4,5],source:'MC 5.38, вірш і коментар, с. 101–102',scope:'Початок навчання; не кожне щоденне заняття',missing:['Не перевірені доми карти початку справи: сприятливі планети в кендрах/триконах, відсутність планет у восьмому домі за коментарем та інші загальні умови. Меркурій і Місяць потребують окремих критеріїв сприятливості.']},
  talk:{nak:[4,13,16,26],weekday:[5],source:'MC 2.7, с. 28',scope:'Дружні справи; не переговори чи вирішення конфлікту',missing:['Повний добір часу для конкретної зустрічі не визначено.']},
  travel:{nak:[0,4,6,7,12,16,21,22,26],nakMiddle:[3,10,11,17,18,19,20,23,24,25],nakForbidden:[1,2,5,8,9,13,14,15],nakTierSource:'MC 11.9, коментар: Васиштха — uttama 9 / madhya 10 («daśaiva») / aniṣṭa 8, друк.166 / кадр186',source:'MC 11.8–10, с. 165–167',scope:'Окремі приписи для поїздки; не оцінка її безпеки',missing:['Сонце й планета дня розраховані окремо. Винятки Тари, напрямок відносно Сонця, інші загальні умови та їхній пріоритет не зведені в повний профіль.']}
 };
 const directions={E:{name:'на схід',nak:17,weekdays:[1,6]},S:{name:'на південь',nak:24,weekdays:[4]},W:{name:'на захід',nak:3,weekdays:[0,5]},N:{name:'на північ',nak:11,weekdays:[2,3]}};
 const valid=(n,max,min=0)=>Number.isInteger(n)&&n>=min&&n<=max;
 function row(id,label,state,value,source){return {id,label,state,value,source};}
 function membership(id,label,value,list,max,source,min=0){return row(id,label,!valid(value,max,min)?'missing':list.includes(value)?'listed':'not_listed',value,source);}
 function evaluate(segment,activity,{direction=null}={}){
  const p=profiles[activity],result={activity,status:'partial',fullElection:false,score:null,scope:p?.scope||'Окрему норму для цієї справи не встановлено',factors:[],unresolved:[...(p?.missing||[])]};
  if(!p){result.status='not_defined';return result;}
  const n=segment?.moon?.nak,t=segment?.tithi?.number,w=segment?.hora?.weekday;
  if(p.nakMiddle){
   // Three-tier travel reading: the commentary's lists partition all 27 nakshatras (9+10+8).
   result.factors.push(row('nak','Накшатра Місяця',!valid(n,26)?'missing':p.nak.includes(n)?'listed':p.nakMiddle.includes(n)?'middle':p.nakForbidden.includes(n)?'caution':'missing',n,p.nakTierSource));
  }else{
   const m=membership('nak','Накшатра Місяця',n,p.nak,26,p.source);
   if(m.state==='listed'&&p.nakSchoolVariant?.nak.includes(n)){m.state='school_variant';m.note=p.nakSchoolVariant.note;}
   result.factors.push(m);
  }
  if(p.weekday)result.factors.push(membership('weekday','День від місцевого сходу',w,p.weekday,6,p.source));
  if(p.tithi)result.factors.push(membership('tithi','Тітхі — місячний день',valid(t,30,1)?(t-1)%15+1:null,p.tithi,15,p.source,1));
  if(activity==='study')result.factors.push(row('study_lagna','Повне правило домів і стану планет','not_computed',null,'MC 5.38 вірш («śubhaiḥ … trikoṇa-kendragaiḥ», друк.101 / кадр121) + Piyushadhara, друк.198 / кадр214; геометричний кандидат окремо, повне правило не застосоване'));
  if(activity==='travel'){
   const excluded=valid(t,30,1)&&([1,15,30].includes(t)||[4,6,8,9,12,14].includes((t-1)%15+1));
   result.factors.push(row('tithi','Тітхі: спеціальне застереження',!valid(t,30,1)?'missing':excluded?'caution':'not_flagged',t,'MC 11.9'));
   const variants=segment?.tara?.variants||[],states=variants.map(v=>[1,3,5,7].includes(v.group));
   const missing=!states.length||variants.some(v=>!valid(v.group,9,1));
   const state=missing?'missing':states.every(Boolean)?'caution':states.some(Boolean)?'ambiguous':'not_flagged';
   const conflict=!missing&&variants.some(v=>[1,3,5,7].includes(v.group)&&v.interpretation==='released');
   result.factors.push(row('travel_tara','Тара: спеціальний припис поїздки',conflict?'unresolved':state,variants.map(v=>({natal:v.natal,group:v.group,cycle:v.cycle,general:v.interpretation})),'MC 11.8'));
   if(conflict)result.unresolved.push('Спеціальний припис має застереження, а загальний профіль Тари його знімає. Пріоритет не встановлено.');
   const d=Object.hasOwn(directions,direction)?directions[direction]:null;
   result.factors.push(row('direction','Напрямок: базовий припис',!d?'missing':n===d.nak||d.weekdays.includes(w)?'caution':!valid(n,26)||!valid(w,6)?'missing':'not_flagged',d?.name||'не задано','MC 11.10; без застосування ритуальних винятків'));
   if(!d)result.unresolved.push('Напрямок не задано або не є одним із чотирьох основних; його не вгадуємо.');
  }
  if(activity==='travel'){
   const sky=segment?.travelSky,sun=sky?.sun?.rashi,day=sky?.dayLord,natal=sky?.natalRashis||[];
   const solarState=!valid(sun,11)?'missing':[0,4,8].includes(sun)?'listed':[3,7,11].includes(sun)?'long_duration':'neutral';
   result.factors.push(row('travel_sun','Сонце: сезонний припис поїздки',solarState,sun,'MC 11.8, с.165; не прогноз тривалості фактичної дороги'));
   const positions=valid(day?.rashi,11)&&natal.length&&natal.every(n=>valid(n,11))?natal.map(n=>(day.rashi-n+12)%12+1):[];
   const matches=positions.map(n=>[3,6,10,11].includes(n));
   // MC 11.9 commentary: outside upachaya the day lord is 'kutrāpi na hitaḥ' (nowhere beneficial) -> explicit caution.
   const state=!matches.length?'missing':matches.every(Boolean)?'listed':matches.some(Boolean)?'ambiguous':'caution';
   result.factors.push(row('travel_daylord','Планета дня від натального Місяця',state,{body:day?.body||null,positions},'MC 11.9, коментар с.166–167 («kutrāpi na hitaḥ» поза упачаєю); Upachaya 3/6/10/11: Bhāvaprakāśa, розд.1, PDF7'));
   result.unresolved.push('Збіг умови планети дня не скасовує застереження напрямку: це прямо збережено в коментарі.');
  }
  result.comparison=chandraComparison(segment);
  result.decision=decision(result);
  const pairs=segment?.travelSky?.natalStates||[];
  result.natalVariants=pairs.filter(p=>valid(p.nak,26)&&valid(p.rashi,11)).map(p=>{
   const sub=evaluate({...segment,tara:{...segment.tara,variants:(segment.tara?.variants||[]).filter(v=>v.natal===p.nak)},travelSky:{...segment.travelSky,natalRashis:[p.rashi],natalStates:[]}},activity,{direction});
   return {natalNak:p.nak,natalRashi:p.rashi,factors:sub.factors.filter(f=>['travel_tara','travel_daylord'].includes(f.id)),comparison:sub.comparison,decision:sub.decision};
  });
  return result;
 }
 // Product handling of incomplete evidence, NOT a newly invented classical hierarchy.
 function decision(report){
  const uncomputed=report.factors.filter(f=>f.state==='not_computed').map(f=>f.id),conflicts=report.factors.filter(f=>f.state==='unresolved').map(f=>f.id),missing=report.factors.filter(f=>f.state==='missing').map(f=>f.id),ambiguous=report.factors.filter(f=>f.state==='ambiguous').map(f=>f.id);
  const requirements={study:['conditional_benefics_moon_mercury','election_lagna_and_house_convention','eighth_house_occupancy','general_exclusions'],talk:['specific_activity_scope','general_exclusions'],travel:['tara_exception_precedence','solar_direction_convention','general_exclusions']}[report.activity]||['activity_rule_not_established'];
  return {status:conflicts.length?'conflicting':missing.length?'missing_data':uncomputed.length?'uncomputed_conditions':ambiguous.length?'birth_sensitive':'partial',conflicts,missing,uncomputed,ambiguous,requirements,fullElection:false,score:null,policy:'keep_scoped_conditions_no_cancellation_without_source'};
 }
 function chandraComparison(segment){
  const current=segment?.travelSky?.moon?.rashi,natal=segment?.travelSky?.natalRashis||[];
  const positions=valid(current,11)&&natal.length&&natal.every(n=>valid(n,11))?natal.map(n=>(current-n+12)%12+1):[];
  const flags=positions.map(p=>[6,8,12].includes(p));
  return {profile:'chandrabala_raman_v1',source:'B. V. Raman, Muhurta, III, с.8 / PDF11',positions,state:!flags.length?'missing':flags.every(Boolean)?'caution':flags.some(Boolean)?'ambiguous':'not_flagged',includedInDecision:false,score:null};
 }
 function signature(report){return JSON.stringify(report);}
 function intervals(window,activity,options){const rows=[];for(const s of window.segments){const report=evaluate(s,activity,options),last=rows.at(-1);if(last&&signature(last.report)===signature(report))last.end=s.end;else rows.push({start:s.start,end:s.end,report});}return rows;}
 // UI evidence summary, not a new normative priority or a full forecast.
 function summary(report){
  if(report.status==='not_defined')return {state:'not_defined',symbol:'○',title:'Правило для цієї справи не визначено',reasons:[],score:null};
  const flags=report.factors.filter(f=>['caution','unresolved','missing','ambiguous','school_variant','not_computed','not_listed','middle','long_duration'].includes(f.state));
  const has=state=>flags.some(f=>f.state===state);
  // A conflict must not visually hide an independent, unconditional caution.
  const state=has('unresolved')&&has('caution')?'conflict_caution':has('unresolved')?'conflict':has('caution')?'caution':has('missing')?'missing':has('ambiguous')?'ambiguous':has('school_variant')?'school_variant':has('not_computed')?'incomplete':has('not_listed')||has('middle')||has('long_duration')?'partial_match':'partial';
  const names={conflict_caution:['△','Є застереження; інші правила суперечать'],conflict:['◈','Правила дають різні висновки'],school_variant:['◈','Збіг лише за однією школою читання'],caution:['△','Є традиційне застереження'],missing:['?','Для частини умов бракує даних'],ambiguous:['◈','Результат залежить від часу народження'],incomplete:['…','Не всі умови розраховані'],partial_match:['○','Збігається лише частина умов'],partial:['◇','Перевірені умови збігаються; перевірка неповна']};
  return {state,symbol:names[state][0],title:names[state][1],reasons:flags.map(f=>({id:f.id,label:f.label,state:f.state})),fullElection:false,score:null};
 }
 function summaryIntervals(window,activity,options){const rows=[];for(const s of window.segments){const value=summary(evaluate(s,activity,options)),last=rows.at(-1);if(last&&signature(last.summary)===signature(value))last.end=s.end;else rows.push({start:s.start,end:s.end,summary:value});}return rows;}
 return Object.freeze({evaluate,intervals,chandraComparison,summary,summaryIntervals});
});
