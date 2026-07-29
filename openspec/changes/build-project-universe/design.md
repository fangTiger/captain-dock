## Context

当前仓库尚未建立前端工程，只包含用户已有的示例 `main.py`、工具配置和本次 OpenSpec 变更。四个需要整合的作品已经分别部署，相关截图与说明存在于四个本地项目中；这些项目只作为内容来源，不应成为新站点构建时的文件系统依赖。

已确认的产品方向是“个人数字宇宙”：首页建立统一世界观，`/arc` 与 `/rialo` 作为生态入口，四个项目使用独立详情路由和统一案例案卷模板。视觉需要具有空间感，但站点首先是可索引、可阅读、可访问的作品集，而不是依赖 WebGL 才能操作的 3D 展厅。

本变更属于跨路由、内容、3D、SEO、无障碍和构建质量的大型新能力。当前不存在 Graphify 图谱或报告，因此影响分析降级为基于空仓库、已确认设计、四个项目资料和 OpenSpec 的人工分析；实现形成模块结构后应重新生成图谱。

## Goals / Non-Goals

**Goals:**

- 使用一个类型安全的内容目录生成八个已确认的公开路由。
- 让首页、Arc、Rialo 与四个项目详情既属于同一门户，又具有可辨识的生态/项目视觉。
- 保证正文、导航和 CTA 由 Server Components 输出的 HTML 承载，3D 只做渐进增强。
- 使用单一的沉浸式 Canvas 在首页、Arc 和 Rialo 之间保持空间连续感，并避免项目卡片或详情页创建多个 WebGL 上下文。
- 在减少动态效果、节省数据、低性能、WebGL 不可用和 Canvas 故障时提供等价静态体验。
- 在首版建立响应式、WCAG 2.2 AA 基线、SEO、外链安全、自动化测试与性能预算。
- 产出可在最终确认后部署到 Vercel 的应用，但本变更不执行生产部署。

**Non-Goals:**

- 不建设账号、CMS、后台、数据库、搜索、评论、联系表单或多语言路由。
- 不实时抓取外部项目状态或业务数据，不让外站可用性影响本网站构建。
- 不使用 iframe，不复制四个项目的完整应用代码，不公开本地绝对路径。
- 不使用大型 GLB、物理引擎、自由镜头、全 3D 文字导航或滚动劫持。
- 不建设通用页面搭建器、插件系统、PWA 或分析/监控平台。
- 不在用户确认最终效果前创建 Vercel Production 部署。

## Decisions

### 1. 使用 Next.js App Router 的静态内容架构

采用当前 Active LTS 的 Next.js 16.2 安全补丁版本、React 19.2、TypeScript 和 App Router。公开内容没有运行时数据源，页面在构建时静态生成；不启用 `output: 'export'`，以保留 Vercel 图片优化、路由元数据和未来 OG 能力。

`generateStaticParams()` 从内容目录生成生态与项目路由，`dynamicParams = false` 与 `notFound()` 阻止未知 slug 被运行时渲染。`generateMetadata()`、`sitemap.ts` 与页面导航读取同一目录。

备选方案：

- 每个路由独立手写：艺术自由度高，但路由、SEO、导航和内容重复，新增项目成本高。
- MDX 或 Headless CMS：适合大量长文章或多人编辑，但首版只有四个项目，依赖和内容治理过重。

选择类型化目录与通用模板，在内容增长到约 12 个长案例或需要非开发者编辑前不引入 CMS/MDX。

### 2. 用 Route Group 隔离沉浸式与案例路由

建议目录：

```text
src/app/
  layout.tsx
  (immersive)/
    layout.tsx
    page.tsx
    [ecosystem]/page.tsx
  (case-files)/
    [ecosystem]/[project]/page.tsx
  (content)/
    about/page.tsx
  sitemap.ts
  robots.ts
  not-found.tsx
  error.tsx
```

`(immersive)` 布局只覆盖 `/`、`/arc` 与 `/rialo`，其 `UniverseShell` 在这三个路由之间保持一个 Canvas。项目详情与 About 位于其他 route group，不下载或挂载完整 3D 世界，只使用轻量 CSS/SVG 签名视觉。Route Group 不改变公开 URL。

备选方案：

- 每页独立 Canvas：生命周期简单，但生态导航会反复初始化 WebGL，空间连续感较弱。
- 根布局全站常驻 Canvas：过渡最连续，但会让 About 和详情页承担无关的 3D 代码与 GPU 成本。

折中方案把“单 Canvas”限制在三个真正沉浸式的入口路由。

### 3. Server Components 为默认，交互下沉到 Client Island

页面结构、项目内容、元数据、图片和主要 CTA 使用 Server Components。仅以下部分使用最小 Client Component：

- `UniverseShell`、场景路由、质量控制与 Canvas 错误边界。
- Rialo 五阶段状态切换和项目闭环的可选增强。
- DOM 路由过渡、图库灯箱等确实需要浏览器 API 的交互。

`next/dynamic({ ssr: false })` 只在 Client 包装器内加载 R3F 场景。静态 fallback 由服务端先输出，Canvas 成功绘制首帧后再视觉替换。

### 4. 内容目录是路由、页面和 SEO 的唯一事实源

建议模型：

```ts
type Ecosystem = {
  slug: 'arc' | 'rialo'
  name: string
  index: string
  statement: string
  description: string
  theme: EcosystemTheme
  scenePreset: 'arc-orbit' | 'rialo-radar'
  seo: SeoFields
}

type Project = {
  slug: 'signal-ledger' | 'hadron' | 'arcpredict' | 'rialo-captain'
  ecosystem: Ecosystem['slug']
  name: string
  tagline: string
  summary: string
  status: readonly ProjectStatus[]
  liveUrl: `https://${string}`
  roles: readonly string[]
  tags: readonly string[]
  coreLoop: readonly CoreLoopStep[]
  evidence: readonly EvidenceItem[]
  stack: readonly StackLane[]
  gallery: readonly ProjectImage[]
  limits: readonly string[]
  theme: ProjectTheme
  seo: SeoFields
}
```

公开目录不保存 `/Users/captain/...` 等本地路径。素材从现有项目中人工筛选、脱敏、裁切和复制到当前仓库后，以静态导入引用。必填字段、唯一 slug、生态归属、HTTPS 外链、替代文本和八条路由由单元测试验证。

### 5. 案例页使用三章骨架，签名模块表达差异

Task 14 supersede 早期七段同权 dossier。详情页当前固定阅读顺序为：

1. Hero：项目名、短判断、状态边界、唯一主要在线入口和项目签名。
2. `Problem`：核心矛盾、必要约束与限制。
3. `Mechanism`：不超过五步的核心闭环；技术栈与次级边界可使用默认收起但键盘可达的渐进披露。
4. `Proof`：至少三组“能力主张 + 真实界面/可追溯说明 + 用户动作 + 可验证结果”及必要 gallery。
5. 返回生态与下一项目导航。

主叙事只有 `Problem / Mechanism / Proof` 三个同权章节。约 70% 结构统一、20% 主题令牌、10% 项目专属签名模块。SIGNAL/LEDGER 使用账本扫描与 Receipt，HADRON 使用资产行与订单簿，ArcPredict 使用概率弧与挑战窗口，Rialo Captain 使用航线与反应式任务轨。

### 6. 3D 使用程序化单 Canvas 宇宙

技术选择为 `three`、React 19 对应的 `@react-three/fiber`、按需使用 `@react-three/drei`，DOM 动效统一使用 `motion/react`。首版不引入 Zustand；URL 是场景身份源，局部 reducer/context 只保存过渡阶段、活动项目和质量档位。

场景结构：

```text
UniverseShell
├─ CapabilityGate
├─ StaticUniverseFallback
└─ UniverseCanvas
   ├─ SharedUniverse
   ├─ CameraRig
   ├─ SceneRouter
   │  ├─ HomeAstrolabe
   │  ├─ ArcOrbitalCircuit
   │  └─ RialoReactiveField
   ├─ TransitionController
   └─ QualityController
