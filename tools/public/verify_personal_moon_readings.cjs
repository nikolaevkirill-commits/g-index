'use strict';
// Audit 2026-11-12 (Claude): LJ 2.4 Sanskrit commentary (NSKTU PDF9) as a separate Moon reading;
// Krishna Ashtami (tithi 23) conflicts with the Hindi reading; Mercury+Moon resolved only on agreement.
// Negative control: pre-patch has no laghuSanskrit/agreement and always returns moon_condition_unresolved.
const path=require('node:path'),assert=require('node:assert/strict');
const app=process.env.DAYLINE_APP||path.resolve(__dirname,'../..');
const E=require(path.join(app,'personal_dayline_election.js')),I=require(path.join(app,'personal_dayline_intervals.js')),M=require(path.join(app,'personal_dayline_model.js'));
let checks=0;const ok=f=>{f();checks++;};
for(let n=1;n<=30;n++){const c=E.moonSourceCandidates((n-1)*12+6);
 const s=n===8?'yavat_inclusion_unresolved':n>=9&&n<=23?'purna':'kshina';
 ok(()=>assert.equal(c.laghuSanskrit.interpretation,s));
 const exp=n>=9&&n<=22?'all_readings_purna':(n>=24||n<=7)?'all_readings_kshina':'readings_differ';
 ok(()=>assert.equal(c.agreement,exp,'tithi '+n));ok(()=>assert.equal(c.excludedFromDecision,true));}
ok(()=>{const c=E.moonSourceCandidates(23*12-6);assert.equal(c.laghuHindi.interpretation,'kshina');assert.equal(c.laghuSanskrit.interpretation,'purna');assert.equal(c.agreement,'readings_differ');});
// Boundary operators at 84/96/264/276 (half-open)
for(const [a,exp] of [[83.999,'all_readings_kshina'],[84,'readings_differ'],[95.999,'readings_differ'],[96,'all_readings_purna'],[263.999,'all_readings_purna'],[264,'readings_differ'],[275.999,'readings_differ'],[276,'all_readings_kshina'],[0,'all_readings_kshina'],[359.999,'all_readings_kshina']])ok(()=>assert.equal(E.moonSourceCandidates(a).agreement,exp,String(a)));
// Mercury with Moon in one sign: scan a span and check the candidate follows the agreement.
const place={lat:50.454,lon:30.524,zone:'Europe/Kyiv'};let seen=new Set();
for(let t=Date.parse('2026-01-01T00:00Z');t<Date.parse('2027-01-01T00:00Z');t+=6*3600e3){const s=I.state(t,place),m=s.mercury;
 if(!m.companions.includes('Moon'))continue;const fixed=m.witnesses.length>0,ag=s.moon.agreement;
 const exp=fixed?'malefic':ag==='all_readings_kshina'?'malefic_via_kshina_moon':ag==='all_readings_purna'?'benefic':'moon_condition_unresolved';
 ok(()=>assert.equal(m.candidate,exp));ok(()=>assert.equal(m.normativeClassification,null));seen.add(exp);}
// Astronomical bound: |Mercury-Sun| <= ~28.3 deg and same sign => |Moon-Sun| < ~58.3 deg => tithi 1..5 or 26..30,
// which every recorded reading calls kshina. So Mercury+Moon is never 'unresolved' in practice.
ok(()=>assert.ok(seen.has('malefic_via_kshina_moon')&&!seen.has('moon_condition_unresolved')&&!seen.has('benefic'),'branches: '+[...seen]));
console.log(JSON.stringify({status:'PASS',checks,branches:[...seen],scope:'Source-reading agreement only; normativeClassification stays null, excludedFromDecision=true.'}));
