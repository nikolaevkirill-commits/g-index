from __future__ import annotations

import base64
import lzma
import shutil
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
PROJECT = RUNTIME / "project"
PARTS = ROOT / "inputs" / "minstatic_b64"


def main() -> None:
    if PROJECT.exists():
        shutil.rmtree(PROJECT)
    PROJECT.mkdir(parents=True)

    part_files = sorted(PARTS.glob("part*.txt"))
    if not part_files:
        raise SystemExit(f"No archive parts found in {PARTS}")

    encoded = "".join(
        path.read_text(encoding="ascii").strip() for path in part_files
    )
    compressed = base64.b64decode(encoded, validate=True)
    tar_bytes = lzma.decompress(compressed)

    archive = RUNTIME / "minstatic.tar"
    archive.parent.mkdir(parents=True, exist_ok=True)
    archive.write_bytes(tar_bytes)
    with tarfile.open(archive, mode="r:") as tf:
        tf.extractall(PROJECT, filter="data")

    overrides = {
        "assert_download_success.py": "assert_download_success.py",
        "export_schema_samples.py": "export_schema_samples.py",
        "download_omni_cdaweb.py": "download_omni_cdaweb.py",
    }
    for source_name, target_name in overrides.items():
        source = ROOT / "gha" / source_name
        target = PROJECT / "scripts" / target_name
        if not source.is_file():
            raise SystemExit(f"Required GHA override missing: {source}")
        shutil.copy2(source, target)

    required = [
        PROJECT / "scripts" / "validate_archive.py",
        PROJECT / "scripts" / "build_jyotish_archive.py",
        PROJECT / "scripts" / "download_omni_cdaweb.py",
        PROJECT / "requirements_download.txt",
        PROJECT / "requirements_analysis.txt",
        PROJECT / "requirements_jyotish.txt",
    ]
    missing = [str(path.relative_to(PROJECT)) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"Canonical minimal archive incomplete: {missing}")

    print(f"Canonical v1.4b minimal workspace prepared: {PROJECT}")
    print(f"Archive parts: {len(part_files)}")
    print("GHA overrides: " + ", ".join(sorted(overrides)))
    print("Jyotish data will be rebuilt on the GitHub-hosted runner.")
    print("Frozen Engine/GT/PDF/Excel are not included or modified.")


if __name__ == "__main__":
    main()
