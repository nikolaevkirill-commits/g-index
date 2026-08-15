# Play Console — чернетка відповідей

Це підготовлений worksheet. Остаточні відповіді звіряються з реальною `.aab` і Play Console.

## Позиціонування

- Primary category candidate: `Lifestyle`.
- Target audience: обрати лише `18+`; продукт не призначений для дітей, дитячі образи й дитячий маркетинг відсутні.
- Ads declaration: обрати `No, my app does not contain ads`. У candidate AAB немає ads SDK або Advertising ID permission; sponsored/native ads у web-контенті не показуються.
- App access: обрати `All functionality is available without special access`. Базовий Play companion не потребує акаунта; auth і push блокуються на рівні виконання.
- Digital goods: web-покупки приховані; Play Billing не активований.

## Data Safety для поточного fail-closed Play channel

- auth і push UI приховані;
- профіль задуманий local-first;
- точну локацію не передавати на сервер без окремої декларації;
- voluntary outcomes не вмикати у Play build до consent/deletion/retention review;
- AAB/SDK inventory виконано для versionCode 3; перед submission лишається physical Android runtime network capture.

## Content rating — контрольні відповіді до IARC

За перевіреним поточним контентом кандидат не містить реалістичного/фантастичного насильства, сексуального контенту або оголеності, наркотиків, алкоголю/тютюну, азартних ігор, грубої лайки чи user-generated content. Застосунок показує advisory-рекомендації, а не медичні, фінансові чи юридичні послуги.

Це не присвоює рейтинг автоматично: точні формулювання IARC треба звірити на екрані Play Console. Якщо запитання стосується доступу до зовнішнього web-контенту, відповідати за фактичну TWA-поведінку, не лише за native manifest.

## Content

- informational/advisory planning tool;
- не medical, financial або legal advice;
- не гарантує outcome;
- research signals не приймають автоматичних рішень про користувача;
- не використовувати health/wellbeing claims.

## Не заповнювати припущеннями

- application ID;
- signing SHA-256;
- final trademarked name;
- advertising ID/SDK answers;
- data deletion answers для функцій, яких немає у фінальній збірці.
