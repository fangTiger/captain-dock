## ADDED Requirements

### Requirement: 公开路由结构
系统 SHALL 提供首页、生态分类页、项目详情页和关于页，并为首批内容生成以下公开路由：`/`、`/arc`、`/arc/signal-ledger`、`/arc/hadron`、`/arc/arcpredict`、`/rialo`、`/rialo/rialo-captain`、`/about`。

#### Scenario: 构建全部公开路由
- **WHEN** 执行生产构建
- **THEN** 构建结果包含全部八个公开路由且没有运行时内容依赖

#### Scenario: 访问未知项目
- **WHEN** 访问不存在的生态或项目 slug
- **THEN** 系统返回带有返回项目入口的 404 页面

### Requirement: 首页项目宇宙入口
首页 SHALL 以 Project Reel 一次突出一个活动项目，同时持续提供 Arc 与 Rialo 两个生态入口、四个首批项目的语义化可发现入口以及清晰的个人作品集身份。

#### Scenario: 从首页进入生态
- **WHEN** 用户激活 Arc 或 Rialo 生态入口
- **THEN** 系统导航到对应的 `/arc` 或 `/rialo` 页面

#### Scenario: 不依赖视觉浏览项目
- **WHEN** 3D、动画或 CSS 装饰未加载
- **THEN** 用户仍能从语义化链接找到两个生态和四个项目

#### Scenario: 首页无 JavaScript
- **WHEN** 用户禁用 JavaScript 访问首页
- **THEN** 页面显示四个项目和两个生态的可见真实链接，不依赖不可操作 selector 或隐藏内容

#### Scenario: 切换首页活动项目
- **WHEN** 用户使用项目索引、键盘或触摸控件选择另一个项目
- **THEN** 活动项目名称、短判断、主要 CTA、视觉主体和 scene target 同步更新，其他三个项目入口仍可发现

### Requirement: 生态分类页
生态分类页 SHALL 使用同一电影化状态语言展示生态项目与核心机制，同时允许 Arc 与 Rialo 使用不同的视觉母题；页面 MUST NOT 在主仪器后重复完整项目卡片索引或解释当前 route 的说明段。

#### Scenario: 浏览 Arc 分类页
- **WHEN** 用户访问 `/arc`
- **THEN** 页面通过三个持续可发现的状态控件展示 SIGNAL/LEDGER、HADRON 与 ArcPredict，并一次只突出一个活动项目的判断、readout 和主要 CTA

#### Scenario: Arc 无 JavaScript
- **WHEN** 用户禁用 JavaScript 访问 `/arc`
- **THEN** 页面显示 SIGNAL/LEDGER、HADRON 与 ArcPredict 三个可见真实详情链接

#### Scenario: 浏览 Rialo 分类页
- **WHEN** 用户访问 `/rialo`
- **THEN** 页面展示 Rialo Captain 的唯一主要入口以及持续可发现的“观察、保障、触发、结算、解释”阶段，并一次只展开当前阶段说明

#### Scenario: Rialo 无 JavaScript
- **WHEN** 用户禁用 JavaScript 访问 `/rialo`
- **THEN** 页面显示 Rialo Captain 的可见真实详情链接与五阶段等价文字

### Requirement: 全局导航与当前位置
所有公开页面 SHALL 提供键盘可达的全局导航、跳至正文入口和可识别的当前位置；项目详情页 MUST 提供返回所属生态和前往下一项目的路径。

#### Scenario: 键盘浏览导航
- **WHEN** 用户仅使用键盘从页面顶部开始浏览
- **THEN** 用户可以先跳至正文，并依次到达全局导航、主要内容和页面 CTA

#### Scenario: 从项目返回生态
- **WHEN** 用户在项目详情页激活所属生态链接
- **THEN** 系统导航到正确的 `/arc` 或 `/rialo` 页面

### Requirement: 站内导航不嵌入外部产品
系统 MUST 使用作品截图、说明和明确的外部 CTA 展示项目，且 SHALL NOT 使用 iframe 嵌入现有作品站点。

#### Scenario: 查看项目证据
- **WHEN** 用户浏览项目详情页
- **THEN** 关键产品证据以内嵌图片和文字说明呈现，在线体验通过独立外部链接打开

### Requirement: Living Monument 电影化首屏
首页、Arc 与 Rialo SHALL 使用用户确认的 Living Monument / Cinematic Project Reel 作为首屏构图基准：一个视觉主体、一个活动项目或阶段、一句核心判断和一个主要动作；MUST NOT 使用通用 Hero、双列大卡、重复目录或完整说明书作为首屏主体。

#### Scenario: 查看首页首屏
- **WHEN** 用户以桌面视口访问首页
- **THEN** 项目宇宙机械主体占据主要视觉面积，一个活动项目获得明确主导层级，四项目与 Arc/Rialo 索引仍以紧凑语义控件持续可发现

