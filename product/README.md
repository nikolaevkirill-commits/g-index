# Неборитм Product

Окрема продуктова папка для мобільного застосунку та Google Play. Чинний production dashboard і технічний URL `/g-index/` не перейменовуються до brand clearance та контрольованої міграції.

## Основні файли

- `AUTONOMOUS_WORKING_PROTOCOL_UK.md` — продовжувати roadmap без пауз, а при реальному блокері ставити одне конкретне питання.
- `PRODUCT_SPEC_UK.md` — продуктова логіка й межі обіцянок.
- `MVP_INFORMATION_ARCHITECTURE_UK.md` — канон екранів, навігації, кольорів і accessibility.
- `BRAND_SYSTEM_NEBORYTM_UK.md` — назва, аудиторії та візуальна мова.
- `FACTOR_EXPLAINER_UK.md` — зрозуміле пояснення Kp, Панчанги та інших шарів.
- `COMPETITOR_POSITIONING_AUDIT_2026-08-12_UK.md` — ринкова відмінність.
- `INTERNATIONAL_PRODUCT_STRATEGY_2026-08-12_UK.md` — єдине ядро для EN, es-ES, es-419 та UK, локалізація, монетизація й A/B-план.
- `JYOTISH_PRODUCT_SCOPE_2026-08-12_UK.md` — Panchanga як частина Jyotish, межі Lite/Personal/Full і технічні ворота.
- `COMPETITOR_FEATURE_GAP_MATRIX_2026-08-12_UK.md` — що беремо з ринку, відкладаємо або відхиляємо.
- `PRODUCT_ROADMAP_MVP_TO_ADVANCED_2026-08-12_UK.md` — послідовний план реалізації й acceptance gates.
- `SKY_ACTIVITY_JOURNAL_SPEC_2026-08-12_UK.md` — Sky, збережені справи, журнал і accessibility acceptance.
- `IP_AND_ANTI_COPY_PLAN_UK.md` — багатошаровий захист продукту.
- `store-assets/` — вихідні й фінальні store-активи з provenance.
- `play-market/` — listing, policy та release checklist.
- `play-market/COST_AND_LAUNCH_SEQUENCE_2026-08-12_UK.md` — обов'язкові/відкладені витрати та go/no-go до оплати.
- `scripts/Test-ProductReadiness.ps1` — fail-closed preflight.
- `contracts/` — машинно перевірювані приклади hero, подій неба, alerts і timezone/DST.
- `contracts/product-identity.json` — незмінний Android ID `com.neborythm.app` і web-origin contract.
- `LOCAL_AND_EXTERNAL_GATE_CLOSURE_2026-08-12_UK.md` — що повністю закрито локально, а що потребує зовнішнього доказу.
- `qa/` — датовані browser/device QA-докази.
- `qa/CLOSED_TEST_SCENARIOS_2026-08-12_UK.md` — 12 сценаріїв розуміння, safety, Jyotish, privacy та accessibility.
- `android/MOBILE_BUILD_EXECUTION_PLAN_2026-08-12_UK.md` — work packages identity, shell, local data, notifications і physical QA.
- `app/` — окремий mobile shell Today / Timeline / Sky / Jyotish / You без зміни production dashboard.
- `qa/MOBILE_SHELL_BROWSER_QA_2026-08-12.json` — фактична перевірка 320/360 px, UK/EN/ES, accessibility та browser console.

## Незмінні правила прогнозу

1. Hero показує один оперативний стан.
2. PDF/Engine — окремий reference, не дозвіл діяти.
3. Jyotish — продуктовий розділ; Panchanga вже входить до `G_raw` як один складений компонент.
4. Tanita і v19.2 — `SHADOW / score_effect=0` до незалежних prospective gates.
5. Історичне відтворення не називається реальною майбутньою точністю.
