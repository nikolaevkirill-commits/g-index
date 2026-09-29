const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const code=cut('function withTimeout(','function fetchTextWithCORS(')+cut('function _strictDayScore(','function _publishExpertOverrides(')+cut('  let _independentPanelGeneration=0;','  window.fp463RenderIndependentForecasts=');
const grid={innerHTML:''},boundary={textContent:'old statistics'},checks=[],signals=[];
const doc=value=>({days:{a:{date:'2026-09-29',channels:{expert_pdf:{available:true,value},frozen_engine:{available:true,value:1},tanita_image:{available:true,value:-1}}}}});
let impl=async url=>({ok:true,json:async()=>url.includes('SCORECARD')?{channels:{}}:doc(1)});
const c={window:{},document:{getElementById:id=>id==='nrIndependentGrid'?grid:boundary},AbortController,console,setTimeout:(f,ms)=>setTimeout(f,Math.min(ms,30)),clearTimeout,fetch:(u,o)=>(signals.push(o.signal),impl(u,o)),todayKey:()=> '2026-09-29',escapeHtml:String,fmtDate:String};
vm.createContext(c);vm.runInContext(code,c);
(async()=>{
 for(const value of [null,'',true,false,'NaN',4,0.5]){impl=async url=>({ok:true,json:async()=>url.includes('SCORECARD')?{channels:{}}:doc(value)});await c.renderIndependentForecasts();assert(grid.innerHTML.includes('aria-label="PDF —"'),String(value));assert(grid.innerHTML.includes('неповні дані'));assert(!grid.innerHTML.includes('без істотної розбіжності'))}
 checks.push('invalid available-channel scores stay missing, never zero');
 impl=async url=>({ok:true,json:async()=>url.includes('SCORECARD')?{channels:{}}:doc(0)});await c.renderIndependentForecasts();assert(grid.innerHTML.includes('aria-label="PDF 0"'));checks.push('genuine zero retained');
 let release;impl=async url=>({ok:true,json:()=>url.includes('SCORECARD')?Promise.resolve({channels:{}}):new Promise(r=>release=r)});const pending=c.renderIndependentForecasts();await pending;assert.equal(c.window.__independentPanelState.status,'error');assert(signals.slice(-2).every(s=>s.aborted));assert(!boundary.textContent.includes('old statistics'));const failed=grid.innerHTML;release(doc(3));await new Promise(r=>setImmediate(r));assert.equal(grid.innerHTML,failed);checks.push('body deadline aborts both requests; late body cannot commit; old statistics cleared');
 let firstResolve;impl=async url=>({ok:true,json:()=>url.includes('SCORECARD')?Promise.resolve({channels:{}}):new Promise(r=>firstResolve=r)});const old=c.renderIndependentForecasts();await new Promise(r=>setImmediate(r));impl=async url=>({ok:true,json:async()=>url.includes('SCORECARD')?{channels:{}}:doc(-2)});await c.renderIndependentForecasts();firstResolve(doc(3));await old;assert(grid.innerHTML.includes('aria-label="PDF -2"'));assert.equal(c.window.__independentPanelState.status,'loaded');checks.push('new generation wins over late old response; recovery succeeds');
 fs.writeFileSync(path.join(__dirname,'INDEPENDENT_PANEL_RESULTS.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
