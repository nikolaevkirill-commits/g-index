"""
scrape_tarita_audit7.py — повний ETL pipeline для t.me/devakan
AUDIT-7: Telegram → структуровані дані → зведення з GT

МОДУЛІ:
  1. telegram_ingest   — всі пости (text + caption + images)
  2. image_download    — збереження картинок локально
  3. ocr               — Tesseract / EasyOCR
  4. parser            — витягнути score/windows/actions/reasons
  5. gt_matcher        — зіставити з pdf48_ground_truth_v6.json + engine_scores.json
  6. audit_report      — CSV + JSON звіт

ВСТАНОВЛЕННЯ:
  pip install telethon easyocr pillow

  Tesseract (опційно, швидший):
    Windows: https://github.com/UB-Mannheim/tesseract/wiki
    pip install pytesseract

ЗАПУСК:
  python scrape_tarita_audit7.py --ingest   # Stage 1-3: качає + OCR
  python scrape_tarita_audit7.py --parse    # Stage 4: парсинг
  python scrape_tarita_audit7.py --audit    # Stage 5-6: зведення з GT
  python scrape_tarita_audit7.py --all      # всі стадії

OUTPUT:
  data/raw_posts.json         — сирі пости
  data/images/                — картинки
  data/ocr_cache.json         — OCR результати
  data/parsed_posts.json      — структуровані дані
  data/audit7_report.csv      — зведення з GT
  data/audit7_conflicts.json  — конфлікти Telegram vs GT
"""

import asyncio
import json
import csv
import re
import os
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

# ── CONFIG ────────────────────────────────────────────────────────────────────
CHANNEL = "devakan"
LIMIT = 5000
DATA_DIR = Path("data")
IMG_DIR = DATA_DIR / "images"
RAW_FILE = DATA_DIR / "raw_posts.json"
OCR_CACHE = DATA_DIR / "ocr_cache.json"
PARSED_FILE = DATA_DIR / "parsed_posts.json"
GT_FILE = Path("pdf48_ground_truth_v6.json")
ENGINE_FILE = Path("engine_scores.json")
AUDIT_CSV = DATA_DIR / "audit7_report.csv"
AUDIT_JSON = DATA_DIR / "audit7_conflicts.json"
SESSION = "tarita_session"

# ── CANONICAL SCHEMA ──────────────────────────────────────────────────────────
def empty_record():
    return {
        "message_id": None,
        "post_datetime": None,
        "forecast_date": None,       # YYYY-MM-DD
        "post_type": None,           # daily|weekly|transit|eclipse|retro|other
        "pdf_equivalent_score": None,# -3..+3 int або None
        "global_sentiment": None,    # positive|negative|neutral|mixed
        "good_for": [],              # ["договори", "навчання", ...]
        "avoid": [],                 # ["операції", "конфлікти", ...]
        "time_windows_good": [],     # ["09:00-12:00", ...]
        "time_windows_bad": [],      # ["14:20-17:00", ...]
        "planet_mentions": [],       # ["Mercury", "Rahu", ...]
        "astro_terms": [],           # ["purnima", "ekadashi", "retrograde", ...]
        "domain_tags": [],           # ["торгівля", "здоров'я", ...]
        "full_text": "",
        "image_paths": [],
        "ocr_text": "",
        "source": "text",            # text|ocr|both
    }

# ── STAGE 1: TELEGRAM INGEST ──────────────────────────────────────────────────
async def stage_ingest(api_id: int, api_hash: str):
    from telethon import TelegramClient
    from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument

    DATA_DIR.mkdir(exist_ok=True)
    IMG_DIR.mkdir(exist_ok=True)

    client = TelegramClient(SESSION, api_id, api_hash)
    await client.start()

    posts = []
    print(f"[ingest] Завантаження {CHANNEL} (limit={LIMIT})...")

    async for msg in client.iter_messages(CHANNEL, limit=LIMIT):
        post = {
            "message_id": msg.id,
            "post_datetime": msg.date.isoformat(),
            "text": msg.text or "",
            "caption": getattr(msg, "message", "") or "",
            "media_type": None,
            "image_file": None,
            "grouped_id": msg.grouped_id,
        }

        # Завантажити зображення
        if msg.media:
            if isinstance(msg.media, MessageMediaPhoto):
                post["media_type"] = "photo"
                fname = IMG_DIR / f"{msg.id}.jpg"
                if not fname.exists():
                    try:
                        await client.download_media(msg, file=str(fname))
                    except Exception as e:
                        print(f"  [warn] img {msg.id}: {e}")
                post["image_file"] = str(fname)
            elif isinstance(msg.media, MessageMediaDocument):
                post["media_type"] = "document"

        posts.append(post)

    await client.disconnect()

    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"[ingest] Збережено {len(posts)} постів → {RAW_FILE}")
    return posts