```

- 首页是一台项目星盘：Arc 与 Rialo 为两套轨道，四个项目为信标。
- Arc 是同一回路中的账本环、订单簿平面和概率分岔透镜。
- Rialo 是雷达航迹，依次表达 Observe、Cover、Trigger、Settle、Explain。
- 重要文字和操作均位于 DOM；Canvas 为 `aria-hidden` 且不获取键盘焦点。
- 主要使用实例化几何、线段、平面和一个共享脉冲 shader；默认无动态阴影，只有高质量档允许一个轻量后处理。

### 7. 质量控制采用 High / Medium / Low / Static 四级

初始等级综合视口、`prefers-reduced-motion`、`navigator.connection.saveData`、WebGL 能力和用户选择。移动端从 Medium 开始，不简单按设备类型全部禁用 3D。

- High：DPR ≤ 1.5，完整程序化几何、稀疏粒子和可选单个 Bloom。
- Medium：DPR ≤ 1.25，无后处理，粒子与几何减半。
- Low：DPR 1，仅基础几何，`frameloop="demand"`。
- Static：SVG/CSS 星盘或雷达，不加载非必要 Three 场景模块。

运行期连续两个采样窗口低于 24 FPS 时降一级，Low 仍持续低于 18 FPS 时进入 Static；单次会话只自动降级，不自动升级，避免质量振荡。页面不可见、Canvas 离开主要视区或场景稳定后暂停持续渲染或切到按需渲染。

预算目标：

- 3D 增量 JavaScript gzip ≤ 260 KiB，单路由场景 chunk ≤ 45 KiB。
- 桌面/移动 draw calls 分别 ≤ 70/40，可见三角形 ≤ 120k/50k。
- 首屏 3D 资产传输桌面 ≤ 450 KiB、移动 ≤ 250 KiB。
- LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1。

### 8. 路由过渡不能成为导航阻塞

沉浸式路由使用 `idle → departing → swapping → arriving` 状态机。普通链接保留真实 `href`；离场最多 180ms，进入 360–420ms，总等待不得超过 700ms。快速连续导航取消旧 transition token，后退/前进不被拦截。减少动态效果时立即导航，只保留可选的短透明度变化。

Canvas 不捕获全页滚轮或触摸。滚动叙事使用正常文档流与 Intersection Observer，不使用强制滚动吸附。

### 9. 样式、字体和媒体采用可控的本地资产

使用 CSS Modules、全局 CSS 自定义属性、cascade layers 与 container queries；不引入通用组件库或 Tailwind，以保留项目特有的编辑部/工业仪器语言并减少运行时代码。

字体使用 `next/font/local` 加载仓库内开源 WOFF2：展示字体、正文无衬线和等宽数据字体各一套，并保留许可证文件；中文使用系统 CJK fallback，首版不建立多语言路由。

截图使用静态导入与 `next/image`，声明真实宽高与 `sizes`。每页只有 LCP 媒体优先加载，图库默认延迟加载；§21.2 为唯一例外，允许每个详情页的一张现有代表性证据 WebP 确定性 eager 加载但禁止 priority/preload。禁止热链原站截图。代表性素材来源：

- SIGNAL/LEDGER：实时研究、Agent Log、TX Feed 与预算。
- HADRON：市场列表、订单簿、成交/持仓与 API。
- ArcPredict：市场、Oracle/挑战路径和 AI Lens 边界。
- Rialo Captain：航班风险、保障、自动结算和 Evidence/Copilot。

### 10. SEO、安全与错误隔离

- 根布局使用 `NEXT_PUBLIC_SITE_URL` 生成 `metadataBase`；生产部署前必须配置正式域名。
- 首页、生态和项目页面分别生成唯一 title、description、canonical、OG/Twitter 信息与 JSON-LD。
- `sitemap.ts` 只输出八个公开路由，`robots.ts` 指向正确站点地图。
- 外链组件统一保证 HTTPS、`noopener noreferrer` 和可访问名称。
- `next.config.ts` 设置 `nosniff`、严格 referrer policy、限制 Permissions Policy，并配置不允许对象、base 劫持和 framing 的 CSP 基线。
- 路由错误由 `not-found.tsx`/`error.tsx` 隔离；WebGL 错误只切换静态 fallback，不影响正文。
- 构建时不探测四个外部站点的在线状态。

### 11. 测试遵循内容优先的 RED-GREEN-REFACTOR

- Vitest：目录 schema、路由派生、元数据、质量等级与状态机纯函数。
- Testing Library：卡片、外链、Rialo 五阶段、静态 fallback 和焦点同步。
- Playwright：八个路由、404、键盘、320/375/768/1440 响应式、减少动态效果、WebGL 不可用和快速路由切换。
- `@axe-core/playwright`：代表页面不得有 serious/critical 违规。
- Lighthouse CI：Performance ≥ 90，Accessibility/Best Practices/SEO ≥ 95，并执行资源预算。
- `npm run verify` 串联 lint、typecheck、unit、build、E2E、a11y、链接与性能门禁。

确定性视觉回归使用 Static 模式截图；WebGL 只做结构、首帧和宽松的无错误检查，避免不同 GPU 抗锯齿造成误报。

### 12. 2026-07-24 A 版原型是历史构图基线

用户于 2026-07-24 否决首轮实现，并明确选择方案 A。两份原型建立了机械观测语言、无卡片墙、字体层级、控件权重和项目签名母题；Task 12/13 已据此完成工程实现。

历史参考：

- 首页与 Arc：`project-universe-design.html`，SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`。
- Rialo 与项目详情：`rialo-detail-design.html`，SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`。

Task 14 supersede 该原型的 `1200:720 Instrument Stage` 固定构图、三行首页标题、六槽舞台、七段详情层级和 600–800ms 动效尺度；这些不再是当前视觉事实源。继续保留的边界为：

- 首页、Arc、Rialo 使用同源机械观测语言、无边界背景和单一沉浸式 Canvas。
- 首页保留两个生态与四项目的语义化发现能力；Arc 保留三状态；Rialo 保留五阶段。
- 展示标题使用 Georgia/Times 系衬线体，正文与等宽数据继续使用本地 Geist/Geist Mono；等宽标签允许 `.08em–.13em` tracking。
- 背景采用克制网格、局部辉光、细描边和极少阴影；删除 SaaS 式厚重面板、blur 和大卡套小卡。
- 项目详情保留真实内容、签名 SVG、唯一主要 CTA 和 cold-route 无 Canvas 边界。
- `≤560px` 使用专门的精简移动结构，不把完整桌面舞台简单堆叠。
- 八路由、全英文、真实链接、SEO、安全、性能、键盘、Static/reduced/saveData/WebGL fallback 契约继续有效。

### 13. 公开表面只使用英文

全英文范围包括可见文本、隐藏 accessible text、aria、alt/caption、metadata、OG/Twitter、JSON-LD、404 和错误状态。根 HTML 与结构化数据统一声明 `en`。

内部中文文档、测试说明和代码注释可以保留，但生产 HTML、metadata 和结构化数据必须通过 Han 字符门禁。翻译不得改变 slug、项目顺序、状态、live URL、事实边界或 schema。

### 14. 控件体系只表达四种权重

不引入组件库，使用小型本地 primitive：

- `quiet-nav`：全局导航与页脚。
- `primary-action`：每个首屏唯一主 CTA。
- `secondary-action`：次级站内或安全外部链接。
- `stage-selector`：Arc 三状态和 Rialo 五状态领域控制。

ExternalLink 继续独占 HTTPS、`target="_blank"`、`noopener noreferrer` 与可访问的外部站点提示。Canvas 仍不承载唯一操作，领域选择器使用真实按钮和键盘状态。

### 15. A 版舞台演进为无边界电影化画布

用户在 2026-07-25 的本地视觉验收中确认：A 版已经建立正确的机械观测语言，但主舞台外框、内缩框、读数框和项目签名双层边界过强，使页面看起来像“装置被装进盒子”，而不是全站背景、3D、仪器和内容共同构成一张画布。

本轮采用 `borderless cinematic canvas` 为主方向，并吸收 `open instrument rails` 的结构秩序：

- `InstrumentStage` 继续作为语义和响应式布局 owner，但不再绘制闭合外框、不透明面板底色或内缩完整矩形。
- 全站背景网格、局部辉光、Static fallback 和 Canvas 可以穿过舞台区域；内容可受最大宽度约束，但视觉场域不得被该宽度画成封闭盒子。
- 首页项目入口从常驻矩形卡片改为节点、编号、短引线和开放式标签；hover / focus 时才允许出现局部底板或强调轨。
- Arc 与 Rialo 的 readout 删除四边框，使用单侧强调轨、数据基线和唯一主要 CTA；selector / timeline 只保留分段线、活动刻度和状态灯。
- 项目详情继续不加载完整 Canvas；签名模块删除最外层强框和 diagram 重复外框，保留账本、订单簿、概率或航线的内部轴线、网格、信号线和标签基线。
- 章节分隔、内部仪器圆环、坐标轴、focus outline 和主要 CTA 边界属于必要结构，可以保留；任何四边闭合边界都必须证明其操作或信息语义。
- `≤560px` 不显示贯穿首屏的左右舞台竖框；使用正常文档流、开放式节点和局部结构线。

该决策不改变路由、内容模型、场景身份、项目顺序、CTA 目标、SEO、外链安全或 Canvas 生命周期。

### 16. 动效从“低频装饰”升级为“有限叙事事件”

Task 13 已实现 720ms 入场、12–24s 环境循环和 180–280ms 交互反馈，但用户实测仍感知为静态页面。原因不是动效数量不足，而是 3D 只做低幅装饰、项目切换主要替换颜色和文字、路由直接更换 DOM，缺少可辨认的空间事件。

本轮不把 Canvas 改回长期 60fps，而是重新分配动效尺度：

1. **首屏建立空间**：标题、活动项目、机械核心和索引在 1000–1400ms 内完成一次可中断编排；语义内容、主要 CTA 与项目索引从首帧起可读可操作，不等待动画结束。
2. **项目/阶段 morph**：committed selection 变化时，在 650–900ms 内同时改变主体尺度、位置、轨道构型、相机偏移或能量路径；只换颜色或文字不满足该契约。
3. **短时预览**：hover 与 focus 在 180–260ms 内只预览装饰性项目色、引线、fallback highlight 或 Canvas 响应；离开后回到 committed selection。preview 不更新语义标题、主要 CTA、`aria-pressed/current` 或 live region。
4. **路由 handoff**：沉浸式路由复用单 Canvas 和现有 transition token，在总计 500–700ms 内完成可取消的 depart / morph / arrive；进入详情时使用相同项目色与签名母题制造感知连续，不把完整 Canvas 带入详情。
5. **环境呼吸**：同屏最多保留一个 6–10s 的主环境运动和一个低幅辅助源；Canvas 不得为了装饰循环长期保持 `frameloop="always"`。
6. **静态终态**：`prefers-reduced-motion: reduce`、saveData、Low/Static 或 WebGL 不可用时关闭持续旋转、视差、镜头和位移 morph，直接呈现完整终态；可选状态淡入不得超过 240ms。

页面隐藏、场域离开视口或运行时性能回退时继续暂停。不得动画大面积 blur、filter 或造成布局变化的属性；不得自动轮播、强制 snap、拦截全页滚轮或触摸。

### 17. Living Monument 以 committed scene target 连接 DOM 与 3D

Home、Arc 与 Rialo 继续共享现有单 Canvas，但现有 `data-scene-target` 仅作为 pointer/focus 临时预览，无法承载稳定的活动项目。本轮在现有 `SceneTarget` union 之上增加三层状态：

- `committedTarget`：当前项目或阶段，是 DOM 标题、主要 CTA、Static fallback 和 Canvas 的稳定事实源。
- `previewTarget`：pointer/focus 的短时预览；清除后回到 committed target。
- `effectiveTarget`：`previewTarget ?? committedTarget ?? routeDefaultTarget`，是场景渲染的唯一输入。

Home 默认 committed target 为 SIGNAL/LEDGER，Arc 默认选择 Research / SIGNAL/LEDGER，Rialo 默认选择 Observe。真实 button/link 仍承担所有操作；Canvas 保持 `aria-hidden`、不获取焦点、不捕获 pointer/wheel。

只有 committed target 可以更新语义标题、主要 CTA、`aria-pressed/current` 和 live region；一次 commit 最多产生一次状态播报。preview 只更新装饰性 DOM、Static fallback highlight 和 Canvas，不产生辅助技术播报。

target 变化只启动一个有限时长 morph burst。场景在插值未完成时主动 `invalidate()`，完成后重新稳定在 demand；页面隐藏、Low/Static、reduced-motion 或卸载会立即终止 burst。现有 transition token、快速导航取消、单 Canvas 与运行时降级契约继续生效。

### 18. 页面从“完整说明书”改为“一屏一个主角”

统一构图原则为：每个首屏只保留一个视觉主角、一句核心判断和一个主要动作。

- **Home**：近单屏 Project Reel 一次突出一个项目，3D/静态机械主体占据主要视觉面积；四项目和 Arc/Rialo 入口始终以紧凑语义索引可发现。删除首屏后的 Ecosystems 长说明、四张 dossier 卡墙与 About 解释段。
- **Arc**：三种项目状态是同一价值机器的三次构型变化。标题压缩为一句；只显示活动项目 readout 和主要 CTA，不再在首屏后重复完整项目卡与 route 说明。
- **Rialo**：五阶段形成一次连续事件；五个阶段名称持续可发现，但只展开当前阶段说明。Trigger 必须产生全页最强的有限叙事事件。因为 Rialo 只有一个项目，删除 `Projects in Rialo` 与 `1 project indexed` 重复区块。
- **详情页**：继续不加载完整 Canvas，把长 dossier 重组为 `Problem / Mechanism / Proof` 三个主章节。核心闭环与技术栈进入 Mechanism，真实 evidence/gallery 进入 Proof，限制与次级技术事实使用可访问的渐进披露；live URL、状态边界、返回生态和下一项目保持可见。

内容删减只作用于重复表达，不改变 catalog 事实、项目顺序、真实链接、状态说明、SEO 或证据真实性。桌面首屏同时可见的英文文本目标为 60–90 words，390px 移动端为 30–45 words；完整语义索引与辅助说明可以在正常文档流或渐进披露中继续访问。

JS 增强态的项目/阶段 selector 使用真实 button，Enter/Space 只 commit，活动项目的唯一主要 CTA 使用真实详情 link。无 JavaScript 时，Home 显示四项目与两生态的可见真实链接，Arc 显示三个项目的可见真实链接，Rialo 显示唯一项目的可见真实链接；不得用 `display:none` 的必需内容伪造可发现性。

### 19. 详情使用感知连续而非全站 Canvas

UniverseShell 仍只位于 `(immersive)` route group。四个详情页继续使用项目专属的轻量 SVG/CSS signature，从沉浸式页面进入详情时通过项目 accent、motif、遮罩方向和入场尺度形成 handoff。

不把 UniverseShell 提升到根布局，原因是：

- 详情页属于 cold routes，不应承担现有约 250KiB 的 3D 增量包。
- 当前预算、Static fallback、无 WebGL 和无 Canvas 测试已经稳定。
- 真正的跨 route shared WebGL 会扩大 scene route、Canvas 生命周期、构建预算和错误边界，不属于最小有效重构。

如果后续必须让详情页共享真实 Canvas，须另行修改 OpenSpec、性能预算与 cold-route 契约，不得在本任务中隐式扩围。

### 20. 专业视觉 NO_GO 后的艺术方向收束

2026-07-27 的真实生产浏览器与专业 Art Director 复核证明，Task 14 当前实现尚未达到用户要求，不能以“结构和测试已通过”替代视觉验收：

- Rialo 的跨 CSS Module slot 选择器没有命中 `InstrumentStage` 的 title、scene、readout 与 index wrapper，桌面被压成约 110px 的列，移动端四个区域重叠；这是阻塞性布局缺陷。
- Arc 与 Rialo 在两秒观察窗口中没有可见像素变化，Home 只有少量细线位移；主体仍像静态黑色模型，缺少尺度、轮廓光与空间姿态。
- eyebrow、巨型 serif 标题、侧轨编号、网格、重复 CTA 和章节边线在所有页面重复出现，形成模板化“AI 作品集”语法。
- 详情页虽然已经归并为三章，但章节高度、标题断词、证据边线和全宽扫描带仍使页面像长报告，而不是电影化案例阅读。

本轮不改变 `Living Monument / Cinematic Project Reel` 的方向，而是执行一次最小的 art-direction recovery：

#### 20.1 共享世界只统一底层语法，不复制同一版式

- Home、Arc 与 Rialo 共享全站背景、字体、低对比网格、开放 datum、项目 accent 与一个 Canvas。
- Home 的主角是缓慢改变姿态的轨道纪念碑；Arc 是具有反向旋转与能量呼吸的价值机器；Rialo 是具有方向性路径脉冲和走廊视差的事件场。
- 三页不得同时重复相同的 eyebrow、侧轨编号、巨型 serif 标题和读数框组合。Home 强调项目名，Arc 强调机器状态，Rialo 强调事件阶段。
- 详情页继承项目 accent 与内部仪器轴线，但不复制沉浸式舞台网格、侧轨或完整 Canvas。

#### 20.2 Rialo 先恢复可靠的版式几何

- 跨 CSS Module 的 slot 定位只使用 `InstrumentStage` 已有的 `data-stage-title`、`data-stage-scene`、`data-stage-readout` 与 `data-stage-index`。
- 在 1440×1000 视口，scene 占舞台内部宽度的 60–70%，readout 保持 28–36ch，标题不得逐字母换行，五阶段 index 位于独立轨道，舞台自身不得被窄列内容撑到超过视口高度。
- 在 390×844 视口，title、scene、readout、index 按正常文档流单列排列，不重叠、不使用负水平 margin，不依靠全局 `overflow-x` 隐藏错误；Radar 不宽于 scene。
- 五阶段的完整 label、description、键盘语义、live region、唯一 CTA 与无 JavaScript 等价文字全部保留。

#### 20.3 每页只让一个判断占据主层级

- Home 可见主层只显示活动项目名、一句项目判断和一个 `Open case file` 动作；四项目与两生态仍作为紧凑语义索引持续可发现，CTA 的可访问名称继续包含项目名。
- Arc selector 的视觉文本优先显示 `Research / Exchange / Forecast`，活动项目名和一句判断只在 readout 出现一次；完整项目名继续存在于可访问名称和无 JavaScript 链接。
- Rialo 的主层只显示活动阶段、一个项目判断和一个 CTA；当前阶段的完整说明保留在可访问的渐进披露或次级层，不能与项目判断同时作为大字号段落。
- 详情 hero 只保留项目名、tagline 和唯一 live CTA。status、roles、tags、stack、limits、core-loop description、evidence description 与 caption 不删除，但移动到原生 `<details>` 或同等可访问的次级阅读层。
- `catalog.ts`、metadata、JSON-LD、路由、项目顺序、真实链接和 no-JS 事实源保持冻结。

#### 20.4 主体运动与光感必须肉眼可见

- Canvas 的 committed morph 继续是 650–900ms 的有限 demand burst；不得为环境装饰改成永久 60fps。
- 环境微动优先作用于 DOM protagonist 及其少量子层，使用 `transform` 与 `opacity`。只有桌面 High/Medium、首屏可见、`data-universe-ready="true"`、`data-universe-render-state="demand"`、`data-universe-morph-phase="idle"`、`data-cinematic-entry="settled"` 且 `prefers-reduced-motion: no-preference` 时运行；每页最多一个 7–10s 主循环和一个更低幅的辅助循环。
- 主体姿态在一个环境周期内应产生约 3–6° 的旋转、8–18px 的位移或等价可辨的尺度/构型变化；不能只旋转细线、替换颜色或移动背景扫描带。
- Home 使用轨道/纪念碑的缓慢姿态变化，Arc 使用核心与外壳的反相位运动，Rialo 使用风险走廊、路线或节点的方向性推进；Trigger 继续保留最强但有限的 committed 事件。
- 当前不存在于 DOM 的 `.arcCore` 与 `.radarSweep` 不得继续作为环境动效完成证据；规则必须绑定 `.homeMachine`、`.arcMachine`、`.radar` 或经测试证明存在的等价 owner。
- 主体边缘使用静态或低成本的 rim/highlight/accent reflection 提高与背景的分离度；全站背景网格与非活动圆环相对当前实现降低约 30–40% 对比度。不得持续动画大面积 blur、filter 或 box-shadow。
- Low、Static、移动端、saveData、页面隐藏、首屏离开视口或 reduced-motion 时关闭持续循环并直接呈现完整终态；所有状态变化继续由真实按钮/链接和首个 ≤200ms 的可见反馈承载。

#### 20.5 详情改成编辑式阅读画布

- `Problem / Mechanism / Proof` 三章继续保留，但章节不再使用巨大固定高度、窄标题列或 `overflow-wrap:anywhere` 制造单词断裂。
- Problem 的主层只保留 summary；limits 进入 Boundaries/Technical notes。
- Mechanism 的主层保留核心步骤名称与内部路径；步骤说明、roles、tags 与 stack 渐进披露。
- Proof 的主层保留证据标题、状态和代表性媒体；较长 description 与 caption 进入次级阅读层。
- 删除 hero 硬分隔、boundary 独立框、loop/evidence 重复边线、signature 外侧轨/双横线和全宽扫描面；保留 focus outline、主要 CTA 边界、章节节奏线、项目专属内部轴、路径、节点、刻度和一个低幅 pulse。

#### 20.6 验收必须同时覆盖静态构图与真实运动

- Static/reduced-motion 原图新增 Rialo 390px，连同 Home、Arc、Rialo 桌面和代表详情页由 Architecture 逐张查看。
- normal-motion 对 Home、Arc、Rialo Cover/Trigger、Home→Arc handoff 保存带真实 offset 的起始/中间/终态；主体必须产生多步空间变化。
- 现有 50ms checkpoint lateness 门槛不得放宽。截图吞吐如果继续超时，应重构为异步证据采集、screencast ring buffer 或等价方案，而不是降低产品动效或验收阈值。
- 独立 Review Codex PASS 后仍须再次经过专业 Art Director 的桌面与移动 NO_GO/GO 决策；只有 GO 才更新给用户查看的 3100 构建。

### 20.7 第二轮专业预检只修复画布边界、明度层级与运动载体

2026-07-28 的第二轮 production 原图预检仍为 `PRELIMINARY NO_GO`，但方向本身不再重做。最小恢复范围固定为：

- Home 与 Arc 的桌面网格、渐变和场景光必须向全站背景自然羽化，不得在内容列起点形成可辨的矩形边缘；详情 hero 不得保留蓝色线性底板的顶边或侧边。
- Home monument 与 Arc machine 使用现有材质和 accent rim 建立“背景—主体—信号”三档明度，不增加新几何，也不得用持续 blur、filter 或 shadow 动画伪造体积。
- 每屏只复用一个现有元素作为方向性辅助运动载体：Home 的 beacon 沿主椭圆推进，Arc 的 signal path 沿当前机器状态推进，详情的 motion trace 沿 signature 路径扫描；主 owner 的 7–10s 环境姿态和所有质量、可见性、saveData、mobile、reduced-motion gate 保持不变。
- 320px 与中间断点必须通过真实内容适配解决溢出：项目名只允许在语义斜杠或自然空格处换行，desktop `SIGNAL/LEDGER` 保持整词单行；不得用全局 overflow 隐藏、逐字断裂或缩小核心仪器规避。
- 自动化不得把有意的 borderless overlap 当作 slot 内溢出，但 document/main 正向溢出、裁切、控件交叠、44px、整词与真实链接门禁继续严格执行。

### 20.8 首帧预编译按浏览器能力分支，冷启动门禁使用完整 Chromium

2026-07-28 的精确 trace 证明，Playwright 默认 legacy `chromium_headless_shell` 在当前 macOS 软件 GPU 路径中会把 ANGLE 后端 pipeline 编译延迟到首次真实 draw：即使把五个 program 分开，每个单 draw 仍产生 65–97ms LongTask。`flush`、`fenceSync`、`LINK_STATUS`、uniform/attribute 预热和 `finish` 均不能提供 shader/link readiness；whole-scene `compileAsync` 反而把首次 commit 聚合为约 330–360ms。该环境不暴露 `KHR_parallel_shader_compile`，因此不能作为“所有 WebGL 首帧必须低于 50ms”的可实现硬件模型。

最小恢复固定为：

- `SceneCompileProbe` 只在当前 WebGL context 暴露 `KHR_parallel_shader_compile` 时调用 Three `compileAsync`，并只在该 Promise 期间把实际 frameloop 保持为 `never`。resolve 后恢复既有 logical frameloop 并完成真实 ready frame；reject/throw 继续进入现有一次性 Canvas failure/fallback。
- 缺少这个可选扩展不是 WebGL 初始化失败。unsupported context 不调用 `compileAsync`，在同一 layout-effect 提交后立即释放既有有限渲染路径；不得使用 fence、同步状态查询、任意 timeout 或伪 readiness 等待。
- 父 Canvas 的 current payload 判定必须直接绑定本次 render 的 `sceneCompileKey`、transition scene/token，而不能依赖 passive effect 才更新的 refs；否则 unsupported 的同步 layout-effect 回调会被错误拒绝。stale scene、旧 token、quality/runtime generation 变化和卸载后的 compile 结果继续被忽略；Canvas prop 仍是 frameloop 的唯一 owner。
- Playwright 在 `tests/e2e/performance.spec.ts` 文件顶层使用 `test.use({ channel: 'chromium' })`，即完整 Chromium/new headless，而不是 legacy headless shell。`channel` 是 worker-scoped option，不能放在 `describe` 内。2026-07-28 的首次 14e production normal-motion 复验又证明 legacy headless shell 在 Home opening 的 700/880ms checkpoint 附近稳定产生约 298–316ms 的 ANGLE 首次整景 draw/main-thread gap，而完整 Chromium 同一产品路径没有该 LongTask；因此 `tests/e2e/cinematic-motion.spec.ts` 的真实 normal-motion screencast 也必须使用同一文件级完整 Chromium。Static/reduced visual 文件保持原浏览器边界。冷启动与 normal-motion 都继续从 fresh browser/context 访问 production 3100，要求真实 Canvas ready、settled、回到 demand；所有既有 LongTask、checkpoint lateness 与 facts-frame skew 阈值保持不变。
- 迁移只改变代表性浏览器运行时，不改变 50ms 阈值、collector、产品场景预算、首次反馈、normal-motion lateness 或 Lighthouse 门槛。若完整 Chromium 仍失败，必须修复产品或门禁实现，不得自动 fallback 到跳过或放宽断言。

### 21. 最终专业 NO_GO 恢复：Carrier Spine / Editorial Instrument Cut

2026-07-28 的完整 Chromium 专业 Art Director 复核仍为 `NO_GO`。工程门禁已经证明单 Canvas、有限 frameloop、路由、真实链接和冷启动性能成立，但最终画面仍有五个感知问题：Home→Arc 像黑色 crossfade；详情页默认收起仍长达约 4420px/3617px；Home hover/focus 只改变细节而不是主角；Rialo 390px 五条长标题形成信息墙；沉浸舞台与 footer 之间存在约四分之一屏的无意义黑场。本轮只修复这五项，不重做场景、catalog、路由或内容事实。

#### 21.1 路由使用一个可追踪载体，不再使用全屏黑幕

统一 handoff 采用 `Carrier Spine`：一个由 track、hard-edge mass 与 leading signal 组成的轻量 DOM actor，在既有 600ms timeline 中按 source scene 分别从 Home beacon、Arc signal path 或 Rialo route 的方向离场，并由目标沉浸页对应 signal/route 或详情 signature motion trace 接住。最小范围只拦截既有 `[data-universe-content]` 内的真实 ecosystem/project 链接与活动 CTA；根布局 Header/Footer、history、modified click 与 direct load 继续原生导航，且不得留下 stale carrier。

- `0–120ms` 收束当前页面信号并开始移动，120ms 仍由既有 router push 接管。
- `120–390ms` 的几何 mass 只覆盖局部画布，在 Canvas swap 的不确定窗口形成中段平台；透明 full-viewport positioning root 不计入面积且不得有背景，在 120/300/480ms 以真实 track、mass、signal rect 总面积除以 viewport 计算不得超过 35%，周围背景和主体仍可辨认。
- `300–600ms` actor 沿相同方向退出；同一 carrier destination、target、token 与单调 progress 在 bridge 和详情 arrival 间连续，不得在新页面从 0 重播第二块遮罩。storage 继续只保存既有 `start`，destination 由 elapsed time 重算 progress，首个 destination progress 不小于 source 的最后 progress，不新增 persisted progress 字段。
- 移除 `contentLayer::before` 与详情 `handoffVeil` 的深色全屏覆盖。不得用 blur、backdrop-filter、mix-blend、大面积不透明层、永久动画或新的 Canvas mesh/shader 代替。
- actor 为 `aria-hidden`、不可聚焦、`pointer-events:none`，只动画 transform/opacity；快速二次导航只保留最新 token。reduced-motion、页面隐藏、过期 handoff 与直接加载详情时不渲染 actor并立即到终态。
- 既有总 handoff 600ms、Canvas 终态不超过 700ms、单 Canvas、demand frameloop 与 history 语义保持不变。

跨切片契约冻结为：`CinematicNavigationBridge` 与 `CinematicDetailArrival` 继续拥有既有 carrier destination/target/token/progress，不改变 storage schema 或 transition-machine；两端复用同一无状态 carrier 视觉投影。carrier token/target 与 `SceneTransitionState` 的 Canvas token/route target 是独立协议，不得互相复用或强制相等；例如 Home→Arc carrier 可以保留 `ecosystem:arc`，Canvas 仍使用 Arc 的 route/default target。详情组件不再提供项目自定义深色 veil。

#### 21.2 详情使用媒体优先的编辑式仪器切面

四个详情继续只包含 `Problem / Mechanism / Proof` 三个顶层章节和一个 live CTA，但默认阅读从“纵向 dossier”改为 `Editorial Instrument Cut`：

- Hero 目标高度为约 70–78svh，只保留项目名、tagline、唯一 CTA、状态与项目 signature。
- Problem 以紧凑编辑导语呈现 summary，Boundaries 默认关闭。
- Mechanism 在宽桌面把最多五个闭环节点排成横向 sequencer，中屏为 3+2，移动端为紧凑纵轨；步骤说明、roles、tags 与 stack 留在原生 disclosures。
- Proof 变成 media-led spread：DOM 和移动端先出现真实代表截图，桌面约三分之二媒体、三分之一 evidence。每个项目的 `gallery[0]` 是唯一代表性 WebP，使用确定性 eager 加载但不 preload/priority；`gallery[1..]` 及其余未来媒体仍延迟加载。
- 删除 Hero 中部全宽线、gallery 顶部全宽线、截图四边框与重复大留白；保留每章一条短节奏线、Mechanism 路径、Technical notes/Navigator 的功能分隔、signature 内部轴线/节点/刻度与 focus/CTA 边界。

默认 disclosures 关闭时，1440×1000 的四个详情页文档高度目标不超过 3200px，390×844 不超过 3400px；展开全部 disclosures 后允许自然增长但不得横向溢出。真实图片必须在不滚到 Proof 的情况下开始加载并最终具有非零 natural size，不得在全页审查中留下空黑框。

#### 21.3 Home 预览必须改变主角而不是只改变 selector

Home 保留两条明确边界：

- `activeProject` 只由 committed target 决定，继续拥有项目名、判断、CTA、`aria-pressed/current` 与 live region。
- `visualProject` 只从 effective target 派生，拥有主角形态、accent 与短时视觉反馈，不得改变语义状态。

pointer/focus 一个未提交项目时，220ms preview 必须同时改变至少三个大尺度通道：机械 mass/outline 的终点、monument horizon 的角度/长度/位移、accent field 的强度或主题；现有 monument planes 可以作为第四通道。click/Enter 后才执行 780ms commit 并更新语义。离开预览回到 committed visual project；预览当前已提交项目是 no-op，不重启 commit timeline。

桌面 High/Medium 的既有 Home、Arc、Rialo 环境 owner 保持每页最多一个主循环和一个辅助循环，但从页面 settled 后立即处于可观察的中段相位。主角周期可使用约 12–18px 与 6–8° 的 transform 变化，signal/beacon 可使用约 24–30px；只能动画 transform/opacity。Low、Static、移动端、saveData、隐藏、离视口与 reduced-motion 继续完全停止循环。

#### 21.4 Rialo 移动端和舞台收尾只做信息密度校正

在不超过 420px 的视口：

- 五阶段仍全部可发现，每个 button 至少 44px。
- inactive 行视觉上只显示编号与 `Observe / Cover / Trigger / Settle / Explain` 短信号；完整阶段标题仍保留在可访问名称或 visually-hidden 文本中。
- active 行显示短信号、完整阶段标题与唯一 description。完整事实、roving tabindex、live region、唯一 CTA 与 no-JS 五阶段等价内容不变。

Home、Arc、Rialo 的 viewport-bound 舞台高度保持，不通过缩小主角解决留白；只把 immersive `#main-content` 的底部 padding 收到 20–40px，并以真实几何要求 stage bottom 到 footer top 的间距位于 0–48px。

