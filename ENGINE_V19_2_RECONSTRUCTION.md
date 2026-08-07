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

## 6. Local reconstruction regression

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

## 7. Promotion status

**DO NOT PROMOTE. DO NOT MERGE TO `deploy`.**

Required next gates:

- [ ] Commit byte-identical recovered v17.0, v18.5 and v19.1 source files to the correctness branch.
- [ ] Commit the reconstructed v19.2 candidate with the explicit `historical_source_recovered=false` provenance flag.
- [ ] Port the shared verbal/emoji alias contract to this v19.x chain.
- [ ] Port the frozen aggregate-positive bolt correctness rule to this v19.x chain without breaking explicit structural contexts.
- [ ] Run deterministic v17/v18.5/v19.1/v19.2 regression suites.
- [ ] Run one sealed no-tuning replay on unchanged data: Exact 7-class, ±1, Strict-3/sign, buckets n_tags=0/1/2+.
- [ ] Confirm `Хрест -> ⊕` from a primary expert source or keep it explicitly provisional.
- [ ] Only then evaluate production promotion.

## 8. Current conclusion

The old PR blocker "v17/v18.5 source cannot be recovered" is obsolete. Exact source files now exist and pass their own tests. The unresolved issue is narrower: **the original historical v19.2 precedence/consolidation source has not been recovered**. We can produce an auditable reconstructed candidate, but it must remain separately labeled until sealed testing and provenance gates are complete.
