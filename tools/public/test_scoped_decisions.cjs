'use strict';
const assert=require('node:assert/strict');
global.location={href:'http://127.0.0.1/classic.html'};
const actual=require('../../consumer_cloud/final_score_decisions.json');
const date='2026-11-15',stamp='2026-11-15T09:00:00Z',now=Date.parse('2026-11-15T10:00:00Z');
const feed={schema:'independent_forecast_feed_v1',executor:'github-actions-source-only-v1',source_integrity:{status:'PASS'},days:{[date]:{date,channels:{source_formula:{available:true,value:1,expert_override_used:false,generated_at:stamp,noaa_retrieved_at:stamp,kp_source:'NOAA_3day_slots'}}}}};
let doc=structuredClone(actual),offline=false;
global.fetch=async url=>{const u=String(url);if(!u.endsWith('/forecast.json')&&offline)throw Error('offline');return {ok:true,url:u,headers:{get:()=>null},json:async()=>u.endsWith('/forecast.json')?feed:doc};};
const api=require('../../consumer_authority_v1.js');
const opinion={date,score:-2,scope:'new_starts',source_sha256:'a'.repeat(64),source_page:1,decision_id:'scope-test'};
const load=()=>api.loadFeeds('http://127.0.0.1/');
(async()=>{
 let selected=await load();
 const expected={9:3,10:2,11:-1,12:-3,13:0,14:0,17:-2,18:-3,19:-1,20:3,21:2,22:3};
 for(const [day,score] of Object.entries(expected)){const e=api.expertFor('2026-11-'+day.padStart(2,'0'));assert.equal(e.score,score);assert.equal(e.source_sha256,'49deea0026931a20ec420f81209d11639e28868c284b4b8b2ead46828e02afdf');}
 for(const day of ['2026-11-15','2026-11-16']){assert.equal(api.expertFor(day),null);assert.equal(api.scopedFor(day).score,-2);}
 assert.equal(api.scopedFor(date,'general_day'),null);
 let final=api.resolveFinal(selected.days[date],date,now);assert.equal(final.score,1);assert.equal(final.authority,'source_formula');
 global.NRCivilTime=require('../../civil_time_v1.js');require('../../notification_runtime_v1.js');assert.equal(NRNotificationRuntime.daily(selected,now).score,1);
 // A scoped opinion accidentally placed in the general array cannot become an override.
 doc={schema:actual.schema,decisions:[opinion]};selected=await load();assert.equal(api.expertFor(date),null);assert.equal(api.registryStatus().rejected_rows,1);assert.equal(api.resolveFinal(selected.days[date],date,now).score,1);
 doc={schema:actual.schema,decisions:[],scoped_decisions:[opinion,{...opinion,score:2}]};selected=await load();assert.equal(api.scopedFor(date).state,'expert_conflict');assert.equal(api.resolveFinal(selected.days[date],date,now).score,1);
 doc={schema:actual.schema,decisions:[],scoped_decisions:[opinion,opinion]};await load();assert.equal(api.scopedFor(date).score,-2);assert.equal(api.registryStatus().scoped_accepted,1);
 offline=true;await load();assert.equal(api.registryStatus().status,'stale');assert.equal(api.scopedFor(date).score,-2);offline=false;
 doc={schema:actual.schema,decisions:[],scoped_decisions:[{...opinion,scope:'all_day'},{...opinion,date:'2026-02-30'},null]};await load();assert.equal(api.scopedFor(date),null);assert.equal(api.registryStatus().rejected_rows,3);
 doc={schema:actual.schema,decisions:[],scoped_decisions:{}};await load();assert.equal(api.registryStatus().status,'partial');assert.equal(api.scopedFor(date),null);
 doc={schema:actual.schema,decisions:[]};await load();assert.equal(api.registryStatus().status,'ok');assert.equal(api.scopedFor(date),null);
 console.log('PASS: 12 approved records; 2 scoped opinions; no general/notification override; misplaced/invalid/conflicting rows; stale retention and recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
