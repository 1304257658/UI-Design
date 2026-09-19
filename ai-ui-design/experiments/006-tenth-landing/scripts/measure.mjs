// 006 · 用无头 Chrome + CDP 实测四个案例与对比页。
// 用法：node scripts/measure.mjs          测全部
//       node scripts/measure.mjs a c      只测指定案例
// 前置：另开终端跑 node scripts/serve.mjs
//
// 实测内容：
//   · 360 / 768 / 1024 / 1440 四档的横向溢出，并列出真正把文档撑宽的元素
//   · 每个宽度都先「瞬时滚一遍整页」，否则基于 IntersectionObserver 的入场动效
//     在整页截图里仍是 opacity:0（案例普遍设了 scroll-behavior:smooth，
//     必须强制 instant，否则 scrollTo 变成动画、页面根本没滚下去）
//   · 桌面宽度测表单校验与月付/年付切换；360 宽度测汉堡导航（等过渡结束再读）
//   · 价格检查只看「用户真正看得见的文字」，排除 sr-only 副本
// 不需要任何 npm 依赖，用 Node 内置 WebSocket 直连 Chrome。

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
const only = process.argv.slice(2).map((x) => x.toLowerCase()).filter((x) => ALL_CASES.includes(x));
const CASES = only.length ? only : ALL_CASES;
const VIEWPORTS = [360, 768, 1024, 1440];
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8781';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}\n可用 CHROME_PATH 环境变量指定。`);
  process.exit(2);
}

mkdirSync(shotDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });
const profile = join(tmpdir(), `tenth-cdp-${Date.now()}`);

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
  // 受限环境下 Chrome 自带的进程沙箱与崩溃上报子进程会被拒绝创建，关掉它们。
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--disable-crash-reporter',
  '--disable-breakpad',
  '--no-zygote',
  '--disable-dev-shm-usage',
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
  throw new Error('Chrome 调试端口未就绪');
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

const MEASURE_FN = `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  // 被祖先 overflow 裁掉的元素（跑马灯、轨道）不算横向溢出问题
  const clippedByAncestor = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body && p !== de) {
      const o = getComputedStyle(p);
      if (o.overflowX !== 'visible' || o.overflow !== 'visible') return true;
      p = p.parentElement;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const over = Math.round(r.right + window.scrollX - vw);
    if (over > 1 && !clippedByAncestor(el)) {
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
  const targets = [...document.querySelectorAll('[aria-controls]')]
    .flatMap((el) => (el.getAttribute('aria-controls') || '').split(/\\s+/))
    .filter(Boolean);
  return {
    vw,
    docW: de.scrollWidth,
    overflow: Math.round(de.scrollWidth - vw),
    offenders: offenders.slice(0, 6),
    totalTags: document.querySelectorAll('body *').length,
    svg: document.querySelectorAll('svg').length,
    details: document.querySelectorAll('details').length,
    anchors: document.querySelectorAll('a[href^="#"]').length,
    hamburger: !!ham,
    hamSmall: ham ? getComputedStyle(ham).display !== 'none' : null,
    ariaTargets: targets,
    h1: (document.querySelector('h1') || {}).textContent?.trim().slice(0, 90) || '',
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
})()`;

