# AUDIT v88.8.31 — Math Truth / 27-day G_day clarification

## Verdict
Математика G не змінена: `G = Kp - 2 + ΣAᵢ`.

Виправлено UX-семантику 27-day: цей блок показує не поточний Hero G, а денний raw-контекст `G_day = Kp_day(max/approx) - 2 + ΣAᵢ(noon UTC)`.

## Що перевірено
- 3-day cards: PDF/Engine day score для 13–15.05 збігається з крайнім PDF.
- Hero: G_now лишається live raw, PDF/Engine лишається окремим Day_score.
- 27-day chart/table: line/table use raw G_day only; PDF/Engine score is marker/tooltip only.
- CSV/ICS: two-rail semantics збережена.

## Чому був ризик помилки
На екрані 27-day лінія могла виглядати як той самий G, що Hero. Це не так: 27-day використовує добовий/наближений Kp з NOAA Ap outlook або 3-day max. Тому значення може відрізнятися від поточного G_now.
