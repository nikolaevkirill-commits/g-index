# CANONICAL SPEC v1.4.1 — formula sign erratum

Effective: 2026-08-23  
Authority: owner decision  
Supersedes: only the dashboard geomagnetic-term wording in `CANONICAL_SPEC_v1_4.md`

## Canonical convention

`G_raw = (2 − Kp) + Li + Mi + ei + Pi + Di`

Therefore the geomagnetic term is:

| Kp | `2 − Kp` |
|---:|---:|
| 1 | +1 |
| 2 | 0 |
| 4 | −2 |
| 5 | −3 |

The occurrences of `Kp − 2` describing dashboard `G_raw` in frozen `CANONICAL_SPEC_v1_4.md` are specification sign errors, not an alternative model convention.

## Scope

This is a documentation/specification correction only. It changes no runtime calculation, frozen model parameter, weight, threshold, sealed holdout, PDF/Excel source, historical output, validation metric, or prospective record. The frozen v1.4 file remains unmodified.

The frozen Engine is a threshold classifier rather than a literal continuous formula. Its adverse-Kp direction remains consistent with this erratum: increasing Kp cannot improve the geomagnetic contribution.

PDF/Engine remains a separate daily reference; future raw forecasts cannot replace the current operational decision; `Pi` is included once; Rahu/Yama/Gulika remain time-window guards.

Prospective/evidence gates remain BLOCKED until genuine future outcomes accumulate. Retrospective backfilling is prohibited.
