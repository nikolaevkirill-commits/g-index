/* Machine keys are assembled from Gregorian Latin parts, never display strings. */
(function(root,factory){'use strict';const api=factory();root.NRCivilTime=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const cache=new Map();
 function parts(t,zone='Europe/Kyiv'){
  if(t===null||t===undefined||t==='')throw new RangeError('Missing civil instant');
  const d=new Date(t);if(!Number.isFinite(d.getTime()))throw new RangeError('Invalid civil instant');
  let f=cache.get(zone);if(!f){f=new Intl.DateTimeFormat('en',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',era:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(zone,f);}
  const p=Object.fromEntries(f.formatToParts(d).map(x=>[x.type,x.value]));
  if(p.era!=='AD'||!/^\d{1,4}$/.test(p.year))throw new RangeError('Unsupported civil year');
  return p;
 }
 const day=p=>p.year.padStart(4,'0')+'-'+p.month.padStart(2,'0')+'-'+p.day.padStart(2,'0');
 const clock=p=>p.hour.padStart(2,'0')+':'+p.minute.padStart(2,'0')+':'+p.second.padStart(2,'0');
 return Object.freeze({dayKey:(t,zone)=>day(parts(t,zone)),minuteKey:(t,zone)=>{const p=parts(t,zone);return day(p)+'T'+clock(p).slice(0,5);},clockKey:(t,zone)=>clock(parts(t,zone))});
});
