/* NR_FN_BEGIN 043 */function updateSpaceWeatherDecisionGuard(){
  const el=document.getElementById('spaceWeatherDecisionGuard');
  if(!el) return;
  const p=_spaceWeatherAccumulated||{}, b=_bgsSpaceWeather||{};
  const m=p.magnetic||{}, w=p.solar_wind||{}, e=p.enlil||{}, sp=p.solar_probabilities||{};
  const c=p.coupling||{}, d=p.dst||{}, hp=p.hpo||{}, flags=b.flags||{};
  const fetched=Date.parse(p.fetched_at||'');
  const ageH=Number.isFinite(fetched)?Math.max(0,(Date.now()-fetched)/3600000):null;
  const stale=ageH===null||ageH>6;
  const bgsFetched=Date.parse(b.fetched_at||'');
  const bgsAgeH=Number.isFinite(bgsFetched)?Math.max(0,(Date.now()-bgsFetched)/3600000):null;
  const bgsStale=bgsAgeH===null||bgsAgeH>12;
  const reasons=[];
  if(!stale&&Number(w.speed_latest_km_s)>=550) reasons.push('швидкий сонячний вітер '+Math.round(Number(w.speed_latest_km_s))+' км/с');
  if(!stale&&Number(w.dynamic_pressure_max_6h_npa)>=5) reasons.push('динамічний тиск до '+Number(w.dynamic_pressure_max_6h_npa).toFixed(1)+' nPa');
  if(!stale&&c.shock_candidate) reasons.push('ймовірний раптовий імпульс: тиск +'+Number(c.pressure_jump_delta_npa||0).toFixed(1)+' nPa');
  if(!stale&&Number(d.latest_nt)<=-50) reasons.push('Dst '+Number(d.latest_nt).toFixed(0)+' nT');
  if(!stale&&Number(hp.hp30&&hp.hp30.max_24h)>=5) reasons.push('Hp30 до '+Number(hp.hp30.max_24h).toFixed(1));
  if(!bgsStale&&flags.storm_g1_plus) reasons.push('BGS допускає G1');
  if(!stale&&e.cme_cloud_start) reasons.push('ENLIL бачить CME-cloud');
  if(!stale&&Number(sp.m_class_1_day_pct)>=50) reasons.push('M-спалах '+Math.round(Number(sp.m_class_1_day_pct))+'%');
  const today=todayKyivStr();
  const day=window._autoForecastFeed&&window._autoForecastFeed.days&&window._autoForecastFeed.days[today];
  const positive=day&&Number(day.score)>0;
  if(!reasons.length&&!stale&&!bgsStale){ el.style.display='none'; return; }
  if(!reasons.length){
    el.style.display='block';
    el.innerHTML='<strong>ℹ Архівні advisory-дані — не оперативна поправка.</strong> '+
      'BGS/космічна погода прострочені; їх показано лише для довідки й вони не змінюють рекомендацію.';
    return;
  }
  el.style.display='block';
  el.innerHTML='<strong>⚠ Операційна поправка до рішення:</strong> '+
    (positive?'загальний PDF/Engine-вердикт сприятливий, але це не означає спокійну космічну погоду. ':'')+
    (reasons.length?'Зараз: '+reasons.join(' · ')+'. ':'')+
    '<strong>Для GPS, радіозв’язку, дронів і критичних запусків знизьте впевненість та перевірте умови безпосередньо перед дією.</strong>'+
    (stale?' <span style="color:#ff9f9f">Дані старші 6 год — потрібне оновлення.</span>':'')+
    '<div style="margin-top:3px;color:#a9bad8">Це незалежний safety/advisory-шар: він не додається вдруге до G і не переписує експертний PDF.</div>';
}/* NR_FN_END 043 */

/* NR_FN_BEGIN 048 */function _commitAuthority(token,commit){
  if(!token.current())return;
  if(_authorityBatch)_authorityBatch.set(token.key,{token,commit});else commit();
}/* NR_FN_END 048 */

/* NR_FN_BEGIN 049 */function _beginAuthorityBatch(){_authorityBatch=new Map();}/* NR_FN_END 049 */

/* NR_FN_BEGIN 050 */function _endAuthorityBatch(){
  const batch=_authorityBatch;_authorityBatch=null;
  if(batch)for(const {token,commit} of batch.values()){
    if(_authorityRequests.get(token.key)===token && !token.reason)commit();
  }
}/* NR_FN_END 050 */

/* NR_FN_BEGIN 051 */function _beginAuthority(key){
  const previous=_authorityRequests.get(key);
  if(previous) previous.cancel('superseded');
  const controller=new AbortController();
  const token={id:++_authoritySequence, key, active:true, controller};
  token.current=()=>token.active && _authorityRequests.get(key)===token;
  token.cancel=reason=>{token.active=false;token.reason=reason;controller.abort();clearTimeout(token.timer);if(reason==='timeout')_authorityFailure(token,new Error('authority deadline'));};
  token.timer=setTimeout(()=>token.cancel('timeout'),7500);
  token.finish=()=>{clearTimeout(token.timer);token.active=false;};
  token.fetch=(url,options={})=>fetch(url,{...options,signal:controller.signal});
  _authorityRequests.set(key,token);
  return token;
}/* NR_FN_END 051 */

