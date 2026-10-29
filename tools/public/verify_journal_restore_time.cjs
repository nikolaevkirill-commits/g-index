'use strict';
// FP537 regression: backup restore rejects records saved before their Kyiv day ended or in the future,
// keeps exact Kyiv-midnight boundaries across DST, forces independently_verified=false. Synthetic data only.
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), assert = require('assert/strict'), {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skyrhythm-restore-time-'));
const types = {'.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css'};
const server = http.createServer((q, r) => { const n = decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html', f = path.resolve(root, n);
  if (!f.startsWith(root + path.sep)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); r.end(e ? '' : b); }); });
const rec = o => ({schema: 'personal_day_summary_v1', day: '2026-10-20', timezone: 'Europe/Kyiv', captured_at_utc: '2026-10-21T08:00:00.000Z',
  axes: {A: 0, B: 1, C: -1, D: 2}, forecast_seen: 'no', note: '', independently_verified: false, ...o});
const cases = [
  ['ordinary valid', rec(), true],
  ['future tolerance boundary',rec({captured_at_utc:'2026-10-28T10:05:00.000Z'}),true],
  ['past future tolerance',rec({captured_at_utc:'2026-10-28T10:05:00.001Z'}),false],
  ['saved before the day ended', rec({captured_at_utc: '2026-10-19T08:00:00.000Z'}), false],
  ['saved one millisecond before Kyiv midnight (EEST)', rec({day: '2026-10-24', captured_at_utc: '2026-10-24T20:59:59.999Z'}), false],
  ['saved exactly at Kyiv midnight (EEST, before DST end)', rec({day: '2026-10-24', captured_at_utc: '2026-10-24T21:00:00.000Z'}), true],
  ['DST-end day: 21:00Z is still the same Kyiv day', rec({day: '2026-10-25', captured_at_utc: '2026-10-25T21:00:00.000Z'}), false],
  ['DST-end day: exactly at Kyiv midnight (EET)', rec({day: '2026-10-25', captured_at_utc: '2026-10-25T22:00:00.000Z'}), true],
  ['spring DST day boundary (EEST)', rec({day: '2026-03-29', captured_at_utc: '2026-03-29T21:00:00.000Z'}), true],
  ['saved in the future', rec({captured_at_utc: '2099-01-01T00:00:00.000Z'}), false],
  ['verified flag is forced false', rec({independently_verified: true}), true]
];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})}); let n = 0;
  try {
    for (const [name, record, expectAccepted] of cases) {
      const c = await b.newContext({serviceWorkers: 'block', timezoneId: 'Europe/Kyiv'}), p = await c.newPage();
      await p.clock.setFixedTime(new Date('2026-10-28T10:00:00Z'));
      await p.goto('http://127.0.0.1:' + server.address().port + '/day_summary.html'); await p.waitForFunction(() => document.querySelector('#history').textContent.length > 0);
      const f = path.join(tmp, 'case' + n + '.json'); fs.writeFileSync(f, JSON.stringify({schema: 'personal_day_summary_backup_v1', records: [record]}));
      await p.setInputFiles('#restoreFile', f); await p.waitForFunction(() => document.querySelector('#restorePreview').textContent.length > 0);
      const accepted = !(await p.locator('#restore').isDisabled());
      assert.equal(accepted, expectAccepted, name + ': ' + await p.locator('#restorePreview').textContent());
      if (accepted) {
        await p.$eval('#restore', x => x.click()); await p.waitForFunction(() => document.querySelector('#history article'));
        const stored = await p.evaluate(() => new Promise(res => { const q = indexedDB.open('skyrhythm-personal-day-summary-v1', 1); q.onsuccess = () => { const t = q.result.transaction('entries').objectStore('entries').getAll(); t.onsuccess = () => { q.result.close(); res(t.result); }; }; }));
        assert.equal(stored.length, 1, name); assert.equal(stored[0].independently_verified, false, name); assert.equal(stored[0].captured_at_utc, record.captured_at_utc, name);
      }
      await c.close(); n++;
    }
    const c=await b.newContext({serviceWorkers:'block'}),p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-28T10:00:00Z'));
    await p.goto('http://127.0.0.1:'+server.address().port+'/day_summary.html');
    const base=JSON.stringify({schema:'personal_day_summary_backup_v1',records:[rec()]});
    const probes=[
      [base.replace('"forecast_seen":"no"','"forecast_seen":"yes","forecast_seen":"no"'),false],
      [base.replace('"forecast_seen":"no"','"forecast_seen":"yes","forecast_\\u0073een":"no"'),false],
      [base.replace('"A":0','"A":1,"A":0'),false],
      [base.replace('"records":','"records":[],"records":'),false],
      [JSON.stringify({schema:'personal_day_summary_backup_v1',records:[rec({note:'Literal "A":1,"A":2 and \\ quotes are text'})]}),true],
      [JSON.stringify({schema:'personal_day_summary_backup_v1',records:[rec(),rec({day:'2026-10-19'})]}),true]
    ];
    for(const [raw,accepted] of probes){await p.setInputFiles('#restoreFile',{name:'probe.json',mimeType:'application/json',buffer:Buffer.from(raw)});await p.waitForFunction(()=>document.querySelector('#restorePreview').textContent.length>0);assert.equal(!(await p.locator('#restore').isDisabled()),accepted,raw);assert.equal(await p.locator('#history article').count(),0);}
    await c.close();console.log('PASS duplicate keys: '+probes.length+' probes; no writes');
    console.log('PASS journal restore time: ' + n + ' cases (day-end boundary, DST end/start, future, verification flag)');
  } finally { await b.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
