const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {resolveBrowserOptions}=require('./browser_options.cjs');
const root=path.resolve(__dirname,'../..'),checks=[];
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(file===root)file=path.join(root,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(fs.readFileSync(file))}catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...resolveBrowserOptions(chromium)});
 try{
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true}),errors=[];
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html?channel=play');await page.waitForFunction(()=>typeof fp450ExportLocalData==='function'&&document.querySelector('.nr-local-controls'));
  await page.evaluate(()=>{fp434Go('profile',true);localStorage.setItem('gindex_export_fixture',JSON.stringify({note:'private fixture'}));localStorage.setItem('gindex_plain_fixture','plain text');localStorage.setItem('gindex_session_token','secret token');localStorage.setItem('other_application','preserve');sessionStorage.setItem('gindex_session_token','session secret');sessionStorage.setItem('gindex_session_fixture','session text')});
  async function exportData(){const download=page.waitForEvent('download');assert.equal(await page.evaluate(()=>fp450ExportLocalData()),true);const d=await download;assert.equal(d.suggestedFilename(),'neborhythm-local-data.json');return JSON.parse(fs.readFileSync(await d.path(),'utf8'))}
  const data=await exportData();assert.deepEqual(data.items.gindex_export_fixture,{note:'private fixture'});assert.equal(data.items.gindex_plain_fixture,'plain text');assert.equal(data.session_items.gindex_session_fixture,'session text');assert(!('gindex_session_token' in data.items));assert(!('gindex_session_token' in data.session_items));assert(!('other_application' in data.items));checks.push('complete export includes JSON/plain text and both stores; excludes tokens and other apps');
  let downloads=0;page.on('download',()=>downloads++);
  for(const store of ['localStorage','sessionStorage']){
   const result=await page.evaluate(store=>{
    const descriptor=Object.getOwnPropertyDescriptor(window,store);Object.defineProperty(window,store,{configurable:true,get(){throw new DOMException('private denied value','SecurityError')}});
    try{return {ok:fp450ExportLocalData(),text:document.getElementById('nrProfileStatus').textContent}}finally{Object.defineProperty(window,store,descriptor)}
   },store);assert.equal(result.ok,false);assert.match(result.text,/Не вдалося експортувати/);
  }
  const readFailure=await page.evaluate(()=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='gindex_export_fixture')throw Error('private read value');return original.call(this,k)};try{return fp450ExportLocalData()}finally{Storage.prototype.getItem=original}});assert.equal(readFailure,false);assert.equal(downloads,0);checks.push('denied store and failed read show failure without partial download or uncaught exception');
  const downloadFailure=await page.evaluate(()=>{const original=HTMLAnchorElement.prototype.click,oldRevoke=URL.revokeObjectURL;window.__privacyRevoked=0;URL.revokeObjectURL=function(u){window.__privacyRevoked++;return oldRevoke.call(this,u)};HTMLAnchorElement.prototype.click=function(){throw Error('private download value')};try{return fp450ExportLocalData()}finally{HTMLAnchorElement.prototype.click=original}});assert.equal(downloadFailure,false);await page.waitForFunction(()=>window.__privacyRevoked===1);assert.equal(downloads,0);checks.push('download failure is reported and created object URL released');
  await exportData();assert.equal(downloads,1);const diag=await page.evaluate(()=>NRDiagnostics.snapshot());assert(!JSON.stringify(diag).includes('private'));checks.push('export recovers after failure; diagnostics contain no private payload');
  const peer=await context.newPage();peer.on('pageerror',e=>errors.push(e.message));await peer.goto(base+'/index.html?channel=play');await peer.waitForFunction(()=>typeof fp450ClearLocalData==='function'&&document.querySelector('.nr-local-controls'));
  await peer.evaluate(()=>sessionStorage.setItem('gindex_peer_fixture','clear peer'));
  page.once('dialog',d=>d.accept());await page.evaluate(()=>fp450ClearLocalData());
  await page.waitForFunction(()=>localStorage.getItem('gindex_export_fixture')===null&&sessionStorage.getItem('gindex_session_fixture')===null);
  await peer.waitForFunction(()=>sessionStorage.getItem('gindex_peer_fixture')===null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('other_application')),'preserve');assert.equal(await peer.evaluate(()=>localStorage.getItem('gindex_session_token')),null);checks.push('confirmed reset clears owned local/session data across tabs while preserving other apps');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'PRIVACY_CONTROLS_RESULTS.json'),JSON.stringify({status:'PASS',checks,page_errors:errors},null,2));console.log('PASS',checks);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
