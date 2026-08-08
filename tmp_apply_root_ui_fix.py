from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Shared parser script.
if './engine_tag_parser.js' not in s:
    if '</head>' not in s:
        raise SystemExit('head marker missing')
    s = s.replace('</head>', '  <script src="./engine_tag_parser.js"></script>\n</head>', 1)

# Alias spec loader.
if "loadAliasSpec('./engine_tag_aliases_v1.json')" not in s:
    needle = 'async function loadEngineScores(){\n'
    if needle not in s:
        raise SystemExit('loadEngineScores marker missing')
    block = (
        "async function loadEngineScores(){\n"
        "  if(window.EngineTagParser && !window._engineTagAliasSpec){\n"
        "    try {\n"
        "      window._engineTagAliasSpec = await window.EngineTagParser.loadAliasSpec('./engine_tag_aliases_v1.json');\n"
        "    } catch(aliasErr){\n"
        "      console.warn('[engine-tags] alias spec unavailable; legacy UI fallback active:', aliasErr.message);\n"
        "    }\n"
        "  }\n"
    )
    s = s.replace(needle, block, 1)

# Theme parser: legacy symbol-only -> shared canonical tokens.
if 'const TOKEN_THEMES' not in s:
    pat = re.compile(
        r"  const TAG_THEMES = \{[^\n]+\};\n"
        r"  const themes = Object\.entries\(TAG_THEMES\)\.filter\(\(\[s\]\)=>tag\.includes\(s\)\)\.map\(\(\[,p\]\)=>p\);"
    )
    repl = """  const TOKEN_THEMES = {
    plane:'переміщення і логістики', plus:'лікування і відновлення', med:'лікування і відновлення',
    study:'навчання і розвитку', heart:'стосунків і комунікацій', bolt:'уважності (підвищений ризик)',
    scissors:'завершення і відсікання зайвого'
  };
  let themes = [];
  if(window.EngineTagParser && window._engineTagAliasSpec){
    const _tokens = window.EngineTagParser.parseTagTokens(tag, window._engineTagAliasSpec);
    themes = [...new Set(_tokens.map(t=>TOKEN_THEMES[t]).filter(Boolean))];
  } else {
    const _legacyThemes = {'✈':'переміщення і логістики','⊕':'лікування і відновлення','💊':'лікування і відновлення','📚':'навчання і розвитку','❤':'стосунків і комунікацій','⚡':'уважності (підвищений ризик)','✂':'завершення і відсікання зайвого'};
    themes = [...new Set(Object.entries(_legacyThemes).filter(([sym])=>tag.includes(sym)).map(([,p])=>p))];
  }"""
    s, n = pat.subn(repl, s, count=1)
    if n != 1:
        raise SystemExit(f'legacy TAG_THEMES replacement count={n}')

# Truthful canonical score tooltip.
s = s.replace(
    "_dotTip += `\\nPDF Engine: ${d.engineEng >= 0 ? '+' : ''}${d.engineEng} (v18.5)`;",
    "_dotTip += `\\nEngine: ${d.engineEng >= 0 ? '+' : ''}${d.engineEng} (canonical)`;"
)

# Canonical/share metadata must point to root, not deprecated /deploy/.
s = s.replace(
    'https://nikolaevkirill-commits.github.io/g-index/deploy/icon512.png',
    'https://nikolaevkirill-commits.github.io/g-index/icon512.png',
)
s = s.replace(
    'https://nikolaevkirill-commits.github.io/g-index/deploy/',
    'https://nikolaevkirill-commits.github.io/g-index/',
)

checks = [
    './engine_tag_parser.js',
    "loadAliasSpec('./engine_tag_aliases_v1.json')",
    'const TOKEN_THEMES',
    'EngineTagParser.parseTagTokens',
    'Engine: ${d.engineEng',
    '<link rel="canonical" href="https://nikolaevkirill-commits.github.io/g-index/"',
    '<meta property="og:url" content="https://nikolaevkirill-commits.github.io/g-index/"',
    'https://nikolaevkirill-commits.github.io/g-index/icon512.png',
]
for item in checks:
    if item not in s:
        raise SystemExit(f'missing assertion: {item}')
if 'https://nikolaevkirill-commits.github.io/g-index/deploy/' in s:
    raise SystemExit('deprecated nested URL still present in root index')

p.write_text(s, encoding='utf-8')

# Local daily chain must fail closed before git_deploy.bat if production invariants drift.
bat_path = Path('daily_chain.bat')
bat = bat_path.read_bytes().decode('utf-8')
if 'verify_production_release_guard.py' not in bat:
    marker = 'REM STEP 12: GIT DEPLOY - only if all prior steps passed'
    if marker not in bat:
        raise SystemExit('daily_chain STEP 12 marker missing')
    nl = '\r\n' if '\r\n' in bat else '\n'
    guard = nl.join([
        'REM STEP 11B: FAIL-CLOSED PRODUCTION RELEASE GUARD',
        'if !OVERALL_OK! EQU 1 (',
        '    echo %date% %time% [STEP 11B/12] production release guard >> "%LOG%"',
        '    python "%~dp0verify_production_release_guard.py" >> "%LOG%" 2>&1',
        '    if errorlevel 1 (',
        '        echo %date% %time% [FAIL] production release guard exit code !errorlevel! >> "%LOG%"',
        '        set OVERALL_OK=0',
        '    ) else (',
        '        echo %date% %time% [OK] production release guard >> "%LOG%"',
        '    )',
        ')',
        '',
    ])
    bat = bat.replace(marker, guard + marker, 1)
    bat_path.write_bytes(bat.encode('utf-8'))

print('root UI + local deploy guard repair PASS')
