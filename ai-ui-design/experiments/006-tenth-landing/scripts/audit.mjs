// 006 落地页四案例静态检查。
// 用法：node scripts/audit.mjs            检查 a b c d
//       node scripts/audit.mjs b d        只检查指定案例
// 只做机器可判断的部分：标签闭合、外部依赖、锚点、可达性属性、必需交互、关键文案，
// 以及**种子泄漏检查**（随机字符串绝不允许出现在设计文件里）。
// 视觉质量必须人工看页面，本脚本不能替代。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const ALL_CASES = ['a', 'b', 'c', 'd'];
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

// 逐字文案检查：用正则容忍空格与破折号差异，但不容忍改写。
const REQUIRED_TEXT = [
  [/一天\s*144\s*格，你想留下什么/, 'H1'],
  [/随手记一句，十分自动找出时间、项目与时长/, '副标题前半'],
  [/把它放进今天最合适的那一格/, '副标题后半'],
  [/your@email\.com/, '邮箱占位符'],
  [/免费开始/, '主按钮'],
  [/无需信用卡，30\s*秒就能排好今天/, '信任微文案'],
  [/周五前把课程大纲发给陈老师\s*#课程\s*@30\s*分钟/, '录入演示输入句'],
  [/占\s*3\s*格/, '解析结果：占 3 格'],
  [/15:00/, '排期开始时间'],
  [/15:30/, '排期结束时间'],
  [/与现有安排不冲突/, '排期结论'],
  [/砂丘工作室/, '社会证明 1'],
  [/恒温实验室/, '社会证明 2'],
  [/八分仪/, '社会证明 3'],
  [/蓝湖教育/, '社会证明 4'],
  [/一句话录入/, '功能 1'],
  [/十分钟粒度排期/, '功能 2'],
  [/每周复盘/, '功能 3'],
  [/随手记/, '流程 1'],
  [/自动整理/, '流程 2'],
  [/放进格子/, '流程 3'],
  [/林楠/, '评价 1'],
  [/周凛/, '评价 2'],
  [/苏珊/, '评价 3'],
  [/免费版/, '价格：免费版'],
  [/Pro/, '价格：Pro'],
  [/¥\s*0/, '价格数字 ¥0'],
  [/¥\s*40/, '价格数字 ¥40'],
  [/¥\s*32/, '价格数字 ¥32'],
  [/省\s*20\s*%/, '年付标注：省 20%'],
  [/©\s*2026\s*十分/, '页脚版权'],
];

const REQUIRED_FEATURES = [
  { name: '邮箱输入框', re: /type\s*=\s*["']email["']/i },
  { name: '表单禁用原生校验', re: /novalidate/i },
  { name: '错误提示 role=alert', re: /role\s*=\s*["']alert["']/i },
  { name: '月付/年付切换', re: /(月付|年付)/ },
  { name: 'details 手风琴', re: /<details[\s>]/i },
  { name: '汉堡导航开关', re: /aria-expanded/i },
  { name: 'aria-controls', re: /aria-controls/i },
  { name: '跳转主内容链接', re: /跳到主要内容/ },
  { name: 'lang=zh-CN', re: /<html[^>]+lang\s*=\s*["']zh-CN["']/i },
  { name: 'viewport meta', re: /<meta[^>]+name\s*=\s*["']viewport["']/i },
  { name: '尊重减弱动效', re: /prefers-reduced-motion/i },
  { name: '方向切换器', re: /id\s*=\s*["']wf-switch["']/i },
  { name: '切换器四个按钮', re: /data-case\s*=\s*["']d["']/i },
  { name: '出现 alert()（禁止）', re: /\balert\s*\(/, mustBeAbsent: true },
];

// 每个方向的签名装置：验证「144 格」这件产品事实真的被画出来了，而且画法各不相同。
const SIGNATURES = {
  a: [
    [/144\s*\/\s*DAY/i, 'A 签名：仪器盘刻度行 144 / DAY'],
    [/6\s*CELLS\s*\/\s*HOUR/i, 'A 签名：每小时 6 格'],
  ],
  b: [
    [/143\s*格空着/, 'B 签名：143 格空着'],
    [/空着的\s*143\s*格/, 'B 签名：空着的 143 格才是你的余量'],
  ],
  c: [
    [/12:00\s*·\s*正午/, 'C 签名：正午轴线'],
    [/留白由十分替你看着/, 'C 签名：轴下小字'],
  ],
  d: [
    [/合计\s*144\s*格/, 'D 签名：合计 144 格'],
    [/已排\s*39\s*格/, 'D 签名：对账汇总行'],
  ],
};

const VIEWPORTS = [360, 768, 1024, 1440];

// 区块顺序（不可增删、不可换序）。每个探针必须在该方向里唯一可辨。
const SECTION_ORDER = [
  [/<nav[\s>]/i, '顶部导航'],
  [/一天[\s\S]{0,60}?144[\s\S]{0,60}?格[\s\S]{0,160}?你想留下什么/, '主视觉'],
  [/周五前把课程大纲发给陈老师/, '快速录入演示'],
  [/砂丘工作室/, '社会证明'],
  [/一句话录入/, '功能'],
  [/自动整理/, '工作流程'],
  [/林楠/, '用户评价'],
  [/月付/, '价格'],
  [/<details[\s>]/i, '常见问题'],
  [/©\s*2026\s*十分/, '页脚'],
];

// 文案检查不应该被标签结构或 JS 转义误伤：
// 「周五前…<span>#课程</span>」和 '\u00a532' 都是合法实现，必须能通过。
function decodeEscapes(s) {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(s) {
  return s
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, (e) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    }[e.toLowerCase()]))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

// 搜索结果 = 解码后的原文（抓 JS 里拼出来的文案） + 去标签后的可见文本（抓被标签切开的文案）
function searchable(html) {
  const decoded = decodeEscapes(html);
  return `${decoded}\n${stripTags(decoded)}`;
}

function readSeed() {
  const p = join(root, 'seed.txt');
  if (!existsSync(p)) return null;
  const m = readFileSync(p, 'utf8').match(/^\s*([A-Za-z0-9]{120,})\s*$/m);
  return m ? m[1] : null;
}

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
    if (/\d\s*vw/i.test(value) && !/clamp\(|calc\(|min\(|max\(/i.test(value)) {
      bad.push(`${prop}: ${value.trim()}`);
    }
  }
  return bad;
}

// 种子泄漏：随机串本身，以及它的任意 8 位以上连续片段，都不许出现。
function checkSeedLeak(html, seed) {
  if (!seed) return ['（未读到 seed.txt，跳过泄漏检查）'];
  const hits = [];
  if (html.includes(seed)) hits.push('整条种子字符串');
  const W = 8;
  const seen = new Set();
  for (let i = 0; i + W <= seed.length; i += 1) {
    const frag = seed.slice(i, i + W);
    if (seen.has(frag)) continue;
    seen.add(frag);
    if (html.includes(frag)) hits.push(`种子片段 "${frag}"（位移 ${i}）`);
  }
  return hits;
}

const seed = readSeed();
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
  const searchText = searchable(html);
  // 区块顺序只看 <body> 之后，且去掉 script/style，否则 <title> 与 JS 会污染判断
  const bodyAt = html.search(/<body[\s>]/i);
  const bodyMarkup = decodeEscapes(bodyAt >= 0 ? html.slice(bodyAt) : html)
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, ' ');

  for (const err of stackCheck(html)) problems.push(`标签：${err}`);
  for (const err of checkBraces(html)) problems.push(err);

  for (const [re, label] of EXTERNAL_PATTERNS) {
    if (re.test(html)) problems.push(`外部依赖：${label}`);
  }

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
    if (feat.mustBeAbsent ? hit : !hit) problems.push(`功能缺失/违规：${feat.name}`);
  }

  for (const [re, label] of REQUIRED_TEXT) {
    if (!re.test(searchText)) problems.push(`文案缺失：${label}`);
  }

  for (const [re, label] of (SIGNATURES[id] || [])) {
    if (!re.test(searchText)) problems.push(`签名装置缺失：${label}`);
  }

  const leaks = checkSeedLeak(html, seed);
  for (const l of leaks) {
    if (l.startsWith('（未读到')) { notes.push(l); continue; }
    problems.push(`种子泄漏：${l}`);
  }

  const vwBad = checkVwInFragileProps(html);
  if (vwBad.length) problems.push(`脆弱 vw 用法：${vwBad.join(' | ')}`);

  // 区块顺序
  let cursor = -1;
  let orderOk = true;
  for (const [re, label] of SECTION_ORDER) {
    const idx = bodyMarkup.search(re);
    if (idx < 0) { problems.push(`区块缺失（顺序检查）：${label}`); orderOk = false; break; }
    if (idx < cursor) { problems.push(`区块顺序错误：${label} 出现在上一区块之前`); orderOk = false; }
    cursor = idx;
  }
  if (orderOk) notes.push('区块顺序正确');

  const queries = [...html.matchAll(/@media[^{]+/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  const coversSmall = queries.some((q) => {
    const max = q.match(/max-width:\s*(\d+)px/);
    if (max) return Number(max[1]) <= 820;
    const min = q.match(/min-width:\s*(\d+)px/);
    if (min) return Number(min[1]) >= 821 && Number(min[1]) <= 900;
    return false;
  });
  if (!coversSmall) problems.push('未见 820px 附近的断点（既没有 max-width<=820，也没有 min-width 821~900）');

  notes.push(`媒体查询 ${queries.length} 条`);
  notes.push(`内联 SVG ${(html.match(/<svg/gi) || []).length} 个`);
  notes.push(`details ${(html.match(/<details/gi) || []).length} 个`);
  notes.push(`体积 ${(bytes / 1024).toFixed(1)} kB`);
  notes.push(`宽度需浏览器复核：${VIEWPORTS.join('/')}`);

  const status = problems.length === 0 ? 'PASS' : `FAIL (${problems.length})`;
  console.log(`\n=== ${id.toUpperCase()} · ${status} ===`);
  console.log(`  ${notes.join(' · ')}`);
  for (const p of problems) console.log(`  - ${p}`);
  totalProblems += problems.length;
  summary.push(`${id.toUpperCase()}: ${status}`);
}

console.log('\n------------------------------');
console.log(`种子泄漏检查：${seed ? `已启用（${seed.length} 位种子，8 位窗口）` : '未启用（缺 seed.txt）'}`);
console.log(summary.join('  |  '));
console.log(`问题合计：${totalProblems}`);
process.exitCode = totalProblems === 0 ? 0 : 1;
