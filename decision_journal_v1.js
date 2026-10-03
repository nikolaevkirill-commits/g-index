
// fp95b: GDecisionLog — event-triggered causal logging
// Reset a horizontal position retained by the browser from older overflow builds.
window.addEventListener('pageshow', function(){
  if (document.documentElement.scrollLeft || document.body.scrollLeft) {
    window.scrollTo({left:0, top:window.scrollY, behavior:'instant'});
  }
});
window.GDecisionLog = (function(){
  const LS_KEY = 'gindex_decision_log_v1';
  function _load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ globalThis.NRDiagnostics?.record('catch.301','recoverable');  return []; } }
  function _save(arr){ try{ localStorage.setItem(LS_KEY,JSON.stringify(arr)); return true; }catch(e){ globalThis.NRDiagnostics?.record('catch.302','recoverable');  return false; } }
  function _today(){ return todayKyivStr(); }
  function _getG(){
    try{
      const el=document.getElementById('heroGval')||document.getElementById('gNowVal');
      const value = el ? Number.parseFloat(el.textContent) : NaN;
      return Number.isFinite(value) ? value : null;
    }catch(e){ globalThis.NRDiagnostics?.record('catch.303','recoverable');  return null; }
  }

  function open(){
    const m=document.getElementById('gdlModal');
    if(m){ m.style.display='flex'; document.getElementById('gdlStatus').textContent=''; }
  }
  function close(){
    const m=document.getElementById('gdlModal');
    if(m) m.style.display='none';
  }
  function save(){
    const planned=(document.getElementById('gdlPlanned')?.value||'').trim();
    const avoided=(document.getElementById('gdlAvoided')?.value||'').trim();
    const actionEl=document.querySelector('input[name="gdlAction"]:checked');
    const action=actionEl?actionEl.value:'';
    const types=[...document.querySelectorAll('#gdlTypes input:checked')].map(i=>i.value);

    if(!planned){ document.getElementById('gdlStatus').textContent='⚠ Заповни "що планував"'; return; }
    if(!action){ document.getElementById('gdlStatus').textContent='⚠ Обери що зробив'; return; }

    const entry={
      date:_today(),
      ts:new Date().toISOString(),
      g_at_save:_getG(),
      types,
      planned_action:planned,
      action_changed:action,
      avoided_event:avoided||'none',
      forecast_seen:true
    };
    const arr=_load();
    arr.push(entry);
    _save(arr);
    document.getElementById('gdlStatus').textContent='✓ Збережено';
    setTimeout(close, 800);
  }

  return { open, close, save };
})();
window.GJyotishLayer = (function(){
  const key='gindex_jyotish_visible_v1';
  let current=true;
  function apply(visible){
    current=visible;
    const content=document.getElementById('jyotishTraditionalContent');
    const button=document.getElementById('btnJyotishVisibility');
    if(content) content.hidden=!visible;
    if(button){
      button.setAttribute('aria-pressed',String(visible));
      const en=typeof _currentLang!=='undefined'&&_currentLang==='EN';
      button.textContent=en?(visible?'Traditional layer: shown':'Traditional layer: hidden'):(visible?'Традиційний шар: показано':'Традиційний шар: приховано');
    }
    try{localStorage.setItem(key,visible?'1':'0');}catch(_e){ window.NRDiagnostics?.record('legacy.catch.263','recoverable'); }
  }
  function init(){
    let visible=true;
    try{visible=localStorage.getItem(key)!=='0';}catch(_e){ window.NRDiagnostics?.record('legacy.catch.264','recoverable'); }
    apply(visible);
    document.getElementById('btnJyotishVisibility')?.addEventListener('click',function(){apply(this.getAttribute('aria-pressed')!=='true');});
  }
  function refreshLabel(){apply(current);}
  return {init,apply,refreshLabel};
})();
document.addEventListener('DOMContentLoaded',window.GJyotishLayer.init,{once:true});
{const panel=document.getElementById('__cpPanel');if(panel)panel.textContent += '\nCP block-end @line21303';}
