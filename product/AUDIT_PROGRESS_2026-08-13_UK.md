# Стан аудиту й продукту — 13.08.2026

> Оновлення 15.08.2026 (brand/AAB closure): PWA install/update, web manifest, push fallback, Android embedded manifest і privacy draft синхронізовані з продуктним брендом `NeboRhythm`; `G-Index` лишається технічною назвою прогнозного рушія. AAB `1.0.0 (3)` перебудований і підписаний; усередині перевірено `NeboRhythm: Cosmic Timing`, version `88.9.203-fp398`, SHA-256 `B66FDB1E09DB9EA4F44FA17459B903E72C701C7FEBB984F0B9798A93EF74F789`. Dashboard/Jyotish consistency, 10 PowerShell product tests і 5 timezone vectors — PASS. Readiness: hard failures 0; Play acceptance versionCode 3, тестувальники, фізичний Android QA/скріншоти та Play declarations залишаються зовнішніми WAIT.

> Оновлення 15.08.2026: production runtime bridge для мобільного shell підключений до канонічного resolver; AAB `1.0.0 (2)` прийнятий Play і опублікований в internal track без тестувальників; підписаний privacy-candidate `1.0.0 (3)` зібраний і перевірений за SHA-256, але його прийняття Play ще не підтверджене. Браузерні screenshot-кандидати створені з канонічного маршруту `?channel=play`; вони не замінюють фізичний Android QA. Джйотіш, Tanita та v19.2 залишаються `score_effect=0`.

> Оновлення 14.08.2026: попередні Play-gates нижче є історичним зрізом. Актуальний машинний стан міститься у `play-market/PLAY_CONSOLE_GATE_STATUS.json` та `qa/LOCAL_CLOSURE_STATUS_2026-08-14.json`.

## Актуальний стан 14.08.2026

- Play registration, identity, address, phone/device verification, application ID, App Signing SHA-256, app creation і Digital Asset Links підтверджені.
- AAB `1.0.0 (2)` прийнята й опублікована в internal track; privacy candidate versionCode 3 з `allowBackup=false` зібрана, але її прийняття Play Console ще не підтверджене.
- Internal track не має вибраних тестувальників; фізичний smoke/network test не виконаний.
- Jyotish Personal research-engine реалізує D1, D9, 9 graha, 12 bhava і Vimshottari; автоматичні тести PASS, але consumer activation заблоковано до 100 незалежних карт та editorial review.
- Dashboard consistency, production release guard, TWA generator і product preflight повторно пройдені; локальних hard failures немає.

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
- `Jyotish Personal` не позначається consumer-ready: D1, D9, graha, bhava і Vimshottari вже реалізовані у research-engine; privacy flow зафіксований local-only, але лишаються незалежна перевірка 100 карт та editorial review.
