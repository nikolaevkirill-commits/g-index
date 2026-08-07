# v18.8 tuning provenance audit

Date: 2026-08-07
Status: **READ-ONLY MODEL-GOVERNANCE AUDIT**

## 1. Recovered evidence

Preserved dashboard comments and the canonical handoff document the v18.5 -> v18.6 -> v18.7 -> v18.8 patch sequence and its ablation on the same PDF-GT development subset.

Reported n=212 comparison:

| stack | Strict | Binary | Exact | 5-fold CV strict |
|---|---:|---:|---:|---:|
| v18.5 baseline | 75.0% | 87.3% | 43.9% | 74.9% ± 5.7% |
| v18.7 | 77.4% | 88.2% | 49.1% | 77.3% ± 4.8% |
| v18.8 | 79.2% | 88.7% | 50.0% | 79.2% ± 4.2% |

The preserved source labels the patches “ablation-validated”.

## 2. Target-informed selection is explicit

The comments show that rule design/retention was informed by the same PDF-GT behavior used for the reported metrics.

### P2 broad — plane/travel

The source justifies broadening P2 using the observed target distribution of 28 emoji-only plane dates:

- average PDF score: +2.64;
- average Engine score: +2.14;
- difference: +0.50;
- 96% of those dates positive.

The resulting rule is any `✈` -> +1, with stronger travel form floored at +2.

This is target-informed rule construction, not an untouched prospective hypothesis.

### P1d — empty +2 -> +1

The preserved source explicitly calls P1d a **“точкова exact correction”**. That wording indicates direct optimization of class magnitude agreement.

### P1a and P5 rejection

The same ablation rejected:

- P1a because it caused binary regression;
- P5 because it produced no measurable effect.

This is direct model selection using target performance.

### P3 broad — Dashami

P3 was broadened from Shukla Dashami to include Krishna Dashami (tithi 25). The preserved comments combine a domain rationale (“both halves are Purna”) with performance evaluation in the same n=212 ablation stack.

## 3. Why the 5-fold CV does not close the independence problem

The reported 5-fold result is useful stability evidence for the selected stack, but the rules themselves were designed, broadened, retained or rejected after looking at target behavior on the same development corpus.

Therefore the CV number must not be described as a fully untouched external validation of v18.8. It is post-selection internal resampling.

## 4. Impact on the frozen prospective cohort

Of the 29 exposed v19.2 shadow rows, **21** are caused by this v18.8 generic family:

- P1d: 12;
- P2: 4;
- P2+P3: 1;
- P3: 2;
- P3+P1d: 2.

Four of the 12 frozen sign flips are caused by broad P2/P3. A separate structural audit shows all four occur under `saturn_retro`.

## 5. Governance conclusion

Historical v18.8 metrics are **development/replay evidence**, not independent prospective evidence.

They remain useful for reconstructing why the rules existed, but they must not be used as the decisive production-promotion argument for the 21 exposed future rows.

The frozen post-2026-08-07 shadow cohort is therefore the correct validation mechanism for these rules.

No rule is changed by this audit.
