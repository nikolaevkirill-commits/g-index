const _MOON_LR = [
  [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
  [0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
  [2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
  [2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
  [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
  [0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
  [4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
  [1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
  [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
  [0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
  [1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
  [0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
  [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
  [3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
  [0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
  [2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
  [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
  [0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
  [4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
  [1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];

// --- Таблиця 47.B: [D, M, M', F, coeff_b] ---
const _MOON_B = [
  [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
  [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
  [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
  [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
  [2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
  [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
  [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
  [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
  [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
  [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
  [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
  [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
  [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
  [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
  [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];

const _RAD = Math.PI / 180;
function _sin(d){ return Math.sin(d * _RAD); }
function _cos(d){ return Math.cos(d * _RAD); }
function _mod360(x){ return ((x % 360) + 360) % 360; }

// ── calcSunLongitude(jde): Meeus Ch.25, точність ~0.01° ──────────────────────
function calcSunLongitude(jde) {
  const T  = (jde - 2451545.0) / 36525.0;
  const T2 = T * T;
  // Mean longitude L0, mean anomaly M (degrees)
  const L0 = _mod360(280.46646 + 36000.76983 * T + 0.0003032 * T2);
  const M  = _mod360(357.52911 + 35999.05029 * T - 0.0001537 * T2);
  const Mrad = M * Math.PI / 180;
  // Equation of centre
  const C = (1.914602 - 0.004817*T - 0.000014*T2) * Math.sin(Mrad)
           + (0.019993 - 0.000101*T)               * Math.sin(2*Mrad)
           +  0.000289                              * Math.sin(3*Mrad);
  // Sun true longitude
  const sunLon = _mod360(L0 + C);
  // Apparent longitude (nutation + aberration, simplified)
  const omega = _mod360(125.04 - 1934.136*T);
  return _mod360(sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI/180));
}

function calcMoonLongitude(jde) {
  const T = (jde - 2451545.0) / 36525.0;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

  let Lp = _mod360(218.3164477 + 481267.88123421*T - 0.0015786*T2 + T3/538841 - T4/65194000);
  let D  = _mod360(297.8501921 + 445267.1114034*T  - 0.0018819*T2 + T3/545868 - T4/113065000);
  let M  = _mod360(357.5291092 + 35999.0502909*T   - 0.0001536*T2 + T3/24490000);
  let Mp = _mod360(134.9633964 + 477198.8675055*T  + 0.0087414*T2 + T3/69699  - T4/14712000);
  let F  = _mod360(93.2720950  + 483202.0175233*T  - 0.0036539*T2 - T3/3526000 + T4/863310000);

  const A1 = _mod360(119.75 + 131.849*T);
  const A2 = _mod360(53.09  + 479264.290*T);
  const A3 = _mod360(313.45 + 481266.484*T);
  const E  = 1 - 0.002516*T - 0.0000074*T2;
  const E2 = E * E;

  let sumL = 0, sumR = 0;
  for (const [d,m,mp,f,cl,cr] of _MOON_LR) {
    const arg = d*D + m*M + mp*Mp + f*F;
    const eF = (Math.abs(m)===1) ? E : (Math.abs(m)===2) ? E2 : 1;
    sumL += eF * cl * _sin(arg);
    sumR += eF * cr * _cos(arg);
  }
  // Additive to L
  sumL += 3958*_sin(A1) + 1962*_sin(Lp - F) + 318*_sin(A2);

  let sumB = 0;
  for (const [d,m,mp,f,cb] of _MOON_B) {
    const arg = d*D + m*M + mp*Mp + f*F;
    const eF = (Math.abs(m)===1) ? E : (Math.abs(m)===2) ? E2 : 1;
    sumB += eF * cb * _sin(arg);
  }
  sumB += -2235*_sin(Lp) + 382*_sin(A3) + 175*_sin(A1-F) + 175*_sin(A1+F)
        + 127*_sin(Lp-Mp) - 115*_sin(Lp+Mp);

  const lambda = _mod360(Lp + sumL / 1e6); // tropical longitude
  return lambda;
}

function lahiriAyanamsha(jde) {
  // v85b-F5 (КРИТ-1): Swiss Ephemeris official Lahiri at J2000.0 = 23°51'23.4" = 23.85650°
  // Rate 50.27889624"/yr per IAU 2006 precession. Was 23.853 + 50.2388475 — error ~12.6".
  // Previous note (kept for trace): BUG-2 fix v36 — corrected 23.25/2433282.5 → +5.7 arcmin vs IAU.
  return 23.85650 + (50.27889624 / 3600) * (jde - 2451545.0) / 365.25;
}


function panchangaAt(timestampMs){
  const jde=timestampMs/86400000+2440587.5;
  const moon=calcMoonLongitude(jde),sun=calcSunLongitude(jde),ayanamsha=lahiriAyanamsha(jde);
  const phase=((moon-sun)%360+360)%360;
  const moonSid=((moon-ayanamsha)%360+360)%360,sunSid=((sun-ayanamsha)%360+360)%360;
  const k=Math.min(59,Math.floor(phase/6));let karana;
  if(k===0)karana='Kimstughna';else if(k<=56)karana=['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'][(k-1)%7];else karana=['Shakuni','Chatushpada','Naga'][k-57];
  return {tithi:Math.min(30,Math.floor(phase/12)+1),nakshatra:Math.min(27,Math.floor(moonSid/(360/27))+1),yoga:Math.min(27,Math.floor(((sunSid+moonSid)%360)/(360/27))+1),karana,phase_deg:phase,sun_longitude_tropical:sun,moon_longitude_tropical:moon,lahiri_ayanamsha:ayanamsha};
}
const MeeusCore={version:'meeus_core_v1',calcSunLongitude,calcMoonLongitude,lahiriAyanamsha,panchangaAt};
if(typeof module!=='undefined'&&module.exports)module.exports=MeeusCore;
if(typeof globalThis!=='undefined')globalThis.MeeusCore=MeeusCore;
