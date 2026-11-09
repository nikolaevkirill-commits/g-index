/* SkyRhythm · «Для тебе»: транзити від натального Місяця (Чандра-лагна). Дані народження — лише на пристрої
   (той самий слот personalData_N, що й у старому особистому розрахунку). Позиції дня — з consumer_cloud/sky.json
   (12:00 за Києвом). Традиційні значення, не перевірено; на бал не впливає. Без часу народження знак Місяця
   може бути неоднозначним — тоді це сказано прямо. */
(()=>{'use strict';
const I=['uk','en','es','fr'],L=()=>{const l=window.NRLocale?.language||'uk';return I.includes(l)?l:'en'},ix=()=>I.indexOf(L());
const T={
 you:['Для тебе:','For you:','Para ti:','Pour vous :'],
 chandra:['Чандраштама: Місяць у 8-му знаку від твого натального — традиційно день обережності','Chandrashtama: the Moon is in the 8th sign from your natal Moon — traditionally a day for caution','Chandrashtama: la Luna está en el 8.º signo desde tu Luna natal; tradicionalmente, día de cautela','Chandrashtama : la Lune est dans le 8e signe depuis votre Lune natale — traditionnellement un jour de prudence'],
 tara:['Тара Бала','Tara Bala','Tara Bala','Tara Bala'],tara_good:['сприятлива','favourable','favorable','favorable'],tara_bad:['обережно','caution','cautela','prudence'],
 sade:['Саде Саті, фаза {p} з 3: Сатурн у {h}-му знаку від натального Місяця','Sade Sati, phase {p} of 3: Saturn in the {h} sign from your natal Moon','Sade Sati, fase {p} de 3: Saturno en el signo {h} desde tu Luna natal','Sade Sati, phase {p} sur 3 : Saturne dans le signe {h} depuis votre Lune natale'],
 dhaiya:['Дхайя: Сатурн у {h}-му знаку від натального Місяця','Dhaiya: Saturn in the {h} sign from your natal Moon','Dhaiya: Saturno en el signo {h} desde tu Luna natal','Dhaiya : Saturne dans le signe {h} depuis votre Lune natale'],
 jup:['Юпітер у {h}-му знаку від натального Місяця','Jupiter in the {h} sign from your natal Moon','Júpiter en el signo {h} desde tu Luna natal','Jupiter dans le signe {h} depuis votre Lune natale'],
 jup_good:[' — сприятливо за традицією',' — favourable by tradition',' — favorable según la tradición',' — favorable selon la tradition'],
 note:['традиція, не перевірено','tradition, not validated','tradición, no validado','tradition, non validé'],
 uncertain:['Час народження не вказано: того дня Місяць змінював знак — уточни час, щоб розрахунок був певним.','Birth time not given: the Moon changed sign that day — add the time for a definite result.','Hora de nacimiento no indicada: la Luna cambió de signo ese día; añade la hora para un resultado seguro.','Heure de naissance non indiquée : la Lune a changé de signe ce jour-là — ajoutez l’heure pour un résultat certain.'],
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
 tara:['Тара Бала зіставляє сьогоднішню ділянку Місяця з тією, де він був під час народження.','Tara Bala compares the Moon’s sector for this day with its sector at birth.','Tara Bala compara el sector lunar del día con el del nacimiento.','Tara Bala compare le secteur lunaire du jour à celui de la naissance.'],
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
function moonSid(date,time,utcOff){
 if(typeof dateToJDE!=='function'||typeof calcMoonLongitude!=='function'||typeof calcNakshatra!=='function'||typeof __nrUtcJdToTt!=='function')return null;
 const jde=dateToJDE(date,time,utcOff);if(!Number.isFinite(jde))return null;
 return calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(jde)),jde);
}
function natal(d){
 const off=Number.isFinite(Number(d.utcOff))?Number(d.utcOff):0;
 if(d.time&&/^\d{2}:\d{2}$/.test(d.time)){const n=moonSid(d.date,d.time,off);return n?{sign:Math.floor(n.lambdaSid/30),nak:n.idx,certain:true}:null}
 const a=moonSid(d.date,'00:00',off),b=moonSid(d.date,'23:59',off),m=moonSid(d.date,'12:00',off);if(!a||!b||!m)return null;
 return {sign:Math.floor(m.lambdaSid/30),nak:m.idx,certain:Math.floor(a.lambdaSid/30)===Math.floor(b.lambdaSid/30)};
}
const house=(from,to)=>((to-from)%12+12)%12+1;
const TARA=['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhana','Naidhana','Mitra','Atimitra'],TARA_BAD=[1,3,5,7];
// FP569k: names in the reader's script; the Sanskrit term stays in brackets (uk) or as is (en/es/fr).
const TARA_UK=['Джанма','Сампат','Віпат','Кшема','Пратьяк','Садхана','Найдхана','Мітра','Атімітра'];
const taraName=i=>(window.NRLocale?.language||'uk')==='uk'?TARA_UK[i]+' ('+TARA[i]+')':TARA[i];
function lines(ds,sky){
 const d=slot();if(!d)return {missing:true};
 const n=natal(d);if(!n)return {missing:true};
 const day=sky?.daily?.find(x=>x.date===ds);if(!day)return {missing:false,items:[],certain:n.certain,unavailable:true};
 const g=day.grahas,items=[];
 if(house(n.sign,g.Moon.sign)===8)items.push({k:'caution',body:'lunar',symbol:'☾',more:'chandra',text:t('chandra')});
 const pos=((g.Moon.nakshatra-n.nak)%27+27)%27,grp=pos%9+1;
 items.push({k:TARA_BAD.includes(grp)?'caution':'good',body:'lunar',symbol:'☾',more:'tara',help:p('tara'),text:t('tara')+': '+taraName(grp-1)+' — '+(TARA_BAD.includes(grp)?t('tara_bad'):t('tara_good'))});
 const hs=house(n.sign,g.Saturn.sign);
 if([12,1,2].includes(hs))items.push({k:'caution',body:'saturn',symbol:'♄',more:'sade',text:t('sade').replace('{p}',hs===12?1:hs===1?2:3).replace('{h}',ord(hs))});
 else if([4,8].includes(hs))items.push({k:'caution',body:'saturn',symbol:'♄',more:'dhaiya',text:t('dhaiya').replace('{h}',ord(hs))});
 const hj=house(n.sign,g.Jupiter.sign);items.push({k:[2,5,7,9,11].includes(hj)?'good':'info',body:'jupiter',symbol:'♃',more:'jup',text:t('jup').replace('{h}',ord(hj))+([2,5,7,9,11].includes(hj)?t('jup_good'):'')});
 return {missing:false,items,certain:n.certain,sign:n.sign,nak:n.nak};
}
// FP569l (owner: «розписати, і не тільки червоне чи зелене, а й знак»): plain «що це означає» for each line,
// a shape next to the colour (▲ сприятливо · ▼ обережно · ● довідка) and a Moon-sign medallion.
const MORE={
 chandra:['Чандраштама: приблизно раз на 27 днів Місяць 2–3 дні проходить 8-й знак від вашого натального Місяця. Традиція радить у ці дні не починати важливого й не сперечатися.','Chandrashtama: about once every 27 days the Moon spends 2–3 days in the 8th sign from your natal Moon. Tradition advises not to start important things.','Chandrashtama: cada ~27 días la Luna pasa 2–3 días en el 8.º signo desde tu Luna natal. La tradición aconseja no empezar cosas importantes.','Chandrashtama : environ tous les 27 jours, la Lune passe 2–3 jours dans le 8e signe depuis votre Lune natale. La tradition déconseille de commencer l’important.'],
 tara:['Тара Бала: «зірку дня» (накшатру, де зараз Місяць) рахують від вашої зірки народження. 9 видів ідуть по колу: Віпат, Пратьяк, Найдхана і сама Джанма — обережні, решта — сприятливі. Змінюється приблизно щодня.','Tara Bala: the day’s star (the Moon’s nakshatra) is counted from your birth star. Nine kinds repeat: Vipat, Pratyak, Naidhana and Janma itself are cautious, the rest favourable. Changes about daily.','Tara Bala: la estrella del día se cuenta desde tu estrella natal. Nueve tipos se repiten; Vipat, Pratyak, Naidhana y Janma son de cautela.','Tara Bala : l’étoile du jour est comptée depuis votre étoile natale. Neuf types se répètent ; Vipat, Pratyak, Naidhana et Janma appellent à la prudence.'],
 sade:['Саде Саті — близько 7,5 року, поки Сатурн проходить знак перед вашим натальним Місяцем, сам знак і знак після нього (3 фази по ~2,5 року). У традиції — час навантаження й перевірки на міцність, а не прогноз конкретних подій.','Sade Sati: about 7.5 years while Saturn passes the sign before your natal Moon, that sign and the next (three ~2.5-year phases). In the tradition a time of load and testing, not a forecast of events.','Sade Sati: unos 7,5 años mientras Saturno pasa por el signo anterior a tu Luna natal, ese signo y el siguiente. Época de carga, no una predicción de hechos.','Sade Sati : environ 7,5 ans pendant que Saturne traverse le signe précédant votre Lune natale, ce signe et le suivant. Période d’effort, pas une prédiction.'],
 dhaiya:['Дхайя — близько 2,5 року, коли Сатурн у 4-му або 8-му знаку від вашого натального Місяця. У традиції — період зайвих турбот удома чи у справах.','Dhaiya: about 2.5 years with Saturn in the 4th or 8th sign from your natal Moon; traditionally extra worries at home or work.','Dhaiya: unos 2,5 años con Saturno en el 4.º u 8.º signo desde tu Luna natal.','Dhaiya : environ 2,5 ans avec Saturne dans le 4e ou 8e signe depuis votre Lune natale.'],
 jup:['Юпітер проходить один знак приблизно за рік. Положення у 2-му, 5-му, 7-му, 9-му чи 11-му знаку від вашого Місяця традиція вважає сприятливим (гроші, діти й творчість, партнерство, навчання, здобутки).','Jupiter spends about a year in each sign. The 2nd, 5th, 7th, 9th or 11th sign from your Moon is traditionally favourable (money, creativity, partnership, learning, gains).','Júpiter pasa un año por signo. Los signos 2, 5, 7, 9 y 11 desde tu Luna se consideran favorables.','Jupiter passe environ un an par signe. Les signes 2, 5, 7, 9 et 11 depuis votre Lune sont jugés favorables.']};
const MORE_LABEL=['Що це означає','What this means','Qué significa','Ce que cela signifie'];
const SHAPE={good:'▲',caution:'▼',info:'●'};
const NAK_UK=['Ашвіні','Бгарані','Кріттіка','Рогіні','Мрігашіра','Ардра','Пунарвасу','Пуш’я','Ашлеша','Магха','Пурва Пхалгуні','Уттара Пхалгуні','Хаста','Чітра','Сваті','Вішакха','Анурадха','Джйештха','Мула','Пурва Ашадха','Уттара Ашадха','Шравана','Дганіштха','Шатабгіша','Пурва Бгадрапада','Уттара Бгадрапада','Реваті'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LABEL=['Зірка народження (накшатра)','Birth star (nakshatra)','Estrella natal (nakshatra)','Étoile de naissance (nakshatra)'];
const TODAY_SUM=[[ 'Сьогодні за традицією: більше приводів для обережності','Сьогодні за традицією: більше сприятливого','Сьогодні за традицією: рівно'],['Today, by tradition: more reasons for caution','Today, by tradition: more favourable','Today, by tradition: balanced'],['Hoy, según la tradición: más motivos de cautela','Hoy, según la tradición: más favorable','Hoy, según la tradición: equilibrado'],['Aujourd’hui, selon la tradition : plus de prudence','Aujourd’hui, selon la tradition : plus favorable','Aujourd’hui, selon la tradition : équilibré']];
const MOON_SIGN_NOTE=['Знак, де був Місяць у мить народження. У Джйотіш від нього рахують особисті переходи — як від «точки відліку».','The sign the Moon was in at birth. In Jyotish personal transits are counted from it.','El signo de la Luna al nacer; en Jyotish los tránsitos personales se cuentan desde él.','Le signe de la Lune à la naissance ; en Jyotish, les transits personnels sont comptés depuis lui.'];
function html(ds,sky){
 const r=lines(ds,sky);
 if(r.missing){return `<div class="nr-dv-you is-empty"><p>${esc(t('add'))}</p><details class="nr-dv-you-form"><summary>${esc(t('addBtn'))}</summary><form data-natal-form><label>${esc(t('date'))}<input type="date" name="date" required></label><label>${esc(t('time'))}<input type="time" name="time"></label><label>${esc(t('zone'))}<input type="text" name="tz" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Kyiv')}" autocomplete="off"></label><button type="submit">${esc(t('save'))}</button></form></details></div>`}
 if(r.unavailable)return '';
 const sign=Z[ix()][r.sign];
 const nakName=Number.isInteger(r.nak)?(ix()===0?NAK_UK:NAK_EN)[r.nak]:'';
 const badge=r.certain&&sign?`<div class="nr-you-sign"><span class="nr-you-medal" aria-hidden="true">${signGlyph[r.sign]}&#xFE0E;</span><div><p>${esc(p('moon'))} · <strong>${esc(sign)}</strong></p>${nakName?`<p class="nr-you-nak">${esc(NAK_LABEL[ix()])}: <strong>${esc(nakName)}</strong></p>`:''}<small>${esc(MOON_SIGN_NOTE[ix()])}</small></div></div>`:'';
 const good=r.items.filter(x=>x.k==='good').length,bad=r.items.filter(x=>x.k==='caution').length;
 const sum=r.items.length?`<p class="nr-you-today is-${bad>good?'caution':good>bad?'good':'info'}"><span aria-hidden="true">${bad>good?'▼':good>bad?'▲':'●'}</span> ${esc(TODAY_SUM[ix()][bad>good?0:good>bad?1:2])} (▲ ${good} · ▼ ${bad})</p>`:'';
 const rows=r.items.map(item=>`<li class="is-${item.k}"><span class="nr-you-glyph" aria-hidden="true">${item.symbol}</span><div><strong>${esc(p(item.body))}</strong><small class="nr-you-tone"><span aria-hidden="true">${SHAPE[item.k]||'●'}</span> ${esc(p(item.k))}</small><p>${esc(item.text)}</p>${item.more&&MORE[item.more]?`<details class="nr-you-more"><summary>${esc(MORE_LABEL[ix()])}</summary><p>${esc(MORE[item.more][ix()])}</p></details>`:item.help?' <small>'+esc(item.help)+'</small>':''}</div></li>`).join('');
 return `<div class="nr-dv-you"><p><b>${esc(t('you'))}</b> <small>(${esc(t('note'))})</small></p>${badge}${sum}<p class="nr-you-basis">${esc(p('basis'))}</p><ul class="nr-you-items">${rows}</ul>${r.certain?'':`<p class="nr-dv-you-warn">${esc(t('uncertain'))}</p>`}</div>`;
}
document.addEventListener('submit',e=>{
 const f=e.target.closest?.('[data-natal-form]');if(!f)return;e.preventDefault();
 const v=Object.fromEntries(new FormData(f));if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date||''))return;
 let off=0;try{off=typeof birthUtcOffsetHours==='function'?birthUtcOffsetHours(v.tz||'Europe/Kyiv',v.date,v.time||'12:00'):0}catch{}
 const d={name:'',date:v.date,time:v.time||'',utcOff:Number.isFinite(off)?off:0,tz:v.tz||'manual',profile:'general'};
 try{if(typeof setSlotData==='function'&&typeof _activeSlot!=='undefined')setSlotData(_activeSlot,d);else window.NRStorage?.set('personalData_0',JSON.stringify(d))}catch{}
 window.dispatchEvent(new Event('nr:natal'));
});
window.NRNatalSky={lines,html};
})();
