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

A permanent `production health` workflow was subsequently added and then widened to every PR. It remains read-only. PR candidate validation now checks the candidate tree/manifest/security, while live GitHub Pages checks run only after a `deploy` push, scheduled run or manual run; this avoids circular failures when a PR itself repairs live production.

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
- `audit-prod-health-1539`
- `audit/pr22-static`
- `audit/root-parser-drift`
- `fix/bulletin-source-routing`
- `fix/canonical-dashboard-entrypoint`
- `fix/dashboard-canonical-read-path`
- `fix/manifest-engine-fingerprint`
- `fix/pdf-generator-engine-guard`
- `fix/pdf-v19-context-parity`
- `fix/root-dashboard-tag-parser`
- `fix/run-forecast-runtime-contract`
- `fix/production-ci-triggers`
- `fix/permanent-production-health`
- `fix/production-health-pr-scope`
- `fix/root-ui-regression-guard`
- `fix/push-action-mojibake`
- `tmp/bulletin-clean`
- `tmp/bulletin-squash`

Before deleting each, Codex should run a one-line ancestry/diff check against `deploy` (or the relevant archive branch) and preserve any genuinely unique historical artifact via tag if needed. Do not delete `fix/post-freeze-engine-correctness`.

## Final production repair checkpoint — 2026-08-08

A local direct-push commit `8790e1f26c1779e8c73cbd4f0da6dccc416edab2` (`auto deploy 2026-08-08_08:03:50`) occurred after the initial correctness release. It was authored locally, not by GitHub Actions, and regressed two released production invariants:
- root `index.html` lost the shared verbal-tag parser/alias integration and `TOKEN_THEMES`;
- `data_manifest.json.engine_scores` drifted to stale `B8CCEBDC4E67` while canonical `engine_scores.json` remained `76F3AB6FAD78`.

Live GitHub Pages confirmed the root parser regression. The deprecated `/g-index/deploy/` redirect and nested service-worker compatibility remained healthy.

PR #24 repaired this without changing any Engine/model/frozen-shadow data. Production repair commit:
`38b3414fff30e6298dfebb3a2c322526ab7d50a1`.

PR #24 restored:
- root `engine_tag_parser.js` load;
- alias loader and `TOKEN_THEMES`/`EngineTagParser.parseTagTokens` path;
- truthful canonical Engine tooltip;
- root canonical/OG/share metadata (no deprecated `/deploy/` URL);
- manifest Engine fingerprint `76F3AB6FAD78`.

PR #24 also added tracked `verify_production_release_guard.py` and wired it into `daily_chain.bat` as fail-closed STEP 11B immediately before local `git_deploy.bat`. The guard blocks a local deploy if root parser/metadata, nested redirect or manifest fingerprints drift.

Post-merge production health run `31258081194` initially hit a Pages publication race only: candidate/static/manifest checks had already passed while the live page still served the previous build. After the Pages deployment completed, failed-job rerun attempt 2 completed **success**, including live canonical root, `/g-index/deploy/`, security and hashes. Pages run `31258080829` completed **success**.

PR #22 then rebased onto that repaired production and changed exactly one line in root `sw.js`: Web Push action mojibake -> `Відкрити G-Index`. Production commit:
`e60474c83405d3f0815a7065d7c6b246714a8155`.

Post-PR #22 production health run `31258242751` completed **success**, including live root, nested compatibility, manifest, security and hashes. Pages deployment run `31258242555` completed **success**.

Current production head at this checkpoint:
`e60474c83405d3f0815a7065d7c6b246714a8155`.

### Remaining operational risk — HIGH

`deploy` is currently **not branch-protected** (`protected:false`, required checks enforcement off). Therefore a local direct push can still bypass PR checks. The tracked daily-chain fail-closed guard mitigates the known local deployment path, but it is effective only after the local machine has pulled the current tracked `daily_chain.bat` and `verify_production_release_guard.py`.

GitHub connector used for this handoff does not expose a branch-protection write action. Next Codex/operator with `gh`/repo-admin access should enable protection/rules for `deploy` and require the production health/correctness checks before merge/direct update. Do not weaken the local fail-closed guard after branch protection is enabled; keep both layers.

## What Codex should do tomorrow

Start from `deploy`, not from the closed PR #2 branch.

Priority order:
1. Read this file first; final production health and Pages are PASS at head `e60474c83405d3f0815a7065d7c6b246714a8155`.
2. Reconfirm current `deploy` head before making any changes. If it differs due another local `auto deploy`, run `verify_production_release_guard.py` immediately and inspect the direct-push diff before doing anything else.
3. Highest governance priority: enable branch protection/rules for `deploy` with required production health/correctness checks; connector used here could verify that protection is currently off but could not enable it.
4. Ensure the local daily-chain checkout has pulled `daily_chain.bat` STEP 11B and `verify_production_release_guard.py` before its next scheduled push.
5. Perform branch cleanup from the inventory above after one final unique-commit/diff check; never delete the shadow branch.
6. Do NOT tune v19.2 or reopen closed governance decisions using historical GT.
7. If working on future Engine development, create a NEW version/candidate branch and use canonical noon-UTC Panchanga context from the start.
8. Keep the v19.2 shadow branch immutable except append-only prospective observations/status generated by its existing intake workflow.
9. Any production change must remain separated from model-promotion evidence.
10. Re-run a focused health sweep only after a new production change; do not redo settled archaeology without a new signal.

## One-line rule

Production is live-verified, CI-guarded and repaired against the observed local auto-deploy rollback; v19.2 remains a closed, non-production prospective shadow. The remaining governance gap is unprotected `deploy`; future model work starts as a new version, never by mutating frozen v19.2.
