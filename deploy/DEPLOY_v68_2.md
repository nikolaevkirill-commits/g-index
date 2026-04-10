# GitHub Pages Deploy — G-Index v68.2

**Репо:** `nikolaevkirill-commits/g-index`
**Гілка:** `main` + `/deploy` subfolder
**URL:** https://nikolaevkirill-commits.github.io/g-index/deploy/

## Файли для deploy/

| Файл | Джерело |
|---|---|
| `index.html` | `index_v68_2.html` → перейменувати |
| `sw.js` | `sw.js` (cache: `g-index-shell-v68-2`) |
| `manifest.json` | без змін (з проекту) |
| `icon192.png` | без змін |
| `icon512.png` | без змін |

## Кроки

```bash
cd D:\ПРОГНОЗ\прогноз\ по\ ексель\

# Якщо ще не клоновано:
git clone https://github.com/nikolaevkirill-commits/g-index
cd g-index

# Скопіювати файли
copy index_v68_2.html deploy\index.html
copy sw.js deploy\sw.js
# manifest.json і іконки — вже в deploy/

git add deploy/
git commit -m "deploy v68.2: text shortened, flow canvas hidden, planet contrast, float-point fix"
git push
```

## Що змінено в v68.2 vs v68.1

| ID | Зміна |
|----|-------|
| D1 | Decomposition table: текст скорочений |
| D2 | Flow canvas: `display:none` (−90px) |
| D4 | Planet canvas: min 180px, cap 260px |
| D5 | Orbits: контраст підвищений |
| SW | Cache: `g-index-shell-v68-2` |

## Перевірка після deploy

1. Відкрити https://nikolaevkirill-commits.github.io/g-index/deploy/
2. Hard refresh: Ctrl+Shift+R
3. DevTools → Application → Service Workers → `g-index-shell-v68-2`
4. Перевірити: planet canvas видніший, таблиця коротша, flow canvas прихований
