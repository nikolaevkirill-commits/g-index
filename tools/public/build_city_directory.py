
"""Build a compact client-side search index from the GeoNames cities5000 ZIP."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

URL = 'https://download.geonames.org/export/dump/cities5000.zip'
ADMIN_URL = 'https://download.geonames.org/export/dump/admin1CodesASCII.txt'
ALT_URL = 'https://download.geonames.org/export/dump/alternateNamesV2.zip'
ROOT = Path(__file__).resolve().parents[2]
SEARCH_LANGUAGES = frozenset({'uk', 'en', 'es', 'fr'})

def read_aliases(archive, city_ids):
    aliases = {}
    with ZipFile(archive) as z, z.open('alternateNamesV2.txt') as records:
        for raw in records:
            columns = raw.rstrip(b'\r\n').split(b'\t')
            if len(columns) < 8 or columns[1] not in city_ids:
                continue
            language = columns[2].split(b'-', 1)[0].decode('ascii', errors='ignore')
            if language not in SEARCH_LANGUAGES or columns[6] == b'1' or columns[7] == b'1':
                continue
            if len(columns) > 9 and columns[9]:
                continue
            name = columns[3].decode('utf-8').strip()
            if 2 <= len(name) <= 100:
                aliases.setdefault(columns[1], []).append(name)
    return aliases

def build(archive, admin_file, alternate_names, out):
    admin = dict(line.split('\t')[:2] for line in admin_file.read_text(encoding='utf-8').splitlines() if '\t' in line)
    with ZipFile(archive) as z:
        entry = z.getinfo('cities5000.txt')
        lines = z.read(entry).decode('utf-8').splitlines()
    records = [line.split('\t') for line in lines]
    records = [x for x in records if len(x) == 19 and x[17] and x[0].isdecimal() and x[6] == 'P']
    by_city = read_aliases(alternate_names, {x[0].encode('ascii') for x in records})
    rows = []
    for x in records:
        labels = (x[2], *by_city.get(x[0].encode('ascii'), ()))
        aliases = list(dict.fromkeys(name for name in labels if name and name != x[1]))
        rows.append((int(x[14]), [int(x[0]), x[1], x[8], admin.get(x[8] + '.' + x[10], ''), round(float(x[4]), 5), round(float(x[5]), 5), x[17], aliases]))
    rows.sort(key=lambda x: (-x[0], x[1][0]))
    with alternate_names.open('rb') as aliases_file:
        aliases_digest = hashlib.file_digest(aliases_file, 'sha256').hexdigest()
    payload = {'source': URL, 'license': 'CC BY 4.0', 'snapshot_date': '%04d-%02d-%02d' % entry.date_time[:3],
               'source_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'regions': ADMIN_URL,
               'regions_sha256': hashlib.sha256(admin_file.read_bytes()).hexdigest(),
               'alternate_names': ALT_URL,
               'alternate_names_sha256': aliases_digest,
               'alternate_name_languages': sorted(SEARCH_LANGUAGES), 'cities': [x[1] for x in rows]}
    encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    out.write_bytes(gzip.compress(encoded, compresslevel=9, mtime=0))
    print(f'{len(rows)} places · {out.stat().st_size} bytes · {payload["snapshot_date"]}')

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('archive', type=Path)
    p.add_argument('admin', type=Path)
    p.add_argument('alternate_names', type=Path)
    p.add_argument('--out', type=Path, default=ROOT / 'city_directory_v1.json.gz')
    a = p.parse_args()
    build(a.archive, a.admin, a.alternate_names, a.out)
