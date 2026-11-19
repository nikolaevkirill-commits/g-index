'use strict';
// R2 negative control: verify_sky_scene.cjs must FAIL on a slider that ignores the pointer
// and on a slider whose input handler never reaches the scene.
const {spawnSync}=require('child_process'),path=require('path');
const test=path.join(__dirname,'verify_sky_scene.cjs');
const cases=[['inert',/real drag selects the final part of the range/],['handler',/drag must select the day under the thumb/]];
let bad=0;
for(const [m,expect] of cases){
  const r=spawnSync(process.execPath,[test],{env:{...process.env,SKY_MUTATION:m},encoding:'utf8',timeout:600000});
  const out=(r.stdout||'')+(r.stderr||'');
  const ok=r.status!==0&&expect.test(out);
  console.log(JSON.stringify({mutation:m,exit:r.status,detected:ok}));
  if(!ok)bad++;
}
if(bad){console.error('FAIL sky negative control: '+bad+' mutation(s) not detected');process.exit(1);}
console.log('PASS sky negative control: both mutations detected');
