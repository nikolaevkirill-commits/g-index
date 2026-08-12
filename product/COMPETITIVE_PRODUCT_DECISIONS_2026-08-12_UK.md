# Рішення для продукту після конкурентного аудиту

Дата: 2026-08-12. Це робочий backlog, а не дозвіл змінювати production-dashboard.

## P0 — закрити перед internal/closed testing

- [x] UX-контракт одного hero-state без суперечливих кольорів визначено.
- [x] Контракт provenance: source, data type, timestamp, age, confidence визначено.
- [x] Навігацію Сьогодні / Космос / Небо / Календар / Ще визначено.
- [x] Панчангу зафіксовано як один агрегований внесок із деталями.
- [x] Контракт подій неба містить час, видимість, джерело та `score_effect=0`.
- [x] Контракт alerts містить поріг, завчасність, тип, quiet hours і enabled.
- [x] Last-good/offline семантично відділено від live.
- [x] Додано timezone/DST regression vectors; ручна локація визначена в UX.
- [x] UA/EN/ES store copy проходить автоматичний lint.
- [x] Монетизаційна межа залишає core status, provenance і safety alerts безкоштовними.

Ці пункти закриті на рівні специфікації та автоматичних контрактів. Фізична Android UI/device-реалізація залишається окремим release gate.

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
