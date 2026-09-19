# Flowtide 落地页 · 受控内容规范

四个案例（A/B/C/D）共用本文件定义的内容、结构与功能。**只有视觉语言和版式结构可以不同**，文案、数字、区块顺序保持不变。这样横向比较才成立。

## 产品

Flowtide：帮知识工作者把"记下来"和"排进去"之间的空隙消掉的效率应用。

## 页面区块顺序（不可增删）

1. **顶部导航**：Flowtide + 锚点链接（功能 / 流程 / 价格 / 常见问题）+ 主 CTA
2. **主视觉**：H1 + 副标题 + 邮箱表单 + 信任微文案
3. **快速收录演示**：输入 → 解析 → 排期
4. **社会证明**：四家公司名字
5. **功能**：三块
6. **工作流程**：四步
7. **用户评价**：三条
8. **价格**：月付 / 年付切换 + 两档
9. **常见问题**：六条手风琴
10. **页脚**

## 固定文案

**H1**：想到就记下，剩下的交给 Flowtide

**副标题**：把散落在聊天、便签和脑子里的待办，自动整理成一份真正执行得下去的计划。

**表单**：`your@email.com` · 主按钮「免费开始」· 微文案「无需信用卡，30 秒开始使用」

**快速收录演示**

- 输入：`周五前给陈老师发课程大纲 #课程 @30分钟`
- 解析结果：截止 4 月 18 日周五 · #课程 · 预计 30 分钟
- 排期结果：今天 15:00–15:30（与现有日程无冲突）

**社会证明**：明远设计 · 云栖科技 · 三木研究所 · 白鲸工作室

**功能**

1. 自然语言录入 — 输入「明天上午联系王工确认设备清单 #项目A」，Flowtide 自动识别截止时间、项目与时长。
2. 自动排期 — 按截止时间、优先级和你真实的工作节奏，把任务放进当天最合适的时间段。
3. 每周复盘 — 自动生成完成率、延期项与时间去向，帮你发现哪些事情反复被推迟。

**流程**

1. 随手记 — 想到什么就打一行字，不用选项目，不用填表单。
2. 自动整理 — Flowtide 解析时间、项目与预计时长，归到正确位置。
3. 放进日程 — 结合空闲时段和优先级，安排到具体时间段。
4. 每周复盘 — 看完成率和延期情况，调整下周节奏。

**评价**

1. 林楠 · 产品设计师：「以前光整理待办就要花半小时，现在我只管记。每周复盘让我第一次看清时间到底去哪了。」
2. 周凛 · 自由开发者：「手机上记一句，回到电脑前它已经排好了，不用再想'这个什么时候做'。」
3. 苏珊 · 内容负责人：「团队共享清单之后，跨时区交接再没丢过事情。」

**价格**

- 免费版 ¥0：个人使用 · 无限任务 · 3 个项目 · 手机与网页同步
- Pro ¥38/月（年付 ¥29/月）：无限项目 · 跨设备同步 · 日历双向同步 · 团队共享清单 · 每周复盘报告
- 年付按钮节省 20%

**常见问题**

1. 和别的待办应用有什么不同？ — 多数工具让你自己整理，Flowtide 把整理变成自动的一步。
2. 支持哪些设备？ — 网页、iOS、Android，实时同步。
3. 数据能导出吗？ — 随时导出为 Markdown 或 CSV，包含全部任务与标签。
4. 离线能用吗？ — 能，恢复网络后自动合并，不丢改动。
5. 数据安全怎么保证？ — 传输与存储全程加密，不读取任务内容用于广告。
6. Pro 可以退款吗？ — 14 天内无理由全额退款。

**页脚**：Flowtide · 产品 / 价格 / 更新日志 / 隐私政策 · © 2026 Flowtide

## 必须实现的功能（每个案例都要有）

