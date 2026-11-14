(function(root){
'use strict';
const TT_MS=69184;
// FP572: boundaries come from the shared lunar source (lunar_core_v1.js), the same one the personal line
// uses, so one event has one instant on every screen. MeeusCore stays only as a labelled fallback when the
// ephemeris library is missing; its tithi/karana boundaries differ from Swiss DE431 by up to ~105 s.
function source(){
 const lunar=root.SkyRhythmLunar;
 if(lunar?.available?.())return {id:lunar.version,at:t=>lunar.at(t),convention:lunar.convention};
 return {id:root.MeeusCore.version,at:t=>root.MeeusCore.panchangaAt(t+TT_MS),convention:null};
}
function scan(a,b,at=source().at){
 const initial=at(a),events=[];
 // Conservative 60 s survey (previously 300 s); no transition count is certified from sampling alone. Numerical
 // bracket is not an estimate of physical uncertainty. End belongs to next day.
 // Audit 22.10 (perf): one engine call per 60 s step serves all four labels; per-kind bisection unchanged,
 // so events are byte-identical to the per-kind scan (verified on 2017-2028 samples, see audit evidence).
 // The guard checks sampled elongation increments. It does not establish
 // continuous monotonicity of all three angles between samples.
 const kinds=['tithi','nakshatra','yoga','karana'],value={...initial};let left=a,phase=initial.phase_deg;
 while(left<b){const right=Math.min(left+60000,b),sample=at(right),advance=((sample.phase_deg-phase)%360+360)%360;
  if(right-left>=1000&&!(advance>0&&advance<0.02))throw Error('NON_MONOTONIC_LUNAR_SURVEY');
  phase=sample.phase_deg;
  for(const kind of kinds){const after=sample[kind];
   if(after!==value[kind]){let lo=left,hi=right;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(at(mid)[kind]===value[kind])lo=mid;else hi=mid;}
    if(hi<b)events.push({kind,at:new Date(hi).toISOString(),from:value[kind],to:at(hi)[kind],position:(hi-a)/(b-a),numerical_bracket_ms:hi-lo});
   }value[kind]=after;}
  left=right;
 }
 events.sort((x,y)=>x.at.localeCompare(y.at)||x.kind.localeCompare(y.kind));
 return {initial,events,coverage:'one_minute_survey_with_root_refinement'};
}
function build({date,lat,lon,zone,includeCivil=false}){
 if(date<'2017-01-01'||date>'2028-12-31')throw Error('OUTSIDE_RESEARCH_TIME_RANGE');
 const calendar=root.SkyRhythmCivil,core=source(),at=core.at;
 const start=calendar.sunrise(date,lat,lon,zone);
 const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 const end=calendar.sunrise(next.toISOString().slice(0,10),lat,lon,zone);
 const base={date,zone,lat,lon,scope:'computed_calendar_not_forecast_or_festival_decision',physical_uncertainty_ms:null,engine:core.id,events:[]};
 const bounds={start:start?.toISOString()??null,end:end?.toISOString()??null};
 let result={...base,status:'no_sunrise_interval',...bounds};
 if(start&&end){
  if(+end<=+start)throw Error('INVALID_INTERVAL');
  // Keep the existing TT-UTC assumption for both calendar views.
  const time_convention={tt_minus_utc_seconds:TT_MS/1000,status:'research_assumption_future_leap_seconds_not_known',
   ...(core.convention?{source:core.convention.id,model_tolerance_ms:core.convention.model_tolerance_ms,reference:core.convention.reference}:{source:core.id,model_tolerance_ms:null,reference:null})};
  result={...base,time_convention,status:'available',...bounds,...scan(+start,+end,at)};
 }
 if(!includeCivil)return result;
 let civil;
 try{civil=calendar.dayIntervals(date,zone);}
 catch(_){return {...result,civil:{status:'unavailable'}};}
 if(civil.status!=='available')return {...result,civil:{status:civil.status}};
 const a=+civil.start,b=+civil.end;
 // Reuse the sunrise scan for its overlap. Before sunrise, scan only the missing part.
 let series;
 if(result.status==='available'&&a<=+start&&+start<b&&+end>=b){
  const prefix=a<+start?scan(a,+start+1,at):{initial:result.initial,events:[]};
  const events=[...prefix.events,...result.events.filter(event=>Date.parse(event.at)<b)];
  series={initial:prefix.initial,events:events.map(event=>({...event,position:(Date.parse(event.at)-a)/(b-a)}))};
 }else series=scan(a,b,at);
 return {...result,civil:{status:'available',start:civil.start.toISOString(),end:civil.end.toISOString(),...series}};
}
root.SkyRhythmDayLine=Object.freeze({build});
})(typeof window==='undefined'?globalThis:window);
