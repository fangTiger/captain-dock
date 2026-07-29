# Project Universe — Living Monument / Cinematic Project Reel 设计

## 状态

- 用户于 2026-07-27 明确选择方向 A：`Living Monument / Cinematic Project Reel`。
- Task 13 的工程实现与独立审查保持 `PASS`，但用户视觉验收结论为 `DOWNGRADE_USER_VISUAL_ACCEPTANCE_TO_DESIGN`。
- 本轮属于同一 `build-project-universe` change 的 Task 14，不撤销 Task 13 证据，也不创建重叠 OpenSpec change。
- 本轮允许更新 Architecture 文档、OpenSpec、产品代码与测试；不部署 Vercel、不新增依赖、不提交 Git。

## 设计判断

当前版本的问题不是精度不足，而是页面同时承担说明书、索引、仪器和案例文档四种角色：

- Home 首屏已经出现四个项目，随后又由 Ecosystems、Projects 和 About 重复解释。
- Arc 与 Rialo 同时展示标题、长说明、3D、readout、CTA、selector 和尾部 route 说明。
- 详情页把 Context、Core Loop、Evidence、Gallery、Stack、Limits 等全部提升为同权章节。
- Task 13 的 720ms 入场、12–24s 环境循环和约 3.5px hover 在代码上存在，但缺少主体构型、位置、尺度或镜头变化，用户感知仍接近静态。

Task 14 的目标不是“再增加一些动画”，而是重新建立视觉主角、信息取舍和场景因果。

## 唯一创意原则

> One protagonist. One statement. One action.

每个首屏只保留：

1. 一个活动项目或阶段；
2. 一句 6–12 个英文词的核心判断；
3. 一个主要 CTA；
4. 一个占据主要视觉面积、会响应选择的机械主体；
5. 一个紧凑但完整的项目/阶段索引。

公开表面继续全部使用英文。文案表达作者判断，不解释页面结构。

## 页面统一策略

### Home：Project Reel

- 桌面首屏接近一屏完成主要体验，3D/Static 主体占据约 65–75% 的视觉面积。
- 默认活动项目为 SIGNAL/LEDGER。
- 一次只突出一个项目名称、短判断和主要 CTA。
- 四个项目与 Arc/Rialo 入口始终以真实链接存在于 DOM；未活动项保持可发现，但不重复显示完整摘要。
- 删除首屏后的 Ecosystems 长说明、四张 dossier 卡墙与 About 解释段。
- About 仍通过全局导航进入；不删除 `/about`。
- 不自动轮播，不捕获全页滚轮；选择通过按钮/链接、方向键和触摸等价操作完成。

### Arc：Three Value Machines

- Research、Exchange、Forecast 是同一机械主体的三种构型。
- 标题区只保留 Arc、一个短 statement 和当前项目。
- selector 始终显示三个项目；readout 只展开活动项目。
- 激活状态同时更新 committed scene target、DOM 文案、CTA、Static fallback 和 Canvas。
- 删除首屏后的 `Projects in Arc` 卡片索引与 `Ecosystem route` 说明。

### Rialo：One Reactive Event

- Observe、Cover、Trigger、Settle、Explain 形成一条连续事件轨。
- 五个阶段名称持续可见，只显示活动阶段的完整说明。
- Trigger 是全站最强的单次 motion moment：异常出现、雷达锁定、状态翻转和结算脉冲，但总时长有限。
- Rialo 只有一个项目，删除 `Projects in Rialo`、`1 project indexed` 和 route 解释。
- 保留现有 roving tabindex、`aria-pressed`、方向键和真实项目 CTA。

### 详情页：Poster + Proof

详情页继续不挂载完整 Canvas，以轻量项目签名承接沉浸式页面的项目 accent 和 motif。

三个主章节：

1. `Problem`：一句核心矛盾、必要约束与状态边界；
2. `Mechanism`：不超过五步的项目闭环与可渐进展开的技术说明；
3. `Proof`：至少三项真实 evidence、必要 gallery 和可验证结果。

必须继续保留：

- live URL；
- status / TESTNET / DEMO / EXPERIMENTAL 等事实边界；
- 核心闭环；
- 至少三项真实产品证据；
- 技术栈与限制；
- 返回生态和下一项目。

允许把 Stack、Limits 等次级事实放入默认收起的原生 `<details>` 或等价键盘可达结构，但无 JavaScript 时仍必须存在于 HTML。

## 共享场景状态

复用现有 `SceneTarget` 类型，不创建平行项目 ID。

```ts
type SceneTargetController = {
  committedTarget: SceneTarget | null
  previewTarget: SceneTarget | null
  effectiveTarget: SceneTarget | null
  commitTarget(target: SceneTarget): void
  setPreviewTarget(target: SceneTarget | null): void
}
```

优先级：

```text
previewTarget > committedTarget > routeDefaultTarget
```

- Home 默认：`project:signal-ledger`
- Arc 默认：`project:signal-ledger`
- Rialo 默认：`rialo-step:observe`
- pointer/focus 离开后回到 committed target，不清空视觉状态。
- 连续快速输入只保留最新 token。
- Canvas 继续 `aria-hidden`、无焦点、无 pointer/wheel 事件。
- committed target 才更新语义标题、主要 CTA、`aria-pressed/current` 和 live region；一次 commit 最多播报一次。
- preview 只更新装饰性 DOM、Static fallback highlight 与 Canvas，不改变语义标题、CTA 或辅助技术状态。

## 渐进增强入口

