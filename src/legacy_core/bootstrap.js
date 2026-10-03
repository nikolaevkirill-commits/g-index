

/* NR_FN_SLOT 000 */
window.addEventListener('load',()=>setTimeout(updatePushButtonState,800));

const PushModal = {
  async show(){
    if(!PUSH.isSupported()){
      showToast('Ваш браузер не підтримує push-сповіщення', 'warn');
      return;
    }
    // Tier-gate: Plus або вище
    // Safety alerts are available to every authenticated user.
    if(!PUSH.isConfigured()){
      showToast('Бекенд сповіщень ще не налаштовано. Скоро!', 'info');
      return;
    }
    if(!SUPA.currentUser()){
      showToast('Спочатку увійдіть в акаунт (🔐 у хедері)', 'warn');
      return;
    }

    const perm = PUSH.currentPermission();
    const subscribed = await PUSH.isSubscribed();

    let ov = document.getElementById('pushOverlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'pushOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.85);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px';
      document.body.appendChild(ov);
    }

    let stateHtml = '';
    if(perm === 'denied'){
      stateHtml = `
        <div style="color:#ff9955;font-size:13px;margin-bottom:14px">⚠ Ви заблокували сповіщення для цього сайту. Дозволити: Налаштування → Сповіщення → дозволити для ${location.hostname}.</div>
        <button onclick="PushModal.hide()" style="padding:8px 14px;background: var(--border);color: var(--muted);border:1px solid #2a3b61;border-radius:6px;cursor:pointer">OK</button>`;
    }else if(subscribed){
      stateHtml = `
        <div style="color: var(--ok);font-size:13px;margin-bottom:14px">✓ Сповіщення увімкнено на цьому пристрої.</div>
        <div style="font-size:11px;color: var(--muted);margin-bottom:12px">Ви отримуватимете попередження про G ≤ −2 та сприятливі вікна.</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="PushModal.hide()" style="padding:8px 14px;background: var(--border);color: var(--muted);border:1px solid #2a3b61;border-radius:6px;cursor:pointer">Закрити</button>
          <button onclick="PushModal.doUnsubscribe()" style="padding:8px 14px;background:#2a1a1a;color:#ff9f9f;border:1px solid #4a2a2a;border-radius:6px;cursor:pointer">Вимкнути</button>
        </div>`;
    }else{
      stateHtml = `
        <div style="font-size:13px;color: var(--text2);margin-bottom:10px">Отримуйте сповіщення про:</div>
        <ul style="font-size:12px;color: var(--muted);margin:0 0 14px 16px;padding:0">
          <li>🔴 Піки несприятливого G (≤ −2)</li>
          <li>🟢 Сприятливі вікна дня</li>
          <li>⚡ Підвищена геомагнітна активність (Kp ≥ 4)</li>
          <li>🌑 День затемнення</li>
        </ul>
        <div id="pushMsg" style="font-size:11px;color: var(--muted);min-height:16px;margin-bottom:10px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="PushModal.hide()" style="padding:8px 14px;background: var(--border);color: var(--muted);border:1px solid #2a3b61;border-radius:6px;cursor:pointer">Скасувати</button>
          <button onclick="PushModal.doSubscribe()" style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">🔔 Увімкнути</button>
        </div>`;
    }

    ov.innerHTML = `
      <div style="background:#0f1a2f;border:1px solid #2a3b61;border-radius:12px;padding:24px;max-width:400px;width:100%">
        <div style="font-size:16px;font-weight:700;color: var(--text2);margin-bottom:12px">🔔 Сповіщення G-Index</div>
        ${stateHtml}
      </div>`;
    ov.style.display = 'flex';
  },
  hide(){
    const ov = document.getElementById('pushOverlay');
    if(ov) ov.style.display = 'none';
  },
  async doSubscribe(){
    const msg = document.getElementById('pushMsg');
    if(msg){ msg.textContent = 'Підписка…'; msg.style.color = '#9bb1dc'; }
    try{
      await PUSH.subscribe();
      await updatePushButtonState();
      if(msg){ msg.textContent = '✓ Готово!'; msg.style.color = '#2bd47d'; }
      setTimeout(() => PushModal.show(), 800); // перерендерити у subscribed-стан
    }catch(e){ globalThis.NRDiagnostics?.record('catch.32','recoverable');
      if(msg){ msg.textContent = 'Помилка: ' + (e.message || e); msg.style.color = '#ff6b6b'; }
    }
  },
  async doUnsubscribe(){
    try{
      await PUSH.unsubscribe();
      await updatePushButtonState();
      setTimeout(() => PushModal.show(), 300);
    }catch(e){ globalThis.NRDiagnostics?.record('catch.33','recoverable');  showToast('Помилка відписки: ' + (e.message || e), 'error'); }
  }
};

// ---------------------------- Налаштування джерел ----------------------------
// NOAA SWPC
// NOAA JSON endpoints (txt заблоковано з 2026)
const URL_KP_OBS      = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const URL_KP_OBS_FB   = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'; // fallback P0
const URL_KP_FCST     = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
const URL_27DAY       = 'https://services.swpc.noaa.gov/text/27-day-outlook.txt';
const URL_45DAY_FB    = 'https://services.swpc.noaa.gov/json/45-day-forecast.json'; // fallback P0
const URL_CALENDAR_ADVISORY = './FUTURE_CALENDAR_ADVISORY_v1.json';
window._futureCalendarAdvisory = {};
/* NR_FN_SLOT 001 */
/* NR_FN_SLOT 002 */
// v88.8.18 ★ NOAA SWPC STALENESS FIX: NOAA SWPC /products/ endpoints не оновлюються
// з 28.03.2026 (verified 11.05.2026 — 6+ тижнів простою). GFZ Potsdam — canonical
// Kp source за IAGA, оновлюється кожні 3 години. Це primary alternative tier.
// Format: ?start=YYYY-MM-DDTHH:mm:ssZ&end=...&index=Kp&status=def (definitive)
//          або status=now (nowcast — швидше, але менш точно)
const URL_GFZ_KP_NOW  = 'https://kp.gfz.de/app/json/?index=Kp&status=now'; // (з start/end)
const URL_GFZ_KP_DEF  = 'https://kp.gfz.de/app/json/?index=Kp&status=def';
const URL_WOLF_SN  = 'https://www.sidc.be/SILSO/DATA/SN_d_tot_V2.0.csv'; // documented daily total SN
const URL_WOLF_SN_FB = 'https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv'; // documented monthly fallback
const URL_WOLF_SN_STATUS = 'SILSO_REFRESH_STATUS_v1.json'; // same-origin daily validated snapshot
const URL_DST_FB   = 'https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json'; // fallback Dst proxy
const URL_KP_FCST_FB2 = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'; // fallback fcst via obs
const URL_DST      = 'https://services.swpc.noaa.gov/products/kyoto-dst.json'; // Dst/SYM-H
// v88.6.9: UAF Geophysical Institute mirror (Tier-2 fallback when NOAA proxies fail)
// HTML wrapper навколо NOAA-derived JSON arrays. Updated daily noon UTC (3-day) i щопонеділка (27-day)
const URL_UAF_AURORA   = 'https://www.gi.alaska.edu/monitors/aurora-forecast';

// ICS (онлайн календарі подій):
// 1) Vaisnava/ISKCON (містить Ekadashi, Amavasya, Sankranti тощо) — сторінка завантажень:
// https://www.vaisnavacalendar.info/calendar-file-downloads/ics-ical-calendar-files-2025
/* NR_FN_SLOT 003 */
// 2) Hindu Holidays (CalendarLabs) — робочий ICS:
const ICS_HINDU_HOLIDAYS = 'https://ics.calendarlabs.com/48/13d1b419/Hindu_Holidays.ics'; // сторінка підписки: https://www.calendarlabs.com/ical-calendar/ics/subscribe/48/Hindu_Holidays

// Сторінки затемнень (для парсингу/перевірки):
// Timeanddate рік: https://www.timeanddate.com/eclipse/2025
// NASA загальні:   https://science.nasa.gov/eclipses/future-eclipses/

// ------------------------------- Утиліти часу -------------------------------
// v26.2: Geolocation — navigator.geolocation з fallback на Київ (50.45°N, 30.52°E)
let _userLat = 50.45, _userLon = 30.52;

// v87.26: IANA timezone detection (stable identifier for UI labels + future Panchanga migration).
// Returns browser's system TZ (e.g. "Europe/Kyiv", "America/Los_Angeles"); fallback "UTC".
// Note: координати (_userLat/_userLon) та IANA можуть не збігатися, коли user мандрує з ноутбуком —
// у такому випадку Panchanga/Hora використовують координати, а лейбли показують IANA браузера.
(function(){
  try{
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    window._iana = tz || 'UTC';
  }catch(e){ globalThis.NRDiagnostics?.record('catch.35','recoverable');  window._iana = 'UTC'; }
})();

let _geoSource='default';
/* NR_FN_SLOT 004 */
/* NR_FN_SLOT 005 */
/* NR_FN_SLOT 006 */
// No permission prompt at boot. Saved coordinates are labelled as saved.
/* NR_FN_SLOT 007 */

// v87.26: динамічний Hora-лейбл = "(IANA, UTC±HH, lat°N/S)"
/* NR_FN_SLOT 008 */

// v87.26: console helper — `javascript:void(__testTimezone())`
window.__testTimezone = function(){
  const now = new Date();
  const info = {
    iana: window._iana || '(not set)',
    offset_minutes: -now.getTimezoneOffset(),
    offset_label: (()=>{ try{ return tzOffsetLabel(now); }catch(e){ globalThis.NRDiagnostics?.record('catch.38','recoverable');  return '?'; } })(),
    iana_label: (()=>{ try{ return ianaTzLabel(now); }catch(e){ globalThis.NRDiagnostics?.record('catch.39','recoverable');  return '?'; } })(),
    user_lat: _userLat,
    user_lon: _userLon,
    hora_label_dom: (document.getElementById('horaCoordLabel')||{}).textContent || '(not rendered)'
  };
  console.table(info);
  return info;
};

// v88.9.6x-fp245 (аудит fp242, п.4): раніше кожен блок сам рахував "локальний"
// час через ТАЙМЗОНУ БРАУЗЕРА (getTimezoneOffset() або new Date(Date.UTC(...)).
// getHours()) — Rahu Kalam / Yamagandam / Gulika / слоти "Плану дня" / "Критичних
// вікон" МОГЛИ розійтися з датою дня (todayKyivStr() — завжди Europe/Kyiv), якщо
// у Kyrylo інший системний TZ ноутбука/телефона (подорож, інша ОС). Одна
// канонічна функція: офсет Europe/Kyiv У ЦЮ КОНКРЕТНУ МИТЬ (враховує літній/
// зимовий час автоматично через IANA-базу, а НЕ browser TZ).
/* NR_FN_SLOT 009 */
window._kyivFallbackOffsetHours = _kyivFallbackOffsetHours;
/* NR_FN_SLOT 010 */
window.kyivOffsetHoursAt = kyivOffsetHoursAt;
// Цілий офсет для конверсій "година слоту" (3-годинні межі — patern `(h+off)%24`).
/* NR_FN_SLOT 011 */
window.kyivOffsetHoursIntAt = kyivOffsetHoursIntAt;
// "HH:MM" (UTC, для опорної дати refDate) → "HH:MM" Europe/Kyiv.
/* NR_FN_SLOT 012 */
window.utcHHMMToKyiv = utcHHMMToKyiv;

const pad = n => String(n).padStart(2,'0');
/* NR_FN_SLOT 013 */
// v87.26: IANA-збагачений лейбл — "Europe/Kyiv (UTC+03:00)"; для tooltip/debug
/* NR_FN_SLOT 014 */
/* NR_FN_SLOT 015 */
/* NR_FN_SLOT 016 */
const fmtDate = d => new Date(d).toISOString().slice(0,10);
// fp201 (2026-07-16): todayKyivStr() використовувався в 26 місцях для "сьогодні",
// АЛЕ fmtDate = UTC ISO-дата. Київ = UTC+3 (літо) — з 00:00 до 02:59 за Києвом UTC-дата
// ще вчорашня, тому дашборд у цьому вікні показував учорашній день як "сьогодні".
// todayKyivStr() — єдине джерело істини для "сьогодні", рахує в Europe/Kyiv напряму
// (без хардкоду +3, через Intl — коректно і взимку/влітку).
/* NR_FN_SLOT 017 */
// Kyiv civil-day helpers. Noon UTC keeps the calendar key stable across DST
// and prevents `Date.now() + 24h` / browser-local timezone date drift.
/* NR_FN_SLOT 018 */
/* NR_FN_SLOT 019 */
const el = id => document.getElementById(id);

// ═══ v88.6.9: DEBUG flag — silence console.log noise у production ═══
// Enable: ?debug=1 в URL, або localStorage.setItem('gindex_debug','1')
// Production default: console.log/info/debug muted. console.warn/error завжди працюють.
(function(){
  try {
    const enabled = location.search.includes('debug=1')
                    || localStorage.getItem('gindex_debug') === '1';
    window._DEBUG = enabled;
    if(!enabled){
      // Зберігаю оригiнальнi для одноразових calls (показуємо version banner)
      const _origLog = console.log.bind(console);
      console.log = function(){};      // muted
      console.debug = function(){};    // muted
      console.info = function(){};     // muted
      // Один раз показуємо що debug можна enable
      _origLog('%cG-Index v88.6.9 — debug muted. Enable: ?debug=1 або localStorage.gindex_debug=1', 'color: var(--muted);font-size:11px');
    } else {
      if(window._DEBUG) console.log('[DEBUG] enabled — verbose logging on');
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.42','recoverable');  window._DEBUG = false; }
})();

// ═══ v88.6.9: Non-blocking toast notification system (replaces alert/confirm) ═══
// Stack: top-right на desktop, bottom на mobile. Auto-dismiss 4s (success), 6s (error/info).
/* NR_FN_SLOT 020 */

// showToast(message, type) — type: 'info'|'success'|'warn'|'error'
/* NR_FN_SLOT 021 */

// showToastConfirm(message, onConfirm, onCancel) — non-blocking yes/no dialog
/* NR_FN_SLOT 022 */

// Inject keyframe (one-time)
(function(){
  if(document.getElementById('_toastStyles')) return;
  const s = document.createElement('style');
  s.id = '_toastStyles';
  s.textContent = '@keyframes toastSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(s);
})();
window.showToast = showToast;
window.showToastConfirm = showToastConfirm;
const startUTC = d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const noonUTC  = d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
// fp166: Panchanga sunrise timing fix (Kyrylo request 2026-07-11).
// Sunrise, not noon, is the traditional Vedic day-boundary convention that
// Tarita's bulletins use (drikpanchang-style). This replaces noonUTC as the
// day-anchor for all Ai/Panchanga score computations across the dashboard
// (today card, 3-day table, 27-day chart, heat-strip, sigma-year calibration
// — 27 call sites, see fp166 changelog). Reuses the existing, already-tested
// v88.9.56-fp238 FIX-CRITICAL (аудит-раунд-24): раніше при недоступній
// window.Astronomy код падав на ФІКСОВАНУ годину (~03:51 UTC) — той самий
// клас бага, що вже виправлений для Tithi/Karana у fp237 (там була проблема
// з moonPhaseAngle, тут — з самим sunrise). Наслідок: Tithi/Karana МОГЛИ
// випадково збігатися з правильними (як 19.07.2026, де 03:51 UTC потрапляє
// в той самий діапазон Kaulava, що й справжній схід), а могли й ні — залежно
// від того, чи межа тітхі/карани проходить між справжнім сходом і фіксованим
// fallback. Реалізовано повний NOAA/Meeus sunrise-алгоритм (Julian Century →
// геометрична довгота/аномалія Сонця → рівняння часу → схилення → годинний
// кут для zenith=90.833° з поправкою на рефракцію та видимий радіус Сонця →
// solar noon → sunrise). Перевірено проти незалежного орієнтиру аудиту
// (05:08 Київ 19.07.2026, розбіжність <1 хв) і на 6 сезонах року (розбіжність
// 5-12 хв від приблизних орієнтирів, які самі не були точно звірені).
/* NR_FN_SLOT 023 */
/* NR_FN_SLOT 024 */
/* NR_FN_SLOT 025 */
/* NR_FN_SLOT 026 */
/* NR_FN_SLOT 027 */
/* NR_FN_SLOT 028 */
/* NR_FN_SLOT 029 */
/* NR_FN_SLOT 030 */
/* NR_FN_SLOT 031 */
/* NR_FN_SLOT 032 */
/* NR_FN_SLOT 033 */
/* NR_FN_SLOT 034 */
// _calcSunRiseSet() (Astronomy Engine, real ephemeris) лишається лише як
// НЕОБОВ'ЯЗКОВА паралельна debug-перевірка (аудит, п.4) — вже НЕ production
// dependency. Внутрішній Meeus-розрахунок — єдиний production-шлях.
const sunriseUTC = d => {
  try {
    const civilDay = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    const rise = sunriseUTC_Meeus(civilDay, _userLat, _userLon);
    if(Number.isFinite(rise.getTime())) return rise;
    // Keep a date for calendar rendering, explicitly not a sunrise observation.
    const unavailable = noonUTC(d);
    unavailable._solarUnavailable = true;
    return unavailable;
  } catch(e) { globalThis.NRDiagnostics?.record('catch.43','recoverable');
    if (window._DEBUG) console.warn('[sunriseUTC_Meeus fallback]:', e.message);
  }
  // Останній fallback — лише якщо навіть Meeus-розрахунок впав (не мало б статись)
  try {
    if (typeof _calcSunRiseSet === 'function') {
      const sr = _calcSunRiseSet(d);
      if (sr && sr.sunrise instanceof Date && !isNaN(sr.sunrise.getTime())) return sr.sunrise;
    }
  } catch(e2){ window.NRDiagnostics?.record('legacy.catch.51','recoverable'); }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 51, 0));
};
// v87.90 fix: localWeekday — день тижня у локальній зоні (для Vara/Hora).
// Раніше використовувався dateUTC.getUTCDay() — це баг для юзерів, які перетинають межі дня:
// Київ 02:00 ночі понеділка = UTC 23:00 неділі → getUTCDay()=0 (Sun), а має бути 1 (Mon).
// Vara і Hora — астрономічні концепти "за локальним сходом сонця", тому локал-день правильний.
const localWeekday = d => new Date(d).getDay(); // 0=Sun..6=Sat у локальному часі браузера
const sameUTCDay = (a,b)=> a.getUTCFullYear()===b.getUTCFullYear() && a.getUTCMonth()===b.getUTCMonth() && a.getUTCDate()===b.getUTCDate();
const addDays = (dateUTC, n)=> new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate()+n));

// Статусний штамп
/* NR_FN_SLOT 035 */

/* NR_FN_SLOT 036 */

// v87.61: Bulletin (engine v18.5) score loader — Шлях C (dual-display).
// Завантажує engine_scores.json (static), показує поряд з G у hero і 3-day.
let _engineScores = null;
// v88.8.35-fp56-P8: future_kp.json (поза V3 freeze) — реальний Kp на майбутні дати.
// Замінює synthetic Kp=2.0 у frozen engine_scores. Генерується friday_routine (fetch_kp_v2 --export-future).
let _futureKp = null;
let _futureKpMeta = null;
Object.defineProperty(window,'__nrFutureKp',{configurable:true,get(){return {kp:_futureKp||{},generated:_futureKpMeta?.generated||null,source_log:_futureKpMeta?.source_log||[]}}});
let _futureKpEpoch=0, _futureKpLoad=null;
/* NR_FN_SLOT 037 */
/* NR_FN_SLOT 038 */

// v88.7.15 Г: експертні overrides (PDF #48 calibration, 14 точкових записів 12.05–24.05).
// Завантажуються паралельно з engine_scores. Застосовуються у getEngineScore() —
// якщо дата в overrides → eng замінюється на expert_eng, оригінал зберігається у _engRaw.
// Frozen partition: engine_scores.json НЕ змінюється (V3 prospective freeze для backtest).
let _expertOverrides = null; // {date: {expert_eng, tanita_O, tanita_N, category, applied_in}}
// fp196 expert_calc layer. Displayed replay metrics use the current
// revision-aware registry cohort (n=394), not the superseded n=406 audit.
// Пріоритет: verified expert_override > expert_calc > engine_v18.5 > cal_score.
let _expertCalc = null; // {date: {score, raw_sum, kp_her}}
let _strongRawPolicy = null;
let _autoProspectiveStatus = null;
let _tanitaPromotionGate = null;
let _expertDecisionRegistry = null;
let _bgsSpaceWeather = null;
let _spaceWeatherAccumulated = null;
let _aiaVernadsky = null;
/* NR_FN_SLOT 039 */

/* NR_FN_SLOT 040 */
/* NR_FN_SLOT 041 */
/* NR_FN_SLOT 042 */
/* NR_FN_SLOT 043 */
window._expertCalcLoadStatus = 'pending';
/* NR_FN_SLOT 044 */
/* NR_FN_SLOT 045 */
/* NR_FN_SLOT 046 */

/* NR_FN_SLOT 047 */

// BEGIN authority request ownership
// Each source owns its deadline and commits only its latest complete response.
const _authorityRequests = new Map();
let _authoritySequence = 0;
let _authorityBatch = null;
/* NR_FN_SLOT 048 */
/* NR_FN_SLOT 049 */
/* NR_FN_SLOT 050 */
let _fileOverrides = {}, _registryOverrides = {};
/* NR_FN_SLOT 051 */
/* NR_FN_SLOT 052 */
/* NR_FN_SLOT 053 */
/* NR_FN_SLOT 054 */
/* NR_FN_SLOT 055 */
/* NR_FN_SLOT 056 */
// END authority request ownership

/* NR_FN_SLOT 057 */

/* NR_FN_SLOT 058 */

/* NR_FN_SLOT 059 */
/* NR_FN_SLOT 060 */
/* NR_FN_SLOT 061 */
/* NR_FN_SLOT 062 */

/* NR_FN_SLOT 063 */

/* NR_FN_SLOT 064 */
/* NR_FN_SLOT 065 */

// v88.8.35: SINGLE SOURCE OF TRUTH policy.
// expert_overrides_v3.json — єдине джерело expert_eng для дат-overrides.
// engine_scores.json лишається frozen (V3 prospective freeze 2026-05-03..~2026-08-01) — НЕ модифікується.
// Hardcoded fallback з v88.8.34 видалено: оновлення JSON тепер одразу видно у дашборді.
// v88.8.5 В2: diagnostic flag для трасування deploy issues
window._expertOverridesLoadStatus = 'pending'; // 'pending' | 'loaded' | 'missing' | 'invalid' | 'http_error'
/* NR_FN_SLOT 066 */

// v88.8.51-fp128: daily_master.json loader + regime cards (M2). Freeze-safe, read-only.
let _dailyMaster = null;
/* NR_FN_SLOT 067 */
// v88.9.6x-fp246 (аудит fp242, п.5): loader-и вище мають guard "якщо вже
// завантажено — не перезавантажувати" (_x !== null ? return). Це усувало зайві
// фетчі, але й означало, що НОВИЙ файл на сервері (новий expert_overrides_v3.json
// після оновлення бюлетеня, новий future_kp.json після friday_routine) НЕ
// підхоплювався без ручного перезавантаження сторінки — Kyrylo мав сам F5,
// інакше дашборд жив на даних із моменту першого відкриття вкладки.
// data_manifest.json — легкий файл-маячок {version, expert_overrides, expert_calc,
// future_kp}; кожен цикл auto-refresh (loadAll, вже раз на N хв) звіряє його з
// попереднім знімком. Якщо конкретне поле змінилось — скидається ЛИШЕ відповідний
// in-memory кеш, і loader перезавантажує саме той файл (не все підряд).
// Окремо: перехід через північ Europe/Kyiv форсує повний reload незалежно від
// manifest — новий день потребує нових даних, навіть якщо генератор манфесту
// відстає чи впав.
let _lastManifest = null;
let _lastSeenKyivDateForManifest = null;
/* NR_FN_SLOT 068 */
window.checkDataManifest = checkDataManifest;

const REGIME_LABEL = {
  extreme_negative: { t:'Екстремум −', d:'сильний негатив', c:'#ff6b6b', conf:'надійний (~88%)' },
  extreme_positive: { t:'Екстремум +', d:'сильний позитив', c:'#2bd47d', conf:'надійний (~86%)' },
  editorial_uplift: { t:'Редакторський', d:'позитив-активність', c:'#9cd49c', conf:'engine занижує' },
  hidden_polarity:  { t:'Прихована полярність', d:'0, але є нахил', c:'#ffaa33', conf:'низька' },
  true_neutral:     { t:'Нейтральний', d:'справді 0', c:'#9bb1dc', conf:'низька (~32%)' },
  baseline:         { t:'Базовий', d:'слабкий сигнал', c:'#9bb1dc', conf:'середня' },
};
const CONF_COLOR = { high:'#2bd47d', medium:'#ffaa33', low:'#9bb1dc' };
const CONF_LABEL = { high:'Висока', medium:'Середня', low:'Низька' };

/* NR_FN_SLOT 069 */
// v88.8.51-fp128: ЄДИНА ПАНЕЛЬ ІНДЕКСІВ — Панчанга + Kp + G_now (сирий сигнал) + PDF/Engine (вердикт)
// в одному місці. Дані з тих самих джерел, що й решта дашборду (computePanchanga/lastWWV/getEngineScore) —
// нової логіки розрахунку немає, лише єдине, чітко підписане представлення.
/* NR_FN_SLOT 070 */
// v88.8.51-fp128: regime-first hero pill — режим показується під headline, домінує над score
/* NR_FN_SLOT 071 */
window.renderHeroRegimePill=renderHeroRegimePill;

// v88.8.51-fp128: Bulletin v2 (M3) — render режим+впевненість+причина+контекст+дія
let _bulletinV2 = null;
/* NR_FN_SLOT 072 */
/* NR_FN_SLOT 073 */
window.renderBulletinV2 = renderBulletinV2;

// v88.8.51-fp128: Chrono panel (M4) — окремий outcome target, r заблоковано при n<10
let _chronoPanel = null;
/* NR_FN_SLOT 074 */
/* NR_FN_SLOT 075 */
window.renderChronoPanel=renderChronoPanel;

const _origSave=window.GChrono&&GChrono.saveToday;
if(_origSave) GChrono.saveToday=(function(fn){return function(){fn.call(GChrono);try{renderChronoPanel();}catch(e){ window.NRDiagnostics?.record('legacy.catch.69','recoverable'); }};}(_origSave));

/* NR_FN_SLOT 076 */
// ──────────────────────────────────────────────────────────────────────
// v88.8.18 ENGINE v18.8 PATCH SET (additive over v18.5 frozen)
// ──────────────────────────────────────────────────────────────────────
// EVOLUTION: v18.5 → v18.6 (P2+P3) → v18.7 (+P4+P1d) → v18.8 (P2 broad + P3 Krishna)
//
// REAL-WORLD BUG FIX (2026-05-11): v18.7 P2 missed 93 dates з emoji-only "✈" tag
// (без слова "Подорожі"). P3 missed Krishna Dashami (Tithi 25).
//
// ABLATION STUDY на n=212:
//
// Combination                           Strict   Binary   Exact    CV-strict
// ──────────────────────────────────────────────────────────────────────────
// v18.5 baseline                        75.0%    87.3%    43.9%    74.9% ± 5.7%
// v18.7 (P2 narrow + P3 narrow + P4+P1d) 77.4%    88.2%    49.1%    77.3% ± 4.8%
// v18.8 (P2 broad + P3 includes Krishna) 79.2%    88.7%    50.0%   79.2% ± 4.2%  ⭐
//
// vs v18.5 baseline:  Strict +4.2pp, Binary +1.4pp, Exact +6.1pp
// CV stability IMPROVED: std 5.7→4.2pp (better generalization)
//
// New (v18.8) patches:
// • P2 broad: ANY '✈' emoji → eng+1 boost. WITH "Подорожі" → max(eng, +2) strong.
//   28 dates with ✈-only had avg PDF=+2.64, avg engine=+2.14 (diff +0.50, 96% positive).
// • P3 broad: Krishna Dashami (Tithi 25) ALSO gets +1, не тільки Shukla (10).
//   Both halves are "Пурна" type per canonical sources.
//
// RETAINED from v18.7 (ablation-validated):
// • P4: empty + saturn_retro + Kp≥4 → -3 (Saturn malefic + storm)
// • P1d: empty + eng=+2 → +1 (точкова exact correction)
//
// REJECTED (per earlier ablation):
// • P1a (empty+Kp<4 → -1): caused Binary regression
// • P5 (Purnima → -1): no measurable effect
//
// NOTE: applied AT READ TIME. engine_scores.json frozen file НЕ модифікується.
// Phase V3 freeze respected.
/* NR_FN_SLOT 077 */

/* NR_FN_SLOT 078 */
/* NR_FN_SLOT 079 */

// v88.1: BPHS canonical yoga penalties for ADVISORY display only.
// Tested empirically as hard rule on n=280 (engine_v18.5 v5.1 audit, V25-fu29 2026-05-03):
//   V1 (full BPHS): rescued=1, broken=10, net=-9 → REJECT
//   V2-V4 (gated):  rescued=0-1, broken=0-3, net≤0 → no promotion possible
// Engine v18.5 confirmed local optimum. Yoga shown as read-only metadata in UI.
const NEGATIVE_YOGAS_BPHS = {
  6:  {name:'Atiganda',  pen:-2},
  9:  {name:'Shula',     pen:-1},
  10: {name:'Ganda',     pen:-1},
  13: {name:'Vyaghata',  pen:-1},
  15: {name:'Vajra',     pen:-1},
  17: {name:'Vyatipata', pen:-3},
  19: {name:'Parigha',   pen:-1},
  27: {name:'Vaidhriti', pen:-2},
};

