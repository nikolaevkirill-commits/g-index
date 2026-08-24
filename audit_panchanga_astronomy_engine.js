const fs=require('fs'),path=require('path'),root=__dirname;
const A=require('./astronomy-engine-2.1.19.min.js');
const feed=JSON.parse(fs.readFileSync(path.join(root,'panchanga_shadow_feed_v1.json'),'utf8'));
const mod=x=>(x%360+360)%360;
const ayan=d=>23.85650+(50.27889624/3600)*((d.getTime()/86400000+2440587.5)-2451545.0)/365.25;
const karana=k=>k===0?'Kimstughna':k<=56?['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'][(k-1)%7]:['Shakuni','Chatushpada','Naga'][k-57];
function independent(d){
  const sun=A.SunPosition(d).elon,moon=A.EclipticGeoMoon(d).lon,a=ayan(d),phase=mod(moon-sun),moonSid=mod(moon-a),sunSid=mod(sun-a),k=Math.min(59,Math.floor(phase/6));
  return {tithi:Math.min(30,Math.floor(phase/12)+1),nakshatra:Math.min(27,Math.floor(moonSid/(360/27))+1),yoga:Math.min(27,Math.floor(mod(sunSid+moonSid)/(360/27))+1),karana:karana(k)};
}
let tested=0,mismatches=[];
for(const [date,day] of Object.entries(feed.days))for(const [component,c] of Object.entries(day.components))for(const seg of c.segments){
  const a=Date.parse(seg.start_utc),b=Date.parse(seg.end_utc),span=b-a;if(span<120000)continue;
  const d=new Date(a+span/2),got=independent(d)[component],expected=seg.value;
  tested++;if(String(got)!==String(expected))mismatches.push({date,component,at_utc:d.toISOString(),expected,got,segment_minutes:span/60000,boundary_sensitive:span<=300000});
}
const material=mismatches.filter(x=>!x.boundary_sensitive);
const report={schema:'panchanga_astronomy_engine_crosscheck_v1',generated_at:new Date().toISOString(),feed_method:feed.method_version,independent_ephemeris:'astronomy-engine-2.1.19',shared_convention:'Lahiri linear ayanamsha declared by canonical contract',scope:'all segment midpoints in feed; classification parity, not real-world predictive validation',tested,mismatches:mismatches.length,boundary_sensitive_mismatches:mismatches.length-material.length,material_mismatches:material.length,status:material.length?'FAIL':mismatches.length?'WARN':'PASS',examples:mismatches.slice(0,50)};
fs.writeFileSync(path.join(root,'PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(material.length)process.exitCode=1;
