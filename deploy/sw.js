// G-Index Service Worker v88.7.9 (cleanup pass — no logic changes, comment-only)
// v88.7.9 changes (cleanup pass — no logic changes, comment-only):
//   • SYMBOL_WEIGHTS reference у коментарі CAL_SYMBOL_DISPLAY → виправлено на правильну назву.
//   • EVENT_WEIGHTS reference у тестовому коментарі → WEIGHT_E_EVENTS.
//   • Видалено tombstone-коментарі для функцій що видалені давно (renderNowKpChart,
//     render45, renderOrbitSvg, gTopRow merge note).
//   • Скорочено два розлогих v87.97 коментарі про removed CSS — лишився лише суть
//     поточної логіки (scoreBar gCtx-aware).
//   Cache keys bumped до v88-7-9.
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
//   Cache keys bumped до v88-7-9.
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

const SHELL_CACHE = 'g-index-shell-v88-7-9';
const DATA_CACHE = 'g-index-data-v88-7-9';

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
