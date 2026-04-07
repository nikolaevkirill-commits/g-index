/* G-Index Service Worker v1.0
   Strategy:
   - App shell (HTML/CSS/JS/icons/manifest) → Cache-First
   - NOAA / SILSO API calls → Network-First, 3h TTL
   - Everything else → Network-First, no cache
*/

const SHELL_CACHE  = 'g-index-shell-v67';
const DATA_CACHE   = 'g-index-data-v1';
const DATA_TTL_MS  = 30 * 60 * 1000; // 30 min (компроміс: буря оновлюється частіше)


// App shell files to pre-cache on install
const SHELL_FILES = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

// URL patterns that should use Network-First with TTL cache
const DATA_PATTERNS = [
  'services.swpc.noaa.gov',
  'sidc.be',          // SILSO Wolf numbers
  'api.n2yo.com',
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

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s)
  if (!url.protocol.startsWith('http')) return;

  const isDataRequest = DATA_PATTERNS.some(p => url.hostname.includes(p));

  if (isDataRequest) {
    event.respondWith(networkFirstWithTTL(request));
  } else {
    event.respondWith(cacheFirstShell(request));
  }
});

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

// ── Network-First with 3h TTL (data) ──────────────────────────────────────
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
