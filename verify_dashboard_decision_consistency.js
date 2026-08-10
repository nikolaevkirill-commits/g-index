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

function heroSignal(pdf, live, kp = 2) {
  activeEntry = { eng: pdf, _expertOverride: true };
  context.window._stormWindow = null;
  return context.resolveHeroSignalHierarchy_v88824(live, kp);
}

function assertHeadline(name, sig, expectedPrefix) {
  const headline = context.heroHeadlineFromHierarchy_v88824(sig);
  if (!headline.startsWith(expectedPrefix)) {
    throw new Error(`${name}: expected prefix ${expectedPrefix}, got ${headline}`);
  }
  console.log(`PASS ${name}: ${headline}`);
}

assertHeadline(
  'Hero maps positive PDF vs tense live through operational state',
  heroSignal(1, -3),
  'Оперативно СТОП:'
);
assertHeadline(
  'Hero maps positive PDF vs neutral live through operational state',
  heroSignal(3, 0),
  'Оперативно нейтрально:'
);
assertHeadline(
  'Hero keeps aligned positive signals operational-first',
  heroSignal(3, 2),
  'Оперативно сприятливо; PDF reference'
);
const stormHeroSignal = heroSignal(2, 2);
context.window._stormWindow = { kp: 5.3, label: '18', hoursAhead: 0, etaLabel: 'ЗАРАЗ', active: true };
assertHeadline('Hero storm guard stays operational-first', stormHeroSignal, 'Оперативно СТОП: буря');
context.window._stormWindow = null;
const incomingStormTenseSignal = heroSignal(2, -3);
context.window._stormWindow = { kp: 5.3, label: '21', hoursAhead: 2, etaLabel: '~2г', active: false };
assertHeadline('Incoming storm cannot soften an existing stop state', incomingStormTenseSignal, 'Оперативно СТОП зараз;');
context.window._stormWindow = null;

const weekStart = html.indexOf('function renderWeekSummary(){');
const weekEnd = html.indexOf('// ═══ v88.8.39-fp76', weekStart);
if (weekStart < 0 || weekEnd < 0) throw new Error('week summary function missing');
const weekBar = { style: {}, innerHTML: '' };
context.document = { getElementById: id => id === 'weekSummaryBar' ? weekBar : null };
context.fmtDate = d => d.toISOString().slice(0, 10);
context.getDynamicKpForDate_v889125 = () => 2;
context.computeAi = () => ({ Ai: -3 });
context.sunriseUTC = d => d;
context.kpDayTerm = () => 0;
context.window.__uiState = {};
activeEntry = { eng: 2, _expertOverride: true };
vm.runInContext(html.slice(weekStart, weekEnd), context);
context.renderWeekSummary();
if (!weekBar.innerHTML.includes('ref +2 PDF') || !weekBar.innerHTML.includes('Стоп:') || weekBar.innerHTML.includes('Краще:')) {
  throw new Error(`week summary did not honor operational -3 over PDF +2: ${weekBar.innerHTML}`);
}
console.log('PASS week summary runtime: operational -3 is primary; PDF +2 remains reference');

function requireText(needle, label) {
  if (!html.includes(needle)) throw new Error(`${label}: missing ${needle}`);
  console.log(`PASS ${label}`);
}

function forbidText(needle, label) {
  if (html.includes(needle)) throw new Error(`${label}: stale text still present: ${needle}`);
  console.log(`PASS ${label}`);
}

