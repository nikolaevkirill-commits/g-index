# PROGNOZ / G-Index — Codex handoff — 2026-08-08

## Current production state

Branch: `deploy`.

Production correctness/runtime cleanup merged on 2026-08-07 in this order:
1. PR #17 — manifest Engine fingerprint parity.
2. PR #10 — `deploy/run_forecast.py` explicit fail-fast runtime contract.
3. PR #11 — `deploy/generate_forecast_pdf.py` fail-closed Engine/provenance guard; unsafe partial-v19 auto-selection disabled.
4. PR #13 — `deploy/generate_bulletin.py` canonical root source routing independent of cwd.
5. PR #18 — canonical root dashboard verbal-tag parser/alias contract and truthful canonical Engine tooltip.
6. PR #15 — `/g-index/deploy/` deprecated; redirects to canonical root and nested service worker unregisters/clears nested cache.

Full-stack dry-run before merge: GitHub Actions run `31198649966` PASS. All six final commits cherry-picked together without conflicts; Python/JS syntax, manifest parity, root parser, nested redirect, source-routing contracts and protected-artifact invariance all passed.

Post-release live health sweep on 2026-08-08: GitHub Actions run `31240250765` PASS. Verified on the published site and current repository state:
- canonical root HTTP/page content PASS;
- deprecated `/g-index/deploy/` compatibility HTML PASS;
- nested compatibility service worker unregister/redirect contract PASS;
- root shared tag parser/aliases and canonical score path PASS;
- manifest fingerprint parity PASS;
- `run_forecast.py`, `generate_forecast_pdf.py`, `generate_bulletin.py` Python syntax PASS;
- protected model/data files present and hashable;
- open issues = 0; open PRs = 0 at that checkpoint.

The first health-run failure was an audit assertion error only: it expected redirect construction from `self.registration.scope`, while the actual compatibility worker correctly uses `client.url` and `event.request.url`. Production code was not changed for that test correction.

## Production CI hardening — 2026-08-08

A later audit found a real residual CI defect: all six merged read-only correctness workflows still had `push.branches` pointing at their old `fix/...` branches, so future production changes on `deploy` could bypass post-merge guards.

PR #20 fixed only those six branch triggers (`+6/-6`, workflow-only) and was merged to `deploy` at commit:
`35b3e2be52e32687e914d05677ecc00beba74879`.

All six PR checks passed before merge. The merge immediately triggered the production workflows on `deploy`, confirming the trigger fix works.

Repository hygiene audit run `31240616945` PASS against the production workflow tree:
- exactly 6 production workflows;
- all use `permissions: contents: read`;
- no `contents/actions/pull-requests: write`;
- no `git add .`, `git add -A`, `git push`, or `git commit`;
- all production push triggers target `deploy`;
- no stale `fix/`, `audit/`, or `tmp/` branch triggers remain;
- protected production files unchanged by the audit.

## Protected production data/model state

The cleanup intentionally did not replace production Engine/model scores.

Canonical runtime hierarchy remains:
`verified PDF override > ExpertCalc > Engine core`.

`data_manifest.json.engine_scores` is `76F3AB6FAD78`, matching the committed canonical root `engine_scores.json` MD5/12 fingerprint.

Do not modify these merely to improve historical metrics:
- `engine_scores.json`
- `expert_overrides_v3.json`
- `expert_calc_scores.json`
- frozen v19.2 prospective artifacts

## v19.2 status

PR #2 was closed **without merge** as an R&D/prospective-shadow archive.

Shadow branch remains:
`fix/post-freeze-engine-correctness`

Important: closing PR #2 does NOT stop prospective intake. `v19-2-shadow-expert-intake.yml` is triggered by pushes to that branch and keeps append-only observation/status files there.

Reconstructed v19.2 is NOT production. Original historical v19.2 consolidation source was never recovered.

Frozen shadow facts:
- 29 exposed future Engine-core changes;
- original frozen sign flips: 12 descriptive;
- canonical-Panchanga amendment quarantined 3 context-invalid rows;
- confirmatory sign endpoint: 9 context-valid rows;
- PDF/expert and real-outcome streams must remain separate;
- no automatic promotion.

Formal shadow review checkpoints:
- 2026-09-30
- 2026-11-30
- 2026-12-31

## Canonical Panchanga contract

