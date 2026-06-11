"""
fetch_kp_v2.py — Геомагнітні дані для Prognosis2
Зміни vs v1:
  + Dst індекс (WDC Kyoto real-time JSON)
  + F10.7 сонячний радіопотік (NOAA SWPC)
  Повертає: {date: {'kp', 'kp_source', 'storm', 'sn', 'dst', 'dst_level', 'f107'}}

Джерела:
  Kp факт:     https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
  Kp прогноз:  https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json
  Wolf Sn:     https://www.sidc.be/SILSO/DATA/EISN/EISN_current.json
  Dst real-time: https://services.swpc.noaa.gov/json/geospace/geospace_dst_1m.json
  Dst 1-hour:  http://wdc.kugi.kyoto-u.ac.jp/dst_realtime/presentmonth/index.html  (fallback, HTML)
  F10.7:       https://services.swpc.noaa.gov/json/f107_cm_flux.json
"""

import urllib.request, json, sys
from datetime import date, timedelta

# ─── URL-И ───────────────────────────────────────────────────────────
KP_FACT_URL     = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
KP_FORECAST_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
SN_URL          = "https://www.sidc.be/SILSO/DATA/EISN/EISN_current.json"
SN_MONTHLY_URL  = "https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.json"
DST_URL         = "https://services.swpc.noaa.gov/products/kyoto-dst.json"
DST_URL_FALLBACK= "https://services.swpc.noaa.gov/json/geospace/geospace_dst_1m.json"
F107_URL        = "https://services.swpc.noaa.gov/json/f107_cm_flux.json"

# ─── HTTP FETCH ───────────────────────────────────────────────────────
def fetch_url(url, timeout=15):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Prognosis2/2.0)'
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8')
    except Exception as e:
        # fp56: SILSO (sidc.be) має проблемний SSL-ланцюг на Windows-Python →
        # CERTIFICATE_VERIFY_FAILED. Для ПУБЛІЧНИХ наукових даних робимо retry
        # без верифікації ЛИШЕ для sidc.be (дані некритичні до підміни, є NOAA-фолбеки).
        if 'sidc.be' in url and ('CERTIFICATE' in str(e).upper() or 'SSL' in str(e).upper()):
            try:
                import ssl
                ctx = ssl._create_unverified_context()
                with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                    print(f"  [INFO] {url}: SSL-verify off (sidc.be fallback)", file=sys.stderr)
                    return r.read().decode('utf-8')
            except Exception as e2:
                print(f"  [WARN] {url}: {e2}", file=sys.stderr)
                return None
        print(f"  [WARN] {url}: {e}", file=sys.stderr)
        return None

# ─── KP ФАКТ ─────────────────────────────────────────────────────────
def get_kp_fact():
    raw = fetch_url(KP_FACT_URL)
    if not raw: return {}
    try: rows = json.loads(raw)
    except: return {}
    daily = {}
    for row in rows[1:]:
        try:
            d = date.fromisoformat(str(row[0])[:10])
            daily.setdefault(d, []).append(float(row[1]))
        except: continue
    return {d: {'avg': round(sum(v)/len(v),2), 'max': round(max(v),2)}
            for d, v in daily.items()}

# ─── KP ПРОГНОЗ ──────────────────────────────────────────────────────
def get_kp_forecast():
    raw = fetch_url(KP_FORECAST_URL)
    if not raw: return {}
    try: rows = json.loads(raw)
    except: return {}
    today = date.today()
    daily = {}
    for row in rows[1:]:
        try:
            d = date.fromisoformat(str(row[0])[:10])
            if d >= today:
                daily.setdefault(d, []).append(float(row[1]))
        except: continue
    return {d: {'avg': round(sum(v)/len(v),2), 'max': round(max(v),2)}
            for d, v in daily.items()}