/* NR_FN_BEGIN 052 */function _authorityFailure(token,error){
  if(_authorityRequests.get(token.key)!==token || token.reason==='superseded')return;
  window.__authoritySourceState=window.__authoritySourceState||{};
  window.__authoritySourceState[token.key]={generation:token.id,status:token.reason==='timeout'?'timeout':'error',stale:true,error:String(error?.message||error)};
}/* NR_FN_END 052 */

/* NR_FN_BEGIN 053 */function _authoritySuccess(token){
  window.__authoritySourceState=window.__authoritySourceState||{};
  window.__authoritySourceState[token.key]={generation:token.id,status:'loaded',stale:false,loadedAt:Date.now()};
}/* NR_FN_END 053 */

/* NR_FN_BEGIN 057 */async function loadExpertDecisionRegistry(force = false){
  if(!force && _expertDecisionRegistry !== null) return _expertDecisionRegistry;
  const token=_beginAuthority('registry');
  const el=document.getElementById('expertDecisionRegistryStatus');
  try{
    const r=await token.fetch('EXPERT_DECISION_REGISTRY_v1.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const doc=await r.json();
    if(doc.schema!=='expert_decision_registry_v1') throw new Error('unexpected schema');
    const displayText={}, registryOverrides={}, rejected=[];
    try{
      const {data:cleanDoc}=await _readOverrideDocument(token);
      const rowsByDate=new Map((Array.isArray(doc.rows)?doc.rows:[]).map(row=>[row.date,row]));
      for(const override of cleanDoc.overrides){
        const row=rowsByDate.get(override?.date),sameSource=String(override?.source_sha256||'').toLowerCase()===String(row?.source_sha256||'').toLowerCase();
        if(row&&override?.verified&&sameSource&&override?.override_text)displayText[override.date]=String(override.override_text);
      }
    }catch(_displayTextError){ window.NRDiagnostics?.record('legacy.catch.54','recoverable'); }
    // fp428 A-02: normalize verified registry decisions into the same store
    // consumed by getEngineScore(). The registry is no longer a display-only,
    // parallel authority path. Existing explicit overrides retain precedence.

    for(const row of (Array.isArray(doc.rows)?doc.rows:[])){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(row.date||''))) continue;
      if(row.decision_source!=='verified_expert_pdf') continue;
      const score=_strictDayScore(row.decision_score);
      if(score===null){rejected.push({date:row.date,reason:'invalid_discrete_score'});continue;}
      if(!/^[0-9a-f]{64}$/i.test(String(row.source_sha256||'')) || !String(row.source_pdf||'')) continue;
      if(!registryOverrides[row.date]){
        registryOverrides[row.date]={
          expert_eng:score, verified:true,
          verified_by_pdf_reading:true, source_pdf:String(row.source_pdf),
          source_page:row.source_page??null, source_sha256:String(row.source_sha256),
          category:row.decision_class||'verified_expert_pdf',
          applied_in:'EXPERT_DECISION_REGISTRY_v1.json'
        };
      }
    }
    if(!token.current())return _expertDecisionRegistry;
    _commitAuthority(token,()=>{
    const admittedDoc={...doc,rows:(Array.isArray(doc.rows)?doc.rows:[]).filter(row=>row.decision_source!=='verified_expert_pdf' || !!registryOverrides[row.date])};
    _expertDecisionRegistry=admittedDoc;window._expertDecisionRegistry=admittedDoc;
    window._expertDisplayText=displayText;window.__registryRejected=rejected;
    _registryOverrides=registryOverrides;_publishExpertOverrides();_authoritySuccess(token);
    if(window._expertOverridesLoadStatus==='pending')window._expertOverridesLoadStatus='loaded_registry';
    const s=doc.summary||{};
    const pct=x=>Number.isFinite(Number(x))?(Number(x)*100).toFixed(1)+'%':'—';
    if(el) el.innerHTML='<strong style="color:#ffd37a">Експертні рішення автоматизовано:</strong> '+
      Number(s.pdf_decision_dates||0)+' дат із '+Number(s.pdf_sources||0)+' PDF; SHA/parser cross-check '+
      Number(s.source_crosscheck_pass||0)+'/'+Number(s.pdf_sources||0)+'. Формула Excel: '+
      Number(s.formula_dates||0)+' дат; проти revision-aware PDF на '+Number(s.formula_pdf_overlap||0)+
      ' датах — exact '+pct(s.formula_exact)+', ±1 '+pct(s.formula_within_1)+', знак '+pct(s.formula_strict_sign)+
      '. У денному reference перевірений PDF має пріоритет над Engine fallback; Pᵢ не рахується другим голосом. Оперативну дію визначає обережніший safety-контур.';
    });
  }catch(e){ globalThis.NRDiagnostics?.record('catch.52','recoverable');
    _authorityFailure(token,e);
    if(!token.current())return _expertDecisionRegistry;
    if(_expertDecisionRegistry===null){_expertDecisionRegistry={};window._expertDecisionRegistry=_expertDecisionRegistry;}
    if(el) el.textContent='Експертний реєстр тимчасово недоступний; PDF/Engine reference не змінено, але він не є оперативним дозволом.';
  }
  finally{token.finish();}
  return _expertDecisionRegistry;
}/* NR_FN_END 057 */

/* NR_FN_BEGIN 216 */function buildDecisionTexts(uiState){
  const g = Number(uiState?.gNow ?? 0);
  const st = GLOBAL_STATES[classifyStateByG(g)];
  return { headline: st.headline, sub: st.sub };
}/* NR_FN_END 216 */

