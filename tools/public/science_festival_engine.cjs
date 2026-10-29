const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),E=require('../../festival_decision_engine_v1.js');
const T=s=>Date.parse(s+'Z'),clone=x=>JSON.parse(JSON.stringify(x));let tests=0;
function test(name,fn){fn();tests++;console.log('PASS '+name);}
const x={event:'sankashti',tithi:19,place:{lat:0,lon:0,zone:'UTC'},start:T('2028-01-01T19:00'),end:T('2028-01-02T19:00'),astronomy:{engine:'synthetic-test-only',convention:'explicit UTC anchors'},days:[1,2].map(d=>({date:'2028-01-0'+d,sunrise:T('2028-01-0'+d+'T06:00'),moonrise:T('2028-01-0'+d+'T20:00'),nishita:[T('2028-01-0'+d+'T23:30'),T('2028-01-0'+(d+1)+'T00:30')]}))};
const pt=z=>E.decide(z,'panchangtime-sankashti'),nv=z=>E.decide(z,'nava-sankashti');
test('normal moonrise',()=>assert.equal(pt(x).selected_date,'2028-01-01'));
test('exact start included',()=>{const y=clone(x);y.start=y.days[0].moonrise;assert.equal(pt(y).selected_date,'2028-01-01');});
test('exact end excluded',()=>{const y=clone(x);y.end=y.days[0].moonrise;assert.equal(pt(y).selected_date,null);});
test('kshaya profiles disagree explicitly',()=>{const y=clone(x);y.start=T('2028-01-01T21:00');assert.equal(pt(y).selected_date,'2028-01-02');assert.equal(nv(y).selected_date,'2028-01-01');assert.ok(E.compare(y,['panchangtime-sankashti','nava-sankashti']).flags.includes('CONFLICTING_RULES'));});
test('vriddhi earliest vs greater first ghatika',()=>{const y=clone(x);y.end=T('2028-01-02T20:10');assert.equal(pt(y).selected_date,'2028-01-01');assert.equal(nv(y).selected_date,'2028-01-01');});
test('equal ghatikas unresolved',()=>{const y=clone(x);y.end=T('2028-01-02T21:00');assert.equal(nv(y).selected_date,null);assert.equal(nv(y).reason,'ghatika_tie_not_specified');});
test('polar missing anchor is not kshaya',()=>{const y=clone(x);y.days[0].moonrise=null;assert.equal(pt(y).selected_date,null);assert.equal(pt(y).fallback_used,false);});
test('unknown rule/version rejects',()=>{assert.throws(()=>E.decide(x,'invented'));assert.throws(()=>E.decide(x,'panchangtime-sankashti','2'));});
test('source flags cannot confer trust',()=>{const y={...x,verified:true,status:'VERIFIED',classical_source_status:'VERIFIED'};assert.equal(pt(y).status,'INSUFFICIENT_EVIDENCE');assert.equal(pt(y).publish_as_verified,false);});
test('input immutable and shuffled days deterministic',()=>{const before=JSON.stringify(x),y=clone(x);y.days.reverse();assert.deepEqual(pt(y),pt(x));assert.equal(JSON.stringify(x),before);});
test('wrong location day rejected',()=>{const y=clone(x);y.place.zone='Pacific/Auckland';assert.throws(()=>pt(y),/ANCHOR_DATE/);});
test('invalid dates and duplicates rejected',()=>{const y=clone(x);y.days.push(y.days[0]);assert.throws(()=>pt(y));assert.throws(()=>pt({...x,tithi:4}));assert.throws(()=>pt({...x,start:Infinity}));});
test('DST spring and autumn use instants not 24h arithmetic',()=>{
 for(const [day1,day2,offset1,offset2] of [['2028-03-11','2028-03-12','-05:00','-04:00'],['2028-11-04','2028-11-05','-04:00','-05:00']]){
  const days=[[day1,offset1],[day2,offset2]].map(([date,off])=>({date,sunrise:Date.parse(date+'T06:00:00'+off),moonrise:Date.parse(date+'T20:00:00'+off),nishita:null}));
  const y={...clone(x),place:{lat:40.71,lon:-74,zone:'America/New_York'},days,start:days[0].moonrise+1,end:days[1].moonrise-1};assert.equal(pt(y).selected_date,day2);assert.equal(nv(y).selected_date,day1);
 }
});
test('monthly and Maha profiles not conflated',()=>{const y={...clone(x),event:'masik_shivaratri',tithi:29,start:T('2028-01-01T23:00'),end:T('2028-01-03T00:20')};assert.equal(E.decide(y,'panchangtime-monthly').selected_date,'2028-01-01');assert.equal(E.decide(y,'shastra-monthly').selected_date,'2028-01-02');assert.throws(()=>E.decide(y,'panchangtime-maha'));assert.equal(E.decide({...y,event:'maha_shivaratri'},'panchangtime-maha').selected_date,'2028-01-02');});
test('Nishita end touches start without overlap',()=>{const y={...clone(x),event:'masik_shivaratri',tithi:29,start:x.days[0].nishita[1],end:T('2028-01-02T19:00')};assert.equal(E.decide(y,'shastra-monthly').selected_date,null);});
test('unjustified or changed-target scenario rejected',()=>{assert.throws(()=>E.compare(x,['panchangtime-sankashti'],[{id:'fake',input:x}]));assert.throws(()=>E.compare(x,['panchangtime-sankashti'],[{id:'fake',source_url:'https://example.org',rationale:'test',input:{...x,start:x.start+1}}]));});
test('no arbitrary boundary buffer',()=>{const y=clone(x);y.start=y.days[0].moonrise-1;assert.equal(pt(y).selected_date,'2028-01-01');assert.ok(!E.compare(y,['panchangtime-sankashti']).flags.includes('BOUNDARY_SENSITIVE'));});

