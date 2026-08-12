# Неборитм Product

Окрема продуктова папка для мобільного застосунку та Google Play. Чинний production dashboard і технічний URL `/g-index/` не перейменовуються до brand clearance та контрольованої міграції.

## Основні файли

- `PRODUCT_SPEC_UK.md` — продуктова логіка й межі обіцянок.
- `MVP_INFORMATION_ARCHITECTURE_UK.md` — канон екранів, навігації, кольорів і accessibility.
- `BRAND_SYSTEM_NEBORYTM_UK.md` — назва, аудиторії та візуальна мова.
- `FACTOR_EXPLAINER_UK.md` — зрозуміле пояснення Kp, Панчанги та інших шарів.
- `COMPETITOR_POSITIONING_AUDIT_2026-08-12_UK.md` — ринкова відмінність.
- `IP_AND_ANTI_COPY_PLAN_UK.md` — багатошаровий захист продукту.
- `store-assets/` — вихідні й фінальні store-активи з provenance.
- `play-market/` — listing, policy та release checklist.
- `scripts/Test-ProductReadiness.ps1` — fail-closed preflight.
- `contracts/` — машинно перевірювані приклади hero, подій неба, alerts і timezone/DST.
- `LOCAL_AND_EXTERNAL_GATE_CLOSURE_2026-08-12_UK.md` — що повністю закрито локально, а що потребує зовнішнього доказу.
- `qa/` — датовані browser/device QA-докази.

## Незмінні правила прогнозу

1. Hero показує один оперативний стан.
2. PDF/Engine — окремий reference, не дозвіл діяти.
3. Панчанга вже входить до `G_raw` як один складений компонент.
4. Tanita і v19.2 — `SHADOW / score_effect=0` до незалежних prospective gates.
5. Історичне відтворення не називається реальною майбутньою точністю.
