from __future__ import annotations

import hashlib
import json
import re
import subprocess
import struct
import zlib
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent


def release_bytes(path: Path) -> bytes:
    """Return the exact bytes Git will publish, including staged changes."""
    rel = path.relative_to(ROOT).as_posix()
    if (ROOT / ".git").exists():
        try:
            return subprocess.check_output(
                ["git", "-C", str(ROOT), "show", f":{rel}"],
                stderr=subprocess.DEVNULL,
            )
        except (OSError, subprocess.CalledProcessError) as exc:
            raise SystemExit(f'FAIL staged release bytes unavailable: {rel}') from exc
    return path.read_bytes()


def md5_12(path: Path) -> str:
    return hashlib.md5(release_bytes(path)).hexdigest().upper()[:12]


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"FAIL {label}: missing {needle!r}")


def check_free_companion_contract(index: str) -> None:
    """Pinned free-research contract, complemented by real browser tests.

    Basic was an obsolete entitlement, not a prerequisite for a free companion.
    Do not accept a comment containing the old marker or storage-backed tiers.
    """
    contracts = re.findall(r'const\s+PAYWALL\s*=\s*\{(.*?)\n\};', index, re.S)
    expected = """_tier: 'free',
      tier() { return this._tier; },
      isPaid() { return this._tier !== 'free'; },
      require(level, feature) { PaywallModal.show(feature, level); }"""
    compact = lambda value: re.sub(r'\s+', '', value)
    if len(contracts) != 1 or compact(contracts[0]) != compact(expected):
        raise SystemExit('FAIL free companion: unexpected entitlement implementation')
    require(index, 'ДОСЛІДНИЦЬКА ГІПОТЕЗА · НЕ ПРОДАЄТЬСЯ', 'research-only disclosure')
    require(index, 'function _gauthRequireNetworkAllowed()', 'account network guard')
    require(index, "if (token && !window.GINDEX_PLAY_CHANNEL)", 'Play account refresh guard')
    require(index, "return !window.GINDEX_PLAY_CHANNEL && !!window._vapid_public_key;", 'Play push guard')


def check_manifest_icons(manifest: dict, read_bytes) -> None:
    """Check the actual published PNG bytes, including shortcut icons.

    Not a visual maskable-safe-area check: maskable artwork needs separate QA.
    The release's icon contract deliberately requires local, exact-size PNGs.
    """
    icons = manifest.get('icons') or []
    any_sizes = set()
    entries = list(icons)
    for shortcut in manifest.get('shortcuts') or []:
        entries.extend(shortcut.get('icons') or [])
    for entry in entries:
        src = str(entry.get('src') or '')
        url = urlsplit(src)
        decoded = unquote(url.path)
        if (url.scheme or url.netloc or url.query or url.fragment
                or not decoded.startswith('/g-index/')
                or '\\' in decoded or any(p in ('.', '..', '') for p in decoded[len('/g-index/'):].split('/'))):
            raise SystemExit(f'FAIL manifest icon path: {src}')
        rel = decoded[len('/g-index/'):]
        if entry.get('type') != 'image/png' or not rel.endswith('.png'):
            raise SystemExit(f'FAIL manifest icon MIME: {src}')
        try:
            data = read_bytes(rel)
        except (OSError, KeyError) as exc:
            raise SystemExit(f'FAIL missing manifest icon: {src}') from exc
        if len(data) < 45 or data[:8] != b'\x89PNG\r\n\x1a\n':
            raise SystemExit(f'FAIL manifest icon is not PNG: {src}')
        offset, chunks, compressed = 8, [], bytearray()
        while offset < len(data):
            if offset + 12 > len(data):
                raise SystemExit(f'FAIL truncated PNG: {src}')
            size = int.from_bytes(data[offset:offset + 4], 'big')
            kind = data[offset + 4:offset + 8]
            end = offset + 12 + size
            if end > len(data):
                raise SystemExit(f'FAIL truncated PNG chunk: {src}')
            body = data[offset + 8:end - 4]
            crc = int.from_bytes(data[end - 4:end], 'big')
            if zlib.crc32(kind + body) != crc:
                raise SystemExit(f'FAIL PNG CRC: {src}')
            chunks.append(kind)
            if kind == b'IHDR':
                if len(chunks) != 1 or size != 13:
                    raise SystemExit(f'FAIL PNG header: {src}')
                width, height, depth, colour, compression, filtering, interlace = struct.unpack('>IIBBBBB', body)
            if kind == b'IDAT':
                compressed.extend(body)
            if kind == b'IEND' and (size or end != len(data)):
                raise SystemExit(f'FAIL PNG end: {src}')
            offset = end
        if not chunks or chunks[0] != b'IHDR' or chunks[-1] != b'IEND' or not compressed:
            raise SystemExit(f'FAIL incomplete PNG: {src}')
        if width not in (192, 512) or height != width or entry.get('sizes') != f'{width}x{height}':
            raise SystemExit(f'FAIL manifest icon dimensions: {src}')
        if depth != 8 or colour not in (2, 6) or compression or filtering or interlace:
            raise SystemExit(f'FAIL unsupported release PNG encoding: {src}')
        row = width * (3 if colour == 2 else 4) + 1
        try:
            decoder = zlib.decompressobj()
            pixels = decoder.decompress(compressed, row * height + 1)
        except zlib.error as exc:
            raise SystemExit(f'FAIL PNG data: {src}') from exc
        if (not decoder.eof or decoder.unused_data or decoder.unconsumed_tail
                or len(pixels) != row * height or any(pixels[i] > 4 for i in range(0, len(pixels), row))):
            raise SystemExit(f'FAIL PNG scanlines: {src}')
        if entry in icons and 'any' in str(entry.get('purpose', 'any')).split():
            any_sizes.add(width)
    if not {192, 512}.issubset(any_sizes):
        raise SystemExit('FAIL manifest requires any-purpose PNG icons at 192 and 512')


