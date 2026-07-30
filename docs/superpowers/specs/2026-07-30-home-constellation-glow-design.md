# 首页星场：节点辉光与深空运动重设计

- 日期：2026-07-30
- 状态：已获用户确认，待转实现计划
- 归属：并入 `openspec/changes/redesign-home-constellation`（门面重设计第一期的收尾）

## 1. 问题

用户对首页星场的反馈是两条：

1. **节点太突兀，与背景格格不入。** 四个作品节点读起来像"贴上去的硬币"，不像"发出来的光"。
2. **背景动态显得小儿科，不够炫酷。**

这两条指向同一个缺口。`openspec/changes/redesign-home-constellation/proposal.md` 写的是"每个作品是一颗**发光**节点"，`design.md` 第 24 行进一步说明选用 React Three Fiber 正是为了拿到"真 3D 点云、可控相机飞入、**辉光/后期**"。但当前实现里既没有衰减贴图，也没有任何后期处理，节点是无贴图的硬边 `circleGeometry`。

## 2. 前置修复（本设计之前已完成）

调查过程中先修掉了一个真实缺陷：四个节点渲染为**纯黑圆盘**。

根因是 `constellation-field.client.tsx` 的两处材质开了 `vertexColors`，而它们的几何体（`circleGeometry`）没有 `color` 顶点属性。three.js 在 `material.vertexColors === true` 时定义 `USE_COLOR`（`WebGLProgram.js:567`），顶点着色器随即执行 `vColor.rgb *= color`（`color_vertex.glsl`）；属性缺失时 WebGL 返回默认值 `(0,0,0,1)`，diffuse 被乘成零。

逐实例着色本不需要这个开关：`WebGLPrograms.js:209` 检测到 `instanceColor !== null` 会自动启用 `USE_INSTANCING_COLOR`，`WebGLProgram.js:737` 还会在片元前缀补上 `USE_COLOR`。

修复已落地，并在 `scene-composition.test.tsx` 增加了一条 AST 不变量：任何带 `vertexColors` 的材质，其所在元素子树必须声明 `attach="attributes-color"`。该规则正确放行了 `rialo-reactive-field.tsx:405`（那里几何体确实有 color 属性）。

**这只是让星星不再是黑的，没有解决"不够炫酷"。本设计接着往下做。**

## 3. 目标与非目标

### 目标

- 节点从硬边圆盘改为带衰减与星芒的发光精灵，边缘融进背景。
- 背景运动从"刚体旋转"改为"分层视差 + 闪烁 + 星云 + 极慢缓推"。
- 修正画布合成方式，让星场**叠加**在页面背景之上而不是遮挡它。
- 全程不突破既有性能预算与三条降级路径。

### 非目标

- 不改项目详情页与生态页造型。
- 不引入任何新 npm 依赖。
- 不引入后期处理管线（见 4.3 的决策与理由）。
- 不改索引条的结构与内容（它是 SSR 导航主路径，本次不动）。

## 4. 决策记录

### 4.1 节点质感：衰减辉光 + 镜头星芒

用户在四个方向（现状硬边盘 / 纯衰减 / 衰减+星芒 / 衰减+仪器光环）中选定**衰减 + 横向镜头星芒**。取向偏电影感而非仪器 HUD 感，后续视觉细节统一按此基调。

### 4.2 背景运动：分层视差 + 星云尘埃 + 缓推

用户在三个方向（维持现状 / 分层视差 / 分层视差+星云+缓推）中选定**最完整的一档**。

当前实现"小儿科"的三个成因，均在实时对照演示中确认：

1. **整个星场是刚体在转。** `home-constellation.tsx` 的 `useFrame` 里 `group.rotation.z += delta * 0.018`，把所有星点当成一块平板绕中心匀速旋转。更关键的是指针视差也作用在同一个 group 上，**所有深度的星点视差完全同步**——这才是它读起来像平板的直接原因。
2. **最近邻连线网。** `createConstellationWebPositions` 把彼此靠近的星点两两连线（每颗最多 2 条，阈值 1.02），即 `particles.js` 那套点线网，廉价联想极强。
3. **星点静止且均质。** 尺寸、亮度恒定，不闪烁不漂移。

