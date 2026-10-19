const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const api=require('../../festival_decision_engine_v1.js');
const receipt=require('./fixtures/festival_library_receipt.json');
const vm=require('vm'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../festival_evidence_v1.js'),'utf8'),ctx);
let count=0;
for(const c of ctx.window.SRFestivalEvidence.cases){
 const before=JSON.stringify(c.input),r=api.compare(c.input,c.rule_ids,c.scenarios);
 for(const d of r.decisions){
  const e=d.rule_evidence[0];assert.equal(e.file_sha256,receipt.sha256);
  assert.equal(e.source_id,receipt.source_id);assert.equal(e.review_status,'PASSAGE_CHECKED');
  assert.equal(e.pdf_page,d.event==='sankashti'?27:19);
  assert.equal(e.printed_page,d.event==='sankashti'?20:12);
  assert.equal(d.publish_as_verified,false);assert.equal(d.status,'INSUFFICIENT_EVIDENCE');
  assert.equal(d.physical_uncertainty_ms,null);
  assert.match(e.does_not_verify,/final date/);count++;
 }
 // Caller-supplied bibliographic flags cannot approve a date.
 const forged=JSON.parse(before);forged.verified=true;forged.rule_evidence=[{review_status:'VERIFIED'}];
 assert.equal(api.decide(forged,c.rule_ids[0]).publish_as_verified,false);
 assert.equal(JSON.stringify(c.input),before);
}
console.log(JSON.stringify({status:'PASS',decisions:count,scope:'book passage provenance, no promotion to verified date, input immutability'}));
