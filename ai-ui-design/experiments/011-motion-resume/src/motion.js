/* M/15 — A Résumé in Motion
 * A frame-driven motion-graphics film. Every pixel is a pure function of time.
 * 1920×1080 / 60 fps / 15.00 s / 900 frames.
 */

const W = 1920;
const H = 1080;
const FPS = 60;
const DURATION = 15;
const TAU = Math.PI * 2;

const C = {
  paper: '#efe9de',
  paperHi: '#f8f3ea',
  paperLo: '#ded3c1',
  ink: '#14130f',
  inkSoft: '#1c1a15',
  red: '#ff3d00',
  mutedPaper: 'rgba(20, 19, 15, 0.56)',
  mutedInk: 'rgba(239, 233, 222, 0.56)',
  hairPaper: 'rgba(20, 19, 15, 0.20)',
  hairInk: 'rgba(239, 233, 222, 0.18)',
};

const FAMILY = {
  display: '"Bahnschrift Condensed"',
  sans: 'Bahnschrift',
  serif: 'Georgia',
  mono: '"Courier New"',
};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;

/* ------------------------------------------------------------------ *
 * math
 * ------------------------------------------------------------------ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smoothstep = (p) => p * p * (3 - 2 * p);
const easeOutQuad = (p) => 1 - (1 - p) * (1 - p);
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
const easeOutQuint = (p) => 1 - Math.pow(1 - p, 5);
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeInOutQuint = (p) => (p < 0.5 ? 16 * p * p * p * p * p : 1 - Math.pow(-2 * p + 2, 5) / 2);
const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const easeInExpo = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
const pulse = (t, center, width = 0.25) => {
  const d = Math.abs(t - center) / width;
  return d >= 1 ? 0 : Math.cos((d * Math.PI) / 2) ** 2;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * typography
 * ------------------------------------------------------------------ */

function fontString(size, family, weight = 700, style = 'normal') {
  return `${style} ${weight} ${size}px ${FAMILY[family]}`;
}

function setFont(g, size, family, weight = 700, style = 'normal', tracking = 0) {
  g.font = fontString(size, family, weight, style);
  g.letterSpacing = `${tracking}px`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
}

function measureText(g, text, size, family, weight = 700, style = 'normal', tracking = 0) {
  setFont(g, size, family, weight, style, tracking);
  return g.measureText(text).width;
}

function text(str, x, y, o = {}) {
  const {
    size = 16,
    family = 'mono',
    weight = 400,
    style = 'normal',
    tracking = 0,
    color = C.ink,
    align = 'left',
    alpha = 1,
  } = o;
  ctx.save();
  setFont(ctx, size, family, weight, style, tracking);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function textWidth(str, o = {}) {
  const {
    size = 16,
    family = 'mono',
    weight = 400,
    style = 'normal',
    tracking = 0,
  } = o;
  return measureText(ctx, str, size, family, weight, style, tracking);
}

function fitSize(str, maxWidth, o = {}) {
  const {
    size = 200,
    family = 'display',
    weight = 700,
    style = 'normal',
    tracking = 0,
  } = o;
  let s = size;
  while (s > 8 && measureText(ctx, str, s, family, weight, style, tracking) > maxWidth) {
    s *= 0.965;
    if (maxWidth <= 0) break;
  }
  return s;
}

function riseText(str, x, baseY, p, o = {}) {
  const {
    size = 100,
    family = 'display',
    weight = 700,
    style = 'normal',
    tracking = 0,
    color = C.ink,
    alpha = 1,
    distance = 100,
    align = 'left',
  } = o;
  if (p <= 0 || alpha <= 0) return;
  setFont(ctx, size, family, weight, style, tracking);
  const w = ctx.measureText(str).width;
  const e = easeOutQuint(clamp(p));
  const yOff = (1 - e) * distance;
  const clipPad = size * 0.16;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left - clipPad, baseY - size * 1.34, w + clipPad * 2, size * 1.6);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, baseY + yOff);
  ctx.restore();
}

function wipeText(str, x, baseY, p, o = {}) {
  const {
    size = 100,
    family = 'display',
    weight = 700,
    style = 'normal',
    tracking = 0,
    color = C.ink,
    alpha = 1,
    align = 'left',
    from = 'left',
  } = o;
  if (p <= 0 || alpha <= 0) return;
  setFont(ctx, size, family, weight, style, tracking);
  const w = ctx.measureText(str).width;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const e = easeOutQuint(clamp(p));
  ctx.save();
  ctx.beginPath();
  if (from === 'left') ctx.rect(left, baseY - size * 1.3, w * e, size * 1.55);
  else if (from === 'right') ctx.rect(x - w + w * (1 - e), baseY - size * 1.3, w * e, size * 1.55);
  else ctx.rect(left, baseY - size * 1.3 + size * (1 - e), w, size * e * 1.55);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, baseY);
  ctx.restore();
}

function fitLine(str, x, baseY, maxWidth, p, o = {}) {
  const { size = 200, ...rest } = o;
  const fitted = fitSize(str, maxWidth, { size, ...rest });
  return riseText(str, x, baseY, p, { size: fitted, ...rest });
}

function makeSprite(str, o = {}) {
  const {
    size = 240,
    family = 'display',
    weight = 700,
    style = 'normal',
    tracking = 0,
    color = C.paper,
  } = o;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  setFont(g, size, family, weight, style, tracking);
  const m = g.measureText(str);
  const ascent = m.actualBoundingBoxAscent || size * 0.78;
  const descent = m.actualBoundingBoxDescent || size * 0.2;
  const pad = Math.ceil(size * 0.22) + 16;
  c.width = Math.ceil(m.width + pad * 2);
  c.height = Math.ceil(ascent + descent + pad * 2);
  const d = c.getContext('2d');
  setFont(d, size, family, weight, style, tracking);
  d.fillStyle = color;
  d.textBaseline = 'alphabetic';
  d.fillText(str, pad, pad + ascent);
  return { canvas: c, width: m.width, height: c.height, pad, ascent, top: pad, descent };
}

/* ------------------------------------------------------------------ *
 * textures
 * ------------------------------------------------------------------ */

let paperTexture = null;
let grainTiles = [];

