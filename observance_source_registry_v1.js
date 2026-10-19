/* Source-backed observance registry. Never infer festival dates from tithi alone. */
(function(root){'use strict';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function validDate(value){if(typeof value!=='string'||!DATE.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;}
function text(value){return typeof value==='string'&&!!value.trim();}
function sourceURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}catch(_){return false;}}
function eventsFor(date,tradition,location,records){
 if(!validDate(date)||!text(tradition)||!text(location)||!Array.isArray(records))return {status:'invalid_input',events:[]};
 const events=[];const rejected=[];
 for(const [i,r] of records.entries()){
  if(!r||r.date!==date||r.tradition!==tradition||r.location!==location)continue;
  const valid=r.review_status==='approved'&&typeof r.source_url==='string'&&sourceURL(r.source_url)&&text(r.source_title)&&validDate(r.reviewed_at)&&r.reviewed_at<=new Date().toISOString().slice(0,10)&&text(r.rule_version)&&text(r.title);
  if(valid)events.push({title:r.title,date,tradition,location,source_url:r.source_url,rule_version:r.rule_version});else rejected.push(i);
 }
 return {status:rejected.length?'some_unverified':'ok',events,rejected};
}
function sourceLabelsFor(date,records){
 if(!validDate(date)||!Array.isArray(records))return [];
 return records.filter(r=>r&&r.date===date&&['provisional_source_label','source_label_pdf_page_verified'].includes(r.review_status)&&text(r.title)&&r.provenance&&/^[a-f0-9]{64}$/.test(r.provenance.sha256)&&r.provenance.json_pointer==='/'+date&&text(r.provenance.original_tag)).map(r=>({title:r.title,astro_check:r.astro_check,review_status:r.review_status,provenance:r.provenance}));
}
root.SkyRhythmApprovedObservances=Object.freeze({eventsFor,sourceLabelsFor});
})(typeof window==='undefined'?globalThis:window);
