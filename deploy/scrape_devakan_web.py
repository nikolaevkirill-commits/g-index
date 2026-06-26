"""
scrape_devakan_web.py — скрейпінг t.me/s/devakan без Telegram API
Вивід: data/devakan_web.json + data/devakan_web.csv

ВСТАНОВЛЕННЯ:
    python -m pip install requests beautifulsoup4

ЗАПУСК:
    python scrape_devakan_web.py
"""

import json
import csv
import time
import re
from pathlib import Path
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Встановлюю залежності...")
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4"])
    import requests
    from bs4 import BeautifulSoup

# ── CONFIG ────────────────────────────────────────────────────────────────────
BASE_URL = "https://t.me/s/devakan"
DATA_DIR = Path("data")
OUT_JSON = DATA_DIR / "devakan_web.json"
OUT_CSV  = DATA_DIR / "devakan_web.csv"
MAX_PAGES = 50   # ~50 * 20 = ~1000 постів
DELAY = 1.5      # секунд між запитами

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "uk,ru;q=0.9,en;q=0.8",
}

# ── PARSER ────────────────────────────────────────────────────────────────────
MONTH_MAP = {
    "jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
    "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12,
}

POS = ["благоприятн","сприятлив","хорош","✅","рекоменд","можно","можна","🟢","удача","успех"]
NEG = ["неблагоприятн","несприятлив","избегай","уникай","❌","⛔","🚫","🔴","сложн","риск"]

DOMAINS = {
    "договори":   ["договор","контракт","угод","соглашени"],
    "торгівля":   ["торгов","продаж","покупк","бизнес","бізнес"],
    "навчання":   ["учеб","навчан","обучени","курс"],
    "здоров'я":   ["здоров","лечени","лікуван","операц","медицин"],
    "подорож":    ["путешеств","поїздк","дорог","переезд"],
    "фінанси":    ["финанс","деньги","гроші","кредит"],
    "робота":     ["работ","карьер","кар'єр"],
    "конфлікти":  ["конфликт","конфлікт","ссор","агресс"],
    "початок":    ["начинани","початок","начало","старт"],
    "сім'я":      ["семь","сім'","дети","діти"],
    "творчість":  ["творч","искусств","мистецтв"],
}

PLANETS = {
    "Sun":     ["солнц","сонц","☀","сурья"],
    "Moon":    ["луна","місяць","🌙","🌕","🌑","чандра"],
    "Mars":    ["марс","мангал","♂"],
    "Mercury": ["меркурий","меркурій","☿","буддха"],
    "Jupiter": ["юпитер","юпітер","гуру","♃"],
    "Venus":   ["венера","шукра","♀"],
    "Saturn":  ["сатурн","шані","♄"],
    "Rahu":    ["раху","☊"],
    "Ketu":    ["кету","☋"],
}

ASTRO = {
    "purnima":   ["пурніма","purnim","повня","полнолуни"],
    "amavasya":  ["амавасья","amavasya","новолуни","новолунн"],
    "ekadashi":  ["екадаші","ekadashi"],
    "retrograde":["ретроград","retrograd"," rx "],
    "eclipse":   ["затмени","затемненн","eclipse"],
    "rahu_kala": ["раху-кала","rahu kala"],
    "nakshatra": ["накшатра","nakshatra"],
    "tithi":     ["титхі","tithi"],
}

TIME_RE = re.compile(r"\b(\d{1,2})[:\.](\d{2})\s*[-–—]\s*(\d{1,2})[:\.](\d{2})\b")


def parse_datetime(dt_str: str) -> str:
    """ISO datetime → YYYY-MM-DD"""
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return ""


def score_text(text: str) -> tuple:
    lines = text.lower().split("\n")
    pos, neg = 0, 0
    for line in lines:
        hp = any(m in line for m in POS)
        hn = any(m in line for m in NEG)
        if hp and not hn: pos += 1
        elif hn and not hp: neg += 1
    total = pos + neg
    if total == 0:
        return None, "neutral"
    r = (pos - neg) / total
    if r >= 0.6:   return 2, "positive"
    if r >= 0.2:   return 1, "positive"
    if r <= -0.6:  return -2, "negative"
    if r <= -0.2:  return -1, "negative"
    return 0, "mixed"


def extract_domains(text: str) -> list:
    t = text.lower()
    return [tag for tag, kws in DOMAINS.items() if any(k in t for k in kws)]