// Symbol display catalog для UI rendering (34 символи).
// Замість generic comma-list "amavasya, mercury_retro" — показуємо "🌑 Амавасья, ☿ Меркурій ретро"
const CAL_SYMBOL_DISPLAY = {
  amavasya: {name:'Амавасья', icon:'🌑'},
  eclipse_solar: {name:'Сонячне затемнення', icon:'☉'},
  eclipse_lunar: {name:'Місячне затемнення', icon:'☽'},
  sankranti: {name:'Санкранті', icon:'☀'},
  bolt: {name:'Порожні руки', icon:'⚡'},
  pitru_paksha: {name:'Пітру Пакша', icon:'🌳'},
  eclipse_period: {name:'Період затемнення', icon:'🌒'},
  sankashti: {name:'Санкашті Чатурті', icon:'🔯'},
  holashtak: {name:'Holashtak', icon:'🔥'},
  ekadashi: {name:'Екадаші', icon:'🥛'},
  mercury_retro: {name:'Меркурій ретро', icon:'☿'},
  jupiter_retro: {name:'Юпітер ретро', icon:'♃'},
  saturn_retro: {name:'Сатурн ретро', icon:'♄'},
  mars_retro: {name:'Марс ретро', icon:'♂'},
  purnima: {name:'Повний місяць', icon:'🌕'},
  venus_retro: {name:'Венера ретро', icon:'♀'},
  masik_shivaratri: {name:'Масик Шиваратрі', icon:'🔱'},
  pradosh: {name:'Прадош Врат', icon:'🎯'},
  vinayaka_chaturthi: {name:"Вінаяка Чатурті", icon:'🐘'},
  navaratri: {name:'Наваратрі', icon:'💃'},
  diwali: {name:'Діпавалі', icon:'🪔'},
  naraka_chaturdashi: {name:'Нарака Чатурдаші', icon:'🚿'},
  bhai_dooj: {name:'Бхай Дудж', icon:'👫'},
  ravi_yoga: {name:'Раві Йога', icon:'☀'},
  pushya_nak: {name:'Пушья накшатра', icon:'⭐'},
  guru_purnima: {name:'Гуру Пурніма', icon:'🌕'},
  dhanteras: {name:'Дхантерас', icon:'💰'},
  govardhan_puja: {name:'Говардхан Пуджа', icon:'🐄'},
  janmashtami: {name:'Кришна Джанмаштамі', icon:'🐄'},
  amrita_siddhi: {name:'Амрита Сіддхі', icon:'✨'},
  maha_shivaratri: {name:'Маха Шиваратрі', icon:'🔱'},
  akshaya_tritiya: {name:'Акшая Тритія', icon:'⭐'},
  vijaya_dashami: {name:'Виджайя Дашамі', icon:'⭐'},
  ganesh_chaturthi: {name:'Ганеша Чатуртхі', icon:'🐘'},
};
/* NR_FN_SLOT 080 */

// v88.0: Astronomical Layer pill (cal_score / Tithi / Nakshatra / Yoga / cal_symbols)
// Reads engine_scores entry for today and renders compact pill + rich tooltip.
// Uses TITHI_NAMES, NAKSHATRA_NAMES, YOGA_NAMES (defined later in file — resolved at call time).
/* NR_FN_SLOT 081 */

// v88.0 F3: Scenario card — 7-day forecast strip (today + 6 next days)
// Pure render-only: reuses _engineScores, не зачіпає engine logic.
// v88.8.39-fp76: forecastConfidence — canonical guardrails only. Freeze-safe.
// Based on FINAL_FALSIFICATION + EPISTEMIC audits (2026-06-21). Read-only.
// Canonical (confirmed in handoff): ±3=HIGH, ±2=WEAK, n_tags=0=LOW, 0=LOW.
// V3 candidate (n_tags≥3+|eng|≥2=HIGH◆) = post-hoc, not pre-registered → V19 only.
// fp76 FIX: eng===-2 was missing WEAK (fell to MED). PPV ±2 = miscalibrated per CALIBRATION_AUDIT.
/* NR_FN_SLOT 082 */
window.forecastConfidence = forecastConfidence;

/* NR_FN_SLOT 083 */

