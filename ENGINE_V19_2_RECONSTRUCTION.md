# Engine v19.2 reconstruction audit

Date: 2026-08-07
Status: **RECONSTRUCTED CANDIDATE — historical v19.2 source not recovered**
Branch: `fix/post-freeze-engine-correctness`
Production `deploy`: **untouched**

## 1. Exact recovered source chain — CLOSED

The recovered source files are now committed byte-identically to the correctness branch and permanently hash-pinned in CI:

| Artifact | SHA256 | Native validation |
|---|---|---|
| `forecast_engine_v17_0.py` | `1b4c5fa7052590ed441923e9383f42654247711c5ece6f9cea765693a954eaae` | import/compile PASS |
| `forecast_engine_v18_5.py` | `26334307c6d757a183553c4f188c4829db06564a0664dafb1f85f580b3c033c4` | **73/73 PASS** |
| `score_engine_v19_preview.py` | `2d3ce185bca12f863a068b95f2a0c84dc2453bbe65fe1dc26855c493a73fb45b` | **11/11 PASS** |

Permanent `engine-correctness.yml` verifies all three hashes and native tests. The old blocker “v17/v18.5 source is unrecoverable” is closed.

## 2. Reconstructed v19.2 precedence

Preserved evidence contains two non-trivially interacting layers:

### v18.8 generic layer
- P2 travel: any `✈` +1; `Подорожі` + `✈` floors at +2.
- P3 Dashami: tithi 10/25 +1 unless bolt/amavasya context blocks it.
- P4 empty tag + Saturn retro + Kp≥4 => -3.
- P1d empty tag + raw +2 => +1.
- clip to `[-3,+3]`.

### v19.1 specific layer
- bolt + action tags under low Kp => +2;
- medical solo under Kp<5 => +1;
- tithi/nakshatra sign prior only when v18.5 raw is neutral;
- calendar-tag enrichment for empty tags.

### Precedence conflict
Example `⚡ ✈ ⊕`, Kp=2:
- v18.5 raw = -3;
- explicit v19.1 rule expects +2;
- v18.8-first changes raw to -2 and prevents the v19.1 rescue;
- v19.1-first then blindly applying v18.8 changes +2 to +3.

Therefore naive stacking is invalid.

### Frozen reconstruction policy
Fixed before replay metrics, without GT tuning:
1. compute v18.5 raw;
2. evaluate v19.1-specific rules from that raw;
3. if v19.1 changes raw, the later/specific rule wins;
4. otherwise apply v18.8 generic patches;
5. clip to `[-3,+3]`.

This is an auditable inference, **not recovered historical v19.2 source**.

## 3. Sealed reconstructed-v19.2 replay

Unchanged frozen snapshots + unchanged PDF GT, `n=322`:

| Metric | Frozen v18.5 | v19.2 reconstructed | Delta |
|---|---:|---:|---:|
| Exact 7-class | 43.5% | 44.1% | +0.6 pp |
| ±1 | 69.9% | 74.2% | +4.3 pp |
| Strict 3-class/sign | 69.6% | 73.3% | +3.7 pp |

Tag buckets:
- `n_tags=0`, n=33: Exact 9.1→18.2; ±1 33.3→57.6; Strict-3 45.5→45.5.
- `n_tags=1`, n=112: Exact 48.2→45.5; ±1 79.5→78.6; Strict-3 67.9→72.3.
- `n_tags=2+`, n=177: Exact 46.9→48.0; ±1 70.6→74.6; Strict-3 75.1→79.1.

No post-result tuning was performed. This is replay agreement with PDF GT, not independent predictive validation.

## 4. Canonical alias correctness — CLOSED

Shared contract: `engine_tag_aliases_v1.json` v1.0.2.

Expert verbal vocabulary is confirmed directly by the supplied primary workbook. In `ШКАЛА + (2)`, rows 61–95 include `Серце`, `Мішень`, `Зелена печатка`, `Гучномовець`, `Книги`, `Таблетка`, `Шприц`, `Сукня`, `Вінаяка`, `Хрест`, etc.

Critical evidence:
`Хрест | День лікування, прийому ліків | +1`

Production `deploy/tag_to_text.json` maps `⊕` to the same semantic phrase, so **`Хрест → plus/⊕` is confirmed** and no longer provisional.

### Primary workbook parser replay
442 usable expert-workbook days, 2025-04-29→2026-07-14. Restricted to the ten previously identified aliases, with no weight/threshold changes:

| Metric | Legacy verbal input | Canonical aliases | Delta |
|---|---:|---:|---:|
| Exact | 33.03% | 48.42% | +15.39 pp |
| ±1 | 58.60% | 71.95% | +13.35 pp |
| Sign/3-class | 61.76% | 72.85% | +11.09 pp |

153 predictions changed; among them 81 exact wins and 13 exact losses.

This is **same-source parser correctness**, not real-world predictive accuracy.

## 5. Pre-score v18.5 correctness adapter — CLOSED

