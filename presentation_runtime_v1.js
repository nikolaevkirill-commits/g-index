/* Presentation-only helpers: cache formatters, never dates or forecast values. */
(function(host){
  'use strict';
  const formatters=new Map(), animations=new WeakMap();
  function dateFormatter(locale,options){
    const key=JSON.stringify([locale,options]);
    if(formatters.has(key)) return formatters.get(key);
    const formatter=new Intl.DateTimeFormat(locale,options);
    if(formatters.size>=32) formatters.delete(formatters.keys().next().value);
    formatters.set(key,formatter);
    return formatter;
  }
  function heroValue(node,value,integer){
    const prior=animations.get(node);
    const format=n=>(n>=0?'+':'')+(integer?Math.round(n):n.toFixed(2));
    if(prior&&Object.is(prior.target,value)&&prior.integer===integer){
      // Let an active transition finish; do not restart it on repeated syncs.
      if(!prior.frame) node.textContent=Number.isFinite(value)?format(value):'…';
      return;
    }
    if(prior&&prior.frame) host.cancelAnimationFrame(prior.frame);
    const state={target:value,integer,current:value,frame:0};
    animations.set(node,state);
    node.style.transform='scale(1)';
    if(!Number.isFinite(value)){node.textContent='…';return;}
    const from=prior?.current;
    if(!Number.isFinite(from)||from===value||host.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      node.textContent=format(value);return;
    }
    state.current=from;
    const start=host.performance.now();
    function tick(ts){
      const p=Math.max(0,Math.min(1,(ts-start)/600));
      state.current=from+(value-from)*(1-Math.pow(1-p,3));
      node.textContent=format(state.current);
      node.style.transform=p<0.3?'scale('+(1+.06*(1-p/.3))+')':'scale(1)';
      state.frame=p<1?host.requestAnimationFrame(tick):0;
    }
    state.frame=host.requestAnimationFrame(tick);
  }
  host.NRPresentation=Object.freeze({dateFormatter,heroValue});
})(window);
