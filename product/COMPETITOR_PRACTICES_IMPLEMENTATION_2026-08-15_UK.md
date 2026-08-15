# Конкурентні практики → реалізація NeboRhythm

Дата повторної перевірки: 2026-08-15. Джерела: актуальні офіційні сторінки App Store. Це продуктовий аудит, а не доказ точності астрологічних прогнозів.

## Що беремо

| Практика | Підтверджений приклад | Реалізація в NeboRhythm | Статус |
|---|---|---|---|
| Відповідь за 5 секунд | Co–Star: daily horoscope, push, do/don't; CHANI: daily guidance | Один Today state, дві картки «доречно / відкласти», наступна зміна | Є в shell |
| Поступове розкриття | CHANI: beginner-to-expert; TimePassages: free daily → deep chart | Today → Why → factors → source/freshness | Посилено fp400 |
| Мова життєвих процесів | The Pattern приховує складну термінологію за self/relationship insights | Proceed / Prepare / Hold / Review; Jyotish терміни пояснюються окремо | Є |
| Точний час і календар | TimePassages transits; MoonX calendar, exact location, alerts | 24h / 3d / 27d timeline, local windows, timezone | Частково: live adapter ще потрібен |
| Щоденна звичка | CHANI weekly ritual/audio; MoonX widgets/journal | Activity choice, outcome check-in, selective alert rules | Є локально; push не активований |
| Персоналізація без вигадування | TimePassages uses birth chart; The Pattern uses personal cycles | Birth-data functions locked until ephemeris/privacy/100-chart gates | Fail-closed |
| Походження даних | TimePassages stresses human authors; MoonX exact location | source role, confidence, observed/generated/valid timestamps | Посилено fp400 |
| Багатомовність | MoonX має 15 мов | UA / EN / ES complete product shell | Є |

## Чого свідомо не беремо

- Категоричне «страшно точно», гарантовані наслідки або фізична причинність.
- «NASA доводить астрологію». NOAA/NASA можуть бути лише джерелом фізичних даних.
- Другий вердикт від Jyotish, Tanita або v19.2. Їхній score effect залишається 0 за замороженим протоколом.
- Перевантаження Tarot/psychic/chat/marketplace, як у широких spiritual-apps.
- Paywall, що забирає базовий Today і пояснення після формування звички.

## Відмінність продукту

NeboRhythm не конкурує як «ще один гороскоп». Його ядро — практичний часовий навігатор: один канонічний стан, окремі шари observed / forecast / traditional / informational, видима свіжість і журнал реальних результатів.

## Незакриті блоки

1. Production adapter до канонічного resolver: Timeline і Sky не можуть лишатися hardcoded demo.
2. Фізичний Android QA та AAB.
3. Push/віджети після перевірки permission і privacy flow.
4. Персональні D1/D9/Dasha лише після ephemeris, ліцензії, privacy та незалежних golden vectors.
5. Store screenshots тільки після live adapter; зараз допустимі лише як підписаний prototype/demo.
