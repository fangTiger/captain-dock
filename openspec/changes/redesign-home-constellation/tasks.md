## 1. 设计令牌与字体基座

- [x] 1.1 新增 Chakra Petch 变量字体 woff2 到 `src/assets/fonts/`，按现有 Geist 自托管方式注册 `@font-face`
- [x] 1.2 在 `src/styles/tokens.css` 增加深空令牌（近黑冷底 `#05060a`、冷白文字、Arc 冷蓝 `rgb(127,176,255)`、Rialo 琥珀 `#e7a94b`、字体族变量）
- [x] 1.3 更新 `src/styles/font-contract.test.ts` 与 `src/styles/design-contract.test.ts` 纳入新字体与令牌契约（先失败）
- [x] 1.4 抽出手感常量模块（`RESPONSIVENESS=0.28`、`SENSITIVITY=1.0`、光标系数），供交互复用

## 2. 内容模型

- [x] 2.1 在 `src/content/types.ts` 为 `Project` 增加 `statement` 字段（判断语；tagline 保持描述性副标题不变）
- [x] 2.2 将 `projectStatements` 文案迁入 `src/content/catalog.ts` 各项目 `statement`
- [x] 2.3 更新 `src/content/*.test.ts` 覆盖 statement 与 tagline 的职责与完整性

## 3. 星场组件（R3F）与降级

- [x] 3.1 创建 `src/components/constellation/` 目录与星场组件（点云 + 星座连线 + 冷蓝配色），接入现有 UniverseCanvas/SceneRouter（新场景 home-constellation，仅替换 home 映射）
- [x] 3.2 实现 4 个作品发光节点，按 Arc/Rialo 分两簇、各用点缀色；门面阶段不渲染作品名
- [x] 3.3 星场视差/插值交互常量与 motion 模块（wordmark/光标 DOM 接线留第 4 组）
- [x] 3.4 实现静态降级：`prefers-reduced-motion` 与无 WebGL/Canvas 失败时的 SVG/CSS 静态星图（仅替换 home 分支）
- [x] 3.5 提供 `<noscript>` 与语义化的作品/生态真实链接等价入口组件（挂载留第 4 组）

## 4. 门面首页

- [x] 4.1 用门面组件替换 `src/app/(immersive)/page.tsx` 中的 `HomeInstrumentStage`（首页停用 instrument-stage，Arc/Rialo 保留；旧组件测试改为直接渲染）
- [x] 4.2 门面首屏布局：居中 Chakra Petch wordmark（`mix-blend: screen` + 微光 + 视差 + 光标环）、`scroll to enter` 提示、语义/noscript 链接（wordmark=CAPTAIN DOCK，无副标题）
- [x] 4.3 保留首页 SEO 表面（`metadata`、`JsonLd`）不变

## 5. 首屏即导航（原「下滑进入与星座导航」）

**方向调整**：取消两段式。全站仅 4 个作品，为其铺一套「门面 → 滚动飞入 → 星座重排」的仪式成本高、回报低，且要求访客先付出一次滚动才知道站里有什么。改为首屏即完整导航：星场保持现有密度不动，底部加四列索引条。详见 `docs/superpowers/specs/2026-07-29-home-facade-index-design.md`。

- [x] 5.1 ~~滚动飞入转场~~ **已废弃**：首页零滚动，无转场可言
- [x] 5.2 新增索引条组件 `constellation-index.tsx`（服务端组件，渲染 4 个带 `data-scene-target` 的链接，用 `statement` 而非 `tagline`）
- [x] 5.3 索引条 hover/focus 驱动星场节点高亮——复用既有 `[data-scene-target]` 事件委托与 `SceneTargetController`，零新增联动代码
- [x] 5.4 ~~方向键在节点间移动~~ **已废弃**：键盘焦点统一由索引条承担，星场节点不进 Tab 顺序，避免同一目标两个 tab stop
- [x] 5.5 索引条条目链接到 `/[ecosystem]/[project]`
- [x] 5.6 首页布局改零滚动：body flex 链分配高度（不再硬编码 header 为 5rem）、场景层高度与位移覆盖、`.door` 改绝对定位、main 补 `overflow: clip`
- [x] 5.7 首页不渲染 `SiteFooter`（其链接在 header 中已有，且会制造通向空白的滚动条）
- [x] 5.8 移除 sr-only `.semanticLinks` 与 `<noscript>` 备用链接——索引条本身即可见的语义化导航，无 JS 时照常可用
- [ ] 5.9 **受阻**：星场节点可点击 + 反向高亮索引条。drei `Html` 依赖 `useThree()`，而场景 draw-budget 测试策略是脱离 Canvas 做 SSR 渲染，两者不兼容（`R3F: Hooks can only be used within the Canvas component!`）。已回退。若要恢复需先改造场景测试地基

## 6. 验证与质量门槛

- [x] 6.1 首页 Playwright 用例重写到新结构：三视口零滚动 + 无页脚、索引条含 statement 与 scene target、hover 驱动 preview target、无 JS 可用、键盘经索引条到达
- [x] 6.2 运行 `npm run verify`（lint/typecheck/test）：36 文件 / 419 用例全绿
- [ ] 6.3 运行 `npm run check:budgets` 与 Lighthouse
- [ ] 6.4 **存量债**：其余 e2e 仍有约 29 个失败，根源是整套 e2e 仍在描述早已被替换的 instrument-stage 首页（第 1-4 章改掉首页结构时未同步）。抽查确认与本次改动无关，例如 `seo-security` 期望 `/icon.svg` 实得 `/favicon.ico`、`routes` 期望首页 h1 是 manifesto 实为 sr-only 的 CAPTAIN DOCK。需单独立项处理
