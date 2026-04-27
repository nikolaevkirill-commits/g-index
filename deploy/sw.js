/* G-Index Service Worker v1.0
   Strategy:
   - App shell (HTML/CSS/JS/icons/manifest) → Cache-First
   - NOAA / SILSO API calls → Network-First, 1h TTL
   - Everything else → Network-First, no cache
*/

const SHELL_CACHE  = 'g-index-shell-v88-3';
const DATA_CACHE   = 'g-index-data-v88-3';
const DATA_TTL_MS  = 1 * 60 * 60 * 1000; // 1 hour (Dst оновлюється кожну 1h)
// App shell files to pre-cache on install
// v87.91: engine_scores.json винесено з shell у DATA — це не статика, оновлюється щотижня.
// Cache-First без TTL призводив до того, що engine застрягав на старому файлі після деплою.
const SHELL_FILES = [
  'index.html',
  'manifest.json',
  'icon192.png',
  'icon512.png',
];

// URL patterns that should use Network-First with TTL cache
// Включає CORS-проксі — вони передають прогнозні дані, не статику
const DATA_PATTERNS = [
  'engine_scores',        // v87.91: engine bulletin scores — оновлюються щотижня, не статика
  'services.swpc.noaa.gov',
  'sidc.be',              // SILSO Wolf numbers
  'api.n2yo.com',
  'allorigins.win',       // CORS proxy → forecast data
  'corsproxy.io',         // CORS proxy → forecast data
  'codetabs.com',         // CORS proxy → forecast data
  'corsfix.com',          // CORS proxy → forecast data
  'thingproxy.freeboard.io', // v87.16 A9: 5th fallback CORS proxy (був у fetchTextWithCORS але відсутній у SW)
  'timeanddate.com',      // eclipse scraping
  'solar-wind',           // Bz/Vsw endpoints (path fragment)
  'kyoto-dst',            // Dst endpoint (path fragment)
];

// ── Install: pre-cache shell ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_FILES).catch(err => {
        console.warn('[SW] Shell pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Message: SKIP_WAITING (від pwaReload()) ─────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Data: match by hostname або path fragment
  const isDataRequest = DATA_PATTERNS.some(p =>
    url.hostname.includes(p) || url.pathname.includes(p) || url.href.includes(p)
  );

  // index.html → network-first (avoid stale UI after deploy)
  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('index.html')
    || url.pathname === '/g-index/deploy/' || url.pathname === '/g-index/deploy/index.html';

  if (isDataRequest) {
    event.respondWith(networkFirstWithTTL(request));
  } else if (isHTML) {
    event.respondWith(networkFirstHTML(request));
  } else {
    event.respondWith(cacheFirstShell(request));
  }
});

// ── Network-First (HTML — always try fresh, fallback to cache) ──────────────
async function networkFirstHTML(request) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { cacheName: SHELL_CACHE });
    if (cached) return cached;
    const fallback = await caches.match('index.html', { cacheName: SHELL_CACHE });
    if (fallback) return fallback;
    return new Response('Офлайн — кеш недоступний', { status: 503 });
  }
}

// ── Cache-First (shell) ────────────────────────────────────────────────────
async function cacheFirstShell(request) {
  const cached = await caches.match(request, { cacheName: SHELL_CACHE });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline fallback: return cached dashboard
    const fallback = await caches.match('index.html', { cacheName: SHELL_CACHE });
    if (fallback) return fallback;
    return new Response('Офлайн — кеш недоступний', { status: 503 });
  }
}

// ── Network-First with 1h TTL (data) ──────────────────────────────────────
async function networkFirstWithTTL(request) {
  const cache = await caches.open(DATA_CACHE);

  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      // Store with timestamp header
      const ts = Date.now().toString();
      const headers = new Headers(response.headers);
      headers.append('x-sw-fetched-at', ts);
      const body = await response.arrayBuffer();
      const stamped = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, stamped.clone());
      // Return clean response (without x-sw-fetched-at noise)
      return new Response(body, { status: response.status, headers: response.headers });
    }
    throw new Error('Non-OK: ' + response.status);
  } catch (err) {
    // Network failed → try cache if within TTL
    const cached = await cache.match(request);
    if (cached) {
      const fetchedAt = parseInt(cached.headers.get('x-sw-fetched-at') || '0', 10);
      if (Date.now() - fetchedAt < DATA_TTL_MS) {
        console.log('[SW] Serving stale data (within TTL):', request.url);
        // Сигнал дашборду: дані з кешу, не live
        self.clients.matchAll().then(clients => clients.forEach(c =>
          c.postMessage({ type: 'SW_STALE_DATA', url: request.url, fetchedAt })
        ));
        return cached;
      }
    }
    // Stale or no cache
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// v87.37 PUSH NOTIFICATIONS — SW-side handler. Inert якщо push-endpoint не підписаний.
// ═══════════════════════════════════════════════════════════════════════════

self.addEventListener('push', event => {
  // Payload form (JSON from server): { title, body, icon?, badge?, tag?, url?, data? }
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch(e) { payload = { title: 'G-Index', body: event.data ? event.data.text() : '' }; }

  const title = payload.title || 'G-Index';
  const options = {
    body: payload.body || '',
    icon: payload.icon || 'icon192.png',
    badge: payload.badge || 'icon192.png',
    tag:   payload.tag  || 'g-index-default',
    data:  { url: payload.url || '/', ...(payload.data || {}) },
    requireInteraction: !!payload.requireInteraction,
    vibrate: payload.vibrate || [120, 40, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Клік по notification → відкрити відповідний URL або активувати існуючу вкладку
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // v87.51: дефолтний URL — scope SW (правильно для sub-path деплоїв типу /g-index/deploy/),
  // а не корневий '/' який у GitHub Pages призводить до nikolaevkirill-commits.github.io/
  const scope = self.registration.scope || '/';
  const targetUrl = (event.notification.data && event.notification.data.url) || scope;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Якщо вже відкрита вкладка з G-Index → фокус на неї
    for (const c of clientsList) {
      try {
        const u = new URL(c.url);
        // Перевірка — чи клієнт у тому ж scope
        if (c.url.startsWith(scope) || u.pathname.includes('/g-index/')) {
          await c.focus();
          if (c.navigate && targetUrl !== scope) await c.navigate(targetUrl).catch(() => {});
          return;
        }
      } catch(e) {}
    }
    // Інакше відкрити нову
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});

// Subscription change (browser-initiated renewal)
self.addEventListener('pushsubscriptionchange', event => {
  // Повідомити відкриті вкладки — клієнт має перепідписатися і записати новий endpoint у DB
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientsList.forEach(c => c.postMessage({ type: 'SW_PUSH_SUB_CHANGED' }));
  })());
});
