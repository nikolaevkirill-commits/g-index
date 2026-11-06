// FP566 NRMoonGL: the rendered disc must match the computed phase. Lit share of disc pixels ≈ k=(1+cos i)/2
// and the lit centroid points along the bright-limb angle θ (zenith up, east left). Fallback contract:
// draw() returns false without WebGL so the SVG Moon stays.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const src=fs.readFileSync(path.resolve(__dirname,'../../moon_gl_v1.js'),'utf8');
(async()=>{const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
try{
 const p=await browser.newPage();await p.setContent('<!doctype html><body style="margin:0;background:#000"></body>');await p.addScriptTag({content:src});
 const gl=await p.evaluate(()=>NRMoonGL.available());
 assert(gl,'Pixel validation requires WebGL; unavailable is not a rendered-phase PASS');
 for(const [i,theta] of [[150,90],[90,0],[90,210],[40,300],[120,45]]){
  const m=await p.evaluate(([i,theta])=>{const c=document.createElement('canvas');document.body.append(c);
   if(!NRMoonGL.draw(c,{phaseAngle:i,limb:theta,size:200,earthshine:0}))return null;
   const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const x=o.getContext('2d');x.drawImage(c,0,0);
   const d=x.getImageData(0,0,o.width,o.height).data,W=o.width,R=W/2;let disc=0,lit=0,sx=0,sy=0;
   for(let py=0;py<W;py++)for(let px=0;px<W;px++){const k=(py*W+px)*4,a=d[k+3];if(a<128)continue;disc++;
    const lum=(d[k]+d[k+1]+d[k+2])/3;if(lum>110){lit++;sx+=(px+.5-R);sy+=(R-(py+.5));}}
   c.remove();return {disc,lit,ang:Math.atan2(sy,sx)*180/Math.PI};},[i,theta]);
  assert(m,'draw failed');
  const k=(1+Math.cos(i*Math.PI/180))/2,share=m.lit/m.disc;
  assert(Math.abs(share-k)<0.025,`i=${i} lit share ${share.toFixed(3)} vs k ${k.toFixed(3)}`);
  // Expected direction of u=(−sinθ, cosθ) in screen y-up coordinates.
  const exp=Math.atan2(Math.cos(theta*Math.PI/180),-Math.sin(theta*Math.PI/180))*180/Math.PI,err=Math.abs(((m.ang-exp+540)%360)-180);
  assert(err<3,`θ=${theta} centroid ${m.ang.toFixed(1)}° vs ${exp.toFixed(1)}°`);
  results.push({i,theta,k:+k.toFixed(3),share:+share.toFixed(3),dirErr:+err.toFixed(2)});
 }
 assert.equal(await p.evaluate(()=>NRMoonGL.draw(document.createElement('canvas'),{phaseAngle:NaN,limb:0})),false,'invalid input must not draw');
 const invalid=await p.evaluate(()=>[{}, {phaseAngle:-1,limb:0},{phaseAngle:181,limb:0},{phaseAngle:90,limb:Infinity},{phaseAngle:90,limb:0,size:NaN},{phaseAngle:90,limb:0,size:1e8},{phaseAngle:90,limb:0,earthshine:NaN}].map(x=>NRMoonGL.draw(document.createElement('canvas'),x)));
 assert(invalid.every(x=>x===false),'invalid bounds must return false');
 for(const angle of [0,180]){
  const value=await p.evaluate(angle=>{const c=document.createElement('canvas');document.body.append(c);NRMoonGL.draw(c,{phaseAngle:angle,limb:0,size:100});const ctx=c.getContext('webgl'),data=new Uint8Array(4);ctx.readPixels(50,50,1,1,ctx.RGBA,ctx.UNSIGNED_BYTE,data);c.remove();return data[0];},angle);
  assert(angle===0?value>110:value<110,'full/new Moon center');
 }
 const blocked=await browser.newPage();await blocked.setContent('<body>');await blocked.evaluate(()=>HTMLCanvasElement.prototype.getContext=()=>null);await blocked.addScriptTag({content:src});assert.equal(await blocked.evaluate(()=>NRMoonGL.draw(document.createElement('canvas'),{phaseAngle:90,limb:0})),false);await blocked.close();
 const failed=await browser.newPage();await failed.setContent('<body>');await failed.evaluate(()=>WebGLRenderingContext.prototype.getShaderParameter=()=>false);await failed.addScriptTag({content:src});assert.equal(await failed.evaluate(()=>NRMoonGL.draw(document.createElement('canvas'),{phaseAngle:90,limb:0})),false);await failed.close();
 console.log(JSON.stringify(results));console.log('PASS moon gl: 5 pixel phases/directions, full/new, invalid bounds, unavailable/compile-failure fallback');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