### 4.3 辉光实现：Sprite 贴图，不用后期处理

用户在三条路线（Sprite 贴图 / 真 UnrealBloom 后期 / Sprite 打底且高画质档加 bloom）中选定 **Sprite 贴图**。

理由：真 bloom 需引入 `EffectComposer` + `UnrealBloomPass`（约 +15~25KB gzip），draw call 由 5 涨到约 15~20，且 bloom 的 render target 会破坏 `alpha: true` 透明画布的合成——必须把 `globals.css` 里两层径向渐变搬进 WebGL 才能保住现有背景层次。在这种极暗背景下，sprite 与真 bloom 的观感差距很小，不值得这个改动面和风险。

### 4.4 OpenSpec：并入现有变更，并补齐 specs/

`openspec/changes/redesign-home-constellation/` 尚未归档，其 spec delta 本就覆盖"首屏视觉、动效层级"。本次改动作为同一期门面重设计的收尾，直接修改该变更的 delta，不另开变更，避免产生两份互相打架的规范。

同时：`openspec/specs/` 目录目前为空，违反全局约定中"`specs/` 是当前真相"的要求。归档本变更时，须把 delta 合并进 `openspec/specs/` 对应能力目录，补上缺失的当前态规范。用户已确认一并处理。

## 5. 节点渲染与画布合成

### 5.1 精灵化

程序化生成贴图（`DataTexture`，运行时计算，**不占网络体积**），替换无贴图 `circleGeometry`：

- **辉光层**：`instancedMesh` + `planeGeometry` + 径向衰减 alpha 贴图。
- **星芒层**：`instancedMesh` + 宽扁 `planeGeometry` + 横向渐变贴图。

逐实例颜色继续走 `instanceColor` / `setColorAt`，**不再设置 `vertexColors`**（由第 2 节的 AST 不变量守护）。`getNodeBrightness` 的定向加权逻辑保留，且星芒长度随 brightness 变化——悬停时不只是变亮，星芒会横向拉开，指向性更强。

删除 `ClusterAuras`：它是黑盘缺陷的第二处现场，且职责被新的星云层完全取代。

### 5.2 合成修正（本设计的关键一条）

现行 `AdditiveBlending` 在非预乘模式下调用 `gl.blendFunc(SRC_ALPHA, ONE)`，**该设置同时作用于 alpha 通道**，因此节点会把画布 alpha 累积到接近 1，遮挡 `globals.css` 中那两层青色/琥珀色径向渐变。

也就是说：节点当前是在页面背景上**挖洞**，而非**发光**。只要这一点不改，即使换成柔和衰减贴图，仍会残留"贴上去"的割裂感。

改用 `CustomBlending`，RGB 走加法、alpha 保持不变：

```
blendSrc: SrcAlphaFactor,  blendDst: OneFactor        // RGB 加法
blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor   // alpha 保持 dst
```

画布 alpha 恒为 0，浏览器合成退化为 `页面背景 + 画布光`，星场真正叠加在页面渐变之上。

> **此机制尚未验证，不得当作既成事实。** 依据是预乘 alpha 上下文下 `result = canvasRGB + pageBG × (1 − canvasAlpha)`，alpha 恒 0 时退化为纯加法。但这属于浏览器合成的边角行为，实现计划第一步必须是一个最小验证 spike。**若不成立，退路是把页面那两层径向渐变搬进 WebGL 作为背景 quad**——观感等价，改动面稍大。

### 5.3 draw call 账