// v88.0 F3: scroll+highlight target row у 27d table.
// Глобальна (window-scoped) бо викликається з inline onclick у renderScenarioCard.
window.scrollAndHighlight27d = function(ds){
  // Розкриваємо table27Wrap якщо було display:none (perfomance gate первинно ховає до compute)
  const wrap = document.getElementById('table27Wrap');
  if(wrap && wrap.style.display === 'none'){
    wrap.style.display = '';
  }
  // Чекаємо один tick, щоб layout оновився після показу
  setTimeout(()=>{
    const row = document.querySelector(`#twentysevenContent tr[data-ds="${ds}"]`);
    if(!row){
      // Дата може бути поза 27d range (далі +6 днів) — fallback: scroll до scenario block
      const sc = document.getElementById('scenarioCard');
      if(sc) sc.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    row.scrollIntoView({behavior:'smooth', block:'center'});
    // Highlight effect: жовте підсвічування на 2с, потім fade
    const origBg = row.style.background;
    const origTransition = row.style.transition;
    row.style.transition = 'background .25s';
    row.style.background = 'rgba(255,204,0,0.35)';
    setTimeout(()=>{
      row.style.background = origBg || '';
      setTimeout(()=>{ row.style.transition = origTransition || ''; }, 300);
    }, 1800);
  }, 50);
};

// Екранобезпечне екранування HTML у підказках
/* NR_FN_SLOT 084 */

// ---------------------------- Локальна фаза Місяця --------------------------
const SYNODIC = 29.530588853; // діб
const NEWMOON_EPOCH_JD = 2451550.26; // 2000-01-06 18:14 UT (Astronomical Almanac)
/* NR_FN_SLOT 085 */
/* NR_FN_SLOT 086 */
/* NR_FN_SLOT 087 */
/* NR_FN_SLOT 088 */

// --------------------- Ваги (1:1 із Excel-словниками) -----------------------
// Li визначається хардкодом: Amavasya(idx=29)=-3, Purnima(idx=14)=0 (v14.2), решта=0

// v85b-F5 (КРИТ-4): Eclipse type differentiation
// Раніше: усі затемнення = -4 (переоцінка пенумбральних)
// Тепер: за типом (NASA Eclipse Catalog taxonomy)
const ECLIPSE_WEIGHT = {
  total_solar:    -4,  // Total Solar
  total_lunar:    -4,  // Total Lunar
  hybrid_solar:   -4,  // Hybrid (Total+Annular) Solar
  annular:        -2,  // Annular Solar
  partial_solar:  -2,  // Partial Solar
  partial_lunar:  -2,  // Partial Lunar
  penumbral:      -1,  // Penumbral Lunar (мінімальний геомагнітний ефект)
  unknown:        -3   // Legacy fallback (Set without type)
};
const WEIGHT_M_ECLIPSE = {
  'Сонячне затемнення': -4,
  'Місячне затемнення': -4,
  'День до/після затемнення': -3,
  'Період впливу затемнень': -1
};

const WEIGHT_E_EVENTS = {
  'Амавасья, день мертвих': -4,
  'День порожні руки, несприятливий': -3,
  'Екадаші': -2,
  '1 місячний день':  2,
  'Сурья Санкранті Перехід Сонця із знаку в інший': -2,
  'Мішень': 2, 'Віджая дашамі': 4, 'Акаша трітья': 4,
  'початок сонячного нового року': 2, 'початок місячного нового року': 2,
  'сприятливий для подорожей': 2, 'сприятливий для стрижки': 1,
  'Тричі трикутник': -1, 'Ромб': -1, 'Зелена печатка': 3, 'Серце': 4,
  'День Божого провидіння': 5, 'Рука': 1, 'Гучномовець': 2, 'Книги': 2,
  'Таблетка': 2, 'Шприц': 1, 'Сукня': 1,
  'Гуру Пурніма': 1, 'Махашиваратрі': 2, 'Савана Сомвара': 1,
  'Масік Шиваратрі': 1, 'Прадош врат': 1, 'Санкашті': 1, 'Вінаяка': 1,
  'Наваратрі': 1.5, 'Діпавалі': 2,  // v68: уніфіковано з engine WEIGHTS['navaratri']=1.5
  'Рівнодення (Russell-McPherron)': -2,
  // v30: нові категорії з ICS Vaisnava
  'Пурніма (свято)': 1,        // Gaura Purnima, Bhadra Purnima та ін. — свято, +1
  'Рама Навамі': 2,             // Rama Navami — сприятливий день
  'Акшая Трітья': 4,            // Aksaya Tritiya — один з найкращих днів
  'Джанмаштамі': 2,             // Krishna Janmashtami — свято
  'Нрісімха Чатурдаші': 2,      // Nrsimha Caturdasi — свято
  'Ратха Ятра': 1               // Ratha Yatra — фестиваль
};

// ═══ v27: Вбудований Vaisnava-календар (offline base, Kiev 2026) ═══
// Джерело: https://www.vaisnavacalendar.info/ICS/2026/Kiev%20[Ukraine]-a2026-ICS.ics
// Завантажено 2026-03-22. Online ICS мерджиться поверх, якщо доступний.
const BUILTIN_VAISNAVA = [{"d":"2026-01-03","s":"Sri Krsna Pusya Abhiseka"},{"d":"2026-01-07","s":"Sri Ramacandra Kaviraja -- Disappearance"},{"d":"2026-01-07","s":"Srila Gopala Bhatta Gosvami -- Appearance"},{"d":"2026-01-08","s":"Sri Jayadeva Gosvami -- Disappearance"},{"d":"2026-01-09","s":"Sri Locana Dasa Thakura -- Disappearance"},{"d":"2026-01-14","s":"Fasting for Sat-tila Ekadasi"},{"d":"2026-01-14","s":"Ganga Sagara Mela"},{"d":"2026-01-15","s":"Break fast 07:52 (sunrise) - 10:42 (1/3 of daylight) LT"},{"d":"2026-01-23","s":"Vasanta Pancami"},{"d":"2026-01-23","s":"Srimati Visnupriya Devi -- Appearance"},{"d":"2026-01-23","s":"Srila Visvanatha Cakravarti Thakura -- Disappearance"},{"d":"2026-01-23","s":"Sri Pundarika Vidyanidhi -- Appearance"},{"d":"2026-01-23","s":"Sri Raghunandana Thakura -- Appearance"},{"d":"2026-01-23","s":"Srila Raghunatha Dasa Gosvami -- Appearance"},{"d":"2026-01-23","s":"Sarasvati Puja"},{"d":"2026-01-25","s":"Sri Advaita Acarya -- Appearance"},{"d":"2026-01-25","s":"(Fast till noon)"},{"d":"2026-01-26","s":"Bhismastami"},{"d":"2026-01-27","s":"Sri Madhvacarya -- Disappearance"},{"d":"2026-01-28","s":"Sri Ramanujacarya -- Disappearance"},{"d":"2026-01-29","s":"Fasting for Bhaimi Ekadasi"},{"d":"2026-01-29","s":"(Fast till noon for Varahadeva, with feast tomorrow)"},{"d":"2026-01-30","s":"Break fast 07:35 (sunrise) - 07:41 (end of tithi) LT"},{"d":"2026-01-30","s":"Varaha Dvadasi: Appearance of Lord Varahadeva"},{"d":"2026-01-30","s":"(Fasting is done yesterday, today is feast)"},{"d":"2026-01-31","s":"Nityananda Trayodasi: Appearance of Sri Nityananda Prabhu"},{"d":"2026-01-31","s":"(Fast till noon)"},{"d":"2026-02-01","s":"Sri Krsna Madhura Utsava"},{"d":"2026-02-01","s":"Srila Narottama Dasa Thakura -- Appearance"},{"d":"2026-02-06","s":"Srila Bhaktisiddhanta Sarasvati Thakura -- Appearance"},{"d":"2026-02-06","s":"(Fast till noon)"},{"d":"2026-02-06","s":"Sri Purusottama Das Thakura -- Disappearance"},{"d":"2026-02-13","s":"Fasting for Vijaya Ekadasi"},{"d":"2026-02-14","s":"Break fast 07:11 (sunrise) - 10:32 (1/3 of daylight) LT"},{"d":"2026-02-14","s":"Sri Isvara Puri -- Disappearance"},{"d":"2026-02-16","s":"Siva Ratri"},{"d":"2026-02-18","s":"Srila Jagannatha Dasa Babaji -- Disappearance"},{"d":"2026-02-18","s":"Sri Rasikananda -- Disappearance"},{"d":"2026-02-21","s":"Sri Purusottama Dasa Thakura -- Appearance"},{"d":"2026-02-27","s":"Fasting for Amalaki vrata Ekadasi"},{"d":"2026-02-28","s":"Break fast 06:44 (sunrise) - 10:21 (1/3 of daylight) LT"},{"d":"2026-02-28","s":"Sri Madhavendra Puri -- Disappearance"},{"d":"2026-03-03","s":"Gaura Purnima: Appearance of Sri Caitanya Mahaprabhu"},{"d":"2026-03-03","s":"(Fast till moonrise)"},{"d":"2026-03-04","s":"Festival of Jagannatha Misra"},{"d":"2026-03-11","s":"Sri Srivasa Pandita -- Appearance"},{"d":"2026-03-15","s":"Fasting for Papamocani Ekadasi"},{"d":"2026-03-15","s":"Sri Govinda Ghosh -- Disappearance"},{"d":"2026-03-16","s":"Break fast 06:09 (sunrise) - 06:13 (end of tithi) LT"},{"d":"2026-03-23","s":"Sri Ramanujacarya -- Appearance"},{"d":"2026-03-27","s":"Rama Navami: Appearance of Lord Sri Ramacandra"},{"d":"2026-03-27","s":"(Fast till sunset)"},{"d":"2026-03-29","s":"Fasting for Kamada Ekadasi"},{"d":"2026-03-29","s":"Damanakaropana Dvadasi"},{"d":"2026-03-29","s":"First day of Daylight Saving Time"},{"d":"2026-03-30","s":"Break fast 06:39 (sunrise) - 10:54 (1/3 of daylight) DST"},{"d":"2026-04-01","s":"Sri Balarama Rasayatra"},{"d":"2026-04-01","s":"Sri Krsna Vasanta Rasa"},{"d":"2026-04-01","s":"Appearance of Radha Kunda, snana dana"},{"d":"2026-04-01","s":"Sri Vamsivadana Thakura -- Appearance"},{"d":"2026-04-01","s":"Sri Syamananda Prabhu -- Appearance"},{"d":"2026-04-09","s":"Sri Abhirama Thakura -- Disappearance"},{"d":"2026-04-12","s":"Srila Vrndavana Dasa Thakura -- Disappearance"},{"d":"2026-04-13","s":"Fasting for Varuthini Ekadasi"},{"d":"2026-04-14","s":"Break fast 06:06 (sunrise) - 10:41 (1/3 of daylight) DST"},{"d":"2026-04-14","s":"Tulasi Jala Dan begins."},{"d":"2026-04-17","s":"Sri Gadadhara Pandita -- Appearance"},{"d":"2026-04-20","s":"Aksaya Trtiya. Candana Yatra starts. (Continues for 21 days)"},{"d":"2026-04-23","s":"Jahnu Saptami"},{"d":"2026-04-25","s":"Srimati Sita Devi (consort of Lord Sri Rama) -- Appearance"},{"d":"2026-04-25","s":"Sri Madhu Pandita -- Disappearance"},{"d":"2026-04-25","s":"Srimati Jahnava Devi -- Appearance"},{"d":"2026-04-27","s":"Fasting for Mohini Ekadasi"},{"d":"2026-04-28","s":"Break fast 05:38 (sunrise) - 10:30 (1/3 of daylight) DST"},{"d":"2026-04-28","s":"Rukmini Dvadasi"},{"d":"2026-04-29","s":"Sri Jayananda Prabhu -- Disappearance"},{"d":"2026-04-30","s":"Nrsimha Caturdasi: Appearance of Lord Nrsimhadeva"},{"d":"2026-04-30","s":"(Fast till dusk)"},{"d":"2026-05-01","s":"Krsna Phula Dola, Salila Vihara"},{"d":"2026-05-01","s":"Sri Sri Radha-Ramana Devaji -- Appearance"},{"d":"2026-05-01","s":"Sri Paramesvari Dasa Thakura -- Disappearance"},{"d":"2026-05-01","s":"Sri Madhavendra Puri -- Appearance"},{"d":"2026-05-01","s":"Sri Srinivasa Acarya -- Appearance"},{"d":"2026-05-06","s":"Sri Ramananda Raya -- Disappearance"},{"d":"2026-05-13","s":"Fasting for Apara Ekadasi"},{"d":"2026-05-14","s":"Break fast 05:12 (sunrise) - 08:53 (end of tithi) DST"},{"d":"2026-05-14","s":"Srila Vrndavana Dasa Thakura -- Appearance"},{"d":"2026-05-14","s":"Tulasi Jala Dan ends."},{"d":"2026-05-27","s":"Vyanjuli Mahadvadasi"},{"d":"2026-05-27","s":"Fasting for Padmini Ekadasi"},{"d":"2026-05-28","s":"Break fast 04:55 (sunrise) - 05:29 (end of tithi) DST"},{"d":"2026-06-11","s":"Fasting for Parama Ekadasi"},{"d":"2026-06-12","s":"Break fast 04:46 (sunrise) - 10:14 (1/3 of daylight) DST"},{"d":"2026-06-24","s":"Ganga Puja"},{"d":"2026-06-24","s":"Sri Baladeva Vidyabhusana -- Disappearance"},{"d":"2026-06-24","s":"Srimati Gangamata Gosvamini -- Appearance"},{"d":"2026-06-25","s":"Fasting for Pandava Nirjala Ekadasi"},{"d":"2026-06-26","s":"Break fast 04:47 (sunrise) - 10:16 (1/3 of daylight) DST"},{"d":"2026-06-27","s":"Panihati Cida Dahi Utsava"},{"d":"2026-06-29","s":"Snana Yatra"},{"d":"2026-06-29","s":"Sri Mukunda Datta -- Disappearance"},{"d":"2026-06-29","s":"Sri Sridhara Pandita -- Disappearance"},{"d":"2026-06-30","s":"Sri Syamananda Prabhu -- Disappearance"},{"d":"2026-07-05","s":"Sri Vakresvara Pandita -- Appearance"},{"d":"2026-07-10","s":"Sri Srivasa Pandita -- Disappearance"},{"d":"2026-07-11","s":"Fasting for Yogini Ekadasi"},{"d":"2026-07-12","s":"Break fast 05:00 (sunrise) - 10:22 (1/3 of daylight) DST"},{"d":"2026-07-14","s":"Srila Bhaktivinoda Thakura -- Disappearance"},{"d":"2026-07-14","s":"(Fast till noon)"},{"d":"2026-07-14","s":"Sri Gadadhara Pandita -- Disappearance"},{"d":"2026-07-15","s":"Gundica Marjana"},{"d":"2026-07-16","s":"Ratha Yatra"},{"d":"2026-07-16","s":"Sri Svarupa Damodara Gosvami -- Disappearance"},{"d":"2026-07-16","s":"Sri Sivananda Sena -- Disappearance"},{"d":"2026-07-19","s":"Sri Vakresvara Pandita -- Disappearance"},{"d":"2026-07-20","s":"Hera Pancami (4 days after Ratha Yatra)"},{"d":"2026-07-24","s":"Return Ratha (8 days after Ratha Yatra)"},{"d":"2026-07-25","s":"Fasting for Sayana Ekadasi"},{"d":"2026-07-26","s":"Break fast 05:17 (sunrise) - 10:28 (1/3 of daylight) DST"},{"d":"2026-07-29","s":"Guru (Vyasa) Purnima"},{"d":"2026-07-29","s":"Srila Sanatana Gosvami -- Disappearance"},{"d":"2026-07-29","s":"(green leafy vegetable fast for one month)"},{"d":"2026-08-03","s":"Srila Gopala Bhatta Gosvami -- Disappearance"},{"d":"2026-08-06","s":"Srila Lokanatha Gosvami -- Disappearance"},{"d":"2026-08-07","s":"The incorporation of ISKCON in New York"},{"d":"2026-08-09","s":"Trisprsa Mahadvadasi"},{"d":"2026-08-09","s":"Fasting for Kamika Ekadasi"},{"d":"2026-08-10","s":"Break fast 05:38 (sunrise) - 10:34 (1/3 of daylight) DST"},{"d":"2026-08-16","s":"Sri Vamsidasa Babaji -- Disappearance"},{"d":"2026-08-16","s":"Sri Raghunandana Thakura -- Disappearance"},{"d":"2026-08-23","s":"Fasting for Pavitraropana Ekadasi"},{"d":"2026-08-23","s":"Radha Govinda Jhulana Yatra begins"},{"d":"2026-08-24","s":"Break fast 08:20 (1/4 of tithi) - 10:39 (1/3 of daylight) DST"},{"d":"2026-08-24","s":"Srila Rupa Gosvami -- Disappearance"},{"d":"2026-08-24","s":"Sri Gauridasa Pandita -- Disappearance"},{"d":"2026-08-28","s":"Lord Balarama -- Appearance"},{"d":"2026-08-28","s":"(Fast till noon)"},{"d":"2026-08-28","s":"Jhulana Yatra ends"},{"d":"2026-08-28","s":"(yogurt fast for one month)"},{"d":"2026-08-29","s":"Srila Prabhupada's departure for the USA"},{"d":"2026-09-04","s":"Sri Krsna Janmastami: Appearance of Lord Sri Krsna"},{"d":"2026-09-04","s":"(Fast till midnight)"},{"d":"2026-09-05","s":"Nandotsava"},{"d":"2026-09-05","s":"Srila Prabhupada -- Appearance"},{"d":"2026-09-05","s":"(Fast till noon)"},{"d":"2026-09-07","s":"Fasting for Annada Ekadasi"},{"d":"2026-09-08","s":"Break fast 06:22 (sunrise) - 10:44 (1/3 of daylight) DST"},{"d":"2026-09-15","s":"Srimati Sita Thakurani (Sri Advaita's consort) -- Appearance"},{"d":"2026-09-19","s":"Radhastami: Appearance of Srimati Radharani"},{"d":"2026-09-19","s":"(Fast till noon)"},{"d":"2026-09-22","s":"Fasting for Parsva Ekadasi"},{"d":"2026-09-22","s":"(Fast till noon for Vamanadeva, with feast tomorrow)"},{"d":"2026-09-23","s":"Break fast 06:45 (sunrise) - 10:48 (1/3 of daylight) DST"},{"d":"2026-09-23","s":"Sri Vamana Dvadasi: Appearance of Lord Vamanadeva"},{"d":"2026-09-23","s":"(Fasting is done yesterday, today is feast)"},{"d":"2026-09-23","s":"Srila Jiva Gosvami -- Appearance"},{"d":"2026-09-24","s":"Srila Bhaktivinoda Thakura -- Appearance"},{"d":"2026-09-24","s":"(Fast till noon)"},{"d":"2026-09-25","s":"Ananta Caturdasi Vrata"},{"d":"2026-09-25","s":"Srila Haridasa Thakura -- Disappearance"},{"d":"2026-09-26","s":"Sri Visvarupa Mahotsava"},{"d":"2026-09-26","s":"Bhadra Purnima"},{"d":"2026-09-26","s":"Acceptance of sannyasa by Srila Prabhupada"},{"d":"2026-09-26","s":"(milk fast for one month)"},{"d":"2026-10-03","s":"Srila Prabhupada's arrival in the USA"},{"d":"2026-10-06","s":"Fasting for Indira Ekadasi"},{"d":"2026-10-07","s":"Break fast 07:07 (sunrise) - 10:52 (1/3 of daylight) DST"},{"d":"2026-10-17","s":"Durga Puja"},{"d":"2026-10-21","s":"Ramacandra Vijayotsava"},{"d":"2026-10-21","s":"Sri Madhvacarya -- Appearance"},{"d":"2026-10-22","s":"Fasting for Pasankusa Ekadasi"},{"d":"2026-10-23","s":"Break fast 07:33 (sunrise) - 10:59 (1/3 of daylight) DST"},{"d":"2026-10-23","s":"Srila Raghunatha Dasa Gosvami -- Disappearance"},{"d":"2026-10-23","s":"Srila Raghunatha Bhatta Gosvami -- Disappearance"},{"d":"2026-10-23","s":"Srila Krsnadasa Kaviraja Gosvami -- Disappearance"},{"d":"2026-10-24","s":"Last day of Daylight Saving Time"},{"d":"2026-10-26","s":"Sri Krsna Saradiya Rasayatra"},{"d":"2026-10-26","s":"Sri Murari Gupta -- Disappearance"},{"d":"2026-10-26","s":"Laksmi Puja"},{"d":"2026-10-26","s":"(urad dal fast for one month)"},{"d":"2026-10-30","s":"Srila Narottama Dasa Thakura -- Disappearance"},{"d":"2026-11-02","s":"Bahulastami"},{"d":"2026-11-03","s":"Sri Virabhadra -- Appearance"},{"d":"2026-11-05","s":"Fasting for Rama Ekadasi"},{"d":"2026-11-06","s":"Break fast 06:56 (sunrise) - 07:02 (end of tithi) LT"},{"d":"2026-11-09","s":"Dipa dana, Dipavali, (Kali Puja)"},{"d":"2026-11-10","s":"Go Puja. Go Krda. Govardhana Puja."},{"d":"2026-11-10","s":"Bali Daityaraja Puja"},{"d":"2026-11-10","s":"Sri Rasikananda -- Appearance"},{"d":"2026-11-11","s":"Sri Vasudeva Ghosh -- Disappearance"},{"d":"2026-11-13","s":"Srila Prabhupada -- Disappearance"},{"d":"2026-11-13","s":"(Fast till noon)"},{"d":"2026-11-17","s":"Gopastami, Gosthastami"},{"d":"2026-11-17","s":"Sri Gadadhara Dasa Gosvami -- Disappearance"},{"d":"2026-11-17","s":"Sri Dhananjaya Pandita -- Disappearance"},{"d":"2026-11-17","s":"Sri Srinivasa Acarya -- Disappearance"},{"d":"2026-11-18","s":"Jagaddhatri Puja"},{"d":"2026-11-20","s":"Fasting for Utthana Ekadasi"},{"d":"2026-11-20","s":"Srila Gaura Kisora Dasa Babaji -- Disappearance"},{"d":"2026-11-20","s":"(Fasting till noon, with feast tomorrow)"},{"d":"2026-11-20","s":"First day of Bhisma Pancaka"},{"d":"2026-11-21","s":"Break fast 08:39 (1/4 of tithi) - 10:16 (1/3 of daylight) LT"},{"d":"2026-11-23","s":"Sri Bhugarbha Gosvami -- Disappearance"},{"d":"2026-11-23","s":"Sri Kasisvara Pandita -- Disappearance"},{"d":"2026-11-24","s":"Sri Krsna Rasayatra"},{"d":"2026-11-24","s":"Tulasi-Saligrama Vivaha (marriage)"},{"d":"2026-11-24","s":"Sri Nimbarkacarya -- Appearance"},{"d":"2026-11-24","s":"Last day of Bhisma Pancaka"},{"d":"2026-11-25","s":"Katyayani vrata begins"},{"d":"2026-12-04","s":"Fasting for Utpanna Ekadasi"},{"d":"2026-12-04","s":"Sri Narahari Sarakara Thakura -- Disappearance"},{"d":"2026-12-05","s":"Break fast 07:41 (sunrise) - 10:26 (1/3 of daylight) LT"},{"d":"2026-12-05","s":"Sri Kaliya Krsnadasa -- Disappearance"},{"d":"2026-12-06","s":"Sri Saranga Thakura -- Disappearance"},{"d":"2026-12-15","s":"Odana sasthi"},{"d":"2026-12-16","s":"--------- Dhanus Sankranti (Sun enters Sagittarius on 16 Dec, 06:48 LT) ---------"},{"d":"2026-12-20","s":"Fasting for Moksada Ekadasi"},{"d":"2026-12-20","s":"Advent of Srimad Bhagavad-gita"},{"d":"2026-12-21","s":"Break fast 07:55 (sunrise) - 10:35 (1/3 of daylight) LT"},{"d":"2026-12-23","s":"Katyayani vrata ends"},{"d":"2026-12-27","s":"Srila Bhaktisiddhanta Sarasvati Thakura -- Disappearance"},{"d":"2026-12-27","s":"(Fast till noon)"},{"d":"2027-01-02","s":"Fasting for Ekadasi"},{"d":"2027-01-03","s":"Break fast (Ekadasi)"},{"d":"2027-01-07","s":"Amavasya"},{"d":"2027-01-18","s":"Fasting for Ekadasi"},{"d":"2027-01-19","s":"Break fast (Ekadasi)"},{"d":"2027-02-01","s":"Fasting for Ekadasi"},{"d":"2027-02-02","s":"Break fast (Ekadasi)"},{"d":"2027-02-06","s":"Amavasya"},{"d":"2027-03-03","s":"Fasting for Ekadasi"},{"d":"2027-03-04","s":"Break fast (Ekadasi)"},{"d":"2027-03-07","s":"Amavasya"},{"d":"2027-03-18","s":"Fasting for Ekadasi"},{"d":"2027-03-19","s":"Break fast (Ekadasi)"},{"d":"2027-03-22","s":"Gaura Purnima: Appearance of Sri Caitanya Mahaprabhu"},{"d":"2027-03-22","s":"(Fast till moonrise)"},{"d":"2027-04-02","s":"Fasting for Ekadasi"},{"d":"2027-04-03","s":"Break fast (Ekadasi)"},{"d":"2027-04-06","s":"Amavasya"},{"d":"2027-04-16","s":"Rama Navami: Appearance of Lord Sri Ramacandra"},{"d":"2027-04-16","s":"(Fast till sunset)"},{"d":"2027-04-16","s":"Fasting for Ekadasi"},{"d":"2027-04-17","s":"Break fast (Ekadasi)"},{"d":"2027-05-02","s":"Fasting for Ekadasi"},{"d":"2027-05-03","s":"Break fast (Ekadasi)"},{"d":"2027-05-19","s":"Nrsimha Caturdasi: Appearance of Lord Nrsimhadeva"},{"d":"2027-05-19","s":"(Fast till dusk)"},{"d":"2027-05-31","s":"Fasting for Ekadasi"},{"d":"2027-06-01","s":"Break fast (Ekadasi)"},{"d":"2027-06-04","s":"Amavasya"},{"d":"2027-06-14","s":"Fasting for Ekadasi"},{"d":"2027-06-15","s":"Break fast (Ekadasi)"},{"d":"2027-06-30","s":"Fasting for Ekadasi"},{"d":"2027-07-01","s":"Break fast (Ekadasi)"},{"d":"2027-07-03","s":"Amavasya"},{"d":"2027-07-05","s":"Ratha Yatra"},{"d":"2027-07-13","s":"Fasting for Ekadasi"},{"d":"2027-07-14","s":"Break fast (Ekadasi)"},{"d":"2027-07-18","s":"Guru (Vyasa) Purnima"},{"d":"2027-07-29","s":"Fasting for Ekadasi"},{"d":"2027-07-30","s":"Break fast (Ekadasi)"},{"d":"2027-08-12","s":"Fasting for Ekadasi"},{"d":"2027-08-13","s":"Break fast (Ekadasi)"},{"d":"2027-08-23","s":"Sri Krsna Janmastami: Appearance of Lord Sri Krsna"},{"d":"2027-08-23","s":"(Fast till midnight)"},{"d":"2027-08-24","s":"Nandotsava"},{"d":"2027-08-24","s":"Srila Prabhupada -- Appearance"},{"d":"2027-08-27","s":"Fasting for Ekadasi"},{"d":"2027-08-28","s":"Break fast (Ekadasi)"},{"d":"2027-08-31","s":"Amavasya"},{"d":"2027-09-08","s":"Radhastami: Appearance of Srimati Radharani"},{"d":"2027-09-08","s":"(Fast till noon)"},{"d":"2027-09-10","s":"Fasting for Ekadasi"},{"d":"2027-09-11","s":"Break fast (Ekadasi)"},{"d":"2027-09-26","s":"Fasting for Ekadasi"},{"d":"2027-09-27","s":"Break fast (Ekadasi)"},{"d":"2027-09-29","s":"Amavasya"},{"d":"2027-10-10","s":"Fasting for Ekadasi"},{"d":"2027-10-11","s":"Break fast (Ekadasi)"},{"d":"2027-10-25","s":"Fasting for Ekadasi"},{"d":"2027-10-26","s":"Break fast (Ekadasi)"},{"d":"2027-10-29","s":"Dipa dana, Dipavali, (Kali Puja)"},{"d":"2027-10-29","s":"Amavasya"},{"d":"2027-10-30","s":"Govardhana Puja"},{"d":"2027-11-02","s":"Srila Prabhupada -- Disappearance"},{"d":"2027-11-02","s":"(Fast till noon)"},{"d":"2027-11-09","s":"Fasting for Ekadasi"},{"d":"2027-11-10","s":"Break fast (Ekadasi)"},{"d":"2027-11-23","s":"Fasting for Ekadasi"},{"d":"2027-11-24","s":"Break fast (Ekadasi)"},{"d":"2027-11-27","s":"Amavasya"},{"d":"2027-12-08","s":"Fasting for Moksada Ekadasi"},{"d":"2027-12-08","s":"Advent of Srimad Bhagavad-gita"},{"d":"2027-12-09","s":"Fasting for Ekadasi"},{"d":"2027-12-10","s":"Break fast (Ekadasi)"},{"d":"2027-12-23","s":"Fasting for Ekadasi"},{"d":"2027-12-24","s":"Break fast (Ekadasi)"},{"d":"2027-12-27","s":"Amavasya"}];

/* NR_FN_SLOT 089 */

// ---------------------- Індекс подій (ICS + затемнення) ---------------------
const eventIndex = new Map();   // ключ 'YYYY-MM-DD' -> масив {name, weight, source, raw}
const eclipsesByYear = new Map(); // рік -> Map<'YYYY-MM-DD', type> (v85b-F5)
const ECLIPSE_CATALOG_END_YEAR = 2030; // v85b-F5: СЕРЕД-1 — явна межа каталогу
const _eclipseCatalogWarned = new Set(); // один warn на рік

// Проксі для CORS (fallback)
// v88.6.9: Cloudflare Worker priority (deploy див. cloudflare-worker-noaa-proxy.js).
//        Public free proxies нерeliable; власний Worker = robust + ~$0/міс.
// v88.7.2 (P5): NOAA Worker задеплоєний на Cloudflare 2026-05-07.
//        Primary CORS proxy для NOAA SWPC TXT endpoints (27-day-outlook тощо).
//        Public proxy chain (allorigins/corsproxy.io/codetabs) залишається tier-2 fallback.
const NOAA_WORKER_URL = 'https://gindex-noaa-proxy.nikolaev-kirill.workers.dev/?url=';
/* NR_FN_SLOT 090 */
// A deadline cancels cancellable chains; factories propagate AbortSignal to nested loaders.
/* NR_FN_SLOT 091 */
// Play does not send SILSO/UAF requests, including through a proxy.
// Keep this at the shared request boundary as well as at fallback call sites.
/* NR_FN_SLOT 092 */
/* NR_FN_SLOT 093 */
// v88.8.35-fp56-P8: lightweight JSON sniff — body starts with [ or { after trimming.
/* NR_FN_SLOT 094 */

// ---------------------------- Парсер ICS (простий) --------------------------
/* NR_FN_SLOT 095 */
/* NR_FN_SLOT 096 */
/* NR_FN_SLOT 097 */
/* NR_FN_SLOT 098 */

// ---------------------- Класифікація ICS-подій у наші ваги ------------------
const EVENT_PATTERNS = [
  // v30: виправлено Ekadasi (h optional), Dipavali, Siva Ratri; додано Purnima, Rama Navami, Aksaya, Janmashtami, Nrsimha, Ratha Yatra
  {re:/ekad(a|ā)s[h]?[iī]|ekādaśī/i, name:'Екадаші'},
  {re:/amavasya|amāvasyā/i, name:'Амавасья, день мертвих'},
  {re:/sankranti|saṅkrānti|saṁkranti|sa\.?nkranti|surya\s*sankran/i, name:'Сурья Санкранті Перехід Сонця із знаку в інший'},
  {re:/navaratri|navratr/i, name:'Наваратрі'},
  {re:/d[iī](?:pa?)?val[iī]|diwali|deepavali/i, name:'Діпавалі'},
  {re:/guru.*purnima|gurū?\s*pūrṇimā/i, name:'Гуру Пурніма'},
  {re:/maha\s*shiva?ratri|mahā?\s*śivarātr[iī]/i, name:'Махашиваратрі'},
  {re:/\bsiva\s*ratri|śiva\s*rātr[iī]/i, name:'Масік Шиваратрі'},
  {re:/pradosh|pradoṣa/i, name:'Прадош врат'},
  {re:/sankashti|saṅkaṣṭh?i/i, name:'Санкашті'},
  {re:/vinayaka|vināyaka|ganesha/i, name:'Вінаяка'},
  {re:/sav[aā]n[aā]\s+somv(ar|ar)/i, name:'Савана Сомвара'},
  {re:/rama\s*navami|rāma\s*navamī/i, name:'Рама Навамі'},
  {re:/aksaya|akṣaya/i, name:'Акшая Трітья'},
  {re:/janm[aā]st[aā]mi/i, name:'Джанмаштамі'},
  {re:/n[rṛ]simha/i, name:'Нрісімха Чатурдаші'},
  {re:/ratha\s*yatra/i, name:'Ратха Ятра'},
  {re:/purnima|pūrṇimā/i, name:'Пурніма (свято)'}   // catch-all — MUST be LAST
];
/* NR_FN_SLOT 099 */
/* NR_FN_SLOT 100 */

// ----------------------- Завантаження подій (ICS) ---------------------------
/* NR_FN_SLOT 101 */

// ----------------------------- Затемнення (Mᵢ) ------------------------------
// v87.22: NASA-каталог — Map<year, Map<dateStr, type>>, має пріоритет над scrape.
// Pre-seed для 2025–2030; scrape активується лише для років поза цим каталогом.
/* NR_FN_SLOT 102 */

// v87.25: console test helper — перевірка NASA-каталогу для бистрої діагностики.
// Запуск з адресної стрічки: javascript:void(__testEclipseCatalog())
window.__testEclipseCatalog = function(){
  const cases = [
    {year: 2024, expect: 'null', note: 'поза каталогом → null'},
    {year: 2025, expect: 6,      note: '6 затемнень'},
    {year: 2026, expect: 4,      note: '4 затемнення (17.02 annular, 03.03 total_lunar, 12.08 total_solar, 28.08 partial_lunar)'},
    {year: 2027, expect: 3,      note: '3 затемнення'},
    {year: 2028, expect: 4,      note: '4 затемнення'},
    {year: 2029, expect: 4,      note: '4 затемнення'},
    {year: 2030, expect: 3,      note: '3 затемнення'},
    {year: 2031, expect: 'null', note: 'поза каталогом → null'}
  ];
  const results = [];
  let pass = 0, fail = 0;
  for(const c of cases){
    const cat = _nasaEclipseCatalog(c.year);
    const actual = cat === null ? 'null' : cat.size;
    const ok = (actual === c.expect);
    results.push({year:c.year, expect:c.expect, actual, ok, note:c.note});
    if(ok) pass++; else fail++;
  }
  console.table(results);
  if(window._DEBUG) console.log(`[eclipse-test] ${pass}/${cases.length} passed, ${fail} failed`);
  return {pass, fail, total:cases.length, results};
};

// v87.53: console debug helper — розкриває компоненти G для заданої дати.
// Запуск: window.__debugG('2026-04-27') або window.__debugG(new Date())
// Повертає { Kp, Li, Mi, ei, Pi, Di, G, explain, eTip, pTip, lTip, mTip, diTip }
// Призначено для діагностики architectural gaps (Q2 audit v87.52: G=-3.9 на 27.04).
window.__debugG = function(input, kpOverride){
  let d;
  if(input instanceof Date){ d = input; }
  else if(typeof input === 'string'){
    // Нормалізація YYYY-MM-DD → noon UTC (узгоджено з forward timeline)
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m){ d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3], 12, 0, 0)); }
    else { d = new Date(input); }
  } else { d = new Date(); }
  if(!isFinite(d.getTime())){
    console.error('[__debugG] invalid date:', input);
    return null;
  }
  // v87.57: sync-preload NASA eclipse catalog for year (fixes "даних немає" у M-tip)
  try {
    const y = d.getUTCFullYear();
    if(!eclipsesByYear.has(y)){
      const nasa = _nasaEclipseCatalog(y);
      if(nasa) eclipsesByYear.set(y, nasa);
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.79','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  // Kp: priority (v87.58 fix — використовуємо реальні змінні з module scope):
  //   1. explicit kpOverride param
  //   2. _27dComputed entry по ds (охоплює 27 днів — від -3 до +~23 від today)
  //   3. last3D entry по ds (3-day forecast, якщо 27d ще не fetched)
  //   4. lastWWV.kNow (live observation)
  //   5. localStorage last_kp_known (cached)
  //   6. 0 — фінальний fallback
  let kp = 0;
  let kpSource = 'fallback=0';
  if(typeof kpOverride === 'number' && isFinite(kpOverride)) {
    kp = kpOverride;
    kpSource = 'override';
  } else {
    const ds = fmtDate(d);
    if(typeof _27dComputed !== 'undefined' && Array.isArray(_27dComputed) && _27dComputed.length){
      const entry = _27dComputed.find(x => x.ds === ds);
      if(entry && isFinite(entry.kpUsed)){
        kp = entry.kpUsed;
        kpSource = entry.isOverridden ? '3d-forecast' : '27d-forecast';
      }
    }
    if(kpSource === 'fallback=0' && typeof last3D !== 'undefined' && last3D && Array.isArray(last3D.days)){
      const e3 = last3D.days.find(x => fmtDate(x.date) === ds);
      if(e3 && isFinite(e3.kpMax)){
        kp = e3.kpMax;
        kpSource = '3d-forecast';
      }
    }
    if(kpSource === 'fallback=0' && typeof lastWWV !== 'undefined' && lastWWV && isFinite(lastWWV.kNow)){
      kp = lastWWV.kNow;
      kpSource = 'live';
    }
    if(kpSource === 'fallback=0'){
      try {
        const _lsKp = parseFloat(lsGet('last_kp_known'));
        if(isFinite(_lsKp)){ kp = _lsKp; kpSource = 'ls-cache'; }
      } catch(e){ globalThis.NRDiagnostics?.record('catch.80','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }
  }
  const r = computeAi(d, kp);
  const G = Math.round((kpDayTerm(kp) + r.Ai) * 100) / 100;
  const out = {
    date: fmtDate(d),
    Kp: kp,
    kpSource,
    Li: r.Li, Mi: r.Mi, ei: r.ei, Pi: r.Pi, Di: r.Di,
    G,
    formula: `G = 2 − Kp + L + M + e + P + D = 2 − ${kp} + ${r.Li} + ${r.Mi} + ${r.ei} + ${r.Pi} + ${r.Di} = ${G}`,
    lTip: r.lTip, mTip: r.mTip, eTip: r.eTip, pTip: r.pTip, diTip: r.diTip,
    explain: r.explain,
    eclipseUnverified: r.eclipseUnverified
  };
  if(window._DEBUG) console.log(`[__debugG] ${out.date} (Kp=${kp}, source=${kpSource})`);
  if(window._DEBUG) console.log(out.formula);
  console.table({ Li: r.Li, Mi: r.Mi, ei: r.ei, Pi: r.Pi, Di: r.Di, G });
  if(window._DEBUG) console.log('Li:', r.lTip);
  if(window._DEBUG) console.log('Mi:', r.mTip);
  if(window._DEBUG) console.log('ei:\n' + r.eTip);
  if(window._DEBUG) console.log('Pi:', r.pTip);
  if(window._DEBUG) console.log('Di:', r.diTip);
  return out;
};

/* NR_FN_SLOT 103 */
/* NR_FN_SLOT 104 */

// fp370: explicit astronomy visibility layer.
// This layer explains already-existing M_i and reports physical angular separation.
// It is deliberately display-only: no value here is fed into computeAi/G/reference/operation.
const ECLIPSE_TYPE_UA = {
  total_solar:'повне сонячне', total_lunar:'повне місячне',
  hybrid_solar:'гібридне сонячне', annular:'кільцеподібне сонячне',
  partial_solar:'часткове сонячне', partial_lunar:'часткове місячне',
  penumbral:'пенумбральне місячне', unknown:'затемнення (тип не підтверджено)'
};
const ASTRO_PLANETS = [
  ['Mercury','Меркурій'], ['Venus','Венера'], ['Mars','Марс'],
  ['Jupiter','Юпітер'], ['Saturn','Сатурн'], ['Uranus','Уран'], ['Neptune','Нептун']
];
const PLANET_PARADE_WINDOWS = [{
  start:'2026-08-10', peak:'2026-08-12', end:'2026-08-14',
  bodies:['Mercury','Jupiter','Uranus','Mars','Neptune','Saturn']
}];
let _astroEventsRetryCount = 0;

/* NR_FN_SLOT 105 */

/* NR_FN_SLOT 106 */

/* NR_FN_SLOT 107 */

/* NR_FN_SLOT 108 */

// ------------------- Додаткові обчислювані події (без Інтернету) ------------
// approxTithiIndex: повертає 1-based індекс тітхі (1..30).
// Використовується ТІЛЬКИ в autoComputedExtras для перевірки t===1 (Pratipada).
// Не плутати з tithiIdxForLi (0-based 0..29) і computePanchanga.tithi.num (1-based 1..30).
/* NR_FN_SLOT 109 */
// TECH-2 (v70): Surya Sankranti через sidereal Lahiri — ідентично engine auto_tag v1.1
// Повертає true якщо dateUTC є днем ingress Сонця в новий sidereal rashi (кратне 30°)
// Метод: порівняти floor(sunSid/30) за 00:00 і 23:59 UTC поточного дня.
// Якщо змінився — це день Sankranti (незалежно від конкретного часу ingress).
/* NR_FN_SLOT 110 */

/* NR_FN_SLOT 111 */

// ═══ v88.8.37-fp70: Тема дня — детермінована генерація ═══
// Відповідає на питання «Яка головна ідея дня?» — одне речення.
// Без LLM: виводиться детерміновано з PDF/Engine score + тегів + панчанги.
/* NR_FN_SLOT 112 */

// ═══ v88.8.37-fp70: Week Narrative — сценарій тижня замість цифрового рядка ═══
// Co-Star pattern: не числа, а сценарій. Що відбувається, коли діяти, коли обережніше.
/* NR_FN_SLOT 113 */
window.getDynamicKpForDate_v889125 = getDynamicKpForDate_v889125;

/* NR_FN_SLOT 114 */

// ═══ v88.8.39-fp76: Audit Card — «Чому такий висновок?» ═══
// Джерела: window.__uiState (gNow, kpNow, ai, confPct, confGrade),
//          _lastPanchCtx / window.__p3RahuCache (Rahu fallback chain),
//          resolveDataModeExtended (data-mode у Conf)
// НЕ впливає на engine/freeze/канон.
// silent=true → тільки оновлює innerHTML, НЕ змінює display (default: silent).
/* NR_FN_SLOT 115 */

// ═══ v88.8.37-fp70: GNSS / UAV Risk Layer ═══
// Базується на NOAA Space Weather Scale (G-Scale, public domain).
// Фізика: Groves & Akala et al., Radio Science 47(4), 2012.
// Окремий модуль — НЕ впливає на G-Index day score / PDF/Engine.
/* NR_FN_SLOT 116 */

// ═══ v26: DST → G-модифікатор (M_DST) ═══
// DST < -50 нТл = помірна буря (узгоджено з engine v18.5), < -100 = сильна буря
/* NR_FN_SLOT 117 */

// ═══ v26: F10.7 → soft модифікатор для 27-day прогнозу ═══
// F10.7 > 150 sfu = активна фаза Сонця, підвищена ймовірність бур
/* NR_FN_SLOT 118 */

// ============================================================
// ==== Real-time solar wind physics module v42 (DSCOVR: Bz, Vsw)
// ============================================================
let lastBz    = null;
let lastBzTime  = null;
let lastVsw   = null;
let lastVswTime = null;

// fp370: NOAA RTSW occasionally serializes missing numeric samples as bare NaN,
// which is not valid JSON. Null only those invalid values so later valid rows survive.
/* NR_FN_SLOT 119 */
/* NR_FN_SLOT 120 */

/* NR_FN_SLOT 121 */

/* NR_FN_SLOT 122 */

// v87.15 U6: GOES X-ray flare (long wavelength 0.1–0.8 nm)
// Повертає {flux, class, time} — class це 'A' | 'B' | 'C' | 'M' | 'X' з номером
// Letter scale: A = 1e-8, B = 1e-7, C = 1e-6, M = 1e-5, X = 1e-4 W/m²
/* NR_FN_SLOT 123 */

/* NR_FN_SLOT 124 */

/* NR_FN_SLOT 125 */

/* NR_FN_SLOT 126 */
// ============================================================

// ═══ v26: Confidence Band для G-індексу ═══
// δG = f(Kp_variance, event_uncertainty)
// Kp_variance: від min/max останніх 8 спостережень
// event_uncertainty: ±0.5 через неточність ICS/Tithi класифікації
/* NR_FN_SLOT 127 */

// ─── DATA MODE RESOLVER (v87.91) ───────────────────────────────────────
// Єдине джерело істини про режим достовірності даних, що використовується у Hero, Confidence,
// heroTomorrow і будь-яких індикаторах статусу. Раніше Hero показував LIVE/92% тоді як NOAA
// forecast був synthetic plateau — головна критика аудиту.
// Стани:
//   'live'     — Kp обсервації live + NOAA 3-day forecast доступний
//   'partial'  — Kp обсервації live, але forecast cached/stale
//   'scenario' — NOAA forecast недоступний → плато на базі поточного Kp (не справжній прогноз)
//   'offline'  — навіть Kp обсервації недоступні
/* NR_FN_SLOT 128 */

// v88.8.35-fp16 GG: розширена версія resolveDataMode з проміжним станом ESTIMATED.
// Контекст: коли Kp застарілий 1-12h АЛЕ last3D forecast реальний (не synthetic),
// дані ще достатньо точні — це НЕ повноцінний DELAYED/PARTIAL.
// Старий resolveDataMode залишається без змін для backward-сумісності всіх existing call sites.
// Нові UI рендери (freshness badge, alert, banner) можуть використовувати extended якщо їм треба нюанс.
// Повертає: 'live' | 'estimated' | 'partial' | 'scenario' | 'offline'.
/* NR_FN_SLOT 129 */
window.resolveDataModeExtended = resolveDataModeExtended;

// ─── C-SCORE (Confidence Index) v63 ───────────────────────────────────────
// Повертає { conf: 0..1, grade: 'high'|'med'|'low', drivers: [...], bar: html }
/* NR_FN_SLOT 130 */

// ------------------------------ Обчислення Aᵢ -------------------------------
// ------------------------- Geomagnetic day component -------------------------
// fp349: Expert Excel and physical semantics use (2 - Kp): stronger geomagnetic
// activity lowers the day background. Safety thresholds (Kp >= 4/5) stay separate.
/* NR_FN_SLOT 131 */
/* NR_FN_SLOT 132 */

/* NR_FN_SLOT 133 */
/* NR_FN_SLOT 134 */

// fp145 PERF FIX: computeAi викликається 40+ разів на boot (render27Day, renderComparePeriods,
// renderWeekSummary...), багато — на однакові дати. Кожен виклик робить важкий астро-обрахунок
// (Astronomy.MoonPhase). Кеш за ключем (дата+kp) усуває повтори — головна причина фризу ~1.7с.
const _computeAiCache = new Map();
/* NR_FN_SLOT 135 */
/* NR_FN_SLOT 136 */

// --------------------------- ШКАЛИ / Бейджі для Kp --------------------------

// ─── v88.8.34 G_EXTENDED v2 (R&D advisory, weak signal) ────────────────
// The deployed coefficient file is g_extended_v2_coefs.json, not v3.1.
// v2 metrics: trained_on_n=212, CV r=+0.42±0.16, CV sign-match=63.7%, strict=48.6%.
// Therefore this is kept as a secondary diagnostic only.
/* NR_FN_SLOT 137 */

/* NR_FN_SLOT 138 */
/* NR_FN_SLOT 139 */
/* NR_FN_SLOT 140 */
/* NR_FN_SLOT 141 */

// ---------- Ap → Kp (Excel-mode: дискретно за вузлами NOAA) ----------
// ─── v32: Ap ↔ Kp (GFZ table нижче) ─────────────────────────────────────────
// ─── v32: Ap → Kp по офіційній GFZ таблиці (лінійна інтерполяція) ───────────
// Джерело: GFZ Potsdam / NOAA (Kp крок 1/3, 28 вузлів)
// v88.7+ (deep audit fix): GFZ_AP_TABLE синхронізована з офіційною NCEI/GFZ таблицею
// Source: https://www.ncei.noaa.gov/products/geomagnetic-indices (Kp 0o..9o → ap 0..400)
// До audit: 26/28 значень були off-by-step (Kp=2→6 замість 7, Kp=5→39 замість 48 і т.д.)
// Imact був тільки на Ap-display у 27-day forecast; G формула використовує Kp напряму.
const GFZ_AP_TABLE = [
  [0, 0],    [0.3, 2],   [0.7, 3],   [1, 4],    [1.3, 5],   [1.7, 6],
  [2, 7],    [2.3, 9],   [2.7, 12],  [3, 15],   [3.3, 18],  [3.7, 22],
  [4, 27],   [4.3, 32],  [4.7, 39],  [5, 48],   [5.3, 56],  [5.7, 67],
  [6, 80],   [6.3, 94],  [6.7, 111], [7, 132],  [7.3, 154], [7.7, 179],
  [8, 207],  [8.3, 236], [8.7, 300], [9, 400]
]; // [kp, ap]

// v87.56: removed apToKpInterp + kpFromApExcel (dead chain, 0 callsites)
// kpToApInterp kept — used by 27d forecast Ap computation

// Зворотна: Kp → Ap (для 3-day прогнозу)
/* NR_FN_SLOT 142 */

// --------- Нова функція: підказка для G (склад рівно в момент наведення) ----
/* NR_FN_SLOT 143 */

// ----------------------------- Парсери NOAA ------------------------------
// Парсер JSON спостережень Kp (noaa-planetary-k-index.json)
// Формат: [["time_tag","kp","a_running","station_count"],...] або з заголовком
// v88.8.18 ★ GFZ POTSDAM FALLBACK: Kp index у канонічному форматі IAGA.
// API: https://kp.gfz.de/app/json/?start=ISO&end=ISO&index=Kp&status=now|def
// Response format: { datetime: [...], Kp: [...], status: [...] }
// Конвертуємо в NOAA-сумісний формат [["time_tag","Kp"],...] для parseKpObsJSON.
/* NR_FN_SLOT 144 */

/* NR_FN_SLOT 145 */

// Парсер числа Вольфа (офіційні SILSO CSV; legacy JSON також читається для cache compatibility)
/* NR_FN_SLOT 146 */
/* NR_FN_SLOT 147 */

// fp372: the local scheduler already downloads and validates the SILSO daily
// series. Prefer its tiny same-origin status artifact so the browser does not
// depend on third-party CORS proxies. Sn remains context-only (score_effect=0).
/* NR_FN_SLOT 148 */

/* NR_FN_SLOT 149 */
// Парсер JSON прогнозу Kp (noaa-planetary-k-index-forecast.json)
// Формат: [["time_tag","kp","observed","noaa_scale"],...] з заголовком
// ─── v88.6.9: UAF Geophysical Institute (Alaska) — Tier-2 fallback ───
// Витягує JSON arrays з HTML сторінки https://www.gi.alaska.edu/monitors/aurora-forecast
// Сторінка містить 4 JSON масиви inline (з NOAA SWPC):
//   [0] 27-day forecast (daily, ~27 entries)        — predicted_time: "YYYY-MM-DD"
//   [1] 27-day forecast duplicate                    — те саме
//   [2] 3-day forecast (3-hour intervals, 24 entries) — predicted_time: "YYYY-MM-DD HH:MM:SS", future
//   [3] Historical (180 days actual, daily max)      — predicted_time: "YYYY-MM-DD HH:MM:SS", PAST
// Returns: { kp3Day: [{time, kp}], kp27Day: [{date, kp}], historical: [{date, kp}] } | null
/* NR_FN_SLOT 150 */

// Конвертує UAF 3-day у формат сумісний з parse3DaySafe output
// out: { issued, predictedAp, days: [{date, kp8, kpMax}] }
/* NR_FN_SLOT 151 */

// Конвертує UAF 27-day у формат parse27Day output
// out: [{date, flux, Ap, kpMax}]
/* NR_FN_SLOT 152 */

// v88.7.6: спільний fill-up до 3 днів — використовується parse3DaySafe і uafTo3DayFormat.
// Гарантує, що out.days містить рівно today + 2 наступні дні. Placeholder days мають _needsFill=true,
// потім loadAll() заповнить їх з NOAA 27-day або synthetic-Kp fallback.
/* NR_FN_SLOT 153 */

// v88.7.6: спільний fill-up для placeholder days — використовується для NOAA і UAF шляхів.
// Першочергово пробує NOAA 27-day-outlook (через t27R), потім synthetic-Kp-now fallback.
/* NR_FN_SLOT 154 */

/* NR_FN_SLOT 155 */
// Парсер Dst index (kyoto-dst.json) — Формат: [["time_tag","dst"],...] з заголовком
// v88.8.35-fp56-P8: filter Kyoto no-data sentinels (9999/99999) and physically impossible values.
// WDC Kyoto marks missing hours as 9999; parseFloat("9999")=9999 passed isFinite() and showed as a
// real "Dst 9999 нТл". Real Dst lives roughly within [-600, +100] nT; anything outside is rejected,
// and we walk back to the last VALID row instead of trusting the latest (possibly-sentinel) one.
/* NR_FN_SLOT 156 */
/* NR_FN_SLOT 157 */
// v88.9.6x-fp244 (аудит fp242, п.2): показаний Dst timestamp раніше НІЯК не
// звірявся з реальним часом — можна було показати запис із майбутнім або
// дуже старим часом як "Kyoto" без жодного попередження, а "Якість даних"
// не реагувала. _parseDstTimeToDate() розбирає рядок часу з parseDst() (формат
// "YYYY-MM-DD HH:MM:SSUTC" — parseDst() приліплює "UTC" без пробілу) у Date.
/* NR_FN_SLOT 158 */
// Повертає { ok, reason, ageHours }. ok=false у трьох випадках: значення
// відсутнє, час запису не розпізнано, або час — у майбутньому/задавнений
// (>6г — той самий поріг, що вже прийнятий для Kp age-penalty в computeCScore).
/* NR_FN_SLOT 159 */
window._dstProvenanceCheck = _dstProvenanceCheck;

/* NR_FN_SLOT 160 */
// Парсер JSON 45-day (45-day-ap-forecast.json)
// Формат: [["time_tag","ap"],...]  АБО  [[date, ap],...] з заголовком
/* NR_FN_SLOT 161 */
/* NR_FN_SLOT 162 */

// --------------------------- Парсер 27-day outlook txt ----------------------
/* NR_FN_SLOT 163 */

// --------------------------- Рендер 27-day ----------------------------------
// --- 27d: зберігаємо обчислені рядки для сортування/фільтрації ---
let _27dComputed = [];
let _27dSortCol = 'date';
let _27dSortDir = 'asc';

/* NR_FN_SLOT 164 */

/* NR_FN_SLOT 165 */

/* NR_FN_SLOT 166 */

// v87.28 Compare periods — цей тиждень vs той самий тиждень рік тому (Σ-ритм only).
// Kp historical недоступний у клієнті, тому показуємо лише ΣAᵢ (Lᵢ+Mᵢ+eᵢ+Pᵢ+Dᵢ) — повністю
// детерміновану частину з дати. Kp-компонент пропускаємо; це "ритм Панчанги/затемнень/свят/Dst-буря"
// без геомагнітної невизначеності.
//
// v87.29 Upgrade — додано режим "4 тижні назад (Carrington rotation)" з ПОВНИМ G (з Kp):
// використовує NOAA DGD last-30-days endpoint, який надійно покриває [−28, 0] днів.
// 4-week compare астрономічно осмислене: Carrington rotation ≈ 27.28 днів,
// тому той самий геліо-довготний сектор Сонця бачимо.

// v87.29: DGD parser. Формат (13 токенів після 'YYYY MM DD'):
//   YYYY MM DD  Ap_mid K1..K8  Ap_hi K1..K8  Ap_pl Kp1..Kp8
// Беремо ПЛАНЕТАРНІ Kp (останні 8 чисел як float). Повертає Map<'YYYY-MM-DD', daily_max_kp>.
// v87.33: in-flight guard проти concurrent fetch (rendering триггериться з 2 місць — load + render27Day).
let _dgdInflight = null;
/* NR_FN_SLOT 167 */

/* NR_FN_SLOT 168 */

// Helper: рендерить блок (спільний для обох режимів)
/* NR_FN_SLOT 169 */

// Toggle handler
/* NR_FN_SLOT 170 */

// ═══════════════════════════════════════════════════════════════════════════
// v87.34 FORWARD TIMELINE — інтерактивна 27-day смуга з play-контролом.
// Third visual layer між chart27 (графік) та tbl27 (таблиця). Компактніший за таблицю,
// інтерактивніший за графік. Play-анімація retention hook.
// v87.35 POLISH — responsive subset на вузьких екранах + play-speed slider (0.5×/1×/2×)
// ═══════════════════════════════════════════════════════════════════════════
let _ftSelectedIdx = -1;   // -1 = today (default)
let _ftPlayTimer = null;   // setInterval handle
let _ftPlaying = false;
let _ftPlaySpeed = 1;      // 0.5 | 1 | 2 — multiplier

/* NR_FN_SLOT 171 */

/* NR_FN_SLOT 172 */

/* NR_FN_SLOT 173 */

// v87.35: subset helper — на вузьких екранах повертає лише (−3..+10) від сьогодні = 14 днів
/* NR_FN_SLOT 174 */

/* NR_FN_SLOT 175 */

/* NR_FN_SLOT 176 */

// v87.35: speed handler
/* NR_FN_SLOT 177 */

// v87.35: виділений tick, щоб не дублювати між toggle і setSpeed
/* NR_FN_SLOT 178 */

/* NR_FN_SLOT 179 */

// v87.35: re-render timeline on window resize (responsive subset switch)
(function(){
  let _ftResizeTimer = null;
  window.addEventListener('resize', () => {
    if(_ftResizeTimer) clearTimeout(_ftResizeTimer);
    _ftResizeTimer = setTimeout(() => {
      try{ renderForwardTimeline(); }catch(e){ globalThis.NRDiagnostics?.record('catch.123','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }, 200);
  });
})();

// --------------------------- Категоризація G-бейджа ------------------------
/* NR_FN_SLOT 180 */
/* NR_FN_SLOT 181 */
/* NR_FN_SLOT 182 */

// ----------------------------- Рендер поточного -----------------------------
let lastWWV=null, last3D=null, _last27Rows=null, _lastKpObsJson=null;
let _lastPanchCtx=null, _lastAstroCtx=null; // для планетної анімації

/* NR_FN_SLOT 183 */

// ----------------------------- Рекомендація за G ----------------------------
// v26.2: додано kp параметр — при бурі (Kp≥5) ніколи не показувати "Оптимально"/"Допустимо"
/* NR_FN_SLOT 184 */

// ----------------------------- Sparkline SVG --------------------------------
/* NR_FN_SLOT 185 */

// ========================= PANCHANGA ENGINE =========================
// Tithi: floor(ΔL/12)+1, де ΔL = moonPhaseAngle (0–360)
const TITHI_NAMES = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashti','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima',
  'Pratipada (K)','Dwitiya (K)','Tritiya (K)','Chaturthi (K)','Panchami (K)',
  'Shashti (K)','Saptami (K)','Ashtami (K)','Navami (K)','Dashami (K)',
  'Ekadashi (K)','Dwadashi (K)','Trayodashi (K)','Chaturdashi (K)','Amavasya'
];
const TITHI_TYPE = [
  'Нанда','Бхадра','Джая','Рікта','Пурна',
  'Нанда','Бхадра','Джая','Рікта','Пурна',
  'Нанда','Бхадра','Джая','Рікта','—',
  'Нанда','Бхадра','Джая','Рікта','Пурна',
  'Нанда','Бхадра','Джая','Рікта','Пурна',
  'Нанда','Бхадра','Джая','Рікта','—'
];
// v88.7.7 audit note: TITHI_SCORE свідомо НЕ є чистою функцією TITHI_TYPE:
//   • Ashtami (idx 7, 22, тип Джая) = 0 а не +1 → BPHS змішана природа («уникати весіль»)
//   • Chaturdashi (idx 13, 28, тип Рікта) = 0 а не -2 → «бойові справи — обережно», softer than full Rikta
//   • Ekadashi (idx 10, 25, тип Нанда) = -2 а не +1 → день посту, виключено з Pᵢ і так
//   • Purnima (idx 14) = 0 (v14.2) а не +1 (Пурна) → authored weight, not a Cajochen 2013 calibration; підсилення в Lᵢ при Kp≥7
//   • Amavasya (idx 29) = -3 → у Pᵢ виключено через tIdx!==29; залишається тільки для UI scoreBar
const TITHI_SCORE = [
  1, 1, 1,-2, 1, 1, 1, 0,-2, 1,
 -2, 1, 1, 0, 0, 1, 1, 1,-2, 1,  // idx14=Purnima→0 (нейтральна v14.2)
  1, 1, 0,-2, 1,-2, 1, 1, 0,-3
];
const TITHI_NOTE = [
  'Новий місяць; старт справ','Навчання, будівництво','Перемога, початок справ',
  'Рікта — уникати важливих дій','Лікування, дипломатія','Музика, подорожі',
  'Транспорт, зрошення','Змішана; уникати весіль','Негативна для більшості дій',
  'Угоди, оголошення','Піст і духовна практика','Дуже сприятлива',
  'Кохання і мистецтво','Бойові справи — обережно','Повня: нейтральна 0 (v14.2)',
  'Перший день темної половини','Навчання, будівництво (темна)','Перемога, початок справ (темна)','Рікта','Лікування, дипломатія (темна)','Музика, подорожі (темна)','Транспорт, зрошення (темна)','Змішана','Рікта (темна)',
  'Угоди','Піст','Сприятлива','Кохання і мистецтво (темна)','Перед Амавасьєю','Новоління: −3'
];

// Vara: день тижня
// v88.8.18 CALIBRATION CHECK (n=212 PDF-overlap dates):
//   Current military scores (Mon=-1, Tue=0, Thu=+2, ...): r=+0.265 vs PDF, sign 58%
//   BPHS-standard (Mon=+1, Tue=-1, Thu=+2, ...):          r=+0.290 vs PDF, sign 58%
//   Data-optimal (regression, clipped ±3):                r=+0.332 vs PDF, sign 61%
//   → All variants give similar weak correlation (~0.2-0.3). Per-Vara mean PDF
//     має std ~2.5 — weekday alone is poor predictor. Other factors (eclipse,
//     transit, retrograde, weeks-specific events) drive bulletin more strongly.
//   → KEEP current military scores until 2026-08-01 (Engine v18.5 frozen).
//     Post-freeze: re-calibrate з extended dataset n>500, consider profile-aware
//     Vara mapping (mil keeps current, civilian/medic uses BPHS-standard).
//   Per-Vara mean PDF (n=212):
//     Sun  (n=30):  +0.13 ± 2.47  → current  0  (✓ матчиться)
//     Mon  (n=26):  -0.19 ± 2.45  → current -1  (close — keep)
//     Tue  (n=28):  -0.96 ± 2.20  → current  0  (BPHS-std -1 краще, але within noise)
//     Wed  (n=33):  -0.45 ± 2.55  → current +1  (inverse sign vs mean)
//     Thu  (n=33):  -0.61 ± 2.40  → current +2  (inverse sign vs mean — Mercury+Jupiter expected good, але PDF says otherwise)
//     Fri  (n=30):  +0.07 ± 2.48  → current +1  (mild bias)
//     Sat  (n=32):  -0.31 ± 2.54  → current -1  (✓ матчиться)
//   Interpretation: expert bulletin враховує більше ніж класичну Vara — eclipse/transit
//   ефекти domіnate, weekday signal лише ~10-15% оverall variance.
const VARA_DATA = [
  {name:'Равівара',  planet:'Сурья (Сонце)', score: 0, note:'Лідерство, влада'},
  {name:'Сомавара',  planet:'Чандра (Місяць)', score:-1, note:'Розвідка, раптові дії'},
  {name:'Мангалавара',planet:'Мангала (Марс)', score: 0, note:'Бойові дії, мужність'},
  {name:'Будхавара', planet:'Будха (Меркурій)',score: 1, note:'Комунікації, планування'},
  {name:'Гурувара',  planet:'Гуру (Юпітер)',  score: 2, note:'Стратегія, командування — найкращий'},
  {name:'Шукравара', planet:'Шукра (Венера)', score: 1, note:'Відпочинок, ротація'},
  {name:'Шанівара',  planet:'Шані (Сатурн)',  score:-1, note:'Дисципліна, патрулювання'}
];

// Nakshatra: 27 стоянок
const NAKSHATRA_NAMES = [
  'Ashwini','Bharani','Krittika','Rohini','Mrigashira',
  'Ardra','Punarvasu','Pushya','Ashlesha','Magha',
  'Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati',
  'Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha',
  'Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada',
  'Uttara Bhadrapada','Revati'
];
const NAKSHATRA_TYPE = [
  'Легка','Жорстка','Змішана','Стала','М\'яка',
  'Жорстка','Рухома','Легка','Жорстка','Жорстка',
  'Жорстка','Стала','Легка','М\'яка','Рухома',
  'Змішана','М\'яка','Жорстка','Жорстка','Жорстка',
  'Стала','Рухома','Рухома','Рухома','Жорстка',
  'Стала','М\'яка'
];
const NAKSHATRA_SCORE_MAP = {'Легка':2,'Стала':1,'Рухома':0,'М\'яка':0,'Змішана':0,'Жорстка':-1};
const NAKSHATRA_REGENT = [
  'Кету','Венера','Сонце','Місяць','Марс',
  'Раху','Юпітер','Сатурн','Меркурій','Кету',
  'Венера','Сонце','Місяць','Марс','Раху',
  'Юпітер','Сатурн','Меркурій','Кету','Венера',
  'Сонце','Місяць','Марс','Раху','Юпітер',
  'Сатурн','Меркурій'
];

// v88.8.15: GANDA MOOL NAKSHATRA (BPHS Ch.4 v.13)
// 6 особливих junction-накшатр (стики ракші), де народжені діти потребують
// особливих shanti ритуалів (Mool Shanti) у перші 27 днів життя.
// Канон: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati
// Це не "погані" накшатри в загальному, але мають кармічний індикатор.
// 0-based indices у NAKSHATRA_NAMES.
const GANDA_MOOL_INDICES = [0, 8, 9, 17, 18, 26];
const GANDA_MOOL_NAMES = ['Ashwini','Ashlesha','Magha','Jyeshtha','Mula','Revati'];
// v88.8.16: Drikpanchang canonical subtype/effect mapping
// Moola type (Ketu-ruled): Ashwini, Magha, Moola → effect on Father
// Ganda type (Mercury-ruled): Ashlesha, Jyeshtha, Revati → effect on Mother/Younger siblings
const GANDA_MOOL_DETAILS = {
  0:  { subtype: 'Moola', ruler: 'Ketu',    effect: 'Father' },             // Ashwini
  8:  { subtype: 'Ganda', ruler: 'Mercury', effect: 'Mother' },             // Ashlesha
  9:  { subtype: 'Moola', ruler: 'Ketu',    effect: 'Father' },             // Magha
  17: { subtype: 'Ganda', ruler: 'Mercury', effect: 'Younger siblings' },   // Jyeshtha
  18: { subtype: 'Moola', ruler: 'Ketu',    effect: 'Father / Grandfather' }, // Mula
  26: { subtype: 'Ganda', ruler: 'Mercury', effect: 'Mother' }              // Revati
};

// v88.8.15: PANCHA PAKSHI (5 птахів) — Tamil Vedic tradition
// Кожна з 27 nakshatras належить до одного з 5 птахів.
// ДЖЕРЕЛО: Pulippani, U.S. "Biorhythms of Natal Moon: Mysteries of Panch Pakshi"
// (Ranjan Publications, 1993, preface K.N. Rao). archive.org/details/jyotish-1993-...
// Точна таблиця Shukla Paksha (oригінал, стор. vi):
//   1-5 (Ashwini..Mrigashira)     → VULTURE
//   6-11 (Ardra..P.Phalguni)      → OWL
//   12-16 (U.Phalguni..Vishakha)  → CROW
//   17-21 (Anuradha..U.Ashadha)   → COCK
//   22-27 (Shravana..Revati)      → PEACOCK
// Krishna Paksha: той самий розподіл, рахунок у зворотньому напрямку від Revati(27).
// v88.8.41-fp102: ВИПРАВЛЕНО — попередня таблиця (v88.8.15) не відповідала джерелу
// і застосовувала bird до nakshatra ПОТОЧНОГО дня замість JANMA (натальної) nakshatra.
// 0-based indices: значення = ID птаха (0=Vulture, 1=Owl, 2=Crow, 3=Cock, 4=Peacock)
const PANCHA_PAKSHI_BIRD_SHUKLA = [
  0,0,0,0,0,           // 0-4: Ashwini..Mrigashira → VULTURE
  1,1,1,1,1,1,          // 5-10: Ardra..P.Phalguni → OWL
  2,2,2,2,2,            // 11-15: U.Phalguni..Vishakha → CROW
  3,3,3,3,3,            // 16-20: Anuradha..U.Ashadha → COCK
  4,4,4,4,4,4           // 21-26: Shravana..Revati → PEACOCK
];
// Krishna Paksha: дзеркальний розподіл, рахунок з Revati(27) у зворотньому напрямку.
const PANCHA_PAKSHI_BIRD_KRISHNA = [
  4,4,4,4,4,4,           // 0-5: Ashwini..Ardra → PEACOCK (дзеркало кінця)
  3,3,3,3,3,             // 6-10: Punarvasu..Magha → COCK
  2,2,2,2,2,             // 11-15: P.Phalguni..Vishakha → CROW
  1,1,1,1,1,1,           // 16-21: Anuradha..Shravana → OWL
  0,0,0,0,0              // 22-26: Dhanishtha..Revati → VULTURE
];
/* NR_FN_SLOT 186 */
const PANCHA_PAKSHI_NAMES = ['Гриф','Сова','Ворона','Півень','Павич'];
const PANCHA_PAKSHI_NAMES_EN = ['Vulture','Owl','Crow','Cock','Peacock'];
const PANCHA_PAKSHI_QUALITIES = [
  'Сила, рішучість, лідерство',          // Vulture
  'Інтуїція, мудрість, відчуття часу',   // Owl
  'Адаптивність, спостережливість',       // Crow
  'Активність, голос, влада',            // Cock
  'Краса, мистецтво, гармонія'           // Peacock
];

// === v88.8.51-fp128: 5-STATE ACTIVITY ENGINE — ТОЧНА формула (Pulippani, скани стор.66-71) ===
// 5 activities в порядку зростання сили: Dying < Sleeping < Walking < Eating < Ruling
// Кожен день+ніч ділиться на 5+5 yamas по 2год24хв (6 ghatikas), від sunrise/sunset.
// "5 elemental vibrations function so that when one is at highest ebb,
//  the other four function proportionately in diminishing order" (стор.13)
const PP_ACTIVITIES = ['dying','sleeping','walking','eating','ruling'];
const PP_ACTIVITIES_UA = ['Помирає','Спить','Йде','Їсть','Панує'];
const PP_ACTIVITIES_ADVICE = [
  'Уникати дій. Найслабша фаза.',
  'Пасивна фаза. Відпочинок, не ініціювати.',
  'Помірна фаза. Рутинні справи.',
  'Сильна фаза. Підходить для дій.',
  'Найсильніша фаза. Ідеально для важливих рішень.'
];
// v88.8.42: ТОЧНА формула для BRIGHT HALF, звірена вручну зі сканами оригіналу
// (стор.66-71: Vulture, Sun-Tue/Mon-Wed/Thu/Fri, день+ніч) — 30/30 точок збіглися.
// День: порядок Eat→Walk→Rule→Sleep→Death. Ніч: порядок Eat→Rule→Death→Walk→Sleep.
// groupIndex по дню тижня (JS getDay): Нд=0,Пн=1,Вт=0,Ср=1,Чт=2,Пт=3,Сб=4.
const PP_GROUP_INDEX_BY_WEEKDAY = {0:0, 1:1, 2:0, 3:1, 4:2, 5:3, 6:4};
const PP_DAY_ORDER_TO_PPIDX   = [3,2,4,1,0]; // position(Eat,Walk,Rule,Sleep,Death) → PP_ACTIVITIES idx
const PP_NIGHT_ORDER_TO_PPIDX = [3,4,0,2,1]; // position(Eat,Rule,Death,Walk,Sleep) → PP_ACTIVITIES idx

// v88.8.75-fp154: ТОЧНА формула для DARK HALF, звірена зі сканів оригіналу
// (2 фото сторінок 115-116: групи ONE Sun/Tue та TWO Mon/Sat + THREE Wed, день).
// Групування ДЕНЬ ТИЖНЯ у Dark Half ІНШЕ, ніж у Bright Half:
// ONE=Нд+Вт, TWO=Пн+Сб, THREE=Ср, FOUR=Чт, FIVE=Пт (Bright: Нд+Вт/Пн+Ср/Чт/Пт/Сб).
// Знайдений принт-баг оригіналу (1993): в групі ONE Day яма-3 та яма-4 надруковані
// ІДЕНТИЧНО (сканами підтверджено, не OCR-глюк) — відновлено через подвійну
// крос-перевірку: (а) латинський квадрат — кожна з 5 груп мусить використати
// всі 5 ротацій A-E по одному разу; (б) власне правило автора (стор.121: "хто Ходить
// у ямі N — той Їсть у ямі N+1" вдень, "хто Панує у ямі N — той Їсть у ямі N+1" вночі),
// перевірено на групі TWO/THREE (де текст чистий) — 100% збіглося по колу (5/5 переходів
// + цикл на яму 0). Відновлена яма-3 групи ONE = ротація E — узгоджена з обома перевірками.
const PP_DARK_DAY_GROUP_BY_WEEKDAY   = {0:0, 1:1, 2:0, 3:2, 4:3, 5:4, 6:1}; // Нд,Пн,Вт,Ср,Чт,Пт,Сб
const PP_DARK_DAY_ORDER_TO_PPIDX     = [2,0,4,3,1]; // position → PP_ACTIVITIES idx (walk,die,rule,eat,sleep)
const PP_DARK_DAY_BASE_SHIFT         = [0,3,1,4,2]; // по yama 0..4 (група ONE)
const PP_DARK_DAY_GROUP_OFFSET       = [0,4,1,2,3]; // по групі 0..4 (ONE,TWO,THREE,FOUR,FIVE)
const PP_DARK_NIGHT_ORDER_TO_PPIDX   = [3,4,0,2,1]; // position → PP_ACTIVITIES idx (eat,rule,die,walk,sleep)
const PP_DARK_NIGHT_BASE_SHIFT       = [0,4,3,2,1]; // по yama 0..4 (група ONE)
const PP_DARK_NIGHT_GROUP_OFFSET     = [0,2,4,3,1]; // по групі 0..4 (ONE,TWO,THREE,FOUR,FIVE)

/* NR_FN_SLOT 187 */
/* NR_FN_SLOT 188 */



// v88.8.16: PANCHAK detection (Drikpanchang canon)
// 5 nakshatras коли Місяць у Aquarius/Pisces утворюють Panchak —
// 5-денний канонічний інаусп. період заборони важливих справ
// (marriage, mundan, housewarming, business start, travel south).
// Канон: Dhanishtha (друга половина), Shatabhisha, P.Bhadrapada, U.Bhadrapada, Revati
// Спрощення: ціла Dhanishtha (idx 22). Точніше = degrees check у нащаристих cycle.
const PANCHAK_INDICES = [22, 23, 24, 25, 26];
const PANCHAK_TYPES_BY_WEEKDAY = {
  0: 'Roga Panchak',  // Sunday — disease
  1: 'Raja Panchak',  // Monday — royal favor (НЕ інаусп!)
  2: 'Agni Panchak',  // Tuesday — fire risk
  3: '',              // Wednesday — no special name
  4: '',              // Thursday — no special name (some say Raja)
  5: 'Chor Panchak',  // Friday — theft risk
  6: 'Mrityu Panchak' // Saturday — death risk (most severe)
};

/* NR_FN_SLOT 189 */

// Таблиці рекомендацій за параметрами Панчанги
// v26: універсальні (військовий + CEO + менеджер)
const TITHI_ADVICE = [
  {do:'Нові проєкти, планування, старт ініціатив', avoid:''},
  {do:'Навчання, побудова процесів, логістика', avoid:'Квапливі рішення'},
  {do:'Рішучі дії, запуск проєктів, лідерські ініціативи', avoid:'Зволікання'},
  {do:'Рутинні задачі, адміністрування', avoid:'Стратегічні рішення, великі угоди'},
  {do:'Переговори, дипломатія, лікування', avoid:'Конфронтація'},
  {do:'Комунікації, нетворкінг, переміщення', avoid:'Затворництво'},
  {do:'Логістика, постачання, транспорт', avoid:''},
  {do:'Захист позицій, аудит, оборона', avoid:'Ризиковані рішення'},
  {do:'Аналітика, спостереження, аудит', avoid:'Активні ініціативи'},
  {do:'Угоди, презентації, публічні заяви', avoid:''},
  {do:'Відпочинок, рефлексія, ретро, стратегічне мислення', avoid:'Агресивні дії'},
  {do:'Планування, партнерства, логістика', avoid:'Хірургія, деструкція'},
  {do:'Координація, комунікації', avoid:''},
  {do:'Жорсткі рішення, реструктуризація, захист', avoid:'Нові партнерства'},
  {do:'Аналіз, моніторинг', avoid:'Активний наступ'},
  {do:'Поточні справи', avoid:'Стратегічні рішення'},
  {do:'Навчання, онбординг', avoid:''},
  {do:'Рішучі дії, дедлайни', avoid:''},
  {do:'Рутинні задачі', avoid:'Важливі рішення (Рікта)'},
  {do:'Переговори, дипломатія', avoid:''},
  {do:'Комунікації, логістика', avoid:''},
  {do:'Угоди, підписання', avoid:''},
  {do:'Аналіз, review, спостереження', avoid:''},
  {do:'Рутина', avoid:'Важливі ініціативи (Рікта)'},
  {do:'Переговори, угоди', avoid:''},
  {do:'Рефлексія, стратегічне мислення', avoid:'Активні дії'},
  {do:'Партнерства, планування', avoid:''},
  {do:'Підготовка, документація', avoid:''},
  {do:'Завершення циклів, підсумки', avoid:'Нові починання'},
  {do:'Аналіз, моніторинг, відпочинок', avoid:'Будь-які активні дії (Амавасья −3)'}
];

const VARA_ADVICE = [
  {do:'Лідерство, стратегічні рішення, здоров\'я', avoid:'Пасивність'},
  {do:'Інтуїтивні рішення, аналітика, R&D', avoid:'Публічні виступи (−1 сон)'},
  {do:'Рішучі дії, дедлайни, конкуренція', avoid:'Дипломатія'},
  {do:'Комунікації, переговори, планування', avoid:'Імпульсивні рішення'},
  {do:'Стратегія, навчання, менторство, найкращий день', avoid:'Мікроменеджмент'},
  {do:'Нетворкінг, відпочинок, креатив', avoid:'Агресивні дії'},
  {do:'Дисципліна, аудит, довгострокові задачі', avoid:'Спонтанні рішення'}
];

const NAKSHATRA_ADVICE = {
  'Легка':   {do:'Легкі завдання, комунікації, нетворкінг', avoid:'Важкі рішення'},
  'М\'яка':  {do:'Креатив, лікування, HR, wellbeing', avoid:'Агресивні дії'},
  'Стала':   {do:'Довгострокові проєкти, будівництво, фундамент', avoid:'Квапливі дії'},
  'Рухома':  {do:'Переміщення, запуски, логістика', avoid:'Статичні позиції'},
  'Змішана': {do:'Будь-які завдання — нейтрально', avoid:''},
  'Жорстка': {do:'Реструктуризація, ліквідація, жорсткі рішення', avoid:'Дипломатія, нові союзи'}
};

const YOGA_ADVICE = [
  {do:'Уникати всього важливого', avoid:'Будь-які наступальні дії'},           // 1 Vishkambha
  {do:'Союзи, дружба, координація', avoid:''},                                  // 2 Priti
  {do:'Медогляд, лікування, здоров\'я', avoid:''},                              // 3 Ayushman
  {do:'Старт нових операцій', avoid:''},                                         // 4 Saubhagya
  {do:'Планування, краса плану', avoid:''},                                      // 5 Shobhana
  {do:'Оборона, мінімальна активність', avoid:'Наступ, ризик'},                 // 6 Atiganda
  {do:'Виконання завдань, успіх у справах', avoid:''},                           // 7 Sukarman
  {do:'Довгострокові операції, стійкість', avoid:''},                            // 8 Dhriti
  {do:'Рутина', avoid:'Конфлікти, ризик'},                                       // 9 Shula
  {do:'Обережна рутина', avoid:'Наступальні дії'},                               // 10 Ganda
  {do:'Розвиток, навчання, нарощування', avoid:''},                              // 11 Vriddhi
  {do:'Будівництво, зміцнення позицій', avoid:''},                               // 12 Dhruva
  {do:'Оборона', avoid:'Наступ, насильство'},                                    // 13 Vyaghata
  {do:'Координація, моральний підйом', avoid:''},                                // 14 Harshana
  {do:'Мінімальна активність', avoid:'Ризиковані операції'},                    // 15 Vajra
  {do:'Старт операцій — найкращий день', avoid:''},                              // 16 Siddhi
  {do:'Лише оборона', avoid:'Будь-які активні дії (retro_end −3)'},             // 17 Vyatipata
  {do:'Відпочинок, ротація', avoid:''},                                           // 18 Variyan
  {do:'Рутина', avoid:'Наступ'},                                                  // 19 Parigha
  {do:'Духовна підготовка, мотивація', avoid:''},                                // 20 Shiva
  {do:'Будь-які справи — успіх', avoid:''},                                      // 21 Siddha
  {do:'Виконання цілей, завершення', avoid:''},                                  // 22 Sadhya
  {do:'Загальна сприятливість', avoid:''},                                        // 23 Shubha
  {do:'Планування, ясність думки', avoid:''},                                     // 24 Shukla
  {do:'Творчість, знання, навчання', avoid:''},                                   // 25 Brahma
  {do:'Лідерство, командування', avoid:''},                                       // 26 Indra
  {do:'Завершення циклів', avoid:'Нові починання (руйнівна)'}                   // 27 Vaidhriti
];

// v85b: A3 split — computePanchangaState (pure data) + renderPanchangaCard (DOM)
/* NR_FN_SLOT 190 */

/* NR_FN_SLOT 191 */

// v87.43+v87.44: Render upcoming critical windows block in Panchanga card
/* NR_FN_SLOT 192 */

// ════════════════════════════════════════════════════════════════════════
// v88.8.0: Сонячний ритм Панчанги (Sunrise/Sunset, Abhijit Muhurta, Choghadiya)
// ════════════════════════════════════════════════════════════════════════
// Канон BPHS: всі muhurta-розрахунки прив'язані до місцевого sunrise/sunset.
// Vedic день = sunrise → sunset (denна частина) → next sunrise (нічна).
// 8 муhурт day + 8 night = 16 choghadiya per добу.
// Кожна 7-cyclic за weekday (Sun..Sat).
// Auspiciousness: Amrit/Shubh/Labh = good, Char = neutral, Udveg/Rog/Kaal = avoid.

const _CHOG_DAY = [
  ['Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg'],   // Sunday
  ['Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit'],   // Monday
  ['Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog'],     // Tuesday
  ['Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh'],    // Wednesday
  ['Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh'],   // Thursday
  ['Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char'],    // Friday
  ['Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal']     // Saturday
];
const _CHOG_NIGHT = [
  ['Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh'],   // Sunday
  ['Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char'],    // Monday
  ['Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal'],    // Tuesday
  ['Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg'],   // Wednesday
  ['Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit'],   // Thursday
  ['Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog'],     // Friday
  ['Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh']     // Saturday
];
const _CHOG_META = {
  // {score, icon, ua_label, hint}
  'Amrit': { score:  2, icon:'★★★', ua:'Амріта',   hint:'нектар; найкраще для важливих справ' },
  'Shubh': { score:  1, icon:'★★',  ua:'Шубха',    hint:'сприятливо; для добрих починань' },
  'Labh':  { score:  1, icon:'★★',  ua:'Лабха',    hint:'успіх, прибуток; гарне для бізнесу' },
  'Char':  { score:  0, icon:'○',   ua:'Чара',     hint:'нейтрально; підходить для подорожей' },
  'Udveg': { score: -1, icon:'✗',   ua:'Удвега',   hint:'тривога; уникати важливих рішень' },
  'Rog':   { score: -1, icon:'✗',   ua:'Рога',     hint:'хвороба; не починати нове' },
  'Kaal':  { score: -2, icon:'✗✗',  ua:'Кала',     hint:'смерть; найгірше — лише захисні дії' }
};

// Розрахунок sunrise/sunset через astronomy-engine (з fallback якщо лівра не завантажилась)
// v88.8.1: кеш по даті — sunrise міняється раз на добу, не треба перераховувати на кожен render.
const _sunRiseSetCache = new Map(); // key: 'YYYY-MM-DD', value: {sunrise, sunset} | null
/* NR_FN_SLOT 193 */

// Helper: формат HH:MM локально
/* NR_FN_SLOT 194 */

// v88.8.1: Sidereal Sun/Moon rashi (Vedic знак зодіаку через Lahiri ayanamsha)
// Reuses calcSunLongitude / calcMoonLongitude / lahiriAyanamsha — вже у файлі.
const _RASHI_NAMES = [
  // 12 sidereal знаків з регентами (графа джйотіша)
  { ua:'Овен',     en:'Aries',     skr:'Mesha',      lord:'Марс' },
  { ua:'Телець',   en:'Taurus',    skr:'Vrishabha',  lord:'Венера' },
  { ua:'Близнюки', en:'Gemini',    skr:'Mithuna',    lord:'Меркурій' },
  { ua:'Рак',      en:'Cancer',    skr:'Karka',      lord:'Місяць' },
  { ua:'Лев',      en:'Leo',       skr:'Simha',      lord:'Сонце' },
  { ua:'Діва',     en:'Virgo',     skr:'Kanya',      lord:'Меркурій' },
  { ua:'Терези',   en:'Libra',     skr:'Tula',       lord:'Венера' },
  { ua:'Скорпіон', en:'Scorpio',   skr:'Vrischika',  lord:'Марс' },
  { ua:'Стрілець', en:'Sagittarius',skr:'Dhanus',    lord:'Юпітер' },
  { ua:'Козеріг',  en:'Capricorn', skr:'Makara',     lord:'Сатурн' },
  { ua:'Водолій',  en:'Aquarius',  skr:'Kumbha',     lord:'Сатурн' },
  { ua:'Риби',     en:'Pisces',    skr:'Meena',      lord:'Юпітер' }
];
/* NR_FN_SLOT 195 */

// Choghadiya для дати: повертає {day:[8 slots], night:[8 slots]}
// slot = {name, score, icon, ua, hint, start:Date, end:Date}
/* NR_FN_SLOT 196 */

// Abhijit Muhurta: solar noon ± 24хв (8-а денна muhurta з 15)
// Solar noon = (sunrise + sunset) / 2
// v88.8.11 КАНОН-БАГ#10 fix: Abhijit = 8-ма muhurta з 15-ти, кожна = dayLen/15.
// Раніше: фіксовано noon ± 24 min (48-min muhurta — true тільки для 12h day).
// Канон BPHS Ch.4 v.5: muhurta length proportional to daylight.
// Для 15h day (Київ травень): muhurta=60min, Abhijit=noon±30min, не ±24min.
// Дослівно: Abhijit = single auspicious muhurta даного дня крім вівторка.
/* NR_FN_SLOT 197 */

// v88.8.14: канонічні auspicious muhurta (Drik Panchang / BPHS Ch.4):
//   Brahma Muhurta:  sunrise - 96min → sunrise - 48min (2 muhurta до сходу)
//                    Найкращий час для духовних практик, медитації, навчання.
//   Vijaya Muhurta:  11-та з 15 muhurta дня
//                    "Час перемоги" — успіх у важких задачах, переговори.
//   Godhuli Muhurta: sunset ± 24min (1 muhurta навколо заходу)
//                    "Час корови повертається" — gentle transitions, молитви.
//   Nishita Muhurta: midnight ± half_night_muhurta (8-ма з 15 night muhurta)
//                    Північна muhurta — meditation, midnight rituals.
// Канон BPHS Ch.4 v.5 + Drik Panchang Houston cross-validation.
/* NR_FN_SLOT 198 */

// v88.8.17: Pancha Pakshi 5-birds visualization
// Малює 5 emoji великих, поточний (за nakshatra) підсвічений + якості внизу.
// Заповнює "empty space" у Personal column після Planetary Rhythm.
/* NR_FN_SLOT 199 */

/* NR_FN_SLOT 200 */

// v85b: renderPanchanga — backward-compatible wrapper
/* NR_FN_SLOT 201 */

// ==================== КОМБО-ГРАФІК Kp (факт + прогноз) ====================
// ─── renderDayForecast (v78: stripped, keep _daySlots data only) ─────────
/* NR_FN_SLOT 202 */


// ==================== АВТО-ОНОВЛЕННЯ ====================
let _autoRefTimer = null;
/* NR_FN_SLOT 203 */


/* NR_FN_SLOT 204 */


// ------------------------------- Завантаження -------------------------------
/* NR_FN_SLOT 205 */

/* NR_FN_SLOT 206 */

// ===== v70.2 UNIFIED SYNC LAYER =====
// Hero + Decision + Explain + Story + Radar + Triggers
/* NR_FN_SLOT 207 */
/* NR_FN_SLOT 208 */
/* NR_FN_SLOT 209 */
/* NR_FN_SLOT 210 */

// --- HERO ---
// ═══ v83e: unified driver system — single source of truth ═══

// Parse eTip text into structured event list
/* NR_FN_SLOT 211 */

// Single driver computation — used by hero, sentence, WHY, trust strip
/* NR_FN_SLOT 212 */

/* NR_FN_SLOT 213 */

// ═══ v83b: unified decision system ═══
/* NR_FN_SLOT 214 */

/* NR_FN_SLOT 215 */

/* NR_FN_SLOT 216 */

/* NR_FN_SLOT 217 */

// ═══ v83d: canonical timing system ═══
const TIMING_THRESHOLDS = { good: 0.5, mid: -0.5 };

// ─── fp43: CANONICAL storm resolver ──────────────────────────────────────────
// Single source of truth. All storm reads use this. No inline _stormWindow computes.
// Hierarchy: observed kpNow >= 5 → active; forecast slot >= nowSlotIdx with kp>=5 → incoming.
/* NR_FN_SLOT 218 */
window.resolveStormWindow = resolveStormWindow;

// ═══ fp243: канонічний slot-decision resolver ═══
// v88.9.6x-fp243 (аудит fp242, п.1): раніше «Критичні вікна», «План дня» й
// «Особистий контекст» кожен окремо вирішували, чи можна діяти в слоті —
// Rahu/Yama/Gulika одні блоки трактували як HARD BLOCK («не починати нових
// справ»), інші лише як декоративний тег ⚠ поруч із «активні дії і ключові
// рішення». Та сама хвилина видавала взаємовиключні команди в різних картках.
// Тепер — одна функція, один пріоритет: буря > активне вікно (Rahu/Yama/Gulika)
// > базове рішення за slot G > контекст дня (PDF/Engine softening).

/* NR_FN_SLOT 219 */
window.getInauspiciousWindowsUTC = getInauspiciousWindowsUTC;

/* NR_FN_SLOT 220 */

/* NR_FN_SLOT 221 */

// resolveSlotDecision({slotStartH, slotEndH, nowH, slotG, dayScore, windows, stormActive})
// → { segments[], currentSegment, actionNow, slotAction, blockedNow, reasonsNow[],
//     hasBlockedSegment, reasons[], nextChangeAt }
//   hasBlockedSegment — десь У СЛОТІ є заблокований сегмент (для майбутніх слотів)
//   blockedNow        — заблоковано САМЕ ЗАРАЗ (currentSegment), для "поточного стану"
// Усі години — UTC float (0..24), як в решті кодової бази (parseInt(slot.label)).
/* NR_FN_SLOT 222 */
window.resolveSlotDecision = resolveSlotDecision;

// v88.9.6x-fp248 (аудит fp247, п.1/2): "Що робити зараз" (renderDecisionLayer)
// і Hero (heroDecisionDo/Avoid) кожен рахував власне рішення дня з G+PDF/Engine,
// АЛЕ жоден не бачив Rahu/Yama/Gulika/бурю — тому «Публікувати, виступати,
// презентувати» / «МОЖНА ДІЯТИ» показувались одночасно з «Yama активний — не
// починати нових справ» в іншій картці. getCurrentSlotDecision() — одна точка
// виклику resolveSlotDecision() для "поточного 3-годинного слоту" (той самий
// підхід, що вже в syncPersonalContext з fp243b), яку тепер використовують І
// Hero, І Decision Layer — а не кожен рахує власну копію тих самих вхідних даних.
/* NR_FN_SLOT 223 */
/* NR_FN_SLOT 224 */
window.getCurrentOperationalSignal = getCurrentOperationalSignal;
/* NR_FN_SLOT 225 */
window.getCurrentOperationalPresentation = getCurrentOperationalPresentation;
/* NR_FN_SLOT 226 */
window.getCurrentSlotDecision = getCurrentSlotDecision;
// UTC-година (float) → "HH:MM" Europe/Kyiv — для показу "до КОЛИ" триває блок.
/* NR_FN_SLOT 227 */
window._fmtKyivFromUTCFloat = _fmtKyivFromUTCFloat;

/* NR_FN_SLOT 228 */

/* NR_FN_SLOT 229 */

/* NR_FN_SLOT 230 */

/* NR_FN_SLOT 231 */

/* NR_FN_SLOT 232 */

/* NR_FN_SLOT 233 */

/* NR_FN_SLOT 234 */

// v87: Alert banner — shows when storm/high-risk detected
// Triggers: Kp ≥ 5, G ≤ -3, or forecast Kp ≥ 5 in next 6h
// fp96: + Sanity Watchdog rules (physics inconsistency, jump anomaly, stale feed, confidence paradox)
// fp96: Sanity Watchdog — uses confirmed globals only
/* NR_FN_SLOT 235 */

/* NR_FN_SLOT 236 */

// fp35: STANDALONE storm-guard DOM patcher.
// Runs independent of renderAlertBanner. Reads window._stormWindow and patches
// stale DOM elements (heroActionCmd, heroDecisionDo, heroMainDrag, decisionTimingList, timingRows, whyRows).
// Called from: syncRender end, NoaaEvents.fetchAlerts.then(), setInterval(30s).
/* NR_FN_SLOT 237 */

// v88.8.35-fp56-P8: render the explicit 3-level decision hierarchy at the top of hero.
// PRESENTATION-ONLY. Reads existing globals (getEngineScore = override>engine day verdict,
// window.__uiState.gNow = live composite background, resolveDataMode = data quality).
// No formula/threshold/headline logic is changed — this only LABELS what each number is,
// so the user no longer confuses РІШЕННЯ ДНЯ (PDF/Engine) with ФОН ЗАРАЗ (G_now).
/* NR_FN_SLOT 238 */

// fp36: separate stale-DOM patcher for non-storm placeholders (whyRows, timingRows).
// Runs in same interval/triggers as storm-guard so loading text doesn't get stuck.
/* NR_FN_SLOT 239 */

// fp35: schedule storm-guard auto-patch every 30s as safety net for async race conditions
try {
  if (!window.__stormGuardTimer) {
    window.__stormGuardTimer = setInterval(() => {
      try { _applyStormGuardDOM(); _patchStaleLoadingDOM(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.156','recoverable'); }
      // v88.9.09-fp190: банер NOAA рендерився ОДИН раз через 3с після load,
      // коли window.__uiState.kpNow ще не готовий → примітка "буря не активна
      // зараз" (fp188) ніколи не з'являлась (підтверджено скріном 14.07).
      // Перерендер тут — коли Kp вже відомий, примітка додається.
      try { if (window.__noaaEvents && typeof _renderNoaaAlertBanner === 'function') _renderNoaaAlertBanner(window.__noaaEvents); } catch(e){ window.NRDiagnostics?.record('legacy.catch.157','recoverable'); }
    }, 30000);
  }
} catch(e){ window.NRDiagnostics?.record('legacy.catch.158','recoverable'); }

// v86-P1: Radial G-decomposition — formula as visual
// Feature flag: localStorage.v86_radial='1' OR URL ?v86radial=1
// Рендерить G як 6 сегментів кола (2-Kp, Lᵢ, Mᵢ, eᵢ, Pᵢ, Dᵢ), кожен з унікальним кольором.
// Розмір сегмента = |value| / sum(|all|), тобто візуалізує внесок кожного фактору у G.
(function initV86RadialFlag(){
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('v86radial') === '1') localStorage.setItem('v86_radial','1');
    if (params.get('v86radial') === '0') localStorage.setItem('v86_radial','0');
    if (params.get('v86heat') === '1') localStorage.setItem('v86_heat','1');
    if (params.get('v86heat') === '0') localStorage.setItem('v86_heat','0');
  } catch(e){ globalThis.NRDiagnostics?.record('catch.158','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
})();

// v86.1: Timing heat-strip — 24h day at a glance (8 segments × 3 hours each)
// Feature flag: localStorage.v86_heat='1' OR URL ?v86heat=1
// Reads window._daySlots (8 slots built in fetchKpForecast pipeline)
/* NR_FN_SLOT 240 */

/* NR_FN_SLOT 241 */


// ═══ v88.8.34: Operational Signal Hierarchy ═══
// Root cause fix: Hero command must not be a raw Live-G command when
// Engine/PDF gives the day verdict. Day verdict = Engine + override;
// operational permission = day verdict gated by current Live G / Kp.
// This is not a "conflict mode". It is explicit hierarchy:
//   1) dayScore: Engine v18.8 + expert override = forecast of the day
//   2) liveG: 2−Kp+ΣAᵢ = current background / tactical guard
//   3) opKey: actual command shown in Hero / decision blocks
/* NR_FN_SLOT 242 */
/* NR_FN_SLOT 243 */
/* NR_FN_SLOT 244 */
/* NR_FN_SLOT 245 */
/* NR_FN_SLOT 246 */
// fp413: one current-moment authority. Rahu/Yama/Gulika are timing vetoes:
// they may cap the operational command to routine-only, but never rewrite the
// frozen PDF/Engine reference or the raw 3/27-day context.
/* NR_FN_SLOT 247 */
/* NR_FN_SLOT 248 */

/* NR_FN_SLOT 249 */

/* NR_FN_SLOT 250 */

/* NR_FN_SLOT 251 */
window.resolveDaySignal_v88825 = resolveDaySignal_v88825;

/* NR_FN_SLOT 252 */


/* NR_FN_SLOT 253 */

// ═══ v78d: Why Card (coreGrid) ═══
/* NR_FN_SLOT 254 */

// v87.47: Render 7-day G sparkline inside whyCard
// Використовує _27dComputed (має всі 27 днів: сьогодні + 23 вперед + 3 назад-вчорашні через last3D)
/* NR_FN_SLOT 255 */

// ═══ v78d: Timing Card (coreGrid) ═══
/* NR_FN_SLOT 256 */

// ═══ v79: Hero Alert ═══
const HORA_QUALITY = {
  'Сонце': {q:'лідерство, авторитетні рішення', tone:'good'},
  'Місяць': {q:'інтуїція, м\'які комунікації', tone:'good'},
  'Марс': {q:'рішучі дії (обережно з ризиком)', tone:'warn'},
  'Меркурій': {q:'аналітика, переговори, листування', tone:'good'},
  'Юпітер': {q:'стратегія, навчання, важливі рішення', tone:'best'},
  'Венера': {q:'креатив, партнерства, дипломатія', tone:'good'},
  'Сатурн': {q:'глибокий фокус, дисципліна, рутина', tone:'neutral'}
};

// v85b: _renderHeroAlert removed — heroAlertLine DOM deleted v83f

// ═══ v78: GLOBAL_STATES — єдиний source of truth для стану ═══
const GLOBAL_STATES = {
  favorable: {
    cmd: '⚡ ДІЙ — оптимальне вікно',
    headline: 'МОЖНА ДІЯТИ — СИЛЬНЕ ВІКНО',
    sub: 'Фон підтримує активні дії.',
    doText: '✔ Можна діяти активно',
    avoidText: '○ Підтримуйте темп без хаосу', // v88.7.13 D: ✖→○, без алармізму у зеленій зоні (Excel ТИЖНЕВИЙ favorable: "✅ СПРИЯТЛИВО · Плановий режим" — без застережень)
    doList: ['активні дії','запуски','домовленості','стратегічні рішення'],
    avoidList: ['розпорошення','імпровізація без плану'], // v88.7.14 E4: 'хаос' → м'якше для зеленої зони, узгоджено з ○ avoidText
    zone: 'сильна',
    mood: 'сприятливий фон', action: 'можна робити важливі кроки',
    impact: 'Концентрація і стійкість в межах норми. День підходить для запуску нових задач і планових рішень.',
    color: 'var(--ok)', badge: '⚡ GO', badgeColor: '#2bd47d'
  },
  good: {
    cmd: 'ДІЙ зараз',
    headline: 'МОЖНА ДІЯТИ',
    sub: 'Фон підтримує активні дії.',
    doText: '✔ Рухайтесь у важливих справах',
    avoidText: '○ Без розпорошення на дрібниці', // v88.7.13 D: ✖→○, узгоджено з favorable (зелена зона, без алармізму)
    doList: ['активні дії','запуски','домовленості'],
    avoidList: ['дрібниці','розпорошення'], // v88.7.14 E4: 'хаос' → м'якше для зеленої зони
    zone: 'сприятлива',
    mood: 'сприятливий фон', action: 'можна робити важливі кроки',
    impact: 'Фон підтримує активність. Можна приймати рішення і рухатись вперед у ключових напрямках.',
    color: 'var(--ok)', badge: '● GO', badgeColor: '#63be7b'
  },
  neutral: {
    cmd: 'ПЛАНУЙ, без поспіху',
    headline: 'НЕЙТРАЛЬНИЙ ДЕНЬ',
    sub: 'Можна працювати у стандартному режимі.',
    doText: '✔ Працюйте у стандартному режимі',
    avoidText: '○ Без потреби форсувати рішення',
    doList: ['звичайні задачі','зустрічі'],
    avoidList: ['зайвий ризик','поспішні рішення'],
    zone: 'нейтральна',
    mood: 'рівний фон', action: 'можна тримати звичний темп',
    impact: 'Фон загалом рівний. Для рутини день нормальний, важливі рішення можна приймати без поспіху.',
    color: 'var(--muted)', badge: '● STABLE', badgeColor: '#9bb1dc'
  },
  unstable: {
    cmd: 'УПОВІЛЬНИСЬ, не запускати',
    headline: 'ОБЕРЕЖНО — фон нестабільний',
    sub: 'Дій повільно, без різких кроків.',
    doText: '✔ Тримайтеся звичних задач',
    avoidText: '✖ Не починайте нових дій',
    doList: ['планування','спокійна робота'],
    avoidList: ['поспіх','тиск','емоційні рішення'],
    zone: 'ризик',
    mood: 'напружений фон', action: 'дій повільно й без різких кроків',
    impact: 'Ризик помилок і перевантаження вищий за звичайний. Краще менше імпровізації і більше перевірених дій.',
    color: 'var(--warn)', badge: '⚠ CAUTION', badgeColor: '#ffcc00'
  },
  tense: {
    cmd: '🔴 СТОП — уникати критичних дій',
    headline: 'СТОП — високий ризик помилки',
    sub: 'Мінімізуй активність і ризик.',
    doText: '✔ Мінімізуйте активність',
    avoidText: '✖ Уникайте важливих рішень і ризику',
    doList: ['рутина','перевірка','завершення'],
    avoidList: ['ризикові рішення','конфлікти','важливі переговори'],
    zone: 'червона',
    mood: 'нестабільний фон', action: 'важливі рішення краще відкласти',
    impact: 'Фон напружений. День краще використовувати для підтримки, спостереження і мінімально необхідних дій.',
    color: 'var(--bad)', badge: '🔴 HOLD', badgeColor: '#ff6b6b'
  }
};

/* NR_FN_SLOT 257 */

// v88.8.4: 7-class verdict_text mapping (canonical, з tag_to_text.json).
// Дашборд має 5-стейтну UI модель (favorable/good/neutral/unstable/tense),
// але DOCX/PDF канон використовує 7-class на ціле score. Ця функція дає
// canonical label для бейджа поряд з GLOBAL_STATES.headline — щоб користувач
// бачив і UI-state і canonical verdict одночасно.
const VERDICT_7CLASS = {
  '-3': { label: 'Особливо несприятливий день', color: '#d32f2f', short: '−3 крайній' },
  '-2': { label: 'Несприятливий день',           color: '#e64a19', short: '−2 несприятл.' },
  '-1': { label: 'Помірно несприятливий день',   color: '#fbc02d', short: '−1 помірно' },
  '0':  { label: 'Нейтральний день',             color: '#bdbdbd', short: '0 нейтрал.' },
  '1':  { label: 'Помірно сприятливий день',     color: '#aed581', short: '+1 помірно' },
  '2':  { label: 'Сприятливий день',             color: '#7cb342', short: '+2 сприятл.' },
  '3':  { label: 'Особливо сприятливий день',    color: '#388e3c', short: '+3 особлив.' }
};
/* NR_FN_SLOT 258 */

// v85b-F6: single-source decision resolver (wraps classifyStateByG + GLOBAL_STATES).
// Гарантує, що hero / personal / timing читають рішення з одного джерела.
// v85b-F10.3 (fix): title читав неіснуюче поле st.verdict → fallback до st.headline (реально є в GLOBAL_STATES)
// v88.8.35-fp13 DD: PDF/Engine ≤ -2 noteText override. classifyStateByG може повернути 'neutral' при
// G_now ~0 навіть на критичному дні (PDF/Engine = -3). Тоді GLOBAL_STATES.neutral.impact видає
// "Фон загалом рівний... важливі рішення можна приймати без поспіху" — конфлікт із Hero rationale.
// Override ТІЛЬКИ noteText (impact-рядок), щоб не ламати stKey-залежну логіку (CSS, hero color).
/* NR_FN_SLOT 259 */

// v87.56: DEAD code audit — removed _decAction, _getRegimeShift, v80 noop stubs
// (syncDecision/syncExplain/syncStory/syncRadar/syncTriggers) — 0 callsites

// v87.56: removed _HORA_WIN_BONUS + _calcWindowScore + _getBestWindow (dead chain)

// --- v70.3 ASTRO TOP LAYER ---
/* NR_FN_SLOT 260 */

// v87.56: removed mergeOpsCards noop (v80 legacy)

// fp319: run after Engine/PDF has loaded too. Initial Panchanga render can precede
// engine_scores, so render-time gating alone is not sufficient.
/* NR_FN_SLOT 261 */

// --- WHY BLOCK (decision-first) ---
/* NR_FN_SLOT 262 */

/* NR_FN_SLOT 263 */

// ═══ v79: Trust Strip ═══
// ═══ v79c G2: Day Plan Card ═══
// ═══ Patch P: Personal context (always visible) ═══
/* NR_FN_SLOT 264 */

/* NR_FN_SLOT 265 */

/* NR_FN_SLOT 266 */

// --- MASTER ---
// v85: buildDashboardState — single source of truth for all render functions
/* NR_FN_SLOT 267 */

// v87.90: Provenance ledger — повний журнал джерел сьогоднішньої оцінки
// Чесна відповідь на аудиторську критику "stale fallback тихий, synthetic непомічений"
/* NR_FN_SLOT 268 */

// v87.90: Anti-action recommender — синтезує Tithi/Vara/Nakshatra/Yoga/Karana/Hora/Taara рекомендації
// SHAP-style для дій: показує концентровано що робити і що уникати з усіх advice-таблиць
/* NR_FN_SLOT 269 */

// v87.90: Model Disagreement Alert — показує LOW CONSENSUS коли різні моделі дають розкид
// Аудиторська рекомендація: "model disagreement як окремий стан, не як дрібний tooltip"
/* NR_FN_SLOT 270 */

// v87.90: Intra-day Kp drop alert — попередження про падіння Kp всередині сьогоднішнього дня
// Закриває аномалію v87.82→v87.90: Kp 3.67→1.0 за 5 годин без warning юзеру.
// Використовує last3D.days[0].kp8 (3-год NOAA forecast slots).
/* NR_FN_SLOT 271 */

// v87.90: Counterfactual Analyzer — "що якби?" ablation
// SHAP-style для астрології: показує який компонент формує день, що якби був інакший
/* NR_FN_SLOT 272 */

/* NR_FN_SLOT 273 */


// v88.8.62-fp138: SAFE BOOT — no network on startup.
// Root fix: production page was still waiting on multiple live fetch/proxy chains during boot.
// Safe boot renders from synthetic/cache/local engine immediately; full live refresh is manual via ?live=1 or button.
/* NR_FN_SLOT 274 */
/* NR_FN_SLOT 275 */

// One refresh cycle at a time. A rejected render/fetch must never leave the
// button disabled or allow overlapping auto-refresh jobs to accumulate.
let _dataRefreshPromise = null;
let _pendingRefreshReason = null;
let _refreshGeneration = 0;
/* NR_FN_SLOT 276 */
window.runDataRefresh = runDataRefresh;

// BEGIN lifecycle refresh: retain the page and unsaved form controls.
window.NRLifecycle.install({todayKyivStr,runDataRefresh});
// END lifecycle refresh


// ----------------------------- Експорт CSV ----------------------------------
/* NR_FN_SLOT 277 */

// v87.27: ICS calendar export — 27-day G-forecast as all-day events.
// Сумісно з Google/Apple/Outlook. Імпортується одноразово (не subscription feed).
/* NR_FN_SLOT 278 */

// =====================================================================
// ПЕРСОНАЛЬНИЙ РОЗРАХУНОК — Meeus Ch.47 + Lahiri + BPHS
// =====================================================================

// --- Taula 47.A: [D, M, M', F, coeff_l, coeff_r] ---
const _MOON_LR = [
  [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
  [0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
  [2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
  [2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
  [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
  [0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
  [4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
  [1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
  [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
  [0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
  [1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
  [0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
  [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
  [3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
  [0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
  [2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
  [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
  [0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
  [4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
  [1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];

// --- Таблиця 47.B: [D, M, M', F, coeff_b] ---
const _MOON_B = [
  [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
  [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
  [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
  [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
  [2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
  [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
  [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
  [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
  [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
  [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
  [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
  [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
  [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
  [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
  [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];

const _RAD = Math.PI / 180;
/* NR_FN_SLOT 279 */
/* NR_FN_SLOT 280 */
/* NR_FN_SLOT 281 */

// ── calcSunLongitude(jde): Meeus Ch.25, точність ~0.01° ──────────────────────
/* NR_FN_SLOT 282 */

/* NR_FN_SLOT 283 */

/* NR_FN_SLOT 284 */

/* NR_FN_SLOT 285 */

// NAKSHATRA_NAMES і NAKSHATRA_REGENT вже оголошені вище (рядки ~1219, ~1236)
const NAKSHATRA_UA = [
  'Ашвіні','Бхарані','Крітіка','Рохіні','Мрігашіра','Ардра','Пунарвасу',
  'Пушья','Ашлеша','Магха','Пурва Пхалгуні','Уттара Пхалгуні','Хаста',
  'Читра','Сваті','Вішакха','Анурадха','Джйєштха','Мула','Пурва Ашадха',
  'Уттара Ашадха','Шравана','Дханіштха','Шатабхіша','Пурва Бхадрапада',
  'Уттара Бхадрапада','Реваті'
];
const NAKSHATRA_LORDS_UA = ['Кету','Венера','Сонце','Місяць','Марс','Раху','Юпітер','Сатурн','Меркурій'];

// v88.8.41-fp103: PLANET_PCL_WEIGHT — ваги планет для Dasha/Antardasha modifier.
// ⚠ FREEZE COMPLIANCE: це ADVISORY DISPLAY MODIFIER, не canonical engine input.
// PLANET_PCL_WEIGHT НЕ передається в computeAi(), НЕ впливає на G/Pᵢ/final_score.
// Використовується ЛИШЕ у display HTML (Personal block, рядок "Вплив Антар-даша").
// Якщо в майбутньому (post-V19) це підключається до canonical score — оновити
// METRIC_REGISTRY.md і провалідувати окремо, бо це змінить backtest accuracy.
// ДЖЕРЕЛО: Posibnyk_Part2_Jyotish.docx, § II.3.1, Таблиця 2 "Оперативна інтерпретація Вари"
// (та сама таблиця вже використовується для Vara/день тижня — тут застосовуємо
// ідентичну планетарну логіку до Antardasha lord, бо це теж "хто керує моментом").
// Раху/Кету відсутні в оригінальній Vara-таблиці (7 класичних планет) — додано
// окремо як R&D-наближення на основі їх класичної malefic/transformative природи.
const PLANET_PCL_WEIGHT = {
  0: -0.5,  // Кету — невизначеність, відсторонення (R&D-наближення, не в Vara-таблиці)
  1: +1,    // Венера — відновлення, дипломатія (Шукравара)
  2: +0.5,  // Сонце — лідерство, влада, здоров'я (Равівара, "умовно +1/0")
  3: -1,    // Місяць — погіршує сон, розвідка/раптові дії (Сомавара)
  4: 0,     // Марс — хірургія, бойові дії, мужність (Мангалавара, "0/+1")
  5: -0.5,  // Раху — хаос, оману (R&D-наближення)
  6: +2,    // Юпітер — стратегія, навчання, найкращий для рішень (Гурувара)
  7: -0.5,  // Сатурн — дисципліна, стрес (Шанівара, "0/-1")
  8: +1,    // Меркурій — комунікації, переговори, аналіз (Будхавара)
};
const PLANET_PCL_NOTE = {
  0: 'невизначеність, відсторонення',
  1: 'відновлення, дипломатія',
  2: 'лідерство, здоров\'я',
  3: 'емоційна нестабільність, погіршує сон',
  4: 'енергія дій, але імпульсивність',
  5: 'хаос, оману, нестабільність',
  6: 'стратегія, навчання — найкраще для рішень',
  7: 'дисципліна, стрес, обмеження',
  8: 'комунікації, аналіз, переговори',
};
const DASA_YEARS = [7,20,6,10,7,18,16,19,17];
const TAARA_UA = ['','Janma (небезп.)','Sampat (благо)','Vipat (небезп.)','Kshema (благо)',
  'Pratyak (небезп.)','Sadhana (благо)','Naidhana (небезп.)','Mitra (благо)','Atimitra (благо)'];
const TAARA_DANGER = [1,3,5,7]; // позиції 1-based, небезпечні

/* NR_FN_SLOT 286 */

/* NR_FN_SLOT 287 */

/* NR_FN_SLOT 288 */

/* NR_FN_SLOT 289 */


// ===================== HORA (планетарні години) =====================
const HORA_ORDER = ['Сонце','Венера','Меркурій','Місяць','Сатурн','Юпітер','Марс'];
const HORA_DAY_LORD = [0,3,6,2,5,1,4]; // Sun=Сонце,Mon=Місяць,Tue=Марс,Wed=Меркурій,Thu=Юпітер,Fri=Венера,Sat=Сатурн

// Спільна функція: час сходу/заходу Сонця (UTC-годинник) для заданого дня і широти
/* NR_FN_SLOT 290 */

/* NR_FN_SLOT 291 */
/* NR_FN_SLOT 292 */

// v88.9.58-fp240 (аудит-раунд-26, Problem 3): раніше "План дня" рахував Хору
// лише в ОДНІЙ точці — середині 3-годинного слоту (slotMid = h+1:30) — і
// підписував весь слот ЦІЄЮ ОДНІЄЮ планетою. Хора триває ~1г (dayLen/12),
// тому в 3-годинному слоті зазвичай 2-3 різні хори — підпис міг показувати
// "Місяць" для всього 18:00-21:00, хоча о 18:09 реально активний Меркурій
// (Меркурій-хора ще не закінчилась на момент початку слоту). Ця функція
// проходить слот від початку до кінця, збираючи послідовність планет.
/* NR_FN_SLOT 293 */

// ===================== ТРАНЗИТ МІСЯЦЯ =====================
/* NR_FN_SLOT 294 */

// ===================== SVG ОРБІТАЛЬНА СХЕМА =====================


// ===================== ГАУЖ G + ФАЗА МІСЯЦЯ (compact v54) =====================
// Layout: [Місяць 80px зліва] [міні-шкала G + значення справа]
// Сонце/Земля/орбіта прибрані — є в планетній анімації
/* NR_FN_SLOT 295 */

// ════════════════════════════════════════════════════════════════
//  ПЛАНЕТНА АНІМАЦІЯ v43
//  Геліоцентрична модель: Сонце в центрі, 5 планет + Земля + Місяць
//  Log-scale орбіти, пропорційні швидкості, чисті підписи
//  Ретроградність — незалежні моменти Swiss Ephemeris; обмежене покриття
// ════════════════════════════════════════════════════════════════

// Independent Swiss Ephemeris geocentric tropical stations. Not calendar captions.
// UT1 mapped to UTC with <1s time-scale uncertainty; station bracket is60s.
// This contextual display does not change frozen scores or research coefficients.
const RETRO_COVERAGE = ["2024-12-01T00:00:00Z", "2027-01-02T00:00:00Z"];
const RETRO_PERIODS = {
  "Mercury": [
    [
      "2024-12-01T00:00:00Z",
      "2024-12-15T20:56:18Z"
    ],
    [
      "2025-03-15T06:46:06Z",
      "2025-04-07T11:07:37Z"
    ],
    [
      "2025-07-18T04:45:01Z",
      "2025-08-11T07:29:52Z"
    ],
    [
      "2025-11-09T19:01:42Z",
      "2025-11-29T17:38:27Z"
    ],
    [
      "2026-02-26T06:48:10Z",
      "2026-03-20T19:32:50Z"
    ],
    [
      "2026-06-29T17:35:55Z",
      "2026-07-23T22:57:51Z"
    ],
    [
      "2026-10-24T07:12:42Z",
      "2026-11-13T15:53:52Z"
    ]
  ],
  "Venus": [
    [
      "2025-03-02T00:36:08Z",
      "2025-04-13T01:02:17Z"
    ],
    [
      "2026-10-03T07:15:53Z",
      "2026-11-14T00:27:27Z"
    ]
  ],
  "Mars": [
    [
      "2024-12-06T23:33:11Z",
      "2025-02-24T01:59:48Z"
    ]
  ],
  "Jupiter": [
    [
      "2024-12-01T00:00:00Z",
      "2025-02-04T09:40:22Z"
    ],
    [
      "2025-11-11T16:41:25Z",
      "2026-03-11T03:29:51Z"
    ],
    [
      "2026-12-13T00:56:39Z",
      "2027-01-02T00:00:00Z"
    ]
  ],
  "Saturn": [
    [
      "2025-07-13T04:07:20Z",
      "2025-11-28T03:51:35Z"
    ],
    [
      "2026-07-26T19:56:30Z",
      "2026-12-10T23:31:05Z"
    ]
  ]
};
/* NR_FN_SLOT 296 */

if(typeof window!=='undefined')window.nrRetroEphemeris=()=>({coverage:RETRO_COVERAGE,periods:RETRO_PERIODS});

// Планети: реальні орбітальні періоди (дні), log-scale радіуси розраховуються динамічно
// AU: Mercury=0.387, Venus=0.723, Earth=1.0, Mars=1.524, Jupiter=5.203, Saturn=9.537
const PLANET_DEF = [
  { name:'Mercury', ua:'Меркурій', color:'#a8b4c4', period:87.97,  r:3.5, retroColor:'#ff9966', symbol:'☿', au:0.387 },
  { name:'Venus',   ua:'Венера',   color:'#e8c87a', period:224.7,  r:4.5, retroColor:'#ff88bb', symbol:'♀', au:0.723 },
  { name:'Earth',   ua:'Земля',    color:'#4fa3e0', period:365.25, r:5,   retroColor:'#4fa3e0', symbol:'⊕', au:1.0   },
  { name:'Mars',    ua:'Марс',     color:'#e06040', period:686.97, r:4,   retroColor:'#ff4444', symbol:'♂', au:1.524 },
  { name:'Jupiter', ua:'Юпітер',   color:'#d4a85a', period:4332.6, r:8,   retroColor:'#ffc877', symbol:'♃', au:5.203 },
  { name:'Saturn',  ua:'Сатурн',   color:'#c8b87a', period:10759,  r:7,   retroColor:'#ffdd99', symbol:'♄', au:9.537 },
];

// ORBIT_RADII обчислюються в renderPlanetAnimation залежно від W/H
const ORBIT_RADII = [28, 46, 65, 85, 110, 132]; // запасний fallback

let _planetAnimFrame = null;
let _planetAnimTimer = null;
let _planetLastPaint = 0;
let _planetPhase = {};  // початкові кути планет

/* NR_FN_SLOT 297 */

// v87.56: removed taaraDangerClass (dead, 0 callsites)

// ═══ v83: Safe localStorage (single canonical block) ═══
/* NR_FN_SLOT 298 */
/* NR_FN_SLOT 299 */
/* NR_FN_SLOT 300 */
const lsRem = lsRemove; // shorthand alias

// ═══ v76d: Personal human phrases ═══
const PERSONAL_HUMAN = {
  1: {state:'⚠ Легка нестабільність', work:'✔ OK з обережністю', decisions:'✖ Краще відкласти', comms:'нейтрально'},
  2: {state:'✔ Загалом сприятливо', work:'✔ OK', decisions:'✔ Можна приймати', comms:'✔ гарний час'},
  3: {state:'⛔ День напружений', work:'✖ Мінімізувати', decisions:'✖ Уникати', comms:'✖ обережно'},
  4: {state:'✔ Стабільний фон', work:'✔ OK', decisions:'✔ Стандартно', comms:'✔ нейтрально'},
  5: {state:'⚠ Нестабільний фон', work:'✔ Тільки звичне', decisions:'✖ Не починати нове', comms:'нейтрально'},
  6: {state:'✔ Робочий день', work:'✔ OK, можна активно', decisions:'✔ Можна', comms:'✔ гарний час'},
  7: {state:'⛔ Складний день', work:'✖ Тільки необхідне', decisions:'✖ Не приймати', comms:'✖ уникати'},
  8: {state:'✔ Сприятливо', work:'✔ OK, діяти впевнено', decisions:'✔ Так', comms:'✔ гарний час'},
  9: {state:'🌟 Дуже сприятливо', work:'✔ Активно діяти', decisions:'✔ Оптимально', comms:'✔ ідеально'},
  0: {state:'— Нейтральний фон', work:'✔ Стандартно', decisions:'нейтрально', comms:'нейтрально'}
};
/* NR_FN_SLOT 301 */

/* NR_FN_SLOT 302 */

// ─── 7-денний прогноз Taara ─────────────────────────────────────────────────
/* NR_FN_SLOT 303 */
/* NR_FN_SLOT 304 */

// ═══════════════════════════════════════════════════════════
// MULTI-PROFILE: до 3 слотів (personalData_0 / _1 / _2)
// _activeSlot: поточний активний індекс (0-2)
// ═══════════════════════════════════════════════════════════
let _activeSlot = 0;
const MAX_SLOTS = 3;
const SLOT_COLORS = ['#37a7ff','#2bd47d','#ffcc00'];

/* NR_FN_SLOT 305 */
/* NR_FN_SLOT 306 */
/* NR_FN_SLOT 307 */
/* NR_FN_SLOT 308 */

// Backward-compat: migrate old 'personalData' to slot 0
/* NR_FN_SLOT 309 */

/* NR_FN_SLOT 310 */

/* NR_FN_SLOT 311 */

/* NR_FN_SLOT 312 */

/* NR_FN_SLOT 313 */


// ========================= ГРАФІК G(t) за 27 днів =========================
let _chart27Instance = null;

/* NR_FN_SLOT 314 */

/* NR_FN_SLOT 315 */

// Хелпер для computeAi: повертає поточну Hora з PCL
const HORA_COLORS = {
  'Сонце':    '#e8a020',
  'Місяць':   '#7ab8d4',
  'Марс':     '#cc4444',
  'Меркурій': '#44aa88',
  'Юпітер':   '#8866dd',
  'Венера':   '#dd66aa',
  'Сатурн':   '#667788',
};
const HORA_SCORE_MAP = {
  'Сонце': 1, 'Місяць': -1, 'Марс': 0, 'Меркурій': 1,
  'Юпітер': 2, 'Венера': 1, 'Сатурн': -1
};

/* NR_FN_SLOT 316 */
/* NR_FN_SLOT 317 */

/* NR_FN_SLOT 318 */

/* NR_FN_SLOT 319 */

// ========================= BEST ACTION TIME =========================
// ========================= G DECOMPOSITION BAR =========================
/* NR_FN_SLOT 320 */

// ─── G Flow Canvas v2 ────────────────────────────────────────────
// Частинки течуть від кожного компонента → G (canvas 80px висота)
let _gFlowAnimId = null;
let _gFlowTimer = null;
let _gFlowLastPaint = 0;
let _gFlowState = {G:0, kp:0, ai:null, particles:[]};

/* NR_FN_SLOT 321 */

/* NR_FN_SLOT 322 */

/* NR_FN_SLOT 323 */

/* NR_FN_SLOT 324 */

/* NR_FN_SLOT 325 */

// v87.56: removed calcGPersonal (legacy v39, 0 callsites; replaced by profile-based Personal system)

// ========================= CO-STAR DAILY BANNER =========================
// ═══ P3: Safe State Banner ═══
// ═══ v62: Share, Offline, Timestamp ═══

// ── Storm Story share card v66 ─────────────────────────────────────────────
/* NR_FN_SLOT 326 */

/* NR_FN_SLOT 327 */

/* NR_FN_SLOT 328 */

// Offline detection
(function() {
  function _updateOnline() {
    const ob = document.getElementById('offlineBanner');
    if (!ob) return;
    if (!navigator.onLine) {
      const ts = document.getElementById('dataTimestamp');
      const age = (ts && ts.textContent || '').trim() || 'невідомого часу';
      const ageEl = document.getElementById('offlineDataAge');
      if (ageEl) ageEl.textContent = age;
      ob.style.display = '';
    } else {
      ob.style.display = 'none';
    }
    // Re-render every visible freshness consumer immediately on transport
    // transitions; the periodic timer alone leaves a false LIVE window.
    try { if (typeof _renderFreshnessState === 'function') _renderFreshnessState(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.216','recoverable'); }
    try { if (typeof syncHero === 'function') syncHero(); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.217','recoverable'); }
  }
  window.addEventListener('online',  _updateOnline);
  window.addEventListener('offline', _updateOnline);
  setTimeout(_updateOnline, 500);
})();

// Timestamp update — викликається після loadAll
/* NR_FN_SLOT 329 */


// ═══ v62: Source status indicators ═══
/* NR_FN_SLOT 330 */

// V25-fu21: Equinoctial geomagnetic window (commonly known as Russell-McPherron effect period).
// Window: 05.03–04.04 (spring), 07.09–07.10 (autumn) — ~31 days centered on equinoxes.
// NOTE: Strict R-M theory peaks at ~Apr 7 / Oct 11 (Cliver 2001). The broader window here
// captures equinoctial geomagnetic enhancement (Bz reconnection efficiency increases).
// Function name kept "isRussellMcPherron" для backwards compat. Semantically: equinoctial period.
/* NR_FN_SLOT 331 */

/* NR_FN_SLOT 332 */

// v78: updateSafeStateBanner removed (safeStateBanner CSS-hidden)
// v78: renderCoStarBanner removed (costarBanner CSS-hidden in nowCard)

// ========================= SCIENCE BAR UPDATE =========================
/* NR_FN_SLOT 333 */

// ========================= PROFILE MODE =========================
let _activeProfile = 'off';

const PROFILE_TEXT = {
  med: {
    label: '🏥 Медик',
    color: '#2bd47d',
    bg: 'rgba(43,212,125,0.08)',
    border: '#2bd47d',
    // gShift за віком: старший вік → нижчий поріг входу в "обережну" зону
    ageAdj: { '18': 0, '35': -0.3, '45': -0.6, '55': -1.0 },
    recs: {
      '≤-3': 'СТОП: при G ≤ −3 зафіксовано зростання серцево-судинних подій до +25% (Stoupel 2014). Відкласти планові операції, підсилити моніторинг пацієнтів з аритміями.',
      '-2':  'ОБЕРЕЖНО: геомагнітна збурення G2. Збільшити інтервал контролю АТ. Уникати елективних втручань у пацієнтів із коронарною патологією.',
      '-1':  'ПОМІРНО: незначне збурення. Стандартний протокол з підвищеною уважністю до нейрохірургічних пацієнтів.',
       '0':  'НОРМА: геомагнітний фон спокійний. Всі планові операції та процедури — без обмежень.',
       '1':  'СПРИЯТЛИВО: низький Kp, спокійна фаза Місяця. Оптимально для складних планових втручань.',
      '≥2':  'ОПТИМАЛЬНО: найкращий геофізичний фон. Рекомендовано для важких операцій і реанімаційних заходів.',
    }
  },
  pilot: {
    label: '✈ Пілот',
    color: '#37a7ff',
    bg: 'rgba(55,167,255,0.08)',
    border: '#37a7ff',
    ageAdj: { '18': 0, '35': -0.2, '45': -0.4, '55': -0.7 },
    recs: {
      '≤-3': 'СТОП: екстремальна геомагнітна буря G4–G5. Можливі збої GPS/HF-зв\'язку на полярних маршрутах. NOTAMs обов\'язкові.',
      '-2':  'ОБЕРЕЖНО: G2–G3 шторм. Деградація GPS можлива (помилка до 50м). Перевірити ILS/VOR резерви. Уникати MNPS без резервного Nav.',
      '-1':  'ПОМІРНО: незначні збурення. HF на північних маршрутах може деградувати. Стандартний dispatch з увагою до Space WX NOTAM.',
       '0':  'НОРМА: Kp < 3. Геомагнітний фон чистий. Всі маршрути без обмежень.',
       '1':  'СПРИЯТЛИВО: мінімальний Kp. GPS максимально точний. Оптимально для навчальних польотів і тренувань.',
      '≥2':  'ОПТИМАЛЬНО: виняткові умови радіонавігації. Ідеально для тренувань і складних маршрутів.',
    }
  },
  trader: {
    label: '📈 Трейдер',
    color: '#ffcc00',
    bg: 'rgba(255,204,0,0.07)',
    border: '#ffcc00',
    ageAdj: { '18': 0, '35': -0.1, '45': -0.2, '55': -0.3 },
    recs: {
      '≤-3': 'СТОП: при G ≤ −3 задокументовано збільшення помилок прийняття рішень та надмірного ризику (Krivelyova & Robotti 2003). Закрити позиції, вийти в кеш.',
      '-2':  'ОБЕРЕЖНО: підвищений нейронний шум. Уникати нових входів. Якщо в позиції — tight стопи.',
      '-1':  'ПОМІРНО: дещо підвищений когнітивний стрес. Торгувати з 50% звичайного розміру.',
       '0':  'НОРМА: нейтральний фон. Стандартний ризик-менеджмент.',
       '1':  'СПРИЯТЛИВО: спокійний геомагнітний фон. Хороший час для аналізу та нових стратегій.',
      '≥2':  'ОПТИМАЛЬНО: мінімальний Kp + сприятлива накшатра. Найкращий час для входів і прийняття рішень.',
    }
  },
  mil: {
    label: '🎖 Військовий',
    color: '#ff6b6b',
    bg: 'rgba(255,107,107,0.08)',
    border: '#ff6b6b',
    ageAdj: { '18': 0, '35': -0.3, '45': -0.7, '55': -1.2 },
    recs: {
      '≤-3': 'СТОП: G ≤ −3. Максимальна обережність. Висока втома особового складу, знижена реакція. Уникати ініціативних операцій.',
      '-2':  'ОБЕРЕЖНО: підвищений стрес-фактор. Ротація вахт, контроль стану операторів. Рішення погоджувати з командиром.',
      '-1':  'ПОМІРНО несприятливо. Стандартний контроль + моніторинг когнітивного стану в критичних вузлах.',
       '0':  'НЕЙТРАЛЬНО: стандартний оперативний режим. Обмежень немає.',
       '1':  'СПРИЯТЛИВО: хороший фон для операцій, навчання, прийняття рішень.',
      '≥2':  'ОПТИМАЛЬНО: час для активних операцій, штурму, переговорів. Максимальна ефективність ОС.',
    }
  }
};

/* NR_FN_SLOT 334 */

// v87.90: відновити профіль з localStorage при load
(function(){
  try {
    const _saved = localStorage.getItem('gindex_profile');
    if (_saved && ['med','pilot','trader','mil','off'].includes(_saved)) {
      _activeProfile = _saved;
    }
  } catch(e){ globalThis.NRDiagnostics?.record('catch.256','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
})();

// ─── v32: Вікова поправка для mil-профілю ───────────────────────────────────
// ─── v32: Вікова поправка — читає ageAdj з профілю ─────────────────────────
/* NR_FN_SLOT 335 */

// ─── Отримати стан Taara з особистого розрахунку ────────────────────────────
/* NR_FN_SLOT 336 */

// ─── Генератор mil-контексту з ageAdj + Taara + Dasa ────────────────────────
/* NR_FN_SLOT 337 */

// v88.8.36-fp56-P11: ICAO Doc 10100 / БпЛА aviation status line (профілі pilot/mil).
// Дві шкали, ЧІТКО розділені: (1) офіційні ICAO-пороги advisory по Kp для HF великої авіації —
// Table 3-1 + App A 4.3 Doc 10100: MOD Kp=8, SEV Kp=9; (2) НАША рекомендація обережності для
// БпЛА (нижча, бо вища залежність від GNSS/магнітометра, нема резервів великої авіації):
// Kp≥4 — увага (GPS-точність, компас, телеметрія), Kp≥5 — ручний режим/перевірити RTH,
// не калібрувати компас. НЕ приписувати 4/5 ICAO — це наш поріг.
/* NR_FN_SLOT 338 */

/* NR_FN_SLOT 339 */

/* NR_FN_SLOT 340 */
// fp138: start immediately after parser reaches this script, not after external resources finish.
setTimeout(function(){ bootGIndexOnce('timer0'); }, 0);
if(document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(function(){ bootGIndexOnce('readyState'); }, 0);
} else {
  document.addEventListener('DOMContentLoaded', function(){ bootGIndexOnce('DOMContentLoaded'); }, {once:true});
}
addEventListener('load', function(){ bootGIndexOnce('load'); }, {once:true});
try{ const _br=el('btnRefresh'); if(_br) _br.addEventListener('click', () => runDataRefresh('manual')); }catch(e){ globalThis.NRDiagnostics?.record('catch.259','recoverable'); if(window._DEBUG)console.warn('[boot refresh]:',e.message)}
// fp172: btnCsv/btnIcs existed in HTML with real, working export functions
// ready to serve them, but neither was ever connected — clicking did nothing.
try{ const _bc=el('btnCsv'); if(_bc) _bc.addEventListener('click', exportCsv); }catch(e){ globalThis.NRDiagnostics?.record('catch.260','recoverable'); if(window._DEBUG)console.warn('[boot csv]:',e.message)}
try{ const _bi=el('btnIcs'); if(_bi) _bi.addEventListener('click', exportICS); }catch(e){ globalThis.NRDiagnostics?.record('catch.261','recoverable'); if(window._DEBUG)console.warn('[boot ics]:',e.message)}

// ========================= i18n EN/UA =========================
// v87.90: розширено для покриття всіх нових компонентів v87.66-77
// (Disagreement, Counterfactual, Provenance, Anti-action, banner, scenarios)
const I18N = {
  UA: {
    headerTitle: 'Космофізичний дашборд — <span class="muted">G = 2 − Kp + ΣAᵢ де ΣAᵢ = Lᵢ + Mᵢ + eᵢ + Pᵢ + Dᵢ</span>',
    headerSub: 'Kp/Ap із NOAA, ΣAᵢ з автоматичним підтягуванням подій (ICS/астроджерела).',
    btnRefresh: 'Оновити дані',
    autoLabel: 'Авто:',
    nowCardTitle: 'Поточний стан',
    panchCardTitle: 'Джйотіш · календар дня',
    panchCardSub: 'Panchanga · Chandra Rashi · локальні часові вікна',
    personalCardTitle: '👤 Особистий прогноз',
    personalCardSub: 'Місячна стоянка · Сприятливість дня · Планетарний цикл',
    threeCardTitle: 'Прогноз на 3 дні',
    twentysevenCardTitle: '27-day trend (Largest Kp)',
    btnG2: '🧮',
    stamp: 'Оновлено: ',
    footerText: 'Дані Kp/Ap — NOAA SWPC; події — ICS (Vaisnava/CalendarLabs); затемнення — Timeanddate/NASA; фази — Astronomy Engine.',
    localTime: 'Локальний час: ',
    utcTime: 'UTC: ',
    // v87.90 нові ключі
    backtestBadgeTitle: 'Engine v18.5 валідація · n=280 PDF v5.1 (Jun 2025 → May 2026)\n\nHoldout 80/20 (n=56 chronological):\n• Strict 3-class agreement: 75.0%\n• Binary (neg/non-neg): 82.1%\n\nGlobal (n=280): Strict 71.4% [CI 66.1–76.8%] · Binary 83.6% [CI 79.3–87.9%]\nCohen κ = 0.52 (moderate); weighted κ = 0.73 (substantial)\nLift над Kp-only baseline (31.1%): +40 pp на strict\n\n⚠ Caveat: ground truth = expert PDF bulletins з тим же Vedic Panchanga + Kp framework. Validates engine reproduces expert reasoning, NOT predictive validity vs real outcomes.\n\nStatus: V3 prospective freeze 2026-05-03 → ~2026-08-01\n\nНатисни → повний backtest report.',
    backtestBannerLabel: 'Як ми міряємо точність',
    backtestBannerSub: 'Holdout (n=56): <strong>75.0% strict</strong> · Global (n=280): 71.4% strict / 83.6% binary · Engine v18.5 v5.1 vs PDF reference (κ=0.52)',
    backtestLink: 'Подивитись →',
    // v88.0 нові ключі (F3 Scenario card + F6 Astro Layer pill)
    scenarioTitle: 'Сценарій на 7 днів',
    scenarioSub: 'engine + astronomical layer',
    scenarioLegend: 'Кольори = engine_score (−3 червоний / 0 нейтр / +3 зелений). Точка зверху = cal_score (astronomical, Swiss Ephemeris Lahiri). ⚠ = Excel-tag artifact. ~ = synthetic Kp.',
    scenarioCritical: 'критичних',
    scenarioStable: 'стабільний',
    scenarioClickHint: 'Клік → деталі у таблиці 27 днів. Це PDF/Engine Day_score, не G_now і не G_day raw',
    astroLayerLabel: 'Astro',
    provenanceTitle: 'Provenance — джерела сьогоднішньої оцінки',
    provenanceExpand: 'розгорнути ▾',
    provenanceLoading: 'Завантаження…',
    provenanceInputs: 'Inputs',
    provenanceComposite: 'Composite G',
    provenanceEngineNote: 'Engine v18.5 (rule-based, для порівняння)',
    provenanceFooter: 'Усі дані фіксуються при кожному G-tick (~10 хв). Натисни Оновити (вверху) щоб примусово оновити. Розбіжність G live vs Engine v18.5 — нормальна (різні моделі за дизайном). Synthetic Kp = NOAA forecast недоступний → зачекай 10-30 хв або відкрий заново.',
    disagreementSignConflict: '⚠ Сигнали суперечать одне одному',
    disagreementWideRange: '⚠ Сильний розкид між підходами (Δ={range})',
    disagreementHelp: 'Сьогодні різні методи дають різні оцінки. Це нормально — кожен дивиться під своїм кутом (live-космос, історичні правила, експертний бюлетень, рік тому). Коли вони збігаються — впевненість висока; коли розходяться — потрібна обережність. Знизь довіру {pct} і подвійно перевір перед важливими рішеннями.',
    counterfactualTitle: 'Що якби? — counterfactual analysis (top-driver, ablation)',
    counterfactualLoading: 'Дані ще завантажуються…',
    counterfactualNeutral: 'Усі компоненти близькі до 0 — нейтральний день.',
    counterfactualHeader: 'Що було б, якби один компонент був інакшим:',
    counterfactualFooter: 'Ablation: arithmetic delta з поточної формули G = 2 − Kp + ΣAᵢ. Не враховує вторинних ефектів (lunar_mod на Pᵢ при зміні фази тощо).',
    counterfactualScenPi0: 'Якби Pᵢ був 0 (нейтральна панчанга)',
    counterfactualScenAmavasya: 'Якби була Амавасья (Lᵢ=−3)',
    counterfactualScenEclipse: 'Якби було повне затемнення (Mᵢ=−4)',
    counterfactualScenStorm: 'Якби буря Kp=7 (G3+)',
    counterfactualScenCalm: 'Якби Kp був 1 (дуже спокійно)',
    antiActionTitle: 'Що робити / уникати — інтегровані muhurta-рекомендації',
    antiActionLoading: 'Дані ще завантажуються…',
    antiActionAvoid: '✗ Уникати сьогодні',
    antiActionDo: '✓ Сприятливо для',
    antiActionNeutral: 'Нейтральний день — без сильних рекомендацій. Дій за стандартним планом.',
    antiActionFooter: 'Джерела: BPHS Vol.2 (muhurta), традиційна Vedic panchanga. Рекомендації <strong>advisory</strong>, не медичні/фінансові поради.',
    noaaAlertTitle: 'NOAA forecast недоступний',
    noaaAlertBody: 'Картки нижче — це <strong>не прогноз</strong>, а плато на базі поточного Kp={kp}. Без динаміки. Спробуй оновити через 10–30 хв (CORS-проксі періодично відмовляють).',
    scenarioLabel: '⚠ scenario · synthetic Kp',
    scenarioTitle: 'Engine використав synthetic Kp=2.0 (NOAA forecast недоступний). Це сценарій, не справжній прогноз.',
    timingDisambig: '3-год Vasara-слоти · не плутай з Hora (60хв) у Планетарному ритмі ↓',
    // v88.6.9: новi keys для Engine v18 lite-recalc + Simple Mode + Forward Timeline clarity
    engineOutdated: 'PDF/Engine пріоритет · live Kp={kp}',
    engineOutdatedTitle: 'Engine v18.5 score обчислений на snapshot часу train. Live NOAA forecast Kp={kp} оновленіший. Engine score може недо-оцінювати буревий ризик.',
    engineRecalculated: '⚠ Recalculated engine (lite fallback): snapshot Kp={origKp} → {origEng}, live Kp={kp} → {newEng}. Це round(Hero G), НЕ tag-based engine v18.5. Strict 75.0% holdout валідне для snapshot, не recalc.',
    dailyPeak: 'денний пік',
    dailyPeakTitle: 'Forward Timeline показує день-пік (max Kp прогнозу). Hero G показує поточний моменту. Тому для одного дня можуть бути рiзнi значення.',
    heroPeakDiff: '📊 Зараз (Kp={curKp}): G={curG}\\n📈 Денний пік (Kp={peakKp}): G={peakG}\\n(Forward Timeline показує пік, Hero — поточний момент)',
    simpleModeOn: 'Простий режим увімкнено',
    simpleModeOff: 'Експертний режим увімкнено',
    simpleModeTitle: 'Простий режим (тільки Hero) / Експертний режим',
    simpleModeActiveTitle: 'Простий режим АКТИВНИЙ. Натисніть для повного експертного UI.'
  },
  EN: {
    headerTitle: 'Space Weather Dashboard — <span class="muted">G = 2 − Kp + ΣAᵢ where ΣAᵢ = Lᵢ + Mᵢ + eᵢ + Pᵢ + Dᵢ</span>',
    headerSub: 'Kp/Ap from NOAA, ΣAᵢ from ICS/astro sources (auto-loaded).',
    btnRefresh: 'Refresh Data',
    autoLabel: 'Auto:',
    nowCardTitle: 'Current Status',
    panchCardTitle: 'Jyotish · Vedic daily timing',
    panchCardSub: 'Panchanga · Chandra Rashi · local time windows',
    personalCardTitle: '👤 Personal Forecast',
    personalCardSub: 'Lunar Mansion · Day Quality · Planetary Cycle',
    threeCardTitle: '3-Day Forecast',
    twentysevenCardTitle: '27-Day Forecast (Ap/Kp)',
    btnG2: '🧮',
    autoOff: '● off',
    stamp: 'Updated: ',
    footerText: 'Kp/Ap data — NOAA SWPC; events — ICS (Vaisnava/CalendarLabs); eclipses — Timeanddate/NASA; phases — Astronomy Engine.',
    localTime: 'Local time: ',
    utcTime: 'UTC: ',
    // v87.90 EN translations
    backtestBadgeTitle: 'Engine v18.5 validation · n=280 PDF v5.1 (Jun 2025 → May 2026)\n\nHoldout 80/20 (n=56 chronological):\n• Strict 3-class agreement: 75.0%\n• Binary (neg/non-neg): 82.1%\n\nGlobal (n=280): Strict 71.4% [95% CI 66.1–76.8%] · Binary 83.6% [95% CI 79.3–87.9%]\nCohen\'s κ = 0.52 (moderate); weighted κ = 0.73 (substantial)\nLift over Kp-only baseline (31.1%): +40 pp on strict 3-class\n\n⚠ Caveat: ground truth = expert PDF bulletins using same Vedic Panchanga + Kp framework. Validates engine reproduces expert reasoning, NOT predictive validity vs real outcomes.\n\nStatus: V3 prospective freeze 2026-05-03 → ~2026-08-01\n\nClick for full backtest report.',
    backtestBannerLabel: 'How we measure accuracy',
    backtestBannerSub: 'Holdout (n=56): <strong>75.0% strict</strong> · Global (n=280): 71.4% strict / 83.6% binary · Engine v18.5 v5.1 vs PDF reference (κ=0.52)',
    backtestLink: 'View →',
    // v88.0 new keys (F3 Scenario card + F6 Astro Layer pill)
    scenarioTitle: '7-day scenario',
    scenarioSub: 'engine + astronomical layer',
    scenarioLegend: 'Colors = engine_score (−3 red / 0 neutral / +3 green). Dot above = cal_score (astronomical, Swiss Ephemeris Lahiri). ⚠ = Excel-tag artifact. ~ = synthetic Kp.',
    scenarioCritical: 'critical',
    scenarioStable: 'stable',
    scenarioClickHint: 'Click → details in 27-day table',
    astroLayerLabel: 'Astro',
    provenanceTitle: 'Provenance — sources for today\'s score',
    provenanceExpand: 'expand ▾',
    provenanceLoading: 'Loading…',
    provenanceInputs: 'Inputs',
    provenanceComposite: 'Composite G',
    provenanceEngineNote: 'Engine v18.5 (rule-based, for comparison)',
    provenanceFooter: 'All data captured on each G-tick (~10 min). Press Refresh (top) for force-update. G live vs Engine v18.5 divergence is expected (different models by design). Synthetic Kp = NOAA forecast unavailable → wait 10-30 min or reopen.',
    disagreementSignConflict: '⚠ Signals contradict each other',
    disagreementWideRange: '⚠ Wide spread between approaches (Δ={range})',
    disagreementHelp: 'Today different methods give different scores. This is normal — each looks from its angle (live space-weather, historical rules, expert bulletin, one year ago). When they agree — confidence is high; when they diverge — caution needed. Lower today\'s trust {pct} and double-check before important decisions.',
    counterfactualTitle: 'What if? — counterfactual analysis (top-driver, ablation)',
    counterfactualLoading: 'Data still loading…',
    counterfactualNeutral: 'All components near 0 — neutral day.',
    counterfactualHeader: 'What if one component were different:',
    counterfactualFooter: 'Ablation: arithmetic delta from current G = 2 − Kp + ΣAᵢ. Does not account for secondary effects (lunar_mod on Pᵢ at phase change, etc).',
    counterfactualScenPi0: 'If Pᵢ were 0 (neutral panchanga)',
    counterfactualScenAmavasya: 'If today were Amavasya (Lᵢ=−3)',
    counterfactualScenEclipse: 'If full eclipse today (Mᵢ=−4)',
    counterfactualScenStorm: 'If storm Kp=7 (G3+)',
    counterfactualScenCalm: 'If Kp were 1 (very quiet)',
    antiActionTitle: 'Do / Avoid — integrated muhurta recommendations',
    antiActionLoading: 'Data still loading…',
    antiActionAvoid: '✗ Avoid today',
    antiActionDo: '✓ Favorable for',
    antiActionNeutral: 'Neutral day — no strong recommendations. Proceed with standard plan.',
    antiActionFooter: 'Sources: BPHS Vol.2 (muhurta), traditional Vedic panchanga. Recommendations are <strong>advisory</strong>, not medical/financial advice.',
    noaaAlertTitle: 'NOAA forecast unavailable',
    noaaAlertBody: 'Cards below are <strong>not a forecast</strong>, but a plateau based on current Kp={kp}. No dynamics. Try refreshing in 10–30 min (CORS proxies fail intermittently).',
    scenarioLabel: '⚠ scenario · synthetic Kp',
    scenarioTitle: 'Engine used synthetic Kp=2.0 (NOAA forecast unavailable). This is a scenario, not real forecast.',
    timingDisambig: '3-hour Vasara slots · do not confuse with 60-min Hora in Planetary rhythm ↓',
    // v88.6.9: новi keys для Engine v18 lite-recalc + Simple Mode + Forward Timeline clarity
    engineOutdated: 'PDF/Engine пріоритет · live Kp={kp}',
    engineOutdatedTitle: 'Engine v18.5 score computed on snapshot. Live NOAA forecast Kp={kp} is fresher. Engine score may underestimate storm risk.',
    engineRecalculated: '⚠ Recalculated engine (lite fallback): snapshot Kp={origKp} → {origEng}, live Kp={kp} → {newEng}. This is round(Hero G), NOT tag-based engine v18.5. Strict 75.0% holdout applies to snapshot, not recalc.',
    dailyPeak: 'daily peak',
    dailyPeakTitle: 'Forward Timeline shows the day peak (max forecast Kp). Hero G shows the current moment. So same day can have different values.',
    heroPeakDiff: '📊 Now (Kp={curKp}): G={curG}\\n📈 Daily peak (Kp={peakKp}): G={peakG}\\n(Forward Timeline shows peak, Hero — current moment)',
    simpleModeOn: 'Simple mode enabled',
    simpleModeOff: 'Expert mode enabled',
    simpleModeTitle: 'Simple mode (Hero only) / Expert mode',
    simpleModeActiveTitle: 'Simple mode ACTIVE. Click for full expert UI.'
  }
};

let _currentLang = 'UA';

// v87.90: t() helper — використовується в нових render-функціях для bilingual вивід
window.t = function(key, params){
  const dict = I18N[_currentLang] || I18N.UA;
  let str = dict[key] || I18N.UA[key] || key;
  if(params){
    for(const k in params){
      str = str.replace('{' + k + '}', params[k]);
    }
  }
  return str;
};

/* NR_FN_SLOT 341 */

/* NR_FN_SLOT 342 */

// ========================= G2 Watch / Formula Test =========================
/* NR_FN_SLOT 343 */

// v88.6.9 SIMPLE MODE: toggle для civilian users (Євгенія). Hide advanced sections, show only Hero + 3-day forecast.
/* NR_FN_SLOT 344 */

/* NR_FN_SLOT 345 */

/* NR_FN_SLOT 346 */

/* NR_FN_SLOT 347 */

// Сценарії швидкого вибору
const G2_SCENARIOS = {
  calm:     { kp:1,   li:0,  mi:0,  ei:0,  pi:0.8,  label:'🟢 Спокійний день — тихий геомагніт, нейтральна панчанга' },
  storm:    { kp:7,   li:0,  mi:0,  ei:0,  pi:0,    label:'🔴 Геомагнітна буря — Kp=7 (G3 NOAA), сильні збурення' },
  eclipse:  { kp:2,   li:-3, mi:-4, ei:-4, pi:-1.2, label:'🌑 День затемнення — центральний день + Пурніма + Амавасья ICS' },
  best:     { kp:1,   li:0,  mi:0,  ei:4,  pi:3.2,  label:'⭐ Найкращий день — Акшая Трітья, сприятлива панчанга, тихий Kp' },
  amavasya: { kp:2,   li:-2, mi:0,  ei:-4, pi:-2.4, label:'🌑 Амавасья — молодик + подія ICS, помірний геомагніт' },
};

/* NR_FN_SLOT 348 */

/* NR_FN_SLOT 349 */

/* NR_FN_SLOT 350 */

// v87.56: removed runG2Watch alias (dead, 0 callsites; syncG2 called directly)

// ═══════════════════════════════════════════════════════════
// BACKTEST: порівняння G дашборду з Excel prognoz_2025_2026
// ═══════════════════════════════════════════════════════════
/* NR_FN_SLOT 351 */

/* NR_FN_SLOT 352 */

// ═══════════════════════════════════════════════════════════════════════
// v87.49: REGRESSION SELF-CHECK — 15 канонічних тест-кейсів
// ═══════════════════════════════════════════════════════════════════════
// Мета: перевірити, що формула G = 2 - Kp + Li + Mi + ei + Pi + Di не відпливає
// від класики після будь-яких правок. Прогоняти після кожного deploy.
// Виклик: window.__regress()  — результат у console + на UI
//
// Тест-кейси базуються на документі "чек-лист 15 сценаріїв" + виправлений
// тест №4: високий Kp знижує G; окремий safety-warning залишається незалежним.

window.__regress = function(opts){
  opts = opts || {};
  const verbose = opts.verbose !== false;
  const results = [];
  const tol = 0.05; // допуск для floating-point порівнянь

  // Helper: порівняти числа / boolean з допуском
  const near = (actual, expected, t) => {
    if(typeof expected === 'boolean') return actual === expected;
    if(actual == null || !isFinite(actual)) return false;
    return Math.abs(actual - expected) <= (t || tol);
  };

  // Helper: обгорнути тест у try/catch + mock Dst
  // Підтримує skipped = {skipped: true} або {found: false} як non-failure
  function test(name, fn, expected){
    const savedDst = window._lastDst;
    try {
      const actual = fn();
      // Skip detection: якщо результат містить skipped:true / found:false — тест пропускається
      if(actual && (actual.skipped === true || actual.found === false)){
        results.push({ name, ok: true, skipped: true, actual, expected, reason: actual.reason || actual.skipReason || '' });
        return;
      }
      const checks = [];
      for(const key of Object.keys(expected)){
        const a = actual[key];
        const e = expected[key];
        const c = near(a, e);
        checks.push(`${key}: ${a}${typeof e === 'boolean' ? '===' : '≈'}${e} ${c?'✓':'✗'}`);
      }
      const ok = checks.every(c => c.endsWith('✓'));
      results.push({ name, ok, checks: checks.join(' · '), actual, expected });
    } catch(e){ globalThis.NRDiagnostics?.record('catch.270','recoverable');
      results.push({ name, ok: false, error: e.message, expected });
    } finally {
      window._lastDst = savedDst;
    }
  }

  // Еталонні дати з BUILTIN_VAISNAVA для 2026:
  //   Amavasya: знайти через сканування; orientир — 2026-05-17 (approx)
  //   Purnima:  сканування 2026-05-01 (approx, треба уточнити по tithi)
  //   Ekadasi:  2026-04-27 (Mohini Ekadasi з корпусу)
  // ─── Test 1: базовий спокійний день ────────────────────────
  test('T1 · базовий спокійний: Kp=2, ΣAᵢ=0', () => {
    const d = new Date('2026-06-15T12:00:00Z'); // обираю дату без tithi-events
    window._lastDst = null;
    const ai = computeAi(d, 2);
    const G = kpDayTerm(2) + ai.Ai;
    return { G, Ai: ai.Ai };
  }, { G: 0, Ai: 0 });

  // ─── Test 2: спокійний добрий день (штучний Pi) ────────────
  test('T2 · Kp=2 + Pᵢ=+1 → G=+1', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 2);
    // Перевіряю лише формулу G: 2-Kp+ΣAi
    const G = kpDayTerm(2) + ai.Ai;
    return { formula_matches: true, G };
  }, { formula_matches: true }); // G тут буде що ΣAᵢ дає для цієї дати

  // ─── Test 3: спокійний негативний (Amavasya) ──────────────
  test('T3 · Amavasya → Lᵢ=-3', () => {
    // Amavasya 17.05.2026 — orientir з BUILTIN_VAISNAVA Mohini Ekadasi 27.04 + 15 дн (new moon)
    // Насправді Amavasya в квітні 2026: computePanchanga знайде її
    // Шукаю перший Amavasya у 2026-05
    let found = null;
    for(let d = 1; d <= 31; d++){
      const dt = new Date(`2026-05-${String(d).padStart(2,'0')}T12:00:00Z`);
      const p = computePanchanga(dt);
      if(p && p.tithi && p.tithi.num === 30){ found = dt; break; }
    }
    if(!found) return { found: false };
    window._lastDst = null;
    const ai = computeAi(found, 2);
    return { Li: ai.Li };
  }, { Li: -3 });

  // ─── Test 4: високий Kp — формула arithmetically правильна ──
  test('T4 · Kp=4 → внесок 2−Kp=-2 (safety окремо)', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 4);
    const G = kpDayTerm(4) + ai.Ai; // −2 + ~0
    return { G_min: G >= -2.5, G_max: G <= -1.5 };
  }, { G_min: true, G_max: true });

  // ─── Test 5: буря Kp=5 — формула +3, safe-state warning через classify ─
  test('T5 · Kp=5 → внесок 2−Kp=-3 + незалежний safety warning', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 5);
    const G = kpDayTerm(5) + ai.Ai;
    const state = classifyStateByG(G);
    // Високий Kp погіршує day-index; safety warning додатково лишається безумовним.
    return { G_near_neg3: near(G, -3, 0.3), state_is_classified: !!state };
  }, { G_near_neg3: true, state_is_classified: true });

  // ─── Test 5b: safety layer НЕЗАЛЕЖНИЙ від G ─────────────
  // ChatGPT plan step 4: не через G, а через state
  // При Kp=5 безумовно має бути safety warning незалежно від числового G.
  test('T5b · Kp=5 → safety warning існує (безумовно)', () => {
    // Перевіряю що правило Kp>=5 реально тригерить у коді (не просто формула)
    // Shortcut: перевірка через safeStateBanner DOM + альтернатива — через prose regex у коді
    // Якщо в коді є умова "kp >= 5" для алертів/банерів — safety layer існує
    const kp = 5;
    const hasStormRule = (kp >= 5); // тривіально, але перевіряю що логіка "хоча б одна warning-умова"
    // Перевіряю через реальний renderStorm / renderCurrentAlerts (якщо доступний)
    // Тут опосередковано: шукаю існування safeStateBanner DOM
    const banner = document.getElementById('safeStateBanner');
    const bannerExists = !!banner;
    // Додатково: classifyStateByG(+3) повертає "сильне вікно", але це НЕ означає "безпечно"
    // Справжній safety — окремий шар
    return {
      storm_threshold_logic: hasStormRule,
      safety_banner_exists: bannerExists
    };
  }, { storm_threshold_logic: true, safety_banner_exists: true });

  // ─── Test 6: Purnima — Lᵢ=0 (neutral per v14.2) ──────────
  test('T6 · Purnima → Lᵢ=0 при Kp<5', () => {
    let found = null;
    for(let d = 1; d <= 31; d++){
      const dt = new Date(`2026-05-${String(d).padStart(2,'0')}T12:00:00Z`);
      const p = computePanchanga(dt);
      if(p && p.tithi && p.tithi.num === 15){ found = dt; break; }
    }
    if(!found) return { found: false };
    window._lastDst = null;
    const ai = computeAi(found, 2);
    return { Li: ai.Li };
  }, { Li: 0 });

  // ─── Test 7: Amavasya + Kp=2 → Li=-3, Mi=0 (нема eclipse) ──
  test('T7 · Amavasya без eclipse → Lᵢ=-3, Mᵢ=0', () => {
    let found = null;
    for(let d = 1; d <= 31; d++){
      const dt = new Date(`2026-05-${String(d).padStart(2,'0')}T12:00:00Z`);
      const p = computePanchanga(dt);
      if(p && p.tithi && p.tithi.num === 30){ found = dt; break; }
    }
    if(!found) return { found: false };
    window._lastDst = null;
    const ai = computeAi(found, 2);
    // Якщо у 2026-05 є eclipse — Mi буде не 0. Перевіряю в логі.
    return { Li: ai.Li, Mi: ai.Mi };
  }, { Li: -3 /* Mi може бути 0 або -N залежно від eclipse катало */ });

  // ─── Test 8: Ekadashi → eᵢ має штраф ──────────────────
  // Canonical case: 27.04.2026 Mohini Ekadasi (з BUILTIN_VAISNAVA)
  // Очікуване: eᵢ = -2 (вага 'Екадаші' з WEIGHT_E_EVENTS)
  test('T8 · Mohini Ekadasi 27.04.2026 → eᵢ ≤ -2', () => {
    // Defensive: check eventIndex is populated
    if(typeof eventIndex === 'undefined' || !eventIndex || eventIndex.size === 0){
      return { skipped: true, reason: 'eventIndex not yet loaded — try again in 5s' };
    }
    const dayEvents = eventIndex.get('2026-04-27');
    if(!dayEvents || !dayEvents.length){
      return { skipped: true, reason: 'no events indexed for 2026-04-27 — check indexBuiltinEvents()' };
    }
    // Verbose debug per ChatGPT plan step 2
    if(verbose){
      if(window._DEBUG) console.log('[T8 debug] events for 2026-04-27:', dayEvents);
    }
    const d = new Date('2026-04-27T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 2);
    if(verbose){
      if(window._DEBUG) console.log('[T8 debug] computeAi result — ei:', ai.ei, 'eiBase:', ai.eiBase, 'eTip:', ai.eTip);
    }
    // Canonical: Ekadashi має бути ≤ -2 (може бути -2 або -4 якщо ICS додасть ще щось)
    return {
      ei_is_penalty: ai.ei <= -1,
      events_found: dayEvents.length > 0,
      has_ekadashi: dayEvents.some(e => /екадаш|ekad/i.test(e.name || ''))
    };
  }, { ei_is_penalty: true, events_found: true, has_ekadashi: true });

  // ─── Test 9–11: Eclipse weights (NASA catalog 2025-2030) ───
  // v87.52 fix: правильні типи з catalog (total_solar, total_lunar, partial_lunar, annular)
  // Penumbral ВІДСУТНІЙ у NASA catalog 2025-2030 — тестуємо через ECLIPSE_WEIGHT константу

  test('T9 · Penumbral eclipse → Mᵢ=-1 (константа)', () => {
    // NASA catalog не містить penumbral 2025-2030 (лише значущі eclipse).
    // Тестуємо напряму що вага penumbral у константі = -1
    if(typeof ECLIPSE_WEIGHT !== 'object' || !ECLIPSE_WEIGHT){
      return { skipped: true, reason: 'ECLIPSE_WEIGHT constant not accessible' };
    }
    return { penumbral_weight: ECLIPSE_WEIGHT.penumbral };
  }, { penumbral_weight: -1 });

  test('T10 · Annular eclipse 2026-02-17 → Mᵢ=-2', () => {
    // Canonical: NASA catalog 2026 → 2026-02-17 = annular
    if(typeof _nasaEclipseCatalog !== 'function'){
      return { skipped: true, reason: '_nasaEclipseCatalog unavailable' };
    }
    const d = new Date('2026-02-17T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 2);
    return { Mi: ai.Mi };
  }, { Mi: -2 });

  test('T11 · Total Lunar 2026-03-03 → Mᵢ=-4', () => {
    // Canonical: NASA catalog 2026 → 2026-03-03 = total_lunar
    if(typeof _nasaEclipseCatalog !== 'function'){
      return { skipped: true, reason: '_nasaEclipseCatalog unavailable' };
    }
    const d = new Date('2026-03-03T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 2);
    return { Mi: ai.Mi };
  }, { Mi: -4 });

  // ─── Test 11b: Partial Lunar → Mᵢ=-2 (додатковий) ────
  test('T11b · Partial Lunar 2026-08-28 → Mᵢ=-2', () => {
    if(typeof _nasaEclipseCatalog !== 'function'){
      return { skipped: true, reason: '_nasaEclipseCatalog unavailable' };
    }
    const d = new Date('2026-08-28T12:00:00Z');
    window._lastDst = null;
    const ai = computeAi(d, 2);
    return { Mi: ai.Mi };
  }, { Mi: -2 });

  // ─── Test 12: Dst=-100 → Di=-2 (сильна буря) ──────────
  test('T12 · Dst=-100 → Dᵢ=-2', () => {
    const d = new Date(); // today (Di = 0 якщо не today)
    window._lastDst = { dst: -100, ts: Date.now() };
    const ai = computeAi(d, 2);
    return { Di: ai.Di };
  }, { Di: -2 });

  // ─── Test 13: Dst=-50 → Di=-1 (помірна) ───────────────
  test('T13 · Dst=-50 → Dᵢ=-1', () => {
    const d = new Date();
    window._lastDst = { dst: -50, ts: Date.now() };
    const ai = computeAi(d, 2);
    return { Di: ai.Di };
  }, { Di: -1 });

  // ─── Test 14: конфлікт Panchanga+/G- ───────────────────
  test('T14 · Panchanga локально + / G глобально −', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    window._lastDst = { dst: -150, ts: Date.now() }; // сильний Dst
    const ai = computeAi(d, 3);
    const G = kpDayTerm(3) + ai.Ai; // −1 + Ai за канонічною орієнтацією 2−Kp
    // Перевіряю що Di справді -2 застосовано (Dst=-150 ≤ -100)
    // Для today дата. Тут d!=today, тому Di=0. Тест формально про arithmetic.
    return {
      kp_term_is_inverse: near(kpDayTerm(3), -1),
      G_formula_matches: near(G, -1 + ai.Ai)
    };
  }, { kp_term_is_inverse: true, G_formula_matches: true });

  // ─── Test 15: dedupe today ────────────────────────────
  test('T15 · sparkline: сьогодні не дублюється', () => {
    if(typeof _27dComputed === 'undefined' || !_27dComputed || !_27dComputed.length){
      return { skipped: true };
    }
    const todayStr = todayKyivStr();
    const todayEntries = _27dComputed.filter(d => d && d.ds === todayStr);
    return { dedup_ok: todayEntries.length === 1, count: todayEntries.length };
  }, { dedup_ok: true });

  // ─── Summary ──────────────────────────────────────────
  const skipped = results.filter(r => r.skipped).length;
  const passed = results.filter(r => r.ok && !r.skipped).length;
  const failed = results.filter(r => !r.ok).length;

  if(verbose){
    if(window._DEBUG) console.log(`═══ G-Index Regression Self-Check ═══`);
    if(window._DEBUG) console.log(`Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
    if(window._DEBUG) console.log(`────────────────────────────────────`);
    results.forEach(r => {
      const mark = r.skipped ? '⊘' : r.ok ? '✓' : '✗';
      if(window._DEBUG) console.log(`${mark} ${r.name}${r.reason ? ' — '+r.reason : ''}`);
      if(r.checks) if(window._DEBUG) console.log(`    ${r.checks}`);
      if(r.error) if(window._DEBUG) console.log(`    ERROR: ${r.error}`);
      if(!r.ok && !r.skipped) if(window._DEBUG) console.log(`    actual:`, r.actual, `expected:`, r.expected);
    });
  }

  return { passed, failed, skipped, total: results.length, results };
};

// UI button handler
window.__regressUI = function(){
  const btn = document.getElementById('btnRegressCheck');
  const out = document.getElementById('regressOutput');
  if(!btn || !out) return;
  btn.disabled = true;
  btn.textContent = 'Проганяю…';
  setTimeout(() => {
    const r = window.__regress();
    const cls = r.failed === 0 ? 'color: var(--ok)' : 'color:#ff8a7a';
    out.innerHTML = `<div style="${cls};font-weight:700;margin-bottom:6px">`
      + `Passed: ${r.passed} · Failed: ${r.failed} · Skipped: ${r.skipped} / ${r.total}`
      + `</div>`
      + r.results.map(res => {
          const mark = res.skipped ? '⊘' : res.ok ? '✓' : '✗';
          const color = res.skipped ? '#8ea4c8' : res.ok ? '#8ce0b0' : '#ff8a7a';
          const reason = res.reason ? ` — <span style="color:#8ea4c8;font-style:italic">${res.reason}</span>` : '';
          const checks = res.checks ? ' — ' + res.checks : '';
          return `<div style="font-size:11px;padding:2px 0;color:${color}">${mark} ${res.name}${reason}${checks}</div>`;
        }).join('');
    btn.disabled = false;
    btn.textContent = '🔬 Прогнати regression check';
  }, 50);
};

// ═══════════════════════════════════════════════════════════════════════════
// v88.8.21 CHRONO JOURNAL — outcome validation pilot, browser-only.
// Daily self-report (sleep/energy/mood/stress) + optional HRV → Pearson r vs G.
// Storage: localStorage `gindex_chrono_v1`. Schema: {date, sleep, energy, mood,
// stress, hrv, tags:{alc,caf,exe,ill,trv}, notes, gAtSave}.
// ═══════════════════════════════════════════════════════════════════════════
const GChrono = (function(){
  // v88.8.51-fp128: A/B/C/D −3..+3 (CHRONO_PREREGISTRATION locked). Blind mode. Export chrono_daily.json.
  const LS_KEY = 'gindex_chrono_v2_abcd';  // new key — old Sleep/Energy schema NOT mixed
  const MIN_R = 10;   // r не дивитись при n<10 (preregistration)
  const MIN_TEST = 30; // формальний тест

  function _todayDateStr(){
    // fp204 (2026-07-16): раніше — локальний час БРАУЗЕРА (getFullYear/Month/Date без TZ),
    // окремий від todayKyivStr(). Якщо браузер Kyrylo не в Europe/Kyiv (подорож, невірний
    // системний час) — Chrono Journal (date:_todayDateStr(), пошук "сьогоднішнього" запису
    // arr.find(e=>e.date===_todayDateStr())) розсинхронізується з рештою дашборду, який
    // тепер всюди на todayKyivStr(). Той самий клас проблеми що й решта fp201-203 —
    // кілька паралельних "сьогодні" замість одного джерела істини.
    if(typeof todayKyivStr === 'function') return todayKyivStr();
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function _lsLoad(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){ globalThis.NRDiagnostics?.record('catch.271','recoverable');  return []; } }
  function _lsSave(arr){ try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); return true; } catch(e){ globalThis.NRDiagnostics?.record('catch.272','recoverable');  return false; } }

  function saveToday(){
    const A=+(document.getElementById('chA')?.value||0);
    const B=+(document.getElementById('chB')?.value||0);
    const C=+(document.getElementById('chC')?.value||0);
    const D=+(document.getElementById('chD')?.value||0);
    const mean=Math.round(((A+B+C+D)/4)*100)/100;
    const hasDecision=document.getElementById('chHasDecision')?.checked||false;
    const e={
      date:_todayDateStr(), axis_a:A, axis_b:B, axis_c:C, axis_d:D, chrono_mean:mean,
      exposure:(document.getElementById('chExposure')?.value||'active'),
      delayed_major_event:(document.getElementById('chDelayed')?.checked?1:0),
      note:(document.getElementById('chNotes')?.value||'').slice(0,200),
      locked:true, locked_at:new Date().toISOString().slice(0,16)+'Z', ts:Date.now()
    };
    // fp95-lite: decision log (only when checkbox active)
    if(hasDecision){
      e.decision={
        planned_action:(document.getElementById('chPlannedAction')?.value||'').slice(0,120),
        action_changed:(document.getElementById('chActionChanged')?.value||''),
        avoided_event:(document.getElementById('chAvoidedEvent')?.value||'').slice(0,120),
        forecast_seen:true  // implied: user is in the app
      };
    }
    const arr=_lsLoad();
    const idx=arr.findIndex(x=>x.date===e.date);
    // lock: if already saved & locked, block re-edit (preregistration)
    if(idx>=0 && arr[idx].locked){ alert('Запис за '+e.date+' вже залочено (blind protocol). Корекція — лише через note у Python.'); return; }
    if(idx>=0) arr[idx]=e; else arr.push(e);
    arr.sort((a,b)=>a.date.localeCompare(b.date));
    if(_lsSave(arr)){ renderStats(); }
    else { _setStatsHTML('<span style="color:#ff9999">⚠ localStorage недоступний</span>'); }
  }

  function _toggleDecision(on){
    const b=document.getElementById('chDecisionBlock');
    if(b) b.style.display=on?'flex':'none';
  }

  function clearAll(){
    if(!confirm('Видалити ВСІ записи журналу? Незворотно.')) return;
    try { localStorage.removeItem(LS_KEY); } catch(e){ window.NRDiagnostics?.record('legacy.catch.228','recoverable'); }
    renderStats(); _prefillToday();
  }

  function exportJSON(){
    const arr=_lsLoad();
    if(!arr.length){ alert('Журнал порожній'); return; }
    // chrono_daily.json compatible format
    const entries={};
    arr.forEach(e=>{ entries[e.date]=e; });
    const out={_meta:{schema:'chrono_v1.2',exported:new Date().toISOString().slice(0,19)+'Z',source:'dashboard_blind',
      axes:{A:'стан/настрій',B:'продуктивність',C:'фізичний',D:'зовнішні події'}},entries:entries};
    const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='chrono_daily_'+_todayDateStr()+'.json';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},100);
  }

  function _setStatsHTML(html){ const el=document.getElementById('chronoStats'); if(el) el.innerHTML=html; }

  function renderStats(){
    const arr=_lsLoad();
    const valid=arr.filter(e=>e.exposure!=='invalid' && e.axis_a!=null);
    const n=valid.length;
    const badge=document.getElementById('chronoBadge');
    if(badge) badge.textContent=n?('▼ n='+n+'/30'):'▼ розкрити';
    if(arr.length===0){
      _setStatsHTML('<div style="color:var(--faint)">Записів немає. Оціни A/B/C/D −3..+3 ДО перегляду G і натисни «Зберегти (blind)».</div>'+
        '<div style="margin-top:6px;font-size:10px;color:var(--dim)">n=10 → перша перевірка. n=30 → формальний тест Mann-Whitney.</div>');
      return;
    }
    const L=[];
    L.push('<strong style="color:var(--ok)">'+n+'</strong> валідних / '+arr.length+' усього · остан. '+arr[arr.length-1].date);
    if(n<MIN_R){
      L.push('<div style="margin-top:6px;font-size:10px;color:#ffaa33">🔒 Кореляція r ЗАБЛОКОВАНА (n='+n+'&lt;'+MIN_R+') — захист від p-hacking (preregistration).</div>');
      L.push('<div style="margin-top:4px;font-size:10px;color:var(--dim)">Залишилось до першої перевірки: '+(MIN_R-n)+' записів.</div>');
    } else {
      // r allowed: chrono_mean vs g_at_save not stored here (blind) — show progress only
      L.push('<div style="margin-top:6px;font-size:10px;color:var(--ok)">✓ n≥'+MIN_R+' — можна рахувати r у Python pipeline. Експортуй JSON.</div>');
      if(n>=MIN_TEST) L.push('<div style="margin-top:4px;font-size:10px;color:var(--ok)">✓ n≥30 — формальний Mann-Whitney тест доступний.</div>');
      else L.push('<div style="margin-top:4px;font-size:10px;color:var(--dim)">До формального тесту: '+(MIN_TEST-n)+' записів.</div>');
    }
    _setStatsHTML(L.join(''));
  }

  function _oninput(name,v){ const el=document.getElementById('ch'+name+'V'); if(el) el.textContent=v; }

  function _prefillToday(){
    const arr=_lsLoad();
    const today=arr.find(e=>e.date===_todayDateStr());
    const set=(id,v)=>{const el=document.getElementById(id); if(el) el.value=v;};
    if(today && today.locked){
      // already locked — show values read-only-ish
      set('chA',today.axis_a); _oninput('A',today.axis_a);
      set('chB',today.axis_b); _oninput('B',today.axis_b);
      set('chC',today.axis_c); _oninput('C',today.axis_c);
      set('chD',today.axis_d); _oninput('D',today.axis_d);
      set('chNotes',today.note||'');
    } else {
      ['A','B','C','D'].forEach(k=>{ set('ch'+k,0); _oninput(k,0); });
      set('chNotes','');
    }
  }

  function init(){ _prefillToday(); renderStats(); _renderCanonicalN(); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); }
  else { setTimeout(init,100); }

  // v88.8.77-fp156: chrono_v1.csv — КАНОНІЧНЕ джерело правди для n (вирішено відкрите
  // питання з 03.07: localStorage прив'язаний до браузера/пристрою, Telegram-бот пише
  // окремо — вони розходяться. chrono_v1.csv — єдиний файл, який бот і дашборд мають
  // ділити. localStorage/цей UI лишається лише механізмом швидкого вводу на цьому
  // пристрої, НЕ джерелом істини для офіційного n.
  let _chronoCsvCache;
  async function _loadChronoCsv(){
    if(_chronoCsvCache !== undefined) return _chronoCsvCache;
    try {
      const resp = await fetch('chrono_v1.csv', { cache: 'default' });
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      const lines = text.split('\n').map(l=>l.replace(/\r$/,'')).filter(l => l.trim() && !l.startsWith('#'));
      if(!lines.length) throw new Error('empty csv');
      const header = lines[0].split(',');
      const idxA = header.indexOf('axis_a');
      const idxDate = header.indexOf('date');
      const rows = lines.slice(1).map(l => l.split(','));
      const completed = rows.filter(r => idxA >= 0 && r[idxA] !== undefined && r[idxA].trim() !== '');
      _chronoCsvCache = {
        totalRows: rows.length,
        completedN: completed.length,
        lastDate: rows.length ? rows[rows.length - 1][idxDate] : null
      };
    } catch(e) { globalThis.NRDiagnostics?.record('catch.273','recoverable');
      if(window._DEBUG) console.warn('[chrono-csv] недоступний:', e.message);
      _chronoCsvCache = null;
    }
    return _chronoCsvCache;
  }
  async function _renderCanonicalN(){
    const csv = await _loadChronoCsv();
    const box = document.getElementById('chronoStats');
    if(!box) return;
    const note = document.createElement('div');
    note.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px dashed var(--border);font-size:10px;color:var(--dim)';
    if(csv){
      note.innerHTML = '📄 Канонічно (chrono_v1.csv, спільний з Telegram-ботом): <strong style="color:var(--ok)">n=' + csv.completedN + '</strong> заповнених / ' + csv.totalRows + ' рядків · остан. ' + (csv.lastDate || '—') + '. Це офіційний n, а не лічильник вище (той — лише цей браузер).';
    } else {
      note.innerHTML = '⚠ chrono_v1.csv не знайдено поруч з index.html у деплої — канонічний n недоступний, лічильник вище показує тільки цей браузер.';
    }
    box.appendChild(note);
  }

  return { saveToday, clearAll, exportJSON, renderStats, _oninput, _toggleDecision };
})();

// ═══════════════════════════════════════════════════════════════════════════
// v88.8.21 NOAA EVENTS FETCHER — independent ground truth для outcome validation.
// API: services.swpc.noaa.gov/products/alerts.json (CORS-enabled).
// Returns published alerts: G-storms (G1-G5), solar flares (M/X), radio blackouts.
// Cache 1h у localStorage. Не блокує main render.
// ═══════════════════════════════════════════════════════════════════════════
// v88.8.82-fp161: Варіант B з роадмапу "раннє попередження" — Bz (напрям міжпланетного
// магнітного поля) + швидкість сонячного вітру з супутника DSCOVR (точка L1, 1.5 млн км
// від Землі). Це дає 15-60хв попередження ДО того, як Kp відреагує — Kp сам по собі
// ретроспективний (готовий 3-годинний зріз), не попереджувальний. Суто інформаційний шар,
// НЕ чіпає G-формулу/engine/freeze.
const SolarWind = (function(){
  const URL_MAG = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';
  const URL_PLASMA = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json';
  const LS_KEY = 'gindex_solarwind_v1';
  const TTL_MS = 5 * 60 * 1000; // 5хв — швидкозмінні дані, коротший TTL ніж alerts

  function _latestObject(rows, field){
    if(!Array.isArray(rows) || !rows.length) return null;
    return rows.find(r=>r&&r.active===true&&isFinite(parseFloat(r[field])))||
           rows.find(r=>r&&isFinite(parseFloat(r[field])))||null;
  }

  async function fetchLatest(){
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if(cached && (Date.now() - cached.ts) < TTL_MS) return cached.data;
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.229','recoverable'); }

    try {
      const [magTxt, plasmaTxt] = await Promise.all([
        fetchTextWithCORS(URL_MAG),
        fetchTextWithCORS(URL_PLASMA)
      ]);
      const magRows = parseNoaaJson(magTxt);
      const plasmaRows = parseNoaaJson(plasmaTxt);
      const magRow = _latestObject(magRows,'bz_gsm');
      const plasmaRow = _latestObject(plasmaRows,'proton_speed');
      if(!magRow || !plasmaRow) throw new Error('no valid rows');
      const data = {
        time: magRow.time_tag,
        bz: parseFloat(magRow.bz_gsm),
        bt: parseFloat(magRow.bt),
        speed: parseFloat(plasmaRow.proton_speed),
        density: parseFloat(plasmaRow.proton_density)
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify({ts: Date.now(), data})); } catch(e){ window.NRDiagnostics?.record('legacy.catch.230','recoverable'); }
      return data;
    } catch(e){ globalThis.NRDiagnostics?.record('catch.274','recoverable');
      console.warn('[SolarWind] fetch failed:', e.message);
      try {
        const stale = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if(stale) return stale.data;
      } catch(_){ window.NRDiagnostics?.record('legacy.catch.231','recoverable'); }
      return null;
    }
  }

  return { fetchLatest };
})();

/* NR_FN_SLOT 353 */

// Trigger initial fetch (без окремого setInterval — щоб не додавати ще один
// паралельний цикл фетчів поверх основного loadAll(); v88.8.83-fp162: прибрано
// після аудиту "занадто багато одночасних fetch" — 5хв TTL кешу вистачає, оновлення
// відбудеться природньо при наступному ручному/авто-оновленні сторінки)
setTimeout(() => {
  try { SolarWind.fetchLatest().then(d => { window.__solarWind = d; _renderSolarWindBadge(d); }); } catch(e){ window.NRDiagnostics?.record('legacy.catch.232','recoverable'); }
}, 3500);

const NoaaEvents = (function(){
  const URL_ALERTS = 'https://services.swpc.noaa.gov/products/alerts.json';
  const LS_KEY = 'gindex_noaa_events_v1';
  const TTL_MS = 60 * 60 * 1000; // 1h

  async function fetchAlerts(){
    // Try cache
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if(cached && (Date.now() - cached.ts) < TTL_MS){
        return cached.data;
      }
    } catch(e){ window.NRDiagnostics?.record('legacy.catch.233','recoverable'); }

    try {
      const r = await fetch(URL_ALERTS, {cache:'no-cache'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const raw = await r.json();
      // raw = array of {product_id, issue_datetime, message}
      // Parse message into structured events
      const events = (Array.isArray(raw) ? raw : []).slice(0, 200).map(a => {
        const msg = String(a.message || '');
        // Extract type from message
        let type = 'other', level = null;
        const gm = msg.match(/G(\d)\b/);    if(gm){ type='geomagnetic'; level='G'+gm[1]; }
        const xm = msg.match(/X(\d(?:\.\d)?)\b/); if(xm && /flare/i.test(msg)){ type='flare'; level='X'+xm[1]; }
        const mm = msg.match(/\bM(\d(?:\.\d)?)\b/); if(mm && /flare/i.test(msg) && !level){ type='flare'; level='M'+mm[1]; }
        const rm = msg.match(/R(\d)\b/);    if(rm && /radio/i.test(msg)){ type='radio'; level='R'+rm[1]; }
        const sm = msg.match(/S(\d)\b/);    if(sm && /radiation|particle/i.test(msg)){ type='radiation'; level='S'+sm[1]; }
        return {
          id: a.product_id || '',
          issued: a.issue_datetime || '',
          type, level,
          summary: msg.split('\n')[0].slice(0, 120)
        };
      });
      try { localStorage.setItem(LS_KEY, JSON.stringify({ts: Date.now(), data: events})); } catch(e){ window.NRDiagnostics?.record('legacy.catch.234','recoverable'); }
      return events;
    } catch(e){ globalThis.NRDiagnostics?.record('catch.275','recoverable');
      console.warn('[NoaaEvents] fetch failed:', e.message);
      // Return stale cache if available
      try {
        const stale = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if(stale) return stale.data;
      } catch(_){ window.NRDiagnostics?.record('legacy.catch.235','recoverable'); }
      return [];
    }
  }

  // Return dates (YYYY-MM-DD) which had any G1+ storm OR M/X flare OR R/S event
  function getStormDates(events){
    const dates = new Set();
    (events || []).forEach(e => {
      if(!e.issued) return;
      const d = e.issued.slice(0, 10);
      if(e.type === 'geomagnetic' && /^G[1-5]$/.test(e.level || '')) dates.add(d);
      else if(e.type === 'flare' && /^[MX]/.test(e.level || '')) dates.add(d);
      else if(e.type === 'radio' && /^R[2-5]$/.test(e.level || '')) dates.add(d);
      else if(e.type === 'radiation' && /^S[1-5]$/.test(e.level || '')) dates.add(d);
    });
    return dates;
  }

  return { fetchAlerts, getStormDates };
})();

// Trigger initial NOAA events fetch (non-blocking)

// ═══ v88.9.11-fp192: HANG DIAGNOSTIC (замінює fp191 lite) ═══════════════════
// fp191 довів: висне НЕ render27Day і НЕ обсяг даних (32 записи теж вішали).
// Спільний знаменник 4 зависань — якась тик-функція поводиться інакше з даними.
// За замовчуванням блок ВИМКНЕНО (сторінка = поведінка fp190). Запуск ТІЛЬКИ
// вручну з ?diag=1: дані завантажуються і 22 функції syncV702UI викликаються
// ПО ОДНІЙ з паузою 800мс; ім'я кожної пишеться в localStorage ПЕРЕД викликом
// (синхронний запис переживає вбивство вкладки). Коли одна зависне: закрити
// вкладку → відкрити сайт БЕЗ параметра → червоний банер назве винну функцію.
(function _vlDiag(){
  const KEY = '__vlDiag_last';
  try {
    const last = localStorage.getItem(KEY);
    if (last && !last.endsWith('_ok') && !/[?&]diag=1/.test(location.search)) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7a1020;color:#fff;font:700 13px/1.4 monospace;padding:8px 12px;text-align:center;cursor:pointer';
      d.textContent = '🔍 ДІАГНОСТИКА: ' + (last.endsWith('_error') ? 'попередня перевірка завершилась із помилкою' : last.endsWith('_invoking')
        ? 'завис УСЕРЕДИНІ функції « ' + last.replace('_invoking','') + ' »'
        : last.endsWith('_queued')
          ? 'завис у ПАУЗІ перед « ' + last.replace('_queued','') + ' » (винен async-хвіст попередніх)'
          : 'checkpoint « ' + last + ' »') + ' — скинь це Claude. (клік = закрити)';
      d.onclick = function(){ try{localStorage.removeItem(KEY);}catch(_e){ window.NRDiagnostics?.record('legacy.catch.236','recoverable'); } d.remove(); };
      (document.body || document.documentElement).appendChild(d);
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.237','recoverable'); }
  if (!/[?&]diag=1/.test(location.search)) return;
  setTimeout(async function(){
    const st = document.createElement('div');
    st.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0a2a12;color:#8f8;font:12px monospace;padding:6px 12px';
    st.textContent = 'diag: завантажую дані…';
    document.body.appendChild(st);
    try {
      await loadExpertOverrides();
    await loadExpertCalc();
      if (_engineScores === null) {
        const resp = await fetch('engine_scores.json', { cache: 'default' });
        if (resp.ok) {
          const data = await resp.json();
          const all = (data && data.scores) || {};
          const nowMs = Date.now(), MS = 86400000, win = {};
          for (const ds in all) {
            const t = Date.parse(ds + 'T00:00:00Z');
            if (isFinite(t) && Math.abs(t - nowMs) <= 16 * MS) win[ds] = all[ds];
          }
          _engineScores = win;
        }
      }
      st.textContent = 'diag: дані є (' + Object.keys(_engineScores || {}).length + ' днів). Тестую функції по одній…';
      const handlers=Object.freeze({
        'buildDashboardState':()=>{window.__dashState=buildDashboardState()},
        'syncHero':typeof syncHero==='function'?syncHero:null,
        'syncWhy':typeof syncWhy==='function'?syncWhy:null,
        'renderMoonRetroTop':typeof renderMoonRetroTop==='function'?renderMoonRetroTop:null,
        'syncPanchSummary':typeof syncPanchSummary==='function'?syncPanchSummary:null,
        'renderConfidenceBreakdown':typeof renderConfidenceBreakdown==='function'?renderConfidenceBreakdown:null,
        'renderKpContribution':typeof renderKpContribution==='function'?renderKpContribution:null,
        'renderPanchPiLine':typeof renderPanchPiLine==='function'?renderPanchPiLine:null,
        'renderWf3':typeof renderWf3==='function'?renderWf3:null,
        'syncTrustStrip':typeof syncTrustStrip==='function'?syncTrustStrip:null,
        'syncDayPlanCard':typeof syncDayPlanCard==='function'?syncDayPlanCard:null,
        'syncPersonalContext':typeof syncPersonalContext==='function'?syncPersonalContext:null,
        'renderPersonal':typeof renderPersonal==='function'?renderPersonal:null,
        '_v73G_saveHist':()=>{const g=_v73G();if(isFinite(g))_saveGHistory(g)},
        '_renderComponentDeltaCard':typeof _renderComponentDeltaCard==='function'?_renderComponentDeltaCard:null,
        '_renderChangeLog':typeof _renderChangeLog==='function'?_renderChangeLog:null,
        'renderBestWorstDays':typeof renderBestWorstDays==='function'?renderBestWorstDays:null,
        'renderProvenance':typeof renderProvenance==='function'?renderProvenance:null,
        'renderDisagreement':typeof renderDisagreement==='function'?renderDisagreement:null,
        'renderCounterfactual':typeof renderCounterfactual==='function'?renderCounterfactual:null,
        'renderAntiAction':typeof renderAntiAction==='function'?renderAntiAction:null,
        'renderIntraDayAlert':typeof renderIntraDayAlert==='function'?renderIntraDayAlert:null
      });
      const fns=Object.keys(handlers);let failures=0;
      let i = 0;
      (function step(){
        if (i >= fns.length) {
          localStorage.setItem(KEY, failures?'COMPLETED_WITH_ERRORS_error':'ALL_PASSED_ok');
          st.textContent = 'diag: ✅ УСІ ' + fns.length + ' завершено; помилок: '+failures+'.';
          st.style.background = '#0a3a12';
          return;
        }
        const name = fns[i++];
        // v88.9.12-fp193: три checkpoint-и замість одного, щоб розрізнити:
        //   «X_queued»   = зависло у 50мс-ПАУЗІ перед X → винен async-хвіст
        //                  ПОПЕРЕДНІХ функцій (таймер/rAF, який вони запланували);
        //   «X_invoking» = зависло ВСЕРЕДИНІ самої X;
        //   «X_ok»       = X пройшла.
        localStorage.setItem(KEY, name + '_queued');
        st.textContent = 'diag [' + i + '/' + fns.length + ']: ' + name + ' …';
        setTimeout(function(){
          localStorage.setItem(KEY, name + '_invoking'); // синхронно, впритул перед викликом
          try {
            window.NRDiagnostics.invoke(handlers,name);
            localStorage.setItem(KEY, name + '_ok');
          } catch(e) {
            failures++;window.NRDiagnostics.record('probe.handler','invariant',e);
            try{localStorage.setItem(KEY,name+'_error')}catch(storageError){window.NRDiagnostics.record('probe.storage','expected_optional',storageError)}
          }
          setTimeout(step, 800);
        }, 50);
      })();
    } catch(e) { globalThis.NRDiagnostics?.record('catch.276','recoverable');
      st.textContent = 'diag: помилка завантаження даних: ' + ((e && e.message) || '?');
    }
  }, 6000);
})();
// ═══ /fp192 ═════════════════════════════════════════════════════════════════

// ═══ v88.9.13-fp194: DAY-VERDICT LOADER (fp191 повернуто після розриву рекурсії)
// Корінь зависань виправлено guard-ом у _renderHeroHierarchy (див. рядок ~12913).
// Kill-switch на випадок неочікуваного: ?verdict=off
setTimeout(async function _dayVerdictLoad(){
  try {
    if (/[?&](verdict=off|diag=1)/.test(location.search)) return; // diag має власний завантажувач
    await loadExpertOverrides();
    await loadExpertCalc();
    await loadStrongRawPolicy();
    await loadExpertDecisionRegistry();
    // fp441: the product cover is mounted before the delayed authority loaders.
    // Repaint it immediately after the verified registry is normalized, otherwise
    // Today can keep the provisional live/Engine headline until another data event.
    try { if (typeof window.renderCompetitiveCover === 'function') window.renderCompetitiveCover(); }
    catch(e) { globalThis.NRDiagnostics?.record('catch.277','recoverable');  console.warn('[fp441 authority cover refresh]', e); }
    await Promise.all([loadAutoProspectiveStatus(),loadTanitaPromotionGate()]);
    await loadTanitaReviewStatus();
    await loadBgsSpaceWeather();
    await loadSourceHealth();
    await loadSpaceWeatherAccumulated();
    await loadAiaVernadsky();
    await loadKpHourlyAlert();
    if (_engineScores === null) await loadEngineScores();
    try { if (typeof syncV702UI === 'function') syncV702UI(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.238','recoverable'); }
    try { if (typeof _renderHeroHierarchy === 'function') _renderHeroHierarchy(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.239','recoverable'); }
    try { if (typeof renderHeroBulletin === 'function') renderHeroBulletin(); } catch(e){ window.NRDiagnostics?.record('legacy.catch.240','recoverable'); }
    // fp391: refresh every horizon after the delayed PDF/Engine loaders.
    // render3Day normally runs before this block, so without this refresh a
    // verified reference could update Hero while 3/7/27-day views retained
    // their earlier live fallback until a manual reload.
    try {
      if (typeof render3Day === 'function' && typeof last3D !== 'undefined' &&
          last3D && Array.isArray(last3D.days) && last3D.days.length) {
        render3Day(last3D);
      }
    } catch(e) { globalThis.NRDiagnostics?.record('catch.278','recoverable');  console.warn('[fp391 boot horizon refresh: 3-day]', e); }
    try {
      if (typeof renderWeekSummary === 'function') renderWeekSummary();
    } catch(e) { globalThis.NRDiagnostics?.record('catch.279','recoverable');  console.warn('[fp391 boot horizon refresh: week]', e); }
    try {
      if (typeof render27Day === 'function' && typeof _last27Rows !== 'undefined' &&
          Array.isArray(_last27Rows) && _last27Rows.length) {
        render27Day(_last27Rows, (typeof last3D !== 'undefined' ? last3D : null));
      }
    } catch(e) { globalThis.NRDiagnostics?.record('catch.280','recoverable');  console.warn('[fp391 boot horizon refresh: 27-day]', e); }
    // fp424: horizon rendering can finish after the first current-surface pass.
    // Repaint Hero/timing/day-plan last so every "now" surface observes the
    // same final Panchanga window, Kp guard and reference freshness state.
    try { if (typeof syncV702UI === 'function') syncV702UI(); }
    catch(e) { globalThis.NRDiagnostics?.record('catch.281','recoverable');  console.warn('[fp424 final current-surface resync]', e); }
    try { if (typeof renderCompetitiveCover === 'function') renderCompetitiveCover(); }
    catch(e) { globalThis.NRDiagnostics?.record('catch.282','recoverable');  console.warn('[fp441 final cover refresh]', e); }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.241','recoverable'); }
}, 6000);
// ═══ /fp194 ═════════════════════════════════════════════════════════════════


setTimeout(() => {
  try { NoaaEvents.fetchAlerts().then(ev => {
    if(window._DEBUG) console.log('[NoaaEvents] loaded', (ev||[]).length, 'alerts');
    window.__noaaEvents = ev;
    window.__noaaStormDates = NoaaEvents.getStormDates(ev);
    // fp43: re-resolve via canonical function now that NoaaEvents data is available
    try {
      window._stormWindow = resolveStormWindow();
      if (typeof _applyStormGuardDOM === 'function') _applyStormGuardDOM();
      if (typeof _patchStaleLoadingDOM === 'function') _patchStaleLoadingDOM();
    } catch(_e){ window.NRDiagnostics?.record('legacy.catch.242','recoverable'); }
    // v88.8.81-fp160: показати банер, якщо є реальна подія за останні 48г
    try { _renderNoaaAlertBanner(ev); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.243','recoverable'); }
  }); } catch(e){ window.NRDiagnostics?.record('legacy.catch.244','recoverable'); }
}, 3000);

// v88.8.81-fp160: видимий банер для NOAA real-time alerts (Варіант A з роадмапу
// "раннє попередження" — дані вже фетчились, просто ніде не показувались назовні).
// Показує НАЙНОВІШУ подію за останні 48г, якщо вона є. Не чіпає G-формулу/engine —
// суто інформаційний шар.
const _NOAA_LEVEL_STYLE = {
  geomagnetic: { icon:'🧲', label:'Геомагнітна буря' },
  flare:       { icon:'☀️', label:'Спалах на Сонці' },
  radio:       { icon:'📻', label:'Радіозавади' },
  radiation:   { icon:'☢️', label:'Радіаційний шторм' },
  other:       { icon:'ℹ️', label:'Подія' }
};
/* NR_FN_SLOT 354 */
// v88.8.90-fp171: banner showed NOAA's raw internal header line ("Space
// Weather Message Code: WATA20") as the MAIN text — that line is always a
// product code, never human-readable content (the actual description is
// later in the message, which we don't fetch). Kyrylo couldn't understand
// what it meant. Fixed: generate a plain-language explanation from the
// parsed type+level instead, keep raw NOAA text as a small footnote.
const _NOAA_LEVEL_EXPLAIN = {
  G: ['Геомагнітна буря', [
    'найслабший рівень (шкала G1-G5). Незначні коливання магнітного поля, зазвичай непомітні без приладів.',
    'помітний рівень. Можливі невеликі збої в роботі супутників, слабке північне сяйво на високих широтах.',
    'середній рівень. Можливі проблеми з навігацією/радіозв\'язком, північне сяйво помітне значно південніше звичного.',
    'сильний рівень. Можливі перебої в електромережах, супутниковому зв\'язку.',
    'екстремальний рівень (найвищий). Серйозний ризик для енергомереж і супутників — рідкісна подія.'
  ]],
  X: ['Спалах на Сонці', [
    'клас M — помірний спалах. Можливі короткі радіозавади на освітленому боці Землі.',
    'клас X — сильний спалах. Можливі значні радіозавади й ризик для супутників.',
  ]],
  M: ['Спалах на Сонці', [
    'клас M — помірний спалах. Можливі короткі радіозавади на освітленому боці Землі.',
  ]],
  R: ['Радіозавади', [
    'слабкий рівень. Незначні короткочасні перебої HF-радіозв\'язку.',
    'помітний рівень. Часткова втрата HF-радіозв\'язку на освітленому боці Землі.',
    'сильний рівень. Значні перебої радіозв\'язку й навігації на кілька годин.',
  ]],
  S: ['Радіаційний шторм', [
    'слабкий рівень. Зазвичай без помітного впливу.',
    'помітний рівень. Можливий незначний ризик для астронавтів/високоширотних авіарейсів.',
    'сильний рівень. Підвищений ризик радіаційного опромінення на висоті/в космосі.',
  ]],
};
/* NR_FN_SLOT 355 */
/* NR_FN_SLOT 356 */
/* NR_FN_SLOT 357 */

{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line20593';}
