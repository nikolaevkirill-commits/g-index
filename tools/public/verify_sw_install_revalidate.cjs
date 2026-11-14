'use strict';
// FP572 (P2-7): a new service worker must not precache a stale HTTP-cached copy of an unversioned shell file.
// The server sends Cache-Control: max-age=3600. Release 1 is installed; then the content of an unversioned
// file and the cache version change (a deploy); release 2's install must store the new content.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..','..'),FILE='festival_astronomy_adapter_v1.js';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'};
let release=1;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),version=(sw.match(/const CACHE_VERSION = '([^']+)'/)||[])[1];
assert.ok(version,'CACHE_VERSION not found');
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://local'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 fs.readFile(file,(error,data)=>{
  if(error){response.writeHead(404);return response.end();}
  let body=data;
  if(url.pathname==='/sw.js')body=Buffer.from(sw.replace(`const CACHE_VERSION = '${version}'`,`const CACHE_VERSION = '${version}-r${release}'`));
  if(url.pathname==='/'+FILE)body=Buffer.concat([data,Buffer.from(`\n/* release ${release} */\n`)]);
  // sw.js itself is revalidated by the browser (updateViaCache 'imports'); every other file is long-lived.
  response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':url.pathname==='/sw.js'?'no-cache':'max-age=3600'});
  response.end(body);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({locale:'uk-UA',timezoneId:'Europe/Kyiv'});
  await context.addInitScript(()=>{sessionStorage.setItem('nrs_launch','1');});
  // No request interception here: in Chromium routing disables the HTTP cache this test is about.
  const page=await context.newPage(),base='http://127.0.0.1:'+server.address().port+'/';
  await page.goto(base+'index.html?channel=play#today',{waitUntil:'load'});
  const cached=async name=>page.evaluate(async([name,file])=>{const c=await caches.open((await caches.keys()).find(k=>k.includes(name)&&/shell/i.test(k))||name);const r=await c.match('./'+file)||await c.match(file);return r?await r.text():null;},[name,FILE]);
  await page.waitForFunction(async()=>(await navigator.serviceWorker.getRegistration())?.active?.state==='activated',null,{timeout:120000,polling:500});
  await page.waitForFunction(async v=>(await caches.keys()).some(k=>k.includes(v)),version+'-r1',{timeout:60000,polling:500});
  // The page itself fetched the file through the HTTP cache: release 1 is now stored there for an hour.
  let first=null;for(let i=0;i<240&&!first;i++){first=await cached(version+'-r1');if(!first)await page.waitForTimeout(500);}
  release=2;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r.waiting||r.installing===null&&r.active&&r.active.scriptURL);},null,{timeout:120000,polling:500});
  await page.waitForFunction(async v=>(await caches.keys()).some(k=>k.includes(v)),version+'-r2',{timeout:120000,polling:500});
  // Wait until release 2 is installed (waiting) or its install gave up; then read what it stored.
  let second=null;for(let i=0;i<240&&!second;i++){second=await cached(version+'-r2');if(!second)await page.waitForTimeout(500);}
  const state=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {waiting:!!r.waiting,installing:!!r.installing};});
  assert.ok(state.waiting||second,'release 2 did not install: '+JSON.stringify(state));
  assert.match(second||'',/release 2 \*\//,'new release cached a stale copy of '+FILE+' from the HTTP cache');
  console.log(JSON.stringify({status:'PASS',file:FILE,release1:'release 1',release2:'release 2',scope:'Chromium localhost; Cache-Control max-age=3600 on every shell file'}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