| 组成 | 现在 | 改后 |
|---|---|---|
| 星点 | 1 | 3（分层视差） |
| 连线 | 1（含随机点线网） | 1（仅星座主连线） |
| 团簇光晕 | 2 | 0（删除） |
| 节点 | 2（硬边盘） | 2（辉光 + 星芒） |
| 星云 | 0 | 1（实例化精灵） |
| **合计** | **5** | **7** |

上表为 high 档单场景计数（含共享层与转场翻倍的完整预算见第 7 节）。实测基线（`__CAPTAIN_DOCK_UNIVERSE_DEBUG__`，1440×900，quality=high，稳态）：`calls: 5`、`programs: 3`、`textures: 0`、`triangles: 232`。贴图数由 0 增至 2（均为运行时生成的小图）。`package.json` 不变。

## 6. 运动分层

删除 `group.rotation.z += delta * 0.018`。深度感改由三层不同速率的**平移视差**产生：

| 层 | 星点尺寸 | 基础透明度 | 漂移速率 | 指针视差系数 |
|---|---|---|---|---|
| 远 | 0.018 | 0.30 | 0.15× | 0.25× |
| 中 | 0.028 | 0.60 | 0.50× | 0.60× |
| 近 | 0.042 | 0.90 | 1.00× | 1.00× |

最后一列是重点。现状是所有星点共享同一个 group，指针视差完全同步；分层之后近层跟手、远层近乎不动，深度由视差"看"出来而不是靠旋转"转"出来。

- **环绕漂移**在顶点着色器内用 `mod()` 实现，星点一侧移出、另一侧移入，无缝无跳变，零逐帧 CPU 开销。
- **闪烁**同样在顶点着色器：每颗星带 `aPhase` / `aRate` 属性，`alpha = base × (0.55 + 0.45·sin(t·aRate + aPhase))`。`PointsMaterial` 不支持逐点透明度，故改用自定义 `ShaderMaterial`；每层仍为 1 个 draw call。
- **相机缓推**不使用循环缩放（循环复位会产生可见跳变）。改为极慢正弦呼吸：`z = z₀ + sin(t × 0.05) × 0.35`，周期约 125 秒，永不复位。
- **星云**：2~3 个实例化大尺寸柔和精灵，各自沿慢速利萨如路径漂移，透明度 0.06~0.09；以冷蓝为主，掺入少量琥珀以呼应页面右上角既有的暖色渐变。

## 7. 性能分档与预算

星云为实例化精灵，无论 2 个还是 3 个都只占 **1 个 draw call**；medium 档的节省来自填充率与星点数量，不是 draw call 数。

| 档 | 星点层 | 闪烁 | 星云 | 缓推 | 单场景 draw call | 单场景上限 |
|---|---|---|---|---|---|---|
| high | 3 | 开 | 3 精灵 | 开 | 7 | 8 |
| medium | 3（星点更少） | 开 | 关 | 关 | 6 | 8 |
| low | 1 | 关（静态） | 关 | 关 | 4 | 7 |

单场景上限取自 `scene-primitives.ts` 的 `sceneBudgetEstimates.home`，三档均无需修改该表。

**真正的约束在转场而非稳态。** `getVisibleSceneEntriesForQuality` 在非 low 档转场时会同时渲染两个场景，场景部分翻倍。共享层实测为 high/medium 各 3 个 draw call，low 档因 `pointInstances: 0` 使稀疏点场返回 `null`，仅 2 个：

| 档 | 共享层 | 场景部分 | 转场峰值合计 | 总上限 | 余量 |
|---|---|---|---|---|---|
| high | 3 | 7 × 2 | 17 | 24 | 7 |
| medium | 3 | 6 × 2 | 15 | 18 | 3 |
| low | 2 | 4 × 1 | 6 | 8 | 2 |

medium 档是三者中最紧的一环。**这正是该档关闭星云的原因**——若 medium 也保留星云，转场峰值为 17，距上限 18 只剩 1 个余量，任何后续增项都会立刻破线。相较之下，三层视差是"刚体旋转"问题的解药，必须在 medium 保留；星云只是氛围点缀，可以牺牲。