function buildPaperTexture() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);

  const wash = g.createRadialGradient(W * 0.46, H * 0.38, 30, W * 0.5, H * 0.54, W * 0.82);
  wash.addColorStop(0, 'rgba(255, 251, 242, 0.45)');
  wash.addColorStop(0.55, 'rgba(249, 243, 232, 0.08)');
  wash.addColorStop(1, 'rgba(183, 167, 143, 0.22)');
  g.fillStyle = wash;
  g.fillRect(0, 0, W, H);

  const rng = mulberry32(1515);

  // Soft paper clouds.
  for (let i = 0; i < 32; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 120 + rng() * 430;
    const cloud = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = rng() > 0.5;
    cloud.addColorStop(0, warm ? 'rgba(255, 252, 246, 0.10)' : 'rgba(154, 135, 105, 0.06)');
    cloud.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = cloud;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Fibres.
  for (let i = 0; i < 1050; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const len = 4 + rng() * 42;
    const angle = (rng() - 0.5) * 0.55;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    g.strokeStyle = rng() > 0.5 ? 'rgba(84, 66, 42, 0.045)' : 'rgba(255, 255, 255, 0.10)';
    g.lineWidth = 0.6 + rng() * 0.8;
    g.stroke();
  }

  // Fine static tooth.
  const n = document.createElement('canvas');
  n.width = 960;
  n.height = 540;
  const nx = n.getContext('2d');
  const img = nx.createImageData(960, 540);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = rng();
    const dark = v < 0.5;
    const a = Math.floor(rng() * 13);
    d[i] = dark ? 40 : 255;
    d[i + 1] = dark ? 32 : 250;
    d[i + 2] = dark ? 22 : 236;
    d[i + 3] = a;
  }
  nx.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(n, 0, 0, W, H);
  g.imageSmoothingEnabled = true;

  // Edge darkening, extremely restrained.
  const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(77, 60, 39, 0.10)');
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, H);

  paperTexture = c;
}

function buildGrainTiles() {
  grainTiles = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = 540;
    const g = c.getContext('2d');
    const img = g.createImageData(960, 540);
    const d = img.data;
    const rng = mulberry32(900 + k * 71);
    for (let i = 0; i < d.length; i += 4) {
      const v = rng();
      if (v < 0.78) {
        d[i + 3] = 0;
        continue;
      }
      const bright = rng() > 0.52;
      d[i] = bright ? 255 : 22;
      d[i + 1] = bright ? 248 : 18;
      d[i + 2] = bright ? 235 : 12;
      d[i + 3] = 10 + Math.floor(rng() * 28);
    }
    g.putImageData(img, 0, 0);
    grainTiles.push(c);
  }
}

let frameIndexForGrain = 0;

function drawGrain() {
  const tile = grainTiles[frameIndexForGrain % grainTiles.length];
  if (!tile) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.42;
  ctx.drawImage(tile, 0, 0, W, H);
  ctx.restore();
}

function drawPaper(t) {
  if (paperTexture) ctx.drawImage(paperTexture, 0, 0);
  else {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
  }
  frameIndexForGrain = Math.floor(t * FPS + 0.0001);
  drawGrain();
}

function drawInk(t) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.44, H * 0.42, 10, W * 0.5, H * 0.54, W * 0.7);
  g.addColorStop(0, 'rgba(50, 45, 36, 0.45)');
  g.addColorStop(0.6, 'rgba(24, 22, 17, 0.12)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  frameIndexForGrain = Math.floor(t * FPS + 0.0001);
  drawGrain();
}

/* ------------------------------------------------------------------ *
 * visual furniture
 * ------------------------------------------------------------------ */