For future model candidates, Panchanga model context is the explicit canonical annual noon-UTC layer (`annual_2026_27.json`, 12:00 UTC contract).

Frozen `engine_scores.cal_tithi/cal_nakshatra` is informational and must not be treated as canonical model input for new candidates.

Issue #9 was closed as completed after this contract and the pre-observation v19.2 quarantine amendment were established.

## PDF policy

Production `generate_forecast_pdf.py` currently supports v18.5/v17 automatic scoring only and fails closed when no supported Engine is runnable. `--no-engine` is explicit placeholder mode.

Do NOT re-enable v19 PDF scoring unless a future version explicitly wires canonical `date_str/tithi_n/nakshatra_n` inputs and adds parity tests. The old partial-v19 path was intentionally removed because it produced sign divergence.

## Expert tag parser

Canonical shared UI alias contract exists in root:
- `engine_tag_parser.js`
- `engine_tag_aliases_v1.json`

Confirmed verbal expert aliases include:
`Серце, Книги, Сукня, Таблетка, Шприц, Хрест, Гучномовець, Зелена печатка, Мішень, Вінаяка`.

`Хрест -> ⊕` is confirmed by expert workbook legend semantics and canonical `tag_to_text.json` meaning.

## Closed governance items

Issues #4 and #5 were closed as `not_planned` now, not because the questions are disproven, but because acting on them before prospective evidence would contaminate the frozen experiment:
- #4 med vs Panchanga precedence — future new-version decision only.
- #5 broad v18.8 P2/P3 under Saturn retro — frozen prospective test subset only.

Issue #6 was closed after GT-informed v19.1/v18.8 provenance was fully disclosed and governance rules were enforced.

Issues #7, #8, #9, #12, #14, #16 are resolved/closed after production cleanup and policy fixes.

## Branch cleanup inventory

Current branch inventory contained many completed feature/audit/tmp branches.

### KEEP
- `deploy` — production.
- `fix/post-freeze-engine-correctness` — immutable/append-only v19.2 prospective shadow branch; required by shadow intake workflow.
- `prognoz-raw-v15-2-1` — completed 13Y raw archive/research lineage; keep as historical archive unless intentionally migrated to a tag/archive.

### DELETE AFTER ONE FINAL DIFF/UNIQUE-COMMIT CHECK
These are completed/merged/audit/tmp branches and should not be used for new work:
- `audit/bulletin-source-routing`
- `audit/pdf-generator-runtime-guard`
- `audit/post-release-health-2026-08-08`
- `audit/release-stack-2026-08-07`
- `audit/repo-hygiene-2026-08-08`
- `fix/bulletin-source-routing`
- `fix/canonical-dashboard-entrypoint`
- `fix/dashboard-canonical-read-path`
- `fix/manifest-engine-fingerprint`
- `fix/pdf-generator-engine-guard`
- `fix/pdf-v19-context-parity`
- `fix/root-dashboard-tag-parser`
- `fix/run-forecast-runtime-contract`
- `fix/production-ci-triggers`
- `tmp/bulletin-clean`
- `tmp/bulletin-squash`

Before deleting each, Codex should run a one-line ancestry/diff check against `deploy` (or the relevant archive branch) and preserve any genuinely unique historical artifact via tag if needed. Do not delete `fix/post-freeze-engine-correctness`.

## What Codex should do tomorrow

Start from `deploy`, not from the closed PR #2 branch.

Priority order:
1. Read this file first; live health and repository hygiene are already PASS.
2. Reconfirm current `deploy` head before making any changes.
3. Perform branch cleanup from the inventory above after one final unique-commit/diff check; never delete the shadow branch.
4. Do NOT tune v19.2 or reopen closed governance decisions using historical GT.
5. If working on future Engine development, create a NEW version/candidate branch and use canonical noon-UTC Panchanga context from the start.
6. Keep the v19.2 shadow branch immutable except append-only prospective observations/status generated by its existing intake workflow.
7. Any production change must remain separated from model-promotion evidence.
8. Re-run a focused health sweep only after a new production change; do not redo settled archaeology without a new signal.

## One-line rule

Production is live-verified, CI-guarded, cleaned and stabilized; v19.2 remains a closed, non-production prospective shadow. Future model work starts as a new version, never by mutating the frozen v19.2 artifact.
