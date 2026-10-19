/* Own astronomical calendar; no PDF, score, or religious observance authority. */
(function(root){'use strict';
const VERSION='sky-civil-astronomy-v1';
function nextDate(s){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function day(input){
 const {date,lat,lon,zone}=input,A=root.Astronomy,C=root.SkyRhythmCivil;
 // Existing strict adapter validates date, zone and coordinates.
 const sunrise=C.sunrise(date,lat,lon,zone),iv=C.dayIntervals(date,zone);
 if(iv.status!=='available')return {version:VERSION,date,zone,status:iv.status,events:[],tithis:[],religious_events_status:'rules_not_verified'};
 const observer=new A.Observer(lat,lon,0),events=[];
 const add=(kind,t)=>{if(t&&+t>=+iv.start&&+t<+iv.end)events.push({kind,at:new Date(t).toISOString()});};
 add('sunrise',sunrise);
 // Every rise/set inside [start,end): at high latitudes a civil day can hold two sunsets or two moonsets.
 const all=(body,direction)=>{const found=[];let from=iv.start;for(let i=0;i<4;i++){const left=(iv.end-from)/864e5;if(left<=0)break;const r=A.SearchRiseSet(body,observer,direction,from,left);if(!r)break;const t=new Date(r.date);if(+t>=+iv.end)break;found.push(t);from=new Date(+t+60000);}return found;};
 const sunsets=all('Sun',-1),sunset=sunsets.length?sunsets[sunsets.length-1]:null;
 for(const t of sunsets)add('sunset',t);for(const t of all('Moon',1))add('moonrise',t);for(const t of all('Moon',-1))add('moonset',t);
 for(const t of all('Sun',1))if(!sunrise||Math.abs(t-sunrise)>60000)add('sunrise',t); // the first sunrise comes from the strict adapter
 const transit=A.SearchHourAngle('Sun',observer,0,iv.start,1);add('solar_transit',transit?.time?.date);
 for(const [angle,kind] of [[0,'new_moon'],[90,'first_quarter'],[180,'full_moon'],[270,'last_quarter']]){const r=A.SearchMoonPhase(angle,iv.start,(iv.end-iv.start)/864e5);add(kind,r?.date);}
 let nightMidpoint=null;
 if(sunset){const next=C.sunrise(nextDate(date),lat,lon,zone);if(next&&next>sunset)nightMidpoint=new Date((+sunset+ +next)/2).toISOString();}
 events.sort((a,b)=>a.at.localeCompare(b.at));
 return {version:VERSION,date,zone,lat,lon,status:sunrise?'available':'no_sunrise',civil_start:iv.start.toISOString(),civil_end:iv.end.toISOString(),events,tithis:iv.segments.map(s=>({tithi:s.tithi,start:s.start.toISOString(),end:s.end.toISOString()})),night_midpoint_after_sunset:nightMidpoint,conventions:{rise_set:'Astronomy Engine observational upper limb/refraction, sea-level observer',solar_noon:'upper meridian transit, not sunrise/sunset midpoint',night_midpoint:'midpoint between sunset and next civil-date sunrise; not a ritual window'},religious_events_status:'rules_not_verified',source:'computed_without_calendar_PDF'};
}
function month({year,month,lat,lon,zone}){
 if(!Number.isInteger(year)||year<1900||year>2100||!Number.isInteger(month)||month<1||month>12)throw new Error('INVALID_MONTH');
 const days=[];const count=new Date(Date.UTC(year,month,0)).getUTCDate();
 for(let d=1;d<=count;d++)days.push(day({date:String(year)+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0'),lat,lon,zone}));
 return {schema:VERSION,year,month,zone,lat,lon,days,religious_events_status:'rules_not_verified'};
}
root.SkyRhythmOwnCalendar=Object.freeze({day,month,version:VERSION});
})(typeof window==='undefined'?globalThis:window);
