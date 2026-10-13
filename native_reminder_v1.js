(function(host){
'use strict';
const origin='https://nikolaevkirill-commits.github.io';
let port=null;const pending=new Map();
function disconnect(){if(port)port.close();port=null;for(const v of pending.values()){clearTimeout(v.timer);v.reject(Error('connection_lost'))}pending.clear()}
const nativeOrigin='android-app://nikolaevkirill-commits.github.io';
let bootstrap=null;
function readyMessage(data){try{const m=typeof data==='string'?JSON.parse(data):data;return m?.type==='nr-reminder-ready'&&m.version===1}catch{return false}}
function attach(readyPort){
  if(bootstrap){clearTimeout(bootstrap.timer);if(bootstrap.port!==readyPort)bootstrap.port.close();bootstrap=null}
  disconnect();port=readyPort;port.onmessage=event=>{
    let msg;try{msg=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return}
    if(msg?.type!=='nr-reminder-result'||msg.version!==1)return;
    const request=pending.get(msg.id);if(!request)return;
    if(msg.status==='scheduled'&&!(request.op==='schedule'&&msg.at===request.at||request.op==='status'&&Number.isSafeInteger(msg.at)&&msg.at>Date.now()))return;
    if(!['ready','scheduled','posted','missed','cancelled','notification_permission_required','alarm_permission_required','storage_error','invalid_plan','invalid_request','busy'].includes(msg.status))return;
    clearTimeout(request.timer);pending.delete(msg.id);request.resolve(msg);
  };port.onmessageerror=disconnect;port.start();
  host.dispatchEvent(new Event('nr:native-reminder-ready'));
}
host.addEventListener('message',event=>{
  if(host.location.origin!==origin || event.ports?.length!==1)return;
  const native=event.origin===nativeOrigin && event.source===null;
  const legacy=event.origin===origin && (!event.source||event.source===host);
  if(!native&&!legacy)return;
  if(readyMessage(event.data)){attach(event.ports[0]);return}
  // Chromium transfers an empty bootstrap message; native hello follows on its port.
  if(event.data!=='')return;
  if(bootstrap){clearTimeout(bootstrap.timer);bootstrap.port.close()}
  const candidate=event.ports[0];
  const state={port:candidate,timer:setTimeout(()=>{candidate.close();if(bootstrap===state)bootstrap=null},10000)};
  bootstrap=state;
  candidate.onmessage=e=>{if(bootstrap!==state||!readyMessage(e.data))return;clearTimeout(state.timer);bootstrap=null;attach(candidate)};
  candidate.onmessageerror=()=>{clearTimeout(state.timer);candidate.close();if(bootstrap===state)bootstrap=null};
  candidate.start();
});
function request(op,details={}){
  if(!port)return Promise.reject(Error('native_unavailable'));
  const id=host.crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('confirmation_missing'))},120000);
    pending.set(id,{op,at:details.at,resolve,reject,timer});
    try{port.postMessage(JSON.stringify({type:'nr-reminder-request',version:1,id,op,...details}))}
    catch(e){clearTimeout(timer);pending.delete(id);reject(Error('connection_lost'))}
  });
}
function scheduleAt(title,at){
  title=String(title||'').trim();
  if(!Number.isSafeInteger(at)||at<=Date.now()||at-Date.now()>366*86400000||!title||title.length>100)return Promise.reject(Error('invalid_plan'));
  return request('schedule',{title,at});
}
function schedule(plan){return scheduleAt(plan?.priority,host.NRPlanCalendar?.instant(plan?.date,plan?.time))}
host.NRNativeReminder=Object.freeze({get available(){return !!port},schedule,scheduleAt,cancel:()=>request('cancel'),status:()=>request('status')});
host.addEventListener('pagehide',()=>{if(bootstrap){clearTimeout(bootstrap.timer);bootstrap.port.close();bootstrap=null}disconnect()});
})(globalThis);
