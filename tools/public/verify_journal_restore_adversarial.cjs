'use strict';
// Independent adversarial checks for FP537 D1 (restore time window) and D2 (duplicate JSON keys).
// Usage: node tools/public/verify_journal_restore_adversarial.cjs [RUNTIME_DIR] [OUT_JSON]
// DEPTH_LIMIT env: maximum JSON nesting levels the parser must accept (FP538: 128; FP537 code accepted 129).
// Synthetic data only. Each case runs in a fresh browser context (empty IndexedDB).
const fs = require('fs'), path = require('path'), http = require('http'), {chromium} = require('playwright');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..')), OUT = process.argv[3] || '', DEPTH_LIMIT = Number(process.env.DEPTH_LIMIT || 128);
const types = {'.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css'};
const server = http.createServer((q, r) => { const n = decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html', f = path.resolve(root, n);
  if (!f.startsWith(root + path.sep)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); r.end(e ? '' : b); }); });
const NOW = '2026-10-28T10:00:00.000Z';
const rec = o => ({schema: 'personal_day_summary_v1', day: '2026-10-20', timezone: 'Europe/Kyiv', captured_at_utc: '2026-10-21T08:00:00.000Z',
  axes: {A: 0, B: 1, C: -1, D: 2}, forecast_seen: 'no', note: '', independently_verified: false, ...o});
const doc = records => JSON.stringify({schema: 'personal_day_summary_backup_v1', records});
const base = doc([rec()]);
const nest = n => '['.repeat(n) + ']'.repeat(n);
const withExtra = v => base.replace('"note":""', '"note":"","x":' + v);

