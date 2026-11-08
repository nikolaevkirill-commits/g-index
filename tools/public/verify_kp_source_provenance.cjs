'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const fixedTime = new Date('2026-11-08T13:24:00Z');
const site = 'https://services.swpc.noaa.gov';
const finalPath = '/products/noaa-planetary-k-index.json';
const minutePath = '/json/planetary_k_index_1m.json';
const live = process.argv.includes('--live');

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(file, (error, bytes) => {
    if (error) return response.writeHead(404).end();
    const types = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  });
});

function sampleRows() {
  return [2, 7, 3, 4, 1].map((kp, index) => ({
    time_tag: new Date(fixedTime.getTime() - (5 - index) * 60000).toISOString().slice(0, -1),
    estimated_kp: kp,
    kp: 8
  }));
}

async function check(browser, origin, entry, scenario) {
  const context = await browser.newContext({ locale: 'uk-UA', timezoneId: 'Europe/Kyiv', serviceWorkers: 'block',
    viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const requests = [];
    let minuteRequests = 0;
    page.on('response', response => {
      if (response.url().startsWith(site) && [finalPath, minutePath].includes(new URL(response.url()).pathname)) {
        requests.push({ url: response.url(), status: response.status() });
      }
    });
    await page.addInitScript(() => {
      localStorage.setItem('gindex_locale_v1', 'uk');
      localStorage.setItem('gindex_local_context_v1', JSON.stringify({ lat: 50.45, lon: 30.52, zone: 'Europe/Kyiv',
        saved_at: new Date().toISOString() }));
    });
    if (!live) await page.clock.setFixedTime(fixedTime);
    await context.route(/^https?:/, route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      if (live && url.origin === site) return route.continue();
      if (scenario === 'gfz' && url.hostname === 'kp.gfz.de') {
        return route.fulfill({ json: { datetime: ['2026-11-08T12:00:00Z'], Kp: [4.33], status: ['nowcast'] } });
      }
      if (url.origin === site && url.pathname === minutePath) {
        minuteRequests++;
        if (minuteRequests === 2 && scenario === 'retry') return route.fulfill({ json: sampleRows() });
        if (minuteRequests === 2 && scenario === 'invalid') return route.fulfill({ json: sampleRows().slice(0, 1) });
      }
      return route.abort();
    });
    await page.goto(origin + '/' + entry + '?channel=play#panch', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__lastRefreshCycle, null, { polling: 100, timeout: 45000 });
    await page.waitForSelector('[data-sky-live][data-state=ready]', { timeout: 25000 });
    await page.waitForSelector('.nr-sl-aurora', { timeout: 10000 });
    const observed = await page.evaluate(() => {
      const sky = document.querySelector('.nr-sl-aurora');
      const authority = currentKpAuthority();
      const date = NRCivilTime.dayKey(Date.now(), 'Europe/Kyiv');
      const picked = NRSkyLive.selectKp(authority, NRConsumerOverview.snapshot(date));
      return { authority, picked, kind: sky?.dataset.kpKind, text: sky?.textContent,
        score: document.querySelector('[data-overview=today] .nr-o-score')?.textContent };
    });
    if (!live) {
      if (scenario === 'gfz') {
        assert.equal(observed.authority.kp, 4.33);
        assert.equal(observed.authority.provider, 'gfz');
        assert.equal(observed.kind, 'gfz');
        assert.match(observed.text, /GFZ/);
        assert.doesNotMatch(observed.text, /Спостереження Kp NOAA/);
        await page.evaluate(() => { location.hash = '#today'; });
        const signal = page.locator('[data-overview=today] [data-p0-signals]>button').first();
        await signal.waitFor({ state: 'visible' });
        assert.match(await signal.getAttribute('aria-label'), /Оцінка Kp GFZ/);
        assert.doesNotMatch(await signal.getAttribute('aria-label'), /NOAA/);
        if (entry === 'classic.html') {
          const detail = await page.locator('[data-overview=today] [data-aurora] summary').textContent();
          assert.match(detail, /4,33 · Оцінка Kp GFZ/);
        }
      } else if (scenario === 'retry') {
        assert.equal(minuteRequests, 2);
        assert.equal(observed.authority.kp, 3);
        assert.equal(observed.authority.provisional, true);
        assert.equal(observed.kind, 'provisional');
        assert.match(observed.text, /Попередня оцінка Kp NOAA/);
      } else {
        assert.equal(minuteRequests, 2);
        assert.equal(observed.authority.usable, false);
        assert(!['observed', 'provisional'].includes(observed.kind));
      }
      assert.equal(observed.score, '0');
    }
    if (live) {
      assert(requests.some(r => r.status === 200), 'browser must receive actual NOAA HTTPS bytes');
      assert.equal(observed.authority.provider, 'noaa');
      assert.equal(observed.kind, observed.picked.kind);
      assert(['observed', 'provisional'].includes(observed.kind));
      assert.doesNotMatch(observed.text, /сяйво малоймовірне|ймовірність сяйва: \d/i);
    }
    console.log(JSON.stringify({ entry, scenario, minuteRequests, requests, ...observed }));
  } finally { await context.close(); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    for (const entry of ['index.html', 'classic.html']) {
      for (const scenario of (live ? ['live'] : ['gfz', 'retry', 'invalid'])) {
        await check(browser, origin, entry, scenario);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
