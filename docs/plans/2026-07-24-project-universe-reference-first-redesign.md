# Project Universe A 版基准重构设计

## 状态

- 用户于 2026-07-24 明确选择方案 A。
- 当前实现的视觉验收结论为 `DOWNGRADE_USER_VISUAL_ACCEPTANCE_TO_DESIGN`。
- 本轮只重构视觉母版、公开文案和控件体系；不部署、不改变八条公开路由或四个在线作品地址。

## 唯一视觉基准

实现必须以以下两份已确认原型为视觉事实源：

| 原型 | 路径 | SHA-256 |
| --- | --- | --- |
| 首页与 Arc | `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html` | `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a` |
| Rialo 与项目详情 | `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html` | `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c` |

“按 A 版重做”不是把 SVG 原样贴进页面，而是让真实 DOM、现有 3D 场景和响应式页面遵守相同的构图、字体层级、颜色关系、控件权重和空间节奏。

## 视觉方向

站点是一台个人维护的数字观测仪，而不是传统的作品卡片网站。

- 桌面首屏使用一个接近 `1200:720` 的全幅 Instrument Stage。
- 标题、机械天体、项目节点、生态索引和底部提示属于同一坐标与层级系统。
- 背景使用克制网格、局部辉光、细描边和极少阴影；禁止恢复“大卡套小卡”的 SaaS 仪表盘风格。
- 展示标题使用 Georgia/Times 系的常规衬线体；正文使用本地 Geist；数据标签使用 Geist Mono。
- 等宽标签允许 `.08em–.13em` 字距，标题保持紧凑负字距；旧版“全部 letter-spacing 为 0”的测试契约必须删除。
- Arc 使用冷青主色；SIGNAL/LEDGER、HADRON、ArcPredict 使用可区分的子色；Rialo 统一使用雷达绿并只把警告节点设为琥珀。

## 页面构图

### 首页

- 主标题为 `A UNIVERSE / OF THINGS / I’VE BUILT.`，而不是超大的 `Project Universe`。
- 四个项目在首屏轨道中直接可见，并拥有名称、简短能力标签和真实详情链接。
- Arc 与 Rialo 以右侧纵向 `01 / 02` 索引表达，不再用两个等权大卡作为首屏主结构。
- 现有完整项目目录可以保留在首屏之后，但应降为安静的索引轨，不得抢过主舞台。

### Arc

- 首屏是一台具有三种状态的观测仪。
- `01 RESEARCH`、`02 EXCHANGE`、`03 FORECAST` 是领域选择器，切换 SIGNAL/LEDGER、HADRON 与 ArcPredict 的标题、主张、仪器读数和场景 target。
- 选择器使用真实按钮、`aria-pressed` 和键盘操作；项目名称与详情链接必须存在于 DOM。

### Rialo

- 五阶段 Observe、Cover、Trigger、Settle、Explain 成为首屏主仪器，而不是排在通用 Hero 和项目卡之后。
- 保留现有 roving tabindex 与 `aria-pressed` 行为，将当前状态、短主张和雷达读数整合进同一舞台。
- 绿表示正常反应链，琥珀只表示触发或警告。

### 项目详情

- 首屏采用左侧项目定位与 CTA、右侧签名仪器的非对称双栏。
- 保留 Context、Core Loop、Product Proof、Stack、Gallery 等语义章节，但移除层层卡片容器。
- 每个首屏只提供一个主要 CTA `Launch live site ↗` 和一个次级站内动作；不能并排堆放两个同权大按钮。
- 四种项目签名 SVG 继续使用，但外层改成扁平仪器面，不再重复显示同一五阶段内容。

## 全英文契约

八条公开路由、404 和错误页不得出现用户可感知的中文。范围包括：

- 可见文本和隐藏的 accessible text。
- `aria-label`、`aria-description`、图片 `alt` 与可见 `caption`。
- metadata、Open Graph、Twitter、JSON-LD 和错误文案。
- `<html lang="en">` 与 JSON-LD `inLanguage: "en"`。

内部中文文档、测试说明和代码注释不属于页面公开表面。生产 HTML 和结构化数据必须增加 Han 字符门禁。

## 控件层级

只保留四种角色，不引入通用组件库：

1. `quiet-nav`：全局导航与页脚文本链接。
2. `primary-action`：每个首屏唯一的主要 CTA。
3. `secondary-action`：次级站内链接或外部作品入口。
4. `stage-selector`：Arc 三状态与 Rialo 五状态领域控件。

所有主要控件保持至少 `44×44px` 点击区域、清晰 focus ring、真实 `href` 或 `button` 语义。ExternalLink 继续独占 HTTPS、`target="_blank"` 和 `noopener noreferrer` 安全行为。

## 响应式与动效

- `> 560px` 尽量保持 A 版舞台比例，并通过 CSS Grid/绝对定位在可控容器内缩放。
- `≤ 560px` 不压缩完整桌面舞台，而是切换为精简的纵向项目/阶段结构。
- Canvas 仍为渐进增强，DOM 承担全部文字、链接和状态。
- 减少动态效果、节省数据、WebGL 不可用时显示与主舞台构图一致的静态版本。
- 不劫持页面滚动；可选指针视差不得成为使用项目入口的前提。

## 保留边界

保留以下已验证基础：

- 八条公开路由、404、catalog 类型、项目顺序和 live URL。
- UniverseShell、CapabilityGate、质量分级、错误恢复、单 Canvas 和资源清理。
- 三个程序化场景的概念与 scene target 协议。
- SEO schema、安全头、外链安全、图片资产和性能预算。
- Rialo 键盘状态机、项目详情章节语义和四个签名母题。

## 明确排除

- 不引入 CMS、数据库、登录、多语言路由或新外部依赖。
- 不修改四个外部项目。
- 不编造作者履历、项目指标或业务数据。
- 不部署到 Vercel，不占用端口 3000，不提交 Git。

## 验收

- 1440px 首页、Arc、Rialo 和代表性详情页在首屏构图上明显对应两份 A 版原型。
- 390px 与 320px 使用精简移动结构，无水平滚动或裁切。
- 全部公开 HTML、metadata、JSON-LD、alt 和 accessible text 无 Han 字符。
- 控件权重清晰，首屏不存在两个同权主 CTA，也不存在传统双列大卡作为主视觉。
- 既有路由、键盘、axe、3D 降级、性能和安全门禁继续通过。
- Static 模式建立确定性视觉回归；最终仍由用户查看真实浏览器效果后确认。
