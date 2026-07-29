# 首页门面重设计：星场 + 索引条（零滚动）

日期：2026-07-29
状态：已确认，待实现
影响的 OpenSpec 变更：`redesign-home-constellation`（active，未归档）

## 背景

首页当前只渲染一个全屏星场门面。用户反馈两点：滚动条明显但滚下去没有内容；进站只看到星空，不知道下面有字。

排查结论是这两点同源，而且不是新增 bug，是**原设计只实现了上半段**：

1. `universe-pages.module.css:10` 把 `main.homePage` 设为 `min-block-size: calc(100svh - 5rem)`，同文件第 17 行又加了 `padding-block-end: clamp(20px, 2vw, 40px)`。两者叠加使文档比视口高约 40px，再加整个 `SiteFooter`，凑出一条滚下去只有空白和页脚的滚动条。
2. `constellation-facade.module.css` 的 `.door` 用 `align-items: flex-end`，manifesto 被贴在首屏盒子的底边，于是它天然骑在折叠线上——上半行露头、下半行在线下。
3. `openspec/changes/redesign-home-constellation/tasks.md` 第 5 章「下滑进入 → 星座即导航」的 5 个任务全部仍是 `[ ]`。那条滚动条本该通向镜头飞入与星座重排，但那段功能一行未写。

## 决策

推翻原提案的两段式前提，改为**首屏即导航**。

依据是规模：整站一共 4 个作品（Arc 生态 3 个、Rialo 生态 1 个）。为 4 个节点铺一套「门面 → 滚动飞入 → 星座重排 → 悬停揭示」的仪式，成本高、回报低，且要求访客先付出一次滚动才知道站里有没有东西。

采用的构图是「保留现有密集星场 + 底部四列索引条」，两者通过悬停双向联动。星场只负责氛围，索引条只负责信息，联动把它们缝在一起。

### 明确保留不动

星场的 340 颗星（`CONSTELLATION_STAR_COUNTS.high`）、邻近星网连线（`createConstellationWebPositions`）、鼠标视差、自定义光标环——一律不改。用户明确要求保持现有密度。

## 页面骨架

首页成为一个不滚动的两行网格：

```
main.homePage  (block-size: calc(100svh - 5rem)，固定高，非 min-height)
├─ 星场区   minmax(0, 1fr)   ← 星空（layout 级 canvas）+ manifesto + meta
└─ 索引条   auto              ← 四列项目索引
```

因为总高固定，索引条必须有高度上限，否则长 statement 换行会挤压甚至挤爆星场区。约束：索引条 `max-block-size: 22svh`（移动端 2×2 网格下 `28svh`），statement 用两行截断（`-webkit-line-clamp: 2`）。星场区用 `minmax(0, 1fr)` 而非 `1fr`，确保它可以被压缩而不撑破容器。

manifesto 与 meta 定位在星场区内，距区块下边缘 `clamp(2rem, 6vh, 4rem)`、距左边缘 `max(1rem, var(--page-gutter))`——不再使用 `align-items: flex-end` 贴边。

具体改动：

1. `src/styles/universe-pages.module.css` — `.homePage` 的 `min-block-size` 改为 `block-size`；移除 `:global(#main-content).homePage` 上的 `padding-block-end`（`.ecosystemPage` 保留该规则，它仍需滚动）。
2. `src/components/constellation/constellation-facade.module.css` — `.door` 去掉 `align-items: flex-end`，manifesto 与 meta 按上文约束定位，不再贴盒子底边。
3. `src/app/layout.tsx` — `SiteFooter` 改为条件渲染，首页不渲染。footer 内的 Home / Arc / Rialo 在站点 header 中已存在，`Back to top` 在不滚动的页面上无意义，实际信息损失仅一行版权。

## 索引条组件

新增 `src/components/constellation/constellation-index.tsx`，服务端组件，从 `src/content/catalog.ts` 读取数据，渲染 4 个 `<a href="/[ecosystem]/[project]">`。

每列内容：项目名 / **statement** / `生态 · 状态`。

用 `statement` 而非 `tagline`。`src/content/types.ts:65-66` 对这两个字段的定义是：`statement` 是「星座节点与首页使用的一句话判断语」，`tagline` 是「详情页与项目卡片使用的描述性副标题」。数据模型早已为首页留好了这个位置：

| 项目 | statement |
|---|---|
| SIGNAL/LEDGER | Every autonomous action leaves a receipt worth trusting. |
| HADRON | Issue the asset. Watch the market find its price. |
| ArcPredict | Uncertainty becomes a market before it becomes a decision. |
| Rialo Captain | Disruption becomes evidence, settlement, and a clear next move. |

配色沿用 `constellation-model.ts:15-19` 的 `CONSTELLATION_PALETTE`：Arc `#7fb0ff`，Rialo `#e7a94b`。

### 移动端形态

`max-width: 42rem` 下索引条改为 **2×2 网格**，每格只保留项目名 + `生态 · 状态`，statement 隐藏。这样在 667px 高的 iPhone SE 上仍能保住零滚动，且 4 个作品名一眼看完。

## 联动机制

**不需要新建通路。** 现有基础设施已经齐备：

- `src/components/scene/universe-shell.client.tsx` 已有基于 `[data-scene-target]` 的事件委托（`getSceneTargetFromEventTarget`）
- `src/components/scene/scene-target-controller.client.tsx` 已支持 `setPreviewTarget` / `clearPreviewTarget`，并区分 pointer 与 focus 两种 `SceneTargetPreviewSource`
- `src/components/scene/scene-target.ts` 的 `PROJECT_TARGETS` 已列全 4 个 slug，序列化格式为 `project:<slug>`

