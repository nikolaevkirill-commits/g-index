"""Replay the production short-range coverage guard against the October historical fixture."""
import copy
from datetime import datetime
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "cloud"))
from kp_source_guard import suppress_downgrades


def main():
    previous = json.loads((ROOT / "tools/public/fixtures/fresh_20261019.json").read_text(encoding="utf-8"))
    date = "2026-10-19"
    candidate = copy.deepcopy(previous)
    formula = candidate["days"][date]["channels"]["source_formula"]
    if formula["kp_input"]["source"] != "NOAA_3day_slots":
        raise ValueError("Expected a historical short-range source")
    # Substitute a long-range upstream input; the product must suppress the downgrade.
    formula["kp_input"]["source"] = formula["kp_source"] = "NOAA_27day_outlook"
    projected = suppress_downgrades(previous, candidate, datetime.fromisoformat(previous["generated_at"]))
    if projected["availability_projection"]["withheld_dates"] != [date]:
        raise ValueError("The production guard did not withhold the selected historical day")
    print(json.dumps(projected, ensure_ascii=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
