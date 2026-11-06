// FP566: one static WebGL sphere, lit by the same phaseAngle/limb as the SVG fallback.
// No independent ephemeris, texture, animation loop or claim of measured surface brightness.
(function(){
'use strict';if(window.NRMoonGL)return;
const VS='attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}';
const FS=`precision mediump float;varying vec2 v;uniform vec3 s;uniform float e;
void main(){float r2=dot(v,v);if(r2>1.)discard;vec3 n=vec3(v,sqrt(max(0.,1.-r2)));
float mu0=dot(n,s),mu=n.z,lit=mu0>0.?mu0/(mu0+mu):0.;
float edge=1.-smoothstep(.985,1.,sqrt(r2));
vec3 day=vec3(.93,.91,.85)*(.55+.9*lit),night=vec3(.10,.12,.18)+vec3(.05,.06,.09)*e;
gl_FragColor=vec4(mix(night,day,smoothstep(0.,.02,mu0)),edge);}`;
const states=new WeakMap();let supported=null;
function available(){
 if(supported!==null)return supported;
 try{const c=document.createElement('canvas'),gl=c.getContext('webgl');supported=!!gl;
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
 }catch(_){supported=false;}return supported;
}
function program(gl){
 const shaders=[];let pr=null,buf=null;
 try{
  for(const [type,src] of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,FS]]){
   const sh=gl.createShader(type);if(!sh)throw Error('shader allocation');shaders.push(sh);gl.shaderSource(sh,src);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('shader compilation');
  }
  pr=gl.createProgram();if(!pr)throw Error('program allocation');for(const sh of shaders)gl.attachShader(pr,sh);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error('program link');
  buf=gl.createBuffer();if(!buf)throw Error('buffer allocation');gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  return {pr,buf,loc:gl.getAttribLocation(pr,'p'),s:gl.getUniformLocation(pr,'s'),e:gl.getUniformLocation(pr,'e')};
 }catch(e){if(buf)gl.deleteBuffer(buf);if(pr)gl.deleteProgram(pr);throw e;}
 finally{for(const sh of shaders)gl.deleteShader(sh);}
}
function sunVector(phaseAngle,limb){const i=phaseAngle*Math.PI/180,t=(((limb%360)+360)%360)*Math.PI/180;return [-Math.sin(i)*Math.sin(t),Math.sin(i)*Math.cos(t),Math.cos(i)];}
function draw(canvas,{phaseAngle,limb,size=132,earthshine=1}={}){
 if(!canvas||typeof canvas.getContext!=='function'||!Number.isFinite(phaseAngle)||phaseAngle<0||phaseAngle>180||!Number.isFinite(limb)||!Number.isFinite(size)||size<16||size>512||!Number.isFinite(earthshine)||earthshine<0||earthshine>1)return false;
 let st=states.get(canvas);
 try{
  if(!st){const gl=canvas.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:true});if(!gl)return false;supported=true;
   st={gl,resources:null,lost:gl.isContextLost(),failed:false};states.set(canvas,st);
   canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();st.lost=true;st.resources=null;canvas.dispatchEvent(new CustomEvent('nr:moon-gl',{bubbles:true,detail:{state:'lost'}}));});
   canvas.addEventListener('webglcontextrestored',()=>{st.lost=false;st.failed=false;st.resources=null;canvas.dispatchEvent(new CustomEvent('nr:moon-gl',{bubbles:true,detail:{state:'restored'}}));});
  }
  const {gl}=st;if(st.lost||st.failed||gl.isContextLost())return false;
  if(!st.resources)st.resources=program(gl);
  const r=st.resources,dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1)),px=Math.round(size*dpr);
  if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px;}canvas.style.width=canvas.style.height=size+'px';
  gl.viewport(0,0,px,px);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(r.pr);
  gl.bindBuffer(gl.ARRAY_BUFFER,r.buf);gl.enableVertexAttribArray(r.loc);gl.vertexAttribPointer(r.loc,2,gl.FLOAT,false,0,0);
  gl.uniform3fv(r.s,sunVector(phaseAngle,limb));gl.uniform1f(r.e,earthshine);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)return false;
  canvas.dataset.phaseAngle=phaseAngle.toFixed(4);canvas.dataset.limb=limb.toFixed(4);return true;
 }catch(_){if(st)st.failed=true;return false;}
}
window.NRMoonGL=Object.freeze({available,draw,sunVector});
})();
