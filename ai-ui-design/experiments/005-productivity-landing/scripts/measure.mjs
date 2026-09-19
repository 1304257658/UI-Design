// 用无头 Chrome + CDP 在 360/768/1024/1440 下实测四个案例：
// 横向溢出、控制台报错、交互是否真的可用，并输出整页截图。
// 用法：node scripts/measure.mjs
// 需要本机 Chrome；不需要任何 npm 依赖（用 Node 内置 WebSocket）。
//
// 注意：Chrome 需要命名管道，在受限文件沙箱下会启动失败
// （mojo platform_channel "拒绝访问 (0x5)"）。这是沙箱边界，不是页面问题。

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotDir = join(root, 'evidence', 'screens');
const dataDir = join(root, 'evidence', 'data');
const ALL_CASES = ['a', 'b', 'c', 'd'];
// 可选：只测指定案例，例如 `node scripts/measure.mjs a b`。
const only = process.argv.slice(2).map((a) => a.toLowerCase()).filter((a) => ALL_CASES.includes(a));
const CASES = only.length ? only : ALL_CASES;
const VIEWPORTS = [360, 768, 1024, 1440];
// 汉堡导航只在窄屏收起，所以交互实测必须在窄屏也跑一遍；
// 1440 再跑一次是为了覆盖桌面态的价格切换与 FAQ。
const INTERACT_AT = [360, 1440];
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8771';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9333);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}\n可用 CHROME_PATH 环境变量指定。`);
  process.exit(2);
}

mkdirSync(shotDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });
const profile = join(tmpdir(), `wf-cdp-${Date.now()}`);

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' });

async function findPort() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error(`Chrome 调试端口 ${PORT} 未就绪（端口被占用时可用 CDP_PORT 换一个）`);
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
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
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params?.exceptionDetails?.exception?.description
          || msg.params?.exceptionDetails?.text || '脚本异常');
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.errors.push('console.error: '
          + (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
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
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`超时：${method}`));
        }
      }, 30000);
    });
  }
  close() { try { this.ws.close(); } catch { /* noop */ } }
}

// 许多页面用"滚动进入视口才显示"的进场动效。整页截图不会触发它们，
// 结果截出来一片空白。所以先从头滚到底触发一遍，再滚回顶部。
const SETTLE_FN = `(async () => {
  const step = Math.max(200, Math.round(window.innerHeight * 0.75));
  const h = document.documentElement.scrollHeight;
  for (let y = 0; y < h; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 70));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 320));
  return document.documentElement.scrollHeight;
})()`;

// 整页截图必须先把"滚动进场"定格到最终状态。
// 否则元素停在 opacity:0，截出来是一片空白 —— 那是截图的假象，不是页面缺陷。
// 这里同时覆盖两种情况：JS 写在行内样式里的透明，以及由 class 驱动的透明。
const CAPTURE_PREP_FN = `(() => {
  // 收起状态的移动端导航本身就是 opacity:0，不能被"修"成可见，
  // 否则窄屏截图会拍到本应关着的菜单。
  const collapsed = [];
  for (const b of document.querySelectorAll('[aria-expanded="false"][aria-controls]')) {
    for (const id of (b.getAttribute('aria-controls') || '').split(/\\s+/)) {
      if (id) collapsed.push(id);
    }
  }
  const inCollapsed = (el) => collapsed.some((id) => {
    const t = document.getElementById(id);
    return t && t !== el && t.contains(el);
  });

  let fixed = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (inCollapsed(el)) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) === 0 && el.getBoundingClientRect().height > 0) {
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'none', 'important');
      fixed += 1;
    }
  }
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{animation-play-state:paused!important}';
  document.head.appendChild(s);
  return fixed;
})()`;

// 页面内执行的测量脚本：找出真正把文档撑宽的元素。
// deviceW 必须由调用方传入，不能只看 window.innerWidth：
// 移动端 Chrome 遇到放不下的内容会"缩小适配"，把布局视口撑得比设备还宽，
// innerWidth 跟着一起变大，于是 scrollWidth - innerWidth 会假报 0 溢出。
const MEASURE_FN = (deviceW) => `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const limit = Math.min(${deviceW}, vw);
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const right = r.right + window.scrollX;
    const over = Math.round(right - limit);
    if (over > 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 70),
        over,
        w: Math.round(r.width),
      });
    }
  }
  offenders.sort((a, b) => b.over - a.over);

  const ham = document.querySelector('[aria-expanded]');
  const toggle = document.querySelector('[aria-controls]');
  const targets = [...document.querySelectorAll('[aria-controls]')]
    .flatMap((el) => (el.getAttribute('aria-controls') || '').split(/\\s+/))
    .filter(Boolean);
  const box = (el) => (el ? getComputedStyle(el).display !== 'none' : null);
  return {
    deviceW: ${deviceW},
    vw,
    limit,
    docW: de.scrollWidth,
    clientW: de.clientWidth,
    bodyW: document.body.scrollWidth,
    // 溢出 = 文档比"设备宽度"宽多少（而不是比 innerWidth 宽多少）
    overflow: Math.round(de.scrollWidth - limit),
    // shrink-to-fit：布局视口被撑到比设备宽，说明有元素放不下
    shrink: Math.round(de.clientWidth - ${deviceW}),
    offenders: offenders.slice(0, 6),
    totalTags: document.querySelectorAll('body *').length,
    svg: document.querySelectorAll('svg').length,
    details: document.querySelectorAll('details').length,
    detailsOpen: document.querySelectorAll('details[open]').length,
    sectionIds: [...document.querySelectorAll('[id]')].map((e) => e.id).slice(0, 80),
    anchors: document.querySelectorAll('a[href^="#"]').length,
    hamburger: !!ham,
    hamSmall: box(ham),
    hamExpanded: ham ? ham.getAttribute('aria-expanded') : null,
    // 汉堡按钮本身在窄屏该显示、在宽屏该隐藏
    toggleSmall: box(toggle),
    ariaTargets: targets,
    h1: (document.querySelector('h1') || {}).textContent?.trim().slice(0, 90) || '',
  };
})()`;

