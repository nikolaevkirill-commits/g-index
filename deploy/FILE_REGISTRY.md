# G-Index — РЕЄСТР ФАЙЛІВ (карта проєкту)

> Єдине місце, де видно: що це за файл, навіщо, чи активний.
> Оновлено: 2026-06-10. Усього файлів: 69.
> **Як читати:** 🟢 активне (чіпати можна) · 🔵 заморожене (НЕ чіпати до 08.2026) · 📦 архів/довідка · ⚙️ автоматизація

---

## 🎯 ГОЛОВНІ — з чого починати сесію

| Файл | Що це | Статус |
|---|---|---|
| **STATE.md** | Поточний стан проєкту (читати ПЕРШИМ щосесії) | 🟢 тримати свіжим |
| **FILE_REGISTRY.md** | Цей файл — карта всіх файлів | 🟢 |
| **README.md** | Опис продукту | 🟢 |
| **dashboard_map.md** | Карта index.html (де що в коді) | 🟢 |

---

## 🖥 ДАШБОРД (продукт)

| Файл | Що це | Статус |
|---|---|---|
| **index.html** | Дашборд (~19k рядків). Версія fp56-P4 | 🟢 активна розробка |
| **sw.js** | Service Worker (кеш, офлайн) | 🟢 |
| **manifest.json** | PWA-маніфест | 🟢 |

---

## 🧮 ДВИЖОК (scoring) — заморожено V3 до 2026-08-01

| Файл | Що це | Статус |
|---|---|---|
| **forecast_engine_v18_5.py** | Канонічний движок (score_day) | 🔵 FROZEN |
| **forecast_engine_v17_0.py** | Базовий core v17 (импортується v18.5) | 🔵 FROZEN |
| **engine_scores.json** | Передраховані бали (історія) | 🔵 FROZEN |
| **engine_v18_8_v88_8_19.json** | v18.8 patches (read-time) | 🔵 FROZEN |
| **g_extended_v2_coefs.json** | G_ext v2 коефіцієнти (R&D) | 🔵 FROZEN |

---

## 📋 ДАНІ / GROUND TRUTH (звірка з експертом)

