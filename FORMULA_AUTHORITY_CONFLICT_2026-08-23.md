# Formula authority conflict — 2026-08-23

## Status: BLOCKED pending owner decision

No formula is selected by this audit. The frozen model, weights, thresholds, sealed holdout, PDF/Excel sources, and historical results remain unchanged.

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

Required owner decision: explicitly designate the authoritative sign convention and issue a new specification version. Until then, production behavior is documented as deployed behavior, not declared canonical by this audit.
