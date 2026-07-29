## ADDED Requirements

### Requirement: 3D 是渐进增强
系统 SHALL 把 3D 场景作为语义化 DOM 内容之上的渐进增强，任何导航、项目名称、状态、核心流程或 CTA 都不得只存在于 Canvas 中。

#### Scenario: WebGL 可用
- **WHEN** 设备支持 WebGL 且未触发静态降级
- **THEN** 页面在可读 DOM 内容之上加载与当前生态相符的 3D 场景

#### Scenario: WebGL 不可用
- **WHEN** Canvas 初始化失败、WebGL 不可用或场景错误边界被触发
- **THEN** CapabilityGate 最多执行一次 StrictMode-safe 的 off-DOM WebGL2 能力探测并释放临时 context；失败时不挂真实 Canvas、不请求非必要增强场景，页面显示视觉连续的 SVG/CSS 静态替代并保留全部内容与导航

### Requirement: 场景具有路由语义
首页、Arc 与 Rialo 生态页 SHALL 使用不同但同源的空间母题；项目详情页 SHALL 优先使用轻量的项目签名视觉而非重复加载完整 3D 世界。

#### Scenario: 首页场景
- **WHEN** 用户访问首页
- **THEN** 场景使用轨道、节点和生态簇表达项目宇宙及 Arc/Rialo 分支

#### Scenario: Arc 场景
- **WHEN** 用户访问 `/arc`
- **THEN** 场景使用冷色轨道、账本/市场/概率信号表达三个 Arc 项目

#### Scenario: Rialo 场景
- **WHEN** 用户访问 `/rialo`
- **THEN** 场景使用雷达、航线与风险走廊表达从航班观察到结算解释的闭环

### Requirement: 分级视觉质量
系统 SHALL 根据视口、用户偏好、WebGL 能力和运行时性能选择 High、Medium、Low、Static 四个视觉等级，并 MUST 在降级过程中保持内容和操作等价。

#### Scenario: 高质量桌面场景
- **WHEN** 设备性能充足、视口达到桌面阈值且用户未要求减少动态效果
- **THEN** 系统允许完整场景、有限指针视差和一次性入场动画

#### Scenario: 中等质量场景
- **WHEN** 设备运行时性能回退或视口较小
- **THEN** 系统降低 DPR、几何密度和效果数量，并关闭昂贵的后处理

#### Scenario: 低质量场景
- **WHEN** Medium 等级仍无法稳定达到移动端性能目标
- **THEN** 系统使用 DPR 1、基础几何和按需渲染，并关闭环境粒子、扫线和全部后处理

#### Scenario: 静态视觉
- **WHEN** 用户启用减少动态效果、启用低数据偏好、设备能力不足或 Canvas 初始化失败
- **THEN** 系统使用 SVG/CSS 静态画面且不下载非必要的重型场景资产

### Requirement: 尊重减少动态效果偏好
系统 MUST 尊重 `prefers-reduced-motion`，关闭持续旋转、视差、路径追随、强制平滑滚动和非必要路由动画。

#### Scenario: 减少动态效果
- **WHEN** 浏览器报告 `prefers-reduced-motion: reduce`
- **THEN** 内容以静态终态呈现，状态变化仍通过文字和结构表达

### Requirement: 动效不劫持浏览
系统 SHALL 使用正常文档滚动和可中断的短动画，不得使用强制滚动吸附、滚动劫持、高频闪烁或依赖 hover 才能发现的关键信息。

#### Scenario: 中断入场动画
- **WHEN** 用户在入场动画期间滚动、切换路由或进行操作
- **THEN** 动画立即让位于用户操作且页面保持稳定可用

#### Scenario: 触摸设备浏览
- **WHEN** 用户在没有 hover 的触摸设备上浏览
- **THEN** 所有关键信息均通过可见文本或显式控件访问

### Requirement: 3D 资源受控
每个页面 SHALL 同时只挂载一个 Canvas，并在路由离开或组件卸载时释放监听器、纹理、几何体和动画资源。

