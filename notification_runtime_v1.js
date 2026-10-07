// Daily notifications use exactly the same authority and freshness as the UI.
(function(host){
'use strict';
const dailyURL='./?push=daily#heroCard',stormURL='./?push=storm#kpHourlyPanel';
function safeURL(value,scope,fallback=dailyURL){
  try {const u=new URL(value||fallback,scope),base=new URL(scope);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname))return u.href;} catch (_) { globalThis.NRDiagnostics?.record('catch.314','recoverable'); }
  return new URL(fallback,scope).href;
}
function daily(feed,now=Date.now()){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const result=host.NRConsumerAuthority.resolve(feed?.days?.[date],date,now,false);
  const view=host.NRConsumerAuthority.present(result);
  return {title:'NeboRhythm · '+date,body:result.available?view.title+'. '+view.summary:view.label+'. Відкрийте застосунок, щоб перевірити джерела.',date,state:result.state,score:result.score};
}
async function loadDaily(scope){
  try{return daily(await host.NRConsumerAuthority.loadFeeds(scope));}
  catch(e){host.NRDiagnostics?.record('notification.source','recoverable');return daily(null)}
}
function install(sw){
  sw.addEventListener('push',event=>event.waitUntil((async()=>{
    let payload={};try{payload=event.data?.json()||{};}catch(_){ globalThis.NRDiagnostics?.record('catch.316','recoverable'); }
    const storm=payload.category==='storm',category=storm?'storm':'daily';
    // Never repeat a legacy server score or a cached payload as today's score.
    const content=storm?{title:payload.title||'NeboRhythm · Kp',body:payload.body||'Оновлення фізичного показника Kp'}:await loadDaily(sw.registration.scope);
    await sw.registration.showNotification(content.title,{
      body:content.body,icon:'./icon192.png',badge:'./icon192.png',tag:'gindex-'+category,renotify:storm,
      data:{url:safeURL(storm?payload.url:dailyURL,sw.registration.scope,storm?stormURL:dailyURL),category,date:content.date,state:content.state},
      actions:[{action:'open',title:'Відкрити NeboRhythm'}]
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
host.NRNotificationRuntime=Object.freeze({daily,loadDaily,safeURL,install});
})(globalThis);
