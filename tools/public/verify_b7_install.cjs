'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const baselinePath = process.argv[2];
const oldWorker = baselinePath
  ? fs.readFileSync(baselinePath, 'utf8')
  : worker.replace(/const CACHE_VERSION = '[^']+'/, "const CACHE_VERSION = 'b7-install-old'");
const version = source => source.match(/const CACHE_VERSION = '([^']+)'/)[1];
const oldVersion = version(oldWorker);
const nextVersion = version(worker);
assert.notEqual(oldVersion, nextVersion);
const feed = '/consumer_cloud/final_score_decisions.json';
const variantFeed = '/consumer_cloud/sky.json';
const manifest = '/manifest.json';
const withoutHeaders = '/preview-v4/design_b/assets/icon-forecast.svg';
const deferred = ['/xlsx-0.20.3.full.min.js','/theme_panchanga.webp','/theme_forecast.webp','/theme_journal.webp','/AIA_VERNADSKY_DAILY_v1.json','/AIA_VERNADSKY_SHADOW_AUDIT_v1.json'];
const withoutBody = '/preview-v4/design_b/assets/field-lines.svg';
const sockets = new Map();
const reads = new Map();
const missingFiles = new Set();
const shellRequests = new Set();
const fixtureBody = '{"b7_fixture":true}';
let phase = 'old';
let requiredFailures = 0;

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/b7-test.html') {
    return response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>B7 test</title>');
  }
  if (url.pathname === '/sw.js') {
    const source = phase === 'old' ? oldWorker : phase === 'reject'
      ? worker.replace(/const CACHE_VERSION = '[^']+'/, "const CACHE_VERSION = 'b7-install-rejected'")
      : worker;
    return response.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' }).end(source);
  }
  if (phase === 'reject' && url.pathname === manifest) {
    requiredFailures++;
    return response.writeHead(503).end();
  }
  if (phase === 'stall' && [withoutHeaders, withoutBody].includes(url.pathname)) {
    const sample = { started: Date.now() };
    sockets.set(url.pathname, sample);
    response.on('close', () => {
      sample.closed = Date.now();
      sample.complete = response.writableFinished;
    });
    if (url.pathname === withoutBody) {
      response.writeHead(200, { 'content-type': 'image/svg+xml', 'content-length': 65536 });
      response.write('<svg xmlns="http://www.w3.org/2000/svg">');
    }
    return;
  }
  if ([feed, variantFeed].includes(url.pathname)) {
    const key = request.url + ' ' + (request.headers['x-b7-variant'] || '');
    reads.set(key, (reads.get(key) || 0) + 1);
    return setTimeout(() => response.writeHead(200, {
      'content-type': 'application/json', 'cache-control': 'no-store'
    }).end(fixtureBody), 300);
  }
  const file = url.pathname === '/' ? path.join(root, 'index.html') : path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    if (error) {
      missingFiles.add(url.pathname);
      return response.writeHead(404).end();
    }
    shellRequests.add(url.pathname);
    const type = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' }[path.extname(file)];
    response.writeHead(200, { 'content-type': type || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  });
});

async function fetchCopies(page, url, count, variant) {
  return page.evaluate(async ({ url, count, variant }) => Promise.all(Array.from({ length: count }, async () => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: variant ? { 'x-b7-variant': variant } : undefined
    });
    return { status: response.status, delivery: response.headers.get('x-gindex-delivery'), body: await response.text() };
  })), { url, count, variant });
}

