/* NR_FN_BEGIN 024 */function _sunGeomMeanLongitude(t){ let L = 280.46646 + t*(36000.76983 + t*0.0003032); L = L % 360; if (L < 0) L += 360; return L; }/* NR_FN_END 024 */

/* NR_FN_BEGIN 025 */function _sunGeomMeanAnomaly(t){ return 357.52911 + t*(35999.05029 - 0.0001537*t); }/* NR_FN_END 025 */

/* NR_FN_BEGIN 027 */function _sunEqOfCenterSunrise(t){
  const m = _sunGeomMeanAnomaly(t) * Math.PI/180;
  return Math.sin(m)*(1.914602 - t*(0.004817+0.000014*t)) + Math.sin(2*m)*(0.019993-0.000101*t) + Math.sin(3*m)*0.000289;
}/* NR_FN_END 027 */

/* NR_FN_BEGIN 028 */function _sunApparentLongitudeSunrise(t){
  const o = _sunGeomMeanLongitude(t) + _sunEqOfCenterSunrise(t);
  const omega = 125.04 - 1934.136*t;
  return o - 0.00569 - 0.00478*Math.sin(omega*Math.PI/180);
}/* NR_FN_END 028 */

/* NR_FN_BEGIN 030 */function _sunDeclinationSunrise(t){
  const e = _obliquityCorrectionSunrise(t) * Math.PI/180;
  const lambda = _sunApparentLongitudeSunrise(t) * Math.PI/180;
  return Math.asin(Math.sin(e)*Math.sin(lambda)) * 180/Math.PI;
}/* NR_FN_END 030 */

/* NR_FN_BEGIN 033 */function sunriseUTC_Meeus(dateUTC, lat, lon){
  const jdMidnight = Math.floor(dateUTC.getTime()/86400000 + 2440587.5 - 0.5) + 0.5;
  function pass(t){
    const eqTime = _equationOfTimeMinSunrise(t);
    const solarDec = _sunDeclinationSunrise(t);
    const HAdeg = _hourAngleSunriseDeg(lat, solarDec);
    const solarNoonUTC = 720 - 4*lon - eqTime;
    return solarNoonUTC - 4*HAdeg; // СХІД = noon - HA (не +HA, це захід)
  }
  let t = _sjcSunrise(jdMidnight + 0.5);
  let sunriseMin = pass(t);
  // Другий прохід (NOAA-стандарт) — уточнення t за фактичним часом сходу
  t = _sjcSunrise(jdMidnight + sunriseMin/1440);
  sunriseMin = pass(t);
  const dayStart = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), 0,0,0));
  return new Date(dayStart.getTime() + sunriseMin*60000);
}/* NR_FN_END 033 */

/* NR_FN_BEGIN 034 */function sunRiseSetUTC_Meeus(dateUTC, lat, lon){
  const jdMidnight = Math.floor(dateUTC.getTime()/86400000 + 2440587.5 - 0.5) + 0.5;
  function pass(t){
    const eqTime = _equationOfTimeMinSunrise(t);
    const solarDec = _sunDeclinationSunrise(t);
    const HAdeg = _hourAngleSunriseDeg(lat, solarDec);
    const solarNoonUTC = 720 - 4*lon - eqTime;
    return {riseMin:solarNoonUTC - 4*HAdeg, setMin:solarNoonUTC + 4*HAdeg};
  }
  let pair=pass(_sjcSunrise(jdMidnight+0.5));
  const refinedRise=pass(_sjcSunrise(jdMidnight+pair.riseMin/1440)).riseMin;
  const refinedSet=pass(_sjcSunrise(jdMidnight+pair.setMin/1440)).setMin;
  const dayStart=new Date(Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate()));
  return {sunrise:new Date(dayStart.getTime()+refinedRise*60000),sunset:new Date(dayStart.getTime()+refinedSet*60000),source:'meeus_canonical'};
}/* NR_FN_END 034 */

/* NR_FN_BEGIN 086 */function moonAgeDays_simple(date){
  const jd = toJD(date);
  const x = (jd - NEWMOON_EPOCH_JD) % SYNODIC;
  return (x + SYNODIC) % SYNODIC;
}/* NR_FN_END 086 */

/* NR_FN_BEGIN 087 */function moonPhaseAngle(date){
  // v88.9.55-fp237 FIX-CRITICAL (аудит-раунд-23, підтверджено реальним тестом
  // формул): раніше ця функція воліла window.Astronomy.MoonPhase() (зовнішня
  // бібліотека), і ЛИШЕ якщо вона недоступна — падала на грубий
  // moonAgeDays_simple() (середній синодичний рух 29.53 дн/цикл, БЕЗ корекцій
  // еліптичності орбіти). У сесії Kyrylo бібліотека, вочевидь, не завантажилась
  // (або дала іншу похибку) — фактично використовувався fallback.
  // Перевірено числами (Node, вручну витягнуті функції з файлу): для 19.07.2026
  // sunrise (02:08 UTC) fallback дає phaseDeg=52.37° → tithi#5=Panchami — точно
  // те, що було на екрані. Точний шлях calcMoonLongitude(jde)−calcSunLongitude(jde)
  // (той самий, що вже використовується для Nakshatra і зовнішньо звірений
  // раніше) дає 61.99° → tithi#6=Shashthi — збігається з незалежним
  // ефемеридним розрахунком аудиту (62.0027°) з точністю до 0.02°.
  // Karana рахується з ТОГО САМОГО phaseDeg (karK=floor(phaseDeg/6)), тому цей
  // єдиний фікс виправляє обидва поля одночасно.
  // Прибрано залежність від window.Astronomy — тепер завжди self-contained
  // Meeus-обчислення, ідентичне до вже перевіреного шляху Nakshatra/Yoga.
  try {
    const jde = date.getTime() / 86400000 + 2440587.5;
    const moonLon = calcMoonLongitude(__nrUtcJdToTt(jde));
    const sunLon = calcSunLongitude(__nrUtcJdToTt(jde));
    const elong = ((moonLon - sunLon) % 360 + 360) % 360;
    if (isFinite(elong)) return elong;
  } catch(e){ globalThis.NRDiagnostics?.record('catch.75','recoverable');  if(window._DEBUG) console.warn('[moonPhaseAngle Meeus fallback]:', e.message); }
  // Останній fallback — лише якщо навіть Meeus-обчислення впало (не мало б статись)
  const age = moonAgeDays_simple(date);
  return (age / SYNODIC) * 360.0;
}/* NR_FN_END 087 */

/* NR_FN_BEGIN 102 */function _nasaEclipseCatalog(year){
  const m = new Map();
  if(year===2025){
    // NASA Eclipse Catalog 2025
    m.set('2025-03-13','partial_lunar'); m.set('2025-03-14','total_lunar');
    m.set('2025-03-29','partial_solar');
    m.set('2025-09-07','total_lunar'); m.set('2025-09-08','total_lunar');
    m.set('2025-09-21','partial_solar');
  } else if(year===2026){
    // NASA Eclipse Catalog 2026
    m.set('2026-02-17','annular');       // Annular Solar Eclipse
    m.set('2026-03-03','total_lunar');   // Total Lunar Eclipse
    m.set('2026-08-12','total_solar');   // Total Solar Eclipse
    m.set('2026-08-28','partial_lunar'); // Partial Lunar Eclipse
  } else if(year===2027){
    // NASA Eclipse Catalog 2027: 06 лют (кільцеподібне сонячне), 02 серп (повне сонячне), 26 груд (часткове місячне)
    m.set('2027-02-06','annular');
    m.set('2027-08-02','total_solar');
    m.set('2027-12-26','partial_lunar');
  } else if(year===2028){
    // NASA Eclipse Catalog 2028
    m.set('2028-01-26','annular');
    m.set('2028-07-22','total_solar');
    m.set('2028-08-12','partial_lunar');
    m.set('2028-12-05','partial_lunar');
  } else if(year===2029){
    // NASA Eclipse Catalog 2029
    m.set('2029-01-14','partial_solar');
    m.set('2029-06-12','annular');
    m.set('2029-07-11','partial_lunar');
    m.set('2029-12-05','annular');
  } else if(year===2030){
    // NASA Eclipse Catalog 2030
    m.set('2030-06-01','annular');
    m.set('2030-06-15','partial_lunar');
    m.set('2030-11-25','annular');
  }
  return m.size > 0 ? m : null;
}/* NR_FN_END 102 */

/* NR_FN_BEGIN 103 */async function ensureEclipsesForYear(year){
  if(eclipsesByYear.has(year)) return;

  // v87.22: NASA-каталог має пріоритет над scrape (scrape "отруював" Map значеннями 'unknown',
  // що давало -3 замість правильних -4/-2/-1 за типом. Див. HANDOFF v87.22).
  const nasa = _nasaEclipseCatalog(year);
  if(nasa){
    eclipsesByYear.set(year, nasa);
    return;
  }

  // Scrape-fallback для років поза NASA-каталогом
  let text = '';
  try{
    text = await fetchTextWithCORS(`https://www.timeanddate.com/eclipse/${year}`);
  }catch(e){ globalThis.NRDiagnostics?.record('catch.81','recoverable');  text=''; }

  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  // v85b-F5: Map<dateStr, type> instead of Set<dateStr>
  const set = new Map();

  if(text){
    const re = /([A-Z][a-z]{2})\s+(\d{1,2})(?:[–-](\d{1,2}))?/g;
    let m;
    while((m = re.exec(text))){
      const mon = m[1], d1 = parseInt(m[2],10), d2 = m[3] ? parseInt(m[3],10) : null;
      if(!(mon in months)) continue;
      if(d2){
        for(let d=d1; d<=d2; d++){
          const dt = new Date(Date.UTC(year, months[mon], d));
          set.set(fmtDate(dt), 'unknown'); // scrape не дає типу — conservative -3
        }
      }else{
        const dt = new Date(Date.UTC(year, months[mon], d1));
        set.set(fmtDate(dt), 'unknown');
      }
    }
  }

  eclipsesByYear.set(year, set);
}/* NR_FN_END 103 */

/* NR_FN_BEGIN 104 */function computeMiFromEclipses(dateUTC){
  const y = dateUTC.getUTCFullYear();
  // Include adjacent years so the +/-3-day window survives New Year.
  const set = new Map();
  for(const year of [y-1,y,y+1]){
    const catalog = eclipsesByYear.get(year);
    if(catalog instanceof Map) for(const [day,type] of catalog) set.set(day,type);
    else if(catalog) for(const day of catalog) set.set(day,'unknown');
  }

  // v85b-F5 (СЕРЕД-1): Explicit catalog-end warning
  if(!set || set.size===0){
    if(y > ECLIPSE_CATALOG_END_YEAR && !_eclipseCatalogWarned.has(y)){
      _eclipseCatalogWarned.add(y);
      console.warn(`[eclipse] Catalog ends ${ECLIPSE_CATALOG_END_YEAR}; year ${y} returns Mi=0 (no data)`);
    }
    // v87.57: clearer tooltips
    return {Mi:0, mTip: y > ECLIPSE_CATALOG_END_YEAR
      ? `0 — каталог NASA ${y} недоступний (закінчується ${ECLIPSE_CATALOG_END_YEAR})`
      : `0 — каталог затемнень за ${y} ще не завантажено`};
  }

  const ds   = fmtDate(dateUTC);
  const dpm1 = fmtDate(addDays(dateUTC,-1));
  const dp1  = fmtDate(addDays(dateUTC,+1));

  // v85b-F5 (КРИТ-4): backward-compat get for both Map and Set
  const getType = (d) => {
    if(typeof set.get === 'function') return set.get(d); // Map
    return set.has(d) ? 'unknown' : undefined;            // Legacy Set
  };
  const has = (d) => {
    if(typeof set.get === 'function') return set.has(d);
    return set.has(d);
  };

  // Exact day: weight by eclipse type
  if(has(ds)){
    const type = getType(ds) || 'unknown';
    const w = ECLIPSE_WEIGHT[type] != null ? ECLIPSE_WEIGHT[type] : ECLIPSE_WEIGHT.unknown;
    const typeLabel = {
      total_solar:'повне сонячне', total_lunar:'повне місячне',
      hybrid_solar:'гібридне сонячне',
      annular:'кільцеподібне сонячне',
      partial_solar:'часткове сонячне', partial_lunar:'часткове місячне',
      penumbral:'пенумбральне місячне',
      unknown:'день затемнення'
    }[type] || 'затемнення';
    // v87.23: warning-flag коли тип не з NASA-каталогу (scrape/fallback)
    const unverified = (type === 'unknown');
    const mTip = unverified
      ? `${w} — ${typeLabel} ⚠ тип не підтверджено`
      : `${w} — ${typeLabel}`;
    return {Mi: w, mTip, eclipseUnverified: unverified};
  }
  // ±1 day around eclipse — lighter effect, scaled from peak
  if(has(dpm1) || has(dp1)){
    const peakType = getType(dpm1) || getType(dp1) || 'unknown';
    const peakW = ECLIPSE_WEIGHT[peakType] != null ? ECLIPSE_WEIGHT[peakType] : ECLIPSE_WEIGHT.unknown;
    // v88.7.7 FIX-B: trunc замість round — Math.round(-0.75)=-1 (не 0!) у JS,
    // тоді penumbral peak −1 × 0.75 = −0.75 → round → −1 (всупереч коментарю-обіцянці).
    // Math.trunc(−0.75) = 0 → коректно clamp до 0 для слабких penumbral ±1d.
    // Total −4 × 0.75 = −3 → trunc(−3) = −3 ✓; Partial −2 × 0.75 = −1.5 → trunc = −1 ✓.
    const adj = Math.trunc(peakW * 0.75);
    const unverified = (peakType === 'unknown');
    if(adj === 0) return {Mi:0, mTip:'0 — ±1d від пенумбрального (мінімальний ефект)', eclipseUnverified: unverified};
    const mTip = unverified
      ? `${adj} — день до/після затемнення ⚠ тип не підтверджено`
      : `${adj} — день до/після затемнення`;
    return {Mi: adj, mTip, eclipseUnverified: unverified};
  }

  // Wider eclipse window: -3..+3 days (-1 fixed)
  for(let k=-3;k<=3;k++){
    if(k===0 || k===-1 || k===1) continue;
    const dd = fmtDate(addDays(dateUTC,k));
    if(has(dd)){
      return {Mi: WEIGHT_M_ECLIPSE['Період впливу затемнень'], mTip:'-1 — період впливу затемнення'};
    }
  }
  return {Mi:0, mTip:`0 — поза періодом затемнень (каталог ${y}: ${set.size} ${set.size===1?'подія':'подій'})`};
}/* NR_FN_END 104 */

