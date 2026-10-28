"""Keep consumer HTML and its CSS atomic across old and waiting service workers."""
import argparse
import hashlib
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]
PAGES={'index.html':['p0_layout_v1.css','wow_reviewed_v1.css','consumer_overview_v1.css',
                     'nocturne_v1.css','festival_decision_v1.css','dayline_view_v1.css'],
       'day_summary.html':['day_summary_v1.css']}

def verify(root=ROOT,write=False):
    count=0
    for name,styles in PAGES.items():
        page=root/name;html=page.read_text(encoding='utf-8')
        for source in styles:
            css=(root/source).read_text(encoding='utf-8')
            if '</style' in css.lower() or re.search(r'@import\b',css,re.I):
                raise ValueError('CSS must be self-contained and safe to inline: '+source)
            digest=hashlib.sha256(css.encode('utf-8')).hexdigest()
            expected=f'<style data-inline-source="{source}" data-css-sha256="{digest}">\n{css}\n</style>'
            pattern=r'<style data-inline-source="'+re.escape(source)+r'"[^>]*>.*?</style>|<link rel="stylesheet" href="'+re.escape(source)+r'">'
            matches=list(re.finditer(pattern,html,re.S))
            if len(matches)!=1:raise ValueError('Expected exactly one CSS block: '+name+':'+source)
            if write:html=re.sub(pattern,lambda _:expected,html,flags=re.S)
            elif matches[0].group()!=expected:raise ValueError('Stale HTML CSS; run sync_inline_styles.py --write: '+source)
            count+=1
        if re.search(r'<link\b[^>]*rel=["\']stylesheet["\']',html,re.I):
            raise ValueError('Consumer page still has external CSS: '+name)
        if write:page.write_text(html,encoding='utf-8')
    print('PASS atomic consumer CSS: '+str(count)+' source-matched blocks')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--write',action='store_true')
    verify(write=p.parse_args().write)
