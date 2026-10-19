/* Local integration candidate. Reads existing Panchanga; never writes consumer scores. */
(function(root){
 'use strict';
 function resolve(input){
   const civil=root.SkyRhythmCivil;
   if(!civil||typeof root.computePanchanga!=='function')throw new Error('NO_ENGINE');
   const result=civil.atSunrise(input.date,input.lat,input.lon,input.zone);
   if(!result.sunrise)return result;
   const p=root.computePanchanga(result.sunrise);
   // Engines can disagree near a boundary: expose it, never silently combine labels.
   const conflict=p.tithi.num!==result.tithi;
   return {...result,status:conflict?'conflicting':result.status,
     engineTithi:p.tithi.num,
     components:{tithi:{num:result.tithi,name:conflict?null:p.tithi.name},
       nakshatra:{num:p.nakshatra.num,name:p.nakshatra.name},
       yoga:{num:p.yoga.num,name:p.yoga.name},
       karana:conflict?null:{name:p.karana.name,nameEn:p.karana.nameEn}},
     ayanamsha:'Lahiri (existing app engine)',
     scope:'astronomical presentation; not consumer score or festival rules'};
 }
 root.SkyRhythmPanchanga=Object.freeze({resolve});

})(window);
