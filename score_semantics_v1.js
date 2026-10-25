// SkyRhythm · score_semantics.js — ЄДИНЕ джерело кольорової семантики ПІДСУМКОВОЇ оцінки.
// Правило власника (25.10.2026): score > 0 → зелений, score === 0 → жовтий, score < 0 → червоний.
// Тільки знак. Жодних діапазонів (+3..+5 тощо). Колір не залежить від теми, NOAA чи джерела.
// Колір ніколи не єдиний носій сенсу: завжди знак числа + слово + форма значка.
(function (root) {
  const SEMANTIC = Object.freeze({
    positive: { token: '--score-pos', label: 'Позитивна оцінка', short: 'Позитивний', icon: '▲', word: 'позитивна' },
    neutral:  { token: '--score-neu', label: 'Нейтральна оцінка', short: 'Нейтральний', icon: '●', word: 'нейтральна' },
    negative: { token: '--score-neg', label: 'Негативна оцінка', short: 'Негативний', icon: '▼', word: 'негативна' },
    missing:  { token: '--score-missing', label: 'Оцінки немає', short: 'Немає даних', icon: '○', word: 'відсутня' }
  });
  // null/undefined/NaN → missing (НЕ 0 і НЕ нейтральний день)
  // Підсумкова оцінка має бути цілим числом у −3…+3. Усе інше (4, −4, 2.5, Infinity, NaN, null, рядки) — НЕ бал.
  function isValidFinal(v) { return typeof v === 'number' && Number.isInteger(v) && v >= -3 && v <= 3; }
  // null/undefined/невалідне → missing (НЕ 0, НЕ нейтральний день, НЕ колір знака)
  function scoreClass(v) {
    if (!isValidFinal(v)) return 'missing';
    if (v > 0) return 'positive';
    if (v < 0) return 'negative';
    return 'neutral';
  }
  // Чи значення взагалі було, але невалідне (для логування/діагностики, не для UI-кольору)
  function isInvalidPresent(v) { return v !== null && v !== undefined && !isValidFinal(v); }
  function formatScore(v) {
    if (scoreClass(v) === 'missing') return '—';
    if (v > 0) return '+' + v;
    if (v < 0) return '−' + Math.abs(v); // типографський мінус U+2212
    return '0';
  }
  function describe(v, sourceLabel) {
    const c = scoreClass(v); const s = SEMANTIC[c];
    const labels={uk:['Оцінка','позитивна','нейтральна','негативна','Оцінки на цю дату немає','джерело'],en:['Score','positive','neutral','negative','No score for this date','source'],es:['Puntuación','positiva','neutra','negativa','No hay puntuación para esta fecha','fuente'],fr:['Note','positive','neutre','négative','Aucune note pour cette date','source']}[root.NRLocale?.language||'uk'];
    const l=labels||['Score','positive','neutral','negative','No score for this date','source'];
    return c==='missing'?l[4]:`${l[0]} ${formatScore(v)}, ${l[{positive:1,neutral:2,negative:3}[c]]}`+(sourceLabel?`, ${l[5]}: ${sourceLabel}`:'');
  }
  function color(v){return {positive:"#63e6ad",neutral:"#ffdc75",negative:"#ff858d",missing:"#bac5d1"}[scoreClass(v)];}
  const api = { color, SEMANTIC, scoreClass, isValidFinal, isInvalidPresent, formatScore, describe };
  root.SkyScore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
