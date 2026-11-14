'use strict';
const assert=require('node:assert/strict'),A=require('../../personal_dayline_activity.js');let checks=0;
for(const id of Object.keys(A.activities))for(const interpretation of ['support','caution','released','context','ambiguous','missing']){
 const d=A.describe({interpretation},id);assert.equal(d.score,null);assert.equal(d.tone,interpretation);assert.equal(d.applicability,'partial_not_full_election');assert.ok(d.scope&&d.reference&&d.tip);checks+=4;
}
assert.throws(()=>A.describe({},'invented'));checks++;
const tara={interpretation:'caution',common:false,variants:[{natal:0,current:4,group:5,cycle:1,interpretation:'caution'}]},other={...tara,interpretation:'support'};
const m={windows:[{segments:[{start:0,end:2,tara},{start:2,end:3,tara}]},{segments:[{start:3,end:4,tara},{start:4,end:6,tara:other}]}]},before=JSON.stringify(m);
const phases=A.phases(m);assert.deepEqual(phases.map(x=>[x.start,x.end]),[[0,4],[4,6]]);assert.equal(JSON.stringify(m),before);checks+=2;
for(const [n,t] of [[1,'1 відрізок'],[3,'3 відрізки'],[11,'11 відрізків'],[21,'21 відрізок']]){assert.equal(A.countLabel(n),t);checks++;}
console.log(JSON.stringify({status:'PASS',checks,scope:'Activity context preserves uncertainty and adds no score; phase merge is immutable'}));
