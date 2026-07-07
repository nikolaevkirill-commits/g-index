// G-Index emergency Service Worker v88.8.61-fp137
// Purpose: remove stale SW/cache and get out of the way.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch(e) {}
    try { await self.registration.unregister(); } catch(e) {}
    try { const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true}); clients.forEach(c => c.navigate(c.url)); } catch(e) {}
  })());
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
