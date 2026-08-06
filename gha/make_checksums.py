from pathlib import Path

from common import ROOT, atomic_write_text, sha256_file


def main():
    files = []
    # Final integrity manifest covers every user-relevant archive component,
    # including Track C outputs and the exact code needed to reproduce them.
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
            if path.is_file() and path.name != "checksums.sha256":
                files.append(
                    f"{sha256_file(path)}  {path.relative_to(ROOT).as_posix()}"
                )
    for name in (
        "config.json",
        "requirements_download.txt",
        "requirements_analysis.txt",
        "requirements_jyotish.txt",
        "PREREGISTRATION_TRACK_C_v1.0.md",
        "README_V1_4B_STATIC_PATCH.md",
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
