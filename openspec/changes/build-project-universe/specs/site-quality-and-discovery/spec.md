## ADDED Requirements

### Requirement: 响应式阅读
系统 SHALL 在 320px 及以上视口提供可阅读布局；除明确标记的数据表或图表外，页面不得产生水平滚动。

#### Scenario: 320px 视口
- **WHEN** 用户以 320px 宽视口浏览任一公开路由
- **THEN** 标题、正文、导航、CTA 和项目证据按单列重排且不被裁切

#### Scenario: 移动端核心闭环
- **WHEN** 视口小于 768px
- **THEN** 桌面端粘滞或横向闭环降级为正常文档流中的纵向编号时间线

### Requirement: 键盘与语义无障碍
系统 SHALL 使用语义化 landmark、单一 `h1`、有序标题层级、可见焦点和至少 44×44px 的主要触控目标；所有功能 MUST 可仅用键盘完成。

#### Scenario: 键盘完成主要路径
- **WHEN** 用户仅使用 Tab、Shift+Tab、Enter、Space 和方向键
- **THEN** 用户可以导航站点、切换交互状态、打开项目与关闭任何覆盖层

#### Scenario: 自动化无障碍扫描
- **WHEN** 对全部公开路由运行自动化无障碍检查
- **THEN** 不存在 serious 或 critical 级别违规

### Requirement: 状态与视觉信息不只依赖颜色
系统 SHALL 使用文字、形状、图标或纹理补充颜色；正文对比度 MUST 达到 4.5:1，大字和 UI 图形 MUST 达到 3:1。

#### Scenario: 不辨颜色的用户查看状态
- **WHEN** 页面进入触发、结算、测试网或实验状态
- **THEN** 状态同时具有可读标签而非仅改变颜色

### Requirement: 路由发现与分享元数据
每个公开路由 SHALL 提供唯一标题、描述、规范 URL、Open Graph 信息，并被 `sitemap.xml` 收录；系统 SHALL 提供 `robots.txt` 和有意义的 404 元数据。

#### Scenario: 分享项目路由
- **WHEN** 社交抓取器请求任一项目详情页
- **THEN** 响应包含该项目名称、摘要和项目主题分享图

#### Scenario: 生成站点地图
- **WHEN** 执行生产构建
- **THEN** 站点地图包含八个公开路由且不包含未知或草稿项目

### Requirement: 外部链接安全
在新标签页打开的作品链接 SHALL 使用 `noopener noreferrer`，并通过可访问名称告知用户链接将打开外部站点。

#### Scenario: 打开作品站点
- **WHEN** 用户激活在线作品 CTA
- **THEN** 链接目标、协议、rel 属性和可访问名称通过内容测试

### Requirement: 页面性能预算
系统 SHALL 保证语义内容和主要 CTA 不被 3D 下载阻塞，并执行以下预算：LCP 目标不高于 2.5 秒、CLS 不高于 0.1、INP 目标不高于 200 毫秒；单个 3D 页面同时不超过一个 Canvas；桌面 High 等级不超过 70 个 draw call、120,000 个可见三角形和 1.5 DPR，移动 Medium 等级不超过 40 个 draw call、50,000 个可见三角形和 1.25 DPR。

#### Scenario: 3D 延迟加载
- **WHEN** 用户首次访问带 3D 的路由
- **THEN** 标题、导航和主要 CTA 先以 HTML 呈现，3D 客户端块独立延迟加载

#### Scenario: 运行时性能下降
- **WHEN** 场景性能监测连续触发回退
- **THEN** 系统降低 DPR 或视觉等级，而不是阻塞交互

### Requirement: 媒体加载质量
系统 SHALL 为截图提供明确尺寸、响应式资源、现代压缩格式和可见说明；首屏关键图片 SHALL 避免布局偏移，每个详情页的 `gallery[0]` MAY 为全页审查与 route arrival 确定性 eager 加载但不得 priority/preload，`gallery[1..]` 与其余非首屏媒体 SHALL 延迟加载。

#### Scenario: 加载项目图库
- **WHEN** 用户打开项目详情页
- **THEN** 首屏媒体保留尺寸空间，`gallery[0]` 代表性证据媒体确定性加载且 `gallery[1..]` 与其余非首屏图片在接近视口时加载

### Requirement: 自动化质量门
实现 SHALL 通过内容单元测试、组件交互测试、端到端路由测试、减少动态效果与静态回退测试、自动化无障碍检查、类型检查和生产构建。

#### Scenario: 提交实现
- **WHEN** 执行项目定义的完整验证命令
- **THEN** 全部测试、类型检查和生产构建以零错误结束

#### Scenario: 3D 回退回归
- **WHEN** 端到端测试模拟 WebGL 不可用和减少动态效果
- **THEN** 所有公开内容、导航和 CTA 仍可访问

### Requirement: 全英文公开表面
所有公开路由、404 和错误状态 SHALL 只向用户与机器消费者输出英文，并 MUST 使用 `en` 作为 HTML 与结构化数据语言声明。

#### Scenario: 扫描公开页面
- **WHEN** 构建后扫描可见文本、隐藏辅助文本、aria、alt/caption、metadata、OG/Twitter 和 JSON-LD
- **THEN** 不存在 Han 字符，且 `<html lang>` 与 JSON-LD `inLanguage` 均为 `en`

### Requirement: 确定性视觉回归
实现 SHALL 在 Static 模式为首页、Arc、Rialo 和代表性详情页保存桌面视觉基线，并为首页、Arc 与 Rialo 保存移动视觉基线。

