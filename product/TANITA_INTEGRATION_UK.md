# Tanita у прогнозі — протокол інтеграції

## Що вже доведено

- Детермінована формула відтворюється 495/495 на доступному матеріалі.
- Історична strong-image підвибірка має високий збіг з PDF, але PDF не є незалежним outcome.
- На chronological holdout найкращий Tanita-кандидат не покращив baseline: delta strict-sign = 0.
- Незалежних prospective outcome-пар: 0/100.

## Що показує продукт

- `Tanita shadow score` для дати.
- Збіг, часткова розбіжність або конфлікт із PDF/Engine reference.
- Розпізнані символи та їх provenance.
- Історичні метрики з підписом «не real outcomes».
- Лічильник незалежних outcomes і `Promotion: HOLD`.

## Що заборонено

- Додавати Tanita як другий голос до G.
- Фарбувати збіг Tanita зеленим як дозвіл діяти.
- Показувати 93.5% strong-image sign як загальну точність прогнозу.
- Змінювати коефіцієнти після перегляду outcomes.

## Шлях до активації

1. Заморозити невеликий набір правил до кожної дати.
2. Записувати timestamp, source hash, score і detected icons.
3. Збирати незалежний outcome окремо від PDF та самооцінки моделі.
4. Досягти 100 валідних заморожених пар.
5. Провести time-split аудит проти baseline, перевірити coverage і multiple testing.
6. Лише окремий release review може змінити `score_effect` з нуля.

