# 心流词境 FlowVocab

在线体验：<https://runner-cpu.github.io/FlowVocab/>

> 🎮 **不背单词，打游戏顺便过级** —— 一款把英语备考包装成「港口点亮星球」冒险的纯前端学习平台：驾船穿行暮色海港，在六座灯塔里收集星尘，点亮属于自己的学习星球。

核心差异化：**主线航线地图 + 动态难度阀门 + 离线智能（跟读评分 / 错因路由 / 复习调度）+ 真实大纲词库**。全部离线运行，不依赖任何云端服务，断网可玩。

---

## ✨ 核心特性

### 🗺️ 有角色、有主线的学习冒险
- **航线地图**：六个训练模块串成一条港口航线，按章节解锁，完成后掉落星尘并点亮灯塔。
- **星级结算**：每章按正确率给出 1–3 星（≥90% 三星、≥70% 两星、≥40% 一星，两题即可结算三星），只记录最好成绩，重玩不会降低评价；一轮内 ≥80% 且最高连击 ≥5 同样可拿三星（连击补偿）。
- **星尘工坊**：点亮灯塔掉落星尘，每 20 星尘可灌注 50 星球能量——把「点亮灯塔」和「星球生长」连成一条闭环。星数没有提升时不会重复掉落星尘。
- **六个模块都会结算**：词汇一轮、语法一个节点、句子/听力/写作一轮、阅读一章结束后写入本章成绩；语音陪练同样计入听力章节。
- **小狐狸旅伴**：待机 / 命中 / 失误 / 升级四种状态，全程出现在答题页与结算屏。

### 🎯 心流三铁律（设计哲学）
1. **动态挑战**：难度实时匹配你的水平（近 10 题正确率 >85% 自动升档，<60% 自动降档），让你始终处于"有点难，但再努把力就能赢"的爽感区间。
2. **即时反馈 <0.3s**：连击火焰、暴击震动、金币飞溅、合成音效——连击 ≥3 时屏幕边缘燃起火光，怒气态转为橙色脉冲。
3. **正向延迟满足**：连击断了只少赚资源，**绝不惩罚**。星球隔日不复习只是"停止生长"，不会枯萎死亡。

### ⚔️ 节奏打击式答题引擎
- **连击 Combo**：连续答对累积，连续 20 次答对解锁“连击之星”成就
- **暴击 Critical**：答对且用时快于中位时间 ×0.7 → 双倍经验 + 屏幕震动
- **怒气 Rage**：攒满 5 连击爆发 → **接下来 3 次作答双倍经验**（无倒计时焦虑，答错或耗尽即结束）
- **提示有代价**：使用提示后该题经验减半（答错本来就只给保底经验），避免提示变成免费答案

### 🧠 离线智能（不接大模型、无后端）
- **语音陪练**：预置对话树（6 场景 × 5–6 组问答），关键词命中 + 置信度 → 1–3 星，答偏时按规则给出中文提示（如「注意过去式 -ed」）；不支持识别或拒绝麦克风时自动切换为打字输入，评分路径完全一致。每次有效跟读计入听力章节进度。语音识别由浏览器提供，部分浏览器会上传到厂商服务，可改用打字模式。评分是练习参考，不是发音能力测评。
- **错因路由**：答错后按标签（时态/搭配/词义混淆/介词等）从规则模板取讲解卡，并附一张形近词对比卡（内置 48 组）。全部离线。
- **复习调度**：SM-2 简化遗忘曲线 [1, 3, 7, 15, 30] 天，错词自动入库并按到期时间优先出题；连续答对 3 次才记为掌握。

### 📊 六维能力可视化
ECharts 驱动的仪表盘：**学习热力图**（90 天 GitHub 风格）、**六维雷达**（词/语/句/听/写/读）、**难度流**（心流质量轨迹）。

---

## 🗺️ 六大技能模块

| 模块 | 玩法 | 状态 |
|---|---|---|
| ⚔️ **词汇 · 词魂战场** | 节奏打击四选一：连击/暴击/怒气全生效，动态难度切换词档 | ✅ 完整（ECDICT 五级分片） |
| 🌳 **语法 · 技能树** | 五分支技能树（时态语态/定语从句/名词性从句/非谓语/虚拟语气），通关点亮节点 | ✅ 完整 |
| 🧩 **句子 · 拆解工坊** | 长难句拼图（主干/从句/修饰三桶）+ 限时翻译对决 | ✅ 完整 |
| 🎧 **听力 · 听写工坊** | 跟读 → 语音识别 → **识别文字逐词匹配**（仅供练习参考，不是发音评分）；可主动选择选词模式，识别失败自动降级。另有「语音陪练」标签页 | ✅ 完整 |
| 🃏 **写作 · 句型工坊** | 句子排序重建高频句型（可拖动或用方向键调整）+ 四六级高频错误改错题 | ✅ 完整 |
| 📖 **阅读 · 叙事副本** | 章节制原创故事，考点题卡关 + 分支剧情推进 | ✅ 完整 |

