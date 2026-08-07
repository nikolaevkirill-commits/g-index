#!/usr/bin/env python3
"""Leakage-safe intake of prospective verified expert/PDF labels for v19.2 shadow.

Only an override whose exact evidence tuple first appears in Git strictly AFTER
V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json:frozen_at_utc may be appended.

This prevents future-dated labels that already existed before the freeze from
being misrepresented as prospective evidence.
"""
from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREEZE = ROOT / "V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json"
APPENDER = ROOT / "append_v19_2_shadow_observation.py"
OVERRIDE_CANDIDATES = (ROOT / "expert_overrides_v3.json", ROOT / "deploy" / "expert_overrides_v3.json")


def sh(*args: str, check: bool = True) -> str:
    p = subprocess.run(args, cwd=ROOT, text=True, capture_output=True)
    if check and p.returncode:
        raise RuntimeError(f"command failed {args}: {p.stderr.strip()}")
    return p.stdout


def parse_time(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        raise ValueError("timestamp must have timezone")
    return dt.astimezone(timezone.utc)


def load_doc_bytes(raw: str) -> dict:
    return json.loads(raw) if raw.strip() else {}


def override_map(doc: dict) -> dict[str, dict]:
    rows = doc.get("overrides", []) if isinstance(doc, dict) else []
    return {str(r.get("date")): r for r in rows if isinstance(r, dict) and r.get("date")}


def evidence_tuple(r: dict | None):
    if not r:
        return None
    return (
        r.get("expert_eng"),
        bool(r.get("verified")),
        r.get("source_pdf"),
        r.get("source_page"),
        r.get("snippet_hash"),
    )


def valid_verified_pdf(r: dict) -> bool:
    h = str(r.get("snippet_hash") or "")
    return (
        r.get("verified") is True
        and isinstance(r.get("expert_eng"), int)
        and -3 <= r["expert_eng"] <= 3
        and bool(r.get("source_pdf"))
        and r.get("source_page") is not None
        and h.startswith("sha256:")
        and "pending" not in h.lower()
    )


def first_post_freeze_materialization(target_row: dict, baseline_row: dict | None,
                                      post_freeze_rows: list[tuple[str, datetime, dict | None]]):
    """Return first (sha,time) where exact valid evidence appears after freeze.

    Pure helper used by tests. If identical evidence already existed at freeze,
    return None even if it appears again later: that label is pre-existing and
    cannot become prospective merely because a later commit touched the file.
    """
    if not valid_verified_pdf(target_row):
        return None
    target = evidence_tuple(target_row)
    if evidence_tuple(baseline_row) == target:
        return None
    for sha, dt, row in post_freeze_rows:
        if row and valid_verified_pdf(row) and evidence_tuple(row) == target:
            return sha, dt
    return None


def git_file_at(commit: str, path: str) -> dict:
    p = subprocess.run(
        ["git", "show", f"{commit}:{path}"], cwd=ROOT, text=True, capture_output=True
    )
    if p.returncode:
        return {}
    try:
        return json.loads(p.stdout)
    except json.JSONDecodeError:
        return {}


def main() -> int:
    if not FREEZE.exists():
        raise RuntimeError("freeze file missing")
    freeze = json.loads(FREEZE.read_text(encoding="utf-8"))
    freeze_time = parse_time(freeze["frozen_at_utc"])
    cohort = {r["date"] for r in freeze.get("rows", [])}

    override_path = next((p for p in OVERRIDE_CANDIDATES if p.exists()), None)
    if not override_path:
        raise RuntimeError("expert_overrides_v3.json missing")
    rel = override_path.relative_to(ROOT).as_posix()
    current = override_map(json.loads(override_path.read_text(encoding="utf-8")))

    baseline_commit = sh(
        "git", "log", "-1", f"--until={freeze_time.isoformat()}", "--format=%H", "--", rel,
        check=False,
    ).strip()
    baseline = override_map(git_file_at(baseline_commit, rel)) if baseline_commit else {}

    log = sh(
        "git", "log", "--reverse", f"--after={freeze_time.isoformat()}",
        "--format=%H|%cI", "--", rel, check=False,
    )
    commits = []
    for line in log.splitlines():
        if not line.strip() or "|" not in line:
            continue
        sha, ts = line.split("|", 1)
        dt = parse_time(ts)
        if dt > freeze_time:
            commits.append((sha, dt))

    eligible = []
    rejected_preexisting = []
    for ds in sorted(cohort):
        row = current.get(ds)
        if not row or not valid_verified_pdf(row):
            continue
        if evidence_tuple(baseline.get(ds)) == evidence_tuple(row):
            rejected_preexisting.append(ds)
            continue
        history = []
        for sha, dt in commits:
            history.append((sha, dt, override_map(git_file_at(sha, rel)).get(ds)))
        first = first_post_freeze_materialization(row, baseline.get(ds), history)
        if first:
            eligible.append((ds, row, first[0], first[1]))

    appended = 0
    duplicates = 0
    for ds, row, sha, dt in eligible:
        cmd = [
            "python", str(APPENDER),
            "--date", ds,
            "--kind", "expert_pdf",
            "--value", str(row["expert_eng"]),
            "--observed-at", dt.isoformat(),
            "--source", f"{row.get('source_pdf')}@git:{sha[:12]}",
            "--note", "verified expert/PDF evidence first materialized in Git after v19.2 prospective freeze",
        ]
        p = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
        if p.returncode == 0:
            appended += 1
            print(p.stdout.strip())
        elif "duplicate observation" in (p.stderr + p.stdout):
            duplicates += 1
        else:
            raise RuntimeError(p.stderr.strip() or p.stdout.strip())

    summary = {
        "freeze_time_utc": freeze_time.isoformat(),
        "override_source": rel,
        "baseline_commit": baseline_commit or None,
        "post_freeze_source_commits": len(commits),
        "cohort_rows": len(cohort),
        "eligible_post_freeze_verified_pdf": len(eligible),
        "rejected_as_preexisting_at_freeze": rejected_preexisting,
        "appended": appended,
        "duplicates": duplicates,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
