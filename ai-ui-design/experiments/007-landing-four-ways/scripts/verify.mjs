// 007 落地页四案例：静态检查 + 无头 Chrome 实测。
//
// 静态部分：标签闭合、零外部依赖、锚点/aria 引用、必需交互与关键文案、脆弱的 vw 用法。
// 浏览器部分：360/768/1024/1440 四个宽度实测
//   - 横向溢出（以"设备宽度"为准，不看 innerWidth：移动端缩小适配会假报 0）
//   - 布局视口被撑宽（shrink-to-fit）
//   - 被父级裁掉的内容（overflow:hidden/clip 把文字切一半，页面看不出滚动条）
//   - 交互：邮箱校验、月付/年付、FAQ、汉堡导航（并检查关闭态是否仍可聚焦）
//
// 用法：先起静态服务器，再 `node scripts/verify.mjs`
//   python -m http.server 8773 --bind 127.0.0.1   （在本目录下运行）

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotDir = join(root, 'evidence', 'screens');
const dataDir = join(root, 'evidence', 'data');
const CASES = ['a', 'b', 'c', 'd'];
const VIEWPORTS = [360, 768, 1024, 1440];
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8773';
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9339;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 静态检查 ----------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

const EXTERNAL = [
  [/<link[^>]+rel\s*=\s*["']?stylesheet/i, '外链 stylesheet'],
  [/@import/i, '@import'],
  [/url\(\s*["']?(?:https?:)?\/\//i, 'CSS url() 远程资源'],
  [/<(?:script|img|iframe|source|video|audio)[^>]+src\s*=\s*["'](?:https?:)?\/\//i, '远程 src'],
  [/fonts\.(?:googleapis|gstatic)\.com/i, 'Google Fonts'],
];

const REQUIRED_TEXT = [
  '想到就记下，剩下的交给 Flowtide',
  '把散落在聊天、便签和脑子里的待办',
  '无需信用卡，30 秒开始使用',
  '明远设计', '云栖科技', '三木研究所', '白鲸工作室',
  '自然语言录入', '自动排期', '每周复盘',
  '随手记', '自动整理', '放进日程',
  '林楠', '周凛', '苏珊',
  '免费版', 'Pro',
  '周五前给陈老师发课程大纲', '15:00', '15:30',
];

// 价格必须按"¥ + 数字"整体判断：光看 "29" 会被「4 月 18 日」这类非价格数字干扰。
// 价格由 JS 切换，源文件里往往只出现一个，另一个在脚本字面量里，所以脚本也要一起扫。
function priceNumbers(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const fromText = (text.match(/¥\s*[0-9]+/g) || [])
    .map((s) => s.replace(/[^0-9]/g, ''));
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).join(' ');
  const fromScript = (scripts.match(/[¥￥]\s*[0-9]{1,4}/g) || [])
    .map((s) => s.replace(/[^0-9]/g, ''));
  // 有的实现把两个价格放在 data-* 上（如 data-m="38" data-y="29"）
  const fromData = [...html.matchAll(/data-[a-z-]*\s*=\s*["']([0-9]{1,4})["']/gi)]
    .map((m) => m[1]);
  return { visible: new Set(fromText), all: new Set([...fromText, ...fromScript, ...fromData]) };
}

const FEATURES = [
  { name: 'lang=zh-CN', re: /<html[^>]+lang\s*=\s*["']zh-CN["']/i },
  { name: 'viewport meta', re: /<meta[^>]+name\s*=\s*["']viewport["']/i },
  { name: '跳到主要内容', re: /跳到主要内容/ },
  { name: '邮箱输入框', re: /type\s*=\s*["']email["']/i },
  { name: 'novalidate', re: /novalidate/i },
  { name: '月付/年付切换', re: /(月付|年付)/ },
  { name: 'details 手风琴', re: /<details[\s>]/i },
  { name: '汉堡 aria-expanded', re: /aria-expanded/i },
  { name: 'aria-controls', re: /aria-controls/i },
  { name: 'prefers-reduced-motion', re: /prefers-reduced-motion/i },
  { name: '方向切换器', re: /id\s*=\s*["']wf-switch["']/i },
  { name: '出现 alert()（禁止）', re: /\balert\s*\(/, mustBeAbsent: true },
];

function tagStackErrors(html) {
  const s = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const stack = []; const errors = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const [, closing, rawName, , self] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || self === '/') continue;
    if (closing) {
      if (!stack.length) errors.push(`多余的 </${name}>`);
      else if (stack[stack.length - 1] === name) stack.pop();
      else {
        const idx = stack.lastIndexOf(name);
        if (idx === -1) errors.push(`</${name}> 没有对应开标签`);
        else { errors.push(`</${name}> 之前未闭合：${stack.slice(idx + 1).join(', ')}`); stack.length = idx; }
      }
    } else stack.push(name);
  }
  if (stack.length) errors.push(`未闭合：${stack.join(', ')}`);
  return errors;
}

function braceErrors(html) {
  const errors = [];
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const js = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  for (const [label, body] of [['CSS', css.replace(/\/\*[\s\S]*?\*\//g, '')],
    ['JS', js.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')]]) {
    let depth = 0; let min = 0;
    for (const ch of body) {
      if (ch === '{') depth += 1;
      else if (ch === '}') { depth -= 1; if (depth < min) min = depth; }
    }
    if (depth !== 0) errors.push(`${label} 花括号不平衡（${depth}）`);
    if (min < 0) errors.push(`${label} 有多余的 }`);
  }
  return errors;
}

function fragileVw(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const bad = [];
  const re = /(letter-spacing|margin|margin-(?:top|right|bottom|left)|padding|padding-(?:top|right|bottom|left)|width|height|gap)\s*:\s*([^;{}]*)/gi;
  let m;
  while ((m = re.exec(css)) !== null) {
    if (/\d\s*vw/i.test(m[2]) && !/clamp\(|calc\(|min\(|max\(/i.test(m[2])) bad.push(`${m[1]}: ${m[2].trim()}`);
  }
  return bad;
}

let problemsTotal = 0;

console.log('================ 静态检查 ================');
for (const id of CASES) {
  const file = join(root, 'cases', `${id}.html`);
  const problems = [];
  if (!existsSync(file)) {
    console.log(`\n=== ${id.toUpperCase()} · 文件缺失 ===`);
    problemsTotal += 1;
    continue;
  }
  const html = readFileSync(file, 'utf8');
  for (const e of tagStackErrors(html)) problems.push(`标签：${e}`);
  for (const e of braceErrors(html)) problems.push(e);
  for (const [re, label] of EXTERNAL) if (re.test(html)) problems.push(`外部依赖：${label}`);

  const ids = new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));
  for (const m of html.matchAll(/href\s*=\s*["']#([^"']+)["']/gi)) {
    if (!ids.has(m[1])) problems.push(`锚点 #${m[1]} 无对应 id`);
  }
  for (const m of html.matchAll(/aria-controls\s*=\s*["']([^"']+)["']/gi)) {
    for (const ref of m[1].split(/\s+/).filter(Boolean)) {
      if (!ids.has(ref)) problems.push(`aria-controls="${ref}" 无对应 id`);
    }
  }
  for (const f of FEATURES) {
    const hit = f.re.test(html);
    if (f.mustBeAbsent ? hit : !hit) problems.push(`功能：${f.name}`);
  }
  // 文案比对要先去掉标签、解码实体，否则 "…&rsaquo;周五前…" 这类会被误判成缺失
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  for (const t of REQUIRED_TEXT) {
    if (!text.includes(t)) problems.push(`文案缺失：${t}`);
  }
  const prices = priceNumbers(html);
  // 初始渲染只要求出现免费档价格；Pro 的 38/29 由切换脚本管理，
  // 具体状态下的数字由浏览器实测（切到月付/年付后各自断言）负责。
  if (!prices.visible.has('0')) problems.push('初始渲染缺少免费档价格 ¥0');
  for (const need of ['38', '29']) {
    if (!prices.all.has(need)) problems.push(`源文件里找不到价格 ¥${need}`);
  }
  const vw = fragileVw(html);
  if (vw.length) problems.push(`脆弱 vw：${vw.join(' | ')}`);

  const status = problems.length ? `FAIL (${problems.length})` : 'PASS';
  console.log(`\n=== ${id.toUpperCase()} · ${status} ===  `
    + `${(Buffer.byteLength(html) / 1024).toFixed(1)} kB · `
    + `内联 SVG ${(html.match(/<svg/gi) || []).length} 个 · `
    + `媒体查询 ${(html.match(/@media/gi) || []).length} 条`);
  for (const p of problems) console.log(`  - ${p}`);
  problemsTotal += problems.length;
}

// ---------- 浏览器实测 ----------
const MEASURE = (deviceW) => `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const limit = Math.min(${deviceW}, vw);
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const over = Math.round(r.right + window.scrollX - limit);
    if (over > 1) offenders.push({ tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 60), over, w: Math.round(r.width) });
  }
  offenders.sort((a, b) => b.over - a.over);

  // 被父级裁掉的内容：没有滚动条，但字已经被切掉
  const clipped = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const parent = el.parentElement;
    if (!parent) continue;
    const pcs = getComputedStyle(parent);
    if (!['hidden', 'clip'].includes(pcs.overflowX)) continue;
    const pr = parent.getBoundingClientRect();
    const availRight = pr.right - (parseFloat(pcs.paddingRight) || 0);
    let cut = Math.round(r.right - availRight);
    if (el.children.length === 0 && (el.textContent || '').trim()) {
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const tr of range.getClientRects()) cut = Math.max(cut, Math.round(tr.right - availRight));
    }
    if (cut > 2) clipped.push({ tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 40),
      parentCls: (parent.getAttribute('class') || '').slice(0, 40),
      text: (el.textContent || '').trim().slice(0, 20), cut });
  }
  clipped.sort((a, b) => b.cut - a.cut);

  const ham = document.querySelector('[aria-expanded]');
  return {
    deviceW: ${deviceW}, vw, limit,
    overflow: Math.round(de.scrollWidth - limit),
    shrink: Math.round(de.clientWidth - ${deviceW}),
    offenders: offenders.slice(0, 5),
    clipped: clipped.slice(0, 5),
    details: document.querySelectorAll('details').length,
    anchors: document.querySelectorAll('a[href^="#"]').length,
    h1: ((document.querySelector('h1') || {}).textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    hamVisible: ham ? getComputedStyle(ham).display !== 'none' : null,
    hamTargets: ham ? ham.getAttribute('aria-controls') : null,
  };
})()`;

const INTERACT = `(async () => {
  const out = {};
  const settle = () => new Promise((r) => setTimeout(r, 520));
  const lines = (t) => t.split('\\n').map((s) => s.trim()).filter(Boolean);
  const fresh = (a, b) => { const s = new Set(lines(a)); return lines(b).filter((l) => !s.has(l)).slice(0, 2); };

  const email = document.querySelector('input[type=email]');
  const form = email ? email.closest('form') : null;
  if (form && email) {
    const t0 = document.body.innerText;
    email.value = 'bad-email';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    out.errMsg = fresh(t0, document.body.innerText);
    const t1 = document.body.innerText;
    email.value = 'me@example.com';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    out.okMsg = fresh(t1, document.body.innerText);
  }

  const price = () => (document.body.innerText.match(/¥\\s?\\d+/g) || []);
  const tg = [...document.querySelectorAll('button,[role=button],input[type=radio],label')]
    .filter((b) => /年付|月付/.test(b.textContent || ''));
  // 先明确回到月付、再切年付，两个状态都要求 Pro 只出现自己的那个数字
  const monthly = tg.find((b) => /月付/.test(b.textContent || ''));
  const yearly = tg.find((b) => /年付/.test(b.textContent || ''));
  if (monthly) monthly.click();
  out.priceMonthly = price();
  if (yearly) yearly.click();
  out.priceYearly = price();

  const ham = document.querySelector('[aria-expanded]');
  if (ham) {
    const tid = (ham.getAttribute('aria-controls') || '').split(/\\s+/)[0];
    const target = tid ? document.getElementById(tid) : null;
    out.hamVisible = getComputedStyle(ham).display !== 'none';
    out.hamTargetFound = !!target;
    // 关闭态是否还能被 Tab 到：可见性 + inert 双重判断
    const focusableWhenClosed = (() => {
      if (!target) return null;
      const links = [...target.querySelectorAll('a[href],button')];
      if (!links.length) return 0;
      if (target.hasAttribute('inert')) return 0;
      return links.filter((el) => {
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none';
      }).length;
    })();
    out.focusableWhenClosed = focusableWhenClosed;
    await settle();
    const closedSig = sig(target);
    ham.click();
    await settle();
    out.hamOpenSig = sig(target);
    out.hamChanged = closedSig !== out.hamOpenSig;
    out.hamExpanded = ham.getAttribute('aria-expanded');
    ham.click();
    await settle();
    out.hamRestored = sig(target) === closedSig;
  }

  const d = document.querySelector('details');
  if (d) { d.querySelector('summary').click(); out.detailsOpened = d.open; }
  return out;

  function sig(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return [cs.display, cs.visibility, cs.maxHeight,
      Math.round(el.getBoundingClientRect().height)].join('|');
  }
})()`;

console.log('\n================ 浏览器实测 ================');
let runtimeProblems = 0;
const report = { base: BASE, generatedAt: new Date().toISOString(), cases: {} };

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}（可用 CHROME_PATH 指定）`);
  process.exitCode = 1;
} else {
  mkdirSync(shotDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  const profile = join(tmpdir(), `wf007-${Date.now()}`);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-sync',
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
      this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
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
        } else if (m.method === 'Runtime.exceptionThrown') {
          this.errors.push(m.params?.exceptionDetails?.exception?.description
            || m.params?.exceptionDetails?.text || '脚本异常');
        }
      });
    }
    send(method, params = {}, sessionId) {
      const id = ++this.id; const p = { id, method, params };
      if (sessionId) p.sessionId = sessionId;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.ws.send(JSON.stringify(p));
        setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`超时：${method}`)); } }, 25000);
      });
    }
    close() { try { this.ws.close(); } catch { /* noop */ } }
  }

  try {
    const cdp = new Cdp(await findPort());
    await cdp.ready;
    for (const id of CASES) {
      if (!existsSync(join(root, 'cases', `${id}.html`))) continue;
      report.cases[id] = { viewports: {}, interactions: {}, consoleErrors: [] };
      for (const w of VIEWPORTS) {
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        await cdp.send('Runtime.enable', {}, sessionId);
        await cdp.send('Page.enable', {}, sessionId);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: 900, deviceScaleFactor: 1, mobile: w <= 768,
        }, sessionId);
        await cdp.send('Page.navigate', { url: `${BASE}/cases/${id}.html` }, sessionId);
        await sleep(900);

        const { result } = await cdp.send('Runtime.evaluate', {
          expression: MEASURE(w), returnByValue: true,
        }, sessionId);
        const m = result.value;
        report.cases[id].viewports[w] = m;

        if (m.overflow > 1) {
          runtimeProblems += 1;
          console.log(`  !! ${id}@${w} 横向溢出 ${m.overflow}px → `
            + m.offenders.map((o) => `${o.tag}.${o.cls}(+${o.over})`).join(', '));
        }
        if (m.shrink > 1) {
          runtimeProblems += 1;
          console.log(`  !! ${id}@${w} 布局视口被撑宽 ${m.shrink}px（内容放不下）→ `
            + m.offenders.map((o) => `${o.tag}.${o.cls}(w=${o.w})`).join(', '));
        }
        if (m.clipped.length) {
          runtimeProblems += 1;
          console.log(`  !! ${id}@${w} 内容被裁掉 → `
            + m.clipped.map((o) => `${o.tag}.${o.cls || o.parentCls}["${o.text}"]-${o.cut}px`).join(', '));
        }

        if (w === 1440 || w === 360) {
          const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png', captureBeyondViewport: true,
          }, sessionId);
          writeFileSync(join(shotDir, `${id}-${w}.png`), Buffer.from(shot.data, 'base64'));
        }

        if (w === 360 || w === 1440) {
          const { result: ir } = await cdp.send('Runtime.evaluate', {
            expression: INTERACT, returnByValue: true, awaitPromise: true,
          }, sessionId);
          const iv = ir.value;
          report.cases[id].interactions[w] = iv;
          const bad = [];
          if (!iv.errMsg || !iv.errMsg.length) bad.push('邮箱错误提示未出现');
          if (!iv.okMsg || !iv.okMsg.length) bad.push('邮箱成功提示未出现');
          if (iv.hamVisible && iv.hamChanged === false) bad.push('汉堡点了没展开');
          if (iv.hamVisible && iv.hamRestored === false) bad.push('汉堡再点没收回去');
          if (w === 360 && iv.hamVisible && iv.focusableWhenClosed > 0) {
            bad.push(`关闭态菜单仍有 ${iv.focusableWhenClosed} 个可聚焦项（键盘能 Tab 进屏外菜单）`);
          }
          if (iv.detailsOpened === false) bad.push('FAQ 未能展开');
          // 月付态必须出现 ¥38 且不得出现 ¥29；年付态反之（Pro 同时只显示一个数字）
          const hasPrice = (arr, n) => arr.some((s) => {
            const nums = (s.match(/[0-9]+/g) || []);
            return nums.includes(String(n));
          });
          if (iv.priceMonthly) {
            if (!hasPrice(iv.priceMonthly, 38)) bad.push('月付态没有出现 ¥38');
            if (hasPrice(iv.priceMonthly, 29)) bad.push('月付态同时出现了 ¥29（Pro 只能显示一个数字）');
          }
          if (iv.priceYearly) {
            if (!hasPrice(iv.priceYearly, 29)) bad.push('年付态没有出现 ¥29');
            if (hasPrice(iv.priceYearly, 38)) bad.push('年付态仍出现 ¥38（Pro 只能显示一个数字）');
          }
          if (bad.length) {
            runtimeProblems += bad.length;
            for (const b of bad) console.log(`  !! ${id}@${w} ${b}`);
          }
        }

        report.cases[id].consoleErrors.push(...cdp.errors);
        cdp.errors = [];
        await cdp.send('Target.closeTarget', { targetId });
      }
      const v = report.cases[id].viewports;
      console.log(`${id}.html  最大溢出=${Math.max(...VIEWPORTS.map((x) => v[x].overflow))}px  `
        + `最大撑宽=${Math.max(...VIEWPORTS.map((x) => v[x].shrink))}px  `
        + `h1="${v[1440].h1.slice(0, 30)}"`);
    }
    cdp.close();
  } catch (err) {
    console.error('测量失败：', err.message);
    runtimeProblems += 1;
  } finally {
    try { chrome.kill(); } catch { /* noop */ }
    await sleep(600);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

writeFileSync(join(dataDir, 'verify.json'), JSON.stringify(report, null, 2));
console.log('\n------------------------------');
console.log(`静态问题：${problemsTotal}  运行时问题：${runtimeProblems}`);
console.log('数据 → evidence/data/verify.json   截图 → evidence/screens/');
process.exitCode = (problemsTotal + runtimeProblems) === 0 ? 0 : 1;
