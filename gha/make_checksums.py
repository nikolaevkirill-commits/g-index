from pathlib import Path

from common import ROOT, atomic_write_text, sha256_file


TRANSIENT_PARTS = {"__pycache__", ".pytest_cache", ".venv"}


def is_transient(path: Path) -> bool:
    return bool(TRANSIENT_PARTS.intersection(path.parts)) or path.suffix == ".pyc"


def main():
    files = []
    for rel in (
        "data",
        "metadata",
        "outputs",
        "scripts",
        "analysis",
        "tests",
    ):
        base = ROOT / rel
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if (
                path.is_file()
                and path.name != "checksums.sha256"
                and not is_transient(path)
            ):
                files.append(
                    f"{sha256_file(path)}  {path.relative_to(ROOT).as_posix()}"
                )
    for name in (
        "config.json",
        "requirements_download.txt",
        "requirements_analysis.txt",
        "requirements_jyotish.txt",
        "PREREGISTRATION_DRAFT_v1.0.md",
        "PREREGISTRATION_TRACK_C_v1.0.md",
        "README_V1_4B_STATIC_PATCH.md",
        "STATISTICAL_PROTOCOL.md",
        "ANALYSIS_PLAN_13Y.md",
        "NEGATIVE_CONTROLS.md",
        "GO_NO_GO_CHECKLIST.md",
        "conftest.py",
    ):
        path = ROOT / name
        if path.is_file():
            files.append(
                f"{sha256_file(path)}  {path.relative_to(ROOT).as_posix()}"
            )
    atomic_write_text(
        ROOT / "metadata" / "checksums.sha256",
        "\n".join(files) + "\n",
    )
    print(f"checksums: {len(files)} files")


if __name__ == "__main__":
    main()
