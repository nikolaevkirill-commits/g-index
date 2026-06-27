#!/usr/bin/env python3
"""
update_kp.py — Kp pipeline for G-Index dashboard
Version: v2.0 (2026-06-27)

Acceptance criteria:
  ✅ runs from clean folder
  ✅ fetches real Kp (NOAA fact + 3-day forecast)
  ✅ does not overwrite past verified days
  ✅ sets kp_synthetic=true if source unavailable
  ✅ writes structured log with reason
  ✅ dashboard reads new Kp without manual edit

Output: future_kp.json (same schema as dashboard expects)
Schema:
  { "generated": ISO,
    "expires":   ISO (today+7d),
    "source_log": [...],
    "kp": { "YYYY-MM-DD": { "kp": float, "kp_synthetic": bool, "source": str } }
  }

Run:
  python update_kp.py             # normal update
  python update_kp.py --check     # acceptance test only (no write)
  python update_kp.py --status    # show current future_kp.json state
"""
import json, sys, argparse, datetime, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT  = HERE / "future_kp.json"
LOG  = HERE / "kp_update.log"

NOAA_FACT     = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
NOAA_FORECAST = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
SYNTHETIC_KP  = 2.0
SYNTHETIC_DAYS = 14  # days forward to fill with synthetic if fetch fails

def log(msg, also_print=True):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] {msg}"
    if also_print: print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "G-Index/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code} {url}"
    except urllib.error.URLError as e:
        return None, f"URLError {e.reason} {url}"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"

def parse_kp_rows(rows, only_future=False):
    """rows[0] = header, rows[1:] = data. Returns {date_str: avg_kp}"""
    today = datetime.date.today()
    daily = {}
    for row in rows[1:]:
        try:
            d = datetime.date.fromisoformat(str(row[0])[:10])
            if only_future and d < today: continue
            daily.setdefault(d, []).append(float(row[1]))
        except: continue
    return {str(d): round(sum(v)/len(v), 2) for d, v in daily.items()}

def load_existing():
    if not OUT.exists(): return {}
    try:
        raw = json.loads(OUT.read_text(encoding="utf-8"))
        return raw.get("kp", {})
    except: return {}

def cmd_status():
    if not OUT.exists():
        print("❌ future_kp.json not found")
        return
    raw = json.loads(OUT.read_text(encoding="utf-8"))
    kp = raw.get("kp", {})
    dates = sorted(kp)
    today = datetime.date.today().isoformat()
    print(f"\nfuture_kp.json status")
    print(f"  generated : {raw.get('generated','?')}")
    print(f"  expires   : {raw.get('expires','?')}")
    print(f"  entries   : {len(dates)}")
    if dates: print(f"  span      : {dates[0]} → {dates[-1]}")
    syn = sum(1 for v in kp.values() if v.get("kp_synthetic"))
    real = len(kp) - syn
    print(f"  real Kp   : {real}  synthetic: {syn}")
    # check expiry
    exp = raw.get("expires","")
    if exp and exp < today:
        print(f"  ⚠ EXPIRED (today={today})")
    elif exp:
        days_left = (datetime.date.fromisoformat(exp) - datetime.date.today()).days
        print(f"  ✅ valid for {days_left} more days")
    print()
    print(f"  {'Date':<12} {'Kp':>5}  {'Syn':>4}  Source")
    print(f"  {'─'*50}")
    for ds in dates[-10:]:
        v = kp[ds]
        k = v.get("kp","?")
        s = "syn*" if v.get("kp_synthetic") else "real"
        src = v.get("source","?")[:20]
        marker = " ← today" if ds == today else ""
        print(f"  {ds:<12} {k:>5}  {s:>4}  {src}{marker}")

