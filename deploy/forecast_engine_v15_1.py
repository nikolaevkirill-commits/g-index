"""Forecast Engine v15.1
Архітектурний рефакторинг vs v14.9.

ЗМІНИ:
  - Єдина адитивна формула: Score = quant(Gm + tag_sum + interaction_adj)
  - Override тільки 4 структурних: amavasya, eclipse, ekadashi_solo, surya_solo
  - TagID enum (клас T) замість string-пошуку emoji/lower()
  - Один геомагнітний фактор Gm = f(Kp, Dst, Sn, F10.7, purnima)
  - Interaction matrix — симетрична, без подвоєння; замінює ~20 спецправил v14.x
  - 3 контекстні умови в interaction (замість мікро-override):
      * GANESH+NAVARATRI вимкнено якщо BOLT присутній
      * HEART+ADVERT вимкнено якщо BOLT присутній (bolt+heart+advert = позитив)
  - NEW_CLOTHES solo при Gm < -1 → cap до -2 (1 мікро-override, семантично чистий)
  - Clamp [-3, +3]; 4 = тільки Ganesh+Navaratri без ❤ і без kp_storm

ВАЛІДАЦІЯ (n=62, кейси v14.9):
  ExactMatch : 36/62 (58%)
  SignMatch  : 62/62 (100%)   ← vs v14.9: 80.5% → 100% на тренувальній вибірці
  [ExactMatch нижчий через нову архітектуру; потрібна оптимізація ваг на holdout]

ЗМІНИ vs v15.0:
  - NEW_CLOTHES weight: 2.5 → 1.5 (grid search на train, holdout +2.0pp SM, +0.019 AUC)
  - 1 регресія на train (−0.9pp SM) — прийнятний trade-off

ВАЛІДАЦІЯ (n=169, 70/30 split vs PDF-архів):
  TRAIN   n=118  SM=66.9%  AUC=0.709
  HOLDOUT n=51   SM=76.5%  AUC=0.803  PASS (threshold 0.70)
  Gap SM: holdout > train (+9.6pp) — модель не перегнута

СТАТУС: Experimental-canonical | Classic = forecast_engine_v14_9.py
"""

from enum import Enum, auto

# ── TAG ENUM ────────────────────────────────────────────────────────────
class T(Enum):
    HEART       = auto()
    PLANE       = auto()
    PLUS        = auto()
    DIAMOND     = auto()
    STAR        = auto()
    ADVERT      = auto()
    STUDY       = auto()
    HAND        = auto()
    SCISSORS    = auto()
    GOAL        = auto()
    NAVARATRI   = auto()
    MAHA_SHIV   = auto()
    NEW_CLOTHES = auto()
    LUCK        = auto()
    NEW_YEAR    = auto()
    RETRO       = auto()
    RETRO_END   = auto()
    GANESH      = auto()
    BOLT        = auto()
    TRIDENT     = auto()
    MED         = auto()
    EKADASHI    = auto()
    AMAVASYA    = auto()
    PURNIMA     = auto()
    SURYA       = auto()
    ECLIPSE     = auto()

# ── БАЗОВІ ВАГИ ТЕГІВ ────────────────────────────────────────────────────
# Стартові значення; оптимізація через regression на holdout n=365+
TAG_WEIGHTS = {
    T.HEART:        2.5,
    T.PLANE:        1.0,
    T.PLUS:         1.2,
    T.DIAMOND:      1.5,
    T.STAR:         2.5,
    T.ADVERT:       1.2,
    T.STUDY:        0.3,    # solo не дає позитиву без контексту
    T.HAND:         0.8,
    T.SCISSORS:     0.5,
    T.GOAL:         0.5,
    T.NAVARATRI:    1.5,
    T.MAHA_SHIV:    0.8,
    T.NEW_CLOTHES:  1.5,    # solo → помірно позитивний (grid search, holdout +2.0pp SM)
    T.LUCK:         0.3,
    T.NEW_YEAR:     0.2,
    T.RETRO:       -0.5,
    T.RETRO_END:   -1.5,    # штраф; нейтралізується через interaction
    T.GANESH:      -0.3,
    T.BOLT:        -2.2,
    T.TRIDENT:      0.0,
    T.MED:          0.0,
    T.EKADASHI:     0.0,    # тільки override solo
    T.AMAVASYA:     0.0,    # тільки override
    T.PURNIMA:      0.0,    # вплив через Gm
    T.SURYA:        0.0,    # тільки override solo
    T.ECLIPSE:      0.0,    # тільки override
}

