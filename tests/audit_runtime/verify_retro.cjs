const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const source=process.env.RETRO_TEST_HTML||path.join(__dirname,'../../index.html');
const html=fs.readFileSync(source,'utf8');
const a=html.indexOf('const RETRO_COVERAGE ='),b=html.indexOf('// Планети: реальні орбітальні періоди',a);
const ctx={Date,Number};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
const test=(p,d)=>ctx.isRetrograde(p,new Date(d));
for(const p of ['Mercury','Venus','Mars','Jupiter','Saturn']){assert.equal(test(p,'2020-01-01'),null);assert.equal(test(p,'2030-01-01'),null);assert.equal(test(p,'bad'),null);}
assert.equal(test('unknown','2026-09-27'),null);assert.equal(test('Earth','2026-09-27'),false);
// Previously incorrect whole-day entries in the2026 table.
assert.equal(test('Mercury','2026-03-01T12:00:00Z'),true);
assert.equal(test('Mercury','2026-03-27T12:00:00Z'),false);
assert.equal(test('Mercury','2026-06-30T12:00:00Z'),true);
assert.equal(test('Saturn','2026-12-05T12:00:00Z'),true);
const periods=vm.runInContext('RETRO_PERIODS',ctx);let boundaries=0;
for(const [p,rows] of Object.entries(periods))for(const [s,e] of rows){
 const st=Date.parse(s),en=Date.parse(e);assert(st<en);assert.equal(test(p,new Date(st)),true);assert.equal(test(p,new Date(en-1)),true);
 const cov=vm.runInContext('RETRO_COVERAGE',ctx);
 if(st>Date.parse(cov[0]))assert.equal(test(p,new Date(st-1)),false);
 if(en<Date.parse(cov[1]))assert.equal(test(p,new Date(en)),false);
 boundaries+=2;
}
let independent=0;
if(process.env.RETRO_REFERENCE_DIR){
 const dir=process.env.RETRO_REFERENCE_DIR;const raw=fs.readFileSync(path.join(dir,'daily.html'),'utf8');
 const names={2:'Mercury',3:'Venus',4:'Mars',5:'Jupiter',6:'Saturn'};
 for(const m of raw.matchAll(/(\d{2})\.(\d{2})\.(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) UT,(\d+),\s*([+-]?[\d.]+)/g)){
  const date=`${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2,'0')}:${m[5]}:${m[6]}Z`;
  if(test(names[m[7]],date)===null)continue;
  assert.equal(test(names[m[7]],date),Number(m[8])<0,`${date} ${names[m[7]]}`);independent++;
 }
 assert(independent>3700);
}
console.log(JSON.stringify({status:'PASS',boundaries,independent_daily_sign_checks:independent,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')}));
