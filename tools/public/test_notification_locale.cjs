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
  // Morning verdict: tone follows the sign of the final score; topics only from the source calendar marks.
  const feed=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8'));
  const TONE={uk:['Сприятливий день.','Рівний день.','Напружений день.'],en:['A favourable day.','A steady day.','A tense day.']};let verdicts=0;
  for(const [ds,row] of Object.entries(feed.days))for(const score of [3,0,-2])for(const l of ['uk','en']){
    const v=N.verdict(row,score,l);assert.ok(v.startsWith(TONE[l][score>0?0:score<0?2:1]),l+' tone: '+v);
    const names=(row.channels.source_formula.factors||[]).map(x=>x.factor);
    if(names.includes('Книги'))assert.match(v,l==='uk'?/навчання/:/learning/);else assert.doesNotMatch(v,/навчання|learning/);
    if(l==='en')assert.doesNotMatch(v,/[А-Яа-яІіЇїЄє]/u,'no Cyrillic in en verdict');verdicts++;}
  assert.ok(verdicts>=100,'verdict checked on every feed day');
  console.log('PASS notification locale: morning verdict on the real feed, 4 languages, authority unchanged, stored/missing/invalid/denied language');
})().catch(e=>{console.error(e);process.exit(1)});