- 邮箱表单：`novalidate` 的表单，JS 校验邮箱；无效时在表单附近显示错误提示，有效时显示成功提示。**不要用 `alert()`。**
- 价格切换：月付 / 年付按钮切换价格文本，切换后 Pro 显示 ¥38/月 或 ¥29/月（不得同时显示两个数字）。只需原生 JS。
- FAQ 手风琴：用 `<details>` / `<summary>`。
- 移动端导航：≤820px 收起为汉堡按钮，可展开收起，带 `aria-expanded` / `aria-controls`。
- 全局：锚点链接要真的能跳到对应区块；所有交互元素可键盘操作；图片类装饰元素加 `aria-hidden="true"`。
- 起始处提供「跳到主要内容」链接。

## 技术约束

- **单文件、完全自包含**：每个案例一个 HTML 文件，CSS 写在文件内的 `<style>`，JS 写在文件内的 `<script>`。
- **禁止任何外部依赖**：不得出现 `http://`、`https://`、`//cdn`、`<link rel=stylesheet>` 外链、Google Fonts、图标库、`@import`、远程图片。系统字体栈 + 内联 SVG 或 CSS 图形。
- 字号只在 `html`（或 `:root`）上用 `clamp()` / `vw`，不要用 `vw` 设置 `letter-spacing`、`margin`、`padding`、`width`。
- 在 360 / 768 / 1024 / 1440 px 四个宽度下都不能出现横向溢出。
- 尊重 `prefers-reduced-motion`。
- 每个 HTML 文件的 `<html lang="zh-CN">`。

## 底部方向切换器（必须包含）

每个案例文件正文最后加一个切换器。用 `<style>` + `<div>`，**不要用 `<a>`**，切换靠 JS 读取当前文件名：

```html
<style>
#wf-switch{position:fixed;z-index:9999;right:16px;bottom:16px;display:flex;gap:6px;padding:6px;border-radius:999px;
  background:rgba(16,18,22,.9);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);
  font:600 12px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28)}
#wf-switch div{cursor:pointer;padding:7px 11px;border-radius:999px;color:rgba(255,255,255,.66);user-select:none}
#wf-switch div[aria-current="true"]{background:#fff;color:#111}
#wf-switch span{color:rgba(255,255,255,.5);align-self:center;padding:0 3px}
</style>
<div id="wf-switch" role="group" aria-label="切换设计方案">
  <div data-case="a">A</div><div data-case="b">B</div><div data-case="c">C</div><div data-case="d">D</div>
</div>
<script>
(function(){
  var cur=(location.pathname.split('/').pop()||'a.html').replace('.html','').toLowerCase();
  var box=document.getElementById('wf-switch');
  Array.prototype.forEach.call(box.querySelectorAll('[data-case]'),function(b){
    var on=b.getAttribute('data-case')===cur;
    b.setAttribute('aria-current',on?'true':'false');
    b.addEventListener('click',function(){ if(!on) location.href=b.getAttribute('data-case')+'.html'; });
  });
})();
</script>
```

## 四个方向

| 文件 | 方向 | 关键视觉特征 |
| --- | --- | --- |
| `a.html` | 安静的技术极简 | 近黑底、克制的灰阶层次、细边框、单色强调、小圆角、大留白、轻微渐变光晕 |
| `b.html` | 温暖编辑排版 | 奶油/米白底、大号衬线标题、栏线与分隔线、双栏不对称栅格、赭石+墨绿 |
| `c.html` | 亲切大众消费向 | 高饱和亮色、大圆角、柔和彩色投影、插画式内联 SVG、明快轻动效 |
| `d.html` | 大胆字体海报感 | 粗黑描边、硬阴影偏移、超大标题、高对比撞色、贴纸/标签感元素 |

四个方向不要互相靠近：不要都用同一套卡片 + 同一套圆角 + 同一套间距。**首屏构图必须明显不同**（例如 A 居中偏左、B 分栏、C 大图形、D 满幅大字）。
