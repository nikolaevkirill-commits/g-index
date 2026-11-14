'use strict';
// FP572: the natal Moon in «Для тебе» (natal_sky_v1) comes from the shared lunar source. What the screen shows
// from it — the Tara group (natal nakshatra mod 9) and the natal Moon sign (Chandrashtama, Sade Sati) — must equal
// the personal page's for the same birth instant, including births one minute from a nakshatra boundary.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..','..'),Personal=require(path.join(root,'personal_dayline_model.js'));
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','lunar_reference_swiss_de431.json'),'utf8'));
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((request,response)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://l').pathname));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{response.writeHead(error?404:200,{'content-type':types[path.extname(file)]||'application/octet-stream'});response.end(error?'':data);});});
const pad=n=>String(n).padStart(2,'0');
// Births: one minute before and after nakshatra boundaries of 2017–2028 (where screens could disagree), plus spread dates.
const cases=[];
for(const [t] of reference.boundaries.nakshatra.filter((_,i)=>i%15===0))for(const shift of [-60000,60000]){
 const offset=[2,3,5.75,-5][cases.length%4],local=new Date(Math.floor((t+shift)/60000)*60000+offset*3600000);
 cases.push({date:local.toISOString().slice(0,10),time:pad(local.getUTCHours())+':'+pad(local.getUTCMinutes()),utcOff:offset,utc:+local-offset*3600000});
}
// Births whose minute starts within 10 s of a boundary: here the old Meeus natal Moon (up to ~19 s off) disagrees.
for(const [t] of reference.boundaries.nakshatra)for(const m of [Math.floor(t/60000)*60000,Math.ceil(t/60000)*60000]){
 if(Math.abs(m-t)>=10000||m===t)continue;const local=new Date(m+2*3600000);
 cases.push({date:local.toISOString().slice(0,10),time:pad(local.getUTCHours())+':'+pad(local.getUTCMinutes()),utcOff:2,utc:m});
}
for(let y=1975;y<2030;y+=3)cases.push({date:y+'-06-15',time:'07:30',utcOff:3,utc:Date.UTC(y,5,15,4,30)});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'uk-UA',serviceWorkers:'block',timezoneId:'Europe/Kyiv'});
  await context.addInitScript(()=>{sessionStorage.setItem('nrs_launch','1');});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?channel=play#today',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.NRNatalSky&&window.SkyRhythmLunar?.available?.()&&window.PersonalDayline,null,{timeout:30000});
  const actual=await page.evaluate(list=>list.map(c=>{
   lsSet(getSlotKey(_activeSlot),JSON.stringify({date:c.date,time:c.time,tz:'manual',utcOff:c.utcOff}));
   const g={Moon:{sign:0,nakshatra:0},Saturn:{sign:0},Jupiter:{sign:0}};
   const l=NRNatalSky.lines(c.date,{daily:[{date:c.date,grahas:g}]});
   const r=NRNatalSky.timelineTara(Array.from({length:27},(_,i)=>i+1));
   const janma=Object.entries(r.byNakshatra||{}).find(([,v])=>v.name==='Джанма'||v.name==='Janma');
   return {nak:l.nak,sign:l.sign,ambiguous:r.status==='ambiguous',group:janma? (Number(janma[0])-1)%9:null};
  }),cases);
  let checks=0;
  cases.forEach((c,i)=>{
   // A supplied clock minute is an interval, so do not collapse a crossing to its first instant.
   const e=Personal.birthEvidence({date:c.date,time:c.time,mode:'known',offsetHours:c.utcOff});
   assert.equal(e.intervals[0].start,c.utc,'manual UTC conversion');
   const nak=e.candidates.length===1?e.candidates[0]:null;
   const sign=e.rashiCandidates.length===1?e.rashiCandidates[0]:null;
   assert.deepEqual(actual[i],{nak,sign,ambiguous:nak===null,group:nak===null?null:nak%9},c.date+' '+c.time);
   checks+=4;
  });
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checks,cases:cases.length,scope:'Chromium, index.html; «Для тебе» Janma vs personal_dayline_model for the same instant'}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
