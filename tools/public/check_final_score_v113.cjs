// v113: one final consumer score on every screen of both pages.
//  - verified expert PDF decision > source_formula (owner decision 18.10.2026);
//  - formula shown separately, never mixed into the expert value;
//  - every G / ΣAᵢ uses the main formula's components (G_raw forecast == formula raw);
//  - forecast journal: prospective entries, SHA-256 chain, outcomes, pairs.
// usage: CHROME_PATH=... node tests/check_final_score_v113.cjs <app_dir> <out.json>
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=process.argv[2],OUT=process.argv[3];
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';fs.readFile(path.join(ROOT,f),(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const FEED=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/score_regression.json'),'utf8'));
const NOW='2026-10-24T10:00:00Z';
function retimed(){const f=JSON.parse(JSON.stringify(FEED));for(const r of Object.values(f.days)){const o=r.channels.source_formula;o.generated_at='2026-10-24T09:00:00+00:00';if(o.kp_source==='NOAA_3day_slots')o.noaa_retrieved_at='2026-10-24T09:00:00+00:00';else o.noaa_issued_at='2026-10-20T03:45:00+00:00';}return f}
const SHA='a'.repeat(64);
// Expert values chosen to differ from the formula (10-24 formula −3, 10-26 formula +3).
const REGISTRY={schema:'expert_decision_registry_v1',summary:{},rows:[
 {date:'2026-10-24',decision_source:'verified_expert_pdf',decision_score:2,source_pdf:'TEST_PDF_v113.pdf',source_page:1,source_sha256:SHA,decision_class:'test'},
 {date:'2026-10-26',decision_source:'verified_expert_pdf',decision_score:-1,source_pdf:'TEST_PDF_v113.pdf',source_page:1,source_sha256:SHA,decision_class:'test'},
 {date:'2026-10-27',decision_source:'verified_expert_pdf',decision_score:2,source_pdf:'',source_page:1,source_sha256:SHA,decision_class:'unverified_no_pdf'}]};
