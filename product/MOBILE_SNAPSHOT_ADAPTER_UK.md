# Канонічний mobile snapshot

Mobile shell не розраховує другий прогноз. `scripts/New-MobileSnapshot.mjs` приймає лише перевірений `neborytm_hero_state_v1` і переводить його у вузький мобільний контракт.

```powershell
node .\scripts\New-MobileSnapshot.mjs --input=contracts\hero-state.json --output=app\mobile-snapshot.json --source-role=PRODUCTION_CANONICAL
```

Production-режим блокує прострочене, future-dated і demo/synthetic джерело. Tanita та v19.2 допускаються лише зі `score_effect: 0`. До появи канонічного вхідного `hero-state.json` застосунок зберігає явний статус `DEMO_NOT_PRODUCTION`.
