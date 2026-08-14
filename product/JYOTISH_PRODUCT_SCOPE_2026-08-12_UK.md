# Jyotish у продукті: межі й план реалізації

Дата: 2026-08-12; технічний статус оновлено 2026-08-14. Статус: research implementation; не змінює production score.

## Технічний статус 2026-08-14

- створено окремий research-engine на `Astronomy Engine 2.1.19` (MIT): D1, D9, 9 graha, 12 whole-sign bhava та Vimshottari;
- додано автоматичні invariant/regression-тести, local-only контракт профілю народження, згоду, експорт і видалення;
- Lahiri ayanamsha та lunar node поки апроксимаційні, тому це не незалежно підтверджена Kundli;
- consumer activation заблоковано до 100 незалежних еталонних карт і редакторської перевірки термінології;
- весь персональний Jyotish має `score_effect=0` і не змінює operational forecast.

## Рішення щодо назви

Головний consumer-розділ називаємо **Jyotish** із локальним поясненням:

- UK: `Джйотіш · ведичний гороскоп і календар`;
- EN: `Jyotish · Vedic chart & timing`;
- es-ES/es-419: `Jyotish · carta védica y ritmos del día`.

`Panchanga` не зникає: це календарний підрозділ Jyotish. Назва `індійський гороскоп` може бути лише пошуковим/навчальним синонімом, а не точним заголовком продукту.

## Що вже реально є

- Tithi, Vara, Nakshatra, Yoga, Karana;
- локальні Rahu/Yama/Gulika-вікна, але з відомими DST/апроксимаційними межами;
- Lahiri sidereal для Nakshatra і Surya Sankranti;
- Chandra Rashi та Nakshatra Pada як informational;
- Janma Nakshatra, Taara і Vimshottari Dasha як Experimental;
- один агрегований компонент `P` у чинній формулі.

Це **Jyotish Calendar / Lite**, але ще не повний персональний ведичний гороскоп.

## Jyotish Lite — перший реліз

1. Картка дня: Tithi, Nakshatra, Vara, Yoga, Karana.
2. Moon sign / Chandra Rashi і Pada.
3. Локальні часові вікна з timezone, sunrise boundary та DST.
4. Просте пояснення кожного терміна і його ролі.
5. Позначка `traditional calendar`, окрема від фізичних NOAA-даних.
6. Явне поле `враховано в головному стані / лише інформаційно`.
7. Перемикач приховування традиційного шару.

До релізу Lite потрібно виправити sunrise boundary, DST і локальний день; порівняти контрольні дати/локації з незалежним еталоном.

## Jyotish Personal — другий етап

Потребує добровільних дати, точного часу й місця народження:

- sidereal positions дев'яти graha;
- Lagna/Ascendant і 12 bhava;
- D1/Rashi chart;
- D9/Navamsha;
- Janma Nakshatra/Pada;
- Vimshottari Mahadasha й Antardasha;
- поточні sidereal transits;
- коротке пояснення без фатальних тверджень.

Неточний або відсутній час народження має давати обмежений Moon-based режим, а не удавано точний Lagna.

## Full Jyotish — не для MVP

Shodashvarga, Ashtakavarga, Shadbala, численні Yoga/Dosha, Muhurta, compatibility/Kundli matching, remedial advice та AI-astrologer суттєво розширюють методологію й ризик. Їх не додаємо до завершення окремої специфікації, експертної перевірки та user research.

## Розрахунковий контур

Для персональної карти потрібен перевірений ephemeris engine. Для research-контуру обрано permissive `Astronomy Engine 2.1.19`; Swiss Ephemeris лишається альтернативою після окремого ліцензійного рішення. Потрібно зафіксувати:

- версією бібліотеки й data files;
- Lahiri ayanamsha;
- UTC/TT conversion;
- географічними координатами, timezone і DST;
- house system;
- тестовими векторами для high latitude і DST boundaries;
- ліцензійним рішенням до вбудовування або серверного використання.

Поточний Meeus-контур достатній для частини календарних полів за задокументованих меж, але не слід автоматично називати його повною Kundli-системою.

## Інтерпретація й довіра

Кожен текст має посилатися на структуровані вхідні фактори й версію правил. Генеративний ШІ може лише перефразовувати затверджену інтерпретаційну картку; він не вигадує yoga, dosha, transit або результат події.

Заборонені формулювання:

- гарантоване майбутнє;
- діагноз, смерть, вагітність, фінансова гарантія;
- `не підписуйте / не подорожуйте` без нейтральної мови вибору;
- страхітливі remedial sales.

Потрібна незалежна перевірка практиком Jyotish для термінології й традиційної коректності. Вона не є доказом фізичної причинності або прогнозної accuracy.

## Privacy

Дата, точний час і місце народження — чутливий персональний профіль. За замовчуванням він локальний; потрібні окрема згода, видалення, експорт і пояснення мети кожного поля. Акаунт не є обов'язковим для Lite.

## Вплив на G

- Panchanga залишається одним компонентом `P`; перейменування UI не додає нового голосу.
- Natal chart, Dasha, transits і тексти Jyotish на старті мають `score_effect=0`.
- Будь-який новий вплив проходить окремий prospective validation gate.
- v19.2 і Tanita залишаються Shadow незалежно від Jyotish-розділу.

## Рекомендований екран

`Jyotish` відкривається трьома вкладками:

1. `Сьогодні` — календар і найближчі вікна.
2. `Моя карта` — Moon-based до введення точного часу; D1/D9 після валідації engine.
3. `Періоди` — Dasha/transits лише після тестового gate.

На кожній картці є `Що це?`, `Що означає в традиції?`, `Чи впливає на головний стан?` і `Які дані використано?`.

## Ворота готовності

- calculation spec і golden test vectors;
- independent cross-check мінімум для 100 карт і boundary cases;
- sunrise/timezone/DST correctness;
- ephemeris/license decision;
- expert terminology review;
- privacy/data deletion flow;
- EN, es-ES, es-419 native editorial review;
- usability test: користувач розуміє різницю між Panchanga, natal chart і operational forecast;
- заборона маркетингових claims про точність до prospective evidence.
