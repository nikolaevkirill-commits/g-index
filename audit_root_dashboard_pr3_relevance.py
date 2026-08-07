#!/usr/bin/env python3
from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
checks={
 'has_shared_parser_script': 'engine_tag_parser.js' in s,
 'has_alias_spec_reference': 'engine_tag_aliases_v1.json' in s,
 'has_engine_tag_parser_api': 'EngineTagParser' in s,
 'has_legacy_TAG_THEMES': 'const TAG_THEMES' in s,
 'has_token_themes': 'TOKEN_THEMES' in s,
 'has_direct_engine_eng_any': bool(re.search(r'_engineScores\s*\[[^\]]+\][^\n]{0,180}\.eng\b',s)),
 'has_direct_engine_object_reads': '_engineScores[d.ds]' in s,
 'has_getEngineScore': 'getEngineScore(' in s,
 'has_canonical_tooltip_wording': 'Engine: ${d.engineEng' in s and '(canonical)' in s,
}
print(checks)
for needle in ['const TAG_THEMES','TOKEN_THEMES','_engineScores[d.ds]','Engine: ${d.engineEng','engine_tag_parser.js','engine_tag_aliases_v1.json']:
    print('\n--',needle,'--')
    for m in re.finditer(re.escape(needle),s):
        line=s.count('\n',0,m.start())+1
        lo=max(0,m.start()-250); hi=min(len(s),m.end()+350)
        print('line',line,repr(s[lo:hi]))
        break
