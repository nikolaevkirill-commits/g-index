const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const block = html.match(/function _kyivFallbackOffsetHours[\s\S]+?window\.utcHHMMToKyiv = utcHHMMToKyiv;/);
if (!block) throw new Error('Kyiv timezone authority block missing');

const context = { window: {}, Date, Intl, isFinite, Math };
vm.createContext(context);
vm.runInContext(block[0], context);

const cases = [
  ['winter offset', '2026-01-15T12:00:00Z', 2],
  ['summer offset', '2026-08-23T12:00:00Z', 3],
  ['before DST start', '2026-03-29T00:59:59Z', 2],
  ['after DST start', '2026-03-29T01:00:00Z', 3],
  ['before DST end', '2026-10-25T00:59:59Z', 3],
  ['after DST end', '2026-10-25T01:00:00Z', 2],
];
for (const [name, iso, expected] of cases) {
  const d = new Date(iso);
  const iana = context.kyivOffsetHoursIntAt(d);
  const fallback = context._kyivFallbackOffsetHours(d);
  if (iana !== expected || fallback !== expected) throw new Error(`${name}: IANA=${iana}, fallback=${fallback}, expected=${expected}`);
  console.log(`PASS ${name}: UTC${expected >= 0 ? '+' : ''}${expected}`);
}

const kyivKey = iso => {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Kyiv', year:'numeric', month:'2-digit', day:'2-digit'})
    .formatToParts(new Date(iso)).reduce((a, x) => (a[x.type] = x.value, a), {});
  return `${p.year}-${p.month}-${p.day}`;
};
if (kyivKey('2026-08-22T20:59:59Z') !== '2026-08-22') throw new Error('summer pre-midnight boundary failed');
if (kyivKey('2026-08-22T21:00:00Z') !== '2026-08-23') throw new Error('summer midnight boundary failed');
if (kyivKey('2026-01-14T21:59:59Z') !== '2026-01-14') throw new Error('winter pre-midnight boundary failed');
if (kyivKey('2026-01-14T22:00:00Z') !== '2026-01-15') throw new Error('winter midnight boundary failed');
console.log('PASS Europe/Kyiv summer and winter civil-midnight boundaries');
