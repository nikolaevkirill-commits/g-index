# Formula repository parity — 2026-08-23

Owner authority: `G_raw = (2 − Kp) + Li + Mi + ei + Pi + Di`.

## Active executable and normative conflicts corrected

| File | Occurrence | Resolution |
|---|---|---|
| `build_phase2_data_package.py` | lineage and `G_day` normalization described dashboard as `Kp−2` | Corrected to `2−Kp`; Sn clarified as context-only. |
| `deploy/backtest.html` | two public explanatory formulas used `Kp−2` | Corrected to `2−Kp`; Engine threshold-classifier distinction retained. |
| `CANONICAL_SPEC_v1_4.md` | four normative `Kp−2` statements | Frozen file preserved; superseded only by `CANONICAL_SPEC_v1_4_1_ERRATUM.md`. |

## Conflicting historical/non-authoritative occurrences preserved

These are retained as historical evidence, not current authority:

- `deploy/AUDIT_RECALC_v88_8_30.md` and `deploy/AUDIT_RECALC_v88_8_31.md`: historical audit reports.
- `deploy/recalc_snapshot_2026-05-11_24_v88_8_30.json`: historical recalculation snapshot.
- `deploy/index_fp117_FIXED.html`: legacy fp117 executable snapshot, not the production entry point.
- `deploy/index.html`: legacy deployment-tree snapshot; the production entry point is repository-root `index.html`.
- `deploy/engine_v18_8_v88_8_30.json` and `deploy/engine_v18_8_v88_8_31.json`: historical release metadata snapshots.
- `deploy/HANDOFF_v87_61.md`: historical handoff analysis.
- `deploy/sw_fixed.js` and `deploy/sw_fp117_OK.js`: legacy service-worker snapshots/comments.

## Aligned current authority

- Production `index.html` calculations use the single helper `kpDayTerm(kp) = 2 - kp`.
- `verify_index_integrity.py` and `verify_production_release_guard.py` enforce `2−Kp`.
- `expert_calc_scores.json` declares `Kp_N=2-Kp`.
- `CANONICAL_SPEC_v1_4_1_ERRATUM.md` is the current normative correction.
- `verify_fp420_formula_authority.js` locks Kp 1/2/4/5 to +1/0/−2/−3.
- `verify_fp420_repository_formula_scan.js` fails on a conflicting active executable or normative occurrence while explicitly inventorying frozen/historical exceptions.

Formula BLOCK may close only while the current production entry point, current generators, tests, UI text, integrity artifacts, and erratum remain aligned. Prospective/evidence BLOCK remains open.
