# Current audit regression contract

Run the commands in `.github/workflows/audit-runtime.yml` from the repository root. Playwright 1.62.1 and Chromium are required. `FP463_BROWSER` optionally selects an installed Chrome binary. Browser tests use local fixtures and blocked external requests; they are not physical-phone traffic evidence.

The root fp437/fp438/fp439 scripts now execute the current runtime regression contract. Their exact release-specific originals are preserved under `tests/historical/`; pinned old title strings and removed UI elements do not describe the current product. These originals are historical evidence, not current release gates. The consolidated CI runs the contract once.

`verify_fp420_formula_authority.js` is still active. Both canonical specification files are present in the repository and must accompany future audit packages. The 2026-08-23 erratum establishes `2 − Kp`; no formula or frozen score asset was changed for this audit.

NOAA fixtures: official 2026-09-15 00:30 and 12:30 UTC bulletins, from https://services.swpc.noaa.gov/text/3-day-forecast.txt. Calendar-edge variants inside tests are explicitly synthetic test fixtures.

Current Kp validity uses the value timestamp: final 3-hour bins expire at the following bin's completion; provisional estimates retain the existing 30-minute limit. Offline snapshots expire at the earlier of that source deadline and 3 hours since resolution. Pre-fix snapshot schema is rejected because it cannot attest source quality. This is a data-availability contract; model scores, thresholds and frozen assets remain unchanged.

Health cadence is 02:07/08:07/14:07/20:07 local, with one hour processing grace; manifest freshness remains independent. Local scheduler installation must be verified in the remediation receipt before claiming this schedule is installed.

`RELEASE_PREPARATION_v1.json` is the historical 2026-09-14 cohort preparation receipt. Its `publication_verified:false` is not the current deployment status and must not be retrospectively rewritten. Current publication evidence is commit-specific HTTP parity and CI/Pages receipts.

SheetJS 0.20.3 is vendored from the official CDN, used locally, and covered by an XLSX round-trip with Ukrainian sheet/column names. Vendor advisories: https://cdn.sheetjs.com/advisories/CVE-2023-30533 and https://cdn.sheetjs.com/advisories/CVE-2024-22363. This removes the affected 0.18.5 runtime and the Excel CDN request.
