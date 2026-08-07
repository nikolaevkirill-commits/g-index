# Engine correctness — historical v15.1 sealed result

Date: 2026-08-07
Branch: `fix/post-freeze-engine-correctness`
Status: **HISTORICAL REGRESSION ARTIFACT — not current baseline**

This replay was produced during the initial v15.1 correctness detour, before the exact v17/v18.5/v19.1 chain was recovered. Its numbers are retained for provenance only. It must not be interpreted as the current production/release comparison.

Current authoritative release decision: `V19_2_RELEASE_GATE_2026-08-07.md`.

## Historical v15.1 result

Policy was no GT/PDF tuning: same frozen input rows and same verified PDF ground truth for baseline and candidate.

| Metric | Frozen v15.1 | v15.1 correctness candidate | Delta |
|---|---:|---:|---:|
| Exact 7-class | 44.4% | 44.7% | +0.3 pp |
| ±1 accuracy | 69.9% | 69.9% | 0.0 pp |
| Strict 3-class/sign | 71.4% | 72.0% | +0.6 pp |
| N | 322 | 322 | — |

By canonical parsed tag count:

| Bucket | N | Exact baseline → candidate | ±1 baseline → candidate | Strict3 baseline → candidate |
|---|---:|---:|---:|---:|
| `n_tags=0` | 39 | 23.1% → 23.1% | 51.3% → 51.3% | 56.4% → 56.4% |
| `n_tags=1` | 110 | 47.3% → 47.3% | 78.2% → 78.2% | 67.3% → 67.3% |
| `n_tags=2+` | 173 | 47.4% → 48.0% | 68.8% → 68.8% | 77.5% → 78.6% |

Historical diagnostics:

- comparable rows: 322;
- prediction-changed rows: 6;
- bolt-rescue rows: 10;
- alias-changed rows: 0.

The v15.1 replay does **not** estimate the current v19.2 production impact.

## Dashboard correctness findings retained from this stage

Two findings remain valid and are still part of PR #2:

1. A trend tooltip bypassed the canonical `getEngineScore()` hierarchy by reading `_engineScores[d].eng` directly. It was routed through `getEngineScore()`.
2. `Тема дня` used a local emoji-only theme table. It was wired to the shared `engine_tag_aliases_v1.json` / `engine_tag_parser.js` contract.

These are UI correctness fixes, independent of whether v15.1 or reconstructed v19.2 is used as the Engine core.

## Blockers from the original document — resolved status

The following original statements are now obsolete:

- “v17/v18.5 source absent/unrecoverable” — **resolved**. Byte-identical v17.0 and v18.5 sources are committed and SHA-pinned; v18.5 native tests are 73/73 PASS.
- “v19.1 dependency source unavailable” — **resolved**. Byte-identical `score_engine_v19_preview.py` is committed and 11/11 PASS.
- “Хрест → plus/⊕ is only an assumption” — **resolved**. Confirmed from primary expert workbook semantics plus canonical production symbol dictionary.

Raw-chain audit now reproduces **563/563 non-overridden frozen rows exactly**. The lone historical mismatch is an explicit documented override.

## Current decision

Do **not** promote the historical v15.1 correctness candidate.

Production remains the existing v18.5/Expert hierarchy. Reconstructed v19.2 has been audited separately and is currently `FROZEN_PROSPECTIVE_SHADOW` from 2026-08-07, with direct promotion held because all 29 exposed runtime changes are future-only and 12 are sign flips.
