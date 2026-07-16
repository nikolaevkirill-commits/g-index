// G-Index SW — normal caching (replaces fp143 self-destruct kill-switch, 2026-07-11)
//
// IMPORTANT: bump CACHE_VERSION on EVERY deploy that changes index.html or
// any cached asset. This is what prevents the old staleness bug that forced
// the self-destruct switch in the first place — a stale cache is only
// possible if this version string is not bumped.
//
// Strategy:
//  - HTML and JSON (index.html, engine_scores.json, future_kp.json, etc.):
//    NETWORK-FIRST. Always try to fetch the freshest version; cache is only
//    used as an offline fallback if the network fails. This means even if
//    CACHE_VERSION is forgotten, users still get fresh data as long as they
//    have connectivity — the old bug required BOTH a stale cache AND
//    cache-first HTML serving to happen together.
//  - Static shell assets (icons, manifest.json): CACHE-FIRST. These rarely
//    change and cache-first here is safe and fast.

const CACHE_VERSION = 'fp199-v1'; // bump this string on every deploy
const SHELL_CACHE = `gindex-shell-${CACHE_VERSION}`;
const DATA_CACHE = `gindex-data-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './manifest.json',
  './icon512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
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

  const isHtmlOrData =
    req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js');

  if (isHtmlOrData) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(DATA_CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
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