function line(x1, y1, x2, y2, color, width = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function rect(x, y, w, h, color, radius = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
}

function roundedRectPath(g, x, y, w, h, r = 0) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function circle(x, y, r, color, alpha = 1) {
  if (r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function cropMarks(color, alpha = 0.28) {
  const d = 34;
  const len = 14;
  const segments = [
    [d, d, d + len, d],
    [d, d, d, d + len],
    [W - d, d, W - d - len, d],
    [W - d, d, W - d, d + len],
    [d, H - d, d + len, H - d],
    [d, H - d, d, H - d - len],
    [W - d, H - d, W - d - len, H - d],
    [W - d, H - d, W - d, H - d - len],
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segments) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

function meta(str, x, y, { color = C.ink, alpha = 0.56, size = 15, align = 'left', tracking = 1.6 } = {}) {
  text(str, x, y, {
    size,
    family: 'mono',
    weight: 400,
    color,
    alpha,
    align,
    tracking,
  });
}

function timecode(t, framePrefix = 'TC') {
  const totalFrames = Math.max(0, Math.min(FPS * DURATION - 1, Math.floor(t * FPS + 1e-6)));
  const f = totalFrames % FPS;
  const totalSeconds = Math.floor(totalFrames / FPS);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60);
  return `${framePrefix} ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function logo(x, baseY, size = 40, { color = C.ink, red = C.red, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, size, 'display', 700, 'normal', -1.5);
  ctx.fillStyle = color;
  const wM = ctx.measureText('M').width;
  ctx.fillText('M', x, baseY);

  // A drawn slash, so the mark stays crisp and red at any size.
  const gap = size * 0.075;
  const slashW = Math.max(3, size * 0.085);
  const slashH = size * 0.68;
  const slant = size * 0.20;
  const sx = x + wM + gap;
  const sy = baseY - size * 0.07;
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + slashW, sy);
  ctx.lineTo(sx + slashW + slant, sy - slashH);
  ctx.lineTo(sx + slant, sy - slashH);
  ctx.closePath();
  ctx.fill();

  setFont(ctx, size, 'display', 700, 'normal', -1.5);
  ctx.fillStyle = color;
  ctx.fillText('15', sx + slashW + slant + gap, baseY);
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * ACT I — title
 * 0.00–0.78 black / red dot
 * 0.78–1.08 light opens
 * 1.05–2.55 title
 * 2.55–3.00 ink curtain
 * ------------------------------------------------------------------ */

function introDot(t) {
  const cx = W / 2;
  const cy = H / 2;
  const stretch = easeInOutQuint(prog(t, 0.50, 0.77));
  const breathe = 1 + 0.16 * Math.sin(t * Math.PI * 2.4) * (1 - prog(t, 0.42, 0.55));
  const r = 7.5 * breathe;

  if (stretch > 0.001) {
    const w = lerp(14, W, stretch);
    rect(cx - w / 2, cy - 1.5, w, 3, C.red);
  } else {
    circle(cx, cy, r, C.red);
    circle(cx, cy, 23 + 3 * Math.sin(t * 3), 'rgba(255,61,0,0)', 0);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,61,0,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  const metaAlpha = 0.78 * (1 - prog(t, 0.52, 0.7));
  meta('M/15', 96, 96, { color: C.paper, alpha: metaAlpha, size: 14 });
  meta('SELF-INITIATED / 2026', W - 96, 96, {
    color: C.paper,
    alpha: metaAlpha,
    size: 12,
    align: 'right',
  });
  meta('A STUDY IN FIFTEEN SECONDS', 96, H - 74, {
    color: C.paper,
    alpha: metaAlpha * 0.78,
    size: 12,
  });
  meta(timecode(t), W - 96, H - 74, {
    color: C.paper,
    alpha: metaAlpha * 0.65,
    size: 12,
    align: 'right',
  });
}

function actOne(t) {
  if (t < 0.78) {
    drawInk(t);
    introDot(t);
    return;
  }

  drawPaper(t);

  // The red horizon from the black opening glides down into the title rule.
  const lineEase = easeInOutQuint(prog(t, 0.78, 1.14));
  const lineY = lerp(540, 795, lineEase);
  const x1 = lerp(0, 96, lineEase);
  const x2 = lerp(W, W - 96, lineEase);

  // The title composition.
  const metaAlpha = easeOutQuint(prog(t, 0.88, 1.18));

  logo(96, 104, 34, { color: C.ink, red: C.red, alpha: metaAlpha });
  meta('CURRICULUM VITAE — IN MOTION', 204, 101, {
    color: C.ink,
    alpha: metaAlpha * 0.70,
    size: 13,
  });
  meta('RUNTIME 15.00 SEC / 60 FPS', W - 96, 101, {
    color: C.ink,
    alpha: metaAlpha * 0.64,
    size: 13,
    align: 'right',
  });

  // Right-hand vertical credits.
  const vertAlpha = easeOutQuint(prog(t, 1.25, 1.65));
  ctx.save();
  ctx.translate(W - 74, 500);
  ctx.rotate(-Math.PI / 2);
  meta('DESIGN / ANIMATION / DIRECTION / SOUND', 0, 0, {
    color: C.ink,
    alpha: vertAlpha * 0.52,
    size: 12,
    align: 'left',
    tracking: 4,
  });
  ctx.restore();

  riseText('A RÉSUMÉ', 96, 470, prog(t, 0.98, 1.5), {
    size: fitSize('A RÉSUMÉ', 1460, { size: 336, family: 'display', weight: 700, tracking: -9 }),
    family: 'display',
    weight: 700,
    tracking: -9,
    color: C.ink,
    distance: 140,
  });

  riseText('IN', 101, 746, prog(t, 1.36, 1.8), {
    size: 62,
    family: 'mono',
    weight: 400,
    tracking: 7,
    color: C.ink,
    distance: 70,
  });

  const motionSize = 304;
  setFont(ctx, motionSize, 'serif', 400, 'italic', -9);
  const inGap = 122;
  const motionX = 96 + inGap;
  const motionW = ctx.measureText('MOTION').width;
  riseText('MOTION', motionX, 746, prog(t, 1.42, 1.96), {
    size: motionSize,
    family: 'serif',
    weight: 400,
    style: 'italic',
    tracking: -9,
    color: C.ink,
    distance: 120,
  });

  const periodP = easeOutQuint(prog(t, 1.82, 2.08));
  if (periodP > 0) {
    const pr = 23 * easeOutQuint(periodP);
    circle(motionX + motionW + 27, 722, pr, C.red);
  }

  // Lead rule.
  line(x1, lineY, x2, lineY, C.red, 3, 1);
  const endpointAlpha = easeOutQuint(prog(t, 1.95, 2.2));
  if (endpointAlpha > 0) circle(x2, lineY, 4.5, C.red, endpointAlpha);

  // Bottom meta.
  const footAlpha = easeOutQuint(prog(t, 1.45, 1.85));
  line(96, 986, W - 96, 986, C.ink, 1, 0.18 * footAlpha);
  meta('A RÉSUMÉ IN MOTION / MMXXVI', 96, 1026, {
    color: C.ink,
    alpha: footAlpha * 0.64,
    size: 13,
  });
  meta(timecode(t), W - 96, 1026, {
    color: C.ink,
    alpha: footAlpha * 0.52,
    size: 12,
    align: 'right',
  });
  meta('01 / 05', W / 2, 1026, {
    color: C.ink,
    alpha: footAlpha * 0.34,
    size: 11,
    align: 'center',
  });

  cropMarks(C.ink, 0.22 * easeOutQuint(prog(t, 0.9, 1.3)));

  // Final curtain covers the title, carrying a red leading edge.
  const cover = easeInOutQuint(prog(t, 2.56, 2.96));
  if (cover > 0) {
    const top = lerp(H, 0, cover);
    rect(0, top, W, H - top, C.ink);
    line(0, top, W, top, C.red, 3, 1);
  }
}

/* ------------------------------------------------------------------ *
 * ACT II — ATTENTION
 * ------------------------------------------------------------------ */

let attentionSprite = null;

function buildSprites() {
  let size = 282;
  while (
    measureText(ctx, 'ATTENTION', size, 'display', 700, 'normal', -2) > 1712 &&
    size > 180
  ) {
    size *= 0.98;
  }
  attentionSprite = makeSprite('ATTENTION', {
    size,
    family: 'display',
    weight: 700,
    tracking: -2,
    color: C.paper,
  });
}

function actTwo(t) {
  drawInk(t);

  // Top fine rule in red: at 3.00 it is still the curtain's leading edge,
  // then the line retracts instead of blinking out.
  const topRuleP = 1 - easeInOutQuint(prog(t, 3.0, 3.35));
  if (topRuleP > 0) line(0, 0, W * topRuleP, 0, C.red, 3, 1);

  const metaA = easeOutQuint(prog(t, 3.02, 3.3));
  meta('02', 96, 96, { color: C.red, alpha: metaA, size: 12, tracking: 2 });
  meta('/ COMPOSITION', 128, 96, { color: C.paper, alpha: metaA * 0.56, size: 12 });
  meta('ATTENTION IS THE MATERIAL', W - 96, 96, {
    color: C.paper,
    alpha: metaA * 0.45,
    size: 12,
    align: 'right',
  });

  // A 12-column hairline grid.
  const gridP = easeOutQuint(prog(t, 3.04, 3.55));
  if (gridP > 0) {
    const left = 96;
    const right = W - 96;
    const cols = 12;
    const gutter = 24;
    const colW = (right - left - gutter * (cols - 1)) / cols;
    ctx.save();
    ctx.globalAlpha = 0.10 * gridP;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1;
    for (let i = 0; i < cols; i++) {
      const x = left + i * (colW + gutter);
      ctx.beginPath();
      ctx.moveTo(x, 150);
      ctx.lineTo(x, 975);
      ctx.stroke();
    }
    ctx.restore();
  }

  const headP = easeOutQuint(prog(t, 3.1, 3.55));
  riseText('I ARRANGE.', 96, 268, headP, {
    size: 92,
    family: 'sans',
    weight: 700,
    tracking: -2,
    color: C.paper,
    distance: 80,
  });
  meta('FORM — RHYTHM — HIERARCHY', 98, 306, {
    color: C.paper,
    alpha: headP * 0.38,
    size: 11,
    tracking: 2.2,
  });

  // The word, assembled from vertical strips.
  const cx = W / 2;
  const baseY = 692;
  const wordShift = easeInOutQuint(prog(t, 4.18, 4.68));
  const wordX = cx - attentionSprite.width / 2 - 38 * wordShift;
  const wordBaseline = baseY - 10 * wordShift;
  const drawX = wordX - attentionSprite.pad;
  const drawY = wordBaseline - (attentionSprite.pad + attentionSprite.ascent);

  // Red disc enters behind the word.
  const discP = easeOutQuint(prog(t, 4.12, 4.72));
  const discGrow = easeInOutQuint(prog(t, 5.1, 5.45));
  if (discP > 0) {
    const dx = lerp(W + 380, 1390, discP);
    const dy = lerp(600, 616, discP);
    const dr = lerp(340, 660, discGrow);
    circle(dx, dy, dr, C.red);

    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, Math.max(0, dr - 1), 0, TAU);
    ctx.clip();
    // A quiet registration grid inside the disc.
    ctx.globalAlpha = 0.16 * discP;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx - dr, dy);
    ctx.lineTo(dx + dr, dy);
    ctx.moveTo(dx, dy - dr);
    ctx.lineTo(dx, dy + dr);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dx, dy, dr * 0.72, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.28 * discP;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(dx, dy, dr + 18, 0, TAU);
    ctx.stroke();
    ctx.restore();

    const tagP = easeOutQuint(prog(t, 4.55, 4.8));
    if (tagP > 0) {
      line(dx + 92, dy + 252, dx + 224, dy + 252, C.paper, 1, 0.42 * tagP);
      meta('FOCAL POINT / 02', dx + 92, dy + 278, {
        color: C.paper,
        alpha: 0.62 * tagP,
        size: 10,
        tracking: 1.6,
      });
    }
  }

  // A red baseline under the word.
  const underP = easeOutQuint(prog(t, 3.82, 4.18));
  if (underP > 0) {
    const w = (attentionSprite.width + 28) * underP;
    line(wordX + attentionSprite.width / 2 - w / 2, wordBaseline + 25, wordX + attentionSprite.width / 2 + w / 2, wordBaseline + 25, C.red, 3, 1);
  }

  // Strips.
  const n = 10;
  const sliceW = attentionSprite.width / n;
  for (let i = 0; i < n; i++) {
    const delay = i * 0.027;
    const p = easeOutQuint(prog(t, 3.16 + delay, 3.62 + delay));
    const exit = easeInExpo(prog(t, 5.46 + i * 0.012, 5.8 + i * 0.012));
    const yOff = (i % 2 === 0 ? -118 : 118) * (1 - p) - exit * 160;
    const xOff = (i < 5 ? -1 : 1) * 22 * (1 - p);
    if (p <= 0.001 && exit <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX + i * sliceW, -400, sliceW + 0.4, H + 800);
    ctx.clip();
    ctx.globalAlpha = 1 - exit;
    ctx.drawImage(
      attentionSprite.canvas,
      attentionSprite.pad + i * sliceW,
      0,
      sliceW + 0.6,
      attentionSprite.canvas.height,
      drawX + i * sliceW + xOff,
      drawY + yOff,
      sliceW + 0.6,
      attentionSprite.canvas.height
    );
    ctx.restore();
  }

  // Small registration ticks around the composition.
  const detailP = easeOutQuint(prog(t, 4.2, 4.65));
  if (detailP > 0) {
    const tickY = wordBaseline + 82;
    line(wordX, tickY, wordX + 56, tickY, C.paper, 1, 0.25 * detailP);
    line(wordX, tickY, wordX, tickY - 12, C.paper, 1, 0.25 * detailP);
    line(wordX + attentionSprite.width, tickY, wordX + attentionSprite.width - 56, tickY, C.paper, 1, 0.25 * detailP);
    line(wordX + attentionSprite.width, tickY, wordX + attentionSprite.width, tickY - 12, C.paper, 1, 0.25 * detailP);
  }

  // Footer.
  const footP = easeOutQuint(prog(t, 3.45, 3.8));
  meta('02 / 05', W - 96, H - 58, {
    color: C.paper,
    alpha: footP * 0.45,
    size: 12,
    align: 'right',
  });
  meta(timecode(t), 96, H - 58, {
    color: C.paper,
    alpha: footP * 0.40,
    size: 11,
  });

  // Paper strips wipe into the next act.
  const strips = 8;
  for (let i = 0; i < strips; i++) {
    const start = i * 0.015;
    const p = easeInOutQuint(prog(t, 5.48 + start, 5.88 + start));
    if (p <= 0) continue;
    const y = H - H * p;
    const x = i * (W / strips);
    const edgeAlpha = 0.95 * (1 - smoothstep(prog(p, 0.76, 0.96)));
    rect(x - 0.5, y, W / strips + 1, H - y + 1, C.paper);
    if (edgeAlpha > 0.001) line(x - 0.5, y, x + W / strips + 0.5, y, C.red, 2, edgeAlpha);
  }
}

/* ------------------------------------------------------------------ *
 * ACT III — TIME
 * ------------------------------------------------------------------ */

function drawMetronome(t) {
  const pivotX = 1512;
  const pivotY = 880;
  const beat = 0.75;
  const beatIndex = Math.floor((t - 6) / beat);
  const beatPhase = (t - 6) / beat - beatIndex;
  // A little extra amplitude at the end of the bar, like a mechanism finding its limit.
  const flourish = easeInOutQuint(prog(t, 8.15, 8.65));
  const angleDeg = (23 + 3.5 * flourish) * Math.cos((beatPhase - 0.5) * Math.PI);
  const finalAngle = (angleDeg * Math.PI) / 180;

  const armLen = 438;

  // Paper disc behind the instrument.
  const discP = easeOutQuint(prog(t, 6.05, 6.55));
  if (discP > 0) {
    const r = 348 * discP;
    circle(1520, 630, r, '#f4eee4', 0.55);
    ctx.save();
    ctx.globalAlpha = 0.28 * discP;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(1520, 630, r + 20, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Engineering arc.
  ctx.save();
  ctx.globalAlpha = 0.22 * discP;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, armLen + 34, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
  ctx.stroke();
  for (let i = -4; i <= 4; i++) {
    const a = -Math.PI / 2 + i * 0.1375;
    const r1 = armLen + 26;
    const r2 = armLen + (i % 2 === 0 ? 48 : 38);
    ctx.beginPath();
    ctx.moveTo(pivotX + Math.cos(a) * r1, pivotY + Math.sin(a) * r1);
    ctx.lineTo(pivotX + Math.cos(a) * r2, pivotY + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // Base shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(38, 31, 21, 0.20)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  rect(1300, 886, 438, 28, C.ink, 10);
  ctx.restore();

  // Body.
  ctx.save();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(1420, 470);
  ctx.lineTo(1610, 470);
  ctx.lineTo(1700, 875);
  ctx.lineTo(1330, 875);
  ctx.closePath();
  ctx.fill();

  // A single, restrained facet gives the wedge volume without gloss.
  ctx.fillStyle = 'rgba(239, 233, 222, 0.085)';
  ctx.beginPath();
  ctx.moveTo(1420, 470);
  ctx.lineTo(1518, 470);
  ctx.lineTo(1518, 875);
  ctx.lineTo(1330, 875);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(239, 233, 222, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1420, 470);
  ctx.lineTo(1610, 470);
  ctx.lineTo(1700, 875);
  ctx.lineTo(1330, 875);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Top and base bevels.
  rect(1410, 458, 220, 26, C.ink, 6);
  rect(1310, 874, 420, 24, C.ink, 8);
  line(1314, 874, 1726, 874, C.paper, 1, 0.22);

  // Scale plate.
  const plateP = easeOutQuint(prog(t, 6.1, 6.5));
  rect(1488, 520, 64, 310, C.paper, 8, 0.94 * plateP);
  ctx.save();
  ctx.globalAlpha = 0.48 * plateP;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  for (let i = 0; i < 17; i++) {
    const y = 548 + i * 15.5;
    const len = i % 4 === 0 ? 22 : 12;
    ctx.beginPath();
    ctx.moveTo(1520 - len / 2, y);
    ctx.lineTo(1520 + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
  if (plateP > 0) {
    ctx.save();
    ctx.translate(1520, 582);
    ctx.rotate(-Math.PI / 2);
    meta('60—208', 0, 0, { color: C.ink, alpha: plateP * 0.46, size: 8, align: 'center', tracking: 1 });
    ctx.restore();
  }

  // Arm.
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(finalAngle);
  ctx.globalAlpha = 1;

  // Shaft. Red reads against both the black body and the pale scale.
  rect(-2.2, -armLen, 4.4, armLen, C.red, 2.2);
  // Counterweight.
  rect(-34, -34, 68, 42, C.ink, 6);
  line(-28, -28, 28, -28, C.paper, 1, 0.22);
  // Red weight.
  rect(-54, -armLen + 126, 108, 78, C.red, 5);
  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 1;
  ctx.strokeRect(-40, -armLen + 140, 80, 50);
  ctx.restore();
  circle(-43, -armLen + 136, 1.6, C.paper, 0.55);
  circle(43, -armLen + 136, 1.6, C.paper, 0.55);
  circle(-43, -armLen + 198, 1.6, C.paper, 0.55);
  circle(43, -armLen + 198, 1.6, C.paper, 0.55);
  // Pivot.
  circle(0, 0, 16, C.paper);
  circle(0, 0, 5.5, C.red);
  ctx.restore();

  // Beat pulse and count.
  const beatTickP = easeOutQuint(prog(t, 6.0, 6.18));
  if (beatTickP > 0) {
    const localBeat = Math.min(3, Math.floor((t - 6) / beat));
    const sinceBeat = t - 6 - localBeat * beat;
    const flash = Math.max(0, 1 - sinceBeat / 0.18);
    const bx = 1520;
    const by = 935;
    circle(bx, by, 4 + 4 * flash, C.red, 0.92 * beatTickP);
    meta(`BEAT 0${localBeat + 1} / 04`, bx + 18, by + 4, {
      color: C.ink,
      alpha: (0.34 + 0.36 * flash) * beatTickP,
      size: 10,
      tracking: 1.4,
    });
  }
}

function actThree(t) {
  drawPaper(t);
  cropMarks(C.ink, 0.20);

  const metaP = easeOutQuint(prog(t, 6.03, 6.3));
  meta('03', 96, 96, { color: C.red, alpha: metaP, size: 12, tracking: 2 });
  meta('/ TIME', 128, 96, { color: C.ink, alpha: metaP * 0.56, size: 12 });
  meta('80 BPM / 4|4', W - 96, 96, {
    color: C.ink,
    alpha: metaP * 0.55,
    size: 12,
    align: 'right',
  });

  // Headline.
  const p1 = easeOutQuint(prog(t, 6.08, 6.52));
  riseText('I DESIGN', 96, 302, p1, {
    size: 92,
    family: 'sans',
    weight: 700,
    tracking: -2,
    color: C.ink,
    distance: 80,
  });

  const p2 = easeOutQuint(prog(t, 6.52, 7.0));
  riseText('TIME', 96, 690, p2, {
    size: 330,
    family: 'serif',
    weight: 400,
    style: 'italic',
    tracking: -12,
    color: C.ink,
    distance: 140,
  });
  setFont(ctx, 330, 'serif', 400, 'italic', -12);
  const timeW = ctx.measureText('TIME').width;
  const dotP = easeOutQuint(prog(t, 6.95, 7.2));
  circle(96 + timeW + 36, 658, 27 * dotP, C.red);

  const subP = easeOutQuint(prog(t, 7.0, 7.35));
  meta('RHYTHM IS STRUCTURE.', 98, 790, {
    color: C.ink,
    alpha: subP * 0.56,
    size: 12,
    tracking: 2.2,
  });

  // Vertical divider.
  const divP = easeOutQuint(prog(t, 6.18, 6.6));
  line(1016, 190, 1016, 906, C.ink, 1, 0.16 * divP);

  drawMetronome(t);

  // Time ruler.
  const rulerP = easeInOutQuint(prog(t, 6.2, 6.8));
  if (rulerP > 0) {
    const x0 = 96;
    const x1 = W - 96;
    const y = 970;
    line(x0, y, x1, y, C.ink, 1, 0.22 * rulerP);
    const span = x1 - x0;
    for (let sec = 0; sec <= 15; sec++) {
      const x = x0 + (span * sec) / 15;
      const major = sec % 3 === 0;
      const h = major ? 18 : 8;
      line(x, y, x, y - h, C.ink, 1, (major ? 0.36 : 0.20) * rulerP);
      if (major) {
        meta(String(sec).padStart(2, '0'), x, y + 24, {
          color: C.ink,
          alpha: 0.44 * rulerP,
          size: 10,
          align: sec === 0 ? 'left' : sec === 15 ? 'right' : 'center',
          tracking: 1.2,
        });
      }
    }

    const px = x0 + (span * clamp(t / DURATION)) ;
    line(px, y - 26, px, y + 10, C.red, 2, rulerP);
    circle(px, y, 5.2, C.red, rulerP);
    const tc = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t * FPS) % FPS).padStart(2, '0')}`;
    meta(tc, px + 10, y - 30, {
      color: C.red,
      alpha: 0.9 * rulerP,
      size: 10,
      tracking: 1,
    });
  }

  // Footer.
  meta('03 / 05', W - 96, H - 32, {
    color: C.ink,
    alpha: 0.42 * rulerP,
    size: 12,
    align: 'right',
  });
  meta('THE ONLY MATERIAL IS TIME', 96, H - 32, {
    color: C.ink,
    alpha: 0.46 * rulerP,
    size: 11,
    tracking: 1.6,
  });
}

/* ------------------------------------------------------------------ *
 * ACT IV — SYSTEMS
 * ------------------------------------------------------------------ */

function hiddenSlot() {
  return { x: 0, y: 0, w: 0, h: 0, r: 0, color: C.paper, alpha: 0 };
}

function makeStates() {
  const paper = C.paper;
  const red = C.red;
  return [
    {
      label: 'BLOCK',
      slots: [
        { x: 0, y: 0, w: 300, h: 270, r: 14, color: paper, alpha: 1 },
        hiddenSlot(),
        hiddenSlot(),
        hiddenSlot(),
      ],
      dot: { x: 190, y: -178, r: 15, alpha: 1 },
      logo: 0,
    },
    {
      label: 'ORBIT',
      slots: [
        { x: 0, y: 0, w: 270, h: 270, r: 135, color: paper, alpha: 1 },
        hiddenSlot(),
        hiddenSlot(),
        hiddenSlot(),
      ],
      dot: { x: 0, y: 0, r: 39, alpha: 1 },
      logo: 0,
    },
    {
      label: 'INPUT',
      slots: [
        { x: 0, y: 0, w: 500, h: 148, r: 74, color: paper, alpha: 1 },
        hiddenSlot(),
        hiddenSlot(),
        hiddenSlot(),
      ],
      dot: { x: -190, y: 0, r: 27, alpha: 1 },
      logo: 0,
    },
    {
      label: 'MODULES',
      slots: [
        { x: 0, y: -88, w: 382, h: 46, r: 23, color: paper, alpha: 1 },
        { x: 0, y: 0, w: 382, h: 46, r: 23, color: paper, alpha: 1 },
        { x: 0, y: 88, w: 382, h: 46, r: 23, color: paper, alpha: 1 },
        hiddenSlot(),
      ],
      dot: { x: 219, y: -88, r: 10, alpha: 1 },
      logo: 0,
    },
    {
      label: 'GRID',
      slots: [
        { x: -85, y: -85, w: 145, h: 145, r: 18, color: paper, alpha: 1 },
        { x: 85, y: -85, w: 145, h: 145, r: 18, color: paper, alpha: 1 },
        { x: -85, y: 85, w: 145, h: 145, r: 18, color: paper, alpha: 1 },
        { x: 85, y: 85, w: 145, h: 145, r: 18, color: red, alpha: 1 },
      ],
      dot: { x: 0, y: 0, r: 0, alpha: 0 },
      logo: 0,
    },
    {
      label: 'SIGNAL',
      slots: [
        { x: -135, y: 22, w: 42, h: 160, r: 21, color: paper, alpha: 1 },
        { x: -45, y: -32, w: 42, h: 284, r: 21, color: paper, alpha: 1 },
        { x: 45, y: -90, w: 42, h: 400, r: 21, color: paper, alpha: 1 },
        { x: 135, y: -12, w: 42, h: 242, r: 21, color: paper, alpha: 1 },
      ],
      dot: { x: 182, y: -198, r: 14, alpha: 1 },
      logo: 0,
    },
    {
      label: 'IDENTITY',
      slots: [
        { x: 0, y: 0, w: 320, h: 320, r: 3, color: paper, alpha: 1 },
        hiddenSlot(),
        hiddenSlot(),
        hiddenSlot(),
      ],
      dot: { x: 0, y: 0, r: 0, alpha: 0 },
      logo: 1,
    },
  ];
}

const STATES = makeStates();

function mixColor(a, b, p) {
  const pa = parseColor(a);
  const pb = parseColor(b);
  return `rgba(${Math.round(lerp(pa[0], pb[0], p))}, ${Math.round(lerp(pa[1], pb[1], p))}, ${Math.round(
    lerp(pa[2], pb[2], p)
  )}, ${lerp(pa[3], pb[3], p)})`;
}

function parseColor(c) {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((v) => parseFloat(v));
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  }
  const hex = c.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    1,
  ];
}

