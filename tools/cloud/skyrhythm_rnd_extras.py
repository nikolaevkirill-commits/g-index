"""R&D-ознаки SkyRhythm (вага 0). НЕ підключати до production / G / score.
Усі функції повертають словники з status=EXPLORATORY_NOT_VALIDATED, score_adjustment=0.
Ефемериди: pyswisseph, Moshier (FLG_MOSEPH). Тітхі = елонгація Місяць−Сонце / 12° (не залежить від аянамші).
Конвенції [ТЛУМ]: парана — Drik Panchang (Hari Vasara = перша 1/4 двадаші; пратахкала = схід + 1/5 світлового дня);
санкранті після заходу -> також наступний цивільний день; Прадош — захід .. захід + ніч/5.
"""
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
import swisseph as swe

FL = swe.FLG_MOSEPH
LOCATIONS = {  # (lon E, lat N, tz)
    'Sofia': (23.32, 42.70, 'Europe/Sofia'),
    'Nesebar': (27.735, 42.659, 'Europe/Sofia'),
    'Kyiv': (30.52, 50.45, 'Europe/Kyiv'),
}
META = {'status': 'EXPLORATORY_NOT_VALIDATED', 'score_adjustment': 0, 'physical_uncertainty_ms': None, 'normative_status': 'UNVERIFIED', 'city_status': 'SCENARIO_NOT_CONFIRMED'}


def _jd_utc(dt):
    if dt.tzinfo is None or dt.utcoffset() is None: raise ValueError('Timezone-aware datetime required')
    u = dt.astimezone(ZoneInfo('UTC'))
    return swe.julday(u.year, u.month, u.day, u.hour + u.minute / 60 + (u.second + u.microsecond / 1e6) / 3600)


def _dt(jd, tz):
    y, m, d, h = swe.revjul(jd)
    return (datetime(y, m, d, tzinfo=ZoneInfo('UTC')) + timedelta(hours=h)).astimezone(ZoneInfo(tz))


def _loc(city):
    lon, lat, tz = LOCATIONS[city]
    return (lon, lat, 0.0), tz


def sun_events(day, city):
    """Схід/захід (верхній край, стандартна рефракція swe) для цивільної дати day."""
    geo, tz = _loc(city)
    jd0 = _jd_utc(datetime(day.year, day.month, day.day, 0, 0, tzinfo=ZoneInfo(tz)))
    rise = swe.rise_trans(jd0, swe.SUN, swe.CALC_RISE, geo, 0, 0, FL)[1][0]
    sset = swe.rise_trans(rise, swe.SUN, swe.CALC_SET, geo, 0, 0, FL)[1][0]
    nrise = swe.rise_trans(sset, swe.SUN, swe.CALC_RISE, geo, 0, 0, FL)[1][0]
    return rise, sset, nrise, tz


def _elong(jd):
    m = swe.calc_ut(jd, swe.MOON, FL)[0][0]
    s = swe.calc_ut(jd, swe.SUN, FL)[0][0]
    return (m - s) % 360.0


