// 005 设计决策随机抽取器。
//
// 目的：让四个案例的视觉决策不是"顺手选的默认值"，而是真的随机。
// 每一轮用新的密码学随机种子，抽完记录在案，可复现、可复核。
//
// 用法：
//   node scripts/roll.mjs              # 新种子，重新抽一轮
//   node scripts/roll.mjs 123456789    # 固定种子复现
//
// 产出：
//   design-roll.json    机器可读的完整抽取结果
//   DESIGN-ROLL.md      人读的抽取记录（含每个案例的设计决策表）
//   briefs/<case>.md    给每个案例施工用的完整施工单
//
// 随机只发生在"视觉与结构"维度。文案、区块顺序、功能由 CONTENT-SPEC.md 固定，不参与抽取。

import { writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/* ---------------------------------------------------------------- 随机数 */

const SEED = Number(process.argv[2]) || randomInt(1, 2 ** 31 - 1);

function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);
const r = () => rng();
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const int = (min, max) => min + Math.floor(r() * (max - min + 1));
const float = (min, max, step = 0.01) => {
  const n = min + r() * (max - min);
  const snapped = Math.round(n / step) * step;
  // 消掉 1.2550000000000001 这类浮点尾数，记录里才读得下去
  const decimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step)) + 2));
  return Number(snapped.toFixed(decimals));
};
const chance = (p) => r() < p;

/** 不放回抽样：保证四个案例在同一维度上不撞车。 */
function deal(pool, n) {
  const copy = pool.slice();
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return out;
}

/* ------------------------------------------------------------------ 颜色 */

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(100, Math.max(0, l)) / 100;
  const k = (n) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

function luminance(hex) {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** 抽一组颜色，直到正文对比度达标；不达标就继续抽（随机但可用）。 */
function rollPalette(spec, label = '?') {
  let best = null;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const p = spec();
    const minInk = p.minInk;
    // 正文实际落在哪一层：默认底色；D 这类高饱和满幅色块方向，正文落在纸色块上。
    const paper = p.textOn || p.bg;
    const extraOk = !p.alsoOn || p.alsoOn.every((c) => contrast(p.ink, c) >= 4.5);
    const cInk = contrast(p.ink, paper);
    const cMuted = contrast(p.muted, paper);
    const score = Math.min(cInk / minInk, cMuted / 4.6);
    if (!best || !(score <= best.score)) best = { score, cInk, cMuted, paper, p };
    if (cInk >= minInk && cMuted >= 4.6 && extraOk
      && (!p.accentText || contrast(p.accentText, paper) >= 4.6)) {
      p.textSurface = paper;
      p.contrastInk = Number(cInk.toFixed(2));
      p.contrastMuted = Number(cMuted.toFixed(2));
      p.attempts = attempt + 1;
      return p;
    }
  }
  throw new Error(`[${label}] 颜色抽取失败：最好一次 ink=${best.cInk.toFixed(2)} muted=${best.cMuted.toFixed(2)} `
    + `on ${best.paper} bg=${best.p.bg} ink=${best.p.ink} muted=${best.p.muted}`);
}

/* ------------------------------------------------- 四个方向各自的颜色域 */

