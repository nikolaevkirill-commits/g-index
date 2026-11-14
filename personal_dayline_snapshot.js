/* Local, explicit download only. No storage, network, score or new rule weights. */
(function(root,factory){const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./personal_dayline_factors.js'):root.PersonalDaylineFactors);
 if(node)module.exports=api;else root.PersonalDaylineSnapshot=api;
})(globalThis,function(F){'use strict';
 const scoped=['study','talk','travel'];
 const rules={
  overview:['Тара за циклом і чвертю накшатри'],
  work:['Тара як окремий контекст'],
  study:['Накшатра, тітхі та день початку навчання'],
  talk:['Накшатра й день для дружніх справ'],
  travel:['Тара поїздки та конфлікт із загальним правилом','Тітхі, накшатра, основний напрямок','Знак Сонця й планета дня від натального Місяця'],
  rest:['Тара як окремий контекст']
 };
 const pending={
  overview:['Повний добір часу потребує конкретної справи.'],
  work:['Норма для конкретної робочої задачі не встановлена.'],
  study:['Система домів, умовна сприятливість Місяця й Меркурія, загальні виключення.'],
  talk:['Це правило дружніх справ, а не будь-яких переговорів. Загальні виключення не закриті.'],
  travel:['Пріоритет винятків Тари, напрямок відносно Сонця, загальні виключення.'],
  rest:['Окрему норму повсякденного відпочинку не встановлено.']
 };
 function coverage(activity){
  if(!Object.hasOwn(rules,activity))throw Error('Невідома справа');
  return {activity,calculated:[...rules[activity],'Сезонні планетні години 12+12 окремо; вони не додаються до підсумку'],
   open:[...pending[activity],'Фізичну похибку та результативність трактувань не встановлено.'],
   fullElection:false,score:null,
   regionalScope:{status:'NOT_OPERATIONALIZED',source:'MC 1.31, Piyushadhara, друк.24 / кадр40',url:'https://jainqq.org/pagetext/Muhurt_Chintamani/002342/40',
    note:'Частина загальних заборон має регіональні винятки. Історичні регіони не зіставлено з сучасними містами; це не автоматичне звільнення від усіх правил.'}};
 }
 function create(model,{activity='overview',mode='personal',direction=null,instant=model?.day?.start}={}){
  const included=coverage(activity);
  if(!['personal','general'].includes(mode))throw Error('Невідомий режим');
  if(!model||!Number.isFinite(instant)||instant<model.day.start||instant>=model.day.end)throw Error('Момент поза розрахованою добою');
  const personal=mode==='personal';
  const windows=model.windows.map(w=>({start:w.start,end:w.end,segments:w.segments.map(s=>{
   const safe=personal?s:{...s,tara:{variants:[]},travelSky:{...s.travelSky,natalRashis:[],natalStates:[]}};
   const factors=F.evaluate(safe,activity,{direction});
   return {start:s.start,end:s.end,moon:s.moon,tithi:s.tithi,hora:s.hora,
    tara:personal?s.tara:null,travelSky:safe.travelSky,
    factors:scoped.includes(activity)?factors:null,summary:scoped.includes(activity)?F.summary(factors):null};
  })}));
  // Round-trip also detaches the snapshot from the live mutable preview model.
  return JSON.parse(JSON.stringify({schema:'skyrhythm.personal_dayline.snapshot.v1',
   purpose:'local_research_snapshot_not_production_forecast',profile:model.profile,
   engine:model.engine,lunarSource:model.lunarSource,timeConvention:model.timeConvention,ayanamsha:model.ayanamsha,horaProfile:model.horaProfile,
   date:model.date,place:model.place,day:model.day,selection:{instant,activity,mode,direction},
   coverage:included,fullElection:false,score:null,physical_uncertainty_ms:null,
   privacy:personal?'Contains derived birth intervals and natal states; keep private.':'No natal birth intervals or personal states included.',
   birth:personal?model.birth:null,windows}));
 }
 return Object.freeze({coverage,create});
});
