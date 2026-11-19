"""Verify local portable evidence and export a report without credentials or raw logs."""
import argparse
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True
from run_gate import (CANONICAL_CONTRACT, canonical, contract, digest, external_key_path,
                      file_hash, mac, read, read_private_key, resume_records)


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()


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


def require(ok, message):
    if not ok:
        raise ValueError(message)


def authentic_summary(path, key, binding, spec, history, positions):
    summary = read(path)
    signature = summary.pop("mac", None)
    require(isinstance(signature, str) and hmac.compare_digest(signature, mac(key, summary)),
            "Summary HMAC mismatch")
    require(summary.get("binding") == binding and summary.get("scope") == "canonical_105",
            "Summary binding or scope mismatch")
    head = summary.get("attempt_head_mac")
    require(head in positions, "Summary head missing from authenticated chain")
    count = positions[head]
    prefix = [row for row, _ in history[:count]]
    latest = {row["index"]:row for row in prefix}
    rows = summary.get("rows")
    expected = spec["expected_count"]
    require(isinstance(rows, list) and len(rows) <= expected
            and summary.get("expected_count") == expected
            and summary.get("observed_count") == len(rows)
            and all(row == latest.get(index) for index, row in enumerate(rows, 1)),
            "Summary rows differ from authenticated attempts")
    passed = len(rows) == expected and all(row["status"] == "PASS" and row["exit"] == 0 for row in rows)
    require(summary.get("complete") is passed and summary.get("suite_passed") is passed,
            "Summary completion flags contradict authenticated attempts")
    invocation = summary.get("invocation")
    if invocation is None:
        return summary, count, None, None, "legacy_unknown"

    identifier = invocation["id"]
    previous_count = invocation["prior_attempt_count"]
    resumed = invocation["requested_resume"]
    require(isinstance(identifier, str) and re.fullmatch(r"[a-f0-9]{32}", identifier)
            and invocation["summary_id"] == path.stem and type(resumed) is bool
            and type(previous_count) is int and 0 <= previous_count <= count
            and (resumed or previous_count == 0),
            "Invalid signed invocation")
    previous = {row["index"]:row for row in prefix[:previous_count]}
    executed = prefix[previous_count:]
    require(all(row.get("invocation_id") == identifier for row in executed)
            and not any(row.get("invocation_id") == identifier for row in prefix[:previous_count]),
            "Invocation does not match its attempt span")
    reused = []
    fresh = []
    for row in rows:
        old = previous.get(row["index"])
        if old and old["status"] == "PASS" and old["exit"] == 0:
            require(row == old, "Invocation did not reuse the recorded prior PASS")
            reused.append(row["attempt_id"])
        else:
            fresh.append(row)
    require(fresh == executed and invocation["reused_attempt_ids"] == reused
            and (resumed or not reused),
            "Invocation reuse or execution record disagrees with the attempts")
    return summary, count, bool(reused), resumed, "authenticated_invocation"


def verify(directory, spec, identity, keyfile, full_resume):
    require(not (directory / "ACTIVE.lock").exists(), "Gate is still active")
    key = read_private_key(keyfile)
    binding = digest(canonical(identity))
    history = []
    resume_records(directory, key, binding, spec["checks"], history=history)
    positions = {None:0, **{seal:index for index, (_, seal) in enumerate(history, 1)}}
    candidates = list(directory.glob("summary-*.json"))
    require(candidates, "No signed summary")
    require(all(re.fullmatch(r"summary-\d+", p.stem) and not p.is_symlink() for p in candidates),
            "Invalid signed summary filename")
    last_count = 0
    ordered = sorted(candidates, key=lambda p: int(p.stem.removeprefix("summary-")))
    if full_resume:
        require(len(ordered) == 2, "Full resume proof requires exactly two signed summaries")
    for number, path in enumerate(ordered):
        summary, count, reused, resumed, provenance = authentic_summary(
            path, key, binding, spec, history, positions)
        require(count >= last_count, "Signed summary sequence went backwards")
        if full_resume:
            is_second = number == 1
            require(provenance == "authenticated_invocation" and summary["complete"]
                    and count == len(history) == 105 and reused is is_second and resumed is is_second
                    and summary["invocation"]["prior_attempt_count"] == (105 if is_second else 0),
                    "Full resume proof requires a fresh run followed by reuse of all 105 attempts")
        last_count = count
    require(count == len(history), "Newer authenticated attempts have no completed summary")
    require(not (directory / "ACTIVE.lock").exists(), "Gate became active during verification")
    return summary, history, ordered, reused, resumed, provenance


