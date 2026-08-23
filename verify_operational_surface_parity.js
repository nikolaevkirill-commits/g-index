const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexPath = process.argv[2] || path.join(__dirname, 'index.html');
const swPath = process.argv[3] || path.join(__dirname, 'sw.js');
const outputPath = process.argv[4] || path.join(__dirname, 'OPERATIONAL_SURFACE_PARITY_v1.json');
const html = fs.readFileSync(indexPath, 'utf8');
const sw = fs.readFileSync(swPath, 'utf8');
const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, passed: Boolean(ok), detail });
  if (!ok) throw new Error(`${name}: ${detail}`);
  console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`);
}

const resolverBlock = html.match(
  /function _stateKeyToRepresentativeG_v88824[\s\S]+?window\.resolveDaySignal_v88825 = resolveDaySignal_v88825;/
);
check('resolver block present', Boolean(resolverBlock));

let activeEntry = null;
const context = {
  window: {},
  isFinite,
  getEngineScore: () => activeEntry,
  todayKyivStr: () => '2099-01-01',
  classifyStateByG: (g, kp) => {
    if (kp >= 5 || g <= -2.5) return 'tense';
    if (g < -1) return 'unstable';
    if (g < 0.5) return 'neutral';
    if (g < 1.5) return 'good';
    return 'favorable';
  },
  _engineScoreToStateKey_v88824: score =>
    score >= 2 ? 'favorable' : score >= 1 ? 'good' : score === 0 ? 'neutral' : score === -1 ? 'unstable' : 'tense',
  GLOBAL_STATES: {
    favorable: { headline: 'favorable' }, good: { headline: 'good' },
    neutral: { headline: 'neutral' }, unstable: { headline: 'unstable' }, tense: { headline: 'tense' },
  },
  recommendG: () => ({ text: 'RAW_PERMISSION_MUST_NOT_ESCAPE', style: '' }),
};
vm.createContext(context);
vm.runInContext(resolverBlock[0], context);

function noEngine(raw, kp) {
  activeEntry = null;
  return context.window.resolveDaySignal_v88825(new Date('2026-08-21T12:00:00Z'), raw, kp, { isToday: false });
}

for (const [name, raw, kp] of [
  ['no-engine positive raw', 3, 2],
  ['no-engine negative raw', -3, 2],
  ['no-engine storm', 3, 5],
]) {
  const result = noEngine(raw, kp);
  check(`${name} has no decision`, result.decisionAvailable === false && result.decisionScore === undefined,
    `policy=${result.actionPolicy}; score=${String(result.decisionScore)}`);
  check(`${name} cannot use raw recommendation`, !JSON.stringify(result).includes('RAW_PERMISSION_MUST_NOT_ESCAPE'));
}

check('Hora is context-only', html.includes('const eiTotalRaw = ei;') && !/eiTotalRaw\s*=\s*ei\s*\+\s*horaEiRaw/.test(html));
check('only canonical resolver computes slot guard', (html.match(/_computeCurrentSlotDecision\(\)/g) || []).length === 2,
  'one declaration plus one resolver call');
check('legacy Hero resolver delegates to canonical authority',
  html.includes('const sig = resolveDaySignal_v88825(todayKyivStr(), liveG, kp, {isToday:true});'));
check('Hero ring fill follows displayed operational score',
  html.includes('const _hV = _hasVerdict ? _heroDisplayVal : newG;'));
check('Hero visual state follows resolver opKey',
  html.includes("let _heroSharedCls = _hasVerdict ? _heroSig.opKey : 'neutral';"));
check('stale cached reference fails closed',
  html.includes('const decisionAvailable = hasEngine && !referenceStale;') &&
  html.includes("referenceStale ? 'reference_stale' : 'reference_unavailable'"));
check('current timing and day-plan share canonical presentation',
  html.includes('function getCurrentOperationalPresentation()') &&
  html.includes('const _currentPresentation = isCurrent ? getCurrentOperationalPresentation() : null;') &&
  html.includes('const _currentPresentationP = getCurrentOperationalPresentation();'));
check('personal layer fails closed', html.includes('const _globalRisk = _operationalKnown408 ? _operationalScore408 < 0') &&
  html.includes('const _globalSafe = _operationalKnown408 ? _operationalScore408 >= 0 : false') &&
  html.includes('const _globalUnknown = !_operationalKnown408'));
check('Jyotish unknown has no positive glyph',
  html.includes("(!_decisionKnownFinalDay || _criticalFinalDay)") &&
  html.includes("${_decisionKnownFinalDay?'':' (оперативний стан невідомий)'}"));
check('PWA data fallback checks shell cache', sw.includes('cached = await shellCache.match(req)'));
check('v19.2 remains permanently shadow', html.includes('v19.2 назавжди лишається SHADOW'));

const artifact = {
  schema: 'operational_surface_parity_v1',
  generated_at_utc: new Date().toISOString(),
  scope: 'Hero/Personal/Jyotish/no-engine/intraday/PWA authority contracts; not predictive accuracy',
  frozen_model_changed: false,
  passed: checks.every(x => x.passed),
  checks,
};
fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
console.log(`WROTE ${outputPath}`);