#### Scenario: 视觉母版漂移
- **WHEN** 首屏标题、项目节点、领域选择器、签名仪器或控件层级偏离已接受基线
- **THEN** Playwright 视觉回归失败，并要求 Architecture 人工查看候选差异后再更新基线

#### Scenario: stage-local radial field
- **WHEN** Static 视觉测试检查 Home 或 Arc 的 accent pseudo
- **THEN** pseudo 与 stage 自身左右边界一致并保留 radial field，document/main/stage 均无内部横向溢出且不依赖 clipping；不得要求 pseudo 通过负 inset 扩展到 viewport 边界

#### Scenario: 批准构图后的母版迁移
- **WHEN** 已批准的 Living Monument、Editorial Instrument Cut、Rialo 移动密度或 stage/footer 节奏使旧像素母版预期失效
- **THEN** Architecture 先保存并查看七张候选原图，独立 Review Codex 审查结构门禁，专业 Art Director 给出 GO 后才一次性更新正式 snapshot；测试运行自动写出的缺失母版不得被视为已接受

#### Scenario: 正常动效漂移
- **WHEN** 首屏、项目切换或 Rialo Trigger 只产生不可感知的颜色/文字替换，或起始/中间/终态缺少明显差异
- **THEN** normal-motion 分帧门禁失败，并要求 Architecture 查看真实浏览器证据后再接受

### Requirement: 动效性能与无障碍边界
新增动效 SHALL 优先动画 transform 与 opacity，不得通过持续大面积 filter、blur、布局属性或长期 60fps Canvas 破坏性能预算；所有状态反馈 MUST 同时适用于键盘 focus，且不得出现高频闪烁。

#### Scenario: 动态增强运行
- **WHEN** High 或 Medium 质量的沉浸式首屏运行动效
- **THEN** 页面保持既有包体、LCP、CLS、draw call、三角形和 DPR 门槛，并在页面隐藏或场域离开视口时暂停

#### Scenario: 交互首次反馈预算
- **WHEN** 用户在 Home 提交项目、在 Arc 提交项目或在 Rialo 激活 Trigger
- **THEN** 活动属性、结构线或等价的首个可见反馈在 200ms 内出现，650–900ms 的完整 morph 不得延迟首次反馈

#### Scenario: 静态视觉回归
- **WHEN** 视觉测试以 reduced-motion / Static 模式捕获首页、Arc、Rialo 和代表详情页
- **THEN** 截图包含无边界终态且不依赖正在运行的动画获得正确构图

#### Scenario: 有限 morph 完成
- **WHEN** committed target 或 route 在增强态发生变化
- **THEN** Canvas 只在有限插值期间请求帧，完成后恢复 demand；页面隐藏、离开场域、Low/Static 或 reduced-motion 会停止该插值

#### Scenario: Home 冷启动 LongTask 门禁
- **WHEN** production E2E 从 fresh browser/context 冷启动 Home 增强态
- **THEN** Playwright MUST 使用完整 Chromium/new headless `channel: chromium`，等待真实 Canvas ready、settled 并回到 demand；`PerformanceObserver` MUST 可用且所有 LongTask 保持 `<=50ms`，不得使用 legacy headless shell 的软件 GPU 单-draw 噪声替代代表性浏览器，也不得降低阈值、跳过 collector 或改成 Static 模式

### Requirement: 专业视觉验收与证据吞吐
Living Monument 增量 SHALL 同时通过独立代码审查、Architecture 原图检查和专业视觉 GO；自动化证据采集 MUST NOT 通过放宽时间或变化门槛掩盖产品或工具缺陷。

#### Scenario: Rialo 移动视觉基线
- **WHEN** Static/reduced-motion 视觉矩阵运行
- **THEN** 除既有六张母版外还保存并检查 Rialo 390px 原图，证明单列顺序、整词标题、完整阶段轨和无裁切

#### Scenario: normal-motion checkpoint 吞吐
- **WHEN** normal-motion 在固定 checkpoint 捕获多帧证据
- **THEN** Playwright 使用完整 Chromium/new headless，且每帧实际 offset、lateness 与 facts-frame skew 被记录，现有 50ms 上限保持不变；超时时重构采集管线而不是降低阈值、帧数或主体变化要求

#### Scenario: 最终艺术方向 gate
- **WHEN** 独立 Review Codex 已对冻结实现给出 PASS
- **THEN** 专业 Art Director 仍以 1440px 和 390px 真实浏览器原图检查视觉层级、主体运动、模板化重复、留白和边界；只有 GO 才能把现有 3100 作为用户验收预览

#### Scenario: 第二轮专业预检恢复
- **WHEN** production 原图仍暴露局部网格或详情底板的矩形边界、主体欠曝或辅助运动缺少唯一方向性载体
- **THEN** 实现仅羽化现有画布边缘、提高现有主体中间调，并分别复用 Home beacon、Arc signal path 与详情 motion trace；不得新增文案、卡片、依赖、持续高成本特效或全局 overflow 隐藏

#### Scenario: 最终 NO_GO 恢复矩阵
- **WHEN** Carrier Spine、详情压缩、Home 感知预览与 Rialo 移动密度实现完成
- **THEN** Architecture 与专业 Art Director 检查 Home/Arc/Rialo/代表详情的 1440×1000 和 390×844 原图、Home normal-motion、Home→Arc 中段与终态、Rialo active/inactive 阶段和详情全页；只有独立 Review Codex PASS 且 Art Director GO 才可把 3100 声明为用户验收候选
