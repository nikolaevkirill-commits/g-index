from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

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
        except (OSError, subprocess.CalledProcessError):
            pass
    return path.read_bytes()


def md5_12(path: Path) -> str:
    return hashlib.md5(release_bytes(path)).hexdigest().upper()[:12]


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"FAIL {label}: missing {needle!r}")


def main() -> None:
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    require(index, './engine_tag_parser.js', 'root parser script')
    require(index, "loadAliasSpec('./engine_tag_aliases_v1.json')", 'root alias loader')
    require(index, 'const TOKEN_THEMES', 'root token themes')
    require(index, 'EngineTagParser.parseTagTokens', 'root token parser')
    require(index, 'decisionScore:operationalScore', 'operational score export')
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
    require(index, 'PDF/Engine reference, не оперативне рішення', '27-day reference-only caption')
    require(index, 'id="v19ShadowStatusBanner"', 'v19.2 shadow status banner')
    require(index, 'data-model="reconstructed-v19.2" data-score-effect="0"', 'v19.2 reconstructed score-neutral contract')
    require(index, 'v19.2 не змінює Hero, оцінку дня, PDF/Engine reference або оперативні рекомендації', 'v19.2 non-production disclosure')
    require(index, 'PROSPECTIVE SHADOW</code> · <code>PRODUCTION HOLD</code> · <code>score_effect=0', 'v19.2 hold disclosure')
    require(index, 'Сигнали розходяться: PDF/Engine reference не є оперативним дозволом.', 'sign-neutral divergence disclosure')
    require(index, '↻ Оновити дані', 'explicit data refresh label')
    require(index, 'Оновити застосунок</button>', 'distinct PWA update label')
    require(index, "'Історична подія NOAA'", 'inactive NOAA historical label')
    require(index, 'Бюлетень NOAA ${hoursAgo}г тому', 'aged NOAA time-first label')
    forbidden = {
        'decisionScore:dayScore': 'PDF reference leaked into operational score',
        'Для рішень головний PDF/Engine': 'misleading PDF-first instruction',
        'ФІНАЛЬНЕ РІШЕННЯ · PDF/ENGINE': 'misleading 27-day final-decision badge',
        "seg.setAttribute('data-gval', `${_heatDecision": 'one day score stamped on every heat slot',
        'День сильний за PDF': 'misleading PDF-first Hero headline',
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
        'Сигнали розходяться: позитивний PDF не є дозволом.': 'negative PDF mislabeled as positive',
    }
    for needle, label in forbidden.items():
        if needle in index:
            raise SystemExit(f'FAIL {label}: found {needle!r}')
    require(index, '<link rel="canonical" href="https://nikolaevkirill-commits.github.io/g-index/"', 'canonical root URL')
    require(index, '<meta property="og:url" content="https://nikolaevkirill-commits.github.io/g-index/"', 'OG root URL')
    if 'https://nikolaevkirill-commits.github.io/g-index/deploy/' in index:
        raise SystemExit('FAIL root metadata still points at deprecated /deploy/')

    nested = (ROOT / 'deploy' / 'index.html').read_text(encoding='utf-8')
    nested_sw = (ROOT / 'deploy' / 'sw.js').read_text(encoding='utf-8')
    require(nested, "new URL('../', window.location.href)", 'nested redirect')
    require(nested_sw, 'unregister', 'nested service-worker unregister')
    require(nested_sw, "new URL('../', event.request.url)", 'nested service-worker redirect')

    sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
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

    manifest_path = ROOT / 'data_manifest.json'
    manifest = json.loads(release_bytes(manifest_path).decode('utf-8'))
    mapping = {
        'expert_overrides': 'expert_overrides_v3.json',
        'expert_calc': 'expert_calc_scores.json',
        'future_kp': 'future_kp.json',
        'engine_scores': 'engine_scores.json',
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

    decision_audit_path = ROOT / 'DECISION_CONSISTENCY_AUDIT_v1.json'
    decision_audit = json.loads(release_bytes(decision_audit_path).decode('utf-8'))
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
    index_audit = json.loads(release_bytes(index_audit_path).decode('utf-8'))
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

    print('PASS production release guard')


if __name__ == '__main__':
    main()
