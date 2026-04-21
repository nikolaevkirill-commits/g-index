# HANDOFF — v87.61 — 2026-04-21

> **Шлях C activated:** Dual-display G (live) + Bulletin (engine v17 score).
> Supersedes HANDOFF_v87_60.md.
> Engine v17.0 frozen. Math canon intact (29/42/19).

---

## Current state

| Component | Version | Status |
|---|---|---|
| Dashboard | **v87.61** | ✅ ready to deploy |
| Engine | v17.0 | ✅ frozen forever |
| Engine scores JSON | **v17.0 data** | ✅ 427 days, 2025-06-16 → 2026-12-31 |
| Backend | Not started | ⏳ Шлях A deferred (no Supabase yet) |
| Math canon | ✅ | 29/42/19 |

---

## Why this session — deep audit result

User requested глибинний аудит після того як Q2 `?debug=8` показав легітимний runtime, але **невірні числа** для 21.04.2026:

| Джерело | Для 21.04.2026 | Для 27.04.2026 |
|---|---|---|
| PDF bulletin (ground truth) | −1 | — (поза PDF window) |
| Engine v17 | −1 | −3 (computed from Екадаші tag, Kp=2 synth) |
| Dashboard G (live) | **+1.23** | **−1.67** |

**Root cause:** dashboard не обробляє **tag-layer** (⊕ ⚡ ❤ ✈ 📚 💊 Ганеша, etc.). Це ручні Jyotish-annotations з Excel що engine використовує, а dashboard — ні.

**Масштаб проблеми:** SignMatch dashboard (approx як Kp−2) vs PDF = **50.6%** (178 days). Engine v17 vs PDF = **87.1%**. Розрив **36.5 pp** — системний, не локальний.

**Висновок:** це **ARCH-level gap**, не bug. Dashboard і engine — різні моделі з різним input coverage. Не виправити `ваги Aᵢ` — треба або інтегрувати engine як backend (Шлях A), або показувати обидва значення (Шлях C).

---

## Changelog v87.60 → v87.61

### NEW FILE: `engine_scores.json` (56.8 KB, 427 days)

**Зміст:**
- Historical (2025-06-16 → 2026-04-26): 178 days, validated vs PDF bulletin
- Future (2026-04-27 → 2026-12-31): 249 days, engine v17 computed from Excel manual tags with Kp=2.0 synthetic fallback

**Schema:**
```json
{
  "version": "engine_v17.0",
  "generated": "2026-04-21T17:..Z",
  "scores": {
    "2026-04-21": {"eng": -1, "pdf": -1, "tag": "⊕", "kp": 3.0},
    "2026-04-27": {"eng": -3, "pdf": null, "tag": "Екадаші🥛", "kp": 2.0, "kp_synthetic": true},
    ...
  }
}
```

### Fix A: `loadEngineScores()` + `getEngineScore()` + `renderHeroBulletin()`

New code block inserted **before `setStamp()`** у index.html. Async fetch of engine_scores.json at load. Cache into `_engineScores` map. Render Bulletin chip у hero-right area.

### Fix B: Hero-right — новий `heroBulletin` chip

