// G-Index Service Worker v88.7.6 (math + UX audit: 4 bugs fixed)
// v88.7.6 changes:
//   BUG-1: trend "7 днів" sparkline — обмежено last3D до slice(-3) минулих + race-fallback
//          через computeAi коли _27dComputed ще не готове. Тепер "зараз" завжди на тренді.
//   BUG-2: 3-day forecast quick-cards — UAF Alaska fallback тепер теж гарантує 3 дні
//          через спільну функцію _ensureThreeDays + _fillPlaceholderDays.
//   BUG-3: hero ↔ personal cycle conflict — додано банер "Глобальний фон vs Ваш цикл"
//          для інверсного випадку (G ≥ 0 + Taara=Vipat/Pratyak/Naidhana).
//   BUG-4: day-label у тренді — round + noon-UTC anchor (DST-safe; ceil давав +1 при DST).
//   Cache keys bumped до v88-7-6 для invalidation попередніх версій при deploy.
// v88.7.5 changes: tooltip «Довіра» виправлений — реальний max=92% by design (v87.14 floor penalty).
// v88.7.4 changes: bulk replace ~35 згадок «engine v17» у UI tooltips/headings/i18n → «engine v18.5».
// v88.7.3 changes: tooltips on Lᵢ/Mᵢ/eᵢ/Pᵢ/Dᵢ chips + heroConfidence; "8 джерел" → "5 джерел" sync.
// v88.7.2 changes: bump cache keys to invalidate v88.7.2 (NOAA Worker URL hardcoded).
// v88.7.1 changes: bump cache keys to invalidate v88.7.1 client-side fixes (CSP + title).
// v88.7.0 changes (deep audit fixes):
//   1. Comment-reality match: shell тепер реально stale-while-revalidate (не cache-first)
//   2. Cache key bumped до v88-7-0 для invalidation старих cache при deploy
//   3. backtest.html додано до SHELL_FILES
//   4. cache.put awaited перед SW_FRESH_DATA notify (race fix)

const SHELL_CACHE = 'g-index-shell-v88-7-6';
const DATA_CACHE = 'g-index-data-v88-7-6';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  './backtest.html',
];

// V25-fu18: Service Worker error logging для observability
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
  
  // engine_scores.json — network first з fallback to cache
  if (url.pathname.endsWith('engine_scores.json')) {
    event.respondWith(
      fetch(event.request)
        .then(async (resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            // v88.7.0 race fix: чекаємо на cache.put перед notify клієнтів
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
              // Notify про stale
              self.clients.matchAll().then((clients) => {
                clients.forEach((c) => c.postMessage({
                  type: 'SW_STALE_DATA',
                  fetchedAt: Date.now() - 86400000, // unknown age, default 24h
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
  
  // v88.7.0: Shell files — TRUE stale-while-revalidate (раніше було cache-first → stale forever)
  // Match по pathname (не повний URL), бо origin може варіюватись (localhost vs github.io)
  const isShell = SHELL_FILES.some(f => {
    const normalized = f === './' ? '/' : f.replace('./', '/');
    return url.pathname === normalized || url.pathname.endsWith(normalized);
  });
  
  if (isShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Background revalidation (паралельно з cache return)
        const fetchPromise = fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        }).catch(() => null); // network may fail offline, що OK — cache fallback
        
        // Якщо cache є — віддаємо одразу (instant load), 
        // паралельно fetchPromise оновлює cache для НАСТУПНОГО reload.
        // Якщо cache немає — чекаємо мережу.
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // Інші запити — passthrough (не cache)
});

// Push notifications support (v88+)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'G-Index', body: event.data.text() }; }
  
  // v88.7.0 hardening: clamp текстові поля до safe lengths (prevent abuse)
  const safeTitle = String(data.title || 'G-Index').slice(0, 80);
  const safeBody = String(data.body || '').slice(0, 200);
  
  event.waitUntil(
    self.registration.showNotification(safeTitle, {
      body: safeBody,
      icon: './icon192.png',
      badge: './icon192.png',
      data: data.url || './',
      tag: data.tag || 'g-index-default',  // V25-fu14: dedupe — replaces previous notification з same tag
      renotify: data.renotify === true,    // V25-fu14: notify only if explicitly requested (default: silent replace)
      requireInteraction: data.priority === 'high',  // High-priority stays until user interacts
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [], // v88.7.0: type-check + max 2 actions
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // V25-fu14: handle action buttons (if present)
  const action = event.action;
  let targetUrl = (event.notification.data && typeof event.notification.data === 'string')
    ? event.notification.data
    : './';
  
  // V25-fu18: Validate targetUrl — prevent javascript:/data: schemes
  // Only allow relative './' or HTTPS URLs to same origin
  if (targetUrl !== './') {
    try {
      const u = new URL(targetUrl, self.location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        targetUrl = './';
      } else if (u.origin !== self.location.origin) {
        // Don't open external URLs from notifications
        targetUrl = './';
      }
    } catch(e) {
      targetUrl = './';
    }
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Try focus existing window
      for (const client of clients) {
        if (client.url.endsWith(targetUrl) && 'focus' in client) {
          if (action) client.postMessage({ type: 'NOTIFICATION_ACTION', action });
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
