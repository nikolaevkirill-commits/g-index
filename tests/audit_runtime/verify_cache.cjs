const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const events={},stores=new Map(),messages=[];let online=true,revision=1,requests=0,pendingOld=null;
const normalize=k=>typeof k==='string'?new URL(k,'https://test.local/').href:k.url;
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async put(k,v){data.set(normalize(k),v.clone());},async match(k){return data.get(normalize(k))?.clone();}};},async match(k){for(const data of stores.values()){if(data.has(normalize(k)))return data.get(normalize(k)).clone();}}};
const context=vm.createContext({URL,Headers,Response,AbortController,setTimeout,clearTimeout,Date,caches,self:{location:{origin:'https://test.local'},addEventListener:(name,fn)=>events[name]=fn,clients:{get:async id=>{assert.equal(id,'test-client');return {postMessage:m=>messages.push(m)}},matchAll:async()=>{throw Error('Broadcast forbidden')} }},fetch:async req=>{requests++;if(req.url.includes('race.json')&&revision===10)return new Promise(r=>pendingOld=r);if(!online)throw Error('offline');return new Response('revision-'+revision,{status:200});}});
vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
async function get(pathname,mode='cors'){let result;events.fetch({clientId:'test-client',request:{url:'https://test.local'+pathname,method:'GET',mode},respondWith(p){result=p;}});assert(result);const response=await result;assert.equal(response.headers.get('x-gindex-delivery'),online?'network':'cached');return response.text();}
(async()=>{
 const checks=[];
 for(const suffix of ['csv','jsonl','json']){revision=1;assert.equal(await get('/data.'+suffix),'revision-1');revision=2;assert.equal(await get('/data.'+suffix),'revision-2');online=false;assert.equal(await get('/data.'+suffix),'revision-2');online=true;checks.push(suffix+'_network_first_and_offline');}
 for(let i=0;i<20;i++)await get('/health.json?fresh='+i);
 const keys=[...stores.values()].flatMap(s=>[...s.keys()]);assert.equal(keys.filter(k=>k.includes('health.json')).length,1);checks.push('fresh_parameter_one_cache_entry');
 await get('/index.html?channel=play','navigate');await get('/index.html','navigate');online=false;assert.equal(await get('/index.html?channel=play','navigate'),'revision-2');checks.push('play_navigation_query_retained');
 assert(messages.filter(x=>x.type==='SW_STALE_DATA').length>=4);assert(messages.some(x=>x.type==='SW_FRESH_DATA'));assert(messages.every(x=>Number.isFinite(x.requestOrder)));checks.push('fresh_and_cached_delivery_to_requesting_client');
 online=true;revision=10;const older=get('/race.json');while(!pendingOld)await new Promise(r=>setTimeout(r,1));revision=11;assert.equal(await get('/race.json'),'revision-11');pendingOld(new Response('revision-10'));assert.equal(await older,'revision-10');online=false;assert.equal(await get('/race.json'),'revision-11');checks.push('late_response_cannot_overwrite_newer_cache');
 const store=[...stores.values()].find(s=>s.has('https://test.local/race.json'));store.set('https://test.local/race.json',new Response('unknown-age',{headers:{'x-gindex-cached-at':String(Date.now()+86400000)}}));assert.equal(await get('/race.json'),'unknown-age');assert.equal(messages.at(-1).fetchedAt,null);assert.equal(messages.at(-1).ageUnknown,true);checks.push('future_cache_timestamp_reported_unknown');
 const XLSX=require(path.join(root,'xlsx-0.20.3.full.min.js'));assert.equal(XLSX.version,'0.20.3');
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Дата','Оцінка'],['2026-09-15',-3]]),'ДАНІ_ЩОДЕННІ');
 const restored=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});assert.deepEqual(XLSX.utils.sheet_to_json(restored.Sheets['ДАНІ_ЩОДЕННІ']),[{'Дата':'2026-09-15','Оцінка':-3}]);checks.push('xlsx_Ukrainian_workbook_roundtrip');
 fs.writeFileSync(path.join(__dirname,'CACHE_RESULTS.json'),JSON.stringify({checks,requests,keys},null,2));console.log('PASS',checks.length,'cache/XLSX checks');
})().catch(e=>{console.error(e);process.exitCode=1});
