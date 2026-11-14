'use strict';
const assert=require('node:assert/strict'),M=require('../../personal_dayline_model.js'),F=require('../../personal_dayline_factors.js'),A=require('../../astronomy-engine-2.1.19.min.js');
let checks=0;const check=fn=>{fn();checks++;};
const sample=(nak=12,tithi=5,weekday=4,variants=[])=>({moon:{nak},tithi:{number:tithi},hora:{weekday},tara:{variants}});
const factor=(s,a,id,opt)=>F.evaluate(s,a,opt).factors.find(f=>f.id===id);
// Manually transcribed witnesses: main 5.38 list is NOT its archery alternative.
check(()=>assert.equal(factor(sample(12),'study','nak').state,'listed'));
check(()=>assert.equal(factor(sample(26),'study','nak').state,'not_listed'));
check(()=>assert.equal(factor(sample(8),'study','nak').state,'listed'));
check(()=>assert.equal(factor(sample(12,20),'study','tithi').state,'listed'));
check(()=>assert.equal(factor(sample(12,4),'study','tithi').state,'not_listed'));
check(()=>assert.equal(factor(sample(12,5,1),'study','weekday').state,'not_listed'));
check(()=>assert.equal(factor(sample(26),'talk','nak').state,'listed'));
check(()=>assert.equal(factor(sample(12),'talk','nak').state,'not_listed'));
// Travel 11.9 explicitly singles out bright Pratipada, not both first tithis.
check(()=>assert.equal(factor(sample(0,1),'travel','tithi').state,'caution'));
check(()=>assert.equal(factor(sample(0,16),'travel','tithi').state,'not_flagged'));
for(const t of [4,6,8,9,12,14,15,19,21,23,24,27,29,30])check(()=>assert.equal(factor(sample(0,t),'travel','tithi').state,'caution'));
for(const t of [null,undefined,0,31,NaN,'5'])check(()=>{const s=sample(0);s.tithi.number=t;assert.equal(factor(s,'travel','tithi').state,'missing');});
check(()=>assert.equal(factor(sample(0,5,null),'study','weekday').state,'missing'));
check(()=>assert.equal(factor(sample(0),'travel','travel_tara').state,'missing'));
const mixed=sample(0,5,4,[{natal:0,group:3,cycle:1,interpretation:'caution'},{natal:1,group:2,cycle:1,interpretation:'support'}]);
check(()=>assert.equal(factor(mixed,'travel','travel_tara').state,'ambiguous'));
const released=sample(0,5,4,[{natal:0,group:3,cycle:3,interpretation:'released'}]);
check(()=>assert.equal(factor(released,'travel','travel_tara').state,'unresolved'));
for(const [direction,nak,w] of [['E',17,1],['S',24,4],['W',3,0],['N',11,2]]){
 check(()=>assert.equal(factor(sample(nak,5,5),'travel','direction',{direction}).state,'caution'));
 check(()=>assert.equal(factor(sample(0,5,w),'travel','direction',{direction}).state,'caution'));
}
check(()=>assert.equal(factor(sample(0,5,4),'travel','direction',{direction:'NE'}).state,'missing'));
for(let n=0;n<27;n++)for(let t=1;t<=30;t++)for(let w=0;w<7;w++)for(const activity of ['study','talk','travel']){
 const input=sample(n,t,w),before=JSON.stringify(input),r=F.evaluate(input,activity);
 assert.equal(r.score,null);assert.equal(r.fullElection,false);assert.equal(r.status,'partial');assert.equal(JSON.stringify(input),before);checks++;
}
// Astronomical phase boundaries: engine SearchMoonPhase (aberration=false) is only a seed; the
// tithi convention is apparent (Sun with aberration), ~35-40 s earlier. Exact apparent roots are
// checked against Swiss Ephemeris in verify_personal_phase_convention.cjs.
for(const [phase,before,after] of [[0,30,1],[12,1,2],[180,15,16],[348,29,30]]){
 const event=A.SearchMoonPhase(phase,new Date('2026-11-01T00:00Z'),40).date.getTime();
 check(()=>assert.equal(M.tithi(event-120000).number,before));check(()=>assert.equal(M.tithi(event+120000).number,after));
 const series=M.tithiSeries(event-180000,event+180000);
 check(()=>{assert.equal(series.events.length,1);const e=series.events[0];assert.equal(e.from.number,before);assert.equal(e.to.number,after);assert.equal(M.tithi(e.at-1).number,before);assert.equal(M.tithi(e.at).number,after);assert.equal(series.physical_uncertainty_ms,null);});
}
const place={lat:50.454,lon:30.524,zone:'Europe/Kyiv'};
for(const [a,b] of [[NaN,10],[10,10],[20,10],[0,Infinity]])check(()=>assert.throws(()=>M.tithiSeries(a,b)));
for(const date of ['2026-11-09','2026-11-12','2026-03-29','2026-10-25']){
 const model=M.build({date,place,birth:{}});
 for(const w of model.windows)for(const s of w.segments)check(()=>{assert.equal(s.tithi.number,M.tithi(s.start).number);assert.equal(s.tithi.number,M.tithi(s.end-1).number);});
 for(const w of model.windows){const intervals=F.intervals(w,'study');check(()=>{assert.equal(intervals[0].start,w.start);assert.equal(intervals.at(-1).end,w.end);for(let i=1;i<intervals.length;i++)assert.equal(intervals[i-1].end,intervals[i].start);});}
}
const polar=M.build({date:'2026-12-21',place:{lat:69.65,lon:18.96,zone:'Europe/Oslo'},birth:{}});
check(()=>assert.equal(factor(polar.windows[0].segments[0],'study','weekday').state,'missing'));
console.log(JSON.stringify({status:'PASS',checks,scope:'Source components, boundary mathematics and missing/conflict handling. Not a full election or empirical accuracy.'}));
