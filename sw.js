importScripts('./runtime_diagnostics_v1.js');
// G-Index service worker. HTML/data are network-first; static shell is cache-first.
// Bump CACHE_VERSION whenever index.html or a cached shell asset changes.
const CACHE_VERSION = 'fp469-v44-privacy'; // audit: channel persistence, qualified Kp authority and data freshness
const CACHE_PREFIX = 'gindex-'; // G-Index cache namespace; do not remove the prefix.
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${CACHE_VERSION}`;
const NETWORK_FIRST_TIMEOUT_MS = 2500;
let lastRequestOrder=0;
const newestRequest=new Map();
async function reportDelivery(event, type, fetchedAt, requestOrder){
  try{const client=event.clientId?await self.clients.get(event.clientId):null;
    if(client)client.postMessage({type,fetchedAt,requestOrder,url:event.request.url,ageUnknown:fetchedAt===null});
  }catch(_e){ globalThis.NRDiagnostics?.record('catch.321','recoverable'); } // A delivery notification must never change the fetch result.
}
async function deliveryResponse(response,mode){
  const headers=new Headers(response.headers);headers.set('x-gindex-delivery',mode);
  return new Response(await response.clone().arrayBuffer(),{status:response.status,statusText:response.statusText,headers});
}

const SHELL_ASSETS = [
  './',
  './index.html',
  './play_channel.js',
  './runtime_diagnostics_v1.js',
  './lifecycle_refresh_v1.js',
  './presentation_runtime_v1.js',
  './product_render_queue_v1.js',
  './consumer_authority_v1.js',
  './push_client_v1.js',
  './privacy_accessibility_v1.js',
  './notification_runtime_v1.js',
  './consumer_overview_v1.js',
  './calendar_context_v1.js',
  './consumer_overview_v1.css',
  './local_storage_v1.js',
  './xlsx-0.20.3.full.min.js',
  './privacy.html',
  './terms.html',
  './account-deletion.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  './astronomy-engine-2.1.19.min.js',
  './engine_tag_parser.js',
  './engine_tag_aliases_v1.json',
  './FUTURE_CALENDAR_ADVISORY_v1.json',
  './SILSO_REFRESH_STATUS_v1.json',
  './future_kp.json',
  './SYSTEM_HEALTH_STATUS_v1.json',
  './PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json',
  './panchanga_shadow_feed_v1.json',
  './EXPERT_DECISION_REGISTRY_v1.json',
  './EXPERT_PDF_IMPORT_STATUS_v1.json',
  './engine_scores.json',
  './expert_overrides_v3.json',
  './expert_calc_scores.json',
  './SELECTIVE_POLICY_STRONG_RAW_v2.json',
  './annual_2026_27.json',
  './daily_master.json',
  './bulletin_v2.json',
  './chrono_panel.json',
  './chrono_v1.csv',
  './data_manifest.json',
  './SOURCE_ROUTING_AUDIT_v1.json',
  './SPACE_WEATHER_CONTEXT_v1.json',
  './KP_HOURLY_ALERT_v2.json',
  './BGS_SPACE_WEATHER_v1.json',
  './AIA_VERNADSKY_DAILY_v1.json',
  './AIA_VERNADSKY_SHADOW_AUDIT_v1.json',
  './AUTO_FORECAST_FEED_v1.json',
  './INDEPENDENT_FORECAST_CONTRACT_v1.json',
  './INDEPENDENT_FORECAST_FEED_v1.json',
  './TARGET_CONTRACT_FP463.json',
  './PROSPECTIVE_PREREGISTRATION_FP463.json',
  './FP463_PROSPECTIVE_STATUS.json',
  './FP463_CHANNEL_SCORECARD.json',
  './FP463_PREDICTIONS_EXPERT_PDF.jsonl',
  './FP463_PREDICTIONS_FROZEN_ENGINE.jsonl',
  './FP463_PREDICTIONS_TANITA_IMAGE.jsonl',
  './FP463_REAL_OUTCOMES_APPEND_ONLY.jsonl',
  './AUTO_PROSPECTIVE_STATUS_v1.json',
  './MODEL_QUALITY_AUDIT_v1.json',
  './EXCEL_FORMULA_INTEGRITY_STATUS_v1.json',
  './OUTCOME_LEDGER_STATUS_v1.json',
  './SHADOW_MODEL_PROMOTION_STATUS_v1.json',
  './TANITA_2Y_PROMOTION_GATE_v1.json',
  './TANITA_MANUAL_HOLDOUT_STATUS_v1.json',
  './TANITA_P0_REVIEW_IMPORT_STATUS_v1.json',
  './TANITA_P0_REVIEW_STATUS_v1.json',
  './TANITA_REVIEW_PRIORITY_STATUS_v1.json',
  './OUTCOME_INTAKE_FORM_v1.html'
];

self.addEventListener('install', (event) => {
  // fp312: remain waiting until the user presses the visible Update button.
  // Automatic skipWaiting + the 5-minute update probe caused surprise full-page
  // reloads (a black screen while the 1.4 MB dashboard initialized).
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(async (error) => {globalThis.NRDiagnostics?.record('promise.catch.13','recoverable');
        // A partial/empty new cache must never be allowed to activate and
        // replace the last-known-good worker. addAll is atomic; remove the
        // empty cache and propagate the failure so this install is rejected.
        await caches.delete(SHELL_CACHE);
        throw error;
      })
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
    const shell = await caches.open(SHELL_CACHE);
    const manifest = await shell.match('./manifest.json');
    if (!manifest) {
      throw new Error(`Refusing activation: ${SHELL_CACHE} is not populated`);
    }
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
  } catch (e) { globalThis.NRDiagnostics?.record('catch.322','recoverable');
    return;
  }

  const isCrossOrigin = url.origin !== self.location.origin;
  const isHtmlOrData =
    !isCrossOrigin && (
      req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.csv') ||
      url.pathname.endsWith('.jsonl') ||
      url.pathname.endsWith('.js')
    );

  if (isCrossOrigin) {
    // Cross-origin responses are not cached: opaque bodies cannot be stamped safely.
    return;
  }

  if (isHtmlOrData) {
    const requestOrder=lastRequestOrder=Math.max(Date.now(),lastRequestOrder+0.001);
    const canonicalUrl = new URL(req.url);
    canonicalUrl.searchParams.delete('fresh');
    if(canonicalUrl.pathname.endsWith('/expert_overrides_v3.json')) canonicalUrl.searchParams.delete('display');
    const cacheKey = canonicalUrl.href;
    newestRequest.set(cacheKey,requestOrder);
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), NETWORK_FIRST_TIMEOUT_MS);
        let fresh;
        try { fresh = await fetch(req, { signal: controller.signal }); }
        finally { clearTimeout(timeout); }
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
          if(newestRequest.get(cacheKey)===requestOrder)await cache.put(cacheKey, _stamped);
        } catch (_stampErr) { globalThis.NRDiagnostics?.record('catch.323','recoverable');
          // If header stamping fails, preserve a usable unstamped response.
          try { if(newestRequest.get(cacheKey)===requestOrder)await cache.put(cacheKey, fresh.clone()); } catch (_e2) { globalThis.NRDiagnostics?.record('catch.324','recoverable');  /* best-effort */ }
        }
        await reportDelivery(event,'SW_FRESH_DATA',Date.now(),requestOrder);
        return deliveryResponse(fresh,'network');
      } catch (e) { globalThis.NRDiagnostics?.record('catch.325','recoverable');
        let cached = await cache.match(cacheKey);
        if (!cached) {
          const shellCache = await caches.open(SHELL_CACHE);
          cached = await shellCache.match(cacheKey);
          // Only the application's two entry paths may fall back to its shell.
          // The navigation URL (including channel/push parameters) is retained.
          const scope = new URL(self.registration.scope);
          const index = new URL('index.html', scope);
          if(!cached && req.mode === 'navigate' &&
             (canonicalUrl.pathname === scope.pathname || canonicalUrl.pathname === index.pathname)) {
            const entry = new URL(canonicalUrl.href); entry.search=''; entry.hash='';
            cached = await cache.match(entry.href) || await shellCache.match(entry.href);
          }
        }
        if (cached) {
          // Tell the page exactly when fallback data was cached, when known.
          try {
            const raw=cached.headers.get('x-gindex-cached-at'),stamp=raw?Number(raw):NaN;
            const fetchedAt=Number.isFinite(stamp)&&stamp>0&&stamp<=Date.now()+5*60000?stamp:null;
            await reportDelivery(event,'SW_STALE_DATA',fetchedAt,requestOrder);
          } catch (_e) { globalThis.NRDiagnostics?.record('catch.326','recoverable');  /* best-effort notification; never block the response */ }
          return deliveryResponse(cached,'cached');
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
importScripts('./consumer_authority_v1.js', './notification_runtime_v1.js');
NRNotificationRuntime.install(self);
