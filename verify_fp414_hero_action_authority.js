const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const checks = [
  ['version', html.includes('v88.9.219-fp414-HERO-ACTION-AUTHORITY')],
  ['manifest', manifest.includes('"version": "88.9.219-fp414"')],
  ['cache', sw.includes("CACHE_VERSION = 'fp414-v1'")],
  ['action label reads decisionScore', /const _dayDecisionTxt = _heroSig && isFinite\(_heroSig\.decisionScore\)/.test(html)],
  ['action label says operational state', html.includes('`Оперативний стан ${_heroSig.decisionScore>=0?\'+\':\'\'}${_heroSig.decisionScore}`')],
  ['stale dayScore action label removed', !html.includes('`Рішення дня ${_heroSig.dayScore>=0?\'+\':\'\'}${_heroSig.dayScore}`')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