function mixSlot(a, b, p) {
  return {
    x: lerp(a.x, b.x, p),
    y: lerp(a.y, b.y, p),
    w: lerp(a.w, b.w, p),
    h: lerp(a.h, b.h, p),
    r: lerp(a.r, b.r, p),
    color: mixColor(a.color, b.color, p),
    alpha: lerp(a.alpha, b.alpha, p),
  };
}

function drawStateStage(t, k, localBlend, current, previous) {
  const cx = 1412;
  const cy = 584;
  const stageX = 1046;
  const stageY = 242;
  const stageW = 728;
  const stageH = 644;
  const S = 1.18;

  // Hairline frame.
  const frameP = easeOutQuint(prog(t, 9.05, 9.52));
  if (frameP > 0) {
    ctx.save();
    ctx.globalAlpha = 0.26 * frameP;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1;
    ctx.strokeRect(stageX, stageY, stageW, stageH);
    // corner ticks
    ctx.globalAlpha = 0.82 * frameP;
    const tick = 20;
    const corners = [
      [stageX, stageY, 1, 1],
      [stageX + stageW, stageY, -1, 1],
      [stageX, stageY + stageH, 1, -1],
      [stageX + stageW, stageY + stageH, -1, -1],
    ];
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * tick, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * tick);
      ctx.stroke();
    }
    ctx.restore();

    // faint cross
    line(stageX + stageW / 2, stageY, stageX + stageW / 2, stageY + stageH, C.paper, 1, 0.10 * frameP);
    line(stageX, stageY + stageH / 2, stageX + stageW, stageY + stageH / 2, C.paper, 1, 0.10 * frameP);

    // seven state ticks on the left edge
    for (let i = 0; i < 7; i++) {
      const yy = stageY + 52 + i * 86;
      const active = i === k;
      line(stageX - 28, yy, stageX - 8, yy, active ? C.red : C.paper, active ? 2 : 1, active ? frameP : 0.30 * frameP);
      meta(String(i + 1).padStart(2, '0'), stageX - 44, yy + 4, {
        color: active ? C.red : C.paper,
        alpha: (active ? 0.95 : 0.36) * frameP,
        size: 10,
        align: 'right',
        tracking: 1,
      });
    }

    meta('FORM STUDY / 04', stageX + 18, stageY + 28, {
      color: C.paper,
      alpha: 0.50 * frameP,
      size: 11,
      tracking: 1.6,
    });
    meta('A SINGLE COMPONENT', stageX + stageW - 18, stageY + 28, {
      color: C.paper,
      alpha: 0.42 * frameP,
      size: 11,
      align: 'right',
      tracking: 1.4,
    });
  }

  // Build interpolated slots.
  const slots = [];
  for (let i = 0; i < 4; i++) {
    slots.push(mixSlot(previous.slots[i], current.slots[i], localBlend));
  }
  const dot = {
    x: lerp(previous.dot.x, current.dot.x, localBlend),
    y: lerp(previous.dot.y, current.dot.y, localBlend),
    r: lerp(previous.dot.r, current.dot.r, localBlend),
    alpha: lerp(previous.dot.alpha, current.dot.alpha, localBlend),
  };

  // Shapes.
  for (const s of slots) {
    if (s.alpha <= 0.001 || s.w <= 0.1 || s.h <= 0.1) continue;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    roundedRectPath(
      ctx,
      cx + s.x * S - (s.w * S) / 2,
      cy + s.y * S - (s.h * S) / 2,
      s.w * S,
      s.h * S,
      s.r * S
    );
    ctx.fill();
    ctx.restore();
  }

  // The red dot is the constant that changes role.
  if (dot.alpha > 0.001 && dot.r > 0.1) {
    circle(cx + dot.x * S, cy + dot.y * S, dot.r * S, C.red, dot.alpha);
  }

  // Identity type on the final square.
  const logoP = easeOutQuint(prog(t, 11.3, 11.58));
  if (current.logo > 0 || previous.logo > 0) {
    const lp = Math.max(current.logo * logoP, previous.logo * (1 - localBlend));
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      const logoSize = 92 * S;
      setFont(ctx, logoSize, 'display', 700, 'normal', -3);
      const str = 'M/15';
      const w = ctx.measureText(str).width;
      const x = cx - w / 2;
      ctx.fillStyle = C.ink;
      ctx.fillText('M', x, cy + 34);
      const wm = ctx.measureText('M').width;
      ctx.fillStyle = C.red;
      ctx.fillText('/', x + wm - 1, cy + 34);
      const ws = ctx.measureText('/').width;
      ctx.fillStyle = C.ink;
      ctx.fillText('15', x + wm + ws - 1, cy + 34);
      ctx.restore();
    }
  }

  // Labels.
  const stateNum = String(k + 1).padStart(2, '0');
  meta(`STATE ${stateNum} / 07`, cx, stageY + stageH - 36, {
    color: C.red,
    alpha: 0.95 * frameP,
    size: 12,
    align: 'center',
    tracking: 2,
  });
  meta(current.label, cx, stageY + stageH - 14, {
    color: C.paper,
    alpha: 0.52 * frameP,
    size: 11,
    align: 'center',
    tracking: 2.2,
  });

  ctx.save();
  ctx.globalAlpha = 0.34 * frameP;
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(stageX + 18, stageY + stageH - 70);
  ctx.lineTo(stageX + stageW - 18, stageY + stageH - 70);
  ctx.stroke();
  ctx.restore();
}