/* NR_FN_BEGIN 105 */function nearestCatalogEclipse(dateUTC){
  const base = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate()));
  const events = [];
  for(let y=base.getUTCFullYear()-1; y<=base.getUTCFullYear()+4; y++){
    let cat = eclipsesByYear.get(y);
    if(!cat){
      cat = _nasaEclipseCatalog(y);
      if(cat) eclipsesByYear.set(y, cat);
    }
    if(!cat) continue;
    for(const [ds,type] of cat.entries()){
      const d = new Date(`${ds}T00:00:00Z`);
      if(isFinite(d.getTime())) events.push({date:d, ds, type});
    }
  }
  events.sort((a,b)=>a.date-b.date);
  return events.find(e=>e.date>=base) || null;
}/* NR_FN_END 105 */

/* NR_FN_BEGIN 109 */function approxTithiIndex(dateUTC){
  const angle = (moonPhaseAngle(dateUTC) + 360) % 360;
  return Math.min(30, Math.max(1, Math.floor(angle/12) + 1));
}/* NR_FN_END 109 */

/* NR_FN_BEGIN 117 */function computeDstModifier(){
  if(!window._lastDst) return {val:0, tip:'0 — Dst недоступний'};
  const dst = _finiteFormulaNumber(window._lastDst.dst);
  if(!_dstValid(dst)) return {val:0, tip:'0 — Dst недоступний'};
  if(dst <= -100) return {val:-2, tip:`-2 — Dst=${dst} нТл (значна буря)`};
  if(dst <= -50)  return {val:-1, tip:`-1 — Dst=${dst} нТл (помірна буря, engine v18.5)`};
  return {val:0, tip:`0 — Dst=${dst} нТл (норма)`};
}/* NR_FN_END 117 */

/* NR_FN_BEGIN 118 */function computeF107Modifier(flux){
  if(!isFinite(flux)) return {val:0, tip:'0 — F10.7 недоступний'};
  if(flux > 200) return {val:-1.0, tip:`-1.0 — F10.7=${flux} sfu (дуже активне Сонце)`};
  if(flux > 150) return {val:-0.5, tip:`-0.5 — F10.7=${flux} sfu (активне Сонце)`};
  return {val:0, tip:`0 — F10.7=${flux} sfu (норма)`};
}/* NR_FN_END 118 */

/* NR_FN_BEGIN 124 */function computeBzModifier(bz){
  if(bz == null || !isFinite(bz)) return {val:0, tip:'Bz: n/a'};
  if(bz > 0)   return {val:0,    tip:`Bz = ${bz.toFixed(1)} нТл (північний)`};
  if(bz > -10) return {val:-0.5, tip:`Bz = ${bz.toFixed(1)} нТл (слабкий південний)`};
  if(bz > -20) return {val:-1.0, tip:`Bz = ${bz.toFixed(1)} нТл (сильний південний)`};
  return              {val:-1.5, tip:`Bz = ${bz.toFixed(1)} нТл (дуже сильний південний)`};
}/* NR_FN_END 124 */

/* NR_FN_BEGIN 125 */function computeVswModifier(vsw){
  if(vsw == null || !isFinite(vsw)) return {val:0, tip:'Vsw: n/a'};
  if(vsw < 400) return {val:0,    tip:`Vsw = ${vsw.toFixed(0)} км/с (повільний)`};
  if(vsw < 600) return {val:-0.5, tip:`Vsw = ${vsw.toFixed(0)} км/с (помірно швидкий)`};
  if(vsw < 800) return {val:-1.0, tip:`Vsw = ${vsw.toFixed(0)} км/с (швидкий)`};
  return              {val:-1.5, tip:`Vsw = ${vsw.toFixed(0)} км/с (дуже швидкий)`};
}/* NR_FN_END 125 */

