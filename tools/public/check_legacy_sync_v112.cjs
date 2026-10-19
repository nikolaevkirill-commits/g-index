// v112 legacy screens <-> single consumer score (source_formula, rule 2026-10-10).
// The frozen engine is served with a sentinel value that never equals the consumer
// score for the checked dates; every legacy score path must show the consumer score,
// and nothing when the consumer score is stale or missing (missing is not zero).
// v115: scenarios A-D run with an EMPTY expert registry (the v112 formula guarantees stay intact);
// scenario E runs with the real v114 registry: expert dates show the PDF decision in every feed state
// (18.10 governance: expert decision > formula), all other dates keep the v112 rules.
// usage: CHROME_PATH=... node tests/check_legacy_sync_v112.cjs <app_dir> <out.json>
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=process.argv[2],OUT=process.argv[3];
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';fs.readFile(path.join(ROOT,f),(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const FEED=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/score_regression.json'),'utf8'));
const NOW='2026-10-24T10:00:00Z';                 // consumer score 2026-10-24 = -3
// Re-time the real feed (values untouched) so it is fresh at NOW: generated 1h ago,
// 27-day issue 4 days ago, 3-day retrieval 1h ago.
function retimed(){const f=JSON.parse(JSON.stringify(FEED));for(const r of Object.values(f.days)){const o=r.channels.source_formula;o.generated_at='2026-10-24T09:00:00+00:00';if(o.kp_source==='NOAA_3day_slots')o.noaa_retrieved_at='2026-10-24T09:00:00+00:00';else o.noaa_issued_at='2026-10-20T03:45:00+00:00';}return f}
const expected={};for(const [ds,r] of Object.entries(FEED.days)){const o=r.channels.source_formula;expected[ds]=o.available===true?o.value:null}
// Sentinel: always different from the consumer value (consumer -3 -> engine +3, else -3).
const engineFor=ds=>expected[ds]===-3?3:-3;
const scores={};for(let t=Date.UTC(2026,8,1);t<=Date.UTC(2026,11,31);t+=864e5){const ds=new Date(t).toISOString().slice(0,10);const v=engineFor(ds);scores[ds]={eng:v,pdf:v,tag:'sentinel',kp:2,kp_synthetic:true,cal_score:0}}
const DATES=Object.keys(FEED.days).sort();
const sym=n=>n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
const REAL=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/decisions_regression.json'),'utf8'));const EXPERT=Object.fromEntries(REAL.decisions.map(d=>[d.date,d.score]));
async function open(b,page,{feed,engine,clock,registry='empty'}){
 const c=await b.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
 await c.addInitScript(()=>{localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.45,lon:30.52,zone:'Europe/Kyiv',saved_at:'2026-10-20T12:00:00Z'}));sessionStorage.setItem('nrs_launch','1')});
 await c.route('**/consumer_cloud/forecast.json*',r=>feed?r.fulfill({contentType:'application/json',body:JSON.stringify(feed)}):r.fulfill({status:404,body:''}));
 await c.route('**/consumer_cloud/final_score_decisions.json*',r=>registry==='real'?r.continue():r.fulfill({contentType:'application/json',body:JSON.stringify({schema:'consumer-final-decisions-v1',decisions:[]})}));
 await c.route('**/engine_scores.json*',r=>engine?r.fulfill({contentType:'application/json',body:JSON.stringify({version:'sentinel',scores})}):r.fulfill({status:404,body:''}));
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date(clock)});
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+page+'#expert');await p.waitForTimeout(400);
 // v125: with an installed fake clock, runFor(12000) would fire the app's 3.5 s registry abort timer before the real
 // network response arrives (flaky E/missing). Wait in real time for the registry first; fake time is not advanced meanwhile.
 if(registry==='real'){for(let i=0;i<100&&!(await p.evaluate(()=>!!window.NRConsumerAuthority?.expertFor?.('2026-10-24')).catch(()=>false));i++)await new Promise(r=>setTimeout(r,100))}
 await p.clock.runFor(12000);
 await p.evaluate(()=>{try{fp434Go('expert',false);const gate=document.querySelector('.nr-research-gate');if(gate)gate.open=true}catch(_){}});await p.clock.runFor(2000);
 // personal block: a saved profile so renderPersonal() runs its day-score cap
 await p.evaluate(()=>{const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))};
  set('pTz','Europe/Kyiv');set('pDate','1985-07-01');set('pTime','12:00');const n=document.getElementById('pName');if(n)n.value='Тест';document.getElementById('btnPersonalSave')?.click()});
 await p.clock.runFor(1500);
 return {c,p,errs};
}
async function probe(p,dates){return p.evaluate(dates=>{
 const api={};for(const ds of dates){const e=getEngineScore(new Date(ds+'T12:00:00Z'));const c=window.fp469ConsumerForDate({ds});
  api[ds]={legacy:e?e.eng:null,override:e?e._expertOverride===true:false,consumer:c.consumer.score,state:c.consumer.state}}
 const today=todayKyivStr();const t=id=>{const e=document.getElementById(id);return e?e.innerText.replace(/\s+/g,' ').trim():null};
 const week=[];for(let i=0;i<7;i++){const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);const s=resolveDaySignal_v88825(d,NaN,NaN,{isToday:i===0,horizon:'week'});week.push({ds:d.toISOString().slice(0,10),dayScore:s&&Number.isFinite(s.dayScore)?s.dayScore:null})}
 return {today,api,week,weekText:t('weekSummaryBar'),timingNote:t('timingAuthorityNote'),bulletin:t('heroBulletin'),personal:t('personalResult')}},dates)}