async function cachedFingerprints(page, oldVersion) {
  return page.evaluate(async ({ oldVersion, manifest, feed }) => {
    const values = [];
    for (const [cacheName, url] of [[`gindex-shell-${oldVersion}`, manifest], [`gindex-data-${oldVersion}`, feed]]) {
      if (!(await caches.keys()).includes(cacheName)) return null;
      const response = await (await caches.open(cacheName)).match(url);
      if (!response) return null;
      const hash = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
      values.push([Array.from(new Uint8Array(hash)), response.headers.get('x-gindex-cached-at')]);
    }
    return values;
  }, { oldVersion, manifest, feed });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const first = await context.newPage();
    const second = await context.newPage();
    const url = 'http://127.0.0.1:' + server.address().port + '/b7-test.html';
    await first.goto(url);
    await first.evaluate(async () => {
      window.registration = await navigator.serviceWorker.register('/sw.js');
      window.firstWorker = registration.installing || registration.active;
    });
    try {
      await first.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, { polling: 50 });
    } catch (error) {
      console.error('Initial installation', await first.evaluate(async () => ({
        worker: window.firstWorker?.state,
        active: registration.active?.state,
        controller: navigator.serviceWorker.controller?.state,
        caches: await caches.keys()
      })), { shellRequests: shellRequests.size, missingFiles: [...missingFiles] });
      throw error;
    }
    await second.goto(url);
    for (const tab of [first, second]) {
      await tab.evaluate(() => {
        window.originalController = navigator.serviceWorker.controller;
        window.draft = 'unsaved';
      });
    }
    assert(await second.evaluate(() => !!window.originalController));

    const copiesPerTab = baselinePath ? 1 : 20;
    const results = (await Promise.all([fetchCopies(first, feed, copiesPerTab), fetchCopies(second, feed, copiesPerTab)])).flat();
    for (const result of results) assert.deepEqual(result, { status: 200, delivery: 'network', body: fixtureBody });
    const coalescedRequests = reads.get(feed + ' ');
    if (!baselinePath) {
      assert.equal(coalescedRequests, 1, 'identical reads from both tabs must share one network request');
      await Promise.all([
        fetchCopies(first, variantFeed, 1, 'a'),
        fetchCopies(second, variantFeed, 1, 'b'),
        fetchCopies(first, variantFeed + '?fresh=1', 1),
        fetchCopies(second, variantFeed + '?fresh=2', 1)
      ]);
      for (const suffix of [' a', ' b', '?fresh=1 ', '?fresh=2 ']) assert.equal(reads.get(variantFeed + suffix), 1);
    }
    // The newest fetch writes asynchronously under event.waitUntil.
    await first.waitForFunction(async ({ name, feed }) => !!(await (await caches.open(name)).match(feed)),
      { name: 'gindex-data-' + oldVersion, feed }, { polling: 50 });
    const old = await cachedFingerprints(first, oldVersion);
    assert(old && old[1][1], 'old data must have a timestamp');

    phase = 'reject';
    await first.evaluate(async () => {
      window.attempt = null;
      registration.addEventListener('updatefound', () => { window.attempt = registration.installing; }, { once: true });
      await registration.update();
    });
    await first.waitForFunction(() => window.attempt?.state === 'redundant', null, { polling: 50 });
    assert.equal(requiredFailures, 1);
    assert.deepEqual(await cachedFingerprints(first, oldVersion), old);
    assert(!(await first.evaluate(() => caches.keys())).includes('gindex-shell-b7-install-rejected'));

    await context.setOffline(true);
    const oldManifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
    for (const tab of [first, second]) {
      assert(await tab.evaluate(() => navigator.serviceWorker.controller === window.originalController));
      assert.deepEqual(await fetchCopies(tab, manifest, 1), [{ status: 200, delivery: 'cached', body: oldManifest }]);
      assert.deepEqual(await fetchCopies(tab, feed, 1), [{ status: 200, delivery: 'cached', body: fixtureBody }]);
    }
    await context.setOffline(false);

    phase = 'stall';
    shellRequests.clear();
    // Exercise the retry while the second tab still uses the old worker.
    const retryTraffic = fetchCopies(second, variantFeed, 4);
    await first.evaluate(() => registration.update());
    await first.waitForFunction(() => registration.waiting?.state === 'installed', null, { polling: 50, timeout: 20000 });
    await retryTraffic;
    const optionalTiming = Object.fromEntries([...sockets].map(([file, timing]) => {
      assert(timing.closed && !timing.complete, file + ' must be aborted before the response finishes');
      const elapsed = timing.closed - timing.started;
      assert(elapsed >= 4000 && elapsed < 10000, file + ' abort elapsed ' + elapsed);
      return [file, elapsed];
    }));
    assert.equal(Object.keys(optionalTiming).length, 2);
    assert.deepEqual(await cachedFingerprints(first, oldVersion), old);
    const nextCache = 'gindex-shell-' + nextVersion;
    assert.deepEqual(deferred.filter(p=>shellRequests.has(p)),[],'deferred assets must not be requested on install');
    assert.deepEqual(await first.evaluate(async ({ nextCache, manifest, paths }) => {
      const cache = await caches.open(nextCache);
      const response = await cache.match(manifest);
      return [await response?.text(), ...(await Promise.all(paths.map(async p => !!(await cache.match(p)))))];
    }, { nextCache, manifest, paths: [withoutHeaders, withoutBody] }), [oldManifest, false, false]);
    for (const tab of [first, second]) assert(await tab.evaluate(() => navigator.serviceWorker.controller === window.originalController));

    await first.evaluate(() => registration.waiting.postMessage({ type: 'SKIP_WAITING' }));
    for (const tab of [first, second]) {
      await tab.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated' &&
        navigator.serviceWorker.controller !== window.originalController, null, { polling: 50 });
      assert.equal(await tab.evaluate(() => window.draft), 'unsaved');
    }
    const keys = await first.evaluate(() => caches.keys());
    assert(keys.includes(nextCache));
    assert(!keys.includes('gindex-shell-' + oldVersion));
    assert(!keys.includes('gindex-data-' + oldVersion));
    // A route background and import dependency become available offline after first use.
    const sample = [deferred[0],deferred[1],deferred[4]];
    for(const file of sample)assert.equal((await fetchCopies(first,file,1))[0].status,200);
    await first.waitForFunction(async ({name,paths})=>{
      const shell=await caches.open('gindex-shell-'+name),data=await caches.open('gindex-data-'+name);
      for(const p of paths)if(!(await shell.match(p))&&!(await data.match(p)))return false;
      return true;
    },{name:nextVersion,paths:sample});
    await context.setOffline(true);
    for(const file of sample)assert.equal((await fetchCopies(second,file,1))[0].status,200);
    // The root and direct classic links are both entry points after a clean offline install.
    await context.setOffline(true);
    for (const [route, file] of [['/?channel=play', 'index.html'], ['/classic.html?channel=play', 'classic.html']]) {
      const offline = await context.newPage();
      try {
        const target = new URL(route, url).href;
        const response = await offline.goto(target, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        assert.equal(response.fromServiceWorker(), true);
        assert.equal(offline.url().split('#')[0], target);
        assert.equal(await response.text(), fs.readFileSync(path.join(root, file), 'utf8'));
      } finally {
        await offline.close();
      }
    }
    console.log(JSON.stringify({ oldVersion, nextVersion, logicalReads: results.length, coalescedRequests, optionalTiming }));
    console.log('PASS B7: two tabs, required failure rollback, offline fallback, optional abort and activation');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  server.closeAllConnections();
  server.close();
});
