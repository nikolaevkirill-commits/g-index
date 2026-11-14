'use strict';
const assert=require('node:assert/strict'),M=require('../../personal_dayline_model.js'),F=require('../../personal_dayline_factors.js');
let checks=0;const ok=fn=>{fn();checks++;};
const compatible=(n,r)=>Math.max(n*360/27,r*30)<Math.min((n+1)*360/27,(r+1)*30);
for(const birth of [
 {date:'1990-06-15',zone:'Europe/Kyiv',mode:'unknown'},
 {date:'2026-10-25',time:'03:30',zone:'Europe/Kyiv',mode:'known'},
 {date:'2026-10-25',from:'03:10',to:'03:40',zone:'Europe/Kyiv',mode:'range'},
 {date:'1990-06-15',time:'12:00',zone:'Pacific/Auckland',mode:'known'}]){
 const e=M.birthEvidence(birth);ok(()=>assert.ok(e.jointCandidates.length));
 for(const pair of e.jointCandidates)ok(()=>assert.ok(compatible(pair.nak,pair.rashi)));
 for(const span of e.jointIntervals)for(const t of [span.start,span.end-1])ok(()=>{assert.equal(M.moon(t).nak,span.nak);assert.equal(M.planetSign(t,'Moon').rashi,span.rashi);});
 for(let i=1;i<e.jointIntervals.length;i++)ok(()=>assert.ok(e.jointIntervals[i-1].end<=e.jointIntervals[i].start));
 for(const x of e.intervals)for(let t=x.start;t<x.end;t+=60000)ok(()=>assert.equal(e.jointIntervals.filter(s=>s.start<=t&&s.end>t).length,1));
 ok(()=>assert.deepEqual([...new Set(e.jointCandidates.map(p=>p.nak))].sort((a,b)=>a-b),e.candidates));
 ok(()=>assert.deepEqual([...new Set(e.jointCandidates.map(p=>p.rashi))].sort((a,b)=>a-b),e.rashiCandidates));
}
// Every sign and nakshatra boundary in one lunation: exact before/after, known minute.
const start=Date.parse('2026-11-01T00:00Z'),end=start+30*86400000,events=[...Array.from({length:30},(_,i)=>M.birthEvidence({date:new Date(start+i*86400000).toISOString().slice(0,10),zone:'UTC',mode:'unknown'}).transitions).flat(),...M.signSeries(start,end,'Moon').events];
for(const event of events){const wall=M.parts(event.at,'UTC'),e=M.birthEvidence({date:wall.date,time:wall.time,zone:'UTC',mode:'known'});for(const t of [event.at-1,event.at])ok(()=>assert.ok(e.jointCandidates.some(p=>p.nak===M.moon(t).nak&&p.rashi===M.planetSign(t,'Moon').rashi)));}
const place={lat:50.454,lon:30.524,zone:'Europe/Kyiv'},birth={date:'1990-06-15',zone:'Europe/Kyiv',mode:'unknown'};
const m=M.build({date:'2026-11-16',place,birth});for(const w of m.windows)for(const s of w.segments){const before=JSON.stringify(s);for(const activity of ['study','talk','travel'])ok(()=>{
 const r=F.evaluate(s,activity,{direction:'E'});assert.equal(r.natalVariants.length,m.birth.jointCandidates.length);assert.equal(JSON.stringify(s),before);
 for(const v of r.natalVariants){assert.ok(m.birth.jointCandidates.some(p=>p.nak===v.natalNak&&p.rashi===v.natalRashi));assert.equal(v.decision.fullElection,false);assert.equal(v.decision.score,null);assert.equal(v.comparison.positions.length,1);}
});}
ok(()=>{const r=F.evaluate({moon:{nak:12},tithi:{number:5},hora:{weekday:4}},'study');assert.equal(r.factors.find(f=>f.id==='study_lagna').state,'not_computed');assert.ok(r.decision.requirements.includes('eighth_house_occupancy'));assert.equal(r.decision.status,'uncomputed_conditions');assert.equal(r.fullElection,false);});
console.log(JSON.stringify({status:'PASS',checks,scope:'Correlated natal states, DST folds, all lunar boundaries in one month, no Cartesian-product charts'}));