def tithi_at(jd):
    return int(_elong(jd) // 12) + 1


def _cross(jd_a, jd_b, target):
    """Бісекція: момент, коли елонгація проходить target (у межах [a,b])."""
    f = lambda j: ((_elong(j) - target + 180) % 360) - 180
    a, b = jd_a, jd_b
    if not a < b or not f(a) <= 0 <= f(b): raise ValueError("Root is not bracketed")
    for _ in range(60):
        mid = (a + b) / 2
        if f(a) * f(mid) <= 0:
            b = mid
        else:
            a = mid
    return (a + b) / 2


def tithi_span(jd):
    """Початок і кінець тітхі, що діє в момент jd."""
    t = tithi_at(jd)
    lo = (t - 1) * 12.0
    hi = (t * 12.0) % 360
    start = _cross(jd - 1.6, jd, lo)
    end = _cross(jd, jd + 1.6, hi)
    return t, start, end


def _rise_on(day, city):
    geo, tz = _loc(city)
    z = _jd_utc(datetime(day.year, day.month, day.day, tzinfo=ZoneInfo(tz)))
    stop = _jd_utc(datetime(day.year, day.month, day.day, tzinfo=ZoneInfo(tz)) + timedelta(days=1))
    r = swe.rise_trans(z, swe.SUN, swe.CALC_RISE, geo, 0, 0, FL)
    return r[1][0] if r[0] == 0 and z <= r[1][0] < stop else None  # V10: схід саме цієї дати (полярні дні)


def parana_day_rule(day, city, convention='smarta_drik'):
    """V10: чи є цивільна дата day днем Парани [ТЛУМ, normative UNVERIFIED].
    Спільне: пост — день, коли Екадаші діє на схід; вріддхі-Екадаші (два сходи) — пост на другий день;
    Парана — наступний день після посту.
    Кшая-Екадаші (не торкається жодного сходу):
      'smarta_drik'      — пост у день початку Екадаші (схід у Дашамі), Парана — перший день зі сходом у Двадаші
                           (так у списку Drik Smarta 2026: 10.07 і 20.11, Делі);
      'vaishnava_kshaya' — пост у перший день зі сходом у Двадаші, Парана — наступного дня
                           (так у Drik Vaishnava 11.07 і 21.11; і в авторки, допис 494, 2020).
    Дашамі-віддха / аруноdaя (вайшнавське зміщення, напр. Делі 24.08.2026) НЕ моделюється."""
    if convention not in ('smarta_drik', 'vaishnava_kshaya'):
        raise ValueError('Unknown Parana convention')
    r0 = _rise_on(day, city)
    ry = _rise_on(day - timedelta(days=1), city)
    if r0 is None or ry is None:
        return False, 'NO_LOCAL_SUNRISE'
    t0, ty = tithi_at(r0), tithi_at(ry)
    if ty in (11, 26):
        if t0 in (11, 26):
            return False, 'VRIDDHI_EKADASHI_FAST_CONTINUES'
        return True, 'FAST_ON_EKADASHI_SUNRISE'
    if convention == 'smarta_drik':
        if t0 in (12, 27) and ty in (10, 25):
            return True, 'KSHAYA_EKADASHI_SMARTA_FAST_ON_DASHAMI_SUNRISE_DAY'
        return False, 'NO_FAST_YESTERDAY'
    # vaishnava_kshaya
    if ty in (12, 27):
        r2 = _rise_on(day - timedelta(days=2), city)
        if r2 is not None and tithi_at(r2) in (10, 25):
            return True, 'KSHAYA_EKADASHI_VAISHNAVA_FAST_ON_DVADASHI_SUNRISE'
    return False, 'NO_FAST_YESTERDAY'


def parana_window(day, city='Sofia', convention='smarta_drik'):
    """Вікно виходу з Екадаші на цивільну дату day (дата двадаші за сходом).
    start = max(схід, кінець Hari Vasara); end = min(схід + світловий день/5, кінець двадаші);
    якщо двадаша закінчилась до сходу — end = пратахкала (виняток Drik)."""
    ok, why = parana_day_rule(day, city, convention)
    if not ok:
        return dict(META, feature='parana_window', date=str(day), city=city, available=False, reason=why, start=None, end=None)
    rise, sset, _, tz = sun_events(day, city)
    t, ts, te = tithi_span(rise)
    note = []
    if t in (12, 27):
        dv_s, dv_e = ts, te
    else:  # двадаша могла закінчитись до сходу
        jd = rise - 0.2
        while tithi_at(jd) not in (12, 27) and jd > rise - 1.2:
            jd -= 0.05
        if tithi_at(jd) not in (12, 27):
            return dict(META, feature='parana_window', date=str(day), city=city, available=False, reason='NO_RECENT_DVADASHI', start=None, end=None)
        _, dv_s, dv_e = tithi_span(jd)
        note.append('DVADASHI_ENDED_BEFORE_SUNRISE')
    hari_vasara_end = dv_s + (dv_e - dv_s) / 4
    pratah = rise + (sset - rise) / 5
    start = max(rise, hari_vasara_end)
    end = pratah if 'DVADASHI_ENDED_BEFORE_SUNRISE' in note else min(pratah, dv_e)
    if dv_e < pratah and dv_e > rise:
        note.append('END_BY_DVADASHI')
    if start >= end:
        return dict(META, feature='parana_window', date=str(day), city=city, available=False, reason='EMPTY_WINDOW', start=None, end=None)
    f = lambda j: _dt(j, tz).strftime('%H:%M')
    return dict(META, available=True, normative_selection_confirmed=False, feature='parana_window', date=str(day), city=city, start=f(start), end=f(end),
                sunrise=f(rise), pratahkala=f(pratah), dvadashi_end=_dt(dv_e, tz).strftime('%Y-%m-%d %H:%M'),
                hari_vasara_end=_dt(hari_vasara_end, tz).strftime('%Y-%m-%d %H:%M'), notes=note)


def sankranti_days(year, city='Sofia'):
    """Сидеричні (Lahiri) входи Сонця в знаки за рік; дні: цивільний + наступний, якщо після заходу."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    geo, tz = _loc(city)
    fl = FL | swe.FLG_SIDEREAL
    lon = lambda j: swe.calc_ut(j, swe.SUN, fl)[0][0]
    out = []
    jd = swe.julday(year, 1, 1, 0) - 1
    end = swe.julday(year + 1, 1, 1, 0)
    while jd < end:
        a, b = jd, jd + 1
        if int(lon(a) // 30) != int(lon(b) // 30):
            target = (int(lon(b) // 30)) * 30.0
            g = lambda j: ((lon(j) - target + 180) % 360) - 180
            for _ in range(50):
                m = (a + b) / 2
                if g(a) * g(m) <= 0: b = m
                else: a = m
            t = _dt((a + b) / 2, tz)
            if t.year == year:
                _, sset, _, _ = sun_events(t.date(), city)
                after = (a + b) / 2 > sset
                days = [str(t.date())] + ([str(t.date() + timedelta(days=1))] if after else [])
                out.append(dict(META, feature='sankranti', sign_index=int(target // 30), ingress_local=t.strftime('%Y-%m-%d %H:%M'),
                                after_sunset=after, days=days, rule='CIVIL_DAY_PLUS_NEXT_IF_AFTER_SUNSET'))
        jd += 1
    return out


def pradosh_window(day, city='Nesebar', variant='night_fifth'):
    """variant: 'night_fifth' = захід .. захід + ніч/5; 'legend_pm45' = захід ±45 хв (легенда календаря 2026)."""
    if variant not in ('night_fifth','legend_pm45'): raise ValueError('Unknown Pradosh variant')
    _, sset, nrise, tz = sun_events(day, city)
    if variant == 'night_fifth':
        a, b = sset, sset + (nrise - sset) / 5
    else:
        a, b = sset - 45 / 1440, sset + 45 / 1440
    f = lambda j: _dt(j, tz).strftime('%H:%M')
    return dict(META, feature='pradosh_window', variant=variant, date=str(day), city=city, start=f(a), end=f(b),
                tithi_at_sunset=tithi_at(sset))
