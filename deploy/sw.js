/* G-Index Service Worker v1.1
   Strategy:
   - index.html → Network-First (завжди свіжий)
   - assets (icons, manifest) → Cache-First
   - NOAA / SILSO API calls → Network-First, 1h TTL
   - Activate → force reload всіх вкладок (нова версія одразу)
*/

const SHELL_CACHE  = 'g-index-shell-v77';
const DATA_CACHE   = 'g-index-data-v1';
const DATA_TTL_MS  = 1 * 60 * 60 * 1000; // 1 hour

// Тільки статичні assets — НЕ index.html
const SHELL_FILES = [
  'manifest.json',
  'icon192.png',
  'icon512.png',
];

const DATA_PATTERNS = [
  'services.swpc.noaa.gov',
  'sidc.be',
  'api.n2yo.com',
  'allorigins.win',
  'corsproxy.io',
  'codetabs.com',
  'corsfix.com',
  'timeanddate.com',
  'solar-wind',
  'kyoto-dst',
];

// ── Install: pre-cache assets (без index.html) ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_FILES).catch(err => {
        console.warn('[SW] Shell pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())  // активуємо одразу
  );
});

// ── Activate: видалити старі кеші + force reload всіх вкладок ─────────────
self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !keep.includes(k)).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(async () => {
        await self.clients.claim();
        // Force reload всіх відкритих вкладок — нова версія одразу
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          console.log('[SW] Reloading client:', client.url);
          client.navigate(client.url);
        });
      })
  );
});

// ── Message: SKIP_WAITING ──────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // index.html → завжди Network-First (ніколи не кешуємо)
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // Data API → Network-First з TTL
  const isDataRequest = DATA_PATTERNS.some(p =>
    url.hostname.includes(p) || url.pathname.includes(p) || url.href.includes(p)
  );

  if (isDataRequest) {
    event.respondWith(networkFirstWithTTL(request));
  } else {
    event.respondWith(cacheFirstShell(request));
  }
});

// ── Network-First для index.html (завжди свіжий) ──────────────────────────
async function networkFirstHTML(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    return response;
  } catch (err) {
    // Офлайн: повертаємо кешований index.html якщо є
    const cached = await caches.match('index.html', { cacheName: SHELL_CACHE });
    if (cached) return cached;
    return new Response('Офлайн — кеш недоступний', { status: 503 });
  }
}

// ── Cache-First для статичних assets ──────────────────────────────────────
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
    const fallback = await caches.match('index.html', { cacheName: SHELL_CACHE });
    if (fallback) return fallback;
    return new Response('Офлайн — кеш недоступний', { status: 503 });
  }
}

// ── Network-First з TTL для даних ─────────────────────────────────────────
async function networkFirstWithTTL(request) {
  const cache = await caches.open(DATA_CACHE);

  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
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
      return new Response(body, { status: response.status, headers: response.headers });
    }
    throw new Error('Non-OK: ' + response.status);
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      const fetchedAt = parseInt(cached.headers.get('x-sw-fetched-at') || '0', 10);
      if (Date.now() - fetchedAt < DATA_TTL_MS) {
        self.clients.matchAll().then(clients => clients.forEach(c =>
          c.postMessage({ type: 'SW_STALE_DATA', url: request.url, fetchedAt })
        ));
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
