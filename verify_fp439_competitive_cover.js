const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
let checks = 0;
function has(value, label){ if(!html.includes(value)) throw new Error('Missing '+label); checks++; }
has('v88.9.244-fp439-COMPETITIVE-COVER', 'document version');
has('id="nrCover"', 'competitive cover');
has('id="nrCoverScore"', 'honest score shell');
has('id="nrCoverKp"', 'visible Kp layer');
has('id="nrCoverShift"', 'nearest shift');
has('Доречно сьогодні', 'recommended action');
has('Краще відкласти', 'avoid action');
has('id="nrCover3"', '3 day cover horizon');
has('id="nrCover7"', '7 day cover horizon');
has('id="nrCover27"', '27 day cover horizon');
has('Math.round((Math.max(-3,Math.min(3,scoreBase))+3)/6*100)', 'deterministic G to 100 mapping');
has('class="nr-today-details"', 'technical day details disclosure');
has("fp434Go('expert',true)", 'separate legacy dashboard');
console.log(`PASS fp439 competitive cover: ${checks} checks`);
