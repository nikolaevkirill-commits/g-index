// Daily notifications use exactly the same authority and freshness as the UI.
(function(host){
'use strict';
const dailyURL='./?push=daily#heroCard',stormURL='./?push=storm#kpHourlyPanel';
function safeURL(value,scope,fallback=dailyURL){
  try {const u=new URL(value||fallback,scope),base=new URL(scope);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname))return u.href;} catch (_) { globalThis.NRDiagnostics?.record('catch.314','recoverable'); }
  return new URL(fallback,scope).href;
}
// NOTIF-1: the notification follows the interface language (shared through Cache Storage by
// locale_core_v1.js) and states the civil-day anchor. Score and state come only from resolveFinal.
const LANGS=['uk','en','es','fr'],PREFS='nr-prefs-v1',LOCALE_KEY='__nr_locale';
const COPY={
 uk:{expert:'експертна оцінка',formula:'формула джерела',offline:'офлайн, збережений розрахунок',day:'день за київським часом',none:'Немає актуальної оцінки. Відкрийте застосунок, щоб перевірити джерела.',score:'Оцінка дня',note:'Точність щодо подій не підтверджена.',conflict:'Експертні рішення суперечать одне одному — оцінку не показано.'},
 en:{expert:'expert assessment',formula:'source formula',offline:'offline, saved calculation',day:'Kyiv calendar day',none:'No current score. Open the app to check the sources.',score:'Day score',note:'Accuracy for real events is not confirmed.',conflict:'Expert decisions conflict — no score shown.'},
 es:{expert:'evaluación experta',formula:'fórmula de la fuente',offline:'sin conexión, cálculo guardado',day:'día civil de Kiev',none:'No hay puntuación actual. Abre la aplicación para revisar las fuentes.',score:'Puntuación del día',note:'La precisión respecto a eventos reales no está confirmada.',conflict:'Las decisiones expertas se contradicen: no se muestra puntuación.'},
 fr:{expert:'évaluation experte',formula:'formule de la source',offline:'hors ligne, calcul enregistré',day:'jour civil de Kyiv',none:'Aucune note actuelle. Ouvrez l’application pour vérifier les sources.',score:'Note du jour',note:'La précision vis-à-vis des événements réels n’est pas confirmée.',conflict:'Les décisions d’expert se contredisent : aucune note affichée.'}};
function lang(value){return LANGS.includes(value)?value:'uk';}
function daily(feed,now=Date.now(),language='uk'){
  const L=COPY[lang(language)];
  const date=NRCivilTime.dayKey(new Date(now),'Europe/Kyiv');
  const result=host.NRConsumerAuthority.resolveFinal(feed?.days?.[date],date,now,false);
  const view=host.NRConsumerAuthority.present(result);
  const source=result.state==='expert'?L.expert:result.state==='offline'?L.offline:L.formula;
  const body=result.available?L.score+' '+view.symbol+' ('+source+'). '+L.note:result.state==='expert_conflict'?L.conflict:L.none;
  return {title:'SkyRhythm · '+date+' · '+L.day,body,date,state:result.state,score:result.score,language:lang(language)};
}
async function storedLanguage(scope){
  try{const cache=await caches.open(PREFS);const hit=await cache.match(new URL(LOCALE_KEY,scope).href);return lang(hit?(await hit.text()).trim():'uk');}
  catch(_){host.NRDiagnostics?.record('notification.locale','recoverable');return 'uk';}
}
async function loadDaily(scope){
  const language=await storedLanguage(scope);
  try{return daily(await host.NRConsumerAuthority.loadFeeds(scope),Date.now(),language);}
  catch(e){host.NRDiagnostics?.record('notification.source','recoverable');return daily(null,Date.now(),language)}
}
function install(sw){
  sw.addEventListener('push',event=>event.waitUntil((async()=>{
    let payload={};try{payload=event.data?.json()||{};}catch(_){ globalThis.NRDiagnostics?.record('catch.316','recoverable'); }
    if(payload.category==='astronomical_transition'){
      let shown=false;try{shown=!!(host.SRTransitionRuntime&&await host.SRTransitionRuntime.receive(sw,payload));}catch(_){host.NRDiagnostics?.record('transition.receive','recoverable');}
      // userVisibleOnly requires a visible result even for stale/revoked/duplicate deliveries.
      // Never re-display the rejected event or convert it into a daily score.
      if(!shown)await sw.registration.showNotification('SkyRhythm',{body:'Повідомлення про перехід більше не актуальне або його неможливо перевірити. Перевірте налаштування сповіщень.',tag:'sr-transition-status',renotify:false,silent:true,icon:'./icon192.png',data:{category:'transition_status',url:new URL('./#profile',sw.registration.scope).href}});
      return;
    }
    const storm=payload.category==='storm',category=storm?'storm':'daily';
    // Never repeat a legacy server score or a cached payload as today's score.
    const content=storm?{title:payload.title||'SkyRhythm · Kp',body:payload.body||'Оновлення фізичного показника Kp'}:await loadDaily(sw.registration.scope);
    await sw.registration.showNotification(content.title,{
      body:content.body,icon:'./icon192.png',badge:'./icon192.png',tag:'gindex-'+category,renotify:storm,
      data:{url:safeURL(storm?payload.url:dailyURL,sw.registration.scope,storm?stormURL:dailyURL),category,date:content.date,state:content.state},
      actions:[{action:'open',title:'Відкрити SkyRhythm'}]
    });
  })()));
  sw.addEventListener('notificationclick',event=>{
    event.notification.close();
    const target=safeURL(event.notification.data?.url,sw.registration.scope);
    event.waitUntil((async()=>{
      for(const client of await sw.clients.matchAll({type:'window',includeUncontrolled:true})){
        try{if(new URL(client.url).origin===new URL(sw.registration.scope).origin){await client.navigate(target);return client.focus();}}catch(_){ globalThis.NRDiagnostics?.record('catch.317','recoverable'); }
      }
      return sw.clients.openWindow(target);
    })());
  });
}
host.NRNotificationRuntime=Object.freeze({daily,loadDaily,storedLanguage,safeURL,install,PREFS,LOCALE_KEY});
})(globalThis);
