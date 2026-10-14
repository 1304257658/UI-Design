# 悬浮家具素材：沙发与落地灯

生成方式：内置 `image_gen`，使用 `transparent_background: true`。两次生成均使用下列已查看的批准效果图作为 `referenced_image_paths`：

`C:/Users/zxc/.codex/generated_images/01a11a9d-5d15-7c52-b949-3dbdd9f45b0f/exec-a255222e-4c14-49b5-8f75-339131aa1fa7.png`

## 沙发

生成结果：`C:/Users/zxc/.codex/generated_images/01a12453-8d2d-7af0-88bf-b0da3ee806f8/exec-c70104b8-ef7a-4f6c-8143-198c07c208f5.png`

最终 PNG：`E:/Project/AI-Office-Case/cases/18-xuzo-chair/public/images/floating/sofa.png`

文件检查：1536 × 1024，RGBA，alpha 范围 0–254，934,182 个完全透明像素，四角 alpha 均为 0。生成结果直接复制到最终路径，未对图像进行二次编辑。

完整提示词：

```text
Use case: background-extraction. Asset type: one photorealistic transparent PNG furniture cutout for a website. Input image: approved composition reference, edit target. Extract ONLY the olive-green upholstered sofa at lower left. Preserve exactly its suspended diagonal pose, leaning from upper-left to lower-right, seen from below with large dark fabric underside panel, natural oak structural frame and legs, rich green cushions and fine woven upholstery. Keep its actual geometry, rich material realism, realistic seams and warm soft lighting. Entire sofa including all legs fully uncropped with small transparent margins; center it and let it occupy most of the output image. Actual transparent alpha background. Remove absolutely everything except this one sofa: no other furniture, text, plant, props, background, floor, room, cast shadow plane or watermark. Do not make upright or rotate its pose. No added glows. Output one sofa only.
```

## 落地灯

生成结果：`C:/Users/zxc/.codex/generated_images/01a12453-8d2d-7af0-88bf-b0da3ee806f8/exec-a5ccf2ea-a3c8-4467-b0a1-6fc4149b5cea.png`

最终 PNG：`E:/Project/AI-Office-Case/cases/18-xuzo-chair/public/images/floating/lamp.png`

文件检查：1536 × 1024，RGBA，alpha 范围 0–254，1,321,748 个完全透明像素，四角 alpha 均为 0。生成结果直接复制到最终路径，未对图像进行二次编辑。

完整提示词：

```text
Use case: background-extraction. Asset type: one photorealistic transparent PNG furniture cutout for a website. Input image is approved composition reference/edit target. Extract ONLY the warm brass floor lamp on the left. Preserve its exact suspended diagonal pose: rounded hemispherical metal lampshade at lower-left, long thin brass stem toward upper-right, circular brass base at upper-right. Keep the realistic satin brushed brass, warm lit cream inner diffuser, subtle natural metallic reflections, precise product geometry and lighting. Entire lamp fully uncropped with all edges intact, small transparent margins; center lamp to occupy most of the image. Actual transparent alpha background, no floor or shadow plane, no background, no bloom or glow outside the lamp silhouette, no text or watermark, no furniture, no props or duplicate lamps. Do not orient it upright. One lamp only.
```
