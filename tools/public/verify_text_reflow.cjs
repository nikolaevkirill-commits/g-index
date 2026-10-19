const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const out=process.env.NR_REFLOW_EVIDENCE;
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(q.url,'http://local').pathname));if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,data)=>{r.writeHead(e?404:200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(e?'':data)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.env.FP463_BROWSER?{executablePath:process.env.FP463_BROWSER}:{});const results=[];try{
for(const entry of ['index.html','design-v4.html'])for(const width of [320,390,430])for(const scale of [100,200]){
const context=await browser.newContext({viewport:{width,height:844},isMobile:true,serviceWorkers:'block',timezoneId:'Europe/Kyiv'});const p=await context.newPage();
await p.goto('http://127.0.0.1:'+server.address().port+'/'+entry+'?channel=play#today',{waitUntil:'domcontentloaded'});
await p.waitForSelector('[data-overview="today"] .nr-o-score',{state:'visible'});
await p.evaluate(()=>document.fonts.ready);
console.log('Reflow',entry,width,scale);
const original=await p.evaluate(()=>parseFloat(getComputedStyle(document.body).fontSize));
await p.addStyleTag({content:`html{-webkit-text-size-adjust:${scale}%!important;text-size-adjust:${scale}%!important}`});
const metrics=await p.evaluate(()=>{const nav=document.querySelector('#mobileNav'),buttons=[...nav.querySelectorAll('button')],locale=document.querySelector('#nrLocaleControl select'),date=document.querySelector('[data-overview="today"] select');const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}};return {font:parseFloat(getComputedStyle(document.body).fontSize),width:innerWidth,documentWidth:document.documentElement.scrollWidth,locale:rect(locale),date:rect(date),navWidth:nav.clientWidth,navScroll:nav.scrollWidth,buttons:buttons.map(rect)}});
assert(Math.abs(metrics.font-original*scale/100)<1,'Text must actually resize');
assert(metrics.documentWidth<=width+1,'Page must not overflow');
assert(metrics.locale.left>=-1&&metrics.locale.right<=width+1,'Locale control must fit');
assert(metrics.date.left>=-1&&metrics.date.right<=width+1,'Date control must fit');
const textFits=await p.locator('#mobileNav button').evaluateAll(buttons=>buttons.every(b=>{const bounds=b.getBoundingClientRect();return [...b.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).every(n=>{const range=document.createRange();range.selectNodeContents(n);const text=range.getBoundingClientRect();return text.left>=bounds.left-1&&text.right<=bounds.right+1})}));assert(textFits,'Navigation text escapes its button');
for(let i=1;i<metrics.buttons.length;i++)assert(metrics.buttons[i].left>=metrics.buttons[i-1].right-1,'Navigation buttons overlap');
await p.locator('#mobileNav button').last().focus();
await p.waitForFunction(()=>{const r=[...document.querySelectorAll('#mobileNav button')].at(-1).getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1},{},{timeout:3000});
const reachable=await p.locator('#mobileNav button').last().evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1});assert(reachable,'Last navigation destination must remain reachable');
await p.locator('#mobileNav button').first().focus();
await p.locator('#mobileNav').evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));
if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,entry.replace('.html','')+'-'+width+'-'+scale+'.png'),timeout:10000});}
results.push({entry,width,scale,metrics,lastNavigationReachable:reachable});await context.close();
}
if(out)fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(results,null,2));console.log('PASS text reflow: '+results.length+' cases; actual font doubling, control bounds, navigation reachability');
}finally{await browser.close();server.closeAllConnections();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
