# G-Index release queue — 2026-08-07

Status: prepared, not merged.

## Hold

- PR #2 `fix(engine): recover v19.x chain and freeze prospective shadow`
  - **HOLD / DO NOT MERGE**.
  - Reconstructed v19.2 remains prospective shadow only.

## Safe independent runtime/correctness queue

All final heads are mergeable and their post-cleanup CI is PASS.

### 1. PR #17 — manifest Engine fingerprint

- Scope: `data_manifest.json` + read-only fingerprint CI.
- Risk: metadata/integrity only.
- Reason first: restores truthful freeze-integrity signal before other release work.
- CI: PASS (`manifest runtime fingerprints`).

### 2. PR #10 — run_forecast runtime contract

- Scope: `deploy/run_forecast.py` + read-only runtime-contract smoke.
- Risk: fail-fast/input-resolution only; no model rule change.
- CI: PASS (`run_forecast runtime contract`).

### 3. PR #11 — PDF generator fail-closed/provenance guard

- Scope: `deploy/generate_forecast_pdf.py` + read-only smoke.
- Risk: removes unsafe fail-open neutral-0 behavior; does not enable v19 contextual scoring.
- CI: PASS (`PDF generator engine guard`).
- Note: issue #8 remains partially open for future canonical Panchanga/v19 context parity.

### 4. PR #13 — bulletin source routing

- Scope: `deploy/generate_bulletin.py` + read-only routing smoke.
- Risk: path/cwd correctness only.
- CI: PASS (`bulletin source routing`).

### 5. PR #18 — canonical root dashboard verbal tags

- Scope: root `index.html`, shared parser/aliases, read-only smoke.
- Risk: UI/read-path only; no Engine score change.
- Root already had the canonical `getEngineScore()` 27-day path; this PR adds verbal-tag display parsing and truthful canonical tooltip wording.
- CI: PASS (`root dashboard tag parser`).
- Supersedes closed PR #3.

### 6. PR #15 — deprecate nested `/deploy/` dashboard

- Scope: nested `deploy/index.html`, nested `deploy/sw.js`, read-only smoke.
- Risk: URL/source-of-truth routing only.
- Merge last so `/g-index/deploy/` redirects to an already-corrected canonical root from PR #18.
- CI: PASS (`canonical dashboard entrypoint`).

## File overlap / conflict assessment

Current product-file scopes are disjoint:

- #17: `data_manifest.json`
- #10: `deploy/run_forecast.py`
- #11: `deploy/generate_forecast_pdf.py`
- #13: `deploy/generate_bulletin.py`
- #18: root `index.html`, root parser/alias files
- #15: nested `deploy/index.html`, nested `deploy/sw.js`

No current product-file overlap remains between the six queued PRs.

## Post-merge checks

After each merge:

1. re-check the next PR mergeability against updated `deploy`;
2. rerun its read-only CI on the rebased/updated head if GitHub marks it stale;
3. never merge PR #2 as part of this queue;
4. after #15, verify `/g-index/deploy/` redirects to `/g-index/` and nested SW unregisters;
5. after #18 + #15, canonical UI source of truth is root only.

## Issue closure after successful merges

- #7 may close after PR #10.
- #12 may close after PR #13.
- #14 may close after PR #15.
- #16 may close after PR #17.
- #8 stays open after PR #11 for the unresolved canonical Panchanga/v19-context parity portion.
- #9 stays open; it is a model-input provenance issue and is quarantined in the v19.2 shadow protocol.