const INTERACT_FN = `(async () => {
  const out = { notes: [] };
  // 等过渡真正结束再取签名：抽屉类实现会在动画结束后才落到 visibility:hidden，
  // 立刻读会拿到中间态，把正常实现误判成"没收回去"。
  const settle = () => new Promise((r) => setTimeout(r, 520));
  const linesOf = (t) => t.split('\\n').map((s) => s.trim()).filter(Boolean);
  // 不靠关键词猜措辞：直接取"操作后新出现的那几行字"。
  const newLines = (a, b) => {
    const seen = new Set(linesOf(a));
    return linesOf(b).filter((l) => !seen.has(l)).slice(0, 3);
  };
  // 用组合签名判断"展开/收起"：很多实现改的是 visibility / max-height / transform，
  // 而不是 display，只看 display 会漏判。
  const sig = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return [cs.display, cs.visibility, cs.maxHeight, cs.opacity, cs.transform,
      Math.round(el.getBoundingClientRect().height)].join('|');
  };

  const email = document.querySelector('input[type=email]');
  const form = email ? email.closest('form') : null;
  if (form && email) {
    const t0 = document.body.innerText;
    email.value = 'not-an-email';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    out.invalidMsgs = newLines(t0, document.body.innerText);
    const t1 = document.body.innerText;
    email.value = 'me@example.com';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    out.validMsgs = newLines(t1, document.body.innerText);
  }

  const priceOf = () => (document.body.innerText.match(/¥\\s?\\d+/g) || []);
  const toggles = [...document.querySelectorAll('button,[role=button],input[type=radio],label')]
    .filter((b) => /年付|月付/.test(b.textContent || ''));
  out.toggleCount = toggles.length;
  out.priceBefore = priceOf().slice(0, 6);
  if (toggles.length) toggles[toggles.length - 1].click();
  out.priceAfter = priceOf().slice(0, 6);

  const ham = document.querySelector('[aria-expanded]');
  if (ham) {
    const targetId = (ham.getAttribute('aria-controls') || '').split(/\\s+/)[0];
    const target = targetId ? document.getElementById(targetId) : null;
    out.hamButtonVisible = getComputedStyle(ham).display !== 'none';
    out.hamTargetFound = !!target;
    await settle();
    const closed = sig(target);
    ham.click();
    await settle();
    const opened = sig(target);
    out.hamExpandedAfter = ham.getAttribute('aria-expanded');
    out.hamClosedSig = closed;
    out.hamOpenSig = opened;
    out.hamChanged = closed !== opened;
    ham.click();
    await settle();
    out.hamRestored = sig(target) === closed;
    out.hamInertWhenClosed = target ? target.hasAttribute('inert') : null;
  }

  const d = document.querySelector('details');
  if (d) { const s = d.querySelector('summary'); if (s) { s.click(); out.detailsOpened = d.open; } }
  return out;
})()`;

const report = { base: BASE, generatedAt: new Date().toISOString(), cases: {} };
let failures = 0;
const fail = (msg) => { failures += 1; console.log(`  !! ${msg}`); };

