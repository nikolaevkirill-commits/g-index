const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),crypto=require('crypto');
const readSource=file=>path.resolve(file)===path.resolve(__dirname,'../../index.html')?require('../../tools/read_runtime_source.cjs')(path.resolve(__dirname,'../..')):fs.readFileSync(file,'utf8');
const source=process.env.UAF_TEST_HTML||path.resolve(__dirname,'../../index.html');
function load(file){const html=readSource(file),start=html.indexOf('function parseUafAurora(');assert(start>=0);const context=vm.createContext({todayKyivStr:()=> '2026-09-25',console:{warn(){}}});vm.runInContext(html.slice(start,html.indexOf('\n}',start)+2),context);return context.parseUafAurora;}
const parse=load(source),bad=['2bad','3,5','', ' ',null,true,false,{},[],10,-1,'NaN','Infinity','0x2'];
const times=['2026-09-26','2026-09-26 00:00:00','2026-09-20 00:00:00'];
for(const predicted_time of times){
 for(const kp of bad)assert.equal(parse(JSON.stringify([{predicted_time,kp}])),null,`${predicted_time}: ${JSON.stringify(kp)}`);
 for(const kp of [0,2,9,'0','2.5',' 9 ','+3']){
  const r=parse(JSON.stringify([{predicted_time,kp}]));const rows=[...r.kp27Day,...r.kp3Day,...r.historical];assert.equal(rows.length,1);assert.equal(rows[0].kp,Number(kp));
 }
 const r=parse(JSON.stringify([{predicted_time,kp:'2bad'},{predicted_time,kp:0}]));assert.equal([...r.kp27Day,...r.kp3Day,...r.historical].length,1);
}
// Long timestamp array takes the legacy scratch branch; it must also reject junk.
assert.equal(parse(JSON.stringify(Array.from({length:51},()=>({predicted_time:'2026-09-26 00:00:00',kp:'2bad'})))),null);
const result={status:'PASS',source,source_sha256:crypto.createHash('sha256').update(readSource(source)).digest('hex'),invalidChecks:bad.length*3+1,validChecks:21,mixedChecks:3};
if(process.env.UAF_BASELINE_HTML){
 const old=load(process.env.UAF_BASELINE_HTML);assert.equal(old('[{"predicted_time":"2026-09-26","kp":"2bad"}]').kp27Day[0].kp,2);
 const fixture=fs.readFileSync(process.env.UAF_FIXTURE,'utf8');assert.deepEqual(JSON.parse(JSON.stringify(parse(fixture))),JSON.parse(JSON.stringify(old(fixture))));result.unchangedRealFixture=true;result.baselineBugReproduced=true;
}
fs.writeFileSync(process.env.UAF_TEST_RESULT||path.join(__dirname,'UAF_INPUT_RESULTS.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
