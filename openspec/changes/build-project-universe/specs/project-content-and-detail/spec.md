## ADDED Requirements

### Requirement: 单一项目目录
系统 SHALL 通过一个类型安全的内容目录维护生态、项目、路由、主题和媒体信息，页面组件不得分别硬编码同一项目的重复元数据。

#### Scenario: 新增项目
- **WHEN** 开发者向内容目录添加一个满足类型约束的新项目并将其关联到生态
- **THEN** 对应生态列表、静态项目路由、站点地图和项目导航可以从同一条数据生成

#### Scenario: 内容缺少必要字段
- **WHEN** 项目条目缺少 slug、名称、所属生态、摘要、状态、在线地址、核心闭环或媒体替代文本
- **THEN** 类型检查或内容测试失败

### Requirement: 首批项目资料
系统 SHALL 收录以下四个项目并保持正确分组与在线地址：

- SIGNAL/LEDGER：Arc，`https://arc-signal-ledger.vercel.app/`
- HADRON：Arc，`https://arc-hadron.vercel.app/`
- ArcPredict：Arc，`https://web-arcpredict.vercel.app/`
- Rialo Captain：Rialo，`https://captain-rialo.vercel.app/login`

#### Scenario: 校验项目分组
- **WHEN** 内容测试读取首批目录
- **THEN** Arc 包含三个项目、Rialo 包含一个项目，并且每个项目 slug 唯一

#### Scenario: 打开在线作品
- **WHEN** 用户激活任一项目的主 CTA
- **THEN** 浏览器打开该项目配置的正确在线地址

### Requirement: 统一案例详情结构
每个项目详情页 SHALL 以 `Problem / Mechanism / Proof` 三个主章节呈现项目定位、角色与状态、问题与约束、核心闭环、产品证据、图库、技术边界、限制、在线入口和下一项目；次级技术事实 MAY 使用默认收起但键盘可操作的渐进披露。

#### Scenario: 快速理解项目
- **WHEN** 用户只阅读项目首屏
- **THEN** 用户可以识别项目是什么、解决什么问题、当前状态以及如何打开体验

#### Scenario: 深入阅读项目
- **WHEN** 用户继续浏览完整详情页
- **THEN** 用户可以在三个主章节或明确的技术说明披露中找到核心流程、至少三项产品证据、技术栈/边界、限制说明和下一项目入口

### Requirement: 项目专属闭环
系统 SHALL 为每个项目展示不超过五个、具有项目语义的核心闭环节点，并提供等价的文字版本。

#### Scenario: 展示 SIGNAL/LEDGER 闭环
- **WHEN** 用户浏览 SIGNAL/LEDGER 详情页
- **THEN** 页面表达“设定预算、选择付费来源、支付调用、生成报告、记录 Receipt”的闭环

#### Scenario: 展示 HADRON 闭环
- **WHEN** 用户浏览 HADRON 详情页
- **THEN** 页面表达“发行、挂单/出价、成交、USDC 结算、持仓/收益”的闭环

#### Scenario: 展示 ArcPredict 闭环
- **WHEN** 用户浏览 ArcPredict 详情页
- **THEN** 页面表达“开市、下注、结果提议、挑战/确认、Claim”的闭环，并说明 AI 不参与最终结算

#### Scenario: 展示 Rialo Captain 闭环
- **WHEN** 用户浏览 Rialo Captain 详情页
- **THEN** 页面表达“观察航班、购买保障、检测延误、自动结算、证据与 AI 解释”的闭环

### Requirement: 可验证的产品证据
项目详情页 SHALL 使用来自现有作品的真实截图或可追溯说明展示能力，不得把虚构指标或演示数据表述为真实运营结果。

#### Scenario: 展示演示数据
- **WHEN** 页面使用模拟航班、金额、市场或交易数据
- **THEN** 数据附近显示 `DEMO`、`TESTNET`、`EXPERIMENTAL` 或等价的明确状态说明

#### Scenario: 展示截图
- **WHEN** 页面呈现产品截图
- **THEN** 截图包含描述画面内容的替代文本和解释其证据意义的可见说明

### Requirement: 统一与差异化边界
项目详情页 SHALL 共享导航、排版尺度、章节顺序和 CTA 语义，同时通过主题令牌、图形母题和一个项目专属签名模块体现差异。

#### Scenario: 关闭主题颜色
- **WHEN** 项目主题颜色和装饰被移除
- **THEN** 四个项目详情页仍保持一致的信息层级与操作模式

#### Scenario: 识别项目品牌
- **WHEN** 用户查看项目 Hero 与签名模块
- **THEN** 用户可以通过账本、市场、概率或航线母题区分四个项目

### Requirement: 扁平仪器式案例版面
项目详情页 SHALL 使用项目专属海报式 Hero 与三个主叙事章节，MUST 避免把 Hero、签名、问题、流程、证据、图库、技术栈和限制分别包进同权嵌套卡片或同级长目录。

