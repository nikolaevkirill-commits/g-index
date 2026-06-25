#!/usr/bin/env python3
"""
chrono_analyze.py — аналіз Chrono Journal згідно CHRONO_PREREGISTRATION v1.0
БЛОКУЄ аналіз при n<10 (правило чесності).
Тести: Mann-Whitney U (H1), Spearman (H2), α=0.025.

Запуск:
  python chrono_analyze.py              # аналіз (блокується n<10)
  python chrono_analyze.py --status     # тільки прогрес збору
"""
import csv, sys

CSV = 'chrono_v1.csv'
ALPHA = 0.025
MIN_N = 10
CHECKPOINT = 30

def load():
    rows = []
    with open(CSV, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip(): continue
            break
        # re-read properly
    with open(CSV, encoding='utf-8') as f:
        lines = [l for l in f if not l.startswith('#') and l.strip()]
    reader = csv.DictReader(lines)
    for r in reader:
        rows.append(r)
    return rows

def valid_rows(rows):
    """Дні з повним outcome (axis_a..d заповнені) і forecast."""
    out = []
    for r in rows:
        try:
            a = r['axis_a'].strip()
            if a == '': continue
            axes = [float(r[f'axis_{x}']) for x in 'abcd']
            g = r['g_day'].strip()
            if g == '': continue
            g_val = float(g.replace('+',''))
            # blind check: пропускаємо записи де знали forecast
            note = r.get('note','').lower()
            blind_violated = 'knew g' in note or 'synthetic all day' in note
            out.append({
                'date': r['date'],
                'outcome': sum(axes)/4,
                'g': g_val,
                'blind_ok': not blind_violated,
            })
        except (ValueError, KeyError):
            continue
    return out

def status(rows):
    v = valid_rows(rows)
    blind = [x for x in v if x['blind_ok']]
    print(f"=== CHRONO STATUS ===")
    print(f"Всього рядків: {len(rows)}")
    print(f"З повним outcome+forecast: {len(v)}")
    print(f"З них blind-valid: {len(blind)}")
    print(f"Прогрес до checkpoint (n=30): {len(blind)}/30")
    print(f"Прогрес до min-аналізу (n=10): {len(blind)}/10")
    if len(blind) < MIN_N:
        print(f"\n⏳ Аналіз ЗАБЛОКОВАНО (правило: не дивитись r при n<10)")
        print(f"   Потрібно ще {MIN_N - len(blind)} blind-valid днів")
    return len(blind)

def analyze(rows):
    v = [x for x in valid_rows(rows) if x['blind_ok']]
    if len(v) < MIN_N:
        print(f"⛔ ЗАБЛОКОВАНО: n={len(v)} < {MIN_N}")
        print("Правило preregistration: не дивитись на результат при n<10.")
        sys.exit(1)

    try:
        from scipy.stats import mannwhitneyu, spearmanr
    except ImportError:
        print("scipy потрібен: pip install scipy --break-system-packages")
        sys.exit(1)

    bad  = [x['outcome'] for x in v if x['g'] <= -2]
    good = [x['outcome'] for x in v if x['g'] >= 2]

    print(f"=== CHRONO ANALYSIS (n={len(v)}) ===\n")
    print(f"Bad days (G≤-2): n={len(bad)}, mean_O={sum(bad)/len(bad):.2f}" if bad else "Bad days: 0")
    print(f"Good days (G≥+2): n={len(good)}, mean_O={sum(good)/len(good):.2f}" if good else "Good days: 0")

    # H1: Mann-Whitney
    if len(bad) >= 3 and len(good) >= 3:
        u, p = mannwhitneyu(good, bad, alternative='greater')
        print(f"\nH1 (Mann-Whitney, O_good > O_bad):")
        print(f"  U={u:.1f}, p={p:.4f}")
        print(f"  {'✅ ПІДТВЕРДЖЕНА' if p < ALPHA else '❌ H0 не відхилена'} (α={ALPHA})")
    else:
        print(f"\nH1: недостатньо днів у групах (bad={len(bad)}, good={len(good)})")

    # H2: Spearman
    gs = [x['g'] for x in v]
    os_ = [x['outcome'] for x in v]
    rho, p2 = spearmanr(gs, os_)
    print(f"\nH2 (Spearman ρ(G, O) > 0):")
    print(f"  ρ={rho:.3f}, p={p2:.4f}")
    print(f"  {'✅ ПІДТВЕРДЖЕНА' if (p2 < ALPHA and rho > 0) else '❌ не значуще'} (α={ALPHA})")

    if len(v) < CHECKPOINT:
        print(f"\n⚠ n={len(v)} < checkpoint {CHECKPOINT}. Попередній результат, продовжити збір.")

if __name__ == '__main__':
    rows = load()
    if '--status' in sys.argv:
        status(rows)
    else:
        n = status(rows)
        print()
        if n >= MIN_N:
            analyze(rows)