# ─── WOLF NUMBER ─────────────────────────────────────────────────────
def get_wolf_number():
    result = {}
    raw = fetch_url(SN_URL)
    if raw:
        try:
            for item in json.loads(raw):
                try:
                    ts = str(item.get('time_tag', ''))[:10]
                    sn = (item.get('eisn') or item.get('sn') or
                          item.get('Sn') or item.get('smoothed_sn'))
                    if sn is not None and ts:
                        result[date.fromisoformat(ts)] = float(sn)
                except: continue
        except: pass
    if not result:
        raw2 = fetch_url(SN_MONTHLY_URL)
        if raw2:
            try:
                for item in json.loads(raw2)[-6:]:
                    try:
                        sn = float(item[3]) if item[3] else None
                        if sn: result[date(int(item[0]), int(item[1]), 1)] = sn
                    except: continue
            except: pass
    return result

# ─── DST ІНДЕКС ──────────────────────────────────────────────────────
def _dst_valid(v):
    """fp56: синхронно з дашбордом (_dstValid, fp55-P29): Kyoto шле sentinel 9999/99999
    для відсутніх годин. Реальний Dst живе в [-600..+100] нТл."""
    try:
        n = float(v)
        return -600 <= n <= 100
    except (TypeError, ValueError):
        return False

def get_dst():
    """
    Основне: kyoto-dst.json (масив масивів, заголовок: ["time_tag","dst"]) — те саме
    джерело, що в дашборді. Fallback: geospace_dst_1m.json (масив об'єктів) — давав 404.
    Повертає {date: {'avg': float, 'min': float}} — добові агрегати (нТл)
    Dst < 0: негативна → буря; мінімум = пік бурі
    """
    daily = {}
    raw = fetch_url(DST_URL)
    if raw:
        try:
            rows = json.loads(raw)
            # формат масив-масивів з заголовком
            if rows and isinstance(rows[0], list):
                for row in rows[1:]:
                    try:
                        ts = str(row[0])[:10]
                        if _dst_valid(row[1]) and ts:
                            daily.setdefault(date.fromisoformat(ts), []).append(float(row[1]))
                    except (ValueError, IndexError): continue
        except (json.JSONDecodeError, TypeError): pass
    if not daily:
        raw = fetch_url(DST_URL_FALLBACK)
        if not raw: return {}
        try: data = json.loads(raw)
        except json.JSONDecodeError: return {}
        for item in data:
            try:
                ts  = str(item.get('time_tag', ''))[:10]
                dst = item.get('dst') if item.get('dst') is not None else item.get('Dst')
                if _dst_valid(dst) and ts:
                    daily.setdefault(date.fromisoformat(ts), []).append(float(dst))
            except (ValueError, AttributeError): continue

    return {d: {'avg': round(sum(v)/len(v), 1),
                'min': round(min(v), 1)}
            for d, v in daily.items()}

# ─── F10.7 СОНЯЧНИЙ РАДІОПОТІК ───────────────────────────────────────
def get_f107():
    """
    f107_cm_flux.json: [{"time_tag":"2024-03-27T00:00:00","flux":150.2}, ...]
    Повертає {date: float} — добовий F10.7 (SFU)
    F10.7 > 150 SFU = підвищена сонячна активність
    """
    raw = fetch_url(F107_URL)
    if not raw: return {}
    try: data = json.loads(raw)
    except: return {}

    result = {}
    for item in data:
        try:
            ts   = str(item.get('time_tag', ''))[:10]
            flux = item.get('flux') or item.get('f107') or item.get('value')
            if flux is not None and ts:
                result[date.fromisoformat(ts)] = round(float(flux), 1)
        except: continue
    return result

# ─── КЛАСИФІКАЦІЯ ────────────────────────────────────────────────────
def storm_level(kp):
    if kp is None: return ''
    if kp >= 9:  return 'G5 (Екстремальна)'
    if kp >= 8:  return 'G4 (Сильна)'
    if kp >= 7:  return 'G3 (Сильна)'
    if kp >= 6:  return 'G2 (Помірна)'
    if kp >= 5:  return 'G1 (Мала)'
    if kp >= 4:  return 'Незначне збурення'
    if kp >= 3:  return 'Слабке збурення'
    return 'Спокійно'

