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
print('root UI regression repair PASS')
