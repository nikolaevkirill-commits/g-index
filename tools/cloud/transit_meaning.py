"""SkyRhythm interpretation model for mundane transit events (score weight 0, not validated).

Produces a short traditional reading for each event from classical significations
(graha karakatva: BPHS ch. 3; sign rulership; nakshatra presiding deities), an intensity
grade from measurable conditions, and a testable claim stub that is checked later against
objective series. It never states that something will happen.
"""
LANGS = ('uk', 'en', 'es', 'fr')
SOURCE = 'BPHS ch. 3 (karakatva), standard nakshatra deities; SkyRhythm rules v1'

GRAHA = {
 'Sun': {'name': ('Сонце', 'Sun', 'Sol', 'Soleil'),
         'themes': ('влада, керівництво, держава', 'authority, leadership, the state', 'autoridad, liderazgo, el Estado', 'autorité, direction, l’État')},
 'Moon': {'name': ('Місяць', 'Moon', 'Luna', 'Lune'),
          'themes': ('настрій людей, суспільство', 'public mood, society', 'estado de ánimo colectivo, sociedad', 'humeur collective, société')},
 'Mars': {'name': ('Марс', 'Mars', 'Marte', 'Mars'),
          'themes': ('сила, конфлікт, армія, ризик', 'force, conflict, the military, risk', 'fuerza, conflicto, ejército, riesgo', 'force, conflit, armée, risque')},
 'Mercury': {'name': ('Меркурій', 'Mercury', 'Mercurio', 'Mercure'),
             'themes': ('зв’язок, торгівля, документи', 'communication, trade, documents', 'comunicación, comercio, documentos', 'communication, commerce, documents')},
 'Jupiter': {'name': ('Юпітер', 'Jupiter', 'Júpiter', 'Jupiter'),
             'themes': ('закон, фінанси, освіта, захист', 'law, finance, education, protection', 'ley, finanzas, educación, protección', 'loi, finances, éducation, protection')},
 'Venus': {'name': ('Венера', 'Venus', 'Venus', 'Vénus'),
           'themes': ('добробут, домовленості, мистецтво', 'prosperity, agreements, the arts', 'bienestar, acuerdos, artes', 'prospérité, accords, arts')},
 'Saturn': {'name': ('Сатурн', 'Saturn', 'Saturno', 'Saturne'),
            'themes': ('обмеження, тривалі процеси, праця', 'restriction, long processes, labour', 'restricción, procesos largos, trabajo', 'restriction, processus longs, travail')},
 'Rahu': {'name': ('Раху', 'Rahu', 'Rahu', 'Rahu'),
          'themes': ('потрясіння, ажіотаж, іноземне', 'upheaval, hype, the foreign', 'conmoción, euforia, lo extranjero', 'bouleversement, emballement, l’étranger')},
 'Ketu': {'name': ('Кету', 'Ketu', 'Ketu', 'Ketu'),
          'themes': ('відрив, втрата, завершення старого', 'detachment, loss, the end of the old', 'desapego, pérdida, fin de lo antiguo', 'détachement, perte, fin de l’ancien')},
}
SIGN = (('Овен', 'Aries', 'Aries', 'Bélier'), ('Телець', 'Taurus', 'Tauro', 'Taureau'), ('Близнюки', 'Gemini', 'Géminis', 'Gémeaux'),
        ('Рак', 'Cancer', 'Cáncer', 'Cancer'), ('Лев', 'Leo', 'Leo', 'Lion'), ('Діва', 'Virgo', 'Virgo', 'Vierge'),
        ('Терези', 'Libra', 'Libra', 'Balance'), ('Скорпіон', 'Scorpio', 'Escorpio', 'Scorpion'), ('Стрілець', 'Sagittarius', 'Sagitario', 'Sagittaire'),
        ('Козеріг', 'Capricorn', 'Capricornio', 'Capricorne'), ('Водолій', 'Aquarius', 'Acuario', 'Verseau'), ('Риби', 'Pisces', 'Piscis', 'Poissons'))
