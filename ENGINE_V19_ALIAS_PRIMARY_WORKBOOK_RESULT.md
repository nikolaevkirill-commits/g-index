# Engine v19 alias correctness — primary expert workbook replay

Date: 2026-08-07
Status: **PARSER CORRECTNESS / SAME-SOURCE REPLAY — NOT PREDICTIVE VALIDATION**
Branch: `fix/post-freeze-engine-correctness`

## 1. Source

Primary input supplied by the project owner:

`++втр25АвтоматическиВосстановленоАвтоматическиВосстановленоАвто(2).xlsx`

Audited expert sheet:

`ШКАЛА + (2)`

Daily data range used for the replay:

`I95:AK770`

Usable daily rows: **442**

Date range: **2025-04-29 → 2026-07-14**

The target is the workbook's own 7-class expert verdict column (AG within this block), not an independent real-world outcome. Therefore this experiment measures whether the Engine parser correctly reproduces the expert workbook vocabulary. It must not be reported as predictive accuracy.

## 2. Expert legend evidence

The same workbook contains the expert legend in `ШКАЛА + (2)`, rows 61–95. It directly contains verbal tags including:

`Серце`, `Мішень`, `Зелена печатка`, `Гучномовець`, `Книги`, `Таблетка`, `Шприц`, `Сукня`, `Вінаяка`, `Хрест`.

Most importantly, row 95 is:

`Хрест | День лікування, прийому ліків | +1`

Production `deploy/tag_to_text.json` maps `⊕` to the same semantic phrase `лікування, прийому ліків`. This closes the former provisional mapping: **`Хрест → plus/⊕` is confirmed**.

## 3. Method

The exact recovered `forecast_engine_v18_5.py` / v17 scoring chain was used twice on the same 442 rows.

### Legacy condition

- concatenate the verbal expert tags from columns N:S;
- pass the resulting strings to the legacy v17/v18.5 parser without verbal normalization.

### Corrected condition

Only the ten previously identified parser aliases were normalized to the canonical forms already understood by the recovered Engine:

| Expert verbal label | Canonical Engine form |
|---|---|
| Серце | `❤` |
| Книги | `📚` |
| Сукня | `нова одежда` |
| Таблетка | `💊` |
| Шприц | `💊` |
| Хрест | `⊕` |
| Гучномовець | `📢` |
| Зелена печатка | `🟢` |
| Мішень | `🎯` |
| Вінаяка | `Ганеша` |

All other strings were left in their legacy form. No weights, score thresholds, GT labels or date-specific rules were changed.

Metrics:

- Exact 7-class;
- ±1 class distance;
- strict sign / 3-class (`negative`, `neutral`, `positive`).

## 4. Result — requested ten aliases only

| Metric | Legacy verbal input | Canonical aliases | Delta |
|---|---:|---:|---:|
| Exact 7-class | **33.03%** | **48.42%** | **+15.39 pp** |
| ±1 | **58.60%** | **71.95%** | **+13.35 pp** |
| Strict sign / 3-class | **61.76%** | **72.85%** | **+11.09 pp** |

Prediction changes: **153 / 442**

Among changed rows:

- exact wins: **81**;
- exact losses: **13**.

The remaining changed rows altered the predicted class without changing exact-match status.

## 5. Descriptive subsets by verbal label

These subsets overlap because one day may contain multiple tags. The table is descriptive and must **not** be interpreted as a causal ablation for each individual alias.

| Verbal label | n | Exact legacy → fixed | Sign legacy → fixed |
|---|---:|---:|---:|
| Серце | 64 | 1.6% → 78.1% | 28.1% → 82.8% |
| Книги | 87 | 8.0% → 49.4% | 29.9% → 63.2% |
| Сукня | 107 | 12.1% → 49.5% | 43.0% → 68.2% |
| Таблетка | 30 | 10.0% → 36.7% | 53.3% → 66.7% |
| Шприц | 13 | 30.8% → 46.2% | 84.6% → 84.6% |
| Хрест | 63 | 12.7% → 57.1% | 46.0% → 76.2% |
| Гучномовець | 20 | 0.0% → 45.0% | 30.0% → 85.0% |
| Зелена печатка | 12 | 8.3% → 41.7% | 33.3% → 58.3% |
| Мішень | 15 | 6.7% → 33.3% | 26.7% → 40.0% |
| Вінаяка | 14 | 28.6% → 28.6% | 64.3% → 64.3% |

## 6. Broader normalization sensitivity check

A secondary sensitivity run also normalized several already-known non-target labels such as `Акаша трітья`, travel, haircut and lunar-new-year forms.

On the same 442 rows:

| Metric | Legacy | Broader canonicalization |
|---|---:|---:|
| Exact | 33.03% | 49.32% |
| ±1 | 58.60% | 72.40% |
| Sign | 61.76% | 73.30% |

Changed predictions: 155; exact wins 85; exact losses 13.

This broader run is supporting sensitivity evidence only. The primary result for the correctness decision is the restricted ten-alias experiment in §4.

## 7. Interpretation

### What this establishes

1. The verbal-tag parser bug is real and large on the primary expert workbook.
2. The ten requested aliases materially restore same-source expert-logic reproduction without changing model weights or thresholds.
3. `Хрест → plus/⊕` is supported directly by the expert workbook legend and the canonical symbol dictionary.
4. The earlier frozen `engine_scores.json` replay could not reveal this effect because its raw v18.5 scores were already precomputed from legacy inputs.

### What this does NOT establish

- It does not prove real-world predictive validity.
- It does not validate each alias independently because tag subsets overlap.
- It does not justify tuning any weight or threshold.
- It does not make the reconstructed v19.2 historical source authentic; that source remains unrecovered.

## 8. Engineering consequence

The alias layer must be applied **before raw v17/v18.5 scoring**, not only in the dashboard or v19 overlay.

The required production-quality chain is therefore:

`expert verbal tags → canonical alias parser → v17 core → v18.5 wrapper → v19.x precedence/correctness → expert override hierarchy`

A regenerated production score file should not be produced until this full chain is self-contained, regression-tested and every changed historical row is attributed to a documented parser/rule cause.
