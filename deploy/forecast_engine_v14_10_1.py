"""Forecast Engine v14.10.1
Зміни vs v14.10 — аудит 10.04.2026 (session 2):

  FIX-6  Float-point precision: round(total, 4) перед threshold classifier.
         Запобігає 2.0+0.8-1.0=1.7999... → хибний base=1 замість base=2.
         Мінімальний вплив: ±1 score для граничних випадків.

  Базові тести: потрібна повторна перевірка 62/62.
"""

# ── CENTRALIZED WEIGHTS ──────────────────────────────────────────────
WEIGHTS = {
    # Позитивні теги
    'heart':       2.5,
    'plane':       1.0,
    'plus':        1.0,
    'diamond':     1.5,
    'star':        2.5,
    'advert':      1.2,
    'study':       0.5,
    'hand':        0.8,
    'scissors':    0.5,
    'goal':        0.5,
    'navaratri':   1.5,
    'dipavali':    2.0,
    'maha_shiv':   0.8,
    'new_clothes': 0.3,
    'luck':        0.3,
    'new_year':    0.2,   # Місячний нов.рік: числова логіка (v14.7 removed from blocking)
    # Негативні теги
    'retro':      -0.5,
    # Kp штрафи
    'kp_storm':   -2.5,
    'kp_high':    -1.0,
    'kp_med':     -0.2,
    # Kp бонуси
    'kp_vlow':     0.8,
    'kp_low':      0.3,
    # Wolf Sn корекція
    'sn_high_thr': 150,    # поріг Wolf number
    'sn_high_pen': -0.4,   # штраф kp_pen при Sn > 150
    # Dst корекція (NEW v14.3)
    'dst_moderate_thr': -50,   # нТл: помірна буря
    'dst_intense_thr':  -100,  # нТл: сильна буря
    'dst_moderate_pen': -1,    # штраф до score при dst < -50
    'dst_intense_pen':  -2,    # штраф до score при dst < -100 (замінює moderate)
    # F10.7 корекція (NEW v14.3)
    'f107_high_thr': 200,    # sfu: підвищена сонячна активність
    'f107_high_pen': -0.3,   # штраф kp_pen при f107 > 200
}

def parse_tags(s):
    s = s or ''; sl = s.lower()
    return {
        'heart':       '❤' in s,
        'plane':       '✈' in s or 'подорож' in sl,
        'plus':        '⊕' in s,
        'bolt':        '⚡' in s or 'порожні руки' in sl,
        'med':         '💊' in s or 'лікування' in sl,
        'study':       '📚' in s or 'навчання' in sl,
        'diamond':     '💎' in s or ('ромб' in sl and 'екадаші' not in sl),
        'luck':        '🟢' in s or 'удача' in sl,
        'advert':      '📢' in s or 'реклама' in sl,
        'hand':        '🖐' in s or ('рука' in sl and 'порожні' not in sl),
        'star':        '⭐' in s or 'акшая' in sl,
        'navaratri':   'наваратрі' in sl,
        'dipavali':    'діпавалі' in sl or 'дівалі' in sl or 'diwali' in sl or 'deepavali' in sl,
        'maha_shiv':   'маха ш' in sl or 'шиваратрі' in sl,
        'ekadashi':    'екадаші' in sl,
        'amavasya':    'амавасья' in sl or '🌑' in s,
        'purnima':     'повний місяць' in sl or '🌕' in s,
        'surya':       'сурья' in sl or '☀' in s,
        'eclipse':     'затемнення' in sl,
        'retro_end':   'ретро_end' in sl or 'retro_end' in sl,
        'retro':       ('ретро' in sl or 'retro' in sl) and 'end' not in sl,
        'ganesh':      'ганеш' in sl,
        'trident':     'трезубець' in sl,
        'new_clothes': 'нова одежда' in sl,
        'goal':        '🎯' in s or 'ціль' in sl,
        'scissors':    '✂' in s or 'стрижка' in sl,
        'new_year':    'нов.рік' in sl or 'новий рік' in sl,
    }

