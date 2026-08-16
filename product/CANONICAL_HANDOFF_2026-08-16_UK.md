# КАНОНІЧНИЙ HANDOFF ПРОЄКТУ «ПРОГНОЗ» — 16.08.2026

Це продовження Codex-роботи. Не вигадувати відсутні факти й не називати продукт готовим без повної перевірки.

## РОБОЧЕ СЕРЕДОВИЩЕ
- Актуальний git/worktree: `D:\ПРОГНОЗ\deploy_git`.
- Не працювати з копією на `C:`; користувач прямо вказав працювати на диску `D`.
- Не робити повного рекурсивного сканування й не завантажувати великі `index*.html`, xlsx/pdf/jpg/архіви без конкретної потреби.
- Не змінювати frozen model, sealed holdout, original PDF/Excel, preregistration, historical reports або production thresholds без прямої вказівки.
- Перед заміною файлів створювати резервні копії.

## ЗАМОРОЖЕНИЙ МОДЕЛЬНИЙ СТАН
- Великий аудит v19.2 завершено.
- Рішення: НЕ промоутити v19.2 і не тюнити до нових prospective observations.
- Primary confirmatory sign cohort: 9 context-valid дат.
- 3 Panchanga dates quarantined і рахуються окремо.
- PDF evidence та real outcomes оцінюються окремо.
- 427 overrides = 427 унікальних дат, 427/427 проходять verification gate.
- 70 мають hash-format + manual PDF evidence; 357 explicit manual-PDF-reading verification.
- Наявні dashboard claims типу “69.4% sign / 47.2% exact”, “81.0/68.2 Excel replay”, “Tanita shadow” не можна продавати як prospective accuracy. Evidence gate досі WAIT; validated real outcome pairs фактично недостатні.
- v19.2 SHADOW — окремий тестовий контур, не production voice.
- Tanita не є другим голосом і не повинна змінювати score; її матеріали можна використовувати лише як editorial/context hypotheses до незалежної валідації.

## PRODUCTION/GITHUB
- PR #20, #21, #23 були merged: deploy correctness, production health, daily/PR checks.
- Root і `/deploy/` історично були різними live dashboards.
- Критичний ризик: локальний `daily_chain.bat` запускав untracked `sync_shadow_assets.ps1` + `git_deploy.bat` та міг стирати production fixes. Не вважати GitHub checks достатнім захистом локального auto-deploy.
- Публічний dashboard — дослідницький/аудитний інструмент, не Android consumer shell.

## ПРОБЛЕМА ЦИФР ДАШБОРДА
- На скрінах змішувалися різні сутності: operational state, verified PDF reference, live/raw G_now, daily aggregate G_day, NOAA current Kp, Kp forecast slots, Jyotish/Panchanga context.
- Це створювало оманливі суперечності: червоне/зелене, різні Kp, “-3 кожного дня”.
- Виправлена концепція: один канонічний operational state; інші значення лише factors/reference з provenance, timestamp, freshness та source role.
- Kp — окремий геомагнітний показник і не означає сприятливість дня.
- 27-day NOAA-derived/raw context — не 27 дозволів/заборон.
- PDF reference — окрема перевірена експертна довідка, а не live operational verdict.
- Jyotish — traditional timing/context layer, не причинний доказ і не другий verdict.

## НОВА ПРОДУКТОВА ОБОЛОНКА
Поточний dashboard визнано непридатним як масовий застосунок. Розроблено новий consumer shell:
- `product/mobile-v2/index.html`
- `product/mobile-v2/app.js`
- `product/mobile-v2/styles.css`
- `product/mobile-v2/data/current.json`
- `product/mobile-v2/README_UK.md`

Структура MVP:
- 3 вкладки: Сьогодні / План / Небо.
- Today: одна зрозуміла відповідь, 24h orbit, наступна зміна, “добре зараз / краще пізніше”, “чому так”, компактна довіра.
- Plan: окремо assessment 3d і overview 27d; 27d — planning context, не денні verdicts.
- Sky: Astronomy, NOAA factual widgets, Jyotish.
- UI не повинен показувати G/index/Panchanga в hero.
- Consumer brand working direction: Неборитм / NeboRhythm / NeboRitmo.
- Promise: “Зрозумій ритм дня. Плануй без зайвого шуму.”
- Visual direction: Living Orbit; midnight/deep navy, cyan live, amber forecast, coral risk, sage calm; без glowing balls, emoji-астрології, сов/півнів і sci-fi wallpaper.
- Bottom navigation final direction: Today / Plan / Sky / You (You ще не реалізований у поточному 3-tab shell).
- Jyotish має бути видимим як “Традиційний календар / Jyotish”, plain-language first; Sanskrit terms лише в деталях.
- Planetary events/eclipses/conjunctions — discovery/context; не змінюють score без доведеної ролі.
- Trust sheet має показувати observed/calculated/traditional/reference, timestamp, source link, confidence/limitations/conflict.
- EN positioning: calm cosmic decision-support/process.
- ES positioning: cosmic rhythm + practical planning; LatAm emotional shell, Spain more process-oriented.
- Не робити “ще один horoscope app”; найкраща ніша — one clear answer + transparent why.

## ОСТАННЄ КРИТИЧНЕ ВИПРАВЛЕННЯ ДАНИХ
Створено:
- `product/contracts/mobile-state-v2.schema.json`
- `product/scripts/New-MobileStateV2.mjs`
- `product/tests/Test-MobileStateV2.mjs`

