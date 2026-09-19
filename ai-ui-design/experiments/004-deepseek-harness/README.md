# Inside the Harness · 可阅读的架构流程图

[打开本地页面](http://127.0.0.1:8770/)。独立实验；不覆盖其他图鉴。

用户在 V2 后明确：原本想要的是容易展示具体内容的流程图，可以移除现有机械组件。V3 因此替换为 HTML 文本节点 + SVG 连线。节点直接展示中文职责、英文模块名、关键操作；连线表达请求、上下文依赖、模型响应与工具结果。Cordis 是宿主边界，DeepSeek 模型服务在边界之外。

页面默认完整阅读图，点选节点查看更详细的职责与固定版本源码。手机以纵向分组和关系说明重排，不缩小整张图。可点击“滚动演示”或“播放”进入原有叙事：问题 → 面板侧转 → 流程图展开 → 工具循环 → 消息返回 → 回答显示；支持倒放、暂停、章节跳转和键盘。

动画模式在小窗口内滚动，窗口外正常滚动。手机动画模式可以横向拖动图；完整阅读模式适合持续阅读内容。模拟答案，未调用模型、未执行真实工具。工作台为教学重绘，不是官方界面复刻。

## 来源与实现

- 官方源码基线：master 在 2026-09-18 核实时的 `ddefc45fbc7f8e46dd73185e68295696d1297887`。本轮沿用固定基线，未再次宣称 HEAD 未变。
- [源码研究](../../docs/deepseek-harness-architecture.md) 与 [插件/UI 核对](../../docs/deepseek-harness-plugin-evidence.md)。
- `src/story.js`：职责、来源、时间轴；`src/scene.js`：流程图、消息线与节点渐显；`src/workbench.js`：演示工作台；`src/main.js`：模式和播放控制；`src/flow.css`：当前布局。
- 当前运行代码不导入 Three.js，不需要 WebGL、Blender 或模型素材。旧几何记录仅存于历史证据，未加载。

## 验证

```powershell
node --test tests/story.test.mjs tests/sites-worker.test.mjs
npm run build
npm run dev -- --host 127.0.0.1 --port 8770 --strictPort
```

9 项测试与生产构建通过。当前 JS 约 25 kB / gzip 11 kB。`evidence/flow-v3/` 保存阅读版截图、9 个节点源码检查和三断点相同 7 个进度截图。无页面横向溢出，终点回答 227 字符。未测试真实手机触控惯性或 Safari；设计等待用户反馈。

[验收记录](./design-qa.md) · [实现经验](./implementation-notes.md)


2026-09-19 更新：流程图不再包含独立工作台卡片。面板折叠保留为横线，连接请求和返回路径；浅色工作台环境随滚动切换为深蓝流程图，面板恢复时切回。`src/environment.css` 管理环境样式，截图位于 `evidence/fold-environment/`。
