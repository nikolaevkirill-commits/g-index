/* Presentation-only civil-day adapter. No consumer score or festival rules. */
(function(root){
  'use strict';
  function civilDay(date, zone){
    const parts=new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=k=>parts.find(p=>p.type===k).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function validate(date,lat,lon,zone){
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('BAD_DATE');
    const d=new Date(date+'T00:00:00Z');
    if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date)throw new Error('BAD_DATE');
    if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('BAD_COORDINATES');
    if(typeof zone!=='string'||!zone.trim())throw new Error('BAD_ZONE');
    try{civilDay(d,zone);}catch(_){throw new Error('BAD_ZONE');}
    return d;
  }
  function sunrise(date,lat,lon,zone){
    const start=validate(date,lat,lon,zone), A=root.Astronomy;
    if(!A?.SearchRiseSet||!A?.Observer)throw new Error('NO_ENGINE');
    const observer=new A.Observer(lat,lon,0);
    let cursor=new Date(+start-16*3600000);
    for(let i=0;i<5;i++){
      const result=A.SearchRiseSet('Sun',observer,1,cursor,4);
      if(!result)return null;
      const d=new Date(result.date);
      if(!Number.isFinite(+d))throw new Error('BAD_ENGINE_RESULT');
      const day=civilDay(d,zone);
      if(day===date)return d;
      if(day>date)return null;
      cursor=new Date(+d+60000);
    }
    return null;
  }
  function atSunrise(date,lat,lon,zone){
    const rise=sunrise(date,lat,lon,zone);
    if(!rise)return {status:'no_sunrise',date,zone,sunrise:null,tithi:null,end:null};
    const A=root.Astronomy;
    if(!A?.PairLongitude||!A?.SearchMoonPhase)throw new Error('NO_ENGINE');
    const angle=((A.PairLongitude('Moon','Sun',rise)%360)+360)%360;
    if(!Number.isFinite(angle))throw new Error('BAD_ENGINE_RESULT');
    const tithi=Math.floor(angle/12)+1;
    const boundary=A.SearchMoonPhase((tithi*12)%360,rise,3);
    const end=boundary?new Date(boundary.date):null;
    if(end&&(!Number.isFinite(+end)||end<=rise))throw new Error('BAD_ENGINE_RESULT');
    return {status:end?'available':'missing_boundary',date,zone,sunrise:rise,tithi,angle,end,scope:'sunrise_day_label_not_festival_rule'};
  }
  function dayIntervals(date,zone){
    const nominal=validate(date,0,0,zone),A=root.Astronomy;
    if(!A?.PairLongitude||!A?.SearchMoonPhase)throw new Error('NO_ENGINE');
    // Find civil midnight instants instead of assuming a 24-hour day across DST.
    function edge(after){let lo=+nominal-16*3600000,hi=+nominal+36*3600000;
      while(hi-lo>1){const mid=Math.floor((lo+hi)/2),key=civilDay(new Date(mid),zone);
        if(after?key<=date:key<date)lo=mid;else hi=mid;}
      return new Date(hi);
    }
    const start=edge(false),end=edge(true);
    if(civilDay(start,zone)!==date)return {status:'skipped_civil_date',date,zone,segments:[]};
    let cursor=start,angle=((A.PairLongitude('Moon','Sun',cursor)%360)+360)%360;
    if(!Number.isFinite(angle))throw new Error('BAD_ENGINE_RESULT');
    let tithi=Math.floor(angle/12)+1;const segments=[];
    for(let i=0;i<6&&cursor<end;i++){
      const found=A.SearchMoonPhase((tithi*12)%360,new Date(+cursor+1),3);
      if(!found)throw new Error('MISSING_BOUNDARY');
      const boundary=new Date(found.date);
      if(!Number.isFinite(+boundary)||boundary<=cursor)throw new Error('BAD_ENGINE_RESULT');
      const stop=boundary<end?boundary:end;
      segments.push({tithi,start:new Date(cursor),end:new Date(stop)});
      cursor=stop;tithi=tithi%30+1;
    }
    if(+cursor!==+end)throw new Error('INCOMPLETE_DAY');
    return {status:'available',date,zone,start,end,segments,scope:'astronomical_tithi_intervals_not_religious_observances'};
  }
  root.SkyRhythmCivil=Object.freeze({civilDay,sunrise,atSunrise,dayIntervals});
})(typeof window==='undefined'?globalThis:window);
