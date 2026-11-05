(function(host){
'use strict';
if(host.NRUpdateCoordinator)return;
const HOLD_MS=3500,WAIT_MS=2000,active=new Set();
const nativeFetch=host.fetch?.bind(host),scope=new URL('./',host.location.href).pathname;
const sender=Math.random().toString(36).slice(2);let channel=null,until=0,current=null;
const pause=()=>{until=Math.max(until,Date.now()+HOLD_MS)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const post=data=>{try{channel?.postMessage({...data,sender})}catch(_){}};
function localRead(input,init){
 try{return String(init?.method||input?.method||'GET').toUpperCase()==='GET'&&new URL(typeof input==='string'||input instanceof URL?String(input):input.url,host.location.href).origin===host.location.origin}catch(_){return false}
}
if(nativeFetch)host.fetch=function(input,init){
 if(!localRead(input,init))return nativeFetch(input,init);
 const run=()=>{const p=nativeFetch(input,init);active.add(p);p.then(()=>active.delete(p),()=>active.delete(p));return p};
 if(Date.now()>=until)return run();
 return (async()=>{const signal=init?.signal||input?.signal;while(Date.now()<until){if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');await sleep(Math.min(50,until-Date.now()));}if(signal?.aborted)throw signal.reason||new DOMException('Aborted','AbortError');return run()})();
};
async function drain(){const end=Date.now()+WAIT_MS;while(active.size&&Date.now()<end)await sleep(20);return active.size===0}
try{
 channel=new BroadcastChannel('skyrhythm-update-v1:'+scope);
 channel.onmessage=async({data})=>{
  if(!data||data.sender===sender||typeof data.id!=='string')return;
  if(data.type==='prepare'){
   pause();post({type:'preparing',id:data.id});const ready=await drain();post({type:'ready',id:data.id,ready});
  }else if(current?.id===data.id){
   if(data.type==='preparing')current.peers.set(data.sender,false);
   if(data.type==='ready')current.peers.set(data.sender,data.ready===true);
  }
 };
}catch(_){/* A single-tab fallback remains available when BroadcastChannel is disabled. */}
async function prepare(){
 if(current)return current.promise;
 pause();const job={id:sender+'-'+Date.now(),peers:new Map()};current=job;
 job.promise=(async()=>{
  post({type:'prepare',id:job.id});const started=Date.now();
  // Allow peers to announce themselves, then wait for their in-flight reads to settle.
  while(Date.now()-started<WAIT_MS){
   if(Date.now()-started>=150&&active.size===0&&[...job.peers.values()].every(Boolean))return true;
   await sleep(20);
  }
  return false;
 })().finally(()=>{if(current===job)current=null});
 return job.promise;
}
host.NRUpdateCoordinator=Object.freeze({prepare});
})(window);
