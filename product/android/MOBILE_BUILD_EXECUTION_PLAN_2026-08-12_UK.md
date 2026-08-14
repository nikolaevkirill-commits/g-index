# План реального mobile build

Дата: 2026-08-12. Мета: перетворити перевірений UX-контракт на Android closed-test build без зміни production engine.

## Архітектурне рішення

Перший closed-test build — TWA/PWA companion до канонічного web origin. Окремий native data engine не створюємо: це усуває ризик двох формул і розсинхрону.

## Work packages

### MB-01 Identity

- затвердити permanent applicationId;
- створити `product.config.json` з package name, host, start URL і support contact;
- отримати Play App Signing SHA-256;
- оновити Digital Asset Links;
- перевірити verified launch без browser chrome.

### MB-02 Mobile shell

- Today / Timeline / Sky / Jyotish / You;
- deep links для widget, alerts і calendar;
- offline/last-good route;
- однакова locale-independent snapshot identity.

### MB-03 Local data

- settings, saved activities, profile і journal local-first;
- export/delete;
- birth data із окремою consent state;
- жодного training opt-in за замовчуванням.

### MB-04 Notifications

- observed/forecast у тексті;
- quiet hours і threshold;
- no alarm language для informational astronomy;
- fail closed, якщо source snapshot прострочений.

### MB-05 QA

- 12 closed-test scenarios;
- мінімум один малий і один великий Android device;
- TalkBack, 200% text, dark/light, offline, DST і timezone;
- evidence JSON + screenshot/video на кожен PASS.

## Definition of done

Closed-test build готовий лише коли applicationId/signing/asset links підтверджені, усі hard failures дорівнюють нулю, physical QA evidence існує, privacy/data safety відповідають фактичній поведінці, а digital sales залишаються вимкненими до billing decision.

## Поточний стан — 2026-08-14

- permanent applicationId: `com.neborythm.app`;
- Play identity, address і Android device verification: підтверджені користувачем;
- Android/Gradle TWA-проєкт: згенерований у `product/android/twa`;
- target/compile SDK: 36;
- unsigned release AAB: збирається успішно, версія `1.0.0` (`versionCode 2`);
- research-шари Tanita, Jyotish і v19.2 залишаються `score_effect=0`.

Незакриті зовнішні блокери: відкрити саме підтверджений Play developer account у поточній browser-сесії, створити app record без дублювання, отримати Play App Signing SHA-256, опублікувати Digital Asset Links, створити й захистити upload key, підписати AAB та виконати фізичний Android QA. Сирий unsigned AAB не завантажувати в Play Console.
