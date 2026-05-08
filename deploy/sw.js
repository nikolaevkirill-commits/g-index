// G-Index Service Worker v88.7.15 (архітектурні допрацювання — Б, В+, Г)
// v88.7.15 changes (3 архітектурні патчі — продовження після v88.7.14):
//   Б — Low-confidence badge у Hero (CANONICAL_METRICS f1=0.26 на neutral).
//      HTML (index.html:~1438): додано <div id="heroLowConfBadge"> у hero-maintext
//        між heroGreeting і heroDecisionBlock.
//      JS (syncHero ~8175): показ/ховання залежно від |newG| ≤ 1.0.
//      Tooltip: tag_to_text.json verdict_low_confidence_classes [-1, 0, 1] +
//        per-class F1 з CANONICAL_METRICS (Negative 0.84, Neutral 0.26, Positive 0.69).
//      Закриває критику "дашборд показує G з фейковою точністю у нейтральній зоні".
//   В+ — Posibnyk Part II SIL-3 disclaimer у heroConfidence tooltip (index.html:1469).
//      Раніше: тільки "R&D / Advisory level".
//      Тепер: + дослівне формулювання Posibnyk § II.1: "Panchanga модуль (PCL v3.1) —
//        advisory-компонент, НЕ сертифікований за SIL-3. Результати не можуть бути
//        єдиним підґрунтям критичних оперативних рішень. CBI=0, Kpanch=1.00 (заморожено)."
//      Юридично-захисна функція для військового профілю (Profile: Військовий).
//   Г — expert_overrides_v3.json інтеграція (PDF #48 calibration, 14 точкових overrides).
//      Раніше: дашборд НЕ застосовував overrides — engine pill показував raw v18.5
//        на 14 датах 12.05–24.05, розходячись з PDF expert.
//      Тепер: 1) loadExpertOverrides() — fetch + parse паралельно з engine_scores;
//             2) getEngineScore() wrap — якщо date in overrides, eng → expert_eng,
//                оригінал зберігається у _engRaw для трасування;
//             3) renderHeroBulletin: маркер ★ + tooltip "Expert override applied:
//                raw +N → calibrated +M, applied_in PDF #48".
//      Engine_scores.json НЕ зачеплено (V3 prospective freeze збережено).
//   Cache keys bumped до v88-7-15.
//
// v88.7.14 changes (точкові доопрацювання після v88.7.13):
//   E1 (index.html:3625-3627): прибрано дубль "7 днів — 7 днів" у scenarioSummarySub.
//      Раніше: "Сценарій на 7 днів — 7 днів · 4 критичних" (дубль у заголовку details + summary).
//      Тепер: "Сценарій на 7 днів — 4 критичних з 7" або "— стабільний тиждень".
//      Також прибрано невикористовувану const daysWord (no-op cleanup).
//   E2 (index.html:8273): _ageMatch вікно [22, 26] → [20, 28] годин.
//      Раніше: "Покращення з вчорашнього дня: Фон піднявся +1.9 (vs 29h тому)".
//      29h випадало з вузького [22, 26] вікна — DST shift і fetch затримки роблять 27-29h
//      типовим, не аномалією. Тепер у межах [20, 28] note приховано → "vs ≈вчора".
//   E3 (index.html:1281): tooltip на #freshnessBadge (хедер).
//      Раніше: БЕЗ title (паралельно з heroFreshness уже має v88.7.13 N3).
//      Тепер: ідентичний tooltip з 4 канонічними станами (LIVE/DELAYED/STALE/OLD/CACHED)
//      + tabindex="0" + cursor:help.
//   E4 (index.html:9099, 9112): avoidList для favorable/good GLOBAL_STATES.
//      Раніше: ['хаос','розпорошення'] для зелених станів — суперечило v88.7.13 D-патчу
//      (avoidText ○ м'який, але avoidList ще містив "хаос" — алармістський).
//      Тепер: favorable=['розпорошення','імпровізація без плану'], good=['дрібниці','розпорошення'].
//      Узгоджено з ○ реєстром і Excel ТИЖНЕВИЙ "Плановий режим".
//   Cache keys bumped до v88-7-14.
//
// v88.7.13 changes (UX-копірайтна нормалізація під канон Excel/DOCX/Posibnyk):
//   N1 (index.html:7150-7167): лейбл «Уникати» → 3-станова логіка з об'єктом.
//      Канон Posibnyk Part II Tab.1: «Уникати важливих дій» (з об'єктом).
//      worst.G > +0.5  → ховати рядок (зелений день — нема чого «уникати»)
//      worst.G ∈ (-0.5, +0.5] → «Менш сприятливий час» (без алармізму)
//      worst.G ≤ -0.5  → «Уникати важливих рішень» (Posibnyk-канон)
//      Усуває UX-конфлікт «Уникати: 15:00–18:00 G=+0.4» бачений на скрінах v88.7.12.
//   N2 (index.html:7121-7138): UTC → локальний час у Панчанга-блоці panchBestTime.
//      Sync з v88.7.10 FIX-K canonical pattern (_tzOffH).
//      Раніше: «Найкращий час: 06:00–09:00 UTC · G=+2.7» — користувач у Києві (UTC+3)
//      читав 15:00 UTC як локальне. Тепер локальний час, оригінальний UTC у title.
//   B (index.html:3583, 3594): поріг «критичних» |eng|≥2 → eng≤-2.
//      На CSV n=294 старий поріг давав 58.8% днів і 7/7 «критичних» на зеленому тижні —
//      слово втрачало семантику небезпеки. Новий поріг 32.0% даних, 7/7 неможливе.
//      Узгоджено з Excel ТИЖНЕВИЙ_ПРОГНОЗ «🔴 КРИТИЧНО» = реальна загроза.
//      i18n keys (`scenarioCritical`) збережено — слово «критичний» канонічне в реєстрі А.
//   D (index.html:9097, 9110): GLOBAL_STATES.favorable.avoidText / .good.avoidText.
//      ✖ → ○, м'якіші формулювання («Підтримуйте темп без хаосу» / «Без розпорошення на дрібниці»).
//      Узгоджено з Excel ТИЖНЕВИЙ для зелених станів («✅ СПРИЯТЛИВО · Плановий режим»).
//      Канонічна градація іконок: ○ — пасивна порада (зелена/нейтральна), ✖ — заборона (червона).
//      neutral/unstable/tense — без змін (контроль).
//   N3 (index.html:1463): tooltip на #heroFreshness (раніше БЕЗ title).
//      LIVE/STALE/CACHED/OFFLINE поясннено: 5хв/5хв-1год/проксі/немає підключення.
//      + tabindex="0" для keyboard-доступу + cursor:help.
//   N4 (index.html:7191-7322): tooltip на «3-day Pᵢ середнє» row у panchUpcoming.
//      Додано `tip:` field в items.push (опційно, для майбутніх items теж).
//      Render використовує it.tip → title attr через escapeHtml + cursor:help.
//      Текст: формула Pᵢ, пороги класифікації, джерело (live noon UTC).
//   Cache keys bumped до v88-7-13.
//
// v88.7.12 changes (FIX-M — уніфікація Рівень 1):
//   Hero Astro chip раніше показував tithi/nakshatra/yoga з engine_scores.json
//   (Swiss Ephemeris, local sunrise reference). Панчанга картка нижче — live
//   astronomy-engine (noon UTC). На boundary днях (~46%) tithi розходились на 1.
//   Виправлено: chip ТЕПЕР читає назви з _lastPanchCtx (live, той самий що картка).
//   Score (cal_score) і символи (cal_symbols — затемнення/Sankranti) — далі з engine_scores.
//   Engine pill (+3) — frozen для backtest, не змінюється.
//   Маркер ⊙ біля chip коли engine ≠ live — натяк на tooltip з обома значеннями.
//   Cache keys bumped до v88-7-12.
//
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
// v88.7.12 changes (FIX-M — уніфікація Рівень 1):
//   Hero Astro chip раніше показував tithi/nakshatra/yoga з engine_scores.json
//   (Swiss Ephemeris, local sunrise reference). Панчанга картка нижче — live
//   astronomy-engine (noon UTC). На boundary днях (~46%) tithi розходились на 1.
//   Виправлено: chip ТЕПЕР читає назви з _lastPanchCtx (live, той самий що картка).
//   Score (cal_score) і символи (cal_symbols — затемнення/Sankranti) — далі з engine_scores.
//   Engine pill (+3) — frozen для backtest, не змінюється.
//   Маркер ⊙ біля chip коли engine ≠ live — натяк на tooltip з обома значеннями.
//   Cache keys bumped до v88-7-12.
//
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
//   У файлі знайдено 11 сайтів які читали window.X для X що оголошене let/const:
//     • _lastPanchCtx — 7 reads (syncTrustStrip, buildDashboardState, decision-injects тощо).
//       Усі повертали undefined → Vishti warnings, Ekadashi notes, Rahu badges не зявлялись.
//       Виправлено: заміна window._lastPanchCtx → _lastPanchCtx (у тому ж script).
//     • lastWWV — 4 reads (renderProvenance — журнал джерел).
//       Заміна window.lastWWV → lastWWV.
//     • PaywallModal — 9 reads (analytics monkey-patcher у іншому script tag).
//     • PAYWALL — 2 reads (там само).
//       Виправлено: window.PAYWALL = PAYWALL; window.PaywallModal = PaywallModal;
//       (cross-script bridge — name lookup не працює між script tags).
//   Cache keys bumped до v88-7-12.
//
// v88.7.10 changes (FIX-K — decision timing labels):
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
//   В JS, top-level let/const у <script> НЕ стають properties of window.
//   У файлі знайдено 11 сайтів які читали window.X для X що оголошене let/const:
//     • _lastPanchCtx — 7 reads (syncTrustStrip, buildDashboardState, decision-injects тощо).
//       Усі повертали undefined → Vishti warnings, Ekadashi notes, Rahu badges не зявлялись.
//       Виправлено: заміна window._lastPanchCtx → _lastPanchCtx (у тому ж script).
//     • lastWWV — 4 reads (renderProvenance — журнал джерел).
//       Заміна window.lastWWV → lastWWV.
//     • PaywallModal — 9 reads (analytics monkey-patcher у іншому script tag).
//     • PAYWALL — 2 reads (там само).
//       Виправлено: window.PAYWALL = PAYWALL; window.PaywallModal = PaywallModal;
//       (cross-script bridge — name lookup не працює між script tags).
//   Cache keys bumped до v88-7-12.
//
// v88.7.10 changes (FIX-K — decision timing labels):
//   Користувач у Києві (UTC+3) читав "12:00–15:00 ◀ зараз" як локальний час, тоді як годинник
//   показував 15:30 — слот сприймався як минулий, хоча у UTC-логіці він активний.
//   Heat-strip і План дня вже конвертували в локальний час; decisionTimingList лишався єдиним
//   місцем, що друкував RAW UTC. Виправлено: normalizeDaySlots() тепер обчислює localStart/End
//   через _tzOffH (sync з heat-strip), isNow/isPast лишаються в UTC (логіка коректна).
//   Cache keys bumped до v88-7-12.
//
// v88.7.9 changes (cleanup pass — no logic changes, comment-only):
// v88.7.10 changes (FIX-K — decision timing labels):
//   В блоці "Коли діяти" мітки слотів (12:00–15:00) друкувались UTC-години БЕЗ позначки UTC.
//   Користувач у Києві (UTC+3) читав "12:00–15:00 ◀ зараз" як локальний час, тоді як годинник
//   показував 15:30 — слот сприймався як минулий, хоча у UTC-логіці він активний.
//   Heat-strip і План дня вже конвертували в локальний час; decisionTimingList лишався єдиним
//   місцем, що друкував RAW UTC. Виправлено: normalizeDaySlots() тепер обчислює localStart/End
//   через _tzOffH (sync з heat-strip), isNow/isPast лишаються в UTC (логіка коректна).
//   Cache keys bumped до v88-7-12.
//
// v88.7.9 changes (cleanup pass — no logic changes, comment-only):
//   • EVENT_WEIGHTS reference у тестовому коментарі → WEIGHT_E_EVENTS.
//   • Видалено tombstone-коментарі для функцій що видалені давно (renderNowKpChart,
//     render45, renderOrbitSvg, gTopRow merge note).
//   • Скорочено два розлогих v87.97 коментарі про removed CSS — лишився лише суть
//     поточної логіки (scoreBar gCtx-aware).
//   Cache keys bumped до v88-7-12.
//
// v88.7.8 changes (deep audit pass):
//   FIX-A: Typo «Покнrima» → «Purnima» (видно у Methodology UI).
//   FIX-B: Penumbral eclipse ±1d тепер реально clamp до 0 (Math.trunc замість Math.round —
//          раніше Math.round(-0.75)=-1 у JS, всупереч коментарю-обіцянці).
//   FIX-C: Snᵢ компонент додано у формулу-tooltip (4 місця: legend, methodology, header UA/EN).
//   FIX-D: Karana tooltip показує реальний type+note замість stub-у «Вплив: нейтральний»
//          для не-Vishti. Vishti пом'якшено: «АБСОЛЮТНЕ ВЕТО» → «традиційно вето» з PCL.
//   FIX-E: 26 слів з ASCII «i» в кириличних виправлено на «і» (пік, тільки, увімкнено...).
//          + «розвіддaними» (з ASCII «a») → «розвідданими».
//   FIX-F: Karana — прибрано зайвий %60 (вже у range через floor), додано Math.min(59,...) clamp.
//   FIX-G: TITHI_SCORE inconsistency задокументована коментарем (свідома BPHS-калібровка).
//   FIX-H: Snᵢ chip додано у hero factors (раніше тільки tooltip — користувач не бачив,
//          звідки −0.2/−0.4 у G).
//   FIX-I: computeAi тепер викликає computeDstModifier() — спільна логіка з Science Bar.
//          Усунуто 8 рядків inline-дубля порогової логіки (-100, -50).
//   FIX-J: Math restructure — один Math.round в кінці замість 3 послідовних (Pi→Ai→AiFull).
//          Раніше накопичувалась похибка ≤±0.05; тепер ΣAᵢ обчислюється на raw values,
//          округлення ТІЛЬКИ для UI display (Pi, eiTotal, Ai, AiFull).
//   Cache keys bumped до v88-7-12.
//
// v88.7.7 changes:
//   CRITICAL hot-fix: trend "7 днів" — два прихованих баги:
//     1. last3D filter d.date < todayStr завжди false (Date<string→NaN coerce → false ALWAYS).
//        Виправлено: filter через fmtDate(d.date) < todayStr (string<string).
//     2. _27dComputed[0] припускалось як today, але NOAA 27-day-outlook починається з
//        дня публікації (понеділок), не today. У четвер _27dComputed[0..3] = всі минулі.
//        Виправлено: findIndex(d=>d.ds===todayStr), беремо [idxToday..idxToday+3].
//     3. render27Day тепер повторно викликає _renderWhyTrend() після build27dComputed.
// v88.7.6 changes (math + UX audit: 4 bugs fixed):
//   BUG-1: trend "7 днів" sparkline — обмежено last3D до slice(-3) минулих + race-fallback.
//   BUG-2: 3-day forecast quick-cards — UAF Alaska fallback тепер теж гарантує 3 дні.
//   BUG-3: hero ↔ personal cycle conflict — додано банер "Глобальний фон vs Ваш цикл".
//   BUG-4: day-label у тренді — round + noon-UTC anchor (DST-safe).
// v88.7.5 changes: tooltip «Довіра» виправлений — реальний max=92% by design.
// v88.7.4 changes: bulk replace ~35 згадок «engine v17» → «engine v18.5».
// v88.7.3 changes: tooltips on Lᵢ/Mᵢ/eᵢ/Pᵢ/Dᵢ chips + heroConfidence.
// v88.7.2 changes: bump cache keys (NOAA Worker URL hardcoded).
// v88.7.1 changes: bump cache keys (CSP + title).
// v88.7.0 changes (deep audit fixes):
//   1. Comment-reality match: shell тепер реально stale-while-revalidate.
//   2. Cache key bumped для invalidation.
//   3. backtest.html додано до SHELL_FILES.
//   4. cache.put awaited перед SW_FRESH_DATA notify (race fix).

