const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
const resolver = html.match(/function _stateKeyToRepresentativeG_v88824[\s\S]+?window\.resolveDaySignal_v88825 = resolveDaySignal_v88825;/);
if (!resolver) throw new Error('resolver block missing');

let activeEntry = { eng: 1, _expertOverride: true };
let slot = null;
const context = {
  window: {}, isFinite,
  getEngineScore: () => activeEntry,
  todayKyivStr: () => '2026-08-22',
  _computeCurrentSlotDecision: () => slot,
  _fmtKyivFromUTCFloat: value => `${String(Math.floor(value)).padStart(2, '0')}:00`,
  classifyStateByG: (g, kp) => kp >= 5 ? 'tense' : g >= 1.5 ? 'favorable' : g >= .5 ? 'good' : g >= -1 ? 'neutral' : g > -2.5 ? 'unstable' : 'tense',
  _engineScoreToStateKey_v88824: score => score >= 2 ? 'favorable' : score >= 1 ? 'good' : score === 0 ? 'neutral' : score === -1 ? 'unstable' : 'tense',
  GLOBAL_STATES: { favorable:{headline:'favorable'}, good:{headline:'good'}, neutral:{headline:'neutral'}, unstable:{headline:'unstable'}, tense:{headline:'tense'} },
  recommendG: () => ({text:'raw', style:''}),
};
vm.createContext(context);
vm.runInContext(resolver[0], context);

function run(name, slotValue, kp, expected) {
  slot = slotValue;
  const hero = context.resolveHeroSignalHierarchy_v88824(-0.23, kp);
  const day = context.window.resolveDaySignal_v88825(new Date('2026-08-22T12:00:00Z'), -0.23, kp, {isToday:true});
  for (const [key, value] of Object.entries(expected.hero)) {
    if (hero[key] !== value) throw new Error(`${name} hero.${key}: expected ${value}, got ${hero[key]}`);
  }
  for (const [key, value] of Object.entries(expected.day)) {
    if (day[key] !== value) throw new Error(`${name} day.${key}: expected ${value}, got ${day[key]}`);
  }
  if (day.dayScore !== 1 || hero.dayScore !== 1) throw new Error(`${name}: PDF reference was mutated`);
  console.log(`PASS ${name}: PDF +1; Hero ${hero.operationalScore}; day ${day.decisionScore}; guard ${day.dynamicGuard || 'none'}`);
}

run('active Gulika veto', {blockedNow:true, reasonsNow:['window:Gulika'], blockedUntilH:4.72}, 1.33, {
  hero:{opKey:'unstable', operationalScore:-1, dynamicGuard:'current_window'},
  day:{opKey:'unstable', decisionScore:-1, operationalScore:-1, actionPolicy:'routine_only', dynamicGuard:'current_window'}
});
run('no timing veto', {blockedNow:false}, 1.33, {
  hero:{opKey:'good', operationalScore:1, dynamicGuard:null},
  day:{opKey:'good', decisionScore:1, operationalScore:1, actionPolicy:'resolved_day_policy', dynamicGuard:null}
});
run('storm plus timing veto', {blockedNow:true, reasonsNow:['storm','window:Rahu'], blockedUntilH:8}, 5.2, {
  hero:{opKey:'tense', operationalScore:-3, dynamicGuard:'kp_storm'},
  day:{opKey:'tense', decisionScore:-3, operationalScore:-3, actionPolicy:'routine_only', dynamicGuard:'kp_storm'}
});

context.window.__referenceSourceState = {mode:'cached', stale:true, reason:'sw_offline_fallback'};
slot = {blockedNow:false};
const stale = context.window.resolveDaySignal_v88825(new Date('2026-08-22T12:00:00Z'), 2.4, 1.33, {isToday:true});
if (stale.decisionAvailable !== false || stale.decisionScore !== undefined || stale.actionPolicy !== 'reference_stale') {
  throw new Error(`stale reference did not fail closed: ${JSON.stringify(stale)}`);
}
if (!/рішення недоступне/i.test(stale.title) || /Можна планові/i.test(stale.recommendation?.text || '')) {
  throw new Error('stale reference leaked an action recommendation');
}
console.log('PASS stale cached reference fails closed without raw/PDF permission');
delete context.window.__referenceSourceState;

slot = {blockedNow:true, reasonsNow:['window:Gulika'], blockedUntilH:4.72};
const future = context.window.resolveDaySignal_v88825(new Date('2026-08-23T12:00:00Z'), -1.8, 1.33, {isToday:false});
if (future.dynamicGuard === 'current_window' || future.intradayGuard) {
  throw new Error('current Gulika veto leaked into a future-day forecast');
}
if (future.rawG !== -1.8) throw new Error(`future raw context was mutated: ${future.rawG}`);
console.log('PASS current timing veto does not rewrite future raw forecasts');

for (const [label, pattern] of [
  ['personal layer consumes canonical decisionScore', /_operationalPersonal408[\s\S]{0,900}decisionScore/],
  ['3-day today consumes canonical decisionScore', /const G_decision = _daySig3 && isFinite\(_daySig3\.decisionScore\)/],
  ['27-day today export consumes canonical decisionScore', /const operationalScore = sig && Number\.isFinite\(Number\(sig\.decisionScore\)\)/],
  ['PDF reference remains separately rendered', /referenceScore:hasEngine\?dayScore:undefined/]
]) {
  if (!pattern.test(html)) throw new Error(`surface contract missing: ${label}`);
  console.log(`PASS ${label}`);
}

for (const required of [
  'Оперативно лише рутина зараз:',
  'Поточне часове вето: нові починання заблоковано',
  '_applyCurrentSlotAuthority_v889218'
]) {
  if (!html.includes(required)) throw new Error(`missing contract marker: ${required}`);
}
console.log('PASS fp413 contract markers');
const manifestVersion = JSON.parse(manifest).version;
const htmlVersion = (html.match(/v(\d+\.\d+\.\d+-fp\d+)-[A-Z0-9-]+<\/title>/) || [])[1];
const cacheFp = (serviceWorker.match(/const CACHE_VERSION = '(fp\d+)-v\d+'/) || [])[1];
const manifestFp = (manifestVersion.match(/(fp\d+)$/) || [])[1];
if (!htmlVersion || htmlVersion !== manifestVersion) throw new Error(`release version mismatch: html=${htmlVersion}, manifest=${manifestVersion}`);
if (!cacheFp || cacheFp !== manifestFp) throw new Error(`cache generation mismatch: cache=${cacheFp}, manifest=${manifestFp}`);
console.log(`PASS release coherence: ${manifestVersion}; cache ${cacheFp}`);