#### Scenario: 连续切换生态
- **WHEN** 用户在首页、Arc 与 Rialo 之间重复导航
- **THEN** 页面不会累积多个 Canvas、重复事件监听或持续运行的离屏渲染循环

### Requirement: 视觉增强与 A 版构图连续
Canvas、Static fallback 与 DOM 舞台 SHALL 表达同一 Living Monument 构图，3D 不得退化成与活动项目、阶段和主要动作无关的背景装饰。

#### Scenario: 3D 首帧完成
- **WHEN** 首页或生态页的 Canvas 成功绘制
- **THEN** 机械核心、轨道或雷达与 DOM 活动项目、主要 CTA、选择器和紧凑索引形成同一主体，并响应同一个 effective scene target

#### Scenario: 首帧 shader 预编译能力分支
- **WHEN** 增强态 WebGL renderer 已创建并提交当前 lazy scene
- **THEN** 只有 context 支持 `KHR_parallel_shader_compile` 时才调用 `compileAsync` 并在 Promise 完成前暂停实际 frameloop；不支持时不得调用 whole-scene `compileAsync`、fence 或同步完成查询，且 MUST 立即释放既有有限渲染路径而不是把可选扩展缺失视为 Canvas failure

#### Scenario: 静态降级
- **WHEN** 页面进入 Static 模式
- **THEN** 静态视觉保持相同的标题层级、项目/阶段位置关系和操作入口，不回退成通用卡片 Hero

### Requirement: 无边界电影化场域
首页、Arc 与 Rialo SHALL 把全站背景、DOM 舞台、Static fallback 与 Canvas 表达为同一开放场域，MUST NOT 使用闭合主舞台外框、内缩完整矩形或不透明面板把机械视觉与页面背景分割开。

#### Scenario: 桌面沉浸式首屏
- **WHEN** 用户以桌面视口访问首页、Arc 或 Rialo
- **THEN** 标题、项目节点、readout、轨道或雷达位于同一开放画布，背景网格与局部辉光可以跨越原舞台边界

#### Scenario: 移动端沉浸式首屏
- **WHEN** 视口不超过 560px
- **THEN** 页面使用正常文档流和开放式局部结构线，不显示贯穿首屏的左右舞台竖框

### Requirement: 电影化且有限的动态体验
系统 SHALL 提供首屏空间建立、项目/阶段 morph、短时预览、环境呼吸和路由 handoff，并 MUST 使全部运动可中断、可暂停、可降级且不承载唯一信息。

#### Scenario: 首屏入场
- **WHEN** 用户进入公开路由且未要求减少动态效果
- **THEN** 标题、活动项目、仪器和控件在 1000–1400ms 内完成一次空间建立，主要内容、项目索引和链接从首帧起可读可操作

#### Scenario: 环境微动
- **WHEN** 沉浸式首屏可见且质量等级允许动态增强
- **THEN** 页面同时最多有一个 6–10s 主环境运动和一个低幅辅助源，Canvas 不因环境装饰而强制长期保持 60fps

#### Scenario: committed 项目或阶段切换
- **WHEN** 用户激活项目节点、Arc selector 或 Rialo 阶段
- **THEN** DOM readout、主要 CTA、活动结构线和 Canvas 在 650–900ms 的有限 morph 中表达同一 committed target，并在完成后回到按需渲染

#### Scenario: hover 与 focus 预览
- **WHEN** 用户 hover 或 focus 一个未活动项目或阶段
- **THEN** 装饰性 DOM、Static fallback highlight 与 Canvas 在 180–260ms 内提供等价预览；离开后回到 committed target，语义标题、主要 CTA、`aria-pressed/current` 和 live region 保持 committed 状态

#### Scenario: committed target 的重复 pointer/focus
- **WHEN** 用户已经提交一个项目或阶段，而 pointer/focus 随后进入并离开同一个 committed 控件
- **THEN** 该输入序列是视觉 no-op，不重启 preview、不改变 commit revision 或 effective target，也不得把正在进行的 650–900ms committed morph 截短为 preview budget

