'use strict';
// A quota failure must preserve the old shell and saved state. HTTP failures must
// report a different cause, and the integrity check must detect same-size damage.
const assert = require('node:assert/strict');
const {readFile, writeFile} = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '../..');
const scope = '/g-index/';
const shellName = 'gindex-shell-q-v1';
const requiredAsset = 'manifest.json';
const types = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.json':'application/json', '.gz':'application/gzip', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp'};
let worker, attempt;

const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(scope.length));
  const current = attempt;
  if (name === 'probe.html') return res.writeHead(200, {'Content-Type':'text/html'}).end('<title>p</title>');
  if (name === requiredAsset && current?.fault === 'network') {
    current.networkFaults++;
    res.destroy();
    return;
  }
  if (name === requiredAsset && current?.fault === '404') {
    current.httpErrors.push({name, status:404});
    return res.writeHead(404).end();
  }
  try {
    const body = name === 'sw.js' ? worker : await readFile(path.resolve(root, name));
    if (name === requiredAsset && current) current.requiredAssetServed++;
    res.writeHead(200, {
      'Content-Type': types[path.extname(name)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    }).end(body);
  } catch {
    current?.httpErrors.push({name, status:404});
    res.writeHead(404).end();
  }
});

const versioned = (source, version) =>
  source.replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`);

async function snapshotShell(page) {
  return page.evaluate(async name => {
    if (!await caches.has(name)) throw new Error('Active shell cache is missing: ' + name);
    const cache = await caches.open(name);
    const entries = [];
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      const body = await response.arrayBuffer();
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
      const sha256 = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
      entries.push({url:request.url, bytes:body.byteLength, sha256});
    }
    entries.sort((a, b) => a.url.localeCompare(b.url));
    return {bytes:entries.reduce((sum, entry) => sum + entry.bytes, 0), entries};
  }, shellName);
}

function verifyShell(before, after) {
  const inventory = snapshot => snapshot.entries.map(({url, bytes}) => ({url, bytes}));
  assert.deepEqual(inventory(after), inventory(before), 'active cache URL/size inventory must be unchanged');
  assert.equal(after.bytes, before.bytes, 'active cache total bytes must be unchanged');
  const changed = after.entries.filter((entry, i) => entry.sha256 !== before.entries[i].sha256);
  if (changed.length) {
    const error = new Error('Active cache body SHA-256 mismatch: ' + changed.map(entry => entry.url).join(', '));
    error.code = 'CACHE_BODY_HASH_MISMATCH';
    error.urls = changed.map(entry => entry.url);
    throw error;
  }
}

async function mutateOneByte(page) {
  return page.evaluate(async name => {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) continue;
      bytes[0] ^= 1;
      await cache.put(request, new Response(bytes, {
        status:response.status, statusText:response.statusText, headers:response.headers
      }));
      return request.url;
    }
    throw new Error('Mutation requires a nonempty cached response');
  }, shellName);
}

async function setSaved(page) {
  await page.evaluate(() => new Promise(resolve => {
    localStorage.setItem('r4-saved-scenario', 'kyiv|2026-11-18|sky');
    const request = indexedDB.open('r4-audit', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('s');
    request.onsuccess = () => {
      const transaction = request.result.transaction('s', 'readwrite');
      transaction.objectStore('s').put({city:'barcelona', date:'2026-11-10'}, 'scenario');
      transaction.oncomplete = () => { request.result.close(); resolve(); };
    };
  }));
}

async function saved(page) {
  return page.evaluate(() => new Promise(resolve => {
    const ls = localStorage.getItem('r4-saved-scenario');
    const request = indexedDB.open('r4-audit', 1);
    request.onsuccess = () => {
      const db = request.result;
      const get = db.transaction('s').objectStore('s').get('scenario');
      get.onsuccess = () => { db.close(); resolve({ls, idb:get.result ?? null}); };
    };
  }));
}

async function observeUpdate(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const original = registration.active;
    let installing, state, finish, timer;
    const failureReasons = new Map();
    const result = new Promise(resolve => { finish = resolve; });
    const settled = () => {
      if (state === 'installed' || (state === 'redundant' && failureReasons.has(installing))) finish();
    };
    const onState = () => { state = installing.state; settled(); };
    const onUpdate = () => {
      installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', onState);
        onState();
      }
    };
    const onFailure = event => {
      if (!event.source || event.data?.type !== 'SW_INSTALL_FAILED') return;
      failureReasons.set(event.source, event.data.reason);
      settled();
    };
    registration.addEventListener('updatefound', onUpdate, {once:true});
    navigator.serviceWorker.addEventListener('message', onFailure);
    try {
      timer = setTimeout(finish, 90000);
      await registration.update();
      await result;
      return {state:state ?? null, reason:failureReasons.get(installing) ?? null, activeUnchanged:registration.active === original};
    } finally {
      clearTimeout(timer);
      installing?.removeEventListener('statechange', onState);
      registration.removeEventListener('updatefound', onUpdate);
      navigator.serviceWorker.removeEventListener('message', onFailure);
    }
  });
}

async function rejectUpdate(page, source, version, fault) {
  attempt = {fault, requiredAssetServed:0, networkFaults:0, httpErrors:[]};
  worker = versioned(source, version);
  const outcome = await observeUpdate(page);
  return {...attempt, ...outcome,
    failedCachePresent:await page.evaluate(name => caches.has(name), 'gindex-shell-' + version)};
}

function assertRejected(attempt) {
  assert.equal(attempt.state, 'redundant', 'failed installation must become redundant');
  assert.equal(attempt.activeUnchanged, true, 'previous worker must remain active');
  assert.equal(attempt.failedCachePresent, false, 'failed shell cache must be removed');
}

async function openProbe(browser, base, source) {
  attempt = null;
  worker = versioned(source, 'q-v1');
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base + 'probe.html');
  await page.evaluate(() => navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:90000});
  return {context, page};
}

async function run() {
  const source = await readFile(path.join(root, 'sw.js'), 'utf8');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + scope;
  const origin = new URL(base).origin;
  const browser = await chromium.launch();
  const report = {browser:browser.version()};
  try {
    const {context, page} = await openProbe(browser, base, source);
    await setSaved(page);
    const before = await snapshotShell(page);
    const savedBefore = await saved(page);
    assert.ok(before.entries.length > 0, 'active shell cache must contain responses');
    assert.ok(savedBefore.ls && savedBefore.idb, 'both saved-state fixtures must exist');

    const cdp = await context.newCDPSession(page);
    const baseline = await cdp.send('Storage.getUsageAndQuota', {origin});
    report.requestedQuota = Math.ceil(baseline.usage + 512 * 1024);
    await cdp.send('Storage.overrideQuotaForOrigin', {origin, quotaSize:report.requestedQuota});
    const quota = await cdp.send('Storage.getUsageAndQuota', {origin});
    report.cdpQuota = {quota:quota.quota, usage:quota.usage, overrideActive:quota.overrideActive};
    report.pageEstimate = await page.evaluate(() => navigator.storage.estimate().then(({quota, usage}) => ({quota, usage})));
    assert.equal(quota.overrideActive, true, 'quota override must be active');
    report.quotaDeviation = Math.abs(quota.quota - report.requestedQuota) / report.requestedQuota;
    assert.ok(report.quotaDeviation <= 0.05, 'observed quota must be within 5% of requested quota');

    report.lowQuota = await rejectUpdate(page, source, 'q-v2', null);
    assertRejected(report.lowQuota);
    assert.equal(report.lowQuota.reason, 'QuotaExceededError', 'install failure notification must name the quota error');
    assert.ok(report.lowQuota.requiredAssetServed > 0, 'required manifest must have been served');
    assert.deepEqual(report.lowQuota.httpErrors, [], 'quota attempt must have no HTTP errors');
    assert.equal(report.lowQuota.networkFaults, 0);
    verifyShell(before, await snapshotShell(page));
    assert.deepEqual(await saved(page), savedBefore, 'saved local scenarios must survive the low quota update');
    report.unchangedEntries = before.entries.length;

    await context.setOffline(true);
    const offline = await context.newPage();
    const response = await offline.goto(base + 'classic.html?channel=play#today', {waitUntil:'domcontentloaded'}).catch(() => null);
    report.offlineStart = !!response && await offline.waitForFunction(
      () => typeof computePanchanga === 'function' && window.SRSkyTime, null, {timeout:30000}
    ).then(() => true, () => false);
    assert.equal(report.offlineStart, true, 'offline start from the active cache');
    await context.close();

    // The app may legitimately fill its cache after opening the offline route.
    // Keep the HTTP and integrity controls in a fresh context with only the probe page.
    const control = await openProbe(browser, base, source);
    const controlBaseline = await snapshotShell(control.page);
    const controlCdp = await control.context.newCDPSession(control.page);
    const controlQuota = await controlCdp.send('Storage.getUsageAndQuota', {origin});
    report.controlQuotaOverrideActive = controlQuota.overrideActive;
    assert.equal(controlQuota.overrideActive, false, 'HTTP controls must run without a quota override');
    report.http404 = await rejectUpdate(control.page, source, 'q-http404', '404');
    assertRejected(report.http404);
    assert.equal(report.http404.reason, 'TypeError', '404 during install must report a fetch/cache failure');
    assert.ok(report.http404.httpErrors.some(e => e.name === requiredAsset && e.status === 404), 'required asset must return 404');
    report.network = await rejectUpdate(control.page, source, 'q-network', 'network');
    assertRejected(report.network);
    assert.equal(report.network.reason, 'TypeError', 'network failure during install must report a fetch/cache failure');
    assert.ok(report.network.networkFaults > 0, 'required asset connection must have been dropped');
    assert.deepEqual(report.network.httpErrors, [], 'network fault must occur without an HTTP response');

    // The only deliberate cache mutation happens in the disposable control context.
    const intact = await snapshotShell(control.page);
    verifyShell(controlBaseline, intact);
    const mutatedUrl = await mutateOneByte(control.page);
    const tampered = await snapshotShell(control.page);
    if (process.env.SW_LOW_QUOTA_MUTATION === 'byte') verifyShell(intact, tampered);
    assert.throws(() => verifyShell(intact, tampered), error => {
      assert.equal(error.code, 'CACHE_BODY_HASH_MISMATCH');
      assert.deepEqual(error.urls, [mutatedUrl]);
      report.mutation = {url:mutatedUrl, reason:error.code, sameSizesAndUrls:true, changedHashes:error.urls.length};
      return true;
    }, 'one byte at the same length must be rejected specifically for its hash');

    report.passed = true;
    console.log(JSON.stringify(report));
    console.log('PASS low quota and hash rejection: quota, HTTP 404, network error, and same-size byte mutation');
  } catch (error) {
    report.passed = false;
    report.error = error.message;
    if (error.code) report.errorCode = error.code;
    console.log(JSON.stringify(report));
    throw error;
  } finally {
    if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2));
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.close());