# (name, deity/theme) — standard presiding deities
NAKSHATRA = (
 ('Ашвіні', 'Ashvini', 'зцілення, швидкий старт', 'healing, a fast start', 'curación, inicio rápido', 'guérison, départ rapide'),
 ('Бхарані', 'Bharani', 'межі, відповідальність, Яма', 'limits, accountability, Yama', 'límites, responsabilidad, Yama', 'limites, responsabilité, Yama'),
 ('Кріттіка', 'Krittika', 'вогонь, очищення, різкість', 'fire, purification, sharpness', 'fuego, purificación, filo', 'feu, purification, tranchant'),
 ('Рохіні', 'Rohini', 'зростання, достаток', 'growth, abundance', 'crecimiento, abundancia', 'croissance, abondance'),
 ('Мрігашира', 'Mrigashira', 'пошук, розвідка', 'search, exploration', 'búsqueda, exploración', 'recherche, exploration'),
 ('Ардра', 'Ardra', 'буря, руйнування заради оновлення', 'storm, destruction for renewal', 'tormenta, destrucción para renovar', 'tempête, destruction pour renouveler'),
 ('Пунарвасу', 'Punarvasu', 'повернення, відновлення', 'return, restoration', 'retorno, restauración', 'retour, restauration'),
 ('Пушья', 'Pushya', 'підтримка, опіка, ресурси', 'support, care, resources', 'apoyo, cuidado, recursos', 'soutien, soin, ressources'),
 ('Ашлеша', 'Ashlesha', 'хитрість, приховані впливи', 'cunning, hidden influences', 'astucia, influencias ocultas', 'ruse, influences cachées'),
 ('Магха', 'Magha', 'предки, влада, «трон», спадщина', 'ancestors, power, the throne, legacy', 'ancestros, poder, el trono, legado', 'ancêtres, pouvoir, le trône, héritage'),
 ('Пурва-пхалгуні', 'Purva Phalguni', 'задоволення, союзи', 'pleasure, unions', 'placer, uniones', 'plaisir, unions'),
 ('Уттара-пхалгуні', 'Uttara Phalguni', 'договори, покровительство', 'contracts, patronage', 'contratos, patrocinio', 'contrats, patronage'),
 ('Хаста', 'Hasta', 'майстерність, практичні справи', 'skill, practical work', 'destreza, asuntos prácticos', 'habileté, affaires pratiques'),
 ('Чітра', 'Chitra', 'будівництво, форма', 'construction, form', 'construcción, forma', 'construction, forme'),
 ('Сваті', 'Swati', 'вітер, торгівля, незалежність', 'wind, trade, independence', 'viento, comercio, independencia', 'vent, commerce, indépendance'),
 ('Вішакха', 'Vishakha', 'мета, суперництво', 'purpose, rivalry', 'propósito, rivalidad', 'but, rivalité'),
 ('Анурадха', 'Anuradha', 'дружба, організація', 'friendship, organisation', 'amistad, organización', 'amitié, organisation'),
 ('Джйештха', 'Jyeshtha', 'старшинство, боротьба за першість', 'seniority, struggle for primacy', 'primacía, lucha por el liderazgo', 'aînesse, lutte pour la primauté'),
 ('Мула', 'Mula', 'корені, руйнування основ', 'roots, uprooting of foundations', 'raíces, desarraigo de los cimientos', 'racines, déracinement des fondations'),
 ('Пурва-ашадха', 'Purva Ashadha', 'непереможність, вода', 'invincibility, water', 'invencibilidad, agua', 'invincibilité, eau'),
 ('Уттара-ашадха', 'Uttara Ashadha', 'остаточна перемога, закон', 'final victory, law', 'victoria final, ley', 'victoire finale, loi'),
 ('Шравана', 'Shravana', 'слухання, знання, зв’язок', 'listening, knowledge, connection', 'escucha, conocimiento, conexión', 'écoute, savoir, lien'),
 ('Дхаништха', 'Dhanishta', 'багатство, ритм', 'wealth, rhythm', 'riqueza, ritmo', 'richesse, rythme'),
 ('Шатабхіша', 'Shatabhisha', 'лікування, таємниці', 'healing, secrets', 'curación, secretos', 'guérison, secrets'),
 ('Пурва-бхадрапада', 'Purva Bhadrapada', 'жар, радикальні зміни', 'heat, radical change', 'ardor, cambio radical', 'ardeur, changement radical'),
 ('Уттара-бхадрапада', 'Uttara Bhadrapada', 'глибина, стабілізація', 'depth, stabilisation', 'profundidad, estabilización', 'profondeur, stabilisation'),
 ('Реваті', 'Revati', 'завершення циклу, подорожі', 'end of a cycle, journeys', 'fin de ciclo, viajes', 'fin de cycle, voyages'))
