# Engine v19.2 release gate — 2026-08-07

Status: **HOLD DIRECT PROMOTION / FROZEN PROSPECTIVE SHADOW**

This gate concerns the reconstructed v19.2 candidate only. The original historical v19.2 consolidation source is still unrecovered. Production `deploy` and canonical `engine_scores.json` are unchanged.

## 1. Provenance closed enough for shadowing

Recovered byte-identical source chain is self-contained in the correctness branch and SHA-pinned in CI:

- `forecast_engine_v17_0.py`
- `forecast_engine_v18_5.py`
- `score_engine_v19_preview.py` (v19.1)

Native validation remains green:

- v18.5: **73/73 PASS**
- v19.1: **11/11 PASS**

Raw-chain audit:

- 564 scorable frozen rows;
- 563/563 non-overridden rows reproduce frozen v18.5 exactly;
- the only mismatch, `2026-05-21`, is a documented historical override `-3 -> +3` and is independently present as a verified expert/PDF override.

Therefore there is no unexplained raw-engine drift in the preserved snapshots.

## 2. Candidate core impact

Branch-only `engine_scores_v19_2_candidate.json` contains 564 rows and is explicitly marked:

- `production=false`;
- `historical_v19_2_source_recovered=false`;
- expert overrides are not folded into `eng`.

Core changes versus frozen v18.5: **130/564**.

## 3. Actual production hierarchy impact

The first hierarchy audit was corrected after finding that ExpertCalc lives in the separate `expert_calc_scores.json` file rather than inside each frozen snapshot.

The audited runtime hierarchy is:

`verified expert override > expert_calc_scores.json > Engine core`

Correct v2 classification of the 130 candidate-core changes:

- **20** masked by verified expert/PDF override;
- **81** masked by ExpertCalc;
- **29** exposed Engine-core changes.

All **29 exposed changes are prospective dates on/after 2026-08-07**. None of the historically observed changed rows remains exposed through the current runtime hierarchy.

Among the 29 exposed rows:

- **12** change sign/class relative to current production Engine core;
- 17 change magnitude only.

This is the decisive release-risk: the historical sealed replay does not directly validate the effective production impact of these exact 29 future rows.

## 4. Exact rule attribution of the 29 exposed rows

Rule counts:

- `v18.8 P1d empty +2 -> +1`: **12** rows;
- `v18.8 P2 plane +1`: **4** rows;
- `v18.8 P2 plane +1 + P3 Dashami +1`: **1** row;
- `v18.8 P3 Dashami +1`: **2** rows;
- `v18.8 P3 Dashami +1 + P1d`: **2** rows;
- `v19.1 P-v19-1 bolt/action rescue`: **2** rows;
- `v19.1 P-v19-3 med solo`: **1** row;
- `v19.1 P-v19-5 nakshatra prior`: **1** row;
- `v19.1 P-v19-5 tithi prior`: **4** rows.

The **12 sign flips** are caused by:

- v18.8 broad plane rule: **3**;
- v18.8 broad Dashami rule: **1**;
- v19.1 Panchanga priors: **5**;
- v19.1 bolt/action rescue: **2**;
- v19.1 med solo: **1**.

Thus **4/12 sign flips come from broad generic v18.8 rules** and **5/12 from sign priors**. Direct promotion is therefore not justified as a narrow correctness-only patch.

## 5. v19.1 implementation/spec check

The preserved v19.1 source comment states that medical logic should have precedence over Panchanga, while execution evaluates and returns the Panchanga prior before the medical branch.

A dedicated audit checked the 29 exposed future rows. Result:

- `prior-vs-med implementation/spec conflict rows = 0` within this specific exposed cohort.

So this inconsistency is real in source structure, but it does **not** explain any of the current 29 exposed production-impact rows. It remains a provenance/maintenance issue and must not be silently rewritten as historical v19.2 behavior.

## 6. Prospective shadow freeze

The entire exposed cohort was frozen before attaching future labels/outcomes:

- file: `V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json`;
- effective start: **2026-08-07**;
- cohort: **29 rows**;
- sign flips: **12**;
- production changed: **false**;
- promotion allowed: **false**;
- state: `FROZEN_PROSPECTIVE_SHADOW`.

Every row freezes:

- current production baseline;
- reconstructed v19.2 candidate;
- delta and sign-flip flag;
- exact rule attribution;
- tag / overlay tag;
- corrected raw v18.5 score.

Future fields start empty:

- prospective expert/PDF label;
- prospective real outcome.

Contract:

1. no rule/threshold/model retuning after this freeze;
2. future expert/PDF agreement is evaluated separately and must not be called real-outcome accuracy;
3. real outcomes are evaluated separately and must not be substituted by PDF agreement;
4. missing observations remain missing — no imputation;
5. no automatic promotion.

## 7. Decision

**Do not merge PR #2 into `deploy`. Do not replace production `engine_scores.json`.**

The correctness/provenance work is technically reproducible and the candidate is now safely frozen for prospective observation, but the effective production delta is entirely future-only and includes 12 class/sign changes, many from broad/inferred model rules rather than parser-only correctness.

Current release state:

`v18.5/Expert hierarchy = production`

`reconstructed v19.2 = frozen prospective shadow`

Promotion can be reconsidered only using evidence collected after the 2026-08-07 freeze, without changing the frozen candidate in response to those observations.
