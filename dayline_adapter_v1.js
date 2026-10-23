(function(root){
'use strict';
function build({date,lat,lon,zone}){
 if(date<'2017-01-01'||date>'2028-12-31')throw Error('OUTSIDE_RESEARCH_TIME_RANGE');
 const civil=root.SkyRhythmCivil,core=root.MeeusCore;
 const start=civil.sunrise(date,lat,lon,zone);
 const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 const end=civil.sunrise(next.toISOString().slice(0,10),lat,lon,zone);
 const base={date,zone,lat,lon,scope:'computed_calendar_not_forecast_or_festival_decision',physical_uncertainty_ms:null,engine:core.version,events:[]};
 if(!start||!end)return {...base,status:'no_sunrise_interval',start:start?.toISOString()??null,end:end?.toISOString()??null};
 const a=+start,b=+end;if(b<=a)throw Error('INVALID_INTERVAL');
 // Same TT-UTC assumption as the accepted research replay. Future leap
 // seconds are not predicted; this is explicitly a provisional convention.
 base.time_convention={tt_minus_utc_seconds:69.184,status:'research_assumption_future_leap_seconds_not_known'};
 const at=t=>core.panchangaAt(t+69184),initial=at(a),events=[];
 // Conservative 60 s survey (previously 300 s); no transition count is certified from sampling alone. Numerical
 // bracket is not an estimate of physical uncertainty. End belongs to next day.
 // Audit 22.10 (perf): one engine call per 60 s step serves all four labels; per-kind bisection unchanged,
 // so events are byte-identical to the per-kind scan (verified on 2017-2028 samples, see audit evidence).
 const kinds=['tithi','nakshatra','yoga','karana'],value={...initial};let left=a;
 while(left<b){const right=Math.min(left+60000,b),sample=at(right);
  for(const kind of kinds){const after=sample[kind];
   if(after!==value[kind]){let lo=left,hi=right;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(at(mid)[kind]===value[kind])lo=mid;else hi=mid;}
    if(hi<b)events.push({kind,at:new Date(hi).toISOString(),from:value[kind],to:at(hi)[kind],position:(hi-a)/(b-a),numerical_bracket_ms:hi-lo});
   }value[kind]=after;}
  left=right;
 }
 events.sort((x,y)=>x.at.localeCompare(y.at)||x.kind.localeCompare(y.kind));
 return {...base,status:'available',start:start.toISOString(),end:end.toISOString(),initial,events};
}
root.SkyRhythmDayLine=Object.freeze({build});
})(typeof window==='undefined'?globalThis:window);
