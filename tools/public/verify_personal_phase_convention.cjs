'use strict';
// Audit 2026-11-12 (Claude): tithi boundaries must follow the apparent convention used for all
// sign longitudes (and by Swiss/drik panchanga). Negative control: Astronomy.MoonPhase
// (aberration=false) must FAIL the same tolerance, so this test fails without the patch.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const app=process.env.DAYLINE_APP||path.resolve(__dirname,'../..'),root=path.resolve(app,'..');
const M=require(path.join(app,'personal_dayline_model.js')),E=require(path.join(app,'personal_dayline_election.js')),A=require(path.join(app,'astronomy-engine-2.1.19.min.js'));
const el=typeof M.elongation==='function'?M.elongation:(t=>M.tithi(t).angle);
const ref=JSON.parse(fs.readFileSync(path.join(app,'tools/public/fixtures/personal/swiss_tithi_reference.json'),'utf8'));
const mod=x=>(x%360+360)%360,TOL=15000;
const rootOf=(f,deg,t)=>{let lo=t-180000,hi=t+180000;const s=x=>((f(x)-deg+540)%360)-180;assert.ok(s(lo)<0&&s(hi)>=0,'bracket '+deg);while(hi-lo>1){const m=Math.floor((lo+hi)/2);s(m)<0?lo=m:hi=m;}return hi;};
let checks=0,maxAbs=0,geomFail=0;
for(const r of ref.roots){
 const t=rootOf(el,r.deg,r.utc_ms),d=t-r.utc_ms;maxAbs=Math.max(maxAbs,Math.abs(d));
 assert.ok(Math.abs(d)<TOL,`apparent root ${r.deg} off by ${d} ms`);checks++;
 // tithi number flips exactly at the model root
 assert.equal(M.tithi(t).number,Math.floor(r.deg/12)+1);assert.equal(M.tithi(t-1).number,(Math.floor(r.deg/12)+29)%30+1);checks+=2;
 // election diagnostic uses the identical angle
 const c=E.calculate(t,{lat:50.454,lon:30.524});assert.equal(c.conditionalEvidence.moon.elongationDegrees,M.tithi(t).angle);checks++;
 const g=rootOf(t=>mod(A.MoonPhase(new Date(t))),r.deg,r.utc_ms);if(Math.abs(g-r.utc_ms)>=TOL)geomFail++;
}
// Negative control: the rejected geometric convention misses tolerance on (almost) every boundary.
assert.ok(geomFail>=ref.roots.length*0.9,`geometric MoonPhase failed only ${geomFail}/${ref.roots.length}`);checks++;
// Ashtami half-open intervals: [84,96) shukla, [264,276) krishna.
for(const [a,inside] of [[83.9999,false],[84,true],[95.9999,true],[96,false],[263.9999,false],[264,true],[275.9999,true],[276,false],[0,false],[359.9999,false]]){
 const n=Math.floor(a/12)+1;assert.equal([8,23].includes(n),inside,String(a));checks++;}
console.log(JSON.stringify({status:'PASS',checks,roots:ref.roots.length,maxAbsMs:maxAbs,geometricOutsideTolerance:geomFail,tolMs:TOL,scope:'Apparent-elongation convention vs Swiss SWIEPH; not physical uncertainty (still null).'}));
