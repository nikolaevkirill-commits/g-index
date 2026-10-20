const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||'cache-evidence');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(e?'':b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch();const rows=[];try{
for(const entry of ['index.html','design-v4.html'])for(const zone of ['UTC','Europe/Kyiv']){
const c=await b.newContext({timezoneId:zone,viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await c.newPage();await p.goto(base+'/'+entry+'?channel=play#panch');await p.waitForFunction(()=>typeof computePanchanga==='function'&&typeof renderPanchanga==='function');
const result=await p.evaluate(()=>{
 const fail=m=>{throw Error(m)},at=t=>computePanchanga(new Date(t)),fresh=t=>{window.__panchMemo={};return at(t)},fields=['tithi','nakshatra','yoga'],boundaries=[];
 const start=Date.parse('2028-03-25T00:00:00Z');
 for(const field of fields){let low=start,previous=fresh(low)[field].name,hi=null;
  for(let i=1;i<=96;i++){const t=start+i*3600000,name=fresh(t)[field].name;if(name!==previous){hi=t;break}low=t;previous=name}
  if(hi===null)fail('No real boundary found: '+field);
  while(hi-low>1){const mid=Math.floor((hi+low)/2);if(fresh(mid)[field].name===previous)low=mid;else hi=mid}
  if(Math.floor(low/60000)!==Math.floor(hi/60000))fail('Fixture straddles a minute rather than testing within-minute boundary');
  const expectedBefore=fresh(low)[field].name,expectedAfter=fresh(hi)[field].name;
  window.__panchMemo={};const before=at(low),after=at(hi);
  if(before[field].name!==expectedBefore||after[field].name!==expectedAfter)fail('STALE_CACHE '+field+' '+new Date(hi).toISOString()+' expected '+expectedAfter+' got '+after[field].name);
  if(at(hi)!==after)fail('Same timestamp must reuse object');
  renderPanchanga(new Date(low));const beforeText=document.getElementById('panchGrid').textContent;
  renderPanchanga(new Date(hi));const afterText=document.getElementById('panchGrid').textContent;
  if(!beforeText.includes(expectedBefore)||!afterText.includes(expectedAfter))fail('Rendered Panchanga does not match boundary result '+field);
  boundaries.push({field,before:low,after:hi,expectedBefore,expectedAfter,rendered:true});
 }
 const dst=[];for(const t of ['2028-03-26T00:59:59.999Z','2028-03-26T01:00:00.000Z','2028-10-29T00:59:59.999Z','2028-10-29T01:00:00.000Z']){const ms=Date.parse(t),expected=fresh(ms);const again=at(ms);if(expected!==again)fail('DST timestamp cache miss');dst.push({utc:t,local:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',dateStyle:'short',timeStyle:'long'}).format(ms)})}
 window.__panchMemo={};for(let i=0;i<80;i++)at(start+i);if(Object.keys(window.__panchMemo).length>20)fail('Cache limit exceeded');
 return {boundaries,dst,maxEntries:Object.keys(window.__panchMemo).length};
});
const cdp=await c.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');const beforeCPU=await cdp.send('Performance.getMetrics');
const performanceData=await p.evaluate(()=>{const t=Date.parse('2028-03-25T12:00:00Z');const bench=(unique)=>{window.__panchMemo={};const times=[],results=[];for(let i=0;i<120;i++){const s=performance.now();results.push(computePanchanga(new Date(t+(unique?i:0))));times.push(performance.now()-s)}times.sort((a,b)=>a-b);return {calls:120,uniqueResults:new Set(results).size,p50_ms:times[60],p95_ms:times[114],max_ms:times.at(-1)}};return {sameTimestamp:bench(false),distinctMilliseconds:bench(true)}});
const afterCPU=await cdp.send('Performance.getMetrics');assert.equal(performanceData.sameTimestamp.uniqueResults,1);assert.equal(performanceData.distinctMilliseconds.uniqueResults,120);
performanceData.cpuTaskSeconds=afterCPU.metrics.find(x=>x.name==='TaskDuration').value-beforeCPU.metrics.find(x=>x.name==='TaskDuration').value;
await p.evaluate(()=>{const original=window.computePanchanga;window.__cacheSession={calls:0,hits:0,misses:0};window.computePanchanga=function(...args){const cached=Object.values(window.__panchMemo||{});const value=original.apply(this,args);const s=window.__cacheSession;s.calls++;s[cached.includes(value)?'hits':'misses']++;return value}});
for(const route of ['today','panch','forecast','calendar','more']){await p.evaluate(r=>fp434Go(r,false),route);await p.waitForTimeout(350)}
const session=await p.evaluate(()=>window.__cacheSession);await p.screenshot({path:path.join(out,entry+'-'+zone.replace('/','_')+'.png')});
rows.push({entry,zone,...result,performance:performanceData,session,profile:'Chromium mobile viewport, CPU x4; not a physical phone'});await c.close();
}
fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify({status:'PASS',scope:'Real runtime cache correctness, existing renderer, UTC/Kyiv DST, emulated mobile performance; not ephemeris accuracy',rows},null,2));console.log('PASS 12 real boundaries, two entries × two zones, DST, exact HIT/MISS and 20-entry cap');
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
