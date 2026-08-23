const fs = require('fs');
const path = require('path');

const root = __dirname;
const historical = new Set([
  'CANONICAL_SPEC_v1_4.md',
  'FORMULA_AUTHORITY_CONFLICT_2026-08-23.md',
  'FORMULA_REPOSITORY_PARITY_2026-08-23.md',
  'verify_fp420_formula_authority.js',
  'verify_fp420_repository_formula_scan.js',
  'deploy/AUDIT_RECALC_v88_8_30.md',
  'deploy/AUDIT_RECALC_v88_8_31.md',
  'deploy/HANDOFF_v87_61.md',
  'deploy/engine_v18_8_v88_8_30.json',
  'deploy/engine_v18_8_v88_8_31.json',
  'deploy/index.html',
  'deploy/index_fp117_FIXED.html',
  'deploy/recalc_snapshot_2026-05-11_24_v88_8_30.json',
  'deploy/sw_fixed.js',
  'deploy/sw_fp117_OK.js',
]);
const textExtensions = new Set(['.html', '.js', '.py', '.md', '.json']);
const conflicts = [];
const inventory = [];
const formulaPattern = /(?:G(?:_raw|_day|_now)?[^\r\n]{0,80}|dashboard[^\r\n]{0,80})Kp\s*[−-]\s*2/gi;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.name === '.git' || entry.name.startsWith('backup_before_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const rel = path.relative(root, full).replaceAll('\\', '/');
    const text = fs.readFileSync(full, 'utf8');
    const matches = [...text.matchAll(formulaPattern)];
    if (!matches.length) continue;
    const lines = matches.map(m => text.slice(0, m.index).split(/\r?\n/).length);
    if (historical.has(rel)) inventory.push(`${rel}:${lines.join(',')}`);
    else conflicts.push(`${rel}:${lines.join(',')}`);
  }
}
walk(root);
for (const item of inventory) console.log(`PASS inventoried frozen/historical conflict: ${item}`);
if (conflicts.length) throw new Error(`active Kp-2 conflicts:\n${conflicts.join('\n')}`);
console.log('PASS no conflicting active executable or normative Kp-2 occurrence');