#### Scenario: 切换 Arc 项目状态
- **WHEN** 用户使用指针或键盘激活 Research、Exchange 或 Forecast 选择器
- **THEN** 同一 Arc 场域更新活动项目的标题、短判断、主要 CTA、仪器构型与 committed scene target，并保留对应详情链接

#### Scenario: 浏览 Rialo 生态
- **WHEN** 用户访问 `/rialo`
- **THEN** Observe、Cover、Trigger、Settle、Explain 五阶段成为首屏事件轨且可以仅用键盘切换，Trigger 产生最强但有限时长的叙事反馈

#### Scenario: 收束沉浸页的可见主层
- **WHEN** 用户查看 Home、Arc 或 Rialo 的首屏主层
- **THEN** 页面只让一个主角、一句当前判断和一个主要动作占据主视觉层级，不重复显示相同的项目名、阶段说明、route 解释或 CTA

#### Scenario: 保留被收束的事实
- **WHEN** 视觉层级隐藏或折叠次级项目与阶段说明
- **THEN** 四项目、两生态、Arc 三状态、Rialo 五阶段、真实路由和 live URL 仍存在于语义 DOM、原生渐进披露或无 JavaScript 等价链接中

### Requirement: 清晰的控件权重
每个首屏 SHALL 只提供一个主要 CTA，并通过安静导航、次级动作和领域选择器表达不同操作权重。

#### Scenario: 快速识别主要动作
- **WHEN** 用户查看任一项目详情首屏
- **THEN** `Launch live site` 是唯一主要 CTA，站内继续阅读或返回操作以次级样式呈现

### Requirement: 开放式仪器导航
首页项目入口、Arc 三状态选择器与 Rialo 五阶段轨 SHALL 保留真实链接或按钮语义，同时以紧凑索引、节点、短引线、分段基线和活动刻度组织，不得依赖常驻闭合卡片或完整表格边框表达可操作性。

#### Scenario: 首页发现项目
- **WHEN** 用户浏览首页开放式项目轨道
- **THEN** 四个项目的名称和编号持续可见，活动项显示唯一短判断与真实详情 CTA，hover 与 focus 提供等价的短时预览；无 JavaScript fallback 提供全部真实详情链接

#### Scenario: 增强态项目选择
- **WHEN** JavaScript 可用且用户以 Enter 或 Space 激活 Home、Arc 或 Rialo selector
- **THEN** 控件只提交新的活动项目或阶段；进入详情由当前活动项目的唯一真实 CTA 承担

#### Scenario: 切换生态仪器状态
- **WHEN** 用户使用指针或键盘切换 Arc 或 Rialo 状态
- **THEN** 活动刻度、readout、仪器状态和可访问状态同步更新，未活动项仍保持可发现

### Requirement: Carrier Spine 路由接力
`[data-universe-content]` 内的生态/项目真实链接与活动 CTA 在沉浸式页面之间以及进入详情时 SHALL 使用同一个可追踪的局部 carrier 表达方向和因果，MUST NOT 使用全屏深色 veil、第二次从零开始的 arrival 遮罩或独立模板化 crossfade。根布局 Header/Footer、history、modified click 与 direct load SHALL 保持原生导航且不遗留 stale carrier。

#### Scenario: 沉浸式页面间导航
- **WHEN** 用户从 Home 导航到 Arc 或 Rialo
- **THEN** track、hard-edge mass 与 leading signal 在既有 600ms timeline 中使用相同 carrier target、token 和单调 progress 穿过画布；透明 viewport root 没有背景，在 120/300/480ms 的三个真实部件 rect 总面积不超过视口 35%，Canvas 使用独立 route transition token/target 并在 700ms 内回到目标 route 的 demand 终态

#### Scenario: 进入项目详情
- **WHEN** 用户从活动项目 CTA 进入对应详情
- **THEN** 详情 arrival 继续消费相同 carrier destination、target、token，并从既有 persisted start 重算已流逝 progress；destination 首帧 progress 不小于 source 末帧，由项目 signature motion trace 接住 carrier，且不得新增 persisted progress、重新播放全屏 veil或加载完整 Canvas

#### Scenario: 使用全局导航或 history
- **WHEN** 用户激活 bridge 外的 Header/Footer 链接、modified click、后退/前进或直接加载 route
- **THEN** 浏览器保持原生导航语义，页面不强制创建 carrier 且不残留旧 token 的 actor

#### Scenario: 路由接力降级
- **WHEN** 用户要求减少动态效果、页面隐藏、handoff 已过期、直接加载详情或快速发起更新导航
- **THEN** 页面不渲染 carrier，或只保留最新 token 的 carrier，并立即呈现最新目标的完整可操作终态
