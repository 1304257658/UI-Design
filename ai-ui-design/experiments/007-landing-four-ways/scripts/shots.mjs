// 分段截图：整页截图太高（5000–8000px），缩放后看不清细节。
// 这里在 1440 / 360 两个宽度下，按区块滚动并截取"视口高度"的画面，便于人工判断排版。
// 用法：node scripts/shots.mjs

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'evidence', 'crops');
const CASES = ['a', 'b', 'c', 'd'];
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8773';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), `wf007c-${Date.now()}`);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });

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

// 按 section 顺序取前几个区块的位置
const POS_FN = `(() => {
  const out = [];
  out.push({ label: 'hero', y: 0 });
  const secs = [...document.querySelectorAll('main > section, main > div > section, body > section')];
  secs.forEach((s, i) => {
    const h2 = s.querySelector('h2');
    const name = h2 ? h2.textContent.trim().replace(/\\s+/g, '').slice(0, 8) : ('sec' + i);
    out.push({ label: name, y: Math.max(0, Math.round(s.getBoundingClientRect().top + window.scrollY - 40)) });
  });
  out.push({ label: 'end', y: Math.round(document.documentElement.scrollHeight) });
  return out;
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

    const { result } = await cdp.send('Runtime.evaluate', { expression: POS_FN, returnByValue: true }, sessionId);
    const positions = result.value || [];
    // 去重并限制数量，避免同一位置重复截图
    const seen = new Set();
    const picks = [];
    for (const p of positions) {
      const key = Math.round(p.y / 120);
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push(p);
    }
    const chosen = [picks[0], picks[1], picks[2], picks[Math.floor(picks.length / 2)], picks[picks.length - 2]]
      .filter(Boolean);

    for (const p of chosen) {
      await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${p.y})` }, sessionId);
      // 等足淡入动画（.6s）+ 错峰延迟，否则截到的是半透明中间态，会误判成"文字看不清"
      await sleep(1100);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const name = `${id}-${width}-${String(p.y).padStart(5, '0')}-${p.label}.png`;
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
console.log('\n分段截图 → evidence/crops/');
