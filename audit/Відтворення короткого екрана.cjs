'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const root = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3] || __dirname);
const expectedHead = '7b089ef3df1147be23f18d733f82b198c9ef351a';
const languageArg = process.argv[4] || 'uk,en,es,fr';
const languages = languageArg.split(',');
assert(languages.every(lang=>['uk','en','es','fr'].includes(lang)));
const candidateState = () => {
  const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8'}).trim();
  assert.equal(git('rev-parse','HEAD'),expectedHead);
  assert.equal(git('status','--porcelain','--untracked-files=no'),'');
  return Object.fromEntries(['index.html','tools/public/verify_shared_clock.cjs','tools/public/fixtures/score_regression.json']
    .map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
};
const identity = candidateState();
fs.mkdirSync(output,{recursive:true});
const filename = path.join(root,'tools/public/verify_shared_clock.cjs');
let source = fs.readFileSync(filename,'utf8').replace(/\r\n/g,'\n');

function replace(before, after) {
  assert.equal(source.split(before).length,2,'one canonical marker: '+before);
  source=source.replace(before,()=>after);
}
const start = source.indexOf(' const jobs=[');
const stop = source.indexOf('\n async function visit',start);
assert(start>0&&stop>start);
source=source.slice(0,start)+` const jobs=${JSON.stringify(languages)}.flatMap(lang=>cities.flatMap(city=>statuses.map(state=>({
  city,lang,scale:200,state,workerAvailable:true,viewportOverride:{width:384,height:694}
 }))));
`+source.slice(stop);

replace("   }else{\n    assert.match(observed.noaaText,/NOAA.*UTC/,label+' localized weather period');",
 `   }else{
    const copy={
     en:{fresh:'current',partial:'partial forecast',stale:'outdated',missing:'no data',period:'Period unavailable'},
     es:{fresh:'actual',partial:'pronóstico parcial',stale:'desactualizada',missing:'sin datos',period:'Período no disponible'},
     fr:{fresh:'à jour',partial:'prévision partielle',stale:'périmée',missing:'sans données',period:'Période inconnue'},
    }[lang];
    const text=observed.noaaText;
    assert(text.startsWith('NOAA · '+copy[state]),label+' localized NOAA status');
    if(state==='fresh'||state==='partial'){
     assert(text.endsWith(' UTC'),label+' dated NOAA period in UTC');
     if(state==='partial')assert(text.includes('1/3'),label+' one day of three');
    }else assert(text.endsWith(copy.period)&&!text.includes(' UTC'),label+' localized unavailable period');`);

const actionStart=source.indexOf("   if(output&&workerAvailable&&!geometryOnly&&state==='fresh'&&!wide)");
const actionEnd=source.indexOf('   if(!workerAvailable){',actionStart);
assert(actionStart>0&&actionEnd>actionStart);
const resultStart=source.indexOf('   const result=',actionStart);
const resultEnd=source.indexOf("   if(lang==='uk'&&workerAvailable",resultStart);
assert(resultStart>actionStart&&resultEnd>resultStart&&resultEnd<actionEnd);
// Use the original cold instance for the tap; the scope here is the direct event action.
source=source.slice(0,actionStart)+source.slice(resultStart,resultEnd)+source.slice(actionEnd);

replace("   if(city.cityId==='barcelona')assert.match(observed.localTime,/10 лист/,label+' next local date');\n   await page.locator('#nrRoute-today [data-p0-next-sky]').tap();",
 `   if(city.cityId==='barcelona'){
    const localDay=await page.evaluate(({nextAt,zone})=>new Intl.DateTimeFormat(window.NRLocale.locale,
     {timeZone:zone,day:'numeric',month:'short'}).format(new Date(nextAt)),{nextAt,zone:city.zone});
    assert(observed.localTime.startsWith(localDay+' · '),label+' next date in the selected language and city');
   }
   const eventButton=page.locator('#nrRoute-today.active [data-p0-next-sky]');
   const beforeTap=await eventButton.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
    const hit=document.elementFromPoint(x,y);
    window.shortAuditEvents=[];
    for(const name of ['touchstart','touchend','click'])el.addEventListener(name,event=>{
     window.shortAuditEvents.push({type:event.type,trusted:event.isTrusted,scrollY});
    },{capture:true,passive:true});
    return {scrollY,centerHit:el.contains(hit),x,y};
   });
   assert(beforeTap.scrollY===0&&beforeTap.centerHit,label+' direct touch target on fresh opening');
   await page.touchscreen.tap(beforeTap.x,beforeTap.y);
   const tapEvents=await page.evaluate(()=>window.shortAuditEvents);
   assert.deepEqual(tapEvents.map(event=>event.type),['touchstart','touchend','click'],label+' one touchscreen activation');
   assert(tapEvents[0].scrollY===0&&tapEvents.every(event=>event.trusted),label+' trusted tap without pre-scroll');`);
replace("   return {...result,activations:1,skyAt:actual[0]};",
 "   return {...result,activations:1,beforeTap,tapEvents,skyAt:actual[0],skyZone:actual[1],skyCity:actual[2]};");

replace(" const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});",
 " const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});\n assert.equal(browser.version(),'151.0.7922.34','canonical gate Chromium');");
const summaryStart=source.indexOf(' for(let i=0;i<jobs.length;i+=2)rows.push');
const summaryEnd=source.indexOf('\n}',summaryStart);
assert(summaryStart>0&&summaryEnd>summaryStart);
source=source.slice(0,summaryStart)+` const failures=[];
 for(let i=0;i<jobs.length;i+=2){
  const batch=jobs.slice(i,i+2);
  const results=await Promise.allSettled(batch.map(visit));
  for(let j=0;j<results.length;j++){
   const outcome=results[j],job=batch[j];
   if(outcome.status==='fulfilled')rows.push(outcome.value);
   else {
    const error=outcome.reason;
    const failure={city:job.city.cityId,lang:job.lang,state:job.state,error:String(error.name),
     reason:String(error.message).split('\\n')[0]};
    failures.push(failure);
    console.error('CASE FAIL '+JSON.stringify(failure));
   }
  }
  await fs.writeFile(path.join(output,'Квитанція короткого екрана.json'),JSON.stringify({
   commit:${JSON.stringify(expectedHead)},fileHashes:${JSON.stringify(identity)},browser:browser.version(),
   status:i+batch.length===jobs.length?(failures.length?'FAIL':'PASS'):'in-progress',
   cases:jobs.length,checked:i+batch.length,rows,failures
  },null,2)+'\\n');
 }
 assert.equal(failures.length,0,'short-screen failures; see receipt');
 assert.equal(rows.length,${languages.length*8});
 console.log('PASS short screen: '+rows.length+' direct handoffs across all NOAA states');
`+source.slice(summaryEnd);

process.env.VERIFY_CLOCK_EVIDENCE_DIR=output;
const harness=new Module(filename,module);
harness.filename=filename;
harness.paths=Module._nodeModulePaths(path.dirname(filename));
process.argv.splice(2,process.argv.length-2,'--first-screen-only');
harness._compile(source,filename);
process.on('exit',()=>assert.deepEqual(candidateState(),identity));
