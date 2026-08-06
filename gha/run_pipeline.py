from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "runtime" / "project"
DIST = ROOT / "runtime" / "dist"
LOGS = PROJECT / "metadata" / "github_actions_logs"
DIST.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)


def run(name: str, args: Sequence[str], required: bool = False) -> bool:
    print(f"\n=== {name}: {' '.join(args)}", flush=True)
    proc = subprocess.run(
        list(args),
        cwd=PROJECT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    text = proc.stdout or ""
    print(text, flush=True)
    (LOGS / f"{name}.log").write_text(text, encoding="utf-8")
    result = {
        "name": name,
        "command": list(args),
        "exit_code": proc.returncode,
        "required": required,
    }
    (LOGS / f"{name}.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
    if required and proc.returncode != 0:
        raise RuntimeError(f"Required step failed: {name}")
    return proc.returncode == 0


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_packaged_integrity(path: Path) -> None:
    """Verify every inventory/checksum path against the final ZIP bytes."""
    with zipfile.ZipFile(path) as zf:
        members = set(zf.namelist())
        checksum_member = "metadata/checksums.sha256"
        inventory_member = "metadata/file_inventory.json"
        if checksum_member not in members or inventory_member not in members:
            raise RuntimeError("Final integrity manifests are missing from package")

        for line in zf.read(checksum_member).decode("utf-8").splitlines():
            if not line.strip():
                continue
            expected, rel = line.split("  ", 1)
            if rel not in members:
                raise RuntimeError(f"Checksummed file absent from ZIP: {rel}")
            actual = hashlib.sha256(zf.read(rel)).hexdigest()
            if actual != expected:
                raise RuntimeError(f"ZIP checksum mismatch: {rel}")

        inventory = json.loads(zf.read(inventory_member).decode("utf-8"))
        for item in inventory.get("files", []):
            rel = str(item["path"])
            if rel not in members:
                raise RuntimeError(f"Inventoried file absent from ZIP: {rel}")
            actual = hashlib.sha256(zf.read(rel)).hexdigest()
            if actual != item["sha256"]:
                raise RuntimeError(f"ZIP inventory mismatch: {rel}")

        required = {
            "data/derived/jyotish/jyotish_daily.parquet",
            "data/derived/jyotish/jyotish_hourly.parquet",
            "data/processed/daily_master_utc_2013_2026.parquet",
            "outputs/track_c_utc_real/run_manifest.json",
            "scripts/validate_archive.py",
            "analysis/track_c_climatology.py",
        }
        missing = sorted(required - members)
        if missing:
            raise RuntimeError(f"Required reproducibility files absent: {missing}")


def package(verdict: str, statuses: dict[str, object]) -> Path:
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "verdict": verdict,
        "statuses": statuses,
        "runner": "GitHub-hosted ubuntu-latest / Python 3.11",
        "track_c_started": bool(statuses.get("track_c")),
        "archive_version": "1.5.4",
    }
    summary_path = DIST / "GITHUB_ACTIONS_RUN_SUMMARY.json"
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    include = [
        "metadata",
        "data/raw",
        "data/derived",
        "data/processed",
        "outputs",
        "scripts",
        "analysis",
        "tests",
        "config.json",
        "requirements_download.txt",
        "requirements_analysis.txt",
        "requirements_jyotish.txt",
        "README_V1_4B_STATIC_PATCH.md",
        "PREREGISTRATION_DRAFT_v1.0.md",
        "PREREGISTRATION_TRACK_C_v1.0.md",
        "conftest.py",
        "STATISTICAL_PROTOCOL.md",
        "ANALYSIS_PLAN_13Y.md",
        "NEGATIVE_CONTROLS.md",
        "GO_NO_GO_CHECKLIST.md",
    ]
    out = DIST / (
        "PROGNOZ_13Y_CLAUDE_OUTPUT_v1.5.4_RAW.zip"
        if verdict == "PASS"
        else "PROGNOZ_13Y_GITHUB_ACTIONS_DIAGNOSTIC_v1.5.4.zip"
    )
    temp_out = out.with_suffix(out.suffix + ".tmp")
    if temp_out.exists():
        temp_out.unlink()
    with zipfile.ZipFile(temp_out, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
        for rel in include:
            path = PROJECT / rel
            if not path.exists():
                continue
            if path.is_file():
                zf.write(path, arcname=rel)
                continue
            for file in sorted(path.rglob("*")):
                if not file.is_file():
                    continue
                if any(
                    part in {".venv", "__pycache__", ".pytest_cache"}
                    for part in file.parts
                ):
                    continue
                zf.write(file, arcname=file.relative_to(PROJECT))
        zf.write(summary_path, arcname=summary_path.name)

    if verdict == "PASS":
        verify_packaged_integrity(temp_out)
    temp_out.replace(out)

    (DIST / f"{out.name}.sha256").write_text(
        f"{sha256(out)}  {out.name}\n", encoding="utf-8"
    )
    return out


def fail_after_packaging(
    verdict: str,
    statuses: dict[str, object],
    message: str,
) -> None:
    out = package(verdict, statuses)
    print(f"{message} Artifact created: {out}", flush=True)
    raise SystemExit(1)


def main() -> None:
    statuses: dict[str, object] = {}

    statuses["preflight_before"] = run(
        "preflight_before", [sys.executable, "scripts/run_preflight.py"]
    )
    statuses["pytest_before"] = run(
        "pytest_before", [sys.executable, "-m", "pytest", "-q"]
    )

    downloaders = {
        "gfz": [sys.executable, "scripts/download_gfz.py", "--mode", "hybrid"],
        "silso": [sys.executable, "scripts/download_silso.py"],
        "f107": [sys.executable, "scripts/download_f107.py"],
        "omni": [sys.executable, "scripts/download_omni_cdaweb.py"],
        "kyoto_dst": [
            sys.executable,
            "scripts/download_kyoto_dst_reference.py",
        ],
        "goes": [
            sys.executable,
            "scripts/download_goes_noaa_events.py",
        ],
    }

    process_status: dict[str, bool] = {}
    for name, command in downloaders.items():
        process_status[name] = run(f"download_{name}", command)
    statuses["download_process_exit_ok"] = process_status

    gate_process_ok = run(
        "download_gate",
        [sys.executable, "scripts/assert_download_success.py"],
    )
    gate_result = read_json(PROJECT / "metadata" / "download_success_gate.json")
    source_status = {}
    if gate_result:
        source_status = {
            name: bool(info.get("ok"))
            for name, info in (gate_result.get("sources") or {}).items()
            if isinstance(info, dict)
        }

    statuses["download_gate_process_ok"] = gate_process_ok
    statuses["download_sources_ok"] = source_status
    statuses["download_gate_verdict"] = (
        gate_result.get("verdict") if gate_result else "MISSING"
    )
    statuses["download_gate_errors"] = (
        gate_result.get("errors") if gate_result else ["gate result missing"]
    )
    statuses["download_gate_warnings"] = (
        gate_result.get("warnings") if gate_result else []
    )

    gate_pass = bool(
        gate_process_ok
        and gate_result
        and gate_result.get("verdict") == "PASS"
    )
    statuses["download_gate"] = gate_pass
    if not gate_pass:
        fail_after_packaging(
            "FAIL_DOWNLOAD_GATE",
            statuses,
            "Download gate failed.",
        )

    statuses["build_master"] = run(
        "build_master",
        [sys.executable, "scripts/build_master_dataset.py"],
    )
    if not statuses["build_master"]:
        fail_after_packaging(
            "FAIL_BUILD_MASTER",
            statuses,
            "Master construction failed.",
        )

    statuses["reconciliation"] = run(
        "reconciliation",
        [
            sys.executable,
            "scripts/reconcile_feature_registry.py",
            "--strict",
        ],
    )
    statuses["validate_before_track_c"] = run(
        "validate_before_track_c",
        [
            sys.executable,
            "scripts/validate_archive.py",
            "--require-raw",
        ],
    )
    statuses["pytest_after_raw"] = run(
        "pytest_after_raw", [sys.executable, "-m", "pytest", "-q"]
    )
    statuses["compileall"] = run(
        "compileall",
        [sys.executable, "-m", "compileall", "-q", "."],
    )

    ready = bool(
        statuses["preflight_before"]
        and statuses["pytest_before"]
        and statuses["reconciliation"]
        and statuses["validate_before_track_c"]
        and statuses["pytest_after_raw"]
        and statuses["compileall"]
    )
    if ready:
        statuses["track_c"] = run(
            "track_c",
            [
                sys.executable,
                "scripts/run_track_c_after_raw.py",
                "--input",
                "data/processed/daily_master_utc_2013_2026.parquet",
                "--output",
                "outputs/track_c_utc_real",
                "--permutations",
                "1999",
                "--max-lag",
                "30",
            ],
        )
    else:
        statuses["track_c"] = False

    statuses["validate_final"] = run(
        "validate_final",
        [
            sys.executable,
            "scripts/validate_archive.py",
            "--require-raw",
        ],
    )
    statuses["schema_samples_final"] = run(
        "schema_samples_final",
        [sys.executable, "scripts/export_schema_samples.py"],
    )

    old_checksums = PROJECT / "metadata" / "checksums.sha256"
    if old_checksums.exists():
        old_checksums.unlink()
    statuses["inventory_final"] = run(
        "inventory_final",
        [sys.executable, "scripts/build_file_inventory.py"],
    )
    statuses["checksums_final"] = run(
        "checksums_final",
        [sys.executable, "scripts/make_checksums.py"],
    )

    final_ready = bool(
        ready
        and statuses["track_c"]
        and statuses["validate_final"]
        and statuses["schema_samples_final"]
        and statuses["inventory_final"]
        and statuses["checksums_final"]
    )
    verdict = "PASS" if final_ready else "FAIL_VALIDATION"
    out = package(verdict, statuses)
    print(f"Result artifact prepared: {out}", flush=True)
    if verdict != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
