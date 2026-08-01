#!/usr/bin/env python3
"""Fail closed when agreement targets are confused with independent outcomes."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs" / "data_control"
OUT.mkdir(parents=True, exist_ok=True)


def load(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return default


ledger = load(ROOT / "OUTCOME_LEDGER_STATUS_v1.json", {}) or {}
auto = load(ROOT / "outputs" / "AUTO_PROSPECTIVE_STATUS_v1.json", {}) or load(ROOT / "AUTO_PROSPECTIVE_STATUS_v1.json", {}) or {}
master = load(ROOT / "daily_master.json", {}) or {}
routing = load(ROOT / "SOURCE_ROUTING_AUDIT_v1.json", {}) or {}
tanita = load(ROOT / "TANITA_REVIEW_PRIORITY_STATUS_v1.json", {}) or {}
html = (ROOT / "index.html").read_text(encoding="utf-8-sig")
daily_chain = (ROOT / "daily_chain.bat").read_text(encoding="utf-8-sig")
importer = (ROOT / "import_validated_outcome_queue.py").read_text(encoding="utf-8-sig")
legacy_backfill = (ROOT / "auto_backfill_outcomes.py").read_text(encoding="utf-8-sig")
import_status = load(OUT / "OUTCOME_INTAKE_IMPORT_STATUS_v1.json", {}) or {}

real = ledger.get("real_outcomes", {}) or {}
gate = auto.get("promotion_gate", {}) or {}
paired = int(real.get(
    "paired_with_prior_frozen_prediction",
    real.get("paired_with_frozen_prediction", 0),
) or 0)
required = int(real.get("required_for_promotion_gate", 100) or 100)
master_meta = master.get("meta", {}) or {}
master_contract_ok = (
    master_meta.get("target_contract") == "independent_real_outcome"
    and int(master_meta.get("independent_real_outcome_pairs", 0) or 0) > 0
)
checks = {
    "promotion_count_uses_independent_real_outcomes": int(gate.get("current_selected_outcomes", -1)) == paired,
    "promotion_gate_reports_independent_real_outcomes": int(gate.get("independent_real_outcomes", -1)) == paired,
    "expert_pdf_comparisons_are_labeled_separately": (
        int(gate.get("expert_pdf_comparisons", -1)) == int(auto.get("selected_high_scored", -2))
    ),
    "promotion_cannot_pass_without_real_outcomes": not bool(gate.get("passed")) or (
        paired >= required and bool(real.get("promotion_gate_passed"))
    ),
    "dashboard_does_not_call_pdf_matches_outcomes": (
        "const n = Number(s.selected_high_scored || 0)" not in html
        and "HIGH outcomes" not in html
    ),
    "dashboard_has_target_contract_guard": (
        "meta.target_contract === 'independent_real_outcome'" in html
        and "[target-contract] daily_master disabled" in html
    ),
    "stale_daily_master_is_blocked": master_contract_ok or "_dailyMaster = {};" in html,
    "source_routing_passes": bool(routing.get("overall_ok", False)),
    "tanita_unverified_score_effect_is_zero": int(tanita.get("production_score_effect", 0) or 0) == 0,
    "guarded_outcome_import_is_in_daily_chain": "import_validated_outcome_queue.py" in daily_chain,
    "outcome_import_requires_prior_frozen_prediction": "no_frozen_telemetry_row_for_date" in importer,
    "outcome_import_forbids_expert_training_sources": "expert_or_training_source_reference_forbidden" in importer,
    "outcome_import_cannot_overwrite_actuals": "outcome_already_present" in importer,
    "legacy_expert_pdf_outcome_backfill_is_retired": "RETIRED_TARGET_LEAKAGE" in legacy_backfill,
    "outcome_import_status_is_observational_only": (
        import_status.get("automatic_import") is True
        and import_status.get("production_forecast_change") is False
        and import_status.get("score_effect") == "real_outcome_metrics_only"
    ),
}
hard_failures = [name for name, ok in checks.items() if not ok]
warnings = []
if not master_contract_ok:
    warnings.append("legacy daily_master has no independent-real-outcome contract and is disabled in production UI")
if paired < required:
    warnings.append(f"promotion waiting for independent outcomes: {paired}/{required}")
if paired == 0:
    warnings.append("no honest predictive-accuracy coefficient can be calculated from independent outcomes yet")
for warning in routing.get("warnings", []) or []:
    warnings.append(f"source routing: {warning}")

report = {
    "schema": "target_semantics_audit_v2",
    "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    "overall_ok": not hard_failures,
    "target_contract": {
        "expert_pdf_label": "agreement/reproduction only",
        "independent_real_outcome": "promotion and predictive-accuracy target",
        "paired_independent_real_outcomes": paired,
        "required_for_promotion": required,
    },
    "checks": checks,
    "hard_failures": hard_failures,
    "warnings": warnings,
    "legacy_daily_master": {
        "generated": master_meta.get("generated"),
        "claimed_schema": master_meta.get("schema"),
        "contract_ok": master_contract_ok,
        "production_use": "allowed" if master_contract_ok else "blocked",
    },
}
text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
for path in (ROOT / "TARGET_SEMANTICS_AUDIT_v2.json", OUT / "TARGET_SEMANTICS_AUDIT_v2.json"):
    path.write_text(text, encoding="utf-8")
md = [
    "# Target semantics audit v2",
    "",
    f"- Overall: **{'PASS' if report['overall_ok'] else 'FAIL'}**",
    f"- Independent real outcomes: **{paired}/{required}**",
    "- Expert PDF labels: reproduction/agreement only.",
    f"- Legacy daily_master production use: **{report['legacy_daily_master']['production_use']}**",
    "",
    "## Warnings",
    "",
] + [f"- {item}" for item in warnings]
(OUT / "TARGET_SEMANTICS_AUDIT_v2.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(json.dumps({
    "overall_ok": report["overall_ok"],
    "paired_independent_real_outcomes": paired,
    "hard_failures": hard_failures,
    "warnings": warnings,
}, ensure_ascii=False))
sys.exit(0 if report["overall_ok"] else 1)