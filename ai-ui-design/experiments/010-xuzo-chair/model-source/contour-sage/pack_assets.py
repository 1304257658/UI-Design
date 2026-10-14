"""Encode actual Cycles output; no retouching or geometry alteration."""
from pathlib import Path
from PIL import Image
import json
from concurrent.futures import ThreadPoolExecutor

root = Path(__file__).resolve().parents[2]
output = root / 'public/products/contour-sage'
frames = output / 'frames'
manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
cache = Path(__file__).parent / 'render-cache'
cache.mkdir(exist_ok=True)
def frame_source(number):
    path = frames / f'{number:03}.png'
    return path if path.exists() else cache / path.name
def encode(number):
    source = frame_source(number)
    if not source.exists():
        raise FileNotFoundError(source)
    with Image.open(source) as image:
        image.convert('RGB').save(frames / f'{number:03}.webp', quality=94, method=6)
with ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(encode, range(manifest['count'])))

with Image.open(frame_source(0)) as image:
    image.convert('RGB').save(output / 'poster.webp', quality=96, method=6)
with Image.open(frame_source(round(.56*(manifest['count']-1)))) as image:
    image.convert('RGB').save(output / 'seat-detail.webp', quality=96, method=6)
with Image.open(Path(__file__).parent / 'sage-weave.png') as image:
    image.convert('RGB').save(output / 'sage-weave.webp', quality=90, method=6)

home = root / 'public/images/floating/chair-sage.png'
with Image.open(home if home.exists() else cache / home.name) as image:
    bounds = image.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('Empty homepage chair render')
    # Trim transparent padding only, retaining the actual rendered silhouette.
    cropped = image.crop(bounds)
    cropped.thumbnail((1200, 1500), Image.Resampling.LANCZOS)
    cropped.save(home.with_suffix('.webp'), quality=95, method=6)

manifest['bytes'] = sum(p.stat().st_size for p in frames.glob('*.webp'))
manifest['version'] = 'sage-reference-a-v4-iteration24-detail'
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
for number in range(manifest['count']):
    source = frames / f'{number:03}.png'
    if source.exists():
        source.replace(cache / source.name)
if home.exists():
    home.replace(cache / home.name)
print(json.dumps({'frames': manifest['count'], 'webpMiB': round(manifest['bytes']/1048576, 2), 'homeBounds': bounds}))
