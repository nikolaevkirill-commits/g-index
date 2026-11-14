"""Regenerate tools/public/fixtures/lunar_reference_swiss_de431.json (reference for verify_lunar_core.cjs).

Needs pyswisseph==2.10.3.2 and the Swiss Ephemeris files sepl_18.se1 / semo_18.se1 (DE431 based,
https://github.com/aloistr/swisseph/tree/master/ephe) in the directory given as the first argument.
The files are not stored in this repository; their SHA-256 is recorded in the fixture.
Usage: python tools/public/generate_lunar_reference.py <ephe_dir> [first_year=2017] [end_year=2029]
"""
import datetime, hashlib, json, pathlib, sys
import swisseph as swe

TT_SECONDS = 69.184
KINDS = ('nakshatra', 'tithi', 'yoga', 'karana')
STEP_MS = 1_800_000


def labels(ms, flag):
    jd_tt = ms / 86_400_000.0 + 2440587.5 + TT_SECONDS / 86400.0
    moon, used = swe.calc(jd_tt, swe.MOON, flag | swe.FLG_SIDEREAL)
    sun, _ = swe.calc(jd_tt, swe.SUN, flag | swe.FLG_SIDEREAL)
    if used & flag != flag:
        raise SystemExit('Requested ephemeris was not used; check the ephemeris directory.')
    phase = (moon[0] - sun[0]) % 360
    return {'nakshatra': int(moon[0] // (360 / 27)) + 1, 'tithi': int(phase // 12) + 1,
            'yoga': int(((moon[0] + sun[0]) % 360) // (360 / 27)) + 1, 'karana': int(phase // 6)}


def boundaries(flag, start, end):
    out = {kind: [] for kind in KINDS}
    previous, t = labels(start, flag), start
    while t < end:
        current = labels(t + STEP_MS, flag)
        for kind in KINDS:
            if current[kind] != previous[kind]:
                lo, hi = t, t + STEP_MS
                while hi - lo > 1:
                    mid = (lo + hi) // 2
                    if labels(mid, flag)[kind] == previous[kind]:
                        lo = mid
                    else:
                        hi = mid
                out[kind].append([hi, current[kind]])
        previous, t = current, t + STEP_MS
    return out


def main():
    ephe = pathlib.Path(sys.argv[1])
    first, last = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2017, 2029)
    swe.set_ephe_path(str(ephe))
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    ms = lambda year: int(datetime.datetime(year, 1, 1, tzinfo=datetime.timezone.utc).timestamp() * 1000)
    swiss, moshier = boundaries(swe.FLG_SWIEPH, ms(first), ms(last)), boundaries(swe.FLG_MOSEPH, ms(first), ms(last))
    document = {
        'schema': 'skyrhythm.lunar_reference.v1', 'generator': 'tools/public/generate_lunar_reference.py',
        'engine': f'Swiss Ephemeris {swe.version} (pyswisseph 2.10.3.2), FLG_SWIEPH|FLG_SIDEREAL, SIDM_LAHIRI, apparent geocentric',
        'ephemeris_files_sha256': {name: hashlib.sha256((ephe / name).read_bytes()).hexdigest() for name in ('semo_18.se1', 'sepl_18.se1')},
        'range_utc': [f'{first}-01-01T00:00:00Z', f'{last}-01-01T00:00:00Z'],
        'time_scale': 'TT = UTC + 69.184 s (jd_tt passed to swe.calc)',
        'definition': '[utc_ms, value_after]: first millisecond at which the label has the new value; survey 30 min, bisection to 1 ms',
        'karana': 'index 0..59 = floor(elongation/6)', 'physical_uncertainty_ms': None, 'boundaries': swiss,
        'moshier_max_abs_difference_ms': {kind: max(abs(a[0] - b[0]) for a, b in zip(swiss[kind], moshier[kind])) for kind in KINDS},
    }
    target = pathlib.Path(__file__).resolve().parent / 'fixtures' / 'lunar_reference_swiss_de431.json'
    target.write_text(json.dumps(document, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    print({kind: len(rows) for kind, rows in swiss.items()})


if __name__ == '__main__':
    main()
