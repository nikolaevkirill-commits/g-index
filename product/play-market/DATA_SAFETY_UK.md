# Data Safety — робочий інвентар

Це підготовка до Play Console, не фінальна декларація. Перед поданням її треба звірити з реальною Android-збіркою, Worker та всіма SDK.

Поточний MVP відкриває `?channel=play`: auth, push і web-продажі приховані; профіль та журнал залишаються локальними. Якщо ці серверні функції будуть повернуті у Play-канал, декларацію потрібно оновити до нового релізу.

## Потенційно зібрані дані

| Тип | Навіщо | Джерело | Видалення |
|---|---|---|---|
| Email | реєстрація, вхід, reset password | Cloudflare auth Worker/D1 | потрібен endpoint і публічна сторінка |
| User ID/session | автентифікація | Worker/D1, local storage token | разом з акаунтом |
| Push endpoint/keys | системні сповіщення | Web Push subscription | unsubscribe та видалення акаунта |
| Дата/час/місто народження | персональний Jyotish | лише локальний профіль; sync вимкнено | локальне видалення та експорт |
| Налаштування профілю | UX/personalization | local storage або акаунт | очистити локально/з акаунтом |
| App interactions/outcomes | prospective validation, якщо користувач явно надсилає | outcome form/ledger | окрема згода й видалення |
| Payment/subscription status | доступ Plus/Pro | Play Billing або web provider | фінансові записи за законом можуть мати retention |

## Потрібно підтвердити

- Точні координати не повинні передаватися на сервер у поточному MVP: контракт `jyotish-profile.example.json` вимагає `LOCAL_ONLY`, `sync_enabled=false`, явну згоду, експорт і видалення.
- Чи є analytics/telemetry у Play build.
- Чи містить TWA сторонні SDK або web trackers.
- Чи всі мережеві дані шифруються HTTPS.
- Які retention periods у D1, push і outcome ledger.

## Перевірка фактичної Android-збірки — 15.08.2026

- Перевірено новий підписаний кандидат `1.0.0 (3)`; SHA-256 AAB: `9BD94A1035C446B2FFCE71D5C55214F08E891311324E446573A2B61BA60F7127`, розмір `1 248 850` байтів. Цей кандидат ще має бути прийнятий Play Console.
- Формат застосунку: Trusted Web Activity; `minSdk=21`, `targetSdk=36`; пряма Android-залежність — `com.google.androidbrowserhelper:androidbrowserhelper:2.6.2`.
- Повний `releaseRuntimeClasspath` не містить Firebase, Google Analytics, рекламних, платіжних, crash-reporting або social SDK. Транзитивні залежності — AndroidX, Kotlin runtime/coroutines та Guava, які потрібні Android Browser Helper.
- У release merged manifest немає дозволів на Advertising ID, точну/приблизну геолокацію, камеру, мікрофон, контакти, телефон, календар, SMS або спільні файли. Є лише внутрішній signature permission `com.neborythm.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
- `android:allowBackup=false`; native notification integration вимкнена (`enableNotifications=false`). Вбудований web manifest у підписаному AAB має бренд `NeboRhythm` і версію `88.9.204-fp399`.
- Play-канал `?channel=play` приховує auth, push, web-продажі та paywall; auth/push додатково блокуються на рівні виконання до будь-якого Worker або Push API запиту. Профіль Jyotish і журнал зберігаються в `localStorage`; точна геолокація запитується браузером лише після явної дії користувача й використовується для локального розрахунку.
- Веб-рівень звертається по HTTPS до публічних джерел космічної погоди та до same-origin JSON. Код auth/push Worker залишається у спільному web bundle, хоча його інтерфейс у Play-каналі прихований. Тому native-аудит сам по собі не доводить відсутність web-збору даних.
- Машинний знімок доказів: `AAB_DATA_SAFETY_INVENTORY_2026-08-15.json`.

## Що можна й не можна заявляти в Play Console

- Підтверджено: AAB не запитує чутливих Android-дозволів, не містить рекламного ID чи сторонніх analytics/ads SDK, не дозволяє Android backup.
- Ще не підтверджено: повний список фактичних HTTP-запитів TWA на фізичному Android та поведінка всіх web-модулів у Play-каналі.
- До runtime network capture не ставити «дані не збираються». Заповнювати форму консервативно за реально доступними сценаріями або прибрати серверний код із Play bundle окремою збіркою.

## Fail-closed правило

Не ставити у Play Console «дані не збираються», поки в продукті існують auth, email або push subscriptions. Декларація має покривати всю поведінку web-контенту всередині TWA.
