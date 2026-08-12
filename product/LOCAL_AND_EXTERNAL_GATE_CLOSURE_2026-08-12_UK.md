# Закриття локальних блоків і зовнішні gates

Дата: 2026-08-12.

## Закрито локально

- конкурентний аудит і позиціонування;
- MVP information architecture;
- hero/provenance/freshness semantics;
- Панчанга як один агрегований календарний компонент;
- контракти подій неба, alerts, widgets, calendar export і forecast history;
- UTC→Europe/Kyiv DST regression tests;
- UA/EN/ES listing lint і claims guard;
- store asset provenance/dimensions/hash audit;
- TWA template/generator automated test;
- Play-channel static і browser-emulation QA: auth/paywall hidden;
- responsive viewport emulation 320/360/390/412 та landscape;
- Tanita/v19.2 score neutrality.

## Підготовлено, але не можна чесно позначити виконаним

| Gate | Чому зовнішній | Готовий вхід |
|---|---|---|
| Остаточна назва/trademark | потрібні реєстри й юридичне рішення | brand candidates, competitor audit, clearance checklist |
| Package ID | незворотно пов’язаний із Play identity | fail-closed config template |
| Signing key/fingerprint | створюється власником Play App Signing | TWA й assetlinks templates |
| Physical Android QA | потрібен реальний пристрій/AAB | viewport QA і device checklist |
| Play declarations | заповнюються для фактичної збірки | Data Safety та submission draft |
| Support email verification | потрібен доступ до пошти | адреса в config/listing |
| Prospective v19.2/Tanita | потрібні нові незалежні outcomes | frozen gates, `score_effect=0` |

## Канонічний стан

**LOCAL PRODUCT PACKAGE COMPLETE / EXTERNAL RELEASE GATES OPEN.** Це не означає, що застосунок уже дозволено публікувати. `READY_FOR_PLAY_SUBMISSION` настає лише після всіх зовнішніх gates.
