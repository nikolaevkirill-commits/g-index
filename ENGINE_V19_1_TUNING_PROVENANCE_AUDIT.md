# Engine v19.1 tuning provenance audit

Date: 2026-08-07
Status: **METHODOLOGICAL AUDIT — frozen v19.2 unchanged**

## Finding

Two preserved inputs to v19.1 were explicitly selected/evaluated using the same expert/PDF ground-truth family that was later used to report replay accuracy.

This does not make the rules invalid. It means their historical GT improvements are **development-set agreement**, not independent evidence of generalization.

## 1. Panchanga priors are GT-derived

`deploy/panchanga_sign_priors.json` states directly:

- priors are from `GT n=350`;
- retained patterns were checked at `>=75%`, `n>=5`;
- reported `tithi_net_gain = +9 strict`;
- `nak20 = 91% (n=11)`;
- `nak18 = 73% (n=11)` and was added despite being neutral on the full GT because it was considered astrologically correct;
- reported stack strict = `75.1%`.

Therefore P-v19-5 is not a feature whose n=350 replay gain can be treated as an independent validation result.

## 2. Calendar enrichment contains target-informed selection

The 2026-06-15 commit that introduced the Panchanga prior file also changed `deploy/calendar_tags_2025_2026.json`.

Its own note says the calendar set was checked on GT n=350 and should be neutral or improve. More importantly, the commit records explicit exclusions based on target disagreement, including examples such as:

- `2025-03-22`: calendar bolt excluded because GT=+1;
- `2025-03-30`: calendar bolt excluded because GT=+2;
- `2025-03-31`: calendar bolt excluded because GT=+3;
- `2025-09-09`: `нова одежда ⚡` excluded because bolt worsened agreement with GT=-2.

This is target-informed feature/tag selection. Historical accuracy after this selection is therefore optimistic if presented as validation on the same GT.

## 3. Commit provenance

`deploy/panchanga_sign_priors.json` appears in Git history in commit:

`420f02bee1019217c8b58c92bb09be3f3808a251` — 2026-06-15 — `Add files via upload`.

The same commit contains:

- `deploy/panchanga_sign_priors.json` (added),
- `deploy/calendar_tags_2025_2026.json` (GT-informed update),
- `deploy/run_forecast.py` (added),
- `deploy/score_engine_v19_preview.py` (modified),
- `deploy/dst_archive.json` (added).

No generator or preserved train/holdout split for the n=350 prior-selection procedure was recovered from that commit.

## 4. Consequence for reported metrics

The following numbers remain useful as historical replay/development diagnostics, but must not be described as independent predictive validation:

- v19.1 header: strict 73.4% vs 71.4% baseline on GT n=350;
- Panchanga stack notes including 75.1%;
- calendar-enrichment improvements measured on the same GT family.

The later reconstructed-v19.2 n=322 replay is also an agreement test against the project PDF GT. Because at least some v19.1 components were explicitly derived from that GT family, it is not a clean unseen holdout for those components unless date-level non-overlap can be proven. The exact n=350 derivation-date list was not recovered, so such non-overlap is currently unproven.

## 5. Why the prospective shadow is now the correct gate

The 29-row exposed cohort was frozen before future evidence was attached. Its expert/PDF labels and real outcomes are collected after freeze, separately, with no retuning and no automatic promotion.

That prospective shadow is therefore the first available mechanism in this lineage capable of supplying genuinely post-freeze evidence for the exposed v19.2 rules.

## Decision

- Do not alter frozen v19.2 in response to this audit.
- Do not use historical n=350 gains as a promotion argument.
- Keep `promotion_allowed=false` until genuinely post-freeze evidence exists.
- For any future model version, preserve the exact development set and a genuinely untouched validation/prospective set before rule selection.
