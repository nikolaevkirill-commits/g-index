// Compatibility service worker for deprecated /deploy/ scope.
// Canonical dashboard is repository root (/g-index/). Do not cache nested app.
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      // Only legacy SkyRhythm caches are owned by this worker. Never delete
      // unrelated CacheStorage entries that share the same origin.
      const owned = keys.filter(k => k.startsWith('gindex-'));
      await Promise.all(owned.map(k => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      // v117: includeUncontrolled returns every same-origin window (other apps and the canonical
      // /g-index/ page too). Only pages inside this worker's own /deploy/ scope are redirected.
      const scope = self.registration.scope;
      for (const client of clients) {
        try {
          if (!client.url.startsWith(scope)) continue;
          const target = new URL('../', scope).href;
          if (client.url !== target) await client.navigate(target);
        } catch (_) {}
      }
      await self.registration.unregister();
    } catch (_) {}
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && event.request.url.startsWith(self.registration.scope)) {
    try {
      event.respondWith(Response.redirect(new URL('../', self.registration.scope).href, 302));
    } catch (_) {}
  }
});
