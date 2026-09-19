// 005 落地页四案例静态检查。
// 用法：node scripts/audit.mjs
// 只做机器可判断的部分：标签闭合、外部依赖、锚点、可达性属性、必需交互与关键文案。
// 视觉质量必须人工看页面，本脚本不能替代。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const ALL_CASES = ['a', 'b', 'c', 'd'];
// 可选：只检查指定案例，例如 `node scripts/audit.mjs a` 或 `node scripts/audit.mjs a c`。
const only = process.argv.slice(2).map((a) => a.toLowerCase()).filter((a) => ALL_CASES.includes(a));
const CASES = only.length ? only : ALL_CASES;

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// 只认为「真正会发起外部请求」的写法是违规；普通外链文本不算。
const EXTERNAL_PATTERNS = [
  [/<link[^>]+rel\s*=\s*["']?stylesheet/i, '外链 stylesheet'],
  [/@import/i, '@import'],
  [/url\(\s*["']?(?:https?:)?\/\//i, 'CSS url() 远程资源'],
  [/<(?:script|img|iframe|source|video|audio)[^>]+src\s*=\s*["'](?:https?:)?\/\//i, '远程 src'],
  [/fonts\.(?:googleapis|gstatic)\.com/i, 'Google Fonts'],
  [/<img[^>]+src\s*=\s*["'](?:https?:)?\/\//i, '远程图片'],
];

const REQUIRED_TEXT = [
  '想到就记下，剩下的交给 Flowtide',
  '无需信用卡，30 秒开始使用',
  '明远设计',
  '云栖科技',
  '三木研究所',
  '白鲸工作室',
  '自然语言录入',
  '自动排期',
  '每周复盘',
  '随手记',
  '自动整理',
  '放进日程',
  '林楠',
  '周凛',
  '苏珊',
  '免费版',
  'Pro',
  '38',
  '29',
];

const REQUIRED_FEATURES = [
  { name: '邮箱输入框', re: /type\s*=\s*["']email["']/i },
  { name: '表单禁用原生校验', re: /novalidate/i },
  { name: '月付/年付切换', re: /(月付|年付)/ },
  { name: 'details 手风琴', re: /<details[\s>]/i },
  { name: '汉堡导航开关', re: /aria-expanded/i },
  { name: 'aria-controls', re: /aria-controls/i },
  { name: '跳转主内容链接', re: /跳到主要内容/ },
  { name: 'lang=zh-CN', re: /<html[^>]+lang\s*=\s*["']zh-CN["']/i },
  { name: 'viewport meta', re: /<meta[^>]+name\s*=\s*["']viewport["']/i },
  { name: '尊重减弱动效', re: /prefers-reduced-motion/i },
  { name: '方向切换器', re: /id\s*=\s*["']wf-switch["']/i },
  { name: '出现 alert()（禁止）', re: /\balert\s*\(/, mustBeAbsent: true },
];

const VIEWPORTS = [360, 768, 1024, 1440];

function stackCheck(html) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const stack = [];
  const errors = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(stripped)) !== null) {
    const [, closing, rawName, , selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose === '/') continue;
    if (closing) {
      if (stack.length === 0) {
        errors.push(`多余的 </${name}>`);
      } else if (stack[stack.length - 1] === name) {
        stack.pop();
      } else {
        const idx = stack.lastIndexOf(name);
        if (idx === -1) {
          errors.push(`</${name}> 没有对应的开标签`);
        } else {
          errors.push(`</${name}> 之前未闭合：${stack.slice(idx + 1).join(', ')}`);
          stack.length = idx;
        }
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length) errors.push(`未闭合：${stack.join(', ')}`);
  return errors;
}

function checkBraces(html, label) {
  const errors = [];
  const blocks = [
    ...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
  ].map((m) => ['CSS', m[1]]);
  blocks.push(
    ...[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => ['JS', m[1]]),
  );

  for (const [kind, raw] of blocks) {
    const body = kind === 'CSS'
      ? raw.replace(/\/\*[\s\S]*?\*\//g, '')
      : raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    let min = 0;
    for (const ch of body) {
      if (ch === '{') depth += 1;
      else if (ch === '}') { depth -= 1; if (depth < min) min = depth; }
    }
    if (depth !== 0) errors.push(`${kind} 花括号不平衡（差值 ${depth}）`);
    if (min < 0) errors.push(`${kind} 出现多余的 }`);
  }
  return errors;
}

function checkVwInFragileProps(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const bad = [];
  const propRe = /(letter-spacing|margin|margin-(?:top|right|bottom|left)|padding|padding-(?:top|right|bottom|left)|width|height|gap)\s*:\s*([^;{}]*)/gi;
  let m;
  while ((m = propRe.exec(css)) !== null) {
    const [, prop, value] = m;
    // 只允许 clamp()/calc() 里出现的 vw，纯 vw 直接用法视为脆弱
    if (/\d\s*vw/i.test(value) && !/clamp\(|calc\(|min\(|max\(/i.test(value)) {
      bad.push(`${prop}: ${value.trim()}`);
    }
  }
  return bad;
}

let totalProblems = 0;
const summary = [];

for (const id of CASES) {
  const file = join(root, 'cases', `${id}.html`);
  const problems = [];
  const notes = [];

  if (!existsSync(file)) {
    console.log(`\n=== ${id.toUpperCase()} === 缺失文件 ${file}`);
    totalProblems += 1;
    summary.push(`${id.toUpperCase()}: 文件缺失`);
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(html, 'utf8');

  for (const err of stackCheck(html)) problems.push(`标签：${err}`);
  for (const err of checkBraces(html)) problems.push(err);

  for (const [re, label] of EXTERNAL_PATTERNS) {
    if (re.test(html)) problems.push(`外部依赖：${label}`);
  }

  // 锚点与 aria 引用
  const ids = new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));
  for (const m of html.matchAll(/href\s*=\s*["']#([^"']+)["']/gi)) {
    if (!ids.has(m[1])) problems.push(`锚点 #${m[1]} 没有对应 id`);
  }
  for (const m of html.matchAll(/aria-controls\s*=\s*["']([^"']+)["']/gi)) {
    for (const ref of m[1].split(/\s+/).filter(Boolean)) {
      if (!ids.has(ref)) problems.push(`aria-controls="${ref}" 没有对应 id`);
    }
  }

  for (const feat of REQUIRED_FEATURES) {
    const hit = feat.re.test(html);
    if (feat.mustBeAbsent ? hit : !hit) {
      problems.push(`功能缺失/违规：${feat.name}`);
    }
  }

  for (const text of REQUIRED_TEXT) {
    if (!html.includes(text)) problems.push(`文案缺失：${text}`);
  }

  const vwBad = checkVwInFragileProps(html);
  if (vwBad.length) problems.push(`脆弱 vw 用法：${vwBad.join(' | ')}`);

  // 媒体查询覆盖提示（信息，不算错）
  const queries = [...html.matchAll(/@media[^{]+/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  // 断点写法有两种，都算覆盖了 820px：
  //   桌面优先 max-width:<=820px，或移动优先 min-width:821~900px（基准样式就是移动端）。
  // 汉堡导航是否真的在窄屏出现，由 measure.mjs 在浏览器里用计算样式复核。
  const coversSmall = queries.some((q) => {
    const max = q.match(/max-width:\s*(\d+)px/);
    if (max) return Number(max[1]) <= 820;
    const min = q.match(/min-width:\s*(\d+)px/);
    if (min) return Number(min[1]) >= 821 && Number(min[1]) <= 900;
    return false;
  });
  if (!coversSmall) problems.push('未见 820px 附近的断点（既没有 max-width<=820，也没有 min-width 821~900）');
  const coverCount = queries.length;
  notes.push(`媒体查询 ${coverCount} 条`);
  notes.push(`内联 SVG ${(html.match(/<svg/gi) || []).length} 个`);
  notes.push(`体积 ${(bytes / 1024).toFixed(1)} kB`);
  notes.push(`按视口检查宽度：${VIEWPORTS.join('/')}（需人工或浏览器复核）`);

  const status = problems.length === 0 ? 'PASS' : `FAIL (${problems.length})`;
  console.log(`\n=== ${id.toUpperCase()} · ${status} ===`);
  console.log(`  ${notes.join(' · ')}`);
  for (const p of problems) console.log(`  - ${p}`);
  totalProblems += problems.length;
  summary.push(`${id.toUpperCase()}: ${status}`);
}

console.log('\n------------------------------');
console.log(summary.join('  |  '));
console.log(`问题合计：${totalProblems}`);
process.exitCode = totalProblems === 0 ? 0 : 1;