#### 21.5 首次 production 验证只恢复真实阻断，不进行第二次视觉重构

独立 Review Codex 对 23 文件集成给出 PASS 后，Architecture 在新 production 3100 上运行 changed Chromium，结果为 38/52 PASS；专业 Art Director 对 61 张桌面、移动、normal-motion、Carrier 与详情原图给出 `NO_GO`，但无 P0，唯一 P1 是 SIGNAL/LEDGER 390px 默认态 3487px 超过 3400px。旧版的全屏黑幕、不可感知 Home preview、Rialo 信息墙、空媒体与舞台/footer 黑场均已视觉解除。本轮不得借机重做构图，只允许以下 fail-closed 恢复：

- ReactDOM 19.2.7 会把非 lazy 且非 low fetch priority 的服务端 `<img>` 自动提升为 image preload。`gallery[0]` 继续传 `loading="eager"`，并 MAY 只传原生 `fetchPriority="low"` 抑制该自动 hoist；这不是 Next `priority`/`preload`，不得传 high。原始 HTML 与 hydration 后 DOM 都必须没有 image preload，代表媒体仍须在 `scrollY=0` 开始请求且最终 natural size 非零。
- 四个详情页都必须在字体、代表图稳定且 disclosures 关闭后逐页满足 1440×1000 `<=3200px`、390×844 `<=3400px`。只压缩 chapter、chapter body gap 与 Navigator 的重复纵向留白，保留 Hero 比例、字体、媒体尺寸、三章、全部原生 disclosures、事实和展开态自然高度。
- Home/Arc 的 radial accent pseudo 必须留在 stage 自身 `inset:0` 的开放场域中，不得用 `calc(50% - 50vw)` 制造 main/stage 内部横向 scrollWidth，也不得用全局 overflow clip/hide 掩盖。主角、horizon、planes、光场和 220/780ms visual morph 保持。
- CapabilityGate 在 reduced-motion/saveData 时零探测；其余增强候选只做一次 StrictMode-safe 的 off-DOM WebGL2 probe。失败立即 Static、释放临时 context、不挂真实 Canvas 且不请求 enhanced scene；成功在当前 capability 生命周期内复用结果，真实 renderer 不承担能力探测。
- production 不暴露 development-only `__CAPTAIN_DOCK_UNIVERSE_DEBUG__`。依赖 token/frame/draw debug 的门禁保留在 development；production 使用 URL、scene/ready/render-state DOM、同一 Canvas identity、Carrier/storage terminal、资源请求、真实离屏几何与无 debug global 的黑盒等价门禁。Task 14.19 缩短页面后，offscreen 测试必须先建立并断言 scene layer 确实离开 viewport。
- normal-motion 的桌面增强终态允许 OpenSpec 已定义的 High 或 Medium 自适应等级，继续拒绝 Low/Static/null；证据采集本身触发合法 High→Medium 不得被误报为产品失败。50ms lateness/facts-frame skew、帧数、checkpoint、空间变化和 200ms 首次反馈均不得放宽。

