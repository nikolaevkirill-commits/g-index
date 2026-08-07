# v19.2 prospective shadow — evaluation preregistration

Preregistered: **2026-08-07**, before the first prospective expert/PDF or real-outcome observation was attached.

This document governs evaluation of `V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json` only. It does not authorize production promotion.

## 1. Frozen experiment

- freeze timestamp: `2026-08-07T12:19:13+00:00`;
- cohort: 29 exposed Engine-core rows;
- original frozen class/sign-flip subset: 12 rows;
- candidate SHA256: `95b754735298a0de9f32901a1df2da9052193c47ae629bea7dcf323803716532`;
- production baseline and candidate values are immutable;
- no rule, threshold, tag mapping or model parameter may be changed in response to prospective observations.

Any post-freeze engine change is a **new version/new experiment**, not a correction of this cohort.

### Pre-observation context-validity amendment

Before the first prospective observation (`expert_pdf n=0`, `real_outcome n=0`), a provenance audit found that frozen `engine_scores.cal_tithi/cal_nakshatra` is an informational astronomical layer and differs systematically from the canonical Panchanga contract fixed in `CANONICAL_SPEC_v1.4` at **12:00 UTC** and represented by `annual_2026_27.json`.

`V19_2_CONTEXT_VALIDITY_AMENDMENT_2026-08-07.json` therefore preregisters, without changing any frozen prediction:

- original frozen sign-flip subset: **12** rows — retained descriptively;
- context-invalid / quarantined rows: **3** (`2026-08-27`, `2026-08-30`, `2026-10-23`);
- confirmatory context-valid sign-flip subset: **9** rows;
- quarantine is outcome-independent and was fixed before any prospective label/outcome;
- counterfactual canonical-context scores are diagnostic only and never replace the frozen predictions in the historical experiment.

The three quarantined rows are excluded only from the confirmatory promotion endpoint. They remain visible in descriptive reporting.

## 2. Evidence streams remain separate

### A. Expert/PDF stream

Measures prospective agreement with expert/PDF labels only. It is **not real-world predictive validity**.

Eligible evidence must:
- belong to one of the frozen 29 dates;
- be verified with source PDF/page/hash;
- first materialize in Git strictly after the freeze timestamp;
- pass the leakage-safe intake guard.

### B. Real-outcome stream

Measures prospective outcome agreement only.

Eligible evidence must be independently recorded after the relevant date under a locked/blind outcome protocol. Expert/PDF labels, `expert_calc`, calendar symbols, Engine scores or retrospective narrative are not substitutes for real outcomes.

If no valid real outcome exists, the row remains missing.

The two streams are never pooled into one accuracy number.

## 3. Primary endpoints

The primary comparison is always **candidate versus frozen production baseline on the same observed rows**.

### 3.1 Confirmatory sign/class endpoint — 9 context-valid frozen sign-flips

Primary endpoint: paired **sign/3-class correctness** on the 9 context-valid rows where baseline and candidate differ in sign/class.

Report:
- baseline correct count / n;
- candidate correct count / n;
- paired wins / losses / ties;
- candidate-minus-baseline difference;
- coverage observed/9.

The original 12-row frozen sign-flip set is still reported descriptively, but cannot override the confirmatory 9-row endpoint because 3 rows have pre-observation input-provenance defects.

### 3.2 Full exposed cohort — up to 29 rows

Primary magnitude endpoint: paired **within-1 accuracy** on all observed rows.

Report the same paired counts and difference for baseline and candidate.

## 4. Secondary endpoints

Secondary/descriptive only:
- exact 7-class agreement;
- sign/3-class agreement on all observed 29 rows;
- original frozen-12 sign endpoint;
- quarantined-3 descriptive endpoint;
- within-1 on sign-flip rows;
- absolute error;
- direction of error.

A secondary endpoint cannot override a failure on the corresponding primary endpoint.

## 5. Prespecified rule-family diagnostics

Descriptive stratification only; no subgroup can independently authorize promotion:

- `v18.8_P1d_empty_plus2_to_plus1`;
- broad v18.8 P2/P3 travel/Dashami rules;
- v19.1 Panchanga priors;
- v19.1 bolt/action rescue;
- v19.1 med solo.

Known pre-observation governance flags:
- all 4 broad P2/P3 prospective sign flips occur under Saturn retro context;
- Panchanga priors/calendar enrichment contain GT-informed development choices;
- recovered v19.1 med-vs-Panchanga precedence comment conflicts with source execution order, but no frozen-29 row is affected;
- frozen Panchanga-dependent rules used informational `engine_scores.cal_*`; canonical noon-UTC counterfactual changes 3 frozen sign predictions, which are quarantined from the confirmatory endpoint.

These flags must be reported, not used to rewrite frozen predictions.

## 6. Missing data

- no imputation;
- no last-observation carried forward;
- no ExpertCalc substitution for missing PDF;
- no PDF substitution for missing real outcome;
- denominator is always the explicitly observed eligible rows for that stream and endpoint;
- coverage (`observed / eligible`) must be reported next to every metric.

## 7. Fixed review checkpoints

To limit outcome-driven peeking, formal release reviews occur only at these checkpoints:

1. **2026-09-30** — interim descriptive review;
2. **2026-11-30** — second interim descriptive review;
3. **2026-12-31** — end-of-cohort review, after the final frozen date (2026-12-28).

Additional observations may be appended between checkpoints, but no promotion decision is made from ad-hoc intermediate peeks.

## 8. Promotion policy

There is **no automatic numeric promotion threshold** for this 29-row cohort.

At minimum, a production promotion discussion requires:
- the end-of-cohort checkpoint has been reached;
- candidate does not show a paired disadvantage versus baseline on the **9-row context-valid confirmatory sign/class endpoint**;
- candidate does not show a paired disadvantage versus baseline on full-cohort within-1;
- original frozen-12 and quarantined-3 results are disclosed descriptively;
- expert/PDF and real-outcome evidence are discussed separately;
- missing-data coverage is disclosed;
- GT-informed development provenance and Panchanga-context defect are disclosed;
- no frozen prediction was changed after freeze.

Even if these conditions hold, promotion remains a manual release decision and should create a versioned production candidate rather than silently replacing v18.5.

## 9. Invalidating events

This experiment is invalidated for promotion purposes if any of the following occurs:
- frozen candidate/hash changes;
- frozen baseline or 29-row cohort changes;
- the pre-observation quarantine list changes after prospective evidence appears;
- a post-freeze observation is backdated or lacks provenance;
- rules/thresholds are tuned using any prospective observation and then evaluated on the same frozen cohort;
- expert/PDF and real outcomes are pooled or substituted for each other.

If invalidated, preserve the evidence, document the event, and start a new preregistered version rather than repairing v19.2 in place.