def dst_level(dst):
    """Класифікація інтенсивності бурі за Dst (нТл)"""
    if dst is None: return ''
    if dst <= -200: return 'Супербуря (≤−200 нТл)'
    if dst <= -100: return 'Сильна буря (≤−100 нТл)'
    if dst <= -50:  return 'Помірна буря (≤−50 нТл)'
    if dst <= -30:  return 'Слабка буря (≤−30 нТл)'
    if dst <= -10:  return 'Збурення (≤−10 нТл)'
    return 'Спокійно'

# ─── ГОЛОВНА ФУНКЦІЯ ─────────────────────────────────────────────────
def fetch_all(start_date=None, end_date=None, verbose=True):
    """
    Повертає {date: {
        'kp':        float|None,
        'kp_source': 'fact'|'forecast'|None,
        'storm':     str,
        'sn':        float|None,
        'dst':       float|None,   # добовий мінімум Dst (нТл)
        'dst_avg':   float|None,   # добовий середній Dst
        'dst_level': str,
        'f107':      float|None,   # F10.7 (SFU)
    }}
    """
    if verbose: print("⬇  Kp факт...",    end=' ', flush=True)
    fact = get_kp_fact()
    if verbose: print(f"{len(fact)} днів")

    if verbose: print("⬇  Kp прогноз...", end=' ', flush=True)
    forecast = get_kp_forecast()
    if verbose: print(f"{len(forecast)} днів")

    if verbose: print("⬇  Wolf Sn...",    end=' ', flush=True)
    wolf = get_wolf_number()
    if verbose: print(f"{len(wolf)} записів")

    if verbose: print("⬇  Dst...",        end=' ', flush=True)
    dst_data = get_dst()
    if verbose: print(f"{len(dst_data)} днів")

    if verbose: print("⬇  F10.7...",      end=' ', flush=True)
    f107_data = get_f107()
    if verbose: print(f"{len(f107_data)} записів")

    all_dates = set(fact) | set(forecast)
    result = {}

    for d in sorted(all_dates):
        if start_date and d < start_date: continue
        if end_date   and d > end_date:   continue

        # Kp
        kp = None; src = None
        if d in fact:
            kp = fact[d]['avg']; src = 'fact'
        elif d in forecast:
            kp = forecast[d]['avg']; src = 'forecast'

        # Wolf Sn — найближча дата ±7 днів
        sn = wolf.get(d)
        if sn is None:
            for delta in range(1, 8):
                sn = wolf.get(d - timedelta(delta))
                if sn: break

        # Dst — мінімум доби (пік бурі важливіший за середнє)
        dst_day = dst_data.get(d)
        dst_min = dst_day['min'] if dst_day else None
        dst_avg = dst_day['avg'] if dst_day else None

        # F10.7 — найближча дата ±3 дні
        f107 = f107_data.get(d)
        if f107 is None:
            for delta in range(1, 4):
                f107 = f107_data.get(d - timedelta(delta))
                if f107: break

        result[d] = {
            'kp':        kp,
            'kp_source': src,
            'storm':     storm_level(kp),
            'sn':        sn,
            'dst':       dst_min,
            'dst_avg':   dst_avg,
            'dst_level': dst_level(dst_min),
            'f107':      f107,
        }

    return result

# ─── CLI ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    today = date.today()
    print("=== fetch_kp_v2.py — тест ===\n")
    data = fetch_all(
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=4)
    )
    if not data:
        print("❌ Немає даних (перевір мережевий доступ)")
    else:
        print(f"\n{'Дата':12} {'Kp':5} {'Dst':6} {'Dst рівень':25} {'Sn':4} {'F10.7':6} {'Буря Kp'}")
        print('-' * 85)
        for d in sorted(data):
            r = data[d]
            kp_s   = f"{r['kp']:.1f}"   if r['kp']   else "---"
            dst_s  = f"{r['dst']:.0f}"  if r['dst']  is not None else "---"
            sn_s   = f"{r['sn']:.0f}"   if r['sn']   else "---"
            f107_s = f"{r['f107']:.1f}" if r['f107'] else "---"
            print(f"{str(d):12} {kp_s:5} {dst_s:6} {r['dst_level']:25} {sn_s:4} {f107_s:6} {r['storm']}")
        print(f"\nВсього: {len(data)} записів")