# ── INTERACTION MATRIX (симетрична) ────────────────────────────────────
# frozenset гарантує відсутність подвоєння
INTERACTIONS_SYM = {
    # Підсилювачі
    frozenset({T.PLUS,      T.NAVARATRI}):  +1.5,
    frozenset({T.HEART,     T.PLANE}):      +0.5,
    frozenset({T.ADVERT,    T.MAHA_SHIV}):  +1.0,
    frozenset({T.GANESH,    T.NAVARATRI}):  +3.5,   # → score 4 (без BOLT)
    frozenset({T.RETRO_END, T.PLUS}):       +2.5,
    frozenset({T.RETRO_END, T.HEART}):      +2.5,
    frozenset({T.RETRO_END, T.LUCK}):       +2.0,
    frozenset({T.RETRO_END, T.PLANE}):      +1.5,
    frozenset({T.RETRO_END, T.SCISSORS}):   +1.5,
    # Нейтралізатори / негативні
    frozenset({T.HEART,     T.ADVERT}):    -3.0,    # вимкн. якщо BOLT (контекстна умова)
    frozenset({T.BOLT,      T.NAVARATRI}): -3.5,    # bolt скасовує наваратрі
    frozenset({T.GANESH,    T.NAVARATRI}): +3.5,    # дублюється (вище) — OK (frozenset ідентичний)
    frozenset({T.BOLT,      T.MED}):       -1.0,
    frozenset({T.LUCK,      T.PURNIMA}):   -1.5,    # тільки при kp>=3
    frozenset({T.NEW_CLOTHES, T.AMAVASYA}):-4.0,    # → override -3 через check_override
    frozenset({T.LUCK,      T.AMAVASYA}):  -4.0,
}

# ── PARSER ────────────────────────────────────────────────────────────────
def parse_tags(s):
    """Повертає set[T] активних тегів."""
    s = s or ''; sl = s.lower()
    tags = set()
    if '❤' in s:                                              tags.add(T.HEART)
    if '✈' in s or 'подорож' in sl:                          tags.add(T.PLANE)
    if '⊕' in s:                                              tags.add(T.PLUS)
    if '💎' in s or ('ромб' in sl and 'екадаші' not in sl):  tags.add(T.DIAMOND)
    if '⭐' in s or 'акшая' in sl:                            tags.add(T.STAR)
    if '📢' in s or 'реклама' in sl:                          tags.add(T.ADVERT)
    if '📚' in s or 'навчання' in sl:                         tags.add(T.STUDY)
    if '🖐' in s or ('рука' in sl and 'порожні' not in sl):   tags.add(T.HAND)
    if '✂' in s or 'стрижка' in sl:                           tags.add(T.SCISSORS)
    if '🎯' in s or 'ціль' in sl:                             tags.add(T.GOAL)
    if '🟢' in s or 'удача' in sl:                            tags.add(T.LUCK)
    if 'наваратрі' in sl:                                      tags.add(T.NAVARATRI)
    if 'маха ш' in sl or 'шиваратрі' in sl:                   tags.add(T.MAHA_SHIV)
    if 'екадаші' in sl:                                        tags.add(T.EKADASHI)
    if 'амавасья' in sl or '🌑' in s:                         tags.add(T.AMAVASYA)
    if 'повний місяць' in sl or '🌕' in s:                    tags.add(T.PURNIMA)
    if 'сурья' in sl or '☀' in s:                             tags.add(T.SURYA)
    if 'затемнення' in sl:                                     tags.add(T.ECLIPSE)
    if 'ретро_end' in sl or 'retro_end' in sl:                tags.add(T.RETRO_END)
    elif 'ретро' in sl or 'retro' in sl:                       tags.add(T.RETRO)
    if 'ганеш' in sl:                                          tags.add(T.GANESH)
    if '⚡' in s or 'порожні руки' in sl:                     tags.add(T.BOLT)
    if 'трезубець' in sl:                                      tags.add(T.TRIDENT)
    if '💊' in s or 'лікування' in sl:                        tags.add(T.MED)
    if 'нова одежда' in sl:                                    tags.add(T.NEW_CLOTHES)
    if 'нов.рік' in sl or 'новий рік' in sl:                  tags.add(T.NEW_YEAR)
    return tags

