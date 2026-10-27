const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((q,s)=>{
 const rel=new URL(q.url,'http://localhost').pathname.replace(/^\/+/,'')||'index.html',f=path.resolve(root,rel);
 if(!f.startsWith(root+path.sep)){s.writeHead(403);return s.end()}
 const source=process.env.QA_OLD_NAV&&rel==='mobile_navigation_v1.js'?process.env.QA_OLD_NAV:f;
 fs.readFile(source,(e,b)=>{s.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(e?'':b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b=await chromium.launch({...(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{})}),results=[];
 try{
 for(const entry of ['index.html','design-v4.html'])for(const kind of ['daily','storm'])for(const width of [390,1280]){
  const ctx=await b.newContext({viewport:{width,height:844},serviceWorkers:'block'}),p=await ctx.newPage();
  await p.clock.install({time:new Date('2026-10-20T10:00:00Z')});
  await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play&push='+kind+'#heroCard');
  await p.clock.runFor(5000);
  const selector='[data-overview="today"] '+(kind==='daily'?'.nr-o-heading h1':'.nr-o-weather-top');
  const result=await p.locator(selector).evaluate(e=>{
   const r=e.getBoundingClientRect();
   return {focused:document.activeElement===e,visible:r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0,url:location.href,legacyExposed:(()=>{const d=document.querySelector('#nrRoute-today>.nr-legacy-details');return !!d&&d.open&&!d.hidden})()};
  });
  assert(result.focused,entry+' '+kind+' focus');assert(result.visible,entry+' '+kind+' visible');
  assert(!result.legacyExposed);const u=new URL(result.url);assert.equal(u.searchParams.get('channel'),'play');assert(!u.searchParams.has('push'));assert.equal(u.hash,'#today');
  results.push({entry,kind,width,...result});await ctx.close();
 }
 console.log(JSON.stringify({status:'PASS',cases:results.length,results}));
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e.message);server.close();process.exitCode=1});
