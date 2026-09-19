// 006 · 语法检查：把每个案例里的 <script> 抽出来做编译检查（只编译，不执行）。
// 静态审计查不出 JS 语法错误，而语法错误会让表单/价格/汉堡导航全部失灵。
// 用法：node scripts/check-js.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CASES = ['a', 'b', 'c', 'd'];

let bad = 0;
let total = 0;

for (const id of CASES) {
  const file = join(root, 'cases', `${id}.html`);
  if (!existsSync(file)) { console.log(`${id}: 文件缺失`); bad += 1; continue; }
  const html = readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .filter((b) => b.trim());

  const problems = [];
  blocks.forEach((body, i) => {
    total += 1;
    try {
      // 只编译，不执行；浏览器全局变量在编译期不需要存在。
      // eslint-disable-next-line no-new-func
      new Function(body);
    } catch (err) {
      problems.push(`script #${i + 1} 语法错误：${err.message}`);
    }
  });

  // 顺带确认关键交互函数确实存在（防止脚本是空壳）
  const probes = [
    [/addEventListener\s*\(\s*['"]submit['"]/, 'submit 监听'],
    [/novalidate/i, 'novalidate 表单'],
    [/aria-expanded/, '汉堡 aria-expanded'],
    [/getElementById|querySelector/, 'DOM 查询'],
  ];
  for (const [re, label] of probes) {
    if (!re.test(html)) problems.push(`缺少 ${label}`);
  }

  if (problems.length) bad += 1;
  console.log(`${id}.html  script 块 ${blocks.length} 个 · ${problems.length ? 'FAIL' : 'OK'}`);
  for (const p of problems) console.log(`   - ${p}`);
}

console.log(`\n共编译 ${total} 个 script 块，${bad === 0 ? '全部通过' : `${bad} 个文件有问题`}`);
process.exitCode = bad === 0 ? 0 : 1;
