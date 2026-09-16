const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const start=html.indexOf('window.GDecisionLog = (function(){');
const end=html.indexOf('window.GJyotishLayer',start);
assert(start>=0&&end>start);
const results=[];
for(const [text,expected] of [['0',0],['-2.5',-2.5],['+1',1],['',null],['—',null],['Infinity',null]]){
 const store=new Map();const nodes={heroGval:{textContent:text},gdlPlanned:{value:'fixture'},gdlAvoided:{value:''},gdlStatus:{textContent:''}};
 const context={window:{},todayKyivStr:()=> '2026-09-16',localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:k=>nodes[k]||null,querySelector:()=>({value:'unchanged'}),querySelectorAll:()=>[]},setTimeout:()=>{},Date};
 vm.createContext(context);vm.runInContext(html.slice(start,end),context);context.window.GDecisionLog.save();
 const rows=JSON.parse(store.get('gindex_decision_log_v1'));assert.equal(rows[0].g_at_save,expected,'persisted score for '+JSON.stringify(text));results.push({text,expected});
}
console.log('PASS decision log persisted score: '+JSON.stringify(results));
