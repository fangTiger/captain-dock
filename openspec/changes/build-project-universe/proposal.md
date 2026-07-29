## Why

目前四个作品分散在不同的独立站点中，缺少一个能够体现个人设计语言、项目谱系和技术能力的统一入口。建设“Project Universe”个人网站，可以把 Arc 与 Rialo 两条项目线组织成可扩展的作品宇宙，同时用克制的 3D 与可验证的产品证据形成鲜明记忆点。

## What Changes

- 新建一个面向 Vercel 部署的个人作品集网站，并提供 `/`、`/arc`、`/rialo`、`/about` 及每个项目的独立详情路由。
- 建立数据驱动的生态与项目内容模型，首批录入 SIGNAL/LEDGER、HADRON、ArcPredict 和 Rialo Captain。
- 为首页、生态分类页和项目详情页建立统一但可主题化的视觉系统；项目详情页使用一致的“案例案卷”阅读骨架。
- 为首页和生态页增加渐进增强的 3D/空间视觉；在移动端、低性能设备、减少动态效果偏好或 WebGL 不可用时提供等价的静态体验。
- 根据用户确认的 A 版原型重建视觉母版：沉浸式路由使用单一全幅机械观测舞台，项目详情使用扁平、非对称的仪器式版面，不再把通用 Hero、双列大卡和嵌套面板作为主要视觉。
- 根据用户于 2026-07-25 确认的后续方向，把 A 版封闭 Instrument Stage 演进为 `borderless cinematic canvas / seamless instrument field`：取消主舞台、读数区和项目签名的闭合外框，让 DOM、3D、静态仪器与全站背景共享同一开放画布。
- 为首页、Arc、Rialo 和项目详情建立克制的五级动效体验：首屏入场、环境微动、交互反馈、沉浸式路由过渡与 `prefers-reduced-motion` 静态终态；动效不得阻塞导航、改变语义或突破既有性能预算。
- 根据用户于 2026-07-27 确认的 `Living Monument / Cinematic Project Reel` 方向，把“完整说明书式作品集”重构为“一屏一个主角、一句判断、一个动作”的电影化项目放映厅：删除 Home、Arc 与 Rialo 的重复说明区，把 3D 从装饰背景提升为受项目/阶段选择驱动的有限时长叙事主体，并把详情页压缩为 `Problem / Mechanism / Proof` 三章。
- 为 Home、Arc 与 Rialo 建立 committed selection、短时预览和有限 3D morph 契约；沉浸式路由继续共享单 Canvas，详情页继续使用轻量项目签名和感知连续的 DOM handoff，不把完整 Three.js 世界扩散到 cold routes。
- 将全部公开表面统一为英文，包括可见文案、隐藏辅助文本、aria、图片替代文本、metadata、Open Graph、JSON-LD、404 和错误状态，并把页面与结构化数据语言声明设为 `en`。
- 建立明确的控件权重：安静导航、单一主要 CTA、次级动作和领域状态选择器；以确定性 Static 模式截图防止视觉方向再次漂移。
- 增加响应式布局、键盘操作、可读状态表达、语义化结构和减少动态效果支持。
- 为全部公开路由增加元数据、Open Graph 信息、站点地图、404 页面和安全的外部作品链接。
- 建立自动化测试、构建检查和性能预算，为最终部署到 Vercel 做准备；本变更不直接执行生产部署。

## Capabilities

### New Capabilities

- `project-universe-navigation`: 定义站点路由、全局导航、生态分类页以及从首页进入各项目的浏览路径。
- `project-content-and-detail`: 定义项目内容模型、首批四个项目的数据完整性以及统一项目详情页的展示要求。
- `progressive-visual-experience`: 定义 3D、滚动动效、路由过渡及其性能与降级行为。
- `site-quality-and-discovery`: 定义响应式、无障碍、SEO、外链安全、测试和性能质量门槛。

### Modified Capabilities

无。

## Impact

- 新增 Next.js App Router、React、TypeScript 与样式/动效/3D 相关依赖。
- 新增网站路由、组件、项目数据、图片资产、字体、测试与构建配置。
- 后续电影化视觉增量优先复用现有 CSS、`motion` 依赖、scene-target 协议和按需 Canvas 生命周期，不新增运行时依赖。
- 读取现有四个本地项目中的公开截图与说明作为作品内容来源，但不修改这些项目。
- 作品链接继续指向现有 Vercel 站点；不新增账号、后台、数据库、CMS、支付或链上写入能力。
- 最终运行目标为 Vercel；当前阶段只完成可部署实现与部署前验证，不创建生产部署。
