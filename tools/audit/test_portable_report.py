"""Portable report tests. Synthetic records contain no application values."""
from types import SimpleNamespace
from unittest.mock import patch
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
import run_gate as protocol
from portable_report import collect, git
from run_gate import canonical, contract, digest, mac


class PortableReportTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fp575-n3-")
        self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name) / "evidence"
        self.out.mkdir()
        self.root = Path(__file__).resolve().parents[2]
        self.head = git(self.root, "rev-parse", "HEAD")
        self.tree = git(self.root, "rev-parse", "HEAD^{tree}")
        self.spec = contract(json.loads(git(self.root, "show", self.head + ":tools/audit/commands-105.json")))
        self.key_file = Path(self.temp.name) / "run.key"
        self.key = protocol.create_private_key(self.key_file)
        self.identity = {"source":{"head":self.head, "tree":self.tree, "index_tree":self.tree},
                         "contract":self.spec, "scope":"canonical_105", "environment":{}}
        self.binding = digest(canonical(self.identity))
        (self.out / "binding.json").write_text(json.dumps(self.identity))
        self.history = []
        self.last = None

    def signed(self, name, row):
        seal = mac(self.key, row)
        (self.out / (name + ".json")).write_text(json.dumps({**row, "mac":seal}))
        return seal

    def attempt(self, i, invocation, *, passed=True):
        sequence = len(self.history) + 1
        aid = f"attempt-{sequence:08}-fixture"
        logname = aid + ".log"
        content = b"PRIVATE-SYNTHETIC-CANARY"
        (self.out / logname).write_bytes(content)
        row = {**self.spec["checks"][i-1], "binding":self.binding, "sequence":sequence,
               "attempt_id":aid, "previous_mac":self.last, "invocation_id":invocation,
               "log":logname, "log_sha256":digest(content), "screenshots":None,
               "generated_sha256":"synthetic-generated-state",
               "seconds":0.5, "status":"PASS" if passed else "FAIL", "exit":0 if passed else 9}
        self.last = self.signed(aid, row)
        self.history.append(row)
        return row

    def summary(self, index, rows, invocation, prior=0, reused=(), resumed=False):
        sid = f"summary-{index}"
        complete = len(rows) == 105 and all(row["status"] == "PASS" for row in rows)
        summary = {"binding":self.binding, "scope":"canonical_105", "expected_count":105,
                   "observed_count":len(rows), "complete":complete, "suite_passed":complete,
                   "attempt_head_mac":self.last, "rows":rows}
        if invocation is not None:
            summary["invocation"] = {"id":invocation, "summary_id":sid, "requested_resume":resumed,
                                     "prior_attempt_count":prior, "reused_attempt_ids":list(reused)}
        self.signed(sid, summary)
        return summary

    def fresh(self, legacy=False):
        invocation = "a"*32
        rows = [self.attempt(i, None if legacy else invocation) for i in range(1,106)]
        self.summary(9, rows, None if legacy else invocation)
        return rows

    def local(self):
        return collect(self.out, self.root, {}, self.key_file)

    def ci(self, *, full_resume=False, **overrides):
        env = {"GITHUB_ACTIONS":"true", "GITHUB_SHA":self.head,
               "GITHUB_RUN_ID":"123", "GITHUB_RUN_ATTEMPT":"1"}
        return collect(self.out, self.root, {**env, **overrides}, self.key_file, full_resume=full_resume)

    def test_fresh_local_and_strict_ci(self):
        self.fresh()
        report = self.local()
        self.assertTrue(report["passed"], report["issues"])
        self.assertFalse(report["used_resume"])
        self.assertFalse(report["resume_requested"])
        self.assertIsNone(report["github_run_id"])
        self.assertTrue(self.ci()["passed"])
        self.assertFalse(self.ci(GITHUB_SHA="different")["passed"])
        self.assertFalse(self.ci(GITHUB_RUN_ID="")["passed"])
        encoded = json.dumps(report)
        self.assertNotIn(self.key.hex(), encoded)
        self.assertNotIn("PRIVATE-SYNTHETIC-CANARY", encoded)
        self.assertNotIn("attempt_head_mac", encoded)

    def test_resume_after_complete_without_new_attempt(self):
        rows = self.fresh()
        clean = self.ci()
        self.assertFalse(self.ci(full_resume=True)["passed"])
        self.summary(10, rows, "b"*32, 105, [r["attempt_id"] for r in rows], True)
        report = self.local()
        self.assertTrue(report["passed"], report["issues"])
        self.assertTrue(report["used_resume"])
        self.assertTrue(report["resume_requested"])
        self.assertEqual(report["attempt_count"], 105)
        self.assertFalse(self.ci()["passed"])
        proof = self.ci(full_resume=True)
        self.assertTrue(proof["passed"], proof["issues"])
        self.assertEqual((proof["summary_count"], proof["reused_attempt_count"], proof["new_attempt_count"]), (2,105,0))
        for name in ("rows", "binding", "attempt_chain_sha256", "first_summary_sha256"):
            self.assertEqual(clean[name], proof[name])
        self.assertNotEqual(proof["first_summary_sha256"], proof["latest_summary_sha256"])
        self.summary(11, rows, "c"*32, 105, [r["attempt_id"] for r in rows], True)
        second = self.ci(full_resume=True)
        self.assertTrue(second["passed"], second["issues"])
        self.assertEqual(second["summary_sha256"][:-1], proof["summary_sha256"])
        self.assertEqual(second["summary_count"], 3)
        self.assertEqual(second["new_attempt_count"], 0)
        self.assertEqual(second["reused_attempt_count"], 105)
        self.assertFalse(self.ci()["passed"])
        self.summary(12, rows, "c"*32, 105, [r["attempt_id"] for r in rows], True)
        self.assertIn("Repeated signed invocation identifier", self.ci(full_resume=True)["issues"])

    def test_runner_records_resume_after_all_105_without_running_commands(self):
        manifest = {"schema":protocol.SCHEMA, "source":self.identity["source"],
                    "scope":"canonical_105", **self.spec}
        bound = self.out / "fixture-bound.json"
        bound.write_text(json.dumps(manifest))
        self.identity.update(
            checkout=str(self.root), evidence_dir=str(self.out),
            runner_sha256=protocol.file_hash(Path(protocol.__file__)),
            process_helper_sha256=protocol.file_hash(Path(protocol.gate_process.__file__)),
            manifest_sha256=protocol.file_hash(bound),
        )
        self.binding = digest(canonical(self.identity))
        (self.out / "binding.json").write_text(json.dumps(self.identity))
        rows = self.fresh()
        protocol.write_resume_environment(self.out / 'binding-env.json', self.key, self.identity, {})
        args = SimpleNamespace(seal=False, resume=True, manifest=bound, key_file=self.key_file)
        with (patch.object(protocol, "snapshot", return_value=manifest["source"]),
              patch.object(protocol, "environment", return_value={}),
              patch.object(protocol, "execution_env", return_value={}),
              patch.object(protocol, "generated_fingerprint",
                           return_value="synthetic-generated-state"),
              patch.object(protocol, "execute", side_effect=AssertionError("Unexpected re-execution"))):
            self.assertEqual(protocol.run_gate(args, self.root, self.out, manifest), 0)
        report = self.local()
        self.assertTrue(report["passed"], report["issues"])
        self.assertTrue(report["used_resume"])
        self.assertEqual(report["attempt_count"], len(rows))
        self.assertFalse(self.ci()["passed"])

    def test_retry_with_and_without_reuse(self):
        failure = self.attempt(1, "a"*32, passed=False)
        self.summary(1, [failure], "a"*32)
        retried = [self.attempt(i, "b"*32) for i in range(1,106)]
        self.summary(2, retried, "b"*32, 1, [], True)
        self.assertTrue(self.local()["passed"])
        self.assertTrue(self.local()["resume_requested"])
        self.assertFalse(self.local()["used_resume"])
        self.assertFalse(self.ci()["passed"])

    def test_resumed_partial_attempts(self):
        first = self.attempt(1, "a"*32)
        rows = [first] + [self.attempt(i, "b"*32) for i in range(2,106)]
        self.summary(1, rows, "b"*32, 1, [first["attempt_id"]], True)
        self.assertTrue(self.local()["passed"])
        self.assertTrue(self.local()["used_resume"])
        self.assertFalse(self.ci()["passed"])

    def test_legacy_is_unknown(self):
        self.fresh(legacy=True)
        report = self.local()
        self.assertTrue(report["passed"])
        self.assertIsNone(report["used_resume"])
        self.assertEqual(report["resume_provenance"], "legacy_unknown")
        self.assertFalse(self.ci()["passed"])

    def test_modified_summary_and_attempt_refused(self):
        rows = self.fresh()
        path = self.out / "summary-9.json"
        original = path.read_bytes()
        damaged = json.loads(original)
        damaged["complete"] = False
        path.write_text(json.dumps(damaged))
        self.assertIn("Summary HMAC mismatch", self.local()["issues"])
        path.write_bytes(original)
        a = self.out / (rows[0]["attempt_id"] + ".json")
        damaged = json.loads(a.read_text())
        damaged["seconds"] = 4
        a.write_text(json.dumps(damaged))
        self.assertIn("prior attempt authentication failed", self.local()["issues"])

    def test_signed_but_inconsistent_summary_refused(self):
        rows = self.fresh()
        false_reuse = self.summary(10, rows, "b"*32, 105, [], True)
        self.assertIn("Invocation reuse or execution record disagrees with the attempts",
                      self.local()["issues"])
        false_reuse["invocation"]["summary_id"] = "summary-10"
        self.signed("summary-11", false_reuse)
        (self.out / "summary-10.json").unlink()
        self.assertIn("Invalid signed invocation", self.local()["issues"])

    def test_unfinished_chain_or_missing_key_refused(self):
        self.fresh()
        self.attempt(1, "b"*32)
        self.assertIn("Newer authenticated attempts have no completed summary", self.local()["issues"])
        self.key_file.unlink()
        self.assertIn("missing or invalid external resume key", self.local()["issues"])

    def test_modified_log_and_chain_gaps_refused(self):
        rows = self.fresh()
        log = self.out / rows[0]["log"]
        original = log.read_bytes()
        log.write_bytes(b"modified")
        self.assertIn("prior log changed/missing", self.local()["issues"])
        log.write_bytes(original)
        (self.out / (rows[3]["attempt_id"] + ".json")).unlink()
        self.assertIn("prior attempt chain is incomplete or out of order", self.local()["issues"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
