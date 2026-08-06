from __future__ import annotations

import argparse
from typing import Any

import pandas as pd

try:
    from cdasws.cdasws import CdasWs
    from cdasws.datarepresentation import DataRepresentation
except ImportError:
    CdasWs = None
    DataRepresentation = None

from common import (
    ROOT, load_config, resolve_end_year, save_json, setup_logging,
    utc_now_iso, year_ranges,
)

DATASET = "OMNI2_H0_MRG1HR"
ALIASES = {
    "dst": ["DST1800", "DST", "DST_INDEX"],
    "bz_gsm": ["BZ_GSM1800", "BZ_GSM", "BZ_GSM_OMNI"],
    "flow_speed": ["SW_V1800", "V1800", "FLOW_SPEED", "V", "SW_SPEED"],
    "pressure": ["SW_P_D1800", "P1800", "PRESSURE", "FLOW_PRESSURE"],
    "kp_omni_x10": ["KP1800", "KP", "KP_INDEX"],
    "imf_source_id": ["IMF1800", "IMF", "IMF_ID"],
    "plasma_source_id": ["PLS1800", "PLS", "PLASMA_ID"],
}
REQUIRED = {"dst", "bz_gsm", "flow_speed"}


def _name(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("Name", "name", "Variable", "variable", "Id", "id"):
            if key in value:
                return str(value[key])
    return str(value)


def choose_variables(available: list[Any]) -> dict[str, str]:
    names = [_name(value) for value in available]
    lookup = {name.lower(): name for name in names}
    chosen: dict[str, str] = {}
    for canonical, candidates in ALIASES.items():
        for candidate in candidates:
            if candidate.lower() in lookup:
                chosen[canonical] = lookup[candidate.lower()]
                break
    return chosen


def _status_code(status: Any) -> int | None:
    if isinstance(status, int):
        return status
    if isinstance(status, dict):
        http = status.get("http")
        if isinstance(http, dict) and http.get("status_code") is not None:
            return int(http["status_code"])
        for key in ("status_code", "status", "code"):
            try:
                return int(status[key])
            except (KeyError, TypeError, ValueError):
                pass
    return None


def _array_frame(dataset: Any, provider: str) -> pd.DataFrame:
    arr = dataset[provider]
    dims = list(getattr(arr, "dims", ()))
    time_dims = [
        dim for dim in dims
        if "epoch" in str(dim).lower() or "time" in str(dim).lower()
    ]
    if not time_dims and len(dims) == 1:
        time_dims = dims
    if not time_dims:
        raise ValueError(f"No time dimension for {provider}: {dims}")
    dim = time_dims[0]
    coords = getattr(arr, "coords", {})
    coord = coords[dim] if dim in coords else dataset.coords[dim]
    values = getattr(arr, "values", arr).squeeze()
    if getattr(values, "ndim", 1) != 1:
        raise ValueError(f"{provider} shape is not 1-D: {getattr(values, 'shape', None)}")
    times = pd.to_datetime(getattr(coord, "values", coord), utc=True, errors="coerce")
    if len(times) != len(values):
        raise ValueError(f"{provider} time/value length mismatch")
    return pd.DataFrame({"timestamp_source_utc": times, provider: values}).dropna(
        subset=["timestamp_source_utc"]
    )


def to_dataframe(data: Any, providers: list[str]) -> pd.DataFrame:
    if hasattr(data, "data_vars") and hasattr(data, "coords"):
        frames = [_array_frame(data, provider) for provider in providers if provider in data]
        if not frames:
            raise ValueError(f"Requested OMNI variables absent: {list(data.data_vars)}")
        df = frames[0]
        for frame in frames[1:]:
            df = df.merge(frame, on="timestamp_source_utc", how="outer", validate="one_to_one")
    elif isinstance(data, pd.DataFrame):
        df = data.reset_index()
    elif isinstance(data, dict):
        df = pd.DataFrame(data)
    else:
        df = data.to_dataframe().reset_index()

    if "timestamp_source_utc" not in df.columns:
        epoch = next((c for c in df.columns if "epoch" in c.lower() or c.lower() == "time"), None)
        if epoch is None:
            raise ValueError(f"No epoch column in {list(df.columns)}")
        df.insert(0, "timestamp_source_utc", pd.to_datetime(df.pop(epoch), utc=True, errors="coerce"))
    source = pd.to_datetime(df["timestamp_source_utc"], utc=True, errors="coerce")
    df["timestamp_source_utc"] = source
    df.insert(1, "timestamp_utc", source.dt.floor("h"))
    df["timestamp_semantics"] = "source_midpoint_normalized_to_hour_start"
    return df


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-year", type=int)
    parser.add_argument("--end-year", type=int)
    args = parser.parse_args()

    cfg = load_config()
    start_year = args.start_year or int(cfg["buffer_start"][:4])
    end_year = args.end_year or resolve_end_year(cfg["end"])
    out_dir = ROOT / "data" / "raw" / "omni"
    out_dir.mkdir(parents=True, exist_ok=True)
    log = setup_logging("download_omni_cdaweb")

    if CdasWs is None or DataRepresentation is None:
        raise ModuleNotFoundError("cdasws/xarray support is required")
    cdas = CdasWs(timeout=240)
    available = cdas.get_variable_names(DATASET)
    available_names = [_name(value) for value in available]
    chosen = choose_variables(available)
    missing = sorted(REQUIRED - set(chosen))
    if missing:
        raise RuntimeError(f"Missing primary OMNI variables {missing}; available={available_names}")
    reverse = {provider: canonical for canonical, provider in chosen.items()}

    manifest = {
        "source": "NASA CDAWeb",
        "dataset": DATASET,
        "downloaded_at": utc_now_iso(),
        "available_variables": available_names,
        "selected": chosen,
        "required_primary": sorted(REQUIRED),
        "files": [],
        "failed": [],
    }
    frames: list[pd.DataFrame] = []
    for year, start, stop in year_ranges(start_year, end_year):
        try:
            status, data = cdas.get_data(
                DATASET, list(chosen.values()), start, stop,
                dataRepresentation=DataRepresentation.XARRAY,
            )
            if _status_code(status) != 200:
                raise RuntimeError(f"CDAWeb status={status!r}")
            df = to_dataframe(data, list(chosen.values())).rename(columns=reverse)
            df = df.dropna(subset=["timestamp_utc"]).sort_values("timestamp_utc")
            lo, hi = pd.Timestamp(start).floor("h"), pd.Timestamp(stop).floor("h")
            df = df.loc[df["timestamp_utc"].between(lo, hi)].copy()
            duplicates = int(df["timestamp_utc"].duplicated().sum())
            if duplicates:
                raise ValueError(f"Duplicate normalized OMNI hours: {duplicates}")
            if "kp_omni_x10" in df:
                df["kp_omni"] = pd.to_numeric(df["kp_omni_x10"], errors="coerce") / 10.0
                df["kp_omni_scale"] = "raw_x10_and_normalized"
            df["dst_provenance"] = "WDC_Kyoto_via_NASA_OMNI"
            path = out_dir / f"omni2_h0_mrg1hr_{year}.parquet"
            df.to_parquet(path, index=False)
            frames.append(df)
            manifest["files"].append({
                "year": year,
                "path": str(path.relative_to(ROOT)),
                "rows": len(df),
                "columns": list(df.columns),
                "request_start": start,
                "request_end": stop,
            })
            log.info("OMNI %s rows=%s columns=%s", year, len(df), len(df.columns))
        except Exception as exc:
            log.exception("OMNI failed year=%s: %s", year, exc)
            manifest["failed"].append({"year": year, "error": repr(exc)})

    if frames:
        full = pd.concat(frames, ignore_index=True).sort_values("timestamp_utc")
        duplicates = int(full["timestamp_utc"].duplicated().sum())
        if duplicates:
            raise ValueError(f"Combined OMNI duplicate hours: {duplicates}")
        full.to_parquet(out_dir / "omni_hro_1h_2013_present.parquet", index=False)
        manifest.update({
            "total_rows": len(full),
            "coverage_start": str(full["timestamp_utc"].min()),
            "coverage_end": str(full["timestamp_utc"].max()),
            "combined_columns": list(full.columns),
        })
    save_json(ROOT / "metadata" / "omni_manifest.json", manifest)
    if manifest["failed"] or not frames:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
