# Сценарії closed test

Дата: 2026-08-12. Мета: перевірити розуміння, safety, локалізацію й доступність до Play production.

## CT-01 Один головний стан

Умова: PDF/reference позитивний, operational state `HOLD`.

Очікування: користувач називає `HOLD`; reference бачить лише у поясненні; позитивний колір reference не сприймає як дозвіл.

## CT-02 Свіжість не дорівнює рішенню

Умова: source `LIVE`, decision `CAUTION`.

Очікування: користувач розуміє, що `LIVE` означає лише вік даних.

## CT-03 Last-good/offline

Умова: live fetch недоступний, snapshot `LAST_GOOD` старший порога.

Очікування: немає `ACT`; вік і fallback видно до рекомендації.

## CT-04 Timeline

Умова: raw, operational і PDF/reference мають різні значення.

Очікування: три канали візуально й текстово різні; користувач не називає raw-лінію готовим рішенням.

## CT-05 Sky

Умова: видимий парад планет, `score_effect=0`.

Очікування: подія цікава й помітна, але не змінює колір hero.

## CT-06 Jyotish Lite

Умова: показано п'ять anga й Rahu window.

Очікування: користувач розуміє, що це один традиційний календарний шар; слово `Jyotish` має коротке пояснення.

## CT-07 Немає точного часу народження

Умова: користувач вводить лише дату.

Очікування: Moon-based режим і попередження; Lagna/D1/D9 не показуються як точні.

## CT-08 Saved activity

Умова: обрано `meeting`.

Очікування: змінюється пояснення/пошук вікон, але не operational state; disclaimer видимий.

## CT-09 Outcome check-in

Умова: три локальні записи.

Очікування: `INSUFFICIENT_SAMPLE`; немає відсотка точності або автоматичного tuning.

## CT-10 Мови

Умова: той самий snapshot у UK, EN, es-ES, es-419.

Очікування: decision, timestamps, source roles і score effects тотожні; відрізняється лише редакційна подача.

## CT-11 Accessibility

Умова: 360px, 200% text, screen reader, keyboard/switch navigation, reduced motion.

Очікування: decision → reason → freshness → next change читаються в цьому порядку; нічого істотного не залежить лише від кольору; targets ≥48×48 dp.

## CT-12 Privacy

Умова: створення й видалення локального профілю/Jyotish даних.

Очікування: згода явна; видалення повне; account не потрібен для Lite; training off.

## Evidence template

Для кожного сценарію зберігаються: build/version, device/OS, locale, timezone, timestamp, expected, observed, PASS/FAIL, screenshot/video path, tester і issue link. `PASS` без доказового файла не закриває external gate.
