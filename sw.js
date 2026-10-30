importScripts('./runtime_diagnostics_v1.js','./civil_time_v1.js');
// G-Index service worker. HTML/data are network-first; static shell is cache-first.
// Bump CACHE_VERSION whenever index.html or a cached shell asset changes.
const CACHE_VERSION = 'fp548-locale-subtree-20261030'; // Discrete final scores; no interpolated forecast.
const CACHE_PREFIX = 'gindex-'; // G-Index cache namespace; do not remove the prefix.
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${CACHE_VERSION}`;
const NETWORK_FIRST_TIMEOUT_MS = 2500;
const NETWORK_BODY_TIMEOUT_MS = 15000; // FP542: upper bound for reading a response body
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
  './civil_time_v1.js',
  './day_summary.html',
  './day_summary_v1.js',
  './day_summary_v1.css',
  './meeus_core_v1.js',
  './dayline_view_v1.js',
  './dayline_view_v1.css',
  './dayline_i18n_v1.js',
  './dayline_adapter_v1.js',
  './dayline_async_v1.js',
  './dayline_worker_v1.js',

  './nocturne_v1.css',
  './nocturne_v1.js',
  './festival_astronomy_adapter_v1.js',
  './festival_decision_engine_v1.js',
  './festival_decision_v1.css',
  './festival_decision_view_v1.js',
  './festival_evidence_v1.js',

  './observance_source_registry_v1.js',
  './observances_tanita_v1.js',
  './panchanga_civil_adapter.js',
  './own_calendar_v1.js','./research_observances_v1.js','./research_observances_view.js',
  './panchanga_app_bridge.js',
  './r9_shell.css',
  './panchanga_civil_view.css',
  './panchanga_civil_scene.js',
  './panchanga_civil_view.js',
  './preview-v4/public_preview_policy.js',
  './design-v4.html',
  './preview-v4/atlas_motion.css?v=v7-2',
  './preview-v4/consumer_overview_v1.js',
  './preview-v4/core_runtime_v1.js',
  './preview-v4/design_candidate.css?v=v7-2',
  './preview-v4/design_candidate.js',
  './preview-v4/design_scale.js',
  './preview-v4/locale_bridge_v1.js',
  './preview-v4/locale_overview_v1.js',
  './preview-v4/product_shell_v1.js',
  './preview-v4/design_b/integration.css?v=v7-2',
  './preview-v4/design_b/palette/palette.css?v=v7-2',
  './preview-v4/design_b/palette/palette.js',
  './preview-v4/design_b/states/states.css?v=v7-2',
  './preview-v4/design_b/states/states.js',
  './preview-v4/design_b/assets/field-lines.svg',
  './preview-v4/design_b/assets/icon-forecast.svg',
  './preview-v4/design_b/assets/icon-night.svg',
  './preview-v4/design_b/assets/icon-panchanga.svg',
  './preview-v4/design_b/assets/icon-today.svg',
  './preview-v4/design_b/assets/moon-crescent.svg',
  './preview-v4/design_b/assets/samrat-yantra.svg',
  './preview-v4/design_b/css/fonts.css?v=v7-2',
  './preview-v4/design_b/fonts/fira-sans-cyrillic-400-normal.woff2',
  './preview-v4/design_b/fonts/fira-sans-cyrillic-500-normal.woff2',
  './preview-v4/design_b/fonts/fira-sans-cyrillic-600-normal.woff2',
  './preview-v4/design_b/fonts/fira-sans-latin-400-normal.woff2',
  './preview-v4/design_b/fonts/fira-sans-latin-500-normal.woff2',
  './preview-v4/design_b/fonts/fira-sans-latin-600-normal.woff2',
  './preview-v4/design_b/fonts/literata-cyrillic-400-normal.woff2',
  './preview-v4/design_b/fonts/literata-cyrillic-600-normal.woff2',
  './preview-v4/design_b/fonts/literata-latin-400-normal.woff2',
  './preview-v4/design_b/fonts/literata-latin-600-normal.woff2',
  './preview-v4/design_b/fonts/OFL-FiraSans.txt',
  './preview-v4/design_b/fonts/OFL-Literata.txt',
  './preview-v4/design_b/scenes/locale_extra_v1.js',
  './preview-v4/design_b/scenes/scenes.css?v=v7-2',
  './preview-v4/design_b/scenes/scenes.js',

  './design-b17.html',
  './preview-b17/consumer_overview_v1.js',
  './preview-b17/design_candidate.css',
  './preview-b17/design_candidate.js',
  './preview-b17/design_scale.js',
  './preview-b17/locale_bridge_v1.js',
  './preview-b17/locale_overview_v1.js',
  './preview-b17/product_shell_v1.js',
  './preview-b17/design_b/integration.css',
  './preview-b17/design_b/assets/field-lines.svg',
  './preview-b17/design_b/assets/icon-forecast.svg',
  './preview-b17/design_b/assets/icon-night.svg',
  './preview-b17/design_b/assets/icon-panchanga.svg',
  './preview-b17/design_b/assets/icon-today.svg',
  './preview-b17/design_b/assets/moon-crescent.svg',
  './preview-b17/design_b/assets/samrat-yantra.svg',
  './preview-b17/design_b/css/fonts.css',
  './preview-b17/design_b/fonts/fira-sans-cyrillic-400-normal.woff2',
  './preview-b17/design_b/fonts/fira-sans-cyrillic-500-normal.woff2',
  './preview-b17/design_b/fonts/fira-sans-cyrillic-600-normal.woff2',
  './preview-b17/design_b/fonts/fira-sans-latin-400-normal.woff2',
  './preview-b17/design_b/fonts/fira-sans-latin-500-normal.woff2',
  './preview-b17/design_b/fonts/fira-sans-latin-600-normal.woff2',
  './preview-b17/design_b/fonts/literata-cyrillic-400-normal.woff2',
  './preview-b17/design_b/fonts/literata-cyrillic-600-normal.woff2',
  './preview-b17/design_b/fonts/literata-latin-400-normal.woff2',
  './preview-b17/design_b/fonts/literata-latin-600-normal.woff2',
  './preview-b17/design_b/fonts/OFL-FiraSans.txt',
  './preview-b17/design_b/fonts/OFL-Literata.txt',
  './preview-b17/design_candidate.js?v=phone1',
  './preview-b17/design_b/integration.css?v=phone1',

  './',
  './index.html',
  './theme_moon.webp',
  './theme_panchanga.webp',
  './theme_forecast.webp',
  './theme_journal.webp',
  './locale_core_v1.js',
  './locale_overview_v1.js',
  './locale_bridge_v1.js',
  './panchanga_reference_check_v1.json',
  './play_channel.js',
  './runtime_diagnostics_v1.js',
  './lifecycle_refresh_v1.js',
  './presentation_runtime_v1.js',
  './product_render_queue_v1.js',
  './moon_phase_v1.js',
  './p0_layout_v1.js',
  './p0_layout_v1.css',
  './wow_reviewed_v1.css',
  './sky_panorama_v1.webp',
  './fonts_wow/lora.woff',
  './fonts_wow/manrope.woff',
  './fonts_wow/OFL_Lora.txt',
  './fonts_wow/OFL_Manrope.txt',

  './score_semantics_v1.js',
  './consumer_authority_v1.js',
  './forecast_journal_v1.js',
  './push_client_v1.js',
  './core_runtime_v1.js',
  './mobile_navigation_v1.js',
  './product_shell_v1.js',
  './plan_calendar_v1.js',
  './native_reminder_v1.js',
  './native_reminder_ui_v1.js',
  './onboarding_v1.js',
  './local_telemetry_v1.js',
  './decision_journal_v1.js',
  './audit_copy_v1.js',
  './privacy_accessibility_v1.js',
  './notification_runtime_v1.js',
  './transition_runtime_v1.js',
  './transition_client_v1.js',
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
  './SILSO_REFRESH_STATUS_v1.json',
  './future_kp.json',
  './SYSTEM_HEALTH_STATUS_v1.json',
  './panchanga_shadow_feed_v1.json',
  './data_manifest.json',
  './SOURCE_ROUTING_AUDIT_v1.json',
  './SPACE_WEATHER_CONTEXT_v1.json',
  './KP_HOURLY_ALERT_v2.json',
  './BGS_SPACE_WEATHER_v1.json',
  './AIA_VERNADSKY_DAILY_v1.json',
  './AIA_VERNADSKY_SHADOW_AUDIT_v1.json',
  './INDEPENDENT_FORECAST_CONTRACT_v1.json',
  './INDEPENDENT_FORECAST_FEED_v1.json',
  './TARGET_CONTRACT_FP463.json',
  './PROSPECTIVE_PREREGISTRATION_FP463.json',
  './OUTCOME_INTAKE_FORM_v1.html'
];

self.addEventListener('install', (event) => {
  // fp312: remain waiting until the user presses the visible Update button.
  // Automatic skipWaiting + the 5-minute update probe caused surprise full-page
  // reloads (a black screen while the 1.4 MB dashboard initialized).
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // Required shell, preview HTML/JS/CSS/fonts install atomically. Only decorative SVGs and the import-only xlsx reader are optional.
      // If required content fails, reject installation and retain the previous active worker and caches.
      .then(async (cache) => {
        // FP542 (F3): the 0.95 MB spreadsheet reader is loaded only on import; a failed download of it
        // must not block a shell update. It is still precached best-effort for offline import.
        const optional = (u) => /^\.\/preview-(?:v4|b17)\/.*\.svg(?:\?|$)/.test(u) || u === './xlsx-0.20.3.full.min.js';
        await cache.addAll(SHELL_ASSETS.filter((u) => !optional(u)));
        const results = await Promise.allSettled(SHELL_ASSETS.filter(optional).map((u) => cache.add(u)));
        if (results.some((r) => r.status === 'rejected')) globalThis.NRDiagnostics?.record('sw.decoration_precache_partial', 'recoverable');
      })
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

const SITE_EXCLUDED = ["AUTO_PROSPECTIVE_STATUS_v1.json", "EXCEL_FORMULA_INTEGRITY_STATUS_v1.json", "FP463_CHANNEL_SCORECARD.json", "FP463_PROSPECTIVE_STATUS.json", "FUTURE_CALENDAR_ADVISORY_v1.json", "MODEL_QUALITY_AUDIT_v1.json", "OUTCOME_LEDGER_STATUS_v1.json", "PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json", "SHADOW_MODEL_PROMOTION_STATUS_v1.json", "TANITA_2Y_PROMOTION_GATE_v1.json", "TANITA_MANUAL_HOLDOUT_STATUS_v1.json", "TANITA_P0_REVIEW_IMPORT_STATUS_v1.json", "TANITA_P0_REVIEW_STATUS_v1.json", "TANITA_REVIEW_PRIORITY_STATUS_v1.json","product","backup_before_fp458_shell_deploy_20260831","deploy/AUDIT_RECALC_v88_8_30.md","deploy/AUDIT_RECALC_v88_8_31.md","deploy/AUDIT_RECALC_v88_8_33.md","deploy/AUDIT_RECALC_v88_8_34.md","deploy/CANONICAL_SPEC_v1_8.md","deploy/DEPLOY_GITHUB_PAGES.md","deploy/DEPLOY_NOW (1).md","deploy/DEPLOY_NOW.md","deploy/DEPLOY_STEPS.md","deploy/DEPLOY_v68_4.md","deploy/FILE_REGISTRY.md","deploy/HANDOFF_v87_61.md","deploy/PDF49_SCORES_18_05_31_05.json","deploy/SCHEMA_v1.sql","deploy/STATE.md","deploy/UPLOAD_THESE_FILES.txt","deploy/_config.yml","deploy/_headers","deploy/add_chrono_day.py","deploy/backtest.html","deploy/build_truth_layer.py","deploy/calendar_tags_2025_2026.json","deploy/chrono_analyze.py","deploy/chrono_daily.json","deploy/chrono_panel.json","deploy/dashboard_3class.html","deploy/decision_rule_sensitivity.json","deploy/dst_archive.json","deploy/engine_v15_3_vs_pdf_merged.csv","deploy/engine_v18_8_v88_8_19.json","deploy/engine_v18_8_v88_8_28.json","deploy/engine_v18_8_v88_8_30.json","deploy/engine_v18_8_v88_8_31.json","deploy/engine_v18_8_v88_8_33.json","deploy/engine_v18_8_v88_8_34.json","deploy/excel_canonical.json","deploy/expert_overrides_v3.json","deploy/fetch_kp_v2.py","deploy/forecast_engine_v14_10_1.py","deploy/future_kp.json","deploy/g_extended_v2_coefs.json","deploy/generate_bulletin.py","deploy/generate_forecast_pdf.py","deploy/gfz_kp_archive.json","deploy/index_fp117_FIXED.html","deploy/kp_update.log","deploy/overlay_model_v1.json","deploy/panchanga_sign_priors.json","deploy/pdf48_ground_truth_v6.json","deploy/prospective_regime_tracker.py","deploy/recalc_snapshot_2026-05-11_24_v88_8_28.json","deploy/recalc_snapshot_2026-05-11_24_v88_8_30.json","deploy/run_candidate_tests.py","deploy/run_canonical_benchmark.py","deploy/run_forecast.py","deploy/score_engine_v19_preview.py","deploy/scrape_devakan_web.py","deploy/scrape_tarita_audit7.py","deploy/supabase_schema.sql","deploy/sw_fixed.js","deploy/sw_fp117_OK.js","deploy/tag_to_text.json","deploy/update_kp.bat","deploy/update_kp.py","REAL_OUTCOME_LEDGER_v1.jsonl","gt_extension_2026_07_20_to_08_02.json","TANITA_BALANCED_REVIEW_QUEUE_v1.json","tools", "tests", "src", "outputs", "node_modules", "vendor", "Gemfile", "Gemfile.lock", "EXPERT_DECISION_REGISTRY_v1.json", "EXPERT_PDF_IMPORT_STATUS_v1.json", "engine_scores.json", "expert_overrides_v3.json", "expert_calc_scores.json", "SELECTIVE_POLICY_STRONG_RAW_v2.json", "annual_2026_27.json", "daily_master.json", "bulletin_v2.json", "chrono_panel.json", "chrono_v1.csv", "AUTO_FORECAST_FEED_v1.json", "FP463_PREDICTIONS_EXPERT_PDF.jsonl", "FP463_PREDICTIONS_FROZEN_ENGINE.jsonl", "FP463_PREDICTIONS_TANITA_IMAGE.jsonl", "FP463_REAL_OUTCOMES_APPEND_ONLY.jsonl"];
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
  let relative;try{relative=decodeURIComponent(url.pathname).split('/').filter(Boolean)}catch(e){relative=[]}
  if(!isCrossOrigin&&SITE_EXCLUDED.some(n=>('/'+relative.join('/')+'/').includes('/'+n+'/'))){event.respondWith(Promise.resolve(new Response('Not published',{status:404,headers:{'Cache-Control':'no-store'}})));return;}

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
        // FP542 (F4): read the body once, with a bound. A stalled body used to keep this fetch
        // event alive indefinitely (and with it a pending worker activation). On timeout the
        // request is aborted and the cached copy is served, exactly as for a header timeout.
        const bodyTimer = setTimeout(() => controller.abort(), NETWORK_BODY_TIMEOUT_MS);
        let body;
        try { body = await fresh.arrayBuffer(); }
        finally { clearTimeout(bodyTimer); }
        const meta = { status: fresh.status, statusText: fresh.statusText };
        // Stamp same-origin cached data so the page can report its real fallback age.
        // The cache write no longer delays the response; it is kept alive by waitUntil.
        const stampedHeaders = new Headers(fresh.headers);
        stampedHeaders.set('x-gindex-cached-at', String(Date.now()));
        event.waitUntil((async () => {
          try { if(newestRequest.get(cacheKey)===requestOrder) await cache.put(cacheKey, new Response(body, { ...meta, headers: stampedHeaders })); }
          catch (_stampErr) { globalThis.NRDiagnostics?.record('catch.323','recoverable'); }
        })());
        await reportDelivery(event,'SW_FRESH_DATA',Date.now(),requestOrder);
        const deliveredHeaders = new Headers(fresh.headers); deliveredHeaders.set('x-gindex-delivery','network');
        return new Response(body, { ...meta, headers: deliveredHeaders });
      } catch (e) { globalThis.NRDiagnostics?.record('catch.325','recoverable');
        let cached = await cache.match(cacheKey);
        if (!cached) {
          const shellCache = await caches.open(SHELL_CACHE);
          cached = await shellCache.match(cacheKey);
          // Only the application's two entry paths may fall back to its shell.
          // The navigation URL (including channel/push parameters) is retained.
          const scope = new URL(self.registration.scope);
          const index = new URL('index.html', scope);
          // v7.2 NRA-35: точка входу preview теж має офлайн-запуск із будь-якими параметрами (?channel=play)
          const preview = new URL('design-v4.html', scope);
          const journal = new URL('day_summary.html', scope);
          if(!cached && req.mode === 'navigate' &&
             (canonicalUrl.pathname === scope.pathname || canonicalUrl.pathname === index.pathname || canonicalUrl.pathname === preview.pathname || canonicalUrl.pathname === journal.pathname)) {
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

  if (req.method === 'GET' && /\/dayline_art\/(ashwini|bharani|krittika|rohini|mrigashira|ardra|punarvasu|pushya|ashlesha|magha|purvaphalguni|uttaraphalguni|hasta|chitra|swati|vishakha|anuradha|jyeshtha|mula|purvaashadha|uttaraashadha|shravana|dhanishta|water|fire|depth|nourish)-(engraving|gouache)\.webp$/.test(new URL(req.url).pathname)) {
    event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE);const saved=await cache.match(req);if(saved)return saved;const fresh=await fetch(req);if(fresh.ok)await cache.put(req,fresh.clone());return fresh;})());return;
  }
  // Static shell assets: cache-first, fall back to network.
  event.respondWith(
    caches.open(SHELL_CACHE).then(cache => cache.match(req)).then((cached) => cached || fetch(req))
  );
});

// fp292: real Web Push display + deterministic deep-link routing.
// Previously the Worker delivered a payload, but the Service Worker had no
// `push`/`notificationclick` listeners, so a background delivery could be
// silently discarded and a notification click could not open the relevant
// dashboard block.
importScripts('./consumer_authority_v1.js', './dayline_i18n_v1.js', './transition_runtime_v1.js', './notification_runtime_v1.js');
NRNotificationRuntime.install(self);

self.addEventListener("message",event=>{if(event.data?.type==="SR_TRANSITION_CAPABILITY")event.ports?.[0]?.postMessage({schema:SRTransitionRuntime.VERSION});});