const PALETTE_SPECS = {
  a: () => {
    // 近黑冷调底 + 单一冷色强调（偶尔偏琥珀或青）
    const h = pick([215, 224, 232, 240, 248, 256, 264, 272, 220, 208]);
    const accentH = pick([232, 244, 210, 188, 262, 168, 32]);
    const bg = hslToHex(h, float(10, 22, 1), float(5, 8, 0.5));
    const surface = hslToHex(h, float(10, 22, 1), float(9, 13, 0.5));
    const ink = hslToHex(h, float(6, 16, 1), float(92, 97, 0.5));
    return {
      bg,
      surface,
      raised: hslToHex(h, float(10, 20, 1), float(13, 17, 0.5)),
      line: hslToHex(h, float(12, 24, 1), float(19, 26, 0.5)),
      ink,
      muted: hslToHex(h, float(8, 18, 1), float(62, 70, 0.5)),
      accent: hslToHex(accentH, float(68, 92, 1), float(60, 70, 0.5)),
      accentSoft: hslToHex(accentH, float(60, 80, 1), float(30, 40, 0.5)),
      onAccent: hslToHex(accentH, float(20, 40, 1), float(8, 12, 0.5)),
      minInk: 12,
    };
  },
  b: () => {
    // 奶油纸底 + 赭石 / 墨绿，印刷感
    const paperH = pick([34, 38, 42, 30, 46]);
    const bg = hslToHex(paperH, float(24, 46, 1), float(94, 97, 0.5));
    const inkH = pick([24, 30, 36, 20]);
    const accentH = pick([12, 16, 20, 24, 6, 28]);
    const greenH = pick([142, 150, 158, 166, 132]);
    return {
      bg,
      paper: hslToHex(paperH, float(20, 40, 1), float(90, 93, 0.5)),
      line: hslToHex(paperH, float(18, 34, 1), float(76, 82, 0.5)),
      ink: hslToHex(inkH, float(14, 30, 1), float(12, 18, 0.5)),
      muted: hslToHex(inkH, float(10, 22, 1), float(36, 44, 0.5)),
      accent: hslToHex(accentH, float(58, 76, 1), float(38, 47, 0.5)),
      green: hslToHex(greenH, float(28, 46, 1), float(24, 32, 0.5)),
      onAccent: hslToHex(paperH, float(30, 60, 1), float(96, 99, 0.5)),
      minInk: 12,
    };
  },
  c: () => {
    // 亮底 + 高饱和主色，随机色相，配色靠色轮关系而不是固定组合
    const baseH = int(0, 359);
    const accentH = (baseH + int(0, 40)) % 360;
    const secondH = (accentH + pick([72, 96, 120, 144, 180, 200, 240])) % 360;
    const thirdH = (accentH + pick([-60, -96, -140, 300, 260])) % 360;
    const bg = hslToHex(baseH, float(30, 70, 1), float(96, 98.5, 0.5));
    return {
      bg,
      ink: hslToHex((accentH + 180) % 360, float(30, 60, 1), float(12, 18, 0.5)),
      muted: hslToHex((accentH + 200) % 360, float(16, 34, 1), float(34, 42, 0.5)),
      accent: hslToHex(accentH, float(82, 98, 1), float(54, 62, 0.5)),
      second: hslToHex(secondH, float(78, 96, 1), float(52, 60, 0.5)),
      third: hslToHex(thirdH, float(80, 96, 1), float(56, 64, 0.5)),
      tint: hslToHex(accentH, float(70, 92, 1), float(88, 92, 0.5)),
      tint2: hslToHex(secondH, float(70, 92, 1), float(88, 92, 0.5)),
      onAccent: hslToHex(accentH, float(20, 50, 1), float(10, 16, 0.5)),
      minInk: 10,
    };
  },
  d: () => {
    // 高对比撞色：一个高彩度大色块 + 近黑 + 一个真正对撞的第二色
    const heroH = pick([52, 48, 0, 340, 320, 190, 172, 88, 24]);
    // 对撞色至少要偏开 90°，否则就成了邻近色，"撞色"名不副实
    const clashH = (heroH + pick([120, 150, 180, 210, 240, 300].filter((o) => o >= 90 && 360 - o >= 90))) % 360;
    const ink = hslToHex(heroH, float(10, 30, 1), float(4, 8, 0.5));
    const bg = hslToHex(heroH, float(88, 100, 1), float(52, 60, 0.5));
    const paper = hslToHex(heroH, float(20, 45, 1), float(95, 98, 0.5));
    return {
      bg,
      bg2: hslToHex(clashH, float(85, 100, 1), float(50, 58, 0.5)),
      ink,
      muted: hslToHex(heroH, float(8, 22, 1), float(22, 30, 0.5)),
      paper,
      line: ink,
      accent: hslToHex(clashH, float(88, 100, 1), float(48, 56, 0.5)),
      onAccent: hslToHex(clashH, float(20, 40, 1), float(8, 14, 0.5)),
      // 大色块上放大字，正文落在纸色块上
      textOn: paper,
      alsoOn: [bg],
      minInk: 12,
    };
  },
};

/* --------------------------------------------------------- 各维度的选项池 */

const NAV = [
  '单行：左侧 wordmark / 中间锚点链接 / 右侧实心 CTA 按钮',
  '单行：左侧 wordmark / 右侧锚点链接 + 描边胶囊 CTA / 底部一条发丝分隔线',
  '单行：左侧 wordmark / 右侧链接，CTA 做成带箭头的纯文字链接',
  '两段式：上行极简 wordmark 单独一行，下行左侧链接右侧 CTA，靠细线分隔',
];

