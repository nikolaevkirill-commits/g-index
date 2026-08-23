# Formula authority conflict — 2026-08-23

## Status: RESOLVED by owner decision on 2026-08-23

Owner-designated authority: `G_raw = (2 − Kp) + Li + Mi + ei + Pi + Di`. The frozen model, weights, thresholds, sealed holdout, PDF/Excel sources, runtime calculation, and historical results remain unchanged. `CANONICAL_SPEC_v1_4.md` is preserved as frozen; its `Kp − 2` wording is superseded only by `CANONICAL_SPEC_v1_4_1_ERRATUM.md`.

## Conflicting authorities

- Deployed dashboard runtime and integrity tests calculate `G_raw = (2 − Kp) + Li + Mi + ei + Pi + Di`.
- Frozen `CANONICAL_SPEC_v1_4.md` states dashboard `G = (Kp − 2) + Li + Mi + ei + Pi + Di`.
- The same frozen specification's adverse-Kp table assigns increasingly negative penalties as Kp rises, which conflicts semantically with the `Kp − 2` raw term.

## Consequence analysis

| Candidate convention | Kp=1 | Kp=4 | Kp=5 | Consequence |
|---|---:|---:|---:|---|
| `2 − Kp` (current deployed runtime) | +1 | −2 | −3 | Higher Kp lowers raw context; agrees with deployed behavior and adverse-Kp direction. |
| `Kp − 2` (frozen spec wording) | −1 | +2 | +3 | Higher Kp raises raw context; adopting it would reverse the runtime geomagnetic contribution and require re-validation. |

## Unchanged contracts

- PDF/Engine is a separate daily reference, not an automatic command to act.
- Future `G_raw` cannot replace the current operational decision.
- `Pi` is included once in `G_raw`.
- Rahu/Yama/Gulika are time-window guards and must not be added into `Pi` or `G_raw` again.

Formula authority BLOCK is closed after the fp420 repository parity scan and regression suite. Prospective/evidence gates remain BLOCKED and must not be backfilled retrospectively.