`forecast_engine_v18_5_correctness.py` applies aliases before raw v17/v18.5 scoring while leaving recovered source files byte-identical.

Critical idempotency rule:
- shared parser resolves the semantic token;
- recovered v17 parses the original string;
- a canonical marker is appended **only if v17 did not already recognize that token**.

This prevents existing canonical strings, especially planet-specific `retro_end` strings, from changing semantics.

The audit caught an initial four-row `retro_end` side effect; it was fixed before promotion. Regression coverage now locks those cases.

## 6. Raw-chain reproducibility — CLOSED

`audit_raw_chain_reproducibility.py` compares byte-identical recovered v18.5 against frozen `engine_scores.json` using the inputs actually preserved in each snapshot.

Final result:
- scorable rows: **564**;
- exact legacy reproduction: **563**;
- unexplained raw rows: **0**;
- explicit historical override rows: **1**;
- alias-induced changes on already-canonical frozen rows: **0**.

The sole apparent mismatch is fully explained:

### 2026-05-21
- tag: `❤ нова одежда ✈ ⊕ 🌑(очей провидіння)`
- Kp: 2.0
- recovered raw v18.5: **-3**
- frozen `eng`: **+3**
- snapshot contains `fixed_2026_04_29` metadata:
  - `old_eng: -3`
  - `new_eng: +3`
  - reason: `auto_fix_excel_2026.py`

Therefore this is **not missing input, parser drift or failed reproducibility**. It is an explicit historical post-engine override already recorded inside the frozen snapshot.

Conclusion: **all 563 non-overridden frozen rows reproduce exactly**.

The frozen score file already uses legacy-recognized/canonical tag forms, so zero alias changes there are expected. The correct empirical evidence for the verbal alias bug is the primary workbook replay in §4.

## 7. Bolt correctness

For the v19.x correctness layer the policy was frozen on recovered v17 semantics:
- positive-strength threshold = **2.5** (heart-equivalent);
- generic rescue = **+2.0**, neutralizing only v17’s generic bolt penalty;
- structural blockers remain authoritative: `trident`, `amavasya`, `purnima`, `ekadashi`, `eclipse`, `surya`, `retro_end`, `ganesh`, `navaratri`, `med`;
- explicit v19.1 action rescue retains precedence.

Second sealed replay on the same `n=322`:

| Metric | v19.2 reconstructed | + correctness | Delta |
|---|---:|---:|---:|
| Exact | 44.1% | 44.1% | 0.0 pp |
| ±1 | 74.2% | 74.2% | 0.0 pp |
| Strict-3 | 73.3% | 73.3% | 0.0 pp |

The frozen sample contains no qualifying aggregate-bolt rescue row (`bolt_rescue_rows=0`), so the rescue is validated by deterministic regression tests rather than attributed a replay gain.

## 8. Final CI state

Latest full correctness job: **PASS**.

Passed gates include:
- recovered source SHA256 provenance;
- v18.5 native **73/73**;
- v19.1 native **11/11**;
- full Python unit/integration suite including v18.5 pre-score adapter and v19.2 correctness;
- JavaScript alias parity;
- original sealed correctness replay;
- reconstructed-v19.2 sealed replay;
- v19.2+correctness sealed replay;
- dashboard score-path audit;
- historical source/Excel forensic checks.

Raw-chain reproducibility workflow: **PASS**.

## 9. Promotion gates

- [x] Recover and commit byte-identical v17.0 / v18.5 / v19.1 sources.
- [x] Permanently pin recovered source SHA256 and native tests in CI.
- [x] Reconstruct v19.2 precedence without GT tuning and label it as reconstructed.
- [x] Run sealed reconstructed-v19.2 replay.
- [x] Confirm expert verbal aliases and `Хрест→⊕` from primary evidence.
- [x] Apply canonical aliases at the correct pre-v18.5 scoring layer.
- [x] Prove adapter idempotency against canonical frozen snapshots.
- [x] Explain every raw-chain mismatch: 563 exact + 1 explicit historical override.
- [x] Freeze and regression-test aggregate-positive bolt correctness.
- [x] Full correctness CI green.
- [ ] Build a **branch-only regenerated score artifact** from the corrected raw chain and reconstructed v19.2; do not overwrite production `engine_scores.json`.
- [ ] Compare that candidate artifact against production hierarchy / expert overrides and classify every changed operational day.
- [ ] Decide whether to create a new Engine freeze/version; only then consider production promotion.

## 10. Decision

**Do not merge into `deploy` yet.**

The correctness/reproducibility blockers around v17/v18.5 source recovery, verbal aliases, `Хрест→⊕`, raw-chain reproducibility and score-path synchronization are now closed.

The remaining boundary is no longer forensic recovery. It is a controlled release step: generate a separate branch-only corrected v19.2 score artifact, perform production-hierarchy parity/impact analysis, and only then decide whether the reconstructed candidate merits a new freeze.