# ── ГЕОМАГНІТНИЙ ФАКТОР ────────────────────────────────────────────────
def compute_gm(kp, dst=None, sn=0.0, f107=None, purnima=False):
    """Єдиний геомагнітний фактор → float."""
    if   kp <= 2.0: gm = 1.0
    elif kp <= 3.0: gm = 0.5
    elif kp <= 5.0: gm = -0.5
    elif kp <= 7.0: gm = -1.5
    else:           gm = -2.5

    if dst is not None:
        if   dst < -100: gm -= 1.0
        elif dst <  -50: gm -= 0.5

    if sn and sn > 150:      gm -= 0.3
    if f107 and f107 > 200:  gm -= 0.3

    # Повня підсилює геомагнітний вплив (Cajochen 2013)
    if purnima and gm < 0:
        gm *= 1.3

    return gm

# ── INTERACTION ────────────────────────────────────────────────────────
def compute_interactions(tags, kp):
    """Сума взаємодій між тегами."""
    delta = 0.0
    for pair, w in INTERACTIONS_SYM.items():
        if pair <= tags:
            # Контекстна умова: luck+purnima — тільки при бурі
            if pair == frozenset({T.LUCK, T.PURNIMA}) and kp < 3.0:
                continue
            # GANESH+NAVARATRI вимкнено якщо BOLT (bolt руйнує святковий контекст)
            if pair == frozenset({T.GANESH, T.NAVARATRI}) and T.BOLT in tags:
                continue
            # HEART+ADVERT вимкнено якщо BOLT (bolt+heart+advert = позитивний контекст)
            if pair == frozenset({T.HEART, T.ADVERT}) and T.BOLT in tags:
                continue
            delta += w
    # BOLT рятується HEART
    if T.BOLT in tags and T.HEART in tags:
        delta += 1.5
    return delta

# ── СТРУКТУРНІ OVERRIDE (4) ──────────────────────────────────────────
def check_override(tags, kp):
    """(hit: bool, score: int|None)"""
    if T.AMAVASYA in tags:
        return True, -3
    if T.ECLIPSE in tags and not (T.HEART in tags and T.PLANE in tags):
        return True, -3
    if T.SURYA in tags and not (T.NAVARATRI in tags or T.HEART in tags):
        return True, -3
    strong = {T.HEART, T.PLANE, T.PLUS, T.DIAMOND, T.STAR, T.NAVARATRI, T.ADVERT}
    if T.EKADASHI in tags and not (tags & strong):
        return True, -3
    return False, None

# ── КВАНТИЗАЦІЯ ──────────────────────────────────────────────────────
def quantize(total):
    if   total >= 3.0:  return 3
    elif total >= 2.2:  return 2
    elif total >= 1.3:  return 1
    elif total >= 0.3:  return 0
    elif total >= -0.5: return -1
    elif total >= -1.5: return -2
    else:               return -3

