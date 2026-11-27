'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../../sw_update_coordination_v1.js'),'utf8'),channels=new Map();
class Channel{constructor(name){this.name=name;this.onmessage=null;if(!channels.has(name))channels.set(name,new Set());channels.get(name).add(this)}postMessage(data){for(const peer of channels.get(this.name))if(peer!==this)queueMicrotask(()=>peer.onmessage?.({data}))}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function page(scope, fetch, clock={Date,setTimeout}) {
  const window={AbortController,AbortSignal,location:{href:'https://test.invalid/'+scope+'/index.html',origin:'https://test.invalid'},fetch};
  const context=vm.createContext({window,URL,Date:clock.Date,Math,Promise,Set,Map,DOMException,
    setTimeout:clock.setTimeout,BroadcastChannel:Channel});
  vm.runInContext(code,context);
  return window;
}

async function assertUpdateKeepsPeerQuiet(entry) {
  let now=0;
  const timers=[];
  const clock={
    Date:{now:()=>now},
    setTimeout:(callback,delay)=>timers.push({callback,at:now+delay})
  };
  const flush=async()=>{ for(let n=0;n<12;n++) await Promise.resolve(); };
  const scope='retry-'+entry;
  const requester=page(scope,async()=>({ok:true}),clock);
  const readStarts=[];
  const peer=page(scope,()=>{
    readStarts.push(now);
    return new Promise(resolve=>clock.setTimeout(()=>resolve({ok:true}),2300));
  },clock);
  const source=fs.readFileSync(path.resolve(__dirname,'../..',entry),'utf8').replace(/\r\n/g,'\n');
  const start=source.indexOf('function pwaReload() {');
  assert(start>=0);
  const update=source.slice(start,source.indexOf('\n}',start)+2);
  const sent=[];
  const reg={waiting:{postMessage(message){
    assert.equal(message.type,'SKIP_WAITING');
    sent.push(now);
    reg.waiting=null;
  }}};
  requester.navigator={serviceWorker:{controller:{}}};
  const label={textContent:''};
  const button={disabled:false};
  const context=vm.createContext({window:requester,_swReg:reg,Date:clock.Date,Promise,
    document:{getElementById:()=>({querySelector:s=>s==='span'?label:button})},
    setTimeout:(fn,delay)=>clock.setTimeout(fn,delay<4000?delay+120:delay)
  });

  // One long read misses the first drain deadline. Later reads are already queued.
  void peer.fetch('/initial');
  for(let at=300;at<9000;at+=300) clock.setTimeout(()=>{void peer.fetch('/queued');},at);
  vm.runInContext(update+'\npwaReload()',context);
  await flush();
  while(timers.length&&sent.length===0) {
    timers.sort((a,b)=>a.at-b.at);
    const next=timers.shift();
    if(next.at>10000) break;
    now=next.at;
    next.callback();
    await flush();
  }
  assert.equal(sent.length,1,entry+' must activate after the first read drains');
  assert(sent[0]>=2300&&sent[0]<3500,entry+' must activate before paused reads restart');
  assert.deepEqual(readStarts,[0],entry+' must not let queued reads start before activation');
}

async function assertLateHandoff(entry) {
  const html=fs.readFileSync(path.resolve(__dirname,'../..',entry),'utf8').replace(/\r\n/g,'\n');
  const a=html.indexOf('function pwaReload() {');
  const update=html.slice(a,html.indexOf('\n}',a)+2);
  const b=html.indexOf("navigator.serviceWorker.addEventListener('controllerchange', () => {");
  assert(b>=0);
  const observe=html.slice(b,html.indexOf('\n        });',b)+12);
  let now=0,resolvePreparation;
  const timeouts=[];
  function createTab(){
    const button={disabled:false},label={textContent:''};
    let reloads=0,activationMessages=0,onChange;
    const oldWorker={};
    const serviceWorker={controller:oldWorker,addEventListener:(name,fn)=>{onChange=fn}};
    const waiting={postMessage(message){assert.equal(message.type,'SKIP_WAITING');activationMessages++}};
    const reg={waiting};
    const window={navigator:{serviceWorker},location:{reload(){reloads++}},
      NRUpdateCoordinator:{prepare:()=>new Promise(resolve=>{resolvePreparation=resolve})}};
    const bar={style:{},querySelector:s=>s==='button'?button:label};
    const context=vm.createContext({window,navigator:window.navigator,_swReg:reg,_swControlledAtBoot:true,
      document:{getElementById:()=>bar},Date:{now:()=>now},
      setTimeout:(fn,delay)=>{timeouts.push({fn,delay});}});
    vm.runInContext(observe,context);
    vm.runInContext(update,context);
    return {context,reg,button,waiting,oldWorker,serviceWorker,onChange:()=>onChange(),
      reloads:()=>reloads,messages:()=>activationMessages};
  }
  const requester=createTab(),peer=createTab();
  vm.runInContext('pwaReload()',requester.context);
  now=10001;
  timeouts.find(timer=>timer.delay===10000).fn();
  assert.equal(requester.button.disabled,false,'retry must be available');
  assert.equal(requester.reloads(),0,'elapsed time cannot confirm worker activation');
  resolvePreparation(true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requester.messages(),1,entry+' must send when preparation completes after the retry timer');
  peer.serviceWorker.controller=requester.waiting;peer.onChange();
  assert.equal(peer.reloads(),0,'unrelated tab must keep its draft');
  requester.reg.waiting=null;requester.serviceWorker.controller=requester.waiting;requester.onChange();
  assert.equal(requester.reloads(),1,'requesting tab must apply the selected worker even after the timer');
  requester.onChange();
  assert.equal(requester.reloads(),1,'duplicate change must not reload twice');
  const superseded=createTab();vm.runInContext('pwaReload()',superseded.context);
  superseded.serviceWorker.controller={};superseded.onChange();
  assert.equal(superseded.reloads(),0,'an unrelated worker must not consume this request');
}

async function assertHealthBodyReleased(file) {
  const source=fs.readFileSync(path.resolve(__dirname,'../..',file),'utf8').replace(/\r\n/g,'\n');
  const start=source.indexOf('  async function renderDataTruthGate');
  const end=source.indexOf('  function renderUnifiedForecast',start);
  assert(start>=0 && end>start);
  const box={};
  let reads=0,consumed=false,cancelled=false;
  const window={NR_PUBLIC_BUILD:true,__nrSystemHealth:{status:'previously verified'}};
  const context=vm.createContext({window,document:{getElementById:()=>box},escapeHtml:String,
    loadFutureKp:async()=>({}),fetch:async name=>{
      reads++;
      if(name.startsWith('SYSTEM_HEALTH'))return {ok:true,json:async()=>{consumed=true;return {}}};
      return {ok:false,status:404,body:{cancel:async()=>{cancelled=true}}};
    }});
  vm.runInContext(source.slice(start,end),context);
  await vm.runInContext('renderDataTruthGate()',context);
  assert.equal(reads,0,file+' public view must not start a health response for the unavailable research panel');
  assert.match(box.innerHTML,/BLOCKED/);
  assert.equal(window.__nrSystemHealth.status,'previously verified');
  window.NR_PUBLIC_BUILD=false;
  await vm.runInContext('renderDataTruthGate()',context);
  assert.equal(consumed,true,file+' release successful health body despite missing research cross-check');
  assert.equal(cancelled,true,file+' release failed research response');
  assert.match(box.innerHTML,/404/);
}

(async()=>{
for(const file of ['product_shell_v1.js','preview-v4/product_shell_v1.js','preview-b17/product_shell_v1.js'])await assertHealthBodyReleased(file);
const wind='https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json';
const proxy='https://corsproxy.io/?url='+encodeURIComponent(wind);
let finish,reads=0,writes=0,external=0,noaa=0;
const a=page('a',async()=>({ok:true}));
const b=page('a',(input,init)=>{if(init?.method==='POST'){writes++;return Promise.resolve({ok:true})}if(String(input)===wind||String(input)===proxy){noaa++;if(String(input)===wind)return new Promise(r=>finish=r);return Promise.resolve({ok:true})}if(String(input).startsWith('https://external.invalid')){external++;return Promise.resolve({ok:true})}reads++;if(String(input).endsWith('slow'))return new Promise(r=>finish=r);return Promise.resolve({ok:true})});
const slow=b.fetch(wind),started=Date.now(),preparing=a.NRUpdateCoordinator.prepare();let finished=false;preparing.then(()=>finished=true);await wait(50);
const queued=b.fetch('/queued'),queuedProxy=b.fetch(proxy);
assert.equal(reads,0,'new local reads in the peer must wait');
assert.equal(noaa,1,'a NOAA proxy GET must wait while the peer is preparing');
await b.fetch('/save',{method:'POST'});await b.fetch('https://external.invalid/api');assert.equal(writes,1);assert.equal(external,1);
const abort=new AbortController();const cancelled=b.fetch('/cancelled',{signal:abort.signal});abort.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');
await wait(170);assert.equal(finished,false,'pending peer read must prevent early activation');finish({ok:true});await slow;assert.equal(await preparing,true);assert(Date.now()-started>=220);
await Promise.all([queued,queuedProxy]);assert.equal(reads,1);assert.equal(noaa,2);assert(Date.now()-started<4500,'read gate must expire');
const c=page('b',()=>new Promise(()=>{})),d=page('b',async()=>({ok:true}));c.fetch('/never');const rejected=await d.NRUpdateCoordinator.prepare();assert.equal(rejected,false,'busy peer must fail preparation rather than claim ready');
let attempts=0;
const interrupted=page('stalled-noaa',async(input,init)=>{
 attempts++;
 if(attempts===1)await new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
 return 'resumed NOAA read';
});
const updating=page('stalled-noaa',async()=>({ok:true}));
const inFlight=interrupted.fetch(wind);
assert.equal(await updating.NRUpdateCoordinator.prepare(),true,'stalled NOAA read must yield to activation');
assert.equal(attempts,1,'repeat read must wait for the hold to expire');
assert.equal(await inFlight,'resumed NOAA read');
assert.equal(attempts,2);
for (const entry of ['classic.html','index.html','design-b17.html']) {await assertUpdateKeepsPeerQuiet(entry);await assertLateHandoff(entry);}
console.log('PASS update retries: three entries preserve the peer pause across a missed drain');
console.log('PASS coordination: peer NOAA drain; local and NOAA proxy reads held; POST/unrelated external unaffected; abort; bounded release; busy peer refuses activation');
})().catch(e=>{console.error(e);process.exitCode=1});
