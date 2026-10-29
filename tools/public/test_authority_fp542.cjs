'use strict';
// FP542: per-row registry validation (B1/R1), conflict semantics, clock tolerance (B2),
// first-load failure and notification parity. Unit level; browser parity is in verify_final_score.cjs.
const assert=require('node:assert/strict');
global.location={href:'http://127.0.0.1:8886/index.html'};
const base='http://127.0.0.1:8886/';
const source=require('../../consumer_cloud/forecast.json');
const real=require('../../consumer_cloud/final_score_decisions.json');
const date='2026-10-19';
const row=structuredClone(Object.values(source.days)[0]);row.date=date;
Object.assign(row.channels.source_formula,{available:true,value:-2,expert_override_used:false,generated_at:'2026-10-19T09:00:00Z',noaa_issued_at:'2026-10-19T09:00:00Z',noaa_retrieved_at:'2026-10-19T09:00:00Z',kp_source:'NOAA_3day_slots'});
const feed={...source,days:{[date]:row}};
let decisions={schema:'consumer-final-decisions-v1',decisions:[]},offline=false,n=0;
global.fetch=async url=>{const u=String(url);
 if(u.endsWith('/forecast.json'))return {ok:true,redirected:false,type:'basic',url:u,headers:{get:()=>null},json:async()=>feed};
 if(offline)throw Error('offline');return {ok:true,redirected:false,type:'basic',url:u,json:async()=>structuredClone(decisions)};};
const api=require('../../consumer_authority_v1.js');
const d=(date,score,extra={})=>({date,score,source_sha256:'b'.repeat(64),source_page:2,decision_id:'pdf-test',...extra});
const ok=(name,fn)=>{fn();n++;console.log('PASS',name)};
(async()=>{
 const T=Date.parse('2026-10-19T10:00:00Z');
 // 1. First load fails: no snapshot exists -> unavailable, formula shown with its own label.
 offline=true;let sel=await api.loadFeeds(base).catch(()=>null);
 ok('first-load failure reports unavailable',()=>{assert.equal(api.registryStatus().status,'unavailable');});
 offline=false;
 // 2. Real registry is accepted in full.
 decisions=structuredClone(real);sel=await api.loadFeeds(base);
 ok('real registry fully accepted',()=>{assert.equal(api.registryStatus().status,'ok');assert.equal(api.registryStatus().accepted,real.decisions.length);});
 // 3. One malformed row for another date does not discard verified rows.
 decisions={schema:real.schema,decisions:[...structuredClone(real.decisions),d('2026-12-31',4),{...d('2026-12-30',1),source_sha256:'xyz'},d('2026-02-30',1),null,'x']};
 sel=await api.loadFeeds(base);
 ok('malformed rows skipped, others kept',()=>{const s=api.registryStatus();assert.equal(s.status,'partial');assert.equal(s.rejected_rows,5);assert.equal(s.accepted,real.decisions.length);assert.equal(api.expertFor('2026-10-30')?.score,3);});
 // 4. Correction plus one bad row: the valid correction applies (R1).
 decisions={schema:real.schema,decisions:real.decisions.map(x=>x.date==='2026-10-30'?{...x,score:1}:x).concat([d('2026-12-31',9)])};
 sel=await api.loadFeeds(base);
 ok('valid correction applies despite a bad row',()=>{assert.equal(api.expertFor('2026-10-30')?.score,1);assert.equal(api.registryStatus().status,'partial');});
 // 5. Conflict and identical repeat.
 decisions={schema:real.schema,decisions:[d(date,2),d(date,-1),d('2026-10-20',3),d('2026-10-20',3)]};
 sel=await api.loadFeeds(base);
 ok('conflicting decisions withhold the score',()=>{const r=api.resolveFinal(sel.days[date],date,T);assert.equal(r.state,'expert_conflict');assert.equal(r.score,null);assert.equal(r.available,false);assert.equal(r.formula.score,-2,'formula kept as a labelled component');assert.deepEqual([...api.registryStatus().conflict_dates],[date]);});
 ok('identical repeat accepted once',()=>{assert.equal(api.expertFor('2026-10-20')?.score,3);assert.equal(api.registryStatus().rejected_rows,1);});
 ok('conflict text is explicit',()=>{const v=api.present(api.resolveFinal(sel.days[date],date,T));assert.equal(v.symbol,'—');assert.match(v.summary,/суперечать/);});
 // 6. Clock tolerance: boundary +-1 ms around 5 min.
 decisions={schema:real.schema,decisions:[]};sel=await api.loadFeeds(base);
 const gen=Date.parse('2026-10-19T09:00:00Z'),skew=api.CLOCK_SKEW_MS;
 ok('clock skew tolerance is 5 min',()=>{assert.equal(skew,300000);});
 ok('device 4:59 behind -> fresh',()=>{const r=api.resolveFinal(sel.days[date],date,gen-299000);assert.equal(r.state,'fresh');assert.equal(r.score,-2);});
 ok('device exactly 5:00 behind -> fresh',()=>{assert.equal(api.resolveFinal(sel.days[date],date,gen-skew).state,'fresh');});
 ok('device 5:00.001 behind -> invalid',()=>{const r=api.resolveFinal(sel.days[date],date,gen-skew-1);assert.equal(r.state,'invalid');assert.equal(r.score,null);assert.match(api.present(r).summary,/годинник/);});
 ok('freshness window unchanged (8 h)',()=>{assert.equal(api.resolveFinal(sel.days[date],date,gen+8*3600000).state,'fresh');assert.equal(api.resolveFinal(sel.days[date],date,gen+8*3600000+1).state,'stale');});
 // 7. Notification uses the same authority.
 global.NRCivilTime=require('../../civil_time_v1.js');require('../../notification_runtime_v1.js');
 decisions={schema:real.schema,decisions:[d(date,0)]};sel=await api.loadFeeds(base);
 ok('notification equals UI authority',()=>{const note=NRNotificationRuntime.daily(sel,T);assert.equal(note.score,api.resolveFinal(sel.days[date],date,T).score);assert.equal(note.score,0);});
 console.log('PASS FP542 authority: '+n+' checks');
})().catch(e=>{console.error(e);process.exitCode=1});
