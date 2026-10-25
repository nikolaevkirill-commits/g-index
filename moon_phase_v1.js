// SkyRhythm · moon_phase.js — illuminated fraction k of the Moon (Meeus, Astronomical Algorithms, 2nd ed., ch. 47 low-precision + ch. 48).
// Pure function, no network. Accuracy target: |Δk| ≤ 0.01 vs PyEphem.
(function (root) {
  const rad = Math.PI / 180;
  const norm = (x) => ((x % 360) + 360) % 360;
  function kAt(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T ** 4 / 113065000);
    const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000);
    const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000);
    const i = 180 - D - 6.289 * Math.sin(Mp * rad) + 2.100 * Math.sin(M * rad) - 1.274 * Math.sin((2 * D - Mp) * rad)
      - 0.658 * Math.sin(2 * D * rad) - 0.214 * Math.sin(2 * Mp * rad) - 0.110 * Math.sin(D * rad);
    return (1 + Math.cos(i * rad)) / 2;
  }
  // waxing = illuminated fraction grows over the next hour (robust near new/full moon)
  function moonIllumination(date) {
    const k = kAt(date);
    const k1 = kAt(new Date(date.getTime() + 3600000));
    return { k: Math.round(k * 10000) / 10000, waxing: k1 > k };
  }
  root.SkyMoon = { moonIllumination };
  if (typeof module !== 'undefined') module.exports = { moonIllumination };
})(typeof window !== 'undefined' ? window : globalThis);
