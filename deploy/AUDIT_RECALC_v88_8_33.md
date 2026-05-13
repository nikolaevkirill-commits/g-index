# AUDIT_RECALC v88.8.33

## Math invariant

- G_now = Kp_now − 2 + ΣAᵢ.
- G_day raw = Kp_day/Ap approximation − 2 + ΣAᵢ(noon UTC).
- Day_score = verified PDF/Engine discrete score in [-3..+3].
- Day_score never replaces G_now or G_day in charts, exports, or formulas.

## Verified PDF window

Source: +11.5-24.5_ПРОГНОЗ.pdf.

2026-05-11:+2, 12:+3, 13:+3, 14:-1, 15:-3, 16:-3, 17:+3, 18:+3, 19:-1, 20:+3, 21:+3, 22:+1, 23:-2, 24:-3.

## v88.8.33 fixes

- Hero ring label changed to G_now.
- Scenario block labels changed to PDF/Engine Day_score, not generic engine/G.
- Event/Panchanga summaries now explicitly say live layer / G_now contribution.
- 27-day labels use G_day raw consistently.
- CSV/ICS text avoids naming slot/day values as Live G when not live.
