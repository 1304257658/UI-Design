# 003 · Anime.js 首页复刻与动画机制学习

参考：[Anime.js](https://animejs.com/)；记录日期：2026-09-18。

**首页预览：<http://127.0.0.1:8769/>**  
**教学实验：<http://127.0.0.1:8769/study/>**

这是基于原站公开页面资源的**本地适配复现**，不是从零独立重写原站，也不是自己实现了 Anime.js。设计、22 个 GLB 模型、字体、着色器、编译后的首页动画和依赖来自原站，保留作者署名和已有许可注释。我们新增了可重复执行的资源本地化、Vite 入口适配、交互隔离、浏览器验证，以及一个独立数值动画教学引擎。

## 可以怎样体验

1. 首页点 **Learn more**，看暗色机械表盘转成浅色拆解图。
2. 继续向下滚动，看同一台装置演示缓动、变换、滚动、交错动画、SVG、拖动、时间轴和响应式布局。
3. 在 **Springs and draggable** 段拖动绿色圆盘；释放后观察回弹。
4. 点击或拖动右下角刻度条，观察场景随进度变化。
5. 到教学页，先拖到 75%，再倒放或切换缓动，观察三个轨道如何共享时间。

文档和社交链接前往官方页面。首页以外的文档站、缓动编辑器、学习站没有复制。订阅表单只显示本地演示结果，不发送、不保存邮箱。赞助内容是采集时的静态快照。

## 从哪里读代码

| 文件 | 作用 |
|---|---|
| `scripts/assemble-replica.py` | 从原始证据构建离线资源树，处理地址和 HTML 转义 |
| `src/replica.js` | 首页适配入口：本地数据、模块加载、无外发的表单行为 |
| `public/assets/js/home.js` | 原站已编译的机械装置与时间轴编排，非本项目原创 |
| `public/assets/js/chunks/` | 原站引擎、Three.js 等运行时依赖，保留原版本组合 |
| `src/mini-engine.js` | 我们独立编写的、可测试的纯数值时间轴 |
| `src/study.js` | 将时间轴数值写到教学示意和控制面板 |
| `tests/mini-engine.test.mjs` | 跳帧、反向、时钟一致性、暂停与释放测试 |
| `source-manifest.json` | 原始 URL、文件尺寸、SHA-256、适配范围 |

详细记录：

- [实际踩坑记录](./docs/build-log.md)
- [如何理解这台装置，以及怎样设计动画引擎](./docs/animation-engine-notes.md)
- [素材与署名说明](./THIRD_PARTY_NOTICES.md)
- [视觉与交互验收](./design-qa.md)
- [原站与本地截图证据](../../docs/evidence/anime-replica/)

## 本地维护

开发服务由本次实验启动。需要重新启动时，在本目录运行：

```powershell
npm install --prefer-offline --no-audit --no-fund
npm run dev -- --host 127.0.0.1 --port 8769 --strictPort
```

已有资源支持断网运行。重新生成首页不需要联网：

```powershell
python scripts/assemble-replica.py
node --test tests/mini-engine.test.mjs
npm run build
```

`dist/client/` 是静态构建产物；没有发布公网。截图比较脚本只处理证据，不改变页面素材。

## 实验边界

- 首页的高保真主要来自完整复用原站资源和动画编排。这不能证明 AI 已独立设计出同等质量的作品。
- 教学引擎支持数值插值、轨道起止、三种缓动、暂停、倍速、倒放、跳帧和销毁。它不支持完整 Anime.js API。
- 原站及本地均观察到 Three.js `computeBoundingSphere` 的 NaN 警告。未修改原站几何算法；不宣称零控制台错误。
- 首页保留持续动画，需要 WebGL；教学页默认暂停。没有开展低端真机、长时间功耗或完整无障碍审计。
- 验证是一组桌面 Chromium 和模拟手机视口的观察，不代表全浏览器兼容性承诺。
