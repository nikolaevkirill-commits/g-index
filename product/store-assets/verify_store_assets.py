from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "STORE_ASSET_PROVENANCE_v1.json"


def main() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    failures: list[str] = []
    if payload.get("brand") != "Неборитм":
        failures.append("brand mismatch")
    for item in payload.get("outputs", []):
        path = ROOT / item["file"]
        if not path.is_file():
            failures.append(f"missing {item['file']}")
            continue
        with Image.open(path) as image:
            if image.format != "PNG":
                failures.append(f"not PNG: {item['file']}")
            if list(image.size) != item["pixels"]:
                failures.append(f"wrong size: {item['file']}")
            if "Copyright" not in image.info:
                failures.append(f"missing copyright metadata: {item['file']}")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != item["sha256"]:
            failures.append(f"hash mismatch: {item['file']}")
    print(json.dumps({"status": "FAIL" if failures else "PASS", "assets": len(payload.get("outputs", [])), "failures": failures}, ensure_ascii=False))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
