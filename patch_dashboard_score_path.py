#!/usr/bin/env python3
"""Patch the single audited dashboard Engine-score bypass.

Post-freeze correctness only. This script does not change scoring rules; it
routes the trend tooltip through getEngineScore(), the dashboard's canonical
score hierarchy, instead of reading _engineScores[date].eng directly.
"""
from __future__ import annotations

import argparse
from pathlib import Path

OLD = """      // Engine snapshot — навіть для days без expert override (для tooltip info)\n      if (typeof _engineScores !== 'undefined' && _engineScores && _engineScores[d.ds]){\n        const _eng = _engineScores[d.ds];\n        if (_eng && isFinite(_eng.eng)) d.engineEng = _eng.eng;\n      }"""

NEW = """      // fp-correctness: tooltip Engine score must use the canonical hierarchy.\n      // Direct _engineScores[d.ds].eng bypassed expert_calc / verified overrides.\n      if (typeof getEngineScore === 'function'){\n        const _eng = getEngineScore(new Date(d.ds + 'T12:00:00Z'));\n        if (_eng && isFinite(_eng.eng)) d.engineEng = _eng.eng;\n      }"""

OLD_LABEL = """PDF Engine: ${d.engineEng >= 0 ? '+' : ''}${d.engineEng} (v18.5)"""
NEW_LABEL = """Engine: ${d.engineEng >= 0 ? '+' : ''}${d.engineEng} (canonical)"""


def patch_text(text: str) -> tuple[str, bool]:
    old_count = text.count(OLD)
    new_count = text.count(NEW)
    if old_count == 1 and new_count == 0:
        text = text.replace(OLD, NEW, 1)
        changed = True
    elif old_count == 0 and new_count == 1:
        changed = False
    else:
        raise RuntimeError(
            f"score-path patch contract mismatch: old={old_count}, new={new_count}"
        )

    old_label_count = text.count(OLD_LABEL)
    new_label_count = text.count(NEW_LABEL)
    if old_label_count == 1 and new_label_count == 0:
        text = text.replace(OLD_LABEL, NEW_LABEL, 1)
        changed = True
    elif old_label_count == 0 and new_label_count == 1:
        pass
    else:
        raise RuntimeError(
            f"tooltip label contract mismatch: old={old_label_count}, new={new_label_count}"
        )
    return text, changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="deploy/index.html")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    path = Path(args.path)
    original = path.read_text(encoding="utf-8")
    patched, changed = patch_text(original)
    if args.check:
        print("dashboard score-path: NEEDS_PATCH" if changed else "dashboard score-path: OK")
        return 0
    if changed:
        path.write_text(patched, encoding="utf-8")
        print(f"patched {path}")
    else:
        print(f"already patched {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