专业 Art Director 的 Home 判断块上移与详情低幅 ambient 加强属于 P2，不进入本次阻断修复。只有上述生产/证据契约全部 GREEN、独立 Review PASS 且 Art Director 把唯一 P1 复验为 GO 后，才能交给用户。

#### 21.6 最小范围与最终 gate

最小生产范围限定为：

- Carrier：cinematic bridge TSX/新 module CSS、UniverseShell handoff CSS、详情旧 veil 接口与样式。
- Editorial：case-study TSX/CSS、gallery 加载策略、signature 垂直节奏。
- Motion/density：Home stage TSX、InstrumentStage CSS、Rialo CSS、immersive page bottom rhythm。
- Final production recovery：CapabilityGate 与其测试、project detail/gallery CSS 与测试、InstrumentStage accent pseudo 与测试，以及 progressive/cinematic/responsive/project-detail 的局部 evidence contracts。

不得修改 catalog、metadata/JSON-LD、四项目顺序、公开路由、真实链接、transition-machine timing、scene target controller、Canvas/Three 场景、shader、预算、依赖、Playwright 全局配置或 Vercel。完整 Chromium 只能通过目标 E2E 文件顶层 `test.use` 选择。

验收顺序固定为：各切片 TDD → Architecture 集成与真实 3100 构建 → 独立 Review Codex PASS → 专业 Art Director 以 1440×1000、390×844、Home normal-motion、Home→Arc handoff、Rialo 390px 与代表详情全页原图给出 GO。任一 reviewer 为 `FIX_REQUIRED/NO_GO` 均回到 DESIGN，不得把 3100 宣称为最终用户验收版本。

