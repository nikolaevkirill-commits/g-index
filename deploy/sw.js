// G-Index SW fp143 SELF-DESTRUCT: розреєстровує себе, чистить усі кеші, перезавантажує клієнтів.
// Мета: прибрати старий кешуючий SW, що віддавав застарілі версії. Після виконання
// сторінка обслуговується напряму з мережі без SW-посередника.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    try {
      const clientList = await self.clients.matchAll({ type: 'window' });
      clientList.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
    } catch (e) {}
  })());
});
// Поки живий — не перехоплюємо кеш, лише прямий network passthrough.
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)); });
