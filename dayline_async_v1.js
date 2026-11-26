(function(root){'use strict';
const workerURL=new URL('dayline_worker_v1.js?v=fp572-lunar',document.currentScript.src);
function builder(oneShot=false){
 let worker=null,pending=null,sequence=0;
 function close(){if(worker){worker.terminate();worker=null;}}
 function finish(error,result){
  if(!pending)return;
  const job=pending;pending=null;clearTimeout(job.timer);
  if(error||oneShot)close();
  error?job.reject(error):job.resolve(result);
 }
 return function build(input){
  const key=JSON.stringify([input.date,input.lat,input.lon,input.zone,!!input.includeCivil]);
  if(pending?.key===key)return pending.promise;
  if(pending)finish(Error('SUPERSEDED_DAYLINE_REQUEST'));
  if(typeof Worker==='undefined')return Promise.reject(Error('DAYLINE_WORKER_UNAVAILABLE'));
  if(!worker){
   try{
    worker=new Worker(workerURL);
    worker.onmessage=({data})=>{if(pending?.id===data.id)finish(data.error?Error(data.error):null,data.result);};
    worker.onerror=e=>{e.preventDefault();close();finish(Error('DAYLINE_WORKER_FAILED'));};
   }catch(_){return Promise.reject(Error('DAYLINE_WORKER_UNAVAILABLE'));}
  }
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const id=++sequence;
  pending={key,id,promise,resolve,reject,timer:setTimeout(()=>finish(Error('DAYLINE_WORKER_TIMEOUT')),30000)};
  try{worker.postMessage({id,input});}catch(error){finish(error);}
  return promise;
 };
}
root.SRDayLineAsync=Object.freeze({build:builder(),buildUpcoming:builder(true)});
})(window);
