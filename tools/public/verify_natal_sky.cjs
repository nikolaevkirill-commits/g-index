'use strict';
// «Для тебе» guard. Fixture birth 1990-06-15 14:20 Europe/Kyiv: natal Moon (Lahiri, Moshier, checked independently
// with Swiss Ephemeris) = 320.70°, sign 10 Aquarius, nakshatra 24 (Purva Bhadrapada). With Saturn in Pisces this is
// Sade Sati phase 3, Jupiter in Leo is the 7th sign (favourable), Chandrashtama only when the Moon is in Virgo.
// Without a profile the card offers a local-only form; saving it shows the lines. The score never changes.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'classic.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f)});s.end(b)})});
const sky=JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/sky.json'),'utf8'));
// The fixed clock must not precede the feed's generated_at, or the page (correctly) shows a clock-skew notice and re-renders.
const feedAt=Date.parse(JSON.parse(fs.readFileSync(path.join(root,'consumer_cloud/forecast.json'),'utf8')).generated_at||0)||0;
const NOW=new Date(Math.max(Date.parse(sky.daily[0].date+'T07:00:00Z'),feedAt+3600e3));
const NATAL_SIGN=10,NATAL_NAK=24,TARA=['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhana','Naidhana','Mitra','Atimitra'];
const fixture={name:'',date:'1990-06-15',time:'14:20',utcOff:4,tz:'Europe/Kyiv',profile:'general'};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let checks=0;
try{for(const entry of ['classic.html','index.html'])for(const lang of ['uk','en']){
 const c=await b.newContext({locale:lang==='uk'?'uk-UA':'en-GB',serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Europe/Kyiv'});await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(f=>{if(!sessionStorage.getItem('nofixture'))localStorage.setItem('personalData_0',JSON.stringify(f))},fixture);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(NOW);
 await p.goto('http://127.0.0.1:'+srv.address().port+'/'+entry+'?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-you] .nr-dv-you li'),null,{timeout:60000});
 const dates=await p.evaluate(()=>[...document.querySelector('#nrRoute-today [data-overview="today"] select').options].map(o=>o.value));
 for(const day of sky.daily.slice(0,10)){if(!dates.includes(day.date))continue;
  const r=await p.evaluate(async ds=>{const sel=document.querySelector('#nrRoute-today [data-overview="today"] select');const score0=document.querySelector('#nrRoute-today .nr-o-score').textContent;sel.value=ds;sel.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
   const y=document.querySelector('#nrRoute-today [data-day-you] .nr-dv-you');return {text:y?.innerText||'',score:document.querySelector('#nrRoute-today .nr-o-score').textContent,ref:String(fp469ConsumerForDate({ds}).consumer.score)}},day.date);
  const g=day.grahas,grp=((g.Moon.nakshatra-NATAL_NAK)%27+27)%27%9+1;
  assert.ok(r.text.includes(TARA[grp-1]),day.date+' Tara '+TARA[grp-1]+' in '+r.text);
  const chandra=((g.Moon.sign-NATAL_SIGN)%12+12)%12===7;assert.equal(/Чандраштама|Chandrashtama/.test(r.text),chandra,day.date+' Chandrashtama');
  if(g.Saturn.sign===11)assert.match(r.text,lang==='uk'?/Саде Саті, фаза 3 з 3/:/Sade Sati, phase 3 of 3/);
  if(g.Jupiter.sign===4)assert.match(r.text,lang==='uk'?/Юпітер у 7-му.*сприятливо/:/Jupiter in the 7th sign.*favourable/);
  if(lang==='en')assert.equal(/[А-Яа-яІіЇїЄєҐґ]/.test(r.text),false,'Ukrainian in English: '+r.text);
  if(r.ref==='null')assert.equal(r.score.trim(),'—',day.date+': no score must show the explicit empty state');else assert.equal(r.score.replace(/[^\d+\-−]/g,'').replace('−','-').replace('+',''),r.ref.replace('+',''),'score changed');checks++;}
 // no profile → local form → lines
 await p.evaluate(()=>{sessionStorage.setItem('nofixture','1');localStorage.removeItem('personalData_0')});await p.reload({waitUntil:'load'});
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-natal-form]'),null,{timeout:60000});
 await p.evaluate(()=>document.querySelector('#nrRoute-today .nr-dv-you-form').open=true);
 await p.fill('#nrRoute-today [data-natal-form] input[name=date]','1990-06-15');await p.fill('#nrRoute-today [data-natal-form] input[name=time]','14:20');await p.fill('#nrRoute-today [data-natal-form] input[name=tz]','Europe/Kyiv');
 await p.click('#nrRoute-today [data-natal-form] button[type=submit]');
 await p.waitForFunction(()=>document.querySelector('#nrRoute-today [data-day-you] .nr-dv-you li'),null,{timeout:10000});
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('personalData_0')||'null'));assert.equal(saved?.date,'1990-06-15');assert.equal(saved?.utcOff,4); // Kyiv 15.06.1990 = UTC+4 (Moscow summer time until 01.07.1990)
 assert.equal(errs.length,0,errs.join('|'));await c.close();}}
finally{await b.close();srv.close()}
console.log('PASS for-you transits: '+checks+' date checks (2 entries × uk/en); Tara, Chandrashtama, Sade Sati, Jupiter; local form saves and shows');})().catch(e=>{console.error(e.message);process.exit(1)});
