# Handoff Task Package — A 版重构 Slice 12B10 Static Mechanical Backdrop

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / Static fallback visual integration`
- AgentId: `/root/fix_redesign_12b10`
- SliceId: `static-fallback-background-layer`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前视觉缺陷

Task12B8 的 reduced-motion 三张候选图均显示旧版
`StaticUniverseFallback` 以约 `608×720px` 的不透明卡片从场景层左上角铺开，
其网格、边框、caption 与 SVG 压在新版 A 版 Instrument Stage 的标题与正文下方。

根因不是 z-index 或路由：

- `UniverseShell.sceneLayer` 正确位于语义内容后面并横跨舞台。
- shell 的 `.fallback` 正确要求 fallback 占满 scene layer。
- 旧 `.figure` 却仍保留 `max-width:38rem`、panel background、边框、阴影和可见 caption，导致左对齐卡片表面泄漏。

目标是把路由相关的 Home/Arc/Rialo SVG 保留为“全层、透明、低对比的机械背景”，与正常 Canvas 的层级一致；不得隐藏整个 fallback，也不得改 scene layer/Canvas 几何。

## Editable files

- `tests/e2e/progressive-enhancement.spec.ts`
- `src/components/scene/static-universe-fallback.module.css`

其余全部禁止修改，包括 UniverseShell/CapabilityGate/quality/TSX、Instrument Stage、responsive test、其他测试、配置、docs、OpenSpec、session-state、依赖、3000、commit 与部署。

## Required TDD RED

先只改 `progressive-enhancement.spec.ts`，增加一个小 helper，例如
`expectStaticFallbackIsMechanicalBackdrop(page, scene)`，并在现有三条降级路径中调用：

- reduced-motion Home
- `saveData=true` Arc
- WebGL2 unavailable Rialo

不要新增独立 test count；复用现有：

- `reduced motion and saveData stay static without probing WebGL`
- `WebGL2 unavailable probes once, keeps the off-DOM probe out of page canvas count, and falls back static`

helper 对 `[data-static-scene]` 与 `[data-universe-scene-layer]` 断言：

1. fallback 四条边与 scene layer 差值均不超过1px。
2. computed surface：
   - `background-color: rgba(0, 0, 0, 0)`
   - `background-image: none`
   - 四边 border width 均 `0px`
   - `box-shadow: none`
   - `max-width: none`
   - `pointer-events: none`
3. opacity 必须 `>0` 且 `<=0.2`，即保留低对比机械图，不形成主面板。
4. figcaption 仍存在且文本非空，但 `display:none`，避免视觉说明压到标题。
5. SVG 填满 fallback 的可用宽高，不能继续是左上角38rem小卡。

保持已有 count/probe/canvas 断言。

不改产品先运行：

```bash
npx playwright test tests/e2e/progressive-enhancement.spec.ts \
  --config playwright.config.ts \
  --grep "reduced motion and saveData|WebGL2 unavailable"
```

当前必须因608px宽度、渐变背景、1px边框、inset shadow、可见 caption 与 opacity1 精确 RED；若先出现无关失败，停止。

## GREEN 方向与 Architecture 原型

只在 `static-universe-fallback.module.css` 中把 fallback 表面背景化：

- `.figure`：取消38rem限宽、panel background、border/radius/shadow；保持透明、全层、低对比 opacity（Architecture 原型为`.14`）。
- `.plate`：填满 figure 的宽高并保持 SVG viewBox 自身居中绘制。
- `.caption`：保留 DOM 文本但 `display:none`。
- 保留路由颜色、轨道、节点、signal、radar SVG；不得 `display:none` 整个 figure。

Architecture 只读注入原型已验证三路：

- fallback `1440×720`
- transparent background
- border `0`
- caption `0视觉占位`
- opacity `.14`
- reduced Home/Arc/Rialo 标题、readout 与主舞台不再被旧卡片压住

原型图片仅作诊断：

- `/private/tmp/reduced-home-candidate-1440.png`
- `/private/tmp/reduced-arc-candidate-1440.png`
- `/private/tmp/reduced-rialo-candidate-1440.png`

## 回归要求

聚焦 GREEN 后运行：

```bash
npm run typecheck
npm run verify
npm run build
npx playwright test \
  tests/e2e/routes.spec.ts \
  tests/e2e/home.spec.ts \
  tests/e2e/ecosystems.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/keyboard.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/accessibility.spec.ts \
  tests/e2e/seo-security.spec.ts \
  --config playwright.config.ts
```

完整9-spec必须保持69/69。全绿后生成并实际查看：

- reduced-motion 1440×1000：`/`、`/arc`、`/rialo`
- saveData 1440×1000：`/arc`
- WebGL unavailable 1440×1000：`/rialo`

5张均不得再出现左上角面板、边框或可见 caption；机械层必须低对比、透明、仍与当前路由相符。截图只放临时目录。

## 风险与 Stop conditions

同一 fallback 还用于 SSR/no-JS 初始输出、Canvas first-ready 前、renderer failure、context loss 和 Low→Static。不得：

- 隐藏整个 fallback。
- 修改 sceneLayer、Canvas viewport、CapabilityGate、quality 或路由。
- 删除 caption DOM 或路由 aria-label。
- 让样式只依赖 reduced-motion media query；saveData/WebGL/error路径也必须一致。

若需要第三文件、DOM/TSX改动、完整门禁出现新失败，立即停止。

## Baseline

- `src/components/scene/static-universe-fallback.module.css`：
  `1016b44ae036a2c54838f436eba6b89b7b811eaa2368e6a5052d8c9090f6d5c1`
- `tests/e2e/progressive-enhancement.spec.ts`：
  `81c2ebe40fc289b1944479f033fb4bad46d1543599379c1253d1e34d13f3929e`

冻结参考、保护 hash、英文公开表面、端口与 handback 要求沿用12B9。不要更新 OpenSpec/docs/session-state，不要 commit 或部署，不要触碰3000；3100用后释放。
