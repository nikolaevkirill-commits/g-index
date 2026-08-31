# Єдиний scorecard G-Index

Згенеровано: `2026-08-31T18:43:05+00:00`.

Це не один відсоток: нижче три різні цілі, які не можна змішувати.

| Що перевіряємо | N | Exact | ±1 / directional | Знак | Статус |
|---|---:|---:|---:|---:|---|
| Відтворення frozen PDF | 39 | 41.03% | 53.85% | 56.41% | не є фактичним прогнозом |
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

- Frozen snapshots: 58.
- Fully elapsed dates: 30.
- Paired independent outcomes: 0.
- Awaiting independent outcomes: 30.
- Production score effect: 0 until the pre-registered promotion gate passes.
