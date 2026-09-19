"""Reproducible local adaptation of the captured public Anime.js homepage.

Upstream visual design, models and compiled animation implementation are Julian
Garnier's work. This script changes delivery and demo side effects, not authorship.
"""
from pathlib import Path
import hashlib
import html as html_module
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT.parent.parent / 'docs/evidence/anime-replica'
manifest = json.loads((EVIDENCE / 'download-manifest.json').read_text(encoding='utf-8'))
if any('error' in item for item in manifest):
    raise RuntimeError('Missing source assets; repair downloads before building.')

url_map = {item['url']: '/' + item['path'] for item in manifest}
def localize(text):
    for url, path in sorted(url_map.items(), key=lambda item: -len(item[0])):
        text = text.replace(url, path)
        text = text.replace(html_module.escape(url, quote=True), path)
    return text

for item in manifest:
    source = EVIDENCE / 'raw' / item['path']
    target = ROOT / 'public' / item['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.suffix in ('.css', '.js', '.svg') or item['path'].startswith('sponsors/'):
        target.write_text(localize(source.read_text(encoding='utf-8')), encoding='utf-8')
    else:
        shutil.copy2(source, target)

html = (EVIDENCE / 'source.html').read_text(encoding='utf-8')
html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S)
html = localize(html)
# Browsers recover a literal '<' in code text, while Vite/parse5 rejects it.
# Decode existing entities first, then encode text once to preserve copied code.
html = re.sub(r'(<code>)(.*?)(</code>)', lambda m: m[1] + html_module.escape(html_module.unescape(m[2]), quote=False) + m[3], html, flags=re.S)
html = html.replace('Anime.js | JavaScript Animation Engine</title>', 'Anime.js · Local learning replica</title>')
html = re.sub(r'<meta\s+(?:property="og:|name="twitter:)[^>]*>', '', html)
html = html.replace('href="https://animejs.com"', 'href="/"')
html = html.replace('href="https://animejs.com/"', 'href="/"')
html = html.replace('href="/documentation', 'href="https://animejs.com/documentation')
html = html.replace('href="documentation', 'href="https://animejs.com/documentation')
html = html.replace('Thanks! Check your inbox to confirm your subscription.',
                    'Local demo only — no email was sent or stored.')
html = html.replace('<head>', '''<head>
  <!-- Local learning replica. Original website/design: Julian Garnier, animejs.com. -->
  <meta name="robots" content="noindex,nofollow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; form-action 'none'; base-uri 'self'">
''')
html = html.replace('</body>', '<script type="module" src="/src/replica.js"></script></body>')
(ROOT / 'index.html').write_text(html, encoding='utf-8')
(ROOT / 'source-manifest.json').write_text(json.dumps({
    'source': 'https://animejs.com/',
    'sourceBuild': '1787698626',
    'captured': '2026-09-18',
    'mode': 'Local adaptation with upstream visual runtime, not a clean-room rewrite.',
    'assets': manifest,
    'modifications': ['Asset paths localized', 'Analytics and advertising scripts omitted',
                      'Newsletter intercepted locally', 'Social metadata removed',
                      'Same-origin resource policy', 'Accessible labels for timeline anchors']
}, indent=2), encoding='utf-8')
print(f'Localized {len(manifest)} assets, {sum(i["bytes"] for i in manifest):,} bytes; generated index.html')
