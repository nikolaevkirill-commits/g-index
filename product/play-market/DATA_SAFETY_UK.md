# Data Safety — робочий інвентар

Це підготовка до Play Console, не фінальна декларація. Перед поданням її треба звірити з реальною Android-збіркою, Worker та всіма SDK.

Поточний MVP відкриває `?channel=play`: auth, push і web-продажі приховані; профіль та журнал залишаються локальними. Якщо ці серверні функції будуть повернуті у Play-канал, декларацію потрібно оновити до нового релізу.

## Потенційно зібрані дані

| Тип | Навіщо | Джерело | Видалення |
|---|---|---|---|
| Email | реєстрація, вхід, reset password | Cloudflare auth Worker/D1 | потрібен endpoint і публічна сторінка |
| User ID/session | автентифікація | Worker/D1, local storage token | разом з акаунтом |
| Push endpoint/keys | системні сповіщення | Web Push subscription | unsubscribe та видалення акаунта |
| Дата/час/місто народження | персональний цикл | профіль користувача | визначити: local-only чи server sync |
| Налаштування профілю | UX/personalization | local storage або акаунт | очистити локально/з акаунтом |
| App interactions/outcomes | prospective validation, якщо користувач явно надсилає | outcome form/ledger | окрема згода й видалення |
| Payment/subscription status | доступ Plus/Pro | Play Billing або web provider | фінансові записи за законом можуть мати retention |

## Потрібно підтвердити

- Чи передаються точні координати на сервер. За поточним дизайном бажано обчислювати/зберігати локально.
- Чи є analytics/telemetry у Play build.
- Чи містить TWA сторонні SDK або web trackers.
- Чи всі мережеві дані шифруються HTTPS.
- Які retention periods у D1, push і outcome ledger.

## Перевірка фактичної Android-збірки — 14.08.2026

- Перевірено підписану й прийняту Play Console збірку `1.0.0 (2)`; SHA-256 AAB: `85E32579020945B0274D4F1C2541D5CDB3CBD9E379410042C118ADD3F30DD2E0`.
- Формат застосунку: Trusted Web Activity; пряма Android-залежність — `com.google.androidbrowserhelper:androidbrowserhelper:2.6.2`.
- У merged manifest не знайдено дозволів на рекламу/Advertising ID, геолокацію, камеру, мікрофон, контакти, телефон або файли. Є лише внутрішній signature permission `com.neborythm.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
- `enableNotifications=false`; Play-канал приховує auth, push і web-продажі.
- У прийнятій збірці versionCode 2 було `allowBackup=true`. У виправленому кандидатові versionCode 3 встановлено `allowBackup=false`; AAB зібрана й підписана, але ще має бути прийнята Play Console.
- Ця перевірка не доводить відсутність web-збору даних: TWA завантажує HTTPS web-контент і публічні джерела прогнозу. Перед фінальним заповненням форми потрібен runtime network capture на фізичному Android.

## Fail-closed правило

Не ставити у Play Console «дані не збираються», поки в продукті існують auth, email або push subscriptions. Декларація має покривати всю поведінку web-контенту всередині TWA.
