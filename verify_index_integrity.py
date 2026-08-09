from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
OUT_JSON = ROOT / "INDEX_INTEGRITY_AUDIT_v1.json"
text = INDEX.read_text(encoding="utf-8")
ai_formula = re.search(r"const AiNoDstRaw\s*=\s*([^;]+);", text)
ai_formula_text = ai_formula.group(1) if ai_formula else ""

checks = {
    "formula_ai_once": text.count("const AiNoDstRaw = Li + Mi + eiTotalRaw + PiRaw;") == 1,
    "dst_added_once": text.count("const AiFullRaw  = AiNoDstRaw + Di;") == 1,
    "panchanga_scaled_once": "PiRaw = (_tithiPi + _restPi) * PCL_SCALE;" in text,
    "pcl_scale_0_4": "const PCL_SCALE = 0.4;" in text,
    "amavasya_excluded_from_pi": "tIdx !== 29" in text,
    "purnima_excluded_from_pi": "tIdx !== 14" in text,
    "ekadashi_excluded_from_pi": "tIdx !== 10 && tIdx !== 25" in text,
    "bz_vsw_sn_not_in_ai": bool(ai_formula) and not re.search(r"\b(?:bz|vsw|snPen)\w*\b", ai_formula_text, re.I),
    "cache_keys_dst": "_dstKey" in text,
    "cache_keys_sn": "_snKey" in text,
    "cache_keys_profile": "_profileKey" in text,
    "cache_keys_live_bucket": "_liveBucket" in text,
    "lineage_ui_present": 'id="indexLineagePanel"' in text,
    "expert_vs_dashboard_sign_aligned": "Expert Excel 2−Kp; dashboard raw тепер узгоджений з Excel: 2−Kp" in text,
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
        "dashboard_raw": "G_raw = (2 - Kp) + Li + Mi + ei + Pi + Di",
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

print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(0 if status == "PASS" else 1)
