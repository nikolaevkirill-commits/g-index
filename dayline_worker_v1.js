'use strict';
importScripts('./astronomy-engine-2.1.19.min.js','./meeus_core_v1.js','./lunar_core_v1.js?v=fp572','./panchanga_civil_adapter.js','./dayline_adapter_v1.js?v=fp572-lunar');
self.onmessage=({data})=>{
 try{self.postMessage({id:data.id,result:SkyRhythmDayLine.build(data.input)});}
 catch(error){self.postMessage({id:data.id,error:String(error?.message||error)});}
};
