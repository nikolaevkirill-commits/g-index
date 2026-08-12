# Рішення для продукту після конкурентного аудиту

Дата: 2026-08-12. Це робочий backlog, а не дозвіл змінювати production-dashboard.

## P0 — закрити перед internal/closed testing

- [ ] Один hero-state без суперечливих кольорів.
- [ ] Поруч: джерело, observed/forecast/reference, timestamp, age, confidence.
- [ ] Перший рівень навігації: Сьогодні / Космічна погода / Небо / Календар.
- [ ] Панчанга має пояснення кожного фактора й один агрегований внесок.
- [ ] Затемнення, паради, зближення: час, локальна видимість, джерело, `score_effect`.
- [ ] Сповіщення: поріг, завчасність, тип події, quiet hours, вимкнення.
- [ ] Last-good/offline ніколи не позначається як live.
- [ ] Ручна локація без акаунта; timezone/DST regression tests.
- [ ] UA/EN/ES store copy проходить автоматичний lint.
- [ ] Core status, provenance і safety alerts залишаються безкоштовними.

## P1 — після стабільного MVP

- [ ] Home-screen widget.
- [ ] Calendar export і персональні нагадування.
- [ ] Історія зміни прогнозу та джерела.
- [ ] Локалізований факторний словник.
- [ ] Accessibility QA: contrast, Dynamic Type/масштаб, screen reader labels.

## P2 — лише після evidence і попиту

- [ ] Advanced personalization.
- [ ] Довгий архів і дослідницькі порівняння.
- [ ] v19.2 promotion тільки після prospective gate.
- [ ] Tanita — лише після окремої prospective validation.

## Заборонені скорочення шляху

- Не називати 27-денну NOAA картину точним прогнозом рішень.
- Не змішувати зелений статус доступності джерела із зеленим рішенням.
- Не подавати історичну accuracy як гарантію.
- Не використовувати «energy score», «best time», медичні або wellbeing-обіцянки.
- Не копіювати sky-map, гороскопну стрічку чи social compatibility у MVP.
- Не дробити master-brand на різні EN/ES бренди до clearance.

## Монетизаційна межа

Free: поточний стан, пояснення, data age, базові alerts, основна Панчанга й видимість подій. Paid після перевірки попиту: довгий горизонт, архів, віджети, custom alerts, calendar export, розширена персоналізація.
