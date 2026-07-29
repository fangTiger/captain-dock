## Why

现有首页以“仪表台（instrument stage）”形式一进站就罗列全部作品，用户认为其排版与气质不满意，且违背“首页应是门面、点进去再展示作品”的定位。需要把首页重构为一个大气、真正现代高科技（可交互 3D 星座）的门面，进入后再以星座导航揭示作品。本变更为该重设计的**第一期**：仅覆盖门面首页与进入后的星座导航。

## What Changes

- **BREAKING** 移除首页的 instrument-stage 作品浏览器（`HomeInstrumentStage`/`InstrumentStage` 在首页的用法），首页不再一上来罗列项目名与直达链接。
- 新增门面首页：全屏可交互 3D 星空（React Three Fiber），每个作品是一颗发光节点；居中 wordmark 采用 Chakra Petch，仪器读数/标签采用 Geist Mono，冷蓝配色。
- 交互手感固定为 `responsiveness = 0.28`、`sensitivity = 1.0`（缓动插值、GPU 合成、光标略比星场更贴手）。
- **首屏即导航**（取代原「下滑进入」方案）：首页零滚动，星场保持现有密度，底部四列索引条列出全部 4 个作品的名称、`statement` 与生态·状态。悬停索引条即点亮星场对应节点，走既有 `[data-scene-target]` 委托。首页不渲染页脚。
- 索引条是服务端渲染的纯链接，因此无 JS / 无 WebGL 时它就是导航主路径，原 sr-only 与 `<noscript>` 备用链接一并移除。
- 降级与可访问性：`prefers-reduced-motion` 提供静态星图；无 WebGL/`<noscript>` 回退到语义化作品与生态链接列表；节点为可聚焦控件并支持方向键导航。
- 更新样式令牌与字体契约（新增 Chakra Petch 展示字、冷蓝深空调色板），并同步相关契约测试。
- 本期**不改动**项目详情页与生态页的既有造型（放入后续期次）。

## Capabilities

### New Capabilities
<!-- 本期不引入全新能力，均为对既有能力的修改 -->

### Modified Capabilities
- `progressive-visual-experience`: 首页从封闭仪表台/电影放映厅改为“深空星座门面 + 下滑飞入转场”；重新定义首屏视觉、动效层级、`prefers-reduced-motion` 静态终态与 WebGL 降级行为。
- `project-universe-navigation`: 首页不再直接罗列作品；进入路径改为“门面星空 → 下滑进入 → 星座即导航 → 项目详情”，并规定键盘与 noscript 等价导航。

## Impact

- 受影响代码：`src/app/(immersive)/page.tsx`、`src/components/stage/*`（首页舞台被星场组件取代）、`src/components/ecosystem/ecosystem-index`（首页索引部分）、`src/styles/tokens.css`、`src/styles/universe-pages.module.css`、`src/styles/motion.css`。
- 受影响内容/契约：`src/content/catalog.ts`/`types.ts`（tagline 迁入数据源）、`src/styles/design-contract.test.ts`、`src/styles/font-contract.test.ts`、`src/content/*.test.ts`。
- 依赖：复用已安装的 `three`、`@react-three/fiber`、`@react-three/drei`、`motion`；新增 Chakra Petch 字体资产（本地 woff2，遵循现有字体自托管方式）。
- 保留不动：路由骨架、`metadata`/`JsonLd`/`sitemap`/`opengraph-image` 等 SEO 表面、项目详情内容结构。
- 质量门槛：需持续满足 `scripts/check-budgets.mjs`、`lighthouserc.json` 性能预算与 axe 可访问性测试；低端设备/无 WebGL 降级须先行验证。