try {
  const wsUrl = await findPort();
  const cdp = new Cdp(wsUrl);
  await cdp.ready;

  for (const id of CASES) {
    report.cases[id] = { viewports: {}, interactions: {}, consoleErrors: [] };
    for (const width of VIEWPORTS) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width, height: 900, deviceScaleFactor: 1, mobile: width <= 768,
      }, sessionId);
      await cdp.send('Page.navigate', { url: `${BASE}/cases/${id}.html` }, sessionId);
      await sleep(900);

      // 先触发进场动效
      await cdp.send('Runtime.evaluate', {
        expression: SETTLE_FN, returnByValue: true, awaitPromise: true,
      }, sessionId);

      // 再把尚未进场的元素定格到最终状态，否则整页截图会拍到空白
      const { result: prep } = await cdp.send('Runtime.evaluate', {
        expression: CAPTURE_PREP_FN, returnByValue: true,
      }, sessionId);

      const { result } = await cdp.send('Runtime.evaluate', {
        expression: MEASURE_FN(width), returnByValue: true, awaitPromise: false,
      }, sessionId);
      const m = result.value;
      m.revealFixed = prep.value;
      report.cases[id].viewports[width] = m;

      if (m.overflow > 1) {
        fail(`${id}@${width} 横向溢出 ${m.overflow}px → `
          + m.offenders.map((o) => `${o.tag}.${o.cls}(+${o.over})`).join(', '));
      }
      if (m.shrink > 1) {
        fail(`${id}@${width} 内容放不下：布局视口被撑到 ${m.clientW}px`
          + `（设备宽 ${width}px，缩小适配 ${m.shrink}px）→ `
          + m.offenders.map((o) => `${o.tag}.${o.cls}(w=${o.w})`).join(', '));
      }

      // 截图必须在交互之前：交互会点开价格切换和手风琴，
      // 否则整页截图留下的是"被点过"的状态，不能作为初始态证据。
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
      }, sessionId);
      writeFileSync(join(shotDir, `${id}-${width}.png`), Buffer.from(shot.data, 'base64'));

      if (INTERACT_AT.includes(width)) {
        const { result: ir } = await cdp.send('Runtime.evaluate', {
          expression: INTERACT_FN, returnByValue: true, awaitPromise: true,
        }, sessionId);
        report.cases[id].interactions[width] = ir.value;
      }

      report.cases[id].consoleErrors.push(...cdp.errors);
      cdp.errors = [];
      await cdp.send('Target.closeTarget', { targetId });
    }
    const v = report.cases[id].viewports;
    const worst = Math.max(...VIEWPORTS.map((w) => v[w].overflow));
    const worstShrink = Math.max(...VIEWPORTS.map((w) => v[w].shrink));
    console.log(`${id}.html  h1="${v[1440].h1.slice(0, 28)}…"  最大溢出=${worst}px  `
      + `最大缩小适配=${worstShrink}px  `
      + `元素=${v[1440].totalTags}  svg=${v[1440].svg}  details=${v[1440].details}  `
      + `锚点=${v[1440].anchors}`);
  }
  cdp.close();
} catch (err) {
  console.error('测量失败：', err.message);
  failures += 1;
} finally {
  try { chrome.kill(); } catch { /* noop */ }
  await sleep(600);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* 可能仍被占用 */ }
}

writeFileSync(join(dataDir, 'measurements.json'), JSON.stringify(report, null, 2));
console.log('\n截图 → evidence/screens/  数据 → evidence/data/measurements.json');

// ---- 逐项体检 ----
console.log('\n=== 交互与可达性逐项检查 ===');
for (const id of CASES) {
  const c = report.cases[id];
  const mob = c.interactions[360];
  const desk = c.interactions[1440];
  const issues = [];
  if (c.consoleErrors.length) issues.push(`控制台报错 ${c.consoleErrors.length} 条`);
  if (!mob) issues.push('窄屏交互实测缺失');
  if (mob) {
    if (!mob.invalidMsgs?.length) issues.push('无效邮箱没有出现行内提示');
    if (!mob.validMsgs?.length) issues.push('有效邮箱没有出现行内提示');
    if (!mob.hamButtonVisible) issues.push('窄屏看不到汉堡按钮');
    if (!mob.hamTargetFound) issues.push('aria-controls 指向的元素不存在');
    if (mob.hamChanged === false) issues.push('点汉堡后菜单没有展开/收起');
    if (mob.hamExpandedAfter !== 'true') issues.push('展开后 aria-expanded 不为 true');
    if (mob.hamRestored === false) issues.push('再点一次没有收回去');
    if (!mob.detailsOpened) issues.push('FAQ 手风琴点不开');
  }
  if (desk && desk.toggleCount === 0) issues.push('找不到月付/年付切换按钮');
  // Pro 月付价必须只有一个数字：切换前后各自不能同时出现 38 与 29
  const both = (arr) => {
    const t = (arr || []).join('');
    return t.includes('38') && t.includes('29');
  };
  if (desk && both(desk.priceBefore)) issues.push(`月付态同时显示了 38 和 29 → ${JSON.stringify(desk.priceBefore)}`);
  if (desk && both(desk.priceAfter)) issues.push(`年付态同时显示了 38 和 29 → ${JSON.stringify(desk.priceAfter)}`);
  if (desk && JSON.stringify(desk.priceBefore) === JSON.stringify(desk.priceAfter)) {
    issues.push('价格切换前后没有变化');
  }
  console.log(issues.length ? `  ${id.toUpperCase()} ✗ ${issues.join('；')}` : `  ${id.toUpperCase()} ✓ 全部通过`);
  failures += issues.length;
}

console.log('\n------------------------------');
console.log(failures === 0 ? '浏览器实测：全部通过' : `浏览器实测问题：${failures} 处`);
process.exitCode = failures === 0 ? 0 : 1;
