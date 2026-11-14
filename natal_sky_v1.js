/* SkyRhythm · «Для тебе»: транзити від натального Місяця (Чандра-лагна). Дані народження — лише на пристрої
   (той самий слот personalData_N, що й у старому особистому розрахунку). Позиції дня — з consumer_cloud/sky.json
   (12:00 за Києвом). Традиційні значення, не перевірено; на бал не впливає. Без часу народження знак Місяця
   може бути неоднозначним — тоді це сказано прямо. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const T={
 you:['Для тебе:','For you:','Para ti:','Pour vous :'],
 chandra:['Місяць у 8-му знаку від твого натального — традиційно день обережності','The Moon is in the 8th sign from your natal Moon — traditionally a day for caution','La Luna está en el 8.º signo desde tu Luna natal; tradicionalmente, día de cautela','La Lune est dans le 8e signe depuis votre Lune natale — traditionnellement un jour de prudence'],
 tara:['Тара Бала','Tara Bala','Tara Bala','Tara Bala'],
 sade:['Фаза {p} з 3: Сатурн у {h}-му знаку від натального Місяця','Phase {p} of 3: Saturn in the {h} sign from your natal Moon','Fase {p} de 3: Saturno en el signo {h} desde tu Luna natal','Phase {p} sur 3 : Saturne dans le signe {h} depuis votre Lune natale'],
 dhaiya:['Сатурн у {h}-му знаку від натального Місяця','Saturn in the {h} sign from your natal Moon','Saturno en el signo {h} desde tu Luna natal','Saturne dans le signe {h} depuis votre Lune natale'],
 jup:['Юпітер у {h}-му знаку від натального Місяця','Jupiter in the {h} sign from your natal Moon','Júpiter en el signo {h} desde tu Luna natal','Jupiter dans le signe {h} depuis votre Lune natale'],
 jup_good:[' — сприятливо за традицією',' — favourable by tradition',' — favorable según la tradición',' — favorable selon la tradition'],
 jup_info:['. За цим правилом позиція довідкова.','. This position is shown for reference under this rule.','. Esta posición se muestra como referencia según esta regla.','. Cette position est donnée à titre indicatif selon cette règle.'],
 note:['традиція, не перевірено','tradition, not validated','tradición, no validado','tradition, non validé'],
 uncertainSign:['Знак Місяця неоднозначний для можливого часу народження. Сигнали, що залежать від знака, приховані.','The Moon sign is ambiguous for the possible birth time. Signals that depend on the sign are hidden.','El signo lunar es ambiguo para la posible hora de nacimiento. Se ocultan las señales que dependen del signo.','Le signe lunaire est ambigu pour l’heure de naissance possible. Les signaux qui en dépendent sont masqués.'],
 uncertainNak:['Накшатра народження неоднозначна для можливого часу. Тара Балу не показуємо.','The birth nakshatra is ambiguous for the possible birth time. Tara Bala is hidden.','La nakshatra natal es ambigua para la posible hora. No se muestra Tara Bala.','La nakshatra de naissance est ambiguë pour l’heure possible. Tara Bala est masquée.'],
 invalid:['Не вдалося визначити Місяць при народженні. Перевір дату, час і часовий пояс у профілі.','The birth Moon could not be determined. Check the date, time and time zone in your profile.','No se pudo determinar la Luna natal. Comprueba la fecha, la hora y la zona horaria del perfil.','La Lune natale n’a pas pu être déterminée. Vérifiez la date, l’heure et le fuseau du profil.'],
 add:['Додай дату народження — покажемо транзити саме для тебе. Дані лишаються лише на цьому пристрої.','Add your birth date to see transits for you. The data stays on this device only.','Añade tu fecha de nacimiento para ver tus tránsitos. Los datos se quedan solo en este dispositivo.','Ajoutez votre date de naissance pour voir vos transits. Les données restent sur cet appareil.'],
 addBtn:['Додати дату народження','Add birth date','Añadir fecha de nacimiento','Ajouter la date de naissance'],
 date:['Дата народження','Birth date','Fecha de nacimiento','Date de naissance'],time:['Час (необов’язково)','Time (optional)','Hora (opcional)','Heure (facultatif)'],
 zone:['Часовий пояс місця народження','Time zone of birthplace','Zona horaria del lugar de nacimiento','Fuseau horaire du lieu de naissance'],
 save:['Зберегти на пристрої','Save on this device','Guardar en el dispositivo','Enregistrer sur l’appareil'],
 none:['Особливих транзитів від твого Місяця сьогодні немає.','No notable transits from your Moon today.','Hoy no hay tránsitos destacados desde tu Luna.','Pas de transit notable depuis votre Lune aujourd’hui.']
};
const P={
 basis:['Відлік від Місяця на момент народження. Це трактування Джйотіш без впливу на бал дня.','Counted from the Moon at birth. This Jyotish interpretation does not change the day score.','Se cuenta desde la Luna al nacer. Esta interpretación jyotish no cambia la puntuación del día.','Le point de départ est la Lune à la naissance. Cette lecture du jyotish ne change pas la note du jour.'],
 moon:['Твій знак Місяця','Your Moon sign','Tu signo lunar','Ton signe lunaire'],
 lunar:['Поточний Місяць','Current Moon','Luna actual','Lune actuelle'],
 saturn:['Цикл Сатурна','Saturn cycle','Ciclo de Saturno','Cycle de Saturne'],
 jupiter:['Положення Юпітера','Jupiter placement','Posición de Júpiter','Position de Jupiter'],
 tara:['Порівнюємо сьогоднішню ділянку Місяця з тією, де він був під час народження.','This compares the Moon’s sector for this day with its sector at birth.','Se compara el sector lunar del día con el del nacimiento.','On compare le secteur lunaire du jour à celui de la naissance.'],
 caution:['Обережність за традицією','Caution by tradition','Cautela según la tradición','Prudence selon la tradition'],
 good:['Сприятливо за традицією','Favourable by tradition','Favorable según la tradición','Favorable selon la tradition'],
 info:['Для довідки','For reference','Como referencia','À titre indicatif']
};
const Z=[
 ['Овен','Телець','Близнюки','Рак','Лев','Діва','Терези','Скорпіон','Стрілець','Козоріг','Водолій','Риби'],
 ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
 ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'],
 ['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons']
];
const signGlyph=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const p=k=>P[k][ix()];
const t=k=>T[k][ix()];
const ord=n=>L()==='en'?n+(n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'):L()==='fr'?n+(n===1?'er':'e'):L()==='es'?n+'.º':String(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function slot(){
 try{if(typeof getSlotData==='function'&&typeof _activeSlot!=='undefined'){const d=getSlotData(_activeSlot);if(d?.date)return d}}catch{}
 try{const d=JSON.parse(window.NRStorage?.get('personalData_0','null')||'null');if(d?.date)return d}catch{}
 return null;
}
let lastBirth;
function natal(d){
 const model=window.PersonalDayline;
 if(!model)return null;
 const zone=typeof d.tz==='string'&&d.tz.trim()!=='manual'&&d.tz.trim()?d.tz.trim():undefined;
 const off=d.utcOff===null||d.utcOff===undefined||String(d.utcOff).trim()===''?NaN:Number(d.utcOff);
 if(!zone&&!Number.isFinite(off))return null;
 const key=JSON.stringify([d.date,d.time,zone??off]);
 if(lastBirth?.key===key)return lastBirth.value;
 const e=model.birthEvidence({date:d.date,time:d.time,mode:d.time?'known':'unknown',...(zone?{zone}:{offsetHours:off})});
 const value=e.candidates.length?{
  sign:e.rashiCandidates.length===1?e.rashiCandidates[0]:null,
  nak:e.candidates.length===1?e.candidates[0]:null,
  certain:e.rashiCandidates.length===1,nakCertain:e.candidates.length===1
 }:null;
 lastBirth={key,value};return value;
}
const house=(from,to)=>((to-from)%12+12)%12+1;
const TARA=['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhana','Naidhana','Mitra','Atimitra'],TARA_BAD=[1,3,5,7];
// Use Ukrainian transliteration in Ukrainian and Latin spelling in other locales.
const TARA_UK=['Джанма','Сампат','Віпат','Кшема','Пратьяк','Садхана','Найдхана','Мітра','Атімітра'];
const taraName=i=>(window.NRLocale?.language||'uk')==='uk'?TARA_UK[i]:TARA[i];
function tara(natalIndex,currentIndex){
 const group=((currentIndex-natalIndex)%9+9)%9+1;
 const tone=TARA_BAD.includes(group)?'caution':'good';
 return {name:taraName(group-1),tone,label:p(tone)};
}
function timelineTara(nakshatras){
 const saved=slot();
 if(!saved)return {status:'missing'};
 const n=natal(saved);
 if(!n)return {status:'unavailable'};
 if(!n.nakCertain)return {status:'ambiguous'};
 // The day line uses 1-based nakshatras, while the natal calculation uses 0-based indices.
 return {status:'available',byNakshatra:Object.fromEntries(nakshatras
  .filter(value=>Number.isInteger(value)&&value>=1&&value<=27)
  .map(value=>[value,tara(n.nak,value-1)]))};
}
function lines(ds,sky){
 const d=slot();if(!d)return {missing:true};
 const n=natal(d);if(!n)return {invalid:true};
 const day=sky?.daily?.find(x=>x.date===ds);if(!day)return {missing:false,items:[],certain:n.certain,unavailable:true};
 const g=day.grahas,items=[];
 if(n.nakCertain){
  const relation=tara(n.nak,g.Moon.nakshatra);
  items.push({k:relation.tone,body:'lunar',symbol:'☾',more:'tara',text:relation.name+' · '+p('tara')});
 }
 if(n.certain){
  if(house(n.sign,g.Moon.sign)===8)items.push({k:'caution',body:'lunar',symbol:'☾',more:'chandra',text:t('chandra')});
  const hs=house(n.sign,g.Saturn.sign);
  if([12,1,2].includes(hs))items.push({k:'caution',body:'saturn',symbol:'♄',more:'sade',text:t('sade').replace('{p}',hs===12?1:hs===1?2:3).replace('{h}',ord(hs))});
  else if([4,8].includes(hs))items.push({k:'caution',body:'saturn',symbol:'♄',more:'dhaiya',text:t('dhaiya').replace('{h}',ord(hs))});
  const hj=house(n.sign,g.Jupiter.sign);items.push({k:[2,5,7,9,11].includes(hj)?'good':'info',body:'jupiter',symbol:'♃',more:'jup',text:t('jup').replace('{h}',ord(hj))+([2,5,7,9,11].includes(hj)?t('jup_good'):t('jup_info'))});
 }
 return {missing:false,items,...n};
}
// FP569l (owner: «розписати, і не тільки червоне чи зелене, а й знак»): plain «що це означає» for each line,
// a shape next to the colour (▲ сприятливо · ▼ обережно · ● довідка) and a Moon-sign medallion.
const MORE={
 chandra:['Чандраштама: приблизно раз на 27 днів Місяць 2–3 дні проходить 8-й знак від вашого натального Місяця. Традиція радить у ці дні не починати важливого й не сперечатися.','Chandrashtama: about once every 27 days the Moon spends 2–3 days in the 8th sign from your natal Moon. Tradition advises not to start important things.','Chandrashtama: cada ~27 días la Luna pasa 2–3 días en el 8.º signo desde tu Luna natal. La tradición aconseja no empezar cosas importantes.','Chandrashtama : environ tous les 27 jours, la Lune passe 2–3 jours dans le 8e signe depuis votre Lune natale. La tradition déconseille de commencer l’important.'],
 tara:['Тара Бала: «зірку дня» (накшатру, де зараз Місяць) рахують від вашої зірки народження. 9 видів ідуть по колу: Віпат, Пратьяк, Найдхана і сама Джанма — обережні, решта — сприятливі. Змінюється приблизно щодня.','Tara Bala: the day’s star (the Moon’s nakshatra) is counted from your birth star. Nine kinds repeat: Vipat, Pratyak, Naidhana and Janma itself are cautious, the rest favourable. Changes about daily.','Tara Bala: la estrella del día se cuenta desde tu estrella natal. Nueve tipos se repiten; Vipat, Pratyak, Naidhana y Janma son de cautela.','Tara Bala : l’étoile du jour est comptée depuis votre étoile natale. Neuf types se répètent ; Vipat, Pratyak, Naidhana et Janma appellent à la prudence.'],
 sade:['Саде Саті — близько 7,5 року, поки Сатурн проходить знак перед вашим натальним Місяцем, сам знак і знак після нього (3 фази по ~2,5 року). У традиції — час навантаження й перевірки на міцність, а не прогноз конкретних подій.','Sade Sati: about 7.5 years while Saturn passes the sign before your natal Moon, that sign and the next (three ~2.5-year phases). In the tradition a time of load and testing, not a forecast of events.','Sade Sati: unos 7,5 años mientras Saturno pasa por el signo anterior a tu Luna natal, ese signo y el siguiente. Época de carga, no una predicción de hechos.','Sade Sati : environ 7,5 ans pendant que Saturne traverse le signe précédant votre Lune natale, ce signe et le suivant. Période d’effort, pas une prédiction.'],
 dhaiya:['Дхайя — близько 2,5 року, коли Сатурн у 4-му або 8-му знаку від вашого натального Місяця. У традиції — період зайвих турбот удома чи у справах.','Dhaiya: about 2.5 years with Saturn in the 4th or 8th sign from your natal Moon; traditionally extra worries at home or work.','Dhaiya: unos 2,5 años con Saturno en el 4.º u 8.º signo desde tu Luna natal.','Dhaiya : environ 2,5 ans avec Saturne dans le 4e ou 8e signe depuis votre Lune natale.'],
 jup:['Юпітер проходить один знак приблизно за рік. Положення у 2-му, 5-му, 7-му, 9-му чи 11-му знаку від вашого Місяця традиція вважає сприятливим (гроші, діти й творчість, партнерство, навчання, здобутки).','Jupiter spends about a year in each sign. The 2nd, 5th, 7th, 9th or 11th sign from your Moon is traditionally favourable (money, creativity, partnership, learning, gains).','Júpiter pasa un año por signo. Los signos 2, 5, 7, 9 y 11 desde tu Luna se consideran favorables.','Jupiter passe environ un an par signe. Les signes 2, 5, 7, 9 et 11 depuis votre Lune sont jugés favorables.']};
const MORE_LABEL=['Як це визначають','How it is determined','Cómo se determina','Comment le détermine-t-on'];
const SHAPE={good:'▲',caution:'▼',info:'●'};
const NAK_UK=['Ашвіні','Бгарані','Кріттіка','Рогіні','Мрігашіра','Ардра','Пунарвасу','Пуш’я','Ашлеша','Магха','Пурва Пхалгуні','Уттара Пхалгуні','Хаста','Чітра','Сваті','Вішакха','Анурадха','Джйештха','Мула','Пурва Ашадха','Уттара Ашадха','Шравана','Дганіштха','Шатабгіша','Пурва Бгадрапада','Уттара Бгадрапада','Реваті'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LABEL=['Зірка народження (накшатра)','Birth star (nakshatra)','Estrella natal (nakshatra)','Étoile de naissance (nakshatra)'];
const SIGNAL_TITLE={
 chandra:['Чандраштама','Chandrashtama','Chandrashtama','Chandrashtama'],
 tara:T.tara,
 sade:['Саде Саті','Sade Sati','Sade Sati','Sade Sati'],
 dhaiya:['Дхайя','Dhaiya','Dhaiya','Dhaiya'],
 jup:P.jupiter
};
const SIGNAL_CONTEXT={
 sade:['Тривалий цикл Сатурна: ця фаза не змінюється щодня.','A long Saturn cycle: this phase does not change every day.','Un ciclo largo de Saturno: esta fase no cambia cada día.','Un cycle long de Saturne : cette phase ne change pas chaque jour.'],
 dhaiya:['У традиції цей період пов’язують із додатковими турботами вдома чи у справах.','Tradition associates this period with extra responsibilities at home or work.','La tradición asocia este período con más responsabilidades en casa o en el trabajo.','La tradition associe cette période à davantage de responsabilités à la maison ou au travail.']
};
const MOON_SIGN_NOTE=['Знак, де був Місяць у мить народження. У Джйотіш від нього рахують особисті переходи — як від «точки відліку».','The sign the Moon was in at birth. In Jyotish personal transits are counted from it.','El signo de la Luna al nacer; en Jyotish los tránsitos personales se cuentan desde él.','Le signe de la Lune à la naissance ; en Jyotish, les transits personnels sont comptés depuis lui.'];
function html(ds,sky){
 const r=lines(ds,sky);
 if(r.missing){return `<div class="nr-dv-you is-empty"><p>${esc(t('add'))}</p><details class="nr-dv-you-form"><summary>${esc(t('addBtn'))}</summary><form data-natal-form><label>${esc(t('date'))}<input type="date" name="date" required></label><label>${esc(t('time'))}<input type="time" name="time"></label><label>${esc(t('zone'))}<input type="text" name="tz" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Kyiv')}" autocomplete="off"></label><button type="submit">${esc(t('save'))}</button></form></details></div>`}
 if(r.invalid)return `<div class="nr-dv-you"><p><b>${esc(t('you'))}</b></p><p class="nr-dv-you-warn">${esc(t('invalid'))}</p></div>`;
 if(r.unavailable)return '';
 const sign=Z[ix()][r.sign];
 const nakName=Number.isInteger(r.nak)?(ix()===0?NAK_UK:NAK_EN)[r.nak]:'';
 const badge=r.certain&&sign?`<div class="nr-you-sign"><span class="nr-you-medal" aria-hidden="true">${signGlyph[r.sign]}&#xFE0E;</span><div><p>${esc(p('moon'))} · <strong>${esc(sign)}</strong></p>${nakName?`<p class="nr-you-nak">${esc(NAK_LABEL[ix()])}: <strong>${esc(nakName)}</strong></p>`:''}<small>${esc(MOON_SIGN_NOTE[ix()])}</small></div></div>`:'';
 const nakOnly=!sign&&nakName?'<p class="nr-you-nak">'+esc(NAK_LABEL[ix()])+': <strong>'+esc(nakName)+'</strong></p>':'';
 const limits=[...(!r.certain?['uncertainSign']:[]),...(!r.nakCertain?['uncertainNak']:[])].map(k=>'<p class="nr-dv-you-warn">'+esc(t(k))+'</p>').join('');
 const rows=r.items.map(item=>`<li class="is-${item.k}" data-signal="${item.more}"><span class="nr-you-glyph" aria-hidden="true">${item.symbol}</span><div class="nr-you-signal-content"><div class="nr-you-signal-head"><strong>${esc(SIGNAL_TITLE[item.more][ix()])}</strong><small class="nr-you-tone"><span aria-hidden="true">${SHAPE[item.k]||'●'}</span> ${esc(p(item.k))}</small></div><p>${esc(item.text)}</p>${SIGNAL_CONTEXT[item.more]?'<p class="nr-you-context">'+esc(SIGNAL_CONTEXT[item.more][ix()])+'</p>':''}${MORE[item.more]?`<details class="nr-you-more"><summary>${esc(MORE_LABEL[ix()])}</summary><p>${esc(MORE[item.more][ix()])}</p></details>`:''}</div></li>`).join('');
 return `<div class="nr-dv-you"><p><b>${esc(t('you'))}</b> <small>(${esc(t('note'))})</small></p>${badge}${nakOnly}<p class="nr-you-basis">${esc(p('basis'))}</p>${rows?'<ul class="nr-you-items">'+rows+'</ul>':''}${limits}</div>`;
}
document.addEventListener('input',e=>{const f=e.target.closest?.('[data-natal-form]');if(f)f.elements.tz.setCustomValidity('');});
document.addEventListener('submit',e=>{
 const f=e.target.closest?.('[data-natal-form]');if(!f)return;e.preventDefault();
 const v=Object.fromEntries(new FormData(f));if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date||''))return;
 const zoneField=f.elements.tz,zone=zoneField.value.trim();
 const evidence=window.PersonalDayline?.birthEvidence({date:v.date,time:v.time,zone,mode:v.time?'known':'unknown'});
 if(!evidence?.candidates.length){zoneField.setCustomValidity(t('invalid'));zoneField.reportValidity();return;}
 let off=null;try{off=typeof birthUtcOffsetHours==='function'?birthUtcOffsetHours(zone,v.date,v.time||'12:00'):null}catch{}
 const d={name:'',date:v.date,time:v.time||'',utcOff:Number.isFinite(off)?off:null,tz:zone,profile:'general'};
 try{if(typeof setSlotData==='function'&&typeof _activeSlot!=='undefined')setSlotData(_activeSlot,d);else window.NRStorage?.set('personalData_0',JSON.stringify(d))}catch{}
 window.dispatchEvent(new Event('nr:natal'));
});
window.NRNatalSky={lines,html,timelineTara};
})();
