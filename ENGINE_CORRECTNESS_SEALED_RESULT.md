# Engine correctness — sealed result

Date: 2026-08-07
Branch: `fix/post-freeze-engine-correctness`
Policy: **no GT/PDF tuning**. Same frozen input rows and same verified PDF ground truth for baseline and candidate.

## Result

| Metric | Frozen v15.1 | Correctness candidate | Delta |
|---|---:|---:|---:|
| Exact 7-class | 44.4% | 44.7% | +0.3 pp |
| ±1 accuracy | 69.9% | 69.9% | 0.0 pp |
| Strict 3-class/sign | 71.4% | 72.0% | +0.6 pp |
| N | 322 | 322 | — |

### By canonical parsed tag count

| Bucket | N | Exact baseline → candidate | ±1 baseline → candidate | Strict3 baseline → candidate |
|---|---:|---:|---:|---:|
| `n_tags=0` | 39 | 23.1% → 23.1% | 51.3% → 51.3% | 56.4% → 56.4% |
| `n_tags=1` | 110 | 47.3% → 47.3% | 78.2% → 78.2% | 67.3% → 67.3% |
| `n_tags=2+` | 173 | 47.4% → 48.0% | 68.8% → 68.8% | 77.5% → 78.6% |

Diagnostics:
- comparable rows: 322
- prediction-changed rows: 6
- bolt-rescue rows: 10
- alias-changed rows: 0

`alias_changed_rows=0` means the frozen replay inputs already use symbol/legacy forms recognized by v15.1. Therefore this sealed replay validates the **bolt-policy effect**, but does not estimate the benefit of verbal aliases. Verbal↔symbol equality is covered deterministically by unit/JS parity tests instead.

## Dashboard correctness audit

Static audit of `deploy/index.html` found 43 `getEngineScore()` calls and 12 direct `_engineScores[...]` accesses. Eleven direct accesses are loader/enrichment/Kp plumbing or the implementation of `getEngineScore()` itself. One UI consumer was a real bypass:

- trend tooltip used `_engineScores[d.ds].eng` directly;
- consequence: it could show raw v18.5 while the rest of UI used expert override / expert_calc hierarchy;
- branch-only fix: route it through `getEngineScore(new Date(...))` and label the tooltip `Engine (canonical)`.

A second UI inconsistency was found after the score-path audit: the `Тема дня` card interpreted `eng.tag` through a local hard-coded emoji-only `TAG_THEMES` table. Therefore verbal aliases could be parsed correctly by Engine/validator but still disappear from UI copy. Branch-only fix:

- `deploy/index.html` loads `../engine_tag_parser.js`;
- `loadEngineScores()` loads the same `../engine_tag_aliases_v1.json` contract through `EngineTagParser.loadAliasSpec()`;
- `Тема дня` uses `EngineTagParser.parseTagTokens()` and token themes instead of direct emoji substring checks;
- a fail-soft legacy display fallback remains only if the alias spec cannot be loaded; it does not alter Engine scoring.

Both dashboard patches were applied by exact-match/idempotent patch scripts and verified with `git diff --check` before commit. The production `deploy` branch was not changed.

## Forensics / blockers

1. Exact `forecast_engine_v18_5.py` and `forecast_engine_v17_0.py` are absent from current branches and Git object/path history under the expected names. Existing `score_engine_v19_preview.py` imports modules that are not present in the repository.
2. All historical `.xlsx` blobs in Git history were scanned. Only `prognoz_2025_2026_4.xlsx` and `prognoz_2025_2026_4_REBUILT.xlsx` were found; neither contains the requested verbal labels (`Серце`, `Книги`, `Сукня`, `Таблетка`, `Хрест`, `Гучномовець`, `Зелена печатка`, `Мішень`, `Вінаяка`, `Шприц`).
3. Therefore `Хрест → plus/⊕` remains a documented assumption until the original expert master table is recovered.

## Promotion decision

**Do not merge to production yet.** The candidate passes deterministic tests, removes the audited UI divergence paths, and improves the sealed v15.1 replay slightly, but production still serves static v18.5 scores whose exact generator/source is not reproducible from the repository. The correctness branch is the auditable replacement baseline until that source is recovered or formally retired.