| Файл | Що це | Статус |
|---|---|---|
| **expert_overrides_v3.json** | Бали з бюлетенів (PDF#48/49/50). Вікно →21.06 | 🟢 оновлюється з кожним PDF |
| **pdf48_ground_truth_v6.json** | ⚠ НАЗВА стара (pdf48), але це НАЙСВІЖІШИЙ ground truth: v6.4, n=371, до 21.06 (PDF#48+49+50). НЕ застарілий! | 🟢 головний GT |
| **pdf47_ground_truth_v5.json** | Попередній GT (n=329) | 📦 архів-попередник |
| **prognoz_2025_2026_4_FIXED.xlsx** | Контрольний Excel за рік (теги Таніти) | 🟢 джерело тегів |
| **tag_to_text.json** | Словник символів Таніти → текст | 🟢 |

---

## ⚙️ АВТОМАТИЗАЦІЯ / PIPELINE

| Файл | Що це | Статус |
|---|---|---|
| **fetch_kp_v2.py** | Тягне NOAA (Kp, Dst, F10.7, Wolf) + **27DO→future_kp.json** | ⚙️ 🟢 ГОТОВО |
| **taanita_symbols_from_engine.py** | Рахує символи з Swiss Ephemeris (самостійно) | ⚙️ 🟢 |
| **workflow.py** | Оркестратор: Excel→PDF→JSON→merge | ⚙️ 🟢 |
| **generate_forecast_pdf.py** | Генерує PDF-бюлетень з Excel | ⚙️ 🟢 |
| **parse_forecast_pdf.py** | Парсить PDF → JSON overrides | ⚙️ 🟢 |
| **generate_2week_forecast.py** | 2-тижневий прогноз | ⚙️ 🟢 |
| **update_kp.bat** | ГОЛОВНИЙ: простий тижневий запуск (тільки fetch Kp → future_kp.json) | ⚙️ 🟢 ВИКОРИСТОВУВАТИ ЦЕЙ |
| **friday_routine.bat** | Повна рутина — вимагає prospective_tracker.py (його НЕМА → падає) | ⚠️ не запускати поки нема tracker | |
| **00_run_all_v2.ps1** | PowerShell runner | ⚙️ 🟢 |
| **01-05_*.bat** | Cloudflare deploy кроки | ⚙️ 📦 |

---

## 🔍 ЗВІРКА / ВАЛІДАЦІЯ

| Файл | Що це | Статус |
|---|---|---|
| **audit_excel_vs_taanita_v3.py** | 4-way звірка: Excel↔астрономія↔engine↔delta | 🟢 головний аудит |
| **audit_signmatch_decomposition.py** | Розклад sign-match | 🟢 |
| **calibrate_pcl_scale.py** | Калібрування PCL-шкали | 📦 зроблено |
| **VALIDATION_REPORT_v18_5_pdf47_v5.json** | Звіт валідації | 📦 архів |
| **decision_rule_sensitivity.json** | Чутливість до правил | 📦 довідка |

---

## 📐 КАНОН / СПЕЦИФІКАЦІЇ (довідка — не чіпати)

| Файл | Що це | Статус |
|---|---|---|
| **CANONICAL_METRICS.md** | Заморожені метрики (n=280) | 🔵 НЕ чіпати |
| **CANONICAL_SPEC_v2_0.md** | Канонічна специфікація | 📦 довідка |
| **forecast_canon.md** | Канон форматів (кольори, DOCX) | 📦 довідка |
| **SOURCES.md** | 8 джерел даних (provenance) | 📦 довідка |
| **Astronomical_Algorithms_Meeus.md** | Meeus алгоритми (теорія) | 📦 довідка |
| **PCL_CALIBRATION_REPORT.md** | Звіт калібрування PCL | 📦 архів |

---

## 📅 ПЛАНИ / ЧЕКЛІСТИ

| Файл | Що це | Статус |
|---|---|---|
| **OUTCOME_VALIDATION_PLAN.md** | План outcome-валідації (Phase 2) | 🟢 майбутнє |
| **PRE_V3_CLOSE_CHECKLIST.md** | Чекліст перед 08.2026 | 🟢 майбутнє |
| **CHANGELOG.md** | Історія змін | 🟢 |

---

## 🗑 DEPRECATED — не запускати

| Файл | Чому | Статус |
|---|---|---|
| **update_engine_scores_after_fix.py** | One-shot patcher, відпрацював 29.04. Freeze | ❌ DEPRECATED |
| **auto_fix_excel_2026.py** | Разовий фікс Excel-тегів | 📦 відпрацював |

---

## 📦 БЮЛЕТЕНІ (DOCX/PDF) — згенеровані прогнози

| Файл | Період |
|---|---|
| _17_11-30_11 / _15_12-28_12 / _29_12-11_1 | листопад–січень |
| _12_01-25_01 / _26_1-8_2 / _9_2-22_2 | січень–лютий |
| PDF49_18_0531_05 / 25_5-7_6 / _8_6-21_6 | травень–червень (останні) |

---

## ⚠️ ЩО ЗАРАЗ ПОТРЕБУЄ РОБОТИ (відкриті задачі)

~~1. fetch_kp_v2.py → 27DO fetch~~ ✅ ГОТОВО (fp56-P6)
~~2. future_kp.json~~ ✅ ГОТОВО (генерується friday_routine)
~~3. index.html → читати future_kp~~ ✅ ГОТОВО (fp56-P6)
~~4. friday_routine.bat → fetch Kp~~ ✅ ГОТОВО

**Залишок:** покласти future_kp.json у deploy/ після першого запуску friday_routine. Дашборд підхопить автоматично.

---

*Цей реєстр оновлювати при додаванні/зміні файлів. Тримати поряд зі STATE.md.*
