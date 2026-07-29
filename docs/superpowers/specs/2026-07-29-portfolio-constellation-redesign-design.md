# 设计文档：门面星座 · 个人作品集重设计

- 日期：2026-07-29
- 状态：已通过 brainstorming 验证，待用户复核
- 相关代码：`src/app/(immersive)`、`src/components/stage`、`src/components/ecosystem`、`src/content/catalog.ts`

## 1. 背景与目标

现有首页是"仪表台（instrument stage）"式的项目浏览器：一进站就把 4 个项目列成 reel、显示当前项目大标题、给出直达链接。用户对其排版与整体气质不满，核心诉求：

- **门面**：首页要大气、有分量，**一上来不介绍作品**，点/滑进入后才展示。
- **气质**：要"真正的现代高科技炫酷"（可交互 3D/粒子/运动），**而不是** AI 味的静态渐变发光球，也不是朴素 HTML。
- **克制**：字体要少（一种为主）、文字少、留白多。
- **面向未来**：作为个人各类项目的长期"展览"，需可扩展。

## 2. 设计方向：Deep-Space Constellation（深空星座）

首页是一片**可交互的 3D 星空**。用户造过的每个东西是星空中的一颗发光节点；门面只呈现星空本身（不列作品名），下滑后镜头飞入，星座成为导航，逐个点亮作品。这一隐喻天然扣题"我造过的东西的宇宙"，且可无限扩展（加项目=加一颗星，加生态=加一片星团）。

已用实时原型验证并锁定的核心决策：

- 视觉：冷蓝星场 + 星座连线 + 发光节点，扁平无渐变堆叠，无"AI 发光球"。
- 字体：**Chakra Petch** 作主展示字；**Geist Mono** 作仪器读数/标签/导航（项目已自带 Geist 家族）。
- 交互手感：`responsiveness = 0.28`、`sensitivity = 1.0`（缓动插值、GPU 合成、光标略比星场更贴手）。
- 进入方式：**下滑滚动**触发镜头飞入与转场。
- 进入后：**星座即导航**（不是列表页）。

## 3. 视觉语言

- **画布**：近黑冷底 `#05060a`。扁平，无大范围渐变装饰。
- **点缀色（按生态）**：Arc = 冷蓝 `rgb(127,176,255)`；Rialo = 琥珀 `#e7a94b`。仅用于该生态的星团、节点辉光与强调。
- **文字色**：冷白 `rgba(226,236,252,.92)`；次级 `#7d879b`。
- **字体**：Chakra Petch（大标题/项目名）+ Geist Mono（标签、坐标、导航、节点读数）。**不再混入衬线，不再用全大写 HUD 噪点标签群**。
- **动效**：慢速自转 + 鼠标视差 + 缓动跟随；节点靠近渐亮；页面间电影式渐隐。尊重 `prefers-reduced-motion`。
- **光标**：自定义冷色环，靠近节点放大点亮。

## 4. 信息架构与页面流

```
门面首页 (/)
  └─ 星空（不列作品，只有发光节点） — 下滑 →
      星座导航（同页转场 / 镜头飞入）
        · 4 节点 = 4 作品，按生态分两簇（Arc 冷蓝 / Rialo 琥珀）
        · 悬停/聚焦节点 → 浮出 名字 + 一句话 + 生态/状态
        · 点击节点 →
            项目详情 (/[ecosystem]/[project])
```

- 保留现有路由：`/[ecosystem]/[project]` 详情、`/about`。
- 生态在首页表现为**视觉星团**，不再是独立"两个世界"的重排页；`/[ecosystem]` 路由保留为该星团的聚焦/过滤视图（可后续阶段完善）。
- 扩展：新增作品 = catalog 加一条 = 星空多一颗节点；新增生态 = 多一片星团与一个点缀色。

## 5. 各部分详细

### 5.1 门面首页（/）
- 全屏 3D 星场（R3F）：约 260–300 星点 + 阈值星座连线 + 4 个发光 hero 节点（对应 4 作品，但**不显示名字**）。
- 居中 wordmark「CAPTAIN DOCK」（Chakra Petch），`mix-blend: screen` + 微光，星光透字，随鼠标反向视差轻移。
- 副标题（Geist Mono）、极简顶栏（wordmark · Work · About）、底部「scroll to enter ↓」。
- 交互：鼠标偏移星场（手感参数如上）；靠近某 hero 节点其渐亮（暗示"这里有东西"，但门面阶段不揭示名字）。

