const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(e?'':d)})});
function luminance(c){const a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(),results=[];
try{for(const entry of ['index.html','classic.html'])for(const width of [320,390,1280]){
 const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',locale:'uk-UA',reducedMotion:'reduce'}),p=await c.newPage();
 if(width===320)await p.clock.setFixedTime(new Date('2026-11-10T14:30:00Z'));
 await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#calendar');
 await p.waitForFunction(()=>document.querySelectorAll('.nr-o-topic-days [data-day]').length>1);
 const ds=await p.locator('.nr-o-topic-days [data-day]').nth(1).getAttribute('data-day');
 const card=p.locator('.nr-o-topic-days [data-day="'+ds+'"]');await card.click();
 await p.waitForFunction(ds=>document.querySelector('.nr-o-topic-days [data-day="'+ds+'"]')?.getAttribute('aria-pressed')==='true',ds);
 const colors=await card.evaluate(e=>{const s=getComputedStyle(e);return {text:s.color,value:getComputedStyle(e.querySelector('strong,.sr-p0-value')||e).color,background:s.backgroundColor,gradient:s.backgroundImage}});
 const backgrounds=colors.gradient==='none'?[colors.background]:colors.gradient.match(/rgba?\([^)]+\)/g);assert(backgrounds?.length,'Cannot evaluate selected card background');
 const ratio=Math.min(...backgrounds.flatMap(bg=>[contrast(colors.text,bg),contrast(colors.value,bg)]));assert(ratio>=4.5,entry+' '+width+' selected date contrast '+ratio.toFixed(2)+' <4.5');
 results.push({entry,width,ratio,colors});if(process.env.NR_SELECTION_EVIDENCE)await card.screenshot({path:path.join(process.env.NR_SELECTION_EVIDENCE,entry.replace('.html','')+'-selected-'+width+'.png')});
 if(width===320){
  const selected=p.locator('[data-overview=calendar] .nr-o-hero select');
  await selected.selectOption('2026-11-13');
  const label=p.locator('[data-overview=calendar] .nr-o-hero .nr-o-label');
  await p.waitForFunction(()=>document.querySelector('[data-overview=calendar] .nr-o-hero .nr-o-label')?.textContent.includes('Нейтральна оцінка'));
  await p.evaluate(()=>document.fonts.ready);
  const lines=await label.evaluate(el=>{
   const range=document.createRange();
   const node=el.firstChild;
   const start=node.textContent.indexOf('Нейтральна');
   range.setStart(node,start);range.setEnd(node,start+'Нейтральна'.length);
   return range.getClientRects().length;
  });
  const fits=await selected.evaluate(el=>{
   const style=getComputedStyle(el);
   const canvas=document.createElement('canvas').getContext('2d');
   canvas.font=style.font;
   const text=el.selectedOptions[0].text;
   const available=el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-18;
   return canvas.measureText(text).width<=available;
  });
  assert.ok(fits,entry+' 320 px: the selected date fits beside the native arrow');
  assert.equal(lines,1,entry+' 320 px: “Нейтральна” fits on one line');
 }
 await c.close();}
 console.log(JSON.stringify(results));console.log('PASS selected calendar cards: 2 entries × mobile/desktop, text and score contrast >=4.5; neutral label wraps between words at 320 px');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});

