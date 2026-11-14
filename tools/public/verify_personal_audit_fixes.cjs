'use strict';
// Audit fixes 2026-11-12 (Claude): MC 11.9 travel tiers and day-lord, MC 5.38 school variant,
// conflict+caution title, Sripati/equal sensitivity. Contract checks, not predictive validation.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const app=process.env.DAYLINE_APP||path.resolve(__dirname,'../..'),root=process.env.DAYLINE_TEST_ROOT||path.resolve(app,'..');
const F=require(path.join(app,'personal_dayline_factors.js')),E=require(path.join(app,'personal_dayline_election.js'));
let checks=0;const ok=f=>{f();checks++;};
const seg=(n,t=5,w=3,natal=[0],day=2,variants=[{natal:0,group:2,cycle:1,interpretation:'support'}])=>({moon:{nak:n},tithi:{number:t},hora:{weekday:w},tara:{variants},travelSky:{sun:{rashi:1},moon:{rashi:0},dayLord:{body:'Moon',rashi:day},natalRashis:natal,natalStates:[]}});
const get=(r,id)=>r.factors.find(f=>f.id===id);
// 1. Vasishtha tiers partition all 27 nakshatras exactly once (9 uttama + 10 madhya + 8 anishta).
const U=[0,4,6,7,12,16,21,22,26],Mi=[3,10,11,17,18,19,20,23,24,25],Fo=[1,2,5,8,9,13,14,15];
ok(()=>assert.deepEqual([...U,...Mi,...Fo].sort((a,b)=>a-b),[...Array(27).keys()]));
for(let n=0;n<27;n++)ok(()=>assert.equal(get(F.evaluate(seg(n),'travel',{direction:'N'}),'nak').state,U.includes(n)?'listed':Mi.includes(n)?'middle':'caution'));
for(const bad of [null,undefined,-1,27,1.5])ok(()=>assert.equal(get(F.evaluate(seg(bad),'travel',{direction:'N'}),'nak').state,'missing'));
// A forbidden nakshatra must surface as caution in the summary even when other components match.
ok(()=>assert.equal(F.summary(F.evaluate(seg(1,5,4,[0],2),'travel',{direction:'N'})).state,'caution'));
// 2. Day lord outside upachaya from natal Moon = caution ("kutrāpi na hitaḥ").
for(let natal=0;natal<12;natal++)for(let d=0;d<12;d++){const pos=(d-natal+12)%12+1;ok(()=>assert.equal(get(F.evaluate(seg(0,5,3,[natal],d),'travel',{direction:'N'}),'travel_daylord').state,[3,6,10,11].includes(pos)?'listed':'caution'));}
ok(()=>assert.equal(get(F.evaluate(seg(0,5,3,[0,1],2),'travel',{direction:'N'}),'travel_daylord').state,'ambiguous'));
// Listed day lord never cancels direction shula.
ok(()=>{const r=F.evaluate(seg(17,5,3,[0],2),'travel',{direction:'E'});assert.equal(get(r,'travel_daylord').state,'listed');assert.equal(get(r,'direction').state,'caution');assert.notEqual(F.summary(r).state,'partial');});
// 3. Study school variant: Dhanishtha/Shatabhisha listed only under Maheshvara's Shravana-triad.
for(let n=0;n<27;n++){const st=get(F.evaluate(seg(n),'study'),'nak').state;ok(()=>assert.equal(st,[22,23].includes(n)?'school_variant':[0,4,5,6,7,8,10,12,13,14,18,19,21,24].includes(n)?'listed':'not_listed'));}
ok(()=>assert.equal(F.summary({activity:'study',status:'partial',factors:[{id:'nak',state:'school_variant'},{id:'study_lagna',state:'not_computed'}]}).state,'school_variant'));
// 4. Conflict must not hide an independent caution.
ok(()=>{const r=F.evaluate(seg(0,30,3,[0],2,[{natal:0,group:3,cycle:3,interpretation:'released'}]),'travel',{direction:'N'});assert.equal(get(r,'travel_tara').state,'unresolved');assert.equal(get(r,'tithi').state,'caution');const s=F.summary(r);assert.equal(s.state,'conflict_caution');assert.ok(s.reasons.some(x=>x.state==='caution')&&s.reasons.some(x=>x.state==='unresolved'));});
ok(()=>assert.equal(F.summary(F.evaluate(seg(0,5,3,[0],2,[{natal:0,group:3,cycle:3,interpretation:'released'}]),'travel',{direction:'S'})).state,'conflict'));
for(const a of ['study','talk','travel'])ok(()=>{const r=F.evaluate(seg(1),a,{direction:'N'});assert.equal(r.score,null);assert.equal(r.fullElection,false);});
// 5. Sripati cusps vs fixed Swiss 2.10.03 reference (tolerance 1e-3 deg) and house sensitivity contract.
const ref=JSON.parse(fs.readFileSync(path.join(app,'tools/public/fixtures/personal/swiss_sripati_reference.json'),'utf8'));
const ang=(a,b)=>Math.abs(((a-b+540)%360)-180);
for(const c of ref.cases){const ch=E.calculate(Date.parse(c.utc),{lat:c.lat,lon:c.lon}),ay=ch.ascendant.ayanamsha;
 ok(()=>assert.ok(ang(ch.ascendant.mcTropical,c.mc_tropical)<1e-3));
 c.sripati_tropical.forEach((x,i)=>ok(()=>assert.ok(ang((ch.sripatiCusps[i]+ay)%360,x)<1e-3,c.utc+' cusp'+(i+1))));
 for(const b of ch.bodies){ok(()=>assert.ok(b.houseSripati>=1&&b.houseSripati<=12));ok(()=>assert.equal(b.houseEqual,Math.floor((((b.longitude-ch.ascendant.longitude)%360)+360)%360/30)+1));}
 for(const k of Object.keys(ch.study.conventionSensitive))ok(()=>assert.equal(ch.study.conventionSensitive[k],JSON.stringify(ch.study.alternatives.equal[k])!==JSON.stringify(ch.study[k])||JSON.stringify(ch.study.alternatives.sripati[k])!==JSON.stringify(ch.study[k])));
 ok(()=>{assert.equal(ch.study.excludedFromDecision,true);assert.equal(ch.score,null);});
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Audit fixes 2026-11-12: MC11.9 tiers/day-lord, MC5.38 variant, conflict+caution title, Sripati vs Swiss reference. Not normative approval or predictive validation.'}));
