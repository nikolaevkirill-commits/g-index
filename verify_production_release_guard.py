from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def md5_12(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest().upper()[:12]


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"FAIL {label}: missing {needle!r}")


def main() -> None:
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    require(index, './engine_tag_parser.js', 'root parser script')
    require(index, "loadAliasSpec('./engine_tag_aliases_v1.json')", 'root alias loader')
    require(index, 'const TOKEN_THEMES', 'root token themes')
    require(index, 'EngineTagParser.parseTagTokens', 'root token parser')
    require(index, '<link rel="canonical" href="https://nikolaevkirill-commits.github.io/g-index/"', 'canonical root URL')
    require(index, '<meta property="og:url" content="https://nikolaevkirill-commits.github.io/g-index/"', 'OG root URL')
    if 'https://nikolaevkirill-commits.github.io/g-index/deploy/' in index:
        raise SystemExit('FAIL root metadata still points at deprecated /deploy/')

    nested = (ROOT / 'deploy' / 'index.html').read_text(encoding='utf-8')
    nested_sw = (ROOT / 'deploy' / 'sw.js').read_text(encoding='utf-8')
    require(nested, "new URL('../', window.location.href)", 'nested redirect')
    require(nested_sw, 'unregister', 'nested service-worker unregister')
    require(nested_sw, "new URL('../', event.request.url)", 'nested service-worker redirect')

    manifest_path = ROOT / 'data_manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
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
