(function(host){
'use strict';
// v113 forecast journal (owner decision 18.10.2026); v115 material-input fingerprint.
// Append-only, on this device only. Each entry fixes, BEFORE the target day:
// issue time, target date, final score and its authority (expert PDF / source formula),
// the formula inputs (Kp input, factors, raw sum, generation and NOAA times), the model
// version, and an empty outcome slot that the user fills after the day.
// Entries are never edited; changed inputs create a new revision. A SHA-256 chain makes
// later edits detectable. This is a record for independent checking, not evidence of accuracy.
const KEY='nr_forecast_journal_v1',SCHEMA='nr-forecast-journal-v1',MODEL='source_formula/threshold:symmetric_intervals_candidate/kp:2-Kp/expert_priority:v113',MAX=3000;
const kyivDay=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
function read(key,fallback){const raw=host.localStorage.getItem(key);if(raw===null)return fallback;try{return JSON.parse(raw)}catch(e){throw new Error('Corrupt journal: '+key)}}
function load(){const x=read(KEY,{schema:SCHEMA,entries:[]});if(!x||x.schema!==SCHEMA||!Array.isArray(x.entries))throw new Error('Invalid journal schema');return x}
function store(doc){host.localStorage.setItem(KEY,JSON.stringify(doc));}
let verifiedSnapshot=null;
const snapshot=()=>JSON.stringify([host.localStorage.getItem(KEY),host.localStorage.getItem('nr_forecast_outcomes_v1'),host.localStorage.getItem('nr_forecast_journal_version_v1'),host.localStorage.getItem('nr_forecast_journal_epoch_v1')]);
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v)}
async function sha256(text){const d=await host.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function inputsOf(r,row){
 const own=row?.channels?.source_formula||null,kp=own?.kp_input||{};
 return {authority:r.authority,state:r.state,score:r.score,
  expert:r.expert?{source_pdf:r.expert.source_pdf,source_page:r.expert.source_page??null,source_sha256:r.expert.source_sha256??null,decision_id:r.expert.decision_id??null,category:r.expert.category??null}:null,
  formula:{state:r.formula?r.formula.state:r.state,score:r.formula?r.formula.score:r.score,raw:own?.raw??null,threshold_policy:own?.threshold_policy??null,
   generated_at:own?.generated_at??null,kp_source:own?.kp_source??null,kp_daily_max:own?.kp_daily_max??null,kp_timezone:own?.kp_timezone??null,
   noaa_issued_at:own?.noaa_issued_at??kp.issued_at??null,noaa_retrieved_at:own?.noaa_retrieved_at??kp.retrieved_at??null,kp_raw_sha256:kp.raw_sha256??null,
   factors:Array.isArray(own?.factors)?own.factors.map(f=>({factor:String(f.factor),value:Number(f.value)})):[]}};
}
// v115: the revision fingerprint covers only the material forecast (authority, state, scores,
// raw sum, factors, Kp daily max/source, expert source). Provenance stamps that change on every
// cloud run (generated_at, NOAA issued/retrieved times, raw NOAA bytes hash) stay in the entry but
// do not create a revision: with a 2-hour feed they filled the 3000 limit in ~9-10 days of use.
const FP_POLICY='material_inputs_v115';
function materialOf(inputs){const f=inputs.formula||{};
 return {authority:inputs.authority,state:inputs.state,score:inputs.score,expert:inputs.expert,
  formula:{state:f.state??null,score:f.score??null,raw:f.raw??null,threshold_policy:f.threshold_policy??null,kp_source:f.kp_source??null,kp_daily_max:f.kp_daily_max??null,kp_timezone:f.kp_timezone??null,factors:f.factors||[]}};}
let chain=Promise.resolve();
const WRITE_LOCK='skyrhythm-forecast-journal-write-v1';
// v126: the counter orders replicas; an epoch fences writers from before an explicit reset.
// Time passing is never evidence that an old replica is safe to overwrite newer data.
// IndexedDB stores only these non-personal synchronization markers, not journal contents.
// Schema 2 fences v124/v125 writers, which explicitly open schema 1 and must reload.
const VKEY='nr_forecast_journal_version_v1',EKEY='nr_forecast_journal_epoch_v1',SYNC_DB='skyrhythm-journal-sync-v1',SYNC_WAIT_STEPS=200,SYNC_STEP_MS=15;
let syncBlocked=false;
const freshEpoch=()=>Array.from(host.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const lsVersion=()=>{const n=Number(host.localStorage.getItem(VKEY)||0);if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid journal version');return n};
function syncDb(){return new Promise((res,rej)=>{let settled=false;const r=host.indexedDB.open(SYNC_DB,2);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};
 r.onsuccess=()=>{if(settled){r.result.close();return}settled=true;r.result.onversionchange=()=>r.result.close();res(r.result)};
 const fail=e=>{if(!settled){settled=true;rej(e)}};r.onerror=()=>fail(r.error||new Error('IndexedDB open failed'));r.onblocked=()=>fail(new Error('IndexedDB blocked'));
})}
function syncState(db,value){return new Promise((res,rej)=>{
 const tx=db.transaction('kv',value===undefined?'readonly':'readwrite'),st=tx.objectStore('kv');let out=value;
 if(value===undefined){out={v:0,epoch:null};const q=st.get('v'),e=st.get('epoch');q.onsuccess=()=>{out.v=Number(q.result||0)};e.onsuccess=()=>{out.epoch=e.result??null}}
 else {st.put(value.v,'v');st.put(value.epoch,'epoch')}
 tx.oncomplete=()=>res(out);tx.onerror=tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction failed'));
})}
function markSyncBlocked(error){
 syncBlocked=true;verifiedSnapshot=null;
 host.dispatchEvent?.(new CustomEvent('nr:journal-updated',{detail:{sync_blocked:true}}));
 return error;
}
async function synced(task){
 if(!host.indexedDB){if(host.navigator)throw new Error('Journal sync store unavailable; open the app over HTTPS in a supported browser');return task()}
 let db,prepared=false;try{
  db=await syncDb();let state=await syncState(db);
  if(!Number.isSafeInteger(state.v)||state.v<0||state.v===Number.MAX_SAFE_INTEGER||(state.epoch!==null&&typeof state.epoch!=='string'))throw new Error('Invalid journal synchronization state');
  // v128: a commit writes localStorage first and IndexedDB second. If the tab closes or IndexedDB fails in
  // between, localStorage is AHEAD within the same epoch. A lagging replica is only ever behind, and an explicit
  // reset changes the epoch, so "same epoch, local ahead" can only be an interrupted commit: roll the counter
  // forward instead of locking the journal until a reset wipes it (v126/v127 behaviour).
  {const le=host.localStorage.getItem(EKEY),lv=lsVersion();
   if(le&&lv>state.v&&(state.epoch===le||state.epoch===null)){host.NRDiagnostics?.record('journal.sync_rollforward','recoverable',new Error('counter '+state.v+' < local '+lv));state={v:lv,epoch:le};await syncState(db,state)}}
  for(let i=0;lsVersion()!==state.v||(state.epoch!==null&&host.localStorage.getItem(EKEY)!==state.epoch);i++){
   if(i>=SYNC_WAIT_STEPS)throw new Error('Journal storage not synchronized; reload or explicitly reset the journal');
   await new Promise(r=>setTimeout(r,SYNC_STEP_MS));
  }
  syncBlocked=false;prepared=true;const before=snapshot();
  try{return await task()}finally{if(snapshot()!==before){
   try{const next={v:state.v+1,epoch:state.epoch||freshEpoch()};
   host.localStorage.setItem(EKEY,next.epoch);host.localStorage.setItem(VKEY,String(next.v));
   await syncState(db,next)}catch(e){throw markSyncBlocked(e)}
  }}
 }catch(e){throw prepared?e:markSyncBlocked(e)}finally{db?.close()}
}

function writeLocked(task){
 const locks=host.navigator?.locks;
 if(locks&&typeof locks.request==='function')return locks.request(WRITE_LOCK,{mode:'exclusive'},()=>synced(task));
 // Browser writes without a cross-tab lock fail closed. Non-browser hosts have
 // one event loop; their synchronous snapshot/check/store remains indivisible.
 if(host.navigator)return Promise.reject(new Error('Journal write lock unavailable; open the app over HTTPS in a supported browser'));
 return Promise.resolve().then(task);
}
function assertUnchanged(stamp){if(snapshot()!==stamp)throw new Error('Journal changed concurrently; retry or export again')}

// Records every date that has a usable final score (expert, or fresh/offline formula) and is
// today or later in Kyiv. Stale/missing/invalid days are not recorded: missing is not zero.
function record(rows,now=Date.now()){
 chain=chain.then(()=>writeLocked(async()=>{
  const A=host.NRConsumerAuthority;if(!A||!rows||typeof rows!=='object')return 0;
  const integrity=await verify();if(!integrity.ok)throw new Error('Journal integrity failed');
  const stamp=verifiedSnapshot;assertUnchanged(stamp);const doc=load(),today=kyivDay(now),latest=new Map();
  for(const e of doc.entries)latest.set(e.target_date,e); // a v122 carry entry exposes the carried fingerprint at top level
  let added=0,full=false;
  for(const ds of Object.keys(rows).sort()){
   if(ds<today)continue;
   const r=A.resolveFinal(rows[ds],ds,now,false);
   if(!r.available||!['expert','fresh','offline'].includes(r.state))continue;
   const inputs=inputsOf(r,rows[ds]),fingerprint=await sha256(canonical(materialOf(inputs))),prev=latest.get(ds);
   if(prev&&prev.fingerprint_policy===FP_POLICY&&prev.inputs_sha256===fingerprint)continue;
   // v115: at capacity keep what already fits in this batch and stop; old entries are never dropped.
   if(doc.entries.length>=MAX){full=true;break}
   const last=doc.entries[doc.entries.length-1];
   const entry={seq:(last?last.seq:0)+1,issued_at:new Date(now).toISOString(),issued_kyiv_day:today,target_date:ds,lead_days:Math.round((Date.parse(ds+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/864e5),
    model_version:MODEL,revision_of:prev?prev.seq:null,inputs,inputs_sha256:fingerprint,fingerprint_policy:FP_POLICY,prev_hash:last?last.hash:null};
   entry.hash=await sha256(canonical(entry));
   doc.entries.push(entry);latest.set(ds,entry);added++;
  }

  if(added){assertUnchanged(stamp);store(doc);}
  if(full)host.NRDiagnostics?.record('journal.capacity','recoverable',new Error('Journal capacity reached; export before further recording'));
  host.dispatchEvent?.(new CustomEvent('nr:journal-updated',{detail:{added,capacity_reached:full}}));
  return added;
 })).catch(e=>{host.NRDiagnostics?.record('journal.record','recoverable',e);return 0});
 return chain;
}
// Outcome: the user's own rating of the finished day (−3…+3) and an optional short note.
// Only for days that are over in Kyiv; once set it is not overwritten (a correction is a new outcome entry).
const OKEY='nr_forecast_outcomes_v1';
function outcomes(){const x=read(OKEY,[]);if(!Array.isArray(x))throw new Error('Invalid outcomes');return x}
function recordOutcome(date,value,note='',now=Date.now()){const task=chain.then(()=>writeLocked(()=>recordOutcomeInner(date,value,note,now)));chain=task.catch(()=>{});return task;}
async function recordOutcomeInner(date,value,note='',now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date>=kyivDay(now))throw new Error('Outcome only for a finished day');
 if(!Number.isInteger(value)||value<-3||value>3)throw new Error('Outcome must be an integer −3…+3');
 const integrity=await verify();if(!integrity.ok)throw new Error('Journal integrity failed');
 const stamp=verifiedSnapshot;assertUnchanged(stamp);const list=outcomes(),prev=list.filter(o=>o.target_date===date).pop()||null;
 const o={target_date:date,value,note:String(note||'').slice(0,280),recorded_at:new Date(now).toISOString(),correction_of:prev?prev.recorded_at:null,prev_hash:list.length?list[list.length-1].hash:null};
 o.hash=await sha256(canonical(o));list.push(o);
 try{assertUnchanged(stamp);host.localStorage.setItem(OKEY,JSON.stringify(list))}catch(e){host.NRDiagnostics?.record('journal.outcome','recoverable',e);throw e}
 return o;
}
async function verify(){
 if(syncBlocked)return {ok:false,reason:"sync_required"};
 verifiedSnapshot=null;const stamp=snapshot();try{
 const doc=load();let prev=doc.anchor?doc.anchor.tip_hash:null; // v122: a new segment continues the archived chain tip
 if(doc.anchor&&!/^[a-f0-9]{64}$/.test(String(doc.anchor.tip_hash)))return {ok:false,reason:'invalid_anchor'};
 for(const e of doc.entries){const {hash,...body}=e;if(e.prev_hash!==prev||await sha256(canonical(body))!==hash)return {ok:false,at:e.seq};
  if(e.kind==='carry'){const {hash:oh,...ob}=e.original||{};if(!e.original||await sha256(canonical(ob))!==oh||e.original.target_date!==e.target_date)return {ok:false,at:e.seq,reason:'carried_entry'}}
  prev=hash}
 let p2=null;for(const o of outcomes()){const {hash,...body}=o;if(o.prev_hash!==p2||await sha256(canonical(body))!==hash)return {ok:false,outcome:o.target_date};p2=hash}
 if(snapshot()!==stamp)return {ok:false,reason:'concurrent_write'};verifiedSnapshot=stamp;
 return {ok:true,entries:doc.entries.length,outcomes:outcomes().length};
 }catch(e){return {ok:false,reason:String(e.message)}}
}
// Pairs: the last forecast issued BEFORE the target day vs the latest outcome for that day.
function pairs(){
 if(verifiedSnapshot===null||verifiedSnapshot!==snapshot())return [];
 const doc=load(),out=new Map();for(const o of outcomes())out.set(o.target_date,o);
 const best=new Map();for(const x of doc.entries){const e=view(x);if(e.issued_kyiv_day<e.target_date)best.set(e.target_date,e)}
 return [...best.values()].filter(e=>out.has(e.target_date)).map(e=>({target_date:e.target_date,issued_at:e.issued_at,lead_days:e.lead_days,authority:e.inputs.authority,forecast:e.inputs.score,formula:e.inputs.formula.score,outcome:out.get(e.target_date).value,forecast_hash:e.hash,outcome_hash:out.get(e.target_date).hash}));
}
async function exportJson(){
 let integrity=await verify();const stamp=snapshot(),raw=host.localStorage.getItem(KEY),rawOutcomes=host.localStorage.getItem(OKEY);
 if(integrity.ok&&verifiedSnapshot!==stamp)integrity={ok:false,reason:'concurrent_write'};
 let journal=integrity.ok?load():null,results=integrity.ok?outcomes():null,matched=integrity.ok?pairs():[];
 const rawHash=raw===null?null:await sha256(raw);
 if(snapshot()!==stamp){integrity={ok:false,reason:'concurrent_write'};journal=null;results=null;matched=[];}
 return {integrity,schema:'nr-forecast-journal-export-v1',exported_at:new Date().toISOString(),model_version:MODEL,
 scope:'Prospective record on this device. Agreement with the expert is not evidence of accuracy; pairs are the only outcome evidence.',
 raw_journal:raw,raw_journal_sha256:rawHash,raw_outcomes:rawOutcomes,journal,outcomes:results,pairs:matched};
}
// v122 archive: (1) the user downloads exportJson() (it carries raw_journal_sha256); (2) commitArchive(sha)
// starts a new segment only if the stored journal is byte-identical to that export. The new segment's chain
// continues from the archived tip (anchor), so the archive and the device form one verifiable chain.
// For every target day that still lacks an outcome (from 30 days back) the last forecast issued before
// that day is carried over verbatim with its own hash: pairs and revision fingerprints survive archiving.
// Outcomes are never moved or deleted. Nothing is removed without a matching export.
const CARRY_DAYS=30;
function view(e){return e&&e.kind==='carry'?e.original:e}
function capacity(){const doc=load();return {entries:doc.entries.length,max:MAX,segment:doc.segment||1,anchor:doc.anchor||null,syncBlocked,writable:!host.navigator||(typeof host.navigator.locks?.request==='function'&&!!host.indexedDB)}}
function commitArchive(rawSha,now=Date.now()){const task=chain.then(()=>writeLocked(()=>commitInner(rawSha,now)));chain=task.catch(()=>{});return task}
async function commitInner(rawSha,now){
 const integrity=await verify();if(!integrity.ok)throw new Error('Journal integrity failed');
 const stamp=verifiedSnapshot;assertUnchanged(stamp);const raw=host.localStorage.getItem(KEY);if(raw===null)throw new Error('Nothing to archive');
 if(!/^[a-f0-9]{64}$/.test(String(rawSha))||await sha256(raw)!==rawSha)throw new Error('Journal changed since the archive export; export again');
 const doc=load(),last=doc.entries[doc.entries.length-1];if(!last)throw new Error('Nothing to archive');
 const done=new Set(outcomes().map(o=>o.target_date)),from=kyivDay(now-CARRY_DAYS*864e5),best=new Map();
 for(const x of doc.entries){const e=view(x);if(e.issued_kyiv_day<e.target_date&&e.target_date>=from&&!done.has(e.target_date))best.set(e.target_date,{e,fp:x.fingerprint_policy,inputs_sha256:x.inputs_sha256})}
 const next={schema:SCHEMA,segment:(doc.segment||1)+1,anchor:{previous_segment:doc.segment||1,tip_seq:last.seq,tip_hash:last.hash,archived_raw_sha256:rawSha,archived_entries:doc.entries.length,archived_at:new Date(now).toISOString()},entries:[]};
 let prev=last.hash,seq=last.seq;
 for(const [ds,{e,fp,inputs_sha256}] of [...best.entries()].sort()){const c={seq:++seq,kind:'carry',target_date:ds,carried_at:new Date(now).toISOString(),original:e,fingerprint_policy:fp??null,inputs_sha256:inputs_sha256??null,prev_hash:prev};c.hash=await sha256(canonical(c));next.entries.push(c);prev=c.hash}
 assertUnchanged(stamp);store(next);host.dispatchEvent?.(new CustomEvent('nr:journal-updated',{detail:{archived:doc.entries.length,carried:next.entries.length}}));
 return {segment:next.segment,archived:doc.entries.length,carried:next.entries.length,anchor:next.anchor};
}
// Explicit reset commits a fresh epoch BEFORE clearing the local mirror. A stale tab
// must observe the epoch and empty mirror before it can write. The non-personal
// tombstone remains in IndexedDB; deleting it would let old replicas resurrect data.
function clearAll(){
 const run=async()=>{
  let db;try{
   let epoch=null;
   if(host.indexedDB){db=await syncDb();epoch=freshEpoch();await syncState(db,{v:0,epoch})}
   else if(host.navigator)throw new Error('Journal reset needs access to IndexedDB');
   for(const k of [KEY,OKEY,VKEY,EKEY])host.localStorage.removeItem(k);
   if(epoch!==null)host.localStorage.setItem(EKEY,epoch);
   verifiedSnapshot=null;syncBlocked=false;
   host.dispatchEvent?.(new CustomEvent('nr:journal-updated',{detail:{reset:true}}));
   return {cleared:[KEY,OKEY,VKEY],sync_db:epoch===null?'absent':'reset_marker',epoch};
  }catch(e){throw markSyncBlocked(e)}finally{db?.close()}
 };
 const locks=host.navigator?.locks;
 const task=chain.then(()=>locks&&typeof locks.request==='function'?locks.request(WRITE_LOCK,{mode:'exclusive'},run):run());
 chain=task.catch(()=>{});return task;
}
const STORAGE_KEYS=Object.freeze([KEY,OKEY,VKEY]);
const api=Object.freeze({record,recordOutcome,verify,pairs,exportJson,load,outcomes,capacity,commitArchive,clearAll,view,STORAGE_KEYS,SYNC_DB,RESET_MARKER:EKEY,MAX,MODEL});

host.NRForecastJournal=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