const HERO = {
  a: [
    '居中单栏：小字标识 → 超大 H1 → 副标题 → 表单，全部居中，下方留大片空白承接演示区',
    '左文右板：左侧 H1+副标题+表单占 6 栏，右侧一个"实时解析面板"占 5 栏，面板带细边框与状态灯',
    '顶部大字左对齐 + 全宽终端条：H1 左对齐到接近满宽，副标题压窄，表单放在一条贯穿全宽的命令行式条里',
  ],
  b: [
    '杂志刊头：居中的衬线 H1 + 上下双细线，副标题分两栏，表单居中收窄，像报纸头版',
    '两栏不对称：左栏窄（目录/要点索引 + 一条竖线），右栏宽（H1 首字下沉 + 副标题 + 表单）',
    '左文右图：左侧 H1 与正文栏宽 7 栏，右侧 4 栏放一个"排版样张"式的信息卡',
  ],
  c: [
    '上图下文：顶部一整块插画式内联 SVG（大色块 + 圆润图形），下方居中 H1、副标题、表单',
    '左文右机：左侧 H1/副标题/表单，右侧一台圆角设备框，框内是彩色任务卡片堆叠',
    '气泡堆叠：H1 居中，副标题与表单分别装进两个不同颜色的圆角气泡里，错位排列',
  ],
  d: [
    '满幅巨字：H1 大到接近屏宽、允许单词换行撑满，副标题与表单压成底部一条窄带',
    '对角分块：页面被一条斜线切成两半，H1 骑在斜线上，一侧纯色块一侧纸色',
    '层叠海报：多个粗描边色块互相叠压，H1 拆成三行分别放在不同色块上，表单是一枚贴纸按钮',
  ],
};

const DEMO = [
  '三段纵向面板，用箭头/折线连接（输入 → 解析 → 排期）',
  '一块宽面板横切三栏，每栏顶部有编号步骤',
  '左侧输入气泡 → 中间解析标签 chips → 右侧日程卡片，横向排布',
  '终端式单块：三行 `输入 → 结果`，等宽字体，带光标与提示符',
  '左右对照：左"原始一句话" / 右"整理后的排期"，中间一条分隔',
];

const PROOF = [
  '一行等距排列的公司名，之间用发丝竖线分隔',
  '一句话内联列出四个名字，用 · 分隔，两侧配短横线',
  '一条横向色带，名字等距重复排列（CSS 跑马灯或密排）',
  '两行网格，每个名字是一块带边框的名牌',
];

const FEATURES = [
  '三栏等宽，每栏顶部一个大号序号数字',
  '一大两小：左侧一个主功能占大块，右侧两个次要功能上下堆叠',
  '横向三点轨道，用一条连接线串起来，每点下方是标题与说明',
  '整宽编号行：每行左序号 / 中标题 / 右说明，行间用横线分隔',
];

const PROCESS = [
  '横向四栏，栏间有连接线或箭头',
  '纵向时间轴，左侧一条竖轨 + 编号节点',
  '之字形左右交替，文案与图形轮换方向',
  '2×2 网格，四格尺寸略有差异',
];

const TESTIMONIAL = [
  '三张等宽卡片一行排开',
  '一条大引言在上，下方两张小卡片并排',
  '纵向堆叠，每段左侧一个超大引号，整体左对齐',
  '阶梯错位卡片：三张依次下移，形成斜向节奏',
];

const PRICING = [
  '两张卡片并排，右侧 Pro 在视觉上更重',
  '整宽两行堆叠，做成清单式，Pro 行用底色标出',
  '一个宽 Pro 卡 + 一个窄免费卡，宽度不等',
  '两张卡片中间夹一条竖分隔，Pro 上角挂一枚徽章缎带',
];

const FAQ = [
  '单窄栏，仅用横线分隔的 details 列表',
  '左右两栏各三条，栏间一条竖线',
  '编号列表，左侧一条强调色竖线贯穿',
  '每个问题是一张独立的圆角/带边框卡片',
];

const FOOTER = [
  '单行：左品牌 / 右链接',
  '三栏：左品牌+一句话、中间产品链接、右侧法务链接',
  '居中：品牌在上、链接在下、版权在最底',
  '超大品牌字标打底，链接排成一行压在下方',
];