`scene-composition.test.tsx` 中的 draw call 断言是**动态统计**（渲染组件树后计数并与上限比较），不是硬编码期望值，因此实现变更后无需改期望数字，但必须确认三档仍在上限内。

三角面无风险：以 `planeGeometry` 精灵取代 24 段 `circleGeometry`（原为 24 × 4 实例 × 2 层 = 192 面）后总面数反而下降，远低于 `maxTriangles` 760 / 520 / 360。

### 7.1 体积预算的真实状况（本节曾写错，2026-07-30 已修正）

本节初稿称体积预算"均需持续满足"，**该前提是错的**：`npm run check:budgets` 在本次开工前就已失败 4 项。实测后的真实结构是：

| 组成 | gzip 体积 |
|---|---|
| 共享基座（three.js + React Three Fiber） | ≈ 249.2 KiB |
| 三个场景闭包合计 | 5.8 KiB（首页 2.1 / arc 1.7 / rialo 2.0） |
| full enhanced 闭包 | 255.0 KiB |
| 单路由闭包（基座 + 单场景） | ≈ 251.2 KiB |

**路由预算的 99% 是库体积地板，应用能改坏的只有最后那几 KiB。** 原 `immersiveRoute3dGzipBytes: 250 KiB` 落在地板之下，与代码是否变胖无关，结构上不可达成。

已在开工前以两个独立提交修复（见第 11 节），并把该阈值按「地板 + 单场景余量」重新标定为 **256 KiB**。关键约束：路由闭包是完整增强闭包的子集，故必须始终满足 `immersiveRoute3dGzipBytes < enhanced3dGzipBytes`，否则增强门禁会先失败、路由阈值成为死规则——这也是最初拟定的 264 KiB 被否决的原因。

当前门禁状态（全绿）：

- `check:budgets`：full enhanced 255.0/260 KiB，三条路由 251.2 / 250.8 / 251.2 均低于 256 KiB，场景闭包均远低于 45 KiB。
- `test:build-gates`：45 项全过。
- `check:links`：112 个链接全过。
- `lighthouserc.json`：performance ≥ 0.90（三次取中位）、LCP ≤ 2500ms、CLS ≤ 0.1、accessibility ≥ 0.95。

**对本设计的直接约束：** 路由余量约 4.8 KiB，增强余量约 5.0 KiB。贴图为运行时 `DataTexture` 生成、不占网络体积，新增代码主要是 GLSL 字符串与生成函数（gzip 友好），预算内可行；但**每完成一个实现步骤都须复跑 `check:budgets` 并记录数字**，一旦增强闭包逼近 260 KiB，需带实测数据重新讨论阈值，不得静默放水。

已实测确认：动画本身不是新增成本类别——当前 `frameloop` 为 `demand` 但每帧持续 `invalidate`，软件渲染下约 34fps，即已在持续渲染。

## 8. 降级路径（三条均不可破）

1. **`prefers-reduced-motion: reduce`** —— 实测确认此时 canvas 根本不挂载，直接走 `StaticUniverseFallback`。此行为保持。**但这意味着 `constellation-static-fallback.tsx` 的静态星图也须同步更新造型**，否则两条路径视觉不一致。此项容易遗漏，须显式列入任务。
2. **无 WebGL / `noscript`** —— 索引条为 SSR 纯链接，仍是导航主路径，不受影响。
3. **低端设备掉帧** —— 复用现有 `sampleRuntimeQuality` + `degrade()`，将新分档接入。

## 9. 测试契约

