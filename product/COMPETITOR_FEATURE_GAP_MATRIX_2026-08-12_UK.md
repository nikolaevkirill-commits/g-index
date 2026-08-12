# Матриця функціональних прогалин

Дата: 2026-08-12. Мета: взяти сильні механіки ринку без копіювання бренду, текстів, графіки або неперевірених обіцянок.

| Механіка | Ринковий приклад | У нас | Рішення | Етап |
|---|---|---|---|---|
| Один короткий режим дня | CHANI, The Pattern | є контракт, немає нового mobile UI | реалізувати один truth-state | MVP |
| Пояснення від простого до технічного | CHANI, TimePassages | частково в dashboard | 3 рівні disclosure | MVP |
| Збережені типи справ | Moon Calendar, UAV Forecast | немає | користувач обирає справу, система показує вікна без гарантії результату | MVP |
| Вибіркові alerts | MoonX, Aurora apps | є базовий контракт | додати тихі години, source scope і причину спрацювання | MVP |
| Jyotish Lite | Drik Panchang, Moonly | Panchanga вже є | обгорнути календар пояснюваним Jyotish Lite | MVP |
| Віджет | MoonX, погодні застосунки | контракт готовий | реалізувати після Android build gate | Growth |
| Calendar export | Moon Calendar | контракт готовий | реалізувати з provenance і disclaimer | Growth |
| Журнал результатів | The Pattern, wellness apps | технічний outcome ledger, немає consumer UX | приватний check-in без самопідтверджувального scoring | Growth |
| Персональна ведична карта | TimePassages, AstroSage | лише experimental Janma/Dasha | D1/D9/Lagna після ephemeris і validation gates | Growth |
| Порівняння періодів | planning/calendar apps | технічний 27-day графік | просте compare із розділенням raw/reference | Growth |
| Кілька профілів | family/astrology apps | UI-заготовка | локальні профілі з consent | Growth |
| Соціальна сумісність | Co–Star | немає | не брати до підтвердження попиту й privacy design | Hold |
| Live astrologer marketplace | Sanctuary, AstroSage | немає | відхилити: інший бізнес і trust model | Reject |
| Таро, руни, psychic chat | Nebula, Moonly | немає | відхилити: розмиває доказові типи | Reject |
| AI-віщун | AstroSage AI | немає | відхилити; AI може лише перефразовувати затверджені картки | Reject |
| Нескінченна horoscope-стрічка | масові horoscope apps | немає | відхилити: generic content і залежність від engagement | Reject |
| Прихований weekly trial | частина spiritual apps | немає | заборонити | Reject |

## Унікальна комбінація

Нашою перевагою є не максимальна кількість функцій, а зв'язка:

1. один operational state;
2. observed/forecast/reference/traditional/research розділені;
3. видима свіжість і provenance;
4. Sky + space weather + Jyotish без удаваної єдиної наукової метрики;
5. персональний журнал для власних спостережень;
6. однаковий truth snapshot в усіх мовах.

## Правило прийняття нової функції

Функція входить у roadmap лише якщо має: конкретну потребу користувача, data contract, privacy state, accessibility acceptance, failure/fallback behavior і чітке `score_effect`. Відсутність будь-якого поля означає `HOLD`.
