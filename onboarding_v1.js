
// ─── ONBOARDING v65 ───────────────────────────────────────────────────────
(function(){
  const ONBOARD_KEY = 'gidx_onboard_done_v1';
  let _obStep = 0;
  let _obProfile = null;
  const TOTAL = 4;

  function obShow(){
    const ov = document.getElementById('onboardOverlay');
    if(ov){ ov.style.display = 'flex'; }
  }
  function obUpdateDots(){
    for(let i=0;i<TOTAL;i++){
      const d = document.getElementById('obDot'+i);
      if(d) d.style.background = i===_obStep ? '#37a7ff' : '#2a3b61';
    }
  }
  function obShowSlide(n){
    for(let i=0;i<TOTAL;i++){
      const s = document.getElementById('obSlide'+i);
      if(s) s.style.display = i===n ? 'block' : 'none';
    }
    const nextBtn = document.getElementById('obNext');
    if(nextBtn){
      if(n===TOTAL-1){ nextBtn.textContent = 'Почати ✓'; }
      else if(n===2){ nextBtn.textContent = _obProfile ? 'Далі →' : 'Далі →'; }
      else { nextBtn.textContent = 'Далі →'; }
    }
    obUpdateDots();
  }

  window.obSelectProfile = function(btn){
    document.querySelectorAll('.ob-prof-btn').forEach(b=>{
      b.style.border = '1px solid #2a3b61';
      b.style.background = '#090f1e';
      b.style.color = '#b7c7ea';
    });
    btn.style.border = '1px solid #37a7ff';
    btn.style.background = '#0d1f3a';
    btn.style.color = '#e7efff';
    _obProfile = btn.dataset.prof;
  };

  window.onboardNext = function(){
    if(_obStep < TOTAL-1){
      _obStep++;
      obShowSlide(_obStep);
    } else {
      onboardFinish();
    }
  };

  window.onboardFinish = function(){
    // Apply selected profile if any
    if(_obProfile){
      try{
        // v87.59: gidx_profile write removed — orphan key (никогда не читалось).
        // Профіль застосовується через setProfile() нижче + зберігається у getSlotData(0).profile при "Зберегти" у формі.
        // trigger profile change in main app if function exists
        if(typeof setProfile === 'function') setProfile(_obProfile);
        else if(typeof _activeProfile !== 'undefined') window._activeProfile = _obProfile;
      }catch(e){ globalThis.NRDiagnostics?.record('catch.294','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
    }
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch(_e){ window.NRDiagnostics?.record('legacy.catch.261','recoverable'); } // v88.8.35-fp56-P8
    const ov = document.getElementById('onboardOverlay');
    if(ov){ ov.style.opacity='0'; ov.style.transition='opacity .4s'; setTimeout(()=>ov.style.display='none',400); }
    // v88.8.35-fp56-P5: one-time mode picker after onboarding — ask once, persist choice.
    setTimeout(() => {
      try {
        const _hasMode = localStorage.getItem('gindex_simple_mode') !== null;
        if (_hasMode) return; // already chosen
        const _pick = document.createElement('div');
        _pick.id = 'basicModePicker';
        _pick.setAttribute('role','dialog'); _pick.setAttribute('aria-modal','true');
        _pick.setAttribute('aria-label','Оберіть вигляд дашборду');
        _pick.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:19000;background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:14px 18px;max-width:360px;width:calc(100vw - 32px);box-shadow:0 8px 32px rgba(0,0,0,.6);text-align:center';
        _pick.innerHTML=`<div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:10px">Який вигляд зручніший?</div>`
          +`<div style="display:flex;gap:8px;justify-content:center">`
          +`<button onclick="setSimpleMode(false);document.getElementById('basicModePicker')?.remove()" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid var(--border2);background:rgba(55,167,255,.08);color:#8fb5ff;font-size:12px;font-weight:700;cursor:pointer">📊 Повний<br><span style='font-size:10px;font-weight:400;color:var(--dim)'>Усі дані й аналітика</span></button>`
          +`<button onclick="setSimpleMode(true);document.getElementById('basicModePicker')?.remove()" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid var(--border2);background:rgba(43,212,125,.08);color:#9cd49c;font-size:12px;font-weight:700;cursor:pointer">👁 Простий<br><span style='font-size:10px;font-weight:400;color:var(--dim)'>Тільки головне</span></button>`
          +`</div>`;
        document.body.appendChild(_pick);
      } catch(_e){ window.NRDiagnostics?.record('legacy.catch.262','recoverable'); }
    }, 500);
  }; // end obNext click handler

  // v88.8.62-fp138: do NOT auto-open onboarding on production load.
  // It was not the root data bug, but it magnified hangs by placing a modal over a half-rendered UI.
  // Keep onboarding functions for manual/dev use; mark as done by default for existing users/hard resets.
  try{
    if(!localStorage.getItem(ONBOARD_KEY)) localStorage.setItem(ONBOARD_KEY, '1');
    // Manual debug: add ?onboard=1 to force the tutorial.
    if(new URLSearchParams(location.search).get('onboard') === '1'){
      setTimeout(obShow, 600);
      obShowSlide(0);
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.295','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
})();
{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line21013';}
