"""Download only public assets observed in the captured Anime.js page.
No analytics/ad requests. Raw files remain unchanged for reproducibility.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
inventory = json.loads((ROOT / 'asset-inventory.json').read_text(encoding='utf-8'))
assets = [a for a in inventory['assets'] if urlsplit(a['url']).hostname in ('animejs.com', 'avatars.githubusercontent.com')]
inventory['assets'] = assets
(ROOT / 'asset-inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf-8')

def download(asset):
    url = asset['url']
    parsed = urlsplit(url)
    rel = parsed.path.lstrip('/') if parsed.hostname == 'animejs.com' else 'assets/avatars/' + parsed.path.rsplit('/', 1)[-1] + '.png'
    dest = ROOT / 'raw' / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        if not dest.exists():
            request = Request(quote(url, safe=':/?=&%'), headers={'User-Agent': 'UI-Design local study'})
            with urlopen(request, timeout=40) as response:
                dest.write_bytes(response.read())
        data = dest.read_bytes()
        return {'url': url, 'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    except Exception as error:
        return {'url': url, 'error': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    result = list(pool.map(download, assets))
(ROOT / 'download-manifest.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({'downloaded': sum('path' in r for r in result), 'errors': [r for r in result if 'error' in r], 'bytes': sum(r.get('bytes', 0) for r in result)}, indent=2))
