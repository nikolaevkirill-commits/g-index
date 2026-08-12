# Play Console — чернетка відповідей

Це підготовлений worksheet. Остаточні відповіді звіряються з реальною `.aab` і Play Console.

## Позиціонування

- Primary category candidate: `Lifestyle`.
- Target audience: дорослі 18+; продукт не призначений для дітей.
- Ads: не заявляти до додавання конкретного ads SDK.
- App access: базовий Play companion не потребує акаунта.
- Digital goods: web-покупки приховані; Play Billing не активований.

## Data Safety для поточного fail-closed Play channel

- auth і push UI приховані;
- профіль задуманий local-first;
- точну локацію не передавати на сервер без окремої декларації;
- voluntary outcomes не вмикати у Play build до consent/deletion/retention review;
- перед submission зробити network/SDK inventory фактичної AAB.

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
