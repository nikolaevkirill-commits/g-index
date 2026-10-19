// Audit probe: every bottom-nav destination, both entries, 100% and 200% text, 320/390 px.
// Reports horizontal page overflow, visible elements crossing the viewport, clipped text and the NOAA/weather line.
const fs=require('fs'),path=require('path'),http=require('http'),{chromium}=require('playwright');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../..')),OUT=process.argv[3];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(q.url,'http://l').pathname));if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(e?'':d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const R=[];
try{for(const entry of ['index.html','design-v4.html'])for(const width of [320,390])for(const scale of [100,200]){
 const c=await b.newContext({viewport:{width,height:844},isMobile:true,serviceWorkers:'block',timezoneId:'Europe/Kyiv'});await c.addInitScript(()=>{sessionStorage.setItem('nrs_launch','1')});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#today',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('[data-overview="today"] .nr-o-score',{state:'visible',timeout:30000});await p.evaluate(()=>document.fonts.ready);
 await p.addStyleTag({content:`html{-webkit-text-size-adjust:${scale}%!important;text-size-adjust:${scale}%!important}`});await p.waitForTimeout(300);
 const routes=await p.evaluate(()=>[...document.querySelectorAll('#mobileNav button')].map(x=>({label:x.textContent.trim(),route:x.dataset.route||x.getAttribute('data-nav')||x.getAttribute('aria-controls')||null})));
 for(let i=0;i<routes.length;i++){
  await p.evaluate(i=>{const btn=[...document.querySelectorAll('#mobileNav button')][i];btn.scrollIntoView({inline:'center'});btn.click()},i);await p.waitForTimeout(700);
  const m=await p.evaluate(()=>{const W=innerWidth,route=document.querySelector('.nr-route.active')||document.body;
   const vis=e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
   const nav=document.querySelector('#mobileNav');
   const crossing=[],clipped=[];
   for(const e of route.querySelectorAll('*')){if(!vis(e)||nav?.contains(e))continue;let a=e.parentElement,inScroller=false;while(a&&a!==document.body){const s=getComputedStyle(a);if(/(auto|scroll)/.test(s.overflowX)&&a.scrollWidth>a.clientWidth+1){inScroller=true;break}a=a.parentElement}
    const r=e.getBoundingClientRect();if(!inScroller&&(r.right>W+1||r.left<-1)&&e.children.length===0&&e.textContent.trim())crossing.push((e.className||e.tagName)+':'+e.textContent.trim().slice(0,30)+' ['+Math.round(r.left)+','+Math.round(r.right)+']');
    const s=getComputedStyle(e);if(s.overflowX==='hidden'&&e.scrollWidth>e.clientWidth+2&&e.textContent.trim()&&s.textOverflow!=='ellipsis')clipped.push((e.className||e.tagName)+':'+e.textContent.trim().slice(0,30)+' '+e.scrollWidth+'>'+e.clientWidth)}
   const overlaps=[];for(const g of route.querySelectorAll('*')){const ds=getComputedStyle(g).display;if(!/grid|flex/.test(ds)||!vis(g)||nav?.contains(g))continue;const kids=[...g.children].filter(vis).map(k=>[k,k.getBoundingClientRect()]);for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++){const a=kids[i][1],b=kids[j][1];const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>2&&h>2&&getComputedStyle(kids[i][0]).position!=='absolute'&&getComputedStyle(kids[j][0]).position!=='absolute')overlaps.push((String(g.className).split(' ')[0]||g.tagName)+': '+kids[i][0].textContent.trim().slice(0,12)+' / '+kids[j][0].textContent.trim().slice(0,12))}}
   const spill=[];for(const e of route.querySelectorAll('*')){if(!vis(e)||nav?.contains(e))continue;const box=e.getBoundingClientRect();for(const n of e.childNodes){if(n.nodeType!==3||!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.right>box.right+2||r.left<box.left-2)spill.push((e.tagName)+':'+n.textContent.trim().slice(0,14)+' text['+Math.round(r.left)+','+Math.round(r.right)+'] box['+Math.round(box.left)+','+Math.round(box.right)+']')}}
   const weather=document.querySelector('.nr-active-route .nr-o-weather, .nr-route.active .nr-o-weather, .nr-route.active [data-weather-brief]');
   return {spill:[...new Set(spill)].slice(0,6),overlaps:[...new Set(overlaps)].slice(0,6),route:route.dataset?.route||route.id,docOverflow:document.documentElement.scrollWidth-W,crossing:[...new Set(crossing)].slice(0,8),clipped:[...new Set(clipped)].slice(0,8),weather:weather?{visible:vis(weather),text:weather.textContent.trim().slice(0,60)}:null}});
  R.push({entry,width,scale,tab:routes[i].label,...m});
 }
 R.push({entry,width,scale,errors:errs});await c.close();}
}finally{await b.close();server.close()}
if(OUT)fs.writeFileSync(OUT,JSON.stringify(R,null,1));
const bad=R.filter(x=>x.tab&&(x.docOverflow>1||x.crossing.length||x.clipped.length||x.overlaps.length||x.spill.length));
console.log('cases',R.filter(x=>x.tab).length,'with issues',bad.length);for(const x of bad)console.log(x.entry,x.width,x.scale,'['+x.tab+']','docOverflow',x.docOverflow,'crossing',JSON.stringify(x.crossing),'clipped',JSON.stringify(x.clipped),'overlaps',JSON.stringify(x.overlaps),'spill',JSON.stringify(x.spill));
const errs=R.filter(x=>x.errors&&x.errors.length);for(const x of errs)console.log('JS ERRORS',x.entry,x.width,x.scale,x.errors.slice(0,3));
require('assert/strict').equal(bad.length,0,'All routes must fit without clipped or overlapping text');
require('assert/strict').equal(errs.length,0,'No page errors');
})().catch(e=>{console.error(e);process.exitCode=1});