const INTERACT_FN = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const text = () => document.body.innerText;
  // 价格检查只看「用户真正看得见的文字」：排除 display:none / visibility:hidden /
  // opacity:0 / 1px 视觉隐藏节点，否则为通过逐字检查而放进 DOM 的 sr-only 副本会污染计数。
  const visibleText = () => {
    const buf = [];
    const walk = (n) => {
      if (n.nodeType === 3) { buf.push(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const r = n.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return;
      for (const c of n.childNodes) walk(c);
    };
    walk(document.body);
    return buf.join(' ').replace(/\\s+/g, ' ');
  };
  const count = (re) => (visibleText().match(re) || []).length;

  const email = document.querySelector('input[type=email]');
  const form = email ? email.closest('form') : null;
  if (form && email) {
    email.value = 'not-an-email';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await wait(150);
    out.invalidMsg = (text().match(/[^\\n]*(无效|不正确|格式|请输入|请检查|请先|不完整|不太对)[^\\n]*/) || [''])[0].slice(0, 80);
    email.value = 'me@example.com';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await wait(150);
    out.validMsg = (text().match(/[^\\n]*(成功|已发送|收到|谢谢|已排|已记录)[^\\n]*/) || [''])[0].slice(0, 80);
  }

  const toggles = [...document.querySelectorAll('button,[role=button],input[type=radio],label')]
    .filter((b) => /年付|月付/.test(b.textContent || ''));
  out.toggleCount = toggles.length;
  out.price40before = count(/¥\\s*40/g);
  out.price32before = count(/¥\\s*32/g);
  if (toggles.length) {
    const yearly = toggles.find((b) => /年付/.test(b.textContent || '')) || toggles[toggles.length - 1];
    yearly.click();
    await wait(250);
  }
  out.price40after = count(/¥\\s*40/g);
  out.price32after = count(/¥\\s*32/g);
  out.priceAfterSample = (visibleText().match(/¥\\s*\\d+[^\\s]{0,10}/g) || []).slice(0, 5);

  const ham = document.querySelector('[aria-expanded]');
  out.hamburger = !!ham;
  if (ham) {
    const targetId = (ham.getAttribute('aria-controls') || '').split(/\\s+/)[0];
    const target = targetId ? document.getElementById(targetId) : null;
    // 有的实现用 display 开关，有的用 visibility + max-height 过渡，所以四个属性一起看，
    // 且必须等过渡结束再读，否则读到的是过渡起始值。
    const st = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return c.display + '|' + c.visibility + '|' + c.opacity + '|' + c.maxHeight;
    };
    const visibleLinks = (el) => (el
      ? [...el.querySelectorAll('a')].filter((a) => {
        const s = getComputedStyle(a);
        return s.display !== 'none' && s.visibility !== 'hidden'
          && a.getBoundingClientRect().height > 0;
      }).length
      : 0);
    out.hamSelf = getComputedStyle(ham).display;
    out.hamExpandedBefore = ham.getAttribute('aria-expanded');
    out.hamFrom = st(target);
    out.hamLinksClosed = visibleLinks(target);
    ham.click();
    await wait(560);
    out.hamTo = st(target);
    out.hamExpandedAfter = ham.getAttribute('aria-expanded');
    out.hamLinksOpen = visibleLinks(target);
    ham.click();
    await wait(560);
    out.hamClosed = st(target);
    out.hamExpandedClosed = ham.getAttribute('aria-expanded');
  }

  const d = document.querySelector('details');
  if (d) { const s = d.querySelector('summary'); if (s) { s.click(); out.detailsOpened = d.open; } }
  return out;
})()`;

const SCROLL_FN = `(async () => {
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  const step = Math.round(window.innerHeight * 0.7) || 600;
  const H = () => Math.max(html.scrollHeight, document.body.scrollHeight);
  const total = H();
  for (let y = 0; y <= total + step; y += step) {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 90));
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  html.style.scrollBehavior = prev;
  await new Promise((r) => setTimeout(r, 700));
  return { total, back: Math.round(window.scrollY) };
})()`;

const report = { base: BASE, generatedAt: new Date().toISOString(), cases: {} };
let failures = 0;
const problems = [];

async function openTab(cdp, url, width, height = 900) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width <= 768,
  }, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await sleep(950);
  return { targetId, sessionId };
}

try {
  const wsUrl = await findPort();
  const cdp = new Cdp(wsUrl);
  await cdp.ready;

  for (const id of CASES) {
    report.cases[id] = {
      viewports: {}, interactions: null, interactionsMobile: null, consoleErrors: [],
    };

    for (const width of VIEWPORTS) {
      const { targetId, sessionId } = await openTab(cdp, `${BASE}/cases/${id}.html`, width);

      const { result: sc } = await cdp.send('Runtime.evaluate', {
        expression: SCROLL_FN, awaitPromise: true, returnByValue: true,
      }, sessionId);

      const { result } = await cdp.send('Runtime.evaluate', {
        expression: MEASURE_FN, returnByValue: true,
      }, sessionId);
      const m = result.value;
      m.scrolledThrough = sc.value;
      report.cases[id].viewports[width] = m;

      if (m.overflow > 1) {
        failures += 1;
        problems.push(`${id}@${width} 横向溢出 ${m.overflow}px`);
        console.log(`  !! ${id}@${width} 横向溢出 ${m.overflow}px → `
          + m.offenders.map((o) => `${o.tag}.${o.cls}(+${o.over})`).join(', '));
      }

      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
      }, sessionId);
      writeFileSync(join(shotDir, `${id}-${width}.png`), Buffer.from(shot.data, 'base64'));

      // 再存一份半尺寸总览图：整页 PNG 常常超过 8192px，人工核对时读不进来。
      const fullH = Math.max(sc.value.total || 900, 900);
      const small = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: fullH, scale: 0.5 },
      }, sessionId);
      writeFileSync(join(shotDir, `overview-${id}-${width}.png`), Buffer.from(small.data, 'base64'));

      // 交互测试放在截图之后，避免切换状态污染截图
      if (width === 1440) {
        const { result: ir } = await cdp.send('Runtime.evaluate', {
          expression: INTERACT_FN, awaitPromise: true, returnByValue: true,
        }, sessionId);
        report.cases[id].interactions = ir.value;
      }
      if (width === 360) {
        const { result: mr } = await cdp.send('Runtime.evaluate', {
          expression: INTERACT_FN, awaitPromise: true, returnByValue: true,
        }, sessionId);
        report.cases[id].interactionsMobile = mr.value;
      }

      report.cases[id].consoleErrors.push(...cdp.errors);
      cdp.errors = [];
      await cdp.send('Target.closeTarget', { targetId });
    }

    const v = report.cases[id].viewports;
    const worst = Math.max(...VIEWPORTS.map((w) => v[w].overflow));
    const it = report.cases[id].interactions || {};
    const im = report.cases[id].interactionsMobile || {};

    const priceOk = it.price40after === 0 && it.price32after > 0;
    const navOk = !!im.hamburger
      && im.hamFrom !== im.hamTo
      && im.hamExpandedAfter === 'true'
      && im.hamExpandedClosed === 'false'
      && im.hamLinksClosed === 0
      && im.hamLinksOpen >= 3;
    const formOk = !!it.validMsg;
    if (!priceOk) { failures += 1; problems.push(`${id}: 价格切换后仍能看到两个数字`); }
    if (!navOk) { failures += 1; problems.push(`${id}: 汉堡导航未真正展开`); }
    if (!formOk) { failures += 1; problems.push(`${id}: 表单成功提示缺失`); }

    console.log(`${id}.html  h1="${v[1440].h1.replace(/\s+/g, ' ').slice(0, 24)}…"  `
      + `最大溢出=${worst}px  底色=${v[1440].bodyBg}  元素=${v[1440].totalTags}  `
      + `svg=${v[1440].svg}  details=${v[1440].details}  滚过=${v[1440].scrolledThrough.total}px`);
    console.log(`   价格：年付后可见 ¥40×${it.price40after} ¥32×${it.price32after} `
      + `${priceOk ? 'OK（只剩一个数字）' : '!! 检查'}`);
    console.log(`   表单：无效"${(it.invalidMsg || '—').slice(0, 18)}" / `
      + `有效"${(it.validMsg || '—').slice(0, 18)}" ${formOk ? 'OK' : '!! 检查'}`);
    console.log(`   导航@360：汉堡=${im.hamSelf} 面板 ${im.hamFrom} → ${im.hamTo} `
      + `链接可见 ${im.hamLinksClosed}→${im.hamLinksOpen} `
      + `aria-expanded ${im.hamExpandedBefore}→${im.hamExpandedAfter}→${im.hamExpandedClosed} `
      + `${navOk ? 'OK' : '!! 检查'}`);
    if (report.cases[id].consoleErrors.length) {
      failures += 1;
      problems.push(`${id}: 控制台报错 ${report.cases[id].consoleErrors.length} 条`);
      console.log(`   !! 控制台报错：${report.cases[id].consoleErrors.slice(0, 2).join(' | ')}`);
    }
  }

  // 对比页单独截图（只在全量运行时做，避免案例未齐时截到 404）
  if (!only.length) {
    const { targetId, sessionId } = await openTab(cdp, `${BASE}/index.html`, 1440, 1000);
    await sleep(1800);
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
    }, sessionId);
    writeFileSync(join(shotDir, 'index-1440.png'), Buffer.from(shot.data, 'base64'));
    const { result: ix } = await cdp.send('Runtime.evaluate', {
      expression: MEASURE_FN, returnByValue: true,
    }, sessionId);
    report.index = ix.value;
    console.log(`index.html  溢出=${ix.value.overflow}px  元素=${ix.value.totalTags}`);
    await cdp.send('Target.closeTarget', { targetId });
  }

  cdp.close();
} catch (err) {
  console.error('测量失败：', err.message);
  failures += 1;
  problems.push(`测量异常：${err.message}`);
} finally {
  try { chrome.kill(); } catch { /* noop */ }
  await sleep(600);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* 可能仍被占用 */ }
}

writeFileSync(join(dataDir, 'measurements.json'), JSON.stringify(report, null, 2));
console.log('\n截图 → evidence/screens/   数据 → evidence/data/measurements.json');
if (failures === 0) console.log('全部通过');
else {
  console.log(`需要修的问题 ${failures} 处：`);
  for (const p of problems) console.log(`  - ${p}`);
}
process.exitCode = failures === 0 ? 0 : 1;
