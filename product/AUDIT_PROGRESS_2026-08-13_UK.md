# Стан аудиту й продукту — 13.08.2026

## Закрито локально

- Новий експертний прогноз `+10.8-23.8_ПРОГНОЗ.pdf` візуально звірений; SHA-256 `6A8A465EC58F5412EE28CA0F964D44D05888BADA02B435CEFEE1CCDA12715048`.
- У канонічному реєстрі присутні всі 14 дат 10–23.08.2026. Decision consistency: 434/434, gate failures 0, mismatches 0.
- Виправлено stale-cache маршрут `expert_overrides_v3.json`: мережевий cache-busting read із явно позначеним offline fallback.
- На фактичному локальному UI 13.08 відображається `PDF OVERRIDE · REFERENCE -1`, а не хибне «PDF/Engine недоступний».
- Production release guard, index integrity, dashboard consistency і Jyotish product verifier: PASS.
- Product contracts, mobile shell, mobile snapshot adapter, store listings, store assets, timezone vectors, TWA generator та product identity: PASS.
- Постійний Android application ID: `com.neborythm.app`.
- TWA identity manifest згенеровано у fail-closed стані `IDENTITY_READY_WAIT_SIGNING`.

## Свідомо не активовано

- v19.2 залишається `PROSPECTIVE SHADOW`, `score_effect=0`.
- Tanita залишається shadow/advisory, `score_effect=0`.
- Джйотіш: Panchanga входить у G лише один раз; Rashi, Pada, Muhurta, Choghadiya і персональні D1/D9/Dasha лишаються інформаційними або fail-closed до перевіреної ефемериди та окремого gate.
- Google Play Billing, Play push і cloud account не активовані без окремої реалізації та перевірки.

## Зовнішні Play-gates

Ці значення не можна вигадувати або генерувати без власника Play Console:

1. Отримати Play App Signing SHA-256 і замінити `REPLACE_WITH_PLAY_SIGNING_SHA256` у git-ignored `product.config.json`.
2. Завершити платіжний профіль Google Play із адресою, що збігається з документами.
3. Сплатити одноразову реєстрацію розробника Google Play ($25), після чого зібрати підписаний `.aab` і пройти closed/internal test на фізичному Android.

Поточний чесний статус: `LOCAL CHECKS PASS / EXTERNAL PLAY GATES WAIT`.

## Додаткова перевірка fp390

- Перевірені runtime-файли fp390 синхронізовано з `deploy_git` у канонічне локальне джерело `прогноз по ексель\deploy\13` після резервного копіювання.
- SHA-256 збігаються для `index.html`, `sw.js`, `manifest.json`, parser/aliases та трьох release/integrity перевірок.
- Локальний unattended publisher не містить runtime-файлів у allowlist і має окремий fail-closed список захищених production-файлів.
- Dashboard decision consistency, production release guard та index integrity повторно пройдені: PASS.
- Повний product QA повторно пройдено на диску D: Jyotish snapshot, mobile shell, mobile adapter, TWA generator, product contracts, product identity та store listings — PASS.
- Резервна копія до синхронізації: `D:\ПРОГНОЗ\backups\deploy13_before_fp390_20260813_210724`.

## Jyotish

- `Jyotish Lite` перевірено як окремий календарний продукт: Tithi, Nakshatra, Yoga, Karana, Vara, пояснення, provenance та `score_effect=0`.
- Канонічний календар містить 165 дат (20.07–31.12.2026) і покриває дату релізного аудиту.
- Тест посилено: опублікований `product/app/jyotish-snapshot.json` тепер обов'язково звіряється з канонічним календарем за значенням і UTC-межами кожного сегмента.
- Jyotish snapshot, mobile shell і product contracts після посилення тесту: PASS.
- `Jyotish Personal` не позначається готовим: D1, D9, Lagna, bhava і Dasha залишаються fail-closed до зафіксованого ephemeris/license рішення, golden vectors, незалежної перевірки 100 карт і privacy flow.
