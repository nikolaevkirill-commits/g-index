'use strict';
const http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const {trackDataRequests}=require('./browser_readiness.cjs');
let releaseBody,releaseStall,workerSeen=false;
const server=http.createServer((q,s)=>{
 if(q.url==='/worker.js'){workerSeen=true;return;} // Deliberately outstanding unrelated script.
 if(q.url==='/body'){s.writeHead(200,{'content-type':'application/json'});s.write('{');releaseBody=()=>s.end('"ok":true}');return;}
 if(q.url==='/stall'){releaseStall=()=>s.end('{}');return;}
 s.end('<!doctype html><title>Readiness fixture</title>');
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const p=await browser.newPage(),data=trackDataRequests(p);
  await p.goto('http://127.0.0.1:'+server.address().port);
  await p.clock.install();await p.clock.pauseAt(new Date());
  await p.evaluate(()=>{window.worker=new Worker('/worker.js');});
  await new Promise((resolve,reject)=>{const end=Date.now()+3000;const tick=()=>workerSeen?resolve():Date.now()>end?reject(Error('Worker probe not started')):setTimeout(tick,20);tick();});
  await assert.rejects(p.waitForLoadState('networkidle',{timeout:150}),/Timeout/);
  await data.idle(1000); // Must not wait for the deliberately stalled worker.
  await p.evaluate(()=>{window.bodyDone=false;fetch('/body').then(r=>r.json()).then(d=>window.bodyDone=d.ok);});
  await new Promise((resolve,reject)=>{const end=Date.now()+3000;const tick=()=>releaseBody?resolve():Date.now()>end?reject(Error('Body probe not started')):setTimeout(tick,20);tick();});
  await assert.rejects(data.idle(150),/\/body/); // Headers alone cannot satisfy readiness.
  releaseBody();await data.idle();assert.equal(await p.evaluate(()=>window.bodyDone),true);
  await p.evaluate(()=>{fetch('/stall').then(r=>r.text());});
  await new Promise((resolve,reject)=>{const end=Date.now()+3000;const tick=()=>releaseStall?resolve():Date.now()>end?reject(Error('Stall probe not started')):setTimeout(tick,20);tick();});
  await assert.rejects(data.idle(150),/\/stall/); // A stuck required request remains a failure.
  releaseStall();await data.idle();data.dispose();
  console.log('PASS readiness: outstanding worker excluded; body completion required; stalled data fails; recovery with paused page clock');
 }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
