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
function lines(ds,sky){
 const d=slot();if(!d)return {missing:true};
 const n=natal(d);if(!n)return {missing:true};
 const day=sky?.daily?.find(x=>x.date===ds);if(!day)return {missing:false,items:[],certain:n.certain,unavailable:true};
 const g=day.grahas,items=[];
 if(house(n.sign,g.Moon.sign)===8)items.push({k:'caution',text:t('chandra')});
 const pos=((g.Moon.nakshatra-n.nak)%27+27)%27,grp=pos%9+1;
 items.push({k:TARA_BAD.includes(grp)?'caution':'good',text:t('tara')+': '+TARA[grp-1]+' — '+(TARA_BAD.includes(grp)?t('tara_bad'):t('tara_good'))});
 const hs=house(n.sign,g.Saturn.sign);
 if([12,1,2].includes(hs))items.push({k:'caution',text:t('sade').replace('{p}',hs===12?1:hs===1?2:3).replace('{h}',ord(hs))});
 else if([4,8].includes(hs))items.push({k:'caution',text:t('dhaiya').replace('{h}',ord(hs))});
 const hj=house(n.sign,g.Jupiter.sign);items.push({k:[2,5,7,9,11].includes(hj)?'good':'info',text:t('jup').replace('{h}',ord(hj))+([2,5,7,9,11].includes(hj)?t('jup_good'):'')});
 return {missing:false,items,certain:n.certain};
}
function html(ds,sky){
 const r=lines(ds,sky);
 if(r.missing){return `<div class="nr-dv-you is-empty"><p>${esc(t('add'))}</p><details class="nr-dv-you-form"><summary>${esc(t('addBtn'))}</summary><form data-natal-form><label>${esc(t('date'))}<input type="date" name="date" required></label><label>${esc(t('time'))}<input type="time" name="time"></label><label>${esc(t('zone'))}<input type="text" name="tz" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Kyiv')}" autocomplete="off"></label><button type="submit">${esc(t('save'))}</button></form></details></div>`}
 if(r.unavailable)return '';
 return `<div class="nr-dv-you"><p><b>${esc(t('you'))}</b> <small>(${esc(t('note'))})</small></p><ul>${r.items.length?r.items.map(x=>`<li class="is-${x.k}">${esc(x.text)}</li>`).join(''):`<li>${esc(t('none'))}</li>`}</ul>${r.certain?'':`<p class="nr-dv-you-warn">${esc(t('uncertain'))}</p>`}</div>`;
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
