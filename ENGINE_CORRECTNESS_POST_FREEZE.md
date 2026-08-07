# Engine correctness — post-freeze history and current status

## Status

This file began as the **initial v15.1 correctness detour** before the real v17/v18.5/v19.1 source chain was recovered. It is retained only to document that path. It is **not the current promotion specification**.

Current authoritative release status:

- `ENGINE_V19_2_RECONSTRUCTION.md` — reconstruction/provenance audit;
- `V19_2_RELEASE_GATE_2026-08-07.md` — current release decision;
- `V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json` — immutable prospective cohort.

Current decision: **HOLD DIRECT PROMOTION / FROZEN PROSPECTIVE SHADOW**. Production `deploy` and canonical `engine_scores.json` remain unchanged.

## Canonical tag aliases

`engine_tag_aliases_v1.json` is the shared alias-to-token contract. `engine_correctness.py` exposes Python parsing views and `engine_tag_parser.js` reads the same JSON for UI/validator parity.

Primary expert workbook evidence now confirms the verbal vocabulary. In particular:

| Verbal expert label | Canonical token | Symbol/emoji equivalent |
|---|---|---|
| Серце | `heart` | ❤ |
| Книги | `study` | 📚 |
| Сукня | `new_clothes` | 👗 |
| Таблетка | `med` | 💊 |
| Хрест | `plus` | ⊕ |
| Гучномовець | `advert` | 📢 |
| Зелена печатка | `luck` | 🟢 |
| Мішень | `goal` | 🎯 |
| Вінаяка | `ganesh` | Ганеша |
| Шприц | `med` | 💉 |

**`Хрест → plus/⊕` is confirmed** from the expert workbook semantic legend plus the canonical production symbol dictionary. It is no longer provisional.

## Recovered source chain

The earlier blocker “v17/v18.5 source is absent/unrecoverable” is obsolete.

Byte-identical recovered sources are now committed and SHA-pinned in CI:

- `forecast_engine_v17_0.py`;
- `forecast_engine_v18_5.py` — 73/73 native tests PASS;
- `score_engine_v19_preview.py` v19.1 — 11/11 native tests PASS.

Raw reproducibility audit shows **563/563 non-overridden frozen rows reproduce exactly**. The single non-reproduced frozen row (`2026-05-21`) is an explicit historical override and is independently backed by a verified expert/PDF override.

## About the legacy v15.1 files

`forecast_engine_v15_1.py`, `forecast_engine_v15_1_frozen.py`, `forecast_engine_v15_1_correctness.py` and the original v15.1 sealed replay remain in this branch as **legacy regression scaffolding only**.

They must not be interpreted as the current Engine baseline and must not be used to regenerate production scores. The v19.2 correctness path uses recovered **v17 weights** where weight semantics are required.

The original v15.1 aggregate-bolt experiment used:

```text
P = Σ max(0, w_t), t ≠ bolt
rescue = |w_bolt| when bolt is present and P ≥ w_heart
```

That historical experiment is preserved for regression provenance, not as the v19.2 production formula.

## Current v19.2 gate

The reconstructed v19.2 candidate was replayed without tuning and then passed deterministic correctness tests, raw-chain provenance audit, actual runtime hierarchy audit and exact rule-attribution audit.

However the runtime hierarchy shows that the only **29 exposed candidate changes are all prospective dates from 2026-08-07 onward**, including **12 sign flips**. Rule attribution shows that multiple sign flips come from broad v18.8 plane/Dashami rules and v19.1 Panchanga priors, not merely parser correctness.

Therefore:

1. PR #2 remains draft;
2. production v18.5/Expert hierarchy remains unchanged;
3. reconstructed v19.2 is frozen prospectively from 2026-08-07;
4. future evidence must be appended without modifying the frozen candidate;
5. direct promotion is reconsidered only after prospective evidence exists.
