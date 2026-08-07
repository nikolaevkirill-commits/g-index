# v19.2 exposed-row risk taxonomy

Date: 2026-08-07
Status: **READ-ONLY GOVERNANCE CLASSIFICATION**

This document classifies the already-frozen 29 exposed operational rows. It does not change the frozen candidate or production.

## 1. Key conclusion

**0 / 29 exposed rows are parser-only correctness changes.**

All 29 operational differences are caused by model/rule behavior from the reconstructed v18.8/v19.1 stack. Therefore parser correctness and v19.2 model promotion must remain separate release decisions.

## 2. Rule-family counts

### v18.8 generic / ablation-selected rules — 21 rows

- P1d empty +2 -> +1: 12
- P2 plane +1: 4
- P2 + P3: 1
- P3 Dashami +1: 2
- P3 + P1d: 2

Historical evidence for this family comes from same-project ablation/replay on PDF-GT subsets. It is useful development evidence but not untouched prospective validation.

### v19.1 specific rules — 8 rows

- bolt/action rescue: 2
- med solo: 1
- Panchanga nakshatra prior: 1
- Panchanga tithi prior: 4

These rules were also introduced after examining GT/case behavior. In particular, `panchanga_sign_priors.json` explicitly states that its priors were derived from GT n=350 and selected/checked using target agreement.

## 3. Sign-flip risk

All 12 frozen sign flips are model-rule changes:

- broad v18.8 plane/Dashami: 4
- Panchanga priors: 5
- bolt/action rescue: 2
- med solo: 1

There are **no parser-only sign flips** in the exposed cohort.

## 4. Evidence-quality classes

### Class C1 — deterministic correctness

Definition: representation/parsing fixes that preserve intended semantics without changing the modeled rule set.

Examples in the project:
- verbal/emoji alias normalization;
- dashboard canonical score-read path;
- shared UI/Engine token parser.

Exposed frozen rows in this class: **0**.

These changes are handled separately in minimal dashboard PR #3 and must not be used to justify v19.2 promotion.

### Class M1 — specific contextual heuristic

Rules:
- v19.1 bolt/action rescue;
- v19.1 med solo.

Frozen exposed rows: **3**.
Frozen sign flips: **3**.

These are narrower than the generic patches but were still selected using known historical cases/GT. They require prospective confirmation.

### Class M2 — GT-derived priors

Rules:
- v19.1 tithi prior;
- v19.1 nakshatra prior.

Frozen exposed rows: **5**.
Frozen sign flips: **5**.

Highest target-selection concern. `panchanga_sign_priors.json` explicitly documents derivation from GT n=350. Historical gains are development-set agreement, not independent validation.

### Class M3 — broad generic GT-tested patches

Rules:
- v18.8 P1d empty demotion;
- v18.8 P2 plane;
- v18.8 P3 Dashami;
- combinations thereof.

Frozen exposed rows: **21**.
Frozen sign flips: **4**.

This is the largest operational family. It comes from v18.8/V19 candidate ablation work and must be treated as model evolution, not correctness repair.

A dedicated structural audit also found that all 4 prospective sign flips from broad P2/P3 occur under `saturn_retro`, which makes that subset especially informative prospectively.

## 5. Release implication

The release surface splits cleanly:

- **PR #3**: correctness-only UI/read-path/parser work; no Engine score artifact change.
- **PR #2 / v19.2 shadow**: 29 future operational model changes; all require prospective evidence.

Therefore a successful merge of PR #3 would not reduce the evidentiary burden for v19.2.

## 6. Governance decision

Do not describe the 29-row shadow cohort as a correctness patch.

Correct description:

> reconstructed model/rule candidate with 29 exposed prospective operational differences, evaluated under a frozen no-retuning protocol.

No historical replay metric should be used as a substitute for prospective evidence on these 29 rows.
