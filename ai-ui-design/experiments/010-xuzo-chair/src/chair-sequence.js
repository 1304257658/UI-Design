// Cycles renders share one model and one reversible, scroll-controlled timeline.
export const chapterStops = [0, .225, .385, .555, .715, .975];
export const chapterBounds = [0, .145, .30, .465, .63, .81, 1.03];
const ROOT = '/products/contour-sage';
const MAX_BITMAPS = 12;

export async function mountScene(container, {onFrame = () => {}} = {}) {
  const response = await fetch(`${ROOT}/manifest.json`, {signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error('Chair sequence manifest unavailable');
  const manifest = await response.json();
  const count = manifest.count;
  if (!Number.isInteger(count) || count < 2) throw new Error('Invalid chair sequence');
  const canvas = document.createElement('canvas');
  canvas.dataset.total = String(count);
  const context = canvas.getContext('2d', {alpha: false});
  container.append(canvas);
  const blobs = new Map(), requests = new Map(), bitmaps = new Map(), decodes = new Map();
  let wanted = 0, displayed = -1, width = 0, height = 0, disposed = false, failed = false;
  let direction = 1, paints = 0, queued = false;
  const firstPaintStart = performance.now();
  let firstPaintMs = null;

  async function fetchFrame(n) {
    if (blobs.has(n)) return blobs.get(n);
    if (requests.has(n)) return requests.get(n);
    const promise = fetch(`${ROOT}/frames/${String(n).padStart(3, '0')}.webp`, {signal: AbortSignal.timeout(15000)})
      .then(r => { if (!r.ok) throw new Error(`Chair frame ${n}: ${r.status}`); return r.blob(); })
      .then(blob => { if (!disposed) {blobs.set(n, blob); canvas.dataset.loaded = String(blobs.size);} return blob; })
      .finally(() => requests.delete(n));
    requests.set(n, promise);
    return promise;
  }

  function trim() {
    while (bitmaps.size > MAX_BITMAPS) {
      const key = [...bitmaps.keys()].find(n => n !== displayed && n !== wanted);
      if (key === undefined) break;
      bitmaps.get(key).close();
      bitmaps.delete(key);
    }
  }

  async function decode(n) {
    if (bitmaps.has(n)) {
      const bitmap = bitmaps.get(n);
      bitmaps.delete(n); bitmaps.set(n, bitmap);
      return bitmap;
    }
    if (decodes.has(n)) return decodes.get(n);
    const promise = fetchFrame(n).then(blob => createImageBitmap(blob)).then(bitmap => {
      if (disposed) { bitmap.close(); return null; }
      bitmaps.set(n, bitmap); trim(); return bitmap;
    }).finally(() => decodes.delete(n));
    decodes.set(n, promise);
    return promise;
  }

  function paint(n, bitmap) {
    if (!bitmap?.width || disposed) return;
    // Contain preserves the complete product on both 16:9 and 16:10 monitors.
    // Extend only the empty studio border; never distort the chair itself.
    const scale = Math.min(width / bitmap.width, height / bitmap.height);
    const w = bitmap.width * scale, h = bitmap.height * scale;
    const x = (width - w) / 2, y = (height - h) / 2;
    context.fillStyle = '#e9e6df'; context.fillRect(0, 0, width, height);
    if (x > 0) {
      context.drawImage(bitmap, 0, 0, 1, bitmap.height, 0, y, x + 1, h);
      context.drawImage(bitmap, bitmap.width - 1, 0, 1, bitmap.height, x + w - 1, y, x + 1, h);
    }
    if (y > 0) {
      context.drawImage(bitmap, 0, 0, bitmap.width, 1, x, 0, w, y + 1);
      context.drawImage(bitmap, 0, bitmap.height - 1, bitmap.width, 1, x, y + h - 1, w, y + 1);
    }
    context.drawImage(bitmap, x, y, w, h);
    displayed = n; paints++;
    canvas.dataset.frame = String(n);
    canvas.dataset.loaded = String(blobs.size);
    if (firstPaintMs === null) firstPaintMs = performance.now() - firstPaintStart;
    onFrame(n / (count - 1));
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    container.dispatchEvent(new CustomEvent('renderfailure', {detail: error.message}));
  }

  function warm(n) {
    for (const distance of [1, 2, 3, 4, -1]) {
      const next = n + distance * direction;
      if (next >= 0 && next < count) decode(next).catch(() => {});
    }
  }

  // Only one foreground decode pump. Fast scroll can change wanted without
  // spawning hundreds of stale decodes or letting old requests replace new ones.
  async function pump() {
    if (queued || failed || disposed) return;
    queued = true;
    try {
      while (!disposed && !failed && displayed !== wanted) {
        const n = wanted;
        const bitmap = await decode(n);
        if (wanted === n) { paint(n, bitmap); warm(n); }
      }
    } catch (error) { fail(error); }
    finally { queued = false; }
  }

  function render(progress) {
    const n = Math.round(Math.max(0, Math.min(1, progress)) * (count - 1));
    if (n !== wanted) direction = Math.sign(n - wanted);
    wanted = n;
    if (bitmaps.has(n)) {
      if (displayed !== n) { paint(n, bitmaps.get(n)); warm(n); }
    } else void pump();
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = Math.round(container.clientWidth * dpr);
    height = Math.round(container.clientHeight * dpr);
    canvas.width = width; canvas.height = height;
    if (bitmaps.has(displayed)) paint(displayed, bitmaps.get(displayed));
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  paint(0, await decode(0)); warm(0);
  let next = 1;
  async function worker() {
    while (!disposed && next < count) {
      const n = next++;
      try { await fetchFrame(n); } catch { /* A targeted request will retry. */ }
    }
  }
  void Promise.all(Array.from({length: 3}, worker));
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; observer.disconnect();
    for (const bitmap of bitmaps.values()) bitmap.close();
    bitmaps.clear(); blobs.clear();
  }, {once: true});
  return {
    render,
    getLabel: () => null,
    getState: () => ({renderer: 'Blender Cycles sequence', total: count, loaded: blobs.size,
      displayed, wanted, bitmaps: bitmaps.size, bitmapLimit: MAX_BITMAPS, firstPaintMs, paints, failed}),
    poster: () => canvas.toDataURL('image/png'),
  };
}
