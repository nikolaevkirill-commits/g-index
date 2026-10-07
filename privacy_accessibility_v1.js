// Local privacy controls and accessible shell lifecycle.
(function(){
  'use strict';
  const tr=s=>window.NRLocale?.text(s)||s;
  // Includes legacy writers through lsSet and variable/template keys.
  const STORAGE_POLICY={prefixes:['gindex_','gidx_','gix_','g_history_','gPrev_','neborythm.','nr_canonical_snapshot_','personalData_'],keys:['personalData','last_geo_lat','last_geo_lon','last_kp_known','last_dst_known','last_bz_known','last_vsw_known','last_xray_class','g_telemetry','v86_heat','v86_radial','fp434_route','cmp_mode','mnavTab','dgd_cache_v1','__vlDiag_last'],exportExcluded:['gindex_session_token']};
  function ownedKeys(storage){return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k&&(STORAGE_POLICY.keys.includes(k)||STORAGE_POLICY.prefixes.some(p=>k.startsWith(p))))}
  // No personal payload is sent; each open tab clears its own session and timer.
  const RESET_SIGNAL='gindex_privacy_reset_v1';
  let resetInProgress=false,resetChannel=null;
  try{if(typeof window.BroadcastChannel==='function')resetChannel=new window.BroadcastChannel(RESET_SIGNAL)}catch(_e){ window.NRDiagnostics?.record('legacy.catch.265','recoverable'); }
  if(resetChannel)resetChannel.onmessage=event=>{if(event.data==='clear-local-data')clearLocalState(true)};
  window.addEventListener('storage',event=>{
    if(event.key===RESET_SIGNAL&&event.newValue==='clear-local-data')clearLocalState(true);
  });
  function notifyOtherTabs(){
    try{if(resetChannel){resetChannel.postMessage('clear-local-data');return}}catch(_e){ window.NRDiagnostics?.record('legacy.catch.266','recoverable'); }
    try{localStorage.setItem(RESET_SIGNAL,'clear-local-data');localStorage.removeItem(RESET_SIGNAL)}catch(_e){ window.NRDiagnostics?.record('legacy.catch.267','recoverable'); }
  }
  const STATE_COPY={
    loading:['⏳ ЗАВАНТАЖЕННЯ','Очікуємо дані. Рішення не показується як нейтральне до завершення перевірки.'],
    stale:['◷ ЗАСТАРІЛІ ДАНІ','Частина джерел повернула кешовані дані. Доступність поточного рішення визначається його джерелами та строком чинності.'],
    offline:['⇣ ОФЛАЙН · ДАНІ З КЕШУ','Канонічне рішення збережене на пристрої. Live G недоступний до відновлення мережі.'],
    missing:['— НЕМАЄ ДАНИХ','Відсутність даних не трактується як нейтральний стан або нульове рішення.'],
    error:['! ПОМИЛКА ОНОВЛЕННЯ','Оновлення не завершено. Застосунок не підмінює помилку синтетичним рішенням.'],
    fallback:['F РЕЗЕРВНИЙ КОНТЕКСТ','Резервний Kp позначено окремо; він не є перевіреним експертним рішенням.']
  };
  function status(text){const node=document.getElementById('nrProfileStatus');if(node){node.textContent=text;node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true')}}
  function promoteRouteHeadings(){
    document.querySelectorAll('.nr-route').forEach(route=>{
      const old=route.querySelector(':scope > .nr-route-head h2, :scope > .nr-cover h2.nr-cover-title');
      if(!old)return;
      const hadFocus=document.activeElement===old;const h1=document.createElement('h1');[...old.attributes].forEach(a=>h1.setAttribute(a.name,a.value));h1.innerHTML=old.innerHTML;h1.setAttribute('tabindex','-1');old.replaceWith(h1);if(hadFocus)h1.focus({preventScroll:true});
      if(!h1.id)h1.id='nrRouteHeading-'+route.dataset.route;route.setAttribute('aria-labelledby',h1.id);
    });
  }
  function addLocalControls(){
    const form=document.getElementById('nrProfileForm');if(!form||form.querySelector('.nr-local-controls'))return;
    const controls=document.createElement('div');controls.className='nr-local-controls';controls.setAttribute('aria-label','Керування локальними даними');controls.innerHTML='<button class="nr-btn secondary" type="button" onclick="fp450ExportLocalData()">Експортувати мої дані</button><button class="nr-btn danger" type="button" onclick="fp450ClearLocalData()">Очистити локальні дані</button>';
    const statusNode=document.getElementById('nrProfileStatus');form.insertBefore(controls,statusNode||null);
    const scope=document.createElement('p');scope.className='nr-result-meta';scope.textContent='Очищення видаляє локальні профілі, геолокацію, журнали, плани, налаштування та локальну сесію входу Неборитму й перезавантажує сторінку. Публічний офлайн-кеш сайту та дані інших застосунків залишаються. Серверний обліковий запис не видаляється. Експорт охоплює локальні записи, крім токена входу.';controls.after(scope);
  }
  window.fp450ExportLocalData=function(){
    let url=null;
    try{
      const data={exported_at:new Date().toISOString(),storage:'local_device_only',items:{},session_items:{}};
      // Read both stores completely before creating a download. A denied read
      // must not produce an apparently complete, silently partial export.
      for(const [storage,target] of [[localStorage,data.items],[sessionStorage,data.session_items]]){
        for(const key of ownedKeys(storage).filter(k=>!STORAGE_POLICY.exportExcluded.includes(k))){
          const raw=storage.getItem(key);if(raw===null)continue;
          let value=raw;try{value=JSON.parse(raw)}catch(_e){/* Plain text is a valid stored value. */}
          // Preserve literal keys, including __proto__, as own JSON properties.
          Object.defineProperty(target,key,{value,enumerable:true,configurable:true,writable:true});
        }
      }
      data.exclusions=['authentication token','public offline site cache','other applications','server account'];
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='neborhythm-local-data.json';a.click();
      status('✓ Експорт підготовлено локально; дані нікуди не надсилалися.');
      return true;
    }catch(_e){
      globalThis.NRDiagnostics?.record('privacy.export','recoverable');
      status('Не вдалося експортувати локальні дані. Перевірте доступ до сховища й завантажень у браузері та повторіть.');
      return false;
    }finally{if(url!==null){const created=url;setTimeout(()=>URL.revokeObjectURL(created),0)}}
  };
  window.fp450ClearLocalData=function(){
    if(!confirm(tr('Видалити локальні профілі, геолокацію, журнали, плани, налаштування та сесію входу Неборитму? Сторінка перезавантажиться. Публічний офлайн-кеш і серверний обліковий запис залишаться.')))return;
    clearLocalState(false);
  };
  function clearLocalState(fromPeer){
    if(resetInProgress)return;
    resetInProgress=true;
    window.clearTimeout(window.__nrPlanReminderTimer);
    window.__nrPlanReminderTimer=null;
    document.getElementById('nrPlanForm')?.reset();
    document.getElementById('nrOutcomeForm')?.reset();
    ['nrPlanResult','nrOutcomeHistory','nrPlanGuard'].forEach(id=>{const node=document.getElementById(id);if(node)node.replaceChildren()});
    ['nrReminderStatus','nrPlanStatus','nrOutcomeStatus'].forEach(id=>{const node=document.getElementById(id);if(node)node.textContent='Локальні дані очищено.'});
    // The initiating tab already cleared shared localStorage. Peers must not
    // erase a new profile that the user saves after that completed deletion.
    try{(fromPeer?[sessionStorage]:[localStorage,sessionStorage]).forEach(storage=>ownedKeys(storage).forEach(k=>storage.removeItem(k)))}catch(_e){ globalThis.NRDiagnostics?.record('catch.306','recoverable'); resetInProgress=false;status('Не вдалося повністю очистити локальне сховище. Повторіть очищення через налаштування браузера.');return}
    const form=document.getElementById('nrProfileForm');form?.reset();if(form?.elements.city)form.elements.city.value='Київ';
    status('✓ Локальні дані очищено на цьому пристрої.');
    if(typeof renderProfileResult==='function')renderProfileResult();
    if(!fromPeer)notifyOtherTabs();
    window.location.reload();
  }
  function enhanceCharts(){
    document.querySelectorAll('.nr-chart-table').forEach((table,i)=>{
      if(!table.querySelector('caption')){const caption=document.createElement('caption');caption.className='nr-sr-only';caption.textContent=`Таблична альтернатива графіку ${[3,7,27][i]||''} днів: рішення, raw G і статус`;table.prepend(caption)}
      table.querySelectorAll('thead th').forEach(th=>th.setAttribute('scope','col'));
    });
    document.querySelectorAll('.nr-calendar-cell.missing').forEach(cell=>{if(!cell.textContent.includes('—'))cell.append(' — дані відсутні')});
  }
  function ensureStateBanner(id){
    const shell=document.getElementById('fp434Shell');if(!shell)return null;let node=document.getElementById(id);if(node)return node;
    node=document.createElement('div');node.id=id;node.className='nr-state-fixture';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
    const announcer=document.getElementById('fp434RouteAnnouncer');(announcer||shell.firstChild)?.insertAdjacentElement('afterend',node);return node;
  }
  function showState(id,state,isFixture){const node=ensureStateBanner(id);const copy=STATE_COPY[state];if(!node||!copy)return;node.dataset.state=state;node.dataset.qaFixture=String(!!isFixture);node.innerHTML=`<strong>${copy[0]}${isFixture?' · QA FIXTURE':''}</strong><span>${copy[1]}</span>`;node.classList.add('is-visible')}
  function hideState(id){document.getElementById(id)?.classList.remove('is-visible')}
  function applyFixture(){
    const state=new URLSearchParams(location.search).get('qa_state');if(!STATE_COPY[state])return;showState('nrQaStateFixture',state,true);
    const labels={loading:'ЗАВАНТАЖЕННЯ',stale:'ДАНІ ЗАСТАРІЛІ',offline:'ДАНІ З КЕШУ',missing:'НЕМАЄ ДАНИХ',error:'ПОМИЛКА ОНОВЛЕННЯ',fallback:'РЕЗЕРВНИЙ КОНТЕКСТ'};
    const sync=()=>{const fresh=document.getElementById('nrCoverFresh');if(fresh&&fresh.textContent!==labels[state])fresh.textContent=labels[state];if(state==='offline'){const liveG=document.getElementById('nrCoverLiveG'),kp=document.getElementById('nrCoverKp'),shift=document.getElementById('nrCoverShift'),live=liveG?.parentElement;if(liveG&&liveG.textContent!=='—')liveG.textContent='—';if(kp&&kp.textContent!=='—')kp.textContent='—';if(shift&&shift.textContent!=='—')shift.textContent='—';if(live?.firstChild&&!/^КЕШОВАНИЙ ФОН G/.test(live.firstChild.nodeValue||''))live.firstChild.nodeValue='КЕШОВАНИЙ ФОН G ';}};
    sync();
    const cover=document.getElementById('nrCover');
    if(cover)new MutationObserver(sync).observe(cover,{childList:true,characterData:true,subtree:true});
    requestAnimationFrame(sync);
  }
  function wireKeyboard(){
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        const active=document.querySelector('.nr-route.active'),opened=active?.querySelector('details[open]');if(opened){event.preventDefault();opened.open=false;opened.querySelector('summary')?.focus()}
      }
      if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&event.target.matches('#nrTopNav button,.mnav-btn')){
        const group=[...event.target.parentElement.querySelectorAll('button')].filter(b=>b.offsetParent!==null),i=group.indexOf(event.target),step=event.key==='ArrowRight'?1:-1;if(i>=0){event.preventDefault();group[(i+step+group.length)%group.length].focus()}
      }
    });
    document.addEventListener('focusin',event=>{if(innerWidth<=700&&event.target.matches('.nr-field input,.nr-field select,.nr-field textarea'))setTimeout(()=>event.target.scrollIntoView({block:'center',behavior:'smooth'}),80)});
  }
  function init(){
    promoteRouteHeadings();addLocalControls();enhanceCharts();applyFixture();wireKeyboard();
    const shell=document.getElementById('fp434Shell');if(shell)new MutationObserver(()=>enhanceCharts()).observe(shell,{childList:true,subtree:true});
    ['nrProfileStatus','nrMatchStatus','nrPlanStatus'].forEach(id=>{const n=document.getElementById(id);if(n){n.setAttribute('aria-live','polite');n.setAttribute('aria-atomic','true')}});
    setTimeout(enhanceCharts,900);setTimeout(enhanceCharts,2600);
  }
  window.addEventListener('gindex:data-ready',()=>setTimeout(enhanceCharts,120));
  window.addEventListener('offline',()=>showState('nrRuntimeState','offline',false));
  window.addEventListener('online',()=>hideState('nrRuntimeState'));
  window.addEventListener('engine-data-stale',()=>showState('nrRuntimeState','stale',false));
  window.addEventListener('engine-data-refreshed',()=>{if(![...window.__nrSWResourceStates.values()].some(x=>x.type==='SW_STALE_DATA'))hideState('nrRuntimeState')});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,240),{once:true});else setTimeout(init,240);
})();