const SHELL_CACHE = 'g-index-shell-v88-7-15';
const DATA_CACHE = 'g-index-data-v88-7-15';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  './backtest.html',
];

self.addEventListener('error', (event) => {
  console.error('[SW Error]', event.message, 'at', event.filename, ':', event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled rejection]', event.reason);
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // v88.7.15 Г: expert_overrides_v3.json — network-first з cached fallback (як engine_scores).
  // Файл оновлюється коли експерт випускає новий PDF (раз на 1-2 тижні).
  if (url.pathname.endsWith('expert_overrides_v3.json')) {
    event.respondWith(
      fetch(event.request)
        .then(async (resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            const cache = await caches.open(DATA_CACHE);
            await cache.put(event.request, clone);
          }
          return resp;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response('{"overrides":[]}', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  if (url.pathname.endsWith('engine_scores.json')) {
    event.respondWith(
      fetch(event.request)
        .then(async (resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            const cache = await caches.open(DATA_CACHE);
            await cache.put(event.request, clone);
            const clients = await self.clients.matchAll();
            clients.forEach((c) => c.postMessage({
              type: 'SW_FRESH_DATA',
              fetchedAt: Date.now(),
            }));
          }
          return resp;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) {
              self.clients.matchAll().then((clients) => {
                clients.forEach((c) => c.postMessage({
                  type: 'SW_STALE_DATA',
                  fetchedAt: Date.now() - 86400000,
                }));
              });
            }
            return cached || new Response('{"scores":{}}', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  const isShell = SHELL_FILES.some(f => {
    const normalized = f === './' ? '/' : f.replace('./', '/');
    return url.pathname === normalized || url.pathname.endsWith(normalized);
  });
  
  if (isShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'G-Index', body: event.data.text() }; }
  
  const safeTitle = String(data.title || 'G-Index').slice(0, 80);
  const safeBody = String(data.body || '').slice(0, 200);
  
  event.waitUntil(
    self.registration.showNotification(safeTitle, {
      body: safeBody,
      icon: './icon192.png',
      badge: './icon192.png',
      data: data.url || './',
      tag: data.tag || 'g-index-default',
      renotify: data.renotify === true,
      requireInteraction: data.priority === 'high',
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  let targetUrl = (event.notification.data && typeof event.notification.data === 'string')
    ? event.notification.data
    : './';
  
  if (targetUrl !== './') {
    try {
      const u = new URL(targetUrl, self.location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        targetUrl = './';
      } else if (u.origin !== self.location.origin) {
        targetUrl = './';
      }
    } catch(e) {
      targetUrl = './';
    }
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(targetUrl) && 'focus' in client) {
          if (action) client.postMessage({ type: 'NOTIFICATION_ACTION', action });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