#### Scenario: committed 状态播报
- **WHEN** 用户激活一个新的 committed 项目或阶段
- **THEN** 语义标题、主要 CTA、`aria-pressed/current` 和 live region 同步更新，单次 commit 最多产生一次状态播报

#### Scenario: 沉浸式路由 handoff
- **WHEN** 用户在 Home、Arc 与 Rialo 之间通过真实链接导航
- **THEN** 单 Canvas 和 DOM 在总计不超过 700ms 的可取消过渡中连续变化，快速导航和 history 使用最新目标且不累积场景

#### Scenario: 从沉浸式页面进入详情
- **WHEN** 用户激活活动项目的主要 CTA
- **THEN** 页面用相同项目色与签名母题完成轻量 DOM handoff，详情页不加载完整 Canvas

#### Scenario: 减少动态效果终态
- **WHEN** 用户启用 `prefers-reduced-motion: reduce`
- **THEN** 所有持续循环、视差、镜头和位移 morph 停止，页面直接显示完整静态终态；可选状态淡入不超过 240ms

### Requirement: committed 与 preview 场景状态
沉浸式页面 SHALL 区分稳定的 committed target 与 pointer/focus preview target，并 MUST 使用 `previewTarget ?? committedTarget ?? routeDefaultTarget` 作为唯一 effective target。

#### Scenario: 预览结束
- **WHEN** pointer 或 focus 离开未活动项目
- **THEN** DOM、Static fallback 与 Canvas 回到当前 committed target，而不是清空到无目标或错误默认值

#### Scenario: 连续快速选择
- **WHEN** 用户在前一个 morph 完成前激活另一个项目或阶段
- **THEN** 系统取消旧插值并从当前视觉状态过渡到最新 committed target，不产生长期渲染或过期 readout

### Requirement: 正常动效必须提供感知证据
电影化动效的验收 MUST 证明主体构型、位置、尺度、镜头或能量路径发生肉眼可辨的变化，不能仅以 CSS duration、动画名称或颜色替换作为完成证据。

#### Scenario: normal-motion 分帧审查
- **WHEN** 捕获首屏入场、项目切换或 Rialo Trigger 的起始、中间和终态
- **THEN** 分帧显示可辨认的空间或构型变化，且最终状态与 DOM 活动项一致

### Requirement: 场景专属的主体环境运动
Home、Arc 与 Rialo SHALL 让各自的大体量 protagonist 承担可感知的环境运动与光感分离，MUST NOT 只动画细线、背景扫描带或颜色。

#### Scenario: 桌面增强态环境运动
- **WHEN** 视口大于 768px、质量为 High 或 Medium、Canvas 已 ready 且用户未要求减少动态效果
- **THEN** 仅在 render state 为 demand、morph phase 为 idle 且 cinematic entry 已 settled 时，Home 的轨道纪念碑、Arc 的价值机器和 Rialo 的事件走廊分别产生场景专属的低频姿态变化，同屏最多一个主循环和一个低幅辅助循环

#### Scenario: 环境运动绑定真实主体
- **WHEN** 自动化检查环境动效 owner
- **THEN** 每条持续规则命中当前 DOM 中真实存在的大体量 protagonist，不能以不存在的旧 selector、伪元素细线或背景扫描带冒充主体运动

#### Scenario: Rialo 环境姿态与 committed 构型解耦
- **WHEN** Rialo 在桌面 High 或 Medium 增强态从 idle 环境循环进入 Cover、Trigger 或其他 committed morph
- **THEN** 一个真实大体量 corridor plane 以独立低幅位移承担环境主循环，route 只承担低幅 opacity 辅助；两条 animation identity 在 morph 边界保持并暂停，既有 signal-specific transform 在 780ms 内独立产生至少四步可辨空间变化，不得由 `.radar` 祖先 transform 的卸载或重建污染 committed 路径

