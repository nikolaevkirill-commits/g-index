#!/usr/bin/env python3
"""
run_canonical_benchmark.py — PROGNOZ Research Harness v1

ПРИЗНАЧЕННЯ: єдина точка входу для будь-якого R&D тесту. Захищає від
повторення помилок цієї сесії (circular streak definition, to3(None) bug)
шляхом автоматизованих sanity checks ПЕРЕД будь-яким аналізом.

ПРАВИЛО: жоден новий "прорив" не публікується, поки цей скрипт не
відпрацював без WARNING на цих даних.

Usage:
    python run_canonical_benchmark.py
    python run_canonical_benchmark.py --engine-scores /path/to/engine_scores.json
"""

import json
import sys
import argparse
import hashlib
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

# ═══════════════════════════════════════════════════════════════
# CANONICAL CONSTANTS — locked per AUDIT_ZERO.md, не змінювати
# без explicit перегляду документа і явного rationale
# ═══════════════════════════════════════════════════════════════
EXPECTED_N_CANONICAL = 313
EXPECTED_DATE_MIN = "2025-06-16"
EXPECTED_DATE_MAX = "2026-07-05"
SPLIT_DATE = "2026-01-01"
EXPECTED_TARGET_DIST = {-1.0: 157, 0.0: 35, 1.0: 121}
GT_SOURCE_PATH = "/mnt/project/pdf48_ground_truth_v6.json"

ALL_SYMBOLS = [
    'ravi_yoga', 'amrita_siddhi', 'pushya_nak', 'pradosh', 'navaratri',
    'pitru_paksha', 'maha_shivaratri', 'masik_shivaratri', 'sankranti',
    'ekadashi', 'amavasya', 'purnima', 'mercury_retro', 'saturn_retro',
    'jupiter_retro',
]

WARNINGS = []


def warn(msg):
    """Collect and immediately print warnings — visible, not swallowed."""
    WARNINGS.append(msg)
    print(f"⚠️  WARNING: {msg}", file=sys.stderr)


def to3(s):
    """
    CANONICAL target conversion. THE ONLY CORRECT WAY.

    CRITICAL BUG HISTORY (see AUDIT_ZERO.md + SOURCE_MATRIX_v2.md):
    Bug 1 (Failure 2): `if s is None` does NOT catch np.nan. When pandas
    reads a JSON field that's `null` into a numeric Series, it becomes
    np.nan, not None. Using `is None` silently treated no-GT days as
    target=0 instead of NaN (excluded).
    Bug 2 (Failure 5): even with correct NaN handling, sourcing the GT
    score from `engine_scores.json`'s `pdf` field gave n=212 instead of
    the true n=313, because that field is DESYNCED from the actual GT
    source file (`pdf48_ground_truth_v6.json`) — 150 dates have valid GT
    there but pdf=None in engine_scores. ALWAYS load GT directly from
    pdf48_ground_truth_v6.json, never from engine_scores.json's pdf field.

    ALWAYS use pd.isna(), never `is None`, for pandas data.
    """
    if pd.isna(s):
        return np.nan
    s = float(s)
    return 1 if s > 0 else (-1 if s < 0 else 0)


