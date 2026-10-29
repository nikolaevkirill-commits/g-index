'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),civil=require('../../civil_time_v1.js');
const fixtures=[['2026-10-29T21:59:59Z','2026-10-29','23:59:59'],['2026-10-29T22:00:00Z','2026-10-30','00:00:00'],['2026-03-29T00:59:59Z','2026-03-29','02:59:59'],['2026-03-29T01:00:00Z','2026-03-29','04:00:00'],['2026-10-25T00:59:59Z','2026-10-25','03:59:59'],['2026-10-25T01:00:00Z','2026-10-25','03:00:00']];
for(const [t,d,c] of fixtures){assert.equal(civil.dayKey(t),d);assert.equal(civil.clockKey(t),c);assert.equal(civil.minuteKey(t),d+'T'+c.slice(0,5));}
assert.equal(civil.dayKey('0999-01-01T12:00:00Z','UTC'),'0999-01-01');
assert.equal(civil.dayKey('2026-10-29T23:00:00Z','America/New_York'),'2026-10-29');
for(const bad of [null,undefined,'',NaN,'invalid'])assert.throws(()=>civil.dayKey(bad),RangeError);
assert.throws(()=>civil.dayKey('0000-01-01T12:00:00Z','UTC'),RangeError);
const context=require('../../calendar_context_v1.js'),engine=require('../../festival_decision_engine_v1.js');
assert.equal(engine.civil(Date.parse('2026-10-29T23:00:00Z'),'Europe/Kyiv'),'2026-10-30');
const sandbox={NRCivilTime:civil,crypto:require('crypto').webcrypto};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync(root+'/plan_calendar_v1.js','utf8'),sandbox);
assert.equal(sandbox.NRPlanCalendar.instant('2026-03-29','03:30'),null,'spring gap must not invent an instant');
assert.equal(sandbox.NRPlanCalendar.instant('2026-10-25','03:30'),null,'autumn repeated time must stay ambiguous');
assert.equal(sandbox.NRPlanCalendar.instant('2026-10-29','00:30'),Date.parse('2026-10-28T22:30:00Z'));
const ep={coverage:['2026-10-01T21:00:00Z','2026-11-01T22:00:00Z'],periods:{Venus:[['2026-10-20T00:00:00Z','2026-10-30T00:00:00Z']]}};
assert.equal(context.context(ep,'2026-10-29',Date.parse('2026-10-29T12:00:00Z')).state,'period');
const mock=()=>{const Orig=Intl.DateTimeFormat;function F(...a){const f=new Orig(...a);return new Proxy(f,{get(t,k){if(k==='format')return d=>{const p=Object.fromEntries(t.formatToParts(d).map(x=>[x.type,x.value]));return [p.day,p.month,p.year].join('/')+(p.hour?' '+p.hour+':'+p.minute:'');};const v=t[k];return typeof v==='function'?v.bind(t):v;}});}F.prototype=Orig.prototype;F.supportedLocalesOf=Orig.supportedLocalesOf;Intl.DateTimeFormat=F;Date.prototype.toLocaleDateString=function(l,o){return new Intl.DateTimeFormat(l,o).format(this);};};
const server=http.createServer((q,r)=>{const n=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html',f=path.resolve(root,n);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end();}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'content-type':({'.js':'application/javascript','.html':'text/html; charset=utf-8','.json':'application/json','.css':'text/css'})[path.extname(f)]||'application/octet-stream'});r.end(e?'':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch();const results=[];try{
 const registry=JSON.parse(fs.readFileSync(root+'/consumer_cloud/final_score_decisions.json','utf8')).decisions;
 for(const zone of ['Europe/Kyiv','America/Los_Angeles','Asia/Tokyo','UTC'])for(const mocked of [false,true]){
  const ctx=await b.newContext({serviceWorkers:'block',timezoneId:zone,locale:'ar-EG'}),p=await ctx.newPage(),errors=[];p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(String(e)));
  await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await p.clock.setFixedTime(new Date('2026-10-29T22:30:00Z'));if(mocked)await p.addInitScript(mock);
  await p.goto(base+'/index.html?channel=play#today',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.fp434Go&&window.fp469ConsumerForDate,null,{timeout:15000}).catch(e=>{throw Error(String(e)+' '+errors.join(';'));});
  if(mocked)assert.equal(await p.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())),'30/10/2026','mock must actually reach page');
  const expected=registry.find(x=>x.date==='2026-10-30');assert(expected);
  for(const route of ['today','forecast','calendar']){
   await p.evaluate(r=>fp434Go(r,false),route);const select=p.locator('[data-overview="'+route+'"] select').first();await select.waitFor();assert.equal(await select.inputValue(),'2026-10-30');
   const score=await p.locator('[data-overview="'+route+'"] .nr-o-score').first().innerText();assert.equal(Number(score.replace('−','-')),expected.score);
  }
  await p.addScriptTag({url:base+'/notification_runtime_v1.js'});
  assert.equal(await p.evaluate(()=>NRNotificationRuntime.daily(null,Date.now()).date),'2026-10-30');
  const keys=await p.evaluate(()=>['2026-03-29T00:59:59Z','2026-03-29T01:00:00Z','2026-10-25T00:59:59Z','2026-10-25T01:00:00Z'].map(t=>NRCivilTime.minuteKey(t)));
  assert.deepEqual(keys,['2026-03-29T02:59','2026-03-29T04:00','2026-10-25T03:59','2026-10-25T03:00']);
  const plan=await p.evaluate(()=>({gap:NRPlanCalendar.instant('2026-03-29','03:30'),repeat:NRPlanCalendar.instant('2026-10-25','03:30'),valid:NRPlanCalendar.instant('2026-10-29','00:30'),festival:SRFestivalDecision.civil(Date.parse('2026-10-29T23:00:00Z'),'Europe/Kyiv')}));
  assert.deepEqual(plan,{gap:null,repeat:null,valid:Date.parse('2026-10-28T22:30:00Z'),festival:'2026-10-30'});
  assert.equal(errors.length,0,errors.join('\n'));results.push({zone,mocked,date:'2026-10-30',score:expected.score});console.log('PASS',zone,'mock='+mocked);await ctx.close();
 }
 console.log('PASS civil date keys: midnight/DST/year/invalid inputs, 8 browser contexts × 3 screens + notification, effective display-format mock');
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({passed:true,results},null,2));
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