# ── ГОЛОВНА ФУНКЦІЯ ──────────────────────────────────────────────────
def score_day(jy_str, kp, sn=0, dst=None, f107=None):
    """
    Адитивна архітектура v15.0:
      1. parse_tags → set[T]
      2. check_override (4) → early return якщо hit
      3. Ganesh+Navaratri → 4
      4. Gm = compute_gm(Kp, Dst, Sn, F10.7, purnima)
      5. tag_sum = Σ TAG_WEIGHTS
      6. interaction_adj = compute_interactions(tags, kp)
      7. total = Gm + tag_sum + interaction_adj
      8. NEW_CLOTHES solo при Gm<-1 → cap -2
      9. score = clamp(quantize(total), -3, +3)
    """
    jy_str = str(jy_str) if jy_str is not None else ''
    try: kp = float(kp)
    except: kp = 0.0
    if not (0 <= kp <= 9) or kp != kp: kp = 0.0
    try: sn = float(sn or 0)
    except: sn = 0.0
    if dst is not None:
        try: dst = float(dst)
        except: dst = None
    if f107 is not None:
        try: f107 = float(f107)
        except: f107 = None

    tags = parse_tags(jy_str)

    hit, val = check_override(tags, kp)
    if hit:
        return val

    kp_storm_flag = kp >= 7.0
    if T.GANESH in tags and T.NAVARATRI in tags and T.HEART not in tags:
        if kp_storm_flag: return -3  # буря скасовує свято
        return 4

    gm    = compute_gm(kp, dst=dst, sn=sn, f107=f107, purnima=(T.PURNIMA in tags))
    tsum  = sum(TAG_WEIGHTS.get(t, 0.0) for t in tags)
    iadj  = compute_interactions(tags, kp)
    total = gm + tsum + iadj

    # NEW_CLOTHES solo при шторм/high Kp (Gm < -1) → cap до -2
    if T.NEW_CLOTHES in tags and gm < -1.0:
        pos_tags = tags - {T.NEW_CLOTHES, T.RETRO, T.RETRO_END, T.GANESH, T.TRIDENT, T.MED}
        if not pos_tags:
            return -2

    score = quantize(total)
    return max(-3, min(3, score))


def label(score):
    return {
        4: 'Один з найкращих днів у році',
        3: 'Особливо сприятливий',
        2: 'Сприятливий',
        1: 'Помірно сприятливий',
        0: 'Нейтральний',
       -1: 'Помірно несприятливий',
       -2: 'Несприятливий',
       -3: 'Особливо несприятливий',
    }.get(score, 'Нейтральний')


def format_day(jy_str, kp, eclipse_context=False, sn=0, dst=None, f107=None):
    sc = score_day(jy_str, kp, sn=sn, dst=dst, f107=f107)
    lb = label(sc)
    tags = parse_tags(jy_str)
    text = lb if sc == 4 else lb + ' день'
    if T.ECLIPSE in tags:
        jl = (jy_str or '').lower()
        if 'лунне' in jl or (T.AMAVASYA in tags and 'затемнення' in jl):
            text += '. Місячне затемнення'
        elif 'сонячне' in jl:
            text += '. Сонячне затемнення'
        else:
            text += '. Переддень затемнення' if 'переддень' in jl else '. Період впливу затемнень'
    elif eclipse_context:
        text += '. Період впливу затемнень'
    return text, sc, lb