Новий контракт фізично розділяє:
- `assessment_3d`: максимум 3 записи, тільки `source_role=OPERATIONAL_ASSESSMENT`.
- `overview_27d`: максимум 27 оглядових зон, `source_role=MODEL_OVERVIEW_NOT_DAY_FORECAST`.
- Старе поле `timeline` навмисно НЕ перетворюється на operational assessment.
- `DEMO_NOT_PRODUCTION`, stale, expired або noncanonical input => `UNAVAILABLE / UNKNOWN`.
- Jyotish snapshot використовується лише якщо його дата дорівнює поточній даті Kyiv; інакше `null`.
- Останній фактичний прогін на наявному `product/app/mobile-snapshot.json` дав: `status=UNAVAILABLE; decision=UNKNOWN; assessment_3d=0; overview_27d=0; sky=0`.
- Це ПРАВИЛЬНО, бо snapshot прострочений `DEMO_NOT_PRODUCTION`. Тепер UI не підставляє фальшиві “-3 щодня”.

## ФАКТИЧНІ ПЕРЕВІРКИ
- `node --check product/mobile-v2/app.js` — PASS.
- `node --check New-MobileStateV2.mjs` — PASS.
- `node --check Test-MobileStateV2.mjs` — PASS.
- `node product/tests/Test-MobileStateV2.mjs` — PASS: role/freshness gates.
- `current.json` та schema JSON parse — PASS.
- `git diff --check` для нового shell/contract/scripts/tests — PASS.
- Візуально перевіряли Today/Plan/Sky локально до останнього contract patch; потрібен повторний visual QA після свіжого feed.
- Резервні копії:
  - `product/mobile-v2/index.2026-08-15-pre-consumer-shell.bak.html`
  - `product/mobile-v2/app.2026-08-15-pre-consumer-shell.bak.js`
  - `product/mobile-v2/styles.2026-08-15-pre-consumer-shell.bak.css`
  - `product/mobile-v2/README.2026-08-15-pre-contract-v2.bak.md`

## PLAY MARKET / ANDROID
- Google Play developer identity і address користувач підтвердив.
- `applicationId: com.neborythm.app`; `versionName 1.0.0`; `versionCode 1` були підготовлені.
- Є UA/EN/ES listing drafts, feature graphics/icons, privacy/data-safety/account deletion drafts.
- Але повної готовності немає:
  1. немає production Android/Gradle project і перевіреного AAB/APK для нового mobile-v2;
  2. Play Signing SHA-256/assetlinks треба остаточно перевірити для реального app;
  3. потрібні phone/tablet screenshots із реального UI;
  4. потрібен physical Android/internal test: install, standalone, offline, deep links, accessibility;
  5. Data Safety/privacy треба узгодити з фактичним AAB/SDK/network inventory;
  6. account/auth краще приховати в MVP, доки deletion endpoint не підтверджено;
  7. trademark/store-name clearance і support email evidence ще треба завершити.
- Старий AAB/TWA, який відкриває `/g-index/?channel=play`, не є новим продуктом і не повинен вважатися фінальним.

## КОНКУРЕНТИ / BEST PRACTICES
Проаналізовано Co–Star, CHANI, The Pattern, TimePassages, Moonly, Nebula, Sanctuary, MoonX/The Moon Calendar, а також Drik Panchang, Aurora/space alerts, Sky Tonight.

Взяти:
- Co–Star: сильний voice/social hook, але не harsh tone/paywall backlash.
- CHANI: warm trustworthy layer, accessible learning.
- The Pattern: психологічно зрозумілі інсайти для скептиків.
- TimePassages: provenance/calculation depth.
- MoonX/calendar apps: utility, widgets, alerts, timing.
- Sky Tonight: discovery.
- Drik: depth of traditional calendar, але пояснювати просто.

Не брати:
- spiritual feature soup/psychic marketplace;
- категоричні доленосні обіцянки;
- “NASA proves astrology”;
- weekly subscription traps;
- технічний dashboard як home screen.

## ЩО РОБИТИ ДАЛІ — ПОРЯДОК
1. Підключити свіжий `PRODUCTION_CANONICAL` export із явним `assessment_3d` та `expiry/freshness/source roles`. Не вигадувати його з legacy `timeline`.
2. Додати автоматичну генерацію `mobile-v2/data/current.json` у production pipeline з fail-closed.
3. Повторний browser visual QA на `360x800` і `412x915`: Today/Plan/Sky, no-data/stale/conflict/live cases.
4. Реалізувати You/settings: language UA/EN/ES, location/timezone, large text/contrast, privacy, alerts, local journal/outcomes.
5. Реалізувати trust/provenance bottom sheet.
6. Після стабільного UI зробити production route для mobile-v2; service worker не кешує live data разом із shell.
7. Згенерувати окремий Android project/TWA для нового route, AAB, assetlinks, internal/physical tests.
8. Зробити реальні Play screenshots і store assets з нового UI; нинішні v3 sci-fi assets лишити mood reference.
9. Завершити Data Safety, privacy, content rating, app access, target audience.
10. Не промоутити v19.2 до prospective outcomes.

## ВАЖЛИВО
- Не називати продукт повністю готовим.
- Не повертати dashboard у Play як “застосунок”.
- Не дозволяти reference/overview/Jyotish перезаписувати operational decision.
- У разі missing/stale/conflict показувати це прямо.
- Продовжувати автоматично, але зберігати frozen evidence та чесність джерел.

## GitHub-vs-local caveat
Станом на момент фіксації цього handoff GitHub `deploy` може не містити локальні `product/mobile-v2/*` та contract-v2 файли з `D:\ПРОГНОЗ\deploy_git`. Відсутність цих файлів у GitHub НЕ є доказом їх відсутності на D:. Codex має починати з локального worktree на D:, перевірити `git status`, `git diff --name-only`, і лише потім вирішувати, що комітити/пушити.