def load_canonical_dataset(engine_scores_path, gt_path=None):
    """
    Load and build the canonical dataset per AUDIT_ZERO.md + SOURCE_MATRIX_v2.md.

    CRITICAL: GT score is loaded from pdf48_ground_truth_v6.json directly
    (gt_path), NOT from engine_scores.json's 'pdf' field, which is known
    to be desynced (Failure 5 — see SOURCE_MATRIX_v2.md).
    """
    if gt_path is None:
        gt_path = GT_SOURCE_PATH

    with open(engine_scores_path) as f:
        es = json.load(f)
    with open(gt_path) as f:
        gt = json.load(f)

    rows = []
    for date, gt_entry in gt['data'].items():
        es_entry = es['scores'].get(date, {})
        syms = es_entry.get('cal_symbols', [])
        row = {
            'date': date,
            'tithi': es_entry.get('cal_tithi'),
            'nakshatra': es_entry.get('cal_nakshatra'),
            'yoga': es_entry.get('cal_yoga'),
            'pdf': gt_entry.get('score'),  # TRUE GT score, from source file
            'eng': es_entry.get('eng'),
            'kp': es_entry.get('kp'),
            'kp_synthetic': es_entry.get('kp_synthetic', True),
            'n_symbols': len(syms),
        }
        for s in ALL_SYMBOLS:
            row[f'sym_{s}'] = 1 if s in syms else 0
        rows.append(row)

    df = pd.DataFrame(rows)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)

    # THE canonical target — using the correct to3()
    df['target3'] = df['pdf'].apply(to3)

    # Lagged features computed on FULL df (date-continuous), THEN filtered.
    # This preserves correct date-adjacency for lag calculations even
    # though most rows get dropped at the end.
    df['target_lag1'] = df['target3'].shift(1)
    df['nak_prev'] = df['nakshatra'].shift(1)
    df['nak_changed'] = (df['nakshatra'] != df['nak_prev']).astype(float)

    streak = 0
    streaks = []
    for t in df['target_lag1']:
        if pd.isna(t):
            streaks.append(np.nan)
            streak = 0
            continue
        streak = streak + 1 if t == -1 else 0
        streaks.append(streak)
    df['neg_streak_lag'] = streaks

    return df


def sanity_check(canonical):
    """
    Run all sanity checks from AUDIT_ZERO.md section G.
    Returns True if all pass, False (with warnings) otherwise.
    """
    all_ok = True
    n = len(canonical)

    print(f"\n{'='*60}")
    print("SANITY CHECKS (per AUDIT_ZERO.md)")
    print(f"{'='*60}")

    # Check 1: dataset size
    if n != EXPECTED_N_CANONICAL:
        warn(f"n={n}, expected {EXPECTED_N_CANONICAL}. "
             f"Either new PDF GT added (expected, update this file's "
             f"EXPECTED_* constants AND AUDIT_ZERO.md/SOURCE_MATRIX_v2.md "
             f"together with a changelog entry), or a regression of a "
             f"prior bug (to3() np.nan handling, or GT-source desync — "
             f"see SOURCE_MATRIX_v2.md Failure 5).")
        all_ok = False
    else:
        print(f"✅ n = {n} (matches canonical)")

    # Check 2: date range
    dmin = str(canonical['date'].min().date())
    dmax = str(canonical['date'].max().date())
    if dmin != EXPECTED_DATE_MIN:
        warn(f"date_min={dmin}, expected {EXPECTED_DATE_MIN}")
        all_ok = False
    else:
        print(f"✅ date_min = {dmin}")
    if dmax != EXPECTED_DATE_MAX:
        warn(f"date_max={dmax}, expected {EXPECTED_DATE_MAX} "
             f"(if new PDF data added, this is expected — update registry)")
    else:
        print(f"✅ date_max = {dmax}")

    # Check 3: target distribution
    dist = canonical['target3'].value_counts().to_dict()
    if dist != EXPECTED_TARGET_DIST:
        warn(f"target distribution changed: {dist} vs expected "
             f"{EXPECTED_TARGET_DIST}")
        all_ok = False
    else:
        print(f"✅ target distribution matches: {dist}")

    # Check 4: no NaN leakage into target3 for rows that should have it
    nan_count = canonical['target3'].isna().sum()
    if nan_count > 0:
        warn(f"canonical dataset (post-dropna) still has {nan_count} "
             f"NaN target3 values — dropna() failed or was skipped")
        all_ok = False
    else:
        print(f"✅ zero NaN in target3 post-filter")

    print(f"{'='*60}\n")
    return all_ok


