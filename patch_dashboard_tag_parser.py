#!/usr/bin/env python3
"""Wire the shared Engine tag alias contract into deploy/index.html.

The patch is exact-match/idempotent and branch-safe. It adds the shared JS
parser, loads the single JSON alias spec in the existing Engine loader, and
routes the day-theme tag interpretation through canonical tokens.
"""
from __future__ import annotations

import argparse
from pathlib import Path

SCRIPT_OLD = """<script>\n// ═══ Probability Layer v1 (bootstrap logistic, G-Index) ════════════════════"""
SCRIPT_NEW = """<script src=\"../engine_tag_parser.js\"></script>\n<script>\n// ═══ Probability Layer v1 (bootstrap logistic, G-Index) ════════════════════"""

LOADER_OLD = """async function loadEngineScores(){\n  if(_engineScores !== null) return _engineScores;\n  try {\n    const resp = await fetch('engine_scores.json', { cache: 'default' });"""
LOADER_NEW = """async function loadEngineScores(){\n  // fp-correctness: Engine, validator and UI share one alias contract.\n  if(window.EngineTagParser && !window._engineTagAliasSpec){\n    try {\n      window._engineTagAliasSpec = await window.EngineTagParser.loadAliasSpec('../engine_tag_aliases_v1.json');\n    } catch(aliasErr){\n      console.warn('[engine-tags] alias spec unavailable; legacy UI fallback active:', aliasErr.message);\n    }\n  }\n  if(_engineScores !== null) return _engineScores;\n  try {\n    const resp = await fetch('engine_scores.json', { cache: 'default' });"""

THEMES_OLD = """  const TAG_THEMES = {'✈':'переміщення і логістики','⊕':'лікування і відновлення','💊':'лікування і відновлення','📚':'навчання і розвитку','❤':'стосунків і комунікацій','⚡':'уважності (підвищений ризик)','✂':'завершення і відсікання зайвого'};\n  const themes = Object.entries(TAG_THEMES).filter(([s])=>tag.includes(s)).map(([,p])=>p);"""
THEMES_NEW = """  const TOKEN_THEMES = {\n    plane:'переміщення і логістики',\n    plus:'лікування і відновлення',\n    med:'лікування і відновлення',\n    study:'навчання і розвитку',\n    heart:'стосунків і комунікацій',\n    bolt:'уважності (підвищений ризик)',\n    scissors:'завершення і відсікання зайвого'\n  };\n  let themes = [];\n  if(window.EngineTagParser && window._engineTagAliasSpec){\n    const _tokens = window.EngineTagParser.parseTagTokens(tag, window._engineTagAliasSpec);\n    themes = [...new Set(_tokens.map(t=>TOKEN_THEMES[t]).filter(Boolean))];\n  } else {\n    // Fail-soft display fallback only; canonical Engine scoring does not use this branch.\n    const _legacyThemes = {'✈':'переміщення і логістики','⊕':'лікування і відновлення','💊':'лікування і відновлення','📚':'навчання і розвитку','❤':'стосунків і комунікацій','⚡':'уважності (підвищений ризик)','✂':'завершення і відсікання зайвого'};\n    themes = [...new Set(Object.entries(_legacyThemes).filter(([s])=>tag.includes(s)).map(([,p])=>p))];\n  }"""


def replace_contract(text: str, old: str, new: str, name: str) -> tuple[str, bool]:
    old_n = text.count(old)
    new_n = text.count(new)
    # Some OLD fragments are intentionally contained inside NEW. Therefore
    # seeing exactly one complete NEW contract means the file is already
    # patched even if OLD also appears as a substring of that NEW block.
    if new_n == 1:
        return text, False
    if old_n == 1 and new_n == 0:
        return text.replace(old, new, 1), True
    raise RuntimeError(f"{name} contract mismatch: old={old_n}, new={new_n}")


def patch_text(text: str) -> tuple[str, bool]:
    changed = False
    for old, new, name in [
        (SCRIPT_OLD, SCRIPT_NEW, 'parser script'),
        (LOADER_OLD, LOADER_NEW, 'alias loader'),
        (THEMES_OLD, THEMES_NEW, 'theme parser'),
    ]:
        text, did = replace_contract(text, old, new, name)
        changed = changed or did
    return text, changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('path', nargs='?', default='deploy/index.html')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    path = Path(args.path)
    original = path.read_text(encoding='utf-8')
    patched, changed = patch_text(original)
    if args.check:
        print('dashboard tag-parser: NEEDS_PATCH' if changed else 'dashboard tag-parser: OK')
        return 0
    if changed:
        path.write_text(patched, encoding='utf-8')
        print(f'patched {path}')
    else:
        print(f'already patched {path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
