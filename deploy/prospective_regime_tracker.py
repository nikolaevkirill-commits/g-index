#!/usr/bin/env python3
"""
prospective_regime_tracker.py — НЕциркулярна перевірка regime-reframe.
Коли виходить новий PDF (#54+), міряє точність ОКРЕМО по кожному режиму
на датах, яких НЕ було в навчанні. Це єдиний чесний тест π_k(t).

Usage:
  python prospective_regime_tracker.py --status        # поточний стан
  python prospective_regime_tracker.py --add-pdf FILE  # внести новий GT, заміряти
"""
import json, datetime, argparse
from pathlib import Path
from collections import defaultdict

HERE=Path(__file__).resolve().parent
MASTER=HERE/"daily_master.json"
GT=HERE/"pdf48_ground_truth_v6.json"
LOG=HERE/"prospective_regime_log.json"
FREEZE_START="2026-05-03"  # дати ПІСЛЯ цього = проспективні (поза навчанням frozen engine)

def cls3(x): return 'pos' if x>0 else ('neg' if x<0 else 'neu')

def load(p, default):
    try: return json.loads(Path(p).read_text())
    except: return default

def cmd_status():
    master=load(MASTER,{}).get('days',{})
    gt=load(GT,{}).get('data',{})
    # prospective dates: have engine prediction, GT появився ПІСЛЯ freeze
    prosp=[d for d in gt if d>=FREEZE_START and d in master]
    print(f"\n{'='*55}")
    print(f"ПРОСПЕКТИВНИЙ REGIME TRACKER")
    print(f"{'='*55}")
    print(f"Freeze start: {FREEZE_START}")
    print(f"Проспективних дат з GT: {len(prosp)}")
    if not prosp:
        print("Ще немає проспективного GT. Чекаємо PDF#54+.")
        return
    # per-regime accuracy
    by_reg=defaultdict(lambda:{'n':0,'correct':0})
    for d in prosp:
        m=master[d]; g=gt[d]['score']
        reg=m.get('regime_type','baseline')
        eng=m.get('engine_eng')
        if eng is None: continue
        by_reg[reg]['n']+=1
        if cls3(eng)==cls3(g): by_reg[reg]['correct']+=1
    print(f"\n{'Режим':22} {'n':>4} {'точність':>9}")
    print("-"*40)
    tot_n=tot_c=0
    for reg,s in sorted(by_reg.items()):
        if s['n']:
            acc=s['correct']/s['n']
            print(f"{reg:22} {s['n']:>4} {acc:>8.0%}")
            tot_n+=s['n']; tot_c+=s['correct']
    if tot_n:
        print("-"*40)
        print(f"{'УСЬОГО':22} {tot_n:>4} {tot_c/tot_n:>8.0%}")
        print(f"\nКанонічна стеля (retrospective): 70.6%")
        print(f"Проспективна: {tot_c/tot_n:.1%}")
        if tot_n>=20:
            if tot_c/tot_n>=0.68:
                print("✅ Тримається проспективно → regime model валідний")
            else:
                print("⚠ Падіння → π_k(t) зсунулись, потрібна рекалібровка")
        else:
            print(f"⏳ n={tot_n}<20 — рано робити висновок")

def cmd_add_pdf(fp):
    print(f"Внесення {fp}: read PDF → expert_overrides_v3 → GT v6.x → re-run --status")
    print("(ручний крок: оновити GT, потім --status)")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--status",action="store_true")
    p.add_argument("--add-pdf",metavar="FILE")
    a=p.parse_args()
    if a.add_pdf: cmd_add_pdf(a.add_pdf)
    else: cmd_status()
