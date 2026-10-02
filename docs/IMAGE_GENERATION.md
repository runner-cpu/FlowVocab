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
