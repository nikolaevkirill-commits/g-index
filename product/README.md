# G-Index Product

Окрема продуктова папка для підготовки мобільного G-Index та Google Play. Вона не замінює канонічний production dashboard і не містить великих архівів чи сирих дослідницьких артефактів.

## Структура

- `PRODUCT_SPEC_UK.md` — продуктова логіка та межі обіцянок.
- `TANITA_INTEGRATION_UK.md` — чесне впровадження Tanita у прогноз.
- `play-market/STORE_LISTING_UK.md` — чернетка сторінки Google Play.
- `play-market/DATA_SAFETY_UK.md` — інвентар даних для Play Console.
- `play-market/PRIVACY_POLICY_UK.md` — робоча privacy policy.
- `play-market/ACCOUNT_DELETION_UK.md` — вимоги до видалення акаунта.
- `play-market/RELEASE_CHECKLIST_UK.md` — послідовність випуску.
- `android/twa-manifest.template.json` — шаблон Bubblewrap/TWA.
- `android/assetlinks.template.json` — шаблон Digital Asset Links.
- `scripts/Test-ProductReadiness.ps1` — автоматичний fail-closed preflight.
- `scripts/New-TwaPackage.ps1` — генератор Bubblewrap manifest та Digital Asset Links після заповнення приватного конфіга.
- `PRODUCT_RELEASE_MANIFEST.json` — машинозчитуваний статус продукту й зовнішніх gates.
- `product.config.example.json` — конфігурація, яку треба скопіювати в `product.config.json`.

## Швидка перевірка

```powershell
pwsh -File product/scripts/Test-ProductReadiness.ps1
```

До створення локального `product.config.json` перевірка навмисно повертає `WAIT`, а не вигадує постійний Android package ID чи signing fingerprint.

Після заповнення конфіга:

```powershell
pwsh -File product/scripts/New-TwaPackage.ps1
```

Ізольований тест генератора з явно тестовими, непублікаційними даними:

```powershell
pwsh -File product/tests/Test-NewTwaPackage.ps1
```

Результат потрапляє у git-ignored `product/generated/`. `assetlinks.json` потрібно опублікувати на web origin, а `twa-manifest.json` використати для Bubblewrap build.

## Канонічні принципи

1. Hero показує один оперативний стан.
2. PDF/Engine — окремий reference, не дозвіл діяти.
3. `G_raw` — контекст, Панчанга вже входить до нього.
4. Tanita і v19.2 залишаються `SHADOW / score_effect=0` до незалежних prospective gates.
5. Категорійні оцінки не видаються за виміряну точність без окремої валідації.