/** 每个方向专属的装饰母题，避免四个方向共用同一套"圆角卡片 + 阴影"。 */
const MOTIF = {
  a: [
    '背景 1px 网格叠层（低透明度），区块边界处渐隐',
    '单个径向光晕，位置随机偏在某一角',
    '细横扫描线纹理，只出现在深色区块上',
    '区块四角的小刻度标记（像技术图纸的角标）',
  ],
  b: [
    '章节上下双发丝线 + 序号用衬线数字',
    '首字下沉（drop cap）与旁注小字',
    '装饰性衬线星号 / 花饰符号做分隔',
    '页边空白里的竖排小字标签',
  ],
  c: [
    '圆润有机形状色块（blob）作为背景层',
    '彩色小圆点 / 纸屑散落，随机分布',
    '手绘感波浪下划线（内联 SVG path）',
    '贴纸式星形与表情符号徽章',
  ],
  d: [
    '半调网点纹理（radial-gradient 密排）',
    '斜向宽条纹色带',
    '旋转 -3°~6° 的贴纸标签',
    '粗黑描边 + 硬偏移实心阴影块',
  ],
};

/**
 * 每案例一个"非常规装置"，进一步拉开辨识度。
 * 按方向分池：随机不等于乱来——装置必须还在这个方向的视觉语言里，
 * 否则就成了"随机拼贴"，那不是在比方向。
 */
const WILDCARD = {
  a: [
    '右侧一条极窄的粘性进度轨，随滚动填充',
    '首屏底部一条细密刻度尺（ruler）纹理作为收边',
    '把流程做成一条横向可滚动轨道（overflow-x:auto，纯 CSS 滚动条样式）',
    '用 clip-path 做技术图纸式的切角面板',
    '区块序号用等宽字体补零（01 / 02 / 03）并做粘性侧标',
    '一块"系统状态"式的小面板，用等宽字体滚动打印解析日志（纯 CSS 动画）',
  ],
  b: [
    '首屏放一枚"版权页"式小字信息块（期号 / 日期 / 编者署名）',
    '正文用 CSS columns 分双栏，强化刊物感',
    '首字下沉做大到贯穿三行以上，成为版面主角',
    '章节标题用中文数字编号（一、二、三…）并配边注',
    '把流程做成一页"拉页"（横向可滚动轨道）',
    '引用块做成页边注（margin note），挤到主栏之外',
  ],
  c: [
    'CSS-only 横向滚动字幕带（纯文字重复，带渐变遮罩）',
    '把流程做成一条横向可滚动轨道，配圆点指示器',
    '纯 CSS 绘制的"手写便签"堆叠，贴在首屏一侧',
    '价格区做成一张可切换的对比表',
    '纯 CSS 绘制的吉祥物（圆形身体 + 简单表情），只出现在首屏和页脚',
    '卡片用"胶带贴纸"斜贴在版面上，轻微旋转',
  ],
  d: [
    '双色套印（duotone）内联 SVG 插画',
    '超大旋转的章节序号数字压在区块角落（允许溢出栅格）',
    'CSS-only 巨型描边空心文字（-webkit-text-stroke）做背景层',
    '把四步流程做成四张互相叠压的色块卡片',
    '半调网点大圆叠加在色块上',
    '一条贯穿整页的粗色方块刻度轨，做成粘性侧边',
  ],
};

/* -------------------------------------------------------------- 数值维度 */

const num = {
  radius: {
    a: () => pick([0, 2, 3, 4, 6]),
    b: () => pick([0, 2, 3, 4]),
    c: () => pick([18, 22, 26, 32, 40]),
    d: () => pick([0, 2, 3]),
  },
  base: () => pick([4, 5, 6, 7, 8]),
  container: () => pick([1040, 1080, 1120, 1160, 1200, 1260, 1320]),
  typeRatio: {
    a: () => float(1.2, 1.32, 0.005),
    b: () => float(1.2, 1.34, 0.005),
    c: () => float(1.24, 1.4, 0.005),
    d: () => float(1.34, 1.6, 0.005),
  },  border: {
    a: () => pick([1, 1, 1, 2]),
    b: () => pick([1, 1, 2]),
    c: () => pick([2, 2, 3, 4]),
    d: () => pick([3, 3, 4, 5]),
  },
  shadowOffset: {
    a: () => pick([2, 3, 4]),
    b: () => pick([2, 3, 4]),
    c: () => pick([6, 8, 10, 12]),
    d: () => pick([6, 8, 10, 12, 14]),
  },
  trackingTight: () => float(-0.03, -0.01, 0.001),
  trackingWide: () => float(0.06, 0.2, 0.002),
  duration: () => pick([140, 160, 180, 200, 220, 260, 300]),
  ease: () => pick([
    'cubic-bezier(.2,.7,.3,1)',
    'cubic-bezier(.3,.9,.2,1)',
    'cubic-bezier(.16,1,.3,1)',
    'cubic-bezier(.4,0,.2,1)',
    'cubic-bezier(.25,.8,.25,1)',
  ]),
};

