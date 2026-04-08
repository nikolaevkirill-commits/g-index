# G-Index CANONICAL_SPEC v1.3
**Дата:** 08.04.2026 | **Engine:** v14.8 | **Dashboard:** v70 | **Status:** FROZEN

> Зміни vs v1.2: (1) Виправлено Pᵢ_max 3.6→3.2; (2) Закрито "дірку" Kp 4–5 у таблиці (kp_med покриває 3≤Kp<5); (3) Зафіксовано sampling 12:00 UTC для Panchanga; (4) Формалізовано деградацію eclipse post-2030; (5) new_year: зафіксовано статус числової логіки; (6) Lᵢ домен уточнено; (7) TECH-2: Surya Sankranti в dashboard autoComputedExtras (sidereal Lahiri); (8) Personal module: Free tier (paywall знятий).
> Кожен фактор має чіткий статус: **Production** / **Advisory** / **R&D** / **Disabled**.
> При конфлікті між документами — цей файл має пріоритет.

---

## 1. Канонічна формула G

```
G = Kp − 2 + ΣAᵢ

ΣAᵢ = Lᵢ + Mᵢ + eᵢ + Pᵢ + Dᵢ

Lᵢ ∈ {−3, −2, −1, 0}  — місячна фаза (dashboard); engine: threshold classifier
Mᵢ ∈ {−4, −3, −1, 0}  — затемнення
eᵢ ∈ [−6, +5]          — події (Jyotish теги + автоматичні)
Pᵢ = PCL_raw × 0.4 × sin²(φ_rad/2)   ∈ [−4.4, +3.2]   ← виправлено (було +3.6)
Dᵢ ∈ {−2, −1, 0}      — Dst-компонент (сьогодні only)
ΣAᵢ ∈ [−10, +9]
G ∈ [−12, +16] (реально ≈ −5..+7)
```

**φ_rad = phaseDeg × π/180, де phaseDeg = wrap360(λM_trop − λS_trop)**
**wrap360(x) = ((x % 360) + 360) % 360**

**Статус формули: Production**
**Метрика:** SignMatch 78.4% holdout (n=51), 68.0% all (n=169), engine v14.8, 2024-08–2026-04

### ARCH-1 — Архітектурна розбіжність (задокументована)
| Контекст | Алгоритм |
|---|---|
| Dashboard | Адитивна формула G = Kp−2 + ΣAᵢ (неперервна) |
| Engine Python | Threshold classifier: `score_day()` → base ∈ {−3..3} |
| Статус | Обидва коректні для своїх контекстів. НЕ усувати без re-validation |

Pᵢ має статус Advisory, але **включений у Production-формулу dashboard** за рішенням v1.1. Це свідомий компроміс: PCL_SCALE=0.4 обмежує вплив. Умова виведення з Production: окрема 365d валідація Pᵢ з негативним результатом.

---

## 2. Компоненти G — детальний канон

### 2.1 Kp-компонент (Kp − 2)
| Параметр | Значення | Статус |
|---|---|---|
| Джерело | NOAA SWPC noaa-planetary-k-index.json | Production |
| Kp ≤ 2 | kp_vlow бонус +0.8 до score | Production |
| 2 < Kp < 3 | kp_low бонус +0.3 | Production |
| **3 ≤ Kp < 5** | **kp_med штраф −0.2** | **Production** |
| 5 ≤ Kp < 7 | kp_high штраф −1.0 | Production |
| Kp ≥ 7 | kp_storm штраф −2.5 | Production |

**Примітка:** kp_med покриває весь діапазон 3≤Kp<5, включно з 4≤Kp<5. "Дірки" немає.
Бонуси/штрафи застосовуються до `total` (engine score), **не** до G напряму.

### 2.2 Lᵢ — місячна фаза
| Умова | Значення | Контекст | Статус |
|---|---|---|---|
| Amavasya (tithiIdx=29, φ≈348-360°) | Lᵢ = −3 | Dashboard + Engine | Production |
| Purnima + Kp ≥ 7 (G3+ буря) | Lᵢ = −2 (v14.6, Cajochen 2013) | Dashboard | Production |
| Purnima + 5 ≤ Kp < 7 (G1-G2) | Lᵢ = −1 (v14.6) | Dashboard | Production |
| Purnima + Kp < 5 (tithiIdx=14) | Lᵢ = 0 (нейтральна, v14.2) | Dashboard | Production |
| Всі інші tithі | Lᵢ = 0 | Dashboard | Production |

