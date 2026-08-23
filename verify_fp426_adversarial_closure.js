const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function requireMatch(pattern, message) {
  if (!pattern.test(html)) throw new Error(message);
}

requireMatch(/const _actionVerdictAvailable = !!\(_heroSig && _heroSig\.decisionAvailable && isFinite\(_heroSig\.decisionScore\)\)/,
  'R-01: action surface is not gated by decisionAvailable + decisionScore');
requireMatch(/const _stKey = _actionVerdictAvailable[\s\S]{0,180}: 'neutral';/,
  'R-01: unavailable reference can still select an operational state');
requireMatch(/if \(!_actionVerdictAvailable\)[\s\S]{0,500}G_now — лише довідковий фон/,
  'R-01: missing/stale reference lacks explicit non-command copy');
if (/delta: \(7 - _kpNow\)|delta: \(1 - _kpNow\)/.test(html)) {
  throw new Error('R-02: raw Kp delta with inverted sign remains');
}
requireMatch(/delta: kpDayTerm\(7\) - kpDayTerm\(_kpNow\)/, 'R-02: storm delta is not derived from kpDayTerm');
requireMatch(/delta: kpDayTerm\(1\) - kpDayTerm\(_kpNow\)/, 'R-02: calm delta is not derived from kpDayTerm');

const formula = html.match(/function kpDayTerm\(kp\)\s*\{[\s\S]*?\n\}/);
if (!formula) throw new Error('kpDayTerm missing');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(formula[0], ctx);
for (const [now, next, expectedSign] of [[1.45, 7, -1], [1.45, 1, 1], [4, 5, -1], [5, 4, 1]]) {
  const delta = ctx.kpDayTerm(next) - ctx.kpDayTerm(now);
  if (Math.sign(delta) !== expectedSign) throw new Error(`R-02 sign mismatch: ${now} -> ${next} = ${delta}`);
}

if (/\.catch\(\(\) => \{\}\)/.test(sw)) throw new Error('R-03: service-worker install failure is still swallowed');
if (!/await caches\.delete\(SHELL_CACHE\);\s*throw error;/.test(sw)) throw new Error('R-03: failed new shell is not removed/rejected');
if (!/const manifest = await shell\.match\('\.\/manifest\.json'\);[\s\S]{0,180}Refusing activation/.test(sw)) {
  throw new Error('R-03: activate can delete last-known-good cache without validating the new shell');
}

console.log('PASS fp426 R-01 action-copy authority gate');
console.log('PASS fp426 R-02 canonical Kp counterfactual direction');
console.log('PASS fp426 R-03 transactional PWA shell activation guard');