function actFour(t) {
  drawInk(t);

  const metaP = easeOutQuint(prog(t, 9.02, 9.28));
  meta('04', 96, 96, { color: C.red, alpha: metaP, size: 13, tracking: 2 });
  meta('/ SYSTEMS', 128, 96, { color: C.paper, alpha: metaP * 0.58, size: 13 });
  meta('ONE LANGUAGE / MANY STATES', W - 96, 96, {
    color: C.paper,
    alpha: metaP * 0.46,
    size: 13,
    align: 'right',
  });

  const h1 = easeOutQuint(prog(t, 9.06, 9.45));
  riseText('ONE IDEA.', 96, 330, h1, {
    size: fitSize('ONE IDEA.', 700, { size: 132, family: 'display', weight: 700, tracking: -3 }),
    family: 'display',
    weight: 700,
    tracking: -3,
    color: C.paper,
    distance: 100,
  });

  const h2 = easeOutQuint(prog(t, 9.55, 9.92));
  riseText('MANY STATES.', 96, 462, h2, {
    size: fitSize('MANY STATES.', 760, { size: 132, family: 'display', weight: 700, tracking: -3 }),
    family: 'display',
    weight: 700,
    tracking: -3,
    color: C.red,
    distance: 100,
  });

  const bodyP = easeOutQuint(prog(t, 9.8, 10.18));
  meta('A SYSTEM IS NOT A STYLE.', 98, 566, {
    color: C.paper,
    alpha: bodyP * 0.50,
    size: 13,
    tracking: 2,
  });
  meta("IT'S A WAY OF MOVING.", 98, 592, {
    color: C.paper,
    alpha: bodyP * 0.50,
    size: 13,
    tracking: 2,
  });

  line(96, 650, 864, 650, C.paper, 1, 0.16 * bodyP);
  meta('CONSTANT — RED', 98, 694, {
    color: C.paper,
    alpha: bodyP * 0.40,
    size: 11,
    tracking: 1.4,
  });
  circle(210, 690, 5, C.red, 0.9 * bodyP);

  line(900, 170, 900, 930, C.paper, 1, 0.15 * easeOutQuint(prog(t, 9.08, 9.5)));

  // Determine state and blend.
  const slotDur = 0.375;
  const k = clamp(Math.floor((t - 9.0) / slotDur), 0, 6);
  const local = t - 9.0 - k * slotDur;
  const blend = k === 0 ? 0 : easeInOutQuint(clamp(local / 0.2));
  const prev = STATES[Math.max(0, k - 1)];
  const cur = STATES[k];

  const stageP = easeOutQuint(prog(t, 9.02, 9.42));
  ctx.save();
  ctx.globalAlpha = stageP;
  drawStateStage(t, k, blend, cur, prev);
  ctx.restore();

  const footP = easeOutQuint(prog(t, 9.2, 9.55));
  meta(timecode(t), 96, H - 58, {
    color: C.paper,
    alpha: footP * 0.42,
    size: 12,
  });
  meta('04 / 05', W - 96, H - 58, {
    color: C.paper,
    alpha: footP * 0.46,
    size: 12,
    align: 'right',
  });

  // Paper card rises, carrying the film into its final sheet.
  const wipe = easeInOutQuint(prog(t, 11.64, 11.98));
  if (wipe > 0) {
    const y = H - H * wipe;
    const edgeAlpha = 1 - smoothstep(prog(wipe, 0.8, 0.99));
    rect(0, y, W, H - y + 2, C.paper);
    if (edgeAlpha > 0.001) line(0, y, W, y, C.red, 3, edgeAlpha);
  }
}

