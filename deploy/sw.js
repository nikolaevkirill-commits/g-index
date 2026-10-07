// Compatibility service worker for deprecated /deploy/ scope.
// Canonical dashboard is repository root (/g-index/). Do not cache nested app.
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      for (const client of clients) {
        try {
          const target = new URL('../', client.url).href;
          if (client.url !== target) client.navigate(target);
        } catch (_) {}
      }
      await self.registration.unregister();
    } catch (_) {}
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    try {
      event.respondWith(Response.redirect(new URL('../', event.request.url).href, 302));
    } catch (_) {}
  }
});