/* NR_FN_BEGIN 220 */function _slotDecisionInvariant(text, blocked){
  // fp243 runtime invariant (ТЗ п.4): якщо слот заблокований активним вікном/
  // бурею — текст рішення НЕ МОЖЕ містити формулювання, що дозволяють нові
  // старти. Порушення = логічна суперечність між блоками; лог для виявлення
  // регресій під час розробки (не блокує рендер — тільки сигналізує).
  if (blocked && /ключові рішення|активні дії|нов[іу] ініціатив|укладати угод/i.test(String(text||''))) {
    console.error('SLOT_DECISION_CONFLICT', text);
  }
}/* NR_FN_END 220 */

/* NR_FN_BEGIN 222 */function resolveSlotDecision(params){
  const p = params || {};
  const sH = Number(p.slotStartH), eH = Number(p.slotEndH), nowH = p.nowH;
  const g = Number(p.slotG);
  const _wins = Array.isArray(p.windows) ? p.windows : [];
  // v88.9.6x-fp247 FIX-CRITICAL (виявлено на реальному деплої fp246): раніше
  // _fmtH() форматував СИРИЙ UTC — це не було видно, поки зовнішня мітка рядка
  // (в _renderHeroTimeWindows/syncDayPlanCard) сама рахувалась через browser TZ
  // (яка у Kyrylo зазвичай теж +3 = Kyiv). Але fp245 перевів зовнішню мітку на
  // канонічний Europe/Kyiv-офсет — і два різні "локальні" часи в ОДНОМУ рядку
  // (мітка слоту "09:00–12:00" Kyiv, а текст сегмента всередині "08:05–09:00"
  // UTC) розійшлися візуально. Тепер _fmtH теж конвертує в Europe/Kyiv.
  const _fmtH = h => {
    const _kOff = (typeof kyivOffsetHoursIntAt === 'function') ? kyivOffsetHoursIntAt(new Date()) : 3;
    const local = ((h + _kOff) % 24 + 24) % 24;
    const hh = Math.floor(local);
    let mm = Math.round((local - Math.floor(local)) * 60);
    if (mm === 60) mm = 0;
    return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
  };

  // 1) буря — найвищий пріоритет, перекриває і активні вікна, і базове G.
  if (p.stormActive) {
    const action = 'тільки рутина · Kp≥5 (буря)';
    _slotDecisionInvariant(action, true);
    const _seg0 = { aH: sH, bH: eH, action, blockedNewStarts: true, reasons: ['storm'] };
    const _isNow0 = isFinite(nowH) && nowH >= sH && nowH < eH;
    return {
      segments: [_seg0],
      currentSegment: _isNow0 ? _seg0 : null,
      actionNow: _isNow0 ? action : null,
      slotAction: action,
      blockedNow: _isNow0,
      reasonsNow: _isNow0 ? ['storm'] : [],
      hasBlockedSegment: true,
      reasons: ['storm'],
      nextChangeAt: null
    };
  }

  // 2) сегменти — межі слоту + краї вікон, обрізані по межах слоту.
  const _bounds = new Set([sH, eH]);
  const _clipped = [];
  _wins.forEach(w => {
    const a = Math.max(sH, w.a), b = Math.min(eH, w.b);
    if (b > a) { _clipped.push({ nm: w.nm, a, b }); _bounds.add(a); _bounds.add(b); }
  });
  const _sorted = Array.from(_bounds).sort((x, y) => x - y);
  const _referenceStale = typeof p.referenceStale==='boolean' ? p.referenceStale : !!window.__referenceSourceState?.stale;
  const _hasReference = p.decisionAvailable === false ? false
    : (p.dayScore !== null && p.dayScore !== undefined && Number.isFinite(Number(p.dayScore)) && !_referenceStale);
  const baseAction = _baseSlotAction(g, _hasReference ? Number(p.dayScore) : null, _hasReference);

  const segments = [];
  for (let i = 0; i < _sorted.length - 1; i++) {
    const x = _sorted[i], y = _sorted[i + 1];
    if (y <= x) continue;
    const mid = (x + y) / 2;
    const active = _clipped.filter(w => w.a <= mid && mid < w.b);
    let action, blocked, reasons;
    if (active.length) {
      const names = active.map(w => w.nm).join('+');
      action = `тільки рутина; ${names} активн${active.length > 1 ? 'і' : 'ий'} — не починати нових справ`;
      blocked = true;
      reasons = active.map(w => 'window:' + w.nm);
    } else {
      action = baseAction;
      blocked = false;
      reasons = ['baseG'];
    }
    _slotDecisionInvariant(action, blocked);
    segments.push({ aH: x, bH: y, action, blockedNewStarts: blocked, reasons });
  }
  if (!segments.length) {
    _slotDecisionInvariant(baseAction, false);
    segments.push({ aH: sH, bH: eH, action: baseAction, blockedNewStarts: false, reasons: ['baseG'] });
  }

  // v88.9.6x-fp243b FIX-CRITICAL (самоаудит доп. пасу): раніше єдиний прапорець
  // blockedNewStarts = segments.some(...) означав "БУДЬ-ДЕ в слоті є блок" — тому
  // о 06:30, коли Rahu ще не почався (07:06), персональний блок і День-план ВСЕ
  // ОДНО писали "Rahu активний — не починати нових справ", хоча actionNow чесно
  // казав "активні дії". Тепер два окремі поняття:
  //   hasBlockedSegment — десь У СЛОТІ є заблокований сегмент (для майбутніх
  //                       слотів у списку — попередження про частину слоту);
  //   blockedNow        — заблоковано САМЕ ЗАРАЗ (для "поточного стану", кольору
  //                       поточного рядка, особистого блоку) — тільки з currentSegment.
  let actionNow = null, nextChangeAt = null, currentSegment = null;
  if (isFinite(nowH) && nowH >= sH && nowH < eH) {
    const curIdx = segments.findIndex(s => nowH >= s.aH && nowH < s.bH);
    if (curIdx >= 0) {
      currentSegment = segments[curIdx];
      actionNow = `${_fmtH(currentSegment.aH)}–${_fmtH(currentSegment.bH)} — ${currentSegment.action}`;
      if (curIdx < segments.length - 1) nextChangeAt = segments[curIdx + 1].aH;
    }
  }

  const hasBlockedSegment = segments.some(s => s.blockedNewStarts);
  const blockedNow = !!(currentSegment && currentSegment.blockedNewStarts);
  const reasonsNow = currentSegment ? currentSegment.reasons : [];
  const reasons = Array.from(new Set(segments.flatMap(s => s.reasons)));
  const slotAction = segments.length === 1
    ? segments[0].action
    : segments.map(s => `${_fmtH(s.aH)}–${_fmtH(s.bH)} ${s.action}`).join(' · ');

  return { segments, currentSegment, actionNow, slotAction, blockedNow, reasonsNow, hasBlockedSegment, reasons, nextChangeAt };
}/* NR_FN_END 222 */

