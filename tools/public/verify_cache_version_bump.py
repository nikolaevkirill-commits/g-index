"""Require a distinct cache version for changes to worker-managed release assets."""
import argparse
from collections import defaultdict
from html.parser import HTMLParser
import os
from pathlib import Path
import posixpath
import re
import subprocess
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def git(root, *args):
    return subprocess.check_output(
        ["git", "-C", str(root), *args], stderr=subprocess.DEVNULL,
    )


def shell(worker):
    version = re.search(r"const CACHE_VERSION = '([^']+)';", worker)[1]
    assets = re.search(r"const SHELL_ASSETS = \[(.*?)\];", worker, re.S)[1]
    packed = re.search(r"const PACKED_SHELL_HASHES = Object\.freeze\(\{(.*?)\}\);", worker, re.S)
    on_demand = re.search(r"const ON_DEMAND_ASSETS = new Set\(\[(.*?)\]", worker, re.S)
    paths = {name.split("?", 1)[0] for name in re.findall(r"'\./([^']+)'", assets)}
    paths.add("sw.js")
    for call in re.findall(r"importScripts\((.*?)\)", worker, re.S):
        paths.update(name.split("?", 1)[0] for name in re.findall(r"'\./([^']+)'", call))
    if packed:
        paths.update(name + ".gz" for name in re.findall(r"'\./([^']+\.js)'", packed[1]))
    if on_demand:
        paths.update(name.split("?", 1)[0] for name in re.findall(r"'([^']+)'", on_demand[1]))
    return version, paths


class ScriptSources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            source = dict(attrs).get("src")
            if source:
                self.urls.append(source)


def script_versions(root, ref, modified):
    """Read browser entry points and the worker manifest from the same Git tree."""
    versions = defaultdict(set)
    pages = git(root, "ls-tree", "-r", "--name-only", "-z", ref, "--").decode().split("\0")
    for page in pages:
        if not page.endswith(".html") and page != "sw.js":
            continue
        text = git(root, "show", f"{ref}:{page}").decode()
        if page == "sw.js":
            shell_assets = re.search(r"const SHELL_ASSETS = \[(.*?)\];", text, re.S)[1]
            imports = re.findall(r"importScripts\((.*?)\)", text, re.S)
            urls = re.findall(r"""['"]([^'"]+)['"]""", "\n".join([shell_assets, *imports]))
        else:
            parser = ScriptSources()
            parser.feed(text)
            urls = parser.urls
        for url in urls:
            parts = urlsplit(url)
            if parts.scheme or parts.netloc:
                continue
            path = posixpath.normpath(posixpath.join(posixpath.dirname(page), parts.path)).lstrip("/")
            if path in modified:
                versions[path].add(parse_qs(parts.query).get("v", [None])[0])
    return versions


def validate_script_versions(root, previous, candidate):
    modified = set(git(root, "diff", "--no-renames", "--diff-filter=M", "--name-only", "-z",
                       previous, candidate, "--", "*.js").decode().split("\0"))
    modified.discard("")
    modified.discard("sw.js")
    if not modified:
        return
    before = script_versions(root, previous, modified)
    after = script_versions(root, candidate, modified)
    for path in sorted(modified):
        previous_versions = before[path] - {None}
        if previous_versions and (previous_versions & after[path] or None in after[path]):
            raise ValueError(f"Versioned script {path} changed since {previous}, but a script URL "
                             "retains a previous ?v= or omits the version")


def inspect(root, previous, candidate="HEAD"):
    old = git(root, "rev-parse", "--verify", f"{previous}^{{commit}}").decode().strip()
    new = git(root, "rev-parse", "--verify", f"{candidate}^{{commit}}").decode().strip()
    try:
        predecessor = git(root, "show", f"{old}:sw.js").decode("utf-8")
    except subprocess.CalledProcessError:
        return None
    previous_version, previous_paths = shell(predecessor)
    candidate_version, candidate_paths = shell(git(root, "show", f"{new}:sw.js").decode("utf-8"))
    managed = previous_paths | candidate_paths
    files = git(root, "diff", "--no-renames", "--name-only", "-z", old, new).decode("utf-8").split("\0")
    changed = [name for name in files if name in managed or name.startswith("dayline_art/")]
    return previous_version, candidate_version, changed


def validate(root, previous, candidate="HEAD"):
    result = inspect(root, previous, candidate)
    if result is not None:
        old, new, changed = result
        if old == new and changed:
            raise ValueError(f"CACHE_VERSION {new} is unchanged since {previous}, but managed files changed: "
                             + ", ".join(changed[:10]))
        validate_script_versions(root, previous, candidate)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous", default="HEAD^1", help="Git revision of the immediate predecessor")
    args = parser.parse_args()
    published = os.environ.get("CACHE_PUBLISHED_BASELINE", "").strip()
    refs = list(dict.fromkeys(ref for ref in (args.previous, published) if ref))
    for ref in refs:
        try:
            result = validate(ROOT, ref)
        except (ValueError, subprocess.CalledProcessError) as error:
            raise SystemExit(str(error)) from error
        if result is None:
            print(f"SKIP cache version: {ref} has no sw.js")
        else:
            old, new, changed = result
            print(f"PASS cache version: {old} -> {new}; {len(changed)} managed changes since {ref}")


if __name__ == "__main__":
    main()