const SECTION_PAD = () => pick([56, 64, 72, 80, 88, 96, 104, 112, 120]);

const HIGHLIGHT = [
  '快速收录演示区',
  '社会证明区',
  '功能区',
  '工作流程区',
  '用户评价区',
  '价格区',
  '无（整页同底色，只用分隔线分区）',
];

const FONT_STACKS = {
  a: [
    { label: '系统无衬线 + 等宽点缀', body: 'system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif', mono: 'ui-monospace,"SF Mono","Cascadia Mono",Consolas,"PingFang SC",monospace' },
    { label: '等宽主导', body: 'ui-monospace,"Cascadia Mono",Consolas,"PingFang SC","Microsoft YaHei",monospace', mono: 'ui-monospace,"Cascadia Mono",Consolas,monospace' },
    { label: 'Helvetica 系无衬线', body: '"Helvetica Neue",Helvetica,Arial,system-ui,"PingFang SC","Microsoft YaHei",sans-serif', mono: 'ui-monospace,"SF Mono",Consolas,monospace' },
  ],
  b: [
    { label: '中西衬线混排', body: 'Georgia,"Songti SC",SimSun,"Noto Serif SC",serif', sans: 'system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif' },
    { label: '宋体正文 + 无衬线旁注', body: '"Songti SC",SimSun,Georgia,"Noto Serif SC",serif', sans: '"Helvetica Neue",Helvetica,system-ui,"PingFang SC",sans-serif' },
    { label: 'Times 系报纸感', body: '"Times New Roman",Times,"Songti SC",SimSun,serif', sans: 'system-ui,"Segoe UI","PingFang SC",sans-serif' },
  ],
  c: [
    { label: '圆体/系统圆角', body: 'ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN","PingFang SC","Microsoft YaHei",system-ui,sans-serif', display: 'ui-rounded,"SF Pro Rounded","PingFang SC","Microsoft YaHei",system-ui,sans-serif' },
    { label: '系统无衬线加粗', body: 'system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif', display: '"Helvetica Neue",Helvetica,system-ui,"PingFang SC",sans-serif' },
    { label: '黑白 + 圆黑对比', body: '"Segoe UI",system-ui,"PingFang SC","Microsoft YaHei",sans-serif', display: '"Arial Rounded MT Bold","Segoe UI",system-ui,"PingFang SC",sans-serif' },
  ],
  d: [
    { label: '超粗黑体主导', body: 'system-ui,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif', display: '"Arial Black","Helvetica Neue",Impact,"PingFang SC","Microsoft YaHei",sans-serif' },
    { label: 'Impact 海报体', body: '"Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif', display: 'Impact,"Haettenschweiler","Arial Narrow Bold","PingFang SC","Microsoft YaHei",sans-serif' },
    { label: '窄体 + 常规正文', body: '"Arial Narrow",Arial,system-ui,"PingFang SC","Microsoft YaHei",sans-serif', display: '"Arial Black",Impact,"PingFang SC","Microsoft YaHei",sans-serif' },
  ],
};

/* ----------------------------------------------------------------- 抽签表 */

const CASES = [
  { id: 'a', name: '安静的技术极简（深色）', en: 'QUIET TECHNICAL' },
  { id: 'b', name: '温暖编辑排版（浅色衬线）', en: 'WARM EDITORIAL' },
  { id: 'c', name: '亲切大众消费向（圆润高饱和）', en: 'FRIENDLY CONSUMER' },
  { id: 'd', name: '大胆字体海报感（高对比）', en: 'BOLD TYPOGRAPHIC' },
];

const navDeal = deal(NAV, 4);
const demoDeal = deal(DEMO, 4);
const proofDeal = deal(PROOF, 4);
const featDeal = deal(FEATURES, 4);
const procDeal = deal(PROCESS, 4);
const testiDeal = deal(TESTIMONIAL, 4);
const priceDeal = deal(PRICING, 4);
const faqDeal = deal(FAQ, 4);
const footDeal = deal(FOOTER, 4);
const highlightDeal = deal(HIGHLIGHT, 4);

const roll = {};