/* NR_FN_BEGIN 223 */function _computeCurrentSlotDecision(){
  const _now = new Date();
  const _nowPreciseH = _now.getUTCHours() + _now.getUTCMinutes() / 60;
  const _slotH = Math.floor(_now.getUTCHours() / 3) * 3;
  const _sw = window._stormWindow;
  const _stormActive = !!(_sw && isFinite(_sw.kp) && _sw.kp >= 5 && _slotH >= parseInt(_sw.label, 10));
  let _dayEng = null;
  try {
    const _e = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr() + 'T12:00:00Z')) : null;
    if (_e && isFinite(_e.eng)) _dayEng = Number(_e.eng);
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.120','recoverable'); }
  const g = (typeof _v73G === 'function') ? _v73G() : NaN;
  const _wins = (typeof getInauspiciousWindowsUTC === 'function') ? getInauspiciousWindowsUTC() : [];
  const _dec = resolveSlotDecision({
    slotStartH: _slotH, slotEndH: _slotH + 3, nowH: _nowPreciseH,
    slotG: g, dayScore: _dayEng,
    windows: _wins, stormActive: _stormActive
  });
  // v88.9.6x-fp248 FIX (виявлено власним тестом): nextChangeAt обрізаний межею
  // ПОТОЧНОГО слоту — якщо вікно (напр. Yama) закінчується ПІСЛЯ кінця слоту
  // (реальний кейс зі скріну: слот 06:00-09:00 UTC, Yama 08:05-10:04 UTC),
  // nextChangeAt=null, і "до котрої" губиться. blockedUntilH — справжній кінець
  // активного вікна з повного _wins (не обрізаний слотом), для UI-тексту "до X".
  let _blockedUntilH = null;
  if (_dec.blockedNow && !_dec.reasonsNow.includes('storm')) {
    const _activeNames = _dec.reasonsNow.filter(r => r.startsWith('window:')).map(r => r.slice(7));
    const _ends = _wins.filter(w => _activeNames.includes(w.nm)).map(w => w.b);
    if (_ends.length) _blockedUntilH = Math.max(..._ends);
  }
  _dec.blockedUntilH = _blockedUntilH;
  return _dec;
}/* NR_FN_END 223 */

/* NR_FN_BEGIN 224 */function getCurrentOperationalSignal(){
  try {
    const _raw = (typeof _v73G === 'function') ? _v73G() : NaN;
    const _kp = Number(window.__uiState?.kpNow);
    return resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _raw, _kp, {isToday:true});
  } catch(_e) { globalThis.NRDiagnostics?.record('catch.152','recoverable');  return null; }
}/* NR_FN_END 224 */

/* NR_FN_BEGIN 226 */function getCurrentSlotDecision(){
  const _sig = getCurrentOperationalSignal();
  return _sig?.intradayGuard || {segments:[],currentSegment:null,actionNow:'стан не визначено',slotAction:'стан не визначено',blockedNow:true,reasonsNow:['reference_unavailable'],hasBlockedSegment:true,reasons:['reference_unavailable'],nextChangeAt:null,blockedUntilH:null};
}/* NR_FN_END 226 */

