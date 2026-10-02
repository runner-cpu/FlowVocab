# FlowVocab 视觉资产 provenance

这份记录只描述仓库中新增的生成式位图，不把模型输出误写成第三方授权证明。代码许可证与外部模型服务条款仍需分别遵守。

## flowvocab-memory-garden

- 生成日期：2026-10-02（Asia/Shanghai）
- 用途：错词森林没有词条时的空状态背景
- 原始文件：output/imagegen/flowvocab-memory-garden.png（仅作为本地生成中间物，不提交）
- 发布文件：public/assets/flowvocab-memory-garden-640.webp、public/assets/flowvocab-memory-garden-1024.webp
- 生成模型：gpt-image-2.5
- 生成接口：项目指定的 codex-image.cmd → https://cli.999554.xyz/v1/images/generations
- 后处理：scripts/optimize_images.py --asset-source ... --asset-stem flowvocab-memory-garden --widths 640 1024；WebP quality 72、method 6、去除元数据
- 人工检查：确认右侧树木主体、左侧留白、无文字/Logo/水印/UI；检查响应式裁切后的 1024px 版本

### Prompt（原文）

Use case: illustration-story. Asset type: a responsive empty-state illustration for the FlowVocab memory garden in a learning app. Primary request: a tranquil luminous memory garden where vocabulary memories grow as small glowing leaves and trees beside a quiet midnight shoreline, visually compatible with an existing deep-blue night harbor and friendly orange fox illustration. Scene/backdrop: deep navy night, calm water, subtle stars and soft mist, a few bioluminescent plants and floating memory lights. Subject: an enchanting memory garden with one graceful central tree and tiny glowing word-like leaf shapes, no readable letters. Style/medium: polished storybook digital illustration, premium game UI art, painterly but clean, rich atmospheric depth. Composition/framing: wide landscape 1536x1024, main garden/tree weighted to the right, generous dark negative space on the left for empty-state copy, clear focal silhouette, safe crop area for 640px and 1024px responsive images. Lighting/mood: calm, hopeful, restorative, teal and warm amber bioluminescence against midnight blue. Color palette: deep ocean navy, blue-teal, cyan glow, restrained amber highlights, no purple gradient. Materials/textures: soft foliage, reflective water, subtle grain, layered depth. Text (verbatim): none. Constraints: no text, no logo, no watermark, no UI, no people, no fox, no border; keep the left side uncluttered and dark enough for readable overlay copy. Avoid: typography, symbols that look like words, neon cyberpunk, photorealism, harsh contrast, busy center.

## Re-generating a variant

Keep the original PNG outside version control, inspect it before integration, then run the deterministic optimizer for the two responsive widths. Add a new dated section here rather than silently replacing an existing asset. Do not place API keys in prompts, logs, or this document.
