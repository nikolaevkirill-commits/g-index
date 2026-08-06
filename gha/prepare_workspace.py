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


def patch_validator_sentinels(path: Path) -> None:
    """Do not misclassify valid signed -1 values as fill sentinels."""
    text = path.read_text(encoding="utf-8")
    old = '''        for val in (-1, 999, 999.9, 9999, 99999):
            frac = float((s == val).mean())
            if frac > 0.01:
                suspects[f"{col}=={val}"] = round(frac, 5)
'''
    new = '''        # -1 is physically valid for signed geomagnetic/IMF variables
        # (Dst, Bx, By, Bz), including their master aggregation columns.
        signed_minus_one_ok = any(
            token in str(col).lower()
            for token in ("dst", "bx_gse", "by_gsm", "bz_gsm")
        )
        for val in (-1, 999, 999.9, 9999, 99999):
            if val == -1 and signed_minus_one_ok:
                continue
            frac = float((s == val).mean())
            if frac > 0.01:
                suspects[f"{col}=={val}"] = round(frac, 5)
'''
    if old not in text:
        raise SystemExit("Validator sentinel patch target not found")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


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
        "make_checksums.py": "make_checksums.py",
    }
    for source_name, target_name in overrides.items():
        source = ROOT / "gha" / source_name
        target = PROJECT / "scripts" / target_name
        if not source.is_file():
            raise SystemExit(f"Required GHA override missing: {source}")
        shutil.copy2(source, target)

    validator = PROJECT / "scripts" / "validate_archive.py"
    patch_validator_sentinels(validator)

    required = [
        validator,
        PROJECT / "scripts" / "build_jyotish_archive.py",
        PROJECT / "scripts" / "download_omni_cdaweb.py",
        PROJECT / "scripts" / "make_checksums.py",
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
    print("Validator signed-sentinel patch: applied")
    print("Jyotish data will be rebuilt on the GitHub-hosted runner.")
    print("Frozen Engine/GT/PDF/Excel are not included or modified.")


if __name__ == "__main__":
    main()
