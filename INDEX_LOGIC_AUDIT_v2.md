# Index Logic Audit v2

- Status: **PASS**
- Generated UTC: `2026-09-04T11:26:01.720429+00:00`
- Hard failures: **0**

- PASS `panchanga_reference_matches_runtime` — Panchanga calculation and UI provenance must both say sunrise reference.
- PASS `pcl_scale_not_claimed_optimal` — PCL_SCALE=0.4 is retained for compatibility but must not be presented as validated accuracy.
- PASS `kp_not_averaged_before_ap_conversion` — NOAA method: convert each quasi-logarithmic 3-hour Kp to linear a, then average a to daily Ap.
- PASS `dst_missing_sentinel_filtered` — Kyoto WDC missing Dst=9999 must never enter the score.
- PASS `sunspot_penalty_shadow_only` — SILSO Sn remains context-only after negative chronological ablation.
- PASS `panchanga_counted_once` — Panchanga P_i is already inside G raw and must not be an independent second vote.
- PASS `future_kp_synthetic_never_promoted_to_real` — A numeric synthetic Kp placeholder must never be relabelled as a real NOAA/GFZ point.
- PASS `deploy_root_allowlist_only` — Only canonical root index.html may be copied to the deploy repository.
- PASS `legacy_copies_are_noncanonical` — Legacy copies containing rejected Sn arithmetic exist but are excluded from deploy: g_index_full_deploy/index.html, archive/index.html