/* NR_FN_BEGIN 127 */function computeConfidenceBand(kpNow, kpObsJson){
  let kpDelta = 0.5;
  try {
    if(kpObsJson) {
      const rows = JSON.parse(kpObsJson);
      if(Array.isArray(rows) && rows.length > 2){
        const data = rows.slice(1).filter(r=>r[1]!=null&&r[1]!=='').slice(-8);
        const kps = data.map(r=>parseFloat(r[1])).filter(isFinite);
        if(kps.length >= 2){
          kpDelta = (Math.max(...kps) - Math.min(...kps)) / 2;
        }
      }
    }
  }catch(e){ globalThis.NRDiagnostics?.record('catch.93','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  const eventUncertainty = 0.5;
  const totalDelta = Math.sqrt(kpDelta*kpDelta + eventUncertainty*eventUncertainty);
  return { delta: Math.round(totalDelta*10)/10, kpDelta: Math.round(kpDelta*10)/10 };
}/* NR_FN_END 127 */

/* NR_FN_BEGIN 130 */function computeCScore(kpNow, kpObsJson, ai, G, kpSrc){
  const reasons = []; // driver strings
  let penalty = 0;    // 0..1 accumulated penalty; conf = 1 - penalty

  // 1. Kp source quality
  // v88.9.51-fp233 (аудит-раунд-19, Problem 1): source-штраф тепер лише
  // ЗАХОПЛЮЄТЬСЯ тут, а не додається одразу — нижче (крок 7) він комбінується
  // з age-штрафом через max(), а не сумується (подвійний рахунок, fp227) і не
  // вимикає age-штраф повністю (сліпа зона для застарілого synthetic, fp232).
  let _srcPenalty = 0, _srcTxt = 'Kp — спостереження', _srcCol = '#2bd47d';
  if(kpSrc === 'obs'){
    // без штрафу за тип; вік обробляється окремо нижче
  } else if(kpSrc === '3d'){
    _srcPenalty = 0.10; _srcTxt = 'Kp — 3-день прогноз NOAA'; _srcCol = '#ffcc00';
  } else if(kpSrc === '27d'){
    _srcPenalty = 0.22; _srcTxt = 'Kp — 27-день прогноз (грубий)'; _srcCol = '#ff9966';
  } else {
    _srcPenalty = 0.30; _srcTxt = 'Kp — синтетичний (немає даних)'; _srcCol = '#ff6b6b';
  }

  // 2. Kp variability (storm → low confidence in Panchanga layer)
  const cb = computeConfidenceBand(kpNow, kpObsJson);
  if(cb.kpDelta > 2.0){
    penalty += 0.15;
    reasons.push({ txt:`Kp нестабільний (ΔKp=${cb.kpDelta})`, col:'#ff9966', d:0.15 });
  } else if(cb.kpDelta > 1.0){
    penalty += 0.07;
    reasons.push({ txt:`Kp мінливий (ΔKp=${cb.kpDelta})`, col:'#ffcc00', d:0.07 });
  }

  // 3. Storm state (Kp≥5 → Panchanga factors less predictive)
  if(isFinite(kpNow) && kpNow >= 7){
    penalty += 0.18;
    reasons.push({ txt:'Буря G3+ — Панчанга фактори пригнічені', col:'#ff6b6b', d:0.18 });
  } else if(isFinite(kpNow) && kpNow >= 5){
    penalty += 0.10;
    reasons.push({ txt:'Буря G1-G2 — підвищена невизначеність', col:'#ff9966', d:0.10 });
  }

  // 4. Eclipse (hardcoded table — may be off by ±1 day)
  if(ai && ai.Mi < 0){
    penalty += 0.08;
    reasons.push({ txt:`Затемнення Mᵢ=${ai.Mi} (внутрішня таблиця ±1д)`, col:'#ffcc00', d:0.08 });
  }

  // 5. Panchanga PCL confidence (R&D module)
  if(ai && Math.abs(ai.Pi) >= 3.0){
    penalty += 0.06;
    reasons.push({ txt:`Pᵢ=${ai.Pi} — сильний Панчанга фактор (R&D)`, col:'#ffcc00', d:0.06 });
  }

  // 6. Amavasya (hardcoded -3, high confidence)
  if(ai && ai.Li === -3){
    reasons.push({ txt:'Амавасья Lᵢ=−3 — фіксований override', col:'#2bd47d', d:0 });
  }

  // 7. v84b: Data freshness penalty (SW stale/cached)
  // v87.14 fix: читати з DOM badge — __uiState.freshness заповнюється ПІСЛЯ computeCScore
  const _fbTxt = (document.getElementById('freshnessBadge')?.textContent || 'LIVE').toLowerCase();
  let _freshness = 'live';
  if (_fbTxt.includes('offline') || _fbTxt.includes('old')) _freshness = 'old';
  // v88.9.08-fp189: DEGRADED (фід >3г / фізична суперечність) не матчився ЖОДНОЮ
  // гілкою → штраф 0 → "Якість даних: Висока" поруч зі статусом DEGRADED.
  // fp198 (2026-07-16): читання DOM-бейджа мало ГОНКУ — freshnessBadge отримує
  // текст '⚠ DEGRADED' у _runSanityWatchdog(), який виконується ПІСЛЯ computeCScore.
  // Тому .includes('degraded') на цьому рядку читало ще старий текст → штраф не
  // застосовувався → "Висока" лишалась поруч з DEGRADED (скрін Kyrylo 16.07).
  // Тепер degraded-умови рахуються ПРЯМО тут (ті самі, що Rule 1/3 watchdog-а),
  // не залежать від порядку рендеру DOM.
  // v88.9.52-fp234 FIX-CRITICAL (аудит-раунд-20): ПОВНА переробка структури.
  // БУЛО: 4 взаємовиключні гілки (degraded / cached|stale / old / else), і мій
  // combiner з fp233 сидів у ОСТАННЬОМУ else — тому:
  //   (а) для age>12г спрацьовувала гілка _degraded і combiner НЕ виконувався
  //       взагалі (заявлені 0.35 ніколи не досягались, реально було 0.28);
  //   (б) РЕГРЕСІЯ fp233: у трьох ранніх гілках _srcPenalty не додавався
  //       ВЗАГАЛІ (бо я переніс його у змінну, а додавання лишив у else) —
  //       synthetic+degraded штрафувався 0.28 замість щонайменше 0.30.
  // СТАЛО: три виміри "несвіжості" (тип джерела / вік / транспорт-кеш)
  // рахуються ЗАВЖДИ і комбінуються через max() — вони описують ОДИН факт
  // (наскільки дані далекі від свіжого реального вимірювання), тому сумувати
  // їх = подвійний рахунок. Фізична суперечність — НЕЗАЛЕЖНА проблема
  // цілісності даних, тому окремий АДИТИВНИЙ штраф. Вік більше не конфлюється
  // у "degraded" (він уже повністю описаний власною age-шкалою).
  let _physicsConflict = false;
  try {
    const _dstObj = window._lastDst;
    const _dstV = _dstObj && isFinite(_dstObj.dst) ? _dstObj.dst : null;
    if (isFinite(kpNow) && kpNow < 2 && _dstV !== null && _dstV < -80) _physicsConflict = true;
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.80','recoverable'); }

  // v88.9.59-fp241 (аудит-раунд-27, Problem 3): раніше tooltip "Причини
  // зниження" не показував відсутність Sn/Dst як окремі пункти, хоча Formula
  // Audit вже візуально показує "Sn —" і "Dst —" — користувач бачив "Середня"
  // без пояснення, ЩО саме неповне. Малий штраф (0.03 кожен) — Sn/Dst
  // другорядні для G_now (не входять у формулу напряму), тому мінімальний
  // вплив на конфіденс, лише інформаційна прозорість причини.
  try {
    if (!window._lastDst || !isFinite(window._lastDst.dst)) {
      penalty += 0.03;
      reasons.push({ txt: 'Dst недоступний (фізична звірка неповна)', col: 'var(--dim)', d: 0.03 });
    }
    if (!window._lastWolfSn || !isFinite(window._lastWolfSn.sn)) {
      penalty += 0.03;
      reasons.push({ txt: 'Sn (Wolf) недоступний', col: 'var(--dim)', d: 0.03 });
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.81','recoverable'); }

  // Вимір 2: вік даних. v88.9.52-fp234: шкалу перекалібровано — fp233 давав
  // для 5г затримки лише 0.12 → 88% → знову "Висока", тобто регресію проти
  // вимоги аудиту-14 ("delayed observed не може називатись Висока"). Цикл
  // NOAA — 3г, тому >3г = щонайменше один пропущений цикл, це вже не "висока
  // якість". Шкала: <1г=0, 1-3г=0.05, 3-6г=0.18, 6-12г=0.24, 12-24г=0.30, >24г=0.38.
  let _agePenalty = 0, _ageTxt = '';
  try {
    const _ageH = (window._kpSourceFreshness && isFinite(window._kpSourceFreshness.ageHours))
      ? window._kpSourceFreshness.ageHours : null;
    if (_ageH != null) {
      if (_ageH > 24)      { _agePenalty = 0.38; _ageTxt = `Дані застарілі (${_ageH.toFixed(1)}г, >24г)`; }
      else if (_ageH > 12) { _agePenalty = 0.30; _ageTxt = `Дані застарілі (${_ageH.toFixed(1)}г, 12-24г)`; }
      else if (_ageH > 6)  { _agePenalty = 0.24; _ageTxt = `Дані затримані (${_ageH.toFixed(1)}г, 6-12г)`; }
      else if (_ageH > 3)  { _agePenalty = 0.18; _ageTxt = `Дані затримані (${_ageH.toFixed(1)}г, 3-6г)`; }
      else if (_ageH > 1)  { _agePenalty = 0.05; _ageTxt = `Дані злегка затримані (${_ageH.toFixed(1)}г)`; }
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.82','recoverable'); }

  // Вимір 3: транспорт (кеш / офлайн)
  let _transportPenalty = 0, _transportTxt = '';
  if (_fbTxt.includes('cache') || _fbTxt.includes('stale')) { _transportPenalty = 0.12; _transportTxt = 'Дані з кешу (stale/cached)'; }
  if (_freshness === 'old' || _fbTxt.includes('offline'))   { _transportPenalty = 0.20; _transportTxt = 'Дані застарілі (offline)'; }

  // Комбінування ТРЬОХ вимірів несвіжості через max() — не сума.
  const _staleness = Math.max(_srcPenalty, _agePenalty, _transportPenalty);
  if (_staleness > 0) {
    penalty += _staleness;
    const _txt = (_staleness === _agePenalty && _ageTxt) ? _ageTxt
               : (_staleness === _transportPenalty && _transportTxt) ? _transportTxt
               : _srcTxt;
    const _col = (_staleness === _agePenalty && _ageTxt) ? '#a8d5e0'
               : (_staleness === _transportPenalty && _transportTxt) ? '#ffcc00'
               : _srcCol;
    reasons.push({ txt: _txt, col: _col, d: _staleness });
  } else {
    reasons.push({ txt: _srcTxt, col: _srcCol, d: 0 });
  }

  // Незалежний штраф: фізична суперечність джерел (НЕ несвіжість — окремий вимір)
  if (_physicsConflict) {
    penalty += 0.28;
    reasons.push({ txt:'Фізична суперечність: Kp спокійний, але Dst буря', col:'#ff6b6b', d:0.28 });
  }

  // 7b. v87.91: scenario penalty — NOAA 3-day forecast недоступний → плато на базі поточного Kp
  // Це різна семантика від stale Kp_obs: тут сьогодні може бути live, але "завтра" — synthetic.
  // Без цього штрафу Hero показував Довіру 92% тоді як прогноз — це fallback.
  let _fcastSynthetic = false;
  try { _fcastSynthetic = !!(typeof last3D !== 'undefined' && last3D && last3D._synthetic); } catch(e){ globalThis.NRDiagnostics?.record('catch.95','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}
  if (_fcastSynthetic) {
    penalty += 0.22;
    reasons.push({ txt:'NOAA forecast недоступний — scenario plateau', col:'#ff6b6b', d:0.22 });
  }

  // 8. Clamp
  penalty = Math.min(0.85, penalty);
  // v87.14: also enforce floor penalty — R&D cannot claim 100% (0 penalty)
  // Мінімум 8% penalty = базова невизначеність моделі (R&D / Advisory)
  penalty = Math.max(0.08, penalty);
  let conf = Math.round((1 - penalty) * 100) / 100;

  // Grade
  // v88.9.46-fp228 FIX (той самий клас бага знову): grade тут мав ВЛАСНИЙ
  // поріг (0.75/0.50), відмінний від formatConfidence() (0.85/0.65) —
  // одна й та сама conf=0.82 могла одночасно називатись "Висока" тут і
  // "Середня" через formatConfidence() деінде. Уніфіковано пороги.
  let grade = conf >= 0.85 ? 'high' : conf >= 0.65 ? 'med' : 'low';

  // fp386: the page must not say both "OBSERVED · DELAYED" and "High quality".
  // A 1–3 h observation can still be useful, but its presentation is capped at
  // Medium until a fresh observation arrives. This changes confidence wording,
  // never G, PDF/Engine reference, or the frozen forecast formula.
  if (_agePenalty >= 0.05 && grade === 'high') {
    grade = 'med';
    reasons.push({ txt: 'Kp observed із затримкою понад 1 год → максимум «Середня»', col:'#ffcc00', d:0 });
  }

  // v88.9.6x-fp244 FIX-CRITICAL (аудит fp242, п.2/3): "Якість даних: Висока"
  // раніше НЕ реагувала на провенанс Dst — якщо Dst взагалі був відсутній, це
  // давав лише малий адитивний штраф (0.03, крок 7 вище), а якщо Dst БУВ
  // присутній, але з чужим/нерозпізнаним/майбутнім timestamp — не штрафувалось
  // ВЗАЄМІ. Це РІЗНІ речі (відсутність даних vs недовіра до конкретного
  // значення), тому окремий hard-gate, що ріже grade ЗВЕРХУ (а не адитивно) —
  // на відміну від penalty-штрафів, hard-gate не можна "перебити" іншими
  // хорошими факторами.
  try {
    const _dp = _dstProvenanceCheck();
    if (!_dp.ok && window._lastDst && isFinite(window._lastDst.dst)) {
      // Dst присутній, але непідтверджений — не плутати з "Dst відсутній
      // взагалі" (те вже враховано штрафом 0.03 вище, крок 7).
      if (grade === 'high') grade = 'med';
      reasons.push({ txt: `Dst provenance: ${_dp.reason} → максимум «Середня»`, col:'#ffcc00', d:0 });
    }
  } catch(e){ window.NRDiagnostics?.record('legacy.catch.83','recoverable'); }
  // Другий hard-gate: Kp застарілий (>12г, той самий поріг, що age-шкала
  // вище) не може називатись навіть "Середня" — лише "Низька".
  if (_agePenalty >= 0.30 && grade !== 'low') {
    grade = 'low';
    reasons.push({ txt: `Kp застарілий (age-penalty ${_agePenalty}) → максимум «Низька»`, col:'#ff6b6b', d:0 });
  }
  // Grade cap застосований — узгоджуємо чисельний conf/pct з лейблом, щоб
  // бар і відсоток не суперечили тексту (напр. "92%" поруч із "Середня").
  if (grade === 'med' && conf >= 0.85) conf = 0.84;
  if (grade === 'low' && conf >= 0.65) conf = 0.64;

  const gradeCol = grade==='high' ? '#2bd47d' : grade==='med' ? '#ffcc00' : '#ff6b6b';
  const gradeLabel = grade==='high' ? 'Висока' : grade==='med' ? 'Середня' : 'Низька';

  // Bar HTML (compact inline)
  const pct = Math.round(conf * 100);
  const bar = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
    <div style="flex:1;height:5px;background: var(--border);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${gradeCol};border-radius:3px;transition:width .5s"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:${gradeCol};min-width:36px">${pct}%</span>
  </div>`;

  return { conf, grade, gradeCol, gradeLabel, pct, bar, drivers: reasons };
}/* NR_FN_END 130 */

/* NR_FN_BEGIN 135 */function computeAi(dateTimeUTC, kp=null){
  try{
    if(dateTimeUTC && typeof dateTimeUTC.getTime === 'function' && !isNaN(dateTimeUTC.getTime())){
      // fp295: Ai also depends on live Dst, Wolf Sn and profile/Hora.
      // Date+Kp alone returned stale results after async refresh or profile switch.
      const _dstKey = (window._lastDst && isFinite(window._lastDst.dst)) ? window._lastDst.dst : 'na';
      const _snKey = (window._lastWolfSn && isFinite(window._lastWolfSn.sn)) ? window._lastWolfSn.sn : 'na';
      const _profileKey = (typeof _activeProfile !== 'undefined') ? _activeProfile : 'off';
      const _liveBucket = Math.abs(dateTimeUTC.getTime() - Date.now()) < 300000 ? Math.floor(Date.now() / 300000) : 'day';
      const _year = dateTimeUTC.getUTCFullYear();
      const _dependencies = JSON.stringify([
        _userLat, _userLon, todayKyivStr(), Math.floor(Date.now()/60000),
        window._lastDst?.time, window._lastDst?._cached, _dstProvenanceCheck().ok, lastBz, lastVsw,
        eventIndex.get(fmtDate(dateTimeUTC)) || [],
        [_year-1,_year,_year+1].map(y=>Array.from(eclipsesByYear.get(y)||[]))
      ]);
      const _k = [dateTimeUTC.getTime(), (Number.isFinite(_finiteFormulaNumber(kp)) ? Number(kp) : 'missing'), _dstKey, _snKey, _profileKey, _liveBucket, _dependencies].join('|');
      const _hit = _computeAiCache.get(_k);
      if(_hit) return _hit;
      const _res = _computeAiRaw(dateTimeUTC, kp);
      if(_computeAiCache.size > 500) _computeAiCache.clear(); // захист від розростання
      _computeAiCache.set(_k, _res);
      return _res;
    }
  }catch(e){ window.NRDiagnostics?.record('legacy.catch.84','recoverable'); }
  return _computeAiRaw(dateTimeUTC, kp);
}/* NR_FN_END 135 */

/* NR_FN_BEGIN 136 */function _computeAiRaw(dateTimeUTC, kp=null){
  // v88.7+ (deep audit): defensive input validation
  // Раніше: computeAi(null) → TypeError, computeAi(d, 100) → G=+96 (поза spec).
  // Тепер: graceful NaN return для invalid date, clamp kp до [0..9].
  if(!dateTimeUTC || typeof dateTimeUTC.getTime !== 'function' || isNaN(dateTimeUTC.getTime())){
    return { Ai: NaN, AiNoDst: NaN, Li: 0, Mi: 0, ei: 0, eiBase: 0, horaEi: 0,
             Pi: 0, Di: 0, snPen: 0, bzVal: null, vswVal: null,
             phaseName: '?', phaseDeg: NaN, lTip: 'Invalid date', mTip: '', eTip: '', pTip: '', diTip: '',
             explain: 'Invalid date input', eclipseUnverified: false };
  }
  kp = _finiteFormulaNumber(kp);
  const kpAvailable = Number.isFinite(kp) && kp >= 0 && kp <= 9;
  if(!kpAvailable) kp = NaN;
  // Reject invalid range consistently with kpDayTerm; never invent quiet Kp.
  const dateStr = fmtDate(dateTimeUTC);

  const phaseDeg  = moonPhaseAngle(dateTimeUTC);
  const phaseName = phaseNameByAngle(phaseDeg);

  // tithiIdxForLi: 0-based індекс (0..29). 0=Pratipada, 14=Purnima, 29=Amavasya.
  // Конвенція: 0-based, на відміну від computePanchanga.tithi.num (1-based).
  const tithiIdxForLi = Math.min(29, Math.floor(phaseDeg / 12));
  let Li = 0, lTip = `0 — фаза «${phaseName}» не впливає на Lᵢ`;
  if (tithiIdxForLi === 29) {
    Li = -3;
    lTip = `-3 — Амавасья (29-а тітхі, ΔL≈${phaseDeg.toFixed(0)}°)`;
  } else if (tithiIdxForLi === 14) {
    // v17: authored Purnima × Kp interaction; cited studies do not validate these weights.
    if (kp >= 7)      { Li = -2; lTip = `-2 — Пурніма + G3+ буря (Kp≥7): підсилення геомагн. впливу (v17)`; }
    else if (kp >= 5) { Li = -1; lTip = `-1 — Пурніма + G1-G2 буря (5≤Kp<7): помірне підсилення (v17)`; }
    else              { Li = 0;  lTip = `0 — Пурніма (15-а тітхі, нейтральна при Kp<5 v14.2, ΔL≈${phaseDeg.toFixed(0)}°)`; }
  }

  const mres = computeMiFromEclipses(dateTimeUTC);
  const Mi   = mres.Mi;
  const mTip = (mres.mTip || (Mi===0?'0 — затемнення не виявлено':`${Mi}`));
  const eclipseUnverified = mres.eclipseUnverified === true;

  const dayEvents = (eventIndex.get(dateStr) || []).slice();
  // Виключаємо Амавасью/Пурніму з eᵢ — вони вже враховані в Lᵢ
  const LI_EXCLUDED = ['Амавасья, день мертвих', 'Amavasya']; // Пурніма (свято) видалено — engine v14.2: Пурніма=0
  const filteredEvents = dayEvents.filter(e => !LI_EXCLUDED.includes(e.name));
  // v83d: canonical dedupe by name (prevents ICS + auto double-count)
  const _seenEventKeys = new Set(filteredEvents.map(e => e.name));
  for(const e of autoComputedExtras(dateTimeUTC, kp)){
    if(!_seenEventKeys.has(e.name)){ _seenEventKeys.add(e.name); filteredEvents.push(e); }
  }
  // Обчислюємо ei і eTip за один прохід
  let ei = 0;
  const eTipLines = [];
  for(const rec of filteredEvents){
    const w = rec.weight || 0;
    if(w===0) continue;
    ei += w;
    eTipLines.push(`${w > 0 ? '+' : ''}${w} — ${rec.name}${rec.source==='ICS' ? '' : ' (≈)'}${rec.raw?` [${rec.raw}]`:''}`);
  }
  if(eTipLines.length === 0){
    eTipLines.push('0 — подій не знайдено');
  } else {
    eTipLines.push(`─────`);
    eTipLines.push(`eᵢ = ${ei > 0 ? '+' : ''}${ei}`);
  }
  const eTip = eTipLines.join('\n');

  // PCL_SCALE: масштабний коефіцієнт Panchanga → Pᵢ.
  // Historical calibration used Kp-2 and simplified Pi; it does not validate current 2-Kp.
  // Weight 0.4 is retained as a research heuristic, not a demonstrated optimum.
  // Historical table: 85/178 vs 84/178; significance/equivalence not established.
  // Hero G is advisory continuous indicator — not validated metric.
  // Engine PDF agreement is a different target; it is not real-world outcome accuracy.
  // Reference: PCL_CALIBRATION_REPORT.md
  const PCL_SCALE = 0.4;
  // lunar_mod v14.2 (BUG-2 fix): sin²(φ/2) — 0 при новолунні, 1 при повні.
  // Authored hypothesis; Cajochen 2013 sleep findings do not derive this function.
  const _phiRad = phaseDeg * Math.PI / 180;
  const lunarMod = Math.pow(Math.sin(_phiRad / 2), 2); // sin²(φ/2)
  let Pi = 0, PiRaw = 0, pTip = '';
  try {
    // v87.90 fix: panchanga для Pᵢ обчислюється на канонічний сход Сонця цього ж дня
    // (узгоджено з Panchanga карткою, ant-action, decision timing).
    // Раніше: computePanchanga(dateTimeUTC) → tithi міг не збігатися з картою.
    // Це призводило до Pᵢ-стрибків коли Hero перетинала межу tithi всередині дня.
    const _dayRef = (typeof sunriseUTC === 'function') ? sunriseUTC(dateTimeUTC) : dateTimeUTC;
    if(_dayRef._solarUnavailable) throw new Error('solar_unavailable');
    const panch = computePanchanga(_dayRef);
    // v30.1: часткові Tithi scores додані в Pi
    // Amavasya(idx=29,score=-3) і Purnima(idx=14,score=0,нейтральна v14.2) виключені — вже в Li
    // Ekadashi(idx=10,25) виключено — вже в ei через ICS
    // tithi.num є 1-based → конвертуємо в 0-based для порівняння з масивами і tithiIdxForLi
    const tIdx = panch.tithi.num - 1; // 0-based: 14=Purnima, 29=Amavasya, 10/25=Ekadashi
    const tithiInPi = (tIdx !== 14 && tIdx !== 29 && tIdx !== 10 && tIdx !== 25) ? panch.tithi.score : 0;
    // P2 fix v87.90: lunar_mod (sin²(φ/2)) застосовується ЛИШЕ до Tithi-частини PCL.
    // Applying lunar modulation to Tithi only is an authored modeling choice;
    // Vara/Nakshatra/Yoga/Karana — календарно-фіксовані, не залежать від фази Місяця.
    // Раніше: × lunarMod до всіх → Vara/Yoga/Karana зануляються в новолуння (методологічна помилка).
    const _tithiPi = tithiInPi * lunarMod;
    const _restPi  = panch.vara.score + panch.nakshatra.score + panch.yoga.score + panch.karana.score;
    // v88.7.8 FIX-J: PiRaw зберігається у повній точності для AiRaw, Pi округлюється тільки для UI.
    PiRaw = (_tithiPi + _restPi) * PCL_SCALE;
    Pi = Math.round(PiRaw * 10) / 10;
    const pParts = [];
    if(tithiInPi !== 0)              pParts.push(`Tithi(${panch.tithi.name})=${tithiInPi}`);
    if(panch.vara.score !== 0)       pParts.push(`Vara(${panch.vara.name})=${panch.vara.score}`);
    if(panch.nakshatra.score !== 0)  pParts.push(`Nak(${panch.nakshatra.name})=${panch.nakshatra.score}`);
    if(panch.yoga.score !== 0)       pParts.push(`Yoga(${panch.yoga.name})=${panch.yoga.score}`);
    if(panch.karana.score !== 0)     pParts.push(`Kar(${panch.karana.name})=${panch.karana.score}`);
    pTip = pParts.length ? `PCL (sunrise reference): Tithi=${tithiInPi}×lunar(${lunarMod.toFixed(2)})=${_tithiPi.toFixed(1)} + fixed=${_restPi} → ×${PCL_SCALE} → Pᵢ=${Pi} (R&D/advisory; scale is not prospectively validated)` : `0 — всі Panchanga нейтральні`;
  } catch(e) { globalThis.NRDiagnostics?.record('catch.96','recoverable');
    pTip = e.message==='solar_unavailable' ? 'PCL недоступний: немає місцевого сходу Сонця; 0 — технічний внесок, не нейтральний прогноз.' : '0 — помилка PCL';
  }

  // v42: real-time solar wind modifiers (Bz, Vsw) — advisory, DSCOVR
  const bzMod  = computeBzModifier(lastBz);
  const vswMod = computeVswModifier(lastVsw);
  const bzVal  = bzMod.val;
  const vswVal = vswMod.val;
  if(bzVal !== 0) { eTipLines.push(''); eTipLines.push(`${bzVal.toFixed(1)} \u2014 ${bzMod.tip}`); }
  if(vswVal !== 0) { eTipLines.push(`${vswVal.toFixed(1)} \u2014 ${vswMod.tip}`); }

  // Hora is an intraday context layer only. It must never change canonical Ai/G.
  const HORA_ENABLED_PROFILES = ['mil','trader'];
  let horaEiRaw = 0, horaEi = 0, horaTip = '';
  // v88.8.36-fp56-P9 FIX: hora — ІНТРАДЕННИЙ сигнал (планетна година поточного моменту).
  // Раніше: hora додавалась у БУДЬ-ЯКИЙ виклик computeAi для mil/trader, включно з noonUTC
  // day-scores → 27-денна "NOAA raw" рейка та fallback-тренд ставали профіль-залежними (до ±0.6).
  // Тепер: hora застосовується лише для live-викликів (|t−now|<5 хв) — Hero G_now реального часу.
  // Day-рейки (noon UTC) профіль-нейтральні. Edge: виклик noonUTC рівно опівдні UTC ±5 хв
  // трактується як live — у цей момент noon-hora і є поточною, семантично коректно.
  const _isLiveCall = Math.abs(dateTimeUTC.getTime() - Date.now()) < 300000;
  if(_isLiveCall && HORA_ENABLED_PROFILES.includes(_activeProfile)){
    const curHora = _getCurrentHoraForAi(dateTimeUTC);
    if(curHora){
      horaEiRaw = curHora.pcl * 0.2;
      horaEi = Math.round(horaEiRaw * 10) / 10;
      horaTip = `${horaEi >= 0 ? '+' : ''}${horaEi} — Hora ${curHora.sym} ${curHora.planet} ×0.2 (${_activeProfile}), контекст · score_effect=0`;
      if(horaEi !== 0){
        eTipLines.push('');
        eTipLines.push(horaTip);
      }
    }
  }
  const eiTotalRaw = ei;
  const eiTotal = Math.round(eiTotalRaw * 10) / 10;

  // v85b-F5 (СЕРЕД-3): Sn penalty gradation — fixes constant -0.4 drift during Solar Max 2025-2026
  // Раніше: Sn>150 → -0.4 (бінарно). Solar Max має Sn ~150-200 → постійний шум -0.4.
  // Тепер: пороги diff (було engine v18.5 WEIGHTS.sn_high_pen = -0.4 single-threshold)
  const _snVal = window._lastWolfSn ? (window._lastWolfSn.sn ?? 0) : 0;
  const snPenShadow = _snVal > 200 ? -0.4 : _snVal > 150 ? -0.2 : 0;
  const snPen = 0; // fp297: rejected by chronological ablation; context only

  // Dᵢ — Dst component (A3+A4: офіційна частина ΣAᵢ, синхронно з engine v18.5)
  // v88.7.8 FIX-I: викликаємо computeDstModifier() — спільне джерело істини з Science Bar.
  // Раніше: дублювали порогову логіку (-100, -50) в обох місцях. Тепер один владу.
  // Date-обмеження зберігаємо: Dᵢ застосовується ТІЛЬКИ для today (майбутні Dst невідомі).
  let Di = 0, diTip = '0 — Dst норма';
  const _diDateStr = fmtDate(dateTimeUTC);
  const _todayStr  = todayKyivStr();
  if(_diDateStr === _todayStr) {
    const provenance = _dstProvenanceCheck();
    const _dstMod = provenance.ok ? computeDstModifier() : {val:0, tip:'0 — Dst не використано: '+provenance.reason};
    Di = _dstMod.val;
    diTip = _dstMod.tip;
  }

  // v51: Bz/Vsw — інформаційний контекст, НЕ в canonical G (§13.2 Посібника)
  // v88.7.8 FIX-J: один Math.round в кінці на повній сумі AiRaw — раніше було 3 послідовних
  // round (Pi → Ai → AiFull) що накопичувало похибку до ±0.05. Тепер ΣAᵢ точна, UI-округлення лише раз.
  const AiNoDstRaw = Li + Mi + eiTotalRaw + PiRaw;
  const AiFullRaw  = AiNoDstRaw + Di;
  const Ai     = Math.round(AiNoDstRaw * 10) / 10; // legacy field name AiNoDst
  const AiFull = Math.round(AiFullRaw  * 10) / 10;
  const explain = `\u03a3A\u1d62 = L\u1d62+M\u1d62+e\u1d62+P\u1d62+D\u1d62 = ${Li}+${Mi}+${eiTotal}+${Pi}+${Di} = ${AiFull}` + (snPenShadow!==0?`\n(Sn=${_snVal}: shadow candidate ${snPenShadow}; score_effect=0 after fp297 ablation)`:``) + (bzVal!==0||vswVal!==0?`\n(+Bz=${bzVal}, Vsw=${vswVal} — контекст, не в G)`:``);

  return { Ai: AiFull, AiNoDst: Ai, Li, Mi, ei: eiTotal, eiBase: ei, horaEi, Pi, Di, snPen, snPenShadow, bzVal, vswVal, phaseName, phaseDeg, lTip, mTip, eTip: eTipLines.join('\n'), pTip, diTip, explain, eclipseUnverified };
}/* NR_FN_END 136 */

/* NR_FN_BEGIN 137 */function computeGExtended(dateUTC, kp, panchanga, ai, calScore) {
  if (!panchanga || !ai) return { gExt: null, gExtClass: null, available: false };

  const _coefs = {
    intercept:   -0.20398311011241535,
    tithi_score:  0.5898866268897176,
    ai_Ai:        0.25245570278393625,
    ai_Pi:        0.14848508262315138,
    nak_score:    0.2875632533576428,
    cal_score:    0.3289584595781701,
  };

  const tithi_score = Number.isFinite(panchanga.tithi?.score) ? panchanga.tithi.score : 0;
  const nak_score   = Number.isFinite(panchanga.nakshatra?.score) ? panchanga.nakshatra.score : 0;
  const ai_Ai       = Number.isFinite(ai.Ai) ? ai.Ai : 0;
  const ai_Pi       = Number.isFinite(ai.Pi) ? ai.Pi : 0;
  const cal_sc      = Number.isFinite(calScore) ? calScore : 0;

  const gExt = _coefs.intercept
             + _coefs.tithi_score * tithi_score
             + _coefs.ai_Ai       * ai_Ai
             + _coefs.ai_Pi       * ai_Pi
             + _coefs.nak_score   * nak_score
             + _coefs.cal_score   * cal_sc;

  const gExtRounded = Math.round(gExt * 10) / 10;
  const gExtClass = classifyG(gExtRounded);

  return {
    gExt: gExtRounded,
    gExtClass,
    available: true,
    components: { tithi_score, ai_Ai, ai_Pi, nak_score, cal_sc },
    coefs: _coefs,
    tip: `G_ext v2 = ${_coefs.intercept.toFixed(2)} `
       + `+ ${_coefs.tithi_score.toFixed(2)}×TithiScore(${tithi_score}) `
       + `+ ${_coefs.ai_Ai.toFixed(2)}×Ai(${ai_Ai}) `
       + `+ ${_coefs.ai_Pi.toFixed(2)}×Pi(${ai_Pi}) `
       + `+ ${_coefs.nak_score.toFixed(2)}×NakScore(${nak_score}) `
       + `+ ${_coefs.cal_score.toFixed(2)}×cal(${cal_sc}) `
       + `= ${gExtRounded.toFixed(2)}\n\n`
       + `R&D advisory v2 (weak; NOT a verdict).\n`
       + `Validation: n=212, CV r=+0.42 ± 0.16, CV sign-match=63.7%, strict=48.6%.\n`
       + `Primary verdict must come from verified Engine/PDF path; Live G is current background.`,
  };
}/* NR_FN_END 137 */

/* NR_FN_BEGIN 186 */function getPanchaPakshiBird(nakIdx, isShukla) {
  return (isShukla ? PANCHA_PAKSHI_BIRD_SHUKLA : PANCHA_PAKSHI_BIRD_KRISHNA)[nakIdx];
}/* NR_FN_END 186 */

/* NR_FN_BEGIN 189 */function computePanchanga(dateUTC){
  // v88.8.35-fp56-P8 perf: memoize by minute. computePanchanga is the heaviest function in the
  // app (~13 trig/ephemeris ops incl. Meeus moon/sun series) and is called 6+ times per render
  // tick on the SAME noon date by different sub-renderers. Panchanga is effectively constant within
  // a minute, so cache by minute-rounded timestamp. Cache is tiny (1–2 keys/tick) and self-trims.
  let _pKey;
  try {
    _pKey = [Math.floor((dateUTC instanceof Date ? dateUTC.getTime() : new Date(dateUTC).getTime()) / 60000), _userLat, _userLon].join('|');
    if (!window.__panchMemo) window.__panchMemo = {};
    if (window.__panchMemo[_pKey]) return window.__panchMemo[_pKey];
  } catch(_e) { globalThis.NRDiagnostics?.record('catch.132','recoverable');  _pKey = null; }
  const phaseDeg = (moonPhaseAngle(dateUTC) + 360) % 360;

  // tithiIdx: 0-based (0..29). tithi.num = tithiIdx+1 (1-based, для зовнішнього API).
  // Усі масиви TITHI_NAMES/SCORE/TYPE індексуються 0-based через tithiIdx.
  const tithiIdx = Math.min(29, Math.floor(phaseDeg / 12));
  // v88.9.01-fp183: hours until next tithi boundary + preview of what's coming,
  // so a discrete jump (e.g. into Amavasya, ΣAi=-4) isn't a total surprise —
  // Kyrylo caught G_now jumping ~5 points with no warning (2026-07-13).
  let hoursToNextTithi = null, nextTithiIdx = null;
  try {
    const _phaseDegPlus1h = (moonPhaseAngle(new Date(dateUTC.getTime() + 3600000)) + 360) % 360;
    let _rate = _phaseDegPlus1h - phaseDeg;
    if (_rate < 0) _rate += 360;
    if (_rate < 0.01) _rate = 0.508; // safety fallback (~average deg/hour), avoid div-by-~0
    const _degToNext = ((tithiIdx + 1) * 12) - phaseDeg;
    hoursToNextTithi = _degToNext / _rate;
    nextTithiIdx = (tithiIdx + 1) % 30;
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.91','recoverable'); }
  const tithi = {
    num: tithiIdx + 1,  // 1-based: використовується в TITHI_ADVICE і Pi (tIdx = num-1)
    name: TITHI_NAMES[tithiIdx],
    type: TITHI_TYPE[tithiIdx],
    score: TITHI_SCORE[tithiIdx],
    note: TITHI_NOTE[tithiIdx] || '',
    phaseDeg: phaseDeg.toFixed(1),
    hoursToNext: hoursToNextTithi,
    nextName: nextTithiIdx !== null ? TITHI_NAMES[nextTithiIdx] : null,
    nextScore: nextTithiIdx !== null ? TITHI_SCORE[nextTithiIdx] : null,
  };

  // Vara: v87.90 fix — локальний день тижня (раніше getUTCDay() давав неправильний результат вночі)
  const varaIdx = localWeekday(dateUTC); // 0=Sun,1=Mon,...,6=Sat у локальному часі
  const vara = VARA_DATA[varaIdx];

  // Nakshatra: Meeus Ch.47 точний місячний алгоритм
  // Ідентичний блоку personal-розрахунку — уникає ±3–5° похибки простого синусоїда
  const jde_meeus = dateUTC.getTime() / 86400000 + 2440587.5;
  const moonLon_trop = calcMoonLongitude(__nrUtcJdToTt(jde_meeus)); // tropical, Meeus Ch.47
  const ayan = lahiriAyanamsha(__nrUtcJdToTt(jde_meeus));
  const moonLonSid = ((moonLon_trop - ayan) % 360 + 360) % 360; // sidereal Lahiri
  // Sun tropical: Meeus Ch.25, точність ~0.01° (BUG-4 fix)
  const sunLon = calcSunLongitude(__nrUtcJdToTt(jde_meeus));
  const nakIdx = Math.min(26, Math.floor(moonLonSid / (360/27)));
  const nakshatraType = NAKSHATRA_TYPE[nakIdx];
  // v88.8.15: Ganda Mool detection — junction nakshatra (BPHS Ch.4 v.13)
  // v88.8.16: extended з canonical subtype/effect details (Drikpanchang)
  const isGandaMool = GANDA_MOOL_INDICES.includes(nakIdx);
  const gandaMoolDetails = isGandaMool ? GANDA_MOOL_DETAILS[nakIdx] : null;
  // v88.8.16: Panchak detection
  const isPanchak = PANCHAK_INDICES.includes(nakIdx);
  const panchakWeekday = localWeekday(dateUTC);
  const panchakType = isPanchak ? (PANCHAK_TYPES_BY_WEEKDAY[panchakWeekday] || '') : '';
  // v88.8.41-fp102: ВИПРАВЛЕНО — за Pulippani bird визначається через JANMA nakshatra
  // людини (фіксований назавжди), не nakshatra поточного дня. Поточний день впливає
  // лише на ACTIVITY STATE птаха (Eating/Walking/Ruling/Sleeping/Dying), не на bird ID.
  // Тут (без birth-профілю) показуємо bird поточної nakshatra як calendar-context
  // tantamount до того, що відображає Posibnyk Tithi/Nakshatra (advisory, не personal).
  const tithiForPaksha = tithiIdx + 1; // same Sun-Moon elongation used by canonical tithi; never mix sidereal Moon with tropical Sun
  const isShuklaPaksha = tithiForPaksha <= 15;
  const birdId = getPanchaPakshiBird(nakIdx, isShuklaPaksha);
  const nakshatra = {
    num: nakIdx + 1,
    name: NAKSHATRA_NAMES[nakIdx],
    type: nakshatraType,
    regent: NAKSHATRA_REGENT[nakIdx],
    score: NAKSHATRA_SCORE_MAP[nakshatraType] ?? 0,
    moonLon: moonLonSid.toFixed(1),
    // v88.8.15: канонічні розширення
    isGandaMool: isGandaMool,
    gandaMoolDetails: gandaMoolDetails,  // v88.8.16: subtype/ruler/effect (null якщо не GM)
    isPanchak: isPanchak,                // v88.8.16: Aquarius/Pisces 5-day inauspicious zone
    panchakType: panchakType,            // v88.8.16: weekday-specific name (Roga/Raja/Agni/Chor/Mrityu)
    panchaPakshi: {
      birdId: birdId,
      birdUa: PANCHA_PAKSHI_NAMES[birdId],
      birdEn: PANCHA_PAKSHI_NAMES_EN[birdId],
      quality: PANCHA_PAKSHI_QUALITIES[birdId]
    }
  };

  // Yoga: floor((sunLon + moonLon) % 360 / 13.333)
  const YOGA_NAMES = [
    'Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarman',
    'Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra',
    'Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha',
    'Shukla','Brahma','Indra','Vaidhriti'
  ];
  const YOGA_SCORE = [-2,1,1,1,1,-2,1,1,-1,-1,1,1,-1,1,-1,2,-3,1,-1,1,1,1,1,1,1,1,-2];
  // Yoga sidereal: (Sun_sid + Moon_sid) / 13.333 (BPHS — обидві в sidereal Lahiri)
  const sunLonSid = ((sunLon - ayan) % 360 + 360) % 360;
  const yogaSidSum = (sunLonSid + moonLonSid) % 360;
  const yogaIdx = Math.min(26, Math.floor(yogaSidSum / (360/27)));
  const yoga = {
    num: yogaIdx + 1,
    name: YOGA_NAMES[yogaIdx],
    score: YOGA_SCORE[yogaIdx],
    isCritical: yogaIdx === 16 // Vyatipata → retro_end -3
  };

  // Karana: 60 каран за місяць (BPHS: 4 фіксовані + 7 рухомих × 8 циклів)
  // k=0: Kimstughna (фіксована, початок Shukla Pratipada)
  // k=1..56: 7 рухомих (Bava..Vishti) × 8 повних циклів
  // k=57: Shakuni, k=58: Chatushpada, k=59: Naga (фіксовані наприкінці)
  const KAR_MOV_EN = ['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'];
  const KAR_MOV_UA = ['Бава','Балава','Каулава','Тайтіла','Гараджа','Ваніджа','Вішті (Бхадра)'];
  const KAR_MOV_NOTE=['Постійні справи','Фінансові операції','Союзи','Договори, весілля','Нейтральна','Торгівля, логістика','⚠️ ВЕТО — уникати всіх дій'];
  // v88.8.18: Karana scores updated to Posibnyk canonical (Tаблиця 5):
  // Bava/Balava/Kaulava/Taitila/Vanija → +1 (positive operational ratings)
  // Garaja → 0 (нейтральна)
  // Vishti → -2 (absolute veto)
  // Раніше всі positive karanas мали 0 — це призводило до систематичного заниження Pi.
  // Перевірено на n=212: Karana score correlation з PDF stable.
  const KAR_MOV_SC  = [1,1,1,1,0,1,-2];
  // v88.7.7 FIX-F: %60 зайвий — phaseDeg ∈ [0,360), /6 ∈ [0,60), floor → 0..59 вже у range.
  // Залишаємо clamp Math.min(59, ...) як defensive guard для floating-point edge case при φ=359.999...
  const karK = Math.min(59, Math.floor(phaseDeg / 6));
  let karana;
  if (karK === 0) {
    karana = {name:'Кімстугна',nameEn:'Kimstughna',type:'Стала',score:0,note:'Нейтральна',isVishti:false};
  } else if (karK <= 56) {
    const mi = (karK - 1) % 7;
    karana = {name:KAR_MOV_UA[mi],nameEn:KAR_MOV_EN[mi],type:'Рухома',score:KAR_MOV_SC[mi],note:KAR_MOV_NOTE[mi],isVishti:mi===6};
  } else if (karK === 57) {
    karana = {name:'Шакуні',nameEn:'Shakuni',type:'Стала',score:0,note:'Ритуали',isVishti:false};
  } else if (karK === 58) {
    karana = {name:'Чатушпада',nameEn:'Chatushpada',type:'Стала',score:0,note:'Обережно',isVishti:false};
  } else {
    karana = {name:'Нага',nameEn:'Naga',type:'Стала',score:0,note:'Небезпечні ситуації — обережно',isVishti:false};
  }

  // Rahu/Yama/Gulika use the same canonical Meeus sunrise/sunset anchor as
  // computeAi and the rest of Panchanga. This changes display windows only;
  // frozen scores and Pi are untouched.
  const _solarPair = sunRiseSetUTC_Meeus(dateUTC, _userLat, _userLon);
  const _dayStartMs = Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate());
  const srH = (_solarPair.sunrise.getTime()-_dayStartMs)/3600000;
  const ssH = (_solarPair.sunset.getTime()-_dayStartMs)/3600000;
  const dayLenH = ssH - srH;
  const segH = dayLenH / 8;
  // v88.8.11 КАНОН-БАГ#9 fix: Rahu Kalam позиції (1-based slot номери з 8).
  // Раніше: RAHU_ORDER = [7,1,6,4,5,3,2] — 0-based offsets, з формулою (val-1).
  // Це давало slot НАЗАД на 1 muhurta (Sunday=7-й замість 8-го за каноном).
  // Канон BPHS / Drik Panchanga / Surya Siddhanta:
  //   Sunday=8 (last muhurta), Monday=2, Tuesday=7, Wednesday=5,
  //   Thursday=6, Friday=4, Saturday=3.
  //   "Rahu Kalam never falls on the 1st muhurta" — code порушував це для Monday.
  // Перевірено реальними даними Image 3 (10.05.2026 Sunday Київ):
  //   Code result: 16:42-18:35 (7-й slot)
  //   Canon expect: 18:38-20:32 (8-й slot — 'in the evening' як прямо каже канон).
  const RAHU_ORDER = [8,2,7,5,6,4,3]; // Нд=8,Пн=2,Вт=7,Ср=5,Чт=6,Пт=4,Сб=3 (1-based slot номери)
  // v88.8.12: Yamagandam (Yama window) + Gulika Kaal (Saturn's son window)
  // Канонічні inauspicious periods за Surya Siddhanta — як Rahu Kalam, але інші позиції.
  // Підтверджено зовнішніми джерелами:
  //   Sunday: Rahu=8, Yama=5, Gulika=7 (Chengam.in Tamil canon, mpanchang.com)
  //   Friday: Rahu=4, Yama=7, Gulika=2 (Drikpanchang.com Houston)
  // Канон 1-based slot номери (з 8 muhurta дня):
  //   Yama:   Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
  //   Gulika: Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1
  // Усі три (Rahu/Yama/Gulika) — інаусп. Tradition: avoid important work.
  const YAMA_ORDER = [5,4,3,2,1,7,6];
  const GULIKA_ORDER = [7,6,5,4,3,2,1];
  const wday = localWeekday(dateUTC); // v87.90: локальний день
  const rahuStartH = srH + segH * (RAHU_ORDER[wday] - 1); // UTC
  const rahuEndH   = rahuStartH + segH;
  const yamaStartH = srH + segH * (YAMA_ORDER[wday] - 1);
  const yamaEndH   = yamaStartH + segH;
  const gulikaStartH = srH + segH * (GULIKA_ORDER[wday] - 1);
  const gulikaEndH   = gulikaStartH + segH;
  // v88.8.35-fp17 fix: round via total-minutes щоб уникнути mm===60 edge-case (07.9999 → "07:60").
  const toHHMM = h => { if(!Number.isFinite(h))return '—'; const tm=((Math.round(h*60)%1440)+1440)%1440, hh=Math.floor(tm/60), mm=tm%60; return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
  // Поточна UTC година
  const nowH = dateUTC.getUTCHours() + dateUTC.getUTCMinutes()/60;
  const rahuActive = nowH >= rahuStartH && nowH < rahuEndH;
  const yamaActive = nowH >= yamaStartH && nowH < yamaEndH;
  const gulikaActive = nowH >= gulikaStartH && nowH < gulikaEndH;
  const rahu = {
    start: toHHMM(rahuStartH),
    end:   toHHMM(rahuEndH),
    active: rahuActive,
    score: rahuActive ? -1 : 0,
    note: Number.isFinite(srH)&&Number.isFinite(ssH) ? 'UTC · Meeus canonical sunrise' : 'Недоступно: немає сходу/заходу Сонця для цього дня',
    // v88.8.12: додаткові канонічні windows для повної панчанги
    yamagandam: { start: toHHMM(yamaStartH), end: toHHMM(yamaEndH), active: yamaActive },
    gulika:     { start: toHHMM(gulikaStartH), end: toHHMM(gulikaEndH), active: gulikaActive }
  };

  const _pResult = { tithi, vara, nakshatra, yoga, karana, rahu, phaseDeg };
  try {
    if (_pKey !== null && window.__panchMemo) {
      window.__panchMemo[_pKey] = _pResult;
      // self-trim: keep the cache from growing unbounded over hours of uptime
      const _keys = Object.keys(window.__panchMemo);
      if (_keys.length > 20) delete window.__panchMemo[_keys[0]];
    }
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.92','recoverable'); }
  return _pResult;
}/* NR_FN_END 189 */

/* NR_FN_BEGIN 190 */function computePanchangaState(dateUTC){
  const p = computePanchanga(dateUTC);
  // v88.8.35-fp56-P8: computePanchanga now memoizes and returns a SHARED object. This function
  // mutates p.rahu.active/score for the current time, so clone rahu first — otherwise the mutation
  // would corrupt the cached result for other callers in the same minute.
  p.rahu = Object.assign({}, p.rahu);
  // Rahu active — перевіряємо для поточного часу (не noon)
  const _nowH = new Date().getUTCHours() + new Date().getUTCMinutes()/60;
  const [_rS, _rE] = [p.rahu.start, p.rahu.end].map(t=>{const[h,m]=t.split(':').map(Number);return h+m/60;});
  p.rahu.active = _nowH >= _rS && _nowH < _rE;
  p.rahu.score  = p.rahu.active ? -1 : 0;
  // v88.8.18: sound notification — track Rahu Kalam transition (false → true).
  if (window.GIndexSound) window.GIndexSound._track('rahu', p.rahu.active);

  // Context for downstream (animation, decision layer)
  const ctx = {
    tithi:    { num: p.tithi.num, index: p.tithi.num - 1, name: p.tithi.name, score: p.tithi.score },
    nakshatra:{ idx: p.nakshatra.num, name: p.nakshatra.name, score: p.nakshatra.score, type: p.nakshatra.type },
    yoga:     { name: p.yoga.name, score: p.yoga.score, isCritical: !!(p.yoga.score <= -2) },
    karana:   { name: p.karana.name, score: p.karana.score, isVishti: !!(p.karana.score <= -2) },
    rahu:     { active: p.rahu.active, start: p.rahu.start, end: p.rahu.end }
  };

  // Kp/Ai for G context colours
  const _kpEarly = (lastWWV && isFinite(lastWWV.kNow)) ? lastWWV.kNow
                 : (last3D && last3D.days && last3D.days[0] ? last3D.days[0].kpMax : 0);
  const _aiEarly = computeAi(sunriseUTC(dateUTC), _kpEarly);
  const _gEarly  = kpDayTerm(_kpEarly) + _aiEarly.Ai;
  ctx.aiComponents = { Li: _aiEarly.Li, Mi: _aiEarly.Mi, ei: _aiEarly.ei, Pi: _aiEarly.Pi, Di: _aiEarly.Di || 0 };

  // Advice sources
  const tAdv = TITHI_ADVICE[p.tithi.num - 1] || null;
  const vAdv = VARA_ADVICE[localWeekday(dateUTC)] || null; // v87.90: локальний день
  const nAdv = NAKSHATRA_ADVICE[p.nakshatra.type] || null;
  const yAdv = YOGA_ADVICE[p.yoga.num - 1] || null;
  const kAdv = p.karana.isVishti
    ? {do:'Очікування, спостереження', avoid:'Будь-які активні дії (абсолютне вето)'}
    : {do: p.karana.note, avoid:''};
  // v88.8.7 БАГ#1 fix: 3-state Rahu Kalam advice (active / upcoming / past).
  // Раніше: 'Обмежень немає' для всіх не-active випадків — wrong, treats upcoming
  // window як неіснуюче. Тепер: окрема hint якщо ще буде сьогодні.
  const _rNh = new Date().getUTCHours() + new Date().getUTCMinutes()/60;
  const _rRsParts = p.rahu.start.split(':').map(Number);
  const _rRsH = _rRsParts[0] + (_rRsParts[1]||0)/60;
  const _rIsUpcoming = !p.rahu.active && _rNh < _rRsH;
  const rahuAdv = p.rahu.active
    ? {do:'Оборонні/підтримуючі операції', avoid:'Нові бойові завдання, стратегічні рішення'}
    : (_rIsUpcoming
      ? {do:`Звичайні справи; ${p.rahu.start}–${p.rahu.end} — пауза`, avoid:`Не стартувати нове у вікні ${p.rahu.start}–${p.rahu.end}`}
      : {do:'Вікно минуло — обмежень немає', avoid:''});

  const cells = [
    { score: p.tithi.score, label: 'Tithi — місячний день', val: p.tithi.name,
      sub: `${p.tithi.type} · ΔL≈${p.tithi.phaseDeg}°`
           + ((isFinite(p.tithi.hoursToNext) && p.tithi.hoursToNext <= 6 && p.tithi.nextScore <= -2)
              ? ` · ⚠ через ~${Math.round(p.tithi.hoursToNext)}г → ${p.tithi.nextName} (${p.tithi.nextScore >= 0 ? '+' : ''}${p.tithi.nextScore})`
              : ''),
      adv: tAdv, tipKey:'tithi', tipData:p.tithi },
    { score: p.vara.score, label: 'Vara — день тижня', val: p.vara.name,
      sub: `${p.vara.planet}`, adv: vAdv, tipKey:'vara', tipData:p.vara },
    { score: p.nakshatra.score, label: 'Nakshatra — місячна стоянка', val: p.nakshatra.name,
      sub: `${p.nakshatra.type} · ${p.nakshatra.regent}`, adv: nAdv, tipKey:'nakshatra', tipData:p.nakshatra },
    { score: p.yoga.score, label: 'Yoga — резонанс Сонце–Місяць', val: p.yoga.name,
      sub: `${p.yoga.isCritical?'⚠️ retro_end −3':''}`, adv: yAdv, tipKey:'yoga', tipData:p.yoga },
    { score: p.karana.score, label: 'Karana — половина місячного дня', val: p.karana.name,
      sub: `${p.karana.type}`, adv: kAdv, tipKey:'karana', tipData:p.karana },
    { score: p.rahu.active ? -1 : 0, label: 'Rahu Kalam',
      val: p.rahu.active ? '⚠️ Активний зараз' : `≈ ${p.rahu.start}–${p.rahu.end} UTC`,
      sub: p.rahu.active ? `до ${p.rahu.end} UTC` : 'неактивний',
      adv: rahuAdv, tipKey:'rahu', tipData:p.rahu }
  ];

  // Noon Ai for summary
  const _kpForPanch = _kpEarly;
  const aiNow = computeAi(sunriseUTC(dateUTC), _kpForPanch);
  const pclOnly = cells.reduce((s,c)=>s+c.score, 0);

  // Discrepancy real-time vs noon
  let panchDiscrepancy = '';
  try {
    const pSunrise = computePanchanga(sunriseUTC(dateUTC));
    const diffs = [];
    if(p.yoga.name !== pSunrise.yoga.name) diffs.push(`Yoga: зараз ${p.yoga.name}, на сході Сонця ${pSunrise.yoga.name}`);
    if(p.nakshatra.name !== pSunrise.nakshatra.name) diffs.push(`Nak: зараз ${p.nakshatra.name}, на сході Сонця ${pSunrise.nakshatra.name}`);
    if(p.tithi.name !== pSunrise.tithi.name) diffs.push(`Tithi: зараз ${p.tithi.name}, на сході Сонця ${pSunrise.tithi.name}`);
    if(p.karana.name !== pSunrise.karana.name) diffs.push(`Karana: зараз ${p.karana.name}, на сході Сонця ${pSunrise.karana.name}`);
    if(diffs.length) panchDiscrepancy = diffs.join('; ');
  } catch(e){ globalThis.NRDiagnostics?.record('catch.133','recoverable'); if(window._DEBUG)console.warn('[silent]:',e.message)}

  // Aggregated advice (DO/AVOID)
  const advSources = cells.filter(s => s.adv);
  const allAvoidWords = new Set();
  advSources.forEach(s => {
    if(s.adv.avoid) s.adv.avoid.split(/[,·]/).map(w=>w.trim().toLowerCase()).filter(Boolean).forEach(w => allAvoidWords.add(w));
  });
  const sortedDo = advSources.filter(s => s.adv.do).sort((a,b) => b.score - a.score);
  const finalDo = [];
  const seenDoWords = new Set();
  for(const s of sortedDo){
    const doText = s.adv.do;
    const doWords = doText.toLowerCase();
    let contradicts = false;
    for(const av of allAvoidWords){ if(av.length > 3 && doWords.includes(av)){ contradicts = true; break; } }
    if(contradicts) continue;
    const key = doText.slice(0,20).toLowerCase();
    if(seenDoWords.has(key)) continue;
    seenDoWords.add(key);
    finalDo.push(doText);
    if(finalDo.length >= 2) break;
  }
  const finalAvoid = [];
  const seenAvWords = new Set();
  for(const s of advSources.filter(x => x.score < 0).sort((a,b) => a.score - b.score)){
    if(!s.adv.avoid) continue;
    const key = s.adv.avoid.slice(0,20).toLowerCase();
    if(seenAvWords.has(key)) continue;
    seenAvWords.add(key);
    finalAvoid.push(s.adv.avoid);
    if(finalAvoid.length >= 2) break;
  }

  const _gNow = kpDayTerm(_kpForPanch) + aiNow.Ai;
  // v88.8.21: expose live G для GChrono journal capture
  try { window.__lastG = _gNow; } catch(e){ window.NRDiagnostics?.record('legacy.catch.93','recoverable'); }

  return {
    p, ctx, cells, _gEarly, _kpEarly, _aiEarly, aiNow, pclOnly, panchDiscrepancy,
    finalDo, finalAvoid, _gNow,
    dateStr: fmtDate(dateUTC), dateUTC
  };
}/* NR_FN_END 190 */

/* NR_FN_BEGIN 193 */function _calcSunRiseSet(dateUTC){
  if(!window.Astronomy || typeof Astronomy.SearchRiseSet !== 'function'){
    return null; // fallback нижче
  }
  const cacheKey = `${dateUTC.getUTCFullYear()}-${dateUTC.getUTCMonth()}-${dateUTC.getUTCDate()}-${_userLat.toFixed(2)}-${_userLon.toFixed(2)}`;
  if(_sunRiseSetCache.has(cacheKey)) return _sunRiseSetCache.get(cacheKey);
  try {
    const observer = new Astronomy.Observer(_userLat, _userLon, 0);
    const dayStart = new Date(Date.UTC(
      dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), 0, 0, 0
    ));
    const rise = Astronomy.SearchRiseSet('Sun', observer, +1, dayStart, 1);
    const set  = Astronomy.SearchRiseSet('Sun', observer, -1, dayStart, 1);
    if(!rise || !set){ _sunRiseSetCache.set(cacheKey, null); return null; }
    const result = { sunrise: rise.date, sunset: set.date };
    _sunRiseSetCache.set(cacheKey, result);
    // Lim розмір кеша щоб не зростав вічно при заміні координат
    if(_sunRiseSetCache.size > 30) {
      const firstKey = _sunRiseSetCache.keys().next().value;
      _sunRiseSetCache.delete(firstKey);
    }
    return result;
  } catch(e) { globalThis.NRDiagnostics?.record('catch.139','recoverable');
    if(window._DEBUG) console.warn('[v88.8.0 SunRiseSet]', e.message);
    return null;
  }
}/* NR_FN_END 193 */

/* NR_FN_BEGIN 195 */function _calcRashis(dateUTC){
  if(typeof calcSunLongitude !== 'function' || typeof calcMoonLongitude !== 'function'
     || typeof lahiriAyanamsha !== 'function') return null;
  try {
    const jde = dateUTC.getTime() / 86400000 + 2440587.5;
    const ayan = lahiriAyanamsha(__nrUtcJdToTt(jde));
    const sunSid = ((calcSunLongitude(__nrUtcJdToTt(jde)) - ayan) % 360 + 360) % 360;
    const moonSid = ((calcMoonLongitude(__nrUtcJdToTt(jde)) - ayan) % 360 + 360) % 360;
    const sunIdx = Math.floor(sunSid / 30);
    const moonIdx = Math.floor(moonSid / 30);
    return {
      sun: { idx: sunIdx, deg: sunSid - sunIdx*30, ..._RASHI_NAMES[sunIdx] },
      moon: { idx: moonIdx, deg: moonSid - moonIdx*30, ..._RASHI_NAMES[moonIdx] }
    };
  } catch(e) { globalThis.NRDiagnostics?.record('catch.140','recoverable');
    if(window._DEBUG) console.warn('[v88.8.1 Rashis]', e.message);
    return null;
  }
}/* NR_FN_END 195 */

/* NR_FN_BEGIN 196 */function _calcChoghadiya(dateUTC, sunrise, sunset){
  if(!sunrise || !sunset) return null;
  // v88.8.5 Г2: defensive guard — wday в межах [0..6]
  const wday = ((sunrise.getDay() % 7) + 7) % 7; // 0=Sun..6=Sat (LOCAL day), завжди 0-6
  const dayMs = sunset.getTime() - sunrise.getTime();
  // Захист від negative/zero — якщо sunrise після sunset (полярна область чи bug), return null
  if (dayMs <= 0 || !isFinite(dayMs)) return null;
  const nightMs = (24 * 3600000) - dayMs; // приблизно — наступний sunrise ≈ same offset
  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;
  const dayNames = _CHOG_DAY[wday] || _CHOG_DAY[0]; // fallback на Sunday якщо wday некоректний
  const nightNames = _CHOG_NIGHT[wday] || _CHOG_NIGHT[0];
  const day = dayNames.map((nm, i) => {
    const m = _CHOG_META[nm] || { score:0, icon:'?', ua:nm, hint:'' };
    return {
      name: nm, score: m.score, icon: m.icon, ua: m.ua, hint: m.hint,
      start: new Date(sunrise.getTime() + i * daySlotMs),
      end:   new Date(sunrise.getTime() + (i+1) * daySlotMs)
    };
  });
  const night = nightNames.map((nm, i) => {
    const m = _CHOG_META[nm] || { score:0, icon:'?', ua:nm, hint:'' };
    return {
      name: nm, score: m.score, icon: m.icon, ua: m.ua, hint: m.hint,
      start: new Date(sunset.getTime() + i * nightSlotMs),
      end:   new Date(sunset.getTime() + (i+1) * nightSlotMs)
    };
  });
  return { day, night };
}/* NR_FN_END 196 */

/* NR_FN_BEGIN 197 */function _calcAbhijit(sunrise, sunset){
  if(!sunrise || !sunset) return null;
  const noonMs = (sunrise.getTime() + sunset.getTime()) / 2;
  const dayMs = sunset.getTime() - sunrise.getTime();
  const muhurtaMs = dayMs / 15; // канонічна 1 muhurta = 1/15 daylight
  const halfMuhurta = muhurtaMs / 2;
  return {
    start: new Date(noonMs - halfMuhurta),
    end:   new Date(noonMs + halfMuhurta),
    isTuesday: sunrise.getDay() === 2  // вівторок — Abhijit неактивний (BPHS)
  };
}/* NR_FN_END 197 */

/* NR_FN_BEGIN 198 */function _calcAuspiciousMuhurtas(sunrise, sunset, nextSunrise){
  if(!sunrise || !sunset) return null;
  const dayMs = sunset.getTime() - sunrise.getTime();
  const muhurtaMs = dayMs / 15;
  const halfMuhurta = muhurtaMs / 2;
  // Brahma: 2 muhurta до sunrise (sunrise -96min до -48min для 12h day)
  const brahmaStart = new Date(sunrise.getTime() - 2 * muhurtaMs);
  const brahmaEnd   = new Date(sunrise.getTime() - 1 * muhurtaMs);
  // Vijaya: 11-та muhurta дня (start = sunrise + 10*muhurta)
  const vijayaStart = new Date(sunrise.getTime() + 10 * muhurtaMs);
  const vijayaEnd   = new Date(sunrise.getTime() + 11 * muhurtaMs);
  // Godhuli: sunset ± half_muhurta (1 muhurta навколо заходу)
  const godhuliStart = new Date(sunset.getTime() - halfMuhurta);
  const godhuliEnd   = new Date(sunset.getTime() + halfMuhurta);
  // Nishita: 8-ма з 15 night muhurta. Якщо nextSunrise немає — apprx через +24h-dayLen
  let nishitaStart, nishitaEnd;
  if(nextSunrise){
    const nightMs = nextSunrise.getTime() - sunset.getTime();
    const nMuhurta = nightMs / 15;
    nishitaStart = new Date(sunset.getTime() + 7 * nMuhurta);
    nishitaEnd   = new Date(sunset.getTime() + 8 * nMuhurta);
  } else {
    // Approx: night ≈ 24h - dayLen, midnight = sunset + nightMs/2
    const approxNightMs = 24*3600*1000 - dayMs;
    const approxMidnight = new Date(sunset.getTime() + approxNightMs/2);
    const approxNMuhurta = approxNightMs / 15;
    nishitaStart = new Date(approxMidnight.getTime() - approxNMuhurta/2);
    nishitaEnd   = new Date(approxMidnight.getTime() + approxNMuhurta/2);
  }
  return {
    brahma:  { start: brahmaStart,  end: brahmaEnd  },
    vijaya:  { start: vijayaStart,  end: vijayaEnd  },
    godhuli: { start: godhuliStart, end: godhuliEnd },
    nishita: { start: nishitaStart, end: nishitaEnd }
  };
}/* NR_FN_END 198 */

/* NR_FN_BEGIN 212 */function computeTopDrivers(ai, kpNow){
  if(!ai) return { sorted:[], main:null, mainLabel:'', mainStr:'' };
  const kp2 = isFinite(kpNow) ? Math.round(kpDayTerm(kpNow)*10)/10 : 0;
  const raw = [
    {key:'ei', n:'eᵢ', label:'події', v:ai.ei||0},
    {key:'kp', n:'2−Kp', label:'геомагнітний', v:kp2},
    {key:'pi', n:'Pᵢ', label:'панчанга', v:ai.Pi||0},
    {key:'li', n:'Lᵢ', label:'місяць', v:ai.Li||0},
    {key:'mi', n:'Mᵢ', label:'затемнення', v:ai.Mi||0},
    {key:'di', n:'Dᵢ', label:'DST', v:ai.Di||0}
  ].sort((a,b) => Math.abs(b.v) - Math.abs(a.v));
  const active = raw.filter(d => Math.abs(d.v) >= 0.05);
  const main = active[0] || null;
  // Resolve eᵢ to human event name
  let mainLabel = main ? main.label : '';
  if(main && main.key === 'ei'){
    const top = parseETipTop(ai.eTip, 1);
    if(top.length){
      // v83f: truncate long event names for hero/meta (max 30 chars)
      let lbl = top[0].label;
      if(lbl.length > 30) lbl = lbl.slice(0, 28).trim() + '…';
      mainLabel = lbl;
    }
  }
  const mainStr = main ? `${mainLabel} (${main.v>0?'+':''}${main.v.toFixed(1)})` : '';
  return { sorted: raw, active, main, mainLabel, mainStr };
}/* NR_FN_END 212 */

/* NR_FN_BEGIN 261 */function enforcePanchFinalPriority(){
  let finalScore = null;
  try {
    const _g = isFinite(window.__uiState?.gNow) ? Number(window.__uiState.gNow) : NaN;
    const _kp = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
    const sig = resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _g, _kp, {isToday:true});
    if (sig && Number.isFinite(Number(sig.decisionScore))) finalScore = Number(sig.decisionScore);
  } catch(_e) { globalThis.NRDiagnostics?.record('catch.187','recoverable');  return; }
  if (!(Number.isFinite(finalScore) && finalScore <= -1)) return;
  document.querySelectorAll('#panchGrid [data-local-action="1"]').forEach(td => {
    if (td.dataset.finalPriorityApplied === String(finalScore)) return;
    const raw = (td.textContent || '').replace(/^✓\s*/, '').replace(/не дозвіл[\s\S]*$/, '').replace(/^Локальн(?:о|а асоціація):\s*/, '').trim();
    td.innerHTML = `<span style="color:#9bb1dc">Локальна асоціація: ${escapeHtml(raw)}</span>`;
    td.dataset.finalPriorityApplied = String(finalScore);
  });
  const bt = document.getElementById('panchBestTime');
  if (bt) {
    const label = bt.querySelector('.pbt-label');
    const hint = bt.querySelector('.pbt-hint');
    if (label) label.textContent = 'Найменше локальне навантаження';
    if (hint) hint.textContent = `Оперативний стан ${finalScore}: це не сприятливе вікно; лише необхідна рутина.`;
  }
}/* NR_FN_END 261 */

/* NR_FN_BEGIN 262 */function syncPanchSummary(){
  const pc=_lastPanchCtx;
  const s=el('panchSummaryLine');
  const piLine=el('panchPiLine');
  const noteEl=el('panchNote');
  if(!pc||!s) return;
  const pi=pc.aiComponents?.Pi||0;
  const ns=pc.nakshatra?.score||0;
  const ts=pc.tithi?.score||0;
  const ys=pc.yoga?.score||0;
  const ks=pc.karana?.score||0;
  const total=ns+ts+ys+ks;
  const ai=pc.aiComponents||{};
  const astroTotal=Number(ai.Li||0)+Number(ai.Mi||0)+Number(ai.ei||0)+Number(ai.Pi||0)+Number(ai.Di||0);
  const currentSlot=(typeof getCurrentSlotDecision==='function') ? getCurrentSlotDecision() : null;
  // Pi line with G contribution context. It is already inside G_raw and must
  // never look like a separate green forecast or permission.
  let _panchOpScore = null;
  try {
    const _pg = isFinite(window.__uiState?.gNow) ? Number(window.__uiState.gNow) : NaN;
    const _pk = isFinite(window.__uiState?.kpNow) ? Number(window.__uiState.kpNow) : NaN;
    const _ps = resolveDaySignal_v88825(new Date(todayKyivStr()+'T12:00:00Z'), _pg, _pk, {isToday:true});
    if (_ps && isFinite(_ps.decisionScore)) _panchOpScore = Number(_ps.decisionScore);
  } catch(_e){ window.NRDiagnostics?.record('legacy.catch.190','recoverable'); }
  const _panchRestricted = _panchOpScore !== null && _panchOpScore < 0;
  const piCol = pi>=1?(_panchRestricted?'#cfb6ff':'#7ab8d4'):pi<=-1?'#ff6b6b':'#9bb1dc';
  const piState=pi>=1?'локально підтримує raw-компонент':pi<=-1?'погіршує raw-компонент':'майже нейтральна';
  const _panchGate = _panchRestricted ? ` · оперативний стан ${_panchOpScore} не змінюється` : '';
  if(piLine) piLine.innerHTML=`Pᵢ = <strong style="color:${piCol}">${pi>0?'+':''}${pi.toFixed(1)}</strong> · ${piState}<span style="color:var(--faint);font-size:10px"> · уже всередині G_raw · не окремий прогноз${_panchGate} · noon UTC</span>`;
  // Product summary
  const neg=[],pos=[];
  if(ts<0)neg.push('тітхі');if(ns<0)neg.push('накшатра');if(ys<0)neg.push('йога');if(ks<0)neg.push('карана');
  if(ts>0)pos.push('тітхі');if(ns>0)pos.push('накшатра');if(ys>0)pos.push('йога');if(ks>0)pos.push('карана');
  let summary;
  const _astroTxt=`ΣAᵢ=${astroTotal>=0?'+':''}${astroTotal.toFixed(1)}; Pᵢ=${pi>=0?'+':''}${pi.toFixed(1)} — лише один компонент`;
  if(currentSlot?.blockedNow){
    const _why=currentSlot.reasonsNow.filter(r=>r.startsWith('window:')).map(r=>r.slice(7)).join('+') || (currentSlot.reasonsNow.includes('storm')?'Kp≥5':'активне вікно');
    summary=`Оперативно БЛОК/лише рутина: ${_why}. ${_astroTxt}. Нейтральний Pᵢ не скасовує eᵢ, бурю або часову заборону.`;
  } else if(astroTotal<=-1) summary=`Сумарний astro-контекст несприятливий (${_astroTxt}). Не називати день нейтральним лише через Pᵢ.`;
  else if(astroTotal<1) summary=`Сумарний astro-контекст близький до нейтрального (${_astroTxt}); часові вікна перевіряються окремо.`;
  else summary=`Сумарний astro-контекст підтримує (${_astroTxt}), але це не дозвіл і не заміна оперативного стану.`;
  s.textContent=summary;
  // Action note
  if(noteEl){
    let action;
    if(currentSlot?.blockedNow) action=`Краща дія зараз: ${currentSlot.actionNow||'тільки рутина'}.`;
    else if(astroTotal<=-1) action='Краща дія: сповільнитись, не входити у суперечливі задачі.';
    else if(astroTotal<1) action='Краща дія: тримати стандартний режим без різких маневрів.';
    else action='Краща дія: лише планові дії після перевірки оперативного стану й часових вікон.';
    noteEl.textContent=action;
  }
  try { enforcePanchFinalPriority(); } catch(_ePriority){ window.NRDiagnostics?.record('legacy.catch.191','recoverable'); }
}/* NR_FN_END 262 */

/* NR_FN_BEGIN 279 */function _sin(d){ return Math.sin(d * _RAD); }/* NR_FN_END 279 */

/* NR_FN_BEGIN 280 */function _cos(d){ return Math.cos(d * _RAD); }/* NR_FN_END 280 */

/* NR_FN_BEGIN 282 */function calcSunLongitude(jde) {
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
}/* NR_FN_END 282 */

/* NR_FN_BEGIN 283 */function calcMoonLongitude(jde) {
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
}/* NR_FN_END 283 */

/* NR_FN_BEGIN 286 */function calcNakshatra(lambdaTropical, jde) {
  const ayan = lahiriAyanamsha(__nrUtcJdToTt(jde));
  const lambdaSid = _mod360(lambdaTropical - ayan);
  const idx = Math.floor(lambdaSid / (360/27));      // 0..26
  const pada = Math.floor((lambdaSid % (360/27)) / (360/108)) + 1; // 1..4
  const fraction = (lambdaSid % (360/27)) / (360/27); // 0..1 всередині накшатри
  return { idx, pada, fraction, lambdaSid };
}/* NR_FN_END 286 */

/* NR_FN_BEGIN 287 */function calcTaara(natalIdx, currentIdx) {
  const pos = ((currentIdx - natalIdx) % 27 + 27) % 27 + 1; // 1..27
  const group = ((pos - 1) % 9) + 1; // 1..9
  const danger = TAARA_DANGER.includes(group);
  return { pos, group, danger, name: TAARA_UA[group] || '' };
}/* NR_FN_END 287 */

/* NR_FN_BEGIN 288 */function calcCurrentDasa(natalIdx, fraction, birthJDE, nowJDE) {
  // Господар накшатри народження
  const lordIdx = natalIdx % 9;
  const totalYears = DASA_YEARS[lordIdx];
  // Скільки цього даши вже пройшло на момент народження
  const elapsed0 = fraction * totalYears; // роки вже прожиті всередині накшатри
  const remaining0 = totalYears - elapsed0; // залишок першого даши

  // Будуємо послідовність дашів від народження
  const dasas = [];
  let startJDE = birthJDE;
  let li = lordIdx;
  // перший даша — залишок
  dasas.push({ lord: li, years: remaining0, startJDE });
  startJDE += remaining0 * 365.25;
  li = (li + 1) % 9;
  // наступні повні цикли — достатньо 120 років
  while (startJDE < birthJDE + 120 * 365.25) {
    const y = DASA_YEARS[li];
    dasas.push({ lord: li, years: y, startJDE });
    startJDE += y * 365.25;
    li = (li + 1) % 9;
  }

  // Знаходимо поточний даша
  let current = null;
  for (let i = 0; i < dasas.length - 1; i++) {
    if (nowJDE >= dasas[i].startJDE && nowJDE < dasas[i+1].startJDE) {
      current = dasas[i];
      current.endJDE = dasas[i+1].startJDE;
      break;
    }
  }
  if (!current) current = dasas[dasas.length - 2] || dasas[0];

  const remainYears = (current.endJDE - nowJDE) / 365.25;
  const rem_y = Math.floor(remainYears);
  const rem_m = Math.floor((remainYears - rem_y) * 12);
  return {
    lord: current.lord,
    lordName: NAKSHATRA_LORDS_UA[current.lord],
    remainYears,
    remainStr: `${rem_y}р ${rem_m}м`,
    startJDE: current.startJDE,
    endJDE: current.endJDE
  };
}/* NR_FN_END 288 */

/* NR_FN_BEGIN 289 */function calcAntardasha(dasa, nowJDE) {
  // Antardasha (бхукті) — суб-поділ Mahadasha
  // Тривалість: (maha_years * antar_years / 120) * 365.25 днів
  const mahaYears = DASA_YEARS[dasa.lord];
  const mahaStart = dasa.startJDE;
  const sub = [];
  let t = mahaStart;
  let li = dasa.lord;
  for (let i = 0; i < 9; i++) {
    const dur = (mahaYears * DASA_YEARS[li] / 120) * 365.25;
    sub.push({ lord: li, startJDE: t, endJDE: t + dur, durDays: dur });
    t += dur;
    li = (li + 1) % 9;
  }
  const idx = sub.findIndex(s => nowJDE >= s.startJDE && nowJDE < s.endJDE);
  const cur = idx >= 0 ? sub[idx] : sub[0];
  const next = sub[idx+1] || null;
  const remY = (cur.endJDE - nowJDE) / 365.25;
  const rem_m = Math.floor(remY * 12);
  const rem_d = Math.floor((remY * 12 - rem_m) * 30.4);

  // Progress всередині антардаші (0..1)
  const progress = Math.max(0, Math.min(1, (nowJDE - cur.startJDE) / cur.durDays));

  // Pratyantardasha (рівень 3): (antar_years * pratya_years / 120) * 365.25 днів
  const antarYears = DASA_YEARS[cur.lord];
  const pratSub = [];
  let pt = cur.startJDE;
  let pl = cur.lord;
  for (let i = 0; i < 9; i++) {
    const dur = (antarYears * DASA_YEARS[pl] / 120) * 365.25;
    pratSub.push({ lord: pl, startJDE: pt, endJDE: pt + dur });
    pt += dur;
    pl = (pl + 1) % 9;
  }
  const pidx = pratSub.findIndex(s => nowJDE >= s.startJDE && nowJDE < s.endJDE);
  const pcur = pidx >= 0 ? pratSub[pidx] : pratSub[0];
  const pnext = pratSub[pidx+1] || null;
  const premY = (pcur.endJDE - nowJDE) / 365.25;
  const prem_d = Math.round(premY * 365.25);

  return {
    lordName: NAKSHATRA_LORDS_UA[cur.lord],
    remainStr: rem_m > 0 ? `${rem_m}м ${rem_d}д` : `${rem_d}д`,
    nextLordName: next ? NAKSHATRA_LORDS_UA[next.lord] : '—',
    progress,
    pratyaLordName: NAKSHATRA_LORDS_UA[pcur.lord],
    pratyaRemStr: prem_d > 0 ? `${prem_d}д` : '<1д',
    pratyaNextLordName: pnext ? NAKSHATRA_LORDS_UA[pnext.lord] : '—'
  };
}/* NR_FN_END 289 */

/* NR_FN_BEGIN 290 */function calcSunTimes(dateUTC) {
  const pair = sunRiseSetUTC_Meeus(dateUTC, _userLat, _userLon);
  const midnight = Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate());
  const srH=(pair.sunrise.getTime()-midnight)/3600000, ssH=(pair.sunset.getTime()-midnight)/3600000;
  return {srH,ssH,dayLen:ssH-srH,nightLen:24-(ssH-srH)};
}/* NR_FN_END 290 */

/* NR_FN_BEGIN 292 */function calcHora(dateUTC) {
  const day=_horaSolarDay(dateUTC);
  if(!day)return {planet:null,end:'—',minLeft:0,unavailable:true};
  const now=dateUTC.getTime(), isDay=now<day.set;
  const start=isDay?day.rise:day.set, finish=isDay?day.set:day.nextRise;
  const duration=(finish-start)/12;
  const slot=Math.min(11,Math.floor((now-start)/duration));
  const endMs=start+(slot+1)*duration;
  return {planet:HORA_ORDER[(day.firstIdx+(isDay?0:12)+slot)%7],
    end:new Date(endMs).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}),
    minLeft:Math.ceil((endMs-now)/60000),endMs};
}/* NR_FN_END 292 */

/* NR_FN_BEGIN 293 */function calcHoraSequence(startUTC, endUTC, maxEntries){
  const seq = [];
  let cursor = new Date(startUTC.getTime());
  const endMs = endUTC.getTime();
  const cap = maxEntries || 4;
  let guard = 0;
  // fp371: guard counts calculation attempts, not returned Hora entries.
  // A cursor exactly on a rounded boundary can yield minLeft=0 and needs a
  // one-minute retry; that retry must not consume one of the requested slots.
  while (cursor.getTime() < endMs && seq.length < cap && guard < cap * 4 + 4) {
    guard++;
    const hora = calcHora(cursor);
    if (!hora || !hora.planet) break;
    // v88.9.58-fp240 САМОАУДИТ-ФІКС: на межовому моменті (cursor точно
    // збігається з кінцем хори) calcHora повертає minLeft=0 для хори, що
    // ЩОЙНО закінчилась — реальний тест показав дублікат "Місяць → Місяць"
    // з однаковим часом. Якщо minLeft<=0, ця хора вже фактично не діє —
    // зсуваємо курсор на 1 хв і перераховуємо, НЕ пушимо застарілий запис.
    if (hora.minLeft <= 0) {
      cursor = new Date(cursor.getTime() + 60000);
      continue;
    }
    seq.push({ planet: hora.planet, fromLocal: cursor.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}), endLocal: hora.end });
    const minLeftMs = hora.minLeft * 60000;
    const nextCursorMs = Number.isFinite(hora.endMs) ? hora.endMs : cursor.getTime() + minLeftMs;
    if (nextCursorMs <= cursor.getTime()) break; // захист від нескінченного циклу
    cursor = new Date(nextCursorMs);
  }
  return seq;
}/* NR_FN_END 293 */

/* NR_FN_BEGIN 294 */function calcMoonTransit(nowJDE, fraction) {
  const degLeft = (1 - fraction) * (360/27);
  const daysLeft = degLeft / 13.176;
  const totalMin = Math.round(daysLeft * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { str: h > 0 ? `${h}г ${m}хв` : `${m}хв` };
}/* NR_FN_END 294 */

/* NR_FN_BEGIN 317 */function calcAllHoras(dateUTC) {
  const day=_horaSolarDay(dateUTC);
  if(!day)return {slots:[],srH:NaN,ssH:NaN};
  const midnight=Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate());
  const toH=ms=>(ms-midnight)/3600000;
  const slots=[];
  for(let i=0;i<24;i++){
    const isDay=i<12,start=isDay?day.rise:day.set,end=isDay?day.set:day.nextRise;
    const n=i%12,duration=(end-start)/12;
    slots.push({startH:toH(start+n*duration),endH:toH(start+(n+1)*duration),planet:HORA_ORDER[(day.firstIdx+i)%7],isDay});
  }
  return {slots,srH:toH(day.rise),ssH:toH(day.set)};
}/* NR_FN_END 317 */
