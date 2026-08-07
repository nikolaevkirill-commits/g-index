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

The audited runtime hierarchy is:

`verified expert override > expert_calc_scores.json > Engine core`

Correct v2 classification of the 130 candidate-core changes:

- **20** masked by verified expert/PDF override;
- **81** masked by ExpertCalc;
- **29** exposed Engine-core changes.

All **29 exposed changes are prospective dates on/after 2026-08-07**. None of the historically observed changed rows remains exposed through the current runtime hierarchy.

Among the 29 exposed rows:

- **12** change sign/class relative to current production Engine core;
- **17** change magnitude only.

This is the decisive release-risk: historical replay does not directly validate the effective production impact of these exact 29 future rows.

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

- broad v18.8 plane/Dashami rules: **4**;
- v19.1 Panchanga priors: **5**;
- v19.1 bolt/action rescue: **2**;
- v19.1 med solo: **1**.

Direct promotion is therefore not justified as a narrow correctness-only patch.

## 5. v19.1 implementation/spec check

The preserved v19.1 source comment states that medical logic should have precedence over Panchanga, while execution evaluates and returns the Panchanga prior before the medical branch.

Read-only audit across all 564 snapshots found:

- base=0 med-solo rows: **7**;
- rows where source execution differs from documented med-first semantics: **2** (`2025-07-18`, `2025-11-28`);
- conflicts inside the frozen 29-row prospective cohort: **0**.

Therefore the inconsistency is real but does not alter the frozen prospective cohort. It is post-shadow governance backlog and must not be silently rewritten as historical v19.2 behavior.

## 6. Prospective shadow freeze

The entire exposed cohort was frozen before attaching future labels/outcomes:

- file: `V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json`;
- frozen at: `2026-08-07T12:19:13+00:00`;
- effective start: **2026-08-07**;
- cohort: **29 rows**;
- sign flips: **12**;
- production changed: **false**;
- promotion allowed: **false**;
- state: `FROZEN_PROSPECTIVE_SHADOW`.

Every row freezes current production baseline, reconstructed candidate, delta/sign-flip flag, exact rule attribution, tags and corrected raw v18.5 score.

Future expert/PDF and real-outcome evidence is stored outside the freeze in an append-only ledger.

Contract:

1. no rule/threshold/model retuning after freeze;
2. expert/PDF agreement is not real-outcome accuracy;
3. real outcomes are never substituted by PDF/ExpertCalc;
4. missing observations remain missing;
5. no automatic promotion.

## 7. Development-set provenance barrier

Historical v19.1 improvement numbers are **not independent validation evidence**.

Recovered `deploy/panchanga_sign_priors.json` explicitly states that its Tithi/Nakshatra priors were derived/selected using **GT n=350** and reports their gain on that same development context.

The same 2026-06-15 lineage also records target-informed calendar enrichment choices: calendar tags were excluded when they contradicted GT labels, and the retained set was checked to be neutral or beneficial on GT.

Consequences:

- old `73.4% / 75.1%` stack figures must be treated as development/replay agreement;
- they cannot be used as a production-promotion argument;
- exact non-overlap between the n=350 development set and later replay samples was not recovered/proven;
- the current prospective shadow is the first leakage-controlled validation gate for the **effective exposed rules**.

## 8. Prespecified structural-risk diagnostics

A read-only audit of the 4 sign flips caused by broad v18.8 P2/P3 found:

- **4/4 occur under Saturn retro context**;
- 2/4 additionally occur during Pitru Paksha.

This is a review flag, not proof the candidate scores are wrong. The frozen predictions remain unchanged so prospective evidence can test whether the broad rules survive this structural regime.

No Saturn-retro guard may be fitted retrospectively to these four rows after their outcomes are observed.

## 9. Freeze integrity hard-lock

The original write-capable candidate-builder and freeze-generator workflows were removed after the freeze.

Current CI includes a dedicated read-only integrity gate which verifies:

- frozen freeze-file Git blob SHA: `460386800d2f1756b1b0a47b80f20c811016b927`;
- candidate SHA256: `95b754735298a0de9f32901a1df2da9052193c47ae629bea7dcf323803716532`;
- hierarchy-impact and rule-attribution SHA256 values against freeze provenance;
- 29-row / 12-sign-flip counts;
- `production=false`, `promotion_allowed=false`;
- no workflow can call the frozen candidate/freeze generators;
- only the append-only expert-intake and derived-evaluation workflows retain write permission;
- those mutable workflows cannot stage protected candidate/freeze/provenance artifacts.

Hierarchy, rule-attribution and semantic-audit workflows were converted from write-capable report generators to **read-only reproducibility checks**.

## 10. Preregistered prospective evaluation

`V19_2_PROSPECTIVE_EVALUATION_PREREGISTRATION.md` was committed while prospective observation counts were still zero.

Primary endpoints are frozen as:

- **paired sign/3-class correctness** on the 12 frozen sign-flip rows;
- **paired within-1 accuracy** on all observed exposed rows.

Expert/PDF and real-outcome streams remain separate. Exact 7-class is secondary.

Formal review checkpoints are fixed at:

- **2026-09-30**;
- **2026-11-30**;
- **2026-12-31**, after the final frozen date `2026-12-28`.

There is no automatic numeric promotion threshold for this small cohort.

## 11. Current prospective evidence state

At the time of this gate update:

- eligible post-freeze verified expert/PDF observations: **0**;
- valid real outcomes: **0**;
- derived metrics therefore remain `null`, not zero or imputed values.

The leakage-safe PDF intake has been tested against pre-freeze evidence, changed evidence tuples and pending/unverified records.

## 12. Decision

**Do not merge PR #2 into `deploy`. Do not replace production `engine_scores.json`.**

The correctness/provenance work is reproducible and the reconstructed candidate is now mechanically hard-locked for prospective observation, but:

- the effective production delta is entirely future-only;
- 12/29 exposed rows change sign/class;
- broad-rule sign flips are structurally concentrated under Saturn retro;
- Panchanga/calendar development choices were GT-informed;
- the historical original v19.2 consolidation source remains unrecovered;
- no post-freeze evidence exists yet.

Current release state:

`v18.5 / verified Expert hierarchy = production`

`reconstructed v19.2 = frozen prospective shadow`

`PR #3 = separate correctness-only dashboard/read-path patch; no model change`

Promotion can be reconsidered only under the preregistered prospective protocol without modifying the frozen candidate in response to observations.
