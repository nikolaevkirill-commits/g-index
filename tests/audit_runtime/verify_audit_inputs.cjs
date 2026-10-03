const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),h=require('../../tools/read_runtime_source.cjs')(require('path').resolve(__dirname,'../..')),checks=[];
function take(a,b){const i=h.indexOf(a),j=h.indexOf(b,i+a.length);assert(i>=0&&j>i);return h.slice(i,j)}
const helpers=take('// BEGIN authority request ownership','// END authority request ownership');
const authority=helpers+take('async function loadExpertDecisionRegistry(','async function loadAutoProspectiveStatus(')+take('async function loadStrongRawPolicy(','// v88.8.35: SINGLE SOURCE OF TRUTH policy.')+take('async function loadExpertOverrides(','// v88.8.51-fp128: daily_master.json loader');
const digest='a'.repeat(64),day='2026-09-29';
const registry={schema:'expert_decision_registry_v1',rows:[{date:day,decision_score:2,decision_source:'verified_expert_pdf',source_pdf:'synthetic.pdf',source_sha256:digest}]};
function env(fetch){const timers=new Map();let id=0;const c={window:{},console,Date,Promise,AbortController,document:{getElementById:()=>null},_expertOverrides:null,_expertCalc:null,_expertDecisionRegistry:null,_strongRawPolicy:null,fetch,setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:i=>timers.delete(i)};vm.createContext(c);vm.runInContext(authority,c);return {c,timers};}
const response=data=>({ok:true,json:async()=>data});
const turns=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
(async()=>{
 for(const value of [null,'',false,true,' ',4,-4,0.5,Infinity,NaN,{},[]]){
  const {c}=env(async u=>response(u.startsWith('EXPERT_')?{...registry,rows:[{...registry.rows[0],decision_score:value}]}:{overrides:[]}));
  await c.loadExpertDecisionRegistry(true);assert.equal(Object.keys(c._expertOverrides).length,0,String(value));assert.equal(c.window.__registryRejected.length,1);
 }
 for(const value of [-3,-2,-1,0,1,2,3,'2']){const {c}=env(async u=>response(u.startsWith('EXPERT_')?{...registry,rows:[{...registry.rows[0],decision_score:value}]}:{overrides:[]}));await c.loadExpertDecisionRegistry(true);assert.equal(c._expertOverrides[day].expert_eng,Number(value));assert.equal(c.window._expertOverrides,c._expertOverrides);}
 checks.push('F20 invalid scores rejected; all seven valid scores retained');
 for(const first of ['registry','file']){
  let release,overrideCalls=0;const {c}=env(async u=>{if(u.startsWith('EXPERT_'))return response(registry);if(u.includes('display='))return response({overrides:[]});if(first==='registry'&&++overrideCalls===1)return new Promise(r=>release=()=>r(response({overrides:[{date:day,expert_eng:-1,verified:true}]})));return response({overrides:[{date:day,expert_eng:-1,verified:true}]});});
  if(first==='registry'){const f=c.loadExpertOverrides(true);await c.loadExpertDecisionRegistry(true);release();await f;}
  else{await c.loadExpertOverrides(true);await c.loadExpertDecisionRegistry(true);}
  assert.equal(c._expertOverrides[day].expert_eng,-1);assert.equal(c.window._expertOverrides,c._expertOverrides);
  c.fetch=async()=>{throw Error('offline')};await c.loadExpertOverrides(true);assert.equal(c._expertOverrides[day].expert_eng,-1);assert.equal(c.window._expertOverrides,c._expertOverrides);assert.equal(c.window._expertOverridesLoadStatus,'stale');
 }
 {const {c}=env(async u=>{if(u.startsWith('EXPERT_'))return response(registry);throw Error('missing file')});await c.loadExpertDecisionRegistry(true);await c.loadExpertOverrides(true);assert.equal(c._expertOverrides[day].expert_eng,2);assert.equal(c.window._expertOverrides,c._expertOverrides);}
 checks.push('F21 completion order and file failure preserve deterministic shared authority');
 {const {c}=env(async u=>response(u.startsWith('EXPERT_')?registry:{overrides:[{date:day,expert_eng:-1,verified:true}]}));
  c._beginAuthorityBatch();await c.loadExpertDecisionRegistry(true);assert.equal(c._expertOverrides,null);
  await c.loadExpertOverrides(true);assert.equal(c._expertOverrides,null);
  c._endAuthorityBatch();assert.equal(c._expertOverrides[day].expert_eng,-1);assert.equal(c._expertOverrides,c.window._expertOverrides);
 }
 checks.push('F21 authority refresh publishes only after batch completion');
 {let overrideFetches=0;const {c}=env(async u=>{if(u.startsWith('EXPERT_'))return response(registry);overrideFetches++;return response({overrides:[{date:day,expert_eng:-1,verified:true,source_sha256:digest,override_text:'fixture display'}]})});
  c._beginAuthorityBatch();await Promise.all([c.loadExpertDecisionRegistry(true),c.loadExpertOverrides(true)]);c._endAuthorityBatch();
  assert.equal(overrideFetches,1);assert.equal(c.window._expertDisplayText[day],'fixture display');assert.equal(c._expertOverrides[day].expert_eng,-1);assert(Object.isFrozen(c._expertOverrides));assert(Object.isFrozen(c._expertOverrides[day]));
 }
 checks.push('one override document per refresh batch; immutable resolved snapshot');


 for(const timeout of [false,true]){
  let oldResolve,calls=0;const {c,timers}=env(async()=>++calls===1?new Promise(r=>oldResolve=r):response({scores:{[day]:{score:1}}}));
  const old=c.loadExpertCalc(true);await turns();if(timeout)[...timers.values()][0]();
  await c.loadExpertCalc(true);oldResolve(response({scores:{[day]:{score:-2}}}));await old;
  assert.equal(c._expertCalc[day].score,1);assert.equal(c.window._expertCalcLoadStatus,'loaded');
 }
 {let release;const {c,timers}=env(async()=>new Promise(r=>release=r));const p=c.loadExpertCalc(true);[...timers.values()][0]();release(response({scores:{[day]:{score:-2}}}));await p;assert.equal(c._expertCalc,null);}
 checks.push('F21 superseded and timed-out requests cannot write even when transport ignores abort');
 const kpcode=take('function _strictKpTimestamp(','function _finiteFormulaNumber(')+take('function _finiteFormulaNumber(','\n}',h.indexOf('function _finiteFormulaNumber('))+'\n}';
 const k={Date};vm.createContext(k);vm.runInContext(kpcode,k);const now=Date.parse('2026-09-29T12:00:00Z');
 const row=(min,v,zone='Z')=>({time_tag:`2026-09-29T11:${min}:00${zone}`,estimated_kp:v});
 for(const v of [null,'',false,true,' ',{},[]])assert.equal(k._provisionalKpMedian([row('57',v),row('58',v),row('59',v)],now),null);
 const valid=[row('59',3),row('57',1,''),{time_tag:'2026-09-29T14:58:00+03:00',estimated_kp:'2'}];
 assert.equal(k._provisionalKpMedian(valid,now).kp,2);
 assert.equal(k._provisionalKpMedian([valid[0],valid[0],valid[0]],now),null);
 assert.equal(k._provisionalKpMedian([...valid,row('57',9)],now),null);
 assert.equal(k._provisionalKpMedian([row('00',1),row('01',2),row('59',3)],now),null);
 assert.equal(k._provisionalKpMedian(valid.map(x=>({...x,time_tag:'2026-09-29T12:10:00Z'})),now),null);
 checks.push('F19 numeric, age, timezone, order, duplicate and conflict boundaries');
 for(const value of ['2026-02-29T12:00:00Z','2026-04-31T12:00:00Z','2026-09-29T24:00:00Z','2026-09-29T12:60:00Z','2026-09-29T12:00:60Z','2026-09-29T12:00:00+03:99','2026-09-29T12:00junk'])assert(Number.isNaN(k._strictKpTimestamp(value)),value);
 assert.equal(k._strictKpTimestamp('2024-02-29T15:00:00+03:00'),Date.parse('2024-02-29T12:00:00Z'));
 checks.push('strict calendar dates, leap day and offset validation');

 let calls=0;const geo={window:{dispatchEvent(){}},Event,Date,isFinite,_userLat:50.45,_userLon:30.52,_lastPanchCtx:null,_sunRiseSetCache:new Map(),renderPanchanga(){},syncHero(){},todayKyivStr:()=>day,sunriseUTC:d=>d,computePanchanga:()=>{calls++;return {rahu:{start:geo._userLat===50.45?'03:00':'05:00',end:geo._userLat===50.45?'04:00':'06:00',gulika:{start:'07:00',end:'08:00'}}}}};
 vm.createContext(geo);vm.runInContext(take('function refreshGeoDependents(){','function initGeolocation(){')+take('function getInauspiciousWindowsUTC(){','function _slotDecisionInvariant('),geo);
 assert.equal(geo.getInauspiciousWindowsUTC()[0].start,'03:00');geo._userLat=40;assert.equal(geo.getInauspiciousWindowsUTC()[0].start,'05:00');geo.getInauspiciousWindowsUTC();assert.equal(calls,2);geo.refreshGeoDependents();geo.getInauspiciousWindowsUTC();assert.equal(calls,3);
 checks.push('F12 cache keyed by date and coordinates; explicit invalidation');
 const handlers={},stores=new Map(),base='https://fixture.test/app/';let online=true;
 const norm=k=>new URL(typeof k==='string'?k:k.url,base).href;
 const caches={open:async n=>{if(!stores.has(n))stores.set(n,new Map());const m=stores.get(n);return {addAll:async urls=>{for(const u of urls)m.set(norm(u),new Response('shell'))},match:async k=>m.get(norm(k))?.clone(),put:async(k,v)=>m.set(norm(k),v.clone())}},delete:async n=>stores.delete(n)};
 const sw={self:{registration:{scope:base},location:{origin:new URL(base).origin},addEventListener:(n,f)=>handlers[n]=f,clients:{get:async()=>null}},caches,URL,Response,Headers,AbortController,Date,setTimeout,clearTimeout,fetch:async()=>{if(!online)throw Error('offline');return new Response('network')}};
 vm.createContext(sw);sw.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sw);};
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),sw);let install;handlers.install({waitUntil:p=>install=p});await install;online=false;
 async function request(url,mode='navigate'){let p;handlers.fetch({request:{url:new URL(url,base).href,method:'GET',mode},respondWith:x=>p=x});return p;}
 for(const u of ['index.html?channel=play','?push=daily'])assert.equal(await(await request(u)).text(),'shell');
 for(const u of ['missing?push=daily','api?channel=play','../index.html?channel=play'])await assert.rejects(request(u));
 online=true;for(let i=0;i<100;i++)await request('expert_overrides_v3.json?display='+i,'cors');
 const keys=[...stores.values()].flatMap(m=>[...m.keys()]);assert.equal(new Set(keys.filter(k=>k.includes('expert_overrides_v3'))).size,1);
 await request('other.json?mode=one','cors');await request('other.json?mode=two','cors');assert.equal([...stores.values()].flatMap(m=>[...m.keys()]).filter(k=>k.includes('other.json')).length,2);
 checks.push('F06 cold scoped query navigation; no unknown/API shell fallback; F22 bounded cache without stripping semantic queries');
 fs.writeFileSync(path.join(__dirname,'AUDIT_INPUTS_RESULTS.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
