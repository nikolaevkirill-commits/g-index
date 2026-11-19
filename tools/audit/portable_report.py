"""Export canonical single-attempt results only; private logs stay on the runner."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def failure_detail(log_text, argv, status):
    classes = ("AssertionError", "TimeoutError", "ModuleNotFoundError", "ImportError",
               "FileNotFoundError", "PermissionError", "CalledProcessError", "ValueError",
               "TypeError", "ReferenceError", "SyntaxError", "RuntimeError", "Error")
    category = next((name for name in classes if re.search(r"\b" + name + r"\b", log_text)), None)
    filenames = [Path(arg).name for arg in argv if arg.endswith((".py", ".cjs", ".js", ".mjs"))]
    frames = []
    for name in filenames:
        pattern = re.escape(name) + r'(?::|", line )(\d{1,7})(?:[:,)\s]|$)'
        frames.extend({"tool":name, "line":int(line)} for line in re.findall(pattern, log_text))
    return {"category":category or "unclassified", "status":status, "frames":frames[:6]}


def collect(directory):
    root = Path(__file__).resolve().parents[2]
    contract = read(root / "tools/audit/commands-105.json")
    revision = git("rev-parse", "HEAD")
    tree = git("rev-parse", "HEAD^{tree}")
    rows = []
    issues = []
    identity_path = directory / "binding.json"
    identity = read(identity_path) if identity_path.exists() else {}
    source = identity.get("source", {})
    if revision != os.environ["GITHUB_SHA"] or source.get("head") != revision or source.get("tree") != tree:
        issues.append("Candidate source binding is absent or different")
    summaries = list(directory.glob("summary-*.json"))
    summary = read(summaries[0]) if len(summaries) == 1 else {}
    if not summary.get("complete") or summary.get("scope") != "canonical_105":
        issues.append("Missing completed canonical summary")
    attempts = [read(p) for p in sorted(directory.glob("attempt-*.json"))]
    if len(contract["checks"]) != 105 or len(attempts) != 105 or len(summary.get("rows", [])) != 105:
        issues.append("Expected exactly 105 commands, attempts and summary rows")
    for i, attempt in enumerate(attempts, 1):
        expected = contract["checks"][i-1] if i <= len(contract["checks"]) else {}
        if attempt.get("index") != i or attempt.get("argv") != expected.get("argv"):
            issues.append(f"Unexpected command or repeated attempt at ordinal {i}")
        if attempt.get("status") != "PASS" or attempt.get("exit") != 0:
            issues.append(f"Command {i} did not pass")
        if i <= len(summary.get("rows", [])):
            row = summary["rows"][i-1]
            if any(attempt.get(k) != row.get(k) for k in ("attempt_id", "binding", "log_sha256", "status", "exit")):
                issues.append(f"Summary differs from attempt {i}")
        if Path(attempt["log"]).name != attempt["log"]:
            raise ValueError("Invalid attempt log path")
        diagnostic = {}
        with (directory / attempt["log"]).open("rb") as log:
            if hashlib.file_digest(log, "sha256").hexdigest() != attempt["log_sha256"]:
                issues.append(f"Log digest mismatch for {i}")
            if attempt.get("status") != "PASS" and expected:
                log.seek(0)
                diagnostic["failure"] = failure_detail(log.read().decode("utf-8", "replace"),
                                                       expected["argv"], attempt["status"])
        rows.append({**{k:attempt[k] for k in ("index","status","exit","seconds","log_sha256")},
                     "argv":expected.get("argv"), **diagnostic})
    env = identity.get("environment", {})
    browser = env.get("browser") or {}
    return {
        "candidate_sha":revision, "candidate_tree":tree, "scope":summary.get("scope"),
        "github_run_id":os.environ["GITHUB_RUN_ID"], "github_run_attempt":os.environ["GITHUB_RUN_ATTEMPT"],
        "platform":env.get("platform"), "python":env.get("python"),
        "node":subprocess.check_output(["node","--version"], text=True).strip(),
        "browser":{k:browser.get(k) for k in ("version","browser","executable_sha256")},
        "environment_sha256":env.get("environment_sha256"), "binding":summary.get("binding"),
        "expected_count":105, "attempt_count":len(attempts), "used_resume":False,
        "passed":not issues, "issues":issues, "rows":rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_evidence", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    report = collect(args.private_evidence)
    with args.output.open("x", encoding="utf-8") as dest:
        json.dump(report, dest, indent=2)
        dest.write("\n")
    print(f"Portable gate: {len(report['rows'])}/105 recorded, passed={report['passed']}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
