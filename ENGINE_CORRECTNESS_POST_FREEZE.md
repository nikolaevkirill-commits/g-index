# Engine correctness — post-freeze candidate

## Scope

This branch changes only deterministic correctness behavior. It does **not** use PDF/GT labels, date-specific patches, fitted thresholds, ML, new indices or time-window tuning.

## Patch A — canonical tag aliases

`engine_tag_aliases_v1.json` is the single alias-to-token contract. `engine_correctness.py` exposes Python token-set and boolean-map views; `engine_tag_parser.js` reads the same JSON for dashboard/validator code. No alias list is duplicated in JavaScript.

Required parity tests cover:

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

`Хрест → plus` is the only mapping that still requires direct confirmation against the original expert master table before production merge.

## Patch B — aggregate bolt rescue

Frozen formula:

```text
P = Σ max(0, w_t), t ≠ bolt
rescue = |w_bolt|, if bolt is present and P ≥ w_heart; otherwise 0
```

With the reproducible v15.1 weights:

```text
w_heart = +2.5
w_bolt  = −2.2
```

The rescue neutralizes only the generic bolt base penalty. It does not remove structural negative interactions such as `bolt+med` or `bolt+navaratri`.

Regression cases:

- `heart+bolt`: rescued through the same general formula;
- `plane+plus+scissors+bolt`: rescued because 1.0 + 1.2 + 0.5 = 2.7 ≥ 2.5;
- `plane+study+bolt`: not rescued because 1.3 < 2.5;
- `retro+bolt`, `med+bolt`, `bolt` alone: not rescued.

## Production blocker found during audit

The current dashboard does not calculate the frozen Engine in `index.html`; it reads static `engine_scores.json` values labeled v18.5. The repository contains `forecast_engine_v15_1.py`, but the v17/v18.5 source modules required to reproduce current production scores are absent. `deploy/score_engine_v19_preview.py` imports those missing modules and also contains date/GT-oriented patches, so it is not a valid base for this correctness change.

Therefore `forecast_engine_v15_1_correctness.py` is an explicit candidate adapter for the latest reproducible source. It must not replace production scores until the exact frozen v18.5 source is restored or the static score file is deliberately regenerated from an audited source.

## Promotion gate

1. Restore the exact source that generated frozen v18.5 scores.
2. Port only the canonical parser and fixed bolt formula.
3. Run unit tests.
4. Run one sealed replay on the unchanged frozen dataset.
5. Report Exact 7-class, ±1, 3-class/sign and PDF agreement for `n_tags=0`, `1`, `2+`.
6. Verify that all UI views consume the same canonical score path before merging into deploy.
