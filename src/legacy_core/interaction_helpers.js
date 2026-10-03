/* NR_FN_BEGIN 000 */async function updatePushButtonState(){
  const btn=document.getElementById('pushBtn');
  if(!btn) return;
  btn.style.transition='background .2s ease,border-color .2s ease,color .2s ease';
  if(!PUSH.isSupported()){
    btn.textContent='🔕';
    btn.title='Web Push не підтримується цим браузером';
    btn.style.background='var(--border)';
    btn.style.color='var(--muted)';
    return;
  }
  if(Notification.permission==='denied'){
    btn.textContent='🔕';
    btn.title='Сповіщення заблоковані у налаштуваннях браузера';
    btn.style.background='rgba(255,107,107,.16)';
    btn.style.borderColor='rgba(255,107,107,.55)';
    btn.style.color='#ff9f9f';
    return;
  }
  let subscribed=false;
  try{subscribed=await PUSH.isSubscribed();}catch(_e){ window.NRDiagnostics?.record('legacy.catch.49','recoverable'); }
  if(subscribed){
    btn.textContent='🔔 ✓';
    btn.title='Web Push увімкнено на цьому пристрої';
    btn.style.background='rgba(43,212,125,.18)';
    btn.style.borderColor='rgba(43,212,125,.55)';
    btn.style.color='var(--ok)';
  }else{
    btn.textContent='🔔';
    btn.title='Увімкнути Web Push';
    btn.style.background='var(--border)';
    btn.style.borderColor='var(--border2)';
    btn.style.color='var(--muted)';
  }
}/* NR_FN_END 000 */

/* NR_FN_BEGIN 002 */function calendarAdvisoryText(day){
  if(!day) return '';
  const parts = [];
  if(day.high_risk && day.high_risk.length) parts.push('high risk: '+day.high_risk.join(', '));
  if(day.caution && day.caution.length) parts.push('caution: '+day.caution.join(', '));
  if(day.support && day.support.length) parts.push('support: '+day.support.join(', '));
  return parts.join('; ');
}/* NR_FN_END 002 */

/* NR_FN_BEGIN 003 */function vaisnavaIcsUrl(year){
  // Київ (Kiev) + дубль Дніпро (Dnepropetrovsk) як запасний — беремо обидва
  return [
    `https://www.vaisnavacalendar.info/ICS/${year}/Kiev%20%5BUkraine%5D-a${year}-ICS.ics`,
    `https://www.vaisnavacalendar.info/ICS/${year}/Dnepropetrovsk%20%5BUkraine%5D-a${year}-ICS.ics`
  ];
}/* NR_FN_END 003 */

/* NR_FN_BEGIN 004 */function readCachedGeo(){
  const rawLat=lsGet('last_geo_lat',''),rawLon=lsGet('last_geo_lon','');
  if(String(rawLat).trim()===''||String(rawLon).trim()==='')return null;
  const lat=Number(rawLat),lon=Number(rawLon);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
}/* NR_FN_END 004 */

/* NR_FN_BEGIN 005 */function refreshGeoDependents(){
  _lastPanchCtx=null;
  window.__p3RahuCache=null;
  try{_sunRiseSetCache.clear();renderPanchanga(new Date());}catch(e){ globalThis.NRDiagnostics?.record('catch.36','recoverable'); if(window._DEBUG)console.warn('[geo] render:',e.message);}
  try{syncHero();}catch(_e){ window.NRDiagnostics?.record('legacy.catch.50','recoverable'); }
  window.dispatchEvent(new Event('gindex:location-changed'));
}/* NR_FN_END 005 */

/* NR_FN_BEGIN 006 */function initGeolocation(){
  if(!navigator.geolocation){initCachedGeolocation();return;}
  try{navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
    _userLat=lat;_userLon=lon;_geoSource='device';
    lsSet('last_geo_lat',String(lat));lsSet('last_geo_lon',String(lon));
    _updateHoraCoordLabel();refreshGeoDependents();
  },()=>{initCachedGeolocation();refreshGeoDependents();},{timeout:5000,maximumAge:0});
  }catch(_e){ globalThis.NRDiagnostics?.record('catch.37','recoverable'); initCachedGeolocation();}
}/* NR_FN_END 006 */

/* NR_FN_BEGIN 007 */function initCachedGeolocation(){
  const cached=readCachedGeo();
  _userLat=cached?cached.lat:50.45;_userLon=cached?cached.lon:30.52;
  _geoSource=cached?'saved':'default';
  _updateHoraCoordLabel();
}/* NR_FN_END 007 */

/* NR_FN_BEGIN 008 */function _updateHoraCoordLabel(){
  const el = document.getElementById('horaCoordLabel');
  if(!el) return;
  const off = -new Date().getTimezoneOffset();
  const sign = off>=0 ? '+' : '-';
  const hh = Math.floor(Math.abs(off)/60);
  const mm = Math.abs(off)%60;
  const offStr = mm===0 ? `UTC${sign}${hh}` : `UTC${sign}${hh}:${String(mm).padStart(2,'0')}`;
  const ns = _userLat>=0 ? 'N' : 'S';
  const iana = (window._iana && window._iana !== 'UTC') ? `${window._iana}, ` : '';
  el.textContent = `(${iana}${offStr}, ${Math.abs(_userLat).toFixed(2)}°${ns}, ${_userLon.toFixed(2)}° · ${_geoSource==='saved'?'збережені координати':_geoSource==='device'?'координати пристрою':'Київ за замовчуванням'})`;
}/* NR_FN_END 008 */

/* NR_FN_BEGIN 009 */function _kyivFallbackOffsetHours(date){
  const d = (date instanceof Date && !isNaN(date)) ? date : new Date();
  const year = d.getUTCFullYear();
  const lastSundayUtc = (month) => {
    const end = new Date(Date.UTC(year, month + 1, 0, 1, 0, 0));
    end.setUTCDate(end.getUTCDate() - end.getUTCDay());
    return end.getTime();
  };
  // Europe/Kyiv follows the European transition instants: 01:00 UTC on the
  // last Sunday of March and October. This branch is used only without IANA.
  return d.getTime() >= lastSundayUtc(2) && d.getTime() < lastSundayUtc(9) ? 3 : 2;
}/* NR_FN_END 009 */