> 六个模块都接入航线地图与关卡结算；听力含独立的语音陪练模式。内容体量以大纲核心词与自编语料为主，真题语料与开放式写作批改仍在路线图上。

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22.12（CI 使用 Node.js 22，本地验证 Node.js 24）
- npm ≥ 9

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（热更新）
npm run dev
# 访问 http://localhost:5173

# 3. 生产构建
npm run build

# 4. 质量门禁
npm run validate
# 类型、静态检查、测试、构建、首屏预算、PWA 与内容验证
npm audit --registry=https://registry.npmjs.org

# 5. 本地预览构建产物
npm run preview
# 访问 http://localhost:4173
```

### 数据说明（重要）
首次进入「词汇」模块时会按需加载 ECDICT 词库分片（public/data/words/manifest.json 与五个 level JSON，共 5805 词）并写入浏览器 IndexedDB，**之后离线可用**。加载失败时保留已缓存词并显示可重试提示。

---

## 📚 词库与数据来源

| 数据 | 来源 | 规模 | 许可证 |
|---|---|---|---|
| 词汇词库 | 固定版本 ECDICT（由导入脚本生成） | 5805 词，五级分片 | MIT（见 THIRD_PARTY_NOTICES.md） |
| 例句 | Tatoeba 英文句对导出（逐词匹配、逐句可溯源） | 5729/5805 词各 1 句 | CC-BY 2.0 FR（见 THIRD_PARTY_NOTICES.md） |
| 界面字体 | Outfit（本地打包 woff2） | 2 个子集 | SIL OFL 1.1（见 public/licenses/outfit-OFL.txt） |
| 语法/句型 | 公开英语语法规则（自建） | — | — |
| 听力/阅读/对话树 | 自编原创示例 | — | — |

**来源说明**：历史 KyleBing 派生词条只保留用于 IndexedDB 迁移的旧 ID 别名，不作为生产释义来源；当前发布词库全部由固定 ECDICT 快照生成。代码与自建内容采用 MIT 许可，第三方数据以 THIRD_PARTY_NOTICES.md 为准。

### 词库导入与更新

```bash
# 1. 将已获 MIT 许可、固定提交的 ECDICT CSV 放入
#    data-src/ecdict-source/ecdict.csv（不要提交大型源 CSV）
# 2. 运行导入脚本，生成 public/data/words/manifest.json 与分片
python scripts/import_words.py

# 3. 为分片补充离线例句（Tatoeba CC-BY，抓取一次后缓存在 data-src/）
python scripts/add_examples.py
node scripts/validate-content.mjs
```

难度档位映射：CET4 → level 0/1（按序均分），CET6 → level 2/3/4（三等分），保证 5 档难度均有充足词池。

---

## ⚙️ 技术架构

| 层次 | 方案 | 职责 |
|---|---|---|
| 构建 | Vite 6 + TypeScript | 零配置开发服务器、静态构建 |
| UI 框架 | React 18（函数组件 + Hooks） | 六大模块与仪表盘界面 |
| 状态管理 | Zustand | 游戏态（连击/怒气/难度）、会话态 |
| 数据持久化 | Dexie.js（IndexedDB） | 词库主数据、学习进度、每日统计 |
| 可视化 | ECharts | 热力图、六维雷达、难度流 |
| 音效 | Web Audio API（合成器） | 零资源零版权音效 |
| 语音 | Web Speech API | 听力朗读 + 跟读识别（渐进增强） |

### 目录结构

```
FlowVocab/
├── index.html                 # 入口 HTML
├── package.json / vite.config.ts / tsconfig.json
├── docs/
│   └── 详细开发设计文档.md      # 完整技术设计文档（v4.0）
├── scripts/
│   ├── import_words.py        # ECDICT 词库导入脚本
│   └── lint.mjs               # 发布前静态质量门禁
├── public/
│   ├── data/words/             # ECDICT manifest + 五个等级分片
│   ├── manifest.webmanifest    # PWA 清单
│   └── sw.js                   # 离线缓存策略
└── src/
    ├── engine/                # 核心心流引擎
    │   ├── combo.ts           # 连击/暴击/怒气（3 次作答制）
    │   ├── difficulty.ts      # 动态难度阀门（10 题滑动窗口）
    │   ├── forget.ts          # SM-2 简化遗忘曲线
    │   └── audio.ts           # Web Audio 合成音效
    ├── store/
    │   ├── db.ts              # Dexie 数据库（v2 含 wordBank 表）
    │   ├── wordBank.ts        # 词库服务：懒加载 + 离线缓存 + 降级
    │   ├── progressStore.ts   # 进度/雷达/持久化
    │   └── gameStore.ts       # 游戏态路由
    ├── data/                  # 静态内容（语法/句子/听力/写作/阅读/降级词库）
    ├── components/
    │   ├── game/              # HUD/反馈浮层
    │   ├── dashboard/         # 星球/热力图/雷达/难度流
    │   └── modules/           # 六大模块组件
    └── pages/                 # Home / Dashboard / ModulePage