**Домен dashboard:** Lᵢ ∈ {−3, −2, −1, 0}
**Engine:** Lᵢ як окремого компонента немає — логіка фази вбудована в threshold classifier.

### 2.3 Mᵢ — затемнення
| Умова | Значення | Статус |
|---|---|---|
| День затемнення | Mi = −4 | Production |
| ±1 день | Mi = −3 | Production |
| ±2..±3 дні | Mi = −1 | Production |
| Поза вікном | Mi = 0 | Production |
| Джерело (основне) | NASA Five Millennium Canon (hardcoded 2025-2030) | Production |
| Джерело (advisory) | timeanddate.com scraping | Advisory |
| **Поза покриттям (post-2030)** | **Mi = 0 + confidence_flag=LOW** | **Production** |
| Mi = −2 | НЕ використовується — ВИДАЛЕНО | Disabled |

**Деградація post-2030:** якщо дата виходить за межі hardcoded-списку і scraping недоступний → Mi = 0, dashboard показує маркер "⚠ дані затемнень неповні". Розширення покриття — TECH backlog.

**Пріоритет джерел:** hardcoded NASA > verified scraping. При конфлікті — hardcoded.

### 2.4 eᵢ — події
| Фактор | Вага | Статус |
|---|---|---|
| Amavasya день мертвих | −4 | Production |
| День порожні руки | −3 | Production |
| Екадаші | −2 | Production |
| 1 місячний день (Pratipada) | +2 | Production |
| Сурья Санкранті | −2 | Production |
| Russell-McPherron (Kp≥5) | −2 | Production |
| Russell-McPherron (3≤Kp<5) | −1 | Advisory |
| Russell-McPherron (Kp<3) | 0 (не застосовується) | Production |
| Вікна R-M: весна 05.03–04.04, осінь 07.09–07.10 | межі інклюзивні, UTC | Production (Cliver 2002) |

**Автоматичні eᵢ теги:**
| Тег | Джерело | Статус |
|---|---|---|
| затемнення | auto_tag_generator.py | Production |
| Амавасья🌑, Повний місяць🌕, Екадаші🥛 | auto_tag_generator.py (астрономічно) | Production |
| Сурья☀ (sidereal Lahiri) | auto_tag_generator.py v1.1 + dashboard autoComputedExtras (TECH-2, v70) | Production |
| Ме/Юп/Са/Ве/Ма_ретро | auto_tag_generator.py | Advisory |

**Правила блокування eᵢ (v14.8):**
| Тег | Правило | Статус |
|---|---|---|
| retro_end (без позитивного тегу) | override −3 | Production |
| retro_end + ❤/✈/⊕/💎/⭐/🟢 | retro_end ігнорується, рахується решта тегів | Production (v14.7) |
| Місячний нов.рік (new_year) | числова логіка (вага з WEIGHT_E_EVENTS); НЕ blocking | Production (v14.7) |
| Місячний нов.рік (до v14.6) | override −3 якщо без ❤ | Disabled |
| `⚡ Трезубець` (bolt-first) | override −2 (−3 при Kp≥7); bolt-position < trident-position | Production (v14.8) |
| `Трезубець ⚡` (trident-first) + ❤ | override +1; ❤ рятує trident-контекст | Production (v14.8) |
| `Трезубець ⚡` (trident-first) без ❤ | override 0..+2 залежно від Kp | Production (v14.8) |
| `Ганеша ⚡` (без Наваратрі) | override −1 (не −3); пуджа-контекст, не порожні руки | Production (v14.8) |
| `Удача🟢` + Амавасья | override −3 (місячний блок переважає) | Production (v14.8) |
| `Удача🟢` + Пурніма + kp_med/high/storm | override −2 | Production (v14.8) |
| `Нова одежда` + Амавасья | override −3 | Production (v14.8) |

**Агрегація eᵢ:** сума всіх застосовних ваг. Blocking-override (amavasya, ekadashi, surya, retro_end без позитивного тегу) повертає значення напряму, минаючи суму. Теги не є взаємовиключними, якщо не зазначено інше.

### 2.5 Pᵢ — Panchanga Calendar Layer
```
Pᵢ = PCL_raw × PCL_SCALE × lunarMod

PCL_raw = Tithi_score + Vara_score + Nak_score + Yoga_score + Karana_score
PCL_SCALE = 0.4
lunarMod = sin²(φ_rad/2),  φ_rad = phaseDeg × π/180
         = 0 при новолунні (φ=0°), 1 при повні (φ=180°)

Pᵢ_max = PCL_raw_max × 0.4 × 1 = (2+2+2+2+0) × 0.4 = 3.2
Pᵢ_min ≈ −4.4 (теоретично; реально компоненти не досягають мінімуму одночасно)
```

