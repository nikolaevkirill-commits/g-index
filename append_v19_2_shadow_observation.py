#!/usr/bin/env python3
"""Append prospective evidence without mutating the v19.2 freeze artifact.

Usage examples:
  python append_v19_2_shadow_observation.py --date 2026-08-07 \
    --kind expert_pdf --value 1 --observed-at 2026-08-08T09:00:00Z \
    --source PDF53 --note "verified after freeze"

  python append_v19_2_shadow_observation.py --date 2026-08-07 \
    --kind real_outcome --value 0 --observed-at 2026-08-08T21:00:00Z \
    --source chrono --note "prospective journal"

The frozen baseline/candidate/rule fields are never rewritten. Observations live
in a separate append-only ledger. Duplicate date+kind records are rejected.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREEZE = ROOT / "V19_2_PROSPECTIVE_SHADOW_FREEZE_v1.json"
LEDGER = ROOT / "V19_2_PROSPECTIVE_SHADOW_OBSERVATIONS_v1.json"
STATUS = ROOT / "V19_2_PROSPECTIVE_SHADOW_STATUS_v1.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_time(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        raise ValueError("observed-at must include timezone")
    return dt.astimezone(timezone.utc)


def load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--kind", required=True, choices=("expert_pdf", "real_outcome"))
    ap.add_argument("--value", required=True, type=int, choices=range(-3, 4))
    ap.add_argument("--observed-at", required=True)
    ap.add_argument("--source", required=True)
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    freeze = load_json(FREEZE, None)
    if not freeze:
        raise RuntimeError("freeze file missing")
    freeze_time = parse_time(freeze["frozen_at_utc"])
    observed = parse_time(args.observed_at)
    if observed <= freeze_time:
        raise ValueError("prospective observation must be observed strictly after freeze time")

    cohort = {r["date"]: r for r in freeze.get("rows", [])}
    if args.date not in cohort:
        raise ValueError(f"date {args.date} is not in frozen 29-row cohort")

    ledger = load_json(LEDGER, {
        "schema": "v19_2_prospective_shadow_observations_v1",
        "freeze_file": FREEZE.name,
        "freeze_sha256": sha256(FREEZE),
        "append_only": True,
        "observations": [],
    })

    if ledger.get("freeze_sha256") != sha256(FREEZE):
        raise RuntimeError("freeze hash changed; refusing to append observations")

    key = (args.date, args.kind)
    for row in ledger.get("observations", []):
        if (row.get("date"), row.get("kind")) == key:
            raise ValueError(f"duplicate observation for {args.date} / {args.kind}")

    frozen = cohort[args.date]
    obs = {
        "date": args.date,
        "kind": args.kind,
        "value": args.value,
        "observed_at_utc": observed.replace(microsecond=0).isoformat(),
        "source": args.source,
        "note": args.note,
        "frozen_production_baseline": frozen["production_baseline"],
        "frozen_v19_2_candidate": frozen["v19_2_candidate"],
        "frozen_rule": frozen["rule"],
        "baseline_exact": frozen["production_baseline"] == args.value,
        "candidate_exact": frozen["v19_2_candidate"] == args.value,
        "baseline_within1": abs(frozen["production_baseline"] - args.value) <= 1,
        "candidate_within1": abs(frozen["v19_2_candidate"] - args.value) <= 1,
        "baseline_sign": 1 if frozen["production_baseline"] > 0 else -1 if frozen["production_baseline"] < 0 else 0,
        "candidate_sign": 1 if frozen["v19_2_candidate"] > 0 else -1 if frozen["v19_2_candidate"] < 0 else 0,
        "observed_sign": 1 if args.value > 0 else -1 if args.value < 0 else 0,
    }
    ledger["observations"].append(obs)
    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    status = load_json(STATUS, {})
    expert_n = sum(r.get("kind") == "expert_pdf" for r in ledger["observations"])
    real_n = sum(r.get("kind") == "real_outcome" for r in ledger["observations"])
    status.update({
        "freeze_sha256": sha256(FREEZE),
        "observations_file": LEDGER.name,
        "expert_labels_observed": expert_n,
        "real_outcomes_observed": real_n,
        "promotion_allowed": False,
        "state": "FROZEN_PROSPECTIVE_SHADOW",
        "last_observation_at_utc": observed.replace(microsecond=0).isoformat(),
    })
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(obs, ensure_ascii=False, indent=2))
    print(f"expert_labels_observed={expert_n}")
    print(f"real_outcomes_observed={real_n}")
    print("promotion_allowed=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
