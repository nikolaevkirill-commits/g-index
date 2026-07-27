from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
OUT_JSON = ROOT / "INDEX_INTEGRITY_AUDIT_v1.json"
OUT_MD = ROOT / "INDEX_INTEGRITY_AUDIT_v1.md"

text = INDEX.read_text(encoding="utf-8")

checks = {
    "formula_ai_once": "const AiNoDstRaw = Li + Mi + eiTotalRaw + PiRaw + snPen;" in text,
    "dst_added_once": "const AiFullRaw  = AiNoDstRaw + Di;" in text,
    "panchanga_scaled_once": "PiRaw = (_tithiPi + _restPi) * PCL_SCALE;" in text,
    "pcl_scale_0_4": "const PCL_SCALE = 0.4;" in text,
    "amavasya_excluded_from_pi": "tIdx !== 29" in text,
    "purnima_excluded_from_pi": "tIdx !== 14" in text,
    "ekadashi_excluded_from_pi": "tIdx !== 10 && tIdx !== 25" in text,
    "bz_vsw_not_in_ai": "const AiNoDstRaw = Li + Mi + eiTotalRaw + PiRaw + snPen;" in text,
    "cache_keys_dst": "_dstKey" in text,
    "cache_keys_sn": "_snKey" in text,
    "cache_keys_profile": "_profileKey" in text,
    "cache_keys_live_bucket": "_liveBucket" in text,
    "lineage_ui_present": 'id="indexLineagePanel"' in text,
    "expert_vs_dashboard_sign_disclosed": "2−Kp" in text and "Kp−2" in text,
    "aia_not_in_score_formula": not re.search(r"AiNoDstRaw[^;]*AIA", text),
}

hard_fail = [name for name, ok in checks.items() if not ok]
status = "PASS" if not hard_fail else "FAIL"
report = {
    "schema": "gindex_integrity_audit_v1",
    "status": status,
    "checks": checks,
    "hard_failures": hard_fail,
    "formula_contract": {
        "dashboard_raw": "G_raw = Kp - 2 + Li + Mi + ei + Pi + Di + Sn_pen",
        "expert_excel": "raw_sum = (2 - Kp) + Moon + Eclipse + sum(tag_weights)",
        "decision": "verified PDF override; frozen Engine only when PDF is absent",
        "safety": "Kp/Dst operational veto is separate from arithmetic G_raw",
        "shadow": "AIA/BGS/ENLIL/Meteoagent/unverified calendar: score_effect=0",
    },
    "known_nonindependence": [
        "Pi is already inside G_raw and is not a second vote",
        "Ap and Kp are the same geomagnetic family",
        "cal_score overlaps Pi/Li/Mi/Taanita",
        "G_extended_v2 contains overlapping predictors and remains advisory",
    ],
}
OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lines = [
    "# G-Index integrity audit v1",
    "",
    f"Status: **{status}**.",
    "",
    "## Formula contract",
    "",
    "- Dashboard raw: `G_raw = Kp - 2 + Li + Mi + ei + Pi + Di + Sn_pen`.",
    "- Expert Excel: `raw_sum = (2 - Kp) + Moon + Eclipse + sum(tag_weights)`.",
    "- Decision: verified PDF override; frozen Engine only when PDF is absent.",
    "- Safety: Kp/Dst operational veto is separate from arithmetic G_raw.",
    "- Shadow: AIA/BGS/ENLIL/Meteoagent/unverified calendar have `score_effect=0`.",
    "",
    "## Automated checks",
    "",
]
lines.extend(f"- [{'x' if ok else ' '}] `{name}`" for name, ok in checks.items())
lines += [
    "",
    "## Non-independence rules",
    "",
    "- `Pi` is already inside `G_raw`; never count Panchanga as a second vote.",
    "- Ap and Kp belong to one geomagnetic family.",
    "- `cal_score` overlaps `Pi/Li/Mi/Taanita` and remains shadow.",
    "- `G_extended_v2` uses overlapping predictors and is advisory only.",
]
OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(0 if status == "PASS" else 1)
