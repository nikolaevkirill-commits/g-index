'use strict';
// FP569k guard (Claude, 09.11.2026) for the mobile brief fixes on top of candidate 3ec2dba:
// dark-only main design, Kyiv default in Sky, one shared time on Today, K1 Sun motion marks, new-Moon label,
// Forecast Day verdict / compact Week / 27-day end, human dates in Sky events, day-line «passing» highlight.
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime=f=>f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.webp')?'image/webp':f.endsWith('.woff2')?'font/woff2':'application/octet-stream';
const srv=http.createServer((q,s)=>{const f=decodeURIComponent(q.url.split('?')[0]).slice(1)||'index.html';const p=path.resolve(root,f);if(!p.startsWith(root+path.sep)){s.writeHead(403);return s.end()}fs.readFile(p,(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});s.end(b)})});
const NOW=new Date('2026-11-09T08:51:00Z'); // 10:51 Kyiv, control time of the brief (feed of 9 Nov)
async function open(b,{theme='dark',scheme='dark',w=390}={}){
 const c=await b.newContext({locale:'uk-UA',serviceWorkers:'block',viewport:{width:w,height:860},timezoneId:'Europe/Kyiv',colorScheme:scheme});
 await c.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await c.addInitScript(t=>{localStorage.setItem('gidx_onboard_done_v2','1');localStorage.setItem('gindex_theme',t);},theme);
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:NOW});
 await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?channel=play#today',{waitUntil:'load',timeout:120000});
 await p.waitForFunction(()=>window.SRSkyTime&&document.querySelector('.sr-time-sun [data-time-sun]')&&document.querySelector('.sr-dayline input[type=range]'),null,{timeout:60000});await p.waitForTimeout(1500);
 return {c,p,errs};
}
const ratio=(fg,bg)=>{const L=c=>{const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};const a=L(fg),b=L(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();let n=0;
try{
 // 1. Light / system-light no longer produce dark-on-dark text: the main design renders the night scheme.
 for(const [theme,scheme] of [['light','light'],['auto','light']]){const {c,p,errs}=await open(b,{theme,scheme});
  const r=await p.evaluate(()=>{const h=document.querySelector('#nrRoute-today .nr-o-hero .nr-dv-tone')||document.querySelector('#nrRoute-today .nr-o-hero h2');const col=getComputedStyle(h).color.match(/\d+/g).map(Number);
   let e=h,bg=null;for(;e;e=e.parentElement){const m=getComputedStyle(e).backgroundColor.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>.5)){bg=m.slice(0,3).map(Number);break}}return {theme:document.documentElement.dataset.nrTheme,col,bg:bg||[0,0,0],options:[...document.querySelectorAll('#nrThemeChoice option')].map(o=>o.value)}});
  assert.equal(r.theme,'dark',theme+': main design renders dark');assert.ok(ratio(r.col,r.bg)>=4.5,theme+': verdict text contrast '+ratio(r.col,r.bg).toFixed(2));n+=2;
  assert.deepEqual(errs,[]);await c.close();}
 const {c,p,errs}=await open(b);
 // 2. One time on Today: Sun path and Day line move together.
 await p.evaluate(()=>SRSkyTime.selectMoment('2026-11-09T13:00:00Z'));await p.waitForTimeout(500);
 let v=await p.evaluate(()=>[...document.querySelectorAll('#nrRoute-today input[type=range]')].map(r=>r.getAttribute('aria-valuetext')));
 assert.ok(v.length>=2&&v.every(x=>/15:0[01]/.test(x)),'both sliders at 15:00: '+v.join(' | '));n++;
 await p.evaluate(()=>{const r=document.querySelector('.sr-dayline input[type=range]');r.value='500';r.dispatchEvent(new Event('input',{bubbles:true}))});await p.waitForTimeout(400);
 const fromLine=await p.evaluate(()=>({sky:SRSkyTime.snapshot().at,text:document.querySelector('.sr-dayline input[type=range]').getAttribute('aria-valuetext'),sun:document.querySelector('.sr-time-sun [data-time-sun]').dataset.at}));
 assert.ok(Math.abs(Date.parse(fromLine.sun)-fromLine.sky)<1000,'Sun marker follows the Day line slider');n++;
 await p.evaluate(()=>document.querySelector('.sr-dayline [data-now]').click());await p.waitForTimeout(400);
 assert.equal(await p.evaluate(()=>SRSkyTime.snapshot().mode),'now','Day line «Зараз» returns the shared clock to now');n++;
 // 3. K1 marks: «зараз» tick only when another time is shown; no Sun disc at night.
 const tick=async()=>p.evaluate(()=>getComputedStyle(document.querySelector('.sr-time-sun [data-time-nowtick]')).display);
 assert.equal(await tick(),'none','now mode: no separate tick');
 await p.evaluate(()=>SRSkyTime.selectMoment('2026-11-09T18:30:00Z'));await p.waitForTimeout(400);
 const night=await p.evaluate(()=>{const s=document.querySelector('.sr-time-sun');return {sun:s.dataset.sun,disc:getComputedStyle(s.querySelector('.sr-time-disc')).opacity,ghost:getComputedStyle(s.querySelector('.sr-time-night-cursor')).opacity}});
 assert.notEqual(await tick(),'none','selected time: «зараз» tick visible');assert.equal(night.sun,'below');assert.equal(night.disc,'0','no Sun disc at night');assert.ok(+night.ghost>0);n+=5;
 // 4. Day line marker lights up when the shared clock passes it (09:02 lunar-day change).
 await p.evaluate(()=>SRSkyTime.selectMoment('2026-11-09T07:03:00Z'));await p.waitForTimeout(400);
 assert.ok(await p.evaluate(()=>document.querySelectorAll('.sr-dayline [data-track] button.is-passing').length>=1),'passing marker at 09:03');n++;
 await p.evaluate(()=>SRSkyTime.live());
 // 5. Sky without a saved place: Kyiv default, bodies on the horizon map, dated new Moon, no raw ISO dates.
 await p.evaluate(()=>location.hash='panch');await p.waitForTimeout(1800);
 const sky=await p.evaluate(()=>{const r=document.querySelector('#nrRoute-panch');return {title:r.querySelector('.nr-sl h2')?.textContent,bodies:r.querySelectorAll('.nr-sl-body').length,example:!!r.querySelector('[data-sky-example]'),moon:r.querySelector('.nr-sl-moonbox span')?.textContent,iso:/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(r.innerText),isoAt:(r.innerText.match(/[\s\S]{0,60}\d{4}-\d{2}-\d{2} \d{2}:\d{2}[\s\S]{0,20}/)||[''])[0]}});
 assert.equal(sky.title,'Небо над Києвом');assert.ok(sky.bodies>=7,'horizon map has bodies');assert.equal(sky.example,true);assert.match(sky.moon,/Молодик · 9 лист\., 09:02/);assert.equal(sky.iso,false,'no raw ISO date-times in Sky: '+sky.isoAt);n+=5;
 // 6. Forecast: Day = verdict sentence (same as Today), Week = compact rows, 27 = end of period, no weekly events.
 const todayTone=await p.evaluate(()=>document.querySelector('#nrRoute-today .nr-dv-tone')?.textContent);
 await p.evaluate(()=>location.hash='forecast');await p.waitForTimeout(1200);
 const tab=async label=>{await p.getByRole('button',{name:label,exact:true}).first().click();await p.waitForTimeout(600)};
 await tab('День');const day=await p.evaluate(()=>{const v=document.querySelector('#nrRoute-forecast [data-forecast-verdict]');return v&&!v.hidden?v.querySelector('.sr-fv-tone').textContent:null});
 assert.equal(day,todayTone,'Forecast Day says the same verdict as Today');n++;
 await tab('Тиждень');const wk=await p.evaluate(()=>[...document.querySelectorAll('#nrRoute-forecast .nr-o-horizon-list [data-day]:not([hidden])')].map(x=>x.getBoundingClientRect().height));
 assert.equal(wk.length,7);assert.ok(Math.max(...wk)<=60,'compact week rows: '+Math.max(...wk));n+=2;
 await tab('27 днів');const m=await p.evaluate(()=>({end:document.querySelector('#nrRoute-forecast [data-forecast-end]:not([hidden])')?.textContent,events:[...document.querySelectorAll('#nrRoute-forecast [data-week-events]')].some(e=>e.getBoundingClientRect().height>0)}));
 assert.match(m.end||'',/Кінець періоду · 5 груд/);assert.equal(m.events,false,'no weekly events in the 27-day view');n+=2;
 assert.deepEqual(errs,[]);n++;await c.close();
 console.log('PASS mobile polish FP569k:',n,'checks');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;srv.close()});