- JS 增强态：Home/Arc/Rialo selector 使用真实 button；Enter/Space commit，活动项目的唯一主要 CTA 使用真实详情 link。
- 无 JavaScript：Home 显示四项目与两生态的可见真实链接；Arc 显示三个项目的可见真实链接；Rialo 显示唯一项目的可见真实链接。
- no-JS 链接可以使用 `<noscript>` 或服务端 fallback rail，但必须在禁用 JavaScript 的真实浏览器中可见，不能依赖隐藏内容或不可操作 button。

## 动效层级

| 层级 | 时长 | 必须发生的变化 |
| --- | --- | --- |
| 首屏空间建立 | 1000–1400ms | 主体尺度/深度、标题遮罩或轨道展开；内容首帧可操作 |
| 项目/阶段 morph | 650–900ms | 构型、位置、尺度、相机或能量路径；不能只换颜色 |
| Route handoff | 500–700ms 总计 | 单 Canvas depart/morph/arrive；详情使用同 motif 的轻量 veil |
| Hover/focus preview | 180–260ms | 局部引线、光场、节点或标题响应；不改变 committed state |
| Ambient | 6–10s | 最多一个主运动和一个低幅辅助源 |
| Reduced motion | 0–240ms | 无视差、旋转、镜头和位移 morph；直接完整终态 |

场景 morph 只在插值期间主动 `invalidate()`，完成即回到 demand。不得以长期 `frameloop="always"`、大面积 filter/blur 或布局属性换取视觉冲击。

## 路由连续性

- Home、Arc、Rialo 保留 `(immersive)` 中的单一 UniverseShell。
- committed target 变化驱动场景，route pathname 驱动场景身份。
- 沉浸式路由使用现有 transition token 扩展有限 morph，并保持快速导航可取消。
- 进入详情时使用项目 accent、motif 和方向一致的 DOM handoff。
- 不把 UniverseShell 提升到根布局，不让四个详情页承担完整 3D 包。

## 边界与结构线

删除：

- Home、Arc、Rialo 的重复项目卡片区；
- route 自我说明文案；
- 无信息语义的闭合卡片、常驻四边框、重复分隔线；
- 同一事实的第二次完整段落；
- 为“科技感”存在的多余徽章、刻度、网格和全大写标签。

保留：

- focus outline；
- 主要 CTA 的实体边界；
- 表达轨道、时间、状态、坐标或数据关系的轴线；
- 当前项目/阶段活动刻度；
- 四个项目各自的签名内部结构。

## 内容预算

- Home 公开正文相对 Task 13 减少约 70–80%。
- Arc / Rialo 公开正文减少约 55–65%。
- 详情页重复文案减少约 45–60%。
- 桌面首屏同时可见英文文本目标：60–90 words。
- 390px 首屏同时可见英文文本目标：30–45 words。
- 同一项目完整描述在同一路由只出现一次。

内容预算是视觉验收指标，不允许通过 `display:none` 隐藏必需语义或事实来伪造。

## 性能与无障碍硬边界

- 不新增运行时依赖。
- full enhanced gzip ≤260KiB；每条沉浸式 route ≤250KiB；单 scene closure ≤45KiB。
- DPR High ≤1.5、Medium ≤1.25、Low =1。
- LCP ≤2.5s、CLS ≤0.1；Lighthouse Performance ≥0.90，其余 ≥0.95。
- 所有活动状态有文字和结构表达，不只依赖颜色。
- 真实 button/link 承担全部操作；至少 44×44px 触控目标。
- keyboard focus 与 hover 获得等价预览。
- 不自动轮播、不强制 snap、不滚动劫持、不高频 `aria-live`。
- no-JS、Static、saveData、WebGL unavailable 和 reduced-motion 仍能发现全部项目与 CTA。
- 详情页保持 cold route，不加载 Canvas。

## 验收证据

除现有六张 Static 基线外，必须新增 normal-motion 证据：

- Home 首屏起始、中间、终态；
- Home 从 SIGNAL/LEDGER 切到 HADRON 的起始、中间、终态；
- Arc 至少一次三构型切换；
- Rialo Observe → Trigger → Settle 的关键分帧；
- immersive → detail 的 depart/arrive 分帧；
- 390px 正常动效与 reduced-motion 终态。

Architecture 必须查看原图或短视频，不能只凭 animation 名称、duration 或测试通过接受。

## Out of scope

- 不新增项目、路由、CMS、数据库、登录或多语言。
- 不修改四个外部项目或真实链接。
- 不把完整 Canvas 扩展到详情与 About。
- 不新增 GLB、视频背景、物理引擎或大体积媒体。
- 不编造作者资料、运营指标或产品数据。
- 不部署 Vercel、不提交 Git。

## Stop conditions

- 需要新增依赖、第二 Canvas、详情共享真实 Canvas或长期 60fps。
- 需要修改 `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`、`.codex/**` 或未批准配置。
- 文案删减导致项目入口、真实证据、事实边界、SEO 或无 JavaScript 可读性丢失。
- committed target 无法通过明确 React 状态协议实现，只能依赖脆弱 DOM 查询。
- 包体、Lighthouse、键盘、axe、reduced-motion、响应式或外链安全门禁回退。
- 同一 task 连续修复三次仍失败。
- Architecture 尚未查看候选就需要更新视觉基线。
- 浏览器验证需要使用 3100 之外的端口。
- 完整构建/E2E 需要停止当前 3100 预览但尚未获得对应生命周期授权。
