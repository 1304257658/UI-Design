# 001 · OpenAI Murmuration 粒子与传播动效

日期：2026-09-17。目标：分析指定页面中的点云和红线，做一个可交互的局部复刻。

## 运行

```powershell
cd E:\Project\UI-Design\ai-ui-design\experiments\001-murmuration\app
npm ci --cache .npm-cache
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

打开 http://127.0.0.1:4173/ 。构建：`npm run build`。源码、依赖和渲染均在本地运行，没有依赖原站的图片、视频或远程脚本。

## 原站到底怎么做的

以下来自指定页面的实时 DOM、Chrome Debugger 读取的已加载 JS、桌面和手机截图，而不是仅凭画面猜测。

### 1. 点云是 GPU 计算的参数化三维形态

页面 canvas 标记 `data-engine="three.js r180"`，外层组件标记 `data-effect="monochrome-murmuration"`。本次桌面运行时 `data-particle-count="32000"`。

原站使用 React Three Fiber 管理 Three.js 场景。粒子以一个 `Points` 对象批量绘制，`BufferGeometry` 保存固定的粒子种子，每个粒子有四个分量：沿形态的位置、横向厚度、纵深厚度、个体差异。主轴采用黄金比例步进，横向和纵深采用多个伪随机数叠加，形成中间密、边缘稀的截面。

Vertex shader 根据种子与时间分别计算 **halo / ribbon / exchange** 三种形态，然后用随时间变化的权重混合，加上小幅正弦扰动。原站控制形态变形的时间会周期性往返，粒子沿形态流动的时间则持续前进。因此，这个效果可以用确定性函数 `position = formation(seed, time)` 重现；被检查的实现中没有逐粒子运行邻居搜索的 Boids 物理仿真。

粒子本体是 point sprite：fragment shader 用 `gl_PointCoord` 得到圆形轮廓，用 `fwidth` 平滑边缘；个体种子和透视深度共同改变点大小与亮度。这里需要区分 GPU 单个点的圆形覆盖和最终景深模糊，两者都影响颗粒感。

### 2. 红线是有生命周期的消息

CPU 调度器选择真实的发送、接收粒子；在检查到的默认配置中，同时活跃的消息上限是 **3**。原站还维护发送历史、感染时间、转发代数和级联状态。

端点每帧都调用与点云相同的形态函数，所以粒子流动时，红线也跟着走。曲线采用二次 Bézier：

```text
B(t) = (1 − t)² A + 2(1 − t)t C + t² B
```

其中 A、B 是移动中的粒子，C 是控制点。原站根据相机平面的法线调整弧度，避免在特定视角下红线被投影成直线。

红线的几何体是 **64 段三角形条带**。每个采样点左右各一个顶点，沿屏幕空间的法线偏移，形成稳定的像素线宽；没有依赖 `LineBasicMaterial.linewidth`。顶点 shader 将可见路径限制到一个随年龄前进的头部，fragment shader 再处理边缘软化、头部亮度和旧尾迹衰减。

发送点有扩散圆环，抵达时接收点亮起并变红；接收点可以继续发送消息。红色因此具有“传播”的含义。暗色主题感染色是 `#ff1838`，暗色默认轨迹不透明度为 `0.36`，刻意保持低亮度。

### 3. 景深与构图塑造体积感

原站使用 `EffectComposer → DepthOfField → 自定义颜色合成`，不是在整个 canvas 上加 CSS blur。暗色默认配置中可见 `bokehScale: 0.9`、`focusRange: 2.2`、`focusDepth: 0.3`。靠近焦平面的粒子较清晰，前后层次更柔。

相机默认 FOV 为 39°、距离为 8。原站另有基于采样包围范围的自动取景、移动端相机倾斜与较薄的点云截面、滚动淡出、性能分档、不可见暂停和静态 fallback。

## 本地实现对应关系

| 文件 | 职责 |
| --- | --- |
| `app/src/formation.js` | 三种参数化形态混合；GPU 函数和 CPU 端点采样保持一致 |
| `app/src/shaders.js` | 点精灵、恒定屏幕线宽的 Bézier 条带、消息波纹 |
| `app/src/main.js` | Three.js 场景、3 个消息槽位、变红与转发、真实 DOF、响应式与控制器 |
| `app/src/style.css` | 独立实验页的布局和移动端样式 |

复刻保留核心视觉机制，但不是原站组件的完整移植。形态时间改为持续缓慢前进；消息调度简化，传播节奏更快以便观察；相机采用固定响应式取景；没有重建文章滚动淡出、原站性能探测或浅色主题。桌面绘制 32,000 点，手机绘制 12,000 点，DPR 上限 1.6。尊重 reduced-motion，画面不可见或切换后台后停止更新。

控制器支持暂停/继续、重新开始、0.25×–3× 速度、点云/传播线/景深独立开关。关闭点云时仍能观察曲线；暂停后切换景深可以在同一帧比较空间效果。

## 来源与证据

- [原页面](https://openai.com/zh-Hans-CN/index/hugging-face-incident-and-the-road-ahead/)
- [原站已加载的 Hero 渲染与 GLSL chunk](https://openai.com/_next/static/immutable/chunks/0se23nop_3meh.js)：消息调度、条带几何、曲线与点精灵着色器、DOF 组件。
- [原站已加载的配置与采样 chunk](https://openai.com/_next/static/immutable/chunks/039sfodus91pk.js)：粒子种子、形态采样、响应式相机、主题与默认参数。
- [Three.js 文档](https://threejs.org/docs/)：Points、ShaderMaterial、BufferGeometry。
- `evidence/source-desktop.png`、`evidence/source-mobile.png`：实时原站截图。
- `evidence/replica-desktop.png`、`evidence/replica-mobile.png`：本地实测截图。
- `design-qa.md`：验证范围、结果和差异。

Chunk URL 属于检查当时的部署版本，未来可能失效。本文参数为本次观察结果。
