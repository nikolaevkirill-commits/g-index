# Codex bootstrap — PROGNOZ / NeboRhythm — 16.08.2026

Цей файл є операційним доповненням до `product/CANONICAL_HANDOFF_2026-08-16_UK.md`.

## 0. Worktree boundary

Працювати ТІЛЬКИ в:

`D:\ПРОГНОЗ\deploy_git`

Не використовувати стару копію на `C:`.

Не робити повного recursive scan великих `index*.html`, xlsx/pdf/jpg/архівів без конкретної потреби.

## 1. Перші команди — read-only

```powershell
Set-Location 'D:\ПРОГНОЗ\deploy_git'
git status --short
git branch --show-current
git rev-parse HEAD
git diff --name-only
git diff --stat
```

Потім точково перевірити наявність:

```powershell
Test-Path product\mobile-v2\index.html
Test-Path product\mobile-v2\app.js
Test-Path product\mobile-v2\styles.css
Test-Path product\mobile-v2\data\current.json
Test-Path product\contracts\mobile-state-v2.schema.json
Test-Path product\scripts\New-MobileStateV2.mjs
Test-Path product\tests\Test-MobileStateV2.mjs
```

Якщо ці файли є локально, а в GitHub їх немає — **не відновлювати їх із dashboard**. Локальний D:-стан є джерелом для наступної перевірки.

## 2. Preserve-before-edit

Перед зміною існуючих mobile-v2/contract/pipeline файлів створити точковий `.bak` або git copy. Не копіювати великі legacy артефакти без потреби.

Frozen/sealed/GT/PDF/Excel/preregistration/history/model thresholds не змінювати.

## 3. Contract-v2 verification gate

Обов'язково повторити:

```powershell
node --check product\mobile-v2\app.js
node --check product\scripts\New-MobileStateV2.mjs
node --check product\tests\Test-MobileStateV2.mjs
node product\tests\Test-MobileStateV2.mjs
```

Додатково parse JSON:

```powershell
node -e "JSON.parse(require('fs').readFileSync('product/contracts/mobile-state-v2.schema.json','utf8')); console.log('schema JSON PASS')"
node -e "JSON.parse(require('fs').readFileSync('product/mobile-v2/data/current.json','utf8')); console.log('current JSON PASS')"
```

Acceptance:
- `assessment_3d.length <= 3`;
- `assessment_3d[*].source_role === 'OPERATIONAL_ASSESSMENT'`;
- `overview_27d.length <= 27`;
- `overview_27d[*].source_role === 'MODEL_OVERVIEW_NOT_DAY_FORECAST'`;
- legacy `timeline` не підвищується до operational assessment;
- DEMO/stale/expired/noncanonical input => `UNAVAILABLE / UNKNOWN`;
- Jyotish snapshot дозволений лише на точну поточну Kyiv civil date;
- reference/overview/Jyotish ніколи не перезаписує operational decision.

## 4. Fresh production feed — BLOCKING GATE

Не вигадувати `PRODUCTION_CANONICAL` з існуючих legacy JSON.

Спочатку знайти реальний producer/exporter у локальному D:-worktree. Він має явно давати:
- canonical generated_at / observed_at;
- Kyiv civil date/timezone;
- freshness/expiry;
- source role;
- conflict state;
- operational current decision;
- `assessment_3d` максимум 3;
- окремий `overview_27d`;
- sky facts/context окремо.

Якщо такого producer немає — створити НОВИЙ exporter поверх canonical source layer, але не на основі inferred legacy timeline.

Fail-closed rule: missing/stale/conflict/noncanonical => no current assessment.

## 5. Pipeline integration

Після того, як production exporter доведений тестами:
- автоматично генерувати `product/mobile-v2/data/current.json`;
- generation має завершуватися non-zero при schema/role/freshness violation;
- atomic write: temp -> validate -> replace;
- не кешувати live JSON як immutable shell asset;
- shell і live data мають мати різні cache semantics.

## 6. Browser visual QA

Після свіжого feed перевірити принаймні:
- `360x800`;
- `412x915`.

Сценарії:
1. live/canonical;
2. no-data;
3. stale/expired;
4. source conflict;
5. assessment_3d present + overview_27d present;
6. Jyotish date mismatch => hidden/null;
7. long UA/EN/ES strings;
8. large-text/contrast mode після реалізації You/settings.

Today/Plan/Sky перевіряються окремо. Не вважати visual QA завершеним на старому DEMO feed.

## 7. You / settings acceptance

Реалізувати після стабільного feed:
- UA / EN / ES;
- location + timezone;
- large text;
- contrast/accessibility;
- privacy;
- alerts;
- local journal/outcomes.

Account/auth у MVP приховати, якщо deletion endpoint не підтверджений end-to-end.

## 8. Trust sheet acceptance

Для кожного показаного фактору:
- role: observed / calculated / traditional / reference;
- timestamp;
- freshness;
- source/provider;
- source link де доречно;
- confidence/limitations;
- conflict state.

Kp не називати сприятливістю дня. Jyotish не називати причинним доказом. PDF reference не називати live verdict.

## 9. Android gate

Не перевикористовувати старий AAB/TWA як фінальний продукт.

Після стабільного mobile-v2 route:
1. новий Android/Gradle або TWA project для нового route;
2. `applicationId com.neborythm.app` звірити з фактичним project;
3. versionCode/versionName визначити з реального релізного стану;
4. зібрати AAB/APK;
5. перевірити signing certificate;
6. оновити/перевірити assetlinks;
7. physical Android/internal test;
8. після цього — screenshots і store assets;
9. Data Safety/privacy тільки з фактичного SDK/network inventory.

## 10. Git discipline

Перед commit:

```powershell
git diff --check
git diff --name-only
git status --short
```

Не комітити backups, великі binary/source evidence або legacy generated junk без явної потреби.

Окремі логічні commits:
1. mobile-v2 + contract files sync;
2. production mobile feed/exporter;
3. pipeline + tests;
4. You/settings;
5. trust sheet;
6. production route/SW;
7. Android project.

## 11. Stop conditions

Codex зупиняється й повідомляє тільки якщо потрібні:
- нові зовнішні credentials/authorization;
- irreversible Play publication/payment;
- фізичний Android пристрій;
- дані, яких немає локально й які не можна отримати безпечно.

В інших випадках — продовжувати автоматично за roadmap.

## 12. Model freeze

Не промоутити v19.2. Не тюнити на historical GT. Не давати Tanita score effect. Prospective evidence — окремо PDF/expert і real outcomes.
