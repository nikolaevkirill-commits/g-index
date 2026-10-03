
/* ── G-Index Telemetry stub v1.0 ──────────────────────────────────────────
   Зберігає події у localStorage (кільцевий буфер 200 подій).
   Готово до підключення Plausible / Umami / власного backend:
     → замінити _tSend() на реальний fetch/plausible('event',{...})
   Для дебагу: localStorage.getItem('g_telemetry') → JSON array
*/
(function(){
  'use strict';
  const LS_KEY  = 'g_telemetry';
  const MAX_EVT = 200;
  const SESSION = Math.random().toString(36).slice(2,9);

  // ── Внутрішній запис у localStorage ──────────────────────────────────────
  function _tStore(name, props) {
    try {
      const raw  = localStorage.getItem(LS_KEY);
      const arr  = raw ? JSON.parse(raw) : [];
      arr.push({ ts: Date.now(), session: SESSION, name, ...props });
      if (arr.length > MAX_EVT) arr.splice(0, arr.length - MAX_EVT);
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch(e){ globalThis.NRDiagnostics?.record('catch.296','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  }

  // ── Відправка (заглушка) — замінити на реальний провайдер ───────────────
  function _tSend(name, props) {
    // STUB: тут буде fetch або plausible('event', { name, props })
    // Example Plausible:
    //   if(window.plausible) window.plausible(name, { props });
    // Example Umami:
    //   if(window.umami) window.umami.track(name, props);
    _tStore(name, props);
  }

  // ── Публічний API ─────────────────────────────────────────────────────────
  window.GT = {
    // Трекнути довільну подію
    track(name, props) {
      try { _tSend(name, props || {}); } catch(e){ globalThis.NRDiagnostics?.record('catch.297','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    },
    // Повернути всі збережені події (для debug/export)
    dump() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e) { globalThis.NRDiagnostics?.record('catch.298','recoverable');  return []; }
    },
    // Очистити буфер
    clear() {
      try { localStorage.removeItem(LS_KEY); } catch(e){ globalThis.NRDiagnostics?.record('catch.299','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    },
    SESSION,
  };

  // ── Авто-події ────────────────────────────────────────────────────────────
  // 1. App open
  window.GT.track('app_open', {
    referrer: document.referrer || 'direct',
    ua_mobile: /Mobi|Android/i.test(navigator.userAgent) ? 1 : 0,
    pwa: (window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone) ? 1 : 0,
  });

  // 2. Share card
  const _origShare = window.shareGState;
  if (typeof _origShare === 'function') {
    window.shareGState = async function() {
      window.GT.track('share_card');
      return _origShare.apply(this, arguments);
    };
  } else {
    // shareGState ще не визначена — перехопимо через Object.defineProperty
    let _shareImpl;
    Object.defineProperty(window, 'shareGState', {
      get() { return _shareImpl; },
      set(fn) {
        _shareImpl = async function() {
          window.GT.track('share_card');
          return fn.apply(this, arguments);
        };
      },
      configurable: true,
    });
  }

  // 3. Paywall show
  const _origPaywallShow = window.PaywallModal && window.PaywallModal.show
    ? window.PaywallModal.show.bind(window.PaywallModal) : null;
  document.addEventListener('DOMContentLoaded', () => {
    if (window.PaywallModal && typeof window.PaywallModal.show === 'function') {
      const orig = window.PaywallModal.show.bind(window.PaywallModal);
      window.PaywallModal.show = function(feature, level) {
        window.GT.track('paywall_show', { feature: feature || '', level: level || '' });
        return orig(feature, level);
      };
    }
  });

  // 4. Data load timing (час до першого G на екрані)
  const _t0 = Date.now();
  const _dataObs = new MutationObserver((_,obs) => {
    const el = document.getElementById('nowG');
    if (el && el.textContent && el.textContent.trim() !== 'G …') {
      window.GT.track('data_loaded', { ms: Date.now() - _t0 });
      obs.disconnect();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('nowG');
    if (el) _dataObs.observe(el, { childList: true, characterData: true, subtree: true });
  });

  // v87.12: Engagement hooks — click/expand events для D7 retention analysis
  // Throttled щоб не спамити одними й тими ж подіями
  const _tThrottle = new Map();
  function _tOnce(key, delayMs, fn){
    const now = Date.now();
    const last = _tThrottle.get(key) || 0;
    if (now - last < delayMs) return;
    _tThrottle.set(key, now);
    fn();
  }
  document.addEventListener('DOMContentLoaded', () => {
    // 5. Details expanded (які секції користувач відкриває)
    document.querySelectorAll('details').forEach(det => {
      det.addEventListener('toggle', () => {
        if (det.open) {
          _tOnce('det_' + (det.id || 'anon'), 30000, () => {
            window.GT.track('details_expand', { id: det.id || 'anon' });
          });
        }
      });
    });
    // 6. Profile switch (який профіль активує)
    const profSlots = document.getElementById('profileSlots');
    if (profSlots) {
      profSlots.addEventListener('click', (e) => {
        const t = e.target.closest('[data-slot-idx]');
        if (t) {
          _tOnce('prof_' + t.dataset.slotIdx, 10000, () => {
            window.GT.track('profile_switch', { slot: t.dataset.slotIdx });
          });
        }
      });
    }
    // 7. Persona profile filter (Медик/Пілот/Трейдер/Військовий)
    const profBar = document.getElementById('profileBar');
    if (profBar) {
      profBar.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-profile]');
        if (b) {
          window.GT.track('persona_filter', { profile: b.dataset.profile });
        }
      });
    }
    // 8. Refresh button
    const btnRef = document.getElementById('btnRefresh');
    if (btnRef) btnRef.addEventListener('click', () => window.GT.track('refresh_manual'));
    // 9. Tier badge click (показ paywall через badge)
    const tierB = document.getElementById('tierBadge');
    if (tierB) tierB.addEventListener('click', () => window.GT.track('tier_badge_click', { tier: (window.PAYWALL && window.PAYWALL.tier()) || 'free' }));
    // 10. Day plan rows — що користувач дивиться з плану
    const dpRows = document.getElementById('dayPlanRows');
    if (dpRows) {
      dpRows.addEventListener('click', () => {
        _tOnce('dpRow_click', 30000, () => window.GT.track('dayplan_interact'));
      });
    }
    // 11. 3-day pill click (переходить у деталі прогнозу)
    const threeQ = document.getElementById('threeQuick');
    if (threeQ) {
      threeQ.addEventListener('click', () => {
        _tOnce('3day_click', 30000, () => window.GT.track('forecast_3d_click'));
      });
    }
  });

  // 12. Session duration — відправляти на unload
  const _tStart = Date.now();
  window.addEventListener('beforeunload', () => {
    try {
      const sec = Math.round((Date.now() - _tStart) / 1000);
      if (sec > 3) window.GT.track('session_end', { duration_s: sec });
    } catch(e){ globalThis.NRDiagnostics?.record('catch.300','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  });

})();
{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line21198';}
