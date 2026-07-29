## Context

现有首页由 `HomeInstrumentStage`/`InstrumentStage` 驱动，是一个“仪表台”作品浏览器，进站即列出四个项目并提供直达链接。用户希望首页成为大气、真正现代高科技的门面：一进站只见可交互的深空星空，下滑后星座成为导航再揭示作品。设计方向（Deep-Space Constellation）与全部关键手感、字体、配色已通过实时原型验证并锁定，详见 `docs/superpowers/specs/2026-07-29-portfolio-constellation-redesign-design.md`。

本变更为第一期，仅重构**门面首页**与**进入后的星座导航**；项目详情页与生态页造型保持不变，放入后续期次。技术栈已具备：`three`、`@react-three/fiber`、`@react-three/drei`、`motion`。现有站点对可访问性、`prefers-reduced-motion`、无 JavaScript 降级、性能预算（`scripts/check-budgets.mjs`、`lighthouserc.json`）与契约测试（`design-contract`、`font-contract`）均有硬性要求，必须延续。

## Goals / Non-Goals

**Goals:**
- 首页门面：全屏可交互 3D 星座，门面阶段不显示任何作品名。
- 下滑进入：镜头飞入星场并把星座转为导航。
- 星座即导航：节点=作品，按生态分簇，hover/focus 揭示信息，激活进入详情。
- 锁定视觉与手感：Chakra Petch + Geist Mono + 冷蓝深空；responsiveness 0.28 / sensitivity 1.0。
- 完整可访问性与降级：键盘导航、`prefers-reduced-motion` 静态星图、无 WebGL / noscript 等价入口。
- 更新样式令牌与字体契约并同步测试；持续满足性能预算与 Lighthouse。

**Non-Goals:**
- 不改动项目详情页与生态页的现有造型（后续期次）。
- 不新增运行时依赖（复用已安装的 3D/motion 栈）。
- 不做生产部署。

## Decisions

- **用 React Three Fiber 承载星场，而非 canvas demo 或纯 CSS。** 原型用裸 canvas 验证方向；正式实现改用 R3F，以获得真 3D 点云、可控相机飞入、辉光/后期与和站点其余 R3F 场景一致的生命周期管理。备选：保留裸 canvas（更轻但难做相机飞入与后期，且与站点其余 3D 语言不统一）——否决。
- **门面与星座导航同页、以滚动进度驱动相机状态**，而非两个独立路由。滚动进入符合“scroll to enter”的心智模型，也让相机飞入连续。备选：点击进入独立 `/work` 路由（转场断裂、失去连续飞入）——否决；后续如需，仍可加显式 Enter 按钮作为等价触发。
- **鼠标跟随一律在渲染循环内做缓动插值（lerp）+ `translate3d` GPU 合成，事件回调只记录目标值。** 这是原型阶段“丝滑/灵敏”问题的根因修复；基准手感常量 `RESPONSIVENESS=0.28`、`SENSITIVITY=1.0` 抽为可配置常量，光标插值系数取 `min(1, RESP*k)` 使其略更贴手。
- **节点是真实可聚焦控件（button/link 语义），沿用现有 scene-target/键盘模型。** 复用 `home-instrument-stage` 已有的方向键+Enter 交互与 `SceneTargetBoundary` 思路，保证键盘可达与语义稳定；3D 只做视觉增强。
- **tagline 迁入 `catalog.ts` 数据源**（现有 `projectStatements` 常量迁移到 `Project` 类型的字段），使内容单一可信来源，便于扩展。
- **降级分层**：`prefers-reduced-motion` → 静态星图；无 WebGL / Canvas 失败 → SVG/CSS 静态星图 + 语义链接；`<noscript>` → 现有 noScriptRail 思路的作品/生态真实链接。进入作品的路径永不只存在于 Canvas。
- **字体自托管**：新增 Chakra Petch woff2 到 `src/assets/fonts`，与现有 Geist 家族一致的自托管与 `font-contract` 契约方式，避免运行时依赖 Google Fonts。

## Risks / Trade-offs

- [WebGL 性能拖累 Lighthouse / 性能预算] → DPR 上限 2、节点数适度、连线限邻域、进入视口再挂载重场景、按需渲染；低端设备走 Static；CI 持续跑 `check-budgets` 与 Lighthouse。
- [滚动驱动相机与浏览器原生滚动/无障碍冲突] → 使用正常文档滚动、动画可中断、不做滚动劫持；`prefers-reduced-motion` 直接呈现静态终态。
- [门面“不列作品”与 SEO/可发现性张力] → 作品与生态的真实链接始终存在于语义 DOM / noscript，`metadata`/`JsonLd`/`sitemap` 保持不变。
- [字体契约与设计令牌测试回归] → 同步更新 `design-contract.test.ts`、`font-contract.test.ts`，把新令牌/字体纳入契约，避免静默漂移。
- [替换 instrument-stage 影响进行中的 build-project-universe 变更] → 本期仅替换首页用法，Arc/Rialo 仍用既有舞台；两变更边界清晰，归档时再统一 specs。

## Migration Plan

1. 引入 Chakra Petch 字体资产与深空令牌，更新契约测试（先失败后实现）。
2. 实现 R3F 星场组件 + 静态降级 + noscript 等价链接。
3. 用星场替换首页 `page.tsx` 对 `HomeInstrumentStage` 的使用；移除首页 instrument-stage 用法（Arc/Rialo 舞台保留）。
4. 实现下滑进入的相机飞入与星座导航（hover/focus 揭示、键盘、激活进入详情）。
5. 接入手感常量与缓动交互；补可访问性与降级的 Playwright + axe 测试。
6. 跑 `npm run verify`、`test:e2e`、`check:budgets`、Lighthouse，回归通过。

回滚：首页改动集中在 `src/app/(immersive)/page.tsx` 与新星场组件目录，保留 instrument-stage 组件不删（仅首页停用），可快速切回。

## Open Questions

- wordmark 与 tagline 最终文案（暂用「CAPTAIN DOCK」/「A constellation of built things」，待用户确认是否换真实名字/口号）。
- 相机飞入的时长与缓动曲线（在实现中按感知连续性微调，手感基准 0.28/1.0 不变）。
