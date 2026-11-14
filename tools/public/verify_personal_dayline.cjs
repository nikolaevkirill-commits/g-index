'use strict';
const assert=require('node:assert/strict'),M=require('../../personal_dayline_model.js');
let cases=0;function check(fn){fn();cases++;}
const place={lat:50.454,lon:30.524,zone:'Europe/Kyiv'};
const birth={date:'1990-06-15',time:'14:20',zone:'Europe/Kyiv',mode:'known'};
const sample=M.birthEvidence(birth);assert.equal(sample.status,'available');assert.deepEqual(sample.candidates,[24]);
for(let n=0;n<27;n++)for(let c=0;c<27;c++)for(let p=1;p<=4;p++)check(()=>{
 const r=M.tara(n,c,p),pos=1+(c-n+27)%27;assert.equal(r.position,pos);assert.equal(r.group,(pos-1)%9+1);assert.equal(r.cycle,Math.ceil(pos/9));
 const bad={3:1,5:4,7:3}[r.group];
 const expected=bad?(r.cycle===1?'caution':r.cycle===3?'released':bad===p?'caution':'released'):r.group===1?'context':'support';assert.equal(r.interpretation,expected);
});
check(()=>assert.equal(M.tara(0,11,null).interpretation,'unknown'));
check(()=>assert.throws(()=>M.tara(27,0,1)));
check(()=>assert.throws(()=>M.civilDay('2026-02-30','Europe/Kyiv')));
check(()=>assert.throws(()=>M.civilDay('2011-12-30','Pacific/Apia')));
check(()=>assert.equal(M.wallInstants('2026-11-01','01:30','America/New_York').length,2));
check(()=>assert.equal(M.wallInstants('2026-03-08','02:30','America/New_York').length,0));
check(()=>assert.deepEqual(M.wallInstants('1992-07-23','09:40','Asia/Kathmandu'),[Date.parse('1992-07-23T03:55:00Z')]));
check(()=>assert.equal(M.birthEvidence({...birth,zone:''}).status,'incomplete'));
check(()=>assert.equal(M.birthEvidence({}).status,'missing'));
check(()=>assert.equal(M.birthEvidence({...birth,time:'',mode:'known'}).status,'incomplete'));
check(()=>assert.equal(M.birthEvidence({date:'2026-03-08',time:'02:30',zone:'America/New_York'}).status,'incomplete'));
check(()=>assert.equal(M.birthEvidence({date:'2026-11-01',time:'01:30',zone:'America/New_York'}).instantAmbiguous,true));
check(()=>assert.equal(M.birthEvidence({...birth,mode:'range',from:'22:00',to:'01:00'}).status,'incomplete'));
check(()=>assert.equal(M.birthEvidence({...birth,mode:'range',from:'14:20',to:'14:40'}).status,'available'));
check(()=>assert.ok(M.birthEvidence({...birth,mode:'unknown'}).candidates.length>=1));
check(()=>assert.equal(M.evaluate({candidates:[0,1]}, {nak:0,pada:1}).status,'ambiguous'));
check(()=>assert.equal(M.evaluate({candidates:[0,2]}, {nak:5,pada:1}).common,true));
let windows=0,segments=0;
for(const [date,loc,minutes] of [
 ['2026-03-29',place,1380],['2026-10-25',place,1500],['2026-11-12',place,1440],
 ['2026-03-08',{lat:40.71,lon:-74.0,zone:'America/New_York'},1380],
 ['2026-11-12',{lat:27.717,lon:85.324,zone:'Asia/Kathmandu'},1440],
 ['2026-11-12',{lat:-36.85,lon:174.76,zone:'Pacific/Auckland'},1440],
 ['2026-06-21',{lat:69.65,lon:18.96,zone:'Europe/Oslo'},1440],
 ['2026-12-21',{lat:69.65,lon:18.96,zone:'Europe/Oslo'},1440],
 ['2026-11-15',{lat:69.65,lon:18.96,zone:'Europe/Oslo'},1440]
]){
 const m=M.build({date,place:loc,birth});
 check(()=>assert.equal(m.day.durationMinutes,minutes));
 check(()=>assert.equal(m.windows.length,Math.ceil(minutes/180)));
 let cursor=m.day.start;
 for(const w of m.windows){assert.equal(w.start,cursor);assert.ok(w.end>w.start);assert.ok(w.end-w.start<=10800000);windows++;
  for(const s of w.segments){assert.equal(s.start,cursor);assert.ok(s.end>s.start);assert.deepEqual(s.tara,M.evaluate(m.birth,s.moon));if(s.hora)assert.ok(s.hora.start<=s.start&&s.hora.end>=s.end);cursor=s.end;segments++;}
  assert.equal(cursor,w.end);
 }check(()=>assert.equal(cursor,m.day.end));
 for(const event of m.series.events){const before=M.moon(event.at-1),after=M.moon(event.at);check(()=>assert.ok(before.nak!==after.nak||before.pada!==after.pada));}
 if(date.endsWith('06-21')||date.endsWith('12-21'))check(()=>{assert.equal(m.hours.length,0);assert.ok(m.windows[0].segments[0].tara.variants.length);});
 else check(()=>{assert.ok(m.hours[0].start<=m.day.start);assert.ok(m.hours.at(-1).end>=m.day.end);for(let i=1;i<m.hours.length;i++)assert.ok(Math.abs(m.hours[i-1].end-m.hours[i].start)<0.001,'hour coverage');});
 if(date==='2026-11-15')check(()=>assert.ok(m.windows.some(w=>m.hours.filter(h=>h.start<w.end&&h.end>w.start).length>4)));
}
const auckland={lat:-36.85,lon:174.76,zone:'Pacific/Auckland'},instant=Date.parse('2026-11-11T20:00:00Z');
const previousZone=process.env.TZ;
process.env.TZ='Europe/Kyiv';const one=M.horas(instant,instant+10800000,auckland);
process.env.TZ='Pacific/Auckland';const two=M.horas(instant,instant+10800000,auckland);
if(previousZone===undefined)delete process.env.TZ;else process.env.TZ=previousZone;
check(()=>assert.deepEqual(one,two));
check(()=>assert.equal(one.find(h=>h.start<=instant&&h.end>instant).planet,'Сонце'));
const pre=M.horas(Date.parse('2026-11-12T02:00Z'),Date.parse('2026-11-12T03:00Z'),place)[0];
check(()=>assert.equal(pre.localSunriseDate,'2026-11-11'));
console.log(JSON.stringify({status:'PASS',cases,windows,segments,scope:'Prototype calculations and edge cases, not predictive validation'}));
