# Roadmap продукту: MVP → Growth → Advanced

Дата: 2026-08-12. Roadmap виконується послідовно. Наступний етап не починається, доки попередній не має доказів приймання.

## Етап 0 — Truth foundation — завершено на рівні контрактів

- один hero-state;
- provenance і freshness;
- розділення operational/reference/raw/research;
- нейтральність v19.2 і Tanita;
- timezone vectors, sky events, alerts, history, widget та calendar contracts;
- UA/EN/ES store claim lint.

Зовнішні ворота: фізичний Android QA, applicationId, signing і Play identity.

## Етап 1 — Mobile MVP

### Екрани

1. Today: state, причина, дві дії, наступна зміна, freshness, `Чому?`.
2. Timeline: 24 години / 3 дні; 7/27 днів позначені як premium preview.
3. Sky: космічна погода, Місяць, планети, затемнення та видимість.
4. Jyotish: Panchanga calendar із п'ятьма anga і локальними вікнами.
5. You: локальний профіль, великі шрифти, мова, privacy.

### Нові механіки

- збережені типи справ: focus, meeting, travel, rest, reflection;
- explanation ladder із трьома рівнями;
- selective alerts із quiet hours;
- simple/expert display без різних результатів;
- offline/last-good screen.

### Acceptance

- користувач за 5 секунд називає головний стан і наступну зміну;
- локальна зелена картка не сприймається як загальний дозвіл;
- observed, forecast і traditional layer розрізняють щонайменше 80% учасників тесту;
- 200% text scaling, screen reader і touch targets проходять device QA;
- crash-free closed test і freshness fail-closed перевірені.

## Етап 2 — Growth

- home-screen widget;
- calendar export;
- 7/27-day planning із чітким horizon/confidence;
- outcome journal та приватні check-ins;
- порівняння періодів;
- кілька локальних профілів;
- EN, es-ES, es-419 native editorial QA;
- A/B store experiment: process-led / cosmic-led.

Acceptance: journal не змінює production model автоматично; export містить provenance; A/B міряє install→day-7 retention, а не лише CTR.

## Етап 3 — Jyotish Personal

- ephemeris/license decision;
- Lagna, graha, bhava, D1, D9;
- Janma Nakshatra і validated Vimshottari periods;
- sidereal transits;
- Moon-based fallback без точного часу народження;
- independent golden-vector comparison і expert terminology review.

Усі нові персональні Jyotish-фактори спочатку `score_effect=0`.

## Етап 4 — Advanced лише після доказів

- персональні calibration summaries;
- scenario planning і smart alerts;
- додаткові Jyotish charts лише після попиту;
- v19.2 promotion лише за замороженим prospective protocol;
- Tanita лише після окремої independent validation.

## Не входить до roadmap

- psychic/astrologer marketplace;
- таро/руни/ворожіння;
- social compatibility до privacy research;
- категоричні health/finance/relationship predictions;
- автоматичний tuning від consumer journal;
- окремі формули для різних мов;
- обкладинка до завершення message A/B brief і brand clearance.

## Найближча реалізаційна черга

1. Mobile Today wireframe на основі hero contract.
2. Timeline wireframe з незалежними каналами decision/raw/reference.
3. Jyotish Lite wireframe і виправлення sunrise/DST requirements.
4. Компоненти explanation ladder.
5. Saved activity і outcome check-in прототипи.
6. Accessibility review.
7. Closed-test build plan.
