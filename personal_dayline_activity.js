/* Context for planning, not a new election algorithm or consumer score. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PersonalDaylineActivity=api;})(globalThis,function(){'use strict';
 const activities=Object.freeze({
  overview:{name:'Огляд',glyph:'◷',tip:'Обери одну справу, яку хочеш запланувати.',scope:'Тара описує співвідношення накшатр. Вона не замінює повний добір часу для конкретної справи.',reference:'Muhūrtacintāmaṇi 4.11–13'},
  work:{name:'Робота',glyph:'▣',tip:'Визнач один результат цього блоку: підготувати, виконати або перевірити.',scope:'Повсякденну роботу не прирівнюємо до коронації, відкриття торгівлі чи іншої окремої події. Правило для твоєї робочої задачі ще не визначене.',reference:'Загальна Тара: Muhūrtacintāmaṇi 4.11–13; окрема норма для робочої задачі — не встановлена'},
  study:{name:'Навчання',glyph:'▤',tip:'Обери одну тему й залиш час, щоб перевірити, що вдалося засвоїти.',scope:'Скан розрізняє перше навчання письма (5.37) й початок навчання (5.38). Потрібні не лише Тара, а й накшатра, тітхі, день та положення планет. Це ще не розклад для будь-якого щоденного заняття.',reference:'Muhūrtacintāmaṇi 5.37–38; друковані с. 101–102, кадри 121–122. Уривки звірено зі сканом; повне правило не застосовано.',pages:[121,122]},
  talk:{name:'Розмова',glyph:'☏',tip:'Сформулюй, що хочеш обговорити, і домовся про зручний для обох час.',scope:'На скані 2.7 названо дружні справи поряд із музикою, грою й убранням. Це не загальне правило переговорів чи вирішення конфлікту. Тара тут — окремий контекст, без оцінки успіху спілкування.',reference:'Muhūrtacintāmaṇi 2.7; друкована с. 28, кадр 48. Уривок звірено зі сканом; застосовність до переговорів не встановлена.',pages:[48]},
  travel:{name:'Поїздка',glyph:'➜',tip:'Звір маршрут, розклад, запас часу й актуальні умови поїздки.',scope:'Коментар розрізняє звичайну поїздку й військовий похід. Для подорожей окремо застерігає щодо Тар 1/3/5/7 та додає інші умови. Це ще треба узгодити із загальними винятками Тари; напис «застереження знято» не є дозволом на поїздку.',reference:'Muhūrtacintāmaṇi, вступ до 11 та 11.8–10; друковані с. 163, 165–167, кадри 183, 185–187. Розраховано окремі складові, не повний добір часу.',pages:[183,185,186,187]},
  rest:{name:'Відпочинок',glyph:'☾',tip:'Залиши паузу без обов’язкових справ у час, коли вона тобі потрібна.',scope:'У перевірених фрагментах немає окремого правила для повсякденного відпочинку. Традиційна позначка не є причиною відмовляти собі у відпочинку.',reference:'Окрема календарна норма не встановлена'}
 });
 const labels={support:['✧','Тара підтримує'],caution:['△','Застереження Тари'],released:['◇','Застереження 3/5/7 не діє'],context:['◎','Джанма-тара · залежить від справи'],ambiguous:['◈','Час народження змінює висновок'],missing:['○','Немає персонального висновку'],unknown:['○','Потрібне уточнення']};
 function describe(tara,id='overview'){
  if(!Object.hasOwn(activities,id))throw Error('Невідома справа');
  const a=activities[id],t=labels[tara?.interpretation]||labels.unknown;
  return {activity:id,name:a.name,glyph:a.glyph,title:t[1],symbol:t[0],tone:tara?.interpretation||'missing',scope:a.scope,reference:a.reference,sources:(a.pages||[]).map(page=>({label:'Скан '+page,url:'https://jainqq.org/pagetext/Muhurt_Chintamani_Satik/034207/'+page})),tip:a.tip,tipKind:'editorial_planning',applicability:'partial_not_full_election',score:null};
 }
 // A change of hour/pada is not a change of the personalized conclusion unless
 // the rule result changes. Retain lunar identity/cycle for a truthful overview.
 function signature(tara){return JSON.stringify([tara.interpretation,!!tara.common,tara.variants.map(v=>[v.natal,v.current,v.group,v.cycle,v.interpretation])]);}
 function phases(model){const result=[];for(const s of model.windows.flatMap(w=>w.segments)){const last=result.at(-1);if(last&&signature(last.tara)===signature(s.tara))last.end=s.end;else result.push({start:s.start,end:s.end,tara:s.tara});}return result;}
 function countLabel(n){const a=n%100,b=n%10;return n+' '+(a>=11&&a<=14?'відрізків':b===1?'відрізок':b>=2&&b<=4?'відрізки':'відрізків');}
 return Object.freeze({activities,describe,phases,signature,countLabel});
});
