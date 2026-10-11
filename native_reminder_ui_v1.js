(function(host){
'use strict';
const rows={
 zone:["за Києвом","Kyiv time","hora de Kyiv","heure de Kyiv"],
 posted:['Нагадування передано Android.','Reminder handed to Android.','Recordatorio enviado a Android.','Rappel transmis à Android.'],
 missed:['Час нагадування минув.','The reminder time has passed.','La hora del recordatorio ya ha pasado.','L’heure du rappel est passée.'],
 other:['Інший календар','Another calendar','Otro calendario','Autre calendrier'],
 title:['Нагадати мені','Remind me','Recordarme','Me rappeler'],
 cancel:['Скасувати нагадування','Cancel reminder','Cancelar recordatorio','Annuler le rappel'],
 soon:['Через 30 хвилин, якщо час плану не задано.','In 30 minutes if no plan time is set.','En 30 minutos si el plan no tiene hora.','Dans 30 minutes si aucune heure n’est définie.'],
 saved:['Нагадування заплановано на','Reminder scheduled for','Recordatorio programado para','Rappel programmé pour'],
 pending:['Очікую підтвердження Android…','Waiting for Android confirmation…','Esperando la confirmación de Android…','En attente de confirmation Android…'],
 cancelled:['Нагадування скасовано.','Reminder cancelled.','Recordatorio cancelado.','Rappel annulé.'],
 notification_permission_required:['Дозвольте сповіщення NeboRhythm у налаштуваннях телефона.','Allow NeboRhythm notifications in phone settings.','Permite las notificaciones de NeboRhythm en los ajustes del teléfono.','Autorisez les notifications NeboRhythm dans les réglages du téléphone.'],
 alarm_permission_required:['Потрібен дозвіл Android на точний час нагадування.','Android permission is needed for a precisely timed reminder.','Se necesita permiso de Android para un recordatorio a la hora exacta.','Une autorisation Android est nécessaire pour un rappel à l’heure exacte.'],
 invalid_plan:['Збережіть план і перевірте його час.','Save your plan and check its time.','Guarda el plan y comprueba la hora.','Enregistrez le plan et vérifiez son heure.'],
 unavailable:['Фонове нагадування тут ще недоступне.','Background reminders are not available here yet.','Los recordatorios en segundo plano aún no están disponibles aquí.','Les rappels en arrière-plan ne sont pas encore disponibles ici.'],
 unknown:['Підтвердження не отримано. Стан нагадування невідомий; не створюйте повторне навмання.','No confirmation received. Reminder status is unknown; do not create a duplicate blindly.','No se recibió confirmación. El estado es desconocido; evita crear un duplicado.','Aucune confirmation reçue. L’état du rappel est inconnu ; évitez de créer un doublon.'],
 error:['Не вдалося підтвердити нагадування.','Could not confirm the reminder.','No se pudo confirmar el recordatorio.','Impossible de confirmer le rappel.']};
function tr(key){return rows[key][Math.max(0,['uk','en','es','fr'].indexOf(host.NRLocale?.language||'uk'))]}
let busy=false;
let revision=0;
function show(out,result){
if(!out)return;
out.dataset.nativeState=result.status;
const group=document.querySelector('[data-native-reminder]');
if(group){const scheduled=result.status==='scheduled';group.children[0].hidden=scheduled;group.children[1].hidden=!scheduled;group.children[2].hidden=scheduled;}

 if(result.status==='scheduled')out.textContent=tr('saved')+' '+new Intl.DateTimeFormat(host.NRLocale?.locale||'uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(result.at)+' ('+tr('zone')+').';
 else if(result.status!=='ready')out.textContent=tr(rows[result.status]?result.status:'error');
}
async function act(cancel){
 const out=document.getElementById('nrReminderStatus');if(!out||busy)return;
 if(!host.NRNativeReminder?.available){out.textContent=tr('unavailable');return}
 busy=true;revision++;out.textContent=tr('pending');
 try{
  let result;
  if(cancel)result=await host.NRNativeReminder.cancel();
  else{
   const plan=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null');
   if(!plan?.priority)throw Error('invalid_plan');
   result=plan.time?await host.NRNativeReminder.schedule(plan):await host.NRNativeReminder.scheduleAt(plan.priority,Date.now()+30*60000);
  }
  show(out,result);
 }catch(e){out.textContent=tr(e.message==='invalid_plan'?'invalid_plan':['confirmation_missing','connection_lost'].includes(e.message)?'unknown':'error')}
 finally{busy=false}
}
function mount(){
 const form=document.getElementById('nrPlanForm');if(!form||form.querySelector('[data-native-reminder]'))return;
 const oldTimer=form.querySelector('[onclick="fp466EnableReminder()"]');if(oldTimer)oldTimer.hidden=true;
 const calendar=form.querySelector('[onclick="NRPlanCalendar.download()"]');
 if(calendar&&!form.querySelector('[data-native-calendar]')){
  const hint=calendar.nextElementSibling,details=document.createElement('details'),summary=document.createElement('summary');
  details.dataset.nativeCalendar='';summary.textContent=tr('other');calendar.before(details);details.append(summary,calendar);
  if(hint?.tagName==='P')details.append(hint);
 }
 const group=document.createElement('div');group.dataset.nativeReminder='';
 const button=document.createElement('button');button.type='button';button.className='nr-btn';button.textContent=tr('title');button.onclick=()=>act(false);
 const cancel=document.createElement('button');cancel.type='button';cancel.className='nr-btn secondary';cancel.textContent=tr('cancel');cancel.hidden=true;cancel.onclick=()=>act(true);
 const hint=document.createElement('p');hint.className='nr-result-meta';hint.textContent=tr('soon');group.append(button,cancel,hint);form.insertBefore(group,document.getElementById('nrReminderStatus'));
 const calendarDetails=form.querySelector('[data-native-calendar]');if(calendarDetails){calendarDetails.querySelector('summary').textContent=tr('other');form.append(calendarDetails)}
 const snapshot=revision;
 host.NRNativeReminder.status().then(result=>{if(snapshot===revision&&!busy)show(document.getElementById('nrReminderStatus'),result)}).catch(()=>{});
 if(!form.dataset.nativeCancelGuard){
  form.dataset.nativeCancelGuard='true';let approved=false;
  form.addEventListener('submit',async event=>{
   if(approved){approved=false;return}
   event.preventDefault();event.stopImmediatePropagation();
   const out=document.getElementById('nrReminderStatus');
   try{
    const result=await host.NRNativeReminder.cancel();
    if(result.status!=='cancelled')throw Error('cancel_unconfirmed');
    show(out,result);approved=true;form.requestSubmit();
   }catch(e){if(out)out.textContent=tr('unknown')}
  },true);
 }
}
host.addEventListener('nr:native-reminder-ready',mount);
host.addEventListener('nr:locale',()=>{document.querySelector('[data-native-reminder]')?.remove();if(host.NRNativeReminder?.available)mount()});
if(host.NRNativeReminder?.available)mount();
})(globalThis);
