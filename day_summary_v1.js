(()=>{'use strict';
const $=id=>document.getElementById(id),labels={A:'Стан і настрій',B:'Продуктивність',C:'Фізичний стан',D:'Зовнішні події'},DB='skyrhythm-personal-day-summary-v1';
// FP538: build YYYY-MM-DD from parts, not from a locale's display pattern; one cached formatter.
const KYIV_DAY=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'});
const dayAt=t=>{const p={};for(const x of KYIV_DAY.formatToParts(new Date(t)))p[x.type]=x.value;return p.year.padStart(4,'0')+'-'+p.month.padStart(2,'0')+'-'+p.day.padStart(2,'0');};
const today=()=>dayAt(Date.now());
// Direct journal links need the same offline shell as the main application.
// Do not force activation or reload: an update must not discard an unfinished entry.
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>message('Не вдалося підготувати офлайн-режим. Локальне збереження записів залишається доступним, якщо браузер дозволяє сховище.'));
function validate(r){if(!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||!Number.isFinite(Date.parse(r.day+'T00:00:00Z'))||new Date(r.day+'T00:00:00Z').toISOString().slice(0,10)!==r.day||r.day>=today())throw Error('Оберіть завершений день за київським часом.');if(!['yes','no','unknown'].includes(r.forecast_seen))throw Error('Вкажіть, чи бачили ви прогноз.');if(Object.keys(labels).some(k=>!Number.isInteger(r.axes[k])||r.axes[k]<-3||r.axes[k]>3))throw Error('Заповніть усі чотири оцінки.');if(typeof r.note!=='string'||r.note.length>500)throw Error('Нотатка має містити не більше 500 символів.');}
function db(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore('entries',{keyPath:'day'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('Закрийте іншу вкладку щоденника та спробуйте ще раз.'));});}
async function access(mode,operation){const d=await db();try{return await new Promise((resolve,reject)=>{const t=d.transaction('entries',mode),q=operation(t.objectStore('entries'));t.oncomplete=()=>resolve(q.result);t.onerror=t.onabort=()=>reject(t.error||q.error);});}finally{d.close();}}
function message(s){$('status').textContent=s;}
function download(data,name){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function history(){const rows=await access('readonly',s=>s.getAll());$('history').replaceChildren();if(!rows.length){$('history').textContent='Тут з’являться ваші підсумки.';return;}for(const r of rows.sort((a,b)=>b.day.localeCompare(a.day))){const a=document.createElement('article'),h=document.createElement('h3'),v=document.createElement('p'),n=document.createElement('p'),del=document.createElement('button');h.textContent=r.day;v.textContent=Object.entries(labels).map(([k,l])=>l+': '+r.axes[k]).join(' · ');n.textContent=({yes:'Прогноз переглянуто.',no:'За вашим повідомленням, прогноз не переглянуто.',unknown:'Перегляд прогнозу не уточнений.'}[r.forecast_seen])+(r.note?'\n'+r.note:'');del.type='button';del.className='secondary';del.textContent='Видалити запис';del.setAttribute('aria-label','Видалити запис за '+r.day);del.onclick=async()=>{if(!confirm('Видалити підсумок за '+r.day+' з цього браузера?'))return;try{await access('readwrite',s=>s.delete(r.day));await history();message('Запис видалено з цього браузера.');}catch(e){message('Не вдалося видалити запис.');}};a.append(h,v,n,del);$('history').append(a);}}
for(const [k,l] of Object.entries(labels)){const label=document.createElement('label'),select=document.createElement('select');label.textContent=l;select.id=k;select.required=true;select.add(new Option('Оберіть оцінку',''));for(let v=-3;v<=3;v++)select.add(new Option(v>0?'+'+v:String(v),String(v)));label.append(select);$('axes').append(label);}
const yesterday=new Date(today()+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);$('day').max=yesterday.toISOString().slice(0,10);$('day').value=$('day').max;
$('summaryForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter||e.target.querySelector('[type=submit]');try{button.disabled=true;const r={schema:'personal_day_summary_v1',day:$('day').value,timezone:'Europe/Kyiv',captured_at_utc:new Date().toISOString(),axes:Object.fromEntries(Object.keys(labels).map(k=>[k,$(k).value===''?null:Number($(k).value)])),forecast_seen:$('seen').value,note:$('note').value.trim(),independently_verified:false};validate(r);await access('readwrite',s=>s.add(r));e.target.reset();$('day').value=$('day').max;await history();message('Підсумок збережено лише в цьому браузері.');}catch(err){message(err?.name==='ConstraintError'?'За цей день уже є запис. Він залишився без змін.':err?.message||'Не вдалося зберегти. Ваші відповіді залишилися у формі.');}finally{button.disabled=false;}};
$('consent').onchange=()=>{$('research').disabled=!$('consent').checked;};
async function exportRows(research){try{if(research&&!$('consent').checked)return;const rows=await access('readonly',s=>s.getAll());if(!rows.length){message('Спершу збережіть підсумок дня.');return;}download({schema:research?'personal_day_summary_research_export_v1':'personal_day_summary_backup_v1',exported_at_utc:new Date().toISOString(),research_consent:research?{given:true,at_utc:new Date().toISOString(),scope:'dates, axes, forecast_seen; no notes; manual sharing'}:null,independent_validation:false,records:rows.map(r=>research?{day:r.day,timezone:r.timezone,captured_at_utc:r.captured_at_utc,axes:r.axes,forecast_seen:r.forecast_seen,independently_verified:false}:r)},research?'SkyRhythm_research_observations.json':'SkyRhythm_my_day_backup.json');message(research?'Файл підготовлено без нотаток. Передачі не було.':'Особисту копію завантажено разом із нотатками.');}catch(e){message('Не вдалося підготувати файл. Перевірте доступ браузера до сховища.');}}
let pendingRestore=null,restoreSelection=0;
function validUtcTimestamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return false;
 const t=Date.parse(value);if(!Number.isFinite(t))return false;
 return new Date(t).toISOString()===value.replace(/(?<!\.\d{3})Z$/,'.000Z');
}
// FP537: a restored record must have been saved after its Kyiv day ended and not in the future.
function kyivDayEnd(day){
 // Find the first millisecond of the following local date using the browser's timezone rules.
 const anchor=Date.parse(day+'T00:00:00Z');let lo=anchor-36*3600000,hi=anchor+48*3600000;
 while(hi-lo>1){const mid=lo+Math.floor((hi-lo)/2);if(dayAt(mid)<=day)lo=mid;else hi=mid;}
 return dayAt(lo)===day&&dayAt(hi)>day?hi:NaN;
}
function plausibleCapture(r){const t=Date.parse(r.captured_at_utc);return t>=kyivDayEnd(r.day)&&t<=Date.now()+5*60000;}
function parseBackupJSON(text){
 // JSON.parse validates syntax; scan the same text to reject duplicate decoded object keys.
 const result=JSON.parse(text);let i=0;
 const ws=()=>{while(/\s/.test(text[i]||'x'))i++;};
 function string(){const start=i++;while(i<text.length){const c=text[i++];if(c==='\\'){i++;continue;}if(c==='"')return JSON.parse(text.slice(start,i));}throw new SyntaxError('JSON');}
 function value(depth){
  if(depth>=128)throw Error('Надто глибока структура JSON. Нічого не додано.');/* FP538: at most 128 nesting levels, as documented */ws();const c=text[i];
  if(c==='"'){string();return;}
  if(c==='{'){i++;ws();const keys=new Set();if(text[i]==='}'){i++;return;}while(true){ws();const key=string();if(keys.has(key))throw Error('У JSON повторюється ключ. Нічого не додано.');keys.add(key);ws();i++;value(depth+1);ws();if(text[i++]==='}')return;}}
  if(c==='['){i++;ws();if(text[i]===']'){i++;return;}while(true){value(depth+1);ws();if(text[i++ ]===']')return;}}
  while(i<text.length&&!/[\s,}\]]/.test(text[i]))i++;
 }
 value(0);return result;
}
function cleanBackup(data){
 if(!data||data.schema!=='personal_day_summary_backup_v1'||!Array.isArray(data.records)||!data.records.length||data.records.length>5000)throw Error('Потрібна особиста копія щоденника з 1–5000 записами. Дослідницький експорт не є резервною копією.');
 const days=new Set();return data.records.map(r=>{
  if(!r||r.schema!=='personal_day_summary_v1'||r.timezone!=='Europe/Kyiv'||!r.axes||!validUtcTimestamp(r.captured_at_utc))throw Error('У копії є запис із неправильним форматом. Нічого не додано.');
  validate(r);if(!plausibleCapture(r))throw Error('У копії запис за '+r.day+' збережено до завершення дня або в майбутньому. Нічого не додано.');if(days.has(r.day))throw Error('У копії повторюється дата. Нічого не додано.');days.add(r.day);
  return {schema:'personal_day_summary_v1',day:r.day,timezone:'Europe/Kyiv',captured_at_utc:r.captured_at_utc,axes:Object.fromEntries(Object.keys(labels).map(k=>[k,r.axes[k]])),forecast_seen:r.forecast_seen,note:r.note,independently_verified:false};
 });
}
$('restoreFile').onchange=async()=>{const selection=++restoreSelection;pendingRestore=null;$('restore').disabled=true;$('restorePreview').textContent='';try{const file=$('restoreFile').files[0];if(!file)return;if(file.size>2*1024*1024)throw Error('Оберіть JSON-файл розміром до 2 МБ.');const rows=cleanBackup(parseBackupJSON(await file.text()));const existing=new Set(await access('readonly',s=>s.getAllKeys()));if(selection!==restoreSelection)return;pendingRestore=rows;const skipped=rows.filter(r=>existing.has(r.day)).length;$('restorePreview').textContent='У копії: '+rows.length+'. Можна додати: '+(rows.length-skipped)+'. Уже збережені дні: '+skipped+' — залишаться без змін.';$('restore').disabled=rows.length===skipped;}catch(e){if(selection===restoreSelection)$('restorePreview').textContent=e instanceof SyntaxError?'Файл не є коректним JSON. Нічого не додано.':e.message;}};
async function restoreRows(rows){const d=await db();try{return await new Promise((resolve,reject)=>{const t=d.transaction('entries','readwrite'),store=t.objectStore('entries');let added=0,skipped=0;for(const r of rows){const q=store.get(r.day);q.onsuccess=()=>{if(q.result){skipped++;return;}store.add(r);added++;};}t.oncomplete=()=>resolve({added,skipped});t.onerror=t.onabort=()=>reject(t.error||Error('Не вдалося відновити копію.'));});}finally{d.close();}}
$('restore').onclick=async()=>{if(!pendingRestore)return;$('restore').disabled=true;$('restoreFile').disabled=true;try{const result=await restoreRows(cleanBackup({schema:'personal_day_summary_backup_v1',records:pendingRestore}));pendingRestore=null;$('restoreFile').value='';$('restorePreview').textContent='Додано: '+result.added+'. Наявні записи збережено без змін: '+result.skipped+'.';await history();message('Відновлення завершено. Записи залишаються лише в цьому браузері.');}catch(e){message(e.message||'Відновлення не виконано.');$('restore').disabled=false;}finally{$('restoreFile').disabled=false;}};
$('backup').onclick=()=>exportRows(false);$('research').onclick=()=>exportRows(true);history().catch(()=>message('Сховище недоступне. Збереження та історію потрібно перевірити в налаштуваннях браузера.'));
})();
