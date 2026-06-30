#!/usr/bin/env python3
"""
run_candidate_tests.py — Retest shortlist via canonical harness

Re-validates ALL prior session "findings" against the canonical dataset
(n=212) using the locked loader from run_canonical_benchmark.py. No
candidate is accepted into V19 backlog without passing through this script.

Usage:
    python run_candidate_tests.py
    python run_candidate_tests.py --engine-scores /path/to/engine_scores.json
"""

import sys
import argparse
from pathlib import Path

import pandas as pd
import numpy as np
from scipy.stats import mannwhitneyu
from sklearn.tree import DecisionTreeClassifier

# Reuse the canonical loader — single source of truth, no copy-paste drift
from run_canonical_benchmark import (
    load_canonical_dataset, sanity_check, to3, ALL_SYMBOLS, SPLIT_DATE,
)


def test_binary_feature(canonical, feature_col, label):
    """
    Mann-Whitney U test: does feature presence shift target3 distribution?
    Returns dict with n, baseline, group_mean, p_value, verdict.
    """
    valid = canonical.dropna(subset=[feature_col, 'target3'])
    has = valid[valid[feature_col] == 1]['target3']
    has_not = valid[valid[feature_col] == 0]['target3']

    n_has = len(has)
    if n_has < 5:
        return {
            'candidate': label, 'n': n_has, 'baseline': np.nan,
            'group_mean': np.nan, 'lift': np.nan, 'p_value': np.nan,
            'verdict': 'INSUFFICIENT_N (<5)',
        }

    baseline_mean = valid['target3'].mean()
    group_mean = has.mean()
    lift = group_mean - baseline_mean

    try:
        _, p = mannwhitneyu(has, has_not, alternative='two-sided')
    except ValueError:
        p = np.nan

    if pd.isna(p):
        verdict = 'TEST_FAILED'
    elif p < 0.01:
        verdict = 'VALIDATED ***'
    elif p < 0.05:
        verdict = 'VALIDATED *'
    elif p < 0.10:
        verdict = 'WEAK (p<0.10)'
    else:
        verdict = 'REJECTED (ns)'

    return {
        'candidate': label, 'n': n_has, 'baseline': baseline_mean,
        'group_mean': group_mean, 'lift': lift, 'p_value': p,
        'verdict': verdict,
    }


def test_streak_holdout_lift(canonical):
    """
    Re-run the neg_streak_lag holdout test exactly as in
    run_canonical_benchmark.py, but isolated here for the summary table.
    """
    feats_base = [
        'tithi', 'nakshatra', 'yoga', 'n_symbols', 'nak_changed',
        'sym_ekadashi', 'sym_amavasya', 'sym_purnima',
        'sym_masik_shivaratri', 'sym_ravi_yoga',
        'sym_mercury_retro', 'sym_saturn_retro',
    ]
    feats_with = feats_base + ['neg_streak_lag']
    valid = canonical.dropna(subset=feats_with + ['target3'])
    train = valid[valid['date'] < SPLIT_DATE]
    test = valid[valid['date'] >= SPLIT_DATE]

    if len(test) < 10:
        return {
            'candidate': 'neg_streak_lag (holdout lift)', 'n': len(test),
            'baseline': np.nan, 'group_mean': np.nan, 'lift': np.nan,
            'p_value': np.nan, 'verdict': 'INSUFFICIENT_TEST_N',
        }

    baseline = (test['target3'] == test['target3'].mode()[0]).mean()

    tree_base = DecisionTreeClassifier(max_depth=4, min_samples_leaf=8,
                                         random_state=42)
    tree_base.fit(train[feats_base].fillna(0), train['target3'])
    acc_base = tree_base.score(test[feats_base].fillna(0), test['target3'])

    tree_streak = DecisionTreeClassifier(max_depth=4, min_samples_leaf=8,
                                           random_state=42)
    tree_streak.fit(train[feats_with].fillna(0), train['target3'])
    acc_streak = tree_streak.score(test[feats_with].fillna(0),
                                     test['target3'])

    lift = acc_streak - acc_base
    verdict = 'VALIDATED (holdout)' if lift > 0.02 else (
        'WEAK' if lift > 0 else 'REJECTED')

    return {
        'candidate': 'neg_streak_lag (holdout lift)', 'n': len(test),
        'baseline': baseline, 'group_mean': acc_streak, 'lift': lift,
        'p_value': np.nan, 'verdict': verdict,
    }