**Статус: Advisory** (R&D до окремої валідації Pᵢ на 365+ днях)
Включений у Production-формулу dashboard (PCL_SCALE=0.4 обмежує вплив). Див. ARCH-1.

| Параметр | Ваги | Джерело | Статус |
|---|---|---|---|
| Tithi score | −3..+2 (30 значень) | BPHS | Advisory |
| Vara score | −1..+2 (7 значень) | BPHS | Advisory |
| Nakshatra score | −2..+2 (27 нак.) | BPHS (Lahiri sidereal) | Advisory |
| Yoga score | −3..+2 (27 yoga) | BPHS (sidereal) | Advisory |
| Karana score | −2..0 (60 kar.) | BPHS | Advisory |
| Purnima в Pi | 0 (нейтральна, v14.2) | — | Production |
| Amavasya в Pi | Виключена (вже в Li) | — | Production |
| Ekadashi в Pi | Виключена (вже в ei) | — | Production |

**Chandra Rashi, Nakshatra Pada:** відображаються у UI, не входять в G. Статус: Informational.

**Hora (×0.2):** тільки для профілів mil/trader. Статус: **R&D** (evidenceInsufficient=true).

### 2.6 Dᵢ — Dst-компонент
| Умова | Значення | Статус |
|---|---|---|
| Dst > −50 нТл | Di = 0 | Production |
| −100 < Dst ≤ −50 нТл | Di = −1 | Production |
| Dst ≤ −100 нТл | Di = −2 | Production |
| Майбутні дати | Di = 0 (завжди; Dst не прогнозується) | Production |
| "Сьогодні" | визначається відносно UTC-дня | Production |
| Джерело | Kyoto WDC (kyoto-dst.json) | Production |

### 2.7 Sn (Wolf number) корекція
| Умова | Ефект | Статус |
|---|---|---|
| Sn > 150 | kp_pen −= 0.4 (в engine score) | Production |
| Sn у dashboard | Інформаційно (Science Bar) | Advisory |

### 2.8 F10.7 корекція
| Умова | Ефект | Статус |
|---|---|---|
| F10.7 > 200 sfu | kp_pen −= 0.3 (в engine score) | Production |
| F10.7 у dashboard | Інформаційно (27-day tooltip) | Advisory |

---

## 3. Bz / Vsw — Solar Wind
**Статус: Advisory / Context only — НЕ входить в G**

| Параметр | Поріг | Відображення | Статус |
|---|---|---|---|
| IMF Bz | < −10 нТл | Science Bar + попередження | Advisory |
| Vsw | > 600 км/с | Science Bar + попередження | Advisory |

Джерело: NOAA propagated-solar-wind. DSCOVR.

---

## 4. Panchanga — Канон розрахунку

### 4.1 Астрономічна база
| Параметр | Метод | Точність | Статус |
|---|---|---|---|
| Місячна довгота | Meeus Ch.47 (повні таблиці ΔL, ΔR, ΔB) | ~0.01° | Production |
| Сонячна довгота | Meeus Ch.25 (calcSunLongitude) | ~0.01° | Production |
| Аянамша | Lahiri ICRC 1955: 23.853° + 50.2388475″/рік від J2000.0 | 0.4 arcsec | Production |
| Координати | Tropical → sidereal через Lahiri | — | Production |
| Surya Sankranti | Sidereal (Lahiri) ingress, НЕ tropical | — | Production (v1.1) |
| ΔT (UTC→TT) | ~69s — ігнорується (похибка λ < 0.001°, << ширина накшатри 13.33°) | несуттєво | Production |

### 4.2 П'ять ангів (Панча-анга)
| Анга | Формула | Статус |
|---|---|---|
| Tithi | floor(φ_moon/12) mod 30, φ = wrap360(λM_trop − λS_trop) | Production |
| Vara | getUTCDay() UTC (без sunrise boundary) | Advisory |
| Nakshatra | floor(λM_sid × 27/360), 0-based | Production |
| Yoga | floor((λS_sid + λM_sid) mod 360 / (360/27)) | Production |
| Karana | floor(φ_moon/6) mod 60 | Production |

**Математичний mod:** `modN(k,N) = ((k % N) + N) % N` — коректний для від'ємних.
**Yoga константа:** 360/27 (без округлення), не 13.333.

