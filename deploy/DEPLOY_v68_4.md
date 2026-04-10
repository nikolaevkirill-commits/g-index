# Deploy — G-Index v68.4

## Зміни vs v68.3

| # | Патч | Тип |
|---|---|---|
| P1–P10 | (з v68.3) | inherited |
| P11 | Fix Dᵢ дублікат у формулі | bug fix |
| P12 | **Action Bar** (DO/AVOID) під G badge | decision layer |
| P13 | G decomposition → `<details>` collapse | UX declutter |
| P14 | Hora + Solar graphic → `<details>` collapse | UX declutter |
| P15 | "Поточний стан" → "Рішення на зараз" | naming |

## Файли

| Файл | Джерело |
|---|---|
| `deploy/index.html` | `index_v68_4.html` |
| `deploy/sw.js` | `sw.js` (cache: `g-index-shell-v68-4`) |

## Deploy

```bash
cd g-index
copy index_v68_4.html deploy\index.html
copy sw.js deploy\sw.js
git add deploy/
git commit -m "v68.4: action bar, collapse decomp/hora/solar, fix Di dupe"
git push
```

## Перевірка

1. Hard refresh → SW = `g-index-shell-v68-4`
2. DO/AVOID bar видний одразу під G badge
3. "Аудит G (деталі)" — collapsed, розкривається
4. Hora таймлайн — collapsed
5. Solar graphic / orrery — collapsed (всередині Hora details)
6. Заголовок: "Рішення на зараз"
7. Формула: один Dᵢ (не подвоєний)
