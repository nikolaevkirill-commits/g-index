'use strict';
const assert=require('node:assert/strict'),A=require('../../astronomy-engine-2.1.19.min.js'),E=require('../../personal_dayline_election.js'),F=require('../../personal_dayline_factors.js');
let checks=0;const ok=f=>{f();checks++;};
// Horizon and east/rising branch via the public vector/horizon API, independent
// of the analytic intersection in the candidate module.
for(const lat of [-75,-36.85,0,41.387,50.454,69.65,75])for(const lon of [-175,0,30.524,174.76])for(let hour=0;hour<24;hour++){
 const t=Date.parse('2026-11-12T00:00Z')+hour*3600000,place={lat,lon},c=E.calculate(t,place);
 ok(()=>{assert.equal(c.status,'candidate');assert.equal(c.score,null);assert.equal(c.fullElection,false);assert.equal(c.physical_uncertainty_ms,null);});
 const angle=c.ascendant.tropical*Math.PI/180,v=new A.Vector(Math.cos(angle),Math.sin(angle),0,new Date(t));
 const eq=A.EquatorFromVector(A.RotateVector(A.Rotation_ECT_EQD(new Date(t)),v)),h=A.Horizon(new Date(t),new A.Observer(lat,lon,0),eq.ra,eq.dec);
 ok(()=>{assert.ok(Math.abs(h.altitude)<1e-7,'ascendant on horizon');assert.ok(h.azimuth>0&&h.azimuth<180,'ascending eastern intersection');});
 for(const p of c.bodies)ok(()=>{assert.ok(p.house>=1&&p.house<=12);assert.equal(p.house,((p.rashi-c.ascendant.rashi+12)%12)+1);});
 ok(()=>{assert.deepEqual(c.study.conditionalPlanets,['Moon','Mercury']);assert.ok(c.study.excludedFromDecision);});
}
for(const lat of [-90,90])ok(()=>{const c=E.calculate(Date.now(),{lat,lon:0});assert.equal(c.status,'unavailable');assert.deepEqual(c.bodies,[]);});
for(const place of [{lat:91,lon:0},{lat:0,lon:181},{lat:NaN,lon:0}])ok(()=>assert.throws(()=>E.calculate(Date.now(),place)));
// A scoped warning is never cancelled by another matching component. Missing,
// ambiguous and uncomputed conditions remain in the reasons even if not title.
const states=['listed','not_listed','caution','unresolved','missing','ambiguous','school_variant','not_computed','middle','long_duration'];
for(const x of states)for(const y of states)ok(()=>{const r=F.summary({status:'partial',factors:[{id:'a',label:'a',state:x},{id:'b',label:'b',state:y}]});assert.equal(r.score,null);assert.equal(r.fullElection,false);if((x==='unresolved'||y==='unresolved')&&(x==='caution'||y==='caution'))assert.equal(r.state,'conflict_caution');else if(x==='unresolved'||y==='unresolved')assert.equal(r.state,'conflict');else if(x==='caution'||y==='caution')assert.equal(r.state,'caution');for(const [id,s] of [['a',x],['b',y]])if(s!=='listed')assert.ok(r.reasons.some(f=>f.id===id));});
const segment=(t)=>({moon:{nak:0},tithi:{number:t},hora:{weekday:1},tara:{variants:[{natal:0,group:2,cycle:1,interpretation:'support'}]},travelSky:{sun:{rashi:0},dayLord:{body:'Moon',rashi:2},natalRashis:[0]}});
ok(()=>{const s=segment(5),before=JSON.stringify(s);const summary=F.summary(F.evaluate(s,'travel',{direction:'E'}));assert.equal(summary.state,'caution');assert.ok(summary.reasons.some(r=>r.id==='direction'));assert.equal(JSON.stringify(s),before);});
ok(()=>{const s=segment(5),rows=F.summaryIntervals({segments:[{...s,start:0,end:10},{...s,start:10,end:20},{...segment(6),start:20,end:30}]},'travel',{direction:'S'});assert.equal(rows.length,2);assert.equal(rows[0].end,20);assert.equal(rows[1].summary.state,'caution');});
console.log(JSON.stringify({status:'PASS',checks,scope:'Horizon geometry and non-cancelling UI evidence summaries, not a normative house convention or prediction validation'}));
