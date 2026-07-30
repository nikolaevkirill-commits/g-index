// G-Index SW вЂ” normal caching (replaces fp143 self-destruct kill-switch, 2026-07-11)
//
// IMPORTANT: bump CACHE_VERSION on EVERY deploy that changes index.html or
// any cached asset. This is what prevents the old staleness bug that forced
// the self-destruct switch in the first place вЂ” a stale cache is only
// possible if this version string is not bumped.
//
// Strategy:
//  - HTML and JSON (index.html, engine_scores.json, future_kp.json, etc.):
//    NETWORK-FIRST. Always try to fetch the freshest version; cache is only
//    used as an offline fallback if the network fails. This means even if
//    CACHE_VERSION is forgotten, users still get fresh data as long as they
//    have connectivity вЂ” the old bug required BOTH a stale cache AND
//    cache-first HTML serving to happen together.
//  - Static shell assets (icons, manifest.json): CACHE-FIRST. These rarely
//    change and cache-first here is safe and fast.
//
// v88.9.32-fp213 FIX-CRITICAL (Р°СѓРґРёС‚-СЂР°СѓРЅРґ-3): activate СЂР°РЅС–С€Рµ РІРёРґР°Р»СЏРІ Р‘РЈР”Р¬-РЇРљРР™
// cache key, С‰Рѕ РЅРµ С” РЅР°С€РёРјРё РґРІРѕРјР° РїРѕС‚РѕС‡РЅРёРјРё вЂ” CacheStorage СЃРїС–Р»СЊРЅРёР№ РґР»СЏ Р’РЎР¬РћР“Рћ
// origin nikolaevkirill-commits.github.io, С‚РѕРјСѓ С†Рµ РјРѕРіР»Рѕ Р·РЅРёС‰РёС‚Рё РєРµС€С– Р†РќРЁРРҐ
// GitHub Pages РїСЂРѕС”РєС‚С–РІ РЅР° С‚РѕРјСѓ СЃР°РјРѕРјСѓ РґРѕРјРµРЅС–. РўРµРїРµСЂ РІРёРґР°Р»СЏС”РјРѕ Р»РёС€Рµ РєР»СЋС‡С– Р·
// РІР»Р°СЃРЅРёРј РїСЂРµС„С–РєСЃРѕРј 'gindex-', С‰Рѕ РЅРµ С” РїРѕС‚РѕС‡РЅРѕСЋ РІРµСЂСЃС–С”СЋ.

