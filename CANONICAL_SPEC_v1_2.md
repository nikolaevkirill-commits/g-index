# G-Index CANONICAL_SPEC v1.2
**Дата:** 08.04.2026 | **Engine:** v14.7 | **Dashboard:** v69 | **Status:** FROZEN

> Зміни vs v1.1: engine v14.6→v14.7 (BUG-FIX retro_end + new_year); accuracy 72.5% holdout SM (n=51).
> Кожен фактор має чіткий статус: **Production** / **Advisory** / **R&D** / **Disabled**.
> При конфлікті між документами — цей файл має пріоритет.

---

## 1. Канонічна формула G

```
G = Kp − 2 + ΣAᵢ

ΣAᵢ = Lᵢ + Mᵢ + eᵢ + Pᵢ + Dᵢ

Lᵢ ∈ {−3, 0}          — місячна фаза (Amavasya/інше)
Mᵢ ∈ {−4, −3, −1, 0}  — затемнення
eᵢ ∈ [−6, +5]          — події (Jyotish теги + автоматичні)
Pᵢ = PCL_raw × 0.4 × sin²(φ/2)   ∈ [−4.4, +3.6]
Dᵢ ∈ {−2, −1, 0}      — Dst-компонент (сьогодні only)
ΣAᵢ ∈ [−10, +9]
G ∈ [−12, +16] (реально ≈ −5..+7)
```

**Статус формули: Production**
**Метрика:** SignMatch 72.5% holdout (n=51), 63.9% all (n=169), engine v14.7, 2024-08–2026-04

---

## 2. Компоненти G — детальний канон

### 2.1 Kp-компонент (Kp − 2)
| Параметр | Значення | Статус |
|---|---|---|
| Джерело | NOAA SWPC noaa-planetary-k-index.json | Production |
| Kp < 2 | kp_vlow бонус +0.8 до score | Production |
| 2 ≤ Kp < 3 | kp_low бонус +0.3 | Production |
| 3 ≤ Kp < 4 | kp_med штраф −0.2 | Production |
| 5 ≤ Kp < 7 | kp_high штраф −1.0 | Production |
| Kp ≥ 7 | kp_storm штраф −2.5 | Production |

### 2.2 Lᵢ — місячна фаза
| Умова | Значення | Статус |
|---|---|---|
| Amavasya (tithiIdx=29, φ≈348-360°) | Li = −3 | Production |
| Purnima + Kp ≥ 7 (G3+ буря) | Li = −2 (v14.6, Cajochen 2013) | Production |
| Purnima + 5 ≤ Kp < 7 (G1-G2) | Li = −1 (v14.6) | Production |
| Purnima + Kp < 5 (tithiIdx=14) | Li = 0 (нейтральна, v14.2) | Production |
| Всі інші tithі | Li = 0 | Production |

### 2.3 Mᵢ — затемнення
| Умова | Значення | Статус |
|---|---|---|
| День затемнення | Mi = −4 | Production |
| ±1 день | Mi = −3 | Production |
| ±2..±3 дні | Mi = −1 | Production |
| Поза вікном | Mi = 0 | Production |
| Джерело дат | NASA Five Millennium Canon (hardcoded 2025-2030) | Production |
| Mi = −2 | НЕ використовується — ВИДАЛЕНО | Disabled |

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
| Вікна R-M: весна 05.03–04.04, осінь 07.09–07.10 | — | Production (Cliver 2002) |

**Автоматичні eᵢ теги:**
| Тег | Джерело | Статус |
|---|---|---|
| затемнення | auto_tag_generator.py | Production |
| Амавасья🌑, Повний місяць🌕, Екадаші🥛 | auto_tag_generator.py (астрономічно) | Production |
| Сурья☀ (sidereal Lahiri) | auto_tag_generator.py v1.1 | Production |
| Ме/Юп/Са/Ве/Ма_ретро | auto_tag_generator.py | Advisory |

**Правила блокування eᵢ (v14.7):**
| Тег | Правило | Статус |
|---|---|---|
| retro_end (без позитивного тегу) | override −3 | Production |
| retro_end + ❤/✈/⊕/💎/⭐/🟢 | retro_end ігнорується, рахується решта тегів | Production (v14.7) |
| Місячний нов.рік | прибрано з blocking; іде в числову логіку | Production (v14.7) |
| Місячний нов.рік (до v14.6) | override −3 якщо без ❤ | Disabled |

### 2.5 Pᵢ — Panchanga Calendar Layer
```
Pᵢ = (Tithi_score + Vara_score + Nak_score + Yoga_score + Karana_score) × 0.4 × sin²(φ/2)
PCL_SCALE = 0.4 (емпіричний, потребує калібрування)
lunarMod = sin²(φ/2) — пік при Purnima (Cajochen 2013)
```

**Статус: Advisory** (R&D до окремої валідації Pᵢ на 365+ днях)

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
| Майбутні дати | Di = 0 (завжди) | Production |
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