# ── STAGE 2: OCR ──────────────────────────────────────────────────────────────
def stage_ocr():
    if not RAW_FILE.exists():
        print("[ocr] raw_posts.json не знайдено. Спочатку --ingest")
        return {}

    with open(RAW_FILE, encoding="utf-8") as f:
        posts = json.load(f)

    # Завантажити кеш
    cache = {}
    if OCR_CACHE.exists():
        with open(OCR_CACHE, encoding="utf-8") as f:
            cache = json.load(f)

    # Спробувати EasyOCR (краще для кирилиці)
    reader = None
    try:
        import easyocr
        reader = easyocr.Reader(["ru", "uk", "en"], gpu=False)
        print("[ocr] EasyOCR ініціалізовано")
    except ImportError:
        pass

    # Fallback: pytesseract
    tess = None
    if reader is None:
        try:
            import pytesseract
            tess = pytesseract
            print("[ocr] pytesseract ініціалізовано")
        except ImportError:
            print("[ocr] WARN: ні easyocr, ні pytesseract — OCR пропущено")

    done = 0
    for post in posts:
        img = post.get("image_file")
        if not img or not Path(img).exists():
            continue
        mid = str(post["message_id"])
        if mid in cache:
            continue

        try:
            if reader:
                results = reader.readtext(img, detail=0)
                cache[mid] = " ".join(results)
            elif tess:
                from PIL import Image
                img_obj = Image.open(img)
                cache[mid] = tess.image_to_string(img_obj, lang="rus+ukr")
            done += 1
        except Exception as e:
            cache[mid] = ""
            print(f"  [ocr warn] {mid}: {e}")

    with open(OCR_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    print(f"[ocr] Оброблено {done} нових зображень → {OCR_CACHE}")
    return cache

# ── STAGE 3: PARSER ───────────────────────────────────────────────────────────

# Дата-паттерни
DATE_PATTERNS = [
    r"(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})",
    (r"(\d{1,2})\s+(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр"
     r"|січн|лютн|берез|квітн|травн|червн|липн|серпн|вересн|жовтн|листопад|грудн)\S*"
     r"(?:\s+(\d{4}))?"),
]
MONTH_MAP = {
    "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "май": 5, "июн": 6,
    "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
    "січн": 1, "лютн": 2, "берез": 3, "квітн": 4, "травн": 5, "червн": 6,
    "липн": 7, "серпн": 8, "вересн": 9, "жовтн": 10, "листопад": 11, "грудн": 12,
}

POST_TYPES = {
    "daily": ["главные энерг", "энергии дня", "день благоприятн", "лунные сутки",
              "головні енерг", "день сприятлив", "лунні добу"],
    "weekly": ["неделя", "на неделю", "тиждень", "на тиждень", "гороскоп на"],
    "transit": ["транзит", "transit", "входит в", "переходит"],
    "eclipse": ["затмени", "eclipse", "затемненн"],
    "retro": ["ретроград", "retrograd", "rx "],
}

PLANETS = {
    "Sun": ["солнц", "сонц", "sun", "☀", "сурья", "surya"],
    "Moon": ["луна", "місяць", "moon", "🌙", "🌕", "🌑", "чандра", "chandra"],
    "Mars": ["марс", "mars", "мангал", "mangal", "♂"],
    "Mercury": ["меркурий", "меркурій", "mercury", "буддха", "budha", "☿"],
    "Jupiter": ["юпитер", "юпітер", "jupiter", "гуру", "guru", "брихаспати", "♃"],
    "Venus": ["венера", "venus", "шукра", "shukra", "♀"],
    "Saturn": ["сатурн", "saturn", "шані", "shani", "♄"],
    "Rahu": ["раху", "rahu", "☊"],
    "Ketu": ["кету", "ketu", "☋"],
}

ASTRO_TERMS = {
    "purnima": ["пурніма", "purnim", "повня", "повний місяць", "полнолуни"],
    "amavasya": ["амавасья", "amavasya", "новолуни", "новий місяць", "новолунн"],
    "ekadashi": ["екадаші", "ekadashi", "одинадцятий"],
    "retrograde": ["ретроград", "retrograd", " rx "],
    "eclipse": ["затмени", "затемненн", "eclipse"],
    "abhijit": ["абхіджіт", "abhijit"],
    "rahu_kala": ["раху-кала", "раху кала", "rahu kala", "раху-cal"],
    "vara": ["вара", "vara", "день тижня"],
    "nakshatra": ["накшатра", "nakshatra"],
    "tithi": ["титхі", "tithi"],
    "yoga": ["йога", "yoga"],
}

DOMAIN_TAGS = {
    "договори": ["договор", "контракт", "угод", "соглашени", "подписан"],
    "торгівля": ["торгов", "продаж", "купівл", "покупк", "бизнес", "бізнес"],
    "навчання": ["учеб", "навчан", "обучени", "курс", "знани"],
    "здоров'я": ["здоров", "лечени", "лікуван", "операц", "медицин", "врач"],
    "подорож":  ["путешеств", "поїздк", "дорог", "переезд", "переїзд"],
    "фінанси":  ["финанс", "деньги", "гроші", "кредит", "інвест"],
    "сім'я":    ["семь", "сім'", "дети", "діти", "родствен"],
    "робота":   ["работ", "робот", "карьер", "кар'єр", "начальник"],
    "конфлікти":["конфликт", "конфлікт", "ссор", "суперечк", "агресс"],
    "початок":  ["начинани", "початок", "начало", "старт", "новое дело"],
    "ремонт":   ["ремонт", "будівництв", "строительств"],
    "творчість":["творч", "искусств", "мистецтв", "музык", "малюван"],
}

GOOD_MARKERS = [
    "благоприятн", "сприятлив", "хорош", "рекоменд", "можно", "можна",
    "✅", "✓", "👍", "🟢", "подходит", "підходить",
]
BAD_MARKERS = [
    "неблагоприятн", "несприятлив", "избегай", "уникай", "нельзя", "не можна",
    "❌", "✗", "⛔", "🔴", "🚫", "сложн", "препятстви", "риск",
]

TIME_RE = re.compile(r"\b(\d{1,2})[:\.](\d{2})\s*[-–—]\s*(\d{1,2})[:\.](\d{2})\b")


def extract_date(text: str, fallback: datetime) -> str | None:
    t = text[:400]
    # Числовий формат
    m = re.search(DATE_PATTERNS[0], t)
    if m:
        try:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if y < 100:
                y += 2000
            if 1 <= mo <= 12 and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"
        except Exception:
            pass
    # Місяць словом
    m = re.search(DATE_PATTERNS[1], t, re.IGNORECASE)
    if m:
        d = int(m.group(1))
        mo_str = m.group(2).lower()[:6]
        mo = next((v for k, v in MONTH_MAP.items() if mo_str.startswith(k[:4])), None)
        y = int(m.group(3)) if m.group(3) else fallback.year
        if mo:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    return fallback.strftime("%Y-%m-%d")


def detect_post_type(text: str) -> str:
    t = text.lower()
    for ptype, kws in POST_TYPES.items():
        if any(kw in t for kw in kws):
            return ptype
    return "other"


def extract_planets(text: str) -> list:
    t = text.lower()
    found = []
    for planet, kws in PLANETS.items():
        if any(kw in t for kw in kws):
            found.append(planet)
    return found


def extract_astro_terms(text: str) -> list:
    t = text.lower()
    found = []
    for term, kws in ASTRO_TERMS.items():
        if any(kw in t for kw in kws):
            found.append(term)
    return found


def extract_domains(text: str) -> list:
    t = text.lower()
    found = []
    for tag, kws in DOMAIN_TAGS.items():
        if any(kw in t for kw in kws):
            found.append(tag)
    return found


def extract_good_avoid(text: str) -> tuple[list, list]:
    """Простий rule-based витяг: рядки з маркерами."""
    good, avoid = [], []
    for line in text.split("\n"):
        l = line.strip()
        if not l:
            continue
        has_good = any(m in l.lower() for m in GOOD_MARKERS)
        has_bad = any(m in l.lower() for m in BAD_MARKERS)
        # Витягти домен-теги з рядка
        tags = extract_domains(l)
        if has_good and not has_bad and tags:
            good.extend(tags)
        elif has_bad and not has_good and tags:
            avoid.extend(tags)
    return list(set(good)), list(set(avoid))


def extract_time_windows(text: str, sentiment_context: str = "bad") -> tuple[list, list]:
    """Витягнути часові вікна + контекст (добрий/поганий)."""
    good_windows, bad_windows = [], []
    lines = text.split("\n")
    for line in lines:
        matches = TIME_RE.findall(line)
        if not matches:
            continue
        windows = [f"{h1}:{m1}-{h2}:{m2}" for h1, m1, h2, m2 in matches]
        l = line.lower()
        is_bad = any(m in l for m in BAD_MARKERS) or "избегай" in l or "уникай" in l
        is_good = any(m in l for m in GOOD_MARKERS)
        for w in windows:
            if is_bad:
                bad_windows.append(w)
            elif is_good:
                good_windows.append(w)
            else:
                bad_windows.append(w)  # default: вікна зазвичай попередження
    return list(set(good_windows)), list(set(bad_windows))


def estimate_score(text: str) -> tuple[int | None, str]:
    """
    Спроба витягнути pdf_equivalent_score (-3..+3).
    Логіка: підрахунок pos/neg маркерів по рядках.
    Не сентимент — а структурна оцінка.
    """
    lines = [l.strip().lower() for l in text.split("\n") if l.strip()]
    pos, neg = 0, 0
    for line in lines:
        has_good = any(m in line for m in GOOD_MARKERS)
        has_bad = any(m in line for m in BAD_MARKERS)
        if has_good and not has_bad:
            pos += 1
        elif has_bad and not has_good:
            neg += 1

    total = pos + neg
    if total == 0:
        return None, "neutral"

    ratio = (pos - neg) / total
    if ratio >= 0.6:
        score, sent = 2, "positive"
    elif ratio >= 0.2:
        score, sent = 1, "positive"
    elif ratio <= -0.6:
        score, sent = -2, "negative"
    elif ratio <= -0.2:
        score, sent = -1, "negative"
    else:
        score, sent = 0, "mixed"

    return score, sent


def parse_posts():
    if not RAW_FILE.exists():
        print("[parse] raw_posts.json не знайдено")
        return []

    with open(RAW_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    ocr_cache = {}
    if OCR_CACHE.exists():
        with open(OCR_CACHE, encoding="utf-8") as f:
            ocr_cache = json.load(f)

    results = []
    for post in raw:
        rec = empty_record()
        rec["message_id"] = post["message_id"]
        rec["post_datetime"] = post["post_datetime"]

        # Зібрати текст
        text_parts = []
        if post.get("text"):
            text_parts.append(post["text"])
            rec["source"] = "text"
        if post.get("caption") and post["caption"] != post.get("text"):
            text_parts.append(post["caption"])

        mid = str(post["message_id"])
        if mid in ocr_cache and ocr_cache[mid]:
            text_parts.append(ocr_cache[mid])
            rec["ocr_text"] = ocr_cache[mid]
            rec["source"] = "both" if text_parts else "ocr"

        if not text_parts:
            continue  # порожній пост

        full = "\n".join(text_parts)
        rec["full_text"] = full

        # Парсинг
        fallback_dt = datetime.fromisoformat(post["post_datetime"])
        rec["forecast_date"] = extract_date(full, fallback_dt)
        rec["post_type"] = detect_post_type(full)
        rec["planet_mentions"] = extract_planets(full)
        rec["astro_terms"] = extract_astro_terms(full)
        rec["domain_tags"] = extract_domains(full)
        rec["good_for"], rec["avoid"] = extract_good_avoid(full)
        rec["time_windows_good"], rec["time_windows_bad"] = extract_time_windows(full)
        rec["pdf_equivalent_score"], rec["global_sentiment"] = estimate_score(full)

        if post.get("image_file"):
            rec["image_paths"] = [post["image_file"]]

        results.append(rec)

    with open(PARSED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"[parse] {len(results)} записів → {PARSED_FILE}")
    return results


# ── STAGE 4: GT MATCHER + AUDIT REPORT ───────────────────────────────────────
def stage_audit():
    if not PARSED_FILE.exists():
        print("[audit] parsed_posts.json не знайдено. Спочатку --parse")
        return

    with open(PARSED_FILE, encoding="utf-8") as f:
        parsed = json.load(f)

    # Завантажити GT
    gt_by_date = {}
    if GT_FILE.exists():
        with open(GT_FILE, encoding="utf-8") as f:
            gt_data = json.load(f)
        # Підтримка різних форматів
        items = gt_data if isinstance(gt_data, list) else gt_data.get("entries", [])
        for item in items:
            d = item.get("date") or item.get("date_str")
            if d:
                gt_by_date[d] = item

    # Завантажити engine scores
    engine_by_date = {}
    if ENGINE_FILE.exists():
        with open(ENGINE_FILE, encoding="utf-8") as f:
            eng = json.load(f)
        items = eng if isinstance(eng, list) else eng.get("scores", [])
        for item in items:
            d = item.get("date") or item.get("date_str")
            if d:
                engine_by_date[d] = item

    rows = []
    conflicts = []

    for rec in parsed:
        date = rec.get("forecast_date")
        if not date:
            continue

        gt = gt_by_date.get(date, {})
        eng = engine_by_date.get(date, {})

        gt_score = gt.get("expert_eng") or gt.get("gt_score") or gt.get("score")
        eng_score = eng.get("final_score") or eng.get("score")
        tg_score = rec.get("pdf_equivalent_score")

        # Sign agreement
        def sign(x):
            if x is None:
                return None
            return 1 if x > 0 else (-1 if x < 0 else 0)

        gt_sign = sign(gt_score)
        eng_sign = sign(eng_score)
        tg_sign = sign(tg_score)

        tg_gt_agree = (tg_sign == gt_sign) if (tg_sign is not None and gt_sign is not None) else None
        tg_eng_agree = (tg_sign == eng_sign) if (tg_sign is not None and eng_sign is not None) else None

        row = {
            "date": date,
            "post_type": rec.get("post_type"),
            "tg_score": tg_score,
            "gt_score": gt_score,
            "engine_score": eng_score,
            "tg_sentiment": rec.get("global_sentiment"),
            "tg_gt_sign_agree": tg_gt_agree,
            "tg_eng_sign_agree": tg_eng_agree,
            "tg_good_for": ";".join(rec.get("good_for", [])),
            "tg_avoid": ";".join(rec.get("avoid", [])),
            "tg_time_bad": ";".join(rec.get("time_windows_bad", [])),
            "tg_time_good": ";".join(rec.get("time_windows_good", [])),
            "planets": ";".join(rec.get("planet_mentions", [])),
            "astro_terms": ";".join(rec.get("astro_terms", [])),
            "source": rec.get("source"),
            "has_ocr": bool(rec.get("ocr_text")),
        }
        rows.append(row)

        # Конфлікт: TG vs GT знак різний
        if tg_gt_agree is False:
            conflicts.append({
                "date": date,
                "tg_score": tg_score,
                "gt_score": gt_score,
                "engine_score": eng_score,
                "text_preview": rec.get("full_text", "")[:200],
            })

    # CSV
    if rows:
        with open(AUDIT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        print(f"[audit] {len(rows)} рядків → {AUDIT_CSV}")

    # JSON conflicts
    with open(AUDIT_JSON, "w", encoding="utf-8") as f:
        json.dump(conflicts, f, ensure_ascii=False, indent=2)

    # Статистика
    matched = [r for r in rows if r["gt_score"] is not None]
    agreed = [r for r in matched if r["tg_gt_sign_agree"] is True]
    print(f"\n── AUDIT-7 SUMMARY ──────────────────────────────")
    print(f"  Всього постів спарсено:    {len(rows)}")
    print(f"  Зіставлено з GT:           {len(matched)}")
    print(f"  TG↔GT sign agree:          {len(agreed)}/{len(matched)} = "
          f"{len(agreed)/len(matched)*100:.1f}%" if matched else "  TG↔GT: немає даних")
    print(f"  Конфліктів TG≠GT:          {len(conflicts)}")
    print(f"  З OCR-текстом:             {sum(1 for r in rows if r['has_ocr'])}")
    print(f"─────────────────────────────────────────────────\n")


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Tarita AUDIT-7 ETL")
    parser.add_argument("--ingest", action="store_true")
    parser.add_argument("--ocr", action="store_true")
    parser.add_argument("--parse", action="store_true")
    parser.add_argument("--audit", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    if args.all or args.ingest:
        api_id = int(input("Telegram API ID: ").strip())
        api_hash = input("Telegram API Hash: ").strip()
        asyncio.run(stage_ingest(api_id, api_hash))

    if args.all or args.ocr:
        stage_ocr()

    if args.all or args.parse:
        parse_posts()

    if args.all or args.audit:
        stage_audit()

    if not any(vars(args).values()):
        parser.print_help()


if __name__ == "__main__":
    main()