test('missing zone cannot inherit machine timezone',()=>{for(const zone of [undefined,'',null]){const y=clone(x);y.place.zone=zone;assert.throws(()=>pt(y),/MISSING_TIME_ZONE/);}});
test('impossible civil date rejected with unavailable anchors',()=>{const y=clone(x);y.days=[{date:'2028-02-30',sunrise:null,moonrise:null,nishita:null}];assert.throws(()=>pt(y),/INVALID_CIVIL_DATE/);});


test('unknown event is distinct from rule mismatch',()=>{assert.throws(()=>E.decide({...clone(x),event:'not_an_event'},'panchangtime-sankashti'),/UNKNOWN_EVENT/);assert.throws(()=>E.decide({...clone(x),event:'masik_shivaratri',tithi:29},'panchangtime-sankashti'),/RULE_EVENT_MISMATCH/);});
test('characterizes earlier tie break for partial equal Nishita coverage; source unverified',()=>{const y={...clone(x),event:'masik_shivaratri',tithi:29,start:T('2028-01-01T23:15'),end:T('2028-01-02T23:45'),days:[1,2].map(d=>({date:'2028-01-0'+d,sunrise:null,moonrise:null,nishita:[T('2028-01-0'+d+'T23:00'),T('2028-01-0'+(d+1)+'T00:00')]}))};const r=E.decide(y,'panchangtime-monthly');assert.equal(r.selected_date,'2028-01-01');assert.equal(r.reason,'vriddhi_greater');assert.equal(r.days[0].coverage_ms,45*60000);assert.equal(r.days[1].coverage_ms,45*60000);assert.equal(r.source_status,'PASSAGE_CHECKED');assert.equal(r.method_status,'UNVERIFIED');assert.equal(r.decision_status,'INSUFFICIENT_EVIDENCE');});
test('Nishita single anchor does not require sunrise',()=>{const y={...clone(x),event:'masik_shivaratri',tithi:29,start:T('2028-01-01T23:00'),end:T('2028-01-02T01:00')};y.days.forEach(d=>d.sunrise=null);const r=E.decide(y,'panchangtime-monthly');assert.equal(r.reason,'single_anchor');assert.equal(r.selected_date,'2028-01-01');});
test('Maha profile is explicitly research only',()=>{assert.equal(E.rules['panchangtime-maha'].research_only,true);});

test('Maha cannot publish even with synthetic approval in isolated test VM',()=>{const vm=require('node:vm');const src=fs.readFileSync(path.join(__dirname,'../../festival_decision_engine_v1.js'),'utf8');const needle='const approvedDecisionReviews=Object.freeze({});';assert.ok(src.includes(needle));const ctx={NRCivilTime:require('../../civil_time_v1.js')};vm.runInNewContext(src.replace(needle,'const approvedDecisionReviews=new Proxy({}, {get:()=>true});'),ctx);const y={...clone(x),event:'maha_shivaratri',tithi:29};const r=ctx.SRFestivalDecision.decide(y,'panchangtime-maha');assert.ok(r.selected_date);assert.equal(r.decision_status,'RESEARCH_ONLY');assert.notEqual(r.status,'VERIFIED');assert.equal(r.publish_as_verified,false);});

const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'UNIT.json'),JSON.stringify({status:'PASS',tests,scope:'software correctness, not traditional or forecast validity'},null,2));
