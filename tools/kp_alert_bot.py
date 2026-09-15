#!/usr/bin/env python3
"""Hourly NOAA Kp alert with event-based deduplication.

Secrets are read only from GINDEX_TELEGRAM_BOT_TOKEN and
GINDEX_TELEGRAM_CHAT_ID. Nothing sensitive is stored in this file.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import math
import os
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "kp_alert_state.json"
LOG_FILE = ROOT / "kp_alert.log"
SNAPSHOT_FILE = ROOT / "outputs" / "KP_HOURLY_ALERT_v2.json"
PUBLIC_SNAPSHOT_FILE = ROOT / "KP_HOURLY_ALERT_v2.json"
FACT_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
FORECAST_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
THRESHOLD_WARNING = 4.0
THRESHOLD_STORM = 5.0
LOOKAHEAD_HOURS = 12


def log(message: str) -> None:
    line = f"{datetime.now().isoformat(timespec='seconds')} {message}"
    print(line)
    with LOG_FILE.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def fetch_json(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers={"User-Agent": "GIndex-Kp-Alert/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_time(value: object) -> datetime | None:
    text = str(value or "").strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_rows(rows, source: str) -> list[dict]:
    result = []
    if not isinstance(rows, list) or not rows:
        return result
    iterable = rows if isinstance(rows[0], dict) else rows[1:]
    for row in iterable:
        try:
            if isinstance(row, dict):
                kp = row.get("Kp", row.get("kp", row.get("kp_index")))
                when = row.get("time_tag") or row.get("time")
            else:
                when, kp = row[0], row[1]
            dt = parse_time(when)
            if dt is not None and kp is not None:
                if isinstance(kp, bool):
                    continue
                value = float(kp)
                if not math.isfinite(value) or not 0 <= value <= 9:
                    continue
                result.append({"time_utc": dt, "kp": value, "source": source})
        except (TypeError, ValueError, IndexError):
            continue
    return result



TEXT_FORECAST_URL = "https://services.swpc.noaa.gov/text/3-day-forecast.txt"

def parse_text_forecast(text, now):
    """Read only a complete, recent NOAA three-day Kp table; never infer gaps."""
    import re
    issued = re.search(r":Issued:\s+(\d{4} [A-Za-z]{3} \d{1,2} \d{4}) UTC", text)
    if not issued:
        raise ValueError("Missing bulletin issue date")
    stamp = datetime.strptime(issued[1], "%Y %b %d %H%M").replace(tzinfo=timezone.utc)
    if not -timedelta(minutes=5) <= now - stamp <= timedelta(hours=36):
        raise ValueError("Stale or future bulletin")
    section = text.split("NOAA Kp index breakdown", 1)
    if len(section) != 2:
        raise ValueError("Missing Kp table")
    lines = section[1].split("Rationale:", 1)[0].splitlines()
    header = next((re.findall(r"([A-Z][a-z]{2})\s+(\d{1,2})", line) for line in lines
                   if len(re.findall(r"([A-Z][a-z]{2})\s+(\d{1,2})", line)) == 3), None)
    if not header:
        raise ValueError("Missing three-day header")
    days = []
    for month, day in header:
        candidates = []
        for y in (stamp.year - 1, stamp.year, stamp.year + 1):
            try:
                candidates.append(datetime.strptime(f"{y} {month} {day}", "%Y %b %d").replace(tzinfo=timezone.utc))
            except ValueError:
                continue  # February 29 may exist in only one candidate year.
        if not candidates:
            raise ValueError("Invalid bulletin calendar date")
        days.append(min(candidates, key=lambda d: abs(d - stamp)))
    if days[0].date() != stamp.date() or any(days[i+1]-days[i] != timedelta(days=1) for i in range(2)):
        raise ValueError("Inconsistent bulletin dates")
    result, hours = [], set()
    for line in lines:
        match = re.match(r"\s*(\d{2})-(\d{2})UT\s+(.+)$", line)
        if not match:
            continue
        hour, end = int(match[1]), int(match[2])
        values = re.sub(r"\(G[1-5]\)", "", match[3]).split()
        if hour not in range(0,24,3) or end != (hour+3)%24 or hour in hours or len(values) != 3:
            raise ValueError("Malformed Kp intervals")
        hours.add(hour)
        for day, value in zip(days, values):
            kp = float(value)
            if not math.isfinite(kp) or not 0 <= kp <= 9:
                raise ValueError("Invalid Kp")
            result.append({"time_utc": day+timedelta(hours=hour), "kp": kp, "source": "forecast_text"})
    if len(hours) != 8:
        raise ValueError("Incomplete Kp table")
    return result, stamp

def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"sent_events": {}}


def save_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def send_telegram(text: str) -> None:
    token = os.environ.get("GINDEX_TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("GINDEX_TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        raise RuntimeError(
            "Missing GINDEX_TELEGRAM_BOT_TOKEN or GINDEX_TELEGRAM_CHAT_ID"
        )
    payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("ok"):
        raise RuntimeError("Telegram API rejected the message")


def main() -> int:
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=LOOKAHEAD_HOURS)
    errors = {}
    def read_feed(url, source):
        try:
            rows = fetch_json(url)
            if not isinstance(rows, list):
                raise ValueError("Expected an array")
            return parse_rows(rows, source)
        except Exception as exc:
            errors[source] = exc.__class__.__name__
            return []
    observed = read_feed(FACT_URL, "observed")
    forecast = read_feed(FORECAST_URL, "forecast")

    recent_observed = [x for x in observed if now - timedelta(hours=3) <= x["time_utc"] <= now]
    # Bins overlap [now,end): keep the active bin until its actual end.
    def in_window(row):
        return row["time_utc"] < end and row["time_utc"] + timedelta(hours=3) > now
    future = [x for x in forecast if in_window(x)]
    first_bin = now.replace(hour=(now.hour // 3)*3, minute=0, second=0, microsecond=0)
    expected = set()
    cursor = first_bin
    while cursor < end:
        expected.add(cursor)
        cursor += timedelta(hours=3)
    fallback_metadata = None
    if not expected.issubset({x["time_utc"] for x in future}):
        try:
            req = urllib.request.Request(TEXT_FORECAST_URL, headers={"User-Agent": "GIndex-Kp-Alert/2.0"})
            with urllib.request.urlopen(req, timeout=20) as response:
                bulletin = response.read().decode("utf-8")
            fallback, issued = parse_text_forecast(bulletin, now)
            fallback_rows = [x for x in fallback if in_window(x)]
            # JSON wins overlapping bins; text fills only missing bins.
            by_time = {x["time_utc"]: x for x in fallback_rows}
            by_time.update({x["time_utc"]: x for x in future})
            future = sorted(by_time.values(), key=lambda x: x["time_utc"])
            fallback_metadata = {"url": TEXT_FORECAST_URL, "issued_at": issued.isoformat(),
                                 "reason": "json_forecast_missing_or_partial"}
        except Exception as exc:
            log(f"[WARN] NOAA text fallback unavailable: {exc.__class__.__name__}")
    combined = sorted(recent_observed + future, key=lambda x: x["time_utc"])
    if not combined:
        log("[ERROR] NOAA returned no usable Kp rows; cached snapshots preserved.")
        return 1

    # One value per UTC timestamp; observed wins over forecast.
    slots = {}
    for row in combined:
        key = row["time_utc"].strftime("%Y-%m-%dT%H:%MZ")
        if key not in slots or row["source"] == "observed":
            slots[key] = row
    rows = list(slots.values())
    peak = max(rows, key=lambda x: x["kp"])
    level = 2 if peak["kp"] >= THRESHOLD_STORM else 1 if peak["kp"] >= THRESHOLD_WARNING else 0

    snapshot = {
        "schema": "kp_hourly_alert_v2",
        "generated_at": now.isoformat(),
        "lookahead_hours": LOOKAHEAD_HOURS,
        "thresholds": {"warning": THRESHOLD_WARNING, "storm": THRESHOLD_STORM},
        "forecast_coverage": {
            "status": "complete" if expected.issubset({x["time_utc"] for x in future}) else "partial" if future else "missing",
            "expected_slots": len(expected),
            "forecast_slots": len(expected.intersection({x["time_utc"] for x in future})),
            "missing_slots": [t.isoformat() for t in sorted(expected - {x["time_utc"] for x in future})],
            "window_start": now.isoformat(), "window_end": end.isoformat(),
            "first_slot": future[0]["time_utc"].isoformat() if future else None,
            "last_slot": future[-1]["time_utc"].isoformat() if future else None,
            "json_issued_at": None,  # The JSON feed does not provide bulletin issue time.
            "source_errors": errors,
        },
        "peak": {
            "time_utc": peak["time_utc"].isoformat(),
            "kp": peak["kp"],
            "source": peak["source"],
            "level": level,
        },
        "slots": [
            {"time_utc": x["time_utc"].isoformat(), "kp": x["kp"], "source": x["source"]}
            for x in rows
        ],
    }
    if fallback_metadata and future:
        snapshot["fallback"] = fallback_metadata
    # Write both the internal pipeline artifact and the public dashboard copy.
    # The Kp bot can run independently of daily_chain/sync_shadow_assets; writing
    # only outputs/ left the dashboard serving yesterday's slots until the next
    # full chain happened to run.
    save_json(SNAPSHOT_FILE, snapshot)
    save_json(PUBLIC_SNAPSHOT_FILE, snapshot)
    log(f"[OK] peak Kp={peak['kp']:.1f} at {peak['time_utc'].isoformat()} level={level}")
    if level == 0:
        return 0

    event_key = f"{peak['time_utc'].strftime('%Y%m%d%H')}:L{level}"
    state = load_state()
    sent = state.setdefault("sent_events", {})
    cutoff = now - timedelta(days=3)
    state["sent_events"] = {
        key: value for key, value in sent.items()
        if parse_time(value) is not None and parse_time(value) >= cutoff
    }
    if event_key in state["sent_events"]:
        log(f"[OK] event {event_key} already sent.")
        save_json(STATE_FILE, state)
        return 0

    icon = "🔴" if level == 2 else "🟡"
    title = "ГЕОМАГНІТНА БУРЯ" if level == 2 else "ПІДВИЩЕНИЙ Kp"
    table = "\n".join(
        f"{x['time_utc'].strftime('%H:%M')} UTC  Kp {x['kp']:.1f} ({x['source']})"
        for x in rows[:8]
    )
    message = (
        f"{icon} G-Index: {title}\n"
        f"Пік Kp {peak['kp']:.1f} о {peak['time_utc'].strftime('%d.%m %H:%M UTC')}\n\n"
        f"Найближчі значення:\n{table}\n\n"
        f"Покриття прогнозу: {snapshot['forecast_coverage']['status']}\n"
        + (f"NOAA text issued: {fallback_metadata['issued_at']}\n" if fallback_metadata else "") +
        "Можливе погіршення GPS і радіозв'язку. Перед польотом дрона або "
        "критичною операцією перевірте актуальні умови.\n"
        "https://nikolaevkirill-commits.github.io/g-index/"
    )
    if os.environ.get("GINDEX_ALERT_DRY_RUN") == "1":
        log(f"[DRY-RUN] would send {event_key}; {len(rows)} hourly slots captured.")
        return 0
    try:
        send_telegram(message)
    except Exception as exc:
        # Network exception strings may include the bot-token URL.
        log(f"[ERROR] Telegram send failed: {exc.__class__.__name__}")
        return 1
    state["sent_events"][event_key] = now.isoformat()
    save_json(STATE_FILE, state)
    log(f"[OK] alert {event_key} sent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
