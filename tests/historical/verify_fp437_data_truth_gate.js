const fs=require('fs'),vm=require('vm'),path=require('path'),root=__dirname;
const h=fs.readFileSync(path.join(root,'index.html'),'utf8'),s=fs.readFileSync(path.join(root,'sw.js'),'utf8'),m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let n=0;function has(v,l){if(!h.includes(v))throw Error('FAIL '+l);n++}
has('v88.9.242-fp437-DATA-TRUTH-GATE','version');
has('DATA TRUTH GATE','visible gate');
has('Офіційний Kp NOAA має горизонт 3 дні','NOAA horizon disclosure');
has('UNVERIFIED Kp','synthetic disclosure');
has("fetch('future_kp.json',{cache:'no-store'})",'Kp provenance fetch');
has("fetch('SYSTEM_HEALTH_STATUS_v1.json',{cache:'no-store'})",'health fetch');
has("fetch('PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json',{cache:'no-store'})",'independent Panchanga check');
has("const gate=(health.status==='PASS'&&synthetic===0&&missing===0&&fresh&&panch.status==='PASS')?'PASS':'WARN'",'strict gate');
if(m.version!=='88.9.242-fp437')throw Error('FAIL manifest');n++;
if(!s.includes("const CACHE_VERSION = 'fp437-v1'"))throw Error('FAIL service worker version');n++;
for(const f of ['./future_kp.json','./SYSTEM_HEALTH_STATUS_v1.json','./PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json']){if(!s.includes(`'${f}'`))throw Error('FAIL offline '+f);n++}
const scripts=[...h.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(q=>!(/\bsrc\s*=/.test(q[1]))&&!/type\s*=\s*["']application\/(?:ld\+json|json)["']/.test(q[1]));
scripts.forEach((q,i)=>new vm.Script(q[2],{filename:'inline-'+i}));n+=scripts.length;
console.log(`PASS fp437 data truth gate: ${n}/${n}`);