### 4.3 Часова модель (sampling)
| Параметр | Значення | Статус |
|---|---|---|
| **Точка семплінгу Panchanga** | **12:00 UTC поточного дня** | **Production** |
| Межа "дня" | UTC 00:00–23:59:59 | Production |
| Sunrise boundary | НЕ використовується — відома похибка ±1 tithi поблизу переходів | Advisory |
| "Сьогодні" для Dᵢ | UTC-день (00:00–23:59:59 UTC) | Production |
| R-M вікна | інклюзивні межі, UTC-день (05.03 00:00 – 04.04 23:59 UTC та 07.09 – 07.10) | Production |
| Rahu Kalam | UTC + апроксимований локальний час (без DST-корекції) | Advisory |

### 4.4 Відомі обмеження Panchanga
1. **Sunrise boundary:** Vara і Tithi від 12:00 UTC. Похибка ±1 tithi при переходах поблизу сходу сонця.
2. **Swiss Ephemeris:** не використовується. Для Nakshatra (ширина 13.33°) похибка Meeus несуттєва.
3. **DST:** Rahu Kalam не коригується на DST — апроксимація.

---

## 5. Особистий розрахунок (Personal Layer)

**Статус: Experimental / Free tier** (paywall знятий у dashboard v70)

| Функція | Метод | Статус |
|---|---|---|
| Janma Nakshatra | Meeus Ch.47 + Lahiri, дата/час народження | Experimental |
| Час не вказано | Розрахунок від 12:00; попередження ±1 Nakshatra у UI | Experimental |
| Taara | pos = ((cur − natal) mod 27 + 27) mod 27 + 1 | Experimental |
| Taara небезпечні | pos ∈ {1,3,5,7} | Experimental |
| Vimsottari Mahadasha | elapsed = fraction × lord_years від JDE | Experimental |
| Antardasha | dur = maha_years × antar_years / 120 × 365.25 | Experimental |
| Pratyantardasha | аналогічно Antardasha | Experimental |
| G_os (Gos) | G + deltaTaara + deltaDasa + deltaHora, clamp[−5,+5] | R&D |

---

## 6. Reliability / Confidence

| Параметр | Значення | Статус |
|---|---|---|
| SignMatch all n=169 | 68.0% (115/169) | Validated (engine v14.8) |
| SignMatch all n=169 (v14.5 baseline) | 62.7% (106/169) | Reference |
| SignMatch holdout n=51 | 78.4% (40/51) | Validated (engine v14.8) |
| Holdout AUC | 0.784 PASS (v14.8) | Validated |
| Ablation eᵢ негат. | ΔSM −20.7% (критичний компонент) | Validated |
| Ablation Lᵢ / Kp | ΔSM −3.6% кожен | Validated |
| Platt SOFT AUC | 0.777 (holdout) | Validated |
| Platt HARD AUC | 0.790 (holdout) | Validated |
| Публікація методології | Відсутня | R&D |

**SignMatch:** sign(G_engine) == sign(PDF_score) для денної оцінки (G>0 → позитив, G<0 → негатив, G=0 → нейтрал).
**SOFT risk:** P(PDF ≤ 0 | G) — Platt σ(+0.2459 − 0.5011×G).
**HARD risk:** P(PDF ≤ −2 | G) — Platt σ(−0.5988 − 0.6437×G).
**Holdout:** 70/30 split, train n=118, holdout n=51. SE ≈ ±6.5pp при n=51 → патчі <3pp статистично незначимі.

**Мінімум для публічного release:** holdout 365+ днів, confusion matrix, AUC ≥ 0.70.

---

## 7. Дані — джерела і статус

| Джерело | URL | Оновлення | CORS | Статус |
|---|---|---|---|---|
| Kp obs | noaa-planetary-k-index.json | 3h | OK | Production |
| Kp 3-day | noaa-planetary-k-index-forecast.json | 3h | OK | Production |
| Kp 27-day | 27-day-outlook.txt | Щопн 15:00 UTC | Blocked → proxy | Production |
| Dst | kyoto-dst.json (SWPC) | 1h | OK | Production |
| Wolf Sn | SILSO JSON (ROB) | добовий | OK | Production |
| Bz/Vsw | propagated-solar-wind.json | 1h | OK | Advisory |
| Eclipse | timeanddate.com (scraping) | разово/рік | Proxy | Advisory |
| Eclipse fallback | hardcoded 2025-2030 NASA | — | — | Production |
| Eclipse post-2030 | Mi=0 + confidence_flag=LOW (деградація) | — | — | Production |
| Vaishnava | BUILTIN_VAISNAVA (hardcoded 2026-2027) | — | — | Advisory |

