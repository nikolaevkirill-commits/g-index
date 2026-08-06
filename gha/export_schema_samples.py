from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "metadata" / "schema_samples"
OUT.mkdir(parents=True, exist_ok=True)


def safe(v: Any) -> Any:
    if pd.isna(v):
        return None
    if hasattr(v, "isoformat"):
        try:
            return v.isoformat()
        except Exception:
            pass
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    return str(v)


def inspect(path: Path) -> dict[str, Any]:
    rel = path.relative_to(ROOT).as_posix()
    if path.suffix.lower() == ".parquet":
        df = pd.read_parquet(path)
    elif path.suffix.lower() == ".csv":
        df = pd.read_csv(path, nrows=1000)
    else:
        return {"path": rel, "skipped": "unsupported"}

    ts_col = next(
        (c for c in ("timestamp_utc", "date_utc", "date", "local_date")
         if c in df.columns),
        None,
    )
    duplicates = int(df.duplicated().sum())
    result = {
        "path": rel,
        "rows": int(len(df)),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "duplicates_all_columns": duplicates,
        "null_fraction": {
            c: float(df[c].isna().mean()) for c in df.columns
        },
        "head3": [
            {k: safe(v) for k, v in row.items()}
            for row in df.head(3).to_dict(orient="records")
        ],
    }
    if ts_col:
        ts = pd.to_datetime(df[ts_col], errors="coerce", utc=True)
        result["timestamp_column"] = ts_col
        result["timestamp_min"] = safe(ts.min())
        result["timestamp_max"] = safe(ts.max())
        result["duplicate_timestamps"] = int(ts.duplicated().sum())
    return result


def main() -> None:
    records = []
    for folder in (ROOT / "data" / "raw", ROOT / "data" / "processed"):
        if not folder.exists():
            continue
        for path in sorted(folder.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in {".parquet", ".csv"}:
                continue
            try:
                records.append(inspect(path))
            except Exception as exc:
                records.append({
                    "path": path.relative_to(ROOT).as_posix(),
                    "error": f"{type(exc).__name__}: {exc}",
                })
    (OUT / "all_schema_samples.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Schema samples: {len(records)}")


if __name__ == "__main__":
    main()
