const assert=require('node:assert/strict');
const {moonIllumination}=require('../../moon_phase_v1.js');
const score=require('../../score_semantics_v1.js');
for(const [date,k,waxing] of [['2026-10-25',.991,true],['2026-11-01',.551,false],['2026-11-09',.002,true],['2026-11-17',.495,true]]){
 const actual=moonIllumination(new Date(date+'T12:00:00Z'));
 assert(Math.abs(actual.k-k)<=.01,date+' illumination regression');assert.equal(actual.waxing,waxing,date+' direction');
}
for(const v of [null,undefined,NaN,Infinity,'1',1.5,4,-4])assert.equal(score.scoreClass(v),'missing');
for(const v of [-3,-2,-1,0,1,2,3])assert.equal(score.scoreClass(v),v<0?'negative':v>0?'positive':'neutral');
console.log('PASS presentation regression: four illumination fixtures (not independent accuracy proof), strict final-score domain');
