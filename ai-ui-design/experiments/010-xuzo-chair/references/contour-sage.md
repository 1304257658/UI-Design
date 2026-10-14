# Contour 01 · 鼠尾草绿软包版

用户选择 `concepts/contour-directions.png` 的左侧 A 方案，并要求尽量按原图复刻。当前模型以该图的可见轮廓为依据：中央竖向缝线、上部圆肩、向前包裹的侧翼、厚软包瀑布座面、从座面底部弯转向上的香槟金属扶手、顶部展开的扶手连接、五星底座与深灰双轮。

第一次模型偏离参考，已停止使用。修正过程保留在 `evidence/product-sage/`。单张概念图不包含背面、底部与尺寸，因此背面承托、隐藏连接和机构是为动画连续性补全的展示结构；不是原厂 CAD 或可制造工程图。不能把本次建模称为经过测量验证的精确复制。

## 参考来源

- [Haworth Fern 官方介绍](https://store.haworth.com/pages/fern)：针织、数字针织与人体支撑方向的产品参考。
- [Haworth Fern 官方产品页](https://www.haworth.com/na/en/products/seating/office-chairs/fern-office-chair.html)：软性面料与椅背结构参考。
- [Steelcase Gesture 官方产品页](https://www.steelcase.com/products/office-chairs/gesture/)：软包椅背、座面与扶手的产品参考。

品牌图片仅用于调研，没有下载用作本案例产品图，也没有宣称本椅拥有这些品牌的测试结果或认证。XUZO / Contour 为演示品牌与概念型号。

## 建模与渲染

- 脚本：`model-source/contour-sage/build.py`，Blender 5.1 Python API / Cycles / OptiX。
- 文件：`model-source/contour-sage/contour-sage.blend`，内嵌织物贴图。
- 六个总成：椅背、座面、左右扶手、机构、底座；爆炸图是结构叙事，不是维修步骤。
- 产品页：241 帧 1600 × 1000 WebP，以滚动位置控制，不自动播放，也没有自由相机控制。
- 首页：同一模型、同一材质的透明渲染；保留既有 2.5D 漂动、悬停和点击交互。
- 网页保留 12 张解码位图缓存，压缩帧在后台预取。文字与已经绘制的帧同步。静止时不持续重绘产品页。
- `pack_assets.py` 只负责格式转换和裁除首页透明留边，不重新生成或修饰 Blender 画面。

## 图片生成记录

两次均使用 Codex 内置 `image_gen.imagegen`。概念图只用作建模参考；网页的整椅、部件与动画帧都来自实际 Blender 模型。

### A / B 概念板完整提示词

Use case: product-mockup. Asset type: a premium industrial design concept comparison sheet, landscape 1800x1100 approximately. Two different ORIGINAL high-end ergonomic office chair designs side by side on warm ivory seamless studio background. Left candidate A: muted sage olive green densely woven upholstered textile, an elegant tall gently tapered rounded-shoulder back with a subtle central vertical tailored seam and softly curved wraparound side wings; SOLID opaque upholstery, no see-through mesh. Distinctive slim champagne satin aluminum Y-shaped rear spine glimpsed at the side, slim sculptural champagne arm supports with olive soft-touch pads, refined thick but gently tapered waterfall seat cushion, champagne satin five-star castor base and warm dark grey paired wheels. Right candidate B: warm muted clay/cinnamon woven upholstery, wider low-shoulder backrest with a separate softly integrated lumbar cushion, warm off-white mineral-colored rear shell, graceful curved off-white arm supports with matching clay fabric pads, substantial upholstered waterfall seat and satin aluminum five-star base. Each chair must be physically plausible, ergonomic TASK CHAIR with real tilt mechanism and height column, not lounge furniture. Strong silhouette, high-end understated material detail, elegant and precise construction. Show complete chairs in matching three-quarter front camera views, both at identical scale, with all five wheel spokes plausible, strong enough view of seams, fabric weave, mechanical joints, metal brushing, fine matte surface variation. Professional photorealistic product photography, soft large window key light, subtle warm rim, realistic contact shadows, luxurious quiet furniture brand, restrained neutral backdrop. Avoid shiny plastic, gaming chair styling, transparent mesh, sci-fi shapes, headrests, copied logos or specific branded trade dress. Composition: each object centered in its own spacious half, no cropping; a fine vertical divider separates alternatives. Small elegant dark typography only 'A / SAGE TEXTILE' over left and 'B / WARM CLAY' over right. No other text. This is a reference to guide detailed Blender modeling, so preserve plausible joinery and clear assembly boundaries.

### 织物贴图完整提示词

Use case: product-mockup. Asset type: seamless physically based upholstery BASE COLOR texture for Blender. A flat square orthographic top-down scan of dense refined sage olive wool-linen upholstery fabric. Entire image filled with woven textile, edge to edge, no border. Many tiny interlaced warp and weft yarns, natural fibrous slubs, fine individual fibers and small variation among muted olive, grey-green and oatmeal yarns. Dense NONTRANSPARENT textile, no holes or mesh. Fine-scale weave suitable for high-end upholstered ergonomic chair; image represents about 18 by 18 centimeters of fabric. Seamlessly tileable on all four edges. VERY FLAT uniform neutral lighting, no baked shadows, no spotlight, no vignette, no highlights, no folds, no wrinkles, no seams, no depth of field, no perspective. Restrained muted natural olive sage overall average color around sRGB #737b56; subtle heterogeneous weave avoids obvious stripes or repeated grid artifacts. Crisp detail throughout. Not velvet or smooth leather, not chunky knitted blanket. No text, symbols or objects.


## 2026-10-10 · 固定机位造型校准

本轮参考始终为 `concepts/contour-directions.png` 左侧 A，未更换设计方向。共保留 01—21 的单张渲染；局部更改后先观察，再进行下一次修改。对照页 `/review/` 左侧裁切展示原图 A，右侧可切换迭代，没有对渲染图片进行修形或修色。

- 01—04：建立固定参考相机；03 过于正面，弃用。04 起锁定机位。
- 05—09：调整靠背腰侧曲面、中央缝线和座垫侧缝；07 的后标牌穿出前表面、13 的包边未贴合均在后续修复。
- 10—12：底座前支脚朝向、脚轮侧面、座垫下托盘与扶手厚度。
- 13—16：增加靠背体积；15 座垫过厚，16 回调。织物为不透明表面，纹理加微小纤维起伏。
- 17—21：座垫侧缝转折、扶手倾角、上部侧翼收拢、扶手承托和软垫的连接曲面。18 扶手倾角过大，19 回调；21 补齐近景缝隙。

固定参考相机参数位于 build.py 的 reference 分支，804×980；页面保留既有左文右物构图。完整模型、拆解、椅背、座垫、扶手近景分别输出检查后，再生成完整滚动序列与首页透明图。

当前是按单张概念图重建的近似模型，不应称为一比一完成：座垫侧缝位置、扶手曲率、背部体积与织物颗粒仍存在差异；原图没有提供的背面和连接机构为补建。对照页保留这些差异，供后续微调判断。


第 22 轮修正座垫线迹贴合，并切换 OptiX GPU 降噪。之后整段及首页统一用 GPU 重新渲染；扶手特写相机略上移，避免底部与章节导航靠近。首页使用 `floor.visible_camera=False` 保留反射环境，而非将摄影棚从所有光线中隐藏。

GPU 检查不只看配置：build.py 会打印渲染设备、计算后端、降噪器和启用设备；不存在可用 OptiX GPU 时立即报错。实际占用采样与设备日志保存在 evidence/product-sage。


## 第 23—24 轮：细节清晰度

保留参考相机、部件形状和滚动镜头位置。23 调整了织物贴图映射尺度（8.5 → 3.2）、降低大块纤维颜色噪声的混合权重（0.72 → 0.24），以连续细暗线和两侧短针脚重做中央接缝，并缩小主光面积以增加织纹和轮廓层次。24 收回偏浅的织物色，保持灰绿而非米灰。

参考图提高到 1608×1960、256 samples；序列提高到 2560×1600、128 samples，像素滤波宽度 0.85、adaptive threshold 0.004。渲染与降噪继续使用 OptiX GPU。网页帧采用 WebP quality 94；没有在成图上做锐化、涂改或修形。该轮提高了清晰度，不代表模型已与原图完全相同。
