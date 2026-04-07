# GitHub Pages Deploy — G-Index v68

**Репо:** `nikolaevkirill-commits/g-index`  
**Гілка:** `gh-pages` або `main` + `/deploy` subfolder  
**URL:** https://nikolaevkirill-commits.github.io/g-index/deploy/

## Файли для завантаження (всі з outputs/)

| Файл | Дія |
|---|---|
| `index.html` | замінити існуючий |
| `sw.js` | замінити існуючий |
| `manifest.json` | замінити існуючий |
| `icon192.png` | з проекту (без змін) |
| `icon512.png` | з проекту (без змін) |

## Кроки

```bash
git clone https://github.com/nikolaevkirill-commits/g-index
cd g-index

# скопіювати файли в deploy/
cp index.html deploy/
cp sw.js deploy/
cp manifest.json deploy/
# icon файли вже мають бути в deploy/ корені

git add deploy/
git commit -m "deploy v68: engine v14.6, Sn>150 fix, PWA icons fixed, Navaratri 1.5"
git push
```

## Що виправлено в v68 vs v67

- `computeAi`: Purnima+kp_storm→Li=−2, Purnima+kp_high→Li=−1 (engine v14.6 sync)
- `computeAi`: Sn>150 → kpPen−=0.4 (engine v14.6 sync)
- PWA icon paths: `icons/icon-*.png` → `icon192.png` / `icon512.png` (SW install fix)
- Navaratri ei weight: 2 → 1.5 (уніфікація з engine WEIGHTS)
- SW cache: `g-index-shell-v68`
- Footer accuracy: 76.3% (n=169, engine v14.6)

## Перевірка після deploy

1. Відкрити https://nikolaevkirill-commits.github.io/g-index/deploy/
2. DevTools → Application → Service Workers → статус "activated"
3. DevTools → Application → Manifest → іконки завантажились
4. Lighthouse → PWA score (має бути > 0)