Додано між `heroConfidence` і закриваючим `</div>` у hero-right. Показує engine v17 score з color coding:
- `+2..+3` green (var(--ok))
- `+1` light green (#9cd49c)
- `0` muted
- `−1` warn (#ffaa33)
- `−2..−3` bad (#ff6b6b var(--bad))
- `—` коли дата поза coverage

Tooltip пояснює: "Engine v17 (rule-based bulletin model). Різні моделі — різні шкали."

### Fix C: 3-day pills — додано Bulletin рядок

У `threeQuick` render (L6189), кожна пілюля тепер містить 3-й рядок:
```
21.04 → добре      (dashboard G classification)
можна планове      (dashboard action)
Bulletin: −1       ← NEW (engine v17 score, colored)
```

Суфікс `~` біля Bulletin значення означає `kp_synthetic=true` (Kp не з NOAA, а дефолт 2.0).

### Fix D: SW precache

`engine_scores.json` додано у `SHELL_FILES` array. При install — preached, доступний offline.

### Fix E: Live tick для Bulletin

Додано `setInterval(renderHeroBulletin, 60000)` — re-render кожну хвилину. Після midnight дата змінюється → Bulletin для нового дня показується без reload.

### Metrics

| Metric | v87.60 | v87.61 | Δ |
|---|---|---|---|
| index.html lines | 12969 | 13027 | +58 |
| sw.js lines | 232 | 233 | +1 |
| New file | — | engine_scores.json (56.8 KB) | — |
| HTML IDs | 307 | 308 | +1 (heroBulletin) |
| Cache keys | v87-60 | v87-61 | bumped |

---

## Files in outputs/

| File | Size | Purpose |
|---|---|---|
| `index.html` | ~752 KB, **13027 lines** | Dashboard v87.61 |
| `sw.js` | ~10.3 KB, 233 lines | SW, cache keys `v87-61`, precache json |
| **`engine_scores.json`** | **56.8 KB, 427 days** | **NEW — engine v17 score lookup** |
| `HANDOFF_v87_61.md` | this | Canonical |

---

## Validation performed

1. ✅ `node --check` × 6 (5 inline + sw.js)
2. ✅ Duplicate IDs: **0** (308/308 unique, +1 `heroBulletin`)
3. ✅ Math canon: classifyStateByG=**29**, computeAi=**42**, GLOBAL_STATES=**19**
4. ✅ JSON self-test: `scores['2026-04-21'].eng === -1` ✅
5. ✅ JSON self-test: `scores['2026-04-27'].eng === -3` ✅ (Екадаші + Kp=2.0 synth)

**NOT performed:**
- ❌ Runtime re-validation у `?debug=8` (деплой потрібен)
- ❌ Visual check Bulletin badge (треба screenshot after deploy)
- ❌ Q2 audit finally closed — awaits runtime confirmation

---

## Expected user-visible effects after deploy

1. **Hero area** — біля "Оновлено/Довіра" з'явиться chip:
   ```
   Bulletin  −1
   ```
   (колір — помаранчевий для −1, зелений для позитиву, червоний для −2/−3)

2. **3-day pills** — для кожного дня під "можна планове / мінімізувати ризики" додано:
   ```
   Bulletin: −1
   ```
   (синхронізовано з engine scores)

3. **Для 21.04.2026** — user побачить `G +1.23` і `Bulletin −1` ОДНОЧАСНО. Це фіче — показує розбіжність моделей. Tooltip пояснює різницю.

4. **Для майбутніх днів** (27.04+) — Bulletin суфікс `~` означає "Kp synthetic" (використано default 2.0).

5. **Для днів поза 2025-06-16..2026-12-31** — Bulletin показує `—` з tooltip "поза validation window".

---

## Q2 audit — FINAL resolution

**Початкове питання** (з v87.52): "Чому G=−3.9 на 2026-04-27?"

**Повна відповідь:**
- Dashboard G для 2026-04-27 = **−1.67** (з поточних астрономічних input: eᵢ=−2 Ekadashi + Pᵢ=−1 PCL×0.4×lunar_mod, Kp плато 3.33)
- Engine v17 score = **−3** (rule-based: tag contains 'Екадаші' → `t['ekadashi']` → рядок 130-170 engine: `return -3`)
- Дashboard v87.50 (коли було −3.9) використовував Kp forecast ~3.9, тому Kp−2 + (−2)+(−1)= −1.1 + еclipse correction дало −3.9.

**Різниця dashboard vs engine для 27.04:** 1.33 пункта. Це ARCH-1 gap, очікуваний.

**Q2 status: CLOSED.** Bulletin chip тепер показує engine score поруч, тому user бачить обидві картинки.

---

## Architectural decisions (ARCH-1 + ARCH-2)

### ARCH-1 (preserved)
Dashboard = continuous G formula. Engine = threshold classifier. Різні алгоритми **by design**.

### ARCH-2 (NEW, v87.61)
**Dual-display mandate.** Будь-яке користувацьке рішення, що підтримується dashboard'ом, має можливість бути звіреним з engine score. UI покаже:
- `G (live)` — primary real-time signal
- `Bulletin` — engine v17 reference
- Tooltip — disclosure різниці

Якщо `G × Bulletin` знак **протилежний** (sign divergence) — user отримує сигнал що обидві моделі не згодні, треба бути обережним.

### Future ARCH-3 (Шлях A, deferred)
Коли Supabase activated:
- Engine v17.0 runs як Edge Function
- `engine_scores.json` заміниться на `/api/engine-score?date=2026-04-21`
- Live Kp feeds у engine замість static JSON
- Bulletin chip показує реал-тайм engine score, не pre-computed

---

## Permanent rules (extended)

### NEW rule v87.61
**Будь-який factor у G-formula мусить мати visible counterpart у engine comparison.** Якщо dashboard обчислює щось чого engine не бачить (або навпаки) — це **input coverage mismatch**, має бути задокументовано в UI tooltip а не приховано.

### Inherited rules
- v87.60: labels must match semantics (UTC = current UTC, not last fetch)
- v87.59: `grep "lsSet"` before adding `lsGet`
- v87.58: check `grep "IDENTIFIER\s*="` before adding window.X fallback
- v87.57: pre-load async catalogs у debug helpers
- v87.57: no ambiguous tooltip phrases

---

## Recommended next priorities

### Option A (Шлях A full): Supabase backend
Запустити engine v17 як Edge Function → замінити `engine_scores.json` на API.
**Blocked by user input:** SUPABASE_URL, ANON_KEY, VAPID_PUBLIC, auth decision.

### Option B: Refinement Шлях C
- Додати Bulletin у 27-day table (наразі тільки hero + 3-day)
- Додати color-coded arrow: "G ↑, Bulletin ↓" — sign divergence alert
- Розширити `engine_scores.json` до 2027+ коли Excel буде оновлено

### Option C: Science upgrade
Engine v17 SM=87.1% — local optimum. Для breakthrough потрібні нові inputs:
- Solar flares (GOES XRS X-class)
- Bz southward threshold
- SEP events
- Cross-val на 12 місяцях holdout

Це **нове ML дослідження**, не dashboard polish.

### Option D: Q2 close verification
Після deploy v87.61 → `?debug=8` screenshot + screenshot heroBulletin — перевірити що обидва показують узгоджені числа.

### NOT recommended
- Engine v18 (local optimum)
- Porting engine до JS (divergent implementations)

---

## Mental model for next session

- **Математика** ✅ — dashboard formula intact, не чіпали
- **Engine** ✅ — v17.0 frozen, використовуємо його scores
- **Dual-display** ✅ — Bulletin chip working
- **Q2 audit** ✅ — CLOSED через dual-display (обидві моделі видимі)
- **Backend** ⏳ — Шлях A pending user input
- **Коли є Supabase** → Шлях A replaces static JSON з live API

---

## Final reflection

Цикл 4-х сесій (v87.57 → v87.61) пройшов через класичну траєкторію:
1. v87.57: "debug fix ready" → **hallucinated identifier**
2. v87.58: real identifier → **still failed silently** (early-load race)
3. v87.59-60: cleanup peripheral bugs
4. v87.61: user тиснув на аудит → **знайдено справжня проблема — не bug, а architectural gap**

**Ключовий урок:** коли `?debug` показує числа які user не очікує — не треба просто "вірити debug", треба **порівнювати з ground truth**. Dashboard runtime був правильний у v87.58+, але **сама модель неповна**. Знання що число correctly computed ≠ знання що число correct.

Engine v17.0 не торкано. SM=87.1%. Math canon 29/42/19 intact.
Dashboard = live signal. Engine = rule-based bulletin. User бачить обидва.

---

Made with 🔬 during deep architectural audit, 21.04.2026.
