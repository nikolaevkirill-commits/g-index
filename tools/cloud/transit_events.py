"""Mundane transit events for a 27-day window (context layer, score weight 0).

Conventions (stated in every output, never silently changed):
- sidereal zodiac, Lahiri ayanamsa; Moshier ephemeris (as the rest of the cloud code);
- Rahu = true node, Ketu = Rahu + 180 deg;
- conjunction window: orb <= 3 deg (Moon excluded, Rahu-Ketu pair excluded);
- gandanta: last 3 deg 20' of a water sign / first 3 deg 20' of the following fire sign;
- combustion orbs (Surya Siddhanta/BPHS tradition): Moon 12, Mars 17, Mercury 14 (12 when retrograde),
  Jupiter 11, Venus 10 (8 when retrograde), Saturn 15;
- graha yuddha: two of Mars/Mercury/Jupiter/Venus/Saturn within 1 deg of longitude;
- drishti (whole-sign): every graha the 7th; Mars 4/8, Jupiter 5/9, Saturn 3/10, Rahu/Ketu 5/9
  (the Rahu/Ketu special aspects are a disputed convention and flagged as such);
- Kharmas: Sun in sidereal Sagittarius or Pisces.
All instants are found by bisection to < 1 minute and reported in UTC and Europe/Kyiv.
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import math
import swisseph as swe

KYIV = ZoneInfo('Europe/Kyiv')
FLAGS = swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
GRAHAS = ('Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu')
SWE_ID = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY, 'Jupiter': swe.JUPITER,
          'Venus': swe.VENUS, 'Saturn': swe.SATURN, 'Rahu': swe.TRUE_NODE, 'Ketu': swe.TRUE_NODE}
STAR_PLANETS = ('Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn')
COMBUST = {'Moon': (12, 12), 'Mars': (17, 17), 'Mercury': (14, 12), 'Jupiter': (11, 11), 'Venus': (10, 8), 'Saturn': (15, 15)}
SPECIAL_ASPECTS = {'Mars': (4, 7, 8), 'Jupiter': (5, 7, 9), 'Saturn': (3, 7, 10), 'Rahu': (5, 7, 9), 'Ketu': (5, 7, 9)}
NAK = 360 / 27
PADA = NAK / 4
GANDANTA = 10 / 3
CONVENTION = {
    'zodiac': 'sidereal_lahiri', 'ephemeris': 'moshier', 'node': 'true_node', 'conjunction_orb_deg': 3,
    'gandanta_deg': round(GANDANTA, 6), 'combustion_orbs': COMBUST, 'graha_yuddha_deg': 1,
    'drishti': 'whole_sign; Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10, Rahu/Ketu 5/7/9 (disputed), others 7',
    'kharmas': 'Sun in sidereal Sagittarius or Pisces', 'score_adjustment': 0,
    'physical_uncertainty_ms': None, 'numerical_bracket_seconds': 30,
    'daily_positions_local_time': '12:00 Europe/Kyiv',
    'status': 'CONTEXT_ZERO_WEIGHT_NOT_VALIDATED'}


def jd(t):
    if t.tzinfo is None:
        raise ValueError('Timezone-aware instant required')
    u = t.astimezone(timezone.utc)
    return swe.julday(u.year, u.month, u.day, u.hour + u.minute / 60 + (u.second + u.microsecond / 1e6) / 3600)


def from_jd(j):
    y, m, d, h = swe.revjul(j)
    return datetime(y, m, d, tzinfo=timezone.utc) + timedelta(hours=h)


def position(name, j):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    result = swe.calc_ut(j, SWE_ID[name], FLAGS)
    r, flags = result[0], result[1]
    if not flags & swe.FLG_MOSEPH:
        raise RuntimeError('Unexpected ephemeris')
    lon, speed = r[0] % 360, r[3]
    if name == 'Ketu':
        lon = (lon + 180) % 360
    return lon, speed


def signed(x):
    return (x + 180) % 360 - 180


def stamp(j):
    t = (from_jd(j) + timedelta(microseconds=500000)).replace(microsecond=0)
    return {'utc': t.isoformat().replace('+00:00', 'Z'), 'kyiv': t.astimezone(KYIV).strftime('%Y-%m-%d %H:%M'),
            'kyiv_date': t.astimezone(KYIV).strftime('%Y-%m-%d')}


def bisect(f, a, b, fa=None):
    """Root of a sign change of f on [a, b] to < 30 s."""
    fa = f(a) if fa is None else fa
    for _ in range(40):
        m = (a + b) / 2
        fm = f(m)
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b = m
        if b - a < 30 / 86400:
            break
    return (a + b) / 2


def scan_states(state, j0, j1, step):
    """Yield (j, old, new) for every change of a discrete state, located to < 30 s."""
    out = []
    j, s = j0, state(j0)
    while j < j1:
        k = min(j + step, j1)
        t = state(k)
        if t != s:
            a, b = j, k
            for _ in range(40):
                m = (a + b) / 2
                if state(m) == s:
                    a = m
                else:
                    b = m
                if b - a < 30 / 86400:
                    break
            out.append((b, s, state(b)))
            s = state(b)
            j = b
            continue
        j, s = k, t
    return out


def window(start_day, days=27):
    d = datetime.fromisoformat(start_day).date()
    a = datetime(d.year, d.month, d.day, tzinfo=KYIV)
    b = a + timedelta(days=days)
    return jd(a), jd(b)


def compute(start_day, days=27, now=None):
    j0, j1 = window(start_day, days)
    events, intervals = [], []
    step = {'Moon': 1 / 24}
    # 1-2. sign, nakshatra and pada ingresses (Moon: sign only; its nakshatra is in the Panchanga)
    for g in GRAHAS:
        st = step.get(g, 0.25)
        for kind, size in (('sign', 30), ('nakshatra', NAK), ('pada', PADA)):
            if g == 'Moon' and kind != 'sign':
                continue
            for j, old, new in scan_states(lambda x, g=g, size=size: int(position(g, x)[0] // size), j0, j1, st):
                retro = position(g, j)[1] < 0
                ev = {'type': kind + '_ingress', 'bodies': [g], 'at': stamp(j), 'from': old, 'to': new, 'retrograde': retro}
                if kind == 'pada':
                    ev.update(nakshatra=new // 4, pada=new % 4 + 1)
                events.append(ev)
    # 3. conjunctions (exact moment and the <= 3 deg interval)
    pairs = [(a, b) for i, a in enumerate(GRAHAS) for b in GRAHAS[i + 1:]
             if 'Moon' not in (a, b) and {a, b} != {'Rahu', 'Ketu'}]
    for a, b in pairs:
        diff = lambda x: signed(position(a, x)[0] - position(b, x)[0])
        within = lambda x: abs(diff(x)) <= 3
        start_in = within(j0)
        changes = scan_states(within, j0, j1, 0.25)
        bounds = [j0] if start_in else []
        for j, _old, new in changes:
            bounds.append(j)
        if len(bounds) % 2:
            bounds.append(j1)
        for s, e in zip(bounds[::2], bounds[1::2]):
            iv = {'type': 'conjunction', 'bodies': [a, b], 'start': stamp(s), 'end': stamp(e),
                  'started_before_window': s == j0 and start_in, 'continues_after_window': e == j1}
            # exact: sign change of the difference inside the interval
            x, fx = s, diff(s)
            while x < e:
                y = min(x + 0.25, e)
                fy = diff(y)
                if (fx > 0) != (fy > 0) and abs(fx - fy) < 180:
                    k = bisect(diff, x, y, fx)
                    iv['exact'] = stamp(k)
                    iv['exact_sign'] = int(position(a, k)[0] // 30)
                    iv['exact_deg_in_sign'] = round(position(a, k)[0] % 30, 2)
                    break
                x, fx = y, fy
            iv['min_orb_deg'] = round(min(abs(diff(s + (e - s) * i / 48)) for i in range(49)), 2)
            intervals.append(iv)
    # 5. gandanta, 7. combustion, 8. graha yuddha, 10. kharmas, 6. retrograde: as intervals of a boolean state
    def boolean_intervals(kind, bodies, pred, st, extra=None):
        on = pred(j0)
        bounds = [j0] if on else []
        for j, _o, _n in scan_states(pred, j0, j1, st):
            bounds.append(j)
        if len(bounds) % 2:
            bounds.append(j1)
        for s, e in zip(bounds[::2], bounds[1::2]):
            iv = {'type': kind, 'bodies': bodies, 'start': stamp(s), 'end': stamp(e),
                  'started_before_window': s == j0 and on, 'continues_after_window': e == j1}
            if extra:
                iv.update(extra(s, e))
            intervals.append(iv)

    def in_gandanta(g):
        def f(x):
            lon = position(g, x)[0]
            return any(abs(signed(lon - b)) < GANDANTA for b in (0, 120, 240))
        return f

    for g in GRAHAS:
        boolean_intervals('gandanta', [g], in_gandanta(g), step.get(g, 0.25),
                          lambda s, e, g=g: {'junction_deg': round(min((0, 120, 240), key=lambda b: abs(signed(position(g, (s + e) / 2)[0] - b))), 0)})
    for g in ('Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'):
        boolean_intervals('retrograde', [g], lambda x, g=g: position(g, x)[1] < 0, 0.25)
    for g, (direct, retro) in COMBUST.items():
        def comb(x, g=g, direct=direct, retro=retro):
            lon, sp = position(g, x)
            return abs(signed(lon - position('Sun', x)[0])) < (retro if sp < 0 else direct)
        boolean_intervals('combustion', [g], comb, step.get(g, 0.25))
    for i, a in enumerate(STAR_PLANETS):
        for b in STAR_PLANETS[i + 1:]:
            boolean_intervals('graha_yuddha', [a, b], lambda x, a=a, b=b: abs(signed(position(a, x)[0] - position(b, x)[0])) < 1, 0.1)
    boolean_intervals('kharmas', ['Sun'], lambda x: int(position('Sun', x)[0] // 30) in (8, 11), 0.25)
    # stations (exact moment the speed changes sign)
    for g in ('Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'):
        for j, old, new in scan_states(lambda x, g=g: position(g, x)[1] < 0, j0, j1, 0.25):
            lon = position(g, j)[0]
            events.append({'type': 'station', 'bodies': [g], 'at': stamp(j), 'direction': 'retrograde' if new else 'direct',
                           'sign': int(lon // 30), 'deg_in_sign': round(lon % 30, 2)})
    # 4. whole-sign drishti relations between grahas (Moon excluded: it changes every 2.5 days)
    slow = [g for g in GRAHAS if g != 'Moon']
    for a in slow:
        for b in slow:
            if a == b or {a, b} == {'Rahu', 'Ketu'}:
                continue
            houses = SPECIAL_ASPECTS.get(a, (7,))
            pred = lambda x, a=a, b=b, houses=houses: ((int(position(b, x)[0] // 30) - int(position(a, x)[0] // 30)) % 12 + 1) in houses
            boolean_intervals('drishti', [a, b], pred, 0.25,
                              lambda s, e, a=a, b=b: {'house': (int(position(b, (s + e) / 2)[0] // 30) - int(position(a, (s + e) / 2)[0] // 30)) % 12 + 1,
                                                      'disputed': a in ('Rahu', 'Ketu')})
    # 9. eclipses (global maximum inside the window)
    j = j0
    while True:
        r = swe.sol_eclipse_when_glob(j, swe.FLG_MOSEPH, 0, False)
        if r[0] == 0 or r[1][0] >= j1:
            break
        kind = 'total' if r[0] & swe.ECL_TOTAL else 'annular' if r[0] & swe.ECL_ANNULAR else 'hybrid' if r[0] & swe.ECL_ANNULAR_TOTAL else 'partial'
        events.append({'type': 'solar_eclipse', 'bodies': ['Sun', 'Moon'], 'at': stamp(r[1][0]), 'kind': kind,
                       'node_axis': 'Rahu' if abs(signed(position('Sun', r[1][0])[0] - position('Rahu', r[1][0])[0])) < 90 else 'Ketu'})
        j = r[1][0] + 1
    j = j0
    while True:
        r = swe.lun_eclipse_when(j, swe.FLG_MOSEPH, 0, False)
        if r[0] == 0 or r[1][0] >= j1:
            break
        kind = 'total' if r[0] & swe.ECL_TOTAL else 'penumbral' if r[0] & swe.ECL_PENUMBRAL and not r[0] & swe.ECL_PARTIAL else 'partial'
        events.append({'type': 'lunar_eclipse', 'bodies': ['Moon'], 'at': stamp(r[1][0]), 'kind': kind,
                       'node_axis': 'Rahu' if abs(signed(position('Moon', r[1][0])[0] - position('Rahu', r[1][0])[0])) < 90 else 'Ketu'})
        j = r[1][0] + 1
    # daily positions at 12:00 Kyiv for the scene
    d0 = datetime.fromisoformat(start_day).date()
    daily = []
    for i in range(days):
        d = d0 + timedelta(days=i)
        k = jd(datetime(d.year, d.month, d.day, 12, tzinfo=KYIV))
        row = {'date': d.isoformat(), 'grahas': {}}
        for g in GRAHAS:
            lon, sp = position(g, k)
            row['grahas'][g] = {'lon': round(lon, 3), 'speed': round(sp, 4), 'retrograde': sp < 0,
                                'sign': int(lon // 30), 'nakshatra': int(lon // NAK), 'pada': int(lon % NAK // PADA) + 1}
        daily.append(row)
    key = lambda e: e['at']['utc'] if 'at' in e else e['start']['utc']
    events.sort(key=key)
    intervals.sort(key=key)
    return {'schema': 'sky_transits_v1', 'window': {'start': start_day, 'days': days, 'zone': 'Europe/Kyiv'},
            'generated_at': (now or datetime.now(timezone.utc)).isoformat(), 'convention': CONVENTION,
            'events': events, 'intervals': intervals, 'daily': daily}


if __name__ == '__main__':
    import json, sys
    start = sys.argv[1] if len(sys.argv) > 1 else datetime.now(KYIV).date().isoformat()
    print(json.dumps(compute(start), ensure_ascii=False, indent=1))
