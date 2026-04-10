# GitHub Pages Deploy — G-Index v68.3

**Зміни vs v68.2:**

| ID | Патч |
|----|------|
| P1 | `classifyG()` — continuous thresholds (парність з badge/filter) |
| P2 | Risk % → band-only (Низький/Помірний/Підвищений/Високий) у Now, 3-day, 27-day |
| P3 | Synthetic mode: orange border на nowCard + risk block прихований |
| P4 | **CRITICAL:** `moonPhaseAngle()` — true Meeus elongation замість simplified synodic (~7° error). Виправляє Tithi і Karana |
| P5 | "Чому саме так" — top-3 drivers by |value| після risk block |
| P6 | "Вчора→Сьогодні→Завтра" — comparison strip з 3-day даних |
| P7 | Flow canvas видалений (був display:none, забирав місце в DOM) |
| SW | Cache: `g-index-shell-v68-3`, коментар TTL 3h→1h виправлений |

## Файли

| Файл | Джерело |
|---|---|
| `deploy/index.html` | `index_v68_3.html` → перейменувати |
| `deploy/sw.js` | `sw.js` (cache: `g-index-shell-v68-3`) |

## Deploy

```bash
cd g-index
copy index_v68_3.html deploy\index.html
copy sw.js deploy\sw.js
git add deploy/
git commit -m "deploy v68.3: Meeus tithi fix, classifyG parity, risk bands, why-today, day-compare"
git push
```

## Перевірка

1. Hard refresh → DevTools → SW = `g-index-shell-v68-3`
2. G=0.49 → текст "Нейтральний" (не "Помірно сприятливий")
3. Risk block: band labels, без %
4. Відключити мережу → nowCard orange border, risk block hidden
5. Panchanga 10.04.2026: Tithi=Krishna Ashtami (не Navami), Karana=Kaulava (не Taitila)
6. Блок "Чому саме так" — 2-3 кольорових chips під risk block
7. Strip "вчора→сьогодні→завтра" — 3 G-значення в ряд
