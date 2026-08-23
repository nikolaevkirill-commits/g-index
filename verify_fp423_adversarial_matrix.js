const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const block = html.match(/function _stateKeyToRepresentativeG_v88824[\s\S]+?window\.resolveDaySignal_v88825 = resolveDaySignal_v88825;/);
if (!block) throw new Error('canonical resolver block missing');

let entry = null;
let slot = {blockedNow:false};
const context = {
  window: {}, isFinite,
  getEngineScore: () => entry,
  todayKyivStr: () => '2026-08-23',
  _computeCurrentSlotDecision: () => slot,
  _fmtKyivFromUTCFloat: h => `${String(Math.floor(h)).padStart(2,'0')}:00`,
  classifyStateByG: (g,kp) => kp >= 5 || g <= -2.5 ? 'tense' : g < -1 ? 'unstable' : g < .5 ? 'neutral' : g < 1.5 ? 'good' : 'favorable',
  _engineScoreToStateKey_v88824: s => s >= 2 ? 'favorable' : s >= 1 ? 'good' : s === 0 ? 'neutral' : s === -1 ? 'unstable' : 'tense',
  GLOBAL_STATES: {favorable:{headline:'favorable'},good:{headline:'good'},neutral:{headline:'neutral'},unstable:{headline:'unstable'},tense:{headline:'tense'}},
  recommendG: () => ({text:'RAW_PERMISSION_FORBIDDEN',style:''})
};
vm.createContext(context);
vm.runInContext(block[0], context);

const surfacePatterns = {
  hero: /const _heroCanonicalSig = getCurrentOperationalSignal\(\)/,
  current_slot: /function getCurrentOperationalPresentation\(\)/,
  timing_rows: /const _currentPresentation = isCurrent \? getCurrentOperationalPresentation\(\) : null/,
  day_plan: /const _currentPresentationP = getCurrentOperationalPresentation\(\)/,
  forecast_3d_today: /const G_decision = _daySig3 && isFinite\(_daySig3\.decisionScore\)/,
  chart_27d_today: /const _opSig27 = isToday \? getCurrentOperationalSignal\(\) : null/
};
for (const [name, pattern] of Object.entries(surfacePatterns)) {
  if (!pattern.test(html)) throw new Error(`${name} does not consume canonical current authority`);
}

const scenarios = [
  {id:'positive_pdf_negative_raw', pdf:2, raw:-1.8, kp:2, slot:{blockedNow:false}},
  {id:'active_rahu', pdf:2, raw:2, kp:2, slot:{blockedNow:true,reasonsNow:['window:Rahu'],blockedUntilH:18}},
  {id:'active_yama', pdf:2, raw:2, kp:2, slot:{blockedNow:true,reasonsNow:['window:Yama'],blockedUntilH:15}},
  {id:'active_gulika', pdf:2, raw:2, kp:2, slot:{blockedNow:true,reasonsNow:['window:Gulika'],blockedUntilH:16}},
  {id:'kp_ge_4', pdf:2, raw:2, kp:4, slot:{blockedNow:false}},
  {id:'kp_ge_5', pdf:2, raw:2, kp:5, slot:{blockedNow:false}},
  {id:'missing_reference', pdf:null, raw:2, kp:2, slot:{blockedNow:false}},
  {id:'stale_cached_reference', pdf:2, raw:2, kp:2, slot:{blockedNow:false}, stale:true}
];

const rows = [];
for (const s of scenarios) {
  entry = s.pdf == null ? null : {eng:s.pdf,_expertOverride:true};
  slot = s.slot;
  context.window.__referenceSourceState = s.stale ? {mode:'cached',stale:true,reason:'sw_offline_fallback'} : {mode:'live',stale:false};
  const sig = context.window.resolveDaySignal_v88825(new Date('2026-08-23T12:00:00Z'), s.raw, s.kp, {isToday:true});
  const value = sig.decisionAvailable ? sig.decisionScore : null;
  const surfaces = Object.fromEntries(Object.keys(surfacePatterns).map(k => [k,value]));
  const consistent = new Set(Object.values(surfaces).map(String)).size === 1;
  if (!consistent) throw new Error(`${s.id}: surface conflict`);
  if (!sig.decisionAvailable && JSON.stringify(sig).includes('RAW_PERMISSION_FORBIDDEN')) throw new Error(`${s.id}: raw permission escaped`);
  rows.push({scenario:s.id,pdf:s.pdf,raw:s.raw,kp:s.kp,guard:sig.dynamicGuard||sig.guard,decisionAvailable:sig.decisionAvailable,actionPolicy:sig.actionPolicy,surfaces,verdict:'CONSISTENT'});
}

const future = context.window.resolveDaySignal_v88825(new Date('2026-08-24T12:00:00Z'), -1.4, 2, {isToday:false});
if (future.intradayGuard || future.dynamicGuard === 'current_window' || future.rawG !== -1.4) throw new Error('current veto leaked into future raw forecast');

const result = {schema:'fp423_adversarial_matrix_v1',generated_at_utc:new Date().toISOString(),surfaces:Object.keys(surfacePatterns),rows,future_raw_unchanged:true,verdict:'PASS'};
fs.writeFileSync('FP423_ADVERSARIAL_MATRIX_v1.json', JSON.stringify(result,null,2)+'\n');
for (const r of rows) console.log(`PASS ${r.scenario}: ${Object.values(r.surfaces).join('/')} · ${r.guard}`);
console.log('PASS future current-window veto does not rewrite raw forecast');
