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
    return c === 'missing' ? 'Оцінки на цю дату немає' : `Оцінка ${formatScore(v)}, ${s.word}` + (sourceLabel ? `, джерело: ${sourceLabel}` : '');
  }
  function color(v){return {positive:"#63e6ad",neutral:"#ffdc75",negative:"#ff858d",missing:"#bac5d1"}[scoreClass(v)];}
  const api = { color, SEMANTIC, scoreClass, isValidFinal, isInvalidPresent, formatScore, describe };
  root.SkyScore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