/* ------------------------------------------------------------------ *
 * ACT V — signature
 * ------------------------------------------------------------------ */

function actFive(t) {
  drawPaper(t);
  cropMarks(C.ink, 0.22);

  const topP = easeOutQuint(prog(t, 12.02, 12.35));
  logo(96, 136, 46, { color: C.ink, red: C.red, alpha: topP });
  meta('A RÉSUMÉ IN MOTION', 226, 132, {
    color: C.ink,
    alpha: topP * 0.64,
    size: 12,
    tracking: 1.8,
  });
  meta('MMXXVI — 15.00 SEC', W - 96, 132, {
    color: C.ink,
    alpha: topP * 0.56,
    size: 12,
    align: 'right',
  });

  // Main statement. Three beats, three lines.
  const p1 = prog(t, 12.04, 12.52);
  const p2 = prog(t, 12.4, 12.88);
  const p3 = prog(t, 12.76, 13.32);

  const line1Size = fitSize('THE REEL', 1160, { size: 168, family: 'display', weight: 700, tracking: -5 });
  riseText('THE REEL', 96, 400, p1, {
    size: line1Size,
    family: 'display',
    weight: 700,
    tracking: -5,
    color: C.ink,
    distance: 110,
  });

  const line2Size = fitSize('IS THE', 1160, { size: 168, family: 'display', weight: 700, tracking: -5 });
  riseText('IS THE', 96, 554, p2, {
    size: line2Size,
    family: 'display',
    weight: 700,
    tracking: -5,
    color: C.ink,
    distance: 110,
  });

  const serifSize = 300;
  setFont(ctx, serifSize, 'serif', 400, 'italic', -10);
  const resumeW = ctx.measureText('RÉSUMÉ').width;
  riseText('RÉSUMÉ', 96, 820, p3, {
    size: serifSize,
    family: 'serif',
    weight: 400,
    style: 'italic',
    tracking: -10,
    color: C.ink,
    distance: 145,
  });
  const periodP = easeOutQuint(prog(t, 13.15, 13.45));
  const periodR = 25 * periodP;
  circle(96 + resumeW + 34, 795, periodR, C.red);

  // Capabilities block, right.
  const capP = easeOutQuint(prog(t, 12.85, 13.2));
  rect(1488, 360, 18, 18, C.red, 0, capP);
  meta('CAPABILITIES', 1520, 375, {
    color: C.ink,
    alpha: capP * 0.58,
    size: 10,
    tracking: 2,
  });

  const capItems = ['DESIGN', 'ANIMATION', 'DIRECTION', 'SOUND'];
  capItems.forEach((item, i) => {
    const p = easeOutQuint(prog(t, 12.95 + i * 0.08, 13.25 + i * 0.08));
    const y = 450 + i * 58;
    meta(String(i + 1).padStart(2, '0'), 1488, y, {
      color: C.ink,
      alpha: p * 0.40,
      size: 9,
      tracking: 1,
    });
    riseText(item, 1522, y + 2, p, {
      size: 27,
      family: 'display',
      weight: 700,
      tracking: 1.6,
      color: C.ink,
      distance: 30,
    });
    line(1488, y + 22, 1752, y + 22, C.ink, 1, 0.18 * p);
  });

  // A red vertical accent line and its dot.
  const lineP = easeInOutQuint(prog(t, 13.0, 13.48));
  line(1814, 190, 1814, 880, C.red, 2, lineP);
  circle(1814, 190, 4.5, C.red, lineP);

  // Thin divider above footer.
  const footP = easeOutQuint(prog(t, 13.35, 13.7));
  line(96, 934, W - 96, 934, C.ink, 1, 0.22 * footP);

  meta('DESIGNED & ANIMATED IN THE BROWSER / SCORED IN CODE', 96, 982, {
    color: C.ink,
    alpha: footP * 0.64,
    size: 12,
    tracking: 1.7,
  });
  meta('900 FRAMES / 60 FPS / 15.00 SEC', W - 96, 982, {
    color: C.ink,
    alpha: footP * 0.56,
    size: 12,
    align: 'right',
    tracking: 1.5,
  });
  meta(timecode(t), W - 96, 1014, {
    color: C.ink,
    alpha: footP * 0.46,
    size: 10,
    align: 'right',
    tracking: 1,
  });

  // Period on the footer rule.
  const dotP = easeOutQuint(prog(t, 13.55, 13.78));
  circle(1814, 934, 5.5 * dotP, C.red);
}

