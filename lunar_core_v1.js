/* Shared lunar-calendar source (FP572 audit). One convention for every screen that shows a tithi,
   nakshatra, yoga or karana boundary: «Сьогодні», «Лінія дня», Панчанга and the personal line.
   Presentation only: the consumer score, frozen engine and expert registry never read this module.

   Convention (all values are stated, none is tuned to an expert calendar):
   - ephemeris: Astronomy Engine 2.1.19, geocentric, true ecliptic of date;
   - Moon: EclipticGeoMoon; Sun: apparent (aberration on), like Swiss Ephemeris default flags;
   - time scale: TT = UTC + 32.184 s + leap seconds. From 2017-01-01 that is 69.184 s (37 leap
     seconds) and stays an assumption after the next announced leap second. Astronomy Engine's built-in
     ΔT extrapolation gives ~75.2 s for 2026 and would place every boundary ~6 s early, so the
     terrestrial time is set explicitly. 1972–2016 use the published leap-second table (birth dates);
     before 1972 there is no UTC with leap seconds and the library ΔT model (TT − UT1) is used;
   - ayanamsha: Swiss SIDM_LAHIRI mean value (quadratic fit, residual <0.001″ for 1900–2100) plus
     nutation in longitude, so «true longitude of date − ayanamsha» equals Swiss FLG_SIDEREAL.
   Reference: Swiss Ephemeris 2.10.03 with DE431 files, 22 346 boundaries of 2017–2028
   (tools/public/fixtures/lunar_reference_swiss_de431.json, tools/public/verify_lunar_core.cjs).
   `model_tolerance_ms` is the largest observed difference to that reference; it is an agreement of
   two models and is not a physical error budget (`physical_uncertainty_ms` stays null). */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 // The engine is resolved on every call: in the page this script may run before the deferred library.
 const engine=node?(lib=>()=>lib)(require('./astronomy-engine-2.1.19.min.js')):()=>root.Astronomy;
 const api=factory(engine);
 if(node)module.exports=api;
 root.SkyRhythmLunar=api;
})(typeof globalThis==='undefined'?this:globalThis,function(engine){'use strict';
 const TT_MS=69184,J2000_MS=Date.UTC(2000,0,1,12),DAY=86400000,N=360/27;
 const KARANA_MOVABLE=['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'],KARANA_FIXED=['Shakuni','Chatushpada','Naga'];
 const mod=x=>((x%360)+360)%360;
 const available=()=>{const A=engine();return !!(A&&A.AstroTime&&typeof A.AstroTime.FromTerrestrialTime==='function'&&A.EclipticGeoMoon&&A.GeoVector&&A.Ecliptic&&A.e_tilt);};
 // TAI − UTC from the IERS leap-second table: [first UTC millisecond, seconds]. 37 s since 2017-01-01.
 const LEAP=[['1972-01-01',10],['1972-07-01',11],['1973-01-01',12],['1974-01-01',13],['1975-01-01',14],['1976-01-01',15],['1977-01-01',16],
  ['1978-01-01',17],['1979-01-01',18],['1980-01-01',19],['1981-07-01',20],['1982-07-01',21],['1983-07-01',22],['1985-07-01',23],
  ['1988-01-01',24],['1990-01-01',25],['1991-01-01',26],['1992-07-01',27],['1993-07-01',28],['1994-07-01',29],['1996-01-01',30],
  ['1997-07-01',31],['1999-01-01',32],['2006-01-01',33],['2009-01-01',34],['2012-07-01',35],['2015-07-01',36],['2017-01-01',37]]
  .map(([date,seconds])=>[Date.parse(date+'T00:00:00Z'),seconds]);
 // TT − UTC in milliseconds, or null before 1972 where the library ΔT (TT − UT1) applies.
 function ttMinusUtcMs(utcMs){
  if(utcMs>=LEAP[LEAP.length-1][0])return TT_MS;
  if(utcMs<LEAP[0][0])return null;
  let seconds=LEAP[0][1];for(const [from,value] of LEAP){if(utcMs<from)break;seconds=value;}
  return seconds*1000+32184;
 }
 // Astronomy Engine time whose TERRESTRIAL time is exactly UTC + (TT − UTC).
 function time(utcMs){
  if(!Number.isFinite(utcMs))throw Error('Некоректний момент часу.');
  if(!available())throw Error('NO_ENGINE');
  const offset=ttMinusUtcMs(utcMs);
  return offset===null?engine().MakeTime(new Date(utcMs)):engine().AstroTime.FromTerrestrialTime((utcMs+offset-J2000_MS)/DAY);
 }
 function ayanamshaAt(at){const T=at.tt/365.25;return 23.8570923254552+0.0139688794*T+3.07096226e-8*T*T+engine().e_tilt(at).dpsi/3600;}
 const moonTrue=at=>engine().EclipticGeoMoon(at).lon;
 const bodyTrue=(at,body)=>{const A=engine();return A.Ecliptic(A.GeoVector(body,at,true)).elon;};
 const moonAt=at=>mod(moonTrue(at)-ayanamshaAt(at));
 const bodyAt=(at,body)=>mod(bodyTrue(at,body)-ayanamshaAt(at));
 function moonLongitude(utcMs){return moonAt(time(utcMs));}
 function bodyLongitude(utcMs,body){const at=time(utcMs);return body==='Moon'?moonAt(at):bodyAt(at,body);}
 function elongation(utcMs){const at=time(utcMs);return mod(moonTrue(at)-bodyTrue(at,'Sun'));}
 function karanaName(k){return k===0?'Kimstughna':k<=56?KARANA_MOVABLE[(k-1)%7]:KARANA_FIXED[k-57];}
 function at(utcMs){
  const t=time(utcMs),ayanamsha=ayanamshaAt(t),moonLon=moonTrue(t),sunLon=bodyTrue(t,'Sun');
  const moon=mod(moonLon-ayanamsha),sun=mod(sunLon-ayanamsha),phase=mod(moonLon-sunLon),k=Math.min(59,Math.floor(phase/6));
  return {tithi:Math.min(30,Math.floor(phase/12)+1),nakshatra:Math.min(27,Math.floor(moon/N)+1),pada:Math.min(4,Math.floor((moon%N)/(N/4))+1),
   yoga:Math.min(27,Math.floor(mod(sun+moon)/N)+1),karana:karanaName(k),karana_index:k,phase_deg:phase,
   moon_longitude_sidereal:moon,sun_longitude_sidereal:sun,ayanamsha_with_nutation:ayanamsha};
 }
 const convention=Object.freeze({
  id:'lunar_core_v1',ephemeris:'astronomy-engine 2.1.19',frame:'geocentric true ecliptic of date; Sun apparent (aberration on)',
  tt_minus_utc_seconds:TT_MS/1000,tt_status:'32.184 s + leap seconds: 69.184 s from 2017-01-01 (assumption after the next leap second); table 1972–2016; library ΔT before 1972',
  ayanamsha:'Swiss SIDM_LAHIRI mean (quadratic fit) + nutation in longitude',
  reference:'Swiss Ephemeris 2.10.03, DE431 (sepl_18/semo_18), 2017–2028',
  model_tolerance_ms:Object.freeze({nakshatra:7000,tithi:9000,karana:9000,yoga:8000}),
  physical_uncertainty_ms:null});
 return Object.freeze({version:'lunar_core_v1',TT_MS,available,ttMinusUtcMs,time,ayanamshaAt,moonLongitude,bodyLongitude,elongation,karanaName,at,convention});
});
