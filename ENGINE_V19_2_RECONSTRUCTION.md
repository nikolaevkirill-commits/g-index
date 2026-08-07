# Engine v19.2 reconstruction audit

Date: 2026-08-07
Status: **RECONSTRUCTED CANDIDATE — not recovered historical source**
Branch: `fix/post-freeze-engine-correctness`

## 1. Recovered exact source chain

The following source files were recovered from the project owner outside the GitHub tree and validated locally before this note was written:

| Artifact | SHA256 | Local validation |
|---|---|---|
| `forecast_engine_v17_0.py` | `1b4c5fa7052590ed441923e9383f42654247711c5ece6f9cea765693a954eaae` | import/compile PASS |
| `forecast_engine_v18_5.py` | `26334307c6d757a183553c4f188c4829db06564a0664dafb1f85f580b3c033c4` | 73/73 self-tests PASS |
| `score_engine_v19_preview.py` | `2d3ce185bca12f863a068b95f2a0c84dc2453bbe65fe1dc26855c493a73fb45b` | 11/11 self-tests PASS |

This removes the old assumption that the v17/v18.5 implementation itself is unrecoverable. The GitHub branch still needs the recovered byte-identical files committed before the reconstructed candidate can be made self-contained in CI.

## 2. Preserved v18.8 patch set

The July dashboard contains the complete disabled read-time `_applyV186Patches()` implementation. It is the v18.8/V19-candidate patch layer over frozen v18.5:

1. **P2 broad** — any `✈` adds +1; `Подорожі` + `✈` floors score at +2.
2. **P3 broad** — Dashami tithi 10 or 25 adds +1 unless bolt/amavasya context blocks it.
3. **P4** — empty tag + Saturn retro + Kp >= 4 => -3.
4. **P1d** — empty tag + raw v18.5 score +2 => +1.
5. Clip result to `[-3,+3]`.

Preserved embedded ablation report on n=212:

| Model | Strict-3 | Binary | Exact | CV strict |
|---|---:|---:|---:|---:|
| v18.5 baseline | 75.0% | 87.3% | 43.9% | 74.9% ± 5.7% |
| v18.7 | 77.4% | 88.2% | 49.1% | 77.3% ± 4.8% |
| v18.8 | 79.2% | 88.7% | 50.0% | 79.2% ± 4.2% |

These are historical replay metrics, not independent real-world predictive accuracy.

## 3. Preserved v19.1 layer

`score_engine_v19_preview.py` identifies itself as v19.1 (2026-06-14) and adds specific rules over v18.5:

- `P-v19-1`: bolt + action tags (`plane` or `plus+scissors`) with Kp <= 2 and no blocking context => +2;
- `P-v19-3`: medical tag solo, Kp < 5 => +1;
- `P-v19-5`: tithi/nakshatra sign prior only when v18.5 base is neutral;
- calendar tag enrichment for empty tags.

Local preserved self-test: **11/11 PASS**.

## 4. Critical precedence conflict

v18.8 and v19.1 cannot be naively stacked.

Example: `⚡ ✈ ⊕`, Kp=2.0.

- v18.5 raw = -3.
- v19.1 explicit `P-v19-1` expects +2.
- If v18.8 runs first, generic P2 changes -3 -> -2, so the v19.1 rescue no longer triggers: final -2.
- If v19.1 runs first and then v18.8 P2 is blindly added, +2 -> +3.

Neither naive order preserves the explicit v19.1 rule. Therefore the missing historical v19.2 implementation must have had an explicit precedence/mutual-exclusion policy if it consolidated both rule families.

## 5. Reconstruction policy (fixed before replay metrics)

The reconstruction uses a specificity rule, **not GT optimization**:

1. Compute frozen v18.5 raw score.
2. Evaluate the preserved v19.1 rules from that exact raw score.
3. If v19.1 changes the raw score, that later/specific rule wins.
4. Otherwise apply the preserved generic v18.8 read-time patch layer.
5. Clip to `[-3,+3]`.

Rationale: a later explicit contextual override must not be disabled or numerically altered by an older generic additive patch.

This policy is an inference. It must never be described as recovered historical v19.2 code.

## 6. Reconstruction regression

A local `forecast_engine_v19_2_reconstructed.py` was built with the policy above.
SHA256 at audit time: `33e1f5bb86ada34d7a76828901241b1765949f3280b4255a3502ad157928ada8`.

Minimal cross-family regression: **6/6 PASS**:

- v18.8 P2 emoji travel;
- v18.8 P2 strong `Подорожі✈`;
- v18.8 P1d empty-day demotion;
- v18.8 P3 blocked by bolt;
- v19.1 `⚡ ✈ ⊕` rescue => +2;
- v19.1 medical solo => +1.

No PDF/GT metric was consulted to choose the precedence rule.

## 7. Sealed no-tuning replay

The fixed precedence policy was replayed in GitHub Actions against the unchanged frozen `engine_scores.json` snapshots and `deploy/pdf48_ground_truth_v6.json`.
Workflow: `v19.2 reconstructed replay`, run `31166419366`, **PASS**.
Comparable rows: **n=322**.

| Metric | Frozen v18.5 snapshot | v19.2 reconstructed | Delta |
|---|---:|---:|---:|
| Exact 7-class | 43.5% | 44.1% | +0.6 pp |
| ±1 | 69.9% | 74.2% | +4.3 pp |
| Strict 3-class/sign | 69.6% | 73.3% | +3.7 pp |

By canonical tag count:

