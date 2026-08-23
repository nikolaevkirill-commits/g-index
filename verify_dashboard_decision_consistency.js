const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
// Freshness labels are presentation safeguards: stale advisory snapshots cannot
// be styled or worded as live inputs, and they never alter the frozen score.
requireText("const swIsStale=String(sw.status||'').toLowerCase()==='stale'", 'source health treats stale routing as stale, not LIVE');
requireText('const advisoryStale=currentAgeHours===null||currentAgeHours>6', 'space-weather missing or old timestamp fails closed');
requireText("const liveShown=(v,digits=1)=>advisoryStale?'—':shown(v,digits)", 'stale fast-changing space-weather values are suppressed');
requireText('const stressed=!advisoryStale&&(', 'stale space-weather cannot trigger live stress state');
requireText('src="astronomy-engine-2.1.19.min.js"', 'Astronomy Engine is pinned and served locally');
forbidText('cdn.jsdelivr.net/npm/astronomy-engine', 'runtime cannot depend on jsDelivr for Astronomy Engine');
forbidText('unpkg.com/astronomy-engine', 'runtime cannot depend on unpkg for Astronomy Engine');
requireText('const bgsStale=bgsAgeHours!==null&&bgsAgeHours>12', 'BGS freshness uses snapshot age');
forbidText("const swLabel=delivery.status==='last_good' ? 'LAST-GOOD '", 'old source-health LIVE-only label removed');
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