srv.listen(0,'127.0.0.1',async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const R={now:NOW,scenarios:{}};
try{
 for(const page of ['index.html','design-v4.html']){
  // A. fresh consumer feed, engine sentinel present
  {const {c,p,errs}=await open(b,page,{feed:retimed(),engine:true,clock:NOW});const x=await probe(p,DATES);R.scenarios[page+':fresh']=x;
   assert.equal(x.today,'2026-10-24');
   for(const ds of DATES){const a=x.api[ds];assert.equal(a.override,false,page+' '+ds+' override leaked');
    if(a.state==='fresh'){assert.equal(a.legacy,a.consumer,page+' '+ds+' legacy '+a.legacy+' != consumer '+a.consumer);assert.notEqual(a.legacy,engineFor(ds))}
    else assert.equal(a.legacy,null,page+' '+ds+' unavailable consumer must give no legacy score');}
   assert.ok(DATES.filter(ds=>x.api[ds].state==='fresh').length>=15,'fresh rows');
   for(const w of x.week)assert.equal(w.dayScore,x.api[w.ds]?.state==='fresh'?x.api[w.ds].consumer:null,page+' week '+w.ds);
   if(page==='index.html'){
    // visible legacy text: week refs in order, timing note, personal hard cap (consumer -3 <= -2)
    // v128: since v127 the week strip shows one final score per day ('СБ −3 НД +3 …'), no 'ref' prefix
    const refs=[...x.weekText.matchAll(/(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|НД) ([+−-]\d|0|—)(?![.\d])/g)].map(m=>m[1].replace('-','−'));
    assert.deepEqual(refs,x.week.map(w=>sym(w.dayScore)),'week refs '+refs.join(','));
    assert.match(x.timingNote,/Підсумковий бал [−-]3/);assert.doesNotMatch(x.timingNote,/\+3/);
    assert.match(x.personal,/день критичний/);assert.match(x.personal,/Підсумковий бал = -3/);
   }
   if(x.bulletin!==null&&x.bulletin!=='')assert.match(x.bulletin,/^−?-?3$|^-3/);
   assert.deepEqual(errs,[],page+' errors');await c.close();}
  // B. same feed, 11 h after generation -> stale: no legacy score, engine never shown
  {const {c,p,errs}=await open(b,page,{feed:retimed(),engine:true,clock:'2026-10-24T20:00:00Z'});const x=await probe(p,DATES);R.scenarios[page+':stale']=x;
   for(const ds of DATES){assert.notEqual(x.api[ds].state,'fresh');assert.equal(x.api[ds].legacy,null,page+' stale '+ds)}
   for(const w of x.week)assert.equal(w.dayScore,null);
   if(page==='index.html'){assert.doesNotMatch(x.timingNote||'',/Підсумковий бал [+−-]?\d/);assert.doesNotMatch(x.personal||'',/день критичний/);
    assert.ok(![...x.weekText.matchAll(/(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|НД) ([+−-]\d|0)(?![.\d])/g)].length,'stale week shows no ref score');}
   assert.deepEqual(errs,[],page+' errors');await c.close();}
  // C. consumer feed missing, engine present -> nothing from engine
  {const {c,p,errs}=await open(b,page,{feed:null,engine:true,clock:NOW});const x=await probe(p,DATES);R.scenarios[page+':missing']=x;
   for(const ds of DATES){assert.equal(x.api[ds].state,'missing');assert.equal(x.api[ds].legacy,null)}
   if(page==='index.html'){assert.doesNotMatch(x.personal||'',/день критичний/);assert.ok(![...x.weekText.matchAll(/(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|НД) ([+−-]\d|0)(?![.\d])/g)].length)}
   assert.deepEqual(errs,[],page+' errors');await c.close();}
  // D. fresh feed without engine_scores.json: identical legacy score text
  {const {c,p,errs}=await open(b,page,{feed:retimed(),engine:false,clock:NOW});const x=await probe(p,DATES);R.scenarios[page+':fresh_no_engine']=x;const A=R.scenarios[page+':fresh'];
   for(const ds of DATES)assert.equal(x.api[ds].legacy,A.api[ds].legacy,page+' engine presence changed '+ds);
   assert.deepEqual(x.week,A.week);if(page==='index.html'){assert.equal(x.timingNote,A.timingNote);}
   assert.deepEqual(errs,[],page+' errors');await c.close();}
  // E. v115: real expert registry; fresh / stale / missing feed
  for(const [name,feed,clock] of [['fresh',retimed(),NOW],['stale',retimed(),'2026-10-24T20:00:00Z'],['missing',null,NOW]]){
   const {c,p,errs}=await open(b,page,{feed,engine:true,clock,registry:'real'});const x=await probe(p,DATES);R.scenarios[page+':registry_'+name]=x;const F=R.scenarios[page+':'+name];
   for(const ds of DATES){const a=x.api[ds];assert.equal(a.legacy,a.consumer,page+' E/'+name+' '+ds+' legacy != final');
    if(ds in EXPERT){assert.equal(a.state,'expert',page+' E/'+name+' '+ds);assert.equal(a.consumer,EXPERT[ds]);assert.equal(a.override,true)}
    else{assert.equal(a.override,false,page+' E/'+name+' '+ds+' override leaked');assert.equal(a.legacy,F.api[ds].legacy,page+' E/'+name+' '+ds+' non-expert date changed')}}
   for(const w of x.week)assert.equal(w.dayScore,x.api[w.ds]?.consumer??null,page+' E/'+name+' week '+w.ds);
   assert.doesNotMatch(x.timingNote||'',/Модель \(формула\)/);assert.doesNotMatch(x.personal||'',/Модель \(формула\)/);
   assert.deepEqual(errs,[],page+' errors');await c.close();}
 }
 R.status='PASS';
}catch(e){R.status='FAIL';R.error=String(e.message||e);process.exitCode=1}
finally{await b.close();srv.close();fs.writeFileSync(OUT,JSON.stringify(R,null,1));console.log(R.status,R.error||'')}});
