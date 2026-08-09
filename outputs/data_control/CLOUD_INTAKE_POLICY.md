# Cloud intake policy

## Purpose

Use Google Drive to recover and discover old work without allowing an old cloud copy to regress the canonical dashboard, Engine, manifest, or service worker.

## Required flow

1. Discover candidate files in the canonical Drive folder.
2. Copy them to a new dated directory on `D:`; never open them as the production working tree.
3. Record Drive file id, original path/name, modified time, size, and SHA-256.
4. Classify each artifact as `duplicate`, `older`, `new evidence`, `documentation`, `runtime input`, or `unknown`.
5. Parse and validate data in the staging directory.
6. Compare semantic content with the canonical registry; filename equality is insufficient.
7. Promote only an explicit, reviewed artifact through the normal release guard and CI.

## Hard rules

- No direct Drive-to-GitHub or Drive-to-production overwrite.
- The legacy Drive tree is read-only archive material.
- PDF/Excel expert decisions are idempotent by source hash, date and value.
- Research candidates remain shadow-only until chronological leakage-free validation and prospective evidence pass.
- Missing data remain missing; they are not converted to zero.
- Kp/runtime feeds must be assembled in an isolated release tree with a matching `data_manifest.json` before deployment.

## Local storage

All durable intake, rendering, hashing and audit output belongs on `D:`. Temporary work on `C:` is avoided because the disk is space-constrained.
