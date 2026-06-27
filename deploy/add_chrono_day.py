#!/usr/bin/env python3
"""
add_chrono_day.py — CHRONO JOURNAL automation v1
Usage:
  python add_chrono_day.py                        # today, interactive
  python add_chrono_day.py --date 2026-07-01      # specific date
  python add_chrono_day.py --date 2026-07-01 --a 2 --b 0 --c 1 --d -1 --exposure active
  python add_chrono_day.py --status               # show gaps + progress
  python add_chrono_day.py --correct 2026-07-01 --note "correction: A was 1 not 2"

RULES (from CHRONO_PREREGISTRATION.md — LOCKED):
  - Fill A/B/C/D BLIND (before looking at g_day score)
  - exposure: active/passive/none/invalid
  - locked=1 after entry — no edits, only correction-note
  - Do NOT check r until n>=10
"""
import json, csv, sys, os, argparse, hashlib, datetime
from pathlib import Path

CHRONO_JSON = Path(__file__).parent / "chrono_daily.json"
ENGINE_JSON = Path(__file__).parent.parent / "mnt/project/engine_scores.json"
# fallback paths for local deploy
for ep in [
    Path("/mnt/project/engine_scores.json"),
    Path("engine_scores.json"),
]:
    if ep.exists():
        ENGINE_JSON = ep
        break

# ── load/save ──────────────────────────────────────────────────────────────
def load_db():
    if CHRONO_JSON.exists():
        return json.loads(CHRONO_JSON.read_text())
    return {"_meta": {
        "schema": "chrono_v1.2",
        "locked_at": "2026-06-21",
        "preregistration": "CHRONO_PREREGISTRATION.md",
        "axes": {
            "A": "стан/настрій (self-rated -3..+3)",
            "B": "продуктивність/фокус (-3..+3)",
            "C": "фізичний стан (-3..+3)",
            "D": "зовнішні події / обставини (-3..+3)"
        },
        "lock_rule": "entry locked after save; correction via --correct only",
        "blind_rule": "fill A/B/C/D BEFORE looking at g_day"
    }, "entries": {}}

def save_db(db):
    CHRONO_JSON.write_text(json.dumps(db, ensure_ascii=False, indent=2))

def load_engine():
    try:
        raw = json.loads(ENGINE_JSON.read_text())
        return raw.get("scores", {})
    except:
        return {}

# ── helpers ────────────────────────────────────────────────────────────────
def get_engine_entry(date_str, scores):
    e = scores.get(date_str, {})
    return {
        "eng": e.get("eng"),
        "kp": e.get("kp"),
        "kp_synthetic": e.get("kp_synthetic", True),
        "tag": e.get("tag", ""),
    }

def entry_hash(entry):
    s = json.dumps({k: entry[k] for k in ["date","axis_a","axis_b","axis_c","axis_d","exposure"]},
                   sort_keys=True)
    return hashlib.sha256(s.encode()).hexdigest()[:12]

def chrono_score(a, b, c, d):
    vals = [v for v in [a,b,c,d] if v is not None]
    if not vals: return None
    return round(sum(vals)/len(vals), 2)

def valid_axes(*vals):
    for v in vals:
        if v is not None and v not in range(-3, 4):
            return False, f"Value {v} out of range -3..+3"
    return True, ""

def count_valid(db):
    return sum(1 for e in db["entries"].values()
               if e.get("exposure") not in ("invalid","retro","") and
               e.get("axis_a") is not None)

# ── commands ───────────────────────────────────────────────────────────────
def cmd_status(db, scores):
    today = datetime.date.today().isoformat()
    entries = db["entries"]
    n_valid = count_valid(db)
    n_total = len(entries)
    print(f"\n{'═'*50}")
    print(f"CHRONO STATUS — {today}")
    print(f"{'═'*50}")
    print(f"Entries total : {n_total}")
    print(f"Valid (n)     : {n_valid}/30 target  {'✅' if n_valid>=30 else f'⏳ need {30-n_valid} more'}")
    print(f"r blocked     : n<10  {'🔒' if n_valid<10 else '📊 можна'}")
    print()

    # gaps: dates with engine score but no chrono entry
    gaps = []
    start = datetime.date(2026, 6, 21)
    end = datetime.date.fromisoformat(today)
    d = start
    while d <= end:
        ds = d.isoformat()
        if ds not in entries:
            gaps.append(ds)
        elif entries[ds].get("axis_a") is None and entries[ds].get("exposure") not in ("retro",):
            gaps.append(f"{ds} (blank)")
        d += datetime.timedelta(days=1)
    if gaps:
        print(f"⚠ GAPS ({len(gaps)}):")
        for g in gaps: print(f"  {g}")
    else:
        print("✅ No gaps")

    print()
    print("Recent entries:")
    for ds in sorted(entries)[-5:]:
        e = entries[ds]
        a,b,c,d_ = e.get("axis_a"),e.get("axis_b"),e.get("axis_c"),e.get("axis_d")
        cs = chrono_score(a,b,c,d_)
        eng = e.get("g_day","?")
        lock = "🔒" if e.get("locked") else "  "
        print(f"  {lock} {ds}  A={a} B={b} C={c} D={d_}  mean={cs}  g={eng}  exp={e.get('exposure','?')}")
    print()

