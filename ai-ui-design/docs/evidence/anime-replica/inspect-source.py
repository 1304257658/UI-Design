from pathlib import Path
import re
root=Path(__file__).resolve().parent
for f in (root/'raw').rglob('*'):
    if f.suffix in ('.js','.css'):
        s=f.read_text(encoding='utf-8')
        urls=sorted(set(re.findall(r'https?://[^\s\x22\x27<>`]+',s)))
        print(f.relative_to(root), 'URLs', str(urls)[:1400])
        for term in ['fetch(', 'email-signup', 'loadGeometries()', 'HEADING_END', 'ScrollObserver', 'prefers-reduced-motion']:
            at=s.find(term)
            if at>=0: print(term, s[max(0,at-100):at+800])
