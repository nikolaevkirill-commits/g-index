const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const readSource=file=>path.resolve(file)===path.resolve(__dirname,'../../index.html')?require('../../tools/read_runtime_source.cjs')(path.resolve(__dirname,'../..')):fs.readFileSync(file,'utf8');
const source=process.env.EXCEL_TEST_HTML||path.join(__dirname,'../../index.html');
const html=readSource(source);
const start=html.indexOf('async function handleBacktestFile(input) {');
const code=html.slice(start,html.indexOf('\n// ═',start));
async function run(rows){
 const nodes={},calls=[];
 const ctx={Date,Map,Number,Math,isFinite,isNaN,document:{getElementById:id=>nodes[id]||(nodes[id]={style:{}})},window:{XLSX:{}},XLSX:{read:()=>({SheetNames:['DATA'],Sheets:{DATA:{}}}),utils:{sheet_to_json:()=>rows}},computeAi:(d,k)=>{calls.push(k);return {Ai:0}},kpDayTerm:k=>2-k,gToCategory:g=>g>=0?4:3};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 await ctx.handleBacktestFile({files:[{name:'fixture.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)}]});
 return {nodes,calls};
}
(async()=>{
 let r=await run([{date:'2026-09-01',category:4,Kp:0}]);assert.deepEqual(r.calls,[0]);assert(r.nodes.btMae.textContent.endsWith('—'));assert(r.nodes.btAccuracy.innerHTML.includes('(1/1)'));
 for(const value of [null,'',true,'2bad','0x2',-1,10]){r=await run([{date:'2026-09-01',G:2,Kp:value}]);assert.equal(r.calls.length,0);assert(r.nodes.btAccuracy.innerHTML.includes('(0/0)'));}
 r=await run([{date:'2026-09-01',G:null,Kp:0}]);assert(r.nodes.btAccuracy.innerHTML.includes('(0/0)'));assert(r.nodes.btMae.textContent.endsWith('—'));
 r=await run([{date:'2026-09-01',G:'1,5',Kp:'0,5'}]);assert.deepEqual(r.calls,[.5]);assert(r.nodes.btMae.textContent.endsWith('0.00'));
 r=await run([{date:'2026-02-30',G:2,Kp:0}]);assert.equal(r.calls.length,0);
 r=await run([{date:'2026-09-01',G:2,Kp:0},{date:'2026-09-01',G:1,Kp:1}]);assert.equal(r.calls.length,0);assert(r.nodes.btFileLabel.textContent.includes('Повтор дати'));assert.equal(r.nodes.btStats.style.display,'none');
 r=await run([{date:'2026-09-01',G:'2bad',category:'4bad',Kp:0}]);assert(r.nodes.btAccuracy.innerHTML.includes('(0/0)'));
 console.log(JSON.stringify({status:'PASS',source_sha256:crypto.createHash('sha256').update(readSource(source)).digest('hex'),groups:13}));
})().catch(e=>{console.error(e);process.exit(1)});