### 4.2 П'ять ангів (Панча-анга)
| Анга | Формула | Статус |
|---|---|---|
| Tithi | floor(φ_moon/12) mod 30, φ = λM − λS trop | Production |
| Vara | getUTCDay() UTC (без sunrise boundary) | Advisory |
| Nakshatra | floor(λM_sid × 27/360), 0-based | Production |
| Yoga | floor((λS_sid + λM_sid) mod 360 / 13.333) | Production |
| Karana | floor(φ_moon/6) mod 60 | Production |

### 4.3 Додаткові елементи
| Елемент | Статус | Примітка |
|---|---|---|
| Rahu Kalam | Advisory | UTC + локальний час (оновлено v67) |
| Chandra Rashi | Informational | floor(λM_sid/30), додано v67 |
| Nakshatra Pada | Informational | 1-4, додано v67 |
| Hora | R&D | PCL × 0.2, mil/trader профілі only |

### 4.4 Відомі обмеження Panchanga
1. **Sunrise boundary:** Vara і Tithi рахуються від UTC полудня, не від локального сходу сонця. При переході tithi поблизу sunset/sunrise можлива похибка ±1 tithi.
2. **Swiss Ephemeris:** не використовується. Meeus Ch.47 дає ~0.01° vs arcsec у Swiss. Для Nakshatra (ширина 13.33°) це несуттєво.
3. **Timezone:** Rahu Kalam показується в UTC + апроксимований локальний час.

---

## 5. Особистий розрахунок (Personal Layer)

**Статус: Experimental / Free tier**

| Функція | Метод | Статус |
|---|---|---|
| Janma Nakshatra | Meeus Ch.47 + Lahiri, дата/час народження | Experimental |
| Taara | pos = ((cur − natal) mod 27 + 27) mod 27 + 1 | Experimental |
| Taara небезпечні | pos ∈ {1,3,5,7} | Experimental |
| Vimsottari Mahadasha | elapsed = fraction × lord_years від JDE | Experimental |
| Antardasha | dur = maha_years × antar_years / 120 × 365.25 | Experimental |
| Pratyantardasha | аналогічно Antardasha | Experimental |
| G_os (Gos) | G + deltaTaara + deltaDasa + deltaHora, clamp[-5,+5] | R&D |

---

## 6. Reliability / Confidence

| Параметр | Значення | Статус |
|---|---|---|
| SignMatch all n=169 | 63.9% (108/169) | Validated |
| SignMatch holdout n=51 | 72.5% (37/51) | Validated |
| Holdout AUC | 0.705 PASS | Validated |
| Ablation eᵢ негат. | ΔSM −20.7% (критичний компонент) | Validated |
| Ablation Lᵢ / Kp | ΔSM −3.6% кожен | Validated |
| Platt SOFT AUC | 0.777 (holdout) | Validated |
| Platt HARD AUC | 0.790 (holdout) | Validated |
| Публікація методології | Відсутня | R&D |

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
| Vaishnava | BUILTIN_VAISNAVA (hardcoded 2026-2027) | — | — | Advisory |

---

## 8. Версійність

| Компонент | Канонічна версія | Файл |
|---|---|---|
| Engine Python | **v14.7** | forecast_engine_v14_7.py |
| Engine alias | — | forecast_engine.py |
| Dashboard | v69 | index.html |
| Service Worker cache | g-index-shell-v69 | sw.js |
| auto_tag | v1.1 (sidereal Sankranti) | auto_tag_generator.py |
| Posibnyk | v3.5.0 | Posibnyk_v3_5_0.md |
| Canonical Spec | **v1.2** | CANONICAL_SPEC_v1_2.md |

---

## 9. Що НЕ є каноном (відхилені пропозиції)

| Пропозиція | Причина відхилення |
|---|---|
| ΣAᵢ range "−5..+5" | Хибно — реальний діапазон ~−10..+9 |
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
| Purnima = 0 при бурі (Kp≥5) | Помилково — повня підсилює геомагнітний вплив (Cajochen 2013). Fix: v14.6 |
| ⊕ solo override при наявності purnima | Помилково — purnima блокує plus-solo. Fix: v14.6 |
| Bz/Vsw як ΔG у tooltip | Помилково — виправлено на "контекст" у v68 |

---

## 10. Product Layer Map

```
┌─────────────────────────────────────────────┐
│  G-Index Core (Production)                  │
│  G = Kp−2 + Li + Mi + ei + Pi + Di         │
│  SignMatch holdout 72.5% n=51               │
├─────────────────────────────────────────────┤
│  Calendar Intelligence (Advisory)           │
│  Panchanga 5 анг + Rahu + Rashi + Pada      │
│  Eclipse overlay, R-M windows               │
├─────────────────────────────────────────────┤
│  Personal Layer (Experimental)              │
│  Nakshatra + Taara + Dasa + Gos             │
├─────────────────────────────────────────────┤
│  Validation Platform (R&D)                  │
│  Holdout, AUC, ablation, backtest           │
└─────────────────────────────────────────────┘
```

---

*CANONICAL_SPEC v1.2 — заморожено 08.04.2026. Попередня версія: v1.1 (07.04.2026). Зміни тільки через нову версію spec.*
