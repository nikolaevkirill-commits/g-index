const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const erratum = fs.readFileSync(__dirname + '/CANONICAL_SPEC_v1_4_1_ERRATUM.md', 'utf8');
const frozen = fs.readFileSync(__dirname + '/CANONICAL_SPEC_v1_4.md', 'utf8');
const fn = html.match(/function kpDayTerm\(kp\)\s*\{[\s\S]*?\n\}/);
if (!fn) throw new Error('canonical kpDayTerm function missing');
const context = {};
vm.createContext(context);
vm.runInContext(fn[0], context);

for (const [kp, expected] of [[1, 1], [2, 0], [4, -2], [5, -3]]) {
  const actual = context.kpDayTerm(kp);
  if (actual !== expected) throw new Error(`Kp=${kp}: expected ${expected}, got ${actual}`);
  console.log(`PASS Kp=${kp} -> ${actual >= 0 ? '+' : ''}${actual}`);
}
if (!erratum.includes('G_raw = (2 − Kp) + Li + Mi + ei + Pi + Di')) throw new Error('erratum authority formula missing');
if (!erratum.includes('Retrospective backfilling is prohibited')) throw new Error('prospective gate preservation missing');
if (!frozen.includes('G = Kp − 2 + ΣAᵢ')) throw new Error('frozen v1.4 was unexpectedly rewritten');
console.log('PASS erratum supersedes only formula wording; frozen v1.4 remains preserved');
