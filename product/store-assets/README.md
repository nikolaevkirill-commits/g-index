# Store assets

- `source/` — оригінальні вихідні PNG з ImageGen, включно з планетарним фоном v2.
- `final/*feature-graphic-*-1024x500-v2.png` — локалізовані Google Play feature graphics для uk/en/es.
- `final/neborytm-icon-512-v1.png` і `192` — кандидат іконки.
- `STORE_ASSET_PROVENANCE_v1.json` — розміри, джерела і SHA-256.

Збірка: `python build_store_assets.py`. Перевірка: `python verify_store_assets.py`.

Назви `NeboRhythm` і `NeboRitmo` є робочими кандидатами до formal trademark clearance.
