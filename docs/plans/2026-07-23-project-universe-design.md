# Project Universe 设计定稿

## 目标

把分散的 Arc 与 Rialo 作品整合成一个具有个人辨识度、可持续扩展、可访问且可部署到 Vercel 的项目宇宙。视觉记忆点是“一个人维护着自己的数字宇宙”，3D 负责空间叙事，DOM 负责内容、导航和操作。

## 已确认路由

```text
/
/arc
/arc/signal-ledger
/arc/hadron
/arc/arcpredict
/rialo
/rialo/rialo-captain
/about
```

未知生态或项目必须进入真正的 404。现有作品通过截图、说明和独立外链展示，不使用 iframe。

## 信息架构

- 首页：项目星盘、Arc/Rialo 两条生态轨道、四个项目入口。
- `/arc`：同一能量回路中的账本、市场和概率三个项目。
- `/rialo`：Observe、Cover、Trigger、Settle、Explain 的航班保障闭环。
- 项目详情：统一“案例案卷”，顺序为 Hero、问题、核心闭环、产品证据、图库、技术泳道、限制、CTA、下一项目。
- About：个人定位和返回项目入口；未知个人信息不编造。

详情页约 70% 使用统一骨架、20% 使用主题令牌、10% 使用专属签名模块：

- SIGNAL/LEDGER：琥珀账本、Agent Log、预算与 Receipt。
- HADRON：冷青资产行、双边订单簿、成交与结算。
- ArcPredict：靛蓝概率弧、挑战窗口与 Claim。
- Rialo Captain：雷达绿航线、条件触发、支付与证据解释。

## 技术架构

采用 Next.js App Router、React、TypeScript 和构建期静态内容。项目目录是路由、页面、SEO 和 3D 节点的单一事实源；不引入 CMS、数据库或运行时 API。

```text
类型化 catalog + 本地媒体
          │
          ├─ generateStaticParams → 八个固定路由
          ├─ generateMetadata     → SEO / OG
          ├─ sitemap / JSON-LD    → 搜索发现
          └─ Server Components
                    ├─ 可索引、可访问的 DOM
                    └─ 按需加载的 Client Island
```

使用 route group 隔离渲染成本：

```text
(immersive)  → /、/arc、/rialo，共用一个持久 Canvas
(case-files) → 四个项目详情，轻量 CSS/SVG 签名视觉
(content)    → /about，不加载 3D 世界
```

样式使用 CSS Modules、全局 token、container query 和本地 WOFF2；不引入通用组件库或通用页面搭建器。

## 3D 与动效

使用 `three`、`@react-three/fiber`、按需的 `@react-three/drei` 和 `motion/react`。

- 首页：Project Astrolabe 项目星盘。
- Arc：Orbital Circuit 轨道回路。
- Rialo：Reactive Flight Field 雷达航迹。
- 项目详情：只保留项目签名“证物”，不重复一整套 3D 场景。

高、中、低、静态四级质量根据 WebGL、视口、减少动态效果、节省数据和运行时 FPS 决定。Canvas 不承载唯一信息、不截获全页滚轮、不可获得焦点。失败时使用视觉连续的 SVG/CSS fallback。

主要预算：

- 3D 增量 JavaScript gzip ≤ 260 KiB。
- 单路由场景 chunk ≤ 45 KiB。
- 桌面/移动 draw calls ≤ 70/40。
- 桌面/移动可见三角形 ≤ 120k/50k。
- DPR ≤ 1.5/1.25。
- LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1。

## 内容与素材

首批项目：

| 生态 | 项目 | 详情路由 | 在线作品 |
| --- | --- | --- | --- |
| Arc | SIGNAL/LEDGER | `/arc/signal-ledger` | `https://arc-signal-ledger.vercel.app/` |
| Arc | HADRON | `/arc/hadron` | `https://arc-hadron.vercel.app/` |
| Arc | ArcPredict | `/arc/arcpredict` | `https://web-arcpredict.vercel.app/` |
| Rialo | Rialo Captain | `/rialo/rialo-captain` | `https://captain-rialo.vercel.app/login` |

本地项目路径只作为开发期素材来源，不进入公开 catalog 或客户端 bundle。截图复制前必须检查敏感信息，随后裁切、压缩、记录来源并配置 alt/caption。

## 质量与边界

- 320px 至宽屏正常重排，移动端闭环改为纵向时间线。
- WCAG 2.2 AA 基线；键盘、焦点、44px 触控目标、减少动态效果和非颜色状态表达。
- 每个路由具有唯一 metadata、canonical、OG、JSON-LD，并进入 sitemap。
- 外链统一使用 HTTPS、`noopener noreferrer` 与清晰的外部站点提示。
- Vitest、Testing Library、Playwright、axe、Lighthouse CI 和生产构建形成统一验证入口。
- 不做登录、CMS、后台、实时数据、多语言、PWA、重型模型、物理引擎或生产部署。

## 未决但不阻塞实现的内容

- 正式作者名、About 文案、头像/标志和生产域名。
- 四个项目是否提供公开源码地址；没有有效地址时隐藏源码按钮。
- Production 部署仍需用户在最终视觉完成后明确授权。

规范源位于 `openspec/changes/build-project-universe/`，包括 proposal、四个 capability spec、技术 design 和可跟踪 tasks。
