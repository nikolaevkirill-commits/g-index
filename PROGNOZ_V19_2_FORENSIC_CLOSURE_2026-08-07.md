# PROGNOZ / G-Index — v19.2 forensic closure

Date: 2026-08-07
Status: **R&D CLOSED / PRODUCTION HOLD / PROSPECTIVE SHADOW ACTIVE**

## Final decision

Do **not** promote reconstructed v19.2 to production now.

Production remains the existing frozen v18.5 + expert hierarchy. Reconstructed v19.2 remains an immutable prospective shadow with a preregistered confirmatory cohort.

No production Engine score, expert verdict, GT row, weight or threshold was changed during this closure.

## What is established

### Recovered Engine lineage

- recovered v17.0 source is pinned and reproducible;
- recovered v18.5 native tests: 73/73 PASS;
- recovered v19.1 native tests: 11/11 PASS;
- support-aware v19.1 tests additionally verify deploy-context Panchanga priors;
- raw v18.5 reproducibility: 563/563 non-overridden frozen rows exact;
- the only historical raw mismatch, 2026-05-21, is an explicit verified override, not Engine drift.

### Reconstructed v19.2

Historical original v19.2 source was not recovered. The candidate is explicitly reconstructed from preserved v18.8 + v19.1 rules with a precedence policy frozen before replay metrics.

Sealed replay on n=322:

- Exact: 43.5% -> 44.1% (+0.6 pp)
- within-1: 69.9% -> 74.2% (+4.3 pp)
- strict 3-class/sign: 69.6% -> 73.3% (+3.7 pp)

These are development/replay agreement metrics, not independent predictive validation.

### Alias correctness

Primary expert workbook replay on 442 rows, restricted to the ten identified verbal aliases:

- Exact: 33.03% -> 48.42% (+15.39 pp)
- within-1: 58.60% -> 71.95% (+13.35 pp)
- sign/3-class: 61.76% -> 72.85% (+11.09 pp)

This establishes a real parser correctness defect. It is same-source reproduction, not real-world predictive accuracy.

`Хрест -> plus/⊕` is confirmed by the expert workbook legend plus the canonical tag-to-text dictionary.

### Bolt correctness

Aggregate-positive bolt rescue was frozen from recovered v17 weights, not tuned on GT:

- positive-strength threshold = 2.5;
- generic rescue = +2.0;
- explicit structural blockers stay authoritative;
- deterministic Python/JS regression gates pass.

Frozen replay contains no qualifying aggregate-bolt case, therefore prospective evidence is still required.

## Prospective shadow

Original immutable exposed cohort:

- 29 future exposed rows;
- 12 original sign flips.

A pre-observation Panchanga provenance audit found that three sign flips used non-canonical `cal_tithi/cal_nakshatra` context instead of the canonical noon-UTC annual source:

- 2026-08-27
- 2026-08-30
- 2026-10-23

The original freeze is preserved unchanged. A pre-observation amendment quarantines those three rows.

Confirmatory sign endpoint:

- **9 context-valid sign flips**.

Original 12 remain descriptive. Quarantined 3 remain reported separately.

At closure: no valid post-freeze PDF observations and no real outcomes had been ingested; metrics therefore remain null.

## Methodological limits discovered

1. Panchanga sign priors were derived from GT n=350. Their historical gain is development-set evidence, not independent validation.
2. Calendar enrichment included GT-informed feature selection.
3. v18.8 P1d/P2/P3 were selected on the same development evidence; 5-fold CV after rule selection is not an independent holdout.
4. All four prospective broad-rule sign flips occur under Saturn retrograde; this is a preregistered post-shadow regime-risk backlog, not a reason to rewrite the frozen cohort.
5. v19.1 source comments say med should outrank Panchanga prior, while actual source order is the reverse. Two historical rows differ; zero frozen future rows are affected.

## Runtime/source-of-truth defects isolated from model R&D

These must remain separate from v19.2 promotion.

- Dashboard canonical read-path/parser correctness: separate PR #3.
- `run_forecast.py` runtime packaging/fail-fast contract: separate PR #10.
- PDF generator fail-open/provenance guard: separate PR #11.
- Bulletin source routing independent of cwd: separate PR #13.
- Duplicate live `/g-index/` and `/g-index/deploy/` dashboards: separate PR #15.
- Incorrect Engine fingerprint in `data_manifest.json`: separate PR #17.

No one of these runtime fixes is evidence for v19.2 predictive promotion.

## Override registry audit

Canonical root registry:

- 427 rows;
- 427 unique dates;
- duplicate dates: 0;
- all 427 pass the actual dashboard verification gate;
- 70 have hash-format + manual-PDF evidence;
- 357 are accepted through the explicit manual-PDF-reading route.

The registry metadata is stale (`window`/`updated_at` do not describe its full actual range), but that is metadata debt rather than a demonstrated scoring defect.

### 13 override-vs-GT conflicts

Direct comparison with `deploy/pdf48_ground_truth_v6.json` found 13 conflicts on 371 common dates. The provenance audit shows they are **not one homogeneous stale layer**.

#### Root override better supported by the displayed PDF wording / later correction: 7

- 2025-04-25: root -1; GT +2; GT note itself says “помірно несприятливий”.
- 2025-09-02: root +1; GT +3; note says “помірно сприятливий день”; special logistics wording should not silently redefine the overall day class.
- 2026-01-21: root +3; GT +2; note says “Особливо сприятливий день”.
- 2026-01-25: root +3; GT +1; note says “Дуже особливо сприятливий день”.
- 2026-05-16: root -3; GT -2; root records a 2026-07-14 coordinate reparse and maps explicit “Особливо несприятливий” to -3.
- 2026-06-03: root -1; GT -2; root records a 2026-07-14 coordinate reparse and explicit “Помірно несприятливий” -> -1.
- 2026-06-04: same evidence pattern as 2026-06-03.

#### GT better supported by the displayed wording: 3

- 2026-01-12: GT +1; wording says “Помірно сприятливий”; root +2 appears overstated.
- 2026-01-24: GT 0; wording says “нейтральний день”; root +1 appears overstated.
- 2026-03-30: GT +1; wording says “Помірно сприятливий”; root -1 has wrong sign relative to the displayed text.

#### Unresolved / source-disagreement: 3

- 2025-10-07: root 0 vs GT -1; GT reports source disagreement and wording does not cleanly resolve the exact magnitude.
- 2026-01-19: root +3 vs GT +1 while displayed wording says “нейтральний”; neither numeric value is directly supported by that wording and source agreement is false.
- 2026-01-22: root -3 vs GT -2 while wording says “помірно несприятливий”; neither numeric value cleanly matches the nominal 7-class wording and source agreement is false.

### Consequence

**Do not bulk-copy root overrides into GT and do not bulk-copy GT into overrides.**

The two artifacts encode different revision histories. Any future reconciliation must be date-by-date against the primary PDF/image source, with the mapping rule fixed before editing.

## Final governance state

- PR #2: HOLD / DO NOT MERGE.
- reconstructed v19.2: immutable shadow only.
- production Engine: unchanged.
- promotion_allowed: false.
- evaluation protocol preregistered before observations.
- PDF and real-outcome evidence remain separate and are never pooled.
- no automatic promotion threshold on small n.

## What should happen next

No more tuning or forensic expansion is required now.

The next legitimate model action is to collect the preregistered prospective observations/outcomes and evaluate the 9 context-valid confirmatory sign flips plus the broader magnitude endpoint. Runtime correctness PRs may be reviewed independently because they do not change the model.

This closes the 2026-08-07 forensic/R&D session.
