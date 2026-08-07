# v19.2 prospective shadow — evaluation preregistration

Preregistered: **2026-08-07**, before the first prospective expert/PDF or real-outcome observation was attached.

This document governs evaluation of `V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json` only. It does not authorize production promotion.

## 1. Frozen experiment

- freeze timestamp: `2026-08-07T12:19:13+00:00`;
- cohort: 29 exposed Engine-core rows;
- class/sign-flip subset: 12 rows;
- candidate SHA256: `95b754735298a0de9f32901a1df2da9052193c47ae629bea7dcf323803716532`;
- production baseline and candidate values are immutable;
- no rule, threshold, tag mapping or model parameter may be changed in response to prospective observations.

Any post-freeze engine change is a **new version/new experiment**, not a correction of this cohort.

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

### 3.1 Sign/class-change subset — 12 frozen rows

Primary endpoint: paired **sign/3-class correctness** on rows where baseline and candidate differ in sign/class.

Reason: these are the rows where v19.2 makes the operationally material categorical decision that production does not.

Report:
- baseline correct count / n;
- candidate correct count / n;
- paired wins / losses / ties;
- candidate-minus-baseline difference.

Do not replace this endpoint with a more favorable metric after observations arrive.

### 3.2 Full exposed cohort — up to 29 rows

Primary magnitude endpoint: paired **within-1 accuracy** on all observed rows.

Report the same paired counts and difference for baseline and candidate.

## 4. Secondary endpoints

Secondary/descriptive only:
- exact 7-class agreement;
- sign/3-class agreement on all observed 29 rows;
- within-1 on the 12 sign-flip rows;
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
- recovered v19.1 med-vs-Panchanga precedence comment conflicts with source execution order, but no frozen-29 row is affected.

These flags must be reported, not used to rewrite the frozen predictions.

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
- candidate does not show a paired disadvantage versus baseline on the primary sign/class endpoint in the 12-row subset;
- candidate does not show a paired disadvantage versus baseline on full-cohort within-1;
- expert/PDF and real-outcome evidence are discussed separately;
- missing-data coverage is disclosed;
- GT-informed development provenance is disclosed;
- no frozen prediction was changed after freeze.

Even if these conditions hold, promotion remains a manual release decision and should create a versioned production candidate rather than silently replacing v18.5.

## 9. Invalidating events

This experiment is invalidated for promotion purposes if any of the following occurs:
- frozen candidate/hash changes;
- frozen baseline or 29-row cohort changes;
- a post-freeze observation is backdated or lacks provenance;
- rules/thresholds are tuned using any prospective observation and then evaluated on the same frozen cohort;
- expert/PDF and real outcomes are pooled or substituted for each other.

If invalidated, preserve the evidence, document the event, and start a new preregistered version rather than repairing v19.2 in place.
