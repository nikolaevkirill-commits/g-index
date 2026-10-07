// Extracted without changing subscription behaviour.
const PUSH = (function(){
  function _log(...a){ try{ if(window._DEBUG) console.log('[PUSH]', ...a); }catch(e){ globalThis.NRDiagnostics?.record('catch.307','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)} }
  function _warn(...a){ try{ console.warn('[PUSH]', ...a); }catch(e){ globalThis.NRDiagnostics?.record('catch.308','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)} }

  function isSupported(){
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  // fp260: більше не залежить від SUPA (видалений backend) — лише від
  // наявності VAPID-ключа. Worker-доступність перевіряється фактичним
  // запитом у subscribe(), не тут (немає сенсу тримати другий health-check).
  function isConfigured(){
    return !window.GINDEX_PLAY_CHANNEL && !!window._vapid_public_key;
  }

  function currentPermission(){
    if(!isSupported()) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  async function isSubscribed(){
    if(!isSupported()) return false;
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    }catch(e){ globalThis.NRDiagnostics?.record('catch.309','recoverable');  return false; }
  }

  // VAPID base64url → Uint8Array (per web-push spec)
  function _urlBase64ToUint8Array(b64){
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const normalized = (b64 + padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw = atob(normalized);
    const out = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function subscribe(){
    if(window.GINDEX_PLAY_CHANNEL) throw new Error('Push вимкнено у версії Google Play.');
    if(!isSupported()) throw new Error('Push не підтримується цим браузером');
    if(!isConfigured()) throw new Error('Push ще не налаштовано на сервері');

    // 1. Запросити дозвіл
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') throw new Error('Дозвіл не надано: ' + perm);

    // 2. Отримати SW registration
    const reg = await navigator.serviceWorker.ready;

    // 3. Підписка (або реюз існуючу)
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      const options={
        userVisibleOnly:true,
        applicationServerKey:_urlBase64ToUint8Array(window._vapid_public_key)
      };
      try{
        sub=await reg.pushManager.subscribe(options);
      }catch(firstError){ globalThis.NRDiagnostics?.record('catch.310','recoverable');
        // Chrome occasionally keeps a stale push-service registration after a
        // service-worker/VAPID update. Refresh the registration and retry once.
        try{await reg.update();}catch(_updateError){ window.NRDiagnostics?.record('legacy.catch.45','recoverable'); }
        await new Promise(resolve=>setTimeout(resolve,900));
        try{
          sub=await reg.pushManager.subscribe(options);
        }catch(secondError){ globalThis.NRDiagnostics?.record('catch.311','recoverable');
          const raw=String((secondError&&secondError.message)||secondError||firstError||'');
          if(/could not retrieve the public key|registration failed|push service/i.test(raw)){
            throw new Error(
              'Chrome не зміг зареєструвати пристрій у своїй push-службі. '+
              'Закрийте всі вікна Chrome, відкрийте браузер знову та повторіть. '+
              'Якщо помилка лишиться — очистьте дані цього сайту й перевірте, '+
              'що сповіщення дозволені. Telegram Kp-алерти працюють незалежно.'
            );
          }
          throw secondError;
        }
      }
    }

    // 4. Зберегти на gindex-auth Worker (fp260: замість мертвого Supabase).
    // Той самий Bearer-паттерн, що вже реально працює для /auth/logout.
    const token = GAuth.getToken();
    if(!token) throw new Error('Увійдіть в акаунт, щоб увімкнути сповіщення');

    const subJson = sub.toJSON();
    const row = {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys && subJson.keys.p256dh,
      auth_secret: subJson.keys && subJson.keys.auth,
      user_agent: navigator.userAgent
    };

    let r;
    try {
      r = await fetch(GAUTH_WORKER_URL + '/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(row)
      });
    } catch(netErr) { globalThis.NRDiagnostics?.record('catch.312','recoverable');
      throw new Error('Сервер сповіщень недоступний. Перевір інтернет і спробуй знову.');
    }
    if (!r.ok) {
      let msg = 'Не вдалося зберегти підписку (HTTP ' + r.status + ')';
      try { const data = await r.json(); if (data && data.error) msg = data.error; } catch(_e){ window.NRDiagnostics?.record('legacy.catch.46','recoverable'); }
      throw new Error(msg);
    }
    _log('subscribed and stored');
    return sub;
  }

  async function unsubscribe(){
    if(!isSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    // Видалити на Worker-стороні, якщо є токен (fp260: замість Supabase delete).
    const token = GAuth.getToken();
    if(token && !window.GINDEX_PLAY_CHANNEL){
      try{
        await fetch(GAUTH_WORKER_URL + '/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ endpoint })
        });
      }catch(e){ globalThis.NRDiagnostics?.record('catch.313','recoverable');  _warn('server-side unsubscribe failed:', e); }
    }
    _log('unsubscribed');
  }

  // SW повідомляє про pushsubscriptionchange (browser auto-renewed) — re-subscribe
  if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener && navigator.serviceWorker.addEventListener('message', event => {
      if(event.data&&/^SW_(FRESH|STALE)_DATA$/.test(event.data.type)&&!acceptSWDataMessage(event.data))return;
      if(event.data && event.data.type === 'SW_PUSH_SUB_CHANGED'){
        _log('SW notified subscription changed — re-subscribing');
        subscribe().catch(e => {globalThis.NRDiagnostics?.record('promise.catch.12','recoverable');return (_warn('auto re-subscribe failed:', e));});
      }
      // V25-fu16: SW_FRESH_DATA / SW_STALE_DATA notifications
      if(event.data && event.data.type === 'SW_FRESH_DATA'){
        _log('SW: fresh data fetched at', new Date(event.data.fetchedAt).toISOString());
        // Could trigger UI refresh here if data binding exists
        try { window.dispatchEvent(new CustomEvent('engine-data-refreshed', { detail: event.data })); } catch(e){ window.NRDiagnostics?.record('legacy.catch.47','recoverable'); }
      }
      if(event.data && event.data.type === 'SW_STALE_DATA'){
        _warn('SW: serving stale data (offline)');
        try { window.dispatchEvent(new CustomEvent('engine-data-stale', { detail: event.data })); } catch(e){ window.NRDiagnostics?.record('legacy.catch.48','recoverable'); }
      }
    });
  }

  return { isSupported, isConfigured, currentPermission, isSubscribed, subscribe, unsubscribe };
})();
