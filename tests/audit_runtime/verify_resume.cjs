const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8'),checks=[];
const code=source.slice(source.indexOf('let _dataRefreshPromise = null;'),source.indexOf('// END lifecycle refresh'));
const turns=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function env(){
 let now=100000,day='2026-09-29',loads=0,active=0,maxActive=0,hold=false,release=null,fail=false,authority=0;
 const w={},d={},timers=[],reasons=[];
 const c={document:{hidden:false,addEventListener:(n,f)=>d[n]=f},navigator:{onLine:true},window:{__lastRefreshCycle:{finishedAt:now},addEventListener:(n,f)=>w[n]=f},Date:{now:()=>now},todayKyivStr:()=>day,Promise,console:{error(){}},el:()=>({}),withTimeout:p=>p,_beginAuthorityBatch(){},_endAuthorityBatch(){},setTimeout:(f,ms)=>{timers.push({f,at:now+ms});return timers.length},loadAll:async()=>{loads++;active++;maxActive=Math.max(maxActive,active);try{if(hold)await new Promise(r=>release=r);if(fail)throw Error('fixture failure')}finally{active--}}};
 for(const n of ['loadExpertOverrides','loadExpertCalc','loadStrongRawPolicy','loadExpertDecisionRegistry','loadEngineScores'])c[n]=async()=>{authority++};
 vm.runInNewContext(code,c);
 return {c,w,d,advance:async n=>{now+=n;let due;while((due=timers.findIndex(x=>x.at<=now))>=0){timers.splice(due,1)[0].f();await turns()}},turns,day:x=>day=x,hold:x=>hold=x,release:()=>{hold=false;release()},fail:x=>fail=x,stats:()=>({loads,authority,maxActive,timers:timers.length})};
}
(async()=>{
 let x=env();x.w.focus();await x.advance(1000);assert.equal(x.stats().loads,0);checks.push('fresh short focus skips');
 x.c.document.hidden=true;x.d.visibilitychange();await x.advance(61000);x.c.document.hidden=false;x.d.visibilitychange();x.w.focus();await x.advance(500);assert.equal(x.stats().loads,1);assert.equal(x.stats().authority,5);checks.push('long background and focus coalesce');
 x=env();x.day('2026-09-30');x.w.focus();await x.advance(500);assert.equal(x.stats().loads,1);checks.push('Kyiv midnight refresh');
 x=env();x.c.document.hidden=true;x.d.visibilitychange();x.c.navigator.onLine=false;await x.advance(1000);x.c.navigator.onLine=true;x.w.online();await x.advance(500);assert.equal(x.stats().loads,0);x.c.document.hidden=false;x.d.visibilitychange();await x.advance(500);assert.equal(x.stats().loads,1);assert.equal(x.c.window.__lastRefreshCycle.reason,'online');checks.push('hidden short online retained until visible');
 x=env();x.w.online();x.c.document.hidden=true;await x.advance(500);assert.equal(x.stats().loads,0);x.c.document.hidden=false;x.d.visibilitychange();await x.advance(500);assert.equal(x.stats().loads,1);checks.push('hidden after scheduling retains pending request');
 x=env();x.w.online();await x.advance(500);x.w.online();x.w.focus();await x.advance(500);assert.equal(x.stats().loads,1);await x.advance(4500);assert.equal(x.stats().loads,2);checks.push('cooldown defers instead of dropping request');
 x=env();x.w.pageshow({persisted:false});await x.advance(500);assert.equal(x.stats().loads,0);x.w.pageshow({persisted:true});await x.advance(500);assert.equal(x.stats().loads,1);checks.push('BFCache restoration');
 x=env();x.hold(true);const boot=x.c.window.runDataRefresh('boot');await turns();x.w.online();await x.advance(500);x.w.focus();x.c.window.runDataRefresh('online');x.c.window.runDataRefresh('online');assert.equal(x.stats().loads,1);x.release();await boot;assert.equal(x.stats().loads,2);assert.equal(x.stats().authority,5);assert.equal(x.stats().maxActive,1);assert.equal(x.c.window.__lastRefreshCycle.reason,'online');checks.push('online during active boot coalesces into one serialized follow-up');
 x=env();x.fail(true);await x.c.window.runDataRefresh('resume');assert.equal(x.c.window.__lastRefreshCycle.status,'partial');assert.equal(x.c.window.__lastRefreshCycle.errorCount,1);x.fail(false);await x.c.window.runDataRefresh('online');assert.equal(x.c.window.__lastRefreshCycle.status,'completed');checks.push('error status preserved and next request succeeds');
 fs.writeFileSync(path.join(__dirname,'RESUME_RESULTS.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',checks.length,'resume scenarios');
})().catch(e=>{console.error(e);process.exitCode=1});