索引条每个 `<a>` 挂 `data-scene-target="project:signal-ledger"` 即可，悬停与键盘 focus 都会自动驱动星场高亮对应节点，走的是详情页正在用的同一条通路。

### 双向

- **索引条 → 星场**：悬停/聚焦某列，对应节点放大发光、浮出项目名、星座主连线点亮。
- **星场 → 索引条**：悬停某节点，浮出项目名并高亮索引条对应列；点击进入该项目详情页。需要在星场中加入 raycasting 拾取。

### 焦点归属

键盘焦点**统一由索引条承担**，星场节点不进 Tab 顺序。避免同一导航目标出现两个 tab stop。这与现有 e2e 断言「canvas 不进 tab 顺序」一致。

### 触屏行为

`pointer: coarse` 下没有悬停态，因此：星场节点**单击直接进入详情页**，不经过「先浮出名字再点」的两段式；索引条不显示悬停高亮，但链接照常可点。自定义光标环在触屏下已经是 `display: none`（`constellation-facade.module.css` 现有规则），维持不变。

## 可访问性与降级

索引条是 SSR 的纯 `<a>`，这让三条降级路径都从「补丁」变为「主路径」：

| 场景 | 当前 | 改后 |
|---|---|---|
| 无 JS | 仅 `.noScriptLinks` 备用列表 | 索引条本身即 SSR 链接，直接可用 |
| 无 WebGL | 星空塌为 `StaticUniverseFallback`，导航靠 sr-only 链接 | 索引条照常渲染，导航完整 |
| `prefers-reduced-motion` | 静态星图 | 静态星图 + 索引条，联动高亮改为无过渡即时切换 |

因此可以清理两处历史包袱：

- `constellation-facade.module.css` 的 `.semanticLinks`（`clip-path: inset(50%)` 的 sr-only 链接组）整体删除——索引条本身就是可见的语义化导航。
- `.noScriptLinks` 相应简化。

对应地，`constellation-links.tsx` 中 `ConstellationSemanticLinks` 的用途消失，需一并处理。

## 需要迁移的现有测试

零滚动会撞坏两处 e2e。这两处保护的都是真实能力，必须迁移而非删除。

**`tests/e2e/progressive-enhancement.spec.ts:987`** — 该用例在 `/` 上滚轮 420px 并断言 `scrollY > 0`，用以证明 canvas 未劫持滚轮、滚动仍是 DOM 原生。首页零滚动后此断言必然失败。该能力需迁移到仍会滚动的路由（`/about` 或项目详情页）验证。同一用例中「canvas 不进 tab 顺序」的断言与新设计一致，可留在首页。

**`tests/e2e/progressive-enhancement.spec.ts:82` 的 `establishSceneOutsideViewport`** — 该 helper 依赖 `footer.site-footer` 滚到底以把场景层推出视口。首页既不滚动也不再渲染 footer，helper 在首页失效，所有在首页调用它的用例需改用其他路由。

## 新增测试

- 单元：索引条渲染 4 个链接、`href` 正确、`data-scene-target` 值合法、生态配色分组正确、渲染的是 `statement` 而非 `tagline`。
- 单元：`constellation-facade.test.tsx` 中与「门面不显示作品名」相关的断言需随新方向调整。
- e2e：首页零滚动断言（`document.documentElement.scrollHeight <= window.innerHeight`），桌面与 375×900、375×667 两档移动视口各验证一次。
- e2e：索引条悬停触发星场高亮；星场节点点击进入详情页。
- e2e：无 JS 下索引条链接可用。
- axe：首页无新增可访问性违规。
- 预算：`scripts/check-budgets.mjs` 与 `lighthouserc.json` 继续通过。

## OpenSpec 处置

直接修改 active 的 `redesign-home-constellation`，不新建 change。该提案的两条被推翻的承诺从未落地，为未落地的提案再建提案去推翻它，只会在 archive 中留下两份互相矛盾的历史。

**`proposal.md`** 需改写：
- 第 8 行「门面阶段不显示作品名」——推翻
- 第 10 行「新增『下滑进入』转场」——删除
- 第 11 行「星座即导航……悬停/键盘聚焦浮出项目名」——改写为首屏即导航 + 索引条双向联动

**`tasks.md`** 第 5 章处置：

| 原任务 | 处置 |
|---|---|
| 5.1 滚动飞入转场 | 删除 |
| 5.2 星座重排为导航布局 | 改写：节点自首屏即为导航目标 |
| 5.3 节点 hover/focus 揭示 | 改写：与索引条双向联动 |
| 5.4 方向键在节点间移动 | 删除，焦点统一由索引条 Tab 承担 |
| 5.5 激活节点进详情页 | 保留 |

新增任务：索引条组件、布局修复（三处 CSS/layout 改动）、footer 条件渲染、sr-only 链接清理、星场 raycasting 拾取、上述测试迁移与新增。

**spec delta** 需同步更新 `progressive-visual-experience` 与 `project-universe-navigation` 两个能力：前者删除「下滑飞入转场」相关需求，后者将进入路径从「门面 → 下滑 → 星座导航 → 详情」改为「首屏星场 + 索引条 → 详情」。

## 设计稿

可交互原型保存在 `.superpowers/brainstorm/55741-1785330365/content/layout-v2.html`（该目录已被 `.gitignore` 忽略，不入库）。
