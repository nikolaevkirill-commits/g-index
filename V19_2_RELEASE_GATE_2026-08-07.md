# v19.2 release gate — 2026-08-07

## Status

**HOLD DIRECT PROMOTION. DO NOT MERGE PR #2 TO `deploy`.**

Production remains the existing v18.5 / Expert hierarchy. Reconstructed v19.2 remains an immutable prospective shadow only.

## Recovered source chain

- `forecast_engine_v17_0.py` — recovered and SHA-pinned.
- `forecast_engine_v18_5.py` — recovered, SHA-pinned, native **73/73 PASS**.
- `score_engine_v19_preview.py` — recovered v19.1 source, native **11/11 PASS**.

Important qualification: native v19.1 `11/11` does **not** exercise support-file / Panchanga-prior behavior. Deploy-context support-aware tests were added separately after a path-parity audit found that the root forensic copy loads 0 tithi/nak priors while the deploy copy loads 8/2 priors. Source normalized text is identical; the difference is execution context/support path.

## Raw-chain reproducibility

- 563/563 non-overridden frozen rows reproduce v18.5 exactly.
- The only raw mismatch, 2026-05-21, is a documented historical manual/auto override and is independently present as verified expert/PDF evidence.
- Pre-score verbal alias adapter is idempotent and does not change already recognized canonical tokens.

## Reconstructed v19.2 replay

Frozen precedence was fixed before metrics:

1. v18.5 raw;
2. preserved v19.1 specific rules;
3. if v19.1 changes raw, later/specific wins;
4. otherwise preserved v18.8 generic patches;
5. clip to [-3,+3].

Sealed replay on n=322:

| Metric | Frozen v18.5 | v19.2 reconstructed | Delta |
|---|---:|---:|---:|
| Exact | 43.5% | 44.1% | +0.6 pp |
| within-1 | 69.9% | 74.2% | +4.3 pp |
| Strict-3/sign | 69.6% | 73.3% | +3.7 pp |

These are development/replay agreement metrics, not independent predictive validation.

## Why replay metrics are not sufficient

### GT-informed v18.8 rules

The preserved v18.8 candidate process selected/retained rules using the same PDF/GT development evidence:
- P2 broad was justified by 28 GT/PDF travel dates with ~96% positive behavior;
- P1d was explicitly an exact correction;
- candidates were accepted/rejected on the same ablation/replay workflow.

Five-fold CV after such rule selection is not an independent holdout.

### GT-informed v19.1 priors/calendar enrichment

`panchanga_sign_priors.json` explicitly states that priors were derived from **GT n=350**. Calendar enrichment provenance also includes target-informed inclusion/exclusion decisions. Therefore old `73.4%/75.1%` figures are development-set agreement.

## Candidate runtime impact

Branch-only candidate core:
- 564 rows;
- 130 core changes vs frozen v18.5;
- 20 masked by verified PDF overrides;
- 81 masked by ExpertCalc;
- **29 exposed future Engine-core changes**;
- original frozen sign flips: **12**.

No exposed change is parser-only correctness. Exposed-rule risk taxonomy:
- broad v18.8 generic: 21/29;
- GT-derived Panchanga priors: 5/29;
- specific v19.1 heuristics: 3/29.

## Pre-observation Panchanga provenance hold

Canonical spec fixes Panchanga sampling at **12:00 UTC**. Dashboard code identifies `annual_2026_27.json` as the PRIMARY canonical noon-UTC Panchanga display layer.

Frozen `engine_scores.json` contains separate `cal_tithi/cal_nakshatra` fields. Its own metadata describes them as informational astronomical context / not a validation reference and acknowledges sunrise/off-by-one shifts.

Audit over 207 common 2026 dates:
- tithi matches: **103**;
- tithi mismatches: **104**;
- match rate: **49.8%**.

