'use strict';
// FP542: per-row registry validation (B1/R1), conflict semantics, clock tolerance (B2),
// first-load failure and notification parity. Unit level; browser parity is in verify_final_score.cjs.
const assert=require('node:assert/strict');
global.location={href:'http://127.0.0.1:8886/classic.html'};
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
 ok('identical repeat accepted once',()=>{assert.equal(api.expertFor('2026-10-20')?.score,3);assert.equal(api.registryStatus().rejected_rows,0);assert.equal(api.registryStatus().duplicate_rows,1);}); // AUDIT-A2: duplicate is not a rejection
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
 // Source-only calendar records never become a consumer score or Kp observation.
 const historic=require('./fixtures/fresh_20261019.json');
 const baseLoss=structuredClone(historic);
 baseLoss.availability_projection={policy:'no_short_range_downgrade_v1',withheld_dates:[date]};
 const own=baseLoss.days[date].channels.source_formula,mark='День порожні руки, несприятливий';
 Object.assign(own,{available:false,status:'missing_kp',availability_reason:'short_range_coverage_lost',
  kp_source_requirement:'NOAA_3day_slots',value:null,raw:null,kp_input:null,factors:[],
  calendar_marks:{date,source:'source_formula_calendar_factors',marks:[mark]}});
 baseLoss.days[date].source_formula_result.score=null;
 let delivery;
 decisions={schema:real.schema,decisions:[]};
 global.fetch=async url=>({ok:true,redirected:false,type:'basic',url:String(url),headers:{get:()=>null},
   json:async()=>structuredClone(String(url).endsWith('forecast.json')?delivery:decisions)});
 const loadMarks=async(change=()=>{})=>{
   delivery=structuredClone(baseLoss);change(delivery.days[date].channels.source_formula.calendar_marks,delivery);
   return (await api.loadFeeds(base)).days[date];
 };
 const realNow=Date.now;Date.now=()=>Date.parse(historic.generated_at);
 const chosen=await loadMarks();
 assert.deepEqual(api.calendarMarksFor(chosen,date),[mark]);
 assert(Object.isFrozen(api.calendarMarksFor(chosen,date)));
 assert.equal(api.calendarMarksFor({...chosen},date),null);
 assert.equal(api.calendarMarksFor(chosen,'2026-10-20'),null);
 assert.equal(api.resolveFinal(chosen,date,T).score,null);
 assert.equal(chosen.channels.source_formula,undefined);
 for(const corrupt of [m=>{m.date='2026-10-20'},m=>{m.marks=['Kp']},m=>{m.marks.push(mark)},m=>{m.value=1},
                      (_,f)=>{delete f.days[date].channels.source_formula.calendar_marks}]){
   assert.equal(await loadMarks(corrupt),undefined);
 }
 const empty=await loadMarks(m=>{m.marks=[]});assert.deepEqual(api.calendarMarksFor(empty,date),[]);
 // Real native missing-Kp shape: no availability projection, coverage requirement, or stored advice.
 // Rebase the shape on the fixed historical fixture, so a production refresh cannot remove the control.
 const native=structuredClone(baseLoss.days[date]),legacy=native.channels.source_formula;
 delete legacy.calendar_marks;delete legacy.kp_source_requirement;delete legacy.availability_reason;legacy.kp_input={};
 const symbols={};
 for(const name of ('bolt books diwali dress ekadashi first_lunar_day full_moon hand heart masik_shivaratri medical_cross megaphone '+
   'navaratri new_moon pill pitru_paksha plane pradosh sankashti scissors solah_somvar sun_transition_filled sun_transition_outline '+
   'syringe target triangle vijaya_dashami vinayaka_chaturthi').split(' ')){
   const observed=['bolt','plane','scissors','pill'].includes(name);
   symbols[name]={status:'SOURCE_OBSERVED',observed,selected:observed};
 }
 legacy.expert_model={version:'expert-factor-model-v2',date,calendar_components:{date,version:'calendar-components-v1',symbols}};
 const sourceDay=date,stamp=Date.parse(historic.generated_at);
 Date.now=()=>stamp;
 const loadNative=async(change=()=>{})=>{
   delivery={...structuredClone(historic),days:{[sourceDay]:structuredClone(native)}};
   change(delivery.days[sourceDay].channels.source_formula.expert_model.calendar_components);
   return (await api.loadFeeds(base)).days[sourceDay];
 };
 const retained=await loadNative(),known=api.calendarMarksFor(retained,sourceDay);
 assert.deepEqual(known,['сприятливий для подорожей','сприятливий для стрижки',mark]);
 assert.equal(api.resolveFinal(retained,sourceDay,stamp).available,false);
 assert.equal(api.calendarMarksFor(retained,sourceDay,stamp+8*3600000+1),null);
 const boundary=stamp+8*3600000;
 assert.equal(api.calendarExpiresAt(retained,sourceDay),boundary+1);
 Date.now=()=>boundary;
 assert.deepEqual(retained.calendar_marks,known);
 Date.now=()=>boundary+1;
 assert.equal(retained.calendar_marks,null);
 assert.equal(api.calendarExpiresAt(retained,sourceDay),null);
 assert.equal(api.resolveFinal(retained,sourceDay).available,false);
 Date.now=()=>stamp;
 assert.equal(api.calendarMarksFor(retained,sourceDay,stamp-300001),null);
 for(const corrupt of [c=>delete c.symbols.hand,c=>{c.date='2000-01-01'},c=>{c.symbols.bolt.status='SEE_RIKTA_MODEL'},c=>{c.symbols.bolt.selected=!c.symbols.bolt.observed}]){
   assert.equal(await loadNative(corrupt),undefined);
 }
 const allFalse=await loadNative(c=>{for(const s of Object.values(c.symbols))s.observed=s.selected=false;});
 assert.deepEqual(api.calendarMarksFor(allFalse,sourceDay),[]);
 Date.now=realNow;
 console.log('PASS FP542 authority: '+n+' checks');
})().catch(e=>{console.error(e);process.exitCode=1});
