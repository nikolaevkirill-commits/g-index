'use strict';
// ARCH-1 drift guard (audit FP549). index.html, design-v4.html and design-b17.html load forked copies of
// product_shell_v1.js and consumer_overview_v1.js. Every function that exists in both the root copy and a
// fork must be identical (whitespace-normalised). Known, reviewed differences are pinned below by the hash
// of BOTH bodies: a change on either side fails the guard until the pair is reviewed and re-pinned
// (node tools/public/verify_fork_drift.cjs --print). This stops a fix from silently reaching only index.html.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const FILES=['product_shell_v1.js','consumer_overview_v1.js'],FORKS=['preview-v4','preview-b17'];
const PINNED=require('./fork_drift_pins.json');
function fns(src){src=src.replace(/\r/g,'');const out={};const re=/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;let m;
 while((m=re.exec(src))){let d=0,j=src.indexOf('{',m.index);for(;j<src.length;j++){const c=src[j];if(c==='{')d++;else if(c==='}'&&!--d)break}
  const body=src.slice(m.index,j+1).replace(/\s+/g,' ').trim();if(out[m[1]]!==undefined&&out[m[1]]!==body)out[m[1]]+='\u0000'+body;else out[m[1]]=body}return out}
const h=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const now={},bad=[];let same=0;
for(const f of FILES){const a=fns(fs.readFileSync(path.join(root,f),'utf8'));
 for(const fork of FORKS){const b=fns(fs.readFileSync(path.join(root,fork,f),'utf8'));
  for(const k of Object.keys(a)){if(!(k in b))continue;if(a[k]===b[k]){same++;continue}
   const id=fork+'/'+f+'#'+k,pair=h(a[k])+':'+h(b[k]);now[id]=pair;
   if(!PINNED[id])bad.push('UNPINNED drift '+id);else if(PINNED[id].pair!==pair)bad.push('CHANGED pinned drift '+id+' (review both copies, then re-pin)');}}}
for(const id of Object.keys(PINNED))if(!now[id])bad.push('STALE pin (now identical or removed) '+id);
if(process.argv.includes('--print')){console.log(JSON.stringify(Object.fromEntries(Object.entries(now).map(([k,v])=>[k,{pair:v,reason:PINNED[k]?.reason||'TODO'}])),null,1));process.exit(0)}
if(bad.length){console.error(bad.join('\n'));console.error('FAIL fork drift guard');process.exit(1)}
console.log('PASS fork drift guard: '+same+' shared functions identical; '+Object.keys(now).length+' reviewed differences pinned');
