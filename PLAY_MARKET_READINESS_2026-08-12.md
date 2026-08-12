# G-Index — готовність до Google Play

Дата перевірки: 2026-08-12. Цей файл є робочим preflight, а не заявою, що застосунок уже опублікований.

## Що вже є

- Канонічна PWA на `https://nikolaevkirill-commits.github.io/g-index/`.
- `manifest.json`, Service Worker, 192/512 іконки, standalone UI, offline shell та install UX.
- Окремі production guards для версії dashboard/Service Worker, manifest assets і runtime fingerprint.
- Privacy-сторінка, auth/push Worker та український продуктовий brief.

## Що перевірено цим аудитом

- У робочих `deploy/13` і `phase2` немає Android/TWA-проєкту: відсутні `AndroidManifest.xml`, Gradle/Bubblewrap manifest і `.aab`.
- Папка дизайну знайдена: `D:\ПРОГНОЗ\прогноз по ексель\deploy\13\Дизайн`.
- Канонічні brief-и вимагають фізичний PWA QA перед TWA.
- Поточна монетизаційна схема LiqPay придатна для web, але не повинна продавати цифрові Plus/Pro-функції всередині Play-застосунку без окремої перевірки Google Play Billing/дозволеної програми.

## P0 до створення `.aab`

- [ ] Реальний Android: Add to Home Screen, standalone launch, splash, offline start.
- [ ] Реальний Android: системний push після закриття браузера та deep-link у потрібний блок.
- [ ] 320/360/390/412 px і landscape на фізичному пристрої.
- [ ] Lighthouse/PWA-аудит production URL.
- [ ] Зафіксувати остаточні `applicationId`, назву видавця та signing key. Не вигадувати їх у коді.
- [ ] Вирішити Play-монетизацію: безплатний companion/MVP або Google Play Billing для цифрових підписок.

## P1 — TWA packaging

- [ ] Створити Bubblewrap/TWA-проєкт з production URL.
- [ ] Зібрати signed Android App Bundle (`.aab`) з актуальним target API.
- [ ] Опублікувати `/.well-known/assetlinks.json` з точним package name і SHA-256 сертифіката.
- [ ] Перевірити Digital Asset Links; без них TWA відкриється як Custom Tab.
- [ ] Пройти internal testing, потім closed testing; production лише після crash/UX перевірки.

## P1 — Play Console і політики

- [ ] Store listing: назва, короткий/повний опис, іконка, feature graphic, phone screenshots, support email.
- [ ] Privacy policy URL і точна Data safety декларація для auth, профілю, push, telemetry та сторонніх сервісів.
- [ ] Якщо акаунт створюється у застосунку — додати in-app і web-механізм видалення акаунта/даних.
- [ ] Content rating, target audience, ads declaration, app access instructions для review.
- [ ] Не позиціонувати G-Index як медичний, фінансовий чи гарантований прогноз результату; це advisory/reflective planning у prospective validation.

Актуальні офіційні джерела для повторної перевірки перед поданням:

- TWA: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
- Digital Asset Links: https://developers.google.com/digital-asset-links/v1/getting-started
- Target API policy: https://support.google.com/googleplay/android-developer/answer/16561298
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Payments: https://support.google.com/googleplay/android-developer/answer/9858738

## Рішення про Tanita

Tanita входить у застосунок лише як `SHADOW / score_effect=0`: окрема оцінка, збіг/конфлікт з reference, походження символів і лічильник незалежних outcomes. Вона не змінює Hero або G до проходження preregistered gate 100/100 та повторного release-аудиту.

## Файли розвитку, які треба зберігати разом

- `Дизайн\brief-dlya-viktora.md`
- `Дизайн\DOMAIN_BRIEF_for_Viktor.md`
- `Дизайн\daily-category-unlock-report-uk.md`
- `GINDEX_APP_MEMORY_ROADMAP_2026-07-24.md`
- `MONETIZATION_ARCHITECTURE.md`
- `phase2\README.md`
- `phase2\HANDOFF_phase2_complete.md`
- цей `PLAY_MARKET_READINESS_2026-08-12.md`

## Не блокує код, але потребує власника/пристрою

Фізичний Android/iPhone QA, Play Console developer account, остаточний package name, signing identity, store assets і юридично правильна billing/data-safety декларація не можуть бути чесно завершені лише локальним кодом.
