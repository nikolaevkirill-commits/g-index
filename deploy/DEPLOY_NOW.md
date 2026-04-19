# DEPLOY v87.37 — швидкі інструкції

## 1. Файли для завантаження з outputs/

| Файл | Куди | Навіщо |
|---|---|---|
| `index.html` | `D:\ПРОГНОЗ\прогноз по ексель\` | Головний файл |
| `sw.js` | `D:\ПРОГНОЗ\прогноз по ексель\` | Service Worker |
| `HANDOFF_v87_37.md` | `D:\ПРОГНОЗ\прогноз по ексель\` | Referece для наступної сесії |
| `supabase_schema.sql` | тримай локально | Для Supabase setup (коли будеш готовий) |

## 2. Git push (3 команди)

```powershell
cd D:\ПРОГНОЗ\прогноз по ексель\
git add index.html sw.js
git commit -m "v87.22-v87.37: eclipse NASA, IANA, ICS, compare, A2-full, panchanga weight, forward timeline, backend scaffold"
git push
```

## 3. Deploy verification (5 хвилин після push)

1. Відкрий **Incognito** → `https://nikolaevkirill-commits.github.io/g-index/deploy/?v=37`
2. Чекай повне завантаження (~3 сек)

### Self-check (за порядком, знизу-догори)

| # | Перевірка | Очікуваний результат |
|---|---|---|
| 1 | Title у вкладці | `G-Index — Космофізичний дашборд v87.37` |
| 2 | Hero G рендер | Показує поточне G з числом + категорією |
| 3 | Header — нові кнопки | `🔐 Увійти` і `🔔` поруч із Free/Pro badge |
| 4 | Клік `🔐` | Alert "Бекенд ще не налаштовано. Скоро!" ← очікувано |
| 5 | Клік `🔔` | Paywall або alert — очікувано (inert) |
| 6 | Planetary rhythm label | `(Europe/Kiev, UTC+3, 50°N)` або аналог |
| 7 | Картка "Прогноз на 27 днів" | 3 шари: графік + **timeline** + таблиця |
| 8 | Forward timeline | 27 sticks + кнопки `½× 1× 2× ▶ ⌖` |
| 9 | Клік по stick | Detail panel змінюється (дата + G + Kp + ΣAᵢ) |
| 10 | ▶ Play → `2×` | Timeline прокручується у 2× швидше |
| 11 | Resize browser < 480px | Timeline звужується до 14 днів (з `14/27 дн.` hint) |
| 12 | Compare periods block | Toggle "Рік тому (Σ)" / "4 тижні (G)" |
| 13 | `⬇ .ics` кнопка | Завантажує `.ics` календар |
| 14 | Panchanga-таблиця | Горизонтальні смужки поруч з emoji (зел/чер) |

### Address-bar тести (fallback для діагностики)

```
javascript:void(__testEclipseCatalog())  → має alert "8/8 passed"
javascript:void(__testTimezone())         → alert з iana/offset
```

## 4. Якщо щось не так

- Стара версія показується → `🗑 Кеш` кнопка в хедері → reload
- Блок відсутній → перевір, що `?v=37` у URL (обхід cache)
- SW не оновлюється → Incognito або hard reload Ctrl+Shift+R

## 5. Наступна сесія — backend activation (коли будеш готовий)

### Крок 1: Supabase (5 хв)

1. Реєстрація → https://supabase.com/dashboard (free, без картки)
2. **New project** → регіон EU (Frankfurt/Zurich)
3. **SQL Editor** → paste `supabase_schema.sql` → **Run** → перевір: 6 таблиць + 1 view в Table Editor
4. **Settings → API** → скопіюй:
   - `Project URL` (https://xxxxx.supabase.co)
   - `anon public` key (довгий `eyJ...`)
5. **Authentication → Providers → Email** → перевір що Enabled (default)

### Крок 2: VAPID keys (2 хв)

1. Відкрий https://vapidkeys.com/ → Generate
2. Скопіюй **обидва** ключі в безпечне місце
3. Public → piszesz мені, private → зберігай для Edge Function пізніше

### Крок 3: дай мені 3 рядки

```
SUPA_URL:         https://xxxxx.supabase.co
SUPA_ANON_KEY:    eyJ...
VAPID_PUBLIC_KEY: BK...
```

Наступним ходом я додам блок у `<head>` → auth + push будуть live.

## 6. Session closed

Якщо сьогодні не будеш робити backend — просто зроби deploy і закрий. Все збережено, HANDOFF готовий для наступного старту.

Engine v17.0 не торкано (SM 87.1% збережено).
Dashboard v87.37 — повний client-only + backend scaffold inert.