def score_day(jy_str, kp, sn=0, dst=None, f107=None):
    """
    sn   — Wolf sunspot number (0 = зворотна сумісність)
    dst  — мінімальний Dst доби в нТл (None = зворотна сумісність з v14.2)
    f107 — F10.7 сонячний радіопотік у SFU (None = ігнорується)
    """
    # Input sanitization (аудит v14.7)
    jy_str = str(jy_str) if jy_str is not None else ''
    try: kp = float(kp)
    except (TypeError, ValueError): kp = 0.0
    if not (0 <= kp <= 9) or kp != kp: kp = 0.0  # NaN check
    try: sn = float(sn or 0)
    except (TypeError, ValueError): sn = 0.0
    if dst is not None:
        try: dst = float(dst)
        except (TypeError, ValueError): dst = None
    if f107 is not None:
        try: f107 = float(f107)
        except (TypeError, ValueError): f107 = None
    t = parse_tags(jy_str)
    kp_vlow  = kp <= 2
    kp_low   = 2 < kp < 3
    kp_med   = 3 <= kp < 5
    kp_high  = 5 <= kp < 7
    kp_storm = kp >= 7

    # ── АБСОЛЮТНІ ПЕРЕВИЗНАЧНИКИ (12 правил) ──────────────────────────

    if t['ganesh'] and t['navaratri'] and not t['heart'] and not kp_storm:
        return 4                                          # Ганеша+Наваратрі

    if t['retro_end']:                                     # Ретро_end v14.7
        _re_pos = any(t[k] for k in ['heart','plane','plus','diamond','star','luck'])
        if not _re_pos:
            return -3
        # retro_end + позитивний тег → прибираємо retro_end, продовжуємо логіку
        _cleaned = jy_str
        for _w in ['Юп_ретро_end','Юп_retro_end','Sa_retro_end',
                   'Ме_retro_end','Ме_ретро_end','retro_end','ретро_end']:
            _cleaned = _cleaned.replace(_w, '').replace(_w.lower(), '').strip()
        # Guard: якщо очищення не змінило рядок → рекурсія без прогресу, повернути 0
        if _cleaned == jy_str:
            return 0
        return score_day(_cleaned, kp, sn=sn, dst=dst, f107=f107)
    # Пурніма: нейтральна (v14.2) — далі рахується числово
    if t['eclipse'] and not (t['heart'] and t['plane']): return -3   # Затемнення
    # new_year (Місячний нов.рік) — v14.7: прибрано з blocking, іде в числову логіку
    if t['amavasya']:                                    return -3   # Амавасья

    if t['surya']:
        if not (t['navaratri'] or t['heart']):
            return -2 if t['ekadashi'] else -3

    if t['ekadashi']:     return -3                       # Екадаші (без Сурья)

    # ── FIX-1: Трезубець (trident) без bolt — окремий guard ─────────────
    # Аудит (7 випадків): ❤ рятує; bolt-first = несприятливий; trident-first = нейтральний
    # ⚡ Трезубець (bolt перший у рядку) → несприятливий
    # Трезубець ⚡ (trident перший) → нейтральний/позитивний без негативного контексту
    if t['trident'] and not t['bolt']:
        # trident без ⚡: несприятливий контекст (Трезубець без символу ⚡ = рідко)
        if t['heart']:
            pass  # продовжуємо числову логіку
        elif t['med'] and not (kp_high or kp_storm):
            return -1
        else:
            return -2 if kp >= 3 else -1

    # ── ⚡ BOLT-ЛОГІКА ─────────────────────────────────────────────────
    if t['bolt']:
        if t['trident']:
            # FIX-1: bolt+trident — визначаємо порядок у рядку
            # '⚡ Трезубець' (bolt-first) = несприятливий
            # 'Трезубець ⚡' (trident-first) = нейтральний якщо немає негативного контексту
            # ❤ завжди рятує (PDF: 15.02 Трезубець ⚡ ❤ → +1)
            if t['heart']:
                return 1  # ❤ рятує будь-який trident контекст
            _bolt_pos    = jy_str.find('⚡')
            _trid_pos    = jy_str.lower().find('трезубець')
            _bolt_first  = (_bolt_pos >= 0 and _trid_pos >= 0 and _bolt_pos < _trid_pos)
            if _bolt_first:
                # ⚡ Трезубець: несприятливий (-2 або -3 при Kp_storm)
                return -3 if kp_storm else -2
            else:
                # Трезубець ⚡: нейтральний/позитивний (PDF=+3 при Kp=4.7)
                # Виняток: med+kp_high = несприятливо для медицини
                if t['med'] and (kp_med or kp_high or kp_storm):
                    return -2
                return 0 if kp_high else (2 if not kp_med else 1)
        if t['heart'] and t['advert']:    return 1
        if t['heart']:                    return -1
        if t['plus'] and t['ganesh']:     return -1
        # FIX-4: Ганеша ⚡ без Наваратрі → -1 (аудит: 3 випадки eng=-3, PDF=+1..+2)
        if t['ganesh'] and not t['navaratri']:
            return -1
        if t['navaratri']:
            return -3 if kp >= 5.5 else -1
        if t['med']:
            return -1 if kp < 2 else -3
        return -3

    # ── СПЕЦПРАВИЛА (скорочено до 9) ─────────────────────────────────
    if t['maha_shiv'] and t['advert']:    return 3
    # Маха Шиваратрі + ⊕ (без ❤ і підсилювачів) → ПС
    if t['maha_shiv'] and t['plus'] and not t['heart'] and not any(t[k] for k in ['plane','diamond','star','advert']):
        return 1
    # Реклама + ❤ без підсилювачів → ПН
    if t['advert'] and t['heart'] and not any(t[k] for k in
            ['plane','plus','diamond','study','star','navaratri','dipavali','maha_shiv']):
        return -1
    if t['plus'] and t['navaratri'] and not t['heart']:
        return 3 if not kp_storm else -1
    # ⊕ самостійно → С
    solo_blocking = ['heart','plane','diamond','star','navaratri','dipavali','advert','study',
                     'hand','scissors','goal','new_clothes','ganesh','maha_shiv','med']
    if t['plus'] and not any(t[k] for k in solo_blocking):
        return 2 if not kp_storm else -2
    # 💊 самостійно → Н
    if t['med'] and not any(t[k] for k in
            ['heart','plane','plus','diamond','star','navaratri','dipavali','advert',
             'study','hand','new_clothes','goal','scissors','ganesh','bolt']):
        return 0
    # Наваратрі + 📚 без сильних → Н
    nav_strong = any(t[k] for k in ['heart','plus','plane','diamond','star','advert','scissors'])
    if t['navaratri'] and t['study'] and not nav_strong:
        return 0 if (kp_med or kp_high) else 1
    if t['study'] and not any(t[k] for k in
            ['heart','plane','plus','diamond','star','navaratri','dipavali','advert','hand','scissors','goal']):
        return 0 if t['new_clothes'] else (-1 if kp >= 3 else 0)
    # ✈ + 🎯 без ❤ → Н
    if t['plane'] and t['goal'] and not any(t[k] for k in ['heart','plus','diamond','star']):
        return 0
    nc_only = ['heart','plane','plus','diamond','star','navaratri','dipavali','advert',
               'study','hand','goal','scissors','ganesh','maha_shiv','bolt','med']
    # FIX-3: new_clothes + amavasya → override -3 перед return +3
    if t['new_clothes'] and t['amavasya']:
        return -3
    if t['new_clothes'] and not any(t[k] for k in nc_only):
        return 3 if kp < 5 else -2

    # FIX-2: luck (Удача🟢) guard — місячна фаза перед числовою логікою
    # (3 інверсії в аудиті: luck+purnima/amavasya → eng=+2..+3, PDF=-3)
    _luck_strong = ['heart','plus','diamond','star','plane','advert','scissors']
    if t['luck'] and not any(t[k] for k in _luck_strong):
        if t['amavasya']:
            return -3
        if t['purnima'] and (kp_med or kp_high or kp_storm):
            return -2
        # FIX-5: luck standalone + kp_low → несприятливий (-1)
        # Аудит: 19.12.2025 Удача🟢 Kp=2.3 → engine=0, PDF=-3 (SM miss)
        # Числова логіка: pos=0.3 + kp_bon=0.3 = 0.6 → base=0 — хибний нейтраль
        # kp_vlow не зачіпаємо (там kp_bon=0.8 → total=1.1 → base=1, можливий позитив)
        _luck_blocking = ['navaratri','dipavali','maha_shiv','ganesh','med','study','hand',
                          'goal','new_clothes','retro','new_year','ekadashi','purnima','amavasya']
        if kp_low and not any(t[k] for k in _luck_blocking):
            return -1

    # ── ЧИСЛОВА ЛОГІКА ────────────────────────────────────────────────
    pos = sum(WEIGHTS[k] for k in [
        'heart','plane','plus','diamond','star','advert','study',
        'hand','scissors','goal','navaratri','dipavali','maha_shiv','new_clothes','luck','new_year'
    ] if t.get(k))

    neg = 0.0
    if t['retro']:                           neg += WEIGHTS['retro']
    if t['ganesh'] and not t['navaratri']:   neg -= 0.5

    if kp_storm:  kp_pen = WEIGHTS['kp_storm']
    elif kp_high: kp_pen = WEIGHTS['kp_high']
    elif kp_med:  kp_pen = WEIGHTS['kp_med']
    else:         kp_pen = 0.0

    # Wolf Sn корекція
    if sn and sn > WEIGHTS['sn_high_thr']:
        kp_pen += WEIGHTS['sn_high_pen']

    # F10.7 корекція (v14.3)
    if f107 is not None and f107 > WEIGHTS['f107_high_thr']:
        kp_pen += WEIGHTS['f107_high_pen']

    kp_bon = WEIGHTS['kp_vlow'] if kp_vlow else (WEIGHTS['kp_low'] if kp_low else 0.0)
    total  = round(pos + neg + kp_pen + kp_bon, 4)

    if pos == 0 and neg == 0:
        if kp_vlow:   base = 3
        elif kp_low:  base = 2
        elif kp_med:  base = -2
        elif kp_high: base = -2
        else:         base = -3
    elif total >= 2.5:   base = 3
    elif total >= 1.8:   base = 2
    elif total >= 1.0:   base = 1
    elif total >= 0.2:   base = 0
    elif total >= -0.6:  base = -1
    elif total >= -1.5:  base = -2
    else:                base = -3

    # Dst post-correction (v14.3): підтверджена буря знижує score
    # Не застосовується до абсолютних override (amavasya тощо — вже повернули раніше)
    if dst is not None and base > -3:
        if dst < WEIGHTS['dst_intense_thr']:
            base = max(-3, base + WEIGHTS['dst_intense_pen'])
        elif dst < WEIGHTS['dst_moderate_thr']:
            base = max(-3, base + WEIGHTS['dst_moderate_pen'])

    return base

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

