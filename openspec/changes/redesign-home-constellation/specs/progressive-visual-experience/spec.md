## MODIFIED Requirements

### Requirement: 场景具有路由语义
首页 SHALL 使用深空星座母题作为门面（发光节点 + 星座连线 + 冷蓝配色），并在同一屏内以底部索引条承载作品信息；Arc 与 Rialo 生态页 SHALL 使用不同但同源的空间母题；项目详情页 SHALL 优先使用轻量的项目签名视觉而非重复加载完整 3D 世界。

#### Scenario: 首页门面场景
- **WHEN** 用户访问首页
- **THEN** 场景呈现可交互的深空星座（发光节点、星座连线、冷蓝配色），星场密度与连线网保持不变

#### Scenario: 首页单屏构成
- **WHEN** 首页渲染完成
- **THEN** 视口内自上而下为站点 header、星场区与 manifesto、底部作品索引条，三者合计不超过一屏

#### Scenario: Arc 场景
- **WHEN** 用户访问 `/arc`
- **THEN** 场景使用冷色轨道、账本/市场/概率信号表达三个 Arc 项目

#### Scenario: Rialo 场景
- **WHEN** 用户访问 `/rialo`
- **THEN** 场景使用雷达、航线与风险走廊表达从航班观察到结算解释的闭环

## ADDED Requirements

### Requirement: 门面星座交互手感
门面星座 SHALL 提供缓动插值、GPU 合成的鼠标交互，并以固定基准手感 `responsiveness = 0.28`、`sensitivity = 1.0` 为准：鼠标偏移使星场产生视差旋转，wordmark 反向轻移，自定义光标略比星场更贴手；靠近发光节点时该节点渐亮。所有运动 MUST 可被滚动或操作中断，且不承载唯一信息。

#### Scenario: 指针视差
- **WHEN** 用户在门面移动鼠标且未要求减少动态效果
- **THEN** 星场以基准手感（responsiveness 0.28 / sensitivity 1.0）平滑视差旋转，光标与 wordmark 以缓动跟随而非硬跳

#### Scenario: 节点提亮来自索引条
- **WHEN** 用户 hover 或聚焦底部索引条的某个作品
- **THEN** 星场中对应节点在有限时间内渐亮

#### Scenario: 手感降级
- **WHEN** 用户要求减少动态效果或设备进入 Static 等级
- **THEN** 停用视差与自转，门面显示静态星图，索引条照常可用

### Requirement: 门面降级保持进入路径
当 WebGL 不可用、Canvas 初始化失败或用户启用减少动态效果时，门面 SHALL 显示视觉连续的静态星图（SVG/CSS）。因为索引条是服务端渲染的真实链接且不依赖 Canvas，进入作品的路径 MUST NOT 只存在于 Canvas 中这一条 SHALL 由索引条天然满足。

#### Scenario: 门面无 WebGL
- **WHEN** Canvas 初始化失败或 WebGL 不可用
- **THEN** 门面显示视觉连续的静态星图，索引条照常渲染全部作品链接

#### Scenario: 门面减少动态效果
- **WHEN** 浏览器报告 `prefers-reduced-motion: reduce`
- **THEN** 门面以静态终态呈现，无自转与视差，索引条的高亮过渡改为即时切换
