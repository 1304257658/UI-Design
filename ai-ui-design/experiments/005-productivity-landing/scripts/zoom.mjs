// 针对性诊断：读关键元素几何 + 截取 2 倍放大局部图，用来确认"看起来被裁掉/重叠"是否真实。
// 用法：node scripts/zoom.mjs <case> <selector> [<selector2> ...]
// 例：  node scripts/zoom.mjs c "h1" ".hero"

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'evidence', 'screens');
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8771';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;

const [caseId, ...selectors] = process.argv.slice(2);
if (!caseId) {
  console.error('用法：node scripts/zoom.mjs <a|b|c|d> <selector> [<selector> ...]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), `wf-zoom-${Date.now()}`);

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' });

async function findPort() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* 等待 */ }
    await sleep(250);
  }
  throw new Error('Chrome 调试端口未就绪');
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(new Error(String(e.message || e))));
    });
    this.ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id; const p = { id, method, params };
    if (sessionId) p.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(p));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`超时：${method}`)); } }, 20000);
    });
  }
  close() { try { this.ws.close(); } catch { /* noop */ } }
}

const cdp = new Cdp(await findPort());
await cdp.ready;

for (const width of [1440, 360]) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 2, mobile: width <= 768,
  }, sessionId);
  await cdp.send('Page.navigate', { url: `${BASE}/cases/${caseId}.html` }, sessionId);
  await sleep(1200);

  for (const sel of selectors) {
    const expr = `(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const parent = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
      return {
        sel: ${JSON.stringify(sel)},
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        scrollY: Math.round(window.scrollY),
        viewportH: window.innerHeight,
        overflowHidden: cs.overflow,
        clippedTop: r.top < 0,
        clippedBottom: r.bottom > window.innerHeight,
        parentRect: parent ? { y: Math.round(parent.y), h: Math.round(parent.height) } : null,
        text: (el.textContent || '').trim().slice(0, 40),
      };
    })()`;
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
    const v = result.value;
    console.log(`[${caseId}@${width}] ${JSON.stringify(v)}`);
    if (!v) continue;

    // 以元素为中心截 2x 局部图（deviceScaleFactor=2 已让输出翻倍）
    const pad = 24;
    const clip = {
      x: Math.max(0, v.rect.x - pad),
      y: Math.max(0, v.rect.y + v.scrollY - pad),
      width: Math.max(80, v.rect.w + pad * 2),
      height: Math.max(60, v.rect.h + pad * 2),
      scale: 1,
    };
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true, clip,
    }, sessionId);
    const safe = sel.replace(/[^a-z0-9_-]/gi, '_');
    const name = `zoom-${caseId}-${width}-${safe}.png`;
    writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
    console.log(`         → ${name}  (clip ${clip.width}x${clip.height} @2x)`);
  }
  await cdp.send('Target.closeTarget', { targetId });
}

cdp.close();
try { chrome.kill(); } catch { /* noop */ }
await sleep(600);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
