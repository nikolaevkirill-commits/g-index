// Consumer preview only: private research sources are deliberately unpublished.
// Reject explicitly; do not fabricate JSON, scores, successful responses or trust.
(()=>{'use strict';const excluded=new Set(["FUTURE_CALENDAR_ADVISORY_v1.json", "chrono_v1.csv", "PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json", "EXPERT_DECISION_REGISTRY_v1.json", "FP463_CHANNEL_SCORECARD.json", "expert_overrides_v3.json", "expert_calc_scores.json", "SELECTIVE_POLICY_STRONG_RAW_v2.json", "AUTO_PROSPECTIVE_STATUS_v1.json", "TANITA_2Y_PROMOTION_GATE_v1.json", "TANITA_REVIEW_PRIORITY_STATUS_v1.json", "AUTO_FORECAST_FEED_v1.json", "engine_scores.json"]);const base=new URL('.',document.baseURI),original=window.fetch;
window.__nrPublicPreview=true;
window.fetch=function(input,init){let url;try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,document.baseURI)}catch{return original.call(this,input,init)}
if(url.origin===base.origin&&url.pathname.startsWith(base.pathname)&&excluded.has(url.pathname.slice(base.pathname.length))){const error=new Error('Research source not published in consumer preview: '+url.pathname.slice(base.pathname.length));error.code='NR_RESEARCH_NOT_PUBLISHED';return Promise.reject(error)}
return original.call(this,input,init)};
window.NRPublicPreviewPolicy=Object.freeze({unpublished:Object.freeze([...excluded])});
})();
