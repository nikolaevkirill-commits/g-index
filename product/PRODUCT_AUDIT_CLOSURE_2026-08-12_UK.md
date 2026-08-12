# Закриття продуктового аудиту — 12.08.2026

## Що готово

- Окремий безкоштовний Play companion відкривається через `/g-index/?channel=play`.
- У Play-каналі приховані web-авторизація, push-кнопка, paywall і цифрові покупки.
- Базові функції працюють локально; профіль зберігається на пристрої.
- Web manifest синхронізований із версією дашборда; зламаний shortcut `backtest.html` замінений внутрішнім переходом до картки перевірки.
- TWA-шаблон більше не містить зашитих host, назви, шляху та версії: значення беруться з локальної конфігурації.
- Генератор TWA перевіряє обов'язкові поля й не випускає пакет із незаповненими placeholder-ами.
- Release guard і consistency audit блокують повернення web-покупок у Play-канал, розсинхрон версій та зламані shortcut-и.
- Privacy, Terms, Account deletion і Play Data Safety підготовлені.

## Свідомо не активовано

- v19.2: `PROSPECTIVE SHADOW`, `score_effect=0`; формула production не змінена.
- Tanita: advisory/shadow, без автоматичного впливу на G.
- Google Play Billing: вимкнено. Цифрові продажі в Play-версії не заявляються.
- Хмарний акаунт і push у Play companion: приховані до окремої реалізації та перевірки.

## Зовнішні release-gates

Це не дефекти коду й не повинно заповнюватися вигаданими значеннями:

1. Вибрати остаточний Android package ID.
2. Створити й безпечно зберегти signing key; внести SHA-256 certificate fingerprint.
3. Скопіювати `product/product.config.example.json` у git-ignored `product/product.config.json` і заповнити реальні значення.
4. Згенерувати TWA-артефакти та опублікувати `assetlinks.json` на web origin.
5. Зібрати `.aab`, пройти internal testing на реальному Android-пристрої й заповнити Play Console декларації.

Локальні product/spec/contract/browser-emulation блоки закриті й автоматизовані. До виконання цих п'яти зовнішніх кроків стан продукту: **LOCAL PRODUCT PACKAGE COMPLETE / EXTERNAL RELEASE GATES OPEN, не production Play release**.
