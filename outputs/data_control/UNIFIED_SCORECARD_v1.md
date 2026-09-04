# Єдиний scorecard G-Index

Згенеровано: `2026-09-04T11:31:57+00:00`.

Це не один відсоток: нижче три різні цілі, які не можна змішувати.

| Що перевіряємо | N | Exact | ±1 / directional | Знак | Статус |
|---|---:|---:|---:|---:|---|
| Відтворення frozen PDF | 43 | 39.53% | 51.16% | 55.81% | не є фактичним прогнозом |
| Chronological Engine holdout | 62 | 51.61% | 88.71% | 79.03% | історична перевірка проти expert/PDF |
| Реальний outcome | 0 | — | — | — | ще немає зв'язаних frozen-прогнозів |

## Висновок

- Таніта не має підтвердженого приросту на хронологічному holdout; `score_effect = 0` лишається правильним.
- Космічні safety-сигнали та BGS/ENLIL лишаються advisory: вони не підміняють денний вердикт.
- Перший дозволений шлях до справжнього покращення — prospective snapshots + незалежні outcomes, а не підбір ваг за минулими PDF.

## Автоматичний gate

Потрібно 30 пар із frozen-прогнозом для формального тесту та 100 для promotion. Зараз пар: 0.

Жодна нова ознака не переходить у production, доки не має наперед зареєстрованого правила та незалежного позитивного результату.

## Tanita vs independent outcomes

- Frozen snapshots: 62.
- Fully elapsed dates: 34.
- Paired independent outcomes: 0.
- Awaiting independent outcomes: 34.
- Production score effect: 0 until the pre-registered promotion gate passes.