/* NR_FN_BEGIN 010 */function kyivOffsetHoursAt(date){
  try {
    const d = (date instanceof Date && !isNaN(date)) ? date : new Date();
    const _parts = window.NRPresentation.dateFormatter('en-US', {
      timeZone: 'Europe/Kyiv', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(d).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
    const _asUTC = Date.UTC(+_parts.year, +_parts.month - 1, +_parts.day, +_parts.hour, +_parts.minute, +_parts.second);
    return (_asUTC - d.getTime()) / 3600000;
  } catch(e) { globalThis.NRDiagnostics?.record('catch.40','recoverable');  return _kyivFallbackOffsetHours(date); }
}/* NR_FN_END 010 */

/* NR_FN_BEGIN 011 */function kyivOffsetHoursIntAt(date){ return Math.round(kyivOffsetHoursAt(date)); }/* NR_FN_END 011 */

/* NR_FN_BEGIN 012 */function utcHHMMToKyiv(utcStr, refDate){
  const parts = String(utcStr || '').split(':').map(Number);
  if (!isFinite(parts[0])) return utcStr;
  const h = parts[0] + (parts[1] || 0) / 60;
  const off = kyivOffsetHoursAt(refDate || new Date());
  const local = ((h + off) % 24 + 24) % 24;
  const hh = Math.floor(local);
  let mm = Math.round((local - hh) * 60);
  if (mm === 60) mm = 0;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}/* NR_FN_END 012 */

/* NR_FN_BEGIN 013 */function tzOffsetLabel(d){
  const m = -d.getTimezoneOffset();
  const sign = m>=0 ? '+' : '-';
  const hh = Math.floor(Math.abs(m)/60);
  const mm = Math.abs(m)%60;
  return `UTC${sign}${pad(hh)}:${pad(mm)}`;
}/* NR_FN_END 013 */

/* NR_FN_BEGIN 014 */function ianaTzLabel(d){
  const iana = window._iana || 'UTC';
  return iana === 'UTC' ? tzOffsetLabel(d) : `${iana} (${tzOffsetLabel(d)})`;
}/* NR_FN_END 014 */

/* NR_FN_BEGIN 015 */function fmtLocal(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} (${tzOffsetLabel(d)})`;
}/* NR_FN_END 015 */

/* NR_FN_BEGIN 016 */function fmtUTC(d){
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} (UTC)`;
}/* NR_FN_END 016 */

/* NR_FN_BEGIN 017 */function todayKyivStr(){
  try {
    return window.NRPresentation.dateFormatter('en-CA', { timeZone: 'Europe/Kyiv',
      year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch(e) { globalThis.NRDiagnostics?.record('catch.41','recoverable');
    const now = new Date();
    return fmtDate(new Date(now.getTime() + _kyivFallbackOffsetHours(now) * 3600000));
  }
}/* NR_FN_END 017 */

/* NR_FN_BEGIN 018 */function kyivDayDate(offsetDays=0){
  const d = new Date(todayKyivStr()+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+Number(offsetDays||0));
  return d;
}/* NR_FN_END 018 */

/* NR_FN_BEGIN 019 */function kyivDayKey(offsetDays=0){
  return kyivDayDate(offsetDays).toISOString().slice(0,10);
}/* NR_FN_END 019 */

/* NR_FN_BEGIN 023 */function _sjcSunrise(jd){ return (jd - 2451545.0) / 36525.0; }/* NR_FN_END 023 */

/* NR_FN_BEGIN 026 */function _eccentricityEarthOrbit(t){ return 0.016708634 - t*(0.000042037 + 0.0000001267*t); }/* NR_FN_END 026 */

/* NR_FN_BEGIN 029 */function _obliquityCorrectionSunrise(t){
  const sec = 21.448 - t*(46.8150 + t*(0.00059 - t*0.001813));
  const e0 = 23.0 + (26.0 + sec/60.0)/60.0;
  const omega = 125.04 - 1934.136*t;
  return e0 + 0.00256*Math.cos(omega*Math.PI/180);
}/* NR_FN_END 029 */

/* NR_FN_BEGIN 031 */function _equationOfTimeMinSunrise(t){
  const epsilon = _obliquityCorrectionSunrise(t) * Math.PI/180;
  const l0 = _sunGeomMeanLongitude(t) * Math.PI/180;
  const e = _eccentricityEarthOrbit(t);
  const m = _sunGeomMeanAnomaly(t) * Math.PI/180;
  let y = Math.tan(epsilon/2.0); y *= y;
  const Etime = y*Math.sin(2*l0) - 2*e*Math.sin(m) + 4*e*y*Math.sin(m)*Math.cos(2*l0) - 0.5*y*y*Math.sin(4*l0) - 1.25*e*e*Math.sin(2*m);
  return Etime * 180/Math.PI * 4;
}/* NR_FN_END 031 */

/* NR_FN_BEGIN 032 */function _hourAngleSunriseDeg(latDeg, solarDecDeg){
  const lat = latDeg*Math.PI/180, dec = solarDecDeg*Math.PI/180;
  const zenith = 90.833*Math.PI/180; // рефракція атмосфери + видимий радіус Сонця
  const arg = Math.cos(zenith)/(Math.cos(lat)*Math.cos(dec)) - Math.tan(lat)*Math.tan(dec);
  // No horizon crossing during polar day/night. Clamping invents an event.
  if(!Number.isFinite(arg) || arg < -1 || arg > 1) return NaN;
  return Math.acos(arg) * 180/Math.PI;
}/* NR_FN_END 032 */

/* NR_FN_BEGIN 035 */function toggleSciMore() {
  // v88.8.35-fp56-P8: now also toggles .sci-expanded on #scienceBar to reveal the secondary
  // metrics (Lᵢ/Mᵢ/eᵢ/Pᵢ/Dᵢ/Dst) that are hidden by default for a cleaner first paint.
  // The legacy #sciMorePanel toggle is preserved for backward compatibility.
  const bar = document.getElementById('scienceBar');
  const toggle = document.getElementById('sciMoreToggle');
  const panel  = document.getElementById('sciMorePanel');
  if (!toggle) return;
  const willOpen = bar ? !bar.classList.contains('sci-expanded') : (panel && panel.style.display !== 'block');
  if (bar) bar.classList.toggle('sci-expanded', willOpen);
  if (panel) panel.style.display = willOpen ? 'block' : 'none';
  toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false'); // v88.8.35-fp56-P8 a11y
  toggle.textContent = willOpen ? '▴ згорнути' : '▸ детально';
}/* NR_FN_END 035 */

/* NR_FN_BEGIN 036 */function setStamp(){
  const now = new Date();
  el('stamp').textContent  = 'Оновлено: ' + fmtLocal(now);
  el('localNow').textContent = fmtLocal(now);
  el('utcNow').textContent   = fmtUTC(now);
}/* NR_FN_END 036 */

/* NR_FN_BEGIN 037 */function invalidateFutureKp(){_futureKp=null;_futureKpMeta=null;_futureKpEpoch++;_futureKpLoad=null;}/* NR_FN_END 037 */

/* NR_FN_BEGIN 054 */function _strictDayScore(value){
  if(typeof value!=='number' && typeof value!=='string')return null;
  if(typeof value==='string' && !value.trim())return null;
  const n=Number(value);
  return Number.isInteger(n) && n>=-3 && n<=3 ? n : null;
}/* NR_FN_END 054 */

/* NR_FN_BEGIN 055 */function _publishExpertOverrides(){
  // Explicit file decisions have deterministic precedence, independent of arrival order.
  _expertOverrides=Object.freeze(Object.fromEntries(Object.entries({..._registryOverrides,..._fileOverrides}).map(([date,row])=>[date,Object.freeze({...row})])));
  window._expertOverrides=_expertOverrides;
}/* NR_FN_END 055 */

/* NR_FN_BEGIN 056 */async function _readOverrideDocument(token){
  const batch=_authorityBatch;
  if(batch?.overrideDocument)return batch.overrideDocument;
  const request=(async()=>{
    let response,delivery='network_fresh';
    try{
      response=await token.fetch('expert_overrides_v3.json?fresh='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      if(response.headers?.get('x-gindex-delivery')==='cached')delivery='offline_fallback';
    }catch(e){ globalThis.NRDiagnostics?.record('catch.51','recoverable');
      if(!token.current())throw e;
      response=await token.fetch('expert_overrides_v3.json',{cache:'force-cache'});
      delivery='offline_fallback';
    }
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(!Array.isArray(data?.overrides))throw new Error('invalid overrides');
    return {data,delivery};
  })();
  if(batch)batch.overrideDocument=request;
  return request;
}/* NR_FN_END 056 */

/* NR_FN_BEGIN 061 */function nrDataStatusLabel(health, raw, offline, now=Date.now()){
  if(offline)return {label:'ДАНІ З КЕШУ',state:'offline'};
  if(!health||health.schema!=='gindex_system_health_v1'||!Array.isArray(health.hard_failures))
    return {label:'СТАН НЕ ПІДТВЕРДЖЕНО',state:'unknown'};
  if(health.status==='FAIL'||health.hard_failures.length)
    return {label:'ЗБІЙ ОНОВЛЕННЯ',state:'error'};
  const stamp=health.generated_at,manifestAge=health.checks?.manifest_age_hours;
  const explicitZone=typeof stamp==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(stamp);
  const age=explicitZone?(now-Date.parse(stamp))/36e5:NaN;
  if(!Number.isFinite(age)||age< -5/60||age>7||typeof manifestAge!=='number'||!Number.isFinite(manifestAge)||manifestAge<0||manifestAge>36)
    return {label:'СТАН НЕ ПІДТВЕРДЖЕНО',state:'stale'};
  if(!currentKpAuthority().usable)return {label:'Kp НЕДОСТУПНИЙ',state:'unavailable'};
  if(currentKpAuthority().provisional)return {label:'Kp ОЦІНКА NOAA',state:'estimated'};
  if(health.checks?.last_completed_live_context_ok===false)return {label:'ЗБІЙ ОНОВЛЕННЯ КОНТЕКСТУ',state:'warning'};
  if(health.status==='WARN')return {label:'Є ПОПЕРЕДЖЕННЯ',state:'warning'};
  if(health.status!=='PASS')return {label:'СТАН НЕ ПІДТВЕРДЖЕНО',state:'unknown'};
  return /\bLIVE\b/i.test(raw)?{label:'LIVE-ФОН ОНОВЛЕНО',state:'live'}:{label:raw,state:'unknown'};
}/* NR_FN_END 061 */

/* NR_FN_BEGIN 068 */async function checkDataManifest(){
  // v88.9.6x-fp249 FIX-CRITICAL (аудит fp248): раніше day-rollover перевірявся
  // ДО `if (!m) return`, але саме скидання кешів було ПІСЛЯ нього — тому якщо
  // manifest недоступний РІВНО в момент переходу доби (мережа, CDN затримка),
  // повний reload не спрацьовував ВЗАГАЛІ, а не просто відкладався до
  // наступного тіку. Тепер: day-rollover обробляється ПЕРШИМ і БЕЗУМОВНО,
  // manifest — лише для гранулярної інвалідації окремих файлів (другорядно).
  const todayK = todayKyivStr();
  const _dayChanged = _lastSeenKyivDateForManifest !== null && _lastSeenKyivDateForManifest !== todayK;
  _lastSeenKyivDateForManifest = todayK;

  const _changed = [];
  if (_dayChanged) {
    _expertOverrides = null; _expertCalc = null; invalidateFutureKp(); _dailyMaster = null;
    _changed.push('day_rollover');
  }

  let m = null;
  try {
    // v88.9.6x-fp249: cache:'no-store' (не 'default') — манфест сам є "чи є
    // зміни" сигналом, тому браузерний HTTP-кеш не повинен обслуговувати
    // застарілу відповідь ДО того, як SW взагалі побачить запит.
    const resp = await fetch('data_manifest.json', { cache: 'no-store' });
    if (resp.ok) m = await resp.json();
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.60','recoverable'); }

  if (m) {
    if (!_dayChanged && _lastManifest) {
      if (m.expert_overrides !== _lastManifest.expert_overrides) { _expertOverrides = null; _changed.push('expert_overrides'); }
      if (m.expert_calc !== _lastManifest.expert_calc) { _expertCalc = null; _changed.push('expert_calc'); }
      if (m.future_kp !== _lastManifest.future_kp) { invalidateFutureKp(); _changed.push('future_kp'); }
    }
    // v88.9.6x-fp249: engine_scores.json ЗАФРОЗЖЕНИЙ на час V3 freeze — сюди
    // НЕ додаємо auto-reload (freeze-інваріант: md5 не повинен змінюватись).
    // Лише інформаційне попередження, якщо manifest раптом бачить іншу версію,
    // ніж очікувана — сигнал про можливий незапланований дрейф frozen-файлу.
    if (m.engine_scores && _lastManifest && _lastManifest.engine_scores &&
        m.engine_scores !== _lastManifest.engine_scores) {
      console.warn('[fp249] engine_scores.json version changed during V3 freeze — це НЕ мало статись:', _lastManifest.engine_scores, '→', m.engine_scores);
    }
    _lastManifest = m;
  }

  if (!_changed.length) return;

  if (window._DEBUG) console.log('[fp246/249] manifest change:', _changed.join(', '), '— перезавантажую...');
  try { await loadExpertOverrides(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.61','recoverable'); }
  try { await loadExpertCalc(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.62','recoverable'); }
  try { await loadFutureKp(); window.dispatchEvent(new Event('engine-data-ready')); } catch(e){ window.NRDiagnostics?.record('legacy.catch.63','recoverable'); }
  // v88.9.13-fp194 патерн: той самий рендер-ланцюжок, що й одноразовий boot-
  // завантажувач нижче — тепер повторюваний на кожну зміну manifest, не лише раз.
  try { if (typeof syncV702UI === 'function') syncV702UI(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.64','recoverable'); }
  try { if (typeof _renderHeroHierarchy === 'function') _renderHeroHierarchy(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.65','recoverable'); }
  try { if (typeof renderHeroBulletin === 'function') renderHeroBulletin(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.66','recoverable'); }

  // fp310: atomic horizon refresh.
  // New verified PDF decisions used to refresh Hero only. The already-rendered
  // 3-day cards, week summary and 27-day decision rail kept their old Engine
  // values until F5, producing visible cross-horizon contradictions.
  // Re-render every decision consumer from the same freshly loaded resolver.
  try {
    if (typeof render3Day === 'function' && typeof last3D !== 'undefined' &&
        last3D && Array.isArray(last3D.days) && last3D.days.length) {
      render3Day(last3D);
    }
  } catch(e) { globalThis.NRDiagnostics?.record('catch.63','recoverable');  console.warn('[fp310 horizon refresh: 3-day]', e); }
  try {
    if (typeof renderWeekSummary === 'function') renderWeekSummary();
  } catch(e) { globalThis.NRDiagnostics?.record('catch.64','recoverable');  console.warn('[fp310 horizon refresh: week]', e); }
  try {
    if (typeof render27Day === 'function' && typeof _last27Rows !== 'undefined' &&
        Array.isArray(_last27Rows) && _last27Rows.length) {
      render27Day(_last27Rows, (typeof last3D !== 'undefined' ? last3D : null));
    }
  } catch(e) { globalThis.NRDiagnostics?.record('catch.65','recoverable');  console.warn('[fp310 horizon refresh: 27-day]', e); }
}/* NR_FN_END 068 */

/* NR_FN_BEGIN 077 */function _applyV186Patches(snapshot) {
  if (!snapshot || typeof snapshot.eng !== 'number') return snapshot;
  if (snapshot._expertOverride) return snapshot;

  const tag = (snapshot.tag || '').trim();
  const cal_symbols = snapshot.cal_symbols || [];
  const cal_tithi = snapshot.cal_tithi;
  const kp = snapshot.kp;
  let patched = snapshot.eng;
  const patches = [];

  // P2 BROAD (v18.8): '✈' emoji boost
  // Strong form (Подорожі + ✈) → max(eng, +2)
  // Light form (✈ alone або "подорожі✈" lowercase) → +1 boost
  if (tag.includes('✈')) {
    if (tag.includes('Подорожі')) {
      const newVal = Math.max(patched, 2);
      if (newVal !== patched) {
        patched = newVal;
        patches.push('P2_travel_strong');
      }
    } else {
      patched = patched + 1;
      patches.push('P2_travel_emoji');
    }
  }

  // P3 BROAD (v18.8): Dashami → +1 (BOTH Shukla 10 AND Krishna 25)
  // Both halves have same "Пурна" character per Posibnyk Tаблиця 1.
  if ((cal_tithi === 10 || cal_tithi === 25)
      && !cal_symbols.includes('bolt')
      && !cal_symbols.includes('amavasya')) {
    patched = patched + 1;
    patches.push('P3_dashami_boost');
  }

  // P4 (v18.7 retained): empty + saturn_retro + Kp≥4 → -3
  if (!tag
      && cal_symbols.includes('saturn_retro')
      && typeof kp === 'number'
      && kp >= 4) {
    patched = -3;
    patches.push('P4_saturn_storm_neg');
  }

  // P1d (v18.7 retained): empty + eng=+2 → +1 (точкова exact)
  if (!tag && snapshot.eng === 2 && patches.indexOf('P4_saturn_storm_neg') < 0) {
    patched = 1;
    patches.push('P1d_empty_eng2_demote');
  }

  // P-v19-5: panchanga sign prior — коли patched==0, застосувати tithi/nak пріор.
  // GT-валідовано: +1.3pp на n=350. Nak пріоритет над tithi.
  if (patched === 0) {
    const _nak = snapshot.cal_nakshatra;
    const _tit = cal_tithi;
    const NAK_PRIOR = {18: -1, 20: -1};
    const TITHI_PRIOR = {8: -1, 12: 1, 14: -1, 17: 1, 18: -1, 23: -1, 26: -1, 29: -1};
    let _prior = null;
    if (_nak != null && NAK_PRIOR[_nak] !== undefined) _prior = NAK_PRIOR[_nak];
    else if (_tit != null && TITHI_PRIOR[_tit] !== undefined) _prior = TITHI_PRIOR[_tit];
    if (_prior !== null) {
      patched = _prior;
      patches.push('Pv195_panchanga_prior');
    }
  }

  // Clip to 7-class [-3, +3]
  patched = Math.max(-3, Math.min(3, patched));

  if (patches.length === 0) return snapshot;
  return {
    ...snapshot,
    _engV185Raw: snapshot.eng,
    eng: patched,
    _v186Patches: patches,
    _engineVersion: 'v18.5', // canonical frozen; v18.8 patches disabled during V3 freeze
  };
}/* NR_FN_END 077 */

/* NR_FN_BEGIN 078 */function getEngineScore(dateObj){
  const ds = fmtDate(dateObj);
  // v88.9.34-fp215 FIX-CRITICAL (аудит-раунд-5, Problem 5/6): раніше PDF
  // override застосовувався ЛИШЕ якщо (a) _engineScores взагалі завантажився
  // і (b) для цієї дати вже існував snapshot у ньому. Тобто verified
  // експертний вердикт — незалежна, людиною підтверджена сутність — міг
  // мовчки зникнути через технічний збій завантаження engine_scores.json,
  // відсутність дати в ±16-денному вікні loader'а тощо. Тепер override
  // перевіряється НЕЗАЛЕЖНО від стану _engineScores; якщо snapshot відсутній,
  // будується мінімальний synthetic snapshot лише з override-даних.
  if(!_engineScores || !_engineScores[ds]){
    if(_expertOverrides && _expertOverrides[ds]){
      const ovr = _expertOverrides[ds];
      const _hashOk = /^sha256:[0-9a-f]{16,64}$/i.test(String(ovr.snippet_hash || ''));
      const _sourceShaOk = /^[0-9a-f]{64}$/i.test(String(ovr.source_sha256 || ''));
      const _pdfReadingOk = ovr.verified_by_pdf_reading === true
        && ((typeof ovr.snippet === 'string' && ovr.snippet.length > 0) || _sourceShaOk);
      const _isVerified = ovr.verified === true
        && typeof ovr.source_pdf === 'string' && ovr.source_pdf.length > 0
        && (_hashOk || _pdfReadingOk);
      if(_isVerified){
        return {
          eng: ovr.expert_eng,
          pdf: ovr.expert_eng,
          tag: '',
          kp_synthetic: false,
          _engineDataMissing: true, // v88.9.34-fp215: явний прапор — це НЕ engine snapshot
          _expertOverride: true,
          _expertOverrideVerified: true,
          _expertEngCandidate: ovr.expert_eng,
          _overrideCategory: ovr.category || 'manual_expert_override',
          _overrideAppliedIn: ovr.applied_in || ovr.source_pdf || ovr.source || '',
          // v88.9.43-fp225 FIX (doc15, Problem 6): раніше причина верифікації
          // завжди писалась як "verified_with_source_pdf_and_snippet_hash" —
          // навіть коли _hashOk=false і override пройшов ЛИШЕ через
          // verified_by_pdf_reading (без реального хешу). Це перебільшувало
          // криптографічну доказовість джерела (аудит цілком слушно це зауважив:
          // формат sha256:... перевіряється, але не реальний digest тексту PDF —
          // цього ми тут і не стверджуємо, лише позначаємо, ЯКИЙ шлях спрацював).
          _overrideSourceReason: (_hashOk && _pdfReadingOk) ? 'hash_format_gate_and_manual_pdf_reading'
                               : _hashOk ? 'hash_format_gate'
                               : 'manual_pdf_reading',
          _overrideSnippetHash: ovr.snippet_hash || null,
          _overrideSourcePdf: ovr.source_pdf || ovr.source || null,
          _overrideSourcePage: ovr.source_page || null
        };
      }
    }
    if(!_engineScores) return null;
  }
  let snapshot = _engineScores[ds] || null;
  // v88.8.35: single source of truth.
  // Якщо запис існує в expert_overrides_v3.json — він і є verified verdict дня.
  // Frozen raw eng зберігаємо в _engRaw для audit і tooltip explanations.
  if(snapshot && _expertOverrides && _expertOverrides[ds]){
    const ovr = _expertOverrides[ds];
    // v88.8.35-fp22-C13: snippet_hash формат sha256:hex(16-64) — це перевірка ФОРМАТУ
    // поля, НЕ перерахунок SHA256 від тексту PDF (крипто-верифікації контенту нема).
    // Реальна гарантія коректності — людина, що ставить verified:true, звірила з PDF
    // сама. fp200: перейменовано з "verified" на чесніше "gate_passed" у внутрішніх
    // полях нижче, щоб не створювати оманливе відчуття автоматичної крипто-перевірки.
    const _hashOk = /^sha256:[0-9a-f]{16,64}$/i.test(String(ovr.snippet_hash || ''));
    // fp307: newer revision-aware imports store the full PDF SHA-256 rather
    // than a text snippet hash. Manual PDF verification + a valid source
    // digest is an equally strong provenance path and must not fall through
    // to the frozen Engine score (29.07.2026 was PDF 0 but showed Engine -2).
    const _sourceShaOk = /^[0-9a-f]{64}$/i.test(String(ovr.source_sha256 || ''));
    const _pdfReadingOk = ovr.verified_by_pdf_reading === true
      && ((typeof ovr.snippet === 'string' && ovr.snippet.length > 0) || _sourceShaOk);
    const _isVerified = ovr.verified === true
      && typeof ovr.source_pdf === 'string' && ovr.source_pdf.length > 0
      && (_hashOk || _pdfReadingOk);
    snapshot = {
      ...snapshot,
      _engRaw: snapshot.eng,
      _expertOverrideAvailable: true,
      _expertOverrideVerified: _isVerified,
      _expertEngCandidate: ovr.expert_eng,
      _overrideCategory: ovr.category || 'manual_expert_override',
      _overrideAppliedIn: ovr.applied_in || ovr.source_pdf || ovr.source || '',
      // v88.9.43-fp225 FIX (doc15, Problem 6): та сама заміна, що і в
      // fallback-гілці вище — реальний метод верифікації, не перебільшена
      // "hash"-формула для записів, що пройшли лише через pdf_reading.
      _overrideSourceReason: !_isVerified ? 'candidate_override_unverified'
        : (_hashOk && _pdfReadingOk) ? 'hash_format_gate_and_manual_pdf_reading'
        : _hashOk ? 'hash_format_gate'
        : 'manual_pdf_reading',
      _overrideSnippetHash: ovr.snippet_hash || null,
      _overrideSourcePdf: ovr.source_pdf || ovr.source || null,
      _overrideSourcePage: ovr.source_page || null
    };
    // ВЕРИФІКОВАНИЙ → повний override eng/pdf і виставляємо _expertOverride для downstream gates.
    // НЕВЕРИФІКОВАНИЙ → НЕ переписуємо eng/pdf; зберігаємо як candidate у _expertEngCandidate.
    //   resolveHeroSignalHierarchy_v88824 і renderDecisionLayer бачать що override unverified
    //   і не застосовують hard-cap, лише soft-warning.
    if (_isVerified) {
      snapshot.eng = ovr.expert_eng;
      snapshot.pdf = ovr.expert_eng;
      snapshot._expertOverride = true;
    } else {
      // candidate-only: видно у audit панелі, але не блокує live decision rails
      snapshot._expertOverride = false;
      snapshot._expertOverrideCandidate = true;
    }
  }
  // fp196: expert_calc middle-priority layer (audit 2026-07-15).
  // Застосовується ТІЛЬКИ якщо немає verified expert_override (він вищий).
  // Read-time, frozen engine_scores.json НЕ модифікується.
  if(snapshot && !snapshot._expertOverride && _expertCalc && _expertCalc[ds]
     && Number.isFinite(_expertCalc[ds].score)){
    snapshot = {
      ...snapshot,
      _engRawPreCalc: snapshot.eng,
      eng: _expertCalc[ds].score,
      pdf: (snapshot.pdf === null || snapshot.pdf === undefined) ? _expertCalc[ds].score : snapshot.pdf,
      _expertCalcApplied: true,
      _expertCalcRawSum: _expertCalc[ds].raw_sum
    };
  }
  // fp197 REVERTED (fp200, 2026-07-16): "Сурья-solo correction" видалено.
  // Причина: базувався на сирій адитивній таблиці ваг (ШКАЛА), яку той самий
  // аудит уже показав ГІРШОЮ за rule-tree на holdout (40-48% vs 51-66%).
  // Реальний PDF-бюлетень (_13_7-26_7_ПРОГНОЗ.pdf, наданий Kyrylo) підтверджує
  // 16.07.2026 = "Особливо несприятливий день" = -3, ЗБІГАЄТЬСЯ з frozen
  // engine (-3), а не з -2 як хибно "виправляв" fp197. Урок: не патчити
  // rule-tree на основі відхиленої гіпотези без свіжої перевірки джерелом.
  // v88.8.18: v18.8 patches (after expert override check — не зачіпає overrides)
  // FP74-FREEZE: _applyV186Patches() disabled — read-time scoring change violates V3 freeze.
  // Canonical: engine_scores.json v18.5, N=272, 70.6% strict / 43.0% exact.
  // V18.8 patches = V19 candidate after freeze ends ~2026-08-01.
  // snapshot = _applyV186Patches(snapshot); // DISABLED
  // v88.7 (deep audit 2026-04-30): lite-recalc DEACTIVATED.
  // Reason: round(Hero G) gives 47% accuracy (PCL_CALIBRATION_REPORT.md);
  // original snapshot gives 75.0% strict on holdout (n=56, v5.1). Recalc погіршує якість.
  // Натомість: показуємо snapshot eng + marker "Kp estimated" коли live Kp != snapshot Kp.
  // Це чесніше: snapshot — validated tag-based engine v18.5, recalc — ні.
  // Guard the frozen model's legacy invalid-Kp -> quiet fallback at the read boundary.
  // Independent verified PDF / Excel references do not depend on this Kp input.
  if(snapshot && !snapshot._expertOverrideVerified && !snapshot._expertCalcApplied && !Number.isFinite(kpDayTerm(Object.prototype.hasOwnProperty.call(snapshot,'_frozenInputKp') ? snapshot._frozenInputKp : snapshot.kp))) return null;
  if(snapshot && snapshot.kp_synthetic === true && typeof last3D !== 'undefined' && last3D && Array.isArray(last3D.days)){
    try {
      const liveDay = last3D.days.find(d => fmtDate(d.date) === ds);
      if(liveDay && isFinite(liveDay.kpMax) && liveDay.kpMax > 0
         && liveDay._filledFrom !== 'synthetic-kp-now'){
        // НЕ recalculate — повертаємо snapshot з marker для UI
        return {
          ...snapshot,
          _kpOutdated: true,        // marker: snapshot Kp != live Kp
          _liveKp: liveDay.kpMax,   // для tooltip
          // eng і kp_synthetic не міняємо — це validated tag-based score
        };
      }
    } catch(e) { globalThis.NRDiagnostics?.record('catch.74','recoverable');  if(window._DEBUG) console.warn('[v88.7 outdated marker]', e.message); }
  }
  return snapshot;
}/* NR_FN_END 078 */

/* NR_FN_BEGIN 080 */function formatCalSymbols(symbols){
  if(!Array.isArray(symbols) || !symbols.length) return '—';
  return symbols.map(s => {
    const d = CAL_SYMBOL_DISPLAY[s];
    return d ? `${d.icon} ${d.name}` : s;
  }).join(', ');
}/* NR_FN_END 080 */

/* NR_FN_BEGIN 082 */function forecastConfidence(entry){
  if(!entry) return { level:'NONE', note:'' };
  const eng = entry.eng;
  const tag = (entry.tag || '').trim();
  const nTags = tag ? tag.split(/\s+/).filter(Boolean).length : 0;
  // v88.8.41-fp105: ВИПРАВЛЕНО Audit β (run_candidate_tests.py, canonical n=313).
  // Старе твердження "WEAK ≈13% strict" було НЕВІРНЕ — фактичний hit rate=59.3%,
  // різниця +46pp. WEAK bucket насправді працює майже як MED (69.3%), не як шум.
  // Monotonicity LOW(29%)<WEAK(59%)<MED(69%)<HIGH(88%) підтверджена — ranking
  // правильний, тільки конкретні числа в тексті були помилкові.
  if(Math.abs(eng) === 2) return { level:'WEAK', note:'Клас ±2: ~59% strict (canonical n=313, Audit β 2026-06-30). Помірний directional сигнал, не ігнорувати повністю.' };
  if(eng === 3 || eng === -3) return { level:'HIGH', note:'±3 = найнадійніший: ~88% strict (canonical n=313).' };
  if(nTags === 0) return { level:'LOW', note:'0 тегів — engine Kp-only: ~29% strict (canonical n=313). Ігнорувати.' };
  if(eng === 0) return { level:'LOW', note:'Нейтральний: ~29% strict (canonical n=313). Ігнорувати.' };
  if(eng === 1 || eng === -1) return { level:'MED', note:'±1 = directional: ~69% strict (canonical n=313).' };
  return { level:'MED', note:'' };
}/* NR_FN_END 082 */

/* NR_FN_BEGIN 084 */function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}/* NR_FN_END 084 */

/* NR_FN_BEGIN 085 */function toJD(date){ return date.getTime()/86400000 + 2440587.5; }/* NR_FN_END 085 */

/* NR_FN_BEGIN 088 */function phaseNameByAngle(deg){
  // Прив'язка до тітхі: кожна тітхі = 12°, 30 тітхі = 360°
  // Purnima = tithiIdx 14 (0-based) = 168–180°; Amavasya = idx 29 = 348–360°
  const a = (deg + 360) % 360;
  const tIdx = Math.min(29, Math.floor(a / 12)); // 0-based tithi index
  if (tIdx === 29 || a >= 354)  return 'Амавасья';        // ~360°/0°
  if (tIdx === 0)               return 'Молодик';          // 0–12°
  if (tIdx <= 6)                return 'Зростаючий серп';  // 12–84°
  if (tIdx <= 7)                return 'Перша чверть';     // 84–96°
  if (tIdx <= 12)               return 'Зростаючий опуклий'; // 96–156°
  if (tIdx === 13)              return 'Чатурдаші (передповня)'; // 156–168°
  if (tIdx === 14)              return 'Пурніма (Повня)';  // 168–180°
  if (tIdx <= 21)               return 'Спадний опуклий';  // 180–264°
  if (tIdx === 22)              return 'Остання чверть';   // 264–276°
  if (tIdx <= 27)               return 'Серп, що спадає'; // 276–336°
  return 'Чатурдаші (передновоління)';                     // 336–348°
}/* NR_FN_END 088 */

/* NR_FN_BEGIN 089 */function indexBuiltinEvents(){
  let count = 0;
  for(const ev of BUILTIN_VAISNAVA){
    const hit = classifyEvent(ev.s);
    if(!hit) continue;
    const key = ev.d;
    const rec = {name: hit.name, weight: hit.weight, source: 'builtin', raw: ev.s};
    if(!eventIndex.has(key)) eventIndex.set(key, [rec]);
    else {
      const arr = eventIndex.get(key);
      if(!arr.some(x => x.name === rec.name)) arr.push(rec);
    }
    count++;
  }
  if(window._DEBUG) console.log(`[v30] Builtin indexed: ${count} classified events from ${BUILTIN_VAISNAVA.length} total`);
}/* NR_FN_END 089 */

/* NR_FN_BEGIN 091 */function withTimeout(work,ms,label){
  const controller=new AbortController();let timer;
  const promise=typeof work==='function'?Promise.resolve().then(()=>work(controller.signal)):work;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
    controller.abort();if(typeof promise?.cancel==='function')promise.cancel();
    reject(new Error('[deadline] '+(label||'')+' >'+ms+'ms'));
  },ms);});
  return Promise.race([promise,deadline]).finally(()=>clearTimeout(timer));
}/* NR_FN_END 091 */

/* NR_FN_BEGIN 094 */function _looksLikeJson(txt){ const t = String(txt).trim(); return t.length>1 && (t[0]==='[' || t[0]==='{'); }/* NR_FN_END 094 */

/* NR_FN_BEGIN 095 */function unfoldIcs(text){
  const lines = text.split(/\r?\n/);
  const out = [];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(i>0 && (line.startsWith(' ') || line.startsWith('\t'))){
      out[out.length-1] += line.slice(1);
    }else{
      out.push(line);
    }
  }
  return out;
}/* NR_FN_END 095 */

/* NR_FN_BEGIN 097 */function expandDateRangeUTC(dtStart, dtEnd){
  if(!dtStart) return [];
  const s = startUTC(dtStart);
  let last = s;
  if(dtEnd){
    const e = startUTC(dtEnd);
    last = new Date(e.getTime() - 86400000);
    if(last < s) last = s;
  }
  const out=[];
  for(let d=new Date(s); d<=last; d=addDays(d,1)) out.push(new Date(d));
  return out;
}/* NR_FN_END 097 */

/* NR_FN_BEGIN 099 */function normalizeDiacritics(s){
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
}/* NR_FN_END 099 */

/* NR_FN_BEGIN 100 */function classifyEvent(summary){
  const raw = summary || '';
  const s = normalizeDiacritics(raw);
  for(const p of EVENT_PATTERNS){
    if(p.re.test(s)){
      const name = p.name;
      const w = WEIGHT_E_EVENTS[name] ?? 0;
      return {name, weight:w, raw};
    }
  }
  return null;
}/* NR_FN_END 100 */

/* NR_FN_BEGIN 101 */async function indexIcsEventsForYears(years){
  // v88.8.62-fp138: ONLINE ICS вимкнено за замовчуванням.
  // Причина: public ICS/CORS endpoints (vaisnavacalendar/calendarlabs/proxies) дають 403/pending
  // і створюють видиме "зависання" першого рендера, хоча builtin calendar уже покриває 2026-2027.
  // Для ручного R&D-оновлення можна увімкнути ?onlineics=1.
  indexBuiltinEvents();
  try {
    const _qs = new URLSearchParams(location.search || '');
    if (_qs.get('onlineics') !== '1') return;
  } catch(_e) { globalThis.NRDiagnostics?.record('catch.78','recoverable');  return; }

  const urls = [];
  for(const y of years){
    urls.push(...vaisnavaIcsUrl(y));
  }
  urls.push(ICS_HINDU_HOLIDAYS);

  const settled = await Promise.allSettled(urls.map(u => fetchTextWithCORS(u)));
  for(const st of settled){
    if(st.status!=='fulfilled') continue;
    try{
      const items = parseICS(st.value);
      for(const it of items){
        const hit = classifyEvent(it.summary);
        if(!hit) continue;
        const key = it.date;
        const rec = {name: hit.name, weight: hit.weight, source: 'ICS', raw: it.summary};
        if(!eventIndex.has(key)) eventIndex.set(key, [rec]);
        else {
          const arr = eventIndex.get(key);
          if(!arr.some(x=>x.name===rec.name)) arr.push(rec);
        }
      }
    }catch(e){ window.NRDiagnostics?.record('legacy.catch.72','recoverable'); }
  }
}/* NR_FN_END 101 */

/* NR_FN_BEGIN 106 */function nearestPhysicalPlanetPair(dateUTC){
  if(!window.Astronomy || typeof Astronomy.GeoVector!=='function' || typeof Astronomy.AngleBetween!=='function') return null;
  const vectors = ASTRO_PLANETS.map(([body,ua])=>({body,ua,vec:Astronomy.GeoVector(body,dateUTC,true)}));
  let best = null;
  for(let i=0;i<vectors.length;i++) for(let j=i+1;j<vectors.length;j++){
    const angle = Astronomy.AngleBetween(vectors[i].vec, vectors[j].vec);
    if(isFinite(angle) && (!best || angle<best.angle)) best={a:vectors[i],b:vectors[j],angle};
  }
  if(!best) return null;
  try{
    const later = new Date(dateUTC.getTime()+6*3600000);
    const va = Astronomy.GeoVector(best.a.body,later,true);
    const vb = Astronomy.GeoVector(best.b.body,later,true);
    const laterAngle = Astronomy.AngleBetween(va,vb);
    best.motion = isFinite(laterAngle) ? (laterAngle < best.angle-0.02 ? 'зближуються' : laterAngle > best.angle+0.02 ? 'розходяться' : 'майже без зміни') : 'рух не визначено';
  }catch(_e){ globalThis.NRDiagnostics?.record('catch.82','recoverable');  best.motion='рух не визначено'; }
  return best;
}/* NR_FN_END 106 */

/* NR_FN_BEGIN 107 */function nextMorningPlanetParade(dateUTC){
  if(!window.Astronomy || typeof Astronomy.Observer!=='function' ||
     typeof Astronomy.Equator!=='function' || typeof Astronomy.Horizon!=='function') return null;
  const observer = new Astronomy.Observer(_userLat, _userLon, 0);
  let day = new Date(Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate(),0,0,0));
  let sun = _calcSunRiseSet(day);
  let observeAt = sun && sun.sunrise ? new Date(sun.sunrise.getTime()-60*60000) : null;
  if(!observeAt || observeAt.getTime()<dateUTC.getTime()-15*60000){
    day = addDays(day,1);
    sun = _calcSunRiseSet(day);
    observeAt = sun && sun.sunrise ? new Date(sun.sunrise.getTime()-60*60000) : null;
  }
  if(!observeAt || !sun || !sun.sunrise) return null;
  const paradeDay = fmtDate(observeAt);
  const event = PLANET_PARADE_WINDOWS.find(e=>paradeDay>=e.start&&paradeDay<=e.end) || null;
  const selected = event ? ASTRO_PLANETS.filter(([body])=>event.bodies.includes(body)) : ASTRO_PLANETS;
  const positions = selected.map(([body,ua])=>{
    const eq = Astronomy.Equator(body,observeAt,observer,true,true);
    const hor = Astronomy.Horizon(observeAt,observer,eq.ra,eq.dec,'normal');
    return {body,ua,alt:hor.altitude,az:hor.azimuth,optics:body==='Uranus'||body==='Neptune'};
  }).filter(p=>isFinite(p.alt)&&isFinite(p.az));
  const above = positions.filter(p=>p.alt>0).sort((a,b)=>a.az-b.az);
  return {observeAt,sunrise:sun.sunrise,positions,above,event};
}/* NR_FN_END 107 */

/* NR_FN_BEGIN 110 */function isSuryaSankranti(dateUTC){
  // v82b fix: always use midnight-to-midnight window regardless of input time
  const y = dateUTC.getUTCFullYear(), m = dateUTC.getUTCMonth(), d = dateUTC.getUTCDate();
  const d0 = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const jde0 = d0.getTime() / 86400000 + 2440587.5; // 00:00 UTC
  const jde1 = jde0 + 0.9993; // ~23:59 UTC
  function sunSidRashi(jde){
    const trop = calcSunLongitude(__nrUtcJdToTt(jde));
    const ayan = lahiriAyanamsha(__nrUtcJdToTt(jde));
    const sid = ((trop - ayan) % 360 + 360) % 360;
    return Math.floor(sid / 30);
  }
  return sunSidRashi(jde0) !== sunSidRashi(jde1);
}/* NR_FN_END 110 */

/* NR_FN_BEGIN 111 */function autoComputedExtras(dateUTC, kp=0){
  if(!isFinite(kp)) kp = 0;
  const t = approxTithiIndex(dateUTC);
  const extras = [];
  if(t === 1){
    extras.push({name:'1 місячний день', weight: WEIGHT_E_EVENTS['1 місячний день'], source:'auto', raw:'Pratipada (approx)'});
  }
  // TECH-2 (v70): Surya Sankranti — астрономічний розрахунок sidereal Lahiri
  // Синхронізовано з engine auto_tag_generator.py v1.1 (surya_sankranti тег)
  // Вага: WEIGHT_E_EVENTS['Сурья Санкранті Перехід Сонця із знаку в інший'] = -2
  if(isSuryaSankranti(dateUTC)){
    const sankKey = 'Сурья Санкранті Перехід Сонця із знаку в інший';
    extras.push({name: sankKey, weight: WEIGHT_E_EVENTS[sankKey], source:'auto', raw:'Sidereal Lahiri ingress (TECH-2)'});
  }
  // v30.1: Rikta tithi видалено з ei — тепер обробляється через часткові Tithi scores в Pi
  // Equinox windows (Russell-McPherron effect): 05 Mar–04 Apr, 07 Sep–07 Oct
  // v26.2: плавний перехід замість бінарного Kp≥5
  // Kp<3: 0 (RM не проявляється), Kp 3-5: -1 (попередження), Kp≥5: -2 (повний ефект)
  const mo = dateUTC.getUTCMonth()+1, da = dateUTC.getUTCDate();
  const inSpring = (mo===3 && da>=5) || (mo===4 && da<=4); // v37_12: R-M spec 05.03–04.04
  const inAutumn = (mo===9 && da>=7) || (mo===10 && da<=7); // v37_12: R-M spec 07.09–07.10
  if(inSpring || inAutumn){
    const rmWeight = (kp >= 5) ? WEIGHT_E_EVENTS['Рівнодення (Russell-McPherron)']
                   : (kp >= 3) ? -1
                   : 0;
    const rmRaw = kp >= 5 ? 'Equinox window + Kp≥5 (буря G1+)'
                : kp >= 3 ? `Equinox window + Kp=${kp.toFixed(1)} (попередження)`
                : `Equinox window (Kp=${kp.toFixed(1)}<3, інформаційно)`;
    if(rmWeight !== 0) extras.push({name:'Рівнодення (Russell-McPherron)', weight: rmWeight, source:'auto', raw: rmRaw});
  }
  return extras;
}/* NR_FN_END 111 */

/* NR_FN_BEGIN 113 */function getDynamicKpForDate_v889125(dateObj){
  const ds = fmtDate(dateObj);
  try {
    if(ds === todayKyivStr() && typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) return Number(lastWWV.kNow);
    const pools = [window._gIndex_last3D?.days, (typeof last3D !== 'undefined' && last3D) ? last3D.days : null];
    for(const pool of pools){
      if(!Array.isArray(pool)) continue;
      const hit = pool.find(x => x && x.date && fmtDate(x.date) === ds && isFinite(x.kpMax));
      if(hit) return Number(hit.kpMax);
    }
    if(Array.isArray(_27dComputed)){
      const hit27 = _27dComputed.find(x => x && x.ds === ds && isFinite(x.kpUsed));
      if(hit27) return Number(hit27.kpUsed);
    }
    const e = (typeof getEngineScore === 'function') ? getEngineScore(ds) : null;
    if(e && isFinite(e.kp)) return Number(e.kp);
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.73','recoverable'); }
  return NaN;
}/* NR_FN_END 113 */

/* NR_FN_BEGIN 126 */function classifyStorm(kpNow, dst, bz, vsw){
  if(!isFinite(kpNow)&&!isFinite(dst)&&!isFinite(bz)) return '\u2014';
  const badBz  = isFinite(bz)  && bz  <= -10;
  const badDst = isFinite(dst) && dst <= -50;
  const badKp  = isFinite(kpNow) && kpNow >= 5;
  const fastV  = isFinite(vsw) && vsw >= 600;
  if(badKp && badDst && badBz)   return '\u0421\u0438\u043b\u044c\u043d\u0430 \u0431\u0443\u0440\u044f (G2+ / Dst)';
  if(badKp && (badBz || fastV))  return '\u0411\u0443\u0440\u044f (G1\u2013G2)';
  if(badBz || fastV || badDst)   return '\u041f\u0456\u0434\u0432\u0438\u0449\u0435\u043d\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u0456\u0441\u0442\u044c';
  return '\u0421\u043f\u043e\u043a\u0456\u0439 / \u043f\u043e\u043c\u0456\u0440\u043d\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u0456\u0441\u0442\u044c';
}/* NR_FN_END 126 */

/* NR_FN_BEGIN 128 */function resolveDataMode(){
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if(!currentKpAuthority().usable)return 'offline';
  if(currentKpAuthority().provisional)return 'estimated';
  // Physical transport state outranks cached fetch timestamps. A recent cached
  // response must never be presented as LIVE after the browser goes offline.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  // Kp обсервації freshness — читаю той самий бейдж, що й heroFreshness
  const _fbTxt = (document.getElementById('freshnessBadge')?.textContent || 'LIVE').toLowerCase();
  let _kpFresh = 'live';
  if (_fbTxt.includes('offline') || _fbTxt.includes('old')) _kpFresh = 'offline';
  else if (_fbTxt.includes('stale')) _kpFresh = 'stale';
  else if (_fbTxt.includes('cache') || _fbTxt.includes('delayed')) _kpFresh = 'cached';

  // v88.8.18 ★ CONTENT-AGE DETECTION: fetch може бути 200 OK, але дата у відповіді
  // може бути 6+ тижнів старою (NOAA SWPC issue 2026-03-28). Додатковий check.
  try {
    const _src = window._kpSourceFreshness;
    if (_src && isFinite(_src.ageHours)) {
      if (_src.ageHours > 24 * 7)    _kpFresh = 'offline';  // > 1 тиждень
      else if (_src.ageHours > 24)   _kpFresh = 'stale';    // > 1 доба
      else if (_src.ageHours > 1)    _kpFresh = 'cached';   // > 1 година
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.77','recoverable'); }

  // Forecast synthetic flag — last3D._synthetic ставиться у renderQuick, коли NOAA 3-day упав
  let _fcastSynthetic = false;
  try { _fcastSynthetic = !!(typeof last3D !== 'undefined' && last3D && last3D._synthetic); } catch(e){ globalThis.NRDiagnostics?.record('catch.94','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // Логіка пріоритету: offline Kp > scenario forecast > partial freshness > live
  if (_kpFresh === 'offline') return 'offline';
  if (_fcastSynthetic) return 'scenario';
  if (_kpFresh === 'stale' || _kpFresh === 'cached') return 'partial';
  return 'live';
}/* NR_FN_END 128 */

/* NR_FN_BEGIN 129 */function resolveDataModeExtended(){
  // v88.9.52-fp234 FIX-CRITICAL (аудит-раунд-20, Problem 6): раніше ця функція
  // ВИВОДИЛА стан заново з last3D + ageHours, паралельно до canonical
  // window.__sourceState (fp222) і resolveSourceLabel() (fp227). Тому видимі
  // лейбли вже казали "OBSERVED · DELAYED", а прихована operational-логіка
  // (guard-правила, заголовки, window.__dataMode, Audit Card) продовжувала
  // працювати за старою класифікацією "estimated" — той самий клас
  // розсинхрону, що вже виправляли для DOM-writer'ів, але на рівні resolver'а.
  // Тепер canonical __sourceState — ПЕРШЕ джерело; власний вивід лишається
  // fallback-ом лише поки canonical ще не заповнений (до першого рендеру).
  try {
    const _ss = window.__sourceState;
    if (_ss && _ss.mode) {
      if (_ss.degraded === true) return 'partial';
      // Мапа МАЄ бути ідемпотентною: writer 4 (syncHero) записує РЕЗУЛЬТАТ
      // цієї функції назад у __sourceState.mode, тому власні вихідні значення
      // ('partial','live','estimated','scenario','offline') теж мусять бути
      // ключами — інакше другий виклик не знайде ключ, зісковзне у fallback,
      // і стан миготів би між двома класифікаціями.
      const _map = { live:'live', estimated:'estimated', delayed:'partial', stale:'partial',
                     old:'offline', offline:'offline', scenario:'scenario', degraded:'partial',
                     partial:'partial' };
      const _m = _map[_ss.mode];
      if (_m) return _m;
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.78','recoverable'); }
  const _base = resolveDataMode();
  if (_base === 'live' || _base === 'offline' || _base === 'scenario') return _base;
  // _base === 'partial' — розщеплюємо на 'estimated' vs 'partial':
  // - 'estimated' = forecast real (last3D not synthetic) AND content ≤ 12h
  // - 'partial'   = всі інші випадки stale/cached
  try {
    const _fcastSynth = !!(typeof last3D !== 'undefined' && last3D && last3D._synthetic);
    const _src = window._kpSourceFreshness;
    const _ageH = (_src && isFinite(_src.ageHours)) ? _src.ageHours : null;
    if (!_fcastSynth && _ageH !== null && _ageH <= 12) return 'estimated';
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.79','recoverable'); }
  return 'partial';
}/* NR_FN_END 129 */

/* NR_FN_BEGIN 131 */function _strictKpTimestamp(value){
  if(typeof value!=='string')return NaN;
  const m=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/i);
  if(!m)return NaN;
  const y=+m[1],mo=+m[2],day=+m[3],hh=+m[4],mm=+m[5],ss=+(m[6]||0);
  if(mo<1||mo>12||day<1||hh>23||mm>59||ss>59)return NaN;
  const calendar=new Date(0);calendar.setUTCFullYear(y,mo-1,day);calendar.setUTCHours(0,0,0,0);
  if(calendar.getUTCFullYear()!==y||calendar.getUTCMonth()!==mo-1||calendar.getUTCDate()!==day)return NaN;
  const zone=m[8]||'Z';
  if(zone!=='Z'&&zone!=='z'){
    const offset=zone.slice(1).replace(':','');
    if(+offset.slice(0,2)>23||+offset.slice(2)>59)return NaN;
  }
  return Date.parse(value.trim()+(m[8]?'':'Z'));
}/* NR_FN_END 131 */

/* NR_FN_BEGIN 132 */function _provisionalKpMedian(rows,now){
  if(!Array.isArray(rows))return null;
  const unique=new Map(),conflicts=new Set();
  for(const row of rows){
    const value=_finiteFormulaNumber(row?.estimated_kp);
    if(!Number.isFinite(value) || value<0 || value>9 || typeof row?.time_tag!=='string')continue;
    const ts=_strictKpTimestamp(row.time_tag),age=now-ts;
    if(!Number.isFinite(ts) || age < -5*60000 || age > 30*60000)continue;
    if(unique.has(ts) && unique.get(ts)!==value)conflicts.add(ts);
    else unique.set(ts,value);
  }
  const tail=[...unique].filter(([ts])=>!conflicts.has(ts)).sort((a,b)=>a[0]-b[0]).slice(-5);
  if(tail.length<3)return null;
  const values=tail.map(x=>x[1]).sort((a,b)=>a-b),ts=tail[tail.length-1][0];
  return {kp:values[Math.floor(values.length/2)],ts,ageHours:Math.max(0,(now-ts)/3600000),n:tail.length};
}/* NR_FN_END 132 */

/* NR_FN_BEGIN 133 */function _finiteFormulaNumber(value){
  if(typeof value !== 'number' && typeof value !== 'string') return NaN;
  if(typeof value === 'string' && value.trim() === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}/* NR_FN_END 133 */

/* NR_FN_BEGIN 134 */function kpDayTerm(kp){
  const k = _finiteFormulaNumber(kp);
  // fp412: missing Kp is not a real quiet observation.
  return (Number.isFinite(k) && k >= 0 && k <= 9) ? (2 - k) : NaN;
}/* NR_FN_END 134 */

/* NR_FN_BEGIN 138 */function kpBandLabel(k){
  const ki = Math.max(0, Math.min(9, Math.round(k)));
  if (ki <= 1) return 'Спокійно';
  if (ki <= 3) return 'Нестійкий';
  if (ki === 4) return 'Активний';
  const g = ki - 4;
  const names = ['','Мінорний','Помірний','Сильний','Дуже сильний','Екстремальний'];
  return `Шторм G${g} (${names[g]})`;
}/* NR_FN_END 138 */

/* NR_FN_BEGIN 139 */function kpTooltip(k){
  const v = Number(k);
  const here = kpBandLabel(v);
  return [
    `Ваше значення: Kp ${isFinite(v)? v.toFixed(2):'—'} → ${here}`,
    'Шкала Kp:',
    '• 0–1 — Спокійно',
    '• 2–3 — Нестійкий',
    '• 4 — Активний',
    '• 5 — Шторм G1 (мінорний)',
    '• 6 — Шторм G2 (помірний)',
    '• 7 — Шторм G3 (сильний)',
    '• 8 — Шторм G4 (дуже сильний)',
    '• 9 — Шторм G5 (екстремальний)'
  ].join('\n');
}/* NR_FN_END 139 */

/* NR_FN_BEGIN 140 */function apBandLabel(ap){
  const a = Number(ap);
  if (!isFinite(a)) return '—';
  if (a <= 7)   return 'Спокійно';
  if (a <= 15)  return 'Нестійкий';
  if (a <= 29)  return 'Активний';
  if (a <= 49)  return 'Шторм (мінорний, ~G1)';
  if (a <= 99)  return 'Шторм (мажорний, ~G2–G3)';
  return 'Шторм (сильний/екстремальний, ~G4–G5)';
}/* NR_FN_END 140 */

/* NR_FN_BEGIN 141 */function apTooltip(ap, isForecast=false){
  const a = Number(ap);
  const here = apBandLabel(a);
  const head = isForecast ? `Ваше значення: Прогноз Ap ${a} → ${here}` : `Ваше значення: Ap ${a} → ${here}`;
  return [
    head,
    'Шкала Ap (добовий):',
    '• 0–7 — Спокійно',
    '• 8–15 — Нестійкий',
    '• 16–29 — Активний',
    '• 30–49 — Шторм (мінорний, ~G1)',
    '• 50–99 — Шторм (мажорний, ~G2–G3)',
    '• ≥100 — Шторм (сильний/екстремальний, ~G4–G5)'
  ].join('\n');
}/* NR_FN_END 141 */

/* NR_FN_BEGIN 142 */function kpToApInterp(kp) {
  kp = _finiteFormulaNumber(kp);
  if (!isFinite(kp)) return NaN;
  kp = Math.max(0, Math.min(9, kp));
  for (let i = 0; i < GFZ_AP_TABLE.length - 1; i++) {
    const [kp0, ap0] = GFZ_AP_TABLE[i];
    const [kp1, ap1] = GFZ_AP_TABLE[i + 1];
    if (kp >= kp0 && kp <= kp1) {
      const frac = (kp - kp0) / (kp1 - kp0);
      return Math.round(ap0 + frac * (ap1 - ap0));
    }
  }
  return 400;
}/* NR_FN_END 142 */

/* NR_FN_BEGIN 143 */function gTooltipText(kLabel, kVal, aiObj){
  const kStr = isFinite(kVal) ? kVal.toFixed(2) : '—';
  const gStr = isFinite(kVal) ? (kpDayTerm(kVal) + aiObj.Ai).toFixed(2) : '—';
  return [
    `Формула: G = 2 − ${kLabel} + ΣAᵢ`,
    `${kLabel} = ${kStr}`,
    aiObj.explain,
    `Підсумок: 2 − ${kStr} + ${aiObj.Ai} = ${gStr}`
  ].join('\n');
}/* NR_FN_END 143 */

/* NR_FN_BEGIN 147 */function _looksLikeSilso(txt){
  const t=String(txt||'').trim();
  return _looksLikeJson(t) || /^\d{4}\s*;\s*\d{1,2}\s*;/m.test(t);
}/* NR_FN_END 147 */

/* NR_FN_BEGIN 151 */function uafTo3DayFormat(uaf){
  if(!uaf) return null;
  if(uaf.kp3Day && uaf.kp3Day.length){
    // Reuse the same UTC slot, range, completeness and linear-a rules.
    const out=parse3DaySafe(JSON.stringify(uaf.kp3Day.map(r=>({
      time_tag:r.time,kp:r.kp,observed:'predicted'
    }))));
    out._source='uaf-alaska';
    return out.days.length ? out : null;
  }
  if(!uaf.kp27Day || !uaf.kp27Day.length) return null;
  try{
    const today=todayKyivStr(),end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+2);
    const last=end.toISOString().slice(0,10);
    const days=uafTo27DayFormat(uaf).filter(r=>fmtDate(r.date)>=today && fmtDate(r.date)<=last)
      .sort((a,b)=>a.date-b.date).map(r=>({date:r.date,kp8:[],kpMax:r.kpMax,_filledFrom:'uaf-27d'}));
    if(!days.length) return null;
    // Daily maximum alone cannot determine the mean of eight linear a values.
    const out={issued:null,predictedAp:days.map(d=>({date:d.date,Ap:null})),days,_source:'uaf-alaska-27d'};
    _ensureThreeDays(out);return out;
  }catch(e){ globalThis.NRDiagnostics?.record('catch.104','recoverable'); return null;}
}/* NR_FN_END 151 */

/* NR_FN_BEGIN 152 */function uafTo27DayFormat(uaf){
  if(!uaf || !Array.isArray(uaf.kp27Day)) return [];
  return uaf.kp27Day.filter(r=>r && Number.isFinite(_finiteFormulaNumber(r.kp)) &&
    _finiteFormulaNumber(r.kp)>=0 && _finiteFormulaNumber(r.kp)<=9).map(r=>({
      date:r.date,flux:null,Ap:null,kpMax:_finiteFormulaNumber(r.kp),
      _apStatus:'unavailable_from_daily_kp_max'
    }));
}/* NR_FN_END 152 */

/* NR_FN_BEGIN 153 */function _ensureThreeDays(out){
  if(!out || !out.days || !Array.isArray(out.days)) return out;
  if(out.days.length >= 3) return out;
  if(out.days.length === 0) return out; // повний fail — обробляється synthetic fallback в loadAll
  try{
    const haveDates = new Set(out.days.map(d => fmtDate(d.date)));
    const todayD = new Date(todayKyivStr()+'T12:00:00Z'); todayD.setUTCHours(0,0,0,0);
    for(let off = 0; off < 3; off++){
      const target = new Date(todayD); target.setUTCDate(target.getUTCDate()+off);
      const targetStr = fmtDate(target);
      if(haveDates.has(targetStr)) continue;
      out.days.push({
        date: target,
        kp8: [],
        kpMax: NaN,
        _needsFill: true
      });
      if(out.predictedAp) out.predictedAp.push({date: target, Ap: null});
    }
    out.days.sort((a,b) => a.date - b.date);
    if(out.predictedAp) out.predictedAp.sort((a,b) => a.date - b.date);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.105','recoverable'); if(window._DEBUG)console.warn('[_ensureThreeDays]:',e.message)}
  return out;
}/* NR_FN_END 153 */

/* NR_FN_BEGIN 154 */function _fillPlaceholderDays(target3D, t27R){
  if(!target3D || !target3D.days) return;
  const _needsFillCount = target3D.days.filter(d => d._needsFill).length;
  if(_needsFillCount === 0) return;

  // Спроба 1: NOAA 27-day outlook
  if(t27R && t27R.status === 'fulfilled' && t27R.value){
    try{
      if(window._DEBUG) console.log('[v88.7.6 fill] '+_needsFillCount+' placeholder day(s) — filling з NOAA 27-day');
      const _r27 = parse27Day(t27R.value);
      if(_r27 && _r27.length){
        for(const d of target3D.days){
          if(!d._needsFill) continue;
          const targetStr = fmtDate(d.date);
          const r27Entry = _r27.find(r => fmtDate(r.date) === targetStr);
          if(r27Entry && isFinite(r27Entry.kpMax)){
            d.kp8 = Array(8).fill(r27Entry.kpMax);
            d.kpMax = r27Entry.kpMax;
            d._filledFrom = 'noaa-27d';
            delete d._needsFill;
            const apEntry = target3D.predictedAp.find(p => fmtDate(p.date) === targetStr);
            if(apEntry) apEntry.Ap = isFinite(r27Entry.Ap) ? r27Entry.Ap : kpToApInterp(r27Entry.kpMax);
            if(window._DEBUG) console.log('[v88.7.6 fill] '+targetStr+' з 27-day Kp='+r27Entry.kpMax);
          }
        }
      }
    }catch(fillErr){ globalThis.NRDiagnostics?.record('catch.106','recoverable');
      console.warn('[v88.7.6 fill] 27-day fill-up failed:', fillErr.message);
    }
  }

  // Спроба 2: synthetic Kp-now fallback (якщо 27-day теж не дав)
  const _stillNeedFill = target3D.days.filter(d => d._needsFill);
  if(_stillNeedFill.length > 0){
    const _authority = currentKpAuthority();
    if (!_authority.usable) return; // Keep missing data missing; no invented Kp=2.
    const _kpFallback = lastWWV.kNow;
    target3D._partialReal = true;
    for(const d of _stillNeedFill){
      d.kp8 = Array(8).fill(_kpFallback);
      d.kpMax = _kpFallback;
      d._filledFrom = 'synthetic-kp-now';
      d._synthetic = true;
      delete d._needsFill;
      const targetStr = fmtDate(d.date);
      const apEntry = target3D.predictedAp.find(p => fmtDate(p.date) === targetStr);
      if(apEntry) apEntry.Ap = kpToApInterp(_kpFallback);
      if(window._DEBUG) console.log('[v88.7.6 fill] synthetic '+targetStr+' Kp='+_kpFallback);
    }
  }
}/* NR_FN_END 154 */

/* NR_FN_BEGIN 156 */function _dstValid(v){ const n = _finiteFormulaNumber(v); return Number.isFinite(n) && Math.abs(n) < 1000 && n >= -600 && n <= 100; }/* NR_FN_END 156 */

/* NR_FN_BEGIN 157 */function _lastValidDst(rows, getVal){
  for(let i = rows.length - 1; i >= 0; i--){ const v = getVal(rows[i]); if(_dstValid(v)) return { dst: parseFloat(v), row: rows[i] }; }
  return null;
}/* NR_FN_END 157 */

/* NR_FN_BEGIN 159 */function _dstProvenanceCheck(){
  const d = window._lastDst;
  if (!d || !_dstValid(d.dst)) return { ok:false, reason:'Dst недоступний', ageHours:null };
  if (d._cached) return { ok:false, reason:'Dst із локального кешу (час невідомий)', ageHours:null };
  const t = _parseDstTimeToDate(d.time);
  if (!t) return { ok:false, reason:'Dst: час запису не розпізнано', ageHours:null };
  const ageH = (Date.now() - t.getTime()) / 3600000;
  if (ageH < -0.5) return { ok:false, reason:`Dst: час запису в майбутньому (${d.time})`, ageHours:ageH };
  if (ageH > 6) return { ok:false, reason:`Dst: запис застарілий (${ageH.toFixed(1)}г від Kyoto)`, ageHours:ageH };
  return { ok:true, reason:'', ageHours:ageH };
}/* NR_FN_END 159 */

/* NR_FN_BEGIN 162 */function apOnlyTo27Day(rows){
  // Daily mean Ap does not determine the maximum of eight Kp slots.
  return rows.map(r=>({date:r.date,flux:r.flux??null,Ap:r.Ap,kpMax:NaN,_kpStatus:'unavailable_from_daily_ap'}));
}/* NR_FN_END 162 */

/* NR_FN_BEGIN 164 */function build27dComputed(rows, last3D){
  // v88.8.34 MATH INVARIANT:
  // - G_now / G_day are always raw continuous: 2 − Kp + ΣAᵢ.
  // - Day_score is discrete PDF/Engine [-3..+3].
  // - Day_score never replaces G in formulas, chart scale, CSV, ICS, or G badges.

  const override3D = new Map();
  if(last3D && Array.isArray(last3D.days)){
    for(const d of last3D.days){
      // Only independent numeric short-range forecasts may replace daily outlooks.
      // Copied daily maxima and synthetic current-Kp repetitions add no forecast evidence.
      if(Number.isFinite(d.kpMax) && d.kpMax >= 0 && d.kpMax <= 9 &&
         !last3D._synthetic && !d._synthetic && !d._filledFrom && !d._fromFutureKp && !d._needsFill){
        override3D.set(fmtDate(d.date), d.kpMax);
      }
    }
  }
  const result = [];
  let prevKp = null;
  for(const r of rows){
    const ds = fmtDate(r.date);
    const kpUsed = override3D.has(ds) ? override3D.get(ds) : r.kpMax;
    const isOverridden = override3D.has(ds) && kpUsed !== r.kpMax;
    const ai = computeAi(sunriseUTC(r.date), kpUsed);
    // v26: F10.7 — лише індикатор у tooltip, НЕ впливає на G (єдина формула: G = 2 − Kp + Ai)
    const f107mod = computeF107Modifier(r.flux);
    const G  = kpDayTerm(kpUsed) + ai.Ai;
    const delta = prevKp !== null ? (kpUsed - prevKp) : null;
    prevKp = kpUsed;

    // v88.8.34 ★ TWO-RAIL FIX:
    // G = raw continuous G only: 2 − Kp + ΣAᵢ.
    // PDF/Engine score is a separate day-score overlay and must never replace G.
    // _effectiveG is kept only as a backward-compatible alias equal to G.
    let _effectiveG = G;
    let _expertEng = null;
    let _hasOverride = false;
    let _decisionEng = null;
    let _decisionAuthority = 'none';
    try {
      // fp200 (2026-07-16): раніше читало _expertOverrides[ds].expert_eng НАПРЯМУ,
      // в обхід verified/source_pdf/snippet_hash gate у getEngineScore(). Це друга,
      // окрема від fp198 (рядок ~14691) точка обходу — та сама причина розсинхрону
      // (Hero через getEngineScore бачив gate, 27-day — ні). Тепер обидва через
      // одну функцію.
      if (typeof getEngineScore === 'function') {
        const _snap = getEngineScore(new Date(ds + 'T12:00:00Z'));
        if (_snap && Number.isFinite(_snap.eng)) {
          _decisionEng = Number(_snap.eng);
          _decisionAuthority = _snap._expertOverride ? 'verified_pdf' : 'engine_fallback';
          if (_snap._expertOverride) {
            _expertEng = Number(_snap.eng);
            _hasOverride = true;
          }
        }
      } else if (typeof _expertOverrides !== 'undefined' && _expertOverrides && _expertOverrides[ds]) {
        const _ovEng = _expertOverrides[ds].expert_eng;
        if (Number.isFinite(_ovEng)) { _expertEng = _ovEng; _hasOverride = true; }
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.86','recoverable'); }

    const calendarAdvisory = window._futureCalendarAdvisory[ds] || null;
    result.push({r, ds, kpUsed, isOverridden, ai, G, delta, f107mod,
                 _effectiveG, _expertEng, _hasOverride, _decisionEng,
                 _decisionAuthority, calendarAdvisory});
  }
  return result;
}/* NR_FN_END 164 */

/* NR_FN_BEGIN 170 */function _cmpSetMode(m){
  lsSet('cmp_mode', m);
  try{ renderComparePeriods(); }catch(e){ globalThis.NRDiagnostics?.record('catch.122','recoverable');  console.warn(e); }
}/* NR_FN_END 170 */

/* NR_FN_BEGIN 171 */function rawContextColor(g){
  if(!isFinite(g)) return '#445';
  if(g <= -2.5) return '#ff5b68';   // severe raw context
  if(g <= -0.5) return '#f0a33a';   // adverse raw context
  if(g <  0.5)  return '#9bb1dc';   // neutral raw context
  if(g <  2.5)  return '#55b7c8';   // elevated raw context, deliberately not green
  return '#7f9cff';                  // strong raw context, deliberately not green
}/* NR_FN_END 171 */

/* NR_FN_BEGIN 172 */function _ftGColor(g){
  return rawContextColor(g);
}/* NR_FN_END 172 */

/* NR_FN_BEGIN 173 */function _ftCategory(g){
  if(!isFinite(g)) return 'Дані недоступні';
  if(g <= -2.5) return 'Особливо несприятливий';
  if(g <= -0.5) return 'Несприятливий';
  if(g <  0.5)  return 'Нейтральний';
  if(g <  2.5)  return 'Сприятливий';
  return 'Особливо сприятливий';
}/* NR_FN_END 173 */

/* NR_FN_BEGIN 174 */function _ftGetVisibleData(){
  if(!_27dComputed || !_27dComputed.length) return { data: [], offset: 0, isNarrow: false };
  const isNarrow = (typeof window !== 'undefined') && window.innerWidth < 480;
  if(!isNarrow) return { data: _27dComputed, offset: 0, isNarrow: false };
  const todayStr = todayKyivStr();
  const todayIdx = _27dComputed.findIndex(d => d.ds === todayStr);
  const tIdx = todayIdx >= 0 ? todayIdx : 0;
  const start = Math.max(0, tIdx - 3);
  const end = Math.min(_27dComputed.length, start + 14);
  return { data: _27dComputed.slice(start, end), offset: start, isNarrow: true };
}/* NR_FN_END 174 */

/* NR_FN_BEGIN 176 */function _ftJumpTo(idx){
  if(!_27dComputed || !_27dComputed.length) return;
  if(idx < 0){
    const todayStr = todayKyivStr();
    idx = _27dComputed.findIndex(d => d.ds === todayStr);
    if(idx < 0) idx = 0;
  }
  if(idx < 0 || idx >= _27dComputed.length) return;
  _ftSelectedIdx = idx;
  renderForwardTimeline();
}/* NR_FN_END 176 */

/* NR_FN_BEGIN 177 */function _ftSetSpeed(s){
  if(![0.5, 1, 2].includes(s)) return;
  _ftPlaySpeed = s;
  // Якщо зараз грає — перезапустити таймер з новою швидкістю
  if(_ftPlaying){
    if(_ftPlayTimer){ clearInterval(_ftPlayTimer); _ftPlayTimer = null; }
    const intervalMs = Math.round(1000 / _ftPlaySpeed);
    _ftPlayTimer = setInterval(_ftPlayTick, intervalMs);
  }
  renderForwardTimeline();
}/* NR_FN_END 177 */

/* NR_FN_BEGIN 178 */function _ftPlayTick(){
  _ftSelectedIdx++;
  if(_ftSelectedIdx >= _27dComputed.length){
    _ftPlaying = false;
    if(_ftPlayTimer){ clearInterval(_ftPlayTimer); _ftPlayTimer = null; }
    _ftSelectedIdx = _27dComputed.length - 1;
  }
  renderForwardTimeline();
}/* NR_FN_END 178 */

/* NR_FN_BEGIN 179 */function _ftTogglePlay(){
  if(_ftPlaying){
    _ftPlaying = false;
    if(_ftPlayTimer){ clearInterval(_ftPlayTimer); _ftPlayTimer = null; }
    renderForwardTimeline();
    return;
  }
  if(!_27dComputed || !_27dComputed.length) return;
  _ftPlaying = true;
  const todayStr = todayKyivStr();
  const todayIdx = _27dComputed.findIndex(d => d.ds === todayStr);
  if(_ftSelectedIdx < 0 || _ftSelectedIdx < todayIdx) _ftSelectedIdx = todayIdx >= 0 ? todayIdx : 0;
  renderForwardTimeline();
  const intervalMs = Math.round(1000 / _ftPlaySpeed);
  _ftPlayTimer = setInterval(_ftPlayTick, intervalMs);
}/* NR_FN_END 179 */

/* NR_FN_BEGIN 180 */function classForG(g){
  // v87.95: повна узгодженість з classifyStateByG як єдиним джерелом істини про стан G.
  // Раніше був розрив: при G=−0.5 classForG → 'warn' (жовтий ring), а classifyStateByG → 'neutral'
  // (Hero text "STABLE / Нейтральний день"). Тепер обидва зчитуються від одного класифікатора.
  // Map: favorable/good → ok, neutral/unstable → warn (бо unstable = CAUTION жовтий у GLOBAL_STATES),
  // tense → bad. Це зберігає візуальну палітру v87.90 і додає консистентність.
  if (!isFinite(g)) return 'g-warn';
  const sk = classifyStateByG(g);
  if (sk === 'tense') return 'g-bad';
  if (sk === 'good' || sk === 'favorable') return 'g-ok';
  return 'g-warn'; // neutral і unstable — обидва жовтий ring
}/* NR_FN_END 180 */

/* NR_FN_BEGIN 181 */function classifyG(g){
  // v83f: aligned with classifyStateByG
  const sk = classifyStateByG(g);
  const labels = {
    tense: 'Несприятливий',
    unstable: 'Помірно несприятливий',
    neutral: 'Нейтральний',
    good: 'Помірно сприятливий',
    favorable: 'Сприятливий'
  };
  return labels[sk] || 'Нейтральний';
}/* NR_FN_END 181 */

/* NR_FN_BEGIN 182 */function badgeForK(k){
  const v = Number(k);
  const cls = v>=5 ? 'k-bad' : (v>=4 ? 'k-warn' : 'k-ok');
  return {text:`Kp ${isFinite(v)? v.toFixed(2) : '…'}`, cls:`kbadge ${cls}`};
}/* NR_FN_END 182 */

/* NR_FN_BEGIN 184 */function recommendG(g, kp){
  // v26.2: Storm override — Kp≥5 = геомагнітна буря, незалежно від G
  if(isFinite(kp) && kp >= 7) return {text:'⛔ Буря G3+ — утриматись', style:'color: var(--bad);font-weight:700'};
  if(isFinite(kp) && kp >= 5) return {text:'⚠️ Буря — обережно', style:'color:#fca474;font-weight:700'};
  // v83f: aligned with classifyStateByG
  const sk = classifyStateByG(g);
  const map = {
    tense:     {text:'⛔ Утриматись', style:'color: var(--bad);font-weight:700'},
    unstable:  {text:'〽️ Помірно', style:'color: var(--warn)'},
    neutral:   {text:'➖ Нейтрально', style:'color: var(--muted)'},
    good:      {text:'✅ Допустимо', style:'color:#63be7b'},
    favorable: {text:'🌟 Оптимально', style:'color: var(--ok);font-weight:700'}
  };
  return map[sk] || map.neutral;
}/* NR_FN_END 184 */

/* NR_FN_BEGIN 185 */function kpSparkline(kp8){
  const W=120, H=28, pad=2;
  const vals = kp8.filter(v=>isFinite(v));
  if(!vals.length) return '<span class="muted">—</span>';
  const n = kp8.length || 8;
  const maxV = Math.max(9, ...vals);
  const stepX = (W - pad*2) / Math.max(n-1, 1);
  const scaleY = v => pad + (H - pad*2) * (1 - v/maxV);
  const points = kp8.map((v,i)=>{
    const x = pad + i*stepX;
    const y = isFinite(v) ? scaleY(v) : H/2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  // колірні смуги фону
  const y4 = scaleY(4), y5 = scaleY(5);
  const zones = `
    <rect x="0" y="${scaleY(9).toFixed(1)}" width="${W}" height="${(scaleY(5)-scaleY(9)).toFixed(1)}" fill="rgba(255,107,107,0.12)"/>
    <rect x="0" y="${scaleY(5).toFixed(1)}" width="${W}" height="${(scaleY(4)-scaleY(5)).toFixed(1)}" fill="rgba(255,204,0,0.10)"/>`;
  // точки
  const dots = kp8.map((v,i)=>{
    if(!isFinite(v)) return '';
    const x = (pad + i*stepX).toFixed(1);
    const y = scaleY(v).toFixed(1);
    const c = v>=5 ? '#ff6b6b' : (v>=4 ? '#ffcc00' : '#2bd47d');
    return `<circle cx="${x}" cy="${y}" r="2.5" fill="${c}"/>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:inline-block;vertical-align:middle">${zones}<polyline points="${points}" fill="none" stroke="#5588cc" stroke-width="1.5" stroke-linejoin="round"/>${dots}</svg>`;
}/* NR_FN_END 185 */

/* NR_FN_BEGIN 187 */function getPakshiActivityForYama(birdId, yamaIdx, weekday, isDay, isShukla) {
  // birdId: 0=Vulture,1=Owl,2=Crow,3=Cock,4=Peacock (канон 1:1 з PANCHA_PAKSHI_NAMES)
  // yamaIdx: 0-4. weekday: JS getDay() 0=Нд..6=Сб.
  let actIdx;
  if (isShukla !== false) {
    // BRIGHT HALF
    const g = PP_GROUP_INDEX_BY_WEEKDAY[weekday] ?? 0;
    if (isDay) {
      const pos = (((birdId + yamaIdx - g) % 5) + 5) % 5;
      actIdx = PP_DAY_ORDER_TO_PPIDX[pos];
    } else {
      const k = (2 + g + yamaIdx) % 5;
      const pos = (((k - birdId) % 5) + 5) % 5;
      actIdx = PP_NIGHT_ORDER_TO_PPIDX[pos];
    }
  } else {
    // DARK HALF — власне групування днів тижня та власна формула
    const g = PP_DARK_DAY_GROUP_BY_WEEKDAY[weekday] ?? 0;
    if (isDay) {
      const shift = (PP_DARK_DAY_BASE_SHIFT[yamaIdx] + PP_DARK_DAY_GROUP_OFFSET[g]) % 5;
      const pos = (birdId + shift) % 5;
      actIdx = PP_DARK_DAY_ORDER_TO_PPIDX[pos];
    } else {
      const shift = (PP_DARK_NIGHT_BASE_SHIFT[yamaIdx] + PP_DARK_NIGHT_GROUP_OFFSET[g]) % 5;
      const pos = (birdId + shift) % 5;
      actIdx = PP_DARK_NIGHT_ORDER_TO_PPIDX[pos];
    }
  }
  return {
    activity: PP_ACTIVITIES[actIdx],
    activityUa: PP_ACTIVITIES_UA[actIdx],
    advice: PP_ACTIVITIES_ADVICE[actIdx],
    strength: actIdx, // 0=найслабше, 4=найсильніше
    verified: true, // v88.8.75-fp154: Bright І Dark Half тепер обидва звірені зі сканів
  };
}/* NR_FN_END 187 */

/* NR_FN_BEGIN 188 */function getCurrentYama(dateUTC, sunriseUTC, sunsetUTC) {
  // Повертає {yamaIdx, isDay, yamaStart, yamaEnd} для поточного моменту
  const t = dateUTC.getTime();
  const sr = sunriseUTC.getTime(), ss = sunsetUTC.getTime();
  if (t >= sr && t < ss) {
    const dayLen = ss - sr;
    const yamaLen = dayLen / 5;
    const idx = Math.min(4, Math.floor((t - sr) / yamaLen));
    return { yamaIdx: idx, isDay: true,
      yamaStart: new Date(sr + idx*yamaLen), yamaEnd: new Date(sr + (idx+1)*yamaLen) };
  } else {
    // Ніч: від sunset до наступного sunrise (наближено через nextSunrise = sr+24h якщо t<sr)
    const nextSr = t < sr ? sr : sr + 86400000;
    const nightStart = t < sr ? ss - 86400000 : ss;
    const nightLen = nextSr - nightStart;
    const yamaLen = nightLen / 5;
    const idx = Math.min(4, Math.max(0, Math.floor((t - nightStart) / yamaLen)));
    return { yamaIdx: idx, isDay: false,
      yamaStart: new Date(nightStart + idx*yamaLen), yamaEnd: new Date(nightStart + (idx+1)*yamaLen) };
  }
}/* NR_FN_END 188 */

/* NR_FN_BEGIN 194 */function _fmtLocalHM(date){
  if(!(date instanceof Date) || isNaN(date.getTime())) return '—';
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}/* NR_FN_END 194 */

/* NR_FN_BEGIN 203 */function updateAutoRefStatus(){
  const sel = document.getElementById('selInterval');
  const badge = document.getElementById('autorefStatus');
  const mins = parseInt(sel.value,10);
  if(_autoRefTimer){ clearInterval(_autoRefTimer); _autoRefTimer=null; }
  if(mins > 0){
    _autoRefTimer = setInterval(() => window.requestLifecycleRefresh('auto',true), mins * 60000);
    badge.textContent = `● ${mins} хв`;
    badge.className = 'autoref-badge';
  }else{
    badge.textContent = '● вимкн.';
    badge.className = 'autoref-badge off';
  }
}/* NR_FN_END 203 */

/* NR_FN_BEGIN 207 */function _strip(s){ return String(s||'').replace(/^●\s*/,'').trim(); }/* NR_FN_END 207 */

/* NR_FN_BEGIN 208 */function _num(s){ const m=String(s||'').replace(',','.').match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):NaN; }/* NR_FN_END 208 */

/* NR_FN_BEGIN 209 */function _set(id,v){ const n=el(id); if(n) n.textContent=v??'—'; }/* NR_FN_END 209 */

/* NR_FN_BEGIN 210 */function _firstText(e){ return e?.childNodes?.[0]?.textContent||''; }/* NR_FN_END 210 */

/* NR_FN_BEGIN 213 */function driverIcon(v){
  if(v <= -2) return '🔴';
  if(v < -0.5) return '🟠';
  if(v < 0.5) return '⚪';
  return '🟢';
}/* NR_FN_END 213 */

/* NR_FN_BEGIN 214 */function _uniq(arr){ return [...new Set(arr)]; }/* NR_FN_END 214 */

/* NR_FN_BEGIN 215 */function buildUnifiedAdvice(state){
  const g = Number(state?.gNow ?? state?.g ?? 0);
  const st = GLOBAL_STATES[classifyStateByG(g)];
  let DO = [...(st.doList || [])];
  let AVOID = [...(st.avoidList || [])];
  let NOTE = st.noteExtra ? [st.noteExtra] : [];
  // v83f: state key for inject guards
  const _stKey = classifyStateByG(g);
  // Panchanga inject
  const pc = _lastPanchCtx;
  if(pc){
    if(pc.karana?.isVishti){ AVOID.push('нові початки (Vishti)'); NOTE.push('Vishti karana — підвищений ризик'); }
    // Advice is a DAY layer.  _lastPanchCtx is already calculated at the
    // canonical local sunrise; using a second live floor(phase/12) here
    // made Tithi disagree with Nakshatra/Yoga and the day verdict.
    const tIdx = Number.isFinite(Number(pc.tithi?.num)) ? Number(pc.tithi.num) - 1 : null;
    if(tIdx===10||tIdx===25){ DO.push('дисципліна','самоконтроль'); NOTE.push('Екадаші — день стриманості'); }
    const nType = pc.nakshatra?.type;
    // Nakshatra AVOID always applies; DO only at neutral+
    if(nType==='Жорстка') AVOID.push('м\'які переговори');
    if(_stKey !== 'tense' && _stKey !== 'unstable'){
      if(nType==='Стала') DO.push('структурування, закріплення');
      if(nType==='Легка') DO.push('легкі справи, навчання');
    }
  }
  // Hora inject — only when state allows active decisions (neutral+)
  if(_stKey !== 'tense' && _stKey !== 'unstable'){
    try{
      const hora = calcHora(new Date());
      if(hora?.planet){
        const HORA_DO={'Юпітер':'стратегія, важливі рішення','Меркурій':'комунікація, аналіз','Венера':'креатив, партнерства','Сонце':'лідерські дії','Місяць':'інтуїтивні рішення'};
        if(HORA_DO[hora.planet]) DO.push(HORA_DO[hora.planet]);
      }
    }catch(e){ globalThis.NRDiagnostics?.record('catch.150','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }
  // fp28: storm-guard — if storm incoming today, add timing constraint regardless of PDF score
  try {
    const _sw28b = window._stormWindow;
    if (_sw28b && isFinite(_sw28b.kp) && _sw28b.kp >= 5) {
      const _utcL = String(_sw28b.label).padStart(2,'0');
      if (_sw28b.active) {
        AVOID.unshift(`нові критичні дії зараз (Kp=${_sw28b.kp.toFixed(1)} активна)`);
        NOTE.push('буревий safety-контур активний — тільки необхідна рутина');
      } else if (_stKey === 'favorable' || _stKey === 'good') {
        DO.unshift(`планове — завершити до ${_utcL}:00 UTC`);
        AVOID.push(`нові критичні дії після ${_utcL}:00 UTC (Kp-буря)`);
      } else {
        AVOID.push(`нові критичні дії; буря очікується о ${_utcL}:00 UTC`);
        NOTE.push('поточний оперативний стан уже обмежувальний; майбутня буря не створює дозволеного вікна');
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.117','recoverable'); }
  // fp361: a positive operational score must not become an unconditional action
  // list when live data are partial/offline or the 3-day rail is synthetic.
  try {
    const _dmAdv = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : 'live';
    if ((_dmAdv === 'partial' || _dmAdv === 'offline' || _dmAdv === 'scenario') && (_stKey === 'favorable' || _stKey === 'good')) {
      DO = ['продовжити розпочате', 'лише перевірена рутина'];
      AVOID.unshift('нові критичні рішення до відновлення live-даних');
      NOTE.unshift(`якість даних ${_dmAdv.toUpperCase()} — позитивний стан не є дозволом`);
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.118','recoverable'); }
  return { DO:_uniq(DO), AVOID:_uniq(AVOID), NOTE:_uniq(NOTE) };
}/* NR_FN_END 215 */

/* NR_FN_BEGIN 217 */function buildDaySentence(uiState){
  const g = Number(uiState?.gNow ?? 0);
  const driver = String(uiState?.mainDriver||'').trim();
  const ts = uiState?.timingSummary || null;
  const sk = classifyStateByG(g);
  const dSuffix = driver ? ` Головний фактор: ${driver}.` : '';
  // No safe window
  if(ts && ts.slots?.length && !ts.hasGoodSlot){
    return 'Безпечних вікон немає — тримай мінімум і контролюй ризик.' + dSuffix;
  }
  // Flat day
  if(ts?.allSame){
    const flat = {
      tense: 'День рівний, але напружений — не шукай вікно, просто мінімізуй.',
      unstable: 'День рівний — не шукай магічний момент, тримай стабільний темп.',
      neutral: 'Рівний день — результат залежить від дисципліни, не від моменту.',
      good: 'Стабільний позитивний фон — дій у комфортному ритмі.',
      favorable: 'Весь день сприятливий — дій коли зручно.'
    };
    return (flat[sk] || flat.neutral) + dSuffix;
  }
  // Has good slot
  if(ts?.hasGoodSlot){
    const slot = {
      tense: `Єдине вікно — ${ts.bestSlot.time}. Решту дня — мінімум.`,
      unstable: `Найкраще вікно — ${ts.bestSlot.time}. Решту дня — обережно.`,
      neutral: `Найкраще вікно — ${ts.bestSlot.time}.`,
      good: `Хороший день. Оптимально — о ${ts.bestSlot.time}.`,
      favorable: `Сильний день. Пік — ${ts.bestSlot.time}.`
    };
    return (slot[sk] || slot.neutral) + dSuffix;
  }
  // No timing at all
  const basic = {
    tense: 'Важливі рішення краще відкласти.',
    unstable: 'Діяти повільно, без різких кроків.',
    neutral: 'Працюй у звичному темпі.',
    good: 'Хороший час для планових дій.',
    favorable: 'Оптимальний день — використай повністю.'
  };
  return (basic[sk] || basic.neutral) + dSuffix;
}/* NR_FN_END 217 */

/* NR_FN_BEGIN 218 */function resolveStormWindow(now, slots, kpNow) {
  now   = now   || new Date();
  slots = slots || window._daySlots || [];
  kpNow = isFinite(kpNow) ? kpNow : (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow) ? lastWWV.kNow : NaN);
  const nowSlotIdx = Math.floor(now.getUTCHours() / 3);

  // 1. Observed kp already storm-level → active immediately
  const kpNowStorm = isFinite(kpNow) && kpNow >= 5;

  // 2. Forecast slot with kp>=5, current or future
  const slot = slots.find(s =>
    Number.isFinite(s.kp) && s.kp >= 5 &&
    Number.isFinite(s.i)  && s.i >= nowSlotIdx
  );

  if (!slot && !kpNowStorm) return null;

  const label = slot
    ? String(slot.label).padStart(2, '0')
    : String(nowSlotIdx * 3).padStart(2, '0');
  const slotKp  = slot ? slot.kp : kpNow;
  const startMs = (() => { const d = new Date(now); d.setUTCHours(parseInt(label, 10), 0, 0, 0); return d.getTime(); })();
  const active  = kpNowStorm || (now.getTime() >= startMs);
  const etaHours = active ? 0 : Math.max(0, (startMs - now.getTime()) / 3600000);

  return {
    kp:       slotKp,
    label,
    active,
    hoursAhead: +etaHours.toFixed(1),
    etaLabel:   active ? 'ЗАРАЗ' : `~${etaHours.toFixed(1)}г`,
    source:     slot ? 'forecast' : 'observed'
  };
}/* NR_FN_END 218 */

/* NR_FN_BEGIN 219 */function getInauspiciousWindowsUTC(){
  // Винесено з (колишнього) renderHeroTimeWindows — раніше рахувалось ЛИШЕ там,
  // День-план і Особистий контекст Rahu/Yama/Gulika взагалі не бачили.
  let _wins = [];
  try {
    const _pc = _lastPanchCtx;
    let _R = null;
    if (typeof computePanchanga === 'function' && typeof sunriseUTC === 'function') {
      try {
        const _dk = todayKyivStr();
        if (window.__p3RahuCache && window.__p3RahuCache.dk === _dk && window.__p3RahuCache.geoKey === String(_userLat)+','+String(_userLon)) {
          _R = window.__p3RahuCache.rahu;
        } else {
          _R = computePanchanga(sunriseUTC(new Date(todayKyivStr()+'T12:00:00Z'))).rahu;
          window.__p3RahuCache = { dk: _dk, geoKey: String(_userLat)+','+String(_userLon), rahu: _R };
        }
      } catch(_e){ globalThis.NRDiagnostics?.record('catch.151','recoverable');  _R = null; }
    }
    if ((!_R || !_R.gulika) && _pc && _pc._kyivDateKey === todayKyivStr() && _pc._geoKey===String(_userLat)+','+String(_userLon) && _pc.rahu) {
      _R = _pc.rahu;
    }
    if (_R) {
      const _toH = t => { const _p2 = String(t||'').split(':').map(Number); return _p2.length===2 ? _p2[0]+_p2[1]/60 : NaN; };
      [['Rahu', _R.start, _R.end],
       ['Yama', _R.yamagandam && _R.yamagandam.start, _R.yamagandam && _R.yamagandam.end],
       ['Gulika', _R.gulika && _R.gulika.start, _R.gulika && _R.gulika.end]
      ].forEach(([_nm, _st, _en]) => {
        const _a = _toH(_st), _b = _toH(_en);
        if (isFinite(_a) && isFinite(_b) && _b > _a) _wins.push({ nm: _nm, start: _st, end: _en, a: _a, b: _b });
      });
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.119','recoverable'); }
  return _wins;
}/* NR_FN_END 219 */

/* NR_FN_BEGIN 221 */function _baseSlotAction(g, dayScore, referenceAvailable){
  // Базові 5 рівнів + softening за PDF/Engine дня — ідентично попередній логіці,
  // що раніше жила лише в renderHeroTimeWindows; тепер спільна для всіх трьох
  // блоків, замість «Плану дня» власної спрощеної 3-рівневої версії.
  // fp429 R-01: raw slot G is context, never an action authority.  A missing
  // or stale daily reference must fail closed on every future/current-day
  // slot surface, not only on Hero/current slot.
  if (!referenceAvailable) {
    return 'лише перевірені рутинні дії; денний reference недоступний, raw G — довідковий фон';
  }
  let action = g >= 1.5 ? 'активні дії і ключові рішення'
    : g >= 0.5 ? 'безпечно працювати і планувати'
    : g >= -0.5 ? 'стандартний темп без форсування'
    : g >= -1.5 ? 'обережно: тільки перевірені дії'
    : 'тільки рутина, не приймати рішень';
  const _ds = isFinite(dayScore) ? Number(dayScore) : null;
  const _pdfNeg  = (_ds !== null && _ds < 0);
  const _pdfHard = (_ds !== null && _ds <= -2);
  const _pdfCrit = (_ds !== null && _ds <= -3);
  if (_pdfCrit) {
    action = g >= 1.5 ? 'мінімум активності, без жодних рішень (день PDF/Engine особливо несприятливий)'
      : g >= 0.5 ? 'тільки рутина, без нових ініціатив (день PDF/Engine особливо несприятливий)'
      : g >= -0.5 ? 'категорично уникати рішень (день PDF/Engine особливо несприятливий)'
      : g >= -1.5 ? 'категорично уникати, тільки невідкладне (день PDF/Engine особливо несприятливий)'
      : 'припинити всі активні дії (день PDF/Engine особливо несприятливий)';
  } else if (_pdfHard) {
    action = g >= 1.5 ? 'тільки перевірені дії, без нових рішень (день PDF/Engine критичний)'
      : g >= 0.5 ? 'рутина і відомі задачі (день PDF/Engine критичний)'
      : g >= -0.5 ? 'мінімум активних дій (день PDF/Engine критичний)'
      : g >= -1.5 ? 'обережно: тільки перевірені дії (день PDF/Engine критичний)'
      : 'тільки рутина, не приймати рішень (день PDF/Engine критичний)';
  } else if (_pdfNeg && g >= 0.5) {
    action = g >= 1.5 ? 'звичайні задачі і планування (день PDF/Engine негативний)'
      : 'перевірені дії, не ключові рішення (день PDF/Engine негативний)';
  }
  return action;
}/* NR_FN_END 221 */

/* NR_FN_BEGIN 225 */function getCurrentOperationalPresentation(){
  const sig = getCurrentOperationalSignal();
  if(!sig?.decisionAvailable || !isFinite(sig.decisionScore)){
    return {sig, score:null, cls:'bad', color:'#ff6b6b', text:'оперативне рішення недоступне — raw-фон не є дозволом'};
  }
  const score = Number(sig.decisionScore);
  const cls = score >= 1 ? 'good' : score >= 0 ? 'mid' : 'bad';
  const text = score >= 1
    ? `оперативно +${score}: планові дії`
    : score === 0
      ? 'оперативно нейтрально: лише перевірені дії'
      : score === -1
        ? 'оперативно −1: тільки рутина, без нових стартів'
        : `оперативно ${score}: СТОП, тільки необхідна рутина`;
  return {sig, score, cls, color:sig.color || (cls==='good'?'#2bd47d':cls==='mid'?'#9bb1dc':'#ff6b6b'), text};
}/* NR_FN_END 225 */

/* NR_FN_BEGIN 227 */function _fmtKyivFromUTCFloat(h){
  const off = (typeof kyivOffsetHoursIntAt === 'function') ? kyivOffsetHoursIntAt(new Date()) : 3;
  const local = ((h + off) % 24 + 24) % 24;
  const hh = Math.floor(local);
  let mm = Math.round((local - hh) * 60);
  if (mm === 60) mm = 0;
  return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
}/* NR_FN_END 227 */

/* NR_FN_BEGIN 228 */function classifySlotScore(score){
  const s = Number(score ?? 0);
  if(s >= TIMING_THRESHOLDS.good) return 'good';
  if(s <= TIMING_THRESHOLDS.mid) return 'bad';
  return 'mid';
}/* NR_FN_END 228 */

/* NR_FN_BEGIN 229 */function normalizeDaySlots(slots){
  if(!Array.isArray(slots)) return [];
  const now = new Date();
  const nowH = now.getUTCHours();
  const tzOffH = kyivOffsetHoursIntAt(now); // fp245: Europe/Kyiv канонічно, не browser TZ
  // fp40: storm hard cap — slots at or after storm-start hour → force bad/mid
  const _sw40 = window._stormWindow;
  const _stormStartH = (_sw40 && isFinite(_sw40.kp) && _sw40.kp >= 5)
    ? parseInt(_sw40.label, 10) : null;
  return slots.map(s => {
    const utcH = parseInt(s.label||'0');
    const localStart = ((utcH + tzOffH) % 24 + 24) % 24;
    const localEnd   = ((utcH + 3 + tzOffH) % 24 + 24) % 24;
    let score = Number(s.G ?? 0);
    // fp40: if slot kp>=5 OR slot starts at/after storm hour → cap to bad
    const _slotKp = isFinite(s.kp) ? s.kp : 0;
    const _isStormSlot = (_stormStartH !== null) && (utcH >= _stormStartH || _slotKp >= 5);
    const isNow = (nowH>=utcH && nowH<utcH+3);
    let cls = classifySlotScore(score);
    let text = cls==='good' ? 'можна' : cls==='mid' ? 'обережно' : 'уникати';
    if(isNow){
      const current = getCurrentOperationalPresentation();
      score = current.score;
      cls = current.cls;
      text = current.text;
    }
    if (_isStormSlot) {
      cls = 'bad';
      text = 'тільки рутина · Kp≥5';
    }
    return {
      h: utcH, score, cls,
      time: `${String(Math.floor(localStart)).padStart(2,'0')}:00–${String(Math.floor(localEnd)).padStart(2,'0')}:00`,
      text,
      isNow,
      isPast: (utcH+3 <= nowH)
    };
  });
}/* NR_FN_END 229 */

/* NR_FN_BEGIN 230 */function findBestSlot(normSlots){
  const future = normSlots.filter(s => !s.isPast && s.cls === 'good');
  if(!future.length) return null;
  future.sort((a,b) => b.score - a.score);
  return future[0];
}/* NR_FN_END 230 */

/* NR_FN_BEGIN 231 */function buildTimingSummary(slots){
  const norm = normalizeDaySlots(slots);
  const best = findBestSlot(norm);
  return {
    slots: norm,
    bestSlot: best,
    hasGoodSlot: !!best,
    allBad: norm.length > 0 && norm.every(s => s.cls === 'bad'),
    allSame: norm.length > 0 && norm.every(s => s.cls === norm[0].cls)
  };
}/* NR_FN_END 231 */

/* NR_FN_BEGIN 233 */function applyTimingToHero(summary, gVal){
  const heroMain = el('heroMainDrag');
  if(!heroMain) return;
  const st = GLOBAL_STATES[classifyStateByG(gVal)];
  // fp30-B: storm-guard on heroMainDrag timing line
  const _sw30b = window._stormWindow;
  if(_sw30b && isFinite(_sw30b.kp) && _sw30b.kp >= 5){
    const _utcL = String(_sw30b.label).padStart(2,'0');
    heroMain.textContent = `Дійте до ${_utcL}:00 UTC — після обережно (Kp-буря).`;
    return;
  }
  if(!summary || !summary.slots?.length){
    heroMain.textContent = st.sub;
    return;
  }
  if(!summary.hasGoodSlot){
    heroMain.textContent = st.sub;
    return;
  }
  heroMain.textContent = `Найкраще вікно — ${summary.bestSlot.time}.`;
}/* NR_FN_END 233 */

/* NR_FN_BEGIN 234 */function formatConfidence(v){
  // v88.8.37-fp70: замінено % на словесний рівень — 92% щодня виглядало нереалістично
  // і суперечило ESTIMATED/DELAYED статусу (якщо дані estimated — не може бути 92%).
  // Висока ≥85%: live дані, Kp стабільний, немає бурі.
  // Середня 65-84%: estimated/delayed/storm/synthetic.
  // Низька <65: stale, scenario, major storm.
  const n = Math.round(Number(v||0));
  if(n >= 85) return 'Висока';
  if(n >= 65) return 'Середня';
  return 'Низька';
}/* NR_FN_END 234 */

/* NR_FN_BEGIN 235 */function _runSanityWatchdog(g, kp){
  const warns = [];
  // v88.9.34-fp215: скидаємо прапор на початку кожного проходу — інакше він
  // залипне true назавжди після першого виявлення DEGRADED, навіть коли стан
  // вже видужав.
  window.__isDegraded = false;
  _updateSourceState({ degraded: false, reason: null });

  // Rule 1: Physics inconsistency — Kp calm but Dst stormy
  try {
    const dstObj = window._lastDst;
    const dstV = dstObj && isFinite(dstObj.dst) ? dstObj.dst : null;
    if(isFinite(kp) && kp < 2 && dstV !== null && dstV < -80){
      warns.push({ icon:'🔬', title:'Фізична суперечність', body:'Kp='+kp.toFixed(1)+' (спокій) але Dst='+dstV+' nT (буря). Дані з різних зрізів — перевір перед рішенням.' });
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.125','recoverable'); }

  // Rule 2: Score jump ≥5 without storm/eclipse — uses real getEngineScore
  try {
    if(typeof getEngineScore === 'function'){
      var todayD = new Date(todayKyivStr()+'T12:00:00Z');
      var tomD = new Date(todayD); tomD.setUTCDate(todayD.getUTCDate()+1);
      var eT = getEngineScore(todayD);
      var eTom = getEngineScore(tomD);
      var sT = eT ? (eT.final_score != null ? eT.final_score : eT.eng) : null;
      var sTom = eTom ? (eTom.final_score != null ? eTom.final_score : eTom.eng) : null;
      if(sT !== null && sTom !== null){
        var jump = Math.abs(sTom - sT);
        var noStorm = !(isFinite(kp) && kp >= 5);
        var calS = (eT && eT.cal_symbols) ? eT.cal_symbols : [];
        var noEclipse = !calS.some(function(s){ return /eclipse|amavasya|purnima/.test(s); });
        if(jump >= 5 && noStorm && noEclipse){
          warns.push({ icon:'⚡', title:'Аномальний стрибок score', body:'Сьогодні '+(sT>=0?'+':'')+sT+', завтра '+(sTom>=0?'+':'')+sTom+' (Δ='+jump+'). Без бурі — перевір теги.' });
        }
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.126','recoverable'); }

  // Rule 3: NOAA feed stale > 12h (узгоджено з "нормою циклу NOAA")
  // v88.9.42-fp224 FIX-CRITICAL (аудит-раунд-11, Problem 9): раніше поріг був
  // >3г — але "ESTIMATED · Kp ≤12год (норма циклу NOAA 3год)" деінде в цьому
  // ж файлі прямо каже, що затримка ДО 12г — це нормальний, очікуваний стан
  // циклу, не збій. Тобто один звичайний пропущений 3-годинний слот (напр.
  // публікація на 5 хвилин пізніше розкладу) одразу підпалював тривожний
  // DEGRADED, який суперечив сусідньому ESTIMATED-бейджу. DEGRADED тепер — це
  // справді відмова (>12г), а не звичайний цикл очікування.
  try {
    var src = window._kpSourceFreshness;
    if(src && src.ageHours != null && src.ageHours > 12){
      warns.push({ icon:'📡', title:'Дані застарілі ('+src.ageHours+'г)', body:'NOAA Kp не оновлювався '+src.ageHours+' год. Натисни «Оновити».' });
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.127','recoverable'); }

  // Rule 4: Confidence paradox — high quality% but engine↔PDF sign conflict
  try {
    if(typeof getEngineScore === 'function'){
      var eTd = getEngineScore(new Date(todayKyivStr()+'T12:00:00Z'));
      if(eTd){
        var engS = eTd.eng != null ? eTd.eng : null;
        var pdfS = eTd.pdf != null ? eTd.pdf : null;
        var qEl = document.getElementById('heroConfidence');
        var q = qEl ? parseInt(qEl.textContent||'0') : 0;
        var conflict = engS !== null && pdfS !== null &&
          Math.sign(engS) !== 0 && Math.sign(pdfS) !== 0 &&
          Math.sign(engS) !== Math.sign(pdfS);
        if(q >= 85 && conflict){
          warns.push({ icon:'🤔', title:'Парадокс впевненості', body:'Якість '+q+'% але engine↔PDF знаки різні ('+engS+' vs '+pdfS+'). Впевненість завищена.' });
        }
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.128','recoverable'); }

  // Rule 5: Alert fatigue — >40% of recent logged days were high-risk (min 7 entries)
  try {
    var dl = JSON.parse(localStorage.getItem('gindex_decision_log_v1')||'[]');
    var cutoff = Date.now() - 14*86400000;
    var recent = dl.filter(function(e){ try{ return new Date(e.ts).getTime() > cutoff; }catch(_ignore){ globalThis.NRDiagnostics?.record('catch.153','recoverable');  return false; }});
    var alertDays = recent.filter(function(e){ return e.g_at_save != null && e.g_at_save <= -2; }).length;
    if(recent.length >= 7 && alertDays/recent.length > 0.4){
      warns.push({ icon:'😴', title:'Alert fatigue', body:alertDays+' з '+recent.length+' останніх записів — high-risk. Поріг може бути занадто чутливим.' });
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.129','recoverable'); }

  return warns;
}/* NR_FN_END 235 */

/* NR_FN_BEGIN 242 */function _engineScoreToStateKey_v88824(score, kp){
  const s = Number(score);
  if(!isFinite(s)) return null;
  let key = s >= 3 ? 'favorable'
          : s >= 2 ? 'good'
          : s >= 1 ? 'good'
          : s === 0 ? 'neutral'
          : s === -1 ? 'unstable'
          : 'tense';
  // Same storm cap as classifyStateByG: geomagnetic storm can cap action mode.
  if(isFinite(kp)){
    if(kp >= 7 && (key==='favorable'||key==='good'||key==='neutral')) key='unstable';
    else if(kp >= 5 && (key==='favorable'||key==='good')) key='neutral';
  }
  return key;
}/* NR_FN_END 242 */

/* NR_FN_BEGIN 243 */function _stateKeyToRepresentativeG_v88824(key){
  return ({favorable:2.2, good:1.0, neutral:0, unstable:-1.2, tense:-3})[key] ?? 0;
}/* NR_FN_END 243 */

/* NR_FN_BEGIN 244 */function _stateSeverity_v88825(key){
  return ({favorable:0, good:1, neutral:2, unstable:3, tense:4})[key] ?? 2;
}/* NR_FN_END 244 */

/* NR_FN_BEGIN 245 */function _moreRestrictiveState_v88825(a, b){
  return _stateSeverity_v88825(a) >= _stateSeverity_v88825(b) ? a : b;
}/* NR_FN_END 245 */

/* NR_FN_BEGIN 246 */function _operationalScoreFromState_v88825(key){
  return Math.max(-3, Math.min(3, Math.round(_stateKeyToRepresentativeG_v88824(key))));
}/* NR_FN_END 246 */

/* NR_FN_BEGIN 249 */function heroHeadlineFromHierarchy_v88824(sig){
  if(!sig || !sig.hasEngine) return null;
  if(sig.guard === 'unverified_override_large_delta') return 'Сьогодні обережно — джерело прогнозу не підтверджене';

  // fp27: storm-guard — if forecast Kp≥5 within same calendar day, downgrade positive headline.
  // PDF +3 does NOT override a storm window. Priority: storm > live_guard > PDF.
  try {
    const _sw = window._stormWindow;
    if (_sw && isFinite(_sw.kp) && _sw.kp >= 5 && sig.dayScore >= 2) {
      const _utcLabel = String(_sw.label).padStart(2,'0');
      // fp42: use etaLabel (ЗАРАЗ / ~Xг); active storm gets different wording
      const _etaStr = _sw.etaLabel || `~${_sw.hoursAhead}г`;
      if (_sw.active) {
        return `Оперативно СТОП: буря Kp=${_sw.kp.toFixed(1)} активна — тільки рутина · PDF reference +${sig.dayScore}`;
      }
      if (sig.opKey === 'tense') {
        return `Оперативно СТОП зараз; буря Kp=${_sw.kp.toFixed(1)} очікується ${_etaStr} · PDF reference +${sig.dayScore}`;
      }
      if (sig.opKey === 'unstable') {
        return `Оперативно обережно зараз; буря Kp=${_sw.kp.toFixed(1)} очікується ${_etaStr} · PDF reference +${sig.dayScore}`;
      }
      if (sig.opKey === 'neutral') {
        return `Оперативно нейтрально зараз; буря Kp=${_sw.kp.toFixed(1)} очікується ${_etaStr} · PDF reference +${sig.dayScore}`;
      }
      return `Оперативно обережно: буря Kp=${_sw.kp.toFixed(1)} очікується ${_etaStr} — до ${_utcLabel}:00 UTC · PDF reference +${sig.dayScore}`;
    }
    // Current Kp ≥ 5 (already storming)
    const _kpNow = (typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow : 0;
    if (_kpNow >= 5 && sig.dayScore >= 2)
      return `Оперативно СТОП: буря Kp=${_kpNow.toFixed(1)} активна — уникайте критичного · PDF reference +${sig.dayScore}`;
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.167','recoverable'); }

  if(sig.dynamicGuard === 'current_window' && sig.intradayGuard?.blockedNow){
    const names = sig.intradayGuard.reasonsNow.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+') || 'часове вікно';
    const until = sig.intradayGuard.blockedUntilH != null ? ` до ${_fmtKyivFromUTCFloat(sig.intradayGuard.blockedUntilH)}` : '';
    const ds = isFinite(sig.dayScore) ? `${sig.dayScore >= 0 ? '+' : ''}${sig.dayScore}` : '—';
    return `Оперативно лише рутина зараз: ${names}${until} · денний reference ${ds}`;
  }

  // v88.8.34: Hero headline is an OPERATIONAL command for the current moment.
  // Day PDF/Engine score is shown as context, not as a command.
  // This prevents the wrong reading: "day +3" while all live windows say avoid.
  const ds = isFinite(sig.dayScore) ? (sig.dayScore >= 0 ? '+' + sig.dayScore : String(sig.dayScore)) : '—';
  // fp360: map every positive PDF conflict through the resolved operational
  // state. Guard-name checks alone missed model_conflict (for example PDF +3
  // versus neutral live G) and could still emit a positive action headline.
  if(sig.dayScore >= 1 && sig.opKey === 'tense') return `Оперативно СТОП: PDF reference ${ds} конфліктує з фоном зараз`;
  if(sig.dayScore >= 1 && sig.opKey === 'unstable') return `Оперативно обережно: PDF reference ${ds}, але live-фон слабший`;
  if(sig.dayScore >= 1 && sig.opKey === 'neutral') return `Оперативно нейтрально: PDF reference ${ds} не підтверджений поточним фоном`;
  if(sig.dayScore >= 1 && sig.opKey === 'good') return `Оперативно помірно сприятливо; PDF reference ${ds} узгоджений лише частково`;
  // fp23: якщо live-дані не свіжі — headline явно вказує на це
  try {
    const _dm = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : null;
    if(sig.dayScore >= 3 && (_dm === 'estimated' || _dm === 'partial' || _dm === 'offline' || _dm === 'scenario')) {
      // v88.9.54-fp236 FIX-CRITICAL (аудит-раунд-22): раніше цей текст хардкодив
      // слово "estimated" при _dm==='estimated' — але _dm тут читає ВНУТРІШНІЙ
      // ключ стану (той самий, що навмисно НЕ перейменований у fp226, бо забагато
      // коду на нього спирається), а не реальний тип джерела. Тому затримане, але
      // РЕАЛЬНЕ observed-вимірювання (напр. Kp з NOAA спостережень, просто на
      // 3 години старіше) все одно писало "estimated" в реченні — той самий клас
      // розсинхрону, що вже виправляли для DOM-writer'ів (fp227/228), але в
      // ІНШОМУ, досі не охопленому споживачі. Тепер текст бере реальний опис
      // джерела через resolveSourceLabel() — той самий, що всюди інде.
      const _srcDesc = (function(){
        try { const _r = resolveSourceLabel(); return _r.isRealObserved ? _r.combined.toLowerCase() : 'live-фон estimated'; }
        catch(_e){ globalThis.NRDiagnostics?.record('catch.163','recoverable');  return 'live-фон estimated'; }
      })();
      // v88.8.37-fp70: навіть при estimated зберігаємо застереження про слабкий фон,
      // якщо G_now негативний. Раніше estimated-гілка обходила live-guard і губила
      // інформацію «фон слабкий» — юзер бачив «МОЖНА ДІЯТИ» при PDF+3 і фоні −1.
      if (isFinite(sig.liveG) && sig.liveG < -0.3) {
        return `Оперативно обережно: фон G${sig.liveG.toFixed(1)} слабкий · PDF reference +${sig.dayScore} · ${_srcDesc}`;
      }
      return `Оперативно сприятливо; PDF reference +${sig.dayScore} · ${_srcDesc} — критичні дії лише після перевірки live-даних`;
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.168','recoverable'); }
  if(sig.dayScore >= 3) {
    // fp54-B: if live G is negative despite positive PDF — show divergence note
    if (isFinite(sig.liveG) && sig.liveG < -0.3 && sig.guard === 'none') {
      return `Оперативно обережно: фон G${sig.liveG.toFixed(1)} слабкий · PDF reference +${sig.dayScore}`;
    }
    return `Оперативно сприятливо; PDF reference +${sig.dayScore} узгоджений із поточним фоном`;
  }
  if(sig.dayScore >= 1) {
    // v88.8.37-fp70: симетрія з гілкою +3 — якщо фон зараз сильно негативний,
    // банер не каже беззастережно «діяти планово». Раніше тільки +3 мав цей guard,
    // через що PDF=+1/+2 з G_now≤−1 давали оптимістичний банер без застереження.
    if (isFinite(sig.liveG) && sig.liveG <= -1 && sig.guard === 'none') {
      return `Оперативно обережно: фон зараз тисне — почніть із рутини · PDF reference +${sig.dayScore}`;
    }
    return `Оперативно помірно сприятливо; PDF reference +${sig.dayScore} узгоджений із поточним фоном`;
  }
  if(sig.dayScore === 0) return sig.liveKey === 'tense' ? 'Нейтральний день, але фон зараз тисне — без поспіху' : 'Стандартний день';
  if(sig.dayScore === -1) return 'Сьогодні варто діяти обережно';
  // v88.8.35-fp18: -3 ескалація — окремий headline для "особливо несприятливий"
  // (раніше -2 і -3 давали однаковий "ЗАРАЗ УНИКАТИ").
  if(sig.dayScore <= -3) return 'Сьогодні особливо несприятливий день — краще без важливих кроків';
  // v88.8.37-fp70: командні слова (ЗАРАЗ СТОП/УНИКАТИ) → людська мова.
  // Слово «ЗАРАЗ» дублювалось із time-рядком «ЗАРАЗ +0.13» і плуталось.
  return 'Сьогодні без різких кроків — несприятливий день';
}/* NR_FN_END 249 */

/* NR_FN_BEGIN 250 */function heroLayerNoteFromHierarchy_v88824(sig){
  if(!sig || !sig.hasEngine) return '';
  const ds = sig.dayScore >= 0 ? '+'+sig.dayScore : String(sig.dayScore);
  const lg = isFinite(sig.liveG) ? (sig.liveG>=0?'+':'')+sig.liveG.toFixed(2) : '—';
  const src = sig.entry?._expertOverride ? 'PDF override' : 'Engine';
  if(sig.guard === 'unverified_override_large_delta'){
    const rawVal = sig.entry?._engRaw ?? sig.entry?.eng;
    const raw = isFinite(rawVal) ? (rawVal >= 0 ? '+' : '') + rawVal : '—';
    const cand = isFinite(sig.entry?._expertEngCandidate) ? (sig.entry._expertEngCandidate >= 0 ? '+' : '') + sig.entry._expertEngCandidate : '—';
    return `PDF#48 override не активовано: source не підтверджений. Raw engine=${raw}, candidate=${cand}. Фон зараз G=${lg}.`;
  }
  if(sig.dayScore >= 2 && (sig.guard === 'live_unstable' || sig.guard === 'live_tense')) return `Денний PDF/Engine прогноз: ${ds} (${src}) · Live-фон зараз G=${lg}. Команда зверху рахується від live-обмеження, не від зеленого дня.`;
  const liveZone = (GLOBAL_STATES[sig.liveKey] && GLOBAL_STATES[sig.liveKey].zone) ? GLOBAL_STATES[sig.liveKey].zone : 'фон';
  // v88.8.35-fp20: live-guard для DELAYED/ESTIMATED при позитивному дні.
  // Якщо source data затримана + PDF >=+2, користувач може помилково взяти live-G як надійний
  // і "активно діяти" на estimated-числі. Додаємо явне попередження.
  let _staleWarn = '';
  try {
    const _mode = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : null;
    if (sig.dayScore >= 2 && (_mode === 'estimated' || _mode === 'partial' || _mode === 'offline' || _mode === 'scenario')) {
      _staleWarn = ` · ⚠ Live-дані ${_mode.toUpperCase()} — перед важливою дією оновити через 5–10 хв.`;
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.169','recoverable'); }
  // v88.8.35-fp56-P8: default verdict note removed — it is now fully duplicated by #heroHierarchy
  // (Рішення дня / Фон зараз / Якість + live/daily Kp note). The unique divergence & guard branches
  // above (unverified override, live_unstable/live_tense) are kept — they carry info not in the hierarchy.
  return '';
}/* NR_FN_END 250 */

/* NR_FN_BEGIN 252 */function resolveCurrentOperationalG_v88825(){
  try {
    const _sig = getCurrentOperationalSignal();
    return _sig?.decisionAvailable && isFinite(_sig?.decisionScore) ? _sig.repG : NaN;
  } catch(e) { globalThis.NRDiagnostics?.record('catch.165','recoverable');  return NaN; }
}/* NR_FN_END 252 */

/* NR_FN_BEGIN 253 */function syncHero(){
  const _ui = window.__uiState || {};
  const nowG=el('nowG'), heroG=el('heroG');
  const newG = isFinite(_ui.gNow) ? _ui.gNow : (function(){ const m=(nowG?.textContent||'').match(/G\s*(-?\d+\.?\d*)/); return m?parseFloat(m[1]):NaN; })();
  const kpH_pre = isFinite(_ui.kpNow) ? _ui.kpNow : _num(_firstText(el('nowKp')));
  const _heroCanonicalSig = getCurrentOperationalSignal();
  const _heroSig = _heroCanonicalSig ? Object.assign({}, _heroCanonicalSig, {
    commandG: _heroCanonicalSig.repG,
    liveG: _heroCanonicalSig.operationalRawG
  }) : null;
  try {
    const _bridgeDecision = ({favorable:'ACT',good:'ACT',neutral:'UNKNOWN',unstable:'CAUTION',tense:'HOLD'})[_heroSig?.opKey] || 'UNKNOWN';
    localStorage.setItem('neborythm.canonical.runtime.v1', JSON.stringify({
      schema:'neborythm_canonical_runtime_v1', decision:_bridgeDecision,
      operational_score:isFinite(_heroSig?.operationalScore)?_heroSig.operationalScore:null,
      guard:_heroSig?.guard||'none', dynamic_guard:_heroSig?.dynamicGuard||null,
      reference_score:_heroSig?.hasEngine&&isFinite(_heroSig?.dayScore)?_heroSig.dayScore:null,
      kp:isFinite(kpH_pre)?kpH_pre:null, generated_at:new Date().toISOString(),
      source_id:'CANONICAL_DASHBOARD_RESOLVER', score_effect:1,
      research:{tanita_score_effect:0,v19_2_score_effect:0}
    }));
  } catch(_bridgeError) { window.NRDiagnostics.record('storage.runtime_bridge','recoverable',_bridgeError); }
  if(heroG){
    // Safety contract: the largest signal on screen is the operational state.
    // The frozen PDF/Engine score remains visible as a labelled reference, but
    // cannot stay green when the live/raw safety layer says stop or routine.
    const _hasVerdict = !!(_heroSig && _heroSig.decisionAvailable && isFinite(_heroSig.decisionScore));
    const _heroDisplayVal = _hasVerdict
      ? _operationalScoreFromState_v88825(_heroSig.opKey)
      : newG;
    // v88.9.14-fp195: v86-кільце (canvas/SVG центр) малюється ОКРЕМО від heroG
    // (legacy heroG прихований display:none) і завжди писало G_now — тому після
    // fp194 верхній блок казав "-2", а велике кільце далі показувало "+1.6".
    // Публікуємо verdict-стан для renderGRadialV86.
    window.__heroVerdictDisplay = {
      hasVerdict: _hasVerdict,
      val: _heroDisplayVal,
      operational: true,
      opKey: _heroSig.opKey,
      guard: _heroSig.guard,
      referenceVal: _heroSig.hasEngine ? _heroSig.dayScore : null
    };
    // v88.8.56: підпис під кільцем відповідає РЕАЛЬНОМУ стану — якщо engine недоступний
    // і йде fallback на G_now, підпис має це чесно показувати, а не завжди стверджувати
    // "PDF/Engine verdict" (інакше сам підпис стане джерелом тієї ж плутанини, що його
    // мали виправити).
    try{
      const _capEl = document.getElementById('heroLegendCaption');
      if(_capEl){
        // v88.9.48-fp230 FIX-CRITICAL (аудит-раунд-17, Problem 1): текст тут
        // писався для СТАРОЇ архітектури (до fp221), коли центр кільця
        // показував PDF-вердикт. Після fp221 кільце ЗАВЖДИ показує G_now
        // (архітектурна зміна: "кільце = G_now, вердикт — окремо") — але цей
        // caption і далі стверджував "Головне число: PDF/Engine verdict",
        // що прямо суперечило тому, що реально в центрі кільця (G_now,
        // не вердикт). Тепер текст відповідає реальній поведінці кільця.
        _capEl.innerHTML = _hasVerdict
          ? 'Головне число: <b style="color:var(--dim)">оперативний стан зараз</b><br>PDF/Engine і raw G показані окремо як джерела'
          : 'Головне число: <b style="color:var(--dim)">G_now — останній observed фон</b>';
      }
    }catch(_e){ window.NRDiagnostics?.record('legacy.catch.170','recoverable'); }

    // Repeated syncs keep the existing transition; unchanged values need no frames.
    if(Number.isFinite(_heroDisplayVal)) window._heroGprev=_heroDisplayVal;
    window.NRPresentation.heroValue(heroG,_heroDisplayVal,_hasVerdict);
    heroG.className='gbadge';
    // Colour must encode the same operational value that is printed.
    if(isFinite(_heroDisplayVal)){
      if(_heroDisplayVal>=1) heroG.classList.add('g-ok');
      else if(_heroDisplayVal>=0) heroG.classList.add('g-good');
      else if(_heroDisplayVal>=-2) heroG.classList.add('g-warn');
      else heroG.classList.add('g-bad');
    }
    // v88.7.15 Б: low-confidence badge — видимий тільки у зоні |G| ≤ 1 (engine F1=0.26 на neutral).
    // F1 0.84/0.69 описує історичне порівняння з PDF, не незалежні результати подій.
    try {
      const _lcb = document.getElementById('heroLowConfBadge');
      if (_lcb) {
        const _isLowConf = (_heroSig && _heroSig.hasEngine && isFinite(_heroSig.dayScore)) ? Math.abs(_heroSig.dayScore) <= 1 : (isFinite(newG) && Math.abs(newG) <= 1.0);
        _lcb.style.display = _isLowConf ? '' : 'none';
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.171','recoverable'); }
    // fp258: shadow HIGH-confidence badge. This never changes G; it only
    // reports the frozen post-hoc policy when today's expert raw is available.
    try {
      const _hcb=document.getElementById('heroStrongRawConfidence');
      const _ds=todayKyivStr();
      const _raw=_expertCalc && _expertCalc[_ds] ? Number(_expertCalc[_ds].raw_sum) : NaN;
      const _policyOK=_strongRawPolicy && _strongRawPolicy.condition==='abs(expert_raw_sum) >= 3' && Number(_strongRawPolicy.score_effect)===0;
      if(_hcb) _hcb.style.display=(_policyOK && Number.isFinite(_raw) && Math.abs(_raw)>=3)?'':'none';
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.172','recoverable'); }
    // fp265: calendar context is explanatory, never a second vote. Show a
    // warning only when its sign materially conflicts with the final day score.
    try {
      const _icb=document.getElementById('heroIndexConflict');
      const _ds=todayKyivStr();
      const _rec=_engineScores && _engineScores[_ds] ? _engineScores[_ds] : null;
      const _day=(_heroSig && _heroSig.hasEngine) ? Number(_heroSig.dayScore) : NaN;
      const _cal=_rec ? Number(_rec.cal_score) : NaN;
      const _conflict=Number.isFinite(_day) && Number.isFinite(_cal)
        && Math.abs(_cal)>=2 && Math.sign(_day)!==0 && Math.sign(_cal)!==0
        && Math.sign(_day)!==Math.sign(_cal);
      if(_icb){
        _icb.style.display=_conflict?'':'none';
        if(_conflict) _icb.title=`Engine/PDF ${_day>=0?'+':''}${_day}, calendar context ${_cal>=0?'+':''}${_cal}. Calendar context НЕ є другим голосом і не змінює G. Це лише попередження про розбіжність факторів.`;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.173','recoverable'); }

    // v88.8.4: 7-class verdict badge — canonical label з tag_to_text.json.
    // Показується завжди коли G визначений. Текст = full canonical verdict (наприклад
    // "Особливо несприятливий день", "Помірно сприятливий день").
    // Цвет background — з verdict_colors. Foreground — світлий для контрасту.
    // v88.8.19 UI clarity fix: label "Engine (7-class)" → "Live G (round)" щоб
    // уникнути плутанини з engine pill (engine_v18.8 + override) у hero block.
    // Hero classifies Live G round(continuous) = classified label. Це НЕ engine score.
    try {
      const _vb = document.getElementById('heroVerdict7Badge');
      if (_vb && typeof classifyVerdict7Class === 'function') {
        const v7 = classifyVerdict7Class(_heroSig.hasEngine ? _heroSig.dayScore : newG);
        if (v7) {
          // v88.8.35-fp56-P8: badge kept hidden — its content (7-class label + score) is now fully
          // duplicated by «РІШЕННЯ ДНЯ» in #heroHierarchy (P4). innerHTML still built below so the
          // element can be re-enabled instantly if ever needed; only the display toggle is forced off.
          _vb.style.display = 'none';
          _vb.style.background = v7.color + '22';
          _vb.style.borderLeft = `3px solid ${v7.color}`;
          _vb.style.color = v7.color;
          // Format: "Live G (round): Помірно сприятливий день (+1)"
          // Цей classifier бере round(continuous Hero G) — це НЕ engine v18.8 (frozen+patches).
          // Engine pill показано окремо справа у hero. G_ext (R&D advisory) — третя модель.
          const _liveLabel = (typeof _currentLang !== 'undefined' && _currentLang === 'EN') ? 'Live G' : 'Live G';
          _vb.innerHTML = `<span style="color:var(--faint);font-weight:400;font-size:10px" title="Класифікатор для Engine/PDF override, якщо доступний. Live G показаний у кільці як фон зараз.\n\nЦе НЕ engine v18.5 score (показано окремо у engine pill).\n3 моделі в hero за дизайном:\n• Live G — continuous (2−Kp+ΣAᵢ), real-time, classified тут\n• Engine v18.5 canonical pill — discrete (-3..+3), V3 freeze active\n• G_ext — R&D advisory regression (нижче у sci-bar)\nРізні значення = різні моделі, не баг.">PDF/Engine день:</span> ${v7.label} <span style="color:var(--faint);font-weight:500;font-size:10px">(${v7.score >= 0 ? '+' : ''}${v7.score})</span>`;
        } else {
          _vb.style.display = 'none';
        }
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.174','recoverable'); }

    // fp423: only an available resolver verdict may paint a verdict color.
    // Missing/stale reference keeps the ring neutral; raw G remains labeled context.
    let _heroSharedCls = _hasVerdict ? _heroSig.opKey : 'neutral';
    // Ring gauge
    const ring=document.getElementById('heroRingVal');
    if(ring&&isFinite(newG)){
      // v88.8.51-fp128: pct тепер на тій самій шкалі, що й велике число (вердикт -3..+3),
      // а не окремо на newG(-4..+4) — раніше кільце могло бути 100% заповнене (newG=+5),
      // а число показувати -3, суперечність в самій картці.
      const _hV = _hasVerdict ? _heroDisplayVal : newG;
      const pct=Math.max(0.05,Math.min(1,(_hV+4)/8));
      const offset=283*(1-pct);
      ring.style.strokeDashoffset=offset;
      // v88.8.51-fp128 BUGFIX: раніше колір рахувався окремою формулою тільки по newG,
      // без kp — тому storm-override у classifyStateByG (Kp≥5/7 не дає 'favorable'/'good')
      // ніколи не спрацьовував для кольору кільця. Наслідок: під час шторму (Kp=7.3)
      // кільце було ЗЕЛЕНИМ при G_now=+4.03, хоча вердикт дня — "особливо несприятливий".
      // Тепер колір і клас кільця рахуються з ОДНІЄЇ класифікації (з kp + verdict cap).
      const _heroRingColor = {favorable:'#2bd47d', good:'#63be7b', neutral:'#9bb1dc', unstable:'#ffaa33', tense:'#ff4444'}[_heroSharedCls] || '#9bb1dc';
      ring.style.stroke=_heroRingColor;
      // v78b: ring state animation class
      const ringWrap=document.getElementById('heroRing');
      if(ringWrap){
        ringWrap.classList.remove('ring-neutral','ring-unstable','ring-tense','ring-favorable','ring-good');
        ringWrap.classList.add('ring-'+_heroSharedCls);
      }
    }

    // Data-driven hero background
    const hc=document.getElementById('heroCard');
    if(hc&&isFinite(newG)){
      const r=({tense:'rgba(255,68,68,.08)', unstable:'rgba(255,170,51,.06)', favorable:'rgba(43,212,125,.08)', good:'rgba(99,190,123,.05)', neutral:'rgba(55,167,255,.04)'})[_heroSharedCls] || 'rgba(55,167,255,.04)';
      hc.style.setProperty('--g-glow',r);
    }
  }
  // v80: read from __uiState instead of DOM
  const gVal = isFinite(_ui.gNow) ? _ui.gNow : _num(_firstText(el('nowG'))||el('nowG')?.textContent);
  const kpH = kpH_pre;
  const _heroCmdG = _heroSig.commandG;

  // Delta: from __uiState or fallback
  // v85b-F7: fallback delta з попереднього G (щоб heroDelta не був порожній)
  // v85b-F8.1: якщо немає історії — ховати блок (не "ΔG —" placeholder)
  let dn = isFinite(_ui.delta) ? _ui.delta : NaN;
  let _hasDeltaHistory = false;
  if (!isFinite(dn) && isFinite(gVal)) {
    const _prev = window._prevGforHeroDelta;
    if (isFinite(_prev)) {
      dn = Math.round((gVal - _prev) * 100) / 100;
      _hasDeltaHistory = true;
    }
    window._prevGforHeroDelta = gVal;
  } else if (isFinite(dn)) {
    _hasDeltaHistory = true;
  }
  // v88.9.29-fp210: нормалізація «−0.00» — крихітні відʼємні Δ (напр. -0.001)
  // після toFixed(2) давали "↓ -0.00" / "→ −0.00", що виглядало як помилка.
  // Все з |Δ| < 0.005 показуємо як рівно 0 (стрілка "→ 0.00").
  if (isFinite(dn) && Math.abs(dn) < 0.005) dn = 0;
  // v88.9.39-fp221: heroDelta і v86DeltaInline — обидва завжди про G_now.
  // Кільце тепер ЗАВЖДИ показує G_now (fp221, вище), ніколи не вердикт —
  // тому гейтинг "ховати дельту, коли центр показує вердикт" (fp215/fp218)
  // більше не потрібен: центр і дельта завжди одна метрика.
  const hd=el('heroDelta');
  if(hd){
    if(_hasDeltaHistory && isFinite(dn)){
      const _sign = dn > 0 ? '↑ +' : dn < 0 ? '↓ ' : '→ ';
      hd.textContent = _sign + dn.toFixed(2);
      hd.style.color=dn>0.05?'var(--ok)':dn<-0.05?'var(--bad)':'var(--muted)';
      hd.style.display='';
      // v87.53: явно пояснюємо що delta = runtime snapshot (24h), не daily average
      hd.title = 'Δ G за ~24 год (runtime snapshot, оновлюється кожні 5 хв).\nЦе не daily average — історія у 30-day графіку рахується інакше.';
    } else {
      // Нема історії — ховаємо блок до другого refresh
      hd.textContent='';
      hd.style.display='none';
      hd.title = '';
    }
  }

  // Delta remains explicitly about G_now, independently of the operational ring.
  const _hdi = el('v86DeltaInline');
  if(_hdi){
    if(_hasDeltaHistory && isFinite(dn)){
      const _absd = Math.abs(dn);
      const _arr = dn > 0.05 ? '↑' : dn < -0.05 ? '↓' : '→';
      const _sgn = dn > 0 ? '+' : dn < 0 ? '−' : '';
      // v88.9.41-fp223 (аудит-раунд-10, Problem 3): "→ 0.00" без підпису "Δ"
      // не було зрозуміло, що це зміна. Додано короткий префікс "Δ".
      // v88.9.43-fp225 (doc14, Problem 7): для нейтральної дельти (_arr='→')
      // стрілка на дрібному шрифті могла сприйматись як мінус — прибрано лише
      // для цього випадку. Для реальних ↑/↓ змін стрілка лишається — там вона
      // несе змістовну інформацію про напрям.
      _hdi.textContent = _arr === '→' ? ('Δ ' + _absd.toFixed(2)) : ('Δ ' + _arr + ' ' + _sgn + _absd.toFixed(2));
      // Колір: сильний сигнал при |Δ|≥0.5, слабкий при 0.1–0.5, нейтральний інакше
      _hdi.style.color = _absd < 0.1 ? 'var(--muted)'
                       : dn > 0 ? (_absd >= 0.5 ? 'var(--ok)' : '#9fd7b4')
                                : (_absd >= 0.5 ? 'var(--bad)' : '#e79a9a');
      _hdi.style.opacity = _absd < 0.1 ? '.6' : '1';
      // v87.53: hint про природу delta (runtime 24h, не daily average)
      _hdi.title = 'Δ G за ~24 год (runtime snapshot).\nРізниться з daily історією — це нормально.';
    } else {
      _hdi.textContent = '';
      _hdi.title = '';
    }
  }

  // v87.14: прибрано дублікатний C-score writer (v87.10/v87.13) —
  // computeCScore з fixed freshness reading тепер працює коректно через _ui.confPct.
  // Блок heroConfidence пишеться нижче на base of _ui.confPct.

  // v87.10: Delta Card — "що змінилось за 24h"
  // v87.13: додатково зазначити тренд на завтра щоб уникнути дисонансу з heroTomorrow
  // v87.90: honesty fix — показати реальний age порівняння (raw +1.8 за 18h ≠ за 24h)
  try {
    const dc = el('deltaCard');
    if (dc && isFinite(gVal)) {
      const _gd = _getGDelta();
      const _d24 = _gd.d24h;
      if (isFinite(_d24) && Math.abs(_d24) >= 0.3) {
        const _abs = Math.abs(_d24).toFixed(1);
        const _sign = _d24 > 0 ? '+' : '−';
        const _isPos = _d24 > 0;
        // v88.8.37-fp70: поріг підвищено 0.5→1.0 — зміна <1.0 є шумом і не змінює рішення.
        // Раніше +0.5 показувалось як «піднявся» — мало сенсу для користувача.
        const _state = Math.abs(_d24) < 1.0 ? 'stable' : _isPos ? 'improving' : 'worsening';
        const _icon = _state === 'improving' ? '📈' : _state === 'worsening' ? '📉' : '➡️';
        // v87.90: реальний age у годинах та підпис "vs Nh тому" якщо відхилення ≥ 2h
        const _ageH  = _gd.t24h ? Math.round((Date.now() - _gd.t24h) / 3600000) : 24;
        const _ageMatch = (_ageH >= 20 && _ageH <= 28); // v88.7.14 E2: розширено з [22, 26] — DST shift і затримки fetch роблять 27-29h типовим, не варто трактувати як аномалію.
        const _ageNote  = _ageMatch ? '' : ` (vs ${_ageH}h тому)`;
        const _gPrev    = isFinite(_gd.g24h) ? _gd.g24h.toFixed(2) : '?';
        const _tHHMM    = _gd.t24h ? new Date(_gd.t24h).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}) : '?';
        const _ttip     = `Реальне порівняння: G ${_gPrev} → ${gVal.toFixed(2)} (Δ ${_sign}${_abs}).\nПопередня точка: ${_tHHMM} (~${_ageH}год тому).\n${_ageMatch ? 'У межах nominal 24h.' : 'Поза точними 24h — найближча доступна точка з історії.'}`;
        const _title = _state === 'improving' ? 'Покращення з вчорашнього дня'
                     : _state === 'worsening' ? 'Погіршення з вчорашнього дня'
                     : 'Стабільно з вчорашнього дня';
        const _body = _state === 'improving'
          ? `Зміна live G_now від учора: <span class="dc-metric is-pos">+${_abs}</span> <span style="color:var(--faint);font-size:10px">(це Δ, не поточне значення; зараз ${gVal>=0?'+':''}${gVal.toFixed(1)})</span>${_ageNote} — фон став легший; денний reference дивись окремо у PDF/Engine.`
          : _state === 'worsening'
          ? `Зміна live G_now від учора: <span class="dc-metric is-neg">−${_abs}</span> <span style="color:var(--faint);font-size:10px">(це Δ, не поточне значення; зараз ${gVal>=0?'+':''}${gVal.toFixed(1)})</span>${_ageNote} — фон важчий; денний reference дивись окремо у PDF/Engine.`
          : `Δ24ч = ${_sign}${_abs}${_ageNote} — суттєвих змін немає.`;
        // v87.13: додатковий рядок про завтра (якщо відомо)
        // v88.8.35-fp5: додати поряд PDF/Engine score для завтра + override semantics
        // якщо PDF/Engine ≤ −2 завтра, забороняємо позитивні фрази у _body.
        let _tomorrowLine = '';
        let _tomEngScore = null;
        try {
          const _tomDate = kyivDayDate(1);
          const _tomEntry = (typeof getEngineScore === 'function') ? getEngineScore(_tomDate) : null;
          if (_tomEntry && isFinite(_tomEntry.eng)) _tomEngScore = Number(_tomEntry.eng);
        } catch(e){ globalThis.NRDiagnostics?.record('catch.166','recoverable');  _tomEngScore = null; }
        const _tg = window.__tomorrowG;
        if (isFinite(_tg)) {
          // v88.8.35-fp14 AA: КРИТИЧНА правка шкал.
          // Раніше _tDiff = _tg - gVal міксував G_day_raw_завтра (доба) з G_now (live 3-год слот).
          // Це давало "покращиться на 5.7", де реальний intra-day swing G_now → G_day був ~1-2.
          // Беремо G_day_raw_сьогодні (з _27dComputed або engine recalc) як baseline.
          // Якщо немає — fallback на gVal з помітним застереженням про мікс шкал.
          let _todayGdayRaw = NaN;
          try {
            if (typeof _27dComputed !== 'undefined' && Array.isArray(_27dComputed)) {
              const _todayStrDC = todayKyivStr();
              const _todayEntry = _27dComputed.find(d => d && d.ds === _todayStrDC);
              if (_todayEntry && isFinite(_todayEntry.G)) _todayGdayRaw = _todayEntry.G;
            }
          } catch(e){ window.NRDiagnostics?.record('legacy.catch.175','recoverable'); }
          const _hasGdayBaseline = isFinite(_todayGdayRaw);
          const _baseline = _hasGdayBaseline ? _todayGdayRaw : gVal;
          const _tDiff = _tg - _baseline;
          // v88.8.37-fp70: _engStr видалено — PDF/Engine тепер інлайниться в _engMain.
          const _scaleHint = _hasGdayBaseline
            ? ` <span class="hint" tabindex="0" style="cursor:help;color:var(--faint);font-size:9px;border-bottom:1px dotted var(--faint)">ⓘ<span class="hint-pop" style="white-space:pre;font-size:10px">G_day_raw_завтра (${_tg>=0?'+':''}${_tg.toFixed(1)}) − G_day_raw_сьогодні (${_todayGdayRaw>=0?'+':''}${_todayGdayRaw.toFixed(1)}) = Δ ${_tDiff>=0?'+':''}${_tDiff.toFixed(1)}.\nОбидві величини у одній шкалі G_day_raw (доба).</span></span>`
            : ` <span class="hint" tabindex="0" style="cursor:help;color:#ffaa33;font-size:9px;border-bottom:1px dotted #ffaa33">⚠<span class="hint-pop" style="white-space:pre;font-size:10px">G_day_raw_сьогодні недоступний — використано G_now (live слот) як приблизний baseline. Реальна різниця доба-до-доби може відрізнятись.</span></span>`;
          if (Math.abs(_tDiff) >= 0.5) {
            const _tDir = _tDiff > 0 ? 'покращиться' : 'просяде';
            const _tCls = _tDiff > 0 ? 'is-pos' : 'is-neg';
            const _tAbs = Math.abs(_tDiff).toFixed(1);
            // v88.8.37-fp70: PDF/Engine = головний прогноз дня, raw — довідковий фон у дужках.
            // Раніше raw йшов першим → користувач читав 2 рівноправні числа на завтра.
            const _engMain = (_tomEngScore !== null)
              ? `Завтра: <span class="dc-metric ${_tomEngScore >= 0 ? 'is-pos' : 'is-neg'}">${_tomEngScore >= 0 ? '+' : ''}${_tomEngScore}</span> <span style="color:var(--faint);font-size:10px">PDF/Engine — прогноз дня</span>`
              : `Завтра G_day raw: <span class="dc-metric ${_tCls}">${_tg >= 0 ? '+' : ''}${_tg.toFixed(1)}</span>`;
            const _rawRef = (_tomEngScore !== null)
              ? ` <span style="color:var(--faint);font-size:10px">· фон ${_tDir} на ${_tAbs} (raw ${_tg >= 0 ? '+' : ''}${_tg.toFixed(1)})${_scaleHint}</span>`
              : ` (${_tDir} на ${_tAbs}${_scaleHint})`;
            _tomorrowLine = `<div class="dc-subline">${_engMain}${_rawRef}.</div>`;
          } else {
            const _engMain = (_tomEngScore !== null)
              ? `Завтра: <span class="dc-metric ${_tomEngScore >= 0 ? 'is-pos' : 'is-neg'}">${_tomEngScore >= 0 ? '+' : ''}${_tomEngScore}</span> <span style="color:var(--faint);font-size:10px">PDF/Engine — прогноз дня</span> <span style="color:var(--faint);font-size:10px">· raw ${_tg >= 0 ? '+' : ''}${_tg.toFixed(1)} без суттєвих змін${_scaleHint}</span>`
              : `Завтра G_day raw: <span class="dc-metric">${_tg >= 0 ? '+' : ''}${_tg.toFixed(1)}</span> (без суттєвих змін${_scaleHint})`;
            _tomorrowLine = `<div class="dc-subline">${_engMain}.</div>`;
          }
        }
        // v88.8.35-fp5: якщо завтра PDF/Engine ≤ −2 і блок зараз "improving" — downgrade до stable
        // і додати застереження. Це усуває конфлікт "фон піднявся +3.7" vs "15.05 PDF/Engine −3".
        // v88.8.35-fp7 H: візуально маркуємо контейнер amber-станом is-conflict.
        const _hasPdfConflict = (_tomEngScore !== null && _tomEngScore <= -2);
        if (_hasPdfConflict) {
          _tomorrowLine += `<div class="dc-subline" style="color:#ffaa33;font-size:11px">⚠ PDF/Engine reference завтра = ${_tomEngScore>=0?'+':''}${_tomEngScore}; це зона високого ризику (≤ −2), тому оперативний контур не може бути м'якшим.</div>`;
        }
        // v88.8.41-fp104: РЯДОК "Сьогодні G_day raw" — усуває конфлікт Hero(G_now) vs 27-day graph(G_day_raw).
        // Раніше показувався тільки G_now (live) у Hero, а G_day_raw сьогодні видно лише
        // прокрутивши до 27-day секції — звідси скарга "+3.8 в графіку, -0.5 в hero = баг".
        let _todayRawLine = '';
        try {
          let _tdGRaw = NaN;
          if (typeof _27dComputed !== 'undefined' && Array.isArray(_27dComputed)) {
            const _todayStr2 = todayKyivStr();
            const _todayEntry2 = _27dComputed.find(d => d && d.ds === _todayStr2);
            if (_todayEntry2 && isFinite(_todayEntry2.G)) _tdGRaw = _todayEntry2.G;
          }
          if (isFinite(_tdGRaw) && isFinite(gVal) && Math.abs(_tdGRaw - gVal) >= 0.5) {
            _todayRawLine = `<div class="dc-subline" style="font-size:10px;color:var(--faint)">
              ℹ Це <strong>live G_now</strong> (поточний 3-год слот). Daily potential (G_day raw, 27-day графік) сьогодні:
              <span style="color:${_tdGRaw>=0?'#7ee787':'#ff9999'};font-weight:700">${_tdGRaw>=0?'+':''}${_tdGRaw.toFixed(1)}</span>
              — це різні шкали: live vs daily aggregate, не помилка.
            </div>`;
          }
        } catch(e){ window.NRDiagnostics?.record('legacy.catch.176','recoverable'); }
        dc.className = (_hasPdfConflict ? 'is-conflict ' : '') + 'is-' + _state;
        dc.title = _ttip; // v87.90: tooltip з реальним age та timestamp
        dc.innerHTML = `<span class="dc-icon">${_icon}</span>`
                     + `<div class="dc-text">`
                     + `<div class="dc-title">${_title}</div>`
                     + `<div class="dc-body">${_body}</div>`
                     + _tomorrowLine
                     + _todayRawLine
                     + `</div>`;
        dc.style.display = '';
      } else {
        dc.style.display = 'none';
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.177','recoverable'); }

  // v87.18: Decision Layer — "Що робити зараз" (конкретні actions)
  try { renderDecisionLayer(_heroCmdG, _ui); } catch(e){ window.NRDiagnostics?.record('legacy.catch.178','recoverable'); }

  // Confidence: set by v83 decision block below

  // Freshness — v80: from __uiState, fallback to DOM
  // v87.15 fix A4: читати всі варіанти включно з cached/delayed — раніше hero показував LIVE коли badge CACHED
  // v87.91 fix: тепер пріоритет — resolveDataMode() (live | partial | scenario | offline).
  // Старий _frState залишено як fallback для tooltips з причинами зниження довіри.
  const _frState = _ui.freshness || (function(){
    const t=_strip(el('freshnessBadge')?.textContent||'LIVE').toLowerCase();
    if (t.includes('offline') || t.includes('old')) return 'old';
    if (t.includes('stale')) return 'stale';
    if (t.includes('cached') || t.includes('delayed')) return 'cached';
    return 'live';
  })();
  // fp79 FIX: resolveDataModeExtended → 'estimated' для нормального NOAA 3h циклу (не DELAYED)
  const _dataMode = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : 'live';
  window.__dataMode = _dataMode; // v87.91: глобально доступно для інших рендерів (heroTomorrow тощо)
  // v88.9.40-fp222 (Problem 4, writer 4/4): публікуємо в __sourceState. Guard: не
  // перезаписуємо mode='degraded' мовчки — resolveDataModeExtended() не знає про
  // DEGRADED (окрема детекція watchdog'а), тому без guard'а цей writer міг би
  // тихо "повернути" стан назад до estimated/live одразу після того, як watchdog
  // щойно виявив DEGRADED — відтворивши ту саму гонку станів у новому об'єкті.
  if (typeof _updateSourceState === 'function') {
    const _curMode = window.__sourceState && window.__sourceState.mode;
    if (_curMode !== 'degraded' || window.__isDegraded !== true) {
      _updateSourceState({ mode: _dataMode });
    }
  }
  const hf=el('heroFreshness');
  if(hf){
    // Маппинг dataMode → display label
    // v88.8.35-fp9 O: 'partial' рендериться як DELAYED для словесної консистентності з top freshnessBadge
    // (раніше Hero казав PARTIAL, top — DELAYED, користувач плутався).
    // v88.9.43-fp225 FIX-CRITICAL (doc15, Problem 1): estimated мапився на
    // 'LIVE' — тому Hero завжди писав "LIVE", навіть коли верхній
    // freshnessBadge (інше джерело правди) казав "ESTIMATED · контент 6.0г".
    // Саме цей розсинхрон видно на скріні. Тепер узгоджено з верхнім бейджем.
    // v88.9.46-fp228 FIX-CRITICAL (аудит-раунд-15): ЦЕЙ writer — справжня
    // причина, чому "ESTIMATED" поверталось назад навіть після fp227.
    // syncHero() виконується ПІСЛЯ _renderFreshnessState() (яка вже писала
    // правильний "OBSERVED · DELAYED 5.0г" через resolveSourceLabel()) і
    // ПЕРЕЗАПИСУВАВ heroFreshness.innerHTML назад на плоский "ESTIMATED" —
    // старий паралельний renderer, точно як здогадався аудит. Тепер і цей
    // writer читає ту саму resolveSourceLabel().
    const _modeLabel = {
      live:      'LIVE',
      estimated: (function(){ try { const _r = resolveSourceLabel(); return _r.isRealObserved ? _r.combined : 'ESTIMATED'; } catch(_e){ globalThis.NRDiagnostics?.record('catch.167','recoverable');  return 'ESTIMATED'; } })(),
      partial:   'DELAYED',
      scenario:  'SCENARIO',
      offline:   'OFFLINE'
    }[_dataMode] || 'LIVE';
    const _modeTip = ({
      live:      'Дані live: Kp обсервації + NOAA 3-day forecast доступні.',
      estimated: 'Kp ≤12год (норма циклу NOAA 3год). Forecast реальний. PDF/Engine актуальний.',
      partial:   'Затримані live-дані; PDF/Engine день актуальний.\n\nДеталі: Kp обсервації live, але forecast cached/delayed. Тренди можуть бути затримані.\nPDF/Engine і frozen engine_scores працюють штатно — це обмеження стосується лише live/raw rail-ів.',
      scenario:  '⚠ Без NOAA forecast; PDF/Engine reference актуальний.\n\nДеталі: Завтра/3-day показано як плато на базі поточного Kp — це сценарій, не справжній прогноз.\nPDF/Engine і frozen engine_scores лишаються довідковим денним сигналом, не дозволом на дію.',
      offline:   '⚠ Дані з кешу; PDF/Engine reference актуальний.\n\nДеталі: навіть Kp обсервації недоступні. Все, що показано — з кешу.\nPDF/Engine і frozen engine_scores лишаються довідковим денним сигналом, не дозволом на дію.'
    })[_dataMode] || '';
    // Інжектимо label + hint-pop, не перетираємо весь innerHTML інших слотів
    hf.innerHTML = _modeLabel + (_modeTip ? `<span class="hint-pop" style="white-space:pre-line;font-size:12px;text-align:left;max-width:280px">${_modeTip}</span>` : '');
    if (!hf.classList.contains('hint')) hf.classList.add('hint');
    hf.classList.remove('live','cached','stale');
    if (_dataMode === 'live' || _dataMode === 'estimated') hf.classList.add('live');
    else if (_dataMode === 'partial') hf.classList.add('cached');
    else hf.classList.add('stale');
    // Native title як accessibility fallback (screen readers + tab focus)
    hf.title = _modeTip;
  }
  // v88.8.35-fp8 L: синхронізація heroRingLabel з _dataMode.
  // Раніше (fp7 G) label завжди писав "G_now · live", навіть коли heroFreshness = DELAYED/PARTIAL.
  // Це створювало конфлікт довіри. Тепер слово після крапки відповідає реальному стану джерела.
  try {
    const _hrl = document.getElementById('heroRingLabel');
    if (_hrl) {
      const _ringMode = ({
        live:      'live',
        estimated: 'live',
        partial:   'delayed',
        scenario:  'scenario',
        offline:   'offline'
      })[_dataMode] || 'live';
      const _ringTip = ({
        live:      'Hero ring показує live-фон зараз. Verdict дня — у PDF/Engine pill справа.',
        estimated: 'Hero ring: Kp ≤12год (норма циклу NOAA 3год). Forecast реальний.',
        partial:   'Hero ring використовує затримані live-дані (DELAYED). Фон орієнтовний — перед діями перевір PDF/Engine.',
        scenario:  'NOAA forecast недоступний; ring показує сценарій на базі поточного Kp, не реальний live.',
        offline:   'Дані з кешу — ring не оновлюється з NOAA. Не покладайся на live-фон для рішень.'
      })[_dataMode] || '';
      _hrl.textContent = 'G_now · ' + _ringMode;
      _hrl.title = _ringTip;
      // Кольоровий контраст: live=сірий dim (default), partial=amber, scenario/offline=red
      _hrl.style.color = (_ringMode === 'live') ? 'var(--dim)'
                       : (_ringMode === 'delayed') ? '#ffaa33'
                       : '#ff8888';
      _hrl.style.borderColor = (_ringMode === 'live') ? 'rgba(155,177,220,.18)'
                             : (_ringMode === 'delayed') ? 'rgba(255,170,51,.32)'
                             : 'rgba(255,136,136,.32)';
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.179','recoverable'); }
  // v87.92: dataset.scenario для heroTomorrow — третя точка синхронізації (після render3Day і _renderFreshnessState).
  // CSS ::after pseudo-element рендерить '⚠ scenario' автоматично.
  // v87.94: + sibling DOM heroTomorrowScenario для повної надійності
  const _ht = el('heroTomorrow');
  const _htSib = el('heroTomorrowScenario');
  if (_ht) {
    if (_dataMode === 'scenario') {
      _ht.dataset.scenario = '1';
      if (_htSib) { _htSib.textContent = '⚠ SCENARIO'; _htSib.className = 'scenario'; }
    } else if (_dataMode === 'offline') {
      _ht.dataset.scenario = 'offline';
      if (_htSib) { _htSib.textContent = '⚠ OFFLINE'; _htSib.className = 'offline'; }
    } else {
      delete _ht.dataset.scenario;
      if (_htSib) { _htSib.textContent = ''; _htSib.className = ''; }
    }
  }

  _set('heroStamp', _ui.stamp || (el('stamp')?.textContent||'').replace('Оновлено:','').trim() || '—');

  // v85b-F8.4: compact next-shift chip in hero-right (mirrors timingNextShift)
  const _hnsChip = el('heroNextShiftChip');
  const _nsSource = el('timingNextShift');
  if (_hnsChip && _nsSource) {
    const _nsText = (_nsSource.textContent || '').trim();
    if (_nsText && _nsText.length > 3) {
      // Normalize: remove leading bullets/emojis, keep core text
      const _clean = _nsText.replace(/^[·•●▲⚠◔\s]+/, '').substring(0, 60);
      _hnsChip.textContent = '⇥ ' + _clean;
      _hnsChip.style.display = '';
    } else {
      _hnsChip.style.display = 'none';
    }
  }

  // v70.9: trend arrow under ring
  const ht=el('heroTrend');
  if(ht&&isFinite(dn)){
    const arrow=dn>0.3?'↑':dn<-0.3?'↓':'→';
    const word=dn>0.3?'зростає':dn<-0.3?'падає':'стабільно';
    ht.textContent=arrow+' '+word;
    ht.style.color=dn>0.3?'var(--ok)':dn<-0.3?'var(--bad)':'var(--muted)';
  }

  // v83: heroActionCmd set by buildDecisionTexts below
  // v78b: DO/AVOID from operational hierarchy (Engine day verdict guarded by Live G)
  // fp426: action-copy is governed by the same authority gate as the Hero
  // number/ring. Raw G/opKey remains informational when the reference is
  // unavailable or stale and must never become an operational command.
  const _actionVerdictAvailable = !!(_heroSig && _heroSig.decisionAvailable && isFinite(_heroSig.decisionScore));
  const _stKey = _actionVerdictAvailable
    ? (_heroSig.opKey || classifyStateByG(gVal, kpH))
    : 'neutral';
  const _st = GLOBAL_STATES[_stKey];
  // fp43: use canonical resolveStormWindow() — replaces fp33/fp40/fp42 inline computes
  try {
    window._stormWindow = resolveStormWindow(new Date(), window._daySlots || [], kpH);
  } catch(_eS) { globalThis.NRDiagnostics?.record('catch.168','recoverable');  window._stormWindow = window._stormWindow || null; }
  // fp30-A: storm-guard on heroDecisionDo — override positive doText when storm incoming
  // fp43: active storm → full block regardless of _stKey
  // fp45: DELAYED mode → prefix "орієнтовно"
  const _sw30 = window._stormWindow;
  const _dm45 = (typeof resolveDataMode === 'function') ? resolveDataMode() : 'live';
  const _delayedPrefix = (_dm45 !== 'live') ? 'орієнтовно: ' : '';
  let _stormDoText;
  if (_sw30 && isFinite(_sw30.kp) && _sw30.kp >= 5) {
    _stormDoText = _sw30.active
      ? `✖ Kp=${_sw30.kp.toFixed(1)} АКТИВНА — тільки рутина`
      : (_stKey === 'favorable' || _stKey === 'good')
      ? `${_delayedPrefix}Планові перевірені дії лише до ${String(_sw30.label).padStart(2,'0')}:00 UTC; далі буревий ризик`
      : `${_delayedPrefix}${_st.doText} · буря Kp=${_sw30.kp.toFixed(1)} очікується о ${String(_sw30.label).padStart(2,'0')}:00 UTC`;
  } else {
    _stormDoText = _delayedPrefix + _st.doText;
  }
  // v88.9.6x-fp248 FIX-CRITICAL (аудит fp247, п.2): Hero показував «МОЖНА
  // ДІЯТИ» / «Можна діяти активно» одночасно з «Yama активний — не починати
  // нових справ» в особистому блоці — Hero не бачив Rahu/Yama/Gulika взагалі.
  // Буря вже оброблена гілкою вище (той самий пріоритет буря>вікно), тут
  // реагуємо лише на 'window:' причини.
  let _heroAvoidText = _st.avoidText;
  try {
    const _gcdHero = (typeof getCurrentSlotDecision === 'function') ? getCurrentSlotDecision() : null;
    if (_gcdHero && _gcdHero.blockedNow && !_gcdHero.reasonsNow.includes('storm')) {
      const _namesHero = _gcdHero.reasonsNow.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+');
      const _untilHero = (_gcdHero.blockedUntilH != null) ? ` до ${_fmtKyivFromUTCFloat(_gcdHero.blockedUntilH)}` : '';
      // fp414: this is an operational action card, so its numeric label must use
      // the same decisionScore as the Hero ring. dayScore is the separate PDF
      // reference and previously produced "Рішення дня +1" beside Hero -1.
      const _dayDecisionTxt = _heroSig && isFinite(_heroSig.decisionScore)
        ? `Оперативний стан ${_heroSig.decisionScore>=0?'+':''}${_heroSig.decisionScore}`
        : 'Поточний фон';
      _stormDoText = (_stKey === 'favorable' || _stKey === 'good')
        ? `${_delayedPrefix}Сприятливий день, але зараз ${_namesHero}: тільки рутина${_untilHero}`
        : `${_delayedPrefix}${_dayDecisionTxt}: тільки необхідна рутина; зараз ${_namesHero}${_untilHero}`;
      _heroAvoidText = `Не починати нових справ${_untilHero} (${_namesHero} активний)`;
    }
  } catch(_eGcdHero){ window.NRDiagnostics?.record('legacy.catch.180','recoverable'); }
  if (!_actionVerdictAvailable) {
    const _whyUnavailable = _heroSig && _heroSig.referenceStale
      ? 'денний reference застарів'
      : 'денний reference недоступний';
    _stormDoText = `Рішення недоступне: ${_whyUnavailable}; G_now — лише довідковий фон`;
    _heroAvoidText = 'Не формувати команду до дії, доки authority-resolver не отримає чинний reference';
  }
  _set('heroDecisionDo', _stormDoText);
  _set('heroDecisionAvoid', _heroAvoidText);
  const _doEl = el('heroDecisionDo');
  if(_doEl) _doEl.style.color = _st.color;
  // v88.9.59-fp241 FIX-CRITICAL (аудит-раунд-27, Problem 2): CSS для
  // #heroDecisionDo має ЖОРСТКИЙ зелений фон (rgba(43,212,125,...) з
  // !important) незалежно від стану джерела — тому текстовий префікс
  // "орієнтовно:" (fp45) НЕ міняв візуальну вагу блоку, він і далі виглядав
  // як впевнена команда action-NOW, хоча дані delayed. Коли фон/дія
  // сприятливі (favorable/good), АЛЕ джерело не live — притлумлюємо зелений
  // на нейтрально-попереджувальний, той самий inline-override прийом, що вже
  // застосований нижче для avoidEl.
  try {
    if (_doEl && !_actionVerdictAvailable) {
      _doEl.style.setProperty('background','rgba(155,177,220,.08)','important');
      _doEl.style.setProperty('border-color','rgba(155,177,220,.24)','important');
      _doEl.style.setProperty('color','#cfe0ff','important');
    } else if (_doEl && (_stKey === 'favorable' || _stKey === 'good')) {
      const _rslDo = (typeof resolveSourceLabel === 'function') ? resolveSourceLabel() : null;
      if (_rslDo && !_rslDo.isLive) {
        _doEl.style.setProperty('background','rgba(255,204,68,.08)','important');
        _doEl.style.setProperty('border-color','rgba(255,204,68,.28)','important');
        _doEl.style.setProperty('color','#ffe9b3','important');
      } else {
        // v88.9.60-fp242 САМОАУДИТ-ФІКС: реальний jsdom-тест виявив, що
        // removeProperty('background') НІЧОГО не робить — background це
        // shorthand-властивість, яку setProperty розгортає в background-color
        // (та інші лонгхенди), а removeProperty шукає буквально "background"
        // (якого вже немає як окремого запису) — фон лишався жовтим НАЗАВЖДИ
        // навіть після повернення до live-стану. Пряме присвоєння порожнього
        // рядка коректно очищає весь shorthand.
        _doEl.style.background = '';
        _doEl.style.borderColor = '';
      }
    } else if (_doEl) {
      const _isNegativeDecision = (_stKey === 'tense' || _stKey === 'unstable');
      if (_isNegativeDecision) {
        _doEl.style.setProperty('background','rgba(255,107,107,.10)','important');
        _doEl.style.setProperty('border-color','rgba(255,107,107,.40)','important');
        _doEl.style.setProperty('color','#ffd6d6','important');
      } else {
        _doEl.style.background = '';
        _doEl.style.borderColor = '';
        _doEl.style.color = '';
      }
    }
  } catch(_eDo){ window.NRDiagnostics?.record('legacy.catch.181','recoverable'); }
  try {
    const _avoidEl = el('heroDecisionAvoid');
    const _note = heroLayerNoteFromHierarchy_v88824(_heroSig);
    if(_avoidEl){
      // fp248: _heroAvoidText (не _st.avoidText напряму) — інакше цей блок
      // перезаписував би override з Rahu/Yama/Gulika guard-у вище.
      _avoidEl.innerHTML = _note
        ? `${_heroAvoidText}<br><span style="font-size:10px;color:var(--faint);font-weight:600">${_note}</span>`
        : _heroAvoidText;
    }
    // v88.8.35-fp20 fix: avoid block при позитивному дні (favorable/good) — нейтральний фон,
    // не червоний. Інакше "Підтримуйте темп без хаосу" виглядає алармовано на сприятливому дні.
    if(_avoidEl){
      const _isPositive = (_stKey === 'favorable' || _stKey === 'good');
      if(_isPositive){
        _avoidEl.style.setProperty('background','rgba(155,177,220,.08)','important');
        _avoidEl.style.setProperty('border-color','rgba(155,177,220,.22)','important');
        _avoidEl.style.setProperty('color','#cfe0ff','important');
      } else {
        // v88.9.60-fp242 САМОАУДИТ-ФІКС (давній баг, знайдений тим самим
        // методом реального DOM-тесту, що й для heroDecisionDo вище):
        // removeProperty('background') не працює на shorthand — синій фон
        // для favorable/good дня міг лишитись НАЗАВЖДИ навіть після переходу
        // в неfavorable стан. Пряме присвоєння порожнього рядка.
        _avoidEl.style.background = '';
        _avoidEl.style.borderColor = '';
        _avoidEl.style.color = '';
      }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.182','recoverable'); }

  // v78d: hero state class for CSS animations
  const _heroEl = el('heroCard');
  if(_heroEl){
    _heroEl.classList.remove('hero-state-neutral','hero-state-unstable','hero-state-tense','hero-state-favorable','hero-state-good');
    _heroEl.classList.add('hero-state-'+_stKey);
  }

  // v79: Trend-aware tone system
  const _delta = _getGDelta();
  const _d3h = _delta.d3h || 0;
  const _trend = Math.abs(_d3h) >= 0.4 ? (_d3h > 0 ? 'worsening_fast' : 'improving_fast')
    : Math.abs(_d3h) >= 0.1 ? (_d3h > 0 ? 'worsening' : 'improving') : 'flat';
  // v88.8.37-fp70: після fp69 heroConfidence показує 'Висока/Середня/Низька' замість '%'.
  // parseInt('Висока') = NaN → fallback до реального confPct з _ui замість тексту.
  const _confNum = (typeof _ui !== 'undefined' && _ui.confPct) ? Math.round(_ui.confPct) :
    parseInt((el('heroConfidence')?.textContent||'75').replace(/[^\d]/g,'')) || 75;
  const _confLvl = _confNum >= 80 ? 'high' : _confNum >= 60 ? 'mid' : 'low';

  // ═══ v83d: canonical timing pipeline ═══
  const _daySlots = window._daySlots || [];
  // fp33: _stormWindow already computed above (before heroDecisionDo). No re-compute here.

  // 1. Compute driver from __uiState.ai (syncWhy hasn't run yet)
  // v83e: driver computation moved to computeTopDrivers
  // 1. Single driver computation (v83e: one source for hero/sentence/WHY/trustStrip)
  const _topDrv = computeTopDrivers(_ui.ai, kpH);
  window._lastTopDrivers = _topDrv; // shared with syncTrustStrip

  // 2. Build canonical timing summary (single source of truth)
  const _timingSummary = renderDecisionTiming(_daySlots);
  window._lastTimingSummary = _timingSummary; // v85: share with buildDashboardState

  // 3. Hero headline: day verdict from Engine/override, guarded by current Live G.
  // This fixes v88.8.23 contradiction: Engine +3 + Live G negative no longer says
  // "МОЖНА ДІЯТИ — СИЛЬНЕ ВІКНО" while timing rows say "уникати".
  const _dt = { headline: heroHeadlineFromHierarchy_v88824(_heroSig), sub: (GLOBAL_STATES[_stKey] || GLOBAL_STATES.neutral).sub };
  // v88.8.97-fp178: ROOT CAUSE FOUND — heroHeadlineFromHierarchy_v88824 returns
  // null whenever !sig.hasEngine, which is ALWAYS true right now because
  // loadEngineScores() is deliberately not wired into boot (rolled back after
  // real hang on 2026-07-12, see memory). This is the SAME root cause as the
  // "PDF/Engine недоступний" message elsewhere on screen — NOT a separate
  // "still loading" state that will resolve itself. The old fallback text
  // ("Дані завантажуються…") was misleading (implied temporary loading);
  // fixed to state the actual, accurate situation.
  let _headline = _dt.headline || 'PDF/Engine недоступний — показано лише живий фон нижче';
  // fp47/fp52-P3/fp53-A: DELAYED prefix on headline.
  // fp79 FIX: use resolveDataModeExtended — 'estimated' (Kp ≤12h, норм. цикл NOAA) не показує ОРІЄНТОВНО.
  const _dm47 = (typeof resolveDataModeExtended === 'function') ? resolveDataModeExtended() : 'live';
  const _headlineStormAware47 = _headline.includes('буря') || _headline.includes('АКТИВНА');
  if ((_dm47 === 'partial' || _dm47 === 'offline' || _dm47 === 'scenario') && !_headlineStormAware47 && !_headline.startsWith('ОРІЄНТОВНО')) {
    if (!_headline.includes('estimated')) {
      _headline = _headline + ' · live-фон estimated';
    }
  }
  _set('heroActionCmd', _headline);
  const hac=el('heroActionCmd');
  if(hac) hac.style.color = (GLOBAL_STATES[_stKey] || GLOBAL_STATES.neutral).color;

  // 4. Hero sub — from timing summary, but operationally gated by hierarchy.
  applyTimingToHero(_timingSummary, _heroCmdG);

  // 4b. v84b: Cause-chain — "що відбувається → чому → що робити"
  try{
    const _conseq = el('heroConsequence');
    if(_conseq){
      const _drKey = _topDrv.main?.key || 'kp';
      // Cause by driver type
      const _causes = {
        // v88.9.29-fp210: kp-тексти описували інверсну семантику (neg='тиск' при
        // фізично спокійному Kp<2; pos='спокійне поле' навіть при Kp 5+). Тепер
        // описуємо ВНЕСОК моделі, не вигаданий фізичний стан:
        kp: { neg:'Внесок 2−Kp у мінус (фон фізично спокійний) → загальний G нижчий → без форсування.', pos:'Внесок 2−Kp у плюс → G вищий; за високого Kp — звичайна пильність.' },
        ei: { neg:'Астроподія → порушення ритму → обережніше з новим.', pos:'Сприятлива подія → підтримка дій.' },
        pi: { neg:'Панчанга тисне → внутрішня нестабільність → не форсуй.', pos:'Панчанга підтримує → хронобіологічний ресурс є.' },
        li: { neg:'Місячна фаза → зниження адаптації → мінімізуй навантаження.', pos:'Місячна фаза сприятлива.' },
        mi: { neg:'Затемнення → підвищена чутливість → уникай різких кроків.', pos:'Без затемнень.' },
        di: { neg:'Dst-буря → геомагнітний удар → тримай мінімум.', pos:'Dst спокійний.' }
      };
      const _drvCause = _causes[_drKey] || _causes.kp;
      let _text = gVal < 0 ? _drvCause.neg : _drvCause.pos;
      // v88.8.37-fp70: явне пояснення коли фон зараз і оцінка дня розходяться знаком.
      // Замінює потребу в окремому блоці «два контури» для типового користувача.
      try {
        const _liveG = isFinite(_heroSig?.liveG) ? _heroSig.liveG : null;
        const _dayS = isFinite(_heroSig?.dayScore) ? _heroSig.dayScore : null;
        if (_liveG !== null && _dayS !== null && Math.sign(_liveG) !== Math.sign(_dayS) && (Math.abs(_liveG) > 0.2 || _dayS !== 0)) {
          if (_dayS < 0 && _liveG >= 0) {
            _text = `Поточний фон спокійний (${_liveG >= 0 ? '+' : ''}${_liveG.toFixed(1)}), але загальна оцінка дня залишається негативною (${_dayS}).`;
          } else if (_dayS > 0 && _liveG < 0) {
            _text = `Оцінка дня сприятлива (+${_dayS}), але фон саме зараз слабший (${_liveG.toFixed(1)}) — звичні справи ок, важливе перевір.`;
          }
        }
      } catch(e){ window.NRDiagnostics?.record('legacy.catch.183','recoverable'); }
      _conseq.textContent = _text;
      _conseq.style.display = _text ? '' : 'none';
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.169','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 4c. v84: Energy bar
  try{
    const _eFill = el('heroEnergyFill');
    const _ePtr = el('heroEnergyPointer');
    if(_eFill && _ePtr){
      const _gCl = Math.max(-5, Math.min(5, gVal));
      const _pct = ((_gCl + 5) / 10) * 100;
      const _stCol = GLOBAL_STATES[_stKey]?.badgeColor || '#9bb1dc';
      _eFill.style.width = _pct + '%';
      _eFill.style.background = _stCol;
      _ePtr.style.left = _pct + '%';
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.170','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 4d. v84: Personal greeting
  try{
    const _greet = el('heroGreeting');
    if(_greet){
      const _pData = lsGet('personalData_0');
      const _pName = _pData ? (JSON.parse(_pData).name || '') : '';
      if(_pName){
        const _gTexts = {
          tense: `${_pName}, сьогодні тримай мінімум — фон тисне.`,
          unstable: `${_pName}, день потребує обережності.`,
          neutral: `${_pName}, звичайний день — працюй у своєму темпі.`,
          good: `${_pName}, фон підтримує — дій активніше.`,
          favorable: `${_pName}, сильний день — використай максимум!`
        };
        _greet.textContent = _gTexts[_stKey] || '';
        _greet.style.display = _gTexts[_stKey] ? '' : 'none';
      } else { _greet.style.display = 'none'; }
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.171','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 5. Unified advice → decisionStrip 3-col
  const _dState = { gNow: _heroCmdG, mainDriver: _topDrv.mainStr, timingSummary: _timingSummary };
  const _adv = buildUnifiedAdvice(_dState);
  _set('decisionDoText', _adv.DO.join(', '));
  _set('decisionAvoidText', _adv.AVOID.join(', '));
  // NOTE: add "весь день без безпечного вікна" if allBad
  if(_timingSummary?.allBad) _adv.NOTE.push('весь день без безпечного вікна');
  _set('decisionNoteText', _adv.NOTE.length ? _adv.NOTE.join(', ') : 'без особливостей');

  // 6. Day sentence — from timing summary (single source)
  _set('daySentenceText', buildDaySentence(_dState));

  // 7. G zone label
  _set('hmZone', (GLOBAL_STATES[_stKey] || GLOBAL_STATES.neutral).zone);

  // 7d. v84b: Trend label
  try{
    const _trendLabels = {
      'improving_fast': { text:'↑ покращується', col:'var(--ok)' },
      'improving':      { text:'↗ м\'яке покращення', col:'#63be7b' },
      'flat':           { text:'→ стабільний', col:'var(--muted)' },
      'worsening':      { text:'↘ м\'яке погіршення', col:'#ffaa33' },
      'worsening_fast': { text:'↓ погіршується', col:'var(--bad)' }
    };
    const _tl = _trendLabels[_trend] || _trendLabels.flat;
    const _hmT = el('hmTrend');
    if(_hmT){ _hmT.textContent = _tl.text; _hmT.style.color = _tl.col; }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.172','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // 8. Confidence — show only when <95%
  if(el('heroConfidence')){
    el('heroConfidence').textContent = formatConfidence(_ui.confPct);
    el('heroConfidence').style.display = (_ui.confPct >= 95) ? 'none' : '';
    // v87.90: показую причини зменшення довіри в title (hover)
    // Раніше: юзер бачив 80% і не розумів чому впала з 92%
    try {
      const _reasons = (window.__uiState && window.__uiState.confReasons) || [];
      if(_reasons.length){
        const _txt = 'Оцінка якості вхідних даних: ' + _ui.confPct + '% (не ймовірність правильного прогнозу)\nПричини зниження:\n' +
          _reasons.filter(r => r.d > 0).map(r => `• -${(r.d*100).toFixed(0)}% — ${r.txt}`).join('\n');
        el('heroConfidence').title = _txt;
        el('heroConfidence').style.cursor = 'help';
        el('heroConfidence').style.borderBottom = '1px dotted rgba(155,177,220,0.3)';
      }
    } catch(e){ globalThis.NRDiagnostics?.record('catch.173','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }

  // v85b-F3: 3-scenario mode (good/neutral/bad)
  const IMPACT_TREND = {
    worsening: { good: '→ зменшиш ризик погіршення', neutral: '→ поступове погіршення продовжиться', bad: '→ ситуація може погіршитись швидше' },
    improving: { good: '→ використаєш покращення ситуації', neutral: '→ покращення пройде непоміченим', bad: '→ втратиш момент росту' }
  };
  const IMPACT_BASE = {
    favorable: { good: '→ максимум результату при тих самих зусиллях', neutral: '→ частковий виграш без зусиль', bad: '→ втратиш сильне вікно можливостей' },
    good:      { good: '→ підвищений шанс успішного результату', neutral: '→ стандартний перебіг дня', bad: '→ втратиш можливість росту' },
    neutral:   { good: '→ стабільний і передбачуваний результат', neutral: '→ нічого не зміниться', bad: '→ локальні помилки через поспіх' },
    unstable:  { good: '→ збережеш контроль над ситуацією', neutral: '→ фон тисне, але без гострих наслідків', bad: '→ ризик втрат часу та ресурсів ↑' },
    tense:     { good: '→ зменшиш ризик серйозної помилки', neutral: '→ дискомфорт і напруження без катастрофи', bad: '→ високий шанс неправильного рішення' }
  };
  const _imp = _trend.startsWith('worsening') ? IMPACT_TREND.worsening
    : _trend.startsWith('improving') ? IMPACT_TREND.improving
    : (IMPACT_BASE[_stKey] || IMPACT_BASE.neutral);
  _set('impactGoodText', _imp.good);
  _set('impactNeutralText', _imp.neutral);
  _set('impactBadText', _imp.bad);

  // v79: mini-chips with stronger words
  const RISK_MAP = { favorable:'мінімальний', good:'низький', neutral:'низький', unstable:'підвищений', tense:'високий' };
  const POT_MAP = { favorable:'максимальний', good:'хороший', neutral:'стандартний', unstable:'обмежений', tense:'мінімальний' };
  const STATE_MAP = { favorable:'сприятливий', good:'стабільний', neutral:'рівний', unstable:'нестабільний', tense:'напружений' };
  _set('heroStateChip', STATE_MAP[_stKey] || '—');
  _set('heroRiskChip', RISK_MAP[_stKey] || '—');
  _set('heroPotentialChip', POT_MAP[_stKey] || '—');

  // v78b: Cause decomposition — show what forms G
  _renderHeroCause(gVal, kpH);

  // v78b: Time windows — show critical windows from _daySlots
  _renderHeroTimeWindows();

  // v86-P1: radial G-decomposition (feature flag)
  try { renderGRadialV86(gVal, kpH, _ui.ai || {}); } catch(e){ globalThis.NRDiagnostics?.record('catch.174','recoverable');  console.warn('v86radial:',e); }

  // v86.1: timing heat-strip (feature flag)
  try { renderHeatStripV86(); } catch(e){ globalThis.NRDiagnostics?.record('catch.175','recoverable');  console.warn('v86heat:',e); }

  // v87: Alert banner — storm / high-risk detection
  try { renderAlertBanner(gVal, kpH); } catch(e){ globalThis.NRDiagnostics?.record('catch.176','recoverable');  console.warn('alert:',e); }
  // fp35: extra safety net — apply storm-guard patches at very end of render
  try { _applyStormGuardDOM(); _patchStaleLoadingDOM(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.184','recoverable'); }
}/* NR_FN_END 253 */

/* NR_FN_BEGIN 257 */function classifyStateByG(g, kp) {
  // v87.90 fix: узгоджено з classForG (порог bad: g≤-2.5, ok: g≥0.5).
  // v88.7+ (deep audit): storm override. Якщо Kp≥5 (G1+ буря) — Hero verdict
  // не може бути "favorable"/"good", бо Kp пере-overridе будь-який позитивний Pi.
  // UX gap fix: раніше Kp=5 + Pi=-0.7 → G=+2.3 → "favorable" (зелений) +
  // одночасно alert "G1 БУРЯ" (червоний). Користувач отримував суперечливі сигнали.
  // Тепер: при Kp≥7 (G3+ severe) → max 'unstable'; Kp≥5 (G1-G2) → max 'neutral'.
  if (!isFinite(g)) return 'neutral';
  let cls;
  if (g >= 1.5) cls = 'favorable';
  else if (g >= 0.5) cls = 'good';      // узгоджено з g-ok (зелений)
  else if (g >= -1) cls = 'neutral';
  else if (g > -2.5) cls = 'unstable';
  else cls = 'tense';                    // узгоджено з g-bad (червоний) при g≤-2.5
  // Storm degradation (only if kp explicitly passed)
  if (isFinite(kp)) {
    if (kp >= 7) {
      // G3+ severe → cap at unstable max
      if (cls === 'favorable' || cls === 'good' || cls === 'neutral') cls = 'unstable';
    } else if (kp >= 5) {
      // G1-G2 → cap at neutral max
      if (cls === 'favorable' || cls === 'good') cls = 'neutral';
    }
  }
  return cls;
}/* NR_FN_END 257 */

/* NR_FN_BEGIN 263 */function syncWhy(){
  const w=el('decisionWhy');
  if(!w) return;
  const pc=_lastPanchCtx;
  const ai=pc?.aiComponents;
  const pd=window._lunarPhaseDeg;
  const g=_num(_firstText(el('nowG'))||el('nowG')?.textContent);
  const now=new Date();
  let _liveWhyPanch=null;
  try{ _liveWhyPanch=computePanchanga(now); }catch(_e){ window.NRDiagnostics?.record('legacy.catch.192','recoverable'); }
  const lines=[];

  // Moon interpretation
  if(isFinite(pd)){
    const phaseName=phaseNameByAngle(pd);
    // v88.9.02-fp184: was `ai?.Li??0` — read from _lastPanchCtx, a CACHED
    // context object not guaranteed fresh at the exact moment tithi crosses
    // a boundary (same bug class as fp180's stale refDateUTC). Confirmed by
    // Kyrylo: screenshot showed "Амавасья ... Lᵢ=0" here while the "ЩО
    // ФОРМУЄ СТАН" panel correctly showed Lᵢ=-3.0 for the same moment.
    // Fixed to recompute Li live from pd, matching computeAi's canonical
    // tithi-based formula (Amavasya = 0-based tithiIdx 29 -> Li=-3).
    const _tithiIdxForLi = Number.isFinite(Number(_liveWhyPanch?.tithi?.num)) ? Number(_liveWhyPanch.tithi.num) - 1 : null;
    // v88.9.07-fp188: дзеркальний баг fp184 — fallback (ai?.Li) читав КЕШ
    // (_lastPanchCtx, sunrise-референс). У день Амавасьї ПІСЛЯ моменту молодика
    // live-тітхі вже Pratipada (idx 0, Li=0), а кеш тримав Li=-3 → стрічка
    // показувала "Lᵢ=-3 сильне зниження" поруч із G=+1.6 (внутрішня суперечність).
    // Рахуємо Li повністю live за канонічною формулою computeAi:
    // idx29→-3; idx14 (Пурніма) kp-залежно (-2 при Kp≥7, -1 при Kp≥5); решта 0.
    const _kpLiveLi = (window.__uiState && isFinite(window.__uiState.kpNow)) ? window.__uiState.kpNow : 0;
    const li = _tithiIdxForLi === 29 ? -3
             : _tithiIdxForLi === 14 ? (_kpLiveLi >= 7 ? -2 : _kpLiveLi >= 5 ? -1 : 0)
             : 0;
    const illum=((1-Math.cos(pd*Math.PI/180))/2*100).toFixed(0);
    const moonSign=li<0?'↓':'↑';
    const moonCol=li<0?'#ff9966':li>0?'#2bd47d':'#9bb1dc';
    const moonEffect=li<=-2?'сильне зниження енергії':li<0?'зниження енергії':li>=2?'підйом енергії':li>0?'помірний підйом':'нейтральний фон';
    lines.push(`<span style="color:${moonCol}">🌙 ${phaseName} ${illum}% · Lᵢ=${li} → ${moonSign} ${moonEffect}</span>`);
  }

  // Retro interpretation
  const planets=['Mercury','Venus','Mars','Jupiter','Saturn'];
  const retroEffects={Mercury:'помилки, затримки',Venus:'перегляд стосунків',Mars:'імпульсивність',Jupiter:'переоцінка планів',Saturn:'тиск, обмеження'};
  const rxActive=[];
  planets.forEach(p=>{try{if(isRetrograde(p,now))rxActive.push(p)}catch(e){ globalThis.NRDiagnostics?.record('catch.188','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}});
  if(rxActive.length){
    const effects=rxActive.map(p=>retroEffects[p]||p).join(', ');
    lines.push(`<span style="color:#ff9966">🪐 Ретро: ${rxActive.length} планет → ${effects}</span>`);
  }

  // G interpretation
  if(isFinite(g)){
    const gCol=g<=-2.5?'#ff6b6b':g<=-0.5?'#ffaa33':g>=0.5?'#2bd47d':'#9bb1dc';
    const gText=g<=-2.5?'високий ризик':g<=-0.5?'слабкий сигнал':g>=1.5?'сильний імпульс':g>=0.5?'помірний підйом':'нейтрально';
    lines.push(`<span style="color:${gCol}">📊 G=${g.toFixed(2)} → ${gText}</span>`);
  }

  if(lines.length){
    w.innerHTML=lines.join('<br>');
    w.style.display='block';
  } else {
    w.style.display='none';
  }
}/* NR_FN_END 263 */

/* NR_FN_BEGIN 264 */function syncPersonalContext(){
  const main = el('personalContextMain');
  const sub = el('personalContextSub');
  if(!main||!sub) return;
  const g = _v73G();
  const stKey = classifyStateByG(g);
  const st = GLOBAL_STATES[stKey];
  if(!st) return;

  // v88.9.6x-fp248 (аудит fp247, рекомендація "одна точка виклику"): раніше
  // цей блок сам повторював обчислення поточного слоту (той самий код, що й у
  // Hero/Decision Layer) — тепер спільна getCurrentSlotDecision(), яку
  // використовують усі чотири споживачі (Personal/DayPlan/Critical
  // Windows/Hero/Decision Layer), гарантуючи що це справді ОДИН і той самий
  // виклик resolveSlotDecision(), а не N синхронізованих копій.
  const _personalDecision = getCurrentSlotDecision();
  const _p243Names = () => _personalDecision.reasonsNow.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+');

  // v85b-F6 (CRIT): Personal layer НЕ має права давати optimistic поради при risk-фоні.
  // Раніше: Юпітер hora при G=-1.33 → "сприяє стратегії і важливим рішенням" (суперечність з hero).
  // Тепер: при G ≤ -1 особистий шар — тільки про НЕ-дії.
  if (isFinite(g) && g <= -1) {
    const hora = (function(){try{return calcHora(new Date())}catch(e){ globalThis.NRDiagnostics?.record('catch.189','recoverable'); return null}})();
    const pc = _lastPanchCtx;
    if (_personalDecision.blockedNow) {
      main.textContent = _personalDecision.reasonsNow.includes('storm')
        ? '⚠ Буря (Kp≥5) + нестабільний фон — не починати нових справ.'
        : `⚠ ${_p243Names()} + нестабільний фон — не починати нових справ.`;
    } else if (hora?.planet) {
      main.textContent = `${hora.planet} hora, але загальний фон тисне — без форсування і нових рішень.`;
    } else {
      main.textContent = 'Підтримуй рутину, без форсування і конфліктних рішень.';
    }
    sub.textContent = 'Персональний шар не перекриває глобальний ризик фону.';
    return;
  }

  // v84b: Personal MODIFIER — not global copy
  const hora = (function(){try{return calcHora(new Date())}catch(e){ globalThis.NRDiagnostics?.record('catch.190','recoverable'); return null}})();
  const pc = _lastPanchCtx;

  // Build personal-specific text
  let personalMain = '';
  let personalSub = '';

  // Hora context — what's special NOW
  // v88.9.6x-fp243: раніше тільки Rahu; тепер той самий _personalDecision, що й
  // вище (буря/Yama/Gulika теж блокують нові справи, а не лише Rahu).
  if(_personalDecision.blockedNow){
    personalMain = _personalDecision.reasonsNow.includes('storm')
      ? '⚠ Буря (Kp≥5) активна — не починати нових справ.'
      : `⚠ ${_p243Names()} активний — не починати нових справ.`;
  } else if(hora?.planet){
    const HORA_CONTEXT = {
      'Юпітер': 'Зараз Юпітер hora — сприяє стратегії і важливим рішенням.',
      'Меркурій': 'Зараз Меркурій hora — підходить для комунікацій і аналізу.',
      'Венера': 'Зараз Венера hora — сприяє переговорам і креативу.',
      'Сонце': 'Зараз Сонце hora — лідерські дії і презентації.',
      'Місяць': 'Зараз Місяць hora — інтуїція і спостереження.',
      'Марс': 'Зараз Марс hora — активність і рішучість, але обережно з конфліктами.',
      'Сатурн': 'Зараз Сатурн hora — дисципліна і системність, не поспішати.'
    };
    personalMain = HORA_CONTEXT[hora.planet] || `Зараз ${hora.planet} hora.`;
    if(stKey === 'tense' || stKey === 'unstable'){
      personalMain += ' Але загальний фон тисне — дій повільніше.';
    }
  } else {
    personalMain = st.doText + ' ' + st.avoidText;
  }

  // Sub — what's different for today specifically
  const piVal = pc?.aiComponents?.Pi || 0;
  // v88.9.6x-fp247 FIX-CRITICAL (виявлено на реальному деплої fp246, скрін
  // Kyrylo): personalSub рахувався НЕЗАЛЕЖНО від personalMain — коли вікно
  // блокує (Yama/Rahu/Gulika/буря), main казав "не починати нових справ", а sub
  // (через piVal>=1 АБО st.impact) міг сказати "можна приймати рішення і
  // рухатись вперед" — пряме протиріччя в тій самій картці. Той самий клас
  // бага, що аудит fp242 п.1 знайшов для "Критичних вікон"/"Плану дня", просто
  // в іншому рядку, який fp243b не займав. Тепер blockedNow — перевірка НОМЕР 1,
  // перед усіма piVal-гілками.
  if (_personalDecision.blockedNow) {
    personalSub = 'Вікно тимчасово обмежує нові справи, незалежно від загального фону.';
  } else if(piVal >= 1){
    personalSub = 'Панчанга сьогодні підтримує — це компенсує частину тиску.';
  } else if(piVal <= -1){
    personalSub = 'Панчанга додає навантаження — варто бути ще обережнішим.';
  } else {
    personalSub = st.impact;
    // v88.8.36-fp56-P12: критичний день — st.impact для good/favorable каже «можна приймати рішення
    // і рухатись вперед», що прямо суперечило червоному блоку «важливі рішення відкласти» нижче.
    // Той самий guard, що fp13 DD у resolveDecisionByG (там був, тут — обхід через пряме st.impact).
    try {
      const _eP = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      if (_eP && isFinite(_eP.eng) && Number(_eP.eng) <= -2) {
        personalSub = `Hora підтримує лише рутину й перевірені дії: день критичний (PDF/Engine ${_eP.eng}), важливі рішення відкласти.`;
      }
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.193','recoverable'); }
  }
  // fp405: Hora/Panchanga are local explanatory factors, not a second verdict.
  // Gate optimistic wording through the same canonical operational decision as Hero.
  try {
    const _opG405 = isFinite(window.__uiState?.gNow) ? Number(window.__uiState.gNow) : NaN;
    const _opKp405 = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
    const _opSig405 = resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _opG405, _opKp405, {isToday:true});
    const _opScore405 = (_opSig405 && isFinite(_opSig405.decisionScore)) ? Number(_opSig405.decisionScore) : null;
    if (_opScore405 !== null && _opScore405 < 0) {
      const _horaTheme405 = hora?.planet ? `${hora.planet} Hora` : 'Поточна Hora';
      personalMain = `${_horaTheme405} — лише тема години. Оперативний стан ${_opScore405}: тільки перевірена рутина.`;
      personalSub = `Panchanga Pᵢ ${piVal>=0?'+':''}${piVal.toFixed(1)} уже врахована в raw-фоні й не послаблює оперативне рішення ${_opScore405}.`;
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.194','recoverable'); }
  if(hora) personalSub += ` (${hora.planet} ще ${hora.minLeft} хв)`;

  main.textContent = personalMain;
  sub.textContent = personalSub;
}/* NR_FN_END 264 */

/* NR_FN_BEGIN 265 */function syncDayPlanCard(){
  const box = el('dayPlanRows');
  if(!box) return;
  // v85: Build from state, not DOM-readback
  const slots = window._daySlots || [];
  const _now = new Date();
  const nowH = _now.getUTCHours();
  // v87.90: показуємо часи у ЛОКАЛЬНОМУ часі (юзер очікує "21:00", не "18:00 UTC")
  // v88.9.6x-fp245: канонічно Europe/Kyiv, не browser TZ (аудит fp242, п.4).
  const _tzOffH = kyivOffsetHoursIntAt(_now);
  const rows = [];
  // Future slots only (up to 3)
  for(const s of slots){
    const h = parseInt(s.label || '0'); // UTC година початку слоту
    if(h + 3 <= nowH) continue; // past
    const _isCurrentSlotP = (nowH >= h && nowH < h + 3);
    // v88.9.6x-fp243b (аудит fp243, п.2): для поточного слоту — live G_now, для
    // майбутніх — прогнозний s.G (як і в «Критичних вікнах», той самий effectiveG).
    const _liveGNowP = (_isCurrentSlotP && typeof _v73G === 'function') ? _v73G() : NaN;
    const g = (_isCurrentSlotP && isFinite(_liveGNowP)) ? _liveGNowP : Number(s.G ?? 0);
    // v88.9.6x-fp243 (аудит fp242, п.1): раніше тут рахувався ТІЛЬКИ storm hard-cap —
    // Rahu/Yama/Gulika взагалі не читались, тому «План дня» міг показати «можна
    // діяти» одночасно з Rahu-забороною в іншій картці. Тепер — resolveSlotDecision(),
    // та сама логіка й ті самі вікна, що й у «Критичних вікнах» / особистому блоці.
    const _sw44p = window._stormWindow;
    const _stormActiveP = !!(_sw44p && isFinite(_sw44p.kp) && _sw44p.kp >= 5 && h >= parseInt(_sw44p.label, 10));
    let _dayEngForGateP = null;
    try {
      const _eD = (typeof getEngineScore === 'function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z')) : null;
      if (_eD && isFinite(_eD.eng)) _dayEngForGateP = Number(_eD.eng);
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.195','recoverable'); }
    const _nowPreciseHp = _now.getUTCHours() + _now.getUTCMinutes() / 60;
    const _decisionP = resolveSlotDecision({
      slotStartH: h, slotEndH: h + 3, nowH: _nowPreciseHp,
      slotG: g, dayScore: _dayEngForGateP,
      windows: getInauspiciousWindowsUTC(), stormActive: _stormActiveP
    });
    // v88.9.6x-fp243b FIX-CRITICAL (аудит fp243, п.1): раніше "blockedNewStarts"
    // = будь-де в слоті — тому о 06:30 (до Rahu 07:06) картка вже писала
    // "тільки рутина · Rahu активний" на весь слот. Для ПОТОЧНОГО слоту рішення
    // мусить відповідати ЦІЙ МИТІ (blockedNow/reasonsNow); для майбутніх слотів —
    // попередження про наявність блокованої частини (hasBlockedSegment) лишається,
    // це не помилка, а завчасне попередження про частину слоту, що настане.
    const _isBlockedForRow = _isCurrentSlotP ? _decisionP.blockedNow : _decisionP.hasBlockedSegment;
    const _reasonsForRow = _isCurrentSlotP ? _decisionP.reasonsNow : _decisionP.reasons;
    let cls, text;
    if (_isBlockedForRow) {
      cls = 'warn';
      if (_isCurrentSlotP) {
        // Поточний слот — компактний статус ЦІЄЇ МИТІ (повний час сегмента — у «Критичних вікнах»).
        text = _reasonsForRow.includes('storm')
          ? 'тільки рутина · Kp≥5'
          : `тільки рутина · ${_reasonsForRow.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+')} активний`;
      } else {
        // v88.9.6x-fp248 FIX (аудит fp247, п.3): раніше майбутній слот з
        // ЧАСТКОВИМ вікном (напр. Yama лише до 13:04 з 3-годинного 12:00-15:00)
        // показував "тільки рутина; Yama активний" на ВЕСЬ слот — виглядало,
        // ніби обмеження діє всі 3 години. Тепер — повні сегменти з часом
        // (той самий slotAction, що вже коректно показує «Критичні вікна»,
        // включно з fp247 Kyiv-конверсією).
        text = (_decisionP.segments.length > 1) ? _decisionP.slotAction
          : (_reasonsForRow.includes('storm')
            ? 'тільки рутина · Kp≥5'
            : `тільки рутина · ${_reasonsForRow.filter(r => r.startsWith('window:')).map(r => r.slice(7)).join('+')} активний`);
      }
    } else {
      // v88.8.36-fp56-P12d: guard критичного дня (той самий принцип, що P12-C в особистому блоці).
      // Раніше: «можна діяти · Сатурн» ×3 на дні PDF/Engine=−2 прямо під hora-guard «лише рутина».
      const _dayCrit = (_dayEngForGateP !== null && _dayEngForGateP <= -2);
      cls = g >= 0.5 ? 'ok' : g >= -0.5 ? 'info' : 'warn';
      text = g >= 0.5 ? 'можна діяти' : g >= -0.5 ? 'обережно: перевірені дії' : 'уникати: тільки рутина';
      if (_dayCrit && g >= 0.5) { cls = 'info'; text = 'рутина й перевірені дії (день критичний)'; }
    }
    if(_isCurrentSlotP){
      const _currentPresentationP = getCurrentOperationalPresentation();
      cls = _currentPresentationP.cls === 'good' ? 'ok' : _currentPresentationP.cls === 'mid' ? 'info' : 'warn';
      text = _currentPresentationP.text;
    }
    // Hora context
    let horaStr = '';
    try{
      // v88.9.58-fp240 (Problem 3): послідовність замість одної точки в середині.
      const _slotStart2 = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate(), h, 0));
      const _slotEnd2 = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate(), h+3, 0));
      const _seq2 = calcHoraSequence(_slotStart2, _slotEnd2, 4);
      if (_seq2.length > 1) horaStr = ` · ${_seq2.map(x=>x.planet).join(' → ')}`;
      else {
        const slotMid = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate(), h+1, 30));
        const hora = calcHora(slotMid);
        if(hora?.planet) horaStr = ` · ${hora.planet}`;
      }
    }catch(e){ globalThis.NRDiagnostics?.record('catch.191','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    // v87.90: конвертуємо UTC → локальний для відображення
    const _localStart = ((h + _tzOffH) % 24 + 24) % 24;
    const _localEnd = ((h + 3 + _tzOffH) % 24 + 24) % 24;
    const _hh1 = String(Math.floor(_localStart)).padStart(2,'0');
    const _hh2 = String(Math.floor(_localEnd)).padStart(2,'0');
    rows.push({ time:`${_hh1}:00–${_hh2}:00`, label: text + horaStr, cls });
    if(rows.length >= 3) break;
  }
  // Shift info from state
  const shiftEl = el('timingNextShift');
  const ns = shiftEl?.textContent?.trim();
  if(ns && ns.length > 3) rows.push({ time:'Далі', label: ns.replace(/^[•●▲⚠◔]\s*/,'').substring(0,60), cls:'ok' });
  // Fallback
  if(!rows.length){
    const current = getCurrentOperationalPresentation();
    rows.push({ time:'Зараз', label:current.text, cls:current.cls === 'good' ? 'ok' : current.cls === 'mid' ? 'info' : 'warn' });
  }
  box.innerHTML = rows.map(r => `<div style="display:grid;grid-template-columns:68px 1fr;gap:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-left:3px solid ${r.cls==='warn'?'#ff6b6b':r.cls==='ok'?'#2bd47d':'#37a7ff'}"><div style="font-size:11px;font-weight:700;color: var(--text2)">${r.time}</div><div style="font-size:11px;line-height:1.35;color:#e6ecff">${r.label}</div></div>`).join('');
}/* NR_FN_END 265 */

/* NR_FN_BEGIN 266 */function syncTrustStrip(){
  // v85b: tsKp/tsAi/tsDriver/tsShift DOM removed v83f — only hero meta inline remains
  const kp = _v73Kp();
  const kpPart = isFinite(kp) ? Math.round(kpDayTerm(kp)*10)/10 : NaN;
  const pc = _lastPanchCtx;
  const ai = pc?.aiComponents || {};
  const sumAi = (ai.Li||0)+(ai.Mi||0)+(ai.ei||0)+(ai.Pi||0)+(ai.Di||0);
  const kpStr = isFinite(kpPart) ? (kpPart>0?'+':'')+kpPart.toFixed(1) : '—';
  const aiStr = isFinite(sumAi) ? (sumAi>0?'+':'')+sumAi.toFixed(1) : '—';
  const _td = window._lastTopDrivers;
  const drvStr = _td?.mainStr || 'немає';
  const shiftBadge = el('timingNextShift');
  const shiftStr = shiftBadge?.textContent?.trim()?.replace(/^[•●▲⚠◔]\s*/,'')?.substring(0,40) || '—';
  const hm = id => el(id);
  // v85b-F6 (P10): hmKp/hmAi видалено — зайві hidden поля, не читалися UI
  if(hm('hmDriver')) hm('hmDriver').textContent = drvStr;
  if(hm('hmShift')) hm('hmShift').textContent = shiftStr;
}/* NR_FN_END 266 */

/* NR_FN_BEGIN 267 */function buildDashboardState(){
  const _ui = window.__uiState || {};
  const g = isFinite(_ui.gNow) ? _ui.gNow : NaN;
  const kp = _ui.kpNow;
  const ai = _ui.ai || {};
  // v88.7+ (deep audit): pass kp for storm-aware classification (G1+ buря override)
  const stKey = classifyStateByG(g, kp);
  const st = GLOBAL_STATES[stKey] || GLOBAL_STATES.neutral;
  const decision = resolveDecisionByG(g, kp); // v85b-F6 single-source + v88.7 storm gating
  const pc = _lastPanchCtx;
  const topDrv = window._lastTopDrivers || computeTopDrivers(ai, kp);
  const delta = _getGDelta();
  const slots = window._daySlots || [];
  const timingSummary = window._lastTimingSummary || null;
  const freshness = _ui.freshness || 'live';

  return {
    g, kp, ai, stKey, st,
    decision, // v85b-F6
    panchanga: pc,
    driver: topDrv,
    delta: { d3h: delta.d3h, d24h: delta.d24h, dayOver: _ui.delta },
    timing: { slots, summary: timingSummary, isFlat: timingSummary?.allSame, noSafeWindow: timingSummary && timingSummary.slots?.length && !timingSummary.hasGoodSlot },
    freshness,
    confPct: _ui.confPct
  };
}/* NR_FN_END 267 */

/* NR_FN_BEGIN 273 */function syncV702UI(){
  // v85: build centralized state first
  const _ds = buildDashboardState();
  window.__dashState = _ds; // available for any function

  try{syncHero();}catch(e){ globalThis.NRDiagnostics?.record('catch.198','recoverable'); console.warn('syncHero:',e);}
  try{syncWhy();}catch(e){ globalThis.NRDiagnostics?.record('catch.199','recoverable'); console.warn('syncWhy:',e);}
  try{renderMoonRetroTop();}catch(e){ globalThis.NRDiagnostics?.record('catch.200','recoverable'); console.warn('renderMoonRetroTop:',e);}
  try{syncPanchSummary();}catch(e){ globalThis.NRDiagnostics?.record('catch.201','recoverable'); console.warn('syncPanchSummary:',e);}
  try{renderConfidenceBreakdown();}catch(e){ globalThis.NRDiagnostics?.record('catch.202','recoverable'); console.warn('confidence:',e);}
  try{renderKpContribution();}catch(e){ globalThis.NRDiagnostics?.record('catch.203','recoverable'); console.warn("kpContrib:",e);}
  try{renderPanchPiLine();}catch(e){ globalThis.NRDiagnostics?.record('catch.204','recoverable'); console.warn("panchPi:",e);}
  try{renderWf3();}catch(e){ globalThis.NRDiagnostics?.record('catch.205','recoverable'); console.warn("wf3:",e);}
  try{syncTrustStrip();}catch(e){ globalThis.NRDiagnostics?.record('catch.206','recoverable'); console.warn("trustStrip:",e);}
  try{syncDayPlanCard();}catch(e){ globalThis.NRDiagnostics?.record('catch.207','recoverable'); console.warn("dayPlan:",e);}
  try{syncPersonalContext();}catch(e){ globalThis.NRDiagnostics?.record('catch.208','recoverable'); console.warn("personalCtx:",e);}
  // v85b-F9 (CRIT): re-render Personal block on every G tick, щоб F7-A risk-override спрацьовував
  // (раніше renderPersonal викликався тільки при input-change → при G-tick глобальний ризик не синхронізувався)
  try{if(typeof renderPersonal==='function')renderPersonal();}catch(e){ globalThis.NRDiagnostics?.record('catch.209','recoverable'); console.warn("renderPersonal:",e);}
  try{const _gNow=_v73G();if(isFinite(_gNow))_saveGHistory(_gNow);}catch(e){ globalThis.NRDiagnostics?.record('catch.210','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ _renderComponentDeltaCard(); }catch(e){ globalThis.NRDiagnostics?.record('catch.211','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ _renderChangeLog(); }catch(e){ globalThis.NRDiagnostics?.record('catch.212','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  // v87.19 U4: render best/worst days after history save
  try{ renderBestWorstDays(); }catch(e){ globalThis.NRDiagnostics?.record('catch.213','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  // v87.90: provenance ledger render
  try{ renderProvenance(); }catch(e){ globalThis.NRDiagnostics?.record('catch.214','recoverable'); console.warn("provenance:",e);}
  // v87.90: model disagreement alert + counterfactual analysis
  try{ renderDisagreement(); }catch(e){ globalThis.NRDiagnostics?.record('catch.215','recoverable'); console.warn("disagreement:",e);}
  try{ renderCounterfactual(); }catch(e){ globalThis.NRDiagnostics?.record('catch.216','recoverable'); console.warn("counterfactual:",e);}
  // v87.90: anti-action recommender (Tithi/Vara/Nak/Yoga/Karana/Hora/Taara синтез)
  try{ renderAntiAction(); }catch(e){ globalThis.NRDiagnostics?.record('catch.217','recoverable'); console.warn("antiAction:",e);}
  // v87.90: intra-day Kp drop/rise alert (попередження ВСЕРЕДИНІ дня з 3-год NOAA forecast)
  try{ renderIntraDayAlert(); }catch(e){ globalThis.NRDiagnostics?.record('catch.218','recoverable'); console.warn("intraDayAlert:",e);}
}/* NR_FN_END 273 */

/* NR_FN_BEGIN 276 */function runDataRefresh(reason){
  if (_dataRefreshPromise) {
    // Retain one follow-up request; ordinary auto ticks need no extra cycle.
    if(reason!=='auto')_pendingRefreshReason=reason;
    return _dataRefreshPromise;
  }
  _dataRefreshPromise=Promise.resolve().then(async()=>{
    let next=reason;
    do {
      const activeReason=next,started=Date.now(),generation=++_refreshGeneration;
      let errorCount=0;
      _pendingRefreshReason=null;
      try {
        if(['resume','online','bfcache'].includes(activeReason)){
          _beginAuthorityBatch();
          const settled=await Promise.allSettled([
            loadExpertOverrides(true),loadExpertCalc(true),loadStrongRawPolicy(true),
            loadExpertDecisionRegistry(true),loadEngineScores(true)
          ].map(p=>withTimeout(p,8000,'resume authority')));
          _endAuthorityBatch();
          errorCount+=settled.filter(r=>r.status==='rejected').length;
          errorCount+=Object.values(window.__authoritySourceState||{}).filter(r=>r.stale).length;
        }
        await loadAll();
        if(typeof window.requestProductRender==='function')window.requestProductRender('cover','forecast','calendar','independent');
      }catch(err){
        errorCount++;
        window.NRDiagnostics?.record('refresh.cycle','recoverable',err);
        const target=el('nowError');
        if(target)target.textContent='Оновлення даних не завершено: '+(err?.message||'невідома помилка');
        console.error('[data-refresh]',activeReason,err);
      }finally{
        const btn=el('btnRefresh');if(btn)btn.disabled=false;
        window.__lastRefreshCycle={reason:activeReason,startedAt:started,finishedAt:Date.now(),
          generation,status:errorCount?'partial':'completed',errorCount,pendingReason:_pendingRefreshReason};
      }
      next=_pendingRefreshReason;
    }while(next);
  }).finally(()=>{_dataRefreshPromise=null;});
  return _dataRefreshPromise;
}/* NR_FN_END 276 */

/* NR_FN_BEGIN 277 */function exportCsv(){
  if(!_last27Rows||!_last27Rows.length){ showToast('Немає даних для експорту', 'warn'); return; }
  const override3D = new Map();
  if(last3D && Array.isArray(last3D.days)){
    for(const d of last3D.days) if(isFinite(d.kpMax)) override3D.set(fmtDate(d.date), d.kpMax);
  }
  // v88.8.34: two-rail export. Never mix discrete PDF/Engine day score into G.
  // G_raw = continuous physical/advisory index: 2−Kp+ΣAᵢ.
  // Day_score = discrete PDF/Engine score: −3..+3.
  const header = ['Дата','G_raw_slot','Day_score_PDF_Engine','Day_score_source','Operational_score','Operational_guard','Kp','Li','Mi','ei','Pi','Di','SumAi','Ap','Flux','G_raw_category','Operational_recommendation'];
  const lines = [header.join(',')];
  for(const r of _last27Rows){
    const ds = fmtDate(r.date);
    const kpUsed = override3D.has(ds) ? override3D.get(ds) : r.kpMax;
    if(!isFinite(kpUsed)) continue;
    const ai = computeAi(sunriseUTC(r.date), kpUsed);
    const G = kpDayTerm(kpUsed) + ai.Ai;
    let dayScore = '', daySource = 'raw_only';
    try {
      const e = getEngineScore(r.date);
      if(e && Number.isFinite(e.eng)){
        dayScore = e.eng;
        daySource = e._expertOverride ? 'verified_pdf_override' : 'engine_v18_5';
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.212','recoverable'); }
    const sig = (typeof resolveDaySignal_v88825 === 'function')
      ? resolveDaySignal_v88825(r.date, G, kpUsed, {isToday: ds===todayKyivStr()})
      : null;
    const operationalScore = sig && Number.isFinite(Number(sig.decisionScore)) ? Number(sig.decisionScore) : '';
    const operationalGuard = [sig?.guard, sig?.dynamicGuard].filter(x=>x && x!=='none').join('+') || 'none';
    const rec = sig?.recommendation?.text || 'Operational resolver недоступний — лише raw/reference аудит';
    lines.push([
      ds,
      isFinite(G)?G.toFixed(2):'',
      dayScore,
      daySource,
      isFinite(operationalScore)?operationalScore:'',
      String(operationalGuard).replace(/[\r\n,]+/g,' ').trim(),
      kpUsed.toFixed(2),
      ai.Li, ai.Mi, ai.ei, ai.Pi, ai.Di, ai.Ai,
      r.Ap ?? '', r.flux ?? '',
      classifyG(isFinite(G)?G:0),
      String(rec).replace(/[\r\n,]+/g,' ').trim()
    ].join(','));
  }
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gindex_two_rail_${todayKyivStr()}.csv`;
  a.click();
}/* NR_FN_END 277 */

/* NR_FN_BEGIN 278 */function exportICS(){
  if(!_last27Rows || !_last27Rows.length){ showToast('Немає даних для експорту', 'warn'); return; }
  const override3D = new Map();
  if(last3D && Array.isArray(last3D.days)){
    for(const d of last3D.days) if(isFinite(d.kpMax)) override3D.set(fmtDate(d.date), d.kpMax);
  }
  const pad2 = n => String(n).padStart(2,'0');
  const fmtICSDate = d => `${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}`;
  const fmtICSDateTime = d => `${fmtICSDate(d)}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
  const now = new Date();
  const dtstamp = fmtICSDateTime(now);
  const esc = s => String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const fold = s => {
    const lines = [];
    for(const line of s.split('\r\n')){
      if(line.length <= 75){ lines.push(line); continue; }
      let rest = line;
      lines.push(rest.slice(0,75));
      rest = rest.slice(75);
      while(rest.length > 74){ lines.push(' ' + rest.slice(0,74)); rest = rest.slice(74); }
      if(rest.length) lines.push(' ' + rest);
    }
    return lines.join('\r\n');
  };

  const out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//G-Index//Forecast//UK','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'X-WR-CALNAME:G-Index Forecast','X-WR-TIMEZONE:UTC','X-WR-CALDESC:Two-rail forecast: PDF/Engine Day_score + Live G raw'];

  for(const r of _last27Rows){
    const ds = fmtDate(r.date);
    const kpUsed = override3D.has(ds) ? override3D.get(ds) : r.kpMax;
    if(!isFinite(kpUsed)) continue;
    const ai = computeAi(sunriseUTC(r.date), kpUsed);
    const G = kpDayTerm(kpUsed) + ai.Ai;
    let dayScore = null, daySource = 'raw_only';
    try {
      const e = getEngineScore(r.date);
      if(e && Number.isFinite(e.eng)){
        dayScore = e.eng;
        daySource = e._expertOverride ? 'PDF' : 'Engine';
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.213','recoverable'); }
    const sig = (typeof resolveDaySignal_v88825 === 'function')
      ? resolveDaySignal_v88825(r.date, G, kpUsed, {isToday: ds===todayKyivStr()})
      : null;
    const dayTxt = Number.isFinite(dayScore) ? `${dayScore>=0?'+':''}${dayScore} ${daySource}` : '—';
    const operationalScore = sig && Number.isFinite(Number(sig.decisionScore)) ? Number(sig.decisionScore) : null;
    const operationalTxt = Number.isFinite(operationalScore)
      ? `${operationalScore>=0?'+':''}${Number(operationalScore).toFixed(Number.isInteger(operationalScore)?0:1)}`
      : 'недоступний';
    const gSign = G >= 0 ? '+' : '';
    const summary = Number.isFinite(operationalScore)
      ? `Оперативний стан ${operationalTxt}: ${sig.title}; raw G ${gSign}${G.toFixed(2)}`
      : `Оперативний стан недоступний; PDF/Engine reference ${dayTxt}; raw G ${gSign}${G.toFixed(2)}`;
    const desc = `Дата: ${ds}\nOperational_score = ${operationalTxt} (обережніший стан PDF/Engine + live safety guard; не підміняється reference)\nDay_score_reference = ${dayTxt} (довідковий PDF/Engine reference, не дозвіл)\nG_raw_slot = ${gSign}${G.toFixed(2)} (довідковий фон, не другий вердикт)\nKp = ${kpUsed.toFixed(2)}\nΣAᵢ = ${ai.Ai} (Lᵢ=${ai.Li}, Mᵢ=${ai.Mi}, eᵢ=${ai.ei}, Pᵢ=${ai.Pi}, Dᵢ=${ai.Di})\nОпераційна рекомендація: ${sig?.recommendation?.text || 'недоступна — resolver не спрацював'}\n\nДжерело: G-Index operational export; PDF/Engine reference і raw збережені окремо для аудиту.`;
    const dtStart = r.date;
    const dtEnd = new Date(dtStart.getTime() + 86400000);
    const uid = `gindex-${ds}-${Math.round((kpUsed||0)*100)}@g-index`;
    out.push('BEGIN:VEVENT');
    out.push(`UID:${uid}`);
    out.push(`DTSTAMP:${dtstamp}`);
    out.push(`DTSTART;VALUE=DATE:${fmtICSDate(dtStart)}`);
    out.push(`DTEND;VALUE=DATE:${fmtICSDate(dtEnd)}`);
    out.push(`SUMMARY:${esc(summary)}`);
    out.push(`DESCRIPTION:${esc(desc)}`);
    out.push('TRANSP:TRANSPARENT');
    out.push('END:VEVENT');
  }
  out.push('END:VCALENDAR');
  const ics = fold(out.join('\r\n'));
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `g-index_two_rail_${todayKyivStr()}.ics`;
  a.click();
}/* NR_FN_END 278 */

/* NR_FN_BEGIN 281 */function _mod360(x){ return ((x % 360) + 360) % 360; }/* NR_FN_END 281 */

/* NR_FN_BEGIN 284 */function lahiriAyanamsha(jde) {
  // v85b-F5 (КРИТ-1): Swiss Ephemeris official Lahiri at J2000.0 = 23°51'23.4" = 23.85650°
  // Rate 50.27889624"/yr per IAU 2006 precession. Was 23.853 + 50.2388475 — error ~12.6".
  // Previous note (kept for trace): BUG-2 fix v36 — corrected 23.25/2433282.5 → +5.7 arcmin vs IAU.
  return 23.85650 + (50.27889624 / 3600) * (jde - 2451545.0) / 365.25;
}/* NR_FN_END 284 */

/* NR_FN_BEGIN 285 */function dateToJDE(dateStr, timeStr, utcOff) {
  // Returns UTC JD; conversion to TT occurs only at ephemeris call sites.
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return NaN;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const value = timeStr || '12:00';
  if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
  const [h, mi] = value.split(':').map(Number);
  const offset = utcOff == null ? 0 : Number(utcOff);
  if (!Number.isFinite(offset) || offset < -12 || offset > 14 || h > 23 || mi > 59) return NaN;
  const day = new Date(Date.UTC(y, mo-1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== mo-1 || day.getUTCDate() !== d) return NaN;
  const ms = day.getTime() + (h*60 + mi - offset*60)*60000;
  return ms / 86400000 + 2440587.5;
}/* NR_FN_END 285 */

/* NR_FN_BEGIN 291 */function _horaSolarDay(dateUTC){
  const now = dateUTC.getTime();
  // Scan UTC anchors: solar sunrise can fall on an adjacent UTC date by longitude.
  for(let offset=-2;offset<=1;offset++){
    const anchor=addDays(dateUTC,offset), next=addDays(anchor,1);
    const pair=sunRiseSetUTC_Meeus(anchor,_userLat,_userLon);
    const nextPair=sunRiseSetUTC_Meeus(next,_userLat,_userLon);
    const rise=pair.sunrise.getTime(), set=pair.sunset.getTime(), nextRise=nextPair.sunrise.getTime();
    if(Number.isFinite(rise)&&rise<set&&set<nextRise&&now>=rise&&now<nextRise){
      return {rise,set,nextRise,firstIdx:HORA_DAY_LORD[localWeekday(pair.sunrise)]};
    }
  }
  return null;
}/* NR_FN_END 291 */

/* NR_FN_BEGIN 296 */function isRetrograde(planetName, dateObj) {
  if (planetName === 'Earth') return false;
  const periods = RETRO_PERIODS[planetName];
  const t = dateObj instanceof Date ? dateObj.getTime() : NaN;
  if (!periods || !Number.isFinite(t) || t < Date.parse(RETRO_COVERAGE[0]) || t >= Date.parse(RETRO_COVERAGE[1])) return null;
  return periods.some(([s,e]) => t >= Date.parse(s) && t < Date.parse(e));
}/* NR_FN_END 296 */

/* NR_FN_BEGIN 298 */function lsGet(k, def=''){ return window.NRStorage.get(k,def); }/* NR_FN_END 298 */

/* NR_FN_BEGIN 299 */function lsSet(k, v){ window.NRStorage.set(k,v); }/* NR_FN_END 299 */

/* NR_FN_BEGIN 300 */function lsRemove(k){ window.NRStorage.remove(k); }/* NR_FN_END 300 */

/* NR_FN_BEGIN 301 */function _personalModPhrase(m){
  var n=Number(m||0);
  if(n<=-2)return' Напруга для вас підвищена.';
  if(n===-1)return' Є легка внутрішня нестабільність.';
  if(n===1)return' Є додаткова підтримка фону.';
  if(n>=2)return' Фон для вас особливо сприятливий.';
  return'';
}/* NR_FN_END 301 */

/* NR_FN_BEGIN 305 */function getSlotKey(idx){ return `personalData_${idx}`; }/* NR_FN_END 305 */

/* NR_FN_BEGIN 306 */function getSlotData(idx){
  // v87.40: defensive — corrupt JSON in localStorage had ability to crash initPersonalCalc
  try{
    return JSON.parse(lsGet(getSlotKey(idx)) || 'null');
  }catch(e){ globalThis.NRDiagnostics?.record('catch.248','recoverable');
    console.warn('[getSlotData] corrupt JSON at slot', idx, '— clearing');
    lsRemove(getSlotKey(idx));
    return null;
  }
}/* NR_FN_END 306 */

/* NR_FN_BEGIN 307 */function setSlotData(idx, d){ lsSet(getSlotKey(idx), JSON.stringify(d)); }/* NR_FN_END 307 */

/* NR_FN_BEGIN 308 */function removeSlotData(idx){ lsRemove(getSlotKey(idx)); }/* NR_FN_END 308 */

/* NR_FN_BEGIN 309 */function migratePersonalData(){
  const old = lsGet('personalData');
  if(old && !lsGet(getSlotKey(0))){ lsSet(getSlotKey(0), old); lsRemove('personalData'); }
}/* NR_FN_END 309 */

/* NR_FN_BEGIN 311 */function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}/* NR_FN_END 311 */

/* NR_FN_BEGIN 312 */function switchSlot(idx){
  _activeSlot = idx;
  renderSlotTabs();
  const d = getSlotData(idx);
  const form = document.getElementById('personalForm');
  document.getElementById('pName').value   = d ? (d.name||'') : '';
  document.getElementById('pDate').value   = d ? (d.date||'') : '';
  document.getElementById('pTime').value   = d ? (d.time||'') : '';
  document.getElementById('pUtcOff').value = d ? (d.utcOff??2) : 2;
  document.getElementById('pProfile').value = d ? (d.profile||'off') : 'off';
  renderPersonal();
  // Sync global profile to this slot's profile
  if(d && d.profile && d.profile !== 'off') setProfile(d.profile);
  else setProfile('off');
  // Refresh G_ос column in 27d table for new slot
  if(typeof draw27dTable === 'function' && typeof _27dComputed !== 'undefined' && _27dComputed && _27dComputed.length) draw27dTable();
}/* NR_FN_END 312 */

/* NR_FN_BEGIN 313 */function initPersonalCalc() {
  migratePersonalData();
  const form    = document.getElementById('personalForm');
  const saveBtn = document.getElementById('btnPersonalSave');
  const clearBtn= document.getElementById('btnPersonalClear');
  const btn     = document.getElementById('btnPersonalToggle');

  // Load active slot 0
  const saved = getSlotData(0);
  if (saved) {
    document.getElementById('pName').value    = saved.name || '';
    document.getElementById('pDate').value    = saved.date || '';
    document.getElementById('pTime').value    = saved.time || '';
    document.getElementById('pUtcOff').value  = saved.utcOff ?? 2;
    document.getElementById('pProfile').value = saved.profile || 'off';
    // v87.59: відновити _activeProfile зі slot — без цього після reload profile не активний
    if(saved.profile && saved.profile !== 'off') setProfile(saved.profile);
    renderPersonal();
  } else {
    form.style.display = 'block';
  }
  renderSlotTabs();

  btn.addEventListener('click', () => {
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    form.style.marginBottom = isHidden ? '12px' : '0';
  });

  saveBtn.addEventListener('click', () => {
    // Level 1 (Free tier): збереження особистого профілю доступне без paywall (HANDOFF 08.04.2026)
    const d = {
      name:    document.getElementById('pName').value.trim(),
      date:    document.getElementById('pDate').value,
      time:    document.getElementById('pTime').value,
      utcOff:  parseFloat(document.getElementById('pUtcOff').value) || 0,
      profile: document.getElementById('pProfile').value
    };
    if (!d.date) { showToast('Вкажіть дату народження', 'warn'); return; }
    setSlotData(_activeSlot, d);
    form.style.display = 'none';
    renderSlotTabs();
    renderPersonal();
    if(d.profile && d.profile !== 'off') setProfile(d.profile);
    else renderProfileRec();
  });

  clearBtn.addEventListener('click', () => {
    removeSlotData(_activeSlot);
    document.getElementById('pName').value    = '';
    document.getElementById('pDate').value    = '';
    document.getElementById('pTime').value    = '';
    document.getElementById('pUtcOff').value  = '2';
    document.getElementById('pProfile').value = 'off';
    document.getElementById('personalResult').innerHTML =
      '<div class="muted small">Натисніть «✎ Дані» і введіть дату народження.</div>';
    form.style.display = 'block';
    renderSlotTabs();
    renderProfileRec();
  });
}/* NR_FN_END 313 */

/* NR_FN_BEGIN 314 */function toggle27View(mode){
  const chartWrap = document.getElementById('chart27Wrap');
  const tableWrap = document.getElementById('table27Wrap');
  const btnChart  = document.getElementById('btnView27Chart');
  const btnTable  = document.getElementById('btnView27Table');
  if(mode === 'chart'){
    chartWrap.style.display = 'block';
    tableWrap.style.display = 'none';
    btnChart.style.background = '#1a3a6e';
    btnTable.style.background = '#0f1a2f';
    draw27Chart();
  } else {
    chartWrap.style.display = 'none';
    tableWrap.style.display = 'block';
    btnChart.style.background = '#0f1a2f';
    btnTable.style.background = '#1a3a6e';
  }
}/* NR_FN_END 314 */

/* NR_FN_BEGIN 316 */function _getCurrentHoraForAi(dateUTC) {
  const current=calcHora(dateUTC);
  if(!current?.planet)return null;
  const symbols={'Сонце':'☀','Місяць':'☽','Марс':'♂','Меркурій':'☿','Юпітер':'♃','Венера':'♀','Сатурн':'♄'};
  return {planet:current.planet,pcl:HORA_SCORE_MAP[current.planet]??0,sym:symbols[current.planet]||''};
}/* NR_FN_END 316 */

/* NR_FN_BEGIN 319 */function toHHMM_utc(h) {
  // v88.8.35-fp17 fix: total-minutes normalization + 24h wrap уникає mm===60 та h===24.
  const hNorm = ((h % 24) + 24) % 24;
  const tm = Math.round(hNorm * 60) % (24*60);
  const hh = Math.floor(tm / 60);
  const mm = tm % 60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}/* NR_FN_END 319 */

/* NR_FN_BEGIN 321 */function _gFlowColor(val) {
  return val > 0 ? '#2bd47d' : val < 0 ? '#ff6b6b' : '#6b82aa';
}/* NR_FN_END 321 */

/* NR_FN_BEGIN 322 */function initGFlowParticles(kp, ai) {
  const comps = [
    {label:'2−Kp', val: isFinite(kp) ? +kpDayTerm(kp).toFixed(1) : 0},
    {label:'Lᵢ',   val: ai.Li},
    {label:'Mᵢ',   val: ai.Mi},
    {label:'eᵢ',   val: ai.ei},
    {label:'Pᵢ',   val: ai.Pi},
    ...(ai.Di !== 0 ? [{label:'Dᵢ', val: ai.Di}] : [])
  ];
  // Частинки тільки для ненульових — але всі вузли відображаються
  const particles = [];
  comps.forEach((c, ci) => {
    if(c.val === 0) return;
    const n = Math.min(5, Math.max(2, Math.ceil(Math.abs(c.val) * 1.5)));
    for(let j=0; j<n; j++){
      particles.push({
        ci,
        progress: j / n,
        speed: 0.003 + Math.random() * 0.003,
        r: 2.5 + Math.abs(c.val) * 0.7,
        col: _gFlowColor(c.val)
      });
    }
  });
  return {comps, particles};
}/* NR_FN_END 322 */

/* NR_FN_BEGIN 324 */function startGFlowAnimation(G, kp, ai) {
  if(_gFlowAnimId) cancelAnimationFrame(_gFlowAnimId);
  if(_gFlowTimer) clearTimeout(_gFlowTimer);
  _gFlowAnimId = null;
  _gFlowTimer = null;
  _gFlowLastPaint = 0;
  _gFlowState = {G, kp, ai, ...initGFlowParticles(kp, ai)};
  function loop(ts) {
    const cv = document.getElementById('gFlowCanvas');
    if (!cv) { _gFlowAnimId = null; return; }
    const view = cv.getBoundingClientRect();
    const nearViewport = view.bottom >= -120 && view.top <= window.innerHeight + 120;
    if (document.hidden || !nearViewport) {
      _gFlowAnimId = null;
      _gFlowTimer = setTimeout(() => {
        _gFlowTimer = null;
        if (!_gFlowAnimId) _gFlowAnimId = requestAnimationFrame(loop);
      }, 500);
      return;
    }
    if (_gFlowLastPaint && ts - _gFlowLastPaint < 50) {
      _gFlowAnimId = requestAnimationFrame(loop);
      return;
    }
    _gFlowLastPaint = ts;
    renderGFlowCanvas(_gFlowState.G, _gFlowState.kp, _gFlowState.ai);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      _gFlowAnimId = null;
      return;
    }
    _gFlowAnimId = requestAnimationFrame(loop);
  }
  _gFlowAnimId = requestAnimationFrame(loop);
}/* NR_FN_END 324 */

/* NR_FN_BEGIN 326 */async function shareGState() {
  const G      = parseFloat((document.getElementById('nowG')||{}).textContent||'');
  const kpEl   = document.getElementById('sciKp');
  const phaseEl= document.getElementById('sciPhase');
  const catEl  = document.getElementById('nowGcat');
  const kpStr  = kpEl   ? kpEl.textContent.trim()                : '—';
  const phase  = phaseEl? phaseEl.textContent.split('(')[0].trim(): '—';
  const cat    = catEl  ? catEl.textContent.trim()                : '—';
  const gStr   = isFinite(G) ? (G >= 0 ? '+' : '') + G.toFixed(1) : '—';
  const rmEl   = document.querySelector('[title*="Russell-McPherron"]');
  const rmStr  = rmEl ? '🌀 R-M вікно активне' : '';
  const dateStr= new Date().toLocaleDateString('uk-UA', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Kyiv'});

  function gColor(g) {
    if (!isFinite(g)) return '#9bb1dc';
    if (g >= 3)  return '#ff6b6b';
    if (g >= 1)  return '#ffcc00';
    if (g >= -1) return '#2bd47d';
    return '#37a7ff';
  }
  const col = gColor(G);

  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#0b1220');
  bg.addColorStop(0.5, '#0d1a35');
  bg.addColorStop(1,   '#060c18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glowR = 380;
  const glow = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, glowR);
  glow.addColorStop(0, col + '33');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(W/2, H*0.38, glowR - 20, 0, Math.PI*2);
  ctx.strokeStyle = col + '55';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9bb1dc';
  ctx.font = 'bold 52px system-ui,-apple-system,sans-serif';
  ctx.fillText('G-INDEX', W/2, 140);

  ctx.fillStyle = '#7f99c4';
  ctx.font = '38px system-ui,-apple-system,sans-serif';
  ctx.fillText('Space & Stars', W/2, 200);

  ctx.fillStyle = '#6b82aa';
  ctx.font = '40px system-ui,-apple-system,sans-serif';
  ctx.fillText(dateStr, W/2, 280);

  ctx.fillStyle = col;
  ctx.font = 'bold 260px system-ui,-apple-system,sans-serif';
  ctx.fillText(gStr, W/2, H*0.47);

  ctx.fillStyle = '#e7efff';
  ctx.font = 'bold 60px system-ui,-apple-system,sans-serif';
  ctx.fillText(cat, W/2, H*0.52 + 40);

  ctx.strokeStyle = '#1e2a44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, H*0.57); ctx.lineTo(W-100, H*0.57);
  ctx.stroke();

  ctx.fillStyle = '#cfe0ff';
  ctx.font = '52px system-ui,-apple-system,sans-serif';
  ctx.fillText('Kp = ' + kpStr, W/2, H*0.60);

  ctx.fillStyle = '#9bb1dc';
  ctx.font = '48px system-ui,-apple-system,sans-serif';
  ctx.fillText(phase, W/2, H*0.645);

  if (rmStr) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = '44px system-ui,-apple-system,sans-serif';
    ctx.fillText(rmStr, W/2, H*0.69);
  }

  ctx.fillStyle = '#7f99c4';
  ctx.font = '34px system-ui,-apple-system,sans-serif';
  ctx.fillText('Advisory / R&D. Не є рекомендацією.', W/2, H*0.88);

  ctx.fillStyle = '#37a7ff';
  ctx.font = '36px system-ui,-apple-system,sans-serif';
  // v88.8.3 fix-1: правильний canonical URL — раніше було kyrylo-ua.github.io (помилка)
  ctx.fillText('nikolaevkirill-commits.github.io/g-index', W/2, H*0.92);

  ctx.fillStyle = '#2a3b61';
  ctx.font = '30px system-ui,-apple-system,sans-serif';
  ctx.fillText('G-Index · Cosmophysical Dashboard', W/2, H*0.96);

  const fallbackText = `G-Index · ${dateStr}\nG = ${gStr} (${cat})\nKp = ${kpStr} · ${phase}${rmStr ? '\n' + rmStr : ''}\n\uD83D\uDD17 https://nikolaevkirill-commits.github.io/g-index/`;

  try {
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    const fname = 'g-index-' + todayKyivStr() + '.png';
    const file = new File([blob], fname, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'G-Index Storm Story', text: fallbackText, files: [file] });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    _copyFallback(fallbackText);
    _showToast('🖼 PNG збережено + 📋 текст скопійовано');
  } catch(e) { globalThis.NRDiagnostics?.record('catch.251','recoverable');
    _copyFallback(fallbackText);
  }
}/* NR_FN_END 326 */

/* NR_FN_BEGIN 327 */function _copyFallback(text) {
  if (navigator.clipboard) {
    // v87.56: .catch — Safari/Firefox можуть відмовити у permission-контексті
    navigator.clipboard.writeText(text)
      .then(() => _showToast('📋 Скопійовано в буфер'))
      .catch(() => {globalThis.NRDiagnostics?.record('promise.catch.10','recoverable');return (_showToast('⚠ Не вдалось скопіювати'));});
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    _showToast('📋 Скопійовано');
  }
}/* NR_FN_END 327 */

/* NR_FN_BEGIN 329 */function updateDataTimestamp(whenText) {
  const el = document.getElementById('dataTimestamp');
  if (!el) return;
  if (whenText) {
    el.textContent = 'дані від ' + whenText;
  } else {
    const now = new Date();
    const off = -now.getTimezoneOffset()/60;
    const offStr = (Number.isInteger(off) ? off : off.toFixed(1));
    el.textContent = 'оновлено ' + now.toLocaleTimeString('uk-UA', {hour:'2-digit',minute:'2-digit'}) + ' UTC' + (off>=0?'+':'') + offStr;
    // v87.26: IANA tooltip
    try{ el.title = window._iana || ''; }catch(e){ globalThis.NRDiagnostics?.record('catch.252','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }
}/* NR_FN_END 329 */

/* NR_FN_BEGIN 330 */function _setSrcStatus(id, status) {
  // status: 'ok'|'snapshot'|'cache'|'synthetic'|'error'|'loading'
  const el = document.getElementById(id);
  if (!el) return;
  const map = {
    ok:        {icon:'✓', col:'#2bd47d'},
    snapshot:  {icon:'▣', col:'#8fc8ff'},
    cache:     {icon:'⊙', col:'#ffcc44'},
    synthetic: {icon:'~', col:'#fca474'},
    error:     {icon:'✗', col:'#ff6b6b'},
    loading:   {icon:'…', col:'#6b82aa'}
  };
  const s = map[status] || map.loading;
  el.textContent = s.icon;
  el.style.color = s.col;
  el.title = {
    ok:       {srcKpObs:'Kp спостереження NOAA', srcKpFcst:'Kp прогноз NOAA', src27Day:'NOAA 27-day outlook', srcDst:'Dst Kyoto WDC', srcSn:'Wolf Sn SILSO', srcBz:'Bz DSCOVR', srcVsw:'Vsw DSCOVR', srcXray:'GOES X-ray'}[id] || 'Дані',
    snapshot: 'Перевірений локальний snapshot; дата спостереження показана окремо',
    cache:    'Кешовані дані (offline fallback)',
    synthetic:'Synthetic (реальне джерело недоступне)',
    error:    'Помилка завантаження',
    loading:  'Завантаження...'
  }[status] || '';
  // v75: wire per-source freshness
  const srcKey = {srcKpObs:'kpObs', srcKpFcst:'kpFcst', src27Day:'outlook27', srcDst:'dst', srcSn:'sn', srcBz:'bz', srcVsw:'vsw', srcXray:'xray'}[id];
  if(srcKey && status==='ok') updateDataFreshness(srcKey, Date.now());
}/* NR_FN_END 330 */

/* NR_FN_BEGIN 331 */function isRussellMcPherron(d) {
  if (!d) return false;
  const m = d.getUTCMonth() + 1, day = d.getUTCDate();
  return (m === 3 && day >= 5) || (m === 4 && day <= 4)
      || (m === 9 && day >= 7) || (m === 10 && day <= 7);
}/* NR_FN_END 331 */

/* NR_FN_BEGIN 332 */function updateFreshnessBadge() {
  // v87.15 fix A6: noop — _renderFreshnessState є єдиним джерелом істини для freshnessBadge.
  // Попередньо тут був дублікатний writer який перетирав stage з timestamp-based _renderFreshnessState.
  // Якщо треба fallback — _renderFreshnessState автоматично викликається кожні 60s + після fetch.
  return;
}/* NR_FN_END 332 */

/* NR_FN_BEGIN 333 */function updateScienceBar(kp, ap, sn, ai, phaseName, phaseDeg, f107) {
  const _el = id => document.getElementById(id) || {textContent:'',innerHTML:''};
  if(isFinite(kp)) {
    const kpEl = _el('sciKp');
    kpEl.textContent = kp.toFixed(2);
    // v88.8.79-fp158: Kp∈[4,5) — "підвищена активність", нижче офіційного G1(Kp≥5),
    // але це саме поріг, на якому практичні UAV/GPS-додатки (UAV Forecast та подібні)
    // вже сповіщають користувача — GPS/радіозв'язок може деградувати ДО формального G1.
    // Суто інформаційний бейдж, НЕ чіпає G-формулу/engine/storm-guard (kp>=5 логіка нижче).
    if (kp >= 5) {
      kpEl.style.color = '';
      kpEl.title = '';
    } else if (kp >= 4) {
      kpEl.style.color = '#ffb347';
      kpEl.title = 'Kp≥4: підвищена геомагнітна активність (нижче офіційного G1=Kp5, але GPS/радіозв\'язок вже можуть деградувати — так само сповіщають UAV/дрон-додатки)';
    } else {
      kpEl.style.color = '';
      kpEl.title = '';
    }
  }
  if(isFinite(ap))  _el('sciAp').textContent = ap;
  if(sn != null)    _el('sciSn').textContent = sn;
  // F10.7 Solar Flux
  if(f107 != null && isFinite(f107)){
    const fEl = _el('sciF107');
    const fCol = f107>200?'var(--bad)':f107>150?'var(--warn)':f107>100?'#ffdd88':'var(--ok)';
    fEl.innerHTML = `<span style="color:${fCol};font-weight:700">${f107}</span> sfu`;
  // P3: GeoRisk Bar update
  (function(){
    function _grColor(norm) {
      if (norm >= 0.8) return '#ff4444';
      if (norm >= 0.5) return '#fca474';
      if (norm >= 0.2) return '#ffcc00';
      return '#2bd47d';
    }
    function _setBar(id, lblId, norm, label) {
      const el = document.getElementById(id);
      const lb = document.getElementById(lblId);
      if (!el) return;
      el.style.background = _grColor(Math.max(0, Math.min(1, norm)));
      el.style.opacity = 0.3 + 0.7 * Math.max(0, Math.min(1, norm));
      if (lb) lb.textContent = label;
    }
    // Kp: 0-9 → 0-1
    const _kpN = isFinite(kp) ? kp / 9 : 0;
    _setBar('grKp', 'grKpLbl', _kpN, 'Kp ' + (isFinite(kp) ? kp.toFixed(1) : '—'));
    // Dst: 0 (ok) → -200 (max storm); norm = |dst|/200
    const _dstRaw = window._lastDst ? window._lastDst.dst : NaN;
    const _dstN = isFinite(_dstRaw) ? Math.max(0, -_dstRaw) / 200 : 0;
    _setBar('grDst', 'grDstLbl', _dstN, 'Dst ' + (isFinite(_dstRaw) ? _dstRaw.toFixed(0) : '—'));
    // Bz: -50..0 нТл → storm; norm = max(0,-bz)/50
    const _bzRaw = (typeof lastBz !== 'undefined') ? lastBz : NaN;
    const _bzN = isFinite(_bzRaw) ? Math.max(0, -_bzRaw) / 50 : 0;
    _setBar('grBz', 'grBzLbl', _bzN, 'Bz ' + (isFinite(_bzRaw) ? _bzRaw.toFixed(1) : '—'));
    // Vsw: 300 (тихий) → 800 (буря); norm = (vsw-300)/500
    const _vswRaw = (typeof lastVsw !== 'undefined') ? lastVsw : NaN;
    const _vswN = isFinite(_vswRaw) ? Math.max(0, (_vswRaw - 300) / 500) : 0;
    _setBar('grVsw', 'grVswLbl', _vswN, 'Vsw ' + (isFinite(_vswRaw) ? Math.round(_vswRaw) : '—'));
  })();
  }
  // v26: M_DST indicator
  const dstMod = computeDstModifier();
  const mdstEl = _el('sciMdst');
  if(dstMod.val !== 0){
    const dCol = dstMod.val <= -2 ? 'var(--bad)' : 'var(--warn)';
    mdstEl.innerHTML = `<span style="color:${dCol};font-weight:700">${dstMod.val}</span>`;
  } else {
    mdstEl.innerHTML = `<span style="color:var(--ok)">0</span>`;
  }
  if(ai) {
    const phaseStr = phaseName || '—';
    const degStr = isFinite(phaseDeg) ? ` (${phaseDeg.toFixed(1)}°)` : '';
    _el('sciPhase').textContent = phaseStr + degStr;
    _el('sciLi').textContent = ai.Li;
    _el('sciMi').textContent = ai.Mi;
    _el('sciEi').textContent = ai.ei;
    _el('sciPi').textContent = ai.Pi;
    // v87.90: показую Sn-penalty якщо ≠ 0 (раніше прихований, але впливав на G)
    const _snPenEl = document.getElementById('sciSnPen');
    const _snPenWrap = document.getElementById('sciSnPenWrap');
    if (_snPenEl && _snPenWrap) {
      const _snP = ai.snPen || 0;
      if (_snP !== 0) {
        _snPenEl.textContent = _snP;
        _snPenEl.style.color = '#ff9f9f';
        _snPenEl.style.fontWeight = '700';
        _snPenWrap.style.display = '';
        _snPenWrap.title = `Sn-penalty: -${Math.abs(_snP)} при числі плям ${sn ?? '?'}>150 (Solar Max). Раніше був прихований у формулі, тепер показано.`;
      } else {
        _snPenWrap.style.display = 'none';
      }
    }
    const _diEl = _el('sciDi');
    if (_diEl) {
      const _di = ai.Di || 0;
      _diEl.textContent = _di;
      _diEl.style.color = _di < 0 ? '#ff9f9f' : _di > 0 ? '#7ec87e' : '';
      _diEl.style.fontWeight = _di !== 0 ? '700' : '';
    }
    // v88.8.18 R&D: G_extended advisory metric
    const _gExtEl = _el('sciGext');
    if (_gExtEl) {
      try {
        const _nowD = new Date(todayKyivStr()+'T12:00:00Z');
        const _panch = computePanchanga(sunriseUTC(_nowD));
        // cal_score from engine snapshot if available
        let _calSc = 0;
        try {
          if (typeof getEngineScore === 'function') {
            const _es = getEngineScore(_nowD);
            if (_es && isFinite(_es.cal_score)) _calSc = _es.cal_score;
          }
        } catch(e){ window.NRDiagnostics?.record('legacy.catch.218','recoverable'); }
        const _gExt = computeGExtended(_nowD, kp, _panch, ai, _calSc);
        if (_gExt.available && isFinite(_gExt.gExt)) {
          const _v = _gExt.gExt;
          const _sign = _v >= 0 ? '+' : '';
          _gExtEl.textContent = `${_sign}${_v.toFixed(1)}`;
          _gExtEl.style.color = _v >= 0.5 ? '#7ec87e' : _v <= -0.5 ? '#ff9f9f' : '#ffcc44';
          _gExtEl.style.fontWeight = '700';
          // Update tooltip with live calculation breakdown
          const _parentWrap = _gExtEl.closest('.sci-item');
          if (_parentWrap && _gExt.tip) {
            _parentWrap.title = _gExt.tip + '\n\n' + (_parentWrap.dataset._origTitle || '');
            if (!_parentWrap.dataset._origTitle && _parentWrap.title) _parentWrap.dataset._origTitle = '';
          }
        } else {
          _gExtEl.textContent = '—';
        }
      } catch(e) { globalThis.NRDiagnostics?.record('catch.253','recoverable');
        if (window._DEBUG) console.warn('[G_ext]', e.message);
        _gExtEl.textContent = '—';
      }
    }
    window._lastAiPi = ai.Pi;
  }
}/* NR_FN_END 333 */

/* NR_FN_BEGIN 334 */function setProfile(p) {
  _activeProfile = p;
  // v87.90 fix: persistence — без цього після reload юзер втрачає вибір
  try { localStorage.setItem('gindex_profile', p); } catch(e){ globalThis.NRDiagnostics?.record('catch.254','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  document.querySelectorAll('.profile-btn').forEach(b => {
    const _on = b.dataset.p === p;
    b.classList.toggle('active', _on);
    b.setAttribute('aria-pressed', _on ? 'true' : 'false'); // v88.8.35-fp56-P8 a11y
  });
  renderProfileRec();
  // v87.19: при зміні persona — одразу оновити Decision Layer (інакше чекає G-tick ~10 хв)
  try {
    const _ui = window.__uiState || {};
    { const _opG = (typeof resolveCurrentOperationalG_v88825 === 'function') ? resolveCurrentOperationalG_v88825() : _ui.gNow; if (isFinite(_opG)) renderDecisionLayer(_opG, _ui); }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.255','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
}/* NR_FN_END 334 */

/* NR_FN_BEGIN 335 */function getAgeAdj(profileKey) {
  try {
    // v87.59: migrated from legacy 'personalData' key to slot API (getSlotData(0))
    const data = getSlotData(0);
    // Зчитати вік: спочатку явне поле age, потім розрахунок з date
    let age = null;
    if (data && typeof data.age === 'number' && data.age >= 18) {
      age = data.age;
    } else if (data && data.date) {
      const birth = new Date(data.date);
      const now   = new Date();
      let a = now.getFullYear() - birth.getFullYear();
      const mDiff = now.getMonth() - birth.getMonth();
      if (mDiff < 0 || (mDiff === 0 && now.getDate() < birth.getDate())) a--;
      if (a >= 18 && a <= 80) age = a;
    }
    if (age === null) return { age: null, ageKey: null, label: '', gShift: 0 };

    // Визначити ageKey за порогами ageAdj профілю
    const prof    = PROFILE_TEXT[profileKey];
    const adjMap  = (prof && prof.ageAdj) ? prof.ageAdj : {};
    const thresholds = Object.keys(adjMap).map(Number).sort((a,b) => b - a); // спадно
    let ageKey = null;
    for (const t of thresholds) {
      if (age >= t) { ageKey = String(t); break; }
    }
    if (!ageKey) ageKey = String(Math.min(...thresholds.map(Number)));
    const gShift = adjMap[ageKey] ?? 0;

    // Текстова мітка
    const groupLabels = { '18':'', '35':' 35+', '45':' 45+', '55':' 55+' };
    const suffix = groupLabels[ageKey] ?? ` ${ageKey}+`;
    const label  = gShift !== 0 ? `${age}р${suffix}` : '';

    return { age, ageKey, label, gShift };
  } catch(e) { globalThis.NRDiagnostics?.record('catch.257','recoverable');
    return { age: null, ageKey: null, label: '', gShift: 0 };
  }
}/* NR_FN_END 335 */

/* NR_FN_BEGIN 336 */function getTaaraState() {
  try {
    const resEl = document.getElementById('personalResult');
    if (!resEl) return null;
    const data = getSlotData(_activeSlot);
    if (!data || !data.date) return null;
    const birthJDE = dateToJDE(data.date, data.time, data.utcOff);
    const nowJDE   = Date.now() / 86400000 + 2440587.5;
    const natal    = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(birthJDE)), birthJDE);
    const nowNak   = calcNakshatra(calcMoonLongitude(__nrUtcJdToTt(nowJDE)), nowJDE);
    const taara    = calcTaara(natal.idx, nowNak.idx);
    const dasa     = calcCurrentDasa(natal.idx, natal.fraction, birthJDE, nowJDE);
    return { taara, dasa, natal, nowNak };
  } catch(e) { globalThis.NRDiagnostics?.record('catch.258','recoverable');  return null; }
}/* NR_FN_END 336 */

/* NR_FN_BEGIN 340 */function bootGIndexOnce(_reason){
  if(window.__gIndexBooted) return;
  window.__gIndexBooted = true;
  var cp = function(n){ try{ document.getElementById('__cpPanel').textContent += '\nCP-BOOT-'+n; }catch(e){ window.NRDiagnostics?.record('legacy.catch.219','recoverable'); } };
  cp(1);
  try{ initCachedGeolocation(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.220','recoverable'); } cp(2);
  try{ setStamp(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.221','recoverable'); } cp(3);
  // fp148 MINIMAL DIAG: НЕ викликаємо loadAll/loadAllLite взагалі — жодного рендеру.
  // Якщо фриз стається навіть тут — причина ПОЗА boot-ланцюгом (десь у топ-рівневих IIFE).
  try{ initPersonalCalc(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.222','recoverable'); } cp(4);
  try{ initLangToggle(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.223','recoverable'); } cp(5);
  try{ initG2Watch(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.224','recoverable'); } cp(6);
  try{ initSimpleMode(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.225','recoverable'); } cp(7);
  // fp166: fp148 diag confirmed loadAll() had ZERO automatic trigger anywhere
  // in the file (static analysis 2026-07-11) — dashboard only ever showed a
  // stale localStorage cache-paint (fp164) labeled "оновлюється..." that
  // never actually updated. Restoring the real call here.
  // fp167 (loadEngineScores/loadExpertOverrides boot-wiring) ROLLED BACK
  // 2026-07-11 — caused a real page hang on live deploy, cause not yet
  // isolated (jsdom simulation with realistic 564-entry engine_scores.json
  // did NOT reproduce it — likely real-browser/network-timing specific).
  // Investigate fresh in a new session before re-attempting.
  // fp169: fp168 (sequential loadEngineScores/loadExpertOverrides at boot)
  // ALSO hung the real page (2026-07-12 morning) despite passing jsdom
  // simulation. Two consecutive boot-time attempts (parallel fp167, sequential
  // fp168) both hung in the real browser but NOT in simulation — strongly
  // suggests the cause is something jsdom cannot model: most likely
  // interaction with sw.js (network-first SW added same session, intercepts
  // the engine_scores.json fetch) or real CORS/network timing. NOT retrying
  // boot-time engine score loading blindly a third time. See memory for
  // diagnostic plan (test in Incognito = no SW, isolate before next attempt).
  runDataRefresh('boot');
  try{ updateAutoRefStatus(); }catch(e){ window.NRDiagnostics?.record('legacy.catch.226','recoverable'); }
  cp(8);
  cp('DONE-minimal-boot');
}/* NR_FN_END 340 */

/* NR_FN_BEGIN 341 */function applyLang(lang) {
  _currentLang = lang;
  const t = I18N[lang];
  const ua = lang === 'UA';

  // Header
  const hTitle = document.getElementById('headerTitle');
  if(hTitle) hTitle.textContent = 'NeboRhythm';
  const hSub = document.getElementById('headerSub');
  if(hSub) hSub.innerHTML = ua
    ? 'Небо. Час. Твій ритм. &nbsp;<span style="color:var(--faint);font-size:10px">Advisory</span>'
    : 'See the conditions. Plan your next move. &nbsp;<span style="color:var(--faint);font-size:10px">Advisory</span>';
  el('btnRefresh').textContent = ua ? '↻ Оновити дані' : '↻ Refresh data';
  el('btnG2Watch').textContent = '🧮';

  // Section titles
  const nowH2 = el('nowCard').querySelector('h2');
  if(nowH2) nowH2.childNodes[0].nodeValue = t.nowCardTitle + ' ';

  const panchH2 = el('panchCard').querySelector('h2');
  if(panchH2) {
    panchH2.childNodes[0].nodeValue = t.panchCardTitle + ' ';
    const sub = panchH2.querySelector('span.muted');
    if(sub) sub.textContent = t.panchCardSub;
  }
  const jySub=el('jyotishPassportSub');
  if(jySub) jySub.textContent=t.panchCardSub;
  const jySummary=el('jyotishPassportSummary');
  if(jySummary) jySummary.textContent=ua?'Що це означає і які межі?':'What does it mean and what are the limits?';
  const jyLimits=el('jyotishPassportLimits');
  if(jyLimits) jyLimits.textContent=ua
    ? 'Традиційний календарний шар для локального дня від астрономічного сходу сонця з урахуванням timezone/DST. Це не другий прогноз і не фізична причинність. Головний оперативний стан має пріоритет; D1/D9 і Dasha не активовані до окремої перевірки ephemeris та privacy-gate.'
    : 'Traditional timing for the local day from astronomical sunrise with timezone/DST. It is not a second forecast or a claim of physical causation. The operational state has priority; D1/D9 and Dasha stay disabled pending ephemeris and privacy gates.';
  window.GJyotishLayer?.refreshLabel?.();
  const jyNav=el('mnavPanch');
  if(jyNav){
    const label=ua?'Джйотіш':'Jyotish';
    jyNav.setAttribute('aria-label',label);
    const textNode=[...jyNav.childNodes].find(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim());
    if(textNode) textNode.nodeValue='\n    '+label+'\n  ';
  }

  const persH2 = el('personalCard').querySelector('h2');
  if(persH2) {
    const nameLabel = el('pNameLabel');
    const nameText = nameLabel ? nameLabel.textContent : '';
    persH2.childNodes[0].nodeValue = (ua ? '👤 Особистий прогноз' : '👤 Personal Forecast') + ' ';
  }
  const persSub = el('personalCardSub');
  if(persSub) persSub.textContent = t.personalCardSub;

  const threeH2 = el('threeCard').querySelector('h2');
  if(threeH2) threeH2.textContent = t.threeCardTitle;

  const s27H2 = el('twentysevenCard').querySelector('h2');
  if(s27H2) s27H2.textContent = t.twentysevenCardTitle;

  // Autoref badge
  const badge = el('autorefStatus');
  if(badge && badge.className.includes('off')) badge.textContent = t.autoOff;

  // Footer
  const footer = document.querySelector('footer .small');
  if(footer) footer.textContent = t.footerText;

  // Lang buttons
  el('btnLang').textContent = ua ? 'UA' : 'EN';
  el('btnLang').classList.toggle('active', true);

  // G2 watch panel label
  const g2h3 = document.querySelector('#g2watchPanel h3');
  if(g2h3) g2h3.textContent = ua ? '⚡ G2 Watch — перевірка формули (тестовий режим)' : '⚡ G2 Watch — formula verification (test mode)';

  // v87.90: оновити заголовки нових картків (Provenance/Counterfactual/Anti-action)
  const _pSum = document.querySelector('#provenanceCard summary span:nth-child(2)');
  if(_pSum) _pSum.textContent = t.provenanceTitle;
  const _pExp = document.querySelector('#provenanceCard summary span:nth-child(3)');
  if(_pExp) _pExp.textContent = t.provenanceExpand;

  const _cSum = document.querySelector('#counterfactualCard summary span:nth-child(2)');
  if(_cSum) _cSum.textContent = t.counterfactualTitle;
  const _cExp = document.querySelector('#counterfactualCard summary span:nth-child(3)');
  if(_cExp) _cExp.textContent = t.counterfactualExpand || t.provenanceExpand;

  const _aSum = document.querySelector('#antiActionCard summary span:nth-child(2)');
  if(_aSum) _aSum.textContent = t.antiActionTitle;
  const _aExp = document.querySelector('#antiActionCard summary span:nth-child(3)');
  if(_aExp) _aExp.textContent = t.provenanceExpand;

  // v88.0: Scenario card + Astro Layer pill localization
  const _scLab = document.getElementById('scenarioSummaryLabel');
  if(_scLab) _scLab.textContent = t.scenarioTitle || _scLab.textContent;
  const _scLeg = document.getElementById('scenarioLegend');
  if(_scLeg) _scLeg.textContent = t.scenarioLegend || _scLeg.textContent;
  const _astro = document.getElementById('heroAstroLayer');
  if(_astro && t.astroLayerLabel) _astro.setAttribute('data-label', t.astroLayerLabel);
  // Re-render scenario sub-label (контекст залежить від мови — критичних/critical)
  try{ if(typeof renderScenarioCard === 'function') renderScenarioCard(); }catch(e){ globalThis.NRDiagnostics?.record('catch.262','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ if(typeof renderHeroAstroLayer === 'function') renderHeroAstroLayer(); }catch(e){ globalThis.NRDiagnostics?.record('catch.263','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // Disambig chip
  const _dis = document.getElementById('timingDisambig');
  if(_dis) _dis.textContent = t.timingDisambig;

  // Re-render dynamic content (Disagreement/Counterfactual/AntiAction/Provenance) для оновленої мови
  try{ if(typeof renderProvenance === 'function') renderProvenance(); }catch(e){ globalThis.NRDiagnostics?.record('catch.264','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ if(typeof renderDisagreement === 'function') renderDisagreement(); }catch(e){ globalThis.NRDiagnostics?.record('catch.265','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ if(typeof renderCounterfactual === 'function') renderCounterfactual(); }catch(e){ globalThis.NRDiagnostics?.record('catch.266','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  try{ if(typeof renderAntiAction === 'function') renderAntiAction(); }catch(e){ globalThis.NRDiagnostics?.record('catch.267','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // <html lang> attribute для accessibility
  document.documentElement.lang = ua ? 'uk' : 'en';
}/* NR_FN_END 341 */

/* NR_FN_BEGIN 342 */function initLangToggle() {
  el('btnLang').addEventListener('click', () => {
    const next = _currentLang === 'UA' ? 'EN' : 'UA';
    el('btnLang').textContent = next === 'UA' ? 'UA' : 'EN';
    applyLang(next);
  });
}/* NR_FN_END 342 */

/* NR_FN_BEGIN 343 */function initG2Watch() {
  el('btnG2Watch').addEventListener('click', () => {
    const panel = el('g2watchPanel');
    const visible = panel.style.display === 'block';
    panel.style.display = visible ? 'none' : 'block';
    if (!visible) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      syncG2();
    }
  });
}/* NR_FN_END 343 */

/* NR_FN_BEGIN 344 */function setSimpleMode(on, options){
  const btn = el('btnSimpleMode');
  if(!btn) return;
  const opts = options || {};
  const isOn = Boolean(on);
  document.body.classList.toggle('simple-mode', isOn);
  const lab = el('simpleModeLabel');
  if(lab) lab.textContent = isOn ? 'Повний вигляд' : 'Простий вигляд';
  btn.setAttribute('aria-label', isOn ? 'Повний вигляд' : 'Простий вигляд');
  btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  btn.classList.toggle('active', isOn);
  btn.style.borderColor = isOn ? 'var(--ok)' : 'var(--faint)';
  btn.style.color = isOn ? 'var(--ok)' : 'var(--dim)';
  btn.title = isOn
    ? 'Простий режим АКТИВНИЙ. Натисніть для повного експертного UI.'
    : 'Повний режим АКТИВНИЙ. Натисніть для простого вигляду.';
  if(opts.persist !== false){
    try { localStorage.setItem('gindex_simple_mode', isOn ? '1' : '0'); } catch(e){ window.NRDiagnostics?.record('legacy.catch.227','recoverable'); }
  }
  if(opts.notify !== false && typeof showToast === 'function'){
    showToast(isOn ? 'Простий режим увімкнено' : 'Повний режим увімкнено', 'info', 2000);
  }
}/* NR_FN_END 344 */

/* NR_FN_BEGIN 345 */function toggleSimpleMode(){
  setSimpleMode(!document.body.classList.contains('simple-mode'));
}/* NR_FN_END 345 */

/* NR_FN_BEGIN 346 */function toggleHeaderTools(button){
  const bar = document.getElementById('dashboardToolbar');
  if (!bar) return;
  const isOpen = bar.classList.toggle('tools-open');
  const control = button || document.getElementById('btnHeaderTools');
  if (control) {
    control.setAttribute('aria-expanded', String(isOpen));
    control.textContent = isOpen ? '× Сховати' : '⋯ Інструменти';
  }
}/* NR_FN_END 346 */

/* NR_FN_BEGIN 347 */function initSimpleMode(){
  // Restore стан з localStorage
  // fp92: default = simple mode для нових (перший відкриття без збереженого налаштування)
  const _hasSimplePref = (function(){ try { return localStorage.getItem('gindex_simple_mode') !== null; } catch(e){ globalThis.NRDiagnostics?.record('catch.268','recoverable');  return true; } })();
  const _savedSimple = (function(){ try {
    if(window.GINDEX_PLAY_CHANNEL) return true;
    if(!_hasSimplePref) return true; // new user → simple by default
    return localStorage.getItem('gindex_simple_mode') === '1';
  } catch(e){ globalThis.NRDiagnostics?.record('catch.269','recoverable');  return true; } })();
  setSimpleMode(_savedSimple, {persist:false, notify:false});
}/* NR_FN_END 347 */

/* NR_FN_BEGIN 349 */function setSlider(id, val) {
  const el_ = document.getElementById(id);
  if (el_) el_.value = val;
}/* NR_FN_END 349 */

/* NR_FN_BEGIN 350 */function syncG2(scenarioLabel) {
  const kp     = parseFloat(el('g2kp').value) || 0;
  const li     = parseFloat(el('g2li').value) || 0;
  const mi     = parseFloat(el('g2mi').value) || 0;
  const ei_val = parseFloat(el('g2ei').value) || 0;
  const pi_val = parseFloat(el('g2pi').value) || 0;
  // v87.90: smart sign formatter — нуль як "0" без знака, інакше +/− з фіксованою точністю
  const _smFmt = (v, dp) => {
    if (Math.abs(v) < (dp === 2 ? 0.005 : 0.05)) return '0';
    return (v > 0 ? '+' : '') + v.toFixed(dp);
  };

  // Оновити відображення значень слайдерів
  const fmt = v => v > 0 ? '+'+v.toFixed(1) : v.toFixed(1);
  el('g2kpVal').textContent = kp.toFixed(1);
  el('g2liVal').textContent = fmt(li);
  el('g2miVal').textContent = fmt(mi);
  el('g2eiVal').textContent = fmt(ei_val);
  el('g2piVal').textContent = fmt(pi_val);

  // Кольори значень
  const colorVal = (v, elId) => {
    const e = document.getElementById(elId);
    if (!e) return;
    e.style.color = v > 0 ? '#2bd47d' : v < 0 ? '#ff6b6b' : '#9bb1dc';
  };
  colorVal(li,     'g2liVal');
  colorVal(mi,     'g2miVal');
  colorVal(ei_val, 'g2eiVal');
  colorVal(pi_val, 'g2piVal');
  el('g2kpVal').style.color = kp >= 5 ? '#ff6b6b' : kp >= 3 ? '#ffcc00' : '#2bd47d';

  const di_val = (window._lastDst && isFinite(window._lastDst.dst))
    ? (window._lastDst.dst <= -100 ? -2 : window._lastDst.dst <= -50 ? -1 : 0) : 0;
  // v88.7 (deep audit): snPen — sync з Hero G формулою
  // Hero G = 2 − Kp + Li + Mi + ei + Pi + Di + snPen; раніше G2 watch не включав snPen
  // → розбіжність 0.2-0.4 у Solar Max коли Sn>150
  const _snVal = (window._lastWolfSn && isFinite(window._lastWolfSn.sn)) ? window._lastWolfSn.sn : 0;
  const snPen = 0; // fp297: SILSO remains context-only
  const sumAi = li + mi + ei_val + pi_val + di_val;
  const G     = kpDayTerm(kp) + sumAi;
  const catUA = classifyG(G);
  const rec   = recommendG(G, kp);

  // Візуальний decomposition bar
  const total  = Math.abs(kpDayTerm(kp)) + Math.abs(sumAi) || 1;
  const kpPart = Math.abs(kpDayTerm(kp)) / total * 100;
  const aiPart = Math.abs(sumAi) / total * 100;
  const kpCol  = kpDayTerm(kp) >= 0 ? '#37a7ff' : '#ff9f9f';
  const aiCol  = sumAi   >= 0 ? '#2bd47d' : '#ff6b6b';

  const gCol   = G >= 2 ? '#2bd47d' : G >= 0 ? '#9bb1dc' : G >= -2 ? '#ffcc00' : '#ff6b6b';

  // Що-якщо підказки
  const hints = [];
  if (kp >= 5) hints.push('⚠ Kp≥5 → можливий вплив на HF-зв\'язок, навігацію, стан особового складу');
  if (mi <= -3) hints.push('🌑 Близько до затемнення → посилений вплив eᵢ+Lᵢ');
  if (G <= -2)  hints.push('🔴 G≤−2 → рекомендується мінімізувати ініціативні операції (mil), обережність у прийнятті рішень');
  if (G >= 2)   hints.push('🟢 G≥+2 → оптимальний час для активних дій, планування, операцій');
  if (sumAi <= -5) hints.push('⚡ ΣAᵢ = '+sumAi.toFixed(1)+' — накопичення несприятливих факторів');

  el('g2watchResult').innerHTML = `
    ${scenarioLabel ? `<div style="font-size:12px;color:var(--dim);margin-bottom:8px;font-style:italic">${scenarioLabel}</div>` : ''}
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
      <div style="font-size:32px;font-weight:800;color:${gCol}">G = ${G.toFixed(1)}</div>
      <div>
        <div style="font-size:16px;font-weight:600;${rec.style}">${rec.text}</div>
        <div class="muted small">${catUA}</div>
      </div>
    </div>

    <div style="margin-bottom:10px">
      <div class="small muted" style="margin-bottom:4px">Декомпозиція G = 2−Kp + ΣAᵢ:</div>
      <div style="font-family:monospace;font-size:13px;background:#0f1a2f;padding:8px 12px;border-radius:8px;color: var(--text2)">
        G = 2 − ${kp.toFixed(1)} + (${_smFmt(li,1)} + ${_smFmt(mi,1)} + ${_smFmt(ei_val,1)} + ${_smFmt(pi_val,1)} + ${_smFmt(di_val,1)})
          = <strong style="color:${gCol}">${G.toFixed(2)}</strong>
      </div>
      <div style="display:flex;gap:2px;margin-top:6px;border-radius:6px;overflow:hidden;height:10px">
        <div style="width:${kpPart}%;background:${kpCol};opacity:.8" title="2−Kp = ${kpDayTerm(kp).toFixed(1)}"></div>
        <div style="width:${aiPart}%;background:${aiCol};opacity:.8" title="ΣAᵢ = ${sumAi.toFixed(1)}"></div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--faint);margin-top:3px">
        <span style="color:${kpCol}">■ 2−Kp = ${kpDayTerm(kp)>=0?'+'+kpDayTerm(kp).toFixed(1):kpDayTerm(kp).toFixed(1)}</span>
        <span style="color:${aiCol}">■ ΣAᵢ = ${sumAi>=0?'+'+sumAi.toFixed(1):sumAi.toFixed(1)} (Lᵢ+Mᵢ+eᵢ+Pᵢ+Dᵢ)</span>
      </div>
    </div>

    ${hints.length ? `<div style="font-size:12px;line-height:1.6">${hints.map(h=>`<div style="padding:3px 0;border-top:1px solid #1a2540">${h}</div>`).join('')}</div>` : ''}
  `;
}/* NR_FN_END 350 */

/* NR_FN_BEGIN 351 */function gToCategory(g) {
  if (!isFinite(g)) return null;
  if (g >= 2)  return 7;
  if (g >= 1)  return 6;
  if (g >= 0)  return 5;
  if (g >= -1) return 4;
  if (g >= -2) return 3;
  if (g >= -3) return 2;
  return 1;
}/* NR_FN_END 351 */

/* NR_FN_BEGIN 352 */async function handleBacktestFile(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('btFileLabel').textContent = file.name;

  // Lazy-load SheetJS
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = './xlsx-0.20.3.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, {type:'array', cellDates:true});

  // Шукаємо аркуш ДАНІ_ЩОДЕННІ або перший
  const sheetName = wb.SheetNames.find(n => n.includes('ДАНІ') || n.includes('DATA') || n.includes('data')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, {defval: null});
  if (!rows.length) { document.getElementById('btFileLabel').textContent = '❌ Аркуш порожній'; return; }

  // Визначаємо колонки динамічно
  const keys = Object.keys(rows[0]);
  const dateKey  = keys.find(k => /дат|date/i.test(k)) || keys[0];
  // Шукаємо колонку з G або балом/оцінкою
  const scoreKey = keys.find(k => /^g$|^G$|оцінк|оцін|бал|score/i.test(k));
  const catKey   = keys.find(k => /кат|cat/i.test(k));
  // v39: Kp з Excel — пріоритет над fallback 2.0
  const kpKey = keys.find(k => /kp.інд|kp.ind/i.test(k)) || keys.find(k => /^kp$/i.test(k)) || keys.find(k => /kp/i.test(k) && !/норм|norm|scale/i.test(k));

  if (!scoreKey && !catKey) {
    document.getElementById('btFileLabel').textContent = `❌ Не знайдено колонку G/бал (колонки: ${keys.slice(0,8).join(', ')})`;
    return;
  }

  // Missing or malformed inputs must never become a numerical observation.
  const numberCell = value => {
    if (typeof value !== 'number' && typeof value !== 'string') return NaN;
    if (typeof value === 'string' && !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.trim())) return NaN;
    const n = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
    return Number.isFinite(n) ? n : NaN;
  };
  document.getElementById('btStats').style.display = 'none';
  document.getElementById('btTableWrap').style.display = 'none';
  // Збираємо Excel-дані в Map
  const excelMap = new Map();
  for (const row of rows) {
    let d = row[dateKey];
    if (!d) continue;
    let ds;
    if (d instanceof Date) {
      if (!Number.isFinite(d.getTime())) continue;
      ds = d.toISOString().slice(0,10);
    } else if (typeof d === 'string') {
      // DD.MM.YYYY або YYYY-MM-DD
      const m = d.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      ds = m ? `${m[3]}-${m[2]}-${m[1]}` : d.trim();
    } else if (typeof d === 'number') {
      // Excel serial date
      const excelDate = new Date(Math.round((d - 25569) * 86400 * 1000));
      if (!Number.isFinite(excelDate.getTime())) continue;
      ds = excelDate.toISOString().slice(0,10);
    } else continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds) || !Number.isFinite(Date.parse(ds)) || new Date(ds).toISOString().slice(0,10) !== ds) continue;
    if (excelMap.has(ds)) { document.getElementById('btFileLabel').textContent = '❌ Повтор дати: ' + ds + '. Усуньте дублікати перед звіркою.'; return; }
    const gVal  = scoreKey ? numberCell(row[scoreKey]) : NaN;
    const catRaw = catKey ? numberCell(row[catKey]) : NaN;
    const catVal = Number.isInteger(catRaw) && catRaw >= 1 && catRaw <= 7 ? catRaw : null;
    const kpVal  = kpKey ? numberCell(row[kpKey]) : NaN;
    excelMap.set(ds, { g: gVal, cat: catVal, kp: Number.isFinite(kpVal) && kpVal >= 0 && kpVal <= 9 ? kpVal : null });
  }

  if (!excelMap.size) { document.getElementById('btFileLabel').textContent = '❌ Дати не розпізнано'; return; }

  // Генеруємо G дашборду для всіх дат з Excel
  const results = [];
  for (const [ds, ex] of excelMap) {
    const dateObj = new Date(ds + 'T12:00:00Z');
    if (isNaN(dateObj)) continue;
    // Only the uploaded day's Kp is suitable here. A recent first 3-hour
    // observation is not a daily historical value; never substitute Kp=2.
    const kpUsed = ex.kp;
    const ai = kpUsed !== null ? computeAi(dateObj, kpUsed) : null;
    const G = ai && Number.isFinite(ai.Ai) ? Math.round((kpDayTerm(kpUsed) + ai.Ai) * 100) / 100 : NaN;
    const catD = Number.isFinite(G) ? gToCategory(G) : null;
    const catE = ex.cat !== null ? ex.cat : (Number.isFinite(ex.g) ? gToCategory(ex.g) : null);
    const gE = Number.isFinite(ex.g) ? ex.g : null;
    const delta = (isFinite(G) && gE !== null) ? Math.round((G - gE) * 100) / 100 : null;
    const match = catD !== null && catE !== null ? catD === catE : null;
    results.push({ ds, G, gE, catD, catE, delta, match });
  }

  // Сортуємо за датою desc
  results.sort((a,b) => b.ds.localeCompare(a.ds));

  // Статистика
  const compared = results.filter(r => r.match !== null);
  const correct  = compared.filter(r => r.match).length;
  const accuracy = compared.length ? (correct / compared.length * 100).toFixed(1) : '—';
  const maes = results.filter(r => r.delta !== null).map(r => Math.abs(r.delta));
  const mae  = maes.length ? (maes.reduce((s,v) => s+v, 0) / maes.length).toFixed(2) : '—';

  document.getElementById('btStats').style.display = '';
  document.getElementById('btAccuracy').innerHTML = `Збіг категорій з Excel: <strong style="color:${parseFloat(accuracy)>=80?'#2bd47d':'#ffcc00'}">${accuracy}%</strong> (${correct}/${compared.length})`;
  document.getElementById('btMae').textContent = `MAE G: ${mae}`;
  document.getElementById('btN').textContent   = `n = ${results.length} днів; без розрахунку G: ${results.filter(r => !Number.isFinite(r.G)).length}. Історична звірка, не точність прогнозу подій.`;

  // Таблиця
  const catColor = c => c >= 6 ? '#2bd47d' : c >= 5 ? '#92D050' : c >= 4 ? '#ffcc00' : c >= 3 ? '#FCA474' : '#ff6b6b';
  let html = '';
  for (const r of results) {
    const mc = r.match === null ? '#6b82aa' : r.match ? '#2bd47d' : '#ff6b6b';
    const mi = r.match === null ? '—' : r.match ? '✓' : '✗';
    const dc = r.delta !== null ? (Math.abs(r.delta) > 1 ? '#ff6b6b' : Math.abs(r.delta) > 0.5 ? '#ffcc00' : '#6b82aa') : '';
    html += `<tr style="border-bottom:1px solid #0d1a30">
      <td style="padding:3px 8px;color: var(--muted)">${r.ds}</td>
      <td style="padding:3px 8px;text-align:center;color:${catColor(r.catD)}">${isFinite(r.G)?r.G.toFixed(2):'—'}</td>
      <td style="padding:3px 8px;text-align:center;color:${r.gE!==null?catColor(gToCategory(r.gE)):'#6b82aa'}">${r.gE!==null?r.gE.toFixed?.(2)??r.gE:'—'}</td>
      <td style="padding:3px 8px;text-align:center;color:${dc}">${r.delta!==null?(r.delta>=0?'+':'')+r.delta:'—'}</td>
      <td style="padding:3px 8px;text-align:center;color:${r.catD?catColor(r.catD):'#6b82aa'}">${r.catD??'—'}</td>
      <td style="padding:3px 8px;text-align:center;color:${r.catE?catColor(r.catE):'#6b82aa'}">${r.catE??'—'}</td>
      <td style="padding:3px 8px;text-align:center;color:${mc};font-weight:700">${mi}</td>
    </tr>`;
  }
  document.getElementById('btTbody').innerHTML = html;
  document.getElementById('btTableWrap').style.display = '';
}/* NR_FN_END 352 */

/* NR_FN_BEGIN 357 */function _escHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }/* NR_FN_END 357 */
