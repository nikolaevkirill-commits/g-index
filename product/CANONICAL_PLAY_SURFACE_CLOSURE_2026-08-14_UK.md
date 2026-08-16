# Play surface decision — SUPERSEDED 16.08.2026

> **Статус:** цей документ від 14.08.2026 більше НЕ є канонічним рішенням для релізу. Його замінює `product/CANONICAL_HANDOFF_2026-08-16_UK.md`.

## Актуальне рішення

Старий Android AAB/TWA, який відкриває `https://nikolaevkirill-commits.github.io/g-index/?channel=play`, **не є новим consumer product** і не повинен вважатися фінальною Play-поверхнею.

Публічний G-Index dashboard залишається дослідницьким/аудитним інструментом. Його не треба повертати в Google Play як “застосунок”.

Новий продукт будується навколо consumer shell `product/mobile-v2/` у локальному canonical worktree `D:\ПРОГНОЗ\deploy_git`, із окремим fail-closed mobile state contract. До GitHub ці локальні файли можуть ще не бути синхронізовані; відсутність `mobile-v2` у `deploy` не є доказом їх відсутності на D:.

## Що дозволено зі старого Play-контуру

Історичні AAB/TWA, package/signing/assetlinks матеріали можна використовувати лише як **reference/evidence** для майбутнього Android-контуру. Вони не є доказом готовності нового mobile-v2.

## Gate перед новою Play-публікацією

Потрібні окремо:
1. production route для стабільного mobile-v2;
2. окремий Android/Gradle або TWA project саме для нового route;
3. перевірений AAB/APK;
4. остаточний Play Signing SHA-256 + assetlinks для реального app;
5. physical Android/internal test: install, standalone, offline, deep links, accessibility;
6. phone/tablet screenshots із реального нового UI;
7. Data Safety/privacy/content rating/app access/target audience, звірені з фактичним AAB/SDK/network inventory;
8. support email evidence і trademark/store-name clearance.

До виконання цих gate продукт **не називати повністю готовим до Google Play**.

## Історичний контекст

Повна попередня версія цього документа з рішенням 14.08.2026 збережена як:
`product/CANONICAL_PLAY_SURFACE_CLOSURE_2026-08-14_UK.bak.md`.
