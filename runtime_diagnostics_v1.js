// Local bounded diagnostics. No payload, message, stack, storage, or network transmission.
(function(host){
  'use strict';
  const counts=Object.create(null),recent=[];let total=0,dropped=0;
  const categories=new Set(['expected_optional','recoverable','invariant']);
  function record(site,category,error){
    if(typeof site!=='string'||! /^[a-z0-9_.-]{1,64}$/.test(site)||!categories.has(category))return false;
    const key=category+':'+site;
    if(!Object.prototype.hasOwnProperty.call(counts,key)&&Object.keys(counts).length>=64){dropped++;return false}
    counts[key]=Math.min(Number.MAX_SAFE_INTEGER,(counts[key]||0)+1);total=Math.min(Number.MAX_SAFE_INTEGER,total+1);
    recent.push(Object.freeze({site,category,at:Date.now()}));if(recent.length>32)recent.shift();return true;
  }
  function snapshot(){return Object.freeze({total,dropped,counts:Object.freeze({...counts}),recent:Object.freeze(recent.slice())})}
  function invoke(handlers,name){
    if(!Object.prototype.hasOwnProperty.call(handlers,name))throw new TypeError('Unknown diagnostic handler');
    const fn=handlers[name];if(typeof fn!=='function'){record('probe.missing','expected_optional');return false}
    fn();return true;
  }
  host.NRDiagnostics=Object.freeze({record,snapshot,invoke});
})(window);
