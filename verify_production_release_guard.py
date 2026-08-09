from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def release_bytes(path: Path) -> bytes:
    """Return the exact bytes Git will publish, including staged changes."""
    rel = path.relative_to(ROOT).as_posix()
    if (ROOT / ".git").exists():
        try:
            return subprocess.check_output(
                ["git", "-C", str(ROOT), "show", f":{rel}"],
                stderr=subprocess.DEVNULL,
            )
        except (OSError, subprocess.CalledProcessError):
            pass
    return path.read_bytes()


def md5_12(path: Path) -> str:
    return hashlib.md5(release_bytes(path)).hexdigest().upper()[:12]


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"FAIL {label}: missing {needle!r}")


def main() -> None:
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    require(index, './engine_tag_parser.js', 'root parser script')
    require(index, "loadAliasSpec('./engine_tag_aliases_v1.json')", 'root alias loader')
    require(index, 'const TOKEN_THEMES', 'root token themes')
    require(index, 'EngineTagParser.parseTagTokens', 'root token parser')
    require(index, 'decisionScore:operationalScore', 'operational score export')
    require(index, 'resolveSlotDecision({', 'canonical per-slot resolver')
    require(index, "seg.setAttribute('data-gval', 'БЛОК')", 'blocked heat-slot label')
    require(index, 'REFERENCE · НЕ РІШЕННЯ ДЛЯ ДІЇ', '27-day reference disclosure')
    require(index, 'Нейтральний Pᵢ не скасовує eᵢ, бурю або часову заборону', 'Panchanga net-context disclosure')
    require(index, 'Оперативно СТОП: PDF reference', 'operational-first Hero conflict wording')
    require(index, 'Оперативний стан ${_op179} має пріоритет:', 'personal cycle safety gate')
    require(index, 'окрема порада призупинена через глобальний ризик', 'personal cycle positive-advice suppression')
    require(index, 'PDF/Engine reference, не оперативне рішення', '27-day reference-only caption')
    require(index, "'Історична подія NOAA'", 'inactive NOAA historical label')
    require(index, 'Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA time-first label')
    forbidden = {
        'decisionScore:dayScore': 'PDF reference leaked into operational score',
        'Для рішень головний PDF/Engine': 'misleading PDF-first instruction',
        'ФІНАЛЬНЕ РІШЕННЯ · PDF/ENGINE': 'misleading 27-day final-decision badge',
        "seg.setAttribute('data-gval', `${_heatDecision": 'one day score stamped on every heat slot',
        'День сильний за PDF': 'misleading PDF-first Hero headline',
        'Головний показник.': 'misleading PDF-first 27-day tooltip',
        'червоний/зелений = PDF/Engine-рішення': 'misleading 27-day decision caption',
    }
    for needle, label in forbidden.items():
        if needle in index:
            raise SystemExit(f'FAIL {label}: found {needle!r}')
    require(index, '<link rel="canonical" href="https://nikolaevkirill-commits.github.io/g-index/"', 'canonical root URL')
    require(index, '<meta property="og:url" content="https://nikolaevkirill-commits.github.io/g-index/"', 'OG root URL')
    if 'https://nikolaevkirill-commits.github.io/g-index/deploy/' in index:
        raise SystemExit('FAIL root metadata still points at deprecated /deploy/')

    nested = (ROOT / 'deploy' / 'index.html').read_text(encoding='utf-8')
    nested_sw = (ROOT / 'deploy' / 'sw.js').read_text(encoding='utf-8')
    require(nested, "new URL('../', window.location.href)", 'nested redirect')
    require(nested_sw, 'unregister', 'nested service-worker unregister')
    require(nested_sw, "new URL('../', event.request.url)", 'nested service-worker redirect')

    sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
    require(sw, "event.data.type === 'SKIP_WAITING'", 'service-worker manual update handler')
    require(sw, 'self.skipWaiting()', 'service-worker activation call')

    manifest_path = ROOT / 'data_manifest.json'
    manifest = json.loads(release_bytes(manifest_path).decode('utf-8'))
    mapping = {
        'expert_overrides': 'expert_overrides_v3.json',
        'expert_calc': 'expert_calc_scores.json',
        'future_kp': 'future_kp.json',
        'engine_scores': 'engine_scores.json',
    }
    for field, rel in mapping.items():
        actual = md5_12(ROOT / rel)
        expected = manifest.get(field)
        if expected != actual:
            raise SystemExit(f'FAIL manifest {field}: expected={expected} actual={actual}')
        print(f'PASS manifest {field}: {actual}')

    print('PASS production release guard')


if __name__ == '__main__':
    main()
