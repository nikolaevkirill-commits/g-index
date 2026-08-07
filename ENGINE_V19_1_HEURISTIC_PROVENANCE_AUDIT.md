# v19.1 heuristic provenance audit

Date: 2026-08-07
Status: **READ-ONLY MODEL-GOVERNANCE AUDIT**

## 1. Source evidence

Recovered `score_engine_v19_preview.py` identifies itself as v19.1 (2026-06-14) and explicitly states:

- patches verified on **GT n=350**;
- strict accuracy **73.4% vs baseline 71.4%**;
- P-v19-1 was introduced for specific known GT cases;
- P-v19-3 was introduced for specific known GT cases.

This is development evidence, not untouched prospective validation.

## 2. P-v19-1 — bolt + action rescue

Rule:

- frozen v18.5 base = -3;
- bolt present;
- Kp <= 2;
- no amavasya/purnima/ekadashi/ganesh/retro/eclipse;
- plane OR plus+scissors;
- output +2.

Recovered source lists the motivating/verified cases directly:

- 2026-05-11;
- 2026-05-20;
- 2026-06-17.

Therefore the rule is a targeted contextual heuristic built after observing historical case behavior.

Frozen exposed future rows using this rule: **2**.
Both are sign flips.

## 3. P-v19-3 — medical solo

Rule:

- base = 0;
- med tag present;
- no blocking tags;
- Kp < 5;
- output +1.

Recovered source lists the motivating/verified cases:

- 2026-04-26;
- 2026-04-28;
- 2025-11-28.

Frozen exposed future rows using this rule: **1**.
It is a sign flip.

A separate semantic audit found that the source comment says med should have priority over Panchanga while actual execution evaluates Panchanga first. That inconsistency does not affect the frozen 29-row cohort but remains post-shadow backlog.

## 4. P-v19-5 — Panchanga priors

The recovered source states these priors were GT-validated and reports a net strict gain. `panchanga_sign_priors.json` explicitly says the priors were derived from GT n=350 and retained/checked by target agreement.

Frozen exposed future rows using priors: **5**.
All five are sign flips.

This is the strongest target-selection concern inside v19.1.

## 5. Calendar enrichment

The source also enriches empty tags from `calendar_tags_2025_2026.json`.

Repository history shows the calendar file itself was revised with GT-informed exclusions and retained entries were checked for neutral/improved target agreement. Therefore calendar enrichment cannot be treated as an independently specified feature either.

## 6. Governance conclusion

All 8 exposed v19.1 future rows are model-rule changes whose historical evidence is development/GT-informed:

- 2 bolt/action rescue;
- 1 med solo;
- 5 Panchanga priors.

None should be promoted on the basis of the historical 73.4% replay figure alone.

The frozen post-2026-08-07 shadow cohort is the first appropriate prospective validation surface for these exact exposed rules.

No rule or candidate output is changed by this audit.
