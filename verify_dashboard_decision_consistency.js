const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(
  /function _stateKeyToRepresentativeG_v88824[\s\S]+?window\.resolveDaySignal_v88825 = resolveDaySignal_v88825;/
);
if (!match) throw new Error('decision resolver block missing');

let activeEntry = null;
const context = {
  window: {},
  isFinite,
  getEngineScore: () => activeEntry,
  todayKyivStr: () => '2026-08-09',
  classifyStateByG: (g, kp) => {
    if (kp >= 5) return 'tense';
    if (g >= 1.5) return 'favorable';
    if (g >= 0.5) return 'good';
    if (g >= -1) return 'neutral';
    if (g > -2.5) return 'unstable';
    return 'tense';
  },
  _engineScoreToStateKey_v88824: score =>
    score >= 2 ? 'favorable' : score >= 1 ? 'good' : score === 0 ? 'neutral' : score === -1 ? 'unstable' : 'tense',
  GLOBAL_STATES: {
    favorable: { headline: 'favorable' },
    good: { headline: 'good' },
    neutral: { headline: 'neutral' },
    unstable: { headline: 'unstable' },
    tense: { headline: 'tense' },
  },
  recommendG: () => ({ text: 'raw', style: '' }),
};
vm.createContext(context);
vm.runInContext(match[0], context);

function resolve({ pdf, raw, kp = 2, isToday = false }) {
  activeEntry = { eng: pdf, _expertOverride: true };
  return context.window.resolveDaySignal_v88825(
    new Date('2026-08-09T12:00:00Z'), raw, kp, { isToday }
  );
}

function assertCase(name, input, expected) {
  const result = resolve(input);
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value) {
      throw new Error(`${name}: ${key} expected ${value}, got ${result[key]}`);
    }
  }
  if (result.dayScore !== input.pdf) {
    throw new Error(`${name}: frozen PDF reference was modified`);
  }
  console.log(`PASS ${name}: reference=${result.dayScore}, operational=${result.operationalScore}, guard=${result.guard}, safety=${result.dynamicGuard || 'none'}`);
}

assertCase('today positive PDF vs tense live',
  { pdf: 2, raw: -2.9, isToday: true },
  { decisionScore: -3, operationalScore: -3, guard: 'live_tense', opKey: 'tense' });

assertCase('future positive PDF vs negative raw',
  { pdf: 2, raw: -1.2 },
  { decisionScore: -1, operationalScore: -1, guard: 'model_conflict', opKey: 'unstable' });

assertCase('aligned positive signals',
  { pdf: 2, raw: 1.2, isToday: true },
  { decisionScore: 2, operationalScore: 2, guard: 'none', opKey: 'favorable' });

assertCase('negative PDF remains restrictive',
  { pdf: -2, raw: 2.0 },
  { decisionScore: -3, operationalScore: -3, guard: 'day_negative', opKey: 'tense' });

const storm = resolve({ pdf: 2, raw: 1.2, kp: 5 });
if (storm.operationalScore !== -3 || storm.dynamicGuard !== 'kp_storm' || storm.dayScore !== 2) {
  throw new Error(`storm guard failed: ${JSON.stringify(storm)}`);
}
console.log('PASS storm guard: positive reference cannot render as positive operation');

function requireText(needle, label) {
  if (!html.includes(needle)) throw new Error(`${label}: missing ${needle}`);
  console.log(`PASS ${label}`);
}

function forbidText(needle, label) {
  if (html.includes(needle)) throw new Error(`${label}: stale text still present: ${needle}`);
  console.log(`PASS ${label}`);
}

requireText('Оперативно СТОП: PDF reference', 'Hero conflict wording is operational-first');
requireText('Локальний цикл зараз:', 'personal activity cycle is labeled as local context');
requireText('Оперативний стан ${_op179} має пріоритет:', 'personal activity cycle has operational safety gate');
requireText('окрема порада призупинена через глобальний ризик', 'positive local activity advice is suppressed during operational risk');
requireText('PDF/Engine reference, не оперативне рішення', '27-day timeline legend is reference-only');
requireText('is-now.is-routine', 'current routine slot has non-positive semantic styling');
requireText("'Історична подія NOAA'", 'inactive NOAA event is explicitly historical');
requireText('Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA event is time-labeled before live Kp loads');
forbidText('День сильний за PDF', 'old PDF-first Hero headline removed');
forbidText('Головний показник.', 'old PDF-first 27-day tooltip removed');
forbidText('червоний/зелений = PDF/Engine-рішення', 'old 27-day decision caption removed');
