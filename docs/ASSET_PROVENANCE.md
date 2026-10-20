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

## 2026-10-20 小学词卡批次（words-animals-2 / words-food-kitchen / words-home-nature）

- 生成日期：2026-10-20（Asia/Shanghai）
- 用途：小学路线词汇关卡的看图认词题面；每张 sprite sheet 含 12 个词，共 36 个新词
- 原始文件：output/imagegen/words-animals-2.png、words-food-kitchen.png、words-home-nature.png（本地中间物，不提交）
- 发布文件：public/assets/word-{eagle,hare,sparrow,camel,goose,hen,lamb,ant,spider,pigeon,crow,hawk,cabbage,cucumber,turnip,radish,berry,lime,biscuit,hamburger,pudding,sausage,porridge,jam,cupboard,fridge,lantern,chimney,balcony,quilt,mug,scarf,waterfall,volcano,meadow,sunrise}-448.webp
- 生成模型：gpt-image-2.5
- 生成接口：项目指定的 codex-image.cmd → https://cli.999554.xyz/v1/images/generations
- 后处理：4 列 × 3 行等分裁切；按纯白背景 trim 后等比缩放并居中到 448×336（4:3）画布；WebP quality 78、method 6、去除元数据
- 体积：36 张合计 231,470 B；全部 72 张词卡合计 452,642 B
- 人工检查：逐张确认「一格一物」、无文字/字母/水印、无跨格残留、主体完整不贴边；抽查 448×336 实际渲染清晰度
- 说明：词卡是题目素材而非装饰，未收录的词不生成占位图，改为纯文字题面

### Prompt：words-animals-2.txt（原文）

Use case: illustration-story. Asset type: a children's picture-dictionary sprite sheet for a primary-school English learning app. Primary request: a strict 4-column by 3-row grid of twelve isolated object illustrations, exactly one centered object per cell, in this reading order left-to-right, top-to-bottom: (1) a brown eagle with spread wings, (2) a brown hare standing alert, (3) a small brown sparrow, (4) a tan camel with one hump, (5) a white goose, (6) a brown hen, (7) a white lamb, (8) a small black ant, (9) a black spider on a tiny web, (10) a grey pigeon, (11) a black crow, (12) a brown hawk perched. Style/medium: polished flat vector storybook illustration, soft rounded shapes, thick warm brown outlines, minimal soft shading, child-friendly, premium educational app art, consistent lighting and scale across all twelve cells. Composition/framing: 1536x1024 landscape canvas divided into equal 4x3 cells; each object fully inside its cell with at least 12 percent margin on every side; no object touches a cell edge; no overlap between cells; generous pure white gutters; pure white background throughout; no shadows crossing cell boundaries. Color palette: warm teal, amber, coral, soft navy accents, natural animal colors. Text (verbatim): none. Constraints: no text, no typography, no letters, no numbers, no logos, no watermarks, no borders, no grid lines, no background scenery, no people, no frames. Avoid: photorealism, 3D render, gradients behind objects, busy backgrounds, cropped objects, overlapping objects, inconsistent style.

### Prompt：words-food-kitchen.txt（原文）

Use case: illustration-story. Asset type: a children's picture-dictionary sprite sheet for a primary-school English learning app. Primary request: a strict 4-column by 3-row grid of twelve isolated object illustrations, exactly one centered object per cell, in this reading order left-to-right, top-to-bottom: (1) a green cabbage, (2) a green cucumber, (3) a white and purple turnip, (4) a red radish, (5) a cluster of red berries, (6) a green lime, (7) a golden biscuit, (8) a hamburger with lettuce and cheese, (9) a slice of pudding on a small plate, (10) a brown sausage, (11) a bowl of porridge, (12) a jar of strawberry jam. Style/medium: polished flat vector storybook illustration, soft rounded shapes, thick warm brown outlines, minimal soft shading, child-friendly, premium educational app art, consistent lighting and scale across all twelve cells. Composition/framing: 1536x1024 landscape canvas divided into equal 4x3 cells; each object fully inside its cell with at least 12 percent margin on every side; no object touches a cell edge; no overlap between cells; generous pure white gutters; pure white background throughout; no shadows crossing cell boundaries. Color palette: warm teal, amber, coral, soft navy accents, natural food colors. Text (verbatim): none. Constraints: no text, no typography, no letters, no numbers, no logos, no watermarks, no borders, no grid lines, no background scenery, no people, no frames. Avoid: photorealism, 3D render, gradients behind objects, busy backgrounds, cropped objects, overlapping objects, inconsistent style.

### Prompt：words-home-nature.txt（原文）