#### Scenario: 主体与背景分离
- **WHEN** 用户查看任一沉浸式主角
- **THEN** 主体拥有可辨认的边缘高光或项目色反射，非活动网格与圆环的对比度低于主体，不形成第二个视觉焦点

#### Scenario: 环境运动静态终态
- **WHEN** 质量为 Low/Static、视口不大于 768px、saveData 开启、页面隐藏、首屏离开视口或用户要求减少动态效果
- **THEN** 持续环境循环停止，主体立即处于完整且可读的静态终态，Canvas 不为装饰保持持续帧循环

### Requirement: Rialo 可靠的响应式几何
Rialo SHALL 使用稳定 stage slot 契约形成开放事件场，MUST NOT 因 CSS Module 作用域错配把标题或 readout 压入单个基础网格列。

#### Scenario: Rialo 桌面事件场
- **WHEN** 用户以 1440×1000 视口查看 Rialo
- **THEN** scene 占舞台内部宽度的 60–70%，readout 保持 28–36ch，Rialo 标题按整词显示，五阶段轨位于独立区域，舞台高度不超过视口且各区域不重叠

#### Scenario: Rialo 移动事件场
- **WHEN** 用户以 390×844 视口查看 Rialo
- **THEN** title、scene、readout 与五阶段 index 按单列正常文档流排列，无重叠、负水平 margin、横向滚动、逐字母标题或被裁切 Radar

### Requirement: Home 感知明确但语义稳定的预览
Home SHALL 从 effective target 派生仅用于装饰的 visual project，同时继续从 committed target 派生项目名、判断、主要 CTA、`aria-pressed/current` 与 live region；MUST NOT 让 pointer/focus 预览提交语义状态或重启当前 committed timeline。

#### Scenario: 指针或键盘预览未提交项目
- **WHEN** 用户 hover 或 focus 一个未提交项目
- **THEN** 机械 mass/outline、monument horizon 与 accent field 至少三个可辨视觉通道在 220ms 内切换到该 visual project，活动项目文案、CTA、pressed/current 与 live region 保持 committed project

#### Scenario: 提交 Home 项目
- **WHEN** 用户 click、Enter 或 Space 提交当前 visual project
- **THEN** 页面执行 780ms committed morph 并只更新一次语义状态；同 committed target 的 hover/focus 是 no-op，离开其他预览则回到 committed visual project

#### Scenario: 观察环境微动
- **WHEN** 桌面 High/Medium、Canvas ready、demand、idle、entry settled 且首屏可见
- **THEN** Home、Arc 与 Rialo 的既有 protagonist 从可观察的中段相位开始每页最多一个 7–10s 主循环和一个辅助循环，主角产生约 12–18px 或 6–8° 的 transform 变化，signal/beacon 可产生约 24–30px 变化

#### Scenario: 停止环境微动
- **WHEN** 质量为 Low/Static、视口不大于 768px、saveData、页面隐藏、首屏离开视口、morph active 或减少动态效果
- **THEN** 所有环境循环停止并保持完整终态，不使用 blur、filter、layout 属性或永久 Canvas 帧

### Requirement: Rialo 移动阶段密度
Rialo 在不超过 420px 时 SHALL 同时保持五阶段可发现与单一活动说明，MUST NOT 让五条完整长标题形成同权信息墙或从可访问树删除 inactive 阶段事实。

#### Scenario: 查看 Rialo 移动阶段轨
- **WHEN** 用户以不超过 420px 的视口查看 Rialo
- **THEN** inactive 行只视觉显示编号与 Observe/Cover/Trigger/Settle/Explain 短信号，active 行显示完整阶段标题与唯一 description，五个 button 均至少 44px且完整可访问名称保留

#### Scenario: 沉浸舞台连接 footer
- **WHEN** 用户以桌面视口查看 Home、Arc 或 Rialo 的完整首屏
- **THEN** 主角与 viewport-bound 舞台高度保持，stage bottom 到 footer top 的可见间距位于 0–48px，不出现无意义的四分之一屏黑场
