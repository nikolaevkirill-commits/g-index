
'use strict';

const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFile} = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '../..');
const shellBudget = 6_500_000;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const types = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css',
 '.json':'application/json', '.gz':'application/gzip', '.svg':'image/svg+xml', '.woff2':'font/woff2',
 '.png':'image/png', '.webp':'image/webp'};
const scope = '/g-index/';
let version = 'current';
let worker, legacyWorker;
let networkRequests = [];

const server = http.createServer(async (req, res) => {
 const pathname = new URL(req.url, 'http://local').pathname;
 if (!pathname.startsWith(scope)) return res.writeHead(404).end();
 const name = decodeURIComponent(pathname.slice(scope.length));
 networkRequests.push(name);
 if (name === 'probe.html') return res.writeHead(200, {'Content-Type':'text/html'}).end('<title>Offline shell test</title>');
 const file = path.resolve(root, name);
 if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
 try {
  const body = name === 'sw.js' ? (version === 'legacy' ? legacyWorker : worker)
   : version === 'corrupt' && name === 'core_runtime_v1.js.gz' ? Buffer.from('corrupt archive')
   : await readFile(file);
  res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
  res.end(body);
 } catch {
  res.writeHead(404).end();
 }
});

async function install(page, base) {
 await page.goto(base + 'probe.html');
 await page.evaluate(() => navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}));
 await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:90000});
}

async function inspectShell(page) {
 return page.evaluate(async () => {
  const names = (await caches.keys()).filter(name => name.startsWith('gindex-shell-'));
  const entries = await (await caches.open(names[0])).keys();
  const cache = await caches.open(names[0]);
  let installedBytes = 0;
  for (const request of entries) installedBytes += (await (await cache.match(request)).arrayBuffer()).byteLength;
  return {names, installedBytes, keys:entries.map(request => new URL(request.url).pathname)};
 });
}

async function coldStart(browser, base, packed) {
 const context = await browser.newContext({viewport:{width:390,height:844},locale:'uk-UA'});

 try {
  const first = await context.newPage();
  await install(first, base);
  const info = await inspectShell(first);
  assert.equal(info.names.length, 1);
  assert.equal(info.keys.includes(scope + 'classic.html'), true);
  assert.equal(info.keys.includes(scope + 'index.html'), true);
  if (packed) assert(info.installedBytes <= shellBudget);

  for (const asset of ['core_runtime_v1.js','locale_overview_v1.js','preview-v4/core_runtime_v1.js','preview-v4/locale_overview_v1.js']) {
   assert.equal(info.keys.includes(scope + asset), !packed, asset);
   assert.equal(info.keys.includes(scope + asset + '.gz'), packed, asset);
  }
  assert.equal(networkRequests.filter(name => name === 'classic.html').length, 1, 'classic requested only by shell install');
  await context.setOffline(true);
  for (const entry of ['index.html','classic.html']) {
   const page = await context.newPage();
   const errors = [];
   page.on('pageerror', err => errors.push(err.message));
   const response = await page.goto(base + entry + '?channel=play#today', {waitUntil:'domcontentloaded'});
   assert.equal(response.headers()['x-gindex-delivery'],'cached');
   assert(response.fromServiceWorker());
   await page.waitForFunction(() =>
    typeof computePanchanga === 'function' && window.SRSkyTime && window.NRLocale &&
    document.querySelector('#nrRoute-today.active [data-day-verdict]'), null, {timeout:35000});
   const refs = await page.evaluate(() => Array.from(document.scripts, s => s.src)
    .filter(src => /(^|\/)(core_runtime_v1|locale_overview_v1)\.js\?/.test(src)));
   assert.equal(refs.length, 2, entry);
   for (const request of refs) {
    const asset = new URL(request).pathname.slice(scope.length);
    const result = await page.evaluate(async url => {
     const response = await fetch(url);
     const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
     return {ok:response.ok, delivery:response.headers.get('x-gindex-delivery'),
      digest:Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('')};
    }, request);
    const source = await readFile(path.join(root, asset));
    const expected = packed ? Buffer.from(source.toString('utf8').replace(/\r\n/g,'\n')) : source;
    assert.deepEqual(result, {ok:true,delivery:'cached',digest:sha256(expected)}, asset);
   }
   if (packed && entry === 'index.html') {
    await page.evaluate(() => window.fp434Go('forecast', false));
    await page.locator('#nrRoute-forecast [data-horizon="1"]').evaluate(button => button.click());
    const strip = page.locator('#nrRoute-forecast [data-day-strip][data-strip-state="ready"]');
    await strip.waitFor({state:'attached',timeout:60000});
    const rows = await strip.locator('li.sr-ds-block').count();
    assert(rows >= 7, 'Cold offline forecast has civil-day intervals');
    assert.equal(await strip.locator('li .sr-ds-expert').count(), rows, 'Lunar calculations in every offline interval');
    assert.equal(await strip.locator('li .sr-ds-sky').count(), rows, 'Sky information in every offline interval');
   }
   assert.deepEqual(errors, []);
  }
  if (packed) {
   const duplicateKeys = await first.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith('gindex-data-'));
    const keys = (await Promise.all(names.map(async name => (await caches.open(name)).keys()))).flat();
    return keys.filter(request => /(?:core_runtime_v1|locale_overview_v1)\.js$/.test(new URL(request.url).pathname)).length;
   });
   assert.equal(duplicateKeys, 0, 'Expanded scripts cannot inflate the dynamic cache');
  }
  return info.installedBytes;
 } finally {
  await context.close();
 }
}

