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

## Fail-closed правило

Не ставити у Play Console «дані не збираються», поки в продукті існують auth, email або push subscriptions. Декларація має покривати всю поведінку web-контенту всередині TWA.