def run_benchmark(canonical):
    """Run the canonical RF/Tree benchmark with the locked split."""
    print(f"{'='*60}")
    print("CANONICAL BENCHMARK RUN")
    print(f"{'='*60}\n")

    feats_base = [
        'tithi', 'nakshatra', 'yoga', 'n_symbols', 'nak_changed',
        'sym_ekadashi', 'sym_amavasya', 'sym_purnima',
        'sym_masik_shivaratri', 'sym_ravi_yoga',
        'sym_mercury_retro', 'sym_saturn_retro',
    ]
    feats_with_streak = feats_base + ['neg_streak_lag']

    valid = canonical.dropna(subset=feats_with_streak + ['target3'])
    print(f"Valid rows (has all features + target): n={len(valid)}\n")

    train = valid[valid['date'] < SPLIT_DATE]
    test = valid[valid['date'] >= SPLIT_DATE]
    print(f"Train: n={len(train)} (date < {SPLIT_DATE})")
    print(f"Test:  n={len(test)} (date >= {SPLIT_DATE})")

    if len(test) < 10:
        warn(f"test set too small (n={len(test)}) for reliable holdout "
             f"metrics — results below are LOW CONFIDENCE")

    if len(test) > 0:
        baseline = (test['target3'] == test['target3'].mode()[0]).mean()
        print(f"Test baseline (majority class): {baseline:.1%}\n")
    else:
        baseline = None
        warn("test set is empty — cannot compute baseline or holdout metrics")

    results = {}
    for name, feats in [('base (no streak)', feats_base),
                          ('with neg_streak_lag', feats_with_streak)]:
        Xtr = train[feats].fillna(0)
        ytr = train['target3']
        tree = DecisionTreeClassifier(max_depth=4, min_samples_leaf=8,
                                        random_state=42)
        tree.fit(Xtr, ytr)
        train_acc = tree.score(Xtr, ytr)

        if len(test) > 0:
            Xte = test[feats].fillna(0)
            yte = test['target3']
            test_acc = tree.score(Xte, yte)
        else:
            test_acc = None

        results[name] = {'train_acc': train_acc, 'test_acc': test_acc}
        test_str = f"{test_acc:.1%}" if test_acc is not None else "N/A"
        print(f"{name:25s}: train={train_acc:.1%}  test={test_str}")

    base_test = results['base (no streak)']['test_acc']
    streak_test = results['with neg_streak_lag']['test_acc']
    if base_test is not None and streak_test is not None:
        lift = streak_test - base_test
        print(f"\nneg_streak_lag lift on holdout: {lift:+.1%}")
        if abs(lift) > 0.10:
            warn(f"neg_streak_lag lift ({lift:+.1%}) is unexpectedly large "
                 f"— cross-check against AUDIT_ZERO.md Failure 1/2 before "
                 f"reporting this as a finding")

    print(f"\n{'='*60}\n")
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--engine-scores',
        default='/mnt/project/engine_scores.json',
        help='Path to engine_scores.json',
    )
    args = parser.parse_args()

    path = Path(args.engine_scores)
    if not path.exists():
        print(f"ERROR: {path} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Loading canonical dataset from {path}...")
    df = load_canonical_dataset(path)
    canonical = df.dropna(subset=['target3', 'tithi']).reset_index(drop=True)

    ok = sanity_check(canonical)

    if not ok:
        print("❌ SANITY CHECKS FAILED. Do not publish findings from this "
              "run until warnings above are resolved.", file=sys.stderr)
        print("\nIf the dataset legitimately changed (new PDF GT added), "
              "update EXPECTED_* constants in this file AND in "
              "AUDIT_ZERO.md together, with a dated changelog entry.",
              file=sys.stderr)

    run_benchmark(canonical)

    print(f"Total warnings: {len(WARNINGS)}")
    if WARNINGS:
        print("\nWARNING SUMMARY:")
        for w in WARNINGS:
            print(f"  - {w}")
        sys.exit(1)
    else:
        print("✅ All checks passed. Safe to report findings from this run.")
        sys.exit(0)


if __name__ == '__main__':
    main()
