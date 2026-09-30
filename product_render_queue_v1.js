// Product rendering coordinator; numerical authority is injected by the page.
(function(host){
'use strict';
function create({resolve,renderers}){
  const _productDirty=new Set(),_productAsync=new Map();let _productFrame=null,_productRendering=false,_productSnapshot=null;
  let _productRenderGeneration=0;
  function _freezeResolved(value){
    if(value===null||typeof value!=='object')return value;
    if(Array.isArray(value))return Object.freeze(value.map(_freezeResolved));
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,_freezeResolved(v)])));
  }
  function operationalForDate(d){
    if(!_productSnapshot)return resolve(d);
    const key=JSON.stringify([d?.ds,d?.G,d?._calendarOffset,d?._missing,d?._hasRaw]);
    if(!_productSnapshot.has(key))_productSnapshot.set(key,_freezeResolved(resolve(d)));
    return _productSnapshot.get(key);
  }
  function requestProductRender(...parts){
    parts.forEach(p=>_productDirty.add(p));
    if(_productFrame!==null||_productRendering||document.hidden)return;
    _productFrame=requestAnimationFrame(_flushProductRender);
  }
  function _flushProductRender(){
    _productFrame=null;if(document.hidden)return;
    const active=document.querySelector('.nr-route.active')?.dataset.route;
    const jobs=['forecast','calendar','independent','cover'].map(part=>[part,renderers[part]]);
    const result={generation:++_productRenderGeneration,parts:[],errors:[],resolvedDates:0};
    _productRendering=true;_productSnapshot=new Map();
    try{
      for(const [part,render] of jobs){
        if(!_productDirty.has(part)||_productAsync.has(part))continue;
        if((part==='forecast'||part==='independent')&&active!=='forecast')continue;
        if(part==='calendar'&&active!=='calendar')continue;
        _productDirty.delete(part);
        try{
          const task=render();
          if(task?.then){
            const pending=Promise.resolve(task).catch(e=>{window.NRDiagnostics?.record('render.async','recoverable',e);console.warn('[product render]',part,e)}).finally(()=>{
              _productAsync.delete(part);if(_productDirty.has(part))requestProductRender();
            });_productAsync.set(part,pending);
          }
          result.parts.push(part);
        }
        catch(e){window.NRDiagnostics?.record('render.sync','recoverable',e);result.errors.push({part,message:String(e?.message||e)});console.warn('[product render]',part,e)}
      }
      result.resolvedDates=_productSnapshot.size;
    }finally{
      _productSnapshot=null;_productRendering=false;
      result.pending=[..._productDirty];window.__lastProductRender=Object.freeze(result);
    }
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestProductRender()});
  function renderOrDefer(part){
    if(_productRendering){_productDirty.add(part);return;}
    return renderers[part]();
  }
  return Object.freeze({request:requestProductRender,resolve:operationalForDate,renderOrDefer});
}
host.NRRenderQueue=Object.freeze({create});
})(window);
