# GitHub Pages Deploy — G-Index v68.3

**Зміни vs v68.2:**

| ID | Патч |
|----|------|
| P1 | `classifyG()` — continuous thresholds (парність з badge/filter) |
| P2 | Risk % → band-only (Низький/Помірний/Підвищений/Високий) у Now, 3-day, 27-day |
| P3 | Synthetic mode: orange border на nowCard + risk block прихований |
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
git commit -m "deploy v68.3: classifyG parity, risk band-only, synthetic guard"
git push
```

## Перевірка

1. Hard refresh → DevTools → SW = `g-index-shell-v68-3`
2. G=0.49 → текст "Нейтральний" (не "Помірно сприятливий")
3. Risk block: band labels, без %
4. Відключити мережу → nowCard orange border, risk block hidden
