const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const h=require('../../tools/read_runtime_source.cjs')(require('path').resolve(__dirname,'../..'));
const code=h.slice(h.indexOf('function withTimeout('),h.indexOf('// v88.8.35-fp56-P8: lightweight JSON sniff'));
const checks=[];
function env(fetch,play=false){const timers=new Set();const c={window:{GINDEX_PLAY_CHANNEL:play},NOAA_WORKER_URL:'https://worker.test/?url=',fetch,AbortController,DOMException,Promise,console:{warn(){}},setTimeout:(f,ms)=>{const id=setTimeout(()=>{timers.delete(id);f()},ms);timers.add(id);return id},clearTimeout:id=>{clearTimeout(id);timers.delete(id)}};vm.createContext(c);vm.runInContext(code,c);return {c,timers};}
(async()=>{
 for(const body of [false,true]){
  let calls=0,aborts=0;const {c,timers}=env(async(u,{signal})=>{calls++;const pending=new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborts++;reject(new DOMException('Cancelled','AbortError'))},{once:true}));return body?{ok:true,text:()=>pending}:pending;});
  await assert.rejects(c.withTimeout(c.fetchTextWithCORS('https://data.test/a'),20,'fixture'));
  await new Promise(r=>setTimeout(r,25));assert.equal(calls,1);assert.equal(aborts,1);assert.equal(c.window.__networkRequests.active,0);assert.equal(timers.size,0);
 }
 checks.push('deadline aborts fetch and body read; no later proxy; zero active requests and timers');
 {let calls=0;const {c,timers}=env(async()=>{calls++;return {ok:true,text:async()=>calls===1?'bad':'{"ok":true}'}});
  assert.equal(await c.withTimeout(c.fetchTextWithCORS('https://data.test/a',t=>t.startsWith('{')),1000),' {"ok":true}'.trim());assert.equal(calls,2);assert.equal(c.window.__networkRequests.active,0);assert.equal(timers.size,0);
 }
 checks.push('invalid worker response proceeds to valid direct fallback');
 {let calls=0;const {c,timers}=env(async()=>{calls++;throw Error('must not start')});const parent=new AbortController();parent.abort();await assert.rejects(c.fetchTextWithCORS('https://data.test/a',undefined,{signal:parent.signal}));assert.equal(calls,0);assert.equal(timers.size,0);}
 checks.push('already aborted parent starts no request');
 {const urls=[];const {c}=env(async u=>{urls.push(u);throw Error('offline')},true);await assert.rejects(c.fetchTextWithCORS('https://data.test/a'));assert.equal(urls.length,4);assert(!urls.some(u=>u.includes('allorigins')||u.includes('codetabs')));}
 checks.push('Play privacy exclusions preserved in whole fallback chain');
 {let calls=0;const {c,timers}=env(async(u,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}))});await assert.rejects(c.withTimeout(signal=>c.fetchTextWithCORS('https://data.test/a',undefined,{signal}),20));await new Promise(r=>setTimeout(r,5));assert.equal(calls,1);assert.equal(c.window.__networkRequests.active,0);assert.equal(timers.size,0);}
 checks.push('nested loader factory propagates shared deadline signal');
 {const urls=[];const {c}=env(async u=>{urls.push(u);throw Error('offline')});await assert.rejects(c.fetchTextWithCORS('LOCAL.json',undefined,{directOnly:true,timeoutMs:50}));assert.deepEqual(urls,['LOCAL.json']);}checks.push('local snapshot keeps its own deadline and never enters public proxy chain');

 fs.writeFileSync(path.join(__dirname,'NETWORK_DEADLINE_RESULTS.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
