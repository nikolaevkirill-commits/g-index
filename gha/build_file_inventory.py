from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


TRANSIENT_PARTS = {"__pycache__", ".pytest_cache", ".venv"}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_transient(path: Path) -> bool:
    return bool(TRANSIENT_PARTS.intersection(path.parts)) or path.suffix == ".pyc"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("root", nargs="?", default=".")
    p.add_argument("--output", default="metadata/file_inventory.json")
    args = p.parse_args()
    root = Path(args.root).resolve()
    out = Path(args.output)
    if not out.is_absolute():
        out = root / out
    checksum_path = root / "metadata" / "checksums.sha256"
    files = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or is_transient(path):
            continue
        if path.resolve() in {out.resolve(), checksum_path.resolve()}:
            continue
        files.append({
            "path": path.relative_to(root).as_posix(),
            "size": path.stat().st_size,
            "sha256": sha256(path),
        })
    payload = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "root": str(root),
        "file_count": len(files),
        "exclusions": [
            "metadata/file_inventory.json (self)",
            "metadata/checksums.sha256 (integrity manifest)",
            "__pycache__/**",
            ".pytest_cache/**",
            "*.pyc",
            ".venv/**",
        ],
        "files": files,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"inventory: {len(files)} files -> {out}")


if __name__ == "__main__":
    main()
