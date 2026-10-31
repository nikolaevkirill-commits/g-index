'use strict';
// NOTIF-1: push text follows the interface language; score/state stay identical to resolveFinal.
const assert=require('assert/strict'),path=require('path'),fs=require('fs'),vm=require('vm');
const root=path.resolve(__dirname,'../..');
function sandbox(stored){
  const store=new Map();if(stored!==undefined)store.set('https://x.test/app/__nr_locale',stored);
  const ctx={console,URL,Date,Response:class{constructor(b){this.b=b}async text(){return this.b}},
    caches:{open:async()=>({match:async u=>store.has(u)?{text:async()=>store.get(u)}:undefined})}};
  ctx.globalThis=ctx;ctx.self=ctx;vm.createContext(ctx);
  for(const f of ['civil_time_v1.js','consumer_authority_v1.js','notification_runtime_v1.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  return ctx;
}
(async()=>{
  const now=Date.parse('2026-10-31T10:00:00Z');
  const ctx=sandbox();const N=ctx.NRNotificationRuntime,A=ctx.NRConsumerAuthority;
  const bodies={};
  for(const l of ['uk','en','es','fr']){const r=N.daily(null,now,l);bodies[l]=r.body;
    const ref=A.resolveFinal(undefined,'2026-10-31',now,false);
    assert.equal(r.score,ref.score);assert.equal(r.state,ref.state);assert.equal(r.date,'2026-10-31');assert.equal(r.language,l);
    assert.match(r.title,/2026-10-31/);}
  assert.equal(new Set(Object.values(bodies)).size,4,'four distinct languages');
  for(const l of ['en','es','fr'])assert.doesNotMatch(bodies[l],/[А-Яа-яІіЇїЄє]/u,'no Cyrillic in '+l);
  assert.equal(N.daily(null,now,'de').language,'uk','unknown language falls back to uk');
  for(const [stored,expected] of [['en','en'],['fr\n','fr'],['xx','uk'],[undefined,'uk']]){
    const c=sandbox(stored);assert.equal(await c.NRNotificationRuntime.storedLanguage('https://x.test/app/'),expected);}
  const broken=sandbox();broken.caches={open:async()=>{throw Error('denied')}};
  assert.equal(await broken.NRNotificationRuntime.storedLanguage('https://x.test/app/'),'uk','storage failure falls back');
  console.log('PASS notification locale: 4 languages, authority unchanged, stored/missing/invalid/denied language');
})().catch(e=>{console.error(e);process.exit(1)});
