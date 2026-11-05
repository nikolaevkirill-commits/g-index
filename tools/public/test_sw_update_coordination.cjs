'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../../sw_update_coordination_v1.js'),'utf8'),channels=new Map();
class Channel{constructor(name){this.name=name;this.onmessage=null;if(!channels.has(name))channels.set(name,new Set());channels.get(name).add(this)}postMessage(data){for(const peer of channels.get(this.name))if(peer!==this)queueMicrotask(()=>peer.onmessage?.({data}))}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function page(scope,fetch){const w={location:{href:'https://test.invalid/'+scope+'/index.html',origin:'https://test.invalid'},fetch};const c={window:w,URL,Date,Math,Promise,Set,Map,DOMException,setTimeout,BroadcastChannel:Channel};vm.createContext(c);vm.runInContext(code,c);return w}
(async()=>{
let finish,reads=0,writes=0,external=0;
const a=page('a',async()=>({ok:true}));
const b=page('a',(input,init)=>{if(init?.method==='POST'){writes++;return Promise.resolve({ok:true})}if(String(input).startsWith('https://external.invalid')){external++;return Promise.resolve({ok:true})}reads++;if(String(input).endsWith('slow'))return new Promise(r=>finish=r);return Promise.resolve({ok:true})});
const slow=b.fetch('/slow'),started=Date.now(),preparing=a.NRUpdateCoordinator.prepare();let finished=false;preparing.then(()=>finished=true);await wait(50);
const queued=b.fetch('/queued');assert.equal(reads,1,'new reads in the peer must wait');
await b.fetch('/save',{method:'POST'});await b.fetch('https://external.invalid/api');assert.equal(writes,1);assert.equal(external,1);
const abort=new AbortController();const cancelled=b.fetch('/cancelled',{signal:abort.signal});abort.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');
await wait(170);assert.equal(finished,false,'pending peer read must prevent early activation');finish({ok:true});await slow;assert.equal(await preparing,true);assert(Date.now()-started>=220);
await queued;assert.equal(reads,2);assert(Date.now()-started<4500,'read gate must expire');
const c=page('b',()=>new Promise(()=>{})),d=page('b',async()=>({ok:true}));c.fetch('/never');const rejected=await d.NRUpdateCoordinator.prepare();assert.equal(rejected,false,'busy peer must fail preparation rather than claim ready');
console.log('PASS coordination: peer drain; reads held; POST/external unaffected; abort; bounded release; busy peer refuses activation');
})().catch(e=>{console.error(e);process.exitCode=1});