CASES.forEach((c, i) => {
  roll[c.id] = {
    direction: c.name,
    en: c.en,
    seed: SEED,
    palette: rollPalette(PALETTE_SPECS[c.id], c.id.toUpperCase()),
    fonts: pick(FONT_STACKS[c.id]),
    geometry: {
      radius: num.radius[c.id](),
      radiusSmall: Math.max(0, Math.round(num.radius[c.id]() / 2)),
      spacingUnit: num.base(),
      container: num.container(),
      typeRatio: num.typeRatio[c.id](),
      borderWidth: num.border[c.id](),
      shadowOffset: num.shadowOffset[c.id](),
      sectionPadding: SECTION_PAD(),
      trackingTight: num.trackingTight(),
      trackingWide: num.trackingWide(),
      duration: num.duration(),
      ease: num.ease(),
    },
    structure: {
      nav: navDeal[i],
      hero: pick(HERO[c.id]),
      demo: demoDeal[i],
      proof: proofDeal[i],
      features: featDeal[i],
      process: procDeal[i],
      testimonial: testiDeal[i],
      pricing: priceDeal[i],
      faq: faqDeal[i],
      footer: footDeal[i],
      highlightSection: highlightDeal[i],
      motif: pick(MOTIF[c.id]),
      wildcard: pick(WILDCARD[c.id]),
    },
  };
});

/* ------------------------------------------------------------- 生成产物 */

mkdirSync(join(root, 'briefs'), { recursive: true });
writeFileSync(join(root, 'design-roll.json'), `${JSON.stringify({ seed: SEED, generatedAt: new Date().toISOString(), cases: roll }, null, 2)}\n`);

const hexRow = (p) => Object.entries(p)
  .filter(([, v]) => typeof v === 'string' && v.startsWith('#'))
  .map(([k, v]) => `\`${v}\` ${k}`)
  .join(' · ');

let md = `# 设计决策抽取记录\n\n种子 \`${SEED}\` · 生成于 ${new Date().toISOString()}\n\n`;
md += '四个案例共用同一份受控内容（见 [CONTENT-SPEC.md](./CONTENT-SPEC.md)）；本文件记录的是**随机抽出的视觉与结构决策**。\n';
md += '重新抽取：`node scripts/roll.mjs`；复现本轮：`node scripts/roll.mjs ' + SEED + '`。\n\n';

md += '## 一眼看差异\n\n| 维度 | A 技术极简 | B 编辑排版 | C 亲切消费 | D 字体海报 |\n| --- | --- | --- | --- | --- |\n';
const rows = [
  ['底色', (x) => x.palette.bg],
  ['正文色', (x) => x.palette.ink],
  ['强调色', (x) => x.palette.accent],
  ['圆角', (x) => `${x.geometry.radius}px`],
  ['间距基数', (x) => `${x.geometry.spacingUnit}px`],
  ['容器宽', (x) => `${x.geometry.container}px`],
  ['字号比例', (x) => x.geometry.typeRatio],
  ['描边宽', (x) => `${x.geometry.borderWidth}px`],
  ['区块内边距', (x) => `${x.geometry.sectionPadding}px`],
  ['动效时长', (x) => `${x.geometry.duration}ms`],
  ['首屏构图', (x) => x.structure.hero],
  ['装饰母题', (x) => x.structure.motif],
  ['非常规装置', (x) => x.structure.wildcard],
];
for (const [label, get] of rows) {
  md += `| ${label} | ${CASES.map((c) => get(roll[c.id])).join(' | ')} |\n`;
}
md += '\n';

for (const c of CASES) {
  const x = roll[c.id];
  md += `## ${c.id.toUpperCase()} · ${c.name}\n\n`;
  md += `- 色板：${hexRow(x.palette)}（正文对比度 ${x.palette.contrastInk}:1，抽了 ${x.palette.attempts} 次才达标）\n`;
  md += `- 字体：${x.fonts.label}\n`;
  md += `- 首屏构图：${x.structure.hero}\n`;
  md += `- 导航：${x.structure.nav}\n`;
  md += `- 快速收录演示：${x.structure.demo}\n`;
  md += `- 社会证明：${x.structure.proof}\n`;
  md += `- 功能：${x.structure.features}\n`;
  md += `- 流程：${x.structure.process}\n`;
  md += `- 评价：${x.structure.testimonial}\n`;
  md += `- 价格：${x.structure.pricing}\n`;
  md += `- 常见问题：${x.structure.faq}\n`;
  md += `- 页脚：${x.structure.footer}\n`;
  md += `- 反色/强调区块：${x.structure.highlightSection}\n`;
  md += `- 装饰母题：${x.structure.motif}\n`;
  md += `- 非常规装置：${x.structure.wildcard}\n\n`;
}

writeFileSync(join(root, 'DESIGN-ROLL.md'), md);