def collect(directory, root, github, key_file=None, *, full_resume=False):
    revision = git(root, "rev-parse", "HEAD")
    tree = git(root, "rev-parse", "HEAD^{tree}")
    ci = github.get("GITHUB_ACTIONS") == "true" or any(
        github.get(name) for name in ("GITHUB_SHA", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"))
    fields = {
        "candidate_sha":revision, "candidate_tree":tree,
        "mode":"ci" if ci else "local", "scope":None,
        "github_run_id":github.get("GITHUB_RUN_ID") if ci else None,
        "github_run_attempt":github.get("GITHUB_RUN_ATTEMPT") if ci else None,
        "expected_count":105, "attempt_count":0, "used_resume":None,
        "resume_requested":None, "resume_provenance":"unknown",
        "passed":False, "issues":[], "rows":[],
    }
    try:
        if ci:
            require(github.get("GITHUB_SHA") == revision
                    and all(re.fullmatch(r"\d+", github.get(name) or "")
                            for name in ("GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT")),
                    "Missing GitHub run identity or candidate SHA mismatch")
        book = git(root, "show", revision + ":tools/audit/commands-105.json")
        spec = contract(json.loads(book))
        require(spec["expected_count"] == 105 and digest(canonical(spec)) == CANONICAL_CONTRACT,
                "Git candidate differs from the canonical 105-command contract")
        identity = read(directory / "binding.json")
        source = identity.get("source", {})
        require(source.get("head") == revision and source.get("tree") == tree
                and source.get("index_tree") == tree and identity.get("contract") == spec
                and identity.get("scope") == "canonical_105",
                "Candidate source or exact command binding differs")
        keyfile = external_key_path(key_file, root, directory)
        summary, history, summaries, reused, resumed, provenance = verify(
            directory, spec, identity, keyfile, full_resume)

        rows = []
        for row in summary["rows"]:
            diagnostic = {}
            argv = spec["checks"][row["index"]-1]["argv"]
            if row["status"] != "PASS":
                log_text = (directory / row["log"]).read_text(encoding="utf-8", errors="replace")
                diagnostic["failure"] = failure_detail(log_text, argv, row["status"])
            rows.append({**{k:row[k] for k in ("index","status","exit","seconds","log_sha256")},
                         "argv":argv, **diagnostic})
        env = identity.get("environment", {})
        browser = env.get("browser") or {}
        fields.update(scope=summary["scope"], platform=env.get("platform"), python=env.get("python"),
                      node=env.get("node") or browser.get("node_version"), browser={k:browser.get(k) for k in
                          ("version","browser","executable_sha256")},
                      environment_sha256=env.get("environment_sha256"), binding=summary["binding"],
                      attempt_count=len(history), used_resume=reused, resume_requested=resumed,
                      resume_provenance=provenance, rows=rows)
        require(summary["complete"], "Missing completed canonical summary")
        if ci and not full_resume:
            require(len(summaries) == 1 and len(history) == len(rows) == 105
                    and resumed is False and reused is False
                    and all(row["index"] == i for i, (row, _) in enumerate(history, 1)),
                    "CI requires one fresh ordered summary and exactly 105 original attempts")
        fields.update(summary_count=len(summaries), first_summary_sha256=file_hash(summaries[0]),
                      latest_summary_sha256=file_hash(summaries[-1]),
                      attempt_chain_sha256=digest(canonical(history)))
        if full_resume:
            fields.update(reused_attempt_count=len(summary["invocation"]["reused_attempt_ids"]),
                          new_attempt_count=len(history)-summary["invocation"]["prior_attempt_count"])
        fields["passed"] = True
    except ValueError as error:
        # Known validations have fixed messages; never echo JSON parser content or raw logs.
        fields["issues"].append("Malformed private evidence" if isinstance(error, json.JSONDecodeError) else str(error))
    except (KeyError, OSError, TypeError, AttributeError, subprocess.CalledProcessError):
        fields["issues"].append("Missing or malformed private evidence")
    return fields


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_evidence", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2],
                        help="checkout already positioned at the candidate commit")
    parser.add_argument("--key-file", type=Path, required=True, help="private external signing key")
    parser.add_argument("--verify-full-resume", action="store_true",
                        help="require a fresh canonical run followed by reuse of its 105 attempts")
    args = parser.parse_args()
    report = collect(args.private_evidence.resolve(), args.repo.resolve(), os.environ, args.key_file,
                     full_resume=args.verify_full_resume)
    with args.output.open("x", encoding="utf-8") as dest:
        json.dump(report, dest, indent=2)
        dest.write("\n")
    print(f"Portable gate: {len(report['rows'])}/105 recorded, passed={report['passed']}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
