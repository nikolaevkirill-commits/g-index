/* Live research input adapter. Existing Astronomy Engine is read, never changed. */
(function(root){'use strict';
function shift(date,n){const d=new Date(date+'T12:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function build({date,lat,lon,zone,elevation_m=null,horizon_convention='level_no_dip_v1',nishita_profile='night_fifteenth_v1'},event='sankashti'){
 if(elevation_m!==null&&(!Number.isFinite(elevation_m)||elevation_m< -500||elevation_m>10000))throw Error('INVALID_ELEVATION');
 if(horizon_convention!=='level_no_dip_v1')throw Error('UNSUPPORTED_HORIZON_CONVENTION');
 if(nishita_profile!=='night_fifteenth_v1')throw Error('UNSUPPORTED_NISHITA_PROFILE');
 if(!['sankashti','masik_shivaratri'].includes(event))throw Error('UNSUPPORTED_EVENT');
 const C=root.SkyRhythmCivil,A=root.Astronomy,first=C.dayIntervals(date,zone);
 // Validate location through the existing strict adapter, even if no rise exists.
 C.sunrise(date,lat,lon,zone);if(first.status!=='available')throw Error(first.status);
 const tithi=event==='sankashti'?19:29,seed=new Date(+first.start-2*864e5);
 let start=A.SearchMoonPhase((tithi-1)*12,seed,35)?.date;
 if(!start)throw Error('MISSING_TITHI');
 let end=A.SearchMoonPhase(tithi*12,new Date(+start+1000),3)?.date;
 if(end&&+end<=+first.start){start=A.SearchMoonPhase((tithi-1)*12,new Date(+end+1000),35)?.date;end=start&&A.SearchMoonPhase(tithi*12,new Date(+start+1000),3)?.date;}
 if(!start||!end)throw Error('MISSING_TITHI');
 const from=shift(C.civilDay(start,zone),-1),to=shift(C.civilDay(end,zone),1),days=[];
 const observer=new A.Observer(lat,lon,0);
 for(let d=from;d<=to;d=shift(d,1)){
  const iv=C.dayIntervals(d,zone),sr=C.sunrise(d,lat,lon,zone);
  const rise=(body,direction)=>{const r=A.SearchRiseSet(body,observer,direction,iv.start,(iv.end-iv.start)/864e5);return r&&+r.date<+iv.end?+r.date:null;};
  const ss=rise('Sun',-1),next=C.sunrise(shift(d,1),lat,lon,zone);
  days.push({date:d,sunrise:sr?+sr:null,moonrise:rise('Moon',1),nishita:ss!==null&&next&&+next>ss?[ss+(+next-ss)*7/15,ss+(+next-ss)*8/15]:null});
 }
 return {event,tithi,place:{lat,lon,zone,elevation_m,elevation_status:elevation_m===null?'UNSPECIFIED':'PROVIDED',calculation_elevation_m:0,horizon_convention},start:+start,end:+end,days,astronomy:{regime_id:'astronomy_engine_2_1_19_live_v1',nishita_profile,horizon_convention,elevation_effect:'not_applied_no_horizon_dip_model',engine:'Astronomy Engine 2.1.19',convention:'Apparent upper limb / standard refraction / sea level; Nishita 7/15..8/15 of sunset-to-next-sunrise night',physical_uncertainty_ms:null,time_limit:'Library time model; no independently established physical error budget'},search_date:date};
}
root.SRFestivalAstronomy=Object.freeze({build});
})(window);
