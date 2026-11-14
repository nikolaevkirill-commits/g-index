/* No storage writes: this page has its own in-memory profile. */
(()=>{'use strict';
 const M=PersonalDayline,$=s=>document.querySelector(s),H=3600000;
 const cities={kyiv:[50.454,30.524,'Europe/Kyiv'],barcelona:[41.387,2.17,'Europe/Madrid'],izium:[49.212,37.257,'Europe/Kyiv'],perpignan:[42.698,2.895,'Europe/Paris'],auckland:[-36.85,174.76,'Pacific/Auckland'],kathmandu:[27.717,85.324,'Asia/Kathmandu'],tromso:[69.65,18.96,'Europe/Oslo']};
 const text={caution:['△ Обережність за правилом Тари','Цей відрізок має застереження у вибраному традиційному профілі. Це не передбачення неприємності.'],support:['✧ Підтримка за традицією','Тара належить до підтримувальної групи. Це не гарантія результату й не дозвіл на будь-яку справу.'],released:['◇ Спеціальне застереження знято','Для цього циклу або чверті накшатри застереження 3/5/7 не діє. Інші правила цим не перевірені.'],context:['◎ Джанма: важливий контекст справи','Цей профіль не визначає загальну сприятливість Джанми без уточнення справи.'],ambiguous:['◈ Залежить від часу народження','Можливі натальні накшатри дають різні висновки. Переглянь варіанти нижче.'],missing:['○ Персональних даних недостатньо','Загальний календар і планетні години доступні. Для Тари додай дату й часовий пояс народження.'],unknown:['○ Потрібна чверть накшатри','Без неї правило другого циклу не визначене.']};
 const A=PersonalDaylineActivity,F=PersonalDaylineFactors;
 const signNames=['Овен','Телець','Близнюки','Рак','Лев','Діва','Терези','Скорпіон','Стрілець','Козоріг','Водолій','Риби'];
 let model=null,mode='personal',selected=0,revision=0,activity='overview';
 function element(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
 function clock(t,offset=false){return new Intl.DateTimeFormat('uk-UA',{timeZone:model.place.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',...(offset?{timeZoneName:'shortOffset'}:{})}).format(new Date(t));}
 function range(a,b){const dst=model.day.durationMinutes!==1440;return clock(a,dst)+'–'+clock(b,dst)+(b===model.day.end?' · наступна північ':'');}
 function key(tara){return JSON.stringify([tara.interpretation,tara.common,tara.variants.map(v=>[v.natal,v.group,v.cycle,v.interpretation,v.cycle===2&&[3,5,7].includes(v.group)?v.pada:null])]);}
 function signal(tara,withDetails=true){
  const e=element('div','signal');e.dataset.tone=tara.interpretation;
  const info=text[tara.interpretation]||text.unknown,brief=A.describe(tara,activity);e.append(element('strong','signal-title',brief.symbol+' '+brief.title));
  const why=element('details');why.append(element('summary','','Чому так'),element('p','',info[1]));e.append(why);
  if(tara.common)e.append(element('small','','Цей висновок спільний для всіх можливих накшатр народження.'));
  if(tara.variants.length===1){const v=tara.variants[0];why.append(element('small','',v.name+' · цикл '+v.cycle+(v.cycle===2&&[3,5,7].includes(v.group)?' · поточна пада '+v.pada:'')),element('small','','Місяць зараз: '+M.nakNames[v.current]+'. Від натальної '+M.nakNames[v.natal]+' — позиція '+v.position+'.'));}
  if(withDetails&&tara.variants.length>1){const d=element('details'),list=element('ul','detail-list');d.append(element('summary','','Чому є кілька варіантів'));
   for(const v of tara.variants)list.append(element('li','',M.nakNames[v.natal]+' при народженні → '+v.name+', цикл '+v.cycle+': '+text[v.interpretation][0].slice(2)));
   d.append(list);e.append(d);
  }return e;
 }
 const TITHI=['Пратіпада','Двітія','Трітія','Чатуртхі','Панчамі','Шаштхі','Саптамі','Аштамі','Навамі','Дашамі','Екадаші','Двадаші','Трайодаші','Чатурдаші'];
 function tithiName(t){const n=t.number;return n===15?'Пурніма':n===30?'Амавасья':(n<=15?'Шукла ':'Крішна ')+TITHI[(n-1)%15];}
 // Calendar transitions inside one 3-hour block: what visibly changes, and when (Claude 13.11).
 function blockChanges(w){const out=[];for(let i=1;i<w.segments.length;i++){const a=w.segments[i-1],b=w.segments[i];
  if(a.moon.nak!==b.moon.nak)out.push({at:b.start,glyph:'✦',text:'Місяць → '+M.nakNames[b.moon.nak]});
  if(a.tithi.number!==b.tithi.number)out.push({at:b.start,glyph:'☾',text:'Тітхі → '+tithiName(b.tithi)});}
  return out;}
 function hasBirth(){return !!model?.birth?.candidates?.length;}
 function openBirth(){const setup=$('#setup'),panel=$('#birth-panel');setup.open=true;if(panel)panel.open=true;setup.scrollIntoView({block:'start'});setTimeout(()=>$('#birth-date')?.focus(),50);}
 function generalNow(s){const box=element('div','signal general-now');box.dataset.tone='context';
  box.append(element('strong','signal-title','☾ Місяць у '+M.nakNames[s.moon.nak]+(s.moon.pada?' · пада '+s.moon.pada:'')),element('p','',tithiName(s.tithi)+' · місячний день '+s.tithi.inPaksha+' з 15'));
  if(mode==='personal'&&!hasBirth()){const cta=element('button','birth-cta','Додати дату народження — побачити свій ритм →');cta.type='button';cta.onclick=openBirth;box.append(element('small','','Зараз показано небо для всіх. З датою народження з’явиться Тара — твій особистий місячний ритм.'),cta);}
  return box;}
 function scoped(){return ['study','talk','travel'].includes(activity);}
 function options(){return {direction:$('#travel-direction').value};}
 function report(s){return F.evaluate(factorSegment(s),activity,options());}
 function brief(s){return F.summary(report(s));}
 function reasonText(r){const short={nak:'Накшатра',tithi:'Місячний день',travel_tara:'Тара',travel_daylord:'Планета дня',direction:'Напрямок',study_lagna:'Доми та стан планет'};const words={not_listed:'поза переліком',caution:'застереження',unresolved:'суперечність правил',missing:'немає даних',ambiguous:'залежить від народження',not_computed:'повне правило не застосовано',long_duration:'окреме трактування тривалості',middle:'середня група',school_variant:'варіант школи'};return (short[r.id]||r.label)+' — '+(words[r.state]||r.state);}
 function briefCard(value){const box=element('div','signal activity-summary');box.dataset.state=value.state;box.dataset.tone=(value.state==='caution'||value.state==='conflict_caution')?'caution':'context';box.append(element('strong','signal-title',value.symbol+' '+value.title));if(value.reasons.length)box.append(element('p','small',value.reasons.map(reasonText).join('; ')));box.append(element('small','','Це підсумок перевірених умов, не повний прогноз справи.'));return box;}
 function showElection(){
  const host=$('#election-detail');if(!scoped()){host.replaceChildren();return;}
  const chart=PersonalDaylineElection.calculate(selected,model.place),d=host.firstElementChild||element('details');d.dataset.electionInstant=selected;
  if(!d.firstElementChild)d.append(element('summary','','Карта моменту · дослідні домові умови'));
  while(d.children.length>1)d.lastElementChild.remove();
  d.append(element('p','small','На '+clock(selected)+' у вибраному місці. Один знак = один дім — дослідна конвенція; її застосування до цього правила ще не затверджено. Це не натальна карта і не висновок на всі 3 години.'));
  if(chart.status!=='candidate'){d.append(element('p','','Для цієї геометрії висхідну точку не визначено.'));if(d.parentNode!==host)host.append(d);return;}
  const names={Sun:'☉ Сонце',Moon:'☾ Місяць',Mercury:'☿ Меркурій',Venus:'♀ Венера',Mars:'♂ Марс',Jupiter:'♃ Юпітер',Saturn:'♄ Сатурн'};
  d.append(element('p','','Висхідний знак: '+signNames[chart.ascendant.rashi]+'.'));
  const list=element('ul','house-list');for(const p of chart.bodies){const li=element('li','',names[p.body]+' · дім '+p.house);li.dataset.body=p.body;li.dataset.house=p.house;list.append(li);}d.append(list);
  if(activity==='study'){
   d.append(element('p','small','У восьмому домі серед семи класичних світил: '+(chart.study.eighthHouse.map(b=>names[b]).join(', ')||'немає')+'.'));
   d.append(element('p','small','Юпітер / Венера у кендрах або триконах: '+(chart.study.beneficsAngularOrTrinal.map(b=>names[b]).join(', ')||'немає')+'. Місяць і Меркурій залишаються умовними; вузли не включені.'));
   const more=element('details');more.append(element('summary','','Інші домові умови коментаря'));
   const bodyNames=xs=>xs.map(b=>names[b]).join(', ')||'немає';
   more.append(element('p','small','Сонце / Марс / Сатурн у домах 3, 6, 10 або 11: '+bodyNames(chart.study.fixedMaleficsInListedHouses)+'.'));
   more.append(element('p','small','Юпітер / Венера у домах 1, 2, 3, 4, 5, 7, 9 або 10: '+bodyNames(chart.study.fixedBeneficsInListedHouses)+'.'));
   more.append(element('p','small','В одинадцятому домі: '+bodyNames(chart.study.eleventhHouse)+'. Це окремі спостереження за коментарем, не підсумкове схвалення моменту.'));d.append(more);
   const sens=chart.study.conventionSensitive||{},labelsCS={eighthHouse:'восьмий дім',beneficsAngularOrTrinal:'Юпітер/Венера в кендрах-триконах',fixedMaleficsInListedHouses:'Сонце/Марс/Сатурн у 3/6/10/11',fixedBeneficsInListedHouses:'Юпітер/Венера у переліку домів',eleventhHouse:'одинадцятий дім'},hit=Object.keys(labelsCS).filter(k=>sens[k]);
   const cs=element('p','small',hit.length?'◈ Залежить від системи домів (цілі знаки / рівні / Шріпаті): '+hit.map(k=>labelsCS[k]).join(', ')+'. Це не похибка, а невирішена конвенція.':'Ці спостереження однакові в цілих знаках, рівних домах і Шріпаті.');cs.dataset.conventionSensitive=String(hit.length>0);d.append(cs);
   const conditional=element('details','conditional-planets');conditional.append(element('summary','','Місяць і Меркурій: що встановлено, а що залежить від правила'));
   conditional.append(element('p','small','Це карта вибраного моменту й місця. Вона однакова з точним часом народження та без нього; натальні доми тут не використовуються.'));
   const evidence=chart.conditionalEvidence;
   if(evidence?.status==='geometry_only'){
    const phase={waxing:'зростає',waning:'спадає',new:'у фазовій межі молодика',full:'у фазовій межі повні'};
    conditional.append(element('p','small','☾ Місяць '+phase[evidence.moon.phase]+'. Фаза сама по собі не визначає сприятливість. Поріг «слабкого Місяця» для цього правила ще не затверджено.'));
    const neighbours=evidence.mercury.relations.filter(p=>p.sameSign).map(p=>names[p.body]);
    conditional.append(element('p','small','☿ Меркурій · в одному знаку: '+(neighbours.join(', ')||'немає інших із семи світил')+'. Це геометрія знаків; вона ще не є підтвердженим визначенням з’єднання для текстового правила.'));
   }
   for(const [key,title] of [['wholeSign','Цілі знаки'],['equal','Рівні доми від Асцендента'],['sripati','Шріпаті']]){
    const section=element('div','conditional-house-system');section.dataset.system=key;section.append(element('h4','',title));
    for(const v of chart.study.conditionalByConvention[key]){
     const parts=[names[v.body]+' · дім '+v.house];
     if(v.eighthExclusion)parts.push('застереження восьмого дому діє в наведеному приписі незалежно від класифікації планети');
     if(v.eleventhListed)parts.push('одинадцятий дім входить до окремого переліку для всіх планет');
     if(v.ifBeneficInListedHouses)parts.push('якщо планету класифікувати як сприятливу — цей дім у відповідному переліку');
     if(v.ifMaleficInListedHouses)parts.push('якщо як несприятливу — цей дім у переліку 3/6/10/11');
     if(v.moonLagnaCautionCandidate)parts.push('окремий загальний припис застерігає щодо Місяця в лагні; виняток частини авторів і пріоритет не затверджені');
     if(parts.length===1)parts.push('ці окремі переліки не дають висновку');
     const p=element('p','small',parts.join('. ')+'.');p.dataset.conditionalBody=v.body;section.append(p);
    }conditional.append(section);
   }
   conditional.append(element('p','small','«Якщо» означає умовну перевірку, а не прийняту класифікацію. Збіг одного переліку не скасовує інших застережень. Місяць і Меркурій поки не додаються до списку незмінно сприятливих планет.'));
   conditional.append(element('p','small','Оцінку за початком півмісяця не вмикаємо автоматично: у коментарі вона обмежена необхідністю виконати справу, а не відсутністю даних.'));
   for(const [title,url] of [['Класифікація й Місяць у лагні · MC 1.32, с.24','https://jainqq.org/pagetext/Muhurt_Chintamani/002342/40'],['Умови Місяця · MC 4.7–8, с.150–151','https://jainqq.org/pagetext/Muhurt_Chintamani/002342/166'],['Домові переліки навчання · MC 5.38, с.198','https://jainqq.org/pagetext/Muhurt_Chintamani/002342/214']]){const p=element('p','small'),a=element('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);conditional.append(p);}
   d.append(conditional);
  }
  d.append(element('p','small','Джерело умов: Muhūrtacintāmaṇi 5.38 — вірш (кендри/трикони, с.101) і коментар (с.198). Геометрія розрахована; повнота норми й фізична похибка не встановлені. До підсумку й бала ці кандидати не додаються.'));if(d.parentNode!==host)host.append(d);
 }
 function factorSegment(segment){return mode==='general'?{...segment,tara:{variants:[]},travelSky:{...segment.travelSky,natalRashis:[],natalStates:[]}}:segment;}
 function factorCard(report,open=false){
  const box=element('div','factor-card');if(report.status==='not_defined')return box;
  const title={study:'Початок навчання',talk:'Дружні справи',travel:'Поїздка'}[report.activity];
  box.append(element('h3','',title+' · складові правила'),element('p','small',report.scope));
  const labels={not_computed:['…','Ще не розраховано'],neutral:['○','Середній рівень у джерелі'],long_duration:['△','У джерелі пов’язано з тривалою поїздкою'],listed:['✓','У переліку'],not_listed:['○','Поза цим переліком'],middle:['○','Середня група за Васиштхою'],school_variant:['◈','Лише в одній школі читання'],caution:['△','Є застереження'],not_flagged:['—','Це застереження не спрацьовує'],missing:['?','Бракує даних'],ambiguous:['◈','Залежить від часу народження'],unresolved:['◈','Правила потребують узгодження']};
  const list=element('ul','factor-list');
  for(const f of report.factors){const li=element('li'),[glyph,label]=labels[f.state];li.dataset.state=f.state;
   let value='';if(f.id==='nak'&&Number.isInteger(f.value))value=' · '+M.nakNames[f.value];
   if(f.id==='weekday'&&Number.isInteger(f.value))value=' · '+['неділя','понеділок','вівторок','середа','четвер','п’ятниця','субота'][f.value];
   if(f.id==='tithi'&&Number.isInteger(f.value))value=' · '+f.value;
   if(f.id==='direction')value=' · '+f.value;
   if(f.id==='travel_sun'&&Number.isInteger(f.value))value=' · '+['Овен','Телець','Близнюки','Рак','Лев','Діва','Терези','Скорпіон','Стрілець','Козоріг','Водолій','Риби'][f.value];
   if(f.id==='travel_daylord'&&f.value.body){const names={Sun:'Сонце',Moon:'Місяць',Mars:'Марс',Mercury:'Меркурій',Jupiter:'Юпітер',Venus:'Венера',Saturn:'Сатурн'};value=' · '+names[f.value.body]+(f.value.positions.length?' · позиція від натального Місяця: '+[...new Set(f.value.positions)].join(' або '):'');} 
   li.append(element('strong','',glyph+' '+f.label+value),element('span','',label));
   if(f.id==='travel_tara'){
    const d=element('details','tara-readings');d.append(element('summary','','Чому два правила можуть відрізнятися'));
    const readings={caution:'є застереження',released:'застереження зняте в межах загального правила',context:'Джанма — окремий контекст',support:'підтримувальна група в загальному правилі',unknown:'даних для винятку недостатньо'};
    if(!f.value.length)d.append(element('p','small','Без натальної накшатри персональні правила Тари не порівнюємо. Час народження не підставляємо.'));
    if(f.value.length>1)d.append(element('p','small','Це альтернативи через невідомий час народження, не ймовірності й не усереднений висновок.'));
    for(const v of f.value){
     const valid=Number.isInteger(v.group)&&v.group>=1&&v.group<=9;
     d.append(element('p','small',(M.nakNames[v.natal]||'Натальна накшатра не визначена')+' · група '+(valid?v.group:'не визначена')+' · цикл '+(v.cycle||'не визначений')));
     d.append(element('p','small','Загальна Тара Бала (MC 4.11–13): '+(readings[v.general]||'немає підтвердженого результату')+'.'));
     d.append(element('p','small','Припис поїздки (MC 11.8): '+(!valid?'бракує даних':[1,3,5,7].includes(v.group)?'ця група має застереження':'ця група не входить до наведених чотирьох застережень')+'.'));
    }
    d.append(element('p','small','Прямого правила, яке встановлює пріоритет цих двох приписів, поки не підтверджено. Загальний виняток не перетворюємо на дозвіл для поїздки. Інші застереження залишаються окремими.'));
    for(const [text,url] of [['Загальне правило · друк. с. 84','https://jainqq.org/pagetext/Muhurt_Chintamani_Satik/034207/104'],['Поїздка · друк. с. 166','https://jainqq.org/pagetext/Muhurt_Chintamani_Satik/034207/186']]){const p=element('p','small'),a=element('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);d.append(p);}
    li.append(d);
   }
   list.append(li);
  }box.append(list);
  if(report.decision){const names={uncomputed_conditions:'Частину умов ще не розраховано',conflicting:'Є неузгоджені правила',missing_data:'Бракує даних для частини умов',birth_sensitive:'Висновок залежить від часу народження',partial:'Розраховані окремі умови'};const note=element('p','small',names[report.decision.status]+'. Повний добір часу ще не визначено.');note.dataset.decision=report.decision.status;box.append(note);} 
  if(report.comparison){const c=report.comparison,p=element('p','small');p.dataset.comparison=c.state;p.textContent='Окрема звірка · Чандра Бала (Раман): '+(c.positions.length?'Позиція Місяця від натального: '+[...new Set(c.positions)].join(' або ')+'. ':'')+labels[c.state][1]+'. До умов Muhūrtacintāmaṇi й бала не додається.';box.append(p);}
  if(report.natalVariants?.length>1){const d=element('details');d.dataset.natalPairs='true';d.append(element('summary','','Можливі натальні варіанти · '+report.natalVariants.length),element('p','small','Кожна пара відповідає можливому часу народження. Несумісні поєднання відкинуто.'));
   for(const v of report.natalVariants){const row=element('p','small',M.nakNames[v.natalNak]+' · '+signNames[v.natalRashi]);row.dataset.natalPair=v.natalNak+':'+v.natalRashi;for(const f of v.factors)row.append(element('span','', ' / '+f.label+': '+labels[f.state][1]));d.append(row);}box.append(d);}
  const detail=element('details');detail.open=open;detail.append(element('summary','','Межі висновку й джерела'));
  for(const note of report.unresolved)detail.append(element('p','small',note));
  detail.append(element('p','small','Збіг окремих умов не означає сприятливості всієї справи. Числовий бал не обчислюється.'));
  const sources=[...new Set(report.factors.map(f=>f.source))];detail.append(element('p','small',sources.join(' · ')));box.append(detail);return box;
 }
 function showBirth(){
  const b=model.birth,summary=$('#birth-summary'),evidence=$('#birth-evidence');evidence.replaceChildren();
  if(!b.candidates.length){summary.textContent=b.error||'Натальний профіль не задано. Показуємо доступну частину розкладу.';return;}
  summary.textContent=b.candidates.length===1?'Натальний Місяць: '+M.nakNames[b.candidates[0]]+'. '+(b.mode==='unknown'?'Ця накшатра однакова протягом усієї можливої доби народження.':'За введеним часом народження.'):
   'Без однозначного часу можливі '+b.candidates.length+' накшатри: '+b.candidates.map(n=>M.nakNames[n]).join(', ')+'. Полудень не підставляємо.';
  if(b.jointCandidates?.length)evidence.append(element('p','small','Сумісні пари накшатри й знака: '+b.jointCandidates.map(v=>M.nakNames[v.nak]+' · '+signNames[v.rashi]).join('; ')+'.'));
  if(b.instantAmbiguous)evidence.append(element('p','','Вказана година повторювалася: перевірено обидва UTC-варіанти.'));
  if(b.mode==='known')evidence.append(element('p','','Враховано хвилину записаного часу. Реальна точність часу народження невідома.'));
  const dateFormat=new Intl.DateTimeFormat('uk-UA',{timeZone:b.zone,dateStyle:'short',timeStyle:'short'});
  for(const interval of b.intervals)evidence.append(element('p','small',dateFormat.format(interval.start)+' → '+dateFormat.format(interval.end)+' · '+b.zone));
  for(const ev of b.transitions)evidence.append(element('p','small','Близько '+dateFormat.format(ev.at)+': '+M.nakNames[ev.from.nak]+' → '+M.nakNames[ev.to.nak]));
  evidence.append(element('p','small','Точні хвилини переходів залежать від астрономічної конвенції; фізична похибка ще не оцінена.'));
 }
 function showSelected(){
  const win=model.windows.find(w=>w.start<=selected&&selected<w.end),s=win?.segments.find(s=>s.start<=selected&&selected<s.end);if(!s)return;
  const live=Math.abs(selected-Date.now())<60000;
  const shownDate=new Intl.DateTimeFormat('uk-UA',{timeZone:model.place.zone,day:'numeric',month:'long'}).format(selected);
  const shownCity=model.place.label||'Обране місце';
  $('#selected-title').textContent=live?'Зараз на лінії дня':'Обраний момент';$('#selected-clock').textContent=clock(selected)+' · '+shownDate+' · '+shownCity;
  $('#current-tara').replaceChildren();
  if(scoped()){
   $('#current-tara').append(briefCard(brief(s)));
   if(mode==='personal'){const d=element('details');d.append(element('summary','','Тара окремо'),signal(s.tara));$('#current-tara').append(d);}
  }else $('#current-tara').append(mode==='personal'&&hasBirth()?signal(s.tara):generalNow(s));
  if(mode==='personal'&&hasBirth())$('#current-tara').append(element('p','sky-now-line','☾ Місяць у '+M.nakNames[s.moon.nak]+' · '+tithiName(s.tithi)));
  showElection();
  $('#current-factors').replaceChildren(factorCard(F.evaluate(factorSegment(s),activity,{direction:$('#travel-direction').value}),true));
  $('#current-hora').textContent=s.hora?s.hora.glyph+' '+s.hora.planet+' · сезонна планетна година до '+clock(s.hora.end):'Планетні години недоступні за місцевим сходом і заходом. Тара від цього не вимикається.';
  const future=model.windows.flatMap(w=>w.segments).find(t=>t.start>selected&&(scoped()?JSON.stringify(brief(t))!==JSON.stringify(brief(s)):key(t.tara)!==key(s.tara)));
  $('#next-change').textContent=scoped()?(future?'Наступна зміна умов справи · '+clock(future.start):'До кінця доби підсумок цих умов не змінюється.'):mode==='personal'&&model.birth.candidates.length?(future?'Наступна зміна Тари · '+clock(future.start):'До кінця цієї доби трактування Тари не змінюється.'):(()=>{const n=model.windows.flatMap(blockChanges).find(c=>c.at>selected);return n?'Далі · '+clock(n.at)+' · '+n.text:'До кінця доби календарних переходів немає.';})();
  const at=Astronomy.MakeTime(new Date(selected)),observer=new Astronomy.Observer(model.place.lat,model.place.lon,0),eq=Astronomy.Equator('Sun',at,observer,true,true),hor=Astronomy.Horizon(at,observer,eq.ra,eq.dec,'normal');
  $('#sun-glyph').dataset.night=String(hor.altitude<0);$('#sun-status').textContent=hor.altitude>=0?'Сонце над горизонтом':'Сонце під горизонтом';$('#sun-detail').textContent='Для цього ж моменту й місця · '+Math.abs(hor.altitude).toFixed(0)+'° '+(hor.altitude>=0?'над':'під')+' горизонтом';
  for(const row of $('#windows').children)row.dataset.selected=String(Number(row.dataset.start)<=selected&&selected<Number(row.dataset.end));
  for(const b of $('#day-blocks').children)b.setAttribute('aria-pressed',String(Number(b.dataset.start)<=selected&&selected<Number(b.dataset.end)));
  PersonalDaylineScene.update(model,selected);
 }
 function selectMoment(t){selected=t;showSelected();}
 function overview(){
  const blocks=$('#day-blocks'),phases=$('#day-phases');blocks.replaceChildren();phases.replaceChildren();
  for(const w of model.windows){const b=element('button');b.type='button';b.dataset.start=w.start;b.dataset.end=w.end;
   const bs=scoped()?F.summaryIntervals({segments:w.segments.map(factorSegment)},activity,options()):null,tones=bs?bs.map(p=>p.summary.state):[...new Set(w.segments.map(s=>s.tara.interpretation))],d=bs?bs[0].summary:A.describe(w.segments[0].tara,activity);
   const generalOnly=!scoped()&&(mode==='general'||!hasBirth()),ch=blockChanges(w);
   b.append(element('span','',clock(w.start)),element('strong','',generalOnly?'☾':tones.length>1?'⇄':d.symbol));
   const mark=element('small','block-change',ch.length?ch.map(c=>c.glyph+'\u202f'+clock(c.at)).join(' '):'·');b.append(mark);if(ch.length)b.dataset.changes=String(ch.length);
   b.setAttribute('aria-label',range(w.start,w.end)+' · '+(generalOnly?'Календар':tones.length>1?'Умови змінюються всередині блоку':d.title)+(ch.length?' · '+ch.map(c=>c.text+' о '+clock(c.at)).join('; '):' · без календарних переходів'));
   b.onclick=()=>{PersonalDaylineScene.stop();selectMoment(w.start);};blocks.append(b);
  }
  if(scoped()){
   for(const p of F.summaryIntervals({segments:model.windows.flatMap(w=>w.segments).map(factorSegment)},activity,options())){const li=element('li');li.dataset.state=p.summary.state;li.append(element('time','',range(p.start,p.end)),element('strong','',p.summary.symbol+' '+p.summary.title));if(p.summary.reasons.length)li.append(element('span','small',p.summary.reasons.map(reasonText).join('; ')));phases.append(li);}return;
  }
  if(mode==='general'){phases.append(element('li','','Загальний режим: персональну Тару приховано. Нижче — календар і планетні години.'));return;}
  for(const phase of A.phases(model)){const d=A.describe(phase.tara,activity),li=element('li');li.dataset.tone=d.tone;li.append(element('time','',range(phase.start,phase.end)),element('strong','',d.symbol+' '+d.title));phases.append(li);}
 }
 function showActivity(){const d=A.describe(null,activity);$('#activity-label').textContent='Справа: '+A.activities[activity].name+' · змінити';$('#activity-tip').textContent='Для плану · '+d.tip;let note=$('#activity-limit');if(!note){note=element('p','small');note.id='activity-limit';$('#activity-tip').after(note);}note.textContent='Тара показана окремо. Для навчання, дружніх справ і поїздки нижче розраховано додаткові складові; повний висновок про придатність часу ще не визначено.';$('#travel-direction-row').hidden=activity!=='travel';$('#activity-scope').textContent=d.scope;$('#activity-source').replaceChildren(element('span','',d.reference));for(const source of d.sources){const link=element('a','',source.label);link.href=source.url;link.target='_blank';link.rel='noreferrer';$('#activity-source').append(document.createTextNode(' · '),link);}for(const b of $('#activities').children)b.setAttribute('aria-pressed',String(b.dataset.activity===activity));}
 function showCoverage(){
  const c=PersonalDaylineSnapshot.coverage(activity),host=$('#calculation-coverage');host.replaceChildren();
  host.append(element('p','','Для обраної справи: '+c.calculated.join('; ')+'.'));
  const d=element('details');d.append(element('summary','','Що ще обмежує висновок'));
  for(const line of c.open)d.append(element('p','small',line));
  // CL-07: the hora model uses place.height||0; say so instead of silently assuming sea level.
  if(!Number.isFinite(model?.place?.height))d.append(element('p','small','Висота місця не задана: схід і захід Сонця (а отже планетні години) пораховано для рівня моря. Для гір межі годин можуть зсунутися на десятки секунд.'));
  d.append(element('p','small',c.regionalScope.note));const a=element('a','',c.regionalScope.source);a.href=c.regionalScope.url;a.target='_blank';a.rel='noreferrer';d.append(a);host.append(d);
  $('#snapshot-privacy').textContent=mode==='personal'?'Файл містить натальні варіанти та можливі інтервали народження. Зберігай його приватно. Завантаження відбувається лише на цьому пристрої.':'Загальний режим: файл не містить натальних варіантів та інтервалів народження.';
 }
 function renderWindows(){
  const list=$('#windows');list.replaceChildren();$('#window-count').textContent=model.windows.length+' блоків';
  $('#day-note').textContent='По 3 фактичні години від місцевої півночі. Деталі кожного блоку доступні за натисканням. Час переходів показано до хвилини.'+(model.day.durationMinutes!==1440?' Цього дня '+model.day.durationMinutes/60+' годин через переведення годинника; UTC-зсуви в підписах різні, останній блок коротший.':'');
  for(const w of model.windows){const row=element('li','window');row.dataset.start=w.start;row.dataset.end=w.end;
   const head=element('div','window-head'),title=element('div');title.append(element('h3','',range(w.start,w.end)),element('small','',Math.round((w.end-w.start)/60000)+' хвилин'));
   const choose=element('button','select-window','Переглянути');choose.type='button';choose.setAttribute('aria-label','Переглянути момент '+clock(w.start));choose.onclick=()=>{PersonalDaylineScene.stop();selected=w.start;showSelected();$('#selected').scrollIntoView({behavior:'instant',block:'start'});$('#selected').tabIndex=-1;$('#selected').focus({preventScroll:true});};head.append(title,choose);row.append(head);
   if(scoped()){
    for(const part of F.summaryIntervals({segments:w.segments.map(factorSegment)},activity,options())){row.append(element('span','tara-range',range(part.start,part.end)),briefCard(part.summary));}
   }else if(mode==='personal'){
    const merged=[];for(const s of w.segments){const prev=merged.at(-1);if(prev&&key(prev.tara)===key(s.tara))prev.end=s.end;else merged.push({start:s.start,end:s.end,tara:s.tara});}
    for(const seg of merged){const block=element('div');if(merged.length>1)block.append(element('span','tara-range',range(seg.start,seg.end)));block.append(signal(seg.tara));row.append(block);}
   }else row.append(element('p','','☾ '+M.nakNames[w.segments[0].moon.nak]+' на початку блоку.'));
   if(['study','talk','travel'].includes(activity)){
    const detail=element('details','activity-factors'),parts=F.intervals({segments:w.segments.map(factorSegment)},activity,{direction:$('#travel-direction').value});
    detail.append(element('summary','','Складові для справи · '+A.countLabel(parts.length)));
    for(const part of parts){detail.append(element('p','factor-time',range(part.start,part.end)),factorCard(part.report));}row.append(detail);
   }
   const hours=model.hours.filter(h=>h.end>w.start&&h.start<w.end),d=element('details','hours-details'),ul=element('ul','hora-list');d.append(element('summary','',hours.length?'Сезонні планетні години · '+A.countLabel(hours.length):'Планетні години недоступні'));
   if(!hours.length)d.append(element('p','small','Немає потрібної послідовності сходу й заходу. Умовні 06:00 не підставляємо.'));
   for(const h of hours){const li=element('li');li.append(element('time','',range(Math.max(w.start,h.start),Math.min(w.end,h.end))),element('strong','',h.glyph+' '+h.planet));ul.append(li);}d.append(ul,element('p','small','Профіль 12+12: день і ніч ділимо окремо. Це окрема традиція годин; правила kālahorā з Muhūrtacintāmaṇi до неї автоматично не переносимо.'));row.append(d);
   const events=model.series.events.filter(e=>e.at>=w.start&&e.at<w.end);
   if(events.length){const details=element('details'),items=element('ul','event-list');details.append(element('summary','','Що змінюється · '+events.length));for(const e of events)items.append(element('li','',clock(e.at)+' · '+(e.from.nak!==e.to.nak?M.nakNames[e.from.nak]+' → '+M.nakNames[e.to.nak]:'Чверть '+M.nakNames[e.to.nak]+': '+e.from.pada+' → '+e.to.pada)));details.append(items);row.append(details);}
   // Progressive disclosure: keep ALL original ranges, factors and sources in the
   // DOM, but show one truthful preview per block instead of eight long cards.
   const details=element('details','window-extra'),contained=[...row.children].slice(1);
   details.append(element('summary','','Усі проміжки, складові та години'));for(const item of contained)details.append(item);
   let preview;
   if(scoped()){
    const portions=F.summaryIntervals({segments:w.segments.map(factorSegment)},activity,options());
    preview=portions.length===1?portions[0].summary.symbol+' '+portions[0].summary.title:'◐ Усередині блоку '+portions.length+' різні стани умов';
   }else if(mode==='personal'){
    const interpretations=[...new Set(w.segments.map(s=>s.tara.interpretation))];
    preview=interpretations.length===1?A.describe(w.segments[0].tara,activity).title:'◐ Тара змінюється всередині блоку';
   }else preview='Календар Місяця і планетні години';
   row.append(element('p','window-brief',preview),details);
   list.append(row);
  }overview();showActivity();showCoverage();showSelected();
 }
 async function calculate(event){
  event?.preventDefault();if(!$('#controls').checkValidity()){$('#setup').open=true;$('#coordinates').open=true;$('#controls').reportValidity();return;}const token=++revision;
  PersonalDaylineScene.stop();
  $('#calculate').disabled=true;$('#error').hidden=true;$('#progress').textContent='Рахую місцеві межі та всі переходи…';$('#result').hidden=true;
  await new Promise(r=>setTimeout(r,30));
  try{
   const place={lat:Number($('#lat').value),lon:Number($('#lon').value),zone:$('#zone').value.trim(),label:$('#place').value==='custom'?'Обране місце':$('#place').selectedOptions[0].textContent};
   if(!$('#lat').value.trim()||!$('#lon').value.trim())throw Error('Укажіть координати місця.');
   const birth={date:$('#birth-date').value,time:$('#birth-time').value,zone:$('#birth-zone').value.trim(),mode:$('#birth-mode').value,from:$('#birth-from').value,to:$('#birth-to').value};
   const built=M.build({date:$('#date').value,place,birth});if(token!==revision)return;model=built;
   selected=Date.now()>=model.day.start&&Date.now()<model.day.end?Date.now():model.day.start;
   $('#birth-short').textContent=birth.date?(birth.mode==='unknown'?'час невідомий':birth.mode==='range'?'час у проміжку':'час указано'):'не задані';
   $('#setup-label').textContent=new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',timeZone:model.place.zone}).format(new Date(model.day.start))+' · '+model.place.label+' · '+(model.birth.candidates.length?'натальні дані задані':'без натальних даних');showBirth();renderWindows();$('#result').hidden=false;
   // After an explicit submit the form has done its job: fold it and bring the day into view (Claude 13.11).
   if(event?.type==='submit'){$('#setup').open=false;$('.day-overview')?.scrollIntoView({block:'start'});rememberBirth();}$('#progress').textContent='Розклад обчислено локально. Денний бал не змінюється.';
  }catch(e){$('#setup').open=true;$('#error').textContent=e.message;$('#error').hidden=false;$('#progress').textContent='Розрахунок не завершено.';}
  finally{if(token===revision)$('#calculate').disabled=false;}
 }
 $('#controls').addEventListener('submit',calculate);
 $('#travel-direction').onchange=()=>{if(model)renderWindows();};
 for(const [id,a] of Object.entries(A.activities)){const b=element('button','',a.glyph+' '+a.name);b.type='button';b.dataset.activity=id;b.onclick=()=>{activity=id;if(model)renderWindows();};$('#activities').append(b);}
 PersonalDaylineScene.mount($('#selected'),selectMoment);
 $('#place').onchange=()=>{const c=cities[$('#place').value];if(c){$('#lat').value=c[0];$('#lon').value=c[1];$('#zone').value=c[2];}else $('#coordinates').open=true;};$('#place').onchange();
 $('#birth-mode').onchange=()=>{$('#known-time').hidden=$('#birth-mode').value!=='known';$('#birth-range').hidden=$('#birth-mode').value!=='range';};
 for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{mode=button.dataset.mode;for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));if(model)renderWindows();};
 $('#now').onclick=()=>{PersonalDaylineScene.stop();if(model){if(Date.now()>=model.day.start&&Date.now()<model.day.end){selected=Date.now();showSelected();}else{$('#date').value=M.parts(Date.now(),model.place.zone).date;calculate();}}};
 $('#save-snapshot').onclick=()=>{
  if(!model)return;PersonalDaylineScene.stop();
  const snapshot=PersonalDaylineSnapshot.create(model,{activity,mode,direction:$('#travel-direction').value||null,instant:selected});
  const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json;charset=utf-8'}));
  const a=element('a');a.href=url;a.download='SkyRhythm_dayline_'+model.date+'_'+activity+'_'+mode+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);$('#snapshot-status').textContent='Файл розрахунку передано браузеру для збереження.';
 };
 $('#date').value=M.parts(Date.now(),'Europe/Kyiv').date;
 // FP571 (owner-approved): opt-in local memory of birth data. Default off; nothing leaves the browser.
 const BIRTH_KEY='sr_personal_birth_v1',BIRTH_FIELDS=['date','time','zone','mode','from','to'];
 function storedBirth(){try{const v=JSON.parse(localStorage.getItem(BIRTH_KEY)||'null');return v&&typeof v==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(v.date||'')?v:null;}catch{return null;}}
 function rememberBirth(){
  const status=$('#remember-status');
  try{
   if($('#remember-birth').checked&&$('#birth-date').value){
    const birth=Object.fromEntries(BIRTH_FIELDS.map(key=>[key,$('#birth-'+key).value]));
    if(birth.mode!=='known')birth.time='';
    if(birth.mode!=='range')birth.from=birth.to='';
    localStorage.setItem(BIRTH_KEY,JSON.stringify(birth));
    $('#forget-birth').hidden=false;
    status.textContent='Збережено лише в цьому браузері.';
    return;
   }
   if(localStorage.getItem(BIRTH_KEY)!==null)localStorage.removeItem(BIRTH_KEY);
   $('#forget-birth').hidden=true;
   status.textContent='';
  }catch{status.textContent='Не вдалося оновити збережені дані в цьому браузері.';}
 }
 $('#forget-birth').onclick=()=>{
  try{localStorage.removeItem(BIRTH_KEY);}
  catch{$('#remember-status').textContent='Не вдалося видалити збережені дані в цьому браузері.';return;}
  $('#remember-birth').checked=false;
  $('#forget-birth').hidden=true;
  for(const key of BIRTH_FIELDS)if(key!=='mode'&&key!=='zone')$('#birth-'+key).value='';
  $('#remember-status').textContent='Дані народження забуто на цьому пристрої.';
  calculate();
 };
 {const saved=storedBirth();if(saved){for(const k of BIRTH_FIELDS)if(saved[k]!=null&&$('#birth-'+k))$('#birth-'+k).value=saved[k];$('#remember-birth').checked=true;$('#forget-birth').hidden=false;$('#birth-mode').onchange?.();}}
 // In-memory result for deterministic local QA, no persistence or outbound access.
 window.PersonalDaylinePreview=Object.freeze({getModel:()=>model,getSelected:()=>selected,select:t=>{if(!model||t<model.day.start||t>=model.day.end)throw Error('Outside day');PersonalDaylineScene.stop();selectMoment(t);}});
 calculate();
})();