#### 21.7 完整 production 矩阵只收口 committed race 与已批准构图的视觉基线

E1 独立 Review PASS、全量静态门禁、Home→详情 exact repeat8 和 46 项 changed production Chromium 全部通过后，116 项完整 production E2E 返回 `105 PASS / 3 预期 skip / 8 failed`。其中七项属于视觉母版尚未迁移到已经批准并实现的 14e 构图；唯一产品失败是 Rialo Cover 的 committed morph 偶发只留下两个 material steps。

产品根因限定在 scene target controller：提交 Cover 后，同一 committed target 的 focus/pointer 进入本应为视觉 no-op，但离开事件仍把 `motionMode` 改成 `preview`。Canvas 因此可能把正在进行的 780ms commit transaction 按 220ms preview budget 提前终止。最小恢复只允许：

- 同一 committed target 的 focus/pointer enter **以及对应 leave/blur** 都不改变 commit revision、effective target 或 `motionMode=commit`；
- 真正不同 target 的 preview、双输入源回退与离开后 220ms 回到 committed target 继续保持；
- 只修改 scene target controller 及其单元测试。§21.6 对 controller 的冻结在这个已证明的 bugfix 上作单次两文件例外；UniverseShell、Canvas/Three、场景、Rialo DOM/CSS、780/220ms 常量和 cinematic 四步/50ms 门槛仍冻结。

