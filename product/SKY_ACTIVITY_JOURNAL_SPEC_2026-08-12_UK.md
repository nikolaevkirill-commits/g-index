# Sky, справи та журнал — специфікація MVP/Growth

Дата: 2026-08-12. Статус: наступний реалізаційний блок roadmap.

## Sky

Екран об'єднує фізичні та календарні події, але не змішує їхні типи доказів.

### Секції

1. `Space weather`: observed Kp, Bz, solar wind, storm status, age і source.
2. `Moon`: фаза, освітлення, схід/захід, наступна фаза.
3. `Planets`: видимі планети, кутові зближення, ретроградні позначки.
4. `Events`: затемнення, сонцестояння/рівнодення, паради за явним критерієм.

Кожна картка містить `event_type`, локальний час, локацію, видимість, `observed/forecast/calculated`, джерело, `score_effect` та пояснення. Нові події мають `score_effect=0`.

## Saved activities

Користувач зберігає не «долю», а тип справи: focus, meeting, travel, rest або reflection. Система повертає:

- рекомендований planning mode;
- найближчі вікна;
- snapshot, на якому побудовано підказку;
- стан даних і обмеження;
- чесне нагадування, що вікно не гарантує результат.

Збереження справи не змінює production score.

## Outcome check-in

Після справи користувач може позначити `BETTER_THAN_EXPECTED / AS_EXPECTED / MIXED / WORSE_THAN_EXPECTED / SKIPPED` і коротку нотатку.

Правила:

- local-only за замовчуванням;
- training і model tuning вимкнені;
- не показувати псевдоточність на малих вибірках;
- не перебудовувати operational model із self-report;
- export/import лише з явною згодою;
- видалення окремого запису або всього журналу.

## Accessibility acceptance

- усі icon-only елементи мають accessible name;
- основна навігація — native buttons із selected state;
- hero читається screen reader як один логічний блок;
- порядок: decision → reason → freshness → next change;
- колір дублюється текстом та символом;
- minimum 48×48 dp;
- 200% zoom без горизонтального скролу на 360px;
- reduced motion не приховує зміни;
- `LIVE`, `FORECAST`, `TRADITIONAL` локалізуються, але зберігають машинний тип.

## Acceptance gate

Функціональність готова до closed test, коли контракти PASS, mobile flow проходить keyboard/360px/200% review, а фізичний Android screen-reader test доданий до QA evidence.