const sym=n=>n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
async function open(b,page,{registry,clock=NOW}){
 const c=await b.newContext({serviceWorkers:'block',viewport:{width:1280,height:900},locale:'uk-UA'});
 await c.addInitScript(()=>{localStorage.setItem('gindex_local_context_v1',JSON.stringify({lat:50.45,lon:30.52,zone:'Europe/Kyiv',saved_at:'2026-10-20T12:00:00Z'}));sessionStorage.setItem('nrs_launch','1')});
 await c.route('**/consumer_cloud/forecast.json*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(retimed())}));
 await c.route('**/consumer_cloud/final_score_decisions.json*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({schema:'consumer-final-decisions-v1',decisions:registry?registry.rows.filter(x=>x.source_pdf).map(x=>({date:x.date,score:x.decision_score,source_sha256:x.source_sha256,source_page:x.source_page,decision_id:'test-v114'})):[]})}));
 await c.route('**/EXPERT_DECISION_REGISTRY_v1.json*',r=>registry?r.fulfill({contentType:'application/json',body:JSON.stringify(registry)}):r.fulfill({status:404,body:''}));
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date(clock)});
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+page+'#today');await p.waitForTimeout(400);await p.clock.runFor(14000);
 return {c,p,errs};
}
const DATES=Object.keys(FEED.days).sort().filter(d=>d>='2026-10-24');
srv.listen(0,'127.0.0.1',async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const R={now:NOW,pages:{}};
try{
 for(const page of ['index.html','design-v4.html']){const P=R.pages[page]={};
  const {c,p,errs}=await open(b,page,{registry:REGISTRY});
  // 1. one final resolver; expert wins; formula kept separately; unverified expert ignored
  P.final=await p.evaluate(dates=>Object.fromEntries(dates.map(ds=>{const x=window.fp469ConsumerForDate({ds}).consumer,e=getEngineScore(new Date(ds+'T12:00:00Z'));
   return [ds,{authority:x.authority,state:x.state,score:x.score,formula:x.formula?x.formula.score:null,legacy:e?e.eng:null,legacyExpert:e?e._expertOverride:false}]})),DATES);
  // design-v4 is the public preview: the expert registry is deliberately not published there,
  // so its final score is the formula on every screen (stated on the Today screen).
  const EX=true;
  assert.deepEqual([P.final['2026-10-24'].authority,P.final['2026-10-24'].score,P.final['2026-10-24'].formula],EX?['expert_pdf',2,-3]:['source_formula',-3,-3],page+' 24.10');
  assert.deepEqual([P.final['2026-10-26'].authority,P.final['2026-10-26'].score,P.final['2026-10-26'].formula],EX?['expert_pdf',-1,3]:['source_formula',3,3],page+' 26.10');
  assert.equal(P.final['2026-10-27'].authority,'source_formula',page+' unverified expert must not win');
  for(const ds of DATES){const f=P.final[ds];assert.equal(f.legacy,f.score,page+' legacy '+ds);assert.equal(f.legacyExpert,f.authority==='expert_pdf',page+' flag '+ds)}
  // 2. Today screen shows the same final score and names both layers
  P.today=await p.evaluate(()=>({score:document.querySelector('#nrRoute-today .nr-o-score')?.textContent.trim(),label:document.querySelector('#nrRoute-today .nr-o-label')?.textContent.trim(),state:document.querySelector('#nrRoute-today .nr-o-state')?.textContent.trim(),prov:document.querySelector('#nrRoute-today .nr-o-provenance')?.textContent.trim()}));
  if(EX){assert.equal(P.today.score,'+2',page+' today score');assert.match(P.today.label,/Позитивна оцінка/);assert.doesNotMatch(P.today.label,/−3|формула/i);}
  else{assert.equal(P.today.score,'−3',page+' today score');assert.match(P.today.prov,/не публікуються/);}
  // 3. G uses the main formula: G_raw(day) == formula raw; ΣAᵢ(now) == Σ non-Kp factors; no synthetic Kp
  P.g=await p.evaluate(()=>{const out=[];for(let i=0;i<7;i++){const d=new Date(todayKyivStr()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);const ds=d.toISOString().slice(0,10);
    const row=window.fp469ConsumerForDate({ds}).feed?.channels?.source_formula;const kp=getDynamicKpForDate_v889125(d);const g=kpDayTerm(kp)+computeAi(sunriseUTC(d),kp).Ai;out.push({ds,g,raw:row?row.raw:null})}
   const now=computeAi(new Date(),3);return {days:out,nowAi:now.Ai,nowSource:now.formulaSource,legacyAvailable:typeof computeAiLegacyHistorical==='function'}});
  for(const d of P.g.days)if(d.raw!==null)assert.ok(Math.abs(d.g-d.raw)<1e-9,page+' G_raw '+d.ds+' '+d.g+' vs '+d.raw);
  assert.equal(P.g.nowAi,-3);assert.equal(P.g.nowSource,'source_formula');assert.equal(P.g.legacyAvailable,true);
  // 4. legacy dashboard (index only; design-v4 hides it)
  if(page==='index.html'){
   await p.evaluate(()=>{try{fp434Go('expert',false);const gate=document.querySelector('.nr-research-gate');if(gate)gate.open=true}catch(_){}});await p.clock.runFor(2500);
   P.legacy=await p.evaluate(()=>{const t=id=>document.getElementById(id)?.innerText.replace(/\s+/g,' ').trim()||'';return {week:t('weekSummaryBar'),timing:t('timingAuthorityNote'),route:t('nrRoute-expert')}});
   const refs=await p.locator('#weekSummaryBar [data-final-score]').evaluateAll(nodes=>nodes.map(n=>n.dataset.finalScore));
   assert.deepEqual(refs.slice(0,3),['+2','+3','−1']);
   assert.doesNotMatch(P.legacy.week,/G_raw|OP |ref /);
   assert.match(P.legacy.timing,/\+2/);
   assert.doesNotMatch(P.legacy.route,/NaN|undefined/);
   assert.doesNotMatch(P.legacy.route,/Lᵢ \(тітхі\)|Pᵢ \(панчанга\)|=2−Kp[+−-]?\d+(\.\d)? панчанга/,'old components shown as current');
   assert.match(P.legacy.route,/Стара формула G/);
  }
  // 5. journal: prospective entries with inputs, model version, chain; no rewrite on same inputs
  P.journal=await p.evaluate(async()=>{const J=window.NRForecastJournal;await new Promise(r=>setTimeout(r,50));const doc=J.load();const e24=doc.entries.filter(e=>e.target_date==='2026-10-24').pop();
   const again=await J.record(window.__nrJournalRowsForTest||{});const v=await J.verify();let futureErr=null;try{await J.recordOutcome('2026-10-25',1)}catch(e){futureErr=String(e.message)}
   return {n:doc.entries.length,dates:[...new Set(doc.entries.map(e=>e.target_date))].sort(),e24:e24?{authority:e24.inputs.authority,score:e24.inputs.score,formula:e24.inputs.formula.score,raw:e24.inputs.formula.raw,model:e24.model_version,factors:e24.inputs.formula.factors.length,hash:!!e24.hash,revisions:doc.entries.filter(e=>e.target_date==='2026-10-24').length}:null,again,verify:v,futureErr}});
  assert.ok(P.journal.n>=10,'journal entries '+P.journal.n);assert.ok(!P.journal.dates.some(d=>d<'2026-10-24'),'no past-day forecasts');
  assert.deepEqual([P.journal.e24.authority,P.journal.e24.score,P.journal.e24.formula,P.journal.e24.raw],EX?['expert_pdf',2,-3,-4]:['source_formula',-3,-3,-4]);
  assert.match(P.journal.e24.model,/kp:2-Kp/);assert.ok(P.journal.e24.factors>=2&&P.journal.e24.hash);
  assert.equal(P.journal.verify.ok,true);assert.match(P.journal.futureErr||'',/finished day/);
  // two days later: outcome for 25.10 forms a pair with the forecast issued on 24.10
  await p.clock.fastForward('48:00:00');
  P.pair=await p.evaluate(async()=>{const J=window.NRForecastJournal;await J.recordOutcome('2026-10-25',2,'test');const ok=(await J.verify()).ok;const pairs=J.pairs();
   const raw=JSON.parse(localStorage.getItem('nr_forecast_journal_v1'));raw.entries[0].inputs.score=99;localStorage.setItem('nr_forecast_journal_v1',JSON.stringify(raw));const tampered=await J.verify();return {pairs,ok,tampered}});
  const pr=P.pair.pairs.find(x=>x.target_date==='2026-10-25');assert.ok(pr,'pair 25.10');assert.deepEqual([pr.forecast,pr.outcome,pr.authority],[3,2,'source_formula']);
  assert.equal(P.pair.ok,true);assert.equal(P.pair.tampered.ok,false,'tamper must be detected');assert.deepEqual(await p.evaluate(()=>NRForecastJournal.pairs()),[],'invalid journal cannot yield pairs');
  P.errors=errs;assert.deepEqual(errs,[],page+' errors');await c.close();
 }
 // 6. without the registry the formula is the final score (no expert anywhere)
 {const {c,p,errs}=await open(b,'index.html',{registry:null});const x=await p.evaluate(()=>window.fp469ConsumerForDate({ds:'2026-10-24'}).consumer);R.no_registry={authority:x.authority,score:x.score};
  assert.deepEqual([x.authority,x.score],['source_formula',-3]);assert.deepEqual(errs,[]);await c.close();}
 R.status='PASS';
}catch(e){R.status='FAIL';R.error=String(e.message||e);process.exitCode=1}
finally{await b.close();srv.close();fs.writeFileSync(OUT,JSON.stringify(R,null,1));console.log(R.status,R.error||'')}});