def gen_recs(jy_str, kp, score):
    t = parse_tags(jy_str)
    inline, blocks = [], []
    if score >= 3:
        if any(t[k] for k in ['heart','plus','diamond','star']):
            inline.append('для справ, дій')
        elif t['new_clothes'] or (t['advert'] and not t['heart']):
            inline.append('для справ, дій')
        if t['plane'] or t['scissors']:
            inline.append('сприятливий для логістики')
        if t['new_clothes'] or t['hand']:
            inline.append('освоєння нового спорядження, техніки')
        if t['study']:
            inline.append('початку тренувань, навчань')
        if t['med'] or t['star']:
            inline.append('лікування, прийому ліків')
        if t['advert']:
            inline.append('старту інформ.кампаній, стратком')
        if t['goal']:
            inline.append('планування')
        if t['navaratri']:
            inline.append('підбиття підсумків, аналізу')
        if t['maha_shiv'] or (t['ganesh'] and t['navaratri']):
            blocks.append('День молитов')
        seen = set(); inline = [x for x in inline if not (x in seen or seen.add(x))]
    elif score == 2:
        if t['trident']:
            inline.append('особливо для логістики')
        elif t['plane'] or t['scissors']:
            inline.append('сприятливий для логістики')
        if t['plus'] or t['goal']:
            inline.append('планування, дій')
        if t['new_clothes'] or t['hand']:
            inline.append('освоєння нового спорядження, техніки')
        if t['study']:
            inline.append('початку тренувань, навчань')
    elif score == 1:
        if t['bolt'] and t['heart'] and t['advert']:
            blocks.append('День прибирання')
            blocks.append('День старту інформ.кампаній')
        if t['plane']:
            inline.append('для логістики')
        if t['study']:
            inline.append('початку тренувань, навчань')
        if t['maha_shiv']:
            blocks.append('День лікування, прийому ліків')
            blocks.append('День молитов')
    elif score == 0:
        if t['med']:
            blocks.append('Підходить для медичних дій, лікування')
        if t['new_clothes'] or t['study']:
            txt = 'Підходить для освоєння нового спорядження, техніки'
            if t['study']: txt += ', для початку тренувань, навчань'
            blocks.append(txt)
        elif t['study']:
            blocks.append('Підходить для початку тренувань, навчань')
        if t['plane'] or t['goal']:
            inline.append('планування, дій, здійснення логістики')
    elif score == -1:
        if t['study']:
            blocks.append('День початку тренувань, навчань')
        if any(t[k] for k in ['ganesh','maha_shiv','navaratri']):
            blocks.append('День молитов')
        if not t['heart']:
            blocks.append('День прибирання')
    elif score == -2:
        if t['amavasya']:
            blocks.append('День вшанування загиблих')
            blocks.append('День молитов')
        elif t['surya']:
            blocks.append('Прибирання')
        elif t['med']:
            blocks.append('День медичних операцій')
            blocks.append('Підходить для прибирання')
        else:
            blocks.append('Підходить для прибирання')
    elif score == -3:
        if t['amavasya']:
            blocks.append('День вшанування загиблих')
            blocks.append('День молитов')
        elif t['purnima']:
            pass
        elif t['bolt']:
            blocks.append('День прибирання')
        elif t['surya']:
            blocks.append('Прибирання')
            if t['ganesh']: blocks.append('молитви')
        elif t['eclipse']:
            if not t['amavasya'] and not t['purnima']:
                blocks.append('Рекомендований відпочинок')
        elif t['retro_end']:
            pass
        elif t['med']:
            blocks.append('День медичних операцій')
            blocks.append('Підходить для прибирання')
        else:
            blocks.append('Підходить для прибирання')
    return inline, blocks

