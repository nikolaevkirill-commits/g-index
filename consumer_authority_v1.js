(function(host){
'use strict';
// Delivery provenance lives in memory, never in fields supplied by a feed.
// Trust boundary: this app's HTTPS publication and same-origin service worker.
// This is not a signature or protection against compromise of that origin.
const deliveredResults=new WeakSet(),deliveredRows=new WeakSet();
function freeze(value){if(value&&typeof value==='object'){for(const x of Object.values(value))freeze(x);Object.freeze(value);}return value;}

function resolve(row, date, now=Date.now(), offline=false){
  const own=row?.channels?.source_formula;
  const valid=x=>typeof x==='number'&&Number.isInteger(x)&&x>=-3&&x<=3;
  const short=own?.kp_source==='NOAA_3day_slots';
  const generated=Date.parse(own?.generated_at||''),issued=Date.parse((short?own?.noaa_retrieved_at:own?.noaa_issued_at)||'');
  // Governance 10.10.2026: a row that declares an expert override is never a consumer score.
  const inputValid=!!row&&deliveredRows.has(row)&&row?.date===date&&own?.available===true&&valid(own.value)&&own.expert_override_used!==true;
  const future=generated>now||issued>now;
  const freshness=Number.isFinite(generated)&&Number.isFinite(issued)&&!future&&now-generated<=8*3600000&&now-issued<=(short?8*3600000:8*86400000);
  offline=offline||row?._consumer_cached===true;
  const state=!inputValid?'missing':future?'invalid':!freshness?'stale':offline?'offline':'fresh';
  const available=inputValid&&freshness;
  return {schema:'consumer-authority-v1',date,authority:'source_formula',score:available?own.value:null,
    lastScore:inputValid&&!future?own.value:null,available,state,generated_at:own?.generated_at||null,
    source_issued_at:own?.noaa_issued_at||null,source_retrieved_at:own?.noaa_retrieved_at||null,kp_source:own?.kp_source||null,independence:'shared_source_formula_not_independent_validation'};
}
// v113 decision (owner, 18.10.2026): a verified expert PDF decision has the highest
// priority. The final consumer score is expert_pdf when such a decision exists for
// the date, otherwise source_formula. The formula result is kept as a separate,
// labelled component; it is never replaced or mixed into the expert value.
// Gate = the same verification rule the runtime uses for overrides (verified flag,
// source PDF, sha256 hash format or a recorded manual PDF reading).
let expertDecisions=Object.freeze({});
function expertFor(date){return expertDecisions[date]||null;}
async function loadExpertDecisions(base){
 // v126: keep the validated snapshot while a refresh is in flight; swap only after validation.
 const url=new URL('consumer_cloud/final_score_decisions.json',base),controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
 try{const response=await fetch(url,{cache:'no-store',redirect:'error',credentials:'same-origin',signal:controller.signal});
 if(!response.ok||response.redirected||response.type==='opaque'||(response.url&&response.url!==url.href))throw new Error('Decision delivery rejected');
 const doc=await response.json();if(doc.schema!=='consumer-final-decisions-v1'||!Array.isArray(doc.decisions))throw new Error('Invalid decisions');
 const entries={};for(const o of doc.decisions){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||!Number.isInteger(o.score)||o.score< -3||o.score>3||!/^[a-f0-9]{64}$/i.test(o.source_sha256)||!Number.isInteger(o.source_page)||o.source_page<1||!o.decision_id||entries[o.date])throw new Error('Invalid/duplicate decision');
 entries[o.date]=Object.freeze({score:o.score,source_pdf:o.decision_id,source_page:o.source_page,source_sha256:o.source_sha256,decision_id:o.decision_id});
 }expertDecisions=Object.freeze(entries);
 }catch(e){expertDecisions=Object.freeze({});host.NRDiagnostics?.record('consumer.decisions','recoverable');}finally{clearTimeout(timer)}
}
function resolveFinal(row,date,now=Date.now(),offline=false){
 const formula=resolve(row,date,now,offline),expert=expertFor(date);
 if(!expert)return Object.freeze({...formula,formula,expert:null});
 return Object.freeze({...formula,authority:'expert_pdf',score:expert.score,lastScore:expert.score,available:true,state:'expert',formula,expert,
  independence:'expert_verdict_not_independent_validation'});
}
function present(r){
 const n=r.score,key=!r.available?null:n>=2?'favorable':n>=1?'good':n===0?'neutral':n===-1?'unstable':'tense';
 const label=!r.available?'Немає актуальної оцінки':n>0?'Позитивна оцінка':n<0?'Негативна оцінка':'Нейтральна оцінка';
 const fmt=n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
 return {available:r.available,opKey:key,bucket:!r.available?'none':n>0?'act':n<0?'hold':'check',
 className:!r.available?'state-none':n>0?'state-act':n<0?'state-hold':'state-check',
 coverState:!r.available?'none':n>0?'act':n<0?'hold':'check',symbol:fmt,label,title:'Оцінка моделі '+fmt,
 summary:r.state==='expert'?'Експертна правка (PDF '+r.expert.source_pdf+'): '+fmt+'. Точність щодо подій не підтверджена.':r.state==='stale'?(Number.isInteger(r.lastScore)&&r.lastScore>=-3&&r.lastScore<=3?'Дані застаріли. Остання збережена оцінка: '+(r.lastScore>0?'+'+r.lastScore:r.lastScore<0?'−'+Math.abs(r.lastScore):r.lastScore)+'.':'Дані застаріли.'):r.state==='missing'?'Недостатньо даних для розрахунку.':r.state==='invalid'?'Час джерела не пройшов перевірку.':
 (r.state==='offline'?'Офлайн: збережений розрахунок. ':'')+'Розрахунок за формулою джерела. Точність щодо подій не підтверджена.',
 do:'Перегляньте складові оцінки та стан джерел.',avoid:'Оцінка не гарантує результату справ і не визначає найкращий час.'};
}
function selectFeeds(results,now=Date.now()){
 const days=Object.create(null),expertModels=Object.create(null);let accepted=0;const rank=Object.create(null);
 for(const result of results){
  // A public API call or a JSON flag cannot manufacture a delivery receipt.
  if(!result||!deliveredResults.has(result)||result.cloud!==true)continue;
  const feed=result.feed;
  if(feed?.schema!=='independent_forecast_feed_v1'||!feed.days||typeof feed.days!=='object'||Array.isArray(feed.days))continue;
  if(feed.executor!=='github-actions-source-only-v1'||feed.source_integrity?.status!=='PASS')continue;
  accepted++;
  for(const [ds,row] of Object.entries(feed.days)){
   // Reject malformed calendar keys and invalid channel payloads before ranking.
   if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(ds)||!Number.isFinite(Date.parse(ds+'T00:00:00Z'))||new Date(ds+'T00:00:00Z').toISOString().slice(0,10)!==ds||row?.date!==ds)continue;
   const model=row?.channels?.source_formula?.expert_model;
   if(model?.version==='expert-factor-model-v2'&&model.date===ds)expertModels[ds]=freeze({...model});
   const candidate=row?.channels?.source_formula;
   if(candidate?.available!==true||typeof candidate.value!=='number'||!Number.isInteger(candidate.value)||candidate.value< -3||candidate.value>3||candidate.expert_override_used===true)continue;
   // Multiple verified deliveries may contain the same day. Never allow an older
   // snapshot to win merely because it appears later in the response array.
   const source=row.channels?.source_formula;
   const generated=Date.parse(source?.generated_at||'');
   if(!Number.isFinite(generated))continue;
   const issued=Date.parse((source?.kp_source==='NOAA_3day_slots'?source?.noaa_retrieved_at:source?.noaa_issued_at)||'');
   if(!Number.isFinite(issued))continue;
   const fingerprint=JSON.stringify(source);
   const previous=rank[ds];
   if(previous){
     if(previous.conflict&&generated===previous.generated&&issued===previous.issued)continue;
     if(generated<previous.generated || (generated===previous.generated&&issued<previous.issued))continue;
     if(generated===previous.generated&&issued===previous.issued){
       // Equally timestamped contradictory inputs are ambiguous, not a tie
       // that should silently depend on feed ordering.
       if(fingerprint!==previous.fingerprint){delete days[ds];rank[ds]={generated,issued,fingerprint:null,conflict:true};}
       continue;
     }
   }
   const selected=freeze({...row,_consumer_cached:result.cached===true,_consumer_executor:'cloud'});
   deliveredRows.add(selected);days[ds]=selected;
   rank[ds]={generated,issued,fingerprint,conflict:false};
  }
 }
 if(!accepted)throw new Error('No verified consumer delivery');
 return Object.freeze({schema:'independent_forecast_feed_v1',days:Object.freeze(days),expertModels:Object.freeze(expertModels)});
}
async function loadFeeds(scope){
 // No local fallback: a cloud gap remains missing. Only this fixed endpoint is
 // eligible, including its same-origin SW cache; source freshness stays in resolve.
 const base=new URL('./',host.location.href),requested=new URL('./',scope);
 const loopback=['127.0.0.1','localhost','[::1]'].includes(base.hostname);
 if(requested.href!==base.href||(base.protocol!=='https:'&&!(base.protocol==='http:'&&loopback)))throw new Error('Untrusted consumer scope');
 const url=new URL('consumer_cloud/forecast.json',base);
 const controller=new AbortController();let timer;
 try{
  const result=await Promise.race([(async()=>{
   const response=await fetch(url,{cache:'no-store',redirect:'error',credentials:'same-origin',signal:controller.signal});
   if(!response.ok||response.redirected||response.type==='opaque')throw new Error('Consumer delivery rejected');
   if(response.url&&response.url!==url.href)throw new Error('Unexpected consumer endpoint');
   const result=freeze({feed:await response.json(),cloud:true,cached:response.headers?.get('x-gindex-delivery')==='cached'});
   deliveredResults.add(result);return result;
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('consumer source deadline'))},3500)})]);
  const selected=selectFeeds([result]);await loadExpertDecisions(base);return selected;
 }catch(e){host.NRDiagnostics?.record('consumer.source','recoverable');
  // v115: the expert registry is a separate controlled endpoint; a missing/failed formula feed
  // must not hide a verified expert decision (18.10 governance: expert > formula).
  await loadExpertDecisions(base);throw e}
 finally{clearTimeout(timer)}
}
const api=Object.freeze({resolve,resolveFinal,expertFor,present,selectFeeds,loadFeeds});host.NRConsumerAuthority=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
