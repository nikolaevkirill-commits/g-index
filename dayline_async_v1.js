(function(root){'use strict';
const workerURL=new URL('dayline_worker_v1.js',document.currentScript.src);
let worker=null,pending=null,sequence=0;
function finish(error,result){if(!pending)return;const job=pending;pending=null;clearTimeout(job.timer);error?job.reject(error):job.resolve(result);}
function reset(error){if(worker){worker.terminate();worker=null;}finish(error);}
function build(input){
 const key=JSON.stringify([input.date,input.lat,input.lon,input.zone]);
 if(pending?.key===key)return pending.promise;
 if(pending)reset(Error('SUPERSEDED_DAYLINE_REQUEST'));
 if(typeof Worker==='undefined')return Promise.reject(Error('DAYLINE_WORKER_UNAVAILABLE'));
 if(!worker){try{worker=new Worker(workerURL);worker.onmessage=({data})=>{if(pending?.id===data.id)finish(data.error?Error(data.error):null,data.result);};worker.onerror=e=>{e.preventDefault();reset(Error('DAYLINE_WORKER_FAILED'));};}catch(_){return Promise.reject(Error('DAYLINE_WORKER_UNAVAILABLE'));}}
 let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 pending={key,id:++sequence,promise,resolve,reject,timer:setTimeout(()=>reset(Error('DAYLINE_WORKER_TIMEOUT')),30000)};
 try{worker.postMessage({id:pending.id,input});}catch(error){reset(error);}
 return promise;
}
root.SRDayLineAsync=Object.freeze({build});
})(window);