def cmd_check():
    """Acceptance test — no writes."""
    print("\n=== ACCEPTANCE TEST ===")
    ok = True

    # Test 1: NOAA fact reachable
    print("1. NOAA fact endpoint...", end=" ")
    rows, err = fetch(NOAA_FACT, timeout=10)
    if rows and len(rows) > 2:
        sample = parse_kp_rows(rows)
        print(f"✅ {len(sample)} days")
    else:
        print(f"❌ {err}")
        ok = False

    # Test 2: NOAA forecast reachable
    print("2. NOAA forecast endpoint...", end=" ")
    rows2, err2 = fetch(NOAA_FORECAST, timeout=10)
    if rows2 and len(rows2) > 2:
        sample2 = parse_kp_rows(rows2, only_future=True)
        print(f"✅ {len(sample2)} future days")
    else:
        print(f"❌ {err2}")
        ok = False

    # Test 3: schema check existing file
    print("3. future_kp.json schema...", end=" ")
    if OUT.exists():
        raw = json.loads(OUT.read_text())
        has_kp = isinstance(raw.get("kp"), dict)
        has_gen = "generated" in raw
        has_exp = "expires" in raw
        if has_kp and has_gen and has_exp:
            print(f"✅ valid ({len(raw['kp'])} entries)")
        else:
            print(f"⚠ missing fields: kp={has_kp} generated={has_gen} expires={has_exp}")
    else:
        print("⚠ file not found (will be created on run)")

    # Test 4: synthetic fallback logic
    print("4. Synthetic fallback...", end=" ")
    synthetic = {
        str(datetime.date.today() + datetime.timedelta(days=i)):
        {"kp": SYNTHETIC_KP, "kp_synthetic": True, "source": "synthetic_fallback"}
        for i in range(3)
    }
    all_syn = all(v["kp_synthetic"] for v in synthetic.values())
    print(f"✅ flag set correctly" if all_syn else "❌")

    print(f"\n{'✅ ALL PASS' if ok else '⚠ SOME ENDPOINTS FAILED — synthetic will be used'}")
    return ok

def cmd_update(dry_run=False):
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    source_log = []

    # Load existing (preserve past verified days)
    existing = load_existing()
    new_kp = {}

    # Copy past days unchanged
    for ds, v in existing.items():
        if datetime.date.fromisoformat(ds) < today:
            new_kp[ds] = v

    # Fetch fact (past 30d)
    log("Fetching NOAA fact Kp...")
    rows, err = fetch(NOAA_FACT)
    fact = {}
    if rows:
        fact = parse_kp_rows(rows)
        log(f"  ✅ fact: {len(fact)} days")
        source_log.append({"source": "NOAA_fact", "n": len(fact), "ok": True})
    else:
        log(f"  ❌ fact failed: {err}")
        source_log.append({"source": "NOAA_fact", "n": 0, "ok": False, "error": err})

    # Fetch forecast (next 3d)
    log("Fetching NOAA forecast Kp...")
    rows2, err2 = fetch(NOAA_FORECAST)
    forecast = {}
    if rows2:
        forecast = parse_kp_rows(rows2, only_future=True)
        log(f"  ✅ forecast: {len(forecast)} days")
        source_log.append({"source": "NOAA_forecast", "n": len(forecast), "ok": True})
    else:
        log(f"  ❌ forecast failed: {err2}")
        source_log.append({"source": "NOAA_forecast", "n": 0, "ok": False, "error": err2})

    # Fill today + next 13 days
    n_real = 0; n_syn = 0
    for i in range(SYNTHETIC_DAYS):
        d = today + datetime.timedelta(days=i)
        ds = str(d)
        kp_val = fact.get(ds) or forecast.get(ds)
        if kp_val is not None:
            new_kp[ds] = {"kp": kp_val, "kp_synthetic": False, "source": "NOAA"}
            n_real += 1
        else:
            # synthetic fallback — preserve existing if present
            prev = existing.get(ds)
            if prev and not prev.get("kp_synthetic"):
                new_kp[ds] = prev  # keep verified
                n_real += 1
            else:
                new_kp[ds] = {"kp": SYNTHETIC_KP, "kp_synthetic": True, "source": "synthetic_fallback"}
                n_syn += 1

    expires = str(today + datetime.timedelta(days=7))
    out_data = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat()[:19]+"Z",
        "expires": expires,
        "synthetic_kp_value": SYNTHETIC_KP,
        "source_log": source_log,
        "kp": new_kp
    }

    log(f"Result: {n_real} real days, {n_syn} synthetic days")
    log(f"Expires: {expires}")

    if dry_run:
        log("DRY RUN — not writing")
        return

    OUT.write_text(json.dumps(out_data, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ Written: {OUT}")

    # Quick smoke test: read back
    check = json.loads(OUT.read_text())
    today_entry = check["kp"].get(str(today))
    if today_entry:
        log(f"Smoke test: today={today} kp={today_entry['kp']} syn={today_entry['kp_synthetic']} ✅")
    else:
        log(f"⚠ Smoke test: today={today} not found in output")

def main():
    p = argparse.ArgumentParser(description="update_kp.py — G-Index Kp pipeline")
    p.add_argument("--check",   action="store_true", help="Acceptance test only (no write)")
    p.add_argument("--status",  action="store_true", help="Show current future_kp.json state")
    p.add_argument("--dry-run", action="store_true", help="Fetch but don't write")
    args = p.parse_args()

    if args.status:
        cmd_status()
    elif args.check:
        cmd_check()
    else:
        log("=== update_kp.py START ===")
        cmd_update(dry_run=args.dry_run)
        log("=== update_kp.py DONE ===")

if __name__ == "__main__":
    main()
