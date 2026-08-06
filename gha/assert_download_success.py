"""Hard download-success gate for PROGNOZ v1.5.

This guard understands the actual manifest schemas of the canonical v1.4a
downloaders. It prevents false success before master construction.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "metadata"


def read_json(name: str) -> dict[str, Any] | None:
    path = META / name
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def file_exists(rel: str | None) -> bool:
    return bool(rel) and (ROOT / rel).is_file()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-partial", action="store_true")
    args = ap.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    sources: dict[str, Any] = {}

    cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    expected_gfz = set(cfg["space_indices"]["gfz_indices"])
    gfz = read_json("gfz_manifest.json")
    if not gfz:
        errors.append("GFZ manifest missing/unreadable")
        sources["gfz"] = {"ok": False}
    else:
        normalized = {
            str(x.get("index")): x for x in (gfz.get("normalized") or [])
            if isinstance(x, dict)
        }
        missing = sorted(expected_gfz - set(normalized))
        empty = sorted(
            k for k, v in normalized.items()
            if int(v.get("rows") or 0) <= 0 or not file_exists(v.get("path"))
        )
        failed = gfz.get("failed") or []
        if missing:
            errors.append(f"GFZ missing normalized indices: {missing}")
        if empty:
            errors.append(f"GFZ empty/missing normalized files: {empty}")
        if failed:
            msg = f"GFZ failed chunks: {len(failed)}"
            (warnings if args.allow_partial else errors).append(msg)
        sources["gfz"] = {
            "ok": not missing and not empty and (args.allow_partial or not failed),
            "normalized_indices": sorted(normalized),
            "failed_chunks": len(failed),
        }

    omni = read_json("omni_manifest.json")
    if not omni:
        errors.append("OMNI manifest missing/unreadable")
        sources["omni"] = {"ok": False}
    else:
        files = omni.get("files") or []
        valid = [
            f for f in files
            if int(f.get("rows") or 0) > 0 and file_exists(f.get("path"))
        ]
        failed = omni.get("failed") or []
        if not valid or int(omni.get("total_rows") or 0) <= 0:
            errors.append("OMNI has no non-empty normalized data")
        if failed:
            msg = f"OMNI failed years: {len(failed)}"
            (warnings if args.allow_partial else errors).append(msg)
        sources["omni"] = {
            "ok": bool(valid) and int(omni.get("total_rows") or 0) > 0
                  and (args.allow_partial or not failed),
            "files": len(valid),
            "rows": int(omni.get("total_rows") or 0),
            "failed_years": len(failed),
        }

    silso = read_json("silso_manifest.json")
    if not silso:
        errors.append("SILSO manifest missing/unreadable")
        sources["silso"] = {"ok": False}
    else:
        files = {
            str(f.get("name")): f for f in (silso.get("files") or [])
            if isinstance(f, dict)
        }
        required = {"daily_total", "daily_hemispheric"}
        bad = sorted(
            n for n in required
            if n not in files
            or int(files[n].get("rows") or 0) <= 0
            or not file_exists(files[n].get("normalized"))
        )
        if bad:
            errors.append(f"SILSO missing/empty products: {bad}")
        sources["silso"] = {"ok": not bad, "products": sorted(files)}

    f107 = read_json("f107_manifest.json")
    if not f107:
        errors.append("F10.7 manifest missing/unreadable")
        sources["f107"] = {"ok": False}
    else:
        raw_ok = file_exists(f107.get("raw"))
        rows = int(f107.get("rows") or 0)
        daily_rows = int(f107.get("daily_rows") or 0)
        daily_path = ROOT / "data" / "raw" / "f107_canada" / "f107_daily.parquet"
        ok = raw_ok and rows > 0 and daily_rows > 0 and daily_path.is_file()
        if not ok:
            errors.append(
                "F10.7 missing/empty raw or normalized daily data "
                f"(raw={raw_ok}, rows={rows}, daily_rows={daily_rows})"
            )
        sources["f107"] = {
            "ok": ok, "rows": rows, "daily_rows": daily_rows
        }

    kyoto = read_json("kyoto_dst_manifest.json")
    if not kyoto or not (kyoto.get("pages") or []):
        warnings.append("Kyoto Dst unavailable/empty (optional reference)")
    sources["kyoto_dst"] = {
        "ok": bool(kyoto and (kyoto.get("pages") or [])),
        "optional": True,
    }

    goes = read_json("goes_noaa_manifest.json")
    if not goes or not (goes.get("files") or []):
        warnings.append("GOES unavailable/empty (optional)")
    sources["goes"] = {
        "ok": bool(goes and (goes.get("files") or [])),
        "optional": True,
    }

    result = {
        "verdict": "FAIL" if errors else "PASS",
        "errors": errors,
        "warnings": warnings,
        "sources": sources,
    }
    (META / "download_success_gate.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