/* --------------------------------------------------- 每个案例的施工单 */

const COMMON = `
## 硬约束（违反即返工）

1. **受控内容不许改**：文案、数字、区块顺序、六条 FAQ、三条评价、两档价格、四家公司名，全部照 \`CONTENT-SPEC.md\` 抄写，一字不改、不增不减区块。你只改视觉与版式。
2. **单文件自包含**：CSS 在 \`<style>\`，JS 在 \`<script>\`，全在一个 HTML 文件里。**禁止任何外部请求**：不得出现 \`http://\`、\`https://\`、\`//cdn\`、外链 \`<link rel=stylesheet>\`、\`@import\`、Google Fonts、图标库、远程图片。只能用系统字体栈 + 内联 SVG + CSS 图形。
3. **脆弱 vw 禁令**：\`letter-spacing / margin / padding / width / height / gap\` 里**不得直接写 \`vw\`**（\`clamp()\`/\`calc()\` 里可以有）。字号可以在 \`html\`/\`:root\` 上用 \`clamp()\`。
4. **无横向溢出**：360 / 768 / 1024 / 1440px 四档都不能出现横向滚动。长单词、SVG、绝对定位元素都要做好钳制（\`max-width:100%\`、\`overflow:hidden\` 等）。
5. **必须实现的功能**（每项都要真的能用）：
   - 邮箱表单：\`<form novalidate>\`，JS 校验邮箱；无效时在表单附近显示**行内**错误提示，有效时显示成功提示。**禁止 \`alert()\`**。
   - 价格切换：月付/年付按钮，切换后 Pro 只显示**一个**数字（¥38/月 或 ¥29/月），不得两数并存。
   - FAQ 手风琴：用 \`<details>\`/\`<summary>\`。
   - 移动端导航：≤820px 收成汉堡按钮，可展开收起，必须带 \`aria-expanded\` 和 \`aria-controls\`（\`aria-controls\` 指向的 id 必须真实存在）。
   - 开头有「跳到主要内容」链接，锚点链接要真的能跳。
   - 装饰性图形元素加 \`aria-hidden="true"\`。
   - 尊重 \`prefers-reduced-motion\`。
   - \`<html lang="zh-CN">\`、viewport meta。
6. **底部方向切换器**：照抄 \`CONTENT-SPEC.md\` 末尾给的 \`#wf-switch\` 代码块（\`<style>\` + \`<div>\` + 读文件名跳转的 \`<script>\`）。不要改成 \`<a>\`，不要改 id。
7. **自检**：写完后跑 \`node scripts/audit.mjs ${'{CASE}'}\`，必须 PASS（0 问题）。有问题就改到过为止。
8. **中文回退是预期行为**：抽中的字体栈多半不含中文字形，中文会回退到 PingFang / 雅黑。这没问题，但正文段落要保证 \`line-height\` ≥ 1.75、单行不超过约 40 个汉字（\`max-width\` 用 \`ch\` 或 px 控制），否则长段落会难读。
9. **质量底线**：不许出现假文字/占位符（Lorem ipsum、"待补充"、灰色空盒子）。所有可点元素要有 \`focus-visible\` 样式。字号层级至少 5 级且级差按抽中的比例走。同一页里对齐基线要统一（不要一会儿居中一会儿左对齐地混排区块标题）。
10. **禁用外部资源同时禁用其替代品**：不要用 base64 图片、不要用 emoji 当图标主体（可以极少点缀），图标一律用内联 SVG 线条绘制。
`.trim();