async function refuseCorruptUpdate(browser, base) {
 const context = await browser.newContext();
 try {
  version = 'legacy';
  const page = await context.newPage();
  await install(page, base);
  version = 'corrupt';
  const rejected = await page.evaluate(async () => {
   const registration = await navigator.serviceWorker.getRegistration();
   const state = new Promise(resolve => {
    registration.addEventListener('updatefound', () => {
     const worker = registration.installing;
     worker.addEventListener('statechange', () => {
      if (['redundant','installed'].includes(worker.state)) resolve(worker.state);
     });
    }, {once:true});
   });
   await registration.update();
   return Promise.race([state,new Promise(resolve => setTimeout(() => resolve('timeout'),30000))]);
  });
  assert.equal(rejected, 'redundant');
  assert.deepEqual((await inspectShell(page)).names,['gindex-shell-budget-test-legacy']);
  await context.setOffline(true);
  const response = await page.goto(base+'classic.html?channel=play#today',{waitUntil:'domcontentloaded'});
  assert.equal(response.headers()['x-gindex-delivery'],'cached');
  await page.waitForFunction(() => typeof computePanchanga === 'function' && window.SRSkyTime);
 } finally {
  await context.close();
 }
}

(async () => {
 const current = await readFile(path.join(root,'sw.js'),'utf8');
 const shellBlock=current.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/)[1];
 const shellScripts=new Set([...shellBlock.matchAll(/'\.\/([^']+)'/g)].map(match=>match[1]));
 const dayScripts=/^(?:p0_layout|three_day_forecast|forecast_day_timeline|sky_time)_v1\.js\?/;
 for(const entry of ['index.html','classic.html','design-b17.html']){
  const html=await readFile(path.join(root,entry),'utf8');
  const refs=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]).filter(ref=>dayScripts.test(ref));
  assert(refs.length>=2,entry+' references the day scripts');
  if(entry!=='design-b17.html')assert.equal(refs.length,4,entry+' uses all day scripts');
  for(const ref of refs)assert(shellScripts.has(ref),entry+' script missing in offline shell: '+ref);
 }
 worker = current;
 legacyWorker = current.replace(/const CACHE_VERSION = '[^']+';/, "const CACHE_VERSION = 'budget-test-legacy';")
  .replace("typeof DecompressionStream === 'function'", 'false');
 assert.notEqual(legacyWorker, current);
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const base = 'http://127.0.0.1:' + server.address().port + scope;
 const browser = await chromium.launch();
 try {
  // The requested shell files include classic.html, but the browser has never navigated to it.
  const packedBytes = await coldStart(browser,base,true);
  version = 'legacy';
  networkRequests = [];
  const fallbackBytes = await coldStart(browser,base,false);
  await refuseCorruptUpdate(browser,base);
  console.log(JSON.stringify({status:'PASS',packedBytes,fallbackBytes,budget:shellBudget,
   coldEntries:['index.html','classic.html'],exactScripts:4,corruptUpdateRejected:true}));
 } finally {
  await browser.close();
  server.close();
 }
})().catch(error => {
 console.error(error);
 server.close();
 process.exitCode = 1;
});