def extract_planets(text: str) -> list:
    t = text.lower()
    return [p for p, kws in PLANETS.items() if any(k in t for k in kws)]


def extract_astro(text: str) -> list:
    t = text.lower()
    return [term for term, kws in ASTRO.items() if any(k in t for k in kws)]


def extract_windows(text: str) -> tuple:
    good, bad = [], []
    for line in text.split("\n"):
        matches = TIME_RE.findall(line)
        if not matches: continue
        windows = [f"{h1}:{m1}-{h2}:{m2}" for h1,m1,h2,m2 in matches]
        l = line.lower()
        is_bad = any(m in l for m in NEG) or "избегай" in l or "уникай" in l
        is_good = any(m in l for m in POS)
        for w in windows:
            (good if is_good and not is_bad else bad).append(w)
    return list(set(good)), list(set(bad))


def detect_type(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["неделя","на неделю","тиждень","гороскоп на"]): return "weekly"
    if any(k in t for k in ["затмени","затемненн","eclipse"]): return "eclipse"
    if any(k in t for k in ["ретроград","retrograd"]): return "retro"
    if any(k in t for k in ["транзит","transit","входит в"]): return "transit"
    if any(k in t for k in ["главные энерг","энергии дня","лунные сутки","головні енерг"]): return "daily"
    return "other"


# ── SCRAPER ───────────────────────────────────────────────────────────────────
def fetch_page(url: str) -> BeautifulSoup | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
        print(f"  [warn] HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"  [error] {e}")
    return None


def scrape():
    DATA_DIR.mkdir(exist_ok=True)
    posts = []
    url = BASE_URL
    seen_ids = set()

    print(f"[scrape] Старт: {BASE_URL}")

    for page_num in range(MAX_PAGES):
        soup = fetch_page(url)
        if not soup:
            break

        messages = soup.find_all("div", class_="tgme_widget_message")
        if not messages:
            print(f"  [info] Немає повідомлень на сторінці {page_num+1}")
            break

        new_count = 0
        oldest_id = None

        for msg in messages:
            # ID
            msg_id = msg.get("data-post", "").split("/")[-1]
            if not msg_id or msg_id in seen_ids:
                continue
            seen_ids.add(msg_id)

            # Дата
            time_tag = msg.find("time")
            post_date = ""
            if time_tag and time_tag.get("datetime"):
                post_date = parse_datetime(time_tag["datetime"])

            # Текст
            text_div = msg.find("div", class_="tgme_widget_message_text")
            text = text_div.get_text("\n", strip=True) if text_div else ""

            # Фото
            photo = msg.find("a", class_="tgme_widget_message_photo_wrap")
            has_photo = photo is not None

            if not text and not has_photo:
                continue

            # Парсинг
            score, sentiment = score_text(text)
            domains = extract_domains(text)
            planets = extract_planets(text)
            astro = extract_astro(text)
            tw_good, tw_bad = extract_windows(text)
            ptype = detect_type(text)

            posts.append({
                "msg_id": msg_id,
                "post_date": post_date,
                "post_type": ptype,
                "score_raw": score,
                "sentiment": sentiment,
                "domains": ";".join(domains),
                "planets": ";".join(planets),
                "astro_terms": ";".join(astro),
                "time_good": ";".join(tw_good),
                "time_bad": ";".join(tw_bad),
                "has_photo": has_photo,
                "text_preview": text[:400].replace("\n", " "),
                "full_text": text,
            })

            new_count += 1
            if oldest_id is None or int(msg_id) < int(oldest_id):
                oldest_id = msg_id

        print(f"  [page {page_num+1}] +{new_count} постів (всього {len(posts)})")

        if new_count == 0 or oldest_id is None:
            break

        # Наступна сторінка — старіші пости
        url = f"{BASE_URL}?before={oldest_id}"
        time.sleep(DELAY)

    # Сортування
    posts.sort(key=lambda x: x["post_date"])

    # JSON
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    # CSV
    if posts:
        fields = [k for k in posts[0].keys() if k != "full_text"]
        with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for p in posts:
                row = {k: v for k, v in p.items() if k != "full_text"}
                writer.writerow(row)

    print(f"\n[done] {len(posts)} постів → {OUT_JSON}, {OUT_CSV}")
    return posts


if __name__ == "__main__":
    scrape()
