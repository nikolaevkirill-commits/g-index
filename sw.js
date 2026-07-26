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
//
// v88.9.32-fp213 FIX-CRITICAL (аудит-раунд-3): activate раніше видаляв БУДЬ-ЯКИЙ
// cache key, що не є нашими двома поточними — CacheStorage спільний для ВСЬОГО
// origin nikolaevkirill-commits.github.io, тому це могло знищити кеші ІНШИХ
// GitHub Pages проєктів на тому самому домені. Тепер видаляємо лише ключі з
// власним префіксом 'gindex-', що не є поточною версією.

const CACHE_VERSION = 'fp291-v1'; // bump this string on every deploy
const CACHE_PREFIX = 'gindex-'; // власний namespace — НІКОЛИ не чіпати ключі без цього префікса
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${CACHE_VERSION}`;

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
        // v88.9.32-fp213: ТІЛЬКИ власні застарілі кеші — чужі (без префікса
        // CACHE_PREFIX) ніколи не чіпаємо, навіть якщо вони старі/невідомі.
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

  // v88.9.58-fp240 FIX-CRITICAL (аудит-раунд-26): раніше isHtmlOrData не
  // перевіряв url.origin — тому запит до ЗОВНІШНЬОЇ CDN-бібліотеки (напр.
  // astronomy-engine з jsdelivr/unpkg, якщо вона підключена через .js URL)
  // теж потрапляв у наш network-first перехоплювач. Для cross-origin запиту
  // без явних CORS-заголовків з боку CDN fetch() усередині SW повертає
  // OPAQUE-відповідь (type='opaque', status=0, ok=false) — наш код тоді бачив
  // fresh.ok=false, кидав виняток, і якщо в кеші ще нічого не було (типовий
  // перший запуск), ВЕСЬ fetch провалювався замість повернути браузеру скрипт.
  // Це ЙМОВІРНО справжня причина, чому window.Astronomy був недоступний увесь
  // час — і саме тому знадобились fallback-фікси на Meeus для moonPhaseAngle
  // і sunrise раніше в цій сесії. Тепер cross-origin запити ПОВНІСТЮ виключені
  // з перехоплення — SW їх не чіпає, браузер обробляє нативно (свій кеш,
  // стандартна CORS-обробка), не поламавши логіку.
  const isCrossOrigin = url.origin !== self.location.origin;
  const isHtmlOrData =
    !isCrossOrigin && (
      req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.js')
    );

  if (isCrossOrigin) {
    // Не перехоплюємо взагалі — event.respondWith() не викликається,
    // браузер обробляє запит своїм звичайним шляхом.
    return;
  }

  if (isHtmlOrData) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const fresh = await fetch(req);
        // v88.9.32-fp213 FIX-CRITICAL: fetch() НЕ кидає exception на 404/500 —
        // без цієї перевірки тимчасовий збій GitHub Pages записувався в кеш
        // як валідні "свіжі" дані ("cache poisoning"), і offline-fallback потім
        // повертав саме цю помилкову відповідь. Кешуємо лише response.ok.
        if (!fresh.ok) {
          throw new Error(`HTTP ${fresh.status} for ${req.url}`);
        }
        // v88.9.35-fp216 FIX-CRITICAL (справжня причина "кеш не оновлюється,
        // показує помилку"): попередня версія (fp215) РЕКОНСТРУЮВАЛА Response
        // через `new Response(body, {status, ...})` для запису timestamp-заголовка.
        // Конструктор Response КИДАЄ ВИНЯТОК для статусів 204/205/304 (заборонено
        // мати тіло за specification) і для opaque cross-origin відповідей
        // (status стає 0). Цей виняток ловився зовнішнім catch — а якщо в кеші
        // ще нічого не було (типово для НОВОГО деплою з бампнутим CACHE_VERSION,
        // де DATA_CACHE щойно створений і порожній), catch перекидав помилку
        // далі (`throw e`), і event.respondWith() провалювався — саме "показує
        // помилку", а кеш при цьому так і не оновлювався, бо кешування впало
        // ДО збереження. Тепер реконструкція — в окремому try/catch: будь-яка
        // проблема з нею падає назад на звичайне кешування без timestamp-штампа
        // (стара, гарантовано робоча поведінка fp213), а не рве весь запит.
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
          // Фолбек: звичайне кешування без timestamp-штампа. SW_STALE_DATA
          // тоді покаже "вік невідомий" для цього запису — чесно, не крашить.
          try { await cache.put(req, fresh.clone()); } catch (_e2) { /* best-effort */ }
        }
        return fresh;
      } catch (e) {
        // v88.9.34-fp215 (аудит-раунд-5, Problem 8): глобальний caches.match(req)
        // шукає по ВСІХ кешах цього SW (включно з SHELL_CACHE) — неточно для
        // даних. Звужено до DATA_CACHE.match(req), як прямо рекомендовано.
        const cached = await cache.match(req);
        if (cached) {
          // v88.9.34-fp215: реальний timestamp кешування з заголовка, а не
          // момент fallback. Якщо заголовка немає (запис із старішої версії
          // SW, до цього фіксу) — чесно позначаємо як невідомий вік, а не
          // видаємо Date.now() за реальний.
          try {
            const clients = await self.clients.matchAll({ type: 'window' });
            const _cachedAtHeader = cached.headers.get('x-gindex-cached-at');
            const fetchedAt = _cachedAtHeader ? parseInt(_cachedAtHeader, 10) : null;
            clients.forEach((c) => {
              c.postMessage({ type: 'SW_STALE_DATA', fetchedAt, url: req.url, ageUnknown: !_cachedAtHeader });
            });
          } catch (_e) { /* postMessage best-effort, не блокуємо відповідь */ }
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