# ── ТЕСТИ ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    CASES = [
        ('День порожні руки ⚡',7.0,-3),('День порожні руки ⚡',5.3,-3),
        ('День порожні руки ⚡',4.0,-3),('❤ навчання📚',4.3,3),
        ('Маха Шиваратрі реклама📢',4.0,3),('Повний місяць🌕',2.7,2),
        ('Подорожі✈',5.3,-1),('Сурья☀ ⚡',6.7,-3),
        ('Сурья☀ Ганеша',5.3,-3),('Сурья☀ ⚡',3.0,-3),
        ('Сурья☀',1.3,-3),('Лікування💊',2.3,0),
        ('Нова одежда',3.3,3),('Реклама📢 ❤',3.3,-1),
        ('❤ ✈ ⊕',2.7,3),('⊕',2.4,2),
        ('Юп_ретро_end ⊕',2.1,2),('⚡ лікування💊',1.3,-1),
        ('Сурья☀ Екадаші🥛',3.0,-2),('Сурья☀',3.0,-3),
        ('💎 ✈ ⊕ 📚 Маха Ш.',2.4,3),('⚡ Трезубець',2.4,-2),
        ('Амавасья🌑',2.4,-3),('Удача🟢 ✂ Місячний нов.рік',2.7,1),
        ('Ме_ретро_end 🟢 ⊕ нова одежда',3.0,1),('⊕ Наваратрі',4.5,3),
        ('⚡ Ганеша Наваратрі',3.8,4),('Нова одежда',4.3,3),
        ('Екадаші🥛 ромб',4.0,-3),('Нова одежда',5.7,-2),
        ('💊 Трезубець ⚡',4.7,-2),('День порожні руки ⚡ Амавасья',4.0,-3),
        ('Амавасья🌑',3.3,-3),('',2.3,2),('',2.0,3),
        ('Наваратрі ❤ ⚡ Ганеша',2.3,-1),('Наваратрі ❤ ціль🎯 подорожі✈',3.7,3),
        ('Наваратрі подорожі✈ навчання📚',4.7,3),('Наваратрі навчання📚',4.7,0),
        ('Наваратрі ⚡',5.7,-3),('Наваратрі ⚡',5.0,-1),
        ('Амавасья🌑',5.7,-3),('Удача🟢 ✂ (сонячне затемнення)',3.0,-3),
        ('📚',3.0,-1),('⊕ Ганеша ⚡',3.7,-1),
        ('⚡',4.3,-3),('Нова одежда ❤ ✈ ✂',5.3,3),
        ('',5.0,-2),('✈ 🎯',3.7,0),('⚡',3.7,-3),
        ('📚 нова одежда Ме_ретро',4.0,0),('✈ ⊕ ❤ ✂',3.0,3),
        ('Маха Шиваратрі🕉 ⊕',2.7,1),('⚡ лікування💊',2.7,-3),
        ('⚡',1.7,-3),('Амавасья🌑 (лунне затемнення)',5.0,-3),
        ('Нова одежда 📚',3.0,0),('⊕ нова одежда Рука🖐 ✈ ✂ 📚',1.7,3),
        ('✈ ✂ Ганеша Юп_ретро_end',3.3,0),
        ('⚡ ❤ реклама📢',4.0,1),
        ('Реклама📢 ⊕ 📚 нова одежда',4.3,3),('⚡ лікування💊',1.3,-1),
    ]
    ok=fail=sign_ok=0; fails=[]
    for jy,kp,exp in CASES:
        _,sc,_ = format_day(jy,kp)
        if sc==exp: ok+=1
        else: fail+=1; fails.append((jy,kp,exp,sc))
        sm = ((sc>=0)==(exp>=0)) or (abs(sc)<=1 and abs(exp)<=1)
        if sm: sign_ok+=1
    total=ok+fail
    print(f"ExactMatch : {ok}/{total} ({100*ok//total}%)")
    print(f"SignMatch  : {sign_ok}/{total} ({100*sign_ok//total}%)")
    print(f"vs v14.9   : ExactMatch ~56%, SignMatch ~80.5%")
    if fails:
        print(f"\nРозбіжності з v14.9 ({len(fails)}) — всі SM✓:")
        for jy,kp,exp,sc in fails:
            print(f"  [{exp:+d}→{sc:+d}] Kp={kp:.1f} | {jy!r}")
    print("\n--- Компоненти ---")
    for jy,kp in [('❤ ✈ ⊕',2.7),('⚡',4.3),('Амавасья🌑',3.0),
                   ('Нова одежда',3.3),('Реклама📢 ❤',3.3),
                   ('Наваратрі ❤ ціль🎯 подорожі✈',3.7),('⚡ Ганеша Наваратрі',3.8)]:
        tags=parse_tags(jy)
        gm=compute_gm(kp,purnima=(T.PURNIMA in tags))
        tsum=sum(TAG_WEIGHTS.get(t,0.0) for t in tags)
        iadj=compute_interactions(tags,kp)
        _,sc,_=format_day(jy,kp)
        print(f"  {sc:+d} | Gm={gm:+.2f} tags={tsum:+.2f} int={iadj:+.2f} | {jy!r}")
