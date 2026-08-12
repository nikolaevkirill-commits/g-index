'use strict';
const fs=require('fs');
const source=fs.readFileSync('index.html','utf8');
const checks=[
  ['Jyotish passport is visible',/id="jyotishPassport"/],
  ['Panchanga is one aggregated component',/Tithi · Vara · Nakshatra · Yoga · Karana → один Pᵢ/],
  ['Local windows do not condemn the full day',/обмежують слот, не весь день/],
  ['Informational Jyotish fields are score-neutral',/Rashi · Pada · Muhurta · Choghadiya · score_effect=0/],
  ['Layer can be hidden accessibly',/id="btnJyotishVisibility"[^>]+aria-pressed="true"/],
  ['Visibility preference persists',/gindex_jyotish_visible_v1/],
  ['Sunrise timezone DST boundary is disclosed',/астрономічного сходу сонця з урахуванням timezone\/DST/],
  ['Personal D1 D9 Dasha remain gated',/D1\/D9 і Dasha не активовані/],
  ['English Jyotish label exists',/Jyotish · Vedic daily timing/],
  ['Mobile Jyotish route reveals its parent grid',/panch:\s*\[[^\]]*'mainGrid'[^\]]*'panchCard'/],
  ['Mobile navigation uses the Jyotish product name',/id="mnavPanch"[^>]+aria-label="Джйотіш"/],
];
let failed=0;
for(const [label,pattern] of checks){const ok=pattern.test(source);console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