```

---

## 🎮 心流引擎详解

### 连击 / 暴击 / 怒气（`engine/combo.ts`）

```
正确作答 → combo+1
  用时 < 中位数×0.7 → 暴击（双倍经验）
  攒满 5 连击 → 怒气爆发：接下来 3 次作答双倍经验（连击继续累计）
  怒气中答对 → 消耗 1 次；答错 → 怒气结束
错误作答 → 连击归零（只归零，不惩罚资源）
```

### 动态难度阀门（`engine/difficulty.ts`）

```
滑动窗口：最近 10 次作答
正确率 > 85% 且超慢占比 < 40% → 升档（绿→蓝→紫→金→火红）
正确率 < 60% 或超慢占比 > 60%  → 降档（"帮你稳一稳"）
否则 → 保持
```

### 遗忘曲线（`engine/forget.ts`）

```
质量评分 q ∈ {0,1,2}（错=0 / 对但慢=1 / 快而准=2）
复习间隔 [1, 3, 7, 15, 30] 天
词状态：new → learning → mastered（连续 3 次质量≥1）
```

---

## 🗄️ 数据持久化（IndexedDB）

| 表 | 主键 | 说明 |
|---|---|---|
| `userProfile` | id | 用户档案、XP、最佳连击、设置（禅模式/音量） |
| `userWords` | id | 每个词的学习状态与复习调度 |
| `dailyStats` | date | 每日 XP/能量/连击/分模块计数 |
| `sessions` | id | 每次练习会话记录（含难度流） |
| `progress` | id | 六维雷达、技能树、写作日志 |
| `planet` | id | 星球能量/等级/每日目标 |
| `wordBank` | id | 词库主数据（ECDICT 五级分片，懒加载写入） |
| `wordBankMeta` | id | 词库版本信息 |

---

## 🛣️ 路线图

| 阶段 | 内容 |
|---|---|
| ✅ P0 · 心流原型 | 词汇完整 + 星球养成 + 热力图 + 真实词库 |
| ✅ P1 · 六维闭环 | 语法/句子完整；听/写/读框架；雷达 + 错题本 |
| 🔜 P2 · 智能升级 | AI 出题/错题讲解、LLM 写作批改、ECDICT 音标查词、真题语料 |
| 🔜 P3 · 竞技增长 | 联机对战 + ELO 段位 + 内容批量生产 |

---

## 🖥️ 浏览器兼容性

- 完整功能：Chrome / Edge（支持 Web Speech API 语音合成与识别）
- 降级可用：其他浏览器（听力提供选词模式；词库失败保留已缓存的 ECDICT 内容，并可重试下载）
- 移动端：响应式布局（≤480px 适配），触控目标 ≥44px

---

## 📄 许可证

项目代码与自建内容采用 MIT License（见 LICENSE）。ECDICT 的版权与 MIT 原文见 THIRD_PARTY_NOTICES.md。历史 KyleBing 派生数据没有明确许可证，不作为生产内容分发；仓库中仅保留旧 ID 别名以迁移已有本地学习进度。

### ECDICT replacement procedure

The checked-in lexical payload contains 5,805 stable ECDICT IDs and five
difficulty levels. Its phonetics and meanings are regenerated from the cached
ECDICT snapshot at commit
bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b. Run
python scripts/import_words.py to reproduce it. The importer currently emits
5,805 words, uses 5,774 available phonetics, and leaves 31 phonetics empty;
it never invents missing pronunciation data and does not copy the unlicensed
legacy phrases. See THIRD_PARTY_NOTICES.md for the exact ECDICT MIT notice.

---

## 🚀 部署

GitHub Actions 在 PR 上执行质量检查，仅 main 推送或 main 手动触发可部署 Pages。工作流只上传 dist/；构建不会修改仓库根目录入口。首次在线加载并成功安装 Service Worker 后，应用界面资源可离线使用；词库仅限已下载分片。新版本会等待旧标签页关闭后启用，避免练习中途替换资源。缓存隔离在应用路径下，不影响同一 GitHub Pages 域名的其他站点。

学习记录和备份保存在本机，建议定期在“设置”中导出。可选的浏览器语音识别可能把音频交给浏览器厂商的在线服务，选词模式不需要麦克风。本应用没有默认上传学习记录或第三方分析埋点。

本轮多角度审查及未解决边界见 [2026-10-07 质量审查](docs/quality-audit-2026-10-07.md)。

## 🙏 致谢

- 词库数据：固定版本 ECDICT（MIT，详见第三方声明）
- 游戏化方法论参考：Duolingo 留存设计、多邻国心流理论
- 技术栈：React、Vite、Zustand、Dexie、ECharts