requireText('Оперативно СТОП: PDF reference', 'Hero conflict wording is operational-first');
requireText('Оперативно сприятливо; PDF reference', 'positive Hero wording is operational-first');
requireText('Оперативно СТОП: буря Kp=', 'storm Hero wording is operational-first');
requireText("sig.opKey === 'neutral'", 'Hero conflict wording follows resolved operational state');
requireText('ДЕННИЙ PDF/ENGINE REFERENCE · НЕ РІШЕННЯ ДЛЯ ДІЇ', 'AUTO feed panel is reference-only');
requireText('Оперативну дію визначає обережніший стан у Hero', 'AUTO feed panel defers to operational safety');
requireText('const operational = sig && isFinite(sig.decisionScore)', 'week summary uses operational score');
requireText('PDF/Engine reference ${refStr}', 'week summary keeps reference separately labeled');
requireText('const _rawGOf = d => Number(d?.G)', '27-day G filter uses raw G only');
requireText('raw-контекст · не команда', '27-day table has no raw-G action recommendation');
requireText('позитивний стан не є дозволом на нові дії', 'Decision Layer fails closed on stale data');
requireText('позитивний стан не є дозволом', 'decision strip fails closed on stale data');
requireText("Operational resolver недоступний — лише raw/reference аудит", 'CSV fails closed when resolver is unavailable');
requireText('Day_score_reference = ${dayTxt}', 'ICS labels PDF/Engine as reference');
requireText('Локальний цикл зараз:', 'personal activity cycle is labeled as local context');
requireText('Оперативний стан ${_op179} має пріоритет:', 'personal activity cycle has operational safety gate');
requireText('окрема порада призупинена через глобальний ризик', 'positive local activity advice is suppressed during operational risk');
requireText('PDF/Engine reference, не оперативне рішення', '27-day timeline legend is reference-only');
requireText('is-now.is-routine', 'current routine slot has non-positive semantic styling');
requireText("'Історична подія NOAA'", 'inactive NOAA event is explicitly historical');
requireText('Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA event is time-labeled before live Kp loads');
requireText('це кількість точок, не значення Kp', 'Kp source counts cannot masquerade as Kp values');
requireText('3D NOAA G_day raw · ДОБА, НЕ G_now:', '3-day raw value names its source and horizon');
requireText('27D NOAA raw:', '27-day raw comparison names its source and horizon');
requireText('Δ3D−27D', '3-day versus 27-day delta names both horizons');
requireText('Зміна live G_now від учора:', '24-hour delta is labeled as a change, not a current value');
requireText('це Δ, не поточне значення; зараз', '24-hour delta discloses the current G_now separately');
requireText('PDF/Engine reference завтра = ${_tomEngScore', 'tomorrow risk warning renders the actual reference value');
requireText('Технічні входи', 'technical panel is labeled as source inputs');
requireText('Kp snapshot:', 'technical timestamp names the Kp snapshot');
requireText('Час перерахунку (UTC)', 'formula audit distinguishes evaluation time from source snapshot');
requireText("const automationStatus=hard.length?'FAIL':operationalWarns.length?'WARN':'PASS'", 'automation status excludes evidence-only waits');
requireText("<strong>🧪 Докази: '+evidenceStatus", 'evidence readiness is displayed separately from automation health');
requireText('Health artifact має WARN лише через evidence gates; це не збій автоматизації.', 'evidence-only WARN is explained as non-operational');
forbidText('День сильний за PDF', 'old PDF-first Hero headline removed');
forbidText('МОЖНА ДІЯТИ за PDF', 'PDF reference cannot grant action');
forbidText('Сильний день за PDF', 'PDF-first positive Hero branch removed');
forbidText('День сприятливий за PDF', 'PDF-first moderate Hero branch removed');
forbidText('return `PDF +${sig.dayScore} · буря', 'PDF-first storm Hero branch removed');
forbidText('`PDF · буря Kp=', 'PDF-first late storm patch removed');
forbidText('const _kyivLabel =', 'unused timezone helper cannot disable storm guard');
forbidText('Це єдиний шар, що формує підсумковий вердикт', 'method explainer cannot crown PDF as final decision');
forbidText('рішення дня бери звідти', 'offline hint cannot direct decisions to PDF reference');
forbidText('рішення дня має пріоритет над live-фоном', 'future hint cannot bypass operational safety wording');
forbidText('ЄДИНИЙ ПІДСУМКОВИЙ РЕЗУЛЬТАТ', 'AUTO feed cannot publish a second final decision');
forbidText('Одне рішення за ієрархією джерел', 'AUTO feed cannot masquerade as operational command');
forbidText('Вердикт дня вгорі = PDF/Engine (експерт), він головний', '3-day tooltip cannot crown PDF over safety contour');
forbidText('PDF/Engine — пріоритет · live Kp оновлює фон', '3-day banner cannot demote live safety data');
forbidText('days.filter(d=>d.eng', 'week summary cannot classify PDF reference as operational days');
forbidText('const s = d.eng', 'week row cannot display PDF reference as main score');
forbidText('const _decisionOf =', '27-day raw filter cannot substitute PDF/Engine score');
forbidText('Рішення ${isFinite(G_display)', '27-day raw G badge cannot be labeled as a decision');
forbidText('recommendG(G_display, kpUsed).text', '27-day raw context cannot emit action recommendation');
forbidText('✔ Діяти до ${String(_sw30.label)', 'incoming storm cannot create unconditional action permission');
forbidText('DO.unshift(`важливе — завершити до', 'storm advice cannot add important action under a restrictive state');
forbidText('Kp_day − 2', 'visible formula cannot invert 2−Kp');
forbidText('}) − 2 + ΣAᵢ', '3-day tooltip cannot invert 2−Kp');
forbidText(": (dayScore === '' ? G : Number(dayScore))", 'CSV cannot substitute PDF/raw for missing operational resolver');
forbidText(': (Number.isFinite(dayScore) ? dayScore : G)', 'ICS cannot substitute PDF/raw for missing operational resolver');
forbidText('(базове PDF/Engine-рішення)', 'ICS cannot label PDF reference as base decision');
forbidText('· РІШЕННЯ ${d._expertEng', 'forward timeline tooltip cannot label PDF reference as decision');
forbidText('G_day = Largest 2 − Kp', '27-day legend formula cannot be malformed');
forbidText('Найкращий день (7 днів)', 'raw maximum cannot be labeled best decision day');
forbidText('Головний показник.', 'old PDF-first 27-day tooltip removed');
forbidText('червоний/зелений = PDF/Engine-рішення', 'old 27-day decision caption removed');
forbidText("+' · real '+Number(ks.real_points", 'Kp source counts cannot use value-like real/synthetic shorthand');
forbidText('RAW-АУДИТ ФОНУ · НЕ РІШЕННЯ', '3-day raw value cannot omit source and horizon');
forbidText('Фон зараз просів <span', '24-hour delta cannot read as the current value');
forbidText('Фон зараз піднявся <span', 'positive 24-hour delta cannot read as the current value');
forbidText('PDF/Engine reference для завтра ≤ −2', 'threshold cannot masquerade as tomorrow reference value');
forbidText("<strong>⚙ Стан автоматизації: '+status", 'source health WARN cannot masquerade as automation failure');