def format_day(jy_str, kp, eclipse_context=False, sn=0, dst=None, f107=None):
    sc = score_day(jy_str, kp, sn=sn, dst=dst, f107=f107)
    lb = label(sc)
    inline, blocks = gen_recs(jy_str, kp, sc)
    t = parse_tags(jy_str)
    text = lb if sc == 4 else lb + ' день'
    if inline: text += ', ' + ', '.join(inline)
    for b in blocks: text += '. ' + b
    if t['eclipse']:
        jl = (jy_str or '').lower()
        if 'лунне' in jl or (t['amavasya'] and 'затемнення' in jl):
            text += '. Місячне затемнення'
        elif 'сонячне' in jl:
            text += '. Сонячне затемнення'
        else:
            text += '. Переддень затемнення' if 'переддень' in jl else '. Період впливу затемнень'
    elif eclipse_context:
        text += '. Період впливу затемнень'
    return text, sc, lb

if __name__ == '__main__':
    CASES = [
        ('День порожні руки ⚡',7.0,-3),('День порожні руки ⚡',5.3,-3),
        ('День порожні руки ⚡',4.0,-3),('❤ навчання📚',4.3,3),
        ('Маха Шиваратрі реклама📢',4.0,3),('Повний місяць🌕',2.7, 2),  # v14.2: purnima→0
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
    ok=fail=0; fails=[]
    for jy,kp,exp in CASES:
        _,sc,_ = format_day(jy,kp)
        if sc==exp: ok+=1
        else: fail+=1; fails.append((jy,kp,exp,sc))
    total=ok+fail
    print(f"Результат: {ok}/{total} ({100*ok//total}%)\n")
    if fails:
        print("ПОМИЛКИ:")
        for jy,kp,exp,sc in fails:
            print(f"  [{exp:3}→{sc:3}] Kp={kp:.1f} | {jy!r}")
    # Приклади текстів
    print("\n--- Приклади текстів ---")
    samples = [
        ('❤ ✈ ⊕', 2.7), ('⚡', 4.3), ('Амавасья🌑', 3.0),
        ('Наваратрі ❤ ціль🎯 подорожі✈', 3.7), ('⚡ Ганеша Наваратрі', 3.8),
        ('Маха Шиваратрі реклама📢', 4.0), ('Нова одежда', 3.3),
    ]
    for jy, kp in samples:
        text, sc, lb = format_day(jy, kp)
        print(f"  {sc:3} | {text}")