const CACHE_VERSION = 'fp345-v1'; // Tanita P0+P1+P2+P3 visual truth; full chronological test coverage; score frozen
const CACHE_PREFIX = 'gindex-'; // РІР»Р°СЃРЅРёР№ namespace вЂ” РќР†РљРћР›Р РЅРµ С‡С–РїР°С‚Рё РєР»СЋС‡С– Р±РµР· С†СЊРѕРіРѕ РїСЂРµС„С–РєСЃР°
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './manifest.json',
  './icon512.png'
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

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        // v88.9.32-fp213: РўР†Р›Р¬РљР РІР»Р°СЃРЅС– Р·Р°СЃС‚Р°СЂС–Р»С– РєРµС€С– вЂ” С‡СѓР¶С– (Р±РµР· РїСЂРµС„С–РєСЃР°
        // CACHE_PREFIX) РЅС–РєРѕР»Рё РЅРµ С‡С–РїР°С”РјРѕ, РЅР°РІС–С‚СЊ СЏРєС‰Рѕ РІРѕРЅРё СЃС‚Р°СЂС–/РЅРµРІС–РґРѕРјС–.
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

  // v88.9.58-fp240 FIX-CRITICAL (Р°СѓРґРёС‚-СЂР°СѓРЅРґ-26): СЂР°РЅС–С€Рµ isHtmlOrData РЅРµ
  // РїРµСЂРµРІС–СЂСЏРІ url.origin вЂ” С‚РѕРјСѓ Р·Р°РїРёС‚ РґРѕ Р—РћР’РќР†РЁРќР¬РћР‡ CDN-Р±С–Р±Р»С–РѕС‚РµРєРё (РЅР°РїСЂ.
  // astronomy-engine Р· jsdelivr/unpkg, СЏРєС‰Рѕ РІРѕРЅР° РїС–РґРєР»СЋС‡РµРЅР° С‡РµСЂРµР· .js URL)
  // С‚РµР¶ РїРѕС‚СЂР°РїР»СЏРІ Сѓ РЅР°С€ network-first РїРµСЂРµС…РѕРїР»СЋРІР°С‡. Р”Р»СЏ cross-origin Р·Р°РїРёС‚Сѓ
  // Р±РµР· СЏРІРЅРёС… CORS-Р·Р°РіРѕР»РѕРІРєС–РІ Р· Р±РѕРєСѓ CDN fetch() СѓСЃРµСЂРµРґРёРЅС– SW РїРѕРІРµСЂС‚Р°С”
  // OPAQUE-РІС–РґРїРѕРІС–РґСЊ (type='opaque', status=0, ok=false) вЂ” РЅР°С€ РєРѕРґ С‚РѕРґС– Р±Р°С‡РёРІ
  // fresh.ok=false, РєРёРґР°РІ РІРёРЅСЏС‚РѕРє, С– СЏРєС‰Рѕ РІ РєРµС€С– С‰Рµ РЅС–С‡РѕРіРѕ РЅРµ Р±СѓР»Рѕ (С‚РёРїРѕРІРёР№
  // РїРµСЂС€РёР№ Р·Р°РїСѓСЃРє), Р’Р•РЎР¬ fetch РїСЂРѕРІР°Р»СЋРІР°РІСЃСЏ Р·Р°РјС–СЃС‚СЊ РїРѕРІРµСЂРЅСѓС‚Рё Р±СЂР°СѓР·РµСЂСѓ СЃРєСЂРёРїС‚.
  // Р¦Рµ Р™РњРћР’Р†Р РќРћ СЃРїСЂР°РІР¶РЅСЏ РїСЂРёС‡РёРЅР°, С‡РѕРјСѓ window.Astronomy Р±СѓРІ РЅРµРґРѕСЃС‚СѓРїРЅРёР№ СѓРІРµСЃСЊ
  // С‡Р°СЃ вЂ” С– СЃР°РјРµ С‚РѕРјСѓ Р·РЅР°РґРѕР±РёР»РёСЃСЊ fallback-С„С–РєСЃРё РЅР° Meeus РґР»СЏ moonPhaseAngle
  // С– sunrise СЂР°РЅС–С€Рµ РІ С†С–Р№ СЃРµСЃС–С—. РўРµРїРµСЂ cross-origin Р·Р°РїРёС‚Рё РџРћР’РќР†РЎРўР® РІРёРєР»СЋС‡РµРЅС–
  // Р· РїРµСЂРµС…РѕРїР»РµРЅРЅСЏ вЂ” SW С—С… РЅРµ С‡С–РїР°С”, Р±СЂР°СѓР·РµСЂ РѕР±СЂРѕР±Р»СЏС” РЅР°С‚РёРІРЅРѕ (СЃРІС–Р№ РєРµС€,
  // СЃС‚Р°РЅРґР°СЂС‚РЅР° CORS-РѕР±СЂРѕР±РєР°), РЅРµ РїРѕР»Р°РјР°РІС€Рё Р»РѕРіС–РєСѓ.
  const isCrossOrigin = url.origin !== self.location.origin;
  const isHtmlOrData =
    !isCrossOrigin && (
      req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.js')
    );

  if (isCrossOrigin) {
    // РќРµ РїРµСЂРµС…РѕРїР»СЋС”РјРѕ РІР·Р°РіР°Р»С– вЂ” event.respondWith() РЅРµ РІРёРєР»РёРєР°С”С‚СЊСЃСЏ,
    // Р±СЂР°СѓР·РµСЂ РѕР±СЂРѕР±Р»СЏС” Р·Р°РїРёС‚ СЃРІРѕС—Рј Р·РІРёС‡Р°Р№РЅРёРј С€Р»СЏС…РѕРј.
    return;
  }

  if (isHtmlOrData) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const fresh = await fetch(req);
        // v88.9.32-fp213 FIX-CRITICAL: fetch() РќР• РєРёРґР°С” exception РЅР° 404/500 вЂ”
        // Р±РµР· С†С–С”С— РїРµСЂРµРІС–СЂРєРё С‚РёРјС‡Р°СЃРѕРІРёР№ Р·Р±С–Р№ GitHub Pages Р·Р°РїРёСЃСѓРІР°РІСЃСЏ РІ РєРµС€
        // СЏРє РІР°Р»С–РґРЅС– "СЃРІС–Р¶С–" РґР°РЅС– ("cache poisoning"), С– offline-fallback РїРѕС‚С–Рј
        // РїРѕРІРµСЂС‚Р°РІ СЃР°РјРµ С†СЋ РїРѕРјРёР»РєРѕРІСѓ РІС–РґРїРѕРІС–РґСЊ. РљРµС€СѓС”РјРѕ Р»РёС€Рµ response.ok.
        if (!fresh.ok) {
          throw new Error(`HTTP ${fresh.status} for ${req.url}`);
        }
        // v88.9.35-fp216 FIX-CRITICAL (СЃРїСЂР°РІР¶РЅСЏ РїСЂРёС‡РёРЅР° "РєРµС€ РЅРµ РѕРЅРѕРІР»СЋС”С‚СЊСЃСЏ,
        // РїРѕРєР°Р·СѓС” РїРѕРјРёР»РєСѓ"): РїРѕРїРµСЂРµРґРЅСЏ РІРµСЂСЃС–СЏ (fp215) Р Р•РљРћРќРЎРўР РЈР®Р’РђР›Рђ Response
        // С‡РµСЂРµР· `new Response(body, {status, ...})` РґР»СЏ Р·Р°РїРёСЃСѓ timestamp-Р·Р°РіРѕР»РѕРІРєР°.
        // РљРѕРЅСЃС‚СЂСѓРєС‚РѕСЂ Response РљРР”РђР„ Р’РРќРЇРўРћРљ РґР»СЏ СЃС‚Р°С‚СѓСЃС–РІ 204/205/304 (Р·Р°Р±РѕСЂРѕРЅРµРЅРѕ
        // РјР°С‚Рё С‚С–Р»Рѕ Р·Р° specification) С– РґР»СЏ opaque cross-origin РІС–РґРїРѕРІС–РґРµР№
        // (status СЃС‚Р°С” 0). Р¦РµР№ РІРёРЅСЏС‚РѕРє Р»РѕРІРёРІСЃСЏ Р·РѕРІРЅС–С€РЅС–Рј catch вЂ” Р° СЏРєС‰Рѕ РІ РєРµС€С–
        // С‰Рµ РЅС–С‡РѕРіРѕ РЅРµ Р±СѓР»Рѕ (С‚РёРїРѕРІРѕ РґР»СЏ РќРћР’РћР“Рћ РґРµРїР»РѕСЋ Р· Р±Р°РјРїРЅСѓС‚РёРј CACHE_VERSION,
        // РґРµ DATA_CACHE С‰РѕР№РЅРѕ СЃС‚РІРѕСЂРµРЅРёР№ С– РїРѕСЂРѕР¶РЅС–Р№), catch РїРµСЂРµРєРёРґР°РІ РїРѕРјРёР»РєСѓ
        // РґР°Р»С– (`throw e`), С– event.respondWith() РїСЂРѕРІР°Р»СЋРІР°РІСЃСЏ вЂ” СЃР°РјРµ "РїРѕРєР°Р·СѓС”
        // РїРѕРјРёР»РєСѓ", Р° РєРµС€ РїСЂРё С†СЊРѕРјСѓ С‚Р°Рє С– РЅРµ РѕРЅРѕРІР»СЋРІР°РІСЃСЏ, Р±Рѕ РєРµС€СѓРІР°РЅРЅСЏ РІРїР°Р»Рѕ
        // Р”Рћ Р·Р±РµСЂРµР¶РµРЅРЅСЏ. РўРµРїРµСЂ СЂРµРєРѕРЅСЃС‚СЂСѓРєС†С–СЏ вЂ” РІ РѕРєСЂРµРјРѕРјСѓ try/catch: Р±СѓРґСЊ-СЏРєР°
        // РїСЂРѕР±Р»РµРјР° Р· РЅРµСЋ РїР°РґР°С” РЅР°Р·Р°Рґ РЅР° Р·РІРёС‡Р°Р№РЅРµ РєРµС€СѓРІР°РЅРЅСЏ Р±РµР· timestamp-С€С‚Р°РјРїР°
        // (СЃС‚Р°СЂР°, РіР°СЂР°РЅС‚РѕРІР°РЅРѕ СЂРѕР±РѕС‡Р° РїРѕРІРµРґС–РЅРєР° fp213), Р° РЅРµ СЂРІРµ РІРµСЃСЊ Р·Р°РїРёС‚.
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
          // Р¤РѕР»Р±РµРє: Р·РІРёС‡Р°Р№РЅРµ РєРµС€СѓРІР°РЅРЅСЏ Р±РµР· timestamp-С€С‚Р°РјРїР°. SW_STALE_DATA
          // С‚РѕРґС– РїРѕРєР°Р¶Рµ "РІС–Рє РЅРµРІС–РґРѕРјРёР№" РґР»СЏ С†СЊРѕРіРѕ Р·Р°РїРёСЃСѓ вЂ” С‡РµСЃРЅРѕ, РЅРµ РєСЂР°С€РёС‚СЊ.
          try { await cache.put(req, fresh.clone()); } catch (_e2) { /* best-effort */ }
        }
        return fresh;
      } catch (e) {
        // v88.9.34-fp215 (Р°СѓРґРёС‚-СЂР°СѓРЅРґ-5, Problem 8): РіР»РѕР±Р°Р»СЊРЅРёР№ caches.match(req)
        // С€СѓРєР°С” РїРѕ Р’РЎР†РҐ РєРµС€Р°С… С†СЊРѕРіРѕ SW (РІРєР»СЋС‡РЅРѕ Р· SHELL_CACHE) вЂ” РЅРµС‚РѕС‡РЅРѕ РґР»СЏ
        // РґР°РЅРёС…. Р—РІСѓР¶РµРЅРѕ РґРѕ DATA_CACHE.match(req), СЏРє РїСЂСЏРјРѕ СЂРµРєРѕРјРµРЅРґРѕРІР°РЅРѕ.
        const cached = await cache.match(req);
        if (cached) {
          // v88.9.34-fp215: СЂРµР°Р»СЊРЅРёР№ timestamp РєРµС€СѓРІР°РЅРЅСЏ Р· Р·Р°РіРѕР»РѕРІРєР°, Р° РЅРµ
          // РјРѕРјРµРЅС‚ fallback. РЇРєС‰Рѕ Р·Р°РіРѕР»РѕРІРєР° РЅРµРјР°С” (Р·Р°РїРёСЃ С–Р· СЃС‚Р°СЂС–С€РѕС— РІРµСЂСЃС–С—
          // SW, РґРѕ С†СЊРѕРіРѕ С„С–РєСЃСѓ) вЂ” С‡РµСЃРЅРѕ РїРѕР·РЅР°С‡Р°С”РјРѕ СЏРє РЅРµРІС–РґРѕРјРёР№ РІС–Рє, Р° РЅРµ
          // РІРёРґР°С”РјРѕ Date.now() Р·Р° СЂРµР°Р»СЊРЅРёР№.
          try {
            const clients = await self.clients.matchAll({ type: 'window' });
            const _cachedAtHeader = cached.headers.get('x-gindex-cached-at');
            const fetchedAt = _cachedAtHeader ? parseInt(_cachedAtHeader, 10) : null;
            clients.forEach((c) => {
              c.postMessage({ type: 'SW_STALE_DATA', fetchedAt, url: req.url, ageUnknown: !_cachedAtHeader });
            });
          } catch (_e) { /* postMessage best-effort, РЅРµ Р±Р»РѕРєСѓС”РјРѕ РІС–РґРїРѕРІС–РґСЊ */ }
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
    body: payload.body || 'РћРЅРѕРІРёРІСЃСЏ РїСЂРѕРіРЅРѕР· G-Index',
    icon: './icon192.png',
    badge: './icon192.png',
    tag: payload.tag || `gindex-${category}`,
    renotify: category === 'storm',
    data: { url: target, category },
    actions: [{ action: 'open', title: 'Р’С–РґРєСЂРёС‚Рё G-Index' }]
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'G-Index', options));
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