SIGN_GEN_UK = ('Овна', 'Тельця', 'Близнюків', 'Рака', 'Лева', 'Діви', 'Терезів', 'Скорпіона', 'Стрільця', 'Козерога', 'Водолія', 'Риб')
SIGN_LOC_UK = ('в Овні', 'у Тельці', 'у Близнюках', 'у Раку', 'у Леві', 'у Діві', 'у Терезах', 'у Скорпіоні', 'у Стрільці', 'у Козерозі', 'у Водолії', 'у Рибах')
TEMPLATE = {
 'conjunction': ('{a} і {b} разом {sign_loc}: поєднуються теми «{ta}» і «{tb}».',
                 '{a} and {b} together in {sign}: the themes “{ta}” and “{tb}” combine.',
                 '{a} y {b} juntos en {sign}: se combinan los temas «{ta}» y «{tb}».',
                 '{a} et {b} ensemble en {sign} : les thèmes « {ta} » et « {tb} » se combinent.'),
 'sign_ingress': ('{a} переходить у знак {sign_gen}: теми «{ta}» у сфері знака {sign_gen}.',
                  '{a} enters {sign}: the themes “{ta}” move into the domain of {sign}.',
                  '{a} entra en {sign}: los temas «{ta}» pasan al ámbito de {sign}.',
                  '{a} entre en {sign} : les thèmes « {ta} » passent dans le signe {sign}.'),
 'nakshatra_ingress': ('{a} у накшатрі {nak} ({nt}).', '{a} in the nakshatra {nak} ({nt}).', '{a} en el nakshatra {nak} ({nt}).', '{a} dans le nakshatra {nak} ({nt}).'),
 'station': ('{a} зупиняється й розвертається ({dir}): теми «{ta}» переглядаються.',
             '{a} stations {dir}: the themes “{ta}” come up for review.',
             '{a} se estaciona {dir}: los temas «{ta}» se revisan.',
             '{a} stationne {dir} : les thèmes « {ta} » sont réexaminés.'),
 'retrograde': ('{a} {retro_uk}: теми «{ta}» затримуються й повертаються.',
                '{a} is retrograde: the themes “{ta}” are delayed and return.',
                '{a} está retrógrado: los temas «{ta}» se retrasan y vuelven.',
                '{a} est rétrograde : les thèmes « {ta} » sont retardés et reviennent.'),
 'gandanta': ('{a} у ганданті (стик води й вогню): нестійкий, перехідний стан тем «{ta}».',
              '{a} in gandanta (the water–fire junction): an unstable, transitional state for “{ta}”.',
              '{a} en gandanta (unión agua–fuego): estado inestable y de transición para «{ta}».',
              '{a} en gandanta (jonction eau–feu) : état instable et transitoire pour « {ta} ».'),
 'combustion': ('{a} {comb_uk} Сонцем: теми «{ta}» слабшають, поступаються владі.',
                '{a} is combust: the themes “{ta}” weaken and yield to authority.',
                '{a} está combusto: los temas «{ta}» se debilitan y ceden ante la autoridad.',
                '{a} est combuste : les thèmes « {ta} » s’affaiblissent et cèdent à l’autorité.'),
 'graha_yuddha': ('Планетна війна {a} і {b}: зіткнення тем «{ta}» і «{tb}».',
                  'Planetary war of {a} and {b}: a clash of “{ta}” and “{tb}”.',
                  'Guerra planetaria de {a} y {b}: choque de «{ta}» y «{tb}».',
                  'Guerre planétaire entre {a} et {b} : affrontement de « {ta} » et « {tb} ».'),
 'kharmas': ('Кхармас (Сонце в знаку Юпітера): традиційно не починають шлюби й великі справи.',
             'Kharmas (the Sun in a sign of Jupiter): traditionally no weddings or major beginnings.',
             'Kharmas (el Sol en un signo de Júpiter): tradicionalmente sin bodas ni grandes comienzos.',
             'Kharmas (le Soleil dans un signe de Jupiter) : traditionnellement ni mariages ni grands commencements.'),
 'solar_eclipse': ('Сонячне затемнення ({kind}) на осі {axis}.', 'Solar eclipse ({kind}) on the {axis} axis.', 'Eclipse solar ({kind}) en el eje {axis}.', 'Éclipse solaire ({kind}) sur l’axe {axis}.'),
 'lunar_eclipse': ('Місячне затемнення ({kind}) на осі {axis}.', 'Lunar eclipse ({kind}) on the {axis} axis.', 'Eclipse lunar ({kind}) en el eje {axis}.', 'Éclipse lunaire ({kind}) sur l’axe {axis}.'),
}
DIR = {'retrograde': ('назад', 'retrograde', 'retrógrado', 'rétrograde'), 'direct': ('прямо', 'direct', 'directo', 'direct')}
LABEL = {'status': ('традиційне значення · не перевірено', 'traditional meaning · not validated', 'significado tradicional · no validado', 'sens traditionnel · non validé'),
         # Classical texts define gandanta for tithi/nakshatra/lagna; for a transiting planet it is a modern convention (source audit 27.10.2026).
         'modern': ('сучасна конвенція · у класичних текстах для транзиту не встановлено · не перевірено', 'modern convention · not established for transits in classical texts · not validated', 'convención moderna · no establecida para tránsitos en los textos clásicos · no validado', 'convention moderne · non établie pour les transits dans les textes classiques · non validé')}
