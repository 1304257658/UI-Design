# DeepSeek Harness：插件组合与界面边界核实

核实日期：2026-09-18。对象为官方 `deepseek-ai/deepseek-harness`，固定到 commit [`ddefc45fbc7f8e46dd73185e68295696d1297887`](https://github.com/deepseek-ai/deepseek-harness/commit/ddefc45fbc7f8e46dd73185e68295696d1297887)。本笔记只覆盖启动组合、preset、界面与运行时边界；未安装、未启动 Harness、未调用模型。架构图与动画仍待实现。

## 哪些是可核实的结构

| 概念 | 在真实实现里的作用 | 适合怎样画 |
|---|---|---|
| Cordis Context / 插件 | 插件提供服务、事件及可撤销的注册；模型适配器、工具注册表、session log、agent loop 都是插件。依赖通过 `inject` 解析。 | 贯穿各组的底座或插件连接结构；不是请求每次必经的“第 2 层”。 |
| Profile | 启动一个应用时选定的命名组合，位于 Harness home；包括有序 bundles 与用户 patch。 | 启动配置侧卡，不沿用户消息路径逐层播放。 |
| Bundle | 分发插件代码与配置 patch 的单位；`web` 模板组合 `dsh-base`、`dsh-web-app`。 | 组件来源标签；不是独立服务器。 |
| Agent preset | 决定 session 能看见的工具、prompt sections、skills；Web 默认 `standard`。 | 围绕 Agent 的能力分组，和 profile 区分。 |
| Web / Desktop surface | 用户界面与 Host 连接；Desktop 以 Electron 承载完整 Web application 与对应本地 Host。 | 面板 → Host 边界，而不是“面板里运行模型”。 |

以上插件定义来自[官方架构](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md#L9-L27)与 [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/cordis-primer.md#L7-L13)；Web bundle 组合直接见 [PROFILE_TEMPLATES 源码](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/boot/app-boot/src/profile.ts#L135-L150)。Desktop 边界见[架构文档 Desktop application](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md#L51-L55)。

## Profile 的“分层”是配置覆盖顺序

配置顺序是：profile 中的 bundles → profile patch → home patch → 调用时 overlays。源码 `readProfilePatches()` 直接按这个顺序拼接。patch 对指定 row 的 config 是整体替换，不是递归合并。这些步骤发生在组合/加载配置时，不能画成每次消息向下经过的业务分层。[顺序源码](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/boot/app-boot/src/profile-context.ts#L63-L69) · [覆盖语义](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/boot/app-boot/README.md#profiles)

Preset 的组合也不是每次 prompt 都重新搭一遍。同一 preset 在进程中建立 standing composition，session 的 scope 挂到它下面；session 状态仍各自独立。代码 `mount()` 调用 `ensureStanding()` 后 `bindScopeParent()`。不要说“每个 session 都复制一整套工具服务”。[直接实现](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/preset/agent-presets/src/index.ts#L431-L455) · [用户与维护者说明](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/preset/agent-presets/README.md#what-a-preset-gives-a-session)

## 界面与运行时的真实连接

Web composition 明确挂载 `session-controller`、`connection`、`api-remotes`、界面插件以及 preset roster；默认 preset 为 standard。[Web 配置](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/bundle/web-app/cordis.patch.yml#L101-L103) · [preset 默认值](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/bundle/web-app/cordis.patch.yml#L505-L516)

普通 Web 的 Remote 单次调用走 HTTP POST，流式调用由 API Gateway 的 WebSocket mux 承载。Gateway 源码注册 WebSocket upgrade 路由，Client 明确调用 `new WebSocket(...)`。因此动画可标注“Web UI → RPC / 流式通道 → Host SessionController”，不能把 UI 直接连接到模型 API。Desktop 可使用自己的 carrier，不能将浏览器 WebSocket 具体传输强加给所有表面。[Connection 说明](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/connection/README.md#use-this-package) · [Host 注册源码](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/api/gateway/src/index.ts#L198-L228) · [Client 建连源码](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/api/gateway/src/client/stream-client.ts#L142-L144)

SessionController 提供 session 生命周期、prompt、历史及 live follow；增量回答包含临时 live chunks，完成后与 durable session event 对齐。页面可以把这些 chunk 抽象成淡蓝粒子，但不能称为线上实际传输的二进制位，也不能暗示答案只在整个回合结束后才一次进入 UI。[SessionController 说明](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/api/session-controller/README.md#L28-L38)

## 拆解页的可信表达边界

建议把“界面 / Host 接入 / Agent 执行与上下文 / 模型适配 / 模型服务”作为**教学视觉分组**，而不是声称官方就是五个固定进程或五个严格串行层。Cordis 贯穿分组，profile 与 preset 作为旁侧配置卡；日志、工具与权限按真实读写及调用关系侧挂。模型核心只能代表外部模型服务，Harness 仓库并未在此定义模型内部神经网络架构。

请求轨迹、工具循环与返回流须和主证据文档的 agent-loop / tools 源码交叉对齐。回答本来可以边产生边显示；“收起结构、复原面板后才展示文本”是教学导演安排，应该在页面说明为一次请求的可回放演示。

另一个源码阅读坑：本次固定快照的 Web patch 有一条旧注释把 browser connection 写作 fetch/SSE；实际 Gateway 已使用 WebSocket mux。架构说明应以运行代码与当前 subsystem contract 为准，不把孤立注释当实现事实。