def cmd_add(db, scores, date_str, a, b, c, d, exposure, delayed, note, avoided):
    entries = db["entries"]

    # lock check
    if date_str in entries and entries[date_str].get("locked"):
        print(f"❌ {date_str} already locked. Use --correct to add a note.")
        sys.exit(1)

    # validate
    ok, err = valid_axes(a, b, c, d)
    if not ok:
        print(f"❌ {err}"); sys.exit(1)

    if exposure not in ("active","passive","none","invalid"):
        print(f"❌ exposure must be active/passive/none/invalid"); sys.exit(1)

    eng_entry = get_engine_entry(date_str, scores)
    cs = chrono_score(a, b, c, d)

    entry = {
        "date": date_str,
        "axis_a": a, "axis_b": b, "axis_c": c, "axis_d": d,
        "chrono_mean": cs,
        "g_day": eng_entry["eng"],
        "kp": eng_entry["kp"],
        "kp_synthetic": eng_entry["kp_synthetic"],
        "g_confidence": None,  # filled by dashboard
        "exposure": exposure,
        "delayed_major_event": int(bool(delayed)),
        "baseline_shift": 0,
        "note": note or "",
        "avoided_event": avoided or "",
        "locked": True,
        "locked_at": datetime.datetime.now(datetime.timezone.utc).isoformat()[:16]+"Z",
        "hash": None,
    }
    entry["hash"] = entry_hash(entry)
    entries[date_str] = entry
    save_db(db)

    sign_match = None
    if eng_entry["eng"] is not None and cs is not None:
        eg = eng_entry["eng"]; cg = cs
        sign_match = (eg>0 and cg>0) or (eg<0 and cg<0) or (eg==0 and abs(cg)<0.5)

    print(f"\n✅ Saved {date_str}")
    print(f"   Chrono mean : {cs}  (A={a} B={b} C={c} D={d})")
    print(f"   G_day       : {eng_entry['eng']} (Kp={eng_entry['kp']}{'*' if eng_entry['kp_synthetic'] else ''})")
    print(f"   Sign match  : {'✅' if sign_match else ('❌' if sign_match is False else '—')}")
    print(f"   Locked 🔒   : {entry['locked_at']}")
    n = count_valid(db)
    print(f"   n valid     : {n}/30  {'— r BLOCKED (n<10)' if n<10 else '— r available'}")

def cmd_correct(db, date_str, note):
    entries = db["entries"]
    if date_str not in entries:
        print(f"❌ {date_str} not found"); sys.exit(1)
    prev = entries[date_str].get("correction_notes", [])
    prev.append({
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat()[:16]+"Z",
        "note": note
    })
    entries[date_str]["correction_notes"] = prev
    save_db(db)
    print(f"✅ Correction note added to {date_str}")

# ── interactive prompt ─────────────────────────────────────────────────────
def prompt_int(msg, allow_none=False):
    while True:
        v = input(msg).strip()
        if v == "" and allow_none: return None
        try:
            vi = int(v)
            if -3 <= vi <= 3: return vi
        except: pass
        print("  Enter -3..+3 (or blank to skip)")

def interactive_entry(date_str, db, scores):
    if date_str in db["entries"] and db["entries"][date_str].get("locked"):
        print(f"❌ {date_str} already locked."); sys.exit(1)
    eng = get_engine_entry(date_str, scores)
    print(f"\n{'─'*40}")
    print(f"CHRONO ENTRY — {date_str}")
    print(f"{'─'*40}")
    print("⚠ Fill A/B/C/D BLIND (before checking G score)\n")
    a = prompt_int("A — стан/настрій      (-3..+3): ")
    b = prompt_int("B — продуктивність    (-3..+3): ")
    c = prompt_int("C — фізичний стан     (-3..+3): ")
    d = prompt_int("D — зовнішні обставини(-3..+3): ")
    print()
    exp = ""
    while exp not in ("active","passive","none","invalid"):
        exp = input("exposure [active/passive/none/invalid]: ").strip().lower()
    delayed = input("delayed_major_event [0/1]: ").strip() == "1"
    note = input("note (optional): ").strip()
    avoided = input("avoided_event (optional): ").strip()
    print(f"\nG_day = {eng['eng']} (revealing after entry)")
    cmd_add(db, scores, date_str, a, b, c, d, exp, delayed, note, avoided)

# ── main ───────────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="Chrono Journal daily entry tool")
    p.add_argument("--date", default=datetime.date.today().isoformat())
    p.add_argument("--a", type=int, default=None)
    p.add_argument("--b", type=int, default=None)
    p.add_argument("--c", type=int, default=None)
    p.add_argument("--d", type=int, default=None)
    p.add_argument("--exposure", default=None)
    p.add_argument("--delayed", action="store_true")
    p.add_argument("--note", default="")
    p.add_argument("--avoided", default="")
    p.add_argument("--status", action="store_true")
    p.add_argument("--correct", metavar="DATE")
    p.add_argument("--correction-note", default="")
    args = p.parse_args()

    db = load_db()
    scores = load_engine()

    if args.status:
        cmd_status(db, scores)
    elif args.correct:
        if not args.correction_note:
            args.correction_note = input("Correction note: ").strip()
        cmd_correct(db, args.correct, args.correction_note)
    elif all(v is not None for v in [args.a, args.b, args.c, args.d, args.exposure]):
        cmd_add(db, scores, args.date, args.a, args.b, args.c, args.d,
                args.exposure, args.delayed, args.note, args.avoided)
    else:
        interactive_entry(args.date, db, scores)

if __name__ == "__main__":
    main()
