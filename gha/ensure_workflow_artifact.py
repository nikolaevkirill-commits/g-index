from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "runtime" / "dist"
PROJECT = ROOT / "runtime" / "project"
DIST.mkdir(parents=True, exist_ok=True)

summary_path = DIST / "GITHUB_ACTIONS_RUN_SUMMARY.json"

if summary_path.exists() and any(DIST.glob("*.zip")):
    print("Pipeline artifact already exists.")
    raise SystemExit(0)

summary = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "verdict": "FAIL_WORKFLOW_BEFORE_PACKAGING",
    "statuses": {},
    "runner": "GitHub-hosted ubuntu-latest / Python 3.11",
    "track_c_started": False,
}
summary_path.write_text(
    json.dumps(summary, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

message = """# PROGNOZ workflow-level diagnostic

The workflow failed before `gha/run_pipeline.py` could create its normal result
artifact. Inspect the GitHub Actions step logs and the files under
`metadata/github_actions_logs/`, if present.
"""
(DIST / "WORKFLOW_FAILURE.md").write_text(message, encoding="utf-8")

out = DIST / "PROGNOZ_13Y_GITHUB_ACTIONS_DIAGNOSTIC.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(summary_path, arcname=summary_path.name)
    zf.write(DIST / "WORKFLOW_FAILURE.md", arcname="WORKFLOW_FAILURE.md")

    logs = PROJECT / "metadata" / "github_actions_logs"
    if logs.exists():
        for path in sorted(logs.rglob("*")):
            if path.is_file():
                zf.write(path, arcname=path.relative_to(PROJECT))

print(f"Workflow-level diagnostic created: {out}")
