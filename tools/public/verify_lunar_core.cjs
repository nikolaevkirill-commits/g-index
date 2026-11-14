'use strict';
// FP572: one lunar source for every screen, checked against Swiss Ephemeris DE431.
// 1) every reference boundary of 2017–2028 is reproduced within the stated model tolerance;
// 2) the same event has the same millisecond in the day line, the Panchanga adapter and the personal line;
// 3) the superseded sources (Meeus core, geometric SearchMoonPhase, library ΔT) fail the same tolerance,
//    so this gate detects a regression to any of them.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=path.resolve(__dirname,'..','..');
globalThis.window=globalThis;
const A=require(path.join(app,'astronomy-engine-2.1.19.min.js'));globalThis.Astronomy=A;
const Meeus=require(path.join(app,'meeus_core_v1.js')),L=require(path.join(app,'lunar_core_v1.js'));
require(path.join(app,'panchanga_civil_adapter.js'));require(path.join(app,'dayline_adapter_v1.js'));
const Personal=require(path.join(app,'personal_dayline_model.js'));
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','lunar_reference_swiss_de431.json'),'utf8'));
const kinds=['nakshatra','tithi','yoga','karana'],tolerance=L.convention.model_tolerance_ms;
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};

const shared=t=>{const p=L.at(t);return {nakshatra:p.nakshatra,tithi:p.tithi,yoga:p.yoga,karana:p.karana_index};};
const meeus=t=>{const p=Meeus.panchangaAt(t+69184);return {nakshatra:p.nakshatra,tithi:p.tithi,yoga:p.yoga,karana:Math.min(59,Math.floor(p.phase_deg/6))};};
const geometric=t=>({tithi:Math.floor(A.MoonPhase(new Date(t))/12)+1});
function boundary(at,kind,guess,after){
 let lo=guess-600000,hi=guess+600000;
 if(at(lo)[kind]===after||at(hi)[kind]!==after)return null;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(at(mid)[kind]===after)hi=mid;else lo=mid;}
 return hi;
}
function worst(at,kind,rows){let max=0,missing=0;for(const [t,after] of rows){const found=boundary(at,kind,t,after);if(found===null)missing++;else max=Math.max(max,Math.abs(found-t));}return {max,missing};}

// --- 1. Time scale: terrestrial time is exactly UTC + 69.184 s, not the library extrapolation.
const probe=Date.UTC(2026,3,16,8,29),j2000=Date.UTC(2000,0,1,12);
ok(Math.abs(L.time(probe).tt*86400000+j2000-(probe+69184))<0.01,'shared time must be TT = UTC + 69.184 s');
const library=A.MakeTime(new Date(probe));
ok((library.tt-library.ut)*86400-69.184>5,'control: the library ΔT model is expected to differ by more than 5 s in 2026');
// Birth dates: published leap seconds 1972–2016, library ΔT before UTC had leap seconds.
assert.equal(L.ttMinusUtcMs(Date.UTC(2017,0,1)),69184);assert.equal(L.ttMinusUtcMs(Date.UTC(2017,0,1)-1),68184);
assert.equal(L.ttMinusUtcMs(Date.UTC(1980,0,1)),51184);assert.equal(L.ttMinusUtcMs(Date.UTC(1972,0,1)),42184);assert.equal(L.ttMinusUtcMs(Date.UTC(1972,0,1)-1),null);
assert.equal(L.time(Date.UTC(1950,5,1)).tt,A.MakeTime(new Date(Date.UTC(1950,5,1))).tt);checks+=6;

// --- 2. Agreement with the Swiss DE431 reference on every boundary.
const report={};let total=0;
for(const kind of kinds){
 const rows=reference.boundaries[kind];total+=rows.length;
 const now=worst(shared,kind,rows);
 assert.equal(now.missing,0,kind+': every reference boundary must be found');
 ok(now.max<=tolerance[kind],`${kind}: ${now.max} ms exceeds the stated tolerance ${tolerance[kind]} ms`);
 // The tolerance must stay a tight statement, not a loose bound that would hide a regression.
 ok(now.max>=tolerance[kind]/2,`${kind}: tolerance ${tolerance[kind]} ms is looser than twice the observed ${now.max} ms`);
 const old=worst(meeus,kind,rows.filter((_,i)=>i%4===0));
 report[kind]={boundaries:rows.length,shared_max_ms:now.max,tolerance_ms:tolerance[kind],meeus_core_max_ms_quarter_sample:old.max};
 if(kind!=='nakshatra')ok(old.max>tolerance[kind]*5,`control: Meeus ${kind} boundaries are expected far outside the tolerance`);
 else ok(old.max>tolerance[kind],'control: Meeus nakshatra boundaries are expected outside the tolerance');
}
assert.equal(total,22346);
const phase=worst(geometric,'tithi',reference.boundaries.tithi.filter((_,i)=>i%4===0));
ok(phase.max>tolerance.tithi*2,'control: SearchMoonPhase without aberration is expected outside the tolerance');
report.geometric_phase_tithi_max_ms_quarter_sample=phase.max;

