'use strict';
// Use Chromium's real HTTP cache. Playwright route interception would disable it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const asset = '/festival_astronomy_adapter_v1.js';
const optional = '/preview-v4/design_b/assets/icon-forecast.svg';
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const version = worker.match(/const CACHE_VERSION = '([^']+)'/)?.[1];
assert.ok(version, 'missing SW cache version');
const cssMime = { '.js':'application/javascript', '.css':'text/css', '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml' };
const negative = process.argv.includes('--negative-control');
const requests = [];
let release = 1;

const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname;
  const servedRelease = release;
  if (name === '/revalidate.html') {
    return response.writeHead(200, { 'content-type':'text/html', 'cache-control':'no-store' })
      .end('<!doctype html><title>Service worker revalidation</title>');
  }
  const file = path.resolve(root, '.' + decodeURIComponent(name));
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    const status = error ? 404 : 200;
    requests.push({ name, release: servedRelease, status, cache: request.headers['cache-control'] ?? null });
    if (error) return response.writeHead(status).end();
    let body = data;
    if (name === '/sw.js') {
      let source = worker.replace("const CACHE_VERSION = '" + version + "'",
        "const CACHE_VERSION = '" + version + '-r' + servedRelease + "'");
      if (negative && servedRelease === 2) {
        const bypass = source.replace("{cache:'reload'}", "{cache:'default'}");
        assert.notEqual(bypass, source, 'negative control did not disable HTTP cache bypass');
        source = bypass;
      }
      body = Buffer.from(source);
    }
    if (name === asset) body = Buffer.concat([data, Buffer.from('\n/* release ' + servedRelease + ' */\n')]);
    const send = () => response.writeHead(status, {
      'content-type': cssMime[path.extname(file)] || 'application/octet-stream',
      'cache-control': name === '/sw.js' ? 'no-store' : 'max-age=3600',
    }).end(body);
    // The old worker must finish optional work before the test asks for release 2.
    if (servedRelease === 1 && name === optional) setTimeout(send, 1000);
    else send();
  });
});

const cacheName = n => 'gindex-shell-' + version + '-r' + n;
async function cached(page, releaseNumber) {
  return page.evaluate(async ({ cache, url }) => {
    // CacheStorage.match with cacheName is read-only when a cache is absent.
    const response = await caches.match(url, { cacheName: cache });
    return response ? response.text() : null;
  }, { cache: cacheName(releaseNumber), url: asset });
}

async function verify() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let first;
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    first = await context.newPage();
    await first.goto(base + '/revalidate.html');
    assert.match(await first.evaluate(url => fetch(url).then(r => r.text()), asset), /release 1 \*\//);
    await first.evaluate(async () => {
      window.trace = [];
      window.registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      window.watch = worker => {
        if (!worker) return;
        const record = () => trace.push(worker.state);
        record();
        worker.addEventListener('statechange', record);
      };
      watch(registration.installing || registration.active);
      registration.addEventListener('updatefound', () => watch(registration.installing));
    });
    // Playwright's waitForFunction sees the Promise itself as truthy for an
    // async predicate. These checks read live properties synchronously.
    await first.waitForFunction(() => registration.active?.state === 'activated' &&
      navigator.serviceWorker.controller === registration.active, null, { timeout: 60000 });
    assert.match(await cached(first, 1), /release 1 \*\//);
    assert.ok(requests.some(r => r.name === optional && r.release === 1 && r.status === 200));

    const second = await context.newPage();
    await second.goto(base + '/revalidate.html');
    for (const tab of [first, second]) await tab.evaluate(() => {
      window.initial = navigator.serviceWorker.controller;
      if (!initial) throw new Error('expected old controller');
      sessionStorage.setItem('test_draft', 'unfinished');
    });
    release = 2;
    await first.evaluate(() => registration.update().then(() => undefined));
    await first.waitForFunction(() => registration.waiting?.state === 'installed' ||
      trace.includes('redundant'), null, { timeout: 60000 });
    const waiting = await first.evaluate(() => ({
      waiting: registration.waiting?.state, stillOld: registration.active === initial,
    }));
    assert.deepEqual(waiting, { waiting: 'installed', stillOld: true });
    assert.equal((await cached(first, 2))?.match(/release ([0-9]+) \*\//)?.[1], '2', 'new worker must cache release 2 bytes');
    assert.match(await cached(first, 1), /release 1 \*\//, 'old cache must remain while the new worker waits');
    assert.ok(requests.some(r => r.name === '/sw.js' && r.release === 2));
    assert.ok(requests.some(r => r.name === asset && r.release === 2 && r.status === 200));

    await first.evaluate(() => registration.waiting.postMessage({type:'SKIP_WAITING'}));
    for (const tab of [first, second]) {
      await tab.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated' &&
        navigator.serviceWorker.controller !== window.initial, null, {timeout:60000});
      assert.equal(await tab.evaluate(() => sessionStorage.getItem('test_draft')), 'unfinished');
    }
    assert.equal(await cached(first, 1), null);
    await context.setOffline(true);
    for (const tab of [first, second]) {
      assert.match(await tab.evaluate(url => fetch(url).then(r => r.text()), asset), /release 2 \*\//);
    }
    console.log(JSON.stringify({ status:'PASS', chromium:browser.version(),
      scenario:'HTTP cache max-age=3600, delayed initial install, two tabs, old cache intact while waiting, both new offline',
      workerStates:await first.evaluate(() => trace), requests:requests.filter(r => [asset, '/sw.js'].includes(r.name)) }));
  } catch (error) {
    const diagnostics = first?.isClosed() === false ? await first.evaluate(async () => ({
      trace: window.trace, installing: window.registration?.installing?.state,
      waiting: window.registration?.waiting?.state, active: window.registration?.active?.state,
      caches: await caches.keys(),
    })).catch(() => null) : null;
    console.error(JSON.stringify({ negative, diagnostics,
      requests: requests.filter(r => r.status !== 200 || [asset, optional, '/sw.js'].includes(r.name)) }));
    throw error;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
