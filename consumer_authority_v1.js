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
function present(r){
 const n=r.score,key=!r.available?null:n>=2?'favorable':n>=1?'good':n===0?'neutral':n===-1?'unstable':'tense';
 const label=!r.available?'Немає актуальної оцінки':n>0?'Позитивна оцінка':n<0?'Негативна оцінка':'Нейтральна оцінка';
 const fmt=n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
 return {available:r.available,opKey:key,bucket:!r.available?'none':n>0?'act':n<0?'hold':'check',
 className:!r.available?'state-none':n>0?'state-act':n<0?'state-hold':'state-check',
 coverState:!r.available?'none':n>0?'act':n<0?'hold':'check',symbol:fmt,label,title:'Оцінка моделі '+fmt,
 summary:r.state==='stale'?(Number.isInteger(r.lastScore)&&r.lastScore>=-3&&r.lastScore<=3?'Дані застаріли. Остання збережена оцінка: '+(r.lastScore>0?'+'+r.lastScore:r.lastScore<0?'−'+Math.abs(r.lastScore):r.lastScore)+'.':'Дані застаріли.'):r.state==='missing'?'Недостатньо даних для розрахунку.':r.state==='invalid'?'Час джерела не пройшов перевірку.':
 (r.state==='offline'?'Офлайн: збережений розрахунок. ':'')+'Розрахунок за формулою джерела. Точність щодо подій не підтверджена.',
 do:'Перегляньте складові оцінки та стан джерел.',avoid:'Оцінка не гарантує результату справ і не визначає найкращий час.'};
}
function selectFeeds(results,now=Date.now()){
 const days={};let accepted=0;
 for(const result of results){
  // A public API call or a JSON flag cannot manufacture a delivery receipt.
  if(!result||!deliveredResults.has(result)||result.cloud!==true)continue;
  const feed=result.feed;
  if(feed?.schema!=='independent_forecast_feed_v1'||!feed.days||typeof feed.days!=='object'||Array.isArray(feed.days))continue;
  if(feed.executor!=='github-actions-source-only-v1'||feed.source_integrity?.status!=='PASS')continue;
  accepted++;
  for(const [ds,row] of Object.entries(feed.days)){
   if(row?.date!==ds)continue;
   const selected=freeze({...row,_consumer_cached:result.cached===true,_consumer_executor:'cloud'});
   deliveredRows.add(selected);days[ds]=selected;
  }
 }
 if(!accepted)throw new Error('No verified consumer delivery');
 return Object.freeze({schema:'independent_forecast_feed_v1',days:Object.freeze(days)});
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
  return selectFeeds([result]);
 }catch(e){host.NRDiagnostics?.record('consumer.source','recoverable');throw e}
 finally{clearTimeout(timer)}
}
const api=Object.freeze({resolve,present,selectFeeds,loadFeeds});host.NRConsumerAuthority=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