---

## 8. Версійність

| Компонент | Канонічна версія | Файл |
|---|---|---|
| Engine Python | **v14.8** | forecast_engine_v14_8.py |
| Engine alias | — | forecast_engine.py |
| Dashboard | **v70** | index.html |
| Service Worker cache | g-index-shell-v70 | sw.js |
| auto_tag | v1.1 (sidereal Sankranti) | auto_tag_generator.py |
| Posibnyk | v3.5.0 | Posibnyk_v3_5_0.md |
| Canonical Spec | **v1.3** | CANONICAL_SPEC_v1_3.md |

---

## 9. Що НЕ є каноном (відхилені пропозиції)

| Пропозиція | Причина відхилення |
|---|---|
| ΣAᵢ range "−5..+5" | Хибно — реальний діапазон ~−10..+9 |
| Pᵢ_max = 3.6 | Хибно — реально 3.2 (виправлено v1.3) |
| Lᵢ ∈ {−3,0} (тільки) | Неповно — dashboard має {−3,−2,−1,0} при purnima+storm (виправлено v1.3) |
| "Дірка" Kp 4–5 | Хибно — kp_med = 3≤Kp<5 покриває повністю (виправлено v1.3) |
| sin() без конверсії φ | Хибно — код явно: φ_rad = phaseDeg × π/180 |
| mod від'ємних без wrap | Хибно — код: ((x%N)+N)%N скрізь |
| ΔT несуттєвий → потрібна корекція | Хибно — ΔT≈69s → Δλ<0.001° << ширина накшатри |
| Pᵢ = wV·V + wN·N (лінійна) | Хибна архітектура — реально tag-based lookup |
| Mi = −2 (тиждень затемнення) | Видалено — не генерувалось, мертвий код |
| lunarMod = cos²(φ/2) | Хибно — штрафує новолуння замість повні |
| lunarMod = sin²(φ) | Хибно — пік на квадратурах, не повні |
| Surya Sankranti tropical | Хибно — Jyotish використовує sidereal |
| ΣΔeᵢ в G (планетний вплив) | Advisory only — ніколи не в canonical G |
| forecast_engine v15 (зовнішній) | ВІДХИЛЕНО — FullMoon regression |
| vNext-lite (адитивна формула) | ВІДХИЛЕНО — holdout −1.9%, neg-tags −29% без blocking |
| retro_end = −3 безумовно | Виправлено v14.7 — з позитивним тегом не blocking |
| Місячний нов.рік = −3 (без ❤) | Виправлено v14.7 — іде в числову логіку |
| `⚡ Трезубець` → +2 при Kp<3 | Виправлено v14.8 — bolt-first = −2..−3 |
| `Ганеша ⚡` → −3 | Виправлено v14.8 — пуджа-контекст → −1 |
| `Удача🟢` обходить місячні override | Виправлено v14.8 — Amavasya→−3, Purnima+storm→−2 |
| `Нова одежда` + Amavasya → +3 | Виправлено v14.8 — Amavasya guard перед solo return |
| Purnima = 0 при бурі (Kp≥5) | Помилково — повня підсилює геомагнітний вплив (Cajochen 2013). Fix: v14.6 |
| ⊕ solo override при наявності purnima | Помилково — purnima блокує plus-solo. Fix: v14.6 |
| Bz/Vsw як ΔG у tooltip | Помилково — виправлено на "контекст" у v68 |

---

## 10. Product Layer Map

```
┌─────────────────────────────────────────────┐
│  G-Index Core (Production)                  │
│  G = Kp−2 + Li + Mi + ei + Pi + Di         │
│  SignMatch holdout 78.4% n=51 (v14.8)          │
├─────────────────────────────────────────────┤
│  Calendar Intelligence (Advisory)           │
│  Panchanga 5 анг + Rahu + Rashi + Pada      │
│  Eclipse overlay, R-M windows               │
├─────────────────────────────────────────────┤
│  Personal Layer (Experimental / Free tier)  │
│  Nakshatra + Taara + Dasa + Gos             │
├─────────────────────────────────────────────┤
│  Validation Platform (R&D)                  │
│  Holdout, AUC, ablation, backtest           │
└─────────────────────────────────────────────┘
```

---

*CANONICAL_SPEC v1.3 — заморожено 08.04.2026. Попередня версія: v1.2 (08.04.2026). Зміни тільки через нову версію spec.*
