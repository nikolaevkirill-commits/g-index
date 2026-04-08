# GitHub Pages Deploy — G-Index v70

**URL:** https://nikolaevkirill-commits.github.io/g-index/deploy/
**Engine:** v14.8 (SignMatch all 69.2% n=169, +6.5pp vs v14.5)
**Spec:** CANONICAL_SPEC_v1.3 (оновлено під v14.8)
**SW cache:** g-index-shell-v70

---

## Команди деплою (виконати локально)

```bash
cp outputs/index.html    deploy/index.html
cp outputs/sw.js         deploy/sw.js
cp outputs/manifest.json deploy/manifest.json
cp outputs/icon192.png   deploy/icon192.png
cp outputs/icon512.png   deploy/icon512.png
cp outputs/.nojekyll     deploy/.nojekyll
cp outputs/_config.yml   _config.yml
cp outputs/forecast_engine_v14_8.py forecast_engine_v14_8.py

git add deploy/ _config.yml forecast_engine_v14_8.py
git commit -m "deploy v70 + engine v14.8: trident/luck/ganesh fix, SignMatch 69.2%"
git push origin main
```

---

## Що виправлено в v70 vs v68

- `index.html` v70: TECH-2 Surya Sankranti sidereal Lahiri; Personal Free tier; ±1 Nakshatra warning; swStaleBar
- `sw.js` v70: CORS-проксі в DATA_PATTERNS; TTL 1h; postMessage SW_STALE_DATA
- `manifest.json`: id + scope + maskable + абсолютні шляхи іконок
- SW cache: `g-index-shell-v70`
- Engine v14.8: FIX-1 `⚡ Трезубець` bolt-position detect; FIX-2 `Удача🟢` + місячний guard; FIX-3 `Нова одежда` + Amavasya; FIX-4 `Ганеша ⚡` → −1
- SignMatch all n=169: 62.7% (v14.5) → **69.2% (v14.8)** (+6.5pp)

---

## Post-deploy перевірка

```
1. Відкрий https://nikolaevkirill-commits.github.io/g-index/deploy/
2. DevTools → Application → Service Worker: activated and controlling?
3. Manifest: start_url=/g-index/deploy/, іконки без 404?
4. Offline: перевантаж без мережі — shell відкривається?
5. Console: немає ERR_FAILED для NOAA URLs?
```

---

## Архітектура деплою

- **Pages source:** main branch, folder `/deploy`
- **Jekyll:** root `_config.yml` з `baseurl: /g-index/deploy`
- **Статичні файли:** `/deploy/index.html`, `/deploy/sw.js`, `/deploy/manifest.json`
- **`.nojekyll`:** у папці `/deploy` — вимикає Jekyll-обробку для статичних assets

---

## Відкриті задачі

| ID | Задача | Пріоритет |
|---|---|---|
| TECH-8 | Розширення датасету → 365d (SE ±6.5pp при n=51) | R&D |
| TECH-4 | CSP + allowlist | Фаза 2 |
| TECH-5 | Cloudflare Worker 27-day.txt | Фаза 2 |
| holdout | Запустити holdout_pipeline.py з engine v14.8 (оновити n=51 метрику) | Наступна сесія |
| accuracy | Оновити footer dashboard: 69.2% all n=169 або holdout після re-run | Після holdout |
