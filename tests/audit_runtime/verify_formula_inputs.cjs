const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ctx={window:{},console};vm.createContext(ctx);
for(const name of ['_finiteFormulaNumber','kpDayTerm','_dstValid','computeDstModifier']){
 const m=html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));
 // _dstValid historically occupied one line.
 const one=name==='_dstValid'?html.match(/function _dstValid\(v\)\{[^\n]+\}/):null;
 if(one)vm.runInContext(one[0],ctx);else if(m)vm.runInContext(m[0],ctx);else if(name!=='_finiteFormulaNumber')throw Error('Missing '+name);
}
const table=html.match(/const GFZ_AP_TABLE = \[[^]*?\];/)[0];
const ap=html.match(/function kpToApInterp\(kp\)\s*\{[^]*?\n\}/)[0];vm.runInContext(table+'\n'+ap,ctx);
let checks=0;const check=(ok,label)=>{assert.ok(ok,label);checks++};
for(const v of [null,undefined,'','   ',false,true,[],[0],{},NaN,Infinity,'12junk']){
 check(Number.isNaN(ctx.kpDayTerm(v)),'Kp missing/invalid must not become quiet: '+JSON.stringify(v));
 check(Number.isNaN(ctx.kpToApInterp(v)),'Ap missing/invalid must not become zero: '+JSON.stringify(v));
 ctx.window._lastDst={dst:v};const d=ctx.computeDstModifier();check(d.val===0&&d.tip.includes('недоступний'),'Invalid Dst must be unavailable: '+JSON.stringify(v));
 check(!ctx._dstValid(v),'Parser rejects invalid Dst: '+JSON.stringify(v));
}
for(const [k,e] of [[0,2],[1,1],[2,0],[5,-3],[9,-7],['0',2],['5',-3]])check(ctx.kpDayTerm(k)===e,'Kp sign/value '+k);
for(const [k,e] of [[0,0],[1,4],[2,7],[3,15],[4,27],[5,48],[6,80],[7,132],[8,207],[9,400]])check(ctx.kpToApInterp(k)===e,'Ap official anchor '+k);
for(const [v,e] of [[-100,-2],[-99.9,-1],[-50,-1],[-49.9,0],[0,0],['-50',-1]]){ctx.window._lastDst={dst:v};check(ctx.computeDstModifier().val===e,'Dst threshold '+v);}
for(const v of [9999,99999,-601,101,'-100junk']){ctx.window._lastDst={dst:v};check(!ctx._dstValid(v)&&ctx.computeDstModifier().tip.includes('недоступний'),'Dst sentinel/range '+v);}
const out={checks,status:'PASS',scope:'Actual production functions; invalid input coercion and unchanged numerical anchors/thresholds. No prediction accuracy claim.'};fs.writeFileSync(path.join(__dirname,'FORMULA_INPUT_RESULTS.json'),JSON.stringify(out,null,2));console.log(out);
