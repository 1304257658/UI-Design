# 来源、署名与使用边界

本项目是用户要求的本地学习复现。原站为 https://animejs.com/ ，设计和网站作者为 Julian Garnier。没有将原站设计、模型、字体或动画编排声明为本项目原创，也没有发布公网。

## 来源

- 页面 HTML、CSS、模型、字体、图标、编译 JS：原站实际加载的公开资源，采集记录在 `source-manifest.json`。
- Anime.js 库：Julian Garnier，官方仓库 [MIT 许可](https://github.com/juliangarnier/anime/blob/master/LICENSE.md)。本地编译 chunk 内原有许可说明保持保留。
- Three.js：原站捆绑 r172，保留捆绑文件中的原署名。
- postprocessing：原站文件注明 v6.36.6 / Raoul van Rüschen / Zlib，保留原许可注释。
- Draco、语法高亮等：保留原站依赖树与已有许可说明。
- DINish、Berkeley Mono 字体和站点模型：保留原资源用于本次本地对照。没有把动画库的 MIT 许可自动扩展为所有独立素材的商用授权。

官方 [gh-pages README](https://github.com/juliangarnier/anime/tree/gh-pages)说明网站与文档从私有仓库生成。因此这里是对已公开构建产物的本地适配，不代表获得原作者私有开发源码。

若之后需要对外发布、分发素材或用于商业项目，应另行核对网站、字体和模型各自的许可或替换成拥有明确使用权的资产。

## 本项目新增

`src/mini-engine.js`、`src/study.js`、`study/index.html`、教学样式、组装/比较脚本、测试和中文研究文档由本项目新增。首页的适配修改记录在清单中；其视觉成果应继续归因于原作者。
