(function(host){
'use strict';
const zone='Europe/Kyiv';
function instant(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 const target=date+'T'+time,base=Date.parse(target+':00Z');if(!Number.isFinite(base))return null;
 const f=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const matches=[];for(let offset=-14;offset<=14;offset++){const t=base+offset*3600000;if(f.format(new Date(t)).replace(' ','T')===target)matches.push(t)}
 return matches.length===1?matches[0]:null;
}
const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line){let result='',bytes=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>75){result+='\r\n ';bytes=1}result+=c;bytes+=n}return result}
const tr=s=>host.NRLocale?.text(s)||s;
function create(plan,now=Date.now()){
 const t=instant(plan?.date,plan?.time);if(t===null)throw new Error('Некоректний або неоднозначний київський час.');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NeboRhythm//Local plan//UK','CALSCALE:GREGORIAN','BEGIN:VEVENT',
 'UID:'+host.crypto.randomUUID()+'@neborhythm.local','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(t),
 'SUMMARY:'+escape(plan.priority||tr('Мій план')), 'DESCRIPTION:'+escape([plan.note,plan.contact?tr('Контакт: ')+plan.contact:'',tr('Час плану: ')+plan.time+' Europe/Kyiv'].filter(Boolean).join('\n')),
 'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0M','DESCRIPTION:'+escape(plan.priority||tr('Мій план')),'END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
function download(){
 const status=document.getElementById('nrReminderStatus');
 try{const plan=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null');if(!plan)throw new Error('Спочатку збережіть план із часом.');
 const text=create(plan),url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='NeboRhythm-plan-'+plan.date+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='Файл календаря створено. Відкрийте його, підтвердьте імпорт і перевірте нагадування у своєму календарі.';
 }catch(e){if(status)status.textContent=e.message}
}
host.NRPlanCalendar=Object.freeze({instant,create,download});
})(globalThis);