视觉母版不得反向要求已删除的 full-viewport pseudo：

- Home/Arc radial accent 已按 §21.5 留在 stage 自身 `inset:0`。Static 结构门禁必须验证 pseudo 与 stage 左右边界一致、radial field 仍存在、页面无横向溢出且没有 clipping；不得再要求 pseudo 抵达 viewport `0/width`。
- Home、Arc、Rialo、SIGNAL/LEDGER 的既有六张母版因批准的 Living Monument、Editorial Instrument Cut、Rialo 密度与 stage/footer 节奏发生预期差异；Rialo 390px 是新增第七张母版。
- 测试契约先以 TDD 迁移，但正式 snapshot 不得由失败测试自动接受。Architecture 先保存七张独立候选与 normal-motion/Carrier/详情全页证据，独立 Review Codex PASS 后交给专业 Art Director。只有 Art Director `GO` 才允许一次性更新七张 snapshot，随后 fresh visual/full E2E 必须 GREEN。

此前 full-Chromium 出现过一次 cold checkpoint 供帧空洞和一次 CDP timestamp 逆序；它们没有在新构建的 cold-first、exact repeat8、changed production 与完整 cinematic file 中复现，当前不改 selector。最终验证仍按预先固定顺序运行；若任一异常再次发生则保留 NO_GO 并单独修 recorder readiness，禁止用重试覆盖或放宽 50ms。

#### 21.8 E2 复验把 Rialo 残余波动收窄为 ambient / committed 空间通道竞争

E2/E3 独立 Review PASS 后，Architecture 在新 production `127.0.0.1:3100` 上执行被冻结的 Rialo cinematic exact repeat8，结果仅 `3/8 PASS`；五次失败的 Cover 只有 2–3 个 material steps。该结果不再由 §21.7 的 controller race 解释：五次只读生产探针均证明 click 后的同目标 `pointerout/over` 被 E2 guard 视为 no-op，preview 为空，Canvas 与 Rialo event 从约 0ms 到 720ms 始终保持 committed morph，并在约 925ms 才进入 idle；corridor plane 也从起点平滑过渡到 Cover 终点。因此 E2 实现保持冻结，不得重新修改 controller、UniverseShell、Canvas/Three、780/220ms 常量或 cinematic 四步/50ms 门槛。

