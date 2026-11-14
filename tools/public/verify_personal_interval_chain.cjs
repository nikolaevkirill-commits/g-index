'use strict';
// Audit 2026-11-12 (Claude): per-field event chains from survey() must be continuous
// (each event.from equals the previous event.to and the chain ends at the state at end-1).
// Negative control: at 85N on 2026-03-20 Venus' Sripati house changes 2->11->10 inside one
// 60 s step; the pre-patch survey reported only 2->11 and lost 11->10.
const path=require('node:path'),assert=require('node:assert/strict');
const app=process.env.DAYLINE_APP||path.resolve(__dirname,'../..');
const I=require(path.join(app,'personal_dayline_intervals.js')),M=require(path.join(app,'personal_dayline_model.js'));
let checks=0;
for(const [place,date] of [[{lat:85,lon:0,zone:'UTC'},'2026-03-20'],[{lat:50.454,lon:30.524,zone:'Europe/Kyiv'},'2026-11-17'],[{lat:69.65,lon:18.96,zone:'Europe/Oslo'},'2026-11-12']]){
 const d=M.civilDay(date,place.zone),s=I.survey(d.start,d.end,place);
 const last=Object.assign({},s.initial.values);
 for(const e of s.events){assert.equal(last[e.key]??null,e.from,`${date} ${e.key} chain break at ${new Date(e.at).toISOString()}`);last[e.key]=e.to;checks++;
  assert.ok(e.at>d.start&&e.at<d.end);checks++;}
 const endState=I.state(d.end-1,place).values;
 for(const k of Object.keys(endState)){assert.equal(last[k]??null,endState[k]??null,`${date} ${k} end mismatch`);checks++;}
}
const d=M.civilDay('2026-03-20','UTC'),s=I.survey(d.start,d.end,{lat:85,lon:0,zone:'UTC'});
assert.ok(s.events.some(e=>e.key==='houseSripati:Venus'&&e.from===11&&e.to===10&&Math.abs(e.at-1774005701000)<2000),'missed second change in one step');checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'Event-chain continuity of the research survey; A->B->A inside one step is still not excluded.'}));
