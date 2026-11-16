"""Generate and verify the offline gzip copies of versioned public scripts."""

import argparse
import gzip
import hashlib
import io
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 6_500_000
PACKED_RE = r"const PACKED_SHELL_HASHES = Object\.freeze\(\{(.*?)\}\);"


def packed_scripts(worker):
    block = re.search(PACKED_RE, worker, re.S)
    return dict(re.findall(r"'\./([^']+\.js)': '([a-f0-9]{64})'", block[1])) if block else {}


def script_bytes(path):
    return path.read_bytes().replace(b"\r\n", b"\n")


def regenerate(root):
    path = root / "sw.js"
    worker = path.read_text("utf-8")
    for name, expected in packed_scripts(worker).items():
        data = io.BytesIO()
        with gzip.GzipFile(filename="", mode="wb", fileobj=data, compresslevel=9, mtime=0) as stream:
            stream.write(script_bytes(root / name))
        body = data.getvalue()
        (root / (name + ".gz")).write_bytes(body)
        before = f"'./{name}': '{expected}'"
        after = f"'./{name}': '{hashlib.sha256(body).hexdigest()}'"
        worker = worker.replace(before, after, 1)
    path.write_text(worker, encoding="utf-8")


def verify(root=ROOT):
    worker = (root / "sw.js").read_text("utf-8")
    archives = packed_scripts(worker)
    if not archives:
        raise ValueError("Missing packed shell script manifest")
    shell = re.search(r"const SHELL_ASSETS = \[(.*?)\];", worker, re.S)
    requests = re.findall(r"'\./([^']+)'", shell[1])
    release_paths = {request.split("?", 1)[0] for request in requests if "?" in request}
    for name, expected in archives.items():
        if name not in release_paths:
            raise ValueError("Packed script must have a versioned shell request: " + name)
        archive = (root / (name + ".gz")).read_bytes()
        if hashlib.sha256(archive).hexdigest() != expected or gzip.decompress(archive) != script_bytes(root / name):
            raise ValueError("Out-of-date packed shell script. Run sync_packed_shell.py --write: " + name)

    # Include every best-effort preview SVG in the limit. The lazy b17
    # preview is downloaded on use, so it has no install-time cost.
    installed_bytes = 0
    for request in requests:
        name = request.split("?", 1)[0]
        if name == "design-b17.html" or name.startswith("preview-b17/"):
            continue
        installed_bytes += (root / (name + ".gz" if name in archives else name)).stat().st_size
    if installed_bytes > MAX_BYTES:
        raise ValueError(f"Offline shell stores {installed_bytes:,} bytes, budget is {MAX_BYTES:,}")
    print(f"PASS packed shell: {len(archives)} exact archives, at most {installed_bytes:,} bytes at installation")
    return installed_bytes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.write:
        regenerate(ROOT)
    verify()