const cases = [];
const T = (id, group, name, raw, expect, opts = {}) => cases.push({id, group, name, raw, expect, ...opts});
// ---- D1: time window (browser timezone varied on purpose: Intl must use Europe/Kyiv regardless)
for (const tz of ['Europe/Kyiv', 'America/New_York', 'Asia/Tokyo', 'UTC']) {
  const s = tz.split('/').pop();
  T(`D1-spring-1ms-${s}`, 'D1', `29.03 (spring DST day) 20:59:59.999Z, tz=${tz}`, doc([rec({day: '2026-03-29', captured_at_utc: '2026-03-29T20:59:59.999Z'})]), false, {tz});
  T(`D1-spring-0-${s}`, 'D1', `29.03 exactly 21:00:00.000Z, tz=${tz}`, doc([rec({day: '2026-03-29', captured_at_utc: '2026-03-29T21:00:00.000Z'})]), true, {tz});
  T(`D1-autumn-1ms-${s}`, 'D1', `25.10 (autumn DST day, 25 h) 21:59:59.999Z, tz=${tz}`, doc([rec({day: '2026-10-25', captured_at_utc: '2026-10-25T21:59:59.999Z'})]), false, {tz});
  T(`D1-autumn-0-${s}`, 'D1', `25.10 exactly 22:00:00.000Z, tz=${tz}`, doc([rec({day: '2026-10-25', captured_at_utc: '2026-10-25T22:00:00.000Z'})]), true, {tz});
}
T('D1-preSpring-1ms', 'D1', '28.03 (EET, before spring DST) 21:59:59.999Z', doc([rec({day: '2026-03-28', captured_at_utc: '2026-03-28T21:59:59.999Z'})]), false);
T('D1-preSpring-0', 'D1', '28.03 exactly 22:00:00.000Z', doc([rec({day: '2026-03-28', captured_at_utc: '2026-03-28T22:00:00.000Z'})]), true);
T('D1-24.10-1ms', 'D1', '24.10 (EEST) 20:59:59.999Z', doc([rec({day: '2026-10-24', captured_at_utc: '2026-10-24T20:59:59.999Z'})]), false);
T('D1-future+5m', 'D1', 'captured = now + 5 min exactly', doc([rec({captured_at_utc: '2026-10-28T10:05:00.000Z'})]), true);
T('D1-future+5m+1ms', 'D1', 'captured = now + 5 min + 1 ms', doc([rec({captured_at_utc: '2026-10-28T10:05:00.001Z'})]), false);
T('D1-noMs', 'D1', 'captured without milliseconds', doc([rec({captured_at_utc: '2026-10-21T08:00:00Z'})]), true);
T('D1-yesterday', 'D1', 'day = yesterday (27.10), captured at its Kyiv midnight 27.10 22:00Z', doc([rec({day: '2026-10-27', captured_at_utc: '2026-10-27T22:00:00.000Z'})]), true);
T('D1-today', 'D1', 'day = today (28.10) is not a finished day', doc([rec({day: '2026-10-28', captured_at_utc: '2026-10-28T09:59:00.000Z'})]), false);
T('D1-invalidDay', 'D1', 'impossible day 2026-02-30', doc([rec({day: '2026-02-30'})]), false, {msgMustNotMatch: /Invalid|RangeError/});
T('D1-offset', 'D1', 'captured with +02:00 offset (not UTC Z)', doc([rec({captured_at_utc: '2026-10-21T10:00:00+02:00'})]), false);
T('D1-oldYear', 'D1', 'day 0999-01-01 (year < 1000), captured next day — accepted only if dayAt pads the year', doc([rec({day: '0999-01-01', captured_at_utc: '0999-01-02T00:00:00.000Z'})]), true);
T('I2-display-format', 'I2', 'locale display format changes, machine key remains ISO', doc([rec()]), true, {mockDisplay:true});
T('D1-mixed', 'D1', 'two records, second saved before its day ended → whole copy rejected', doc([rec(), rec({day: '2026-10-19', captured_at_utc: '2026-10-19T12:00:00.000Z'})]), false);
// ---- D2: duplicate keys / parser
T('D2-nestedSecondRecord', 'D2', 'duplicate key only in records[1].axes', doc([rec(), rec({day: '2026-10-19', captured_at_utc: '2026-10-20T08:00:00.000Z'})]).replace(/"B":1(?![\s\S]*"B":1)/, '"B":2,"B":1'), false);
T('D2-escapedSlash', 'D2', 'extra keys "x/y" and "x\\/y" (same decoded key)', base.replace('"note":""', '"note":"","x/y":1,"x\\/y":2'), false);
T('D2-surrogate', 'D2', 'keys "😀" and "\\ud83d\\ude00" (same decoded key)', base.replace('"note":""', '"note":"","😀":1,"\\ud83d\\ude00":2'), false);
T('D2-proto', 'D2', 'duplicate "__proto__" key', base.replace('"note":""', '"note":"","__proto__":1,"__proto__":2'), false);
T('D2-protoOnce', 'D2', 'single "__proto__" key in record (allowed, must not pollute)', base.replace('"note":""', '"note":"","__proto__":{"independently_verified":true}'), true, {checkVerifiedFalse: true});
T('D2-nfc', 'D2', 'keys "é" (NFC) and "e\\u0301" (NFD) — different JSON keys, not duplicates', base.replace('"note":""', '"note":"","é":1,"e\\u0301":2'), true, {informational: true});
T('D2-sameKeysDifferentObjects', 'D2', 'same key names in different records', doc([rec(), rec({day: '2026-10-19', captured_at_utc: '2026-10-20T08:00:00.000Z'})]), true);
T('D2-textTricks', 'D2', 'note with quotes, backslashes, braces and fake keys', doc([rec({note: 'a "b" \\ \\\\" } ] , {"A":1,"A":2} \\u0041 / \\/'})]), true, {checkNote: 'a "b" \\ \\\\" } ] , {"A":1,"A":2} \\u0041 / \\/'});
T('D2-pretty', 'D2', 'pretty-printed with tabs and CRLF', JSON.stringify(JSON.parse(base), null, '\t').replace(/\n/g, '\r\n'), true);
T('D2-bom', 'D2', 'UTF-8 BOM before JSON', '﻿' + base, true, {informational: true});
for (const n of [125, 126, 127, 128])
  T(`D2-depth-extra${n}`, 'D2', `extra field nested ${n} arrays (total depth = ${n + 3})`, withExtra(nest(n)), n + 3 <= DEPTH_LIMIT, {depth: n + 3});
