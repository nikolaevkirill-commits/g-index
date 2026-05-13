# AUDIT v88.8.34 — consistency finish

## Fixed
- `G_now`, `G_day raw`, `Day_score PDF/Engine` are kept separate.
- 27-day chart line remains raw `G_day` only.
- 27-day peak/min/max and forward 7-day peak now use the same `_27dComputed` raw series as the chart.
- 3-day / 27-day labels replace ambiguous `Bulletin` wording with `Day_score` where the value is the discrete PDF/Engine score.
- Tooltip language clarifies that PDF/Engine markers do not alter raw G values.

## Invariant
`Day_score` never replaces `G_now` or `G_day raw` in formulas, chart scale, CSV/ICS raw fields, peak/min/max calculations.

## Source of truth
For 2026-05-11..2026-05-24, the supplied `+11.5-24.5_ПРОГНОЗ.pdf` is the verified PDF source for `Day_score`.