- 保留并继续依赖第 2 节新增的 `vertexColors` AST 不变量；新增的 sprite 材质自动落在其覆盖范围内。
- `scene-composition.test.tsx` 的 draw call 断言为动态统计，无需改期望数字；但须运行确认三档转场峰值仍在上限内（预期 17/24、15/18、6/8）。
- 删除 `createConstellationWebPositions` 及 `constellation-model.test.ts` 中对应用例；新增断言"星座连线只来自 `CONSTELLATION_EDGES`"。
- **新增亮度回归断言**：截图后断言节点区域亮度**高于**周边局部背景。这是本次黑盘缺陷的反向命题，可防止"节点又变成挖洞"的回归。
- 确认 `tests/e2e` 首页用例不依赖被删除的点线网。
- 修正 `shot.mjs`：探测 `[data-universe-shell]` 而非 `document.documentElement`（`data-universe-ready` / `data-universe-quality` 挂在前者上，现行脚本恒返回 `null`）。

## 10. 风险与实现顺序

实现必须按此顺序，因为第 1 步的结论会改变后续方案：

1. **合成 spike（阻塞项）** —— 验证 5.2 的 `CustomBlending` 在预乘 alpha 画布上的合成行为。不成立则切换到"页面渐变搬进 WebGL"退路，并据此调整后续任务。
2. 节点精灵化（辉光 + 星芒贴图），删除 `ClusterAuras`。
3. 删除最近邻连线网，仅保留 `CONSTELLATION_EDGES`。
4. 星点分层 + 顶点着色器漂移与闪烁。
5. 星云层。
6. 相机正弦缓推。
7. 静态回退造型同步。
8. 分档接线 + 测试契约更新 + 预算与 Lighthouse 复跑。
9. OpenSpec delta 更新 + `openspec/specs/` 补齐。

## 11. 开工前已完成的清理（独立提交）

视觉改动动工前，先把门禁修绿、把地基清干净，使后续每一步的体积影响都能被干净地量出来、不与既有欠债混淆。以下均为独立提交，与视觉改动无关：

| 提交 | 内容 |
|---|---|
| `faccdf0` | `fix:` 节点纯黑圆盘的根因修复 + `vertexColors` AST 不变量（见第 2 节） |
| `7cb773b` | `chore:` 删除 3 个不可达死模块 |
| （本次） | `fix:` 预算哨兵修正 + 阈值重新标定 + 移除两个未使用依赖 |

**死代码清理**：以从 `src/app` 入口与全部测试出发的模块可达性遍历确认，110 个模块中仅 3 个不可达，已全部删除——`scenes/home-astrolabe.tsx`（首页实际场景是 `home-constellation`，`scene-router` 只是把变量名叫作 `HomeAstrolabe`，极易误认；该文件还带有同一个 `vertexColors` 缺陷）、`ecosystem/ecosystem-hero.tsx`、`ecosystem/ecosystem-index.tsx`（门面重设计后职责由 `constellation-index` 承担）。同步从 `english-surface.test.ts` 的 `publicSurfaceSources` 移除已删文件。

**预算哨兵修正**：`check-budgets.mjs` 把 `/` 的场景哨兵写作 `home-astrolabe`，产物中并不存在该字符串，导致 `SCENE_SENTINEL_MISSING`。连带影响更大：哨兵解析不到 owner 时 `sceneOwnerFiles` 缺少首页场景 chunk，`closureUntil` 不再在该处截断，首页场景代码遂漏进 `sharedEnhancedBase` 并被重复计入另外两条路由。修正后 `/arc` 由 252.9 降至 250.8 KiB、`/rialo` 由 253.2 降至 251.2 KiB。三处哨兵定义（`check-budgets.mjs`、`build-gates.test.mjs` 夹具、`performance.spec.ts` 的 `enhancedOnlySentinels`）已统一。

**移除未使用依赖**：`@react-three/drei` 与 `motion` 从未被任何源码、测试或配置引用（原提案称"复用已安装的 three、fiber、drei、motion"，但后两者从未落地）。二者本就未进产物，删除**不影响**体积，收益在于减少安装体积与供应链面。本设计亦不需要它们：贴图走 `DataTexture`、闪烁走自定义 `ShaderMaterial`。
