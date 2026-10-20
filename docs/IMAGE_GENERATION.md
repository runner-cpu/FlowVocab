# FlowVocab 生图资产工作流

生成式位图只用于需要真实纹理或氛围的场景；图标、徽标和交互图形继续使用仓库内 SVG/CSS，避免把简单矢量问题交给生成模型。

## 生成与检查

项目约束要求新 raster 图片统一走：

    C:\Users\runner\.codex\tools\codex-image.cmd -Prompt <prompt> -Out output/imagegen/<name>.png -Size 1536x1024 -Quality high -N 1

命令会先检查 gpt-image-2.5，不可用时才回退到 gpt-image-2。生成后必须用图像查看工具检查构图、文字伪影、裁切安全区和无障碍背景对比度，再接入组件。

## 响应式发布

不要把大 PNG 直接放进 public/。使用：

    python scripts/optimize_images.py --asset-source output/imagegen/<name>.png --asset-stem <name> --output-dir public/assets --widths 640 1024

optimize_asset 会保留宽高比、禁止放大、输出无元数据 WebP。组件通过 ResponsiveSceneImage 提供 srcSet、sizes、固定宽高和描述性 alt。完成后删除本地 PNG 中间物，并在 docs/ASSET_PROVENANCE.md 记录日期、模型、用途和 prompt；不要把生成结果当作自动获得的版权许可。

## 小学词卡（4×3 sprite sheet）

小学路线以「看图认词」为主，词卡不是装饰，而是题目本身。为避免逐张生成导致风格漂移，采用一张 1536×1024 的 4 列 × 3 行 sprite sheet 一次生成 12 个词，再按格裁切：

1. 生成时要求纯白背景、每格四周至少 12% 留白、物体不接触格线、无文字/水印/边框。
2. 裁切前先按白底做边缘 trim，再等比缩放到 448×336（4:3）画布居中，避免物体被拉变形或贴边。
3. 用 `scripts/optimize_images.py` 的同一套 LANCZOS + WebP 管线输出 `word-<word>-448.webp`（quality 78、method 6、去除元数据）。
4. 词与图的映射集中维护在 `src/data/wordPictures.ts`；没有对应插画的词继续走纯文字题面，不生成占位图。

## 故事图书馆章节场景

阅读章节的 `story-hero` 与章节地图缩略图共用同一张场景图。章节数据（`src/data/reading.ts`）只描述剧情，素材映射单独放在 `src/data/readingArt.ts`，避免内容结构被素材细节污染。场景图按 1536×1024 生成、左侧留出标题安全区，再输出 640/1024 两档；组件用 `ResponsiveSceneImage` 提供 srcSet 与裁切安全的 `sizes`。