for (const c of CASES) {
  const x = roll[c.id];
  const p = x.palette;
  const g = x.geometry;
  const s = x.structure;

  const brief = `# 施工单 ${c.id.toUpperCase()} · ${c.name}

> 本文件由 \`node scripts/roll.mjs\` 随机生成（种子 \`${SEED}\`）。下面每一个数值都是抽签结果，**必须照用**，不要"顺手改成更好看的默认值"。设计的随机性正是本实验的自变量。

## 交付

- 文件：\`cases/${c.id}.html\`（单文件，自包含）
- 参照：\`CONTENT-SPEC.md\`（受控内容规范）、\`DESIGN-ROLL.md\`（本轮全部抽签结果）

## 方向定位

${c.en} —— ${c.name}。这个方向的关键词：${{
    a: '精密、克制、可信、工程感、低噪音、信息密度可控。不要炫技，靠层次和留白取胜。',
    b: '耐读、有分量、纸张与油墨、编辑判断力、排版节奏。像一篇认真排过的长文或一本刊物的封面。',
    c: '低门槛、轻快、愿意亲近、色彩表达情绪。让完全不懂效率工具的人也愿意点一下试试。',
    d: '冲击、态度、记忆点、版面即海报。视觉优先于精致，允许夸张，但不允许廉价和糊。',
  }[c.id]}

## 指定色板（照用）

\`\`\`css
--bg: ${p.bg};
--surface: ${p.surface || p.paper || p.tint};
--raised: ${p.raised || p.tint2 || p.paper || p.paper};
--line: ${p.line || p.ink};
--ink: ${p.ink};
--muted: ${p.muted};
--accent: ${p.accent};
--accent-soft: ${p.accentSoft || p.tint};
--on-accent: ${p.onAccent};
\`\`\`
${p.second ? `\n补充色（随机撞色，用在图形/插画/次要强调上）：\`--second: ${p.second};\` \`--third: ${p.third};\` \`--bg2: ${p.bg2 || p.tint2};\`\n` : ''}${p.green ? `\n补充色：\`--green: ${p.green};\`（做次要强调或引文装饰）\n` : ''}
正文对比度 ${p.contrastInk}:1 —— 已经过校验，不要为了"更好看"把 --ink 调淡。

## 指定数值（照用）

| 决策 | 值 |
| --- | --- |
| 圆角 | \`${g.radius}px\`（次级元素 \`${g.radiusSmall}px\`） |
| 间距基数 | \`${g.spacingUnit}px\`（所有 margin/padding/gap 用它的倍数） |
| 内容容器宽 | \`${g.container}px\` |
| 字号比例 | \`${g.typeRatio}\`（相邻字号级差乘这个数） |
| 描边宽度 | \`${g.borderWidth}px\` |
| 阴影偏移 | \`${g.shadowOffset}px\` |
| 区块上下内边距 | \`${g.sectionPadding}px\` |
| 紧凑字距 | \`${g.trackingTight}em\` |
| 舒展字距 | \`${g.trackingWide}em\` |
| 动效时长 | \`${g.duration}ms\` |
| 缓动 | \`${g.ease}\` |

## 指定字体栈（照用）

- 正文：\`${x.fonts.body}\`
${x.fonts.mono ? `- 等宽：\`${x.fonts.mono}\`` : ''}${x.fonts.sans ? `\n- 无衬线旁注：\`${x.fonts.sans}\`` : ''}${x.fonts.display ? `\n- 标题/展示：\`${x.fonts.display}\`` : ''}

## 指定结构（照用，这是四个案例互不相似的主要保证）

| 区块 | 抽中的做法 |
| --- | --- |
| 首屏构图 | **${s.hero}** |
| 导航 | ${s.nav} |
| 快速收录演示 | ${s.demo} |
| 社会证明 | ${s.proof} |
| 功能 | ${s.features} |
| 工作流程 | ${s.process} |
| 用户评价 | ${s.testimonial} |
| 价格 | ${s.pricing} |
| 常见问题 | ${s.faq} |
| 页脚 | ${s.footer} |
| 反色/强调区块 | **${s.highlightSection}**（只给这一个区块做反差处理，其它区块保持同底色） |
| 装饰母题 | **${s.motif}** |
| 非常规装置 | **${s.wildcard}** |

## 反雷同要求

- 首屏的构图方式必须一眼就与其它三个案例不同：不用同一套"居中大字 + 表单"的骨架。
- 不允许用"一排三张同样的圆角卡片 + 同样的阴影"贯穿全页；同一页里至少三种不同的分块手法。
- 装饰只能来自上面抽中的母题与装置，不要额外堆砌别的流行组件（玻璃拟态、渐变描边卡片、浮动 3D 球等一律不要）。
- 强调色只允许出现在它该出现的地方（CTA、序号、下划线、图标），不要整页乱撒。

${COMMON.replace('{CASE}', c.id)}
`;

  writeFileSync(join(root, 'briefs', `${c.id}.md`), brief);
}

console.log(`种子 ${SEED} 抽取完成。`);
console.log('→ design-roll.json / DESIGN-ROLL.md / briefs/{a,b,c,d}.md');
for (const c of CASES) {
  const x = roll[c.id];
  console.log(`  ${c.id.toUpperCase()}  bg=${x.palette.bg} accent=${x.palette.accent} r=${x.geometry.radius}px unit=${x.geometry.spacingUnit}px ratio=${x.geometry.typeRatio} 对比度=${x.palette.contrastInk}`);
}