def test_causal_only_ml(canonical):
    """
    Causal-only ML baseline (whitelist features per CAUSAL_FEATURE_REGISTRY.md):
    tithi, nakshatra, yoga, cal_symbols. No tags, no bolt, no same-day kp.
    """
    feats = [
        'tithi', 'nakshatra', 'yoga',
    ] + [f'sym_{s}' for s in ALL_SYMBOLS]

    valid = canonical.dropna(subset=feats + ['target3'])
    train = valid[valid['date'] < SPLIT_DATE]
    test = valid[valid['date'] >= SPLIT_DATE]

    if len(test) < 10:
        return {
            'candidate': 'causal-only ML (whitelist)', 'n': len(test),
            'baseline': np.nan, 'group_mean': np.nan, 'lift': np.nan,
            'p_value': np.nan, 'verdict': 'INSUFFICIENT_TEST_N',
        }

    baseline = (test['target3'] == test['target3'].mode()[0]).mean()
    tree = DecisionTreeClassifier(max_depth=4, min_samples_leaf=8,
                                    random_state=42)
    tree.fit(train[feats].fillna(0), train['target3'])
    acc = tree.score(test[feats].fillna(0), test['target3'])
    lift = acc - baseline
    verdict = 'VALIDATED (holdout)' if lift > 0.03 else (
        'WEAK' if lift > 0 else 'REJECTED')

    return {
        'candidate': 'causal-only ML (whitelist)', 'n': len(test),
        'baseline': baseline, 'group_mean': acc, 'lift': lift,
        'p_value': np.nan, 'verdict': verdict,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine-scores',
                          default='/mnt/project/engine_scores.json')
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
        print("❌ Sanity checks failed — candidate retest ABORTED. "
              "Fix the underlying dataset issue first.", file=sys.stderr)
        sys.exit(1)

    print("="*78)
    print("CANDIDATE RETEST SHORTLIST")
    print("="*78 + "\n")

    results = []

    # Symbol-based candidates (Mann-Whitney)
    results.append(test_binary_feature(
        canonical, 'sym_masik_shivaratri', 'masik_shivaratri'))
    results.append(test_binary_feature(
        canonical, 'sym_ravi_yoga', 'ravi_yoga'))
    results.append(test_binary_feature(
        canonical, 'sym_pradosh', 'pradosh'))
    results.append(test_binary_feature(
        canonical, 'sym_ekadashi', 'ekadashi'))
    results.append(test_binary_feature(
        canonical, 'sym_amavasya', 'amavasya'))
    results.append(test_binary_feature(
        canonical, 'sym_purnima', 'purnima'))
    results.append(test_binary_feature(
        canonical, 'sym_navaratri', 'navaratri'))
    results.append(test_binary_feature(
        canonical, 'sym_pitru_paksha', 'pitru_paksha'))

    # Holdout-based candidates (decision tree lift)
    results.append(test_streak_holdout_lift(canonical))
    results.append(test_causal_only_ml(canonical))

    # Print table
    df_results = pd.DataFrame(results)
    df_results['baseline'] = df_results['baseline'].apply(
        lambda x: f"{x:+.3f}" if pd.notna(x) else "—")
    df_results['group_mean'] = df_results['group_mean'].apply(
        lambda x: f"{x:+.3f}" if pd.notna(x) else "—")
    df_results['lift'] = df_results['lift'].apply(
        lambda x: f"{x:+.3f}" if pd.notna(x) else "—")
    df_results['p_value'] = df_results['p_value'].apply(
        lambda x: f"{x:.4f}" if pd.notna(x) else "—")

    col_widths = {'candidate': 26, 'n': 5, 'baseline': 10,
                   'group_mean': 12, 'lift': 9, 'p_value': 9, 'verdict': 22}
    header = "  ".join(f"{c:<{w}}" for c, w in col_widths.items())
    print(header)
    print("-" * len(header))
    for _, row in df_results.iterrows():
        line = "  ".join(
            f"{str(row[c]):<{w}}" for c, w in col_widths.items())
        print(line)

    print(f"\n{'='*78}")
    print("VERDICT SUMMARY")
    print(f"{'='*78}")
    validated = df_results[df_results['verdict'].str.contains(
        'VALIDATED', na=False)]
    weak = df_results[df_results['verdict'].str.contains(
        'WEAK', na=False)]
    rejected = df_results[df_results['verdict'].str.contains(
        'REJECTED', na=False)]
    print(f"VALIDATED candidates ({len(validated)}): "
          f"{', '.join(validated['candidate'].tolist()) or 'none'}")
    print(f"WEAK candidates ({len(weak)}): "
          f"{', '.join(weak['candidate'].tolist()) or 'none'}")
    print(f"REJECTED candidates ({len(rejected)}): "
          f"{', '.join(rejected['candidate'].tolist()) or 'none'}")

    print("\nOnly VALIDATED candidates should be added to V19 backlog. "
          "WEAK candidates stay in research notes, not backlog, until "
          "more data accumulates.")


if __name__ == '__main__':
    main()