/* ------------------------------------------------------------------ *
 * frame composition
 * ------------------------------------------------------------------ */

function drawFrame(t) {
  const time = clamp(t, 0, DURATION - 1 / FPS);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (time < 3.0) actOne(time);
  else if (time < 6.0) actTwo(time);
  else if (time < 9.0) actThree(time);
  else if (time < 12.0) actFour(time);
  else actFive(time);

  ctx.restore();
}

window.seek = (t) => {
  drawFrame(Number(t) || 0);
};

window.getFrame = (frame) => {
  drawFrame(frame / FPS);
};

async function boot() {
  buildPaperTexture();
  buildGrainTiles();
  buildSprites();

  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('700 100px "Bahnschrift Condensed"'),
      document.fonts.load('700 100px Bahnschrift'),
      document.fonts.load('italic 100px Georgia'),
      document.fonts.load('400 100px "Courier New"'),
    ]);
  } catch (e) {
    // System fonts are used; loading is best-effort.
  }

  drawFrame(0);

  const params = new URLSearchParams(location.search);
  document.body.classList.toggle('is-capture', params.has('capture'));
  document.body.classList.toggle('is-preview', !params.has('capture'));
  window.__ready = true;

  if (!params.has('capture') && params.has('play')) {
    const start = performance.now();
    let pausedAt = 0;
    let paused = false;
    const tick = (now) => {
      if (!paused) {
        const t = ((now - start) / 1000) % DURATION;
        drawFrame(t);
      }
      requestAnimationFrame(tick);
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        paused = !paused;
        if (!paused) {
          // continuing would require rebasing the clock; keep it simple by restarting
          location.reload();
        }
      }
    });
    requestAnimationFrame(tick);
  }
}

boot();