#### Scenario: 查看项目首屏
- **WHEN** 用户访问任一项目详情路由
- **THEN** 首屏以左侧项目定位与 CTA、右侧项目签名仪器的非对称布局呈现

#### Scenario: 继续阅读案例
- **WHEN** 用户从首屏向下浏览
- **THEN** Problem 承载矛盾与约束，Mechanism 承载核心闭环与技术边界，Proof 承载真实 evidence 与 gallery；限制和次级技术事实保持可访问但不形成额外同权章节

### Requirement: 开放式项目签名场域
项目详情首屏 SHALL 让文案与项目签名共享同一背景场域；签名 MUST 保留项目专属内部仪器语法，但不得使用外层强框与 diagram 内框形成双重封闭容器。

#### Scenario: 查看项目签名
- **WHEN** 用户访问任一项目详情路由
- **THEN** 账本、订单簿、概率或航线的轴线、网格、信号线和标签保持可辨识，同时签名背景自然融入案例首屏

#### Scenario: 减少动态效果下查看签名
- **WHEN** 用户启用减少动态效果
- **THEN** 签名扫描或路径运动停止，项目名称、状态、流程图和主要 CTA 仍完整可读

### Requirement: 详情叙事压缩不丢失事实
详情页 SHALL 删除重复表述和元说明，但 MUST 保留 catalog 中的真实项目状态、核心闭环、产品证据、技术/限制边界、live URL、生态返回和下一项目导航。

#### Scenario: 压缩重复内容
- **WHEN** 同一项目事实同时出现在 Hero、流程、证据或技术说明中
- **THEN** 主叙事只保留一次完整表达，其他位置使用短标签、引用或渐进披露而不重复整段说明

#### Scenario: 无 JavaScript阅读详情
- **WHEN** JavaScript 不可用或交互动效未加载
- **THEN** 三个主章节、真实证据、技术/限制事实、live URL 和站内导航仍存在于服务端 HTML

### Requirement: 编辑式详情阅读层级
详情页 SHALL 以项目名、tagline、summary、核心步骤名称和证据标题构成主要阅读层，并把较长技术与边界事实放入原生可访问的渐进披露；MUST NOT 通过窄标题列、逐字母断词、重复四边框或全宽扫描面制造报告式视觉噪声。

#### Scenario: 阅读主要叙事
- **WHEN** 用户不展开任何次级披露
- **THEN** Hero、Problem、Mechanism 与 Proof 仍提供项目定位、问题、核心机制、证据状态和唯一 live CTA，章节标题按完整英文单词显示

#### Scenario: 展开技术与边界事实
- **WHEN** 用户用指针或键盘展开 Technical notes、Boundaries 或证据说明
- **THEN** status、roles、tags、stack、limits、步骤描述、证据描述与媒体 caption 可完整读取，并保持 catalog 事实不变

#### Scenario: 查看项目签名终态
- **WHEN** 用户查看详情 Hero 的项目签名
- **THEN** 只保留项目专属内部轴、路径、节点、刻度和最多一个低幅 pulse，不出现外侧轨、双重横线或覆盖整个签名的扫描面

### Requirement: 媒体优先的编辑式仪器切面
四个详情页 SHALL 在不删除项目事实的前提下，把默认收起阅读压缩为 Hero 与 `Problem / Mechanism / Proof` 三个有明显节奏差异的切面；Proof MUST 先呈现真实媒体，再呈现文字 evidence，MUST NOT 留下空黑媒体框、重复全宽分隔或报告式巨大留白。

#### Scenario: 查看默认收起详情
- **WHEN** 用户以 1440×1000 或 390×844 查看任一项目且不展开 disclosures
- **THEN** Hero、三章、唯一 live CTA、代表媒体、生态返回与下一项目均可发现，文档高度分别不超过 3200px 与 3400px，且没有横向溢出

#### Scenario: 查看 Mechanism
- **WHEN** 用户在宽桌面、中等视口或移动端浏览最多五个核心步骤
- **THEN** 步骤分别使用横向 sequencer、3+2 或紧凑纵轨排列，步骤名称持续可见，完整描述与技术事实可通过原生键盘可操作 disclosures 读取

#### Scenario: 查看 Proof 代表媒体
- **WHEN** 详情页导航完成但用户尚未滚动到 Proof
- **THEN** 每页 `gallery[0]` 代表性真实 WebP 已开始确定性加载且最终 natural size 非零，不使用 Next `priority`/`preload` 或 high fetch priority；若 React 服务端自动提升 eager image，MAY 仅用原生 low fetch priority 抑制该 preload，`gallery[1..]` 保持 lazy，所有媒体的 alt、caption 与证据状态保持可访问

#### Scenario: 展开全部次级事实
- **WHEN** 用户展开 Boundaries、Technical notes、步骤说明、证据说明与 Media notes
- **THEN** catalog 中的 limits、roles、tags、stack、描述与 caption 全部可读取，页面允许自然增长但不产生裁切或横向滚动
