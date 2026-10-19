/* Pure research decisions. No score, calendar-authority, network or storage writes. */
(function(root){'use strict';
const VERSION='festival-decision-1.0.1';
const rules=Object.freeze({
 'shastra-sankashti':Object.freeze({rule_id:'shastra-sankashti',source_id:'shastra-sankashti-20261019',rule_version:'1.0.0',event:'sankashti',anchor:'moonrise',double:'unresolved',missing:'unresolved',url:'https://shastrapanchangam.com/en/sankashti/'}),
 'panchangtime-sankashti':Object.freeze({rule_id:'panchangtime-sankashti',source_id:'panchangtime-sankashti-20261019',rule_version:'1.0.0',event:'sankashti',anchor:'moonrise',double:'first',missing:'sunrise',url:'https://panchangtime.com/methodology/sankashti-chaturthi'}),
 'nava-sankashti':Object.freeze({rule_id:'nava-sankashti',source_id:'nava-sankashti-20261019',rule_version:'1.0.0',event:'sankashti',anchor:'moonrise',double:'ghatika',missing:'prior_moonrise',ghatika_ms:1440000,url:'https://navapanchangam.com/learn/festivals_fasts/sankatahara-chaturthi'}),
 'panchangtime-monthly':Object.freeze({rule_id:'panchangtime-monthly',source_id:'panchangtime-shivaratri-20261019',rule_version:'1.0.0',event:'masik_shivaratri',anchor:'nishita',double:'greater',missing:'sunrise',majority:true,url:'https://panchangtime.com/methodology/shivaratri'}),
 'panchangtime-maha':Object.freeze({rule_id:'panchangtime-maha',source_id:'panchangtime-shivaratri-20261019',rule_version:'1.0.0',event:'maha_shivaratri',anchor:'nishita',double:'last',missing:'sunrise',majority:true,url:'https://panchangtime.com/methodology/shivaratri'}),
 'shastra-monthly':Object.freeze({rule_id:'shastra-monthly',source_id:'shastra-monthly-20261019',rule_version:'1.0.0',event:'masik_shivaratri',anchor:'nishita',double:'last',missing:'unresolved',url:'https://shastrapanchangam.com/en/masik-shivaratri/'})
});
// No classical review or independent physical uncertainty budget has been approved.
// Input JSON flags, source agreement and successful software tests cannot add approvals.
const approvedDecisionReviews=Object.freeze({});
const librarySource=Object.freeze({"source_id": "pillai-panchang-horoscope-1985", "title": "Panchang and Horoscope — L. D. Swamikannu Pillai", "file_sha256": "6a28ea7e8f3210a3066d1d934fc5a2c73ce907d97563f619e1bba1b10d1432b4", "review_status": "PASSAGE_CHECKED", "source_type": "historical_handbook", "does_not_verify": "modern tie-break, astronomical convention, physical uncertainty or final date"});
function civil(ms,zone){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);}
function valid(x){
 if(!x||!x.place||!Number.isFinite(x.place.lat)||Math.abs(x.place.lat)>90||!Number.isFinite(x.place.lon)||Math.abs(x.place.lon)>180)throw Error('INVALID_PLACE');
 if(typeof x.place.zone!=='string'||!x.place.zone.trim())throw Error('MISSING_TIME_ZONE');
 civil(0,x.place.zone);
 if(!Number.isFinite(x.start)||!Number.isFinite(x.end)||x.end<=x.start||!Array.isArray(x.days)||!x.days.length)throw Error('INVALID_INTERVAL');
 const expected=x.event==='sankashti'?19:29;if(x.tithi!==expected)throw Error('WRONG_TITHI');
 if(!x.astronomy?.engine||!x.astronomy?.convention)throw Error('MISSING_PROVENANCE');
 const seen=new Set();
 for(const d of x.days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||seen.has(d.date))throw Error('DUPLICATE_OR_INVALID_DAY');seen.add(d.date);
  const civilDate=new Date(d.date+'T12:00:00Z');if(!Number.isFinite(+civilDate)||civilDate.toISOString().slice(0,10)!==d.date)throw Error('INVALID_CIVIL_DATE');
  for(const k of ['sunrise','moonrise'])if(d[k]!==null&&(!Number.isFinite(d[k])||civil(d[k],x.place.zone)!==d.date))throw Error('ANCHOR_DATE_MISMATCH');
  if(d.nishita!==null&&(!Array.isArray(d.nishita)||d.nishita.length!==2||!d.nishita.every(Number.isFinite)||d.nishita[1]<=d.nishita[0]))throw Error('INVALID_NISHITA');
 }
}
function decide(input,rule_id,rule_version='1.0.0'){
 const r=rules[rule_id];if(!r||r.rule_version!==rule_version)throw Error('UNKNOWN_RULE_VERSION');
 const x=JSON.parse(JSON.stringify(input));valid(x);if(x.event!==r.event)throw Error('RULE_EVENT_MISMATCH');
 const days=x.days.sort((a,b)=>a.date.localeCompare(b.date)),inside=t=>t!==null&&x.start<=t&&t<x.end;
 const overlap=(a,b)=>Math.max(0,Math.min(x.end,b)-Math.max(x.start,a));
 const trace=days.map(d=>{const span=d.nishita;const cover=span?overlap(...span):null;return {...d,qualifies:r.anchor==='moonrise'?inside(d.moonrise):!!span&&(r.majority?cover>(span[1]-span[0])/2:cover>0),coverage_ms:r.anchor==='moonrise'?(d.moonrise===null?null:overlap(d.moonrise,d.moonrise+(r.ghatika_ms||1440000))):cover,anchor_minus_start_ms:r.anchor==='moonrise'?(d.moonrise===null?null:d.moonrise-x.start):(span?span[1]-x.start:null)};});
 let hits=trace.filter(d=>d.qualifies),selected=null,reason='single_anchor',fallback=false;
 // Missing anchors are not kshaya: a polar/missing event cannot silently trigger a date.
 const incomplete=trace.some(d=>d[r.anchor]===null);
 if(incomplete){reason='missing_anchor';}
 else if(hits.length===1)selected=hits[0].date;
 else if(hits.length>1){reason='vriddhi_'+r.double;
  if(r.double==='first')selected=hits[0].date;
  if(r.double==='last')selected=hits.at(-1).date;
  if(r.double==='greater'||r.double==='ghatika'){
   const best=Math.max(...hits.map(d=>d.coverage_ms)),winners=hits.filter(d=>d.coverage_ms===best);
   if(winners.length===1||r.double==='greater')selected=winners[0].date;else reason='ghatika_tie_not_specified';
  }
 }else{
  fallback=true;reason='kshaya_'+r.missing;
  if(r.missing==='sunrise'){const ss=days.filter(d=>inside(d.sunrise));if(ss.length===1)selected=ss[0].date;else reason='sunrise_fallback_ambiguous';}
  if(r.missing==='prior_moonrise'){
   const before=days.filter(d=>d.moonrise!==null&&d.moonrise<x.start).at(-1),after=days.find(d=>d.moonrise!==null&&d.moonrise>=x.end);
   if(before&&after)selected=before.date;else reason='kshaya_not_bracketed';
  }
 }
 const identity=JSON.stringify([x.place,x.event,x.start,x.end,rule_id,rule_version,x.astronomy,trace]);
 const reviewed=!!approvedDecisionReviews[identity];
 return {engine_version:VERSION,rule_id,source_id:r.source_id,rule_version,source_url:r.url,event:x.event,place:x.place,tithi_interval:{start:x.start,end:x.end},astronomy:x.astronomy,days:trace,selected_date:selected,reason,fallback_used:fallback,status:reviewed&&selected?'VERIFIED':'INSUFFICIENT_EVIDENCE',verification_scope:reviewed?'reviewed_exact_decision':'modern_method_candidate_with_scoped_book_support',rule_evidence:[{...librarySource,pdf_page:x.event==='sankashti'?27:19,printed_page:x.event==='sankashti'?20:12,support_scope:x.event==='sankashti'?'waning_chaturthi_and_moonrise_anchor_only':'monthly_waning_chaturdashi_identity_only'}],classical_source_status:'NOT VERIFIED',physical_uncertainty_ms:null,publish_as_verified:reviewed&&!!selected,affects_score:false};
}
function compare(input,rule_ids,scenarios=[]){
 if(!Array.isArray(rule_ids)||!rule_ids.length||new Set(rule_ids).size!==rule_ids.length)throw Error('INVALID_RULE_SET');
 const decisions=rule_ids.map(id=>decide(input,id));
 const variants=scenarios.map(s=>{if(!s.id||!s.source_url||!s.rationale)throw Error('UNJUSTIFIED_SCENARIO');
  if(JSON.stringify(s.input.place)!==JSON.stringify(input.place)||s.input.start!==input.start||s.input.end!==input.end||s.input.event!==input.event)throw Error('SCENARIO_CHANGED_TARGET');
  return {id:s.id,source_url:s.source_url,rationale:s.rationale,decisions:rule_ids.map(id=>decide(s.input,id))};});
 const dates=new Set(decisions.map(d=>d.selected_date).filter(Boolean));
 const flags=[];if(dates.size>1)flags.push('CONFLICTING_RULES');
 if(variants.some(v=>v.decisions.some((d,i)=>d.selected_date!==decisions[i].selected_date)))flags.push('BOUNDARY_SENSITIVE');
 if(decisions.some(d=>d.status!=='VERIFIED')||variants.some(v=>v.decisions.some(d=>d.status!=='VERIFIED')))flags.push('INSUFFICIENT_EVIDENCE');
 return {engine_version:VERSION,status:flags[0]||'VERIFIED',flags,decisions,scenarios:variants,uncertainty_note:'Boundary distances are not error estimates; physical error budget is not independently established.',affects_score:false};
}
const api=Object.freeze({version:VERSION,rules,decide,compare,civil});root.SRFestivalDecision=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
