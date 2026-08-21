// G-Index service worker. HTML/data are network-first; static shell is cache-first.
// Bump CACHE_VERSION whenever index.html or a cached shell asset changes.
const CACHE_VERSION = 'fp410-v1'; // audit evidence closure: operational-surface verifier + explicit backlog semantics
const CACHE_PREFIX = 'gindex-'; // G-Index cache namespace; do not remove the prefix.
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './manifest.json',
  './icon512.png',
  './astronomy-engine-2.1.19.min.js',
  './OUTCOME_INTAKE_FORM_v1.html'
];

self.addEventListener('install', (event) => {
  // fp312: remain waiting until the user presses the visible Update button.
  // Automatic skipWaiting + the 5-minute update probe caused surprise full-page
  // reloads (a black screen while the 1.4 MB dashboard initialized).
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
});

// fp359: the page's Update button posts SKIP_WAITING. Without this listener a
// newly installed worker remained in waiting forever and the blue update bar
// reappeared after every reload.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== SHELL_CACHE && k !== DATA_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  const isCrossOrigin = url.origin !== self.location.origin;
  const isHtmlOrData =
    !isCrossOrigin && (
      req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.js')
    );

  if (isCrossOrigin) {
    // Cross-origin responses are not cached: opaque bodies cannot be stamped safely.
    return;
  }

  if (isHtmlOrData) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const fresh = await fetch(req);
        if (!fresh.ok) {
          throw new Error(`HTTP ${fresh.status} for ${req.url}`);
        }
        // Stamp same-origin cached data so the page can report its real fallback age.
        try {
          const _stampedHeaders = new Headers(fresh.headers);
          _stampedHeaders.set('x-gindex-cached-at', String(Date.now()));
          const _body = await fresh.clone().arrayBuffer();
          const _stamped = new Response(_body, {
            status: fresh.status,
            statusText: fresh.statusText,
            headers: _stampedHeaders
          });
          await cache.put(req, _stamped);
        } catch (_stampErr) {
          // If header stamping fails, preserve a usable unstamped response.
          try { await cache.put(req, fresh.clone()); } catch (_e2) { /* best-effort */ }
        }
        return fresh;
      } catch (e) {
        let cached = await cache.match(req);
        if (!cached) {
          const shellCache = await caches.open(SHELL_CACHE);
          cached = await shellCache.match(req);
        }
        if (cached) {
          // Tell the page exactly when fallback data was cached, when known.
          try {
            const clients = await self.clients.matchAll({ type: 'window' });
            const _cachedAtHeader = cached.headers.get('x-gindex-cached-at');
            const fetchedAt = _cachedAtHeader ? parseInt(_cachedAtHeader, 10) : null;
            clients.forEach((c) => {
              c.postMessage({ type: 'SW_STALE_DATA', fetchedAt, url: req.url, ageUnknown: !_cachedAtHeader });
            });
          } catch (_e) { /* best-effort notification; never block the response */ }
          return cached;
        }
        throw e;
      }
    })());
    return;
  }

  // Static shell assets: cache-first, fall back to network.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// fp292: real Web Push display + deterministic deep-link routing.
// Previously the Worker delivered a payload, but the Service Worker had no
// `push`/`notificationclick` listeners, so a background delivery could be
// silently discarded and a notification click could not open the relevant
// dashboard block.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_e) {
    try { payload = { body: event.data ? event.data.text() : '' }; }
    catch (_e2) { payload = {}; }
  }

  const category = String(payload.category || 'daily');
  const target = payload.url ||
    (category === 'storm' ? './?push=storm#kpHourlyPanel' : './?push=daily#heroCard');
  const options = {
    body: payload.body || 'Оновився прогноз NeboRhythm',
    icon: './icon192.png',
    badge: './icon192.png',
    tag: payload.tag || `gindex-${category}`,
    renotify: category === 'storm',
    data: { url: target, category },
    actions: [{ action: 'open', title: 'Відкрити NeboRhythm' }]
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'NeboRhythm', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawTarget = event.notification?.data?.url || './?push=daily#heroCard';
  const target = new URL(rawTarget, self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(target);
          return client.focus();
        }
      } catch (_e) { /* try next client */ }
    }
    return self.clients.openWindow(target);
  })());
});


