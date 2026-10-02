# 心流词境 FlowVocab · 第三轮多角度诊断与修复记录

本轮不是重复上一轮的功能清单，而是从“上线以后会怎样”反推风险。每个角度都给出证据、影响和本轮采取的改动；未纳入代码的项目列为后续边界，避免把诊断误报成已完成。

## 1. 离线交付与缓存一致性

旧版 Service Worker 只缓存入口和运行时偶然访问过的资源，首个离线启动仍可能缺少 hashed JS/CSS/WebP；旧版本缓存也不会清理。现在构建后由 scripts/build-service-worker.mjs 根据最终 dist 内容生成确定性版本号和 precache 清单，activate 阶段清除旧的 flowvocab-* 缓存；词库分片继续 stale-while-revalidate。发布门禁 scripts/pwa-assets-contract.mjs 验证清单完整、可重复和无未替换标记。

## 2. Pages 基路径与安装身份

GitHub Pages 位于 /FlowVocab/ 而非域名根。Service Worker 注册改为 import.meta.env.BASE_URL + sw.js，manifest 增加 id、scope 和明确的竖屏方向，避免不同入口产生多个安装实例。仍需在真实移动浏览器检查更新提示和 iOS 安装行为。

## 3. 时间新鲜度

复习到期、三日负担和错词森林原来只在偶然重渲染时重新计算；页面挂着跨过午夜会显示旧结论。本轮新增 useNow，以分钟计时并在 focus/visibilitychange 时立即刷新，Home、Dashboard、WordForest 都订阅同一时钟信号。

## 4. 异步失败可恢复性

导出、重置、宝箱领取和 Service Worker 注册都属于“用户看不见的 Promise”。未处理 rejection 会让用户误以为数据已保存。本轮为设置面板增加导出/重置/导入错误反馈和 10 MB 文件上限，为宝箱增加 inline alert，SW 注册失败静默降级到普通在线模式。

## 5. 生成式媒体与性能预算

新增记忆花园原图约 2 MB，但不直接发布 PNG；优化器现在支持单个生成资产和 640/1024 响应式 WebP，并有无元数据、尺寸和确定性测试。这样生成素材的体验收益不会重新引入首屏体积问题。

## 6. 空状态与任务连续性

错词森林过去只有一句文字，用户看不到“下一步”。现在空状态使用右侧发光树木、左侧文案留白和明确的“开始词汇任务” CTA；图片有描述性 alt，颜色遮罩保证文字对比度，并保留 reduced-motion 兼容。

## 7. 分享/SEO 入口

SPA 原来只有 title/description 和临时 emoji favicon。现在补 canonical、Open Graph、Twitter Card、真实 SVG favicon 和 noscript fallback。OG 图片使用已有夜港资产，不引入第三方追踪脚本；后续可添加静态分享成绩卡的专用 URL。

## 8. 数据备份边界

备份仍是本地 JSON，不承诺云同步。本轮把超大文件拒绝放在 JSON parse 之前，降低移动设备内存峰值；错误不会清空已有进度。下一阶段应增加导入预览、schema 版本迁移和用户主动下载提醒。

## 9. 运行时性能

构建后 precache 清单只包含最终 hashed 静态资源，不把词库 8 MB 一次塞入安装阶段；词库依旧按等级分片。仍需真实低端 Android 测量 IndexedDB bulkPut 和首次字体/图片解码时间。

## 10. 可访问性

空状态图片有 alt，错误使用 role=alert，时间更新不依赖 hover。下一步应对图表增加数据表替代视图，并在真实屏幕阅读器下验证中文 aria-label 的语义顺序。

## 11. 内容与许可

生成图片的 provenance 与 ECDICT 词库许可分开记录；本轮没有把模型输出写成“无条件可商用”。继续扩充例句时应保留来源字段和可追溯导入脚本，避免把新语料与许可证不明的旧素材混在一起。

## 12. 部署门禁

npm run build 现在生成 Service Worker，CI 额外执行 check:release 和 PWA 资产回归，再执行测试、类型检查、内容校验、bundle 门禁和 diff whitespace 检查。这样“本地能跑、Pages 白屏”的发布路径有明确失败点。

## 13. 可观测性与隐私

本项目继续不接第三方埋点；缓存版本、导入进度和保存错误只在本地可见。若将来增加遥测，应采用显式 opt-in、事件最小化和可删除导出，不把词汇答案上传为默认行为。

## 14. 移动端网络与存储

响应式图片和分片词库减小网络峰值，但 Safari 私密模式、存储配额和 Service Worker 更新仍需真机矩阵测试。设置页已经显示持久存储状态，建议后续补“剩余空间/清理缓存不影响进度”的解释。

## 15. 维护性与回滚

构建脚本以内容 hash 生成缓存版本，回滚到旧提交会自然产生旧 cache 名称并被新 activate 清理。生成图片通过 provenance 文档和稳定 stem 管理，避免组件引用随机文件名。

## 16. 本轮验收标准

| 领域 | 可验证结果 |
| --- | --- |
| PWA | 构建产物有 dist/sw.js，包含所有最终静态 hashed 资源并清理旧缓存 |
| 时间 | useNow 的 interval、focus、visibility 行为有自动化测试 |
| 错误 | 设置/宝箱/SW 失败不产生未处理 rejection，用户能看到下一步 |
| 生图 | 有可检查的原图、响应式 WebP、优化器测试和 provenance 记录 |
| 空状态 | 错词森林展示插画、可访问 alt 和进入词汇任务的 CTA |
| 发布 | lint、测试、typecheck、build、bundle、内容与 release contract 全部纳入 CI |

## 17. 后续优先级

P0：真实设备离线更新矩阵、备份 schema v2、图表无障碍替代视图。  
P1：分享成绩卡、到期提醒、按 track 的真实题库过滤。  
P2：可选自托管同步、周报和本地事件导出。