def main() -> None:
    index = release_bytes(ROOT / 'index.html').decode('utf-8-sig')
    require(index, './engine_tag_parser.js', 'root parser script')
    require(index, "loadAliasSpec('./engine_tag_aliases_v1.json')", 'root alias loader')
    require(index, 'const TOKEN_THEMES', 'root token themes')
    require(index, 'EngineTagParser.parseTagTokens', 'root token parser')
    require(index, 'decisionScore:decisionAvailable?operationalScore:undefined', 'fail-closed operational score export')
    require(index, "actionPolicy = !decisionAvailable ? (referenceStale ? 'reference_stale' : 'reference_unavailable')", 'missing/stale reference action policy')
    require(index, 'intradayGuard = _computeCurrentSlotDecision()', 'canonical intraday guard ownership')
    require(index, 'resolveSlotDecision({', 'canonical per-slot resolver')
    require(index, "seg.setAttribute('data-gval', 'БЛОК')", 'blocked heat-slot label')
    require(index, 'REFERENCE · НЕ РІШЕННЯ ДЛЯ ДІЇ', '27-day reference disclosure')
    require(index, 'Нейтральний Pᵢ не скасовує eᵢ, бурю або часову заборону', 'Panchanga net-context disclosure')
    require(index, 'Оперативно СТОП: PDF reference', 'operational-first Hero conflict wording')
    require(index, 'Оперативно сприятливо; PDF reference', 'operational-first positive Hero wording')
    require(index, 'Оперативно СТОП: буря Kp=', 'operational-first storm Hero wording')
    require(index, "sig.opKey === 'neutral'", 'Hero conflict wording follows resolved operational state')
    require(index, 'ДЕННИЙ PDF/ENGINE REFERENCE · НЕ РІШЕННЯ ДЛЯ ДІЇ', 'AUTO feed panel is reference-only')
    require(index, 'Оперативну дію визначає обережніший стан у Hero', 'AUTO feed panel defers to operational safety')
    require(index, 'const operational = sig && isFinite(sig.decisionScore)', 'week summary uses operational score')
    require(index, 'PDF/Engine reference ${refStr}', 'week summary labels reference separately')
    require(index, 'const _rawGOf = d => Number(d?.G)', '27-day filter uses raw G only')
    require(index, 'raw-контекст · не команда', '27-day table has no raw-G action recommendation')
    require(index, 'позитивний стан не є дозволом на нові дії', 'Decision Layer stale-data guard')
    require(index, 'позитивний стан не є дозволом', 'decision strip stale-data guard')
    require(index, 'Operational resolver недоступний — лише raw/reference аудит', 'CSV resolver failure is explicit')
    require(index, 'Day_score_reference = ${dayTxt}', 'ICS labels PDF/Engine as reference')
    require(index, 'Оперативний стан ${_op179} має пріоритет:', 'personal cycle safety gate')
    require(index, 'окрема порада призупинена через глобальний ризик', 'personal cycle positive-advice suppression')
    require(index, 'золота рамка = PDF reference', '27-day reference-only provenance caption')
    require(index, 'const col = _ftGColor(_gEff)', 'forward timeline uses raw-context colors')
    require(index, 'id="v19ShadowStatusBanner"', 'v19.2 shadow status banner')
    require(index, 'data-model="reconstructed-v19.2" data-score-effect="0"', 'v19.2 reconstructed score-neutral contract')
    require(index, 'v19.2 не змінює Hero, оцінку дня, PDF/Engine reference або оперативні рекомендації', 'v19.2 non-production disclosure')
    require(index, 'PROSPECTIVE SHADOW</code> · <code>PRODUCTION HOLD</code> · <code>score_effect=0', 'v19.2 hold disclosure')
    require(index, 'Сигнали розходяться: PDF/Engine reference не є оперативним дозволом.', 'sign-neutral divergence disclosure')
    require(index, 'TANITA_2Y_PROMOTION_GATE_v1.json', 'Tanita promotion gate is loaded')
    require(index, 'категорії backlog можуть перетинатися; не сумуються', 'evidence backlog categories are not double-counted')
    require(index, 'Prospective tracker свіжий, але історичне покриття неповне', 'fresh tracker is distinct from incomplete historical coverage')
    require(index, 'Prospective tracker не має свіжої телеметрії (поріг 36 год)', 'stale tracker telemetry disclosure')
    require(index, 'Таніта SHADOW · вплив на G = 0', 'Tanita score-neutral disclosure')
    require(index, 'На chronological holdout приріст проти baseline відсутній.', 'Tanita no-gain disclosure')
    require(index, 'Активація можлива лише після ', 'Tanita prospective activation rule')
    require(index, 'href="privacy.html"', 'public privacy link')
    require(index, 'href="terms.html"', 'public terms link')
    require(index, 'href="account-deletion.html"', 'public account deletion link')
    require(index, 'window.GINDEX_PLAY_CHANNEL', 'explicit Play companion channel')
    require(index, 'play-channel #paywallOverlay', 'Play companion purchase fail-closed CSS')
    check_free_companion_contract(index)
    if 'href="backtest.html"' in index:
        raise SystemExit('FAIL dashboard contains a broken backtest.html link')
    require(index, '↻ Оновити дані', 'explicit data refresh label')
    require(index, 'Оновити застосунок</button>', 'distinct PWA update label')
    require(index, 'id="astronomyEventsCard"', 'visible astronomy events card')
    require(index, 'id="planetParadeTile"', 'visible planet-parade tile')
    require(index, 'function nextMorningPlanetParade(dateUTC)', 'local pre-dawn parade calculation')
    require(index, "Astronomy.Horizon(observeAt,observer,eq.ra,eq.dec,'normal')", 'local-horizon parade geometry')
    require(index, "body==='Uranus'||body==='Neptune'", 'optics-only planet disclosure')
    require(index, "bodies:['Mercury','Jupiter','Uranus','Mars','Neptune','Saturn']", 'verified six-planet August parade')
    require(index, 'локально ${count}/${total} над горизонтом', 'global/local parade visibility split')
    require(index, '(за горизонтом)', 'below-horizon planet disclosure')
    require(index, 'Сьогодні Mᵢ = ${mi.Mi}', 'explicit eclipse score contribution')
    require(index, 'вже враховано у ΣAᵢ та G', 'eclipse double-counting disclosure')
    require(index, 'Інформаційно, score_effect=0', 'score-neutral physical planet pair')
    require(index, 'не фізичне зближення планет', 'Hora versus physical-pair disclosure')
    require(index, "Astronomy.AngleBetween(vectors[i].vec, vectors[j].vec)", 'geocentric planet-pair calculation')
    require(index, "m.set('2026-08-12','total_solar')", '2026-08-12 total solar eclipse catalog entry')
    require(index, 'function parseNoaaJson(text)', 'NOAA bare-NaN fail-soft parser')
    require(index, 'const plasmaRows = parseNoaaJson(plasmaTxt)', 'solar-wind parser routing')
    require(index, 'function _looksLikeNoaaArray(text)', 'NOAA JSON body validator')
    require(index, 'fetchTextWithCORS(url, _looksLikeNoaaArray)', 'validated Bz/Vsw/X-ray CORS routing')
    require(index, 'const rows = parseNoaaJson(text)', 'X-ray fail-soft NOAA parser')
    require(index, 'seq.length < cap && guard < cap * 4 + 4', 'Hora boundary retry preserves requested sequence length')
    require(index, "const URL_WOLF_SN_STATUS = 'SILSO_REFRESH_STATUS_v1.json'", 'same-origin validated SILSO snapshot')
    require(index, 'withTimeout(fetchWolfSnResilient(), 5000', 'bounded resilient SILSO route')
    require(index, "snapshot:  {icon:'▣'", 'validated snapshot status is explicit')
    require(index, "window._lastWolfSn._delivery==='local_snapshot' ? ' · snapshot'", 'Wolf Sn delivery disclosure survives rerender')
    require(index, "Kp зараз '+kpNowLabel+' · Kp горизонт '+kpHorizonLabel", 'observed Kp and forecast horizon are labeled separately')
    require(index, 'synthetic не є прогнозом NOAA', 'synthetic horizon points are explicitly non-NOAA')
    require(index, 'let _preferVerifiedLocal3Day = false', 'same-origin NOAA horizon precedes UAF proxy fallback')
    require(index, 'point.kp_synthetic === false', 'UAF is skipped only for verified local Kp points')
    require(index, '_noaaAgeH = (Date.now() - (_tsMs + KP_INTERVAL_HOURS*3600000)) / 3600000', 'NOAA Kp content age keeps fractional hours')
    require(index, '_gfzAgeH = (Date.now() - (_gTsMs + 3*3600000)) / 3600000', 'GFZ Kp content age keeps fractional hours')
    require(index, "'Історична подія NOAA'", 'inactive NOAA historical label')
    require(index, 'Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA time-first label')
    forbidden = {
        'decisionScore:dayScore': 'PDF reference leaked into operational score',
        'Для рішень головний PDF/Engine': 'misleading PDF-first instruction',
        'ФІНАЛЬНЕ РІШЕННЯ · PDF/ENGINE': 'misleading 27-day final-decision badge',
        "seg.setAttribute('data-gval', `${_heatDecision": 'one day score stamped on every heat slot',
        'День сильний за PDF': 'misleading PDF-first Hero headline',
        'withTimeout(fetchTextWithCORS(URL_WOLF_SN, _looksLikeJson), 5000': 'startup depends directly on SILSO CORS',
        'МОЖНА ДІЯТИ за PDF': 'PDF reference grants action',
        'Сильний день за PDF': 'PDF-first positive Hero branch',
        'День сприятливий за PDF': 'PDF-first moderate Hero branch',
        'return `PDF +${sig.dayScore} · буря': 'PDF-first storm Hero branch',
        '`PDF · буря Kp=': 'PDF-first late storm patch',
        'const _kyivLabel =': 'unused timezone helper can disable storm guard',
        'Це єдиний шар, що формує підсумковий вердикт': 'PDF crowned as final decision in method explainer',
        'рішення дня бери звідти': 'offline hint directs decisions to PDF reference',
        'рішення дня має пріоритет над live-фоном': 'future hint bypasses operational safety wording',
        'ЄДИНИЙ ПІДСУМКОВИЙ РЕЗУЛЬТАТ': 'AUTO feed publishes a second final decision',
        'Одне рішення за ієрархією джерел': 'AUTO feed masquerades as operational command',
        'Вердикт дня вгорі = PDF/Engine (експерт), він головний': '3-day tooltip crowns PDF over safety contour',
        'PDF/Engine — пріоритет · live Kp оновлює фон': '3-day banner demotes live safety data',
        'days.filter(d=>d.eng': 'week summary classifies PDF reference as operational days',
        'const s = d.eng': 'week row displays PDF reference as main score',
        'const _decisionOf =': '27-day raw filter substitutes PDF/Engine score',
        'Рішення ${isFinite(G_display)': '27-day raw G badge is labeled as decision',
        'recommendG(G_display, kpUsed).text': '27-day raw context emits action recommendation',
        '✔ Діяти до ${String(_sw30.label)': 'incoming storm creates unconditional action permission',
        'DO.unshift(`важливе — завершити до': 'storm advice adds important action under restrictive state',
        'Kp_day − 2': 'visible formula inverts 2−Kp',
        '}) − 2 + ΣAᵢ': '3-day tooltip inverts 2−Kp',
        ": (dayScore === '' ? G : Number(dayScore))": 'CSV substitutes PDF/raw for missing operational resolver',
        ': (Number.isFinite(dayScore) ? dayScore : G)': 'ICS substitutes PDF/raw for missing operational resolver',
        '(базове PDF/Engine-рішення)': 'ICS labels PDF reference as base decision',
        '· РІШЕННЯ ${d._expertEng': 'forward timeline tooltip labels PDF reference as decision',
        'G_day = Largest 2 − Kp': '27-day legend formula is malformed',
        'Найкращий день (7 днів)': 'raw maximum is labeled best decision day',
        'Головний показник.': 'misleading PDF-first 27-day tooltip',
        'червоний/зелений = PDF/Engine-рішення': 'misleading 27-day decision caption',
        "d._expertEng >= 1 ? '#2bd47d'": 'PDF reference paints forward bar action-green',
        'Сигнали розходяться: позитивний PDF не є дозволом.': 'negative PDF mislabeled as positive',
    }
    for needle, label in forbidden.items():
        if needle in index:
            raise SystemExit(f'FAIL {label}: found {needle!r}')
    require(index, '<link rel="canonical" href="https://nikolaevkirill-commits.github.io/g-index/"', 'canonical root URL')
    require(index, '<meta property="og:url" content="https://nikolaevkirill-commits.github.io/g-index/"', 'OG root URL')
    require(index, 'id="dashboardToolbar"', 'focused dashboard toolbar')
    require(index, 'id="btnHeaderTools"', 'secondary tools toggle')
    require(index, 'href="OUTCOME_INTAKE_FORM_v1.html"', 'visible independent outcome form link')
    require(index, '#heroWhyBasic { display: block !important; }', 'always-available score explanation')
    if 'id="heroWhyBasic" style="display:none' in index:
        raise SystemExit('FAIL score explanation is hidden by default')
    if 'https://nikolaevkirill-commits.github.io/g-index/deploy/' in index:
        raise SystemExit('FAIL root metadata still points at deprecated /deploy/')

    nested = release_bytes(ROOT / 'deploy' / 'index.html').decode('utf-8-sig')
    nested_sw = release_bytes(ROOT / 'deploy' / 'sw.js').decode('utf-8-sig')
    require(nested, "new URL('../', window.location.href)", 'nested redirect')
    require(nested_sw, 'unregister', 'nested service-worker unregister')
    require(nested_sw, "new URL('../', event.request.url)", 'nested service-worker redirect')

    sw = release_bytes(ROOT / 'sw.js').decode('utf-8-sig')
    require(sw, "event.data.type === 'SKIP_WAITING'", 'service-worker manual update handler')
    require(sw, 'self.skipWaiting()', 'service-worker activation call')
    title_fp = re.search(r'v88\.9\.\d+-fp(\d+)-', index)
    cache_fp = re.search(r"const CACHE_VERSION = 'fp(\d+)-", sw)
    if not title_fp or not cache_fp or title_fp.group(1) != cache_fp.group(1):
        raise SystemExit(
            f'FAIL dashboard/SW version mismatch: title={title_fp.group(1) if title_fp else None} '
            f'cache={cache_fp.group(1) if cache_fp else None}'
        )
    print(f'PASS dashboard/SW cache version: fp{title_fp.group(1)}')

    for public_page in ('privacy.html', 'terms.html', 'account-deletion.html'):
        page = ROOT / public_page
        if len(release_bytes(page)) < 500:
            raise SystemExit(f'FAIL public product policy page: {public_page}')
    deletion = release_bytes(ROOT / 'account-deletion.html').decode('utf-8-sig')
    require(deletion, 'mailto:nikolaev.kirill@gmail.com', 'account deletion request channel')
    require(deletion, 'Видалення акаунта', 'account deletion page heading')
    print('PASS public privacy, terms and account-deletion pages')

    web_manifest = json.loads(release_bytes(ROOT / 'manifest.json').decode('utf-8-sig'))
    check_manifest_icons(web_manifest, lambda rel: release_bytes(ROOT / rel))
    legacy_manifest = json.loads(release_bytes(ROOT / 'deploy/manifest.json').decode('utf-8-sig'))
    check_manifest_icons(legacy_manifest, lambda rel: release_bytes(ROOT / rel))
    print('PASS root and legacy manifest PNG bytes, sizes and shortcut icons')
    title_version = re.search(r'v(88\.9\.\d+-fp\d+)-', index)
    if not title_version or web_manifest.get('version') != title_version.group(1):
        raise SystemExit(
            f"FAIL web manifest version mismatch: title={title_version.group(1) if title_version else None} "
            f"manifest={web_manifest.get('version')}"
        )
    if web_manifest.get('start_url') != '/g-index/' or web_manifest.get('scope') != '/g-index/':
        raise SystemExit('FAIL web manifest start_url/scope contract')
    for shortcut in web_manifest.get('shortcuts') or []:
        url = str(shortcut.get('url') or '')
        if not url.startswith('/g-index/'):
            raise SystemExit(f'FAIL external manifest shortcut: {url}')
        local_target = url[len('/g-index/'):].split('#', 1)[0].split('?', 1)[0]
        if local_target and not (ROOT / local_target).is_file():
            raise SystemExit(f'FAIL missing manifest shortcut target: {local_target}')
    print('PASS Play companion and web manifest contracts')

    manifest_path = ROOT / 'data_manifest.json'
    manifest = json.loads(release_bytes(manifest_path).decode('utf-8-sig'))
    mapping = {
        'expert_overrides': 'expert_overrides_v3.json',
        'expert_calc': 'expert_calc_scores.json',
        'future_kp': 'future_kp.json',
        'engine_scores': 'engine_scores.json',
        'outcome_intake_form': 'OUTCOME_INTAKE_FORM_v1.html',
        'aia_vernadsky_refresh_status': 'AIA_VERNADSKY_REFRESH_STATUS_v1.json',
        'aia_vernadsky_daily': 'AIA_VERNADSKY_DAILY_v1.json',
        'aia_vernadsky_audit': 'AIA_VERNADSKY_SHADOW_AUDIT_v1.json',
    }
    for field, rel in mapping.items():
        actual = md5_12(ROOT / rel)
        expected = manifest.get(field)
        if expected != actual:
            raise SystemExit(f'FAIL manifest {field}: expected={expected} actual={actual}')
        print(f'PASS manifest {field}: {actual}')

    outcome_form = release_bytes(ROOT / 'OUTCOME_INTAKE_FORM_v1.html').decode('utf-8')
    require(outcome_form, "join('\\r\\n')+'\\r\\n'", 'outcome form CSV newline escaping')
    if "join('\r\n')+'\r\n'" in outcome_form:
        raise SystemExit('FAIL outcome form contains literal CRLF inside a JavaScript string')
    form_builder = release_bytes(ROOT / 'build_outcome_intake_form.py').decode('utf-8-sig')
    require(form_builder, 'newline="\\n"', 'outcome form deterministic LF output')
    print('PASS independent outcome form JavaScript newline contract')

    health_path = ROOT / 'SYSTEM_HEALTH_STATUS_v1.json'
    health = json.loads(release_bytes(health_path).decode('utf-8-sig'))
    hard_failures = health.get('hard_failures') or []
    if hard_failures:
        # Historical invocation failures are retained, not rewritten as PASS.
        # A new attempt needs a fresh complete preparation proof bound to EVERY
        # staged file; a current/unknown failure remains unconditionally fatal.
        proof_path = ROOT / 'RELEASE_PREPARATION_v1.json'
        try:
            module_path = ROOT / 'release_preparation_guard.py'
            if module_path.read_bytes() != release_bytes(module_path):
                raise ValueError('unstaged preparation validator')
            from release_preparation_guard import validate_preparation
            proof = json.loads(release_bytes(proof_path).decode('utf-8'))
            if (ROOT / '.git').exists():
                paths = subprocess.check_output(['git','-C',str(ROOT),'ls-files','-z']).decode('utf-8').strip('\0').split('\0')
            else:
                raise ValueError('exact Git inventory required for recovery publication')
            readiness = validate_preparation(proof, health, paths,
                lambda name: release_bytes(ROOT / name))
        except (OSError,ValueError,KeyError,ImportError,subprocess.CalledProcessError) as exc:
            raise SystemExit(f'FAIL system health has hard failures: {hard_failures}; recovery proof rejected: {exc}') from exc
        print('PREPARED only; historical health failures retained:', readiness)
    collector = (health.get('checks') or {}).get('outcome_collector') or {}
    if (
        collector.get('mode') != 'offline_independent_form'
        or collector.get('ready') is not True
        or collector.get('telegram_required') is not False
        or collector.get('automatic_values') is not False
        or collector.get('score_effect') != 0
    ):
        raise SystemExit(f'FAIL independent outcome collector contract: {collector}')
    print('PASS independent outcomes use the fail-closed offline form; Telegram is not required')

    validator_text = release_bytes(ROOT / 'validate_outcome_intake_queue.py').decode('utf-8-sig')
    importer_text = release_bytes(ROOT / 'import_validated_outcome_queue.py').decode('utf-8-sig')
    outcome_contract_markers = (
        'forecast_seen_must_be_0_or_1',
        'actual_score_must_be_integer_-3_to_3',
        'actual_class_score_mismatch',
        'domain_invalid',
        'confidence_actual_invalid',
        'expert_or_training_source_reference_forbidden',
    )
    missing_contract = [
        marker for marker in outcome_contract_markers
        if marker not in validator_text or marker not in importer_text
    ]
    if missing_contract:
        raise SystemExit(f'FAIL validator/importer outcome contract drift: {missing_contract}')
    if 'raise SystemExit(0 if not issues else 1)' not in validator_text:
        raise SystemExit('FAIL outcome validator does not fail closed on rejected rows')
    print('PASS outcome validator and importer enforce the same fail-closed row contract')

    decision_audit_path = ROOT / 'DECISION_CONSISTENCY_AUDIT_v1.json'
    decision_audit = json.loads(release_bytes(decision_audit_path).decode('utf-8-sig'))
    policy = decision_audit.get('policy') or {}
    if decision_audit.get('schema') != 'decision_consistency_audit_v2':
        raise SystemExit('FAIL decision audit schema is not v2 operational/reference contract')
    if policy.get('operational_authority') != 'resolved live/stale/storm safety state in resolveDaySignal':
        raise SystemExit('FAIL decision audit does not name the operational safety resolver')
    reference_authority = str(policy.get('reference_authority') or '')
    if 'verified expert PDF' not in reference_authority or 'Engine only when no verified PDF exists' not in reference_authority:
        raise SystemExit('FAIL decision audit does not preserve the frozen PDF/Engine reference chain')
    serialized_policy = json.dumps(policy, ensure_ascii=False)
    for obsolete in ('"authoritative_decision": "verified expert PDF"', 'never replaces the authoritative decision'):
        if obsolete in serialized_policy:
            raise SystemExit(f'FAIL decision audit restores obsolete action authority: {obsolete}')
    for surface in ('Hero', 'week', '3-day', '27-day'):
        if surface not in (policy.get('ui_contract') or {}):
            raise SystemExit(f'FAIL decision audit UI contract missing {surface}')
    print('PASS decision audit separates operational authority from frozen reference')

    index_audit_path = ROOT / 'INDEX_INTEGRITY_AUDIT_v1.json'
    index_audit = json.loads(release_bytes(index_audit_path).decode('utf-8-sig'))
    formula_contract = index_audit.get('formula_contract') or {}
    if index_audit.get('schema') != 'gindex_integrity_audit_v2':
        raise SystemExit('FAIL index integrity schema is not v2 operational/reference contract')
    if 'decision' in formula_contract:
        raise SystemExit('FAIL index integrity contract still labels the frozen reference as decision')
    if formula_contract.get('reference') != 'verified PDF reference; frozen Engine reference only when PDF is absent':
        raise SystemExit('FAIL index integrity contract does not preserve the frozen reference chain')
    operational_contract = str(formula_contract.get('operational') or '')
    if 'resolveDaySignal' not in operational_contract or 'action-authoritative' not in operational_contract:
        raise SystemExit('FAIL index integrity contract does not identify operational action authority')
    print('PASS index integrity contract separates operational authority from frozen reference')

    operational_surface_path = ROOT / 'OPERATIONAL_SURFACE_PARITY_v1.json'
    operational_surface = json.loads(release_bytes(operational_surface_path).decode('utf-8-sig'))
    if operational_surface.get('schema') != 'operational_surface_parity_v1':
        raise SystemExit('FAIL operational surface parity schema')
    if operational_surface.get('passed') is not True:
        raise SystemExit(f'FAIL operational surface parity: {operational_surface.get("checks")}')
    checks = operational_surface.get('checks') or []
    if len(checks) < 9 or not all(check.get('passed') is True for check in checks):
        raise SystemExit(f'FAIL operational surface parity coverage: {checks}')
    print(f'PASS operational surface parity artifact: {len(checks)} checks')

    print('PASS production release guard')


if __name__ == '__main__':
    main()
