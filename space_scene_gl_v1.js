/* FP569q WebGL illustration. Earth texture: NASA/GSFC SVS, https://svs.gsfc.nasa.gov/2915. */
(()=>{'use strict';
const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS=`precision highp float;
uniform vec2 R;uniform float T;uniform vec3 S;uniform vec3 E;uniform float A;uniform float G;uniform sampler2D TX;uniform float HAS;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 sky(vec2 q){vec3 c=mix(vec3(.02,.025,.07),vec3(.05,.03,.08),q.x);float s=h(floor(q*vec2(R.x,R.y)*.5));c+=vec3(step(.9965,s))*(.5+.5*sin(T*2.+s*50.));return c;}
void main(){
 vec2 fc=gl_FragCoord.xy;fc.y=R.y-fc.y;vec2 q=fc/R;vec3 col=sky(q);
 // ---- Sun
 vec2 ds=(fc-S.xy)/S.z;float r=length(ds);
 float ang=atan(ds.y,ds.x);
 float rays=fbm(vec2(ang*3.,r*2.-T*.15))*.6+fbm(vec2(ang*9.,T*.1))*.4;
 float corona=exp(-(r-1.)*(3.2-1.2*A))*(.55+.6*rays)*(.75+.5*A);
 if(r>1.)col+=mix(vec3(1.,.72,.32),vec3(1.,.42,.2),A)*corona*.95;
 if(r<=1.){
  float z=sqrt(1.-r*r);vec3 nrm=vec3(ds,z);
  float lon=atan(nrm.x,nrm.z)+T*.03,lat=asin(clamp(nrm.y,-1.,1.));
  vec2 uv=vec2(lon*2.2,lat*2.6);
  float g1=fbm(uv*4.+vec2(T*.10,T*.04)),g2=fbm(uv*14.-vec2(T*.22,0.)),gran=clamp(g1*.55+g2*.55,0.,1.);
  float sp=fbm(uv*1.4+vec2(7.3,2.1));float spot=smoothstep(.70,.76,sp)*smoothstep(.15,.5,z);
  vec3 c1=mix(vec3(1.,.50,.08),vec3(1.,.86,.45),smoothstep(.25,.8,gran));c1=mix(c1,vec3(1.,.98,.88),smoothstep(.75,1.,gran)*.6);
  c1=mix(c1,c1*vec3(1.,.62,.5),A*.55);
  c1*=mix(1.,.22,spot);
  float limb=.45+.55*pow(z,.55);col=c1*limb*1.15;
  float fl=A*smoothstep(.985,1.,sin(T*1.3)*.5+.5)*exp(-length(ds-vec2(.72,-.5))*6.);col+=vec3(1.,.95,.8)*fl*2.;
 }
 // ---- Earth
 vec2 de=(fc-E.xy)/E.z;float re=length(de);
 // atmosphere rim + aurora ovals (outside and on the limb)
 float rim=exp(-max(re-1.,0.)*9.)*(1.-smoothstep(1.,1.25,re));
 col+=vec3(.25,.55,1.)*rim*.55*step(.92,re);
 if(re<=1.){
  float z=sqrt(1.-re*re);vec3 nrm=vec3(de.x,-de.y,z);
  float lon=atan(nrm.x,nrm.z)+T*.06,lat=asin(clamp(nrm.y,-1.,1.));
  vec2 uv=vec2(fract(lon/6.2831853+.5),.5-lat/3.14159265);
  vec3 tex=HAS>.5?texture2D(TX,uv).rgb:mix(vec3(.05,.25,.6),vec3(.2,.5,.2),step(.55,fbm(uv*8.)));
  vec3 L=normalize(vec3(-1.,.15,.55));float dif=max(dot(nrm,L),0.);
  vec3 day=tex*(.18+1.05*dif);
  float fres=pow(1.-z,2.5);day+=vec3(.3,.6,1.)*fres*.6;
  col=mix(col,day,(1.-smoothstep(.985,1.,re)));
 }
 for(int k=0;k<2;k++){float sg=k==0?-1.:1.;vec2 pc=vec2(0.,sg*1.02);float d=length((de-pc)*vec2(1.1,2.6));
  float curtain=(.6+.4*sin(de.x*18.+T*3.+sg))*(.7+.3*fbm(vec2(de.x*6.,T*.6)));
  col+=mix(vec3(.25,1.,.5),vec3(.65,.3,1.),smoothstep(.0,.5,abs(de.y)-.7))*exp(-d*d*5.)*G*curtain*1.9;}
 gl_FragColor=vec4(col,1.);
}`;
let texImg=null,texReady=false;
function loadTex(){if(texImg)return;texImg=new Image();texImg.decoding='async';texImg.onload=()=>{texReady=true};texImg.src='earth_bluemarble_v1.webp?v=fp569q';}
function mount(canvas,overlay,m,animate,tx){
 const gl=canvas.getContext('webgl',{antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return null;
 loadTex();
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o};
 const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const U=n=>gl.getUniformLocation(pr,n);const uR=U('R'),uT=U('T'),uS=U('S'),uE=U('E'),uA=U('A'),uG=U('G'),uTX=U('TX'),uHAS=U('HAS');
 const tex=gl.createTexture();let texUp=false;
 const og=overlay.getContext('2d');
 const lvl=m.level,watch=m.unsettled;
 const act=m.hot?.65:0;           // Sun look
 const aur=lvl?Math.min(1,.55+lvl*.15):watch?.22:0;                   // aurora strength
 const squeeze=Math.min(.45,lvl*.11+(watch?.06:0));                    // day-side compression
 const speedK=Math.max(.6,Math.min(2.2,(m.speed||420)/420));
 const col=lvl>=2?[255,96,90]:lvl===1||watch?[255,190,90]:[120,210,255];
 const wave=lvl>=2?[255,80,60]:lvl===1||watch?[255,150,70]:[255,200,140];
 const rgba=(c,a)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')';
 let W=0,H=0,dpr=1;
 let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const P=Array.from({length:110+lvl*40},()=>({p:rnd(),y:rnd()*2-1,s:.7+rnd()*.6,leak:rnd()}));
 function size(){const b=canvas.getBoundingClientRect();dpr=Math.min(1.75,devicePixelRatio||1);W=Math.max(1,b.width);H=Math.max(1,Math.round(W*.56));
  for(const c of [canvas,overlay]){c.style.height=H+'px';c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}
  gl.viewport(0,0,canvas.width,canvas.height);og.setTransform(dpr,0,0,dpr,0,0)}
 // geometry in CSS px
 const geo=()=>{const sr=H*.40,sx=sr*.12,sy=H*.5,er=H*.135,ex=W*.74,ey=H*.52;return {sx,sy,sr,ex,ey,er}};
 // dipole field line r=L cos²λ (in Earth radii); day side (x<0) squeezed, night side stretched
 function fieldLine(L,side,g){const pts=[];for(let i=0;i<=40;i++){const la=-Math.PI/2+Math.PI*i/40,rr=L*Math.cos(la)**2;if(rr<1)continue;let x=side*rr*Math.cos(la),y=rr*Math.sin(la);
   x*=side<0?(1-squeeze*(L/5)):(1+(L-1.6)*.55+squeeze*1.2);pts.push([g.ex+x*g.er,g.ey-y*g.er])}return pts}
 function frame(elapsed,moving){
  const t=elapsed/1000,g=geo();
  gl.uniform2f(uR,canvas.width,canvas.height);gl.uniform1f(uT,t);
  gl.uniform3f(uS,g.sx*dpr,g.sy*dpr,g.sr*dpr);gl.uniform3f(uE,g.ex*dpr,g.ey*dpr,g.er*dpr);gl.uniform1f(uA,act);gl.uniform1f(uG,aur);
  if(texReady&&!texUp){gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,texImg);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);texUp=true}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(uTX,0);gl.uniform1f(uHAS,texUp?1:0);canvas.dataset.texture=texUp?'nasa':'procedural';
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  // ---- overlay
  og.clearRect(0,0,W,H);og.globalCompositeOperation='lighter';
  // shock waves from the Sun (like ripples), faster with faster wind; brighter in a storm
  const nW=lvl?4:3,per=4.2/speedK;
  for(let i=0;i<nW;i++){const ph=((t/per)+i/nW)%1,rad=g.sr*1.05+ph*(g.ex-g.er*2.4-g.sx-g.sr*1.05);const a=(1-ph)*(lvl?.55:watch?.35:.22);
   og.strokeStyle=rgba(wave,a);og.lineWidth=2+(1-ph)*3*(lvl?1.4:1);og.shadowColor=rgba(wave,a);og.shadowBlur=12;og.beginPath();og.arc(g.sx,g.sy,rad,-.62,.62);og.stroke()}
  og.shadowBlur=0;
  // solar-wind stream with trails, deflected along the magnetopause
  const nose=g.er*(3.0-squeeze*3.2);
  for(const q of P){if(moving)q.p+=.0028*q.s*speedK;if(q.p>1){q.p=0;q.y=rnd()*2-1;q.leak=rnd()}
   const x0=g.sx+g.sr*1.02,x=x0+(g.ex-x0+g.er*2)*q.p;let y=g.sy+q.y*H*.46*(.25+q.p*.75);let X=x;
   const dx=X-g.ex,dy=y-g.ey;
   const rr=Math.hypot(dx*.9,dy*.75);
   if(rr<nose*1.05&&!(m.bz<0&&q.leak<.12)){const a=Math.atan2(dy,dx);X=g.ex+Math.cos(a)*nose/.9;y=g.ey+Math.sin(a)*nose/.75}
   const al=Math.min(1,q.p*5)*(1-Math.max(0,(q.p-.9)*10))*.6;
   const len=10*speedK;const grd=og.createLinearGradient(X-len,y,X,y);grd.addColorStop(0,rgba(col,0));grd.addColorStop(1,rgba(col,al));
   og.strokeStyle=grd;og.lineWidth=1.4;og.beginPath();og.moveTo(X-len,y);og.lineTo(X,y);og.stroke()}
  // dipole field lines (the shield)
  og.lineWidth=1.6;og.shadowColor=rgba(col,.9);og.shadowBlur=lvl?14:8;
  const pulse=lvl?(.75+.25*Math.sin(t*5)):1;
  for(const L of [1.8,2.6,3.5]){for(const side of [-1,1]){const pts=fieldLine(L,side,g);if(pts.length<2)continue;og.strokeStyle=rgba(col,(side<0?.6:.35)*pulse*(1-(L-1.8)*.15));og.beginPath();og.moveTo(pts[0][0],pts[0][1]);for(const p of pts)og.lineTo(p[0],p[1]);og.stroke()}}
  // magnetopause outline
  og.strokeStyle=rgba(col,.5*pulse);og.lineWidth=2.2;og.beginPath();og.ellipse(g.ex+nose*.12,g.ey,nose/.9,Math.min(nose/.75,H*.46),0,Math.PI*.6,Math.PI*1.4);og.stroke();
  og.shadowBlur=0;og.globalCompositeOperation='source-over';
  // labels
  og.font='600 12px system-ui, sans-serif';og.textAlign='left';og.fillStyle='rgba(255,236,205,.95)';og.fillText(tx('Сонце','Sun',"Sol","Soleil"),g.sx+g.sr*.15,H-10);
  og.textAlign='center';og.fillStyle='rgba(225,238,255,.95)';og.fillText(tx('Земля','Earth',"Tierra","Terre"),g.ex,g.ey+g.er+16);
  og.fillStyle=rgba(col,.95);og.fillText(tx('магнітне поле Землі','Earth’s magnetic field',"campo magnético terrestre","champ magnétique terrestre"),g.ex-g.er*.2,Math.min(H-8,g.ey+g.er*2.9));
 }
 const loop=animate(canvas,size,frame);
 texImg.addEventListener('load',loop.repaint,{once:true});
 return ()=>{
  loop.stop();
  texImg.removeEventListener('load',loop.repaint);
  gl.deleteTexture(tex);gl.deleteBuffer(buf);gl.deleteProgram(pr);
 };
}
window.SRSpaceGL=Object.freeze({mount});
})();
