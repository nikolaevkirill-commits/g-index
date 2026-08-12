from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
FINAL = ROOT / "final"
FEATURE_SOURCE = SOURCE / "neborytm-feature-background-v1.png"
ICON_SOURCE = SOURCE / "neborytm-icon-source-v1.png"
FEATURE_OUT = FINAL / "neborytm-feature-graphic-1024x500-v1.png"
ICON_512_OUT = FINAL / "neborytm-icon-512-v1.png"
ICON_192_OUT = FINAL / "neborytm-icon-192-v1.png"
MANIFEST = ROOT / "STORE_ASSET_PROVENANCE_v1.json"
FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")


def cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.5) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = round((resized.width - size[0]) * focus_x)
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def metadata(kind: str) -> PngImagePlugin.PngInfo:
    info = PngImagePlugin.PngInfo()
    info.add_text("Title", f"Neborytm {kind} v1")
    info.add_text("Copyright", "Copyright 2026 Kyrylo Nikolaiev. All rights reserved.")
    info.add_text("Provenance", "Original OpenAI ImageGen source; deterministic local Pillow composition.")
    return info


def build_feature() -> None:
    background = cover(Image.open(FEATURE_SOURCE).convert("RGB"), (1024, 500), focus_x=0.52)
    overlay = Image.new("RGBA", background.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((42, 52, 505, 448), radius=30, fill=(6, 16, 35, 218), outline=(72, 221, 201, 105), width=2)
    draw.rectangle((78, 99, 134, 105), fill=(78, 224, 204, 255))
    title = ImageFont.truetype(str(FONT_SEMIBOLD), 70)
    slogan = ImageFont.truetype(str(FONT_SEMIBOLD), 28)
    body = ImageFont.truetype(str(FONT_REGULAR), 22)
    small = ImageFont.truetype(str(FONT_REGULAR), 18)
    draw.text((76, 118), "Неборитм", font=title, fill=(244, 248, 255, 255))
    draw.text((79, 215), "Небо. Час. Твій ритм.", font=slogan, fill=(247, 190, 79, 255))
    draw.text((79, 281), "Космічна погода • Панчанга", font=body, fill=(195, 239, 235, 255))
    draw.text((79, 327), "Пояснення факторів", font=small, fill=(216, 227, 242, 255))
    draw.text((79, 359), "Рішення без паніки", font=small, fill=(216, 227, 242, 255))
    composed = Image.alpha_composite(background.convert("RGBA"), overlay).convert("RGB")
    composed.save(FEATURE_OUT, pnginfo=metadata("feature graphic"), optimize=True)


def build_icons() -> None:
    source = Image.open(ICON_SOURCE).convert("RGB")
    square = cover(source, (512, 512), focus_x=0.5)
    square.save(ICON_512_OUT, pnginfo=metadata("icon 512"), optimize=True)
    square.resize((192, 192), Image.Resampling.LANCZOS).save(
        ICON_192_OUT, pnginfo=metadata("icon 192"), optimize=True
    )


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_manifest() -> None:
    entries = []
    for path, size, role in (
        (FEATURE_OUT, [1024, 500], "google_play_feature_graphic"),
        (ICON_512_OUT, [512, 512], "google_play_app_icon_candidate"),
        (ICON_192_OUT, [192, 192], "pwa_icon_candidate"),
    ):
        entries.append({"file": str(path.relative_to(ROOT)).replace("\\", "/"), "role": role, "pixels": size, "sha256": sha256(path)})
    payload = {
        "schema": "neborytm_store_asset_provenance_v1",
        "generated_at": "2026-08-12",
        "brand": "Неборитм",
        "copyright": "Copyright 2026 Kyrylo Nikolaiev. All rights reserved.",
        "source_files": [
            {"file": "source/neborytm-feature-background-v1.png", "generator": "OpenAI ImageGen"},
            {"file": "source/neborytm-icon-source-v1.png", "generator": "OpenAI ImageGen"},
        ],
        "outputs": entries,
    }
    MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    FINAL.mkdir(parents=True, exist_ok=True)
    if not FEATURE_SOURCE.is_file() or not ICON_SOURCE.is_file():
        raise SystemExit("Missing ImageGen source asset(s).")
    build_feature()
    build_icons()
    write_manifest()
    print(json.dumps({"status": "PASS", "outputs": 3}, ensure_ascii=False))


if __name__ == "__main__":
    main()