Reconstructed v19.2 had used frozen `cal_*` for P-v19-5 and P3. Counterfactual re-evaluation under canonical annual noon-UTC context found 10 exposed context-dependent rows and changes **3 frozen final signs**:

- 2026-08-27: frozen `-1` -> canonical-context `0`;
- 2026-08-30: frozen `+1` -> canonical-context `-1`;
- 2026-10-23: frozen `+1` -> canonical-context `0`.

This defect was discovered before any prospective expert/PDF or real-outcome observation (`n=0`). The original freeze is not modified.

`V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json` preregisters:
- original frozen sign-flip set: **12** (descriptive);
- context-invalid quarantine: **3**;
- confirmatory context-valid sign-flip endpoint: **9**.

A first manual transcription of the amendment mis-copied the final two original frozen sign-flip dates. Machine validation immediately rejected it before any prospective observation. The list was corrected to the immutable freeze (`2026-11-25`, `2026-12-13`); quarantine membership remained unchanged. This correction is documented in amendment provenance and was not outcome-informed.

## Structural semantic risks already known before outcomes

- all 4 broad P2/P3 prospective sign flips occur under Saturn-retro context;
- v19.1 comments claim med precedence over Panchanga, but source execution checks Panchanga first; no frozen-29 row is affected;
- support-path behavior differs between root forensic and deploy runtime copies unless support JSON is explicitly present;
- `generate_forecast_pdf.py` omits v19 date/tithi/nak context and historically can disagree in sign with context-aware v19 scoring;
- attempted PDF parity correction was stopped because canonical annual Panchanga differs from frozen `cal_*`, so no unsafe pipeline fix was promoted.

## Runtime packaging defect

`deploy/run_forecast.py` is not self-contained in the repository default runtime:
- deploy-local Excel absent;
- deploy-local annual context absent;
- deploy-local v17/v18.5 dependencies absent;
- clean default CLI ends in `ModuleNotFoundError`.

This is tracked separately and must not be confused with model promotion evidence.

## Prospective governance

Frozen artifacts are hard-locked. Write-capable candidate/freeze generators were removed from CI. Frozen hashes and workflow mutation surface are checked read-only.

Evidence streams remain separate:
- verified post-freeze expert/PDF agreement;
- independently recorded post-date real outcomes.

No imputation, no ExpertCalc substitution, no pooling.

Formal review checkpoints remain:
- 2026-09-30;
- 2026-11-30;
- 2026-12-31.

Confirmatory primary sign/class endpoint is now the **9 context-valid frozen sign-flip rows**, preregistered before observations. Original frozen-12 and quarantined-3 remain descriptive.

## Promotion gates

- [x] Recovered v17/v18.5/v19.1 source chain and hashes.
- [x] Native/source correctness tests.
- [x] Raw-chain reproducibility.
- [x] Verbal alias contract and primary-workbook confirmation.
- [x] Runtime hierarchy classification of 130 core changes.
- [x] Exact rule attribution of 29 exposed rows.
- [x] Original prospective freeze before future evidence.
- [x] Freeze mutation surface hard-locked.
- [x] GT-informed tuning provenance disclosed.
- [x] Canonical-vs-frozen Panchanga provenance audited before observations.
- [x] Pre-observation 12 -> 9 + 3 context-validity amendment created.
- [x] Amendment machine-validation catches date-list drift; typo corrected before observations.
- [ ] Context-amendment/evaluator-v2 CI fully green on latest head.
- [ ] Collect prospective evidence through leakage-safe append-only intake.
- [ ] Reach end-of-cohort review checkpoint.
- [ ] Show no paired disadvantage on confirmatory 9-row sign endpoint and full-cohort within-1.
- [ ] Manual release decision only after all evidence/provenance disclosures.

## Decision

**HOLD.** v19.2 is not production-ready. The next valid evidence is prospective evidence on the immutable shadow, with the context-valid 9-row confirmatory sign endpoint and full disclosure of the original frozen-12 artifact behavior.
