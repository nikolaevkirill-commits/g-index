# Health semantics closure — fp411 — 2026-08-21

This change does not alter the frozen model, scores, thresholds, ground truth or prospective evidence.

## Closed

- Scheduler result `73` from `PROGNOZ_live_context_refresh` is the launcher's explicit pipeline-lock overlap code, not a failed refresh. When the last completed live-context run is PASS, health preserves `raw_scheduler_code=73`, records `skipped_due_to_pipeline_lock=true`, normalizes the operational result, and explains the semantics.
- The dashboard now separates tracker freshness from historical prospective coverage:
  - age above 36 hours: stale telemetry;
  - fresh telemetry with missing historical dates: fresh but incomplete coverage;
  - either condition keeps the promotion gate blocked.
- The 79 missed historical dates remain visible and do not count as prospective evidence.
- Scheduler discovery explicitly sets PowerShell output to UTF-8, preventing Cyrillic task paths from becoming replacement characters in the health artifact.

## Not closable by code

- Missing prospective observations cannot be backdated.
- Independent validated outcomes remain required for model promotion.
- v19.2 remains permanent SHADOW with `score_effect=0`.