当前残余根因是 Rialo DOM 环境循环与 committed 空间证据共用竞争层：

- `.radar` 祖先与 `.radarRoute` 的 8.8s animation 只在 `morph-phase=idle` 选择器中存在。committed morph 开始时 animation 被卸载而不是暂停，结束时又以 `-4.4s` delay 新建；祖先 transform 的回落/重建叠加在 corridor 的 780ms transform 上。
- cinematic 空间签名来自整页 PNG 按 Canvas rect 裁切，必然包含 Canvas 上层的 DOM corridor；ambient/start 的复合像素漂移再乘 1.5 成为 material threshold，因此完整 780ms morph 仍可能只被计为 2–3 步。
- 只读运行时 A/B 中，当前 owner 约为 3 步；关闭 ambient 后四次均为 5 步；仅保持旧祖先 animation 并 pause 仍只有 1–2 步；把低幅环境位移解耦到第一块大 corridor plane、把 route 辅助收为 opacity，并在 morph 时 pause 后，四次均为 4–5 步。A/B 只用于因果裁决，不替代正式 repeat8。

E4 最小恢复限定为 Rialo CSS 与其既有 CSS 契约测试：

- `.radar` 不再承担持续 transform animation。第一块真实 `.corridorPlane` 继续作为大体量 protagonist，以独立的 `translate` 通道运行 8.8s、`-4.4s` 中段相位的低频主循环；既有 signal-specific `transform` 与 780ms transition 继续独立承担 committed 构型变化。
- `.radarRoute` 只保留低幅 opacity 辅助循环，不再以持续 transform 抬高空间噪声；同屏仍最多一个主循环和一个辅助循环。
- animation name、duration、delay 与 owner 在 ready / desktop High 或 Medium / demand / entry-settled 生命周期内保持稳定，默认 paused，只有 `morph-phase=idle` 切换为 running；morphing 不得删除/restart animation identity。
- reduced-motion、移动端、Low/Static、saveData、隐藏、离视口与非 demand 状态继续完全静态；只使用 compositor-friendly transform-family / opacity，不新增 DOM、公共 API、持续 Canvas 帧或第三条循环。
- 产品实现只允许修改 `rialo-reactive-loop.module.css` 与其本地 `rialo-reactive-loop.test.tsx`。fresh full verify 若暴露仍把 Rialo owner 硬编码为 `.radar`、不承认 independent `translate` 为 compositor-friendly 或不能把简写 reduced selector 映射到稳定生命周期 owner 的共享测试，可额外只迁移 `instrument-stage.test.tsx` 与 `design-contract.test.ts`；该迁移必须继续要求六个真实 owner、Rialo stable paused / idle running、显式 reduced-motion terminal 和 transform-family / opacity 白名单，不得修改任何产品文件或降低契约。
- independent Review、production cinematic exact repeat8 `8/8`、完整 cinematic `5/5`、专业 Art Director `GO` 与七张 snapshot 一次更新后，fresh full production E2E 若仅暴露 `progressive-enhancement.spec.ts` 仍把 Rialo 的 spatial scope 与直接 animation owner 合并为 `.radar`，可增加一个 test-only Fix：运行时契约必须把 `.radar` 保留为唯一 spatial scope，把其直接第一块真实 corridor plane 保留为唯一 main owner；`mainOwner.getAnimations()` 必须恰有一条 7–10s、负 delay 的主循环，`spatialScope.getAnimations({ subtree: true })` 必须只含该主循环和至多一条 route 辅助循环，所有 target 都位于 scope 内。High/Medium、Low、移动端、ready/demand/entry-settled/morph-idle、Canvas demand、反馈时长与真实 owner 断言必须保留；keyframe property 白名单只可精确新增 independent `translate`，不能用 `.first()`、class substring、任意后代或只把旧 direct 期望改为 0 来绕过。该 Fix 只允许修改 `tests/e2e/progressive-enhancement.spec.ts`，不得触碰产品、snapshot、controller、Canvas/Three、780/220ms 或任何 cinematic 门槛。
- 正式验收仍要求原 cinematic exact repeat8 `8/8`、每轮 Cover 至少 4 步、650–900ms 与 50ms 门槛不变；任何产品或 collector 门禁失败都必须停止并回到 DESIGN。

#### 21.9 CDP 编码完成乱序必须在 recorder 内建立无损规范时间线

E4 Fix2 获得独立 Review Codex `PASS` 后，Architecture 只运行一次 fresh full production 116-test 矩阵，结果为 `112 PASS / 3 预期 skip / 1 FAIL`。旧 Rialo runtime owner 失败已经消失，七张 snapshot 也继续全部通过；唯一失败发生在 Home opening cinematic recorder 的 finalize 阶段：

```text
Screencast timestamp duplicate or backward order。
```

该失败是 §21.7 预告的 collector 异常再次发生，因此保持 `NO_GO` 并单独进入 recorder-readiness slice，禁止通过重跑选择一次成功结果。产品、E4/Fix2、Art Director `GO` 与七张已接受 snapshot 全部冻结。

只读源码诊断证明 CDP screencast 存在两种不同顺序：

- Chromium 在采集帧时写入 `metadata.timestamp`，随后把 PNG 编码交给可并发、无序完成的 ThreadPool；事件按编码完成顺序到达 Playwright。因此两个唯一 timestamp 的帧可以合法按 `t2 → t1` 到达。
- selector 当前的 `RawFrame.sequence` 是 transport arrival identity，却先按它遍历并要求 timestamp 严格递增，随后 checkpoint path solver 又用同一 arrival sequence 强制时间前进。它把编码完成顺序错误地当成采集时间线，并在生成 PNG/manifest 附件前抛错；本次产物因此无法判定是唯一 timestamp inversion 还是 duplicate。
- 同一 screencast 的 `sessionId` 是稳定 session generation，不是逐帧序号；ACK 只表示消费到达事件，也不能恢复采集顺序。

E5 最小恢复只允许修改 `src/test-support/cinematic-screencast-selector.ts` 与 `src/test-support/cinematic-screencast-selector.test.ts`：

- 原始 `sequence` 继续只表示 arrival identity。每个到达事件必须立即且恰好 ACK 一次，finalize 必须等待其调用前已经登记的全部 ACK；ACK Promise 的完成顺序不得影响帧选择。finalize 开始后的 stop/drain race 仍属于本切片明确冻结的残余生命周期风险。
- finalize 先独立转换并验证每个 timestamp，再在排序前检测碰撞。duplicate key 是转换后的 `frameSwapAtMs`；任何两个 raw frame 投影为相同毫秒值都必须保守地 fail closed，不论原始 seconds Number 是否不同、PNG 是否相同。不得用 `toFixed`、round、epsilon，亦不得静默保留第一项、最后一项或按 hash 合并。
- 所有 timestamp 唯一的 raw frame 按 `frameSwapAtMs` 建立 canonical frame chronology。event boundary、真实 predecessor、checkpoint candidate 与 fixed path 的时间前进均以该 canonical chronology / timestamp 为准；event-boundary 排除仍使用原始 arrival identity，确保同一 raw frame 不能同时充当 boundary 与 checkpoint。
- 相同 PNG、不同 timestamp 必须保留为两个真实帧；不得做全局 image-hash dedupe。不得 round/coalesce timestamp、插值、补帧、复制上一帧或用 epsilon 改写时间。
- 现有 stable session、ring frame/byte、PNG/viewport、origin/timeOrigin、facts capturedAt/version、unique raw frame、event anchor、50ms checkpoint lateness 与 50ms facts-frame skew 全部保持；不得修改 cinematic checkpoints、四步/200ms/650–900ms 或产品动效。
- 当前 capture boundary 保持不变：进入 `stopping` 后到达的事件继续 ACK，但不进入本次选择。处理 Chromium stop/drain 生命周期需要修改 collector 调用方，不在这次已经由唯一 timestamp inversion 证明足够的两文件最小切片内；若 E5 后出现供帧空洞或 stop/drain 证据，必须再次回到 DESIGN，不能暗中扩大范围。