T('D2-depth-100k', 'D2', '100 000 nested arrays (≈200 KB) → rejected without hang', withExtra(nest(100000)), false, {timed: true});
T('D2-topArray', 'D2', 'top-level array', '[' + base + ']', false);
T('D2-dupDay', 'D2', 'two records with the same day', doc([rec(), rec({note: 'x'})]), false);
T('D2-5001', 'D2', '5001 records', doc(Array.from({length: 5001}, (_, i) => rec({day: new Date(Date.UTC(2010, 0, 1) + i * 864e5).toISOString().slice(0, 10), captured_at_utc: new Date(Date.UTC(2010, 0, 2) + i * 864e5).toISOString()}))), false);
T('D2-verifiedString', 'D2', 'independently_verified:"true" (string) → forced false', doc([rec({independently_verified: 'true'})]), true, {checkVerifiedFalse: true});
T('D2-size2MB+1', 'D2', 'file 2 MB + 1 byte (whitespace padding)', base + ' '.repeat(2 * 1024 * 1024 + 1 - Buffer.byteLength(base)), false);
T('D2-size2MB', 'D2', 'file exactly 2 MB (whitespace padding)', base + ' '.repeat(2 * 1024 * 1024 - Buffer.byteLength(base)), true);
// ---- conflict: existing entry must stay unchanged
T('C-conflict', 'conflict', 'existing 2026-10-20 entry + copy with same day (different values)', doc([rec({axes: {A: 3, B: 3, C: 3, D: 3}, note: 'from backup'}), rec({day: '2026-10-19', captured_at_utc: '2026-10-20T08:00:00.000Z'})]), true, {preexisting: rec({note: 'original', axes: {A: -3, B: -3, C: -3, D: -3}, captured_at_utc: '2026-10-21T09:00:00.000Z'})});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(); const results = [];
  try {
    for (const c of cases) {
      const ctx = await b.newContext({serviceWorkers: 'block', timezoneId: c.tz || 'Europe/Kyiv'}), p = await ctx.newPage(); const errors = [];
      p.on('pageerror', e => errors.push(String(e)));
      await p.clock.setFixedTime(new Date(NOW));
      if(c.mockDisplay)await p.addInitScript(()=>{Object.defineProperty(Intl.DateTimeFormat.prototype,'format',{configurable:true,get(){return ()=> '28/10/2026';}});});
      await p.goto('http://127.0.0.1:' + server.address().port + '/day_summary.html');
      await p.waitForFunction(() => document.querySelector('#history').textContent.length > 0);
      if (c.preexisting) await p.evaluate(r => new Promise((res, rej) => { const q = indexedDB.open('skyrhythm-personal-day-summary-v1', 1); q.onsuccess = () => { const t = q.result.transaction('entries', 'readwrite'); t.objectStore('entries').put(r); t.oncomplete = () => { q.result.close(); res(); }; t.onerror = rej; }; }), c.preexisting);
      const t0 = Date.now();
      await p.setInputFiles('#restoreFile', {name: c.id + '.json', mimeType: 'application/json', buffer: Buffer.from(c.raw)});
      await p.waitForFunction(() => document.querySelector('#restorePreview').textContent.length > 0, null, {timeout: 20000});
      const ms = Date.now() - t0, preview = await p.locator('#restorePreview').textContent();
      const accepted = !(await p.locator('#restore').isDisabled());
      const readAll = () => p.evaluate(() => new Promise(res => { const q = indexedDB.open('skyrhythm-personal-day-summary-v1', 1); q.onsuccess = () => { const t = q.result.transaction('entries').objectStore('entries').getAll(); t.onsuccess = () => { q.result.close(); res(t.result); }; }; }));
      const before = await readAll(); let after = before, final = '';
      if (accepted) { await p.$eval('#restore', x => x.click()); await p.waitForFunction(() => /Додано/.test(document.querySelector('#restorePreview').textContent), null, {timeout: 10000}); after = await readAll(); final = await p.locator('#restorePreview').textContent(); }
      const r = {id: c.id, group: c.group, name: c.name, expected_accept: c.expect, accepted, pass: accepted === c.expect, informational: !!c.informational, preview: preview.slice(0, 160), final, stored_before: before.length, stored_after: after.length, ms, page_errors: errors};
      if (!accepted && after.length !== before.length) { r.pass = false; r.note = 'rejected copy wrote records'; }
      if(c.id==='D1-mixed'&&!preview.includes('2026-10-19')){r.pass=false;r.note='missing offending date';}
      if (c.msgMustNotMatch && c.msgMustNotMatch.test(preview)) { r.pass = false; r.note = 'technical message shown to user'; }
      if (c.checkVerifiedFalse && accepted) { const bad = after.filter(x => x.independently_verified !== false); if (bad.length) { r.pass = false; r.note = 'independently_verified not false'; } r.proto_polluted = await p.evaluate(() => ({}).independently_verified === true); if (r.proto_polluted) r.pass = false; }
      if (c.checkNote && accepted) { const n = after[0] && after[0].note; r.note_exact = n === JSON.parse(c.raw).records[0].note; if (!r.note_exact) r.pass = false; }
      if (c.preexisting) { const kept = after.find(x => x.day === c.preexisting.day); r.conflict_kept = !!kept && kept.note === 'original' && kept.axes.A === -3 && kept.captured_at_utc === c.preexisting.captured_at_utc; r.added_other = after.some(x => x.day === '2026-10-19'); if (!r.conflict_kept || !r.added_other) r.pass = false; }
      if (errors.length) r.pass = false;
      results.push(r); console.log((r.pass ? 'PASS ' : (c.informational ? 'INFO ' : 'FAIL ')) + c.id + ' accepted=' + accepted + ' (' + ms + ' ms) ' + (r.note || '') + ' | ' + preview.slice(0, 90));
      await ctx.close();
    }
  } finally { await b.close(); server.close(); }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({now_fixed: NOW, runtime: root, depth_limit: DEPTH_LIMIT, results}, null, 1));
  const hard = results.filter(r => !r.informational), fails = hard.filter(r => !r.pass);
  console.log(`\n${hard.length - fails.length}/${hard.length} PASS (normative cases); informational: ${results.length - hard.length}`);
  process.exitCode = fails.length ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
