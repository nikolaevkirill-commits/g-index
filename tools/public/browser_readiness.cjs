// Test-only synchronization. Page clock may be paused; the Node deadline must keep running.
'use strict';
function trackDataRequests(page){
 const pending=new Set();let generation=0;
 const started=r=>{if(['fetch','xhr'].includes(r.resourceType())){pending.add(r);generation++;}};
 const finished=r=>{if(pending.delete(r))generation++;};
 page.on('request',started);page.on('requestfinished',finished);page.on('requestfailed',finished);
 return {
  async idle(timeout=10000){
   const end=Date.now()+timeout;let settled=-1;
   while(Date.now()<end){
    // Two Node turns with no outstanding data bodies. Worker scripts/images do not overwrite feeds.
    if(!pending.size&&settled===generation)return;
    settled=pending.size?-1:generation;
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   throw Error('Data requests did not settle: '+[...pending].map(r=>r.method()+' '+new URL(r.url()).pathname).join(', '));
  },
  dispose(){page.off('request',started);page.off('requestfinished',finished);page.off('requestfailed',finished);}
 };
}
module.exports={trackDataRequests};