TDD 必须至少证明：

1. 不同 PNG 的唯一 timestamp 按 `151 → 101 → 201ms` 到达时，输出严格按 `101 < 151 < 201`，PNG/hash 仍绑定各自 timestamp，且每个 arrival 恰好 ACK 一次。
2. Home-opening 形态的 `260 → 170 → -1 → 77.508ms` 到达乱序，仍得到 `77.508ms` earliest post-event boundary、`-1ms` 真实 predecessor 与 `170/260ms` fixed frames。
3. 相同 timestamp + 不同 PNG、相同 timestamp + 相同 PNG 均拒绝；相同 PNG + 不同 timestamp 不合并。
4. 两个不同、可表示的原始 timestamp 若乘以 1000 后投影为同一 `frameSwapAtMs`，仍作为不可证明顺序的 collision 拒绝。
5. ACK Promise 逆序完成不改变 canonical selection，finalize 等待调用前已登记的所有 ACK；stopping frame 即使比 recording frame 更适合 checkpoint，仍只 ACK、不参与选择。
6. 既有 50ms、facts、session、ring、bytes、unique-frame 与 event-boundary guards 不变。

独立 Review Codex `PASS` 后，Architecture 的浏览器复验顺序固定且每项只运行一次：Home opening focused → 完整 cinematic file → 完整 production matrix。预期依次为 focused GREEN、cinematic `5/5`、production `113 PASS / 3 预期 skip / 0 FAIL`。若 canonicalization 后出现 duplicate timestamp，selector 必须给出精确 duplicate 失败并停止；不得重试、吞帧或降低门槛。

## Risks / Trade-offs

- [持久 Canvas 增加实现复杂度] → 只覆盖三个沉浸式路由，使用明确状态机和一个场景 owner；详情页不共享 Canvas。
- [3D 包体和 GPU 成本影响首屏] → 服务端先输出静态 fallback，场景动态加载，设置四级质量、预算和按需渲染。
- [WebGL 上下文丢失或驱动问题] → 场景错误边界、一次恢复限制和视觉连续的 SVG/CSS fallback。
- [项目模板变成换色页面] → 固定信息契约但为每个项目保留一个签名模块、不同核心动词和真实证据。
- [过度动画延迟导航] → 离场上限 180ms、可取消 transition、减少动态效果立即导航。
- [本地素材泄露路径或敏感信息] → 只复制审查过的公开截图，测试构建输出不得包含绝对路径。
- [外部项目暂时不可用] → 不在构建或渲染期间探测外站，详情页本身仍是完整案例。
- [字体与截图增加仓库体积] → 仅保留必要 WOFF2 字重和经压缩的代表性媒体，同时保存许可证与来源记录。
- [正式域名尚未确定] → 通过环境变量配置 metadataBase；本地/Preview 使用明确的非生产默认值，Production gate 要求正式值。
- [当前无 Graphify] → 实现初始模块后生成图谱，在跨模块修改与最终 Review 前补做影响查询。
- [视觉原型再次被实现成通用卡片站] → 冻结参考 hash、建立 Instrument Stage 结构测试和 Static 模式视觉快照，并要求 Architecture 人工查看候选图。
- [英文迁移只改可见正文而遗漏辅助表面] → 从 catalog、metadata、JSON-LD、alt、aria 和生产 HTML 多层扫描 Han 字符。
- [去掉边框后损失可读层级] → 保留开放式 datum line、内部仪器轴、活动侧轨、局部文字遮罩和主要 CTA 实体边界，并在 320–1920px 与真实浏览器中检查对比度和重叠。
- [新增环境动效导致 GPU / 电量回退] → Canvas 继续按需渲染，环境微动优先使用 CSS transform / opacity，Low、移动端、隐藏页和 reduced-motion 关闭持续循环。
- [动效成为新的视觉噪声] → 同屏限制一至两个持续运动源，首屏编排不超过 1400ms 且首帧可操作，所有交互反馈同时覆盖 hover、focus 与 pressed。
- [电影化编排再次只有 CSS 数值而没有感知变化] → normal-motion 验证必须保存起始/中间/终态分帧，证明主体的构型、位置、尺度或镜头发生变化；Architecture 不能只检查 duration。
- [committed 与 preview 状态竞争] → 使用单一 scene target controller 明确优先级，pointer/focus 离开后必须回到 committed target，快速输入使用最新 token。
- [首屏删文案导致项目不可发现] → 四项目、两生态和真实路由继续由语义 DOM 输出；无 JavaScript、Static、saveData 与 WebGL failure 路径必须可发现全部入口。
- [详情三章化丢失事实] → 只删除重复表述，核心闭环、至少三项证据、技术/限制边界、状态、live URL 与导航通过三章或可访问的渐进披露保留。
- [CSS Module slot 再次静默失配] → 跨组件布局只锚定稳定 `data-stage-*` 属性，并用真实 1440×1000 / 390×844 几何 RED 验证区域比例、顺序、重叠和文字行框。
- [增加循环后仍只看到细线在动] → normal-motion 证据同时测量主体 wrapper 与多帧像素变化；每页必须由一个大体量 protagonist 承担运动。
- [视觉删减误删项目事实] → 事实源保持冻结，渲染层只改变视觉层级或使用原生 `<details>`；SEO、no-JS、DOM facts 与真实链接继续单独验证。
- [软件 headless backend 把驱动编译噪声误判为产品 LongTask] → 保留 50ms 硬阈值，但把 WebGL 冷启动门禁绑定 Playwright 完整 Chromium/new headless，并用独立 trace 记录 legacy headless shell 的不可实现单-draw 基线。
- [可选并行 shader 扩展缺失时 whole-scene 预编译造成更大首帧阻塞] → 只有显式支持 `KHR_parallel_shader_compile` 才启用 compile gate；unsupported context 立即回到原有有限渲染和渐进降级路径。
- [Carrier 再次退化成模板化 wipe] → actor 必须从页面已有 beacon/signal/route/motion trace 接力，并以局部面积、同 token/target/progress 和正常分帧证明连续性。
- [详情压缩误删项目事实] → 只改变章节顺序、默认披露与响应式布局；catalog、服务端 HTML、原生 details、真实媒体、live URL 和导航继续由内容/E2E 单独验证。
- [eager 代表媒体影响 cold-route 性能] → 每页只确定性加载一个现有 49–77KB WebP，不设 priority/preload；build budget、Lighthouse 和 cold-route 无 Canvas 门禁保持不变。
- [Home 视觉预览污染语义] → committed 与 visual project 分开测试，hover/focus 只能改变装饰性 owner，click/Enter 才能更新标题、CTA、pressed/current 与 live region。
- [Rialo 视觉隐藏导致可访问名称丢失] → inactive 长标题只使用 visually-hidden 或等价 accessible-name 技术，不从 DOM 删除；no-JS 与键盘测试继续读取完整五阶段事实。

## Migration Plan

1. 在不覆盖用户已有 `main.py`、`.gitignore` 与 `.agents/` 的前提下建立最小 Next.js 工程和锁文件。
2. 先以测试固定内容模型、八条路由、404 和安全外链，再实现无动画的语义页面。
3. 导入并压缩四个项目的公开素材，完成首页、生态页和详情案卷。
4. 建立静态 SVG/CSS 场景与减少动态效果路径，再动态加入单 Canvas 3D。
5. 完成响应式、无障碍、SEO、安全头与性能预算。
6. 运行本地生产构建和全量 `npm run verify`，再进行独立 Review Codex 审查。
7. 用户确认最终视觉后才创建 Vercel Preview；远程验收通过后再由用户明确授权 Production。

当前没有线上旧版本需要数据迁移。部署后的回滚使用 Vercel 保存的上一版本；内容回滚通过恢复对应 Git 提交重新部署。

## Open Questions

- 正式站点名称、作者展示名、个人简介、头像/标志和最终域名尚未确认；首版实现可使用 `Project Universe` 与可替换的内容常量，但 Production 元数据必须在部署前确认。
- 四个项目是否提供公开源码地址尚未确认；没有有效地址时隐藏“查看源码”按钮，不展示占位链接。
- 是否需要页面级中英文切换尚未提出；本变更按已确认设计采用英文主视觉文案与单语言路由，内容模型避免阻塞未来本地化。
