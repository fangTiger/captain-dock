# Project Universe 无边界电影化画布设计

## 状态

- 用户于 2026-07-25 确认采用 `Borderless Cinematic Canvas + Open Instrument Rails`。
- 本设计是既有 A 版视觉母版的增量，不改变八条公开路由、四个项目、真实链接或全英文契约。
- 本轮不部署 Vercel；浏览器验证只允许使用 `127.0.0.1:3100`。

## 设计判断

现有 A 版已经建立正确的机械观测语言，但 `.stage` 的强外框、内缩完整框、深色面板、中心十字和底栏，与 Arc/Rialo readout、selector 以及详情签名的第二层边框叠加后，闭合容器成为首要视觉信号。Canvas 与 Static fallback 位于内容后方，又被不透明舞台底色压暗，因此 3D 更像被框住的背景图，而不是全站空间的一部分。

现有动态同样不连续：Canvas 主要只有相机插值和短路由状态，High/Medium 场景首帧后进入按需渲染；首页、Arc、Rialo 的 DOM 仪器没有入场和环境微动，详情页只有签名扫描线持续运动。新设计需要让动态成为层级和状态的延伸，而不是额外特效。

## 视觉语法

页面是一张连续的观测场，不是一组容器：

- 内容继续按最大宽度对齐，但背景网格、光晕、Static fallback 与 Canvas 不受舞台矩形边界限制。
- 结构线可以相交、延伸、淡出或只出现一段，不应闭合成四边容器。
- 文案靠局部渐变遮罩和排版密度获得可读性，不使用厚重半透明面板。
- 唯一主要 CTA、键盘 focus outline 和具有真实数据语义的内部图表边界可以闭合。
- 桌面保持左文案、中仪器、右 readout / index 的空间关系；移动端改成正常文档流，不保留贯穿首屏的左右边框。

## 页面统一

### 首页

标题、四个项目节点和 Arc/Rialo 索引继续共享同一构图。项目入口使用编号、短引线、名称和能力标签；默认状态无完整矩形，hover/focus 时出现局部底板或开放侧轨。轨道和核心可以越过原舞台边缘并在背景中淡出。

### Arc

保留三重轨道、核心扫描纹理和三状态语义。右侧 readout 改为单侧项目色轨，底部 selector 只保留分段基线和活动刻度。切换 Research / Exchange / Forecast 时，readout、项目色、核心纹理和 scene target 同步。

### Rialo

保留雷达圆环、十字轴、航线和状态节点。readout 使用开放侧轨，五阶段以一条任务轨组织；活动阶段拥有状态灯、短边和文本状态。Trigger 的琥珀色仍只表达告警。

### 项目详情

继续使用轻量 CSS/SVG 签名而非完整 Canvas。签名删除最外层强框和 diagram 重复框，让背景网格、扫描光和项目色自然进入 Hero。内部轴线、信号线、标签基线和项目主题保持；后续章节只用水平 datum line 组织。

## 动效层级

1. 首屏入场：600–800ms，总是先输出完整 HTML；标题、仪器、坐标和控件依次到达终态。
2. 环境微动：同屏最多一至两个低频运动源；首页轨道、Arc 核心相位、Rialo 扫描扇区和详情签名按页面语义选择。
3. 交互反馈：hover、focus、pressed 共用 180–280ms 状态反馈，并同步 scene-target。
4. 路由过渡：沿用 Canvas 的 180ms depart / 400ms arrive；DOM 新页面短淡入，不延迟链接与 history。
5. 静态终态：reduced-motion、saveData、Low/Static 与 WebGL unavailable 关闭持续循环和非必要过渡。

## 性能与无障碍

- Canvas 保持按需渲染，不为环境装饰长期运行 60fps。
- 优先动画 transform / opacity；不动画布局、大面积 filter 或 blur。
- 页面隐藏、场域离开视口、移动端或性能降级时暂停或取消持续循环。
- 所有交互反馈覆盖 hover 与 focus；运动不承载唯一信息。
- 不使用滚动劫持、强制吸附、频闪或依赖 hover 才能发现的入口。
- 保持现有 LCP、CLS、包体、draw call、三角形、DPR 和单 Canvas 门槛。

## 保留与排除

保留路由、catalog、项目顺序、live URL、SEO、JSON-LD、外链安全、全英文门禁、质量分级、Static fallback、scene-target、Rialo 键盘状态机和详情语义章节。

排除新依赖、内容重写、全新 Canvas 引擎、CMS、部署、端口变化、作者资料补全和外部项目修改。
