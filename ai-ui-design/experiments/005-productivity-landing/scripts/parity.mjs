// 005 受控内容一致性检查。
//
// 这个实验的全部意义是"内容固定，只比视觉方向"。audit.mjs 只抽查了十几条文案，
// 万一某个案例把某句功能说明改写了、漏了某条 FAQ、或者调换了区块顺序，
// 横向对比就不成立了 —— 本脚本专门盯这件事。
//
// 用法：node scripts/parity.mjs
// 通过 = 四个案例都包含全部受控文案片段，且区块先后顺序一致。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CASES = ['a', 'b', 'c', 'd'];

/**
 * 受控文案片段（来源：CONTENT-SPEC.md 的"固定文案"一节）。
 * 刻意用"有辨识度的短片段"而不是整句：整句里夹着 · / 分隔符和标签，
 * 一旦排版把一句话拆进多个 <span>，整句匹配就会误报。
 */
const FRAGMENTS = {
  '主视觉': [
    '想到就记下，剩下的交给 Flowtide',
    '把散落在聊天、便签和脑子里的待办，自动整理成一份真正执行得下去的计划',
    'your@email.com', '免费开始', '无需信用卡，30 秒开始使用',
  ],
  '快速收录演示': [
    '周五前给陈老师发课程大纲', '#课程', '@30分钟',
    '4 月 18 日周五', '预计 30 分钟', '与现有日程无冲突',
  ],
  '社会证明': ['明远设计', '云栖科技', '三木研究所', '白鲸工作室'],
  '功能': [
    '自然语言录入', '自动排期', '每周复盘',
    '明天上午联系王工确认设备清单',
    '把任务放进当天最合适的时间段',
    '自动生成完成率、延期项与时间去向',
  ],
  '流程': [
    '随手记', '自动整理', '放进日程',
    '想到什么就打一行字', '结合空闲时段和优先级', '看完成率和延期情况',
  ],
  '评价': [
    '林楠', '周凛', '苏珊',
    '产品设计师', '自由开发者', '内容负责人',
    '以前光整理待办就要花半小时',
    '手机上记一句，回到电脑前它已经排好了',
    '团队共享清单之后，跨时区交接再没丢过事情',
  ],
  '价格': [
    '免费版', 'Pro', '月付', '年付',
    '无限任务', '3 个项目', '手机与网页同步',
    '无限项目', '跨设备同步', '日历双向同步', '团队共享清单', '每周复盘报告',
    '节省 20%', '38', '29',
  ],
  '常见问题': [
    '和别的待办应用有什么不同', '多数工具让你自己整理',
    '支持哪些设备', '网页、iOS、Android，实时同步',
    '数据能导出吗', 'Markdown 或 CSV',
    '离线能用吗', '恢复网络后自动合并',
    '数据安全怎么保证', '不读取任务内容用于广告',
    'Pro 可以退款吗', '14 天内无理由全额退款',
  ],
  '页脚': ['更新日志', '隐私政策', '© 2026 Flowtide'],
};

/**
 * 区块顺序：这些片段在正常页面里必须依次出现，四个案例顺序要一致。
 * 刻意用"解释性长句"而不是区块标题（标题可能被当成标语、要目、目录项在别处提前出现，
 * 例如某个案例把「自然语言录入」用在了首屏眉标里，那属于合理复用，不是顺序错乱）。
 */
const ORDER = [
  '把散落在聊天、便签和脑子里的待办',   // 主视觉副标题
  '周五前给陈老师发课程大纲',            // 快速收录演示
  '明远设计',                            // 社会证明
  '明天上午联系王工确认设备清单',        // 功能
  '想到什么就打一行字',                  // 工作流程
  '以前光整理待办就要花半小时',          // 用户评价
  '无限项目',                            // 价格
  '多数工具让你自己整理',                // 常见问题
  '© 2026 Flowtide',                     // 页脚
];

function decode(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function tight(s) {
  return decode(s).replace(/\s+/g, '').toLowerCase();
}

/**
 * 页面上"看得见的文字"：去掉标签、脚本、样式，但保留 placeholder 之类的属性值
 * —— 受控文案里的 your@email.com 就只可能出现在 placeholder 里。
 */
function visibleText(html) {
  const attrs = [...html.matchAll(
    /\s(?:placeholder|value|aria-label|title|alt|content)\s*=\s*"([^"]*)"/gi,
  )].map((m) => m[1]);
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  return tight(`${stripped} ${attrs.join(' ')}`);
}

let problems = 0;

for (const id of CASES) {
  const file = join(root, 'cases', `${id}.html`);
  console.log(`\n=== ${id.toUpperCase()} ===`);
  if (!existsSync(file)) {
    console.log('  文件缺失，跳过');
    problems += 1;
    continue;
  }

  const raw = readFileSync(file, 'utf8');
  const visible = visibleText(raw);
  // 价格这类值可能只写在 JS 字符串里（切换时才显示），所以也允许在整份源码里匹配。
  const whole = tight(raw);
  const has = (f) => visible.includes(tight(f)) || whole.includes(tight(f));
  const missing = [];

  for (const [group, items] of Object.entries(FRAGMENTS)) {
    const gone = items.filter((f) => !has(f));
    if (gone.length) missing.push(`${group}：${gone.join(' / ')}`);
  }

  if (missing.length) {
    problems += missing.length;
    for (const m of missing) console.log(`  ✗ 受控文案缺失 → ${m}`);
  } else {
    const n = Object.values(FRAGMENTS).reduce((a, b) => a + b.length, 0);
    console.log(`  ✓ 全部 ${n} 条受控文案片段都在`);
  }

  // 区块顺序：这些片段必须依次出现。版式不同会让绝对位置不同，
  // 所以只判断"先后"，不比较字符位置。
  const idx = ORDER.map((f) => visible.indexOf(tight(f)));
  const badAt = idx.findIndex((v) => v < 0);
  if (badAt >= 0) {
    console.log(`  ✗ 顺序检查用的片段没找到：${ORDER[badAt]}`);
    problems += 1;
  } else if (idx.every((v, i) => i === 0 || v > idx[i - 1])) {
    console.log(`  ✓ 区块顺序：${ORDER.length} 个检查点依次出现`);
  } else {
    console.log('  ✗ 区块顺序被打乱（受控文案没有按规范顺序出现）');
    problems += 1;
  }
}

console.log('\n------------------------------');
console.log(problems === 0 ? '受控内容一致性：PASS' : `受控内容一致性：FAIL（${problems} 处）`);
process.exitCode = problems === 0 ? 0 : 1;