/* NR_FN_BEGIN 237 */function _applyStormGuardDOM(){
  const _sw = window._stormWindow;
  if (!_sw || !isFinite(_sw.kp) || _sw.kp < 5) return;
  const _utcL = String(_sw.label).padStart(2,'0');
  const _kyivL = String(((parseInt(_sw.label,10) + kyivOffsetHoursIntAt(new Date())) % 24 + 24) % 24).padStart(2,'0');

  // 1. heroActionCmd
  try {
    const _ac = document.getElementById('heroActionCmd');
    if (_ac) {
      const _t = (_ac.textContent || '').trim();
      const _isStormAware = _t.includes('буря Kp=') || _t.includes('АКТИВНА') || _t.includes('до ${');
      if (!_isStormAware && (
          _t.startsWith('Оперативно сприятливо; PDF reference') ||
          _t.startsWith('Оперативно помірно сприятливо; PDF reference'))) {
        const _etaStr43 = _sw.etaLabel || `~${_sw.hoursAhead}г`;
        _ac.textContent = _sw.active
          ? `Оперативно СТОП: буря Kp=${_sw.kp.toFixed(1)} активна — тільки рутина`
          : `Оперативно обережно: буря Kp=${_sw.kp.toFixed(1)} очікується ${_etaStr43} — до ${_utcL}:00 UTC`;
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.132','recoverable'); }

  // 2. heroDecisionDo
  try {
    const _doEl = document.getElementById('heroDecisionDo');
    if (_doEl) {
      const _t = (_doEl.textContent || '').trim();
      const _isStormAware = _t.includes('Діяти до') || _t.includes('АКТИВНА') || _t.includes('тільки рутина');
      if (!_isStormAware && (
          _t.includes('Можна діяти активно') ||
          _t.includes('Рухайтесь у важливих справах') ||
          _t === '—' || _t === '')) {
        _doEl.textContent = _sw.active
          ? `✖ Kp=${_sw.kp.toFixed(1)} АКТИВНА — тільки рутина`
          : `✔ Діяти до ${_utcL}:00 UTC (${_kyivL}:00 Київ)`;
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.133','recoverable'); }

  // 3. heroMainDrag
  try {
    const _hm = document.getElementById('heroMainDrag');
    if (_hm) {
      const _t = (_hm.textContent || '').trim();
      const _isStormAware = _t.includes('UTC') && (_t.includes('рутина') || _t.includes('АКТИВНА'));
      if (!_isStormAware && (!_t || _t.includes('Фон підтримує') || _t.includes('Найкраще вікно') || _t === '—')) {
        _hm.textContent = _sw.active
          ? `Буря активна — тільки рутина, без нових рішень.`
          : `До ${_utcL}:00 UTC — можна; після — рутина.`;
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.134','recoverable'); }

  // 4. decisionTimingList — replace "Немає даних" with storm fallback
  //    fp38: ONLY if _daySlots is still empty. If populated → let normal render handle it.
  try {
    const _dtl = document.getElementById('decisionTimingList');
    const _slotsReady = Array.isArray(window._daySlots) && window._daySlots.length > 0;
    if (_dtl && _dtl.textContent && _dtl.textContent.includes('Немає даних') && !_slotsReady) {
      // fp37: shorter labels for dt-time column (min-width:110px)
      _dtl.innerHTML = `
        <div class="dt-row dt-good dt-now"><span class="dt-time">Зараз</span><span class="dt-label">можна — до ${_utcL}:00 UTC ◀</span></div>
        <div class="dt-row dt-bad" style="opacity:.85"><span class="dt-time">До ${_utcL}:00 UTC</span><span class="dt-label">закрити важливе</span></div>
        <div class="dt-row dt-bad" style="opacity:.72"><span class="dt-time">Після ${_utcL}:00</span><span class="dt-label">тільки рутина</span></div>
        <div style="color:var(--faint);font-size:10px;margin-top:4px">⚡ Storm — Kp=${_sw.kp.toFixed(1)} о ${_utcL}:00 UTC (${_kyivL}:00 Київ). Слоти підтягуються…</div>
      `;
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.135','recoverable'); }

  // 5. timingRows — replace "Прогноз Kp-слотів недоступний" with storm info
  //    fp38: ONLY if _daySlots is still empty. If populated → let _renderHeroTimeWindows render real slots.
  try {
    const _tr = document.getElementById('timingRows');
    const _slotsReady = Array.isArray(window._daySlots) && window._daySlots.length > 0;
    if (_tr && _tr.textContent &&
        (_tr.textContent.includes('недоступний') || _tr.textContent.includes('Прогноз Kp')) &&
        !_slotsReady) {
      // fp37: shorter
      _tr.innerHTML = `<span style="color:#ffd2a0;font-size:11px">⚡ Слоти підтягуються. Буря Kp=${_sw.kp.toFixed(1)} о ${_utcL}:00 UTC (${_kyivL}:00 Київ)</span>`;
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.136','recoverable'); }

  // 6. fp36: heroDecisionAvoid storm-aware
  try {
    const _avEl = document.getElementById('heroDecisionAvoid');
    if (_avEl) {
      const _t = (_avEl.textContent || '').trim();
      if (_t.startsWith('○ Підтримуйте темп') || _t.startsWith('○ Без розпорошення') || _t === '—' || _t === '') {
        // fp44: active storm → full block message
        _avEl.textContent = _sw.active
          ? `✖ Kp=${_sw.kp.toFixed(1)} активна — не починати нічого нового`
          : `✖ Не починати нове після ${_utcL}:00 UTC`;
      }
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.137','recoverable'); }
}/* NR_FN_END 237 */

/* NR_FN_BEGIN 247 */function _applyCurrentSlotAuthority_v889218(opKey, kp){
  let intradayGuard = null;
  let guardedKey = opKey;
  let dynamicGuard = null;
  if(isFinite(kp) && Number(kp) >= 5){
    guardedKey = _moreRestrictiveState_v88825(guardedKey, 'tense');
    dynamicGuard = 'kp_storm';
  } else if(isFinite(kp) && Number(kp) >= 4){
    guardedKey = _moreRestrictiveState_v88825(guardedKey, 'unstable');
    dynamicGuard = 'kp_elevated';
  }
  try { intradayGuard = _computeCurrentSlotDecision(); } catch(_e) { globalThis.NRDiagnostics?.record('catch.162','recoverable');  intradayGuard = null; }
  if(intradayGuard?.blockedNow){
    const isStorm = intradayGuard.reasonsNow?.includes('storm');
    guardedKey = _moreRestrictiveState_v88825(guardedKey, isStorm ? 'tense' : 'unstable');
    if(dynamicGuard !== 'kp_storm') dynamicGuard = isStorm ? 'current_storm' : 'current_window';
  }
  return { opKey: guardedKey, intradayGuard, dynamicGuard };
}/* NR_FN_END 247 */

/* NR_FN_BEGIN 248 */function resolveHeroSignalHierarchy_v88824(liveG, kp){
  // Compatibility facade only: one canonical authority computes the current
  // operational state. Legacy consumers keep their field names without a
  // second implementation of the resolver.
  const sig = resolveDaySignal_v88825(todayKyivStr(), liveG, kp, {isToday:true});
  if(!sig) return null;
  return Object.assign({}, sig, {
    liveG: sig.operationalRawG,
    commandG: sig.repG
  });
}/* NR_FN_END 248 */

/* NR_FN_BEGIN 251 */function resolveDaySignal_v88825(dateObj, rawG, kp, opts){
  const isToday = !!(opts && opts.isToday);
  let entry = null;
  try { if(typeof getEngineScore === 'function') entry = getEngineScore(dateObj); } catch(e) { globalThis.NRDiagnostics?.record('catch.164','recoverable');  entry = null; }
  const hasEngine = !!(entry && typeof entry.eng === 'number' && Number.isFinite(entry.eng));
  const referenceStale = !!(hasEngine && entry._expertOverrideVerified !== true && window.__referenceSourceState?.stale === true);
  const dstCurrent = !isToday || !window._lastDst || _dstProvenanceCheck().ok;
  const solarPair = sunRiseSetUTC_Meeus(new Date(dateObj), _userLat, _userLon);
  const solarAvailable = Number.isFinite(solarPair.sunrise.getTime()) && Number.isFinite(solarPair.sunset.getTime());
  const rawAvailable = solarAvailable && (Number.isFinite(_finiteFormulaNumber(rawG)) || (isToday && Number.isFinite(_finiteFormulaNumber(window.__uiState?.gNow))));
  const decisionAvailable = hasEngine && !referenceStale && dstCurrent && rawAvailable && Number.isFinite(kpDayTerm(kp)) && (!isToday || currentKpAuthority().usable);
  let dayScore = hasEngine ? Number(entry.eng) : (isFinite(rawG) ? Number(rawG) : NaN);
  const sourceDayScore = dayScore;
  // Every "today" consumer must use the same current live G as Hero. The
  // caller's G_day remains available for audit, but cannot create a milder
  // operational verdict in the 3-day/27-day cards for the same moment.
  const operationalRawG = isToday && Number.isFinite(_finiteFormulaNumber(window.__uiState?.gNow))
    ? Number(window.__uiState.gNow) : Number(rawG);
  const liveKey = isFinite(operationalRawG) ? classifyStateByG(operationalRawG, kp) : 'neutral';
  const hasUnverifiedOverride = !!(entry && entry._expertOverrideAvailable && entry._expertOverrideVerified === false && isFinite(entry._expertEngCandidate));
  const sourceDelta = hasUnverifiedOverride ? Math.abs(Number(entry._expertEngCandidate) - Number(entry._engRaw ?? entry.eng)) : 0;
  let guard = 'none';
  if(hasUnverifiedOverride && sourceDelta >= 3){ dayScore = 0; guard = 'unverified_override_large_delta'; }
  const baseDayScore = dayScore;
  let dynamicGuard = null;
  // fp323: Kp is an activity-specific safety advisory, not a second day model.
  // Never rewrite the canonical PDF/Engine day verdict because of Kp.
  if(isFinite(kp) && kp >= 5){
    dynamicGuard = 'kp_storm';
  } else if(isFinite(kp) && kp >= 4){
    dynamicGuard = 'kp_elevated';
  }
  const dayKey = isFinite(dayScore) ? _engineScoreToStateKey_v88824(dayScore, kp) : liveKey;
  let opKey = dayKey || liveKey;
  const materialConflict = !!(hasEngine && isFinite(operationalRawG) && (
    (dayScore >= 1 && operationalRawG <= -0.5) ||
    (dayScore <= -1 && operationalRawG >= 0.5) ||
    Math.abs(dayScore - operationalRawG) >= 2.5
  ));
  if(isToday && hasEngine && dayScore >= 2){
    if(liveKey === 'tense') { opKey = 'tense'; guard = 'live_tense'; }
    else if(liveKey === 'unstable') { opKey = 'unstable'; guard = 'live_unstable'; }
  }
  if(guard === 'unverified_override_large_delta'){
    if(isToday && (liveKey === 'tense' || liveKey === 'unstable')) opKey = 'unstable';
    else opKey = 'neutral';
  } else if(hasEngine && dayScore <= -2) { opKey = 'tense'; guard = guard === 'none' ? 'day_negative' : guard; }
  if(materialConflict && guard === 'none'){
    opKey = _moreRestrictiveState_v88825(dayKey, liveKey);
    if(opKey === 'neutral') opKey = 'unstable';
    guard = 'model_conflict';
  }
  // Kp is preserved as its own measured/forecast input, but an operational
  // recommendation must fail closed when the safety layer is elevated.
  if(dynamicGuard === 'kp_storm') opKey = _moreRestrictiveState_v88825(opKey, 'tense');
  else if(dynamicGuard === 'kp_elevated') opKey = _moreRestrictiveState_v88825(opKey, 'unstable');
  let intradayGuard = null;
  if(isToday){
    const currentAuthority = _applyCurrentSlotAuthority_v889218(opKey, kp);
    opKey = currentAuthority.opKey;
    intradayGuard = currentAuthority.intradayGuard;
    if(currentAuthority.dynamicGuard && dynamicGuard !== 'kp_storm') dynamicGuard = currentAuthority.dynamicGuard;
  }
  const keyForColor = opKey || liveKey;
  const repG = _stateKeyToRepresentativeG_v88824(keyForColor);
  const operationalScore = _operationalScoreFromState_v88825(keyForColor);
  const daySign = hasEngine ? (dayScore >= 0 ? '+' : '') : '';
  const liveTxt = isFinite(operationalRawG) ? `G ${operationalRawG >= 0 ? '+' : ''}${operationalRawG.toFixed(1)}` : 'G —';
  const src = entry?._expertOverride ? 'PDF override' : (hasEngine ? 'Engine' : 'Live G');
  const raw = (entry?._expertOverride && isFinite(entry?._engRaw)) ? ` · raw ${entry._engRaw >= 0 ? '+' : ''}${entry._engRaw}` : '';
  let title, action, recommendation;
  if(decisionAvailable){
    if(guard === 'unverified_override_large_delta'){
      title = 'джерело не підтверджене';
      action = 'працюємо обережно до перевірки PDF#48';
      recommendation = { text:'Не запускати нове: потрібна перевірка джерела PDF#48', style:'color: var(--warn);font-weight:800' };
    } else if(dynamicGuard === 'kp_storm' || dynamicGuard === 'current_storm') {
      title = 'оперативно СТОП · Kp≥5';
      action = 'буревий safety-контур блокує нові ризикові дії';
      recommendation = { text:'Тільки необхідна рутина; перевірити зв’язок, GPS і актуальний Kp', style:'color: var(--bad);font-weight:800' };
    } else if(dynamicGuard === 'current_window') {
      const names = intradayGuard?.reasonsNow?.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+') || 'часове вікно';
      const until = intradayGuard?.blockedUntilH != null ? ` до ${_fmtKyivFromUTCFloat(intradayGuard.blockedUntilH)}` : '';
      title = `оперативно ${operationalScore} · лише рутина зараз`;
      action = `${names}${until} блокує нові починання; денний reference показано окремо`;
      recommendation = { text:`Не починати нових справ${until}; виконуйте лише звичні задачі`, style:'color: var(--warn);font-weight:800' };
    } else if(dynamicGuard === 'kp_elevated') {
      title = 'оперативно обережно · Kp≥4';
      action = 'підвищена геомагнітна активність';
      recommendation = { text:'Тільки перевірені дії; без критичних запусків', style:'color: var(--warn);font-weight:800' };
    } else if(guard === 'model_conflict') {
      title = `КОНФЛІКТ МОДЕЛЕЙ · оперативно ${operationalScore>=0?'+':''}${operationalScore}`;
      action = 'PDF/Engine і raw-фон суттєво розходяться';
      recommendation = { text:'Не трактувати позитивний PDF як дозвіл; перевірити джерела й діяти за обережнішим сигналом', style:'color: var(--warn);font-weight:800' };
    } else if(isToday && dayScore >= 2 && guard === 'live_tense') {
      title = `оперативно ${operationalScore} · зараз СТОП`;
      action = `PDF/Engine reference ${daySign}${dayScore}, але поточний фон блокує ризик`;
      recommendation = { text:'Тримати тільки звичні задачі; нові рішення відкласти', style:'color: var(--warn);font-weight:700' };
    } else if(isToday && dayScore >= 2 && guard === 'live_unstable') {
      title = `оперативно ${operationalScore} · лише рутина`;
      action = `PDF/Engine reference ${daySign}${dayScore}; без форсування`;
      recommendation = { text:'Працювати обережно: перевірені дії, без нових стартів', style:'color: var(--warn);font-weight:700' };
    } else if(dayScore >= 2) {
      title = `день ${daySign}${dayScore} · сприятливо`;
      action = 'сильне вікно дня';
      recommendation = { text:'Можна планові активні дії', style:'color:var(--ok);font-weight:700' };
    } else if(dayScore === 1) {
      title = 'день +1 · помірно сприятливо';
      action = 'планове можна';
      recommendation = { text:'Планові дії, без зайвого ризику', style:'color:#9cd49c;font-weight:700' };
    } else if(dayScore === 0) {
      title = 'день 0 · нейтрально';
      action = 'стандартний режим';
      recommendation = { text:'Стандартні задачі', style:'color:var(--muted);font-weight:700' };
    } else if(dayScore === -1) {
      title = 'день -1 · обережно';
      action = 'мінімізувати ризики';
      recommendation = { text:'Перевірки, рутина, без імпульсивних рішень', style:'color: var(--warn);font-weight:700' };
    } else {
      title = `день ${daySign}${dayScore} · уникати`;
      action = 'несприятливий денний прогноз';
      recommendation = { text:'Уникати важливих рішень і запусків', style:'color: var(--bad);font-weight:800' };
    }
  } else {
    title = 'денне рішення недоступне';
    action = 'raw/live-контекст показано лише довідково';
    recommendation = (dynamicGuard === 'kp_storm' || dynamicGuard === 'kp_elevated' || liveKey === 'tense' || liveKey === 'unstable')
      ? { text:'Обережний режим за safety-контекстом; позитивні дії не дозволені без Engine/PDF', style:'color: var(--warn);font-weight:800' }
      : { text:'Не використовувати raw/live-фон як дозвіл на дію', style:'color: var(--muted);font-weight:800' };
  }
  const color = ({favorable:'#2bd47d',good:'#2bd47d',neutral:'#9bb1dc',unstable:'#ffaa33',tense:'#ff6b6b'})[keyForColor] || '#9bb1dc';
  const tooltip = !dstCurrent ? 'Dst не підтверджений за часом або якістю. Рішення сьогодні недоступне до оновлення даних.'
    : !solarAvailable ? 'Місцевий схід/захід Сонця недоступний. Сонячні інтервали й оперативне рішення не визначаються.'
    : (!rawAvailable || !Number.isFinite(kpDayTerm(kp))) ? 'Kp або G відсутній чи невалідний. Оперативне рішення недоступне.'
    : hasEngine
    ? (referenceStale
        ? `Денний Engine/PDF reference прострочений (${window.__referenceSourceState?.reason || 'stale'}). Оперативне рішення недоступне; raw/live-контекст не є дозволом.`
        : guard === 'unverified_override_large_delta'
        ? `Непідтверджене джерело: PDF48 candidate=${entry._expertEngCandidate >= 0 ? '+' : ''}${entry._expertEngCandidate}, raw engine=${(entry._engRaw ?? entry.eng) >= 0 ? '+' : ''}${entry._engRaw ?? entry.eng}.
${entry._overrideSourceReason || ''}
Live-контур зараз: ${liveTxt}.`
        : `Довідковий денний сигнал: ${daySign}${dayScore} (${src}${raw}).
Live-контур зараз: ${liveTxt}.
Оперативний стан: ${operationalScore>=0?'+':''}${operationalScore} (${keyForColor}).
${guard !== 'none' || dynamicGuard ? 'Застосовано обережніший safety-контур; PDF/Engine не є дозволом на дію.' : 'Сигнали узгоджені.'}${dynamicGuard === 'current_window' ? '\nПоточне часове вето: нові починання заблоковано до завершення активного вікна.' : ''}`)
    : `Денного Engine/PDF score немає. Показано Live G: ${liveTxt}.`;
  const actionPolicy = !decisionAvailable ? (!dstCurrent ? 'dst_unavailable' : (!rawAvailable || !Number.isFinite(kpDayTerm(kp))) ? 'input_unavailable' : referenceStale ? 'reference_stale' : 'reference_unavailable') : (intradayGuard?.blockedNow ? 'routine_only' : 'resolved_day_policy');
  return { entry, hasEngine, referenceStale, decisionAvailable, sourceDayScore, baseDayScore, dayScore, referenceScore:hasEngine?dayScore:undefined, operationalRawG, rawG, operationalScore, decisionScore:decisionAvailable?operationalScore:undefined, intradayGuard, actionPolicy, dayKey, liveKey, opKey, guard, dynamicGuard, materialConflict, repG, title, action, recommendation, color, tooltip, src, hasUnverifiedOverride, sourceDelta };
}/* NR_FN_END 251 */

/* NR_FN_BEGIN 258 */function classifyVerdict7Class(g){
  if (!isFinite(g)) return null;
  // Round до найближчого integer (continuous G → 7-class). Engine_scores використовує
  // strict thresholds; UI continuous → simple round.
  const sc = Math.max(-3, Math.min(3, Math.round(g)));
  return { score: sc, ...VERDICT_7CLASS[String(sc)] };
}/* NR_FN_END 258 */

/* NR_FN_BEGIN 259 */function resolveDecisionByG(g, kp) {
  // v88.7+: optional kp triggers storm-aware gating in classifyStateByG.
  // Backward-compatible: existing callsites без kp працюють як раніше.
  const stKey = classifyStateByG(g, kp);
  const st = GLOBAL_STATES[stKey] || GLOBAL_STATES.neutral;
  // PDF/Engine ≤ -2 noteText override (fp13 DD)
  let _noteText = st.impact || '';
  if (stKey === 'favorable' || stKey === 'good' || stKey === 'neutral') {
    try {
      const _eTd = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      const _eTdS = (_eTd && isFinite(_eTd.eng)) ? Number(_eTd.eng) : null;
      if (_eTdS !== null && _eTdS <= -2) {
        _noteText = `Live-фон зараз ${stKey === 'neutral' ? 'рівний' : 'позитивний'}, але PDF/Engine для дня = ${_eTdS} (критичний). Важливі рішення відкласти; live-вікна — тільки для рутини й перевірених дій.`;
      } else if (_eTdS !== null && _eTdS === -1 && (stKey === 'favorable' || stKey === 'good')) {
        _noteText = `Live-фон зараз позитивний, але PDF/Engine для дня = -1 (помірно несприятливий). Для важливих рішень — додаткова обережність.`;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.188','recoverable'); }
  }
  return {
    mode: stKey === 'favorable' || stKey === 'good' ? 'action'
        : stKey === 'tense' || stKey === 'unstable' ? 'risk'
        : 'neutral',
    stKey,
    title: st.headline || st.verdict || st.label || '',
    doText: st.doText || '',
    avoidText: st.avoidText || '',
    noteText: _noteText,
    cmd: st.cmd || ''
  };
}/* NR_FN_END 259 */