assertCase('positive PDF vs weak neutral-band live cannot fabricate zero',
  { pdf: 2, raw: -0.8, kp: 1.33, isToday: true },
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
  'Оперативно обережно:'
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
if (!weekBar.innerHTML.includes('ref +2 PDF') || !weekBar.innerHTML.includes('OP -3') || weekBar.innerHTML.includes('OP +2')) {
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
requireText("if(opKey === 'neutral') opKey = 'unstable'", 'material conflict cannot fabricate operational zero');
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
requireText('золота рамка = PDF reference', '27-day timeline separates reference provenance from raw colors');
requireText('is-now.is-routine', 'current routine slot has non-positive semantic styling');
requireText("const _dayRestrictedHeat = isFinite(_heatReference) && Number(_heatReference) < 0", 'negative daily contour cannot render a green allowed slot');
requireText("personalMain = `${_horaTheme405} — лише тема години. Оперативний стан ${_opScore405}: тільки перевірена рутина.`", 'Hora cannot issue an optimistic action against the operational verdict');
requireText('уже всередині G_raw · не окремий прогноз', 'positive Panchanga is labeled as an included factor, not a second forecast');
requireText('фактор · не прогноз', 'traditional components are visibly non-verdict factors');
requireText('scoreIcon(p.tithi.score, _panchVisualCtx)', 'Jyotish component colors follow the operational verdict, not positive raw G');
requireText('це вже врахований фактор, не окремий прогноз', 'state explanation cannot present Panchanga as a second forecast');
requireText("'Історична подія NOAA'", 'inactive NOAA event is explicitly historical');
requireText('Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA event is time-labeled before live Kp loads');
requireText('кількість дат, не значення Kp', 'Kp source counts cannot masquerade as Kp values');
requireText('3D NOAA G_day raw · ДОБА, НЕ G_now:', '3-day raw value names its source and horizon');
requireText('27D NOAA raw:', '27-day raw comparison names its source and horizon');
requireText('Δ3D−27D', '3-day versus 27-day delta names both horizons');
requireText('Зміна live G_now від учора:', '24-hour delta is labeled as a change, not a current value');
requireText('це Δ, не поточне значення; зараз', '24-hour delta discloses the current G_now separately');
requireText('PDF/Engine reference завтра = ${_tomEngScore', 'tomorrow risk warning renders the actual reference value');
requireText('Технічні входи', 'technical panel is labeled as source inputs');
requireText('Kp snapshot:', 'technical timestamp names the Kp snapshot');
requireText('Час перерахунку (UTC)', 'formula audit distinguishes evaluation time from source snapshot');
requireText("const automationStatus=hard.length||healthStale?'FAIL':operationalWarns.length?'WARN':'PASS'", 'automation status excludes evidence-only waits and fails closed on stale health');
requireText("<strong>🧪 Докази: '+evidenceStatus", 'evidence readiness is displayed separately from automation health');
requireText('Health artifact має WARN лише через evidence gates; це не збій автоматизації.', 'evidence-only WARN is explained as non-operational');
requireText("· наступна ручна вибірка '+manualPending", 'manual evidence count is labeled as the next rolling sample');
requireText("${dd} → ${isToday?'ОПЕРАТИВНО '+_opScoreTextQ:'FORECAST G_raw '+_futureRawTextQ} · ${isToday?cat:'не команда для дії'}", '3-day headline separates today operational state from future raw forecast');
requireText("'PDF reference' : 'Engine reference'", '3-day reference source is explicit');
requireText('· не дозвіл</span></div>', '3-day reference line cannot be read as action permission');
requireText('PDF REFERENCE · VERIFIED OVERRIDE · НЕ РІШЕННЯ ДЛЯ ДІЇ', 'verified PDF banner is reference-only');
requireText('${_bulletinLine}', '3-day reference line is always rendered');
requireText('onclick="toggleSimpleMode()"', 'simple/full mode button has a direct durable handler');
requireText("localStorage.setItem('gindex_simple_mode', isOn ? '1' : '0')", 'full-mode preference persists across reloads');
requireText('onclick="setSimpleMode(false);', 'mode picker full choice activates full mode immediately');
requireText('onclick="setSimpleMode(true);', 'mode picker simple choice keeps simple mode active');
requireText('id="astronomyEventsCard"', 'astronomy events are visible instead of buried in the formula');
requireText('id="planetParadeTile"', 'planet parade has its own visible tile');
requireText('function nextMorningPlanetParade(dateUTC)', 'planet parade is calculated for the local pre-dawn sky');
requireText("Astronomy.Horizon(observeAt,observer,eq.ra,eq.dec,'normal')", 'planet parade uses local horizon geometry');
requireText("body==='Uranus'||body==='Neptune'", 'optics-only parade planets are disclosed');
requireText("bodies:['Mercury','Jupiter','Uranus','Mars','Neptune','Saturn']", 'August parade has the six verified bodies');
requireText("локально ${count}/${total} над горизонтом", 'global parade and local visibility are separated');
requireText("(за горизонтом)", 'below-horizon parade members stay visible as unavailable locally');
requireText('Сьогодні Mᵢ = ${mi.Mi}', 'eclipse tile discloses the exact current score contribution');
requireText('вже враховано у ΣAᵢ та G', 'eclipse tile prevents double-counting ambiguity');
requireText('Інформаційно, score_effect=0', 'physical planet pair is score-neutral');
requireText('не фізичне зближення планет', 'Hora transition cannot masquerade as a physical conjunction');
requireText("Astronomy.AngleBetween(vectors[i].vec, vectors[j].vec)", 'planet pair uses physical geocentric angular separation');
requireText("m.set('2026-08-12','total_solar')", '2026-08-12 total solar eclipse remains in the verified catalog');
requireText("function parseNoaaJson(text)", 'NOAA bare-NaN payloads have a fail-soft parser');
requireText("const plasmaRows = parseNoaaJson(plasmaTxt)", 'solar-wind module uses the NOAA parser');
requireText('function _looksLikeNoaaArray(text)', 'NOAA response bodies are validated before a CORS route is accepted');
requireText('fetchTextWithCORS(url, _looksLikeNoaaArray)', 'Bz, Vsw and X-ray reject truncated proxy responses');
requireText('const rows = parseNoaaJson(text)', 'GOES X-ray uses the fail-soft NOAA parser');
requireText('seq.length < cap && guard < cap * 4 + 4', 'Hora boundary retry cannot consume a requested sequence entry');
requireText("const URL_WOLF_SN_STATUS = 'SILSO_REFRESH_STATUS_v1.json'", 'Wolf Sn prefers the same-origin validated scheduler snapshot');
requireText('withTimeout(fetchWolfSnResilient(), 5000', 'Wolf Sn primary route is resilient and bounded');
requireText("snapshot:  {icon:'▣'", 'validated snapshot is not mislabeled as offline cache');
requireText("window._lastWolfSn._delivery==='local_snapshot' ? ' · snapshot'", 'Wolf Sn chip discloses snapshot delivery after rerender');
requireText("Kp зараз '+kpNowLabel+' · Kp горизонт '+kpHorizonLabel", 'source health separates observed Kp from forecast-horizon provenance');
requireText('synthetic не є прогнозом NOAA', 'synthetic horizon points cannot masquerade as NOAA forecasts');
requireText('let _preferVerifiedLocal3Day = false', 'verified same-origin NOAA horizon is checked before UAF proxy fallback');
requireText("point.kp_synthetic === false", 'only non-synthetic local Kp points may suppress UAF fallback');
requireText('_noaaAgeH = (Date.now() - (_tsMs + KP_INTERVAL_HOURS*3600000)) / 3600000', 'NOAA content age preserves fractional hours at the one-hour boundary');
requireText('_gfzAgeH = (Date.now() - (_gTsMs + 3*3600000)) / 3600000', 'GFZ content age preserves fractional hours at the one-hour boundary');
forbidText('withTimeout(fetchTextWithCORS(URL_WOLF_SN, _looksLikeJson), 5000', 'startup cannot depend directly on SILSO CORS');
forbidText("localStorage.removeItem('gindex_simple_mode')", 'full-mode preference cannot be erased back to simple default');
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
forbidText('_decisionOf(d)', '27-day statistics cannot call a missing decision helper');
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
forbidText('kVal - 2 + aiObj.Ai', 'G tooltip arithmetic must use canonical 2−Kp helper');
forbidText('(kUse!=null ? kUse : NaN) - 2 + ai.Ai', 'live G must use canonical 2−Kp helper');
forbidText('_kpPast - 2 + ai.Ai', 'historical trend must use canonical 2−Kp helper');
forbidText('_kpLiveToday - 2 + _aiLive.Ai', 'today trend must use canonical 2−Kp helper');
forbidText('(i === 0 ? _kpNow : 2) - 2 + ai.Ai', 'fallback trend must use canonical 2−Kp helper');
requireText('const G = (kUse!=null ? kpDayTerm(kUse) : NaN) + ai.Ai', 'live G closes against the displayed 2−Kp decomposition');
forbidText('Найкращий день (7 днів)', 'raw maximum cannot be labeled best decision day');
forbidText('Головний показник.', 'old PDF-first 27-day tooltip removed');
forbidText('червоний/зелений = PDF/Engine-рішення', 'old 27-day decision caption removed');
forbidText("+' · real '+Number(ks.real_points", 'Kp source counts cannot use value-like real/synthetic shorthand');
forbidText('RAW-АУДИТ ФОНУ · НЕ РІШЕННЯ', '3-day raw value cannot omit source and horizon');
forbidText('Фон зараз просів <span', '24-hour delta cannot read as the current value');
forbidText('Фон зараз піднявся <span', 'positive 24-hour delta cannot read as the current value');
forbidText('PDF/Engine reference для завтра ≤ −2', 'threshold cannot masquerade as tomorrow reference value');
forbidText("<strong>⚙ Стан автоматизації: '+status", 'source health WARN cannot masquerade as automation failure');
forbidText("· ручний перегляд '+manualPending", 'rolling sample cannot masquerade as the full remaining review pool');
forbidText("${(_scenBanner && !_isDivergent) ? '' : _bulletinLine}", '3-day PDF reference cannot disappear when signals agree');
requireText('id="v19ShadowStatusBanner"', 'v19.2 shadow status is visible on the dashboard');
requireText('data-model="reconstructed-v19.2" data-score-effect="0"', 'v19.2 is explicitly reconstructed and score-neutral');
requireText('v19.2 не змінює Hero, оцінку дня, PDF/Engine reference або оперативні рекомендації', 'v19.2 cannot masquerade as the active forecast');
requireText('PROSPECTIVE SHADOW</code> · <code>PRODUCTION HOLD</code> · <code>score_effect=0', 'v19.2 hold state is explicit');
forbidText('data-score-effect="1"', 'v19.2 shadow cannot acquire production score effect');
requireText('window.GINDEX_PLAY_CHANNEL', 'Play companion channel is explicit');
requireText('play-channel #paywallOverlay', 'Play companion hides digital purchases');
requireText("window.GINDEX_PLAY_CHANNEL ? 'basic'", 'Play companion uses the local Basic feature set');
forbidText('href="backtest.html"', 'dashboard cannot link to a missing backtest page');
requireText('Сигнали розходяться: PDF/Engine reference не є оперативним дозволом.', 'divergence notice is sign-neutral');
forbidText('Сигнали розходяться: позитивний PDF не є дозволом.', 'negative PDF cannot be mislabeled as positive');
requireText('↻ Оновити дані', 'data refresh button is explicit');
requireText('Оновити застосунок</button>', 'PWA update action is distinct from data refresh');
forbidText('aria-label="Оновити дані з NOAA">↻ Оновити</button>', 'data refresh button cannot masquerade as app update');
requireText("br+span[style*=\"font-size:10px\"]::before{content:'· '", 'compact Panchanga labels keep a visible separator');
requireText('id="dashboardToolbar"', 'focused dashboard toolbar exists');
requireText('id="btnHeaderTools"', 'secondary tools have an explicit toggle');
requireText('function toggleHeaderTools(button)', 'secondary tools use a durable named handler');
requireText("bar.classList.toggle('tools-open')", 'secondary tools toggle is functional');
requireText('#heroWhyBasic { display: block !important; }', 'score explanation is available in every view');
requireText('<summary>▸ Чому така оцінка?</summary>', 'score explanation has a plain-language label');
forbidText('id="heroWhyBasic" style="display:none', 'score explanation cannot be hidden by default');
forbidText('http-equiv="X-Frame-Options"', 'unsupported X-Frame-Options meta cannot claim protection the browser ignores');
forbidText("frame-ancestors 'none'", 'frame-ancestors cannot be declared in an ignored meta CSP');
requireText('id="btnGeo"', 'geolocation has an explicit user-action control');
requireText('onclick="initGeolocation()"', 'fresh geolocation runs from a user gesture');
requireText('function initCachedGeolocation()', 'startup may reuse a previously approved location without prompting');
requireText('try{ initCachedGeolocation(); }catch(e){} cp(2);', 'boot uses cached coordinates only');
forbidText('try{ initGeolocation(); }catch(e){} cp(2);', 'boot cannot open a geolocation permission prompt');
requireText("btn.setAttribute('aria-label', isOn ? 'Повний вигляд' : 'Простий вигляд')", 'simple-mode accessible name follows visible text');
requireText('aria-label="Профіль"', 'mobile profile navigation name matches visible text');
requireText("_btn.setAttribute('aria-label','Аудит: показати розкладку висновку')", 'audit control restores a visible-name-compatible label when closed');
requireText('color:#a9bad8">Health artifact', 'health evidence explanation keeps readable contrast');
forbidText('aria-label="v19.2 SHADOW:', 'v19 shadow summary uses its full visible text as the accessible name');
forbidText('aria-label="Показано ${visibleSlots.length}', 'dynamic slot paywall uses its full visible text as the accessible name');
forbidText('aria-label="Повний розклад ${slots.length}', 'dynamic window paywall uses its full visible text as the accessible name');
requireText("fetch('SPACE_WEATHER_CONTEXT_v1.json', {cache:'no-store'})", 'GOES X-ray prefers the validated same-origin snapshot');
requireText("_delivery: 'same_origin_snapshot'", 'same-origin X-ray provenance is explicit');
requireText("xr._delivery==='same_origin_snapshot' ? 'snapshot' : 'ok'", 'X-ray source indicator distinguishes snapshot from direct live fetch');
requireText("fetch('expert_overrides_v3.json?fresh=' + Date.now(), { cache: 'no-store' })", 'expert PDF overrides bypass stale browser and service-worker caches');
requireText("window._expertOverridesDelivery = 'network_fresh'", 'fresh expert override delivery is observable');
requireText("window._expertOverridesDelivery = 'offline_fallback'", 'offline expert override fallback is explicitly labeled');
requireText('[fp391 boot horizon refresh: 3-day]', 'initial PDF loader refreshes the already-rendered 3-day horizon');
requireText('[fp391 boot horizon refresh: week]', 'initial PDF loader refreshes the week horizon');
requireText('[fp391 boot horizon refresh: 27-day]', 'initial PDF loader refreshes the 27-day horizon');
requireText("_bgsFresh || !/^BGS\\b/i.test", 'stale BGS restrictions are removed from the current decision feed');
requireText('if(!bgsStale&&flags.storm_g1_plus)', 'stale BGS storm flags cannot activate an operational advisory');
requireText('Архівні advisory-дані — не оперативна поправка', 'stale space-weather panels are explicitly non-operational');
requireText('body.simple-mode #heroCard{min-height:860px!important}', 'mobile Hero reserves its measured loaded height');
requireText('const _nearViewport = _view.bottom >= -120 && _view.top <= window.innerHeight + 120', 'planet animation pauses outside the viewport');
requireText('const nearViewport = view.bottom >= -120 && view.top <= window.innerHeight + 120', 'G-flow animation pauses outside the viewport');
requireText("ts - _planetLastPaint < 50", 'planet animation is capped at 20 fps');
requireText("ts - _gFlowLastPaint < 50", 'G-flow animation is capped at 20 fps');
requireText('function rawContextColor(g)', '27-day raw context has one canonical color scale');
requireText('зони G_raw-контексту, не дозвіл', '27-day visible legend explains the restored colors truthfully');
forbidText('Тонкий синій пунктир — raw-контекст.', '27-day legend cannot describe the obsolete single-blue rail');
requireText('ctx.strokeStyle = rawContextColor((a.G + b.G) / 2)', '27-day line segments restore meaningful raw-context colors');
requireText('const col=rawContextColor(d.G)', '27-day visible points follow the raw-context color scale');
requireText('deliberately not green', 'positive raw context cannot masquerade as an action permission');
requireText('const col = _ftGColor(_gEff)', 'forward timeline colors stay on the raw-context scale');
forbidText("d._expertEng >= 1 ? '#2bd47d'", 'PDF reference cannot paint a forward bar action-green');
requireText("SYSTEM_HEALTH_STATUS_v1.json?fresh='+Date.now()", 'system health bypasses stale browser and service-worker entries');
requireText('не стверджує, що затемнення видно з Києва', 'astronomy tile does not imply uncalculated local eclipse visibility');
forbidText("ctx.strokeStyle = '#6aa8df';", '27-day line cannot regress to a single blue color');
requireText('G_raw total', 'formula audit labels continuous raw G explicitly');
requireText('поза оперативною шкалою −3…+3', 'extreme raw totals disclose the operational scale boundary');
requireText("Kp observed із затримкою понад 1 год → максимум «Середня»", 'delayed observed data cannot be labeled High quality');
requireText('const _swControlledAtBoot = Boolean(navigator.serviceWorker.controller)', 'first PWA install records whether the page was already controlled');
requireText("if (!_swControlledAtBoot)", 'first PWA controller install cannot reload an already current network page');
requireText('computePanchanga(sunriseUTC(dayRef))', 'day index panel uses the canonical sunrise anchor');
requireText('Number(pc.tithi.num) - 1', 'day advice reuses the canonical Panchanga Tithi');
requireText('_livePanch185=computePanchanga(now)', 'live Tithi and Nakshatra come from one instant Panchanga snapshot');
requireText('_livePanch185?.tithi?.hoursToNext', 'next Tithi boundary uses the canonical ephemeris estimate');
forbidText('const _pdAdv = window._lunarPhaseDeg', 'day advice cannot recalculate Tithi from a second live phase path');
requireText("const _globalRisk = _operationalKnown408 ? _operationalScore408 < 0", 'personal optimism is gated by the canonical operational verdict');
requireText("_operationalScore408 === -1 ? 'обережний'", 'personal banner labels operational minus one as cautious');
requireText('const _hV = _hasVerdict ? _heroDisplayVal : newG;', 'Hero ring fill follows the displayed operational score');
requireText("let _heroSharedCls = _hasVerdict ? _heroSig.opKey : 'neutral';", 'Hero visual state follows the resolver only when a verdict is available');
forbidText('const _hV = (_heroSig && _heroSig.hasEngine && isFinite(_heroSig.dayScore))', 'PDF reference cannot independently fill the operational Hero ring');
requireText('const sig = resolveDaySignal_v88825(todayKyivStr(), liveG, kp, {isToday:true});', 'legacy Hero entrypoint delegates to the canonical authority resolver');
requireText("const decisionAvailable = hasEngine && !referenceStale;", 'stale cached reference cannot remain an operational verdict');
requireText("referenceStale ? 'reference_stale' : 'reference_unavailable'", 'stale and missing reference states stay explicit');
requireText('function getCurrentOperationalPresentation()', 'current action surfaces share one canonical presentation adapter');
requireText('const _currentPresentation = isCurrent ? getCurrentOperationalPresentation() : null;', 'visible current timing row consumes canonical operational presentation');
requireText('const _currentPresentationP = getCurrentOperationalPresentation();', 'current day-plan row consumes canonical operational presentation');
requireText('const current = getCurrentOperationalPresentation();', 'slot fallback fails closed through canonical operational presentation');
