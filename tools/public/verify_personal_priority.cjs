'use strict';
const assert=require('node:assert/strict'),M=require('../../personal_dayline_model.js'),F=require('../../personal_dayline_factors.js'),A=require('../../astronomy-engine-2.1.19.min.js');
let checks=0;function ok(fn){fn();checks++;}
const sample=(sun,day,natal,variants=[])=>({moon:{nak:0},tithi:{number:5},hora:{weekday:1},tara:{variants},travelSky:{sun:{rashi:sun},dayLord:{body:'Moon',rashi:day},natalRashis:natal}});
const get=(s,id,direction='E')=>F.evaluate(s,'travel',{direction}).factors.find(f=>f.id===id);
// Explicit cardinal-direction restriction survives an otherwise supportive day lord.
ok(()=>{const s=sample(0,2,[0]),r=F.evaluate(s,'travel',{direction:'E'});assert.equal(get(s,'travel_daylord').state,'listed');assert.equal(get(s,'direction').state,'caution');assert.equal(r.fullElection,false);assert.equal(r.score,null);});
for(let n=0;n<12;n++)for(let d=0;d<12;d++)ok(()=>{const f=get(sample(0,d,[n]),'travel_daylord'),pos=(d-n+12)%12+1;assert.deepEqual(f.value.positions,[pos]);assert.equal(f.state,[3,6,10,11].includes(pos)?'listed':'caution');});
for(let s=0;s<12;s++)ok(()=>assert.equal(get(sample(s,2,[0]),'travel_sun').state,[0,4,8].includes(s)?'listed':[3,7,11].includes(s)?'long_duration':'neutral'));
for(const bad of [null,undefined,NaN,'2',-1,12])ok(()=>assert.equal(get(sample(0,bad,[0]),'travel_daylord').state,'missing'));
ok(()=>assert.equal(get(sample(0,2,[0,1]),'travel_daylord').state,'ambiguous'));
ok(()=>assert.equal(get(sample(0,2,[]),'travel_daylord').state,'missing'));
ok(()=>assert.equal(get(sample(0,2,[null]),'travel_daylord').state,'missing'));
// A supportive solar component must not silently cancel a conflicting Tara.
ok(()=>{const r=F.evaluate(sample(0,2,[0],[{group:3,natal:0,cycle:3,interpretation:'released'}]),'travel',{direction:'S'});assert.equal(r.decision.status,'conflicting');assert.deepEqual(r.decision.conflicts,['travel_tara']);assert.equal(r.score,null);assert.ok(r.decision.requirements.includes('tara_exception_precedence'));});
ok(()=>assert.equal(F.evaluate(sample(0,2,[]),'travel').decision.status,'missing_data'));
// Original astronomy definitions independently reconstructed through Cartesian vector angle.
for(const body of ['Sun','Mercury','Venus','Mars','Jupiter','Saturn'])for(const date of ['2026-01-01T00:00Z','2026-11-16T00:00Z'])ok(()=>{const at=A.MakeTime(new Date(date)),e=A.Ecliptic(A.GeoVector(body,at,true)),lon=(Math.atan2(e.vec.y,e.vec.x)*180/Math.PI-M.ayanamsha(at)+720)%360;assert.equal(M.planetSign(Date.parse(date),body).rashi,Math.floor(lon/30));});
for(const body of ['Sun','Moon','Mercury']){
 const start=Date.parse('2026-01-01T00:00Z'),end=start+30*86400000,series=M.signSeries(start,end,body);
 ok(()=>assert.ok(series.events.length>0));
 for(const e of series.events)ok(()=>{assert.equal(M.planetSign(e.at-1,body).rashi,e.from.rashi);assert.equal(M.planetSign(e.at,body).rashi,e.to.rashi);assert.equal(e.numerical_bracket_ms,1);});
}
const birth={date:'1990-06-15',zone:'Europe/Kyiv',mode:'unknown'},e=M.birthEvidence(birth);
ok(()=>{const signs=new Set();for(let t=e.intervals[0].start;t<e.intervals[0].end;t+=60000)signs.add(M.planetSign(t,'Moon').rashi);assert.deepEqual([...signs].sort((a,b)=>a-b),e.rashiCandidates);});
for(const [date,place] of [['2026-11-16',{lat:50.454,lon:30.524,zone:'Europe/Kyiv'}],['2026-03-29',{lat:41.387,lon:2.17,zone:'Europe/Madrid'}],['2026-12-21',{lat:69.65,lon:18.96,zone:'Europe/Oslo'}]]){
 const model=M.build({date,place,birth});
 for(const w of model.windows)for(const s of w.segments)ok(()=>{for(const t of [s.start,s.end-1]){assert.deepEqual(s.travelSky.sun,M.planetSign(t,'Sun'));if(s.travelSky.dayLord)assert.deepEqual(s.travelSky.dayLord,M.planetSign(t,s.travelSky.dayLord.body));}assert.equal(F.evaluate(s,'travel').fullElection,false);});
 if(place.lat>65)ok(()=>assert.equal(model.windows[0].segments[0].travelSky.dayLord,null));
}
// A comparison profile never overrides MC or assigns a numeric score.
for(let natal=0;natal<12;natal++)for(let current=0;current<12;current++)ok(()=>{
 const c=F.chandraComparison({travelSky:{moon:{rashi:current},natalRashis:[natal]}}),p=(current-natal+12)%12+1;
 assert.deepEqual(c.positions,[p]);assert.equal(c.state,[6,8,12].includes(p)?'caution':'not_flagged');assert.equal(c.includedInDecision,false);assert.equal(c.score,null);
});
ok(()=>assert.equal(F.chandraComparison({travelSky:{moon:{rashi:5},natalRashis:[0,1]}}).state,'ambiguous'));
ok(()=>assert.equal(F.chandraComparison({travelSky:{moon:{rashi:5},natalRashis:[]}}).state,'missing'));
console.log(JSON.stringify({status:'PASS',checks,scope:'Scoped priority, lunar sign uncertainty and transit boundaries; not empirical forecast validation'}));