SLOW = ('Jupiter', 'Saturn', 'Rahu', 'Ketu')
# Objective series a claim can be checked against later. Mapping is a pre-registered hypothesis, not a finding.
DOMAIN = {'Jupiter': 'gold_volatility', 'Saturn': 'equity_volatility', 'Rahu': 'equity_volatility', 'Ketu': 'gold_volatility',
          'Mars': 'geomagnetic_kp', 'Sun': 'geomagnetic_kp'}


def _theme(g, i):
    return GRAHA[g]['themes'][i]


def intensity(item, events):
    """0–3 from measurable conditions only (orb, slow planets, gandanta, graha yuddha)."""
    score = 0
    b = item.get('bodies', [])
    if item['type'] in ('conjunction', 'graha_yuddha'):
        score += 1
        if item.get('min_orb_deg', 3) < 1:
            score += 1
        if sum(x in SLOW for x in b) >= 1 and item['type'] == 'conjunction':
            score += 1
    elif item['type'] in ('station', 'solar_eclipse', 'lunar_eclipse'):
        score += 2
    elif item['type'] == 'sign_ingress' and b and b[0] in SLOW:
        score += 2
    elif item['type'] in ('retrograde', 'combustion', 'gandanta', 'sign_ingress', 'kharmas'):
        score += 1
    return min(score, 3)


def describe(item, lang):
    i = LANGS.index(lang)
    t = TEMPLATE.get(item['type'])
    if not t:
        return None
    b = item.get('bodies', [])
    a = GRAHA[b[0]]['name'][i] if b else ''
    bb = GRAHA[b[1]]['name'][i] if len(b) > 1 else ''
    sign = item.get('exact_sign', item.get('to') if item['type'] == 'sign_ingress' else item.get('sign'))
    nak = item.get('to') if item['type'] == 'nakshatra_ingress' else None
    fields = dict(a=a, b=bb, ta=_theme(b[0], i) if b else '', tb=_theme(b[1], i) if len(b) > 1 else '',
                  sign=SIGN[sign][i] if isinstance(sign, int) else '',
                  sign_gen=SIGN_GEN_UK[sign] if isinstance(sign, int) else '', sign_loc=SIGN_LOC_UK[sign] if isinstance(sign, int) else '', dir=DIR.get(item.get('direction'), ('',) * 4)[i],
                  retro_uk='ретроградна' if b and b[0] == 'Venus' else 'ретроградний', comb_uk='спалена' if b and b[0] == 'Venus' else 'спалений',
                  kind=item.get('kind', ''), axis=GRAHA.get(item.get('node_axis'), {'name': ('',) * 4})['name'][i],
                  nak=NAKSHATRA[nak][0 if i == 0 else 1] if nak is not None else '', nt=NAKSHATRA[nak][2 + i] if nak is not None else '')
    return t[i].format(**fields)


def claim(item):
    """A testable statement for later scoring; never shown as a prediction of fact."""
    b = item.get('bodies', [])
    dom = next((DOMAIN[x] for x in b if x in DOMAIN), None)
    if not dom or intensity(item, None) < 2:
        return None
    start = item.get('start', item.get('at'))['kyiv_date']
    end = item.get('end', item.get('at'))['kyiv_date']
    return {'hypothesis': 'event_window_exceeds_baseline', 'series': dom, 'window': [start, end],
            'metric': 'median daily absolute change' if dom != 'geomagnetic_kp' else 'daily maximum Kp',
            'baseline': 'same metric over the preceding 250 trading/calendar days, 75th percentile',
            'status': 'pending', 'pre_registered': True}


def annotate(sky):
    """Add readings to a sky_transits_v1 document in place; returns it."""
    for item in sky['events'] + sky['intervals']:
        if item['type'] in ('pada_ingress', 'drishti'):
            continue
        if item['type'] == 'sign_ingress' and item['bodies'] == ['Moon']:
            continue
        text = {lang: describe(item, lang) for lang in LANGS}
        if not text['uk']:
            continue
        modern = item['type'] == 'gandanta' and item['bodies'] != ['Moon']
        item['reading'] = {'text': text, 'intensity': intensity(item, None), 'label': dict(zip(LANGS, LABEL['modern' if modern else 'status'])),
                           'source': SOURCE, 'score_adjustment': 0}
        if modern:
            item['reading']['convention'] = 'modern_transit_gandanta_not_classical'
        c = None if modern else claim(item)
        if c:
            item['reading']['claim'] = c
    sky['interpretation_model'] = {'version': 'skyrhythm-meaning-v1', 'source': SOURCE, 'validated': False,
                                   'note': 'Traditional readings; accuracy is measured prospectively, not assumed.'}
    return sky
