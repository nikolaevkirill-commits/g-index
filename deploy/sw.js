// G-Index Service Worker v88.6.13b (V25-fu30: title bump + engine expiration warning)
// Cache strategy: stale-while-revalidate для shell, network-first для data

const SHELL_CACHE = 'g-index-shell-v88-6-13b-v25fu30';
const DATA_CACHE = 'g-index-data-v88-6-13b-v25fu30';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
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
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(DATA_CACHE).then((cache) => 
              cache.put(event.request, clone)
            );
            // Notify клієнтів про нові data
            self.clients.matchAll().then((clients) => {
              clients.forEach((c) => c.postMessage({
                type: 'SW_FRESH_DATA',
                fetchedAt: Date.now(),
              }));
            });
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
  
  // Shell files — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp.ok && SHELL_FILES.some(f => url.pathname.endsWith(f.replace('./', '')))) {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then((cache) => 
            cache.put(event.request, clone)
          );
        }
        return resp;
      });
    })
  );
});

// Push notifications support (v88+)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'G-Index', body: event.data.text() }; }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'G-Index', {
      body: data.body || '',
      icon: './icon192.png',
      badge: './icon192.png',
      data: data.url || './',
      tag: data.tag || 'g-index-default',  // V25-fu14: dedupe — replaces previous notification з same tag
      renotify: data.renotify === true,    // V25-fu14: notify only if explicitly requested (default: silent replace)
      requireInteraction: data.priority === 'high',  // High-priority stays until user interacts
      actions: data.actions || [],         // Allow custom action buttons
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
