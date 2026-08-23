const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const manifestVersion = JSON.parse(manifest).version;
const htmlVersion = (html.match(/v(\d+\.\d+\.\d+-fp\d+)-[A-Z0-9-]+<\/title>/) || [])[1];
const cacheFp = (sw.match(/CACHE_VERSION = '(fp\d+)-v\d+'/) || [])[1];
const manifestFp = (manifestVersion.match(/(fp\d+)$/) || [])[1];

const checks = [
  ['release version coherence', htmlVersion === manifestVersion],
  ['service-worker generation coherence', cacheFp === manifestFp],
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