| Bucket | n | Exact base→cand | ±1 base→cand | Strict-3 base→cand |
|---|---:|---:|---:|---:|
| n_tags=0 | 33 | 9.1% → 18.2% | 33.3% → 57.6% | 45.5% → 45.5% |
| n_tags=1 | 112 | 48.2% → 45.5% | 79.5% → 78.6% | 67.9% → 72.3% |
| n_tags=2+ | 177 | 46.9% → 48.0% | 70.6% → 74.6% | 75.1% → 79.1% |

Diagnostics:

- prediction changed rows: **83**;
- v19.1-specific precedence rows: **16**;
- calendar-enriched rows: **6**.

Interpretation: the reconstruction improves the two primary robustness metrics (±1 and Strict-3) materially on this unchanged replay, while exact improves slightly. The `n_tags=1` exact decline is retained transparently and is not tuned away. This is still replay agreement with PDF GT, not independent real-world predictive accuracy.

## 8. v19.2 correctness layer

The correctness policy was fixed before the second replay:

- v19 overlay decisions use the shared canonical verbal/emoji parser;
- positive strength uses the **recovered v17 weights**, not v15.1 weights;
- strong-positive threshold = `2.5` (heart-equivalent);
- generic bolt rescue = `+2.0`, exactly neutralizing the v17 numeric bolt penalty;
- explicit structural contexts remain authoritative and are not rescued: `trident`, `amavasya`, `purnima`, `ekadashi`, `eclipse`, `surya`, `retro_end`, `ganesh`, `navaratri`, `med`;
- explicit v19.1 action rescue keeps precedence.

Synthetic/regression coverage was added in `tests/test_v19_2_correctness.py`. Full Python suite: **23/23 PASS**; JavaScript alias parity: **PASS**. Covered cases include verbal travel into v19 rescue, verbal travel into v18.8 P2, aggregate non-heart rescue, weak-positive no-rescue, Ekadashi/Ganesh structural blocks, verbal heart recovery and preservation of the existing explicit v19.1 rescue.

Second sealed replay on the same `n=322` frozen snapshots:

| Metric | v19.2 reconstructed | + correctness | Delta |
|---|---:|---:|---:|
| Exact 7-class | 44.1% | 44.1% | 0.0 pp |
| ±1 | 74.2% | 74.2% | 0.0 pp |
| Strict 3-class/sign | 73.3% | 73.3% | 0.0 pp |

By tag count all three metrics are unchanged in all buckets.

Diagnostics:

- comparable rows: **322**;
- prediction changed rows: **1**;
- bolt rescue rows: **0**;
- calendar-enriched rows: **6**;
- changed rows with bolt rescue: **0**.

Interpretation: **no regression**, but the frozen sample has no qualifying aggregate-bolt row, so this replay does not empirically validate the rescue effect. The bolt fix is validated by deterministic regression tests; verbal/emoji parity is likewise deterministic. Full raw-Engine alias impact cannot be measured from frozen precomputed v18.5 snapshots and requires rerunning the recovered v17→v18.5→v19.x source chain.

## 9. Primary expert alias evidence

The newly supplied expert workbook closes the last major alias uncertainty. In sheet `ШКАЛА + (2)`, the expert legend at rows 61–95 contains the verbal tags directly. Row 95 is:

`Хрест | День лікування, прийому ліків | +1`

The canonical production `deploy/tag_to_text.json` maps symbol `⊕` to the same semantic phrase `лікування, прийому ліків`. Therefore **`Хрест -> plus/⊕` is confirmed** by the expert workbook plus the canonical symbol dictionary and is no longer provisional.

The same expert legend directly confirms that labels such as `Серце`, `Мішень`, `Зелена печатка`, `Гучномовець`, `Книги`, `Таблетка`, `Шприц`, `Сукня`, `Вінаяка` are genuine expert vocabulary rather than inferred names.

## 10. Promotion status

**DO NOT PROMOTE. DO NOT MERGE TO `deploy` YET.**

Required next gates:

- [ ] Commit byte-identical recovered v17.0, v18.5 and v19.1 source files to the correctness branch.
- [x] Commit an auditable reconstructed v19.2 replay with explicit `historical_source_recovered=false` provenance.
- [x] Port the shared verbal/emoji alias contract to the v19 overlay/replay path.
- [x] Port the frozen aggregate-positive bolt correctness rule using recovered v17 weights and structural guards.
- [x] Run deterministic correctness regression: Python 23/23 + JS PASS.
- [x] Run sealed reconstructed-v19.2 replay on unchanged data.
- [x] Run second sealed replay: reconstructed v19.2 vs + correctness fixes; no regression.
- [x] Confirm `Хрест -> ⊕` from primary expert source + canonical symbol dictionary.
- [ ] Rerun the **full recovered raw Engine chain** with canonical aliases before v18.5 scoring, so verbal aliases are measured at the correct layer rather than only in the v19 overlay.
- [ ] Compare full-chain output against the frozen snapshots and explain every changed row before any production regeneration.
- [ ] Only then evaluate production promotion / new freeze.

## 11. Current conclusion

The old blocker "v17/v18.5 source cannot be recovered" is obsolete, and the `Хрест -> ⊕` uncertainty is closed.

The reconstructed v19.2 candidate has a fixed precedence policy, a successful sealed replay and a no-regression correctness layer. The remaining technical blocker is now precise: **the exact recovered v17/v18.5/v19.1 files must be made self-contained in the branch and the full raw chain must be rerun with the canonical alias parser before scoring**. The original historical v19.2 consolidation source remains unrecovered, so the reconstruction label must remain.
