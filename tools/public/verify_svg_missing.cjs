'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
for(const file of ['core_runtime_v1.js','preview-v4/core_runtime_v1.js']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const start=source.indexOf('  function drawSegments('),end=source.indexOf('  // Dots',start);
 assert(start>=0&&end>start);
 const segmentCode=source.slice(start,end);
 function render(values){const ctx={days:values.map(G=>({G,isPast:true})),svgHtml:'',xFor:i=>i*10,yFor:g=>g*10};vm.runInNewContext(segmentCode,ctx);return ctx.svgHtml;}
 for(const bad of [NaN,Infinity,null,undefined,'2']){
  const result=render([1,bad,2]);assert.equal(result,'','Must not connect points over a missing observation');
 }
 assert.match(render([0,1]),/polyline/,'Zero is valid, not missing');
 const result=render([1,2,NaN,3,4]);assert.equal((result.match(/polyline/g)||[]).length,2);
 assert(!/NaN|Infinity/.test(result));
 const a=source.indexOf('  const mkBar = (val, x, col) => {'),z=source.indexOf('  const LOC_SHORT',a);assert(a>=0&&z>a);
 const bar=vm.runInNewContext(source.slice(a,z)+';mkBar',{maxAbs:4,barMaxH:34,midY:41,barW:28});
 for(const bad of [NaN,Infinity,null,undefined,'2'])assert.equal(bar(bad,1,'red'),'');
 assert.match(bar(0,1,'red'),/height="0"/);
}
console.log('PASS SVG gaps and bars: invalid values omitted, zero retained, separate line segments (2 runtime variants)');
