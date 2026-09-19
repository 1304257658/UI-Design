// 抓首屏与页面中部的可视区截图（1440 桌面 + 360 手机），用于人工判断排版质量。
// 整页截图太长，缩放后无法判断细节，所以按视口裁剪分段拍。
// 用法：node scripts/shots.mjs

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'evidence', 'screens');
const CASES = ['a', 'b', 'c', 'd'];
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8771';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), `wf-shots-${Date.now()}`);

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-sync', '--hide-scrollbars',
  '--force-device-scale-factor=1',
  'about:blank',
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
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(new Error(String(e.message || e))));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`超时：${method}`)); }
      }, 20000);
    });
  }
  close() { try { this.ws.close(); } catch { /* noop */ } }
}

// 用锚点区块名定位要拍的位置：首屏、演示区、功能、价格
const SEGMENTS = ['hero', 'demo', 'features', 'pricing'];

const LOCATE_FN = (key) => `(() => {
  const w = window.innerWidth;
  const pick = {
    hero: document.querySelector('h1'),
    demo: document.querySelector('#capture, #demo, [id*="demo" i], [id*="capture" i], #features'),
    features: document.querySelector('#features, [id*="feature" i]'),
    pricing: document.querySelector('#pricing, [id*="pricing" i]'),
  }[${JSON.stringify(key)}];
  if (!pick) return null;
  const r = pick.getBoundingClientRect();
  return Math.max(0, Math.round(r.top + window.scrollY - 72));
})()`;

const cdp = new Cdp(await findPort());
await cdp.ready;

for (const id of CASES) {
  for (const width of [1440, 360]) {
    const height = width === 1440 ? 900 : 760;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: width <= 768,
    }, sessionId);
    await cdp.send('Page.navigate', { url: `${BASE}/cases/${id}.html` }, sessionId);
    await sleep(1100);

    for (const seg of SEGMENTS) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: LOCATE_FN(seg), returnByValue: true,
      }, sessionId);
      const y = result.value;
      if (y === null) continue;
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` }, sessionId);
      await sleep(320);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const name = `${id}-${width}-${seg}.png`;
      writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'));
      console.log(`  ${name}`);
    }
    await cdp.send('Target.closeTarget', { targetId });
  }
}

cdp.close();
try { chrome.kill(); } catch { /* noop */ }
await sleep(600);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
console.log('\n分段截图完成 → evidence/screens/');
