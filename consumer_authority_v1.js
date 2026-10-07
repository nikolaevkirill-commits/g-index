(function(host){
'use strict';
function resolve(row, date, now=Date.now(), offline=false){
  const own=row?.channels?.source_formula;
  const valid=x=>typeof x==='number'&&Number.isInteger(x)&&x>=-3&&x<=3;
  const short=own?.kp_source==='NOAA_3day_slots';
  const generated=Date.parse(own?.generated_at||''),issued=Date.parse((short?own?.noaa_retrieved_at:own?.noaa_issued_at)||'');
  const inputValid=row?.date===date&&own?.available===true&&valid(own.value);
  const future=generated>now||issued>now;
  const freshness=Number.isFinite(generated)&&Number.isFinite(issued)&&!future&&now-generated<=8*3600000&&now-issued<=(short?8*3600000:8*86400000);
  offline=offline||row?._consumer_cached===true;
  const state=!inputValid?'missing':future?'invalid':!freshness?'stale':offline?'offline':'fresh';
  const available=inputValid&&freshness;
  return {schema:'consumer-authority-v1',date,authority:'source_formula',score:available?own.value:null,
    lastScore:inputValid&&!future?own.value:null,available,state,generated_at:own?.generated_at||null,
    source_issued_at:own?.noaa_issued_at||null,source_retrieved_at:own?.noaa_retrieved_at||null,kp_source:own?.kp_source||null,independence:'shared_source_formula_not_independent_validation',
    expertReference:row?.channels?.expert_pdf?.available===true&&valid(row.channels.expert_pdf.value)?row.channels.expert_pdf.value:null};
}
function present(r){
 const n=r.score,key=!r.available?null:n>=2?'favorable':n>=1?'good':n===0?'neutral':n===-1?'unstable':'tense';
 const label=!r.available?'Немає актуальної оцінки':n>0?'Позитивна оцінка':n<0?'Негативна оцінка':'Нейтральна оцінка';
 const fmt=n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
 return {available:r.available,opKey:key,bucket:!r.available?'none':n>0?'act':n<0?'hold':'check',
 className:!r.available?'state-none':n>0?'state-act':n<0?'state-hold':'state-check',
 coverState:!r.available?'none':n>0?'act':n<0?'hold':'check',symbol:fmt,label,title:'Оцінка моделі '+fmt,
 summary:r.state==='stale'?'Дані застаріли. Остання збережена оцінка: '+(r.lastScore>0?'+'+r.lastScore:r.lastScore<0?'−'+Math.abs(r.lastScore):r.lastScore)+'.':r.state==='missing'?'Недостатньо даних для розрахунку.':r.state==='invalid'?'Час джерела не пройшов перевірку.':
 (r.state==='offline'?'Офлайн: збережений розрахунок. ':'')+'Розрахунок за формулою джерела. Точність щодо подій не підтверджена.',
 do:'Перегляньте складові оцінки та стан джерел.',avoid:'Оцінка не гарантує результату справ і не визначає найкращий час.'};
}
function selectFeeds(results,now=Date.now()){
 const days={};let accepted=0;
 for(const result of results){
  const feed=result?.feed;if(!feed||feed.schema!=='independent_forecast_feed_v1'||!feed.days||Array.isArray(feed.days))continue;
  if(result.cloud&&(feed.executor!=='github-actions-source-only-v1'||feed.source_integrity?.status!=='PASS'))continue;
  accepted++;
  for(const [ds,row] of Object.entries(feed.days)){
   if(row?.date!==ds)continue;
   const own=row.channels?.source_formula,t=Date.parse(own?.generated_at||'');
   if(!Number.isFinite(t)||t>now){if(!result.cloud&&!days[ds])days[ds]={...row,_consumer_cached:result.cached===true,_consumer_executor:'local'};continue;}
   const previous=days[ds],pt=Date.parse(previous?.channels?.source_formula?.generated_at||'');
   if(previous&&pt>=t)continue;
   // Selection does not grant freshness or validate a score; resolve still does both.
   days[ds]={...row,_consumer_cached:result.cached===true,_consumer_executor:result.cloud?'cloud':'local'};
  }
 }
 if(!accepted)throw new Error('No valid consumer feeds');
 return {schema:'independent_forecast_feed_v1',days};
}
async function loadFeeds(scope){
 const results=await Promise.all(['INDEPENDENT_FORECAST_FEED_v1.json','consumer_cloud/forecast.json'].map(async (name,i)=>{
  const controller=new AbortController();let timer;
  try{
   return await Promise.race([(async()=>{
   const response=await fetch(new URL(name,scope),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('consumer feed HTTP '+response.status);
   return {feed:await response.json(),cloud:i===1,cached:response.headers?.get('x-gindex-delivery')==='cached'};
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('consumer source deadline'))},3500)})]);
  }catch(e){host.NRDiagnostics?.record('consumer.source','recoverable');return null}
  finally{clearTimeout(timer)}
 }));
 return selectFeeds(results);
}
const api=Object.freeze({resolve,present,selectFeeds,loadFeeds});host.NRConsumerAuthority=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
