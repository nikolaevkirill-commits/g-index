# Google Drive inventory — 2026-08-09

Google Drive is an **incoming/archive source**, not a production deployment target.

## Canonical incoming tree

- `ПРОГНОЗ` — Drive folder id `1R6oBaO8t6Mrids2ICgtvnloqVLly55qi`
- `ПРОГНОЗ/прогноз по ексель` — id `1XKtPQ4qa3o8wM91R0R73x-xwbGu2BiT3`
- `tmp_pdf_review_10_23_aug` — id `1fwJy9FQeu91UGl29Gend0CaoCwkp5Bv4`

New cloud materials must be discovered here first, copied to a dated staging directory on `D:`, hashed, and audited before any promotion.

## Legacy archive tree

- historical `ПРОГНОЗ` — Drive folder id `1iTS3_faQHQu_mH8evG5-3X9TbzX76MSG`
- historical `прогноз по ексель` — id `1KLZPneD91ZU0MjCA38j6_fM5U5TlR5J`

This tree is archive-only. It must never overwrite newer local or production artifacts by filename alone.

## Verified v1.6.1 research package

- canonical package ZIP — id `1lh15vniCfxAJFkywb61O2Au2xJIbvm07`
- final fixes — id `1Q5Gp6XQ9cRSAHthZfhreyOFrJAK4w-4e`
- corrective gate — id `1FOqcbbc97l5RJ0jakoc3wg7TFVie-1aL`
- foundation package — id `1UXHYxxY7Ut7nox40iqos7BYL-qM-ld13`
- handoff — id `1nVj_bVM4hbrWxclR56M-mR7effolzLzc`
- audit — id `1kOkiLzRUv0T2zy7URzXuVtjlHccZOAi4`

Canonical ZIP SHA-256: `0c15046f0c3b1d6cba1c896062b4eb43712fc8a18d72c2733e2e41f9ed14949e`.

The package passed its reproducibility gates, but all nine tested Jyotish increments had negative out-of-sample delta R-squared and no Holm-significant evidence. It is useful as an audited research archive, not as a reason to change Engine weights.

## Promotion status

- frozen v19.2 shadow: unchanged;
- historical ground truth: not used for new tuning;
- Drive-to-production automatic sync: prohibited;
- duplicate filename: never treated as a newer revision without hash and provenance comparison.