// --- 3. One event, one instant on every screen.
const places=[
 {name:'Kyiv',lat:50.454,lon:30.524,zone:'Europe/Kyiv',dates:['2026-04-16','2026-03-29','2026-10-25','2026-11-13']},
 {name:'Kathmandu',lat:27.7172,lon:85.324,zone:'Asia/Kathmandu',dates:['2026-04-16','2027-01-01']},
 {name:'Tromso',lat:69.6492,lon:18.9553,zone:'Europe/Oslo',dates:['2026-06-21','2026-12-21']},
 {name:'Barcelona',lat:41.3874,lon:2.1686,zone:'Europe/Madrid',dates:['2028-02-29']}
];
let compared=0;
for(const place of places)for(const date of place.dates){
 const main=SkyRhythmDayLine.build({date,lat:place.lat,lon:place.lon,zone:place.zone,includeCivil:true});
 assert.equal(main.engine,'lunar_core_v1');
 assert.equal(main.civil.status,'available',place.name+' '+date);
 const personal=Personal.build({date,place:{lat:place.lat,lon:place.lon,zone:place.zone},birth:null});
 assert.equal(personal.lunarSource,'lunar_core_v1');
 const civil=SkyRhythmCivil.dayIntervals(date,place.zone);
 assert.equal(civil.source,'lunar_core_v1');
 assert.equal(+civil.start,personal.day.start);assert.equal(+civil.end,personal.day.end);
 const mainAt=kind=>main.civil.events.filter(e=>e.kind===kind).map(e=>Date.parse(e.at));
 const personalNak=personal.series.events.filter(e=>e.from.nak!==e.to.nak).map(e=>e.at);
 const personalTithi=personal.tithis.events.map(e=>e.at);
 const civilTithi=civil.segments.slice(0,-1).map(s=>+s.end);
 assert.deepEqual(mainAt('nakshatra'),personalNak,`${place.name} ${date}: nakshatra instants differ between the day line and the personal line`);
 assert.deepEqual(mainAt('tithi'),personalTithi,`${place.name} ${date}: tithi instants differ between the day line and the personal line`);
 assert.deepEqual(civilTithi,personalTithi,`${place.name} ${date}: tithi instants differ between Panchanga and the personal line`);
 compared+=personalNak.length+personalTithi.length;checks+=3;
 // Labels agree at both sides of every boundary and at each hour of the civil day.
 for(const t of [...personalNak.flatMap(x=>[x-1,x]),...Array.from({length:Math.ceil((personal.day.end-personal.day.start)/3600000)},(_,i)=>personal.day.start+i*3600000)]){
  assert.equal(L.at(t).nakshatra,Personal.moon(t).nak+1);assert.equal(L.at(t).tithi,Personal.tithi(t).number);
 }
 if(main.status==='available'){
  const sunrise=SkyRhythmCivil.atSunrise(date,place.lat,place.lon,place.zone);
  assert.equal(sunrise.tithi,main.initial.tithi,`${place.name} ${date}: sunrise tithi differs between Panchanga and the day line`);checks++;
 }
}
ok(compared>=12,'cross-screen comparison must cover real boundaries');
// Polar day/night: the sunrise interval is absent, the civil day is still complete and labelled.
const polar=SkyRhythmDayLine.build({date:'2026-12-21',lat:69.6492,lon:18.9553,zone:'Europe/Oslo',includeCivil:true});
assert.equal(polar.status,'no_sunrise_interval');assert.equal(polar.civil.status,'available');checks+=2;

// --- 4. Control transition quoted in the audit brief (2026-04-16, Uttara Bhadrapada → Revati).
const control=boundary(shared,'nakshatra',Date.UTC(2026,3,16,8,29),27),swiss=reference.boundaries.nakshatra.find(([t])=>Math.abs(t-Date.UTC(2026,3,16,8,29))<600000)[0];
assert.equal(new Date(swiss).toISOString(),'2026-04-16T08:29:00.027Z');
ok(Math.abs(control-swiss)<=tolerance.nakshatra,'control transition outside tolerance');
report.control_2026_04_16={swiss_de431:new Date(swiss).toISOString(),shared:new Date(control).toISOString(),meeus_core:new Date(boundary(meeus,'nakshatra',Date.UTC(2026,3,16,8,29),27)).toISOString()};

// --- 5. Without the ephemeris library the day line falls back to the Meeus core and says so.
const saved=globalThis.SkyRhythmLunar;globalThis.SkyRhythmLunar=undefined;
const fallback=SkyRhythmDayLine.build({date:'2026-04-16',lat:50.454,lon:30.524,zone:'Europe/Kyiv'});
globalThis.SkyRhythmLunar=saved;
assert.equal(fallback.engine,'meeus_core_v1');assert.equal(fallback.time_convention.model_tolerance_ms,null);checks+=2;

console.log(JSON.stringify({status:'PASS',checks,reference:reference.engine,boundaries:total,report,cross_screen_boundaries:compared,
 scope:'Agreement of two ephemeris models under one fixed TT−UTC; not a physical error budget',physical_uncertainty_ms:null}));