Use case: illustration-story. Asset type: a children's picture-dictionary sprite sheet for a primary-school English learning app. Primary request: a strict 4-column by 3-row grid of twelve isolated object illustrations, exactly one centered object per cell, in this reading order left-to-right, top-to-bottom: (1) a wooden cupboard, (2) a white refrigerator, (3) a glowing lantern, (4) a brick chimney, (5) a small balcony with railing, (6) a folded patchwork quilt, (7) a ceramic mug, (8) a striped scarf, (9) a tall waterfall, (10) an erupting volcano, (11) a green meadow with small flowers, (12) a sunrise over hills. Style/medium: polished flat vector storybook illustration, soft rounded shapes, thick warm brown outlines, minimal soft shading, child-friendly, premium educational app art, consistent lighting and scale across all twelve cells. Composition/framing: 1536x1024 landscape canvas divided into equal 4x3 cells; each object fully inside its cell with at least 12 percent margin on every side; no object touches a cell edge; no overlap between cells; generous pure white gutters; pure white background throughout; no shadows crossing cell boundaries. Color palette: warm teal, amber, coral, soft navy accents, natural home and landscape colors. Text (verbatim): none. Constraints: no text, no typography, no letters, no numbers, no logos, no watermarks, no borders, no grid lines, no background scenery, no people, no frames. Avoid: photorealism, 3D render, gradients behind objects, busy backgrounds, cropped objects, overlapping objects, inconsistent style.

## 2026-10-20 故事图书馆章节场景（reading-ch1 / ch2 / ch3）

- 生成日期：2026-10-20（Asia/Shanghai）
- 用途：故事图书馆章节地图缩略图与章节阅读页 `story-hero` 场景图
- 原始文件：output/imagegen/reading-ch1.png、reading-ch2.png、reading-ch3.png（本地中间物，不提交）
- 发布文件：public/assets/flowvocab-reading-ch{1,2,3}-{640,1024}.webp
- 生成模型：gpt-image-2.5
- 生成接口：项目指定的 codex-image.cmd → https://cli.999554.xyz/v1/images/generations
- 后处理：scripts/optimize_images.py --widths 640 1024；WebP quality 72、method 6、去除元数据；原图 1536×1024 → 1024×683 / 640×427
- 体积：6 个文件合计 225,754 B
- 人工检查：确认无文字/字母/水印/UI；左侧标题安全区留白充足；640 与 1024 裁切后主体完整

### Prompt：reading-ch1.txt（原文）

Use case: illustration-story. Asset type: a chapter scene illustration for a children's English reading game called "Story Library". Primary request: a cozy school library basement at dusk where two curious students discover an old brass key and a folded note beside a wooden bookshelf, warm lamp light, shelves of books, a small round window showing the harbor outside. Style/medium: polished storybook digital illustration, premium educational game art, painterly but clean, soft rounded shapes, warm teal and amber palette with soft navy shadows, consistent with a friendly harbor-fox learning app. Composition/framing: wide landscape 1536x1024, cinematic but readable, main bookshelf and key on the right third, open space on the left for a chapter title overlay, clear focal point, safe crop for 640px and 1024px responsive images. Lighting/mood: mysterious but safe and inviting, gentle rim light. Text (verbatim): none. Constraints: no text, no letters, no numbers, no logo, no watermark, no UI, no border, no scary imagery, no photorealism. Avoid: horror, dark dungeon, clutter, modern office, cropped faces.

### Prompt：reading-ch2.txt（原文）

Use case: illustration-story. Asset type: a chapter scene illustration for a children's English reading game called "Story Library". Primary request: a lively school science and technology fair in a bright hall, a small wind turbine model and a solar panel on a display table, three friendly judges with clipboards examining a student project, colorful poster boards with abstract shapes only. Style/medium: polished storybook digital illustration, premium educational game art, painterly but clean, soft rounded shapes, warm teal and amber palette with soft navy shadows, consistent with a friendly harbor-fox learning app. Composition/framing: wide landscape 1536x1024, main display table with wind turbine on the right, open space on the left for a chapter title overlay, clear focal point, safe crop for 640px and 1024px responsive images. Lighting/mood: energetic, curious, optimistic daylight. Text (verbatim): none. Constraints: no text, no letters, no numbers, no logo, no watermark, no UI, no border, no photorealism. Avoid: clutter, crowds, dark lighting, cropped heads.

### Prompt：reading-ch3.txt（原文）

Use case: illustration-story. Asset type: a chapter scene illustration for a children's English reading game called "Story Library". Primary request: a lighthouse keeper's cozy watch room at night, a large brass lamp and logbook on a wooden desk, wide window overlooking a dark sea with a distant cargo vessel and its warm lights, a lighthouse beam sweeping across the water. Style/medium: polished storybook digital illustration, premium educational game art, painterly but clean, soft rounded shapes, deep navy and warm amber palette with teal sea glow, consistent with a friendly harbor-fox learning app. Composition/framing: wide landscape 1536x1024, desk and logbook in the right foreground, lighthouse window and sea on the left, open sky area for a chapter title overlay, clear focal point, safe crop for 640px and 1024px responsive images. Lighting/mood: calm, brave, slightly mysterious but welcoming. Text (verbatim): none. Constraints: no text, no letters, no numbers, no logo, no watermark, no UI, no border, no photorealism. Avoid: storm, horror, loneliness, cropped objects.

## Re-generating a variant

Keep the original PNG outside version control, inspect it before integration, then run the deterministic optimizer for the two responsive widths. Add a new dated section here rather than silently replacing an existing asset. Do not place API keys in prompts, logs, or this document.
