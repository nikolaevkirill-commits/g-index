'use strict';
// Claude 13.11.2026: sidereal Moon = true-of-date longitude − (Lahiri mean + nutation in longitude).
// Swiss FLG_SIDEREAL reference 1980–2033; tolerance 7". Negative control: without dpsi the error
// reaches ±17–25" (nutation), visible as 1-minute disagreements with the main app at nakshatra changes.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const app=process.env.DAYLINE_APP||path.resolve(__dirname,'../..'),root=path.resolve(app,'..');
const M=require(path.join(app,'personal_dayline_model.js'));
const ref=JSON.parse(fs.readFileSync(path.join(app,'tools/public/fixtures/personal/swiss_sidereal_moon_reference.json'),'utf8'));
let max=0,checks=0;
for(const r of ref.rows){const d=Math.abs(((M.moon(r.utc_ms).longitude-r.moon_sidereal+540)%360)-180)*3600;max=Math.max(max,d);assert.ok(d<7,`moon off by ${d.toFixed(1)}" at ${new Date(r.utc_ms).toISOString()}`);checks++;}
// 13.11.2026 Purva Ashadha entry: Swiss 11:47:25Z; the model must agree within 20 s.
let lo=Date.parse('2026-11-13T10:00Z'),hi=lo+6*3600e3;while(hi-lo>250){const m=(lo+hi)/2;M.moon(m).nak<19?lo=m:hi=m;}
assert.ok(Math.abs(hi-Date.parse('2026-11-13T11:47:25Z'))<20000,'P.Ashadha entry '+new Date(hi).toISOString());checks++;
console.log(JSON.stringify({status:'PASS',checks,maxArcsec:+max.toFixed(2),scope:'Model vs Swiss sidereal Moon; residual is ayanamsha base + engine, not physical uncertainty.'}));