### 5.2 星座导航（进入后）
- 下滑触发：镜头平滑飞入星场，节点重新编排为可导航布局，两簇按生态分色。
- 每个节点：悬停/键盘聚焦 → 浮出 项目名（Chakra Petch）+ 一句话 tagline + 生态/状态标签（Geist Mono）。
- 点击/回车 → 进入该项目详情，配电影式渐隐转场。
- Rialo 仅 1 个节点时自然成立（单星），无需退化逻辑。

### 5.3 项目详情（/[ecosystem]/[project]）
- 沿用现有丰富结构化内容（summary、coreLoop、evidence、stack、gallery、limits、liveUrl），**只换新视觉语言**。
- 顶部：整屏大图 hero（用 `gallery` 那张图满幅发挥）+ 标题压暗角 + 生态点缀色 + 状态 + 「Open live ↗」。
- 正文：编辑式章节——概述 → 核心循环（编号序列）→ 证据 → 技术栈 → 边界说明。
- 返回：「back to constellation」，镜头飞回星空。

### 5.4 About（/about）
- 同一深空语言的极简排版，一种字体为主。

## 6. 技术方案

- **3D**：React Three Fiber + three + drei（项目已装）实现星场，比原型的 canvas 更精致（真 3D 点云、辉光/后期、平滑相机）。`motion` 负责 UI 转场。
- **性能**：`devicePixelRatio` 上限 2；节点数适度；连线 O(n·k) 限邻域；进入视口再挂载重场景；尊重性能预算（`scripts/check-budgets.mjs`、`lighthouserc.json`）。
- **降级与可访问性**：
  - `prefers-reduced-motion`：停用自转/视差，改静态星图。
  - `<noscript>` / 无 WebGL：回退到语义化的作品与生态链接列表（现有 noScriptRail 思路保留）。
  - 键盘可达：节点为可聚焦控件，方向键在星座间移动、回车进入（沿用现有 reel 的键盘模型）。
  - 保留 SEO：`metadata`、`JsonLd`、`sitemap`、`opengraph-image` 不动。
- **内容**：继续以 `src/content/catalog.ts` 为唯一数据源；类型 `src/content/types.ts` 视需要为节点新增 `tagline`（首页已有 `projectStatements` 可迁入 catalog）。

## 7. 对现有代码的改造

- **替换**：`home-instrument-stage.tsx` / `instrument-stage` 由星场组件取代；`ecosystem-hero`/`ecosystem-index` 按新语言重造型。
- **保留**：路由骨架、`catalog`、`metadata`/SEO、`site-header`/`site-footer`（重新造型）、`project` 详情内容结构。
- **测试影响**：`src/styles/design-contract.test.ts`、`src/styles/font-contract.test.ts`、`src/content/*.test.ts` 需随新令牌/字体契约更新；补 3D 组件的可访问性与降级测试（Playwright + axe）。

## 8. 分期实施建议

1. **第一期（门面 + 星座导航）**：新首页星场、wordmark、下滑转场、星座即导航、键盘/降级/noscript、令牌与字体契约更新。落地即可见"门面"效果。
2. **第二期（详情与生态）**：详情页新造型（整屏大图 + 章节）、`/[ecosystem]` 聚焦视图、About。
3. **第三期（打磨）**：辉光/后期、转场细节、性能与 Lighthouse 调优。

## 9. 风险与待定

- WebGL 性能与 Lighthouse 预算需持续校验（低端设备回退策略要早做）。
- 详情页整屏大图**依赖高质量作品截图**（当前每项目约 1 张），第二期前需确认素材。
- 手感参数已定 0.28 / 1.0，但飞入转场的时长/缓动曲线待实现时微调。

## 10. 后续流程

本设计通过后，按项目 OpenSpec 工作流创建变更提案（proposal + tasks + delta spec）再进入实现（第一期先行）。